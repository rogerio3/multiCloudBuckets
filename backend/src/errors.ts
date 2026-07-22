/** Base application error carrying an HTTP status code and a machine-readable code. */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/** Errors raised by storage providers. */
export class StorageError extends AppError {
  constructor(message: string, statusCode: number, code: string) {
    super(message, statusCode, code);
    this.name = 'StorageError';
  }

  static notFound(_key: string): StorageError {
    return new StorageError('File not found', 404, 'NotFound');
  }
}

/** Authentication/authorization errors. */
export class AuthError extends AppError {
  constructor(message: string, statusCode = 401, code = 'Unauthorized') {
    super(message, statusCode, code);
    this.name = 'AuthError';
  }
}