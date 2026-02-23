#!/usr/bin/env node
/*
Usage:
  node ./scripts/import_pharmacy_draft.mjs \
    --file="D:/path/to/file.xlsx" \
    --invoice="INV-001" \
    --date="2026-01-07" \
    --supplier="Zain" \
    --sheet="Sheet1" \
    --token="<PHARMACY_BEARER_TOKEN>" \
    --api="http://127.0.0.1:4000/api"

Notes:
- Token: open the app in a browser, copy localStorage['pharmacy.token'] and pass via --token or set env PHARMACY_TOKEN.
- API URL defaults to http://127.0.0.1:4000/api, override with --api or env API_URL.
- Expected columns (case-insensitive, extra spaces allowed):
  Item Name, Pack, Expiry Date, Qty, Bonus, Rate, Gross, Disc %, Disc Amount, Extra Disc, Sale Tax, Add Tax, AWH Tax
  Minimum required per row: Item Name, Qty, Rate. Others are optional.
- Mapping rules:
  unitsPerPack = numeric part of Pack (default 1 if missing or unparsable)
  packs (Qty) = numeric Qty
  bonus = numeric Bonus (optional)
  grossBase = Rate * Qty (if Gross column provided it will only be used for cross-check, we still compute from Rate*Qty)
  discountAmt = Disc Amount + (Disc % of grossBase) + Extra Disc
  netBase = max(0, grossBase - discountAmt)
  totalUnits = unitsPerPack * (Qty + Bonus)
  buyPerUnit = (totalUnits>0) ? netBase/totalUnits : (Rate/unitsPerPack)
  buyPerPack = buyPerUnit * unitsPerPack
  lineTax (fixed Rs.) = (Sale Tax + Add Tax + AWH Tax) for the row
  expiry formatted to yyyy-mm-dd (accepts dd/mm/yyyy, dd-mm-yyyy, yyyy-mm-dd)
- The draft is created as a single purchase draft with all rows in the first (or specified) sheet.
*/
import fs from 'node:fs'
import path from 'node:path'
import XLSX from 'xlsx'

function arg(name, def){
  const k = `--${name}`
  const v = process.argv.find(a => a.startsWith(k+"="))
  if (v) return v.slice(k.length+1)
  return process.env[name.toUpperCase().replace(/-/g,'_')] || def
}

const file = arg('file')
if (!file) {
  console.error('Missing --file=path.xlsx')
  process.exit(1)
}
const invoice = arg('invoice', `INV-${Date.now()}`)
const dateIso = toIsoDate(arg('date', new Date().toISOString().slice(0,10)))
const supplierName = arg('supplier', '')
const sheetNameOpt = arg('sheet', '')
const api = arg('api', process.env.API_URL || 'http://127.0.0.1:4000/api')
const token = arg('token', process.env.PHARMACY_TOKEN || '')
// Optional: create one draft per Excel row when --per-row or --split is truthy
const perRow = ['1','true','yes','y','on'].includes(String(arg('per-row', arg('split','')) || '').toLowerCase())

if (!token) console.warn('[warn] No token provided. If your server requires auth, pass --token or set PHARMACY_TOKEN.')

if (!fs.existsSync(file)){
  console.error('File not found:', file)
  process.exit(1)
}

const wb = XLSX.read(fs.readFileSync(file))
let sheetName = sheetNameOpt || ''
let ws = null
if (sheetNameOpt){
  ws = wb.Sheets[sheetNameOpt]
} else {
  // Auto-detect sheet that contains at least one recognizable row (Item Name + Qty or Rate present)
  for (const sn of wb.SheetNames){
    const cand = wb.Sheets[sn]
    const probe = XLSX.utils.sheet_to_json(cand, { defval: '' })
    let ok = false
    for (const r of probe){
      const name = (getFromRow(r, ['Item Name','Item','Product','Medicine','Drug'])||'').toString().trim()
      const hasQty = toNum(getFromRow(r, ['Qty','Quantity','Packs','Qty (Packs)'])) > 0
      const hasRate = toNum(getFromRow(r, ['Rate','Buy/Pack','Purchase Rate','Rate/Pack'])) > 0
      const hasGross = toNum(getFromRow(r, ['Gross','Gross Amount'])) > 0
      if (name && (hasQty || hasRate || hasGross)) { ok = true; break }
    }
    if (ok){ sheetName = sn; ws = cand; break }
  }
}
if (!ws){
  // Fallback to first sheet if not found
  sheetName = sheetName || wb.SheetNames[0]
  ws = wb.Sheets[sheetName]
}
if (!ws){
  console.error('Sheet not found:', sheetName)
  process.exit(1)
}

