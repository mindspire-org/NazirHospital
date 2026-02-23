type ID = string

type InventoryItem = { id: ID; name: string; sku?: string; stock: number; unitCost?: number; unitPrice?: number }
type ProcedureItemUse = { itemId: ID; qty: number }
type Procedure = { id: ID; date: string; patientName?: string; doctorId?: ID; procedureName: string; price: number; itemsUsed: ProcedureItemUse[] }
type Token = {
  id: ID
  number: number
  date: string
  patientName?: string
  phone?: string
  mrNumber?: string
  age?: string
  gender?: string
  address?: string
  guardianRelation?: string
  guardianName?: string
  cnic?: string
  doctorId?: ID
  apptDate?: string
  fee?: number
  discount?: number
  payable?: number
  status?: 'queued'|'in-progress'|'completed'|'returned'|'cancelled'
}
type Supplier = { id: ID; name: string; contact?: string; phone?: string; email?: string }
type Expense = { id: ID; date: string; category: string; amount: number; note?: string }
type Doctor = { id: ID; name: string; specialty?: string; qualification?: string; phone?: string; fee?: number; shares?: number; username?: string; active?: boolean }
type User = { id: ID; username: string; role: string }
type AuditLog = { id: ID; ts: string; action: string; meta?: any }

type DB = {
  inventory: InventoryItem[]
  procedures: Procedure[]
  tokens: Token[]
  suppliers: Supplier[]
  expenses: Expense[]
  doctors: Doctor[]
  users: User[]
  audit: AuditLog[]
}

const KEY = 'aesthetic.db'

function load(): DB {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { inventory: [], procedures: [], tokens: [], suppliers: [], expenses: [], doctors: [], users: [], audit: [] }
    const parsed = JSON.parse(raw)
    return { inventory: [], procedures: [], tokens: [], suppliers: [], expenses: [], doctors: [], users: [], audit: [], ...parsed }
  } catch {
    return { inventory: [], procedures: [], tokens: [], suppliers: [], expenses: [], doctors: [], users: [], audit: [] }
  }
}

function save(db: DB) {
  try { localStorage.setItem(KEY, JSON.stringify(db)) } catch {}
}

