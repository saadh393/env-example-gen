export type EnvTemplateErrorCode =
  | 'INPUT_NOT_FOUND'
  | 'INPUT_READ_FAILED'
  | 'OUTPUT_WRITE_FAILED'
  | 'NO_ENV_FILES'
  | 'INVALID_OPTION';

export class EnvTemplateError extends Error {
  public readonly code: EnvTemplateErrorCode;

  constructor(message: string, code: EnvTemplateErrorCode) {
    super(message);
    this.name = 'EnvTemplateError';
    this.code = code;
  }
}
