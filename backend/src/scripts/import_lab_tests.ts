import path from 'path'
import fs from 'fs'
import * as XLSX from 'xlsx'
import { connectDB } from '../config/db'
import { LabTest } from '../modules/lab/models/Test'

async function main() {
  const args = new Set(process.argv.slice(2))
  const dryRun = args.has('--dry-run')
  const sampleArg = process.argv.find(a => a.startsWith('--sample='))
  const sampleCount = sampleArg ? Math.max(0, Number(sampleArg.split('=')[1])) : 0
  const cwd = process.cwd()
  // Excel file path provided by user: D:\hms\public\lab test data.xlsx
  const filePath = path.resolve(cwd, '..', 'public', 'lab test data.xlsx')

  if (!fs.existsSync(filePath)) {
    console.error('Excel file not found at:', filePath)
    process.exit(1)
  }

  if (!dryRun) {
    await connectDB()
  }

  const wb = XLSX.readFile(filePath)
  const wsName = wb.SheetNames[0]
  const ws = wb.Sheets[wsName]
  const rawRows: Array<Record<string, any>> = XLSX.utils.sheet_to_json(ws, { defval: '' })
  const rows = rawRows.map(normalizeRowKeys)

  let created = 0
  let updated = 0
  let skipped = 0

  for (const row of rows) {
    // Expecting columns like: "Test Name", "price"; handle variants/whitespace/casing
    if (sampleCount && created + updated + skipped < sampleCount) {
      console.log('[sample row]', row)
    }
    const nameRaw = pickFirst(row, ['test name', 'name', 'testname', 'test'])
    const priceRaw = pickFirst(row, ['price', 'rate', 'amount', 'charges', 'fee'])

    const name = String(nameRaw || '').trim()
    if (!name) { skipped++; continue }

    const priceNumber = normalizePrice(priceRaw)

    if (dryRun) {
      console.log(`[dry-run] would upsert`, { name, price: priceNumber })
      created++
      continue
    }

    const res = await LabTest.updateOne(
      { name },
      { $set: { price: priceNumber }, $setOnInsert: { name } },
      { upsert: true }
    )

    if ((res as any).upsertedId || (res as any).upsertedCount) created++
    else if ((res as any).modifiedCount) updated++
    else skipped++
  }

  console.log('Import finished:', { total: rows.length, created, updated, skipped })
  process.exit(0)
}

function normalizePrice(value: any): number {
  if (value === undefined || value === null) return 0
  if (typeof value === 'number') return value
  const s = String(value).replace(/[,\s]/g, '')
  const n = Number(s)
  return Number.isFinite(n) ? n : 0
}

function normalizeRowKeys(obj: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {}
  for (const [k, v] of Object.entries(obj)) {
    const key = String(k).trim().toLowerCase().replace(/\s+/g, ' ')
    out[key] = v
  }
  return out
}

function pickFirst(obj: Record<string, any>, keys: string[]): any {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== '') return obj[k]
  }
  return undefined
}

main().catch(err => {
  console.error('Import failed:', err)
  process.exit(1)
})
