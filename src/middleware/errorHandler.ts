import { Request, Response, NextFunction } from 'express';

interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const globalErrorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  // Log error for debugging
  console.error(`Error ${statusCode}: ${message}`);
  console.error(error.stack);

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: {
      message:
        process.env.NODE_ENV === 'production'
          ? 'Something went wrong!'
          : message,
      ...(process.env.NODE_ENV !== 'production' && { stack: error.stack }),
    },
  });
};

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: {
      message: `Route ${req.originalUrl} not found`,
    },
  });
};