// Read as objects keyed by header row
const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })

const lines = []
for (const r of rows){
  const get = (keys) => getFromRow(r, keys)
  const name = String(get(['Item Name','Item','Product','Medicine','Drug'])||'').trim()
  if (!name) continue
  const packRaw = String(get(['Pack','Units/Pack','Units Per Pack'])||'').toString()
  const unitsPerPack = parseUnitsPerPack(packRaw)
  const qty = toNum(get(['Qty','Quantity','Packs','Qty (Packs)'])) || 0
  const bonus = toNum(get(['Bonus','Free'])) || 0
  let rate = toNum(get(['Rate','Buy/Pack','Purchase Rate','Rate/Pack'])) || 0
  const grossExplicit = toNum(get(['Gross','Gross Amount'])) || 0
  if ((!rate || rate===0) && grossExplicit>0 && qty>0){
    rate = grossExplicit / qty
  }
  const grossBase = (rate||0) * (qty||0)
  const discPct = toNum(get(['Disc %','Disc%','Discount %','Discount%'])) || 0
  const discAmt = toNum(get(['Disc Amount','Discount','Discount Amount'])) || 0
  const extraDisc = toNum(get(['Extra Disc','Extra Discount'])) || 0
  const saleTax = toNum(get(['Sale Tax','GST','Sales Tax'])) || 0
  const addTax = toNum(get(['Add Tax','Additional Tax'])) || 0
  const awhTax = toNum(get(['AWH Tax','AWH'])) || 0
  const expiryRaw = String(get(['Expiry Date','Expiry','Exp'])) || ''

  const discountAmt = discAmt + (grossBase * (discPct/100)) + extraDisc
  let netBase = grossBase - discountAmt
  const netExplicit = toNum(get(['Net Amount','Net','Net Amt'])) || 0
  if (netExplicit>0) netBase = netExplicit
  const totalUnitsRaw = (unitsPerPack || 1) * (qty + bonus)
  const denomUnits = Math.abs(totalUnitsRaw)
  const buyPerUnit = denomUnits > 0 ? (Math.abs(netBase) / denomUnits) : (unitsPerPack>0? Math.abs(rate)/unitsPerPack : Math.abs(rate))
  const buyPerPack = buyPerUnit * Math.max(1, unitsPerPack || 1)
  const expiry = toIsoDate(expiryRaw)
  const taxSum = (saleTax||0) + (addTax||0) + (awhTax||0)

  const line = {
    name,
    unitsPerPack: unitsPerPack || 1,
    packs: qty || 0,
    totalItems: totalUnitsRaw || 0,
    buyPerPack: round(buyPerPack),
    buyPerUnit: round(buyPerUnit, 6),
    salePerPack: 0,
    salePerUnit: 0,
    ...(expiry ? { expiry } : {}),
    ...(taxSum>0 ? { lineTaxType: 'fixed', lineTaxValue: round(taxSum) } : {}),
  }
  // Skip only truly empty rows (no name OR neither qty/bonus nor any monetary value)
  const isEmptyQty = (Number(qty||0) === 0 && Number(bonus||0) === 0)
  const hasMoney = (Number(rate||0) !== 0) || (Number(grossExplicit||0) !== 0) || (Number(discountAmt||0) !== 0) || (Number(taxSum||0) !== 0)
  if (!line.name) continue
  if (isEmptyQty && !hasMoney) continue
  lines.push(line)
}

