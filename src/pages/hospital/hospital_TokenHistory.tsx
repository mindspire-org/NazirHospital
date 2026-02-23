import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import Hospital_TokenSlip, { type TokenSlipData } from '../../components/hospital/Hospital_TokenSlip'
import { hospitalApi } from '../../utils/api'
import { previewHospitalRxPdf } from '../../utils/hospitalRxPdf'

interface TokenRow {
  _id: string
  date: string
  time: string
  tokenNo: string
  mrNo: string
  patient: string
  guardianRel?: string
  guardianName?: string
  cnic?: string
  age?: string
  gender?: string
  phone?: string
  doctor?: string
  department?: string
  fee: number
  discount: number
  status: 'queued'|'in-progress'|'completed'|'returned'|'cancelled'
}

export default function Hospital_TokenHistory() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [page, setPage] = useState(1)
  const [actioningId, setActioningId] = useState<string | null>(null)

  const today = new Date().toISOString().slice(0,10)
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(today)
  const [department, setDepartment] = useState<string>('All')
  const [doctor, setDoctor] = useState<string>('All')
  const [departments, setDepartments] = useState<any[]>([])
  const [doctors, setDoctors] = useState<any[]>([])
  const [rows, setRows] = useState<TokenRow[]>([])
  const [showSlip, setShowSlip] = useState(false)
  const [slipData, setSlipData] = useState<TokenSlipData | null>(null)

  useEffect(() => { loadFilters() }, [])
  useEffect(() => { load() }, [from, to, department, doctor])

  async function loadFilters(){
    try {
      const [deps, docs] = await Promise.all([
        hospitalApi.listDepartments() as any,
        hospitalApi.listDoctors() as any,
      ])
      setDepartments(deps.departments || [])
      setDoctors(docs.doctors || [])
    } catch {}
  }

  async function load(){
    const params: any = { from, to }
    if (department !== 'All') params.departmentId = department
    if (doctor !== 'All') params.doctorId = doctor
    const res = await hospitalApi.listTokens(params) as any
    const items: TokenRow[] = (res.tokens || []).map((t: any) => ({
      _id: t._id,
      date: t.dateIso,
      time: t.createdAt ? new Date(t.createdAt).toLocaleTimeString() : '',
      tokenNo: t.tokenNo,
      mrNo: t.patientId?.mrn || t.mrn || '-',
      patient: t.patientId?.fullName || t.patientName || '-',
      guardianRel: t.patientId?.guardianRel,
      guardianName: t.patientId?.fatherName,
      cnic: t.patientId?.cnicNormalized || t.patientId?.cnic,
      age: t.patientId?.age,
      gender: t.patientId?.gender,
      phone: t.patientId?.phoneNormalized,
      doctor: t.doctorId?.name || '-',
      department: t.departmentId?.name || '-',
      fee: Number(t.fee || 0),
      discount: Number(t.discount || 0),
      status: t.status,
    }))
    setRows(items)
    setPage(1)
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const start = new Date(from)
    const end = new Date(to)
    end.setHours(23,59,59,999)

    return rows.filter(r => {
      const d = new Date(r.date)
      if (d < start || d > end) return false
      if (department !== 'All' && r.department !== (departments.find(x=>x._id===department)?.name || r.department)) return false
      if (doctor !== 'All' && r.doctor !== (doctors.find(x=>x._id===doctor)?.name || r.doctor)) return false
      if (!q) return true
      return [r.patient, r.mrNo, r.tokenNo, r.phone, r.doctor, r.department, r.gender, r.cnic, r.guardianName, r.guardianRel, r.time]
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(q))
    })
  }, [query, from, to, department, doctor, rows, departments, doctors])

  const revenueRows = useMemo(() => filtered.filter(r => r.status !== 'returned'), [filtered])

  const totalTokens = filtered.length
  const totalRevenue = revenueRows.reduce((s, r) => s + r.fee, 0)
  const totalDiscount = revenueRows.reduce((s, r) => s + (r.discount || 0), 0)
  const discountTokens = revenueRows.filter(r => (r.discount || 0) > 0).length
  const returnedPatients = filtered.filter(r=>r.status==='returned').length

  async function setStatus(row: TokenRow, next: TokenRow['status']){
    try{
      setActioningId(row._id)
      await hospitalApi.updateTokenStatus(row._id, next)
      await load()
    } catch (e: any){
      alert(e?.message || 'Failed to update status')
    } finally {
      setActioningId(null)
    }
  }

  function printSlip(r: TokenRow){
    const slip: TokenSlipData = {
      tokenNo: r.tokenNo,
      departmentName: r.department || '-',
      doctorName: r.doctor || '-',
      patientName: r.patient || '-',
      phone: r.phone || '',
      mrn: r.mrNo || '',
      age: r.age,
      gender: r.gender,
      guardianRel: r.guardianRel,
      guardianName: r.guardianName,
      cnic: r.cnic,
      amount: r.fee + (r.discount || 0),
      discount: r.discount || 0,
      payable: r.fee,
      createdAt: `${r.date}T${r.time}`,
    }
    setSlipData(slip)
    setShowSlip(true)
  }

  async function printRx(r: TokenRow){
    try{
      const s: any = await hospitalApi.getSettings()
      await previewHospitalRxPdf({
        settings: {
          name: s?.settings?.name || s?.name,
          address: s?.settings?.address || s?.address,
          phone: s?.settings?.phone || s?.phone,
          logoDataUrl: s?.settings?.logoDataUrl || s?.logoDataUrl,
        },
        doctor: { name: r.doctor || '-', departmentName: r.department || '-' },
        patient: {
          name: r.patient || '-',
          mrn: r.mrNo || '-',
          age: r.age,
          gender: r.gender,
          phone: r.phone,
        },
        items: [],
        createdAt: `${r.date}T${r.time}`,
        tokenNo: r.tokenNo,
      } as any)
    } catch (e: any){
      alert(e?.message || 'Failed to open prescription template')
    }
  }

  const startIdx = (page - 1) * rowsPerPage
  const pageRows = filtered.slice(startIdx, startIdx + rowsPerPage)
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage))

  function openEdit(r: TokenRow){
    navigate(`/hospital/token-generator?tokenId=${encodeURIComponent(r._id)}`)
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-slate-800">Token History <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{filtered.length}</span></h2>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <input type="date" value={from} onChange={e=>{setFrom(e.target.value); setPage(1)}} className="rounded-md border border-slate-300 px-2 py-1" />
          <span>to</span>
          <input type="date" value={to} onChange={e=>{setTo(e.target.value); setPage(1)}} className="rounded-md border border-slate-300 px-2 py-1" />
          <select value={department} onChange={e=>{setDepartment(e.target.value); setPage(1)}} className="rounded-md border border-slate-300 px-2 py-1">
            <option value="All">All Departments</option>
            {departments.map((d:any)=> <option key={d._id} value={d._id}>{d.name}</option>)}
          </select>
          <select value={doctor} onChange={e=>{setDoctor(e.target.value); setPage(1)}} className="rounded-md border border-slate-300 px-2 py-1">
            <option value="All">All Doctors</option>
            {doctors.map((d:any)=> <option key={d._id} value={d._id}>{d.name}</option>)}
          </select>
          <button className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50">Export CSV</button>
        </div>
      </div>

      <div className="mt-4">
        <input
          value={query}
          onChange={(e)=>{setQuery(e.target.value); setPage(1)}}
          placeholder="Search by name, token#, MR#, phone, doctor, department, age, gender, address, or time..."
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard title="Date" value={from === to ? from : `${from} → ${to}`} tone="amber" />
        <StatCard title="Total Tokens" value={totalTokens} tone="green" />
        <StatCard title="Revenue" value={`Rs. ${totalRevenue.toLocaleString()}`} tone="violet" />
        <StatCard title="Discount (PKR)" value={`Rs. ${totalDiscount.toLocaleString()}`} tone="violet" />
        <StatCard title="Discounted Tokens" value={discountTokens} tone="green" />
        <StatCard title="Returned" value={returnedPatients} tone="amber" />
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-slate-600">
              <Th>Date</Th>
              <Th>Time</Th>
              <Th>Token #</Th>
              <Th>MR #</Th>
              <Th>Patient</Th>
              <Th>Guardian</Th>
              <Th>CNIC</Th>
              <Th>Age</Th>
              <Th>Gender</Th>
              <Th>Phone</Th>
              <Th>Doctor</Th>
              <Th>Department</Th>
              <Th>Fee</Th>
              <Th>Discount</Th>
              <Th>Status</Th>
              <Th>Print</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {pageRows.map((r) => (
              <tr key={r._id} className={`text-slate-700 ${r.status === 'returned' ? 'bg-amber-50' : ''}`}>
                <Td>{r.date}</Td>
                <Td>{r.time}</Td>
                <Td className="font-semibold">{r.tokenNo}</Td>
                <Td>{r.mrNo}</Td>
                <Td>{r.patient}</Td>
                <Td>{(r.guardianRel || r.guardianName) ? `${r.guardianRel ? r.guardianRel + ' ' : ''}${r.guardianName || ''}`.trim() : '-'}</Td>
                <Td>{r.cnic || '-'}</Td>
                <Td>{r.age || '-'}</Td>
                <Td>{r.gender || '-'}</Td>
                <Td>{r.phone || '-'}</Td>
                <Td>{r.doctor || '-'}</Td>
                <Td>{r.department || '-'}</Td>
                <Td>{r.fee.toFixed(0)}</Td>
                <Td>{(r.discount || 0).toFixed(0)}</Td>
                <Td>{r.status}</Td>
                <Td>
                  <div className="flex flex-col gap-1">
                    <button onClick={() => printSlip(r)} className="text-sky-600 hover:underline text-left">Print Slip</button>
                    <button onClick={() => printRx(r)} className="text-violet-700 hover:underline text-left">Print Rx</button>
                  </div>
                </Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEdit(r)} title="Edit" className="text-sky-600 hover:text-sky-800">✏️</button>
                    <button
                      disabled={actioningId === r._id}
                      onClick={() => setStatus(r, r.status === 'returned' ? 'queued' : 'returned')}
                      title={r.status === 'returned' ? 'Undo Return' : 'Return'}
                      className={`disabled:opacity-50 ${r.status === 'returned' ? 'text-amber-800 hover:text-amber-900' : 'text-amber-600 hover:text-amber-800'}`}
                    >
                      ↩️
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex items-center justify-between border-t border-slate-200 p-3 text-sm text-slate-700">
          <div className="flex items-center gap-2">
            <span>Rows per page</span>
            <select value={rowsPerPage} onChange={e=>{setRowsPerPage(parseInt(e.target.value)); setPage(1)}} className="rounded-md border border-slate-300 px-2 py-1">
              {[10,20,50].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>Page {page} of {totalPages}</div>
          <div className="flex items-center gap-2">
            <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="rounded-md border border-slate-300 px-2 py-1 disabled:opacity-50">Prev</button>
            <button disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} className="rounded-md border border-slate-300 px-2 py-1 disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>
      {showSlip && slipData && (
        <Hospital_TokenSlip open={showSlip} onClose={()=>setShowSlip(false)} data={slipData as TokenSlipData} autoPrint={false} />
      )}
    </div>
  )
}

function Th({ children }: { children: ReactNode }) {
  return <th className="px-4 py-2 font-medium">{children}</th>
}
function Td({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <td className={`px-4 py-2 ${className}`}>{children}</td>
}

function StatCard({ title, value, tone }: { title: string; value: ReactNode; tone: 'blue'|'green'|'violet'|'amber' }) {
  const tones: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    violet: 'bg-violet-50 text-violet-700 border-violet-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
  }
  return (
    <div className={`rounded-xl border p-4 ${tones[tone]}`}>
      <div className="text-sm opacity-80">{title}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
      <div className="text-xs opacity-60">Real-time data</div>
    </div>
  )
}
