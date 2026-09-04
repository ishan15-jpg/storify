import { describe, it, expect } from "vitest";
import {
  NotFoundError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  ValidationError,
  AppError,
} from "../../src/core/errors/app-error.js";

describe("AppError Hierarchy", () => {
  it("NotFoundError should format message and set status 404", () => {
    const errorWithId = new NotFoundError("Folder", "01ARZ3NDEKTSV4RRFFQ69G5FAV");
    expect(errorWithId).toBeInstanceOf(AppError);
    expect(errorWithId.statusCode).toBe(404);
    expect(errorWithId.errorCode).toBe("NOT_FOUND");
    expect(errorWithId.message).toBe('Folder with identifier "01ARZ3NDEKTSV4RRFFQ69G5FAV" was not found.');

    const errorGeneral = new NotFoundError("Resource");
    expect(errorGeneral.message).toBe("Resource was not found.");
  });

  it("BadRequestError should set status 400 and allow details", () => {
    const error = new BadRequestError("Invalid parameter", { field: "name" });
    expect(error.statusCode).toBe(400);
    expect(error.errorCode).toBe("BAD_REQUEST");
    expect(error.details).toEqual({ field: "name" });
  });

  it("UnauthorizedError should default to 401 with standard message", () => {
    const error = new UnauthorizedError();
    expect(error.statusCode).toBe(401);
    expect(error.errorCode).toBe("UNAUTHORIZED");
  });

  it("ForbiddenError should set status 403", () => {
    const error = new ForbiddenError();
    expect(error.statusCode).toBe(403);
    expect(error.errorCode).toBe("FORBIDDEN");
  });

  it("ConflictError should set status 409", () => {
    const error = new ConflictError("A file with this name already exists in target folder");
    expect(error.statusCode).toBe(409);
    expect(error.errorCode).toBe("CONFLICT");
  });

  it("ValidationError should set status 422 and attach validation errors", () => {
    const error = new ValidationError("Validation failed", { issues: ["email is invalid"] });
    expect(error.statusCode).toBe(422);
    expect(error.errorCode).toBe("VALIDATION_ERROR");
    expect(error.details).toEqual({ issues: ["email is invalid"] });
  });
});