if (!lines.length){
  console.error('No valid item rows found. Ensure your sheet has at least Item Name, Qty, and Rate columns.')
  process.exit(1)
}

async function createDraft(payload){
  const res = await fetch(`${api}/pharmacy/purchase-drafts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok){
    const text = await res.text()
    throw new Error(`Failed: ${res.status} ${text}`)
  }
  return await res.json()
}

if (perRow){
  let created = 0
  for (let i=0;i<lines.length;i++){
    const line = lines[i]
    const inv = `${invoice}-${String(i+1).padStart(3,'0')}`
    const payload = {
      date: dateIso,
      invoice: inv,
      supplierName: supplierName || undefined,
      invoiceTaxes: [],
      discount: 0,
      lines: [line],
    }
    console.log(`Creating draft (${i+1}/${lines.length}): invoice=${inv}, item=${line.name}`)
    try{
      const json = await createDraft(payload)
      console.log('  OK:', json?._id || json?.id || '')
      created++
    }catch(err){
      console.error('  Error:', err.message)
    }
  }
  console.log(`Done. Created ${created}/${lines.length} drafts.`)
} else {
  const payload = {
    date: dateIso,
    invoice,
    supplierName: supplierName || undefined,
    invoiceTaxes: [],
    discount: 0,
    lines,
  }
  console.log(`Creating draft: invoice=${invoice}, date=${dateIso}, supplier=${supplierName||'-'}, lines=${lines.length}`)
  try{
    const json = await createDraft(payload)
    console.log('OK Draft Created:', json?._id || json?.id || '')
  }catch(err){
    console.error(err.message)
    process.exit(1)
  }
}

function normalize(s){
  return String(s||'')
    .replace(/\u00A0/g,' ') // nbsp
    .trim()
    .toLowerCase()
    .replace(/\s+/g,'')
}
function getFromRow(r, keys){
  for (const k of keys){
    const found = Object.keys(r).find(h => normalize(h) === normalize(k))
    if (found!=null) return r[found]
  }
  return undefined
}
function toNum(v){
  if (v==null) return 0
  if (typeof v === 'number' && !Number.isNaN(v)) return v
  const s = String(v).replace(/,/g,'').trim()
  const m = s.match(/-?\d+(?:\.\d+)?/)
  return m ? Number(m[0]) : 0
}
function parseUnitsPerPack(v){
  if (v==null) return 1
  if (typeof v==='number') return v||1
  const s = String(v).trim()
  // Extract leading number, e.g., "100N" -> 100, "1S" -> 1
  const m = s.match(/(\d+(?:\.\d+)?)/)
  return m ? Math.max(1, Math.floor(Number(m[1]))) : 1
}
function toIsoDate(v){
  if (!v) return ''
  if (typeof v === 'number'){ // Excel date serial
    try { return XLSX.SSF.format('yyyy-mm-dd', v) } catch { return '' }
  }
  const s = String(v).trim()
  if (!s) return ''
  // yyyy-mm-dd or yyyy/mm/dd
  let m = s.match(/^(\d{4})[-\/]?(\d{2})[-\/]?(\d{2})$/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  // dd/mm/yyyy or dd-mm-yyyy
  m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/)
  if (m){
    const d = m[1].padStart(2,'0'), mo = m[2].padStart(2,'0'), y = m[3]
    return `${y}-${mo}-${d}`
  }
  // mm/dd/yyyy (fallback when second part > 12 heuristic)
  m = s.match(/^(\d{1,2})[\.-](\d{1,2})[\.-](\d{4})$/)
  if (m){
    const a = Number(m[1]), b = Number(m[2])
    const mo = (a>12? b : a).toString().padStart(2,'0')
    const d = (a>12? a : b).toString().padStart(2,'0')
    return `${m[3]}-${mo}-${d}`
  }
  return ''
}
function round(n, p=2){
  const f = Math.pow(10, p)
  return Math.round((Number(n)||0) * f) / f
}
