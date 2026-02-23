export type DocumentInstance = {
  id: string
  patientId: string
  encounterId?: string
  type: string // e.g., "Invoice", "ShortStay", "DeathCertificate", "ReceivedDeath", "BloodDonationConsent", "TestTubeConsent"
  version: number
  status: 'draft' | 'final'
  createdAt: string
  updatedAt: string
  verificationCode: string
  meta?: Record<string, any>
}

const KEY = 'hospital.documents'

export function listDocuments(): DocumentInstance[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') as DocumentInstance[] } catch { return [] }
}

export function saveDocuments(docs: DocumentInstance[]) {
  localStorage.setItem(KEY, JSON.stringify(docs))
}

export function addDocument(doc: Omit<DocumentInstance,'id'|'version'|'createdAt'|'updatedAt'|'verificationCode'|'status'> & { status?: DocumentInstance['status'], version?: number }): DocumentInstance {
  const all = listDocuments()
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  const verificationCode = genCode()
  const full: DocumentInstance = {
    id,
    verificationCode,
    createdAt: now,
    updatedAt: now,
    version: doc.version ?? 1,
    status: doc.status ?? 'final',
    meta: {},
    ...doc,
  }
  all.unshift(full)
  saveDocuments(all)
  return full
}

function genCode() {
  const s = Math.random().toString(36).slice(2, 8).toUpperCase()
  const t = Date.now().toString().slice(-4)
  return `${s}-${t}`
}
