import path from 'path'
import fs from 'fs'
import * as XLSX from 'xlsx'
import { connectDB } from '../config/db'
import { DiagnosticTest } from '../modules/diagnostic/models/Test'

async function main() {
  const args = process.argv.slice(2)
  const argSet = new Set(args)
  const dryRun = argSet.has('--dry-run')
  const sampleArg = args.find(a => a.startsWith('--sample='))
  const sampleCount = sampleArg ? Math.max(0, Number(sampleArg.split('=')[1])) : 0
  const fileArg = args.find(a => a.startsWith('--file='))

  const cwd = process.cwd()
  const defaultFilePath = path.resolve(cwd, '..', 'public', 'diagnostic test data.xlsx')
  const filePath = fileArg ? fileArg.substring('--file='.length) : defaultFilePath

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
  let sampled = 0

  for (const row of rows) {
    const nameRaw = pickFirst(row, ['test', 'test name', 'name', 'testname'])
    const priceRaw = pickFirst(row, ['rates', 'rate', 'price', 'amount', 'charges', 'fee'])

    const name = String(nameRaw || '').trim()
    if (!name) { skipped++; continue }

    const priceNumber = normalizePrice(priceRaw)

    if (sampleCount && sampled < sampleCount) {
      console.log('[sample row]', { name, price: priceNumber })
      sampled++
    }

    if (dryRun) {
      created++
      continue
    }

    const res = await DiagnosticTest.updateOne(
      { name },
      { $set: { price: priceNumber }, $setOnInsert: { name } },
      { upsert: true }
    ) as any

    if (res.upsertedId || res.upsertedCount) created++
    else if (res.modifiedCount) updated++
    else skipped++
  }

  console.log('Import finished:', { total: rows.length, created, updated, skipped })
  process.exit(0)
}

function normalizePrice(value: any): number {
  if (value === undefined || value === null) return 0
  if (typeof value === 'number') return value
  const s = String(value).replace(/[\,\s]/g, '')
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