function id(): ID { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}` }

function appendLog(action: string, meta?: any) {
  const db = load(); db.audit.push({ id: id(), ts: new Date().toISOString(), action, meta }); save(db)
}

export const aestheticStore = {
  reset() { save({ inventory: [], procedures: [], tokens: [], suppliers: [], expenses: [], doctors: [], users: [], audit: [] }) },

  getInventory(): InventoryItem[] { return load().inventory },
  addInventory(item: Omit<InventoryItem,'id'>): InventoryItem {
    const db = load(); const rec = { ...item, id: id(), stock: Math.max(0, Number(item.stock||0)) }
    db.inventory.push(rec); save(db); appendLog('inventory:add', { id: rec.id, name: rec.name }); return rec
  },
  updateInventory(id0: ID, patch: Partial<InventoryItem>) {
    const db = load(); const i = db.inventory.findIndex(x=>x.id===id0); if (i<0) return
    db.inventory[i] = { ...db.inventory[i], ...patch, stock: Math.max(0, Number((patch.stock ?? db.inventory[i].stock) || 0)) }
    save(db); appendLog('inventory:update', { id: id0 })
  },
  adjustStock(id0: ID, delta: number) {
    const db = load(); const i = db.inventory.findIndex(x=>x.id===id0); if (i<0) return false
    const next = Math.max(0, (db.inventory[i].stock||0) + Number(delta||0))
    db.inventory[i].stock = next; save(db); appendLog('inventory:adjust', { id: id0, delta }); return true
  },

  getDoctors(): Doctor[] { return load().doctors },
  addDoctor(d: Omit<Doctor,'id'>): Doctor { const db = load(); const rec = { ...d, id: id(), active: d.active ?? true }; db.doctors.push(rec); save(db); appendLog('doctor:add', { id: rec.id }); return rec },
  updateDoctor(id0: ID, patch: Partial<Doctor>) { const db = load(); const i = db.doctors.findIndex(x=>x.id===id0); if (i<0) return; db.doctors[i] = { ...db.doctors[i], ...patch }; save(db); appendLog('doctor:update', { id: id0 }) },
  deleteDoctor(id0: ID) { const db = load(); db.doctors = db.doctors.filter(x=>x.id!==id0); save(db); appendLog('doctor:delete', { id: id0 }) },

  getSuppliers(): Supplier[] { return load().suppliers },
  addSupplier(s: Omit<Supplier,'id'>): Supplier { const db = load(); const rec = { ...s, id: id() }; db.suppliers.push(rec); save(db); appendLog('supplier:add', { id: rec.id }); return rec },
  updateSupplier(id0: ID, patch: Partial<Supplier>) { const db = load(); const i = db.suppliers.findIndex(x=>x.id===id0); if (i<0) return; db.suppliers[i] = { ...db.suppliers[i], ...patch }; save(db); appendLog('supplier:update', { id: id0 }) },
  deleteSupplier(id0: ID) { const db = load(); db.suppliers = db.suppliers.filter(x=>x.id!==id0); save(db); appendLog('supplier:delete', { id: id0 }) },

  getUsers(): User[] { return load().users },
  addUser(u: Omit<User,'id'>): User { const db = load(); const rec = { ...u, id: id() }; db.users.push(rec); save(db); appendLog('user:add', { id: rec.id }); return rec },
  updateUser(id0: ID, patch: Partial<User>) { const db = load(); const i = db.users.findIndex(x=>x.id===id0); if (i<0) return; db.users[i] = { ...db.users[i], ...patch }; save(db); appendLog('user:update', { id: id0 }) },
  deleteUser(id0: ID) { const db = load(); db.users = db.users.filter(x=>x.id!==id0); save(db); appendLog('user:delete', { id: id0 }) },

  getExpenses(): Expense[] { return load().expenses },
  addExpense(e: Omit<Expense,'id'>): Expense { const db = load(); const rec = { ...e, id: id() }; db.expenses.push(rec); save(db); appendLog('expense:add', { id: rec.id, amount: rec.amount }); return rec },
  deleteExpense(id0: ID) { const db = load(); db.expenses = db.expenses.filter(x=>x.id!==id0); save(db); appendLog('expense:delete', { id: id0 }) },

  getTokens(): Token[] { return load().tokens },
  nextTokenNumber(dateISO: string): number {
    const day = dateISO.slice(0,10)
    const nums = load().tokens.filter(t => t.date.slice(0,10) === day).map(t => t.number)
    return nums.length ? Math.max(...nums)+1 : 1
  },
  addToken(t: Omit<Token,'id'>): Token { const db = load(); const rec = { ...t, id: id() }; db.tokens.push(rec); save(db); appendLog('token:add', { number: rec.number }); return rec },

  getProcedures(): Procedure[] { return load().procedures },
  addProcedure(p: Omit<Procedure,'id'>): { ok: boolean; error?: string; rec?: Procedure } {
    const db = load()
    for (const use of p.itemsUsed) {
      const itm = db.inventory.find(i=>i.id===use.itemId)
      if (!itm) return { ok: false, error: 'Item not found' }
      if ((itm.stock||0) < use.qty) return { ok: false, error: `Insufficient stock for ${itm.name}` }
    }
    for (const use of p.itemsUsed) {
      const itm = db.inventory.find(i=>i.id===use.itemId)!; itm.stock = Math.max(0, (itm.stock||0) - use.qty)
    }
    const rec: Procedure = { ...p, id: id() }
    db.procedures.push(rec)
    save(db)
    appendLog('procedure:add', { id: rec.id, price: rec.price, items: p.itemsUsed.length })
    return { ok: true, rec }
  },

  revenue(fromISO?: string, toISO?: string) {
    const arr = load().procedures
    const from = fromISO ? new Date(fromISO).getTime() : -Infinity
    const to = toISO ? new Date(toISO).getTime() : Infinity
    const list = arr.filter(p => {
      const ts = new Date(p.date).getTime()
      return ts >= from && ts <= to
    })
    const total = list.reduce((s,p)=> s + Number(p.price||0), 0)
    return { total, count: list.length, list }
  },

  log(action: string, meta?: any) { appendLog(action, meta) },
  getAudit(): AuditLog[] { return load().audit },
}

export type { InventoryItem, ProcedureItemUse, Procedure, Token, Supplier, Expense, Doctor, User, AuditLog }
