import { Request, Response } from 'express'
import mongoose, { Types } from 'mongoose'
import { promises as fs } from 'fs'
import path from 'path'
import { env } from '../../config/env'

function isPlainObject(v: any){ return Object.prototype.toString.call(v) === '[object Object]' }

function serializeValue(v: any): any {
  if (v == null) return v
  if (v instanceof Types.ObjectId) return { $oid: v.toString() }
  if (v instanceof Date) return { $date: v.toISOString() }
  if (Array.isArray(v)) return v.map(serializeValue)
  if (isPlainObject(v)) return serializeDoc(v)
  return v
}

function serializeDoc(doc: any){
  const out: any = {}
  for (const k of Object.keys(doc)) out[k] = serializeValue((doc as any)[k])
  return out
}

function deserializeValue(v: any): any {
  if (v == null) return v
  if (isPlainObject(v) && ('$oid' in v) && typeof v.$oid === 'string') return new Types.ObjectId(v.$oid)
  if (isPlainObject(v) && ('$date' in v) && typeof v.$date === 'string') return new Date(v.$date)
  if (Array.isArray(v)) return v.map(deserializeValue)
  if (isPlainObject(v)) return deserializeDoc(v)
  return v
}

function deserializeDoc(doc: any){
  const out: any = {}
  for (const k of Object.keys(doc)) out[k] = deserializeValue((doc as any)[k])
  return out
}

async function listCollectionNames(){
  const cols = await mongoose.connection.db!.listCollections().toArray()
  return cols
    .map(c => c.name)
    .filter(name => !name.startsWith('system.'))
}

export async function exportAll(req: Request, res: Response){
  const dbName = mongoose.connection.db!.databaseName
  const names = await listCollectionNames()
  const collections: Record<string, any[]> = {}
  for (const name of names){
    const docs = await mongoose.connection.db!.collection(name).find({}).toArray()
    collections[name] = docs.map(serializeDoc)
  }
  const payload = {
    _meta: { ts: new Date().toISOString(), db: dbName, app: 'hospital-mis', version: 1 },
    collections,
  }
  const stamp = new Date().toISOString().replace(/[:T]/g,'-').slice(0,19)
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Content-Disposition', `attachment; filename="backup-${dbName}-${stamp}.json"`)
  res.status(200).send(JSON.stringify(payload))
}

export async function purgeAll(_req: Request, res: Response){
  const ok = String((_req.body as any)?.confirm || '').toUpperCase() === 'PURGE'
  if (!ok) return res.status(400).json({ error: 'Confirmation required. Set body.confirm = "PURGE".' })
  await mongoose.connection.db!.dropDatabase()
  res.json({ ok: true })
}

export async function restoreAll(req: Request, res: Response){
  const body = (req.body || {}) as any
  const collections: Record<string, any[]> = body.collections || {}
  if (!collections || typeof collections !== 'object'){
    return res.status(400).json({ error: 'Invalid backup format' })
  }
  const ok = String((req.body as any)?.confirm || '').toUpperCase() === 'RESTORE'
  if (!ok) return res.status(400).json({ error: 'Confirmation required. Set body.confirm = "RESTORE".' })
  // Drop the database first
  await mongoose.connection.db!.dropDatabase()
  // Insert each collection
  for (const name of Object.keys(collections)){
    const arr = Array.isArray(collections[name]) ? collections[name] : []
    if (!arr.length) continue
    const docs = arr.map(deserializeDoc)
    await mongoose.connection.db!.collection(name).insertMany(docs, { ordered: false })
  }
  res.json({ ok: true })
}

export async function runBackupToDisk(){
  const dbName = mongoose.connection.db!.databaseName
  const names = await listCollectionNames()
  const collections: Record<string, any[]> = {}
  for (const name of names){
    const docs = await mongoose.connection.db!.collection(name).find({}).toArray()
    collections[name] = docs.map(serializeDoc)
  }
  const payload = { _meta: { ts: new Date().toISOString(), db: dbName, app: 'hospital-mis', version: 1 }, collections }
  const outDir = path.resolve(env.BACKUP_DIR)
  await fs.mkdir(outDir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:T]/g,'-').slice(0,19)
  const file = path.join(outDir, `backup-${dbName}-${stamp}.json`)
  await fs.writeFile(file, JSON.stringify(payload))
  await applyRetention(outDir)
  return file
}

async function applyRetention(dir: string){
  const max = Math.max(1, Number(env.BACKUP_RETENTION_COUNT || 30))
  const items = (await fs.readdir(dir)).filter(f => f.startsWith('backup-') && f.endsWith('.json'))
  const withStat = await Promise.all(items.map(async f => ({ f, stat: await fs.stat(path.join(dir, f)) })))
  withStat.sort((a,b)=> b.stat.mtimeMs - a.stat.mtimeMs)
  const toDelete = withStat.slice(max)
  for (const d of toDelete){ try { await fs.unlink(path.join(dir, d.f)) } catch {} }
}
