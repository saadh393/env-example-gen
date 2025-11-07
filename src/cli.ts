#!/usr/bin/env node
import chalk from "chalk";
import { Command } from "commander";
import path from "node:path";
import process from "node:process";

import { discoverEnvFiles } from "./discovery.js";
import { EnvTemplateError } from "./errors.js";
import { EnvTemplateGenerator } from "./template-generator.js";
import type { TemplateGenerationResult } from "./types.js";

interface CliOptions {
    input?: string;
    output?: string;
    multi?: boolean;
}

const program = new Command();

program
    .name("env-example-gen")
    .description(
        "Generate safe .env.example templates from existing .env files."
    )
    .option(
        "-i, --input <path>",
        "Path to the source .env file (defaults to ./\\.env)."
    )
    .option("-o, --output <path>", "Path for the generated template file.")
    .option(
        "-m, --multi",
        "Generate templates for every .env* file in the current directory."
    )
    .showHelpAfterError("(add --help for usage information)")
    .parse(process.argv);

const options = program.opts<CliOptions>();
const cwd = process.cwd();
const generator = new EnvTemplateGenerator();

async function run(): Promise<void> {
    if (options.multi && (options.input || options.output)) {
        throw new EnvTemplateError(
            "The --multi flag cannot be combined with --input or --output.",
            "INVALID_OPTION"
        );
    }

    if (options.multi) {
        await handleMultiMode();
        return;
    }

    const inputPath = path.resolve(cwd, options.input ?? ".env");
    const outputPath = path.resolve(
        cwd,
        options.output ?? generator.getSuggestedOutputPath(inputPath)
    );

    const result = await generator.generate(inputPath, outputPath);
    logSuccess(result);
}

async function handleMultiMode(): Promise<void> {
    const envFiles = await discoverEnvFiles(cwd);

    if (envFiles.length === 0) {
        throw new EnvTemplateError(
            "No .env files were found in the current directory.",
            "NO_ENV_FILES"
        );
    }

    let successCount = 0;
    let failureCount = 0;

    for (const envFile of envFiles) {
        const outputPath = generator.getSuggestedOutputPath(envFile);

        try {
            const result = await generator.generate(envFile, outputPath);
            logSuccess(result);
            successCount += 1;
        } catch (error) {
            failureCount += 1;
            logFailure(envFile, error);
        }
    }

    if (successCount > 0) {
        console.log(chalk.green(`✔ Processed ${successCount} file(s).`));
    }

    if (failureCount > 0) {
        console.error(
            chalk.red(`✖ Failed to process ${failureCount} file(s).`)
        );
        process.exitCode = 1;
    }
}

function logSuccess(result: TemplateGenerationResult): void {
    const relativeInput = formatPathForDisplay(result.inputPath);
    const relativeOutput = formatPathForDisplay(result.outputPath);

    console.log(chalk.green(`✔ ${relativeInput}`));
    console.log(
        chalk.gray(
            `→ wrote ${relativeOutput} (${result.variableCount} variable${
                result.variableCount === 1 ? "" : "s"
            })`
        )
    );
}

function logFailure(filePath: string, error: unknown): void {
    const relativePath = formatPathForDisplay(filePath);

    if (error instanceof EnvTemplateError) {
        console.error(chalk.red(`✖ ${relativePath}: ${error.message}`));
        return;
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(chalk.red(`✖ ${relativePath}: ${message}`));
}

function formatPathForDisplay(targetPath: string): string {
    const relative = path.relative(cwd, targetPath);
    return relative === "" ? path.basename(targetPath) : relative;
}

run().catch((error) => {
    if (error instanceof EnvTemplateError) {
        console.error(chalk.red(`✖ ${error.message}`));
    } else {
        console.error(chalk.red("✖ Unexpected error"));
        if (error instanceof Error) {
            console.error(error.message);
        }
    }
    process.exitCode = 1;
});
