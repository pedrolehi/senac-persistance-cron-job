export class WatsonError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly headers?: any
  ) {
    super(message);
    this.name = "WatsonError";
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}

export class DatabaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatabaseError";
  }
}

export class TransformationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TransformationError";
  }
}
