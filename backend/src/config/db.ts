import mongoose from 'mongoose'
import { env } from './env'

export async function connectDB() {
  mongoose.set('strictQuery', true)
  await mongoose.connect(env.MONGO_URI, {
    maxPoolSize: 20,
    minPoolSize: 1,
    serverSelectionTimeoutMS: 10_000,
    socketTimeoutMS: 45_000,
    family: 4,
  } as any)
  return mongoose.connection
}
