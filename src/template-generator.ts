import { promises as fs } from 'node:fs';
import path from 'node:path';

import { TEMPLATE_HEADER_LINES } from './constants.js';
import { EnvTemplateError } from './errors.js';
import { generatePlaceholder } from './placeholders.js';
import type { GeneratorConfig, TemplateGenerationResult, TemplateStats } from './types.js';

interface TemplateBuildOutput {
  lines: string[];
  stats: TemplateStats;
}

interface SplitValueResult {
  value: string;
  comment?: string;
}

export class EnvTemplateGenerator {
  private readonly headerLines: string[];
  private readonly placeholderFactory: (key: string) => string;

  constructor(config: GeneratorConfig = {}) {
    this.headerLines = config.headerLines ?? TEMPLATE_HEADER_LINES;
    this.placeholderFactory = config.placeholderFactory ?? generatePlaceholder;
  }

  public getSuggestedOutputPath(inputPath: string): string {
    const absoluteInput = path.resolve(inputPath);
    const directory = path.dirname(absoluteInput);
    const baseName = path.basename(absoluteInput);
    const outputName = baseName.endsWith('.example') ? baseName : `${baseName}.example`;

    return path.join(directory, outputName);
  }

  public async generate(inputPath: string, outputPath?: string): Promise<TemplateGenerationResult> {
    const resolvedInput = path.resolve(inputPath);
    const resolvedOutput = path.resolve(outputPath ?? this.getSuggestedOutputPath(resolvedInput));

    let rawContent: string;
    try {
      rawContent = await fs.readFile(resolvedInput, 'utf8');
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code === 'ENOENT') {
        throw new EnvTemplateError(`Input file not found: ${resolvedInput}`, 'INPUT_NOT_FOUND');
      }
      throw new EnvTemplateError(`Unable to read ${resolvedInput}`, 'INPUT_READ_FAILED');
    }

    const template = this.buildTemplate(rawContent);
    const fileBody = this.composeOutput(template.lines);

    try {
      await fs.mkdir(path.dirname(resolvedOutput), { recursive: true });
      await fs.writeFile(resolvedOutput, fileBody, 'utf8');
    } catch (error) {
      throw new EnvTemplateError(
        `Unable to write template to ${resolvedOutput}`,
        'OUTPUT_WRITE_FAILED'
      );
    }

    return {
      inputPath: resolvedInput,
      outputPath: resolvedOutput,
      variableCount: template.stats.variableCount,
      commentCount: template.stats.commentCount
    };
  }

  private buildTemplate(input: string): TemplateBuildOutput {
    const sourceLines = input.split(/\r?\n/);
    const outputLines: string[] = [];
    const stats: TemplateStats = { variableCount: 0, commentCount: 0, blankLineCount: 0 };

    for (const rawLine of sourceLines) {
      if (rawLine.trim() === '') {
        stats.blankLineCount += 1;
        outputLines.push('');
        continue;
      }

      const trimmedLine = rawLine.trimStart();
      if (trimmedLine.startsWith('#') || trimmedLine.startsWith(';')) {
        stats.commentCount += 1;
        outputLines.push(trimmedLine);
        continue;
      }

      const transformed = this.transformVariableLine(rawLine);
      if (transformed) {
        stats.variableCount += 1;
        outputLines.push(transformed);
      }
    }

    while (outputLines.length > 0 && outputLines[outputLines.length - 1] === '') {
      outputLines.pop();
    }

    return { lines: outputLines, stats };
  }

  private transformVariableLine(line: string): string | null {
    const trimmedLine = line.trim();
    if (!trimmedLine.includes('=')) {
      return null;
    }

    const exportMatch = trimmedLine.startsWith('export ') ? 'export ' : '';
    const lineWithoutExport = exportMatch
      ? trimmedLine.slice(exportMatch.length).trimStart()
      : trimmedLine;
    const delimiterIndex = lineWithoutExport.indexOf('=');

    if (delimiterIndex === -1) {
      return null;
    }

    const key = lineWithoutExport.slice(0, delimiterIndex).trim();
    if (!key) {
      return null;
    }

    const valueSegment = lineWithoutExport.slice(delimiterIndex + 1);
    const { value, comment } = this.splitValueAndComment(valueSegment);
    const placeholder = this.placeholderFactory(key);
    const wrappedPlaceholder = this.wrapPlaceholder(value, placeholder);
    const commentSuffix = comment ? ` ${comment}` : '';

    return `${exportMatch}${key}=${wrappedPlaceholder}${commentSuffix}`;
  }

  private splitValueAndComment(value: string): SplitValueResult {
    let currentQuote: '"' | "'" | null = null;

    for (let index = 0; index < value.length; index += 1) {
      const char = value[index];

      if (char === '"' || char === "'") {
        currentQuote = currentQuote === char ? null : currentQuote ?? char;
      }

      if (!currentQuote && (char === '#' || char === ';')) {
        const before = value.slice(0, index);
        const comment = value.slice(index).trim();

        return { value: before.trim(), comment: comment.length > 0 ? comment : undefined };
      }
    }

    return { value: value.trim() };
  }

  private wrapPlaceholder(value: string, placeholder: string): string {
    if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
      return `"${placeholder}"`;
    }

    if (value.startsWith("'") && value.endsWith("'") && value.length >= 2) {
      return `'${placeholder}'`;
    }

    return placeholder;
  }

  private composeOutput(bodyLines: string[]): string {
    const outputLines = [...this.headerLines];

    if (bodyLines.length > 0) {
      if (outputLines[outputLines.length - 1] !== '') {
        outputLines.push('');
      }

      outputLines.push(...bodyLines);
    }

    return `${outputLines.join('\n')}\n`;
  }
}
