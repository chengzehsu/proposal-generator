import { NextFunction, Request, Response } from 'express';

/**
 * Wraps async route handlers to catch errors and pass them to next()
 * This prevents "unhandled promise rejection" errors
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
