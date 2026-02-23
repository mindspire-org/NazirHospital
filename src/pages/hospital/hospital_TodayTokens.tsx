import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { hospitalApi } from '../../utils/api'
import Hospital_TokenSlip, { type TokenSlipData } from '../../components/hospital/Hospital_TokenSlip'
import { previewHospitalRxPdf } from '../../utils/hospitalRxPdf'

interface TokenRow {
  _id: string
  time: string
  tokenNo: string
  mrNo: string
  patient: string
  age?: string
  gender?: string
  phone?: string
  doctor?: string
  department?: string
  fee: number
  discount: number
  status: 'queued'|'in-progress'|'completed'|'returned'|'cancelled'
}

export default function Hospital_TodayTokens() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<TokenRow[]>([])
  const [query, setQuery] = useState('')
  const [departmentId, setDepartmentId] = useState<string>('All')
  const [doctorId, setDoctorId] = useState<string>('All')
  const [departments, setDepartments] = useState<any[]>([])
  const [doctors, setDoctors] = useState<any[]>([])
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [page, setPage] = useState(1)
  const [showSlip, setShowSlip] = useState(false)
  const [slipData, setSlipData] = useState<TokenSlipData | null>(null)
  const [actioningId, setActioningId] = useState<string | null>(null)


  useEffect(() => {
    ;(async()=>{
      try {
        const [deps, docs] = await Promise.all([
          hospitalApi.listDepartments() as any,
          hospitalApi.listDoctors() as any,
        ])
        setDepartments(deps?.departments || deps?.data || deps || [])
        setDoctors(docs?.doctors || docs?.data || docs || [])
      } catch {
        setDepartments([])
        setDoctors([])
      }
    })()
  }, [])

  useEffect(() => { load() }, [departmentId, doctorId])

  async function load(){
    const today = new Date().toISOString().slice(0,10)
    const params: any = { date: today }
    if (departmentId !== 'All') params.departmentId = departmentId
    if (doctorId !== 'All') params.doctorId = doctorId
    const res = await hospitalApi.listTokens(params) as any
    const items: TokenRow[] = (res.tokens || []).map((t: any) => ({
      _id: t._id,
      time: t.createdAt ? new Date(t.createdAt).toLocaleTimeString() : '',
      tokenNo: t.tokenNo,
      mrNo: t.patientId?.mrn || t.mrn || '-',
      patient: t.patientId?.fullName || t.patientName || '-',
      age: t.patientId?.age,
      gender: t.patientId?.gender,
      phone: t.patientId?.phoneNormalized,
      doctor: t.doctorId?.name || '-',
      department: t.departmentId?.name || '-',
      fee: Number(t.fee || 0),
      discount: Number(t.discount || 0),
      status: t.status,
    }))
    setRows(items.filter(r => r.status !== 'cancelled'))
    setPage(1)
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(r =>
      [r.patient, r.mrNo, r.tokenNo, r.phone, r.doctor, r.department, r.gender, r.time]
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(q))
    )
  }, [query, rows])

  const revenueRows = useMemo(() => filtered.filter(r => r.status !== 'returned'), [filtered])

  const totalPatients = filtered.length
  const totalTokens = filtered.length
  const totalRevenue = revenueRows.reduce((s, r) => s + r.fee, 0)
  const totalDiscount = revenueRows.reduce((s, r) => s + (r.discount || 0), 0)
  const discountTokens = revenueRows.filter(r => (r.discount || 0) > 0).length
  const returnedPatients = filtered.filter(r => r.status === 'returned').length

  const start = (page - 1) * rowsPerPage
  const pageRows = filtered.slice(start, start + rowsPerPage)
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage))

  async function setStatus(row: TokenRow, status: TokenRow['status']){
    try{
      setActioningId(row._id)
      await hospitalApi.updateTokenStatus(row._id, status)
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
      amount: r.fee + (r.discount || 0),
      discount: r.discount || 0,
      payable: r.fee,
      createdAt: new Date().toISOString(),
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
        createdAt: new Date().toISOString(),
        tokenNo: r.tokenNo,
      } as any)
    } catch (e: any){
      alert(e?.message || 'Failed to open prescription template')
    }
  }

  function openEdit(r: TokenRow){
    navigate(`/hospital/token-generator?tokenId=${encodeURIComponent(r._id)}`)
  }

  

  // No index mapping needed when actions use row ids

  const exportCSV = () => {
    const cols = ['Time','Token #','MR #','Patient','Age','Gender','Phone','Doctor','Department','Fee','Returned']
    const lines = [cols.join(',')]
    for (const r of filtered) {
      lines.push([
        r.time,
        r.tokenNo,
        r.mrNo,
        r.patient,
        r.age ?? '',
        r.gender ?? '',
        r.phone ?? '',
        r.doctor ?? '',
        r.department ?? '',
        r.fee,
        r.status === 'returned' ? 'Yes' : 'No',
      ].map(v => typeof v === 'string' && v.includes(',') ? `"${v.replace(/"/g,'""')}"` : String(v)).join(','))
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `todays-tokens-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-800">Today's Tokens <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{filtered.length}</span></h2>
        <button onClick={exportCSV} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">Export CSV</button>
      </div>

      <div className="mt-4">
        <input
          value={query}
          onChange={(e)=>{ setQuery(e.target.value); setPage(1) }}
          placeholder="Search by name, token#, MR#, phone, doctor, department, age, gender, address, or time..."
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <select value={departmentId} onChange={e=>{ setDepartmentId(e.target.value); setPage(1) }} className="rounded-md border border-slate-300 px-2 py-1">
          <option value="All">All Departments</option>
          {departments.map((d:any) => (
            <option key={String(d._id || d.id)} value={String(d._id || d.id)}>{d.name}</option>
          ))}
        </select>
        <select value={doctorId} onChange={e=>{ setDoctorId(e.target.value); setPage(1) }} className="rounded-md border border-slate-300 px-2 py-1">
          <option value="All">All Doctors</option>
          {doctors.map((d:any) => (
            <option key={String(d._id || d.id)} value={String(d._id || d.id)}>{d.name}</option>
          ))}
        </select>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard title="Today's Patients" value={totalPatients} tone="blue" />
        <StatCard title="Tokens Generated" value={totalTokens} tone="green" />
        <StatCard title="Today's Revenue" value={`Rs. ${totalRevenue.toLocaleString()}`} tone="violet" />
        <StatCard title="Discount (PKR)" value={`Rs. ${totalDiscount.toLocaleString()}`} tone="violet" />
        <StatCard title="Discounted Tokens" value={discountTokens} tone="green" />
        <StatCard title="Returned Patients" value={returnedPatients} tone="amber" />
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-slate-600">
              <Th>Time</Th>
              <Th>Token #</Th>
              <Th>MR #</Th>
              <Th>Patient</Th>
              <Th>Age</Th>
              <Th>Gender</Th>
              <Th>Phone</Th>
              <Th>Doctor</Th>
              <Th>Department</Th>
              <Th>Fee</Th>
              <Th>Print</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {pageRows.map((r) => (
              <tr key={r._id} className={`text-slate-700 ${r.status === 'returned' ? 'bg-amber-50' : ''}`}>
                <Td>{r.time}</Td>
                <Td>{r.tokenNo}</Td>
                <Td>{r.mrNo}</Td>
                <Td className="font-medium">{r.patient}</Td>
                <Td>{r.age}</Td>
                <Td>{r.gender}</Td>
                <Td>{r.phone || '-'}</Td>
                <Td>{r.doctor || '-'}</Td>
                <Td>{r.department || '-'}</Td>
                <Td className="font-semibold text-emerald-600">Rs. {r.fee.toLocaleString()}</Td>
                <Td>
                  <div className="flex flex-col gap-1">
                    <button onClick={()=>printSlip(r)} className="text-sky-600 hover:underline text-left">Print Slip</button>
                    <button onClick={()=>printRx(r)} className="text-violet-700 hover:underline text-left">Print Rx</button>
                  </div>
                </Td>
                <Td>
                  <div className="flex gap-2">
                    <button disabled={actioningId===r._id} onClick={()=>openEdit(r)} title="Edit" className="text-sky-600 hover:text-sky-800 disabled:opacity-50">✏️</button>
                    <button disabled={actioningId===r._id} onClick={()=>setStatus(r, r.status === 'returned' ? 'queued' : 'returned')} title="Return" className={`hover:text-amber-800 ${r.status === 'returned' ? 'text-amber-800' : 'text-amber-600'} disabled:opacity-50`}>↩️</button>
                    <button disabled={actioningId===r._id} onClick={()=>{ if (confirm('Delete this token?')) setStatus(r,'cancelled') }} title="Cancel" className="text-rose-600 hover:text-rose-800 disabled:opacity-50">🗑️</button>
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
        <Hospital_TokenSlip open={showSlip} onClose={()=>setShowSlip(false)} data={slipData} autoPrint={false} />
      )}

    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-2 font-medium">{children}</th>
}
function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-2 ${className}`}>{children}</td>
}

function StatCard({ title, value, tone }: { title: string; value: React.ReactNode; tone: 'blue'|'green'|'violet'|'amber' }) {
  const tones: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    violet: 'bg-violet-50 text-violet-700 border-violet-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
  }
  return (
    <div className={`rounded-xl border p-4 ${tones[tone]}`}>
      <div className="text-sm text-slate-600 dark:text-slate-300 dark:opacity-100 opacity-80">{title}</div>
      <div className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">{value}</div>
      <div className="text-xs text-slate-500 dark:text-slate-400">Real-time data</div>
    </div>
  )
}
