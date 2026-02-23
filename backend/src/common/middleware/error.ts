import { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'
import { ApiError } from '../errors/ApiError'
import { env } from '../../config/env'

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ message: err.message, details: err.details })
  }
  if (err instanceof ZodError) {
    return res.status(400).json({ message: 'Validation failed', issues: err.issues })
  }
  console.error(err)
  if (env.NODE_ENV !== 'production') {
    return res.status(500).json({ message: err?.message || 'Internal Server Error', stack: err?.stack })
  }
  res.status(500).json({ message: 'Internal Server Error' })
}
