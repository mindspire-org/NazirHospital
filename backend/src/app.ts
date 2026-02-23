import express, { Request, Response } from 'express'
import cors from 'cors'
import morgan from 'morgan'
import path from 'node:path'
import { env } from './config/env'
import apiRouter from './routes'
import { errorHandler } from './common/middleware/error'

const app = express()

const corsOrigin = env.NODE_ENV === 'development' ? true : env.CORS_ORIGIN
app.use(cors({ origin: corsOrigin as any, credentials: true }))
app.use(express.json({ limit: '100mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(morgan('dev'))

app.get('/health', (_req: Request, res: Response) => res.json({ ok: true }))

app.use('/api', apiRouter)

app.use(errorHandler)

export default app
