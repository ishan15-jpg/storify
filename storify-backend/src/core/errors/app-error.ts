export abstract class AppError extends Error {
  public abstract readonly statusCode: number;
  public abstract readonly errorCode: string;

  constructor(
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  public readonly statusCode = 404;
  public readonly errorCode = "NOT_FOUND";

  constructor(resource: string, identifier?: string) {
    super(
      identifier
        ? `${resource} with identifier "${identifier}" was not found.`
        : `${resource} was not found.`
    );
  }
}

export class BadRequestError extends AppError {
  public readonly statusCode = 400;
  public readonly errorCode = "BAD_REQUEST";

  constructor(message: string, details?: Record<string, unknown>) {
    super(message, details);
  }
}

export class UnauthorizedError extends AppError {
  public readonly statusCode = 401;
  public readonly errorCode = "UNAUTHORIZED";

  constructor(message: string = "Authentication is required to access this resource.") {
    super(message);
  }
}

export class ForbiddenError extends AppError {
  public readonly statusCode = 403;
  public readonly errorCode = "FORBIDDEN";

  constructor(message: string = "You do not have permission to perform this action.") {
    super(message);
  }
}

export class ConflictError extends AppError {
  public readonly statusCode = 409;
  public readonly errorCode = "CONFLICT";

  constructor(message: string, details?: Record<string, unknown>) {
    super(message, details);
  }
}

export class ValidationError extends AppError {
  public readonly statusCode = 422;
  public readonly errorCode = "VALIDATION_ERROR";

  constructor(message: string, details?: Record<string, unknown>) {
    super(message, details);
  }
}
