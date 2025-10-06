import { Request, RequestHandler, Response } from 'express';

export const notFound = ((req: Request, res: Response): void => {
  res.status(404).json({
    error: 'NotFound',
    message: `Route ${req.method} ${req.path} not found`,
    statusCode: 404,
  });
}) as RequestHandler;