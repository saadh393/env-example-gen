export interface TemplateStats {
  variableCount: number;
  commentCount: number;
  blankLineCount: number;
}

export interface TemplateGenerationResult {
  inputPath: string;
  outputPath: string;
  variableCount: number;
  commentCount: number;
}

export interface GeneratorConfig {
  headerLines?: string[];
  placeholderFactory?: (key: string) => string;
}

export interface PlaceholderRule {
  pattern: RegExp;
  placeholder: string;
}
