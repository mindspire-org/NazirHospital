import { useEffect, useState } from 'react'
import BB_DonorList from '../../../components/lab/bloodbank/BB_DonorList'
import BB_AddDonor from '../../../components/lab/bloodbank/BB_AddDonor'
import BB_DonorProfile from '../../../components/lab/bloodbank/BB_DonorProfile'
import type { Donor } from '../../../components/lab/bloodbank/BB_AddDonor'
import { labApi } from '../../../utils/api'
import BB_AddBag from '../../../components/lab/bloodbank/BB_AddBag'

export default function Lab_BB_Donors(){
  const [donors, setDonors] = useState<Donor[]>([])
  const [sel, setSel] = useState<string | undefined>(undefined)
  const [openAdd, setOpenAdd] = useState(false)
  const [openEdit, setOpenEdit] = useState(false)
  const [editDonor, setEditDonor] = useState<Donor | undefined>(undefined)
  const [openProfile, setOpenProfile] = useState(false)
  const [profileDonor, setProfileDonor] = useState<Donor | undefined>(undefined)
  const [openBag, setOpenBag] = useState(false)
  const [bagInitial, setBagInitial] = useState<{ id: string; donor: string; type: string; vol: number; coll: string; exp: string; status: string } | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [refreshTick, setRefreshTick] = useState(0)
  const [q, setQ] = useState('')
  const [qDraft, setQDraft] = useState('')

  useEffect(()=>{
    let mounted = true
    ;(async()=>{
      setLoading(true)
      try {
        const res = await labApi.listBBDonors({ q: q || undefined, page, limit })
        if (!mounted) return
        const mapped: Donor[] = (res.items || []).map((d: any)=>({
          id: d._id,
          code: d.code,
          name: d.name,
          gender: d.gender || '',
          type: d.type || '',
          age: d.age,
          cnic: d.cnic,
          phone: d.phone,
          address: d.address,
          weight: d.weight,
          height: d.height,
          lastDonationDate: d.lastDonationDate,
          donated3Months: d.donated3Months || '',
          tattoo6Months: d.tattoo6Months || '',
          antibiotics: d.antibiotics || '',
          traveled6Months: d.traveled6Months || '',
          consent: !!d.consent,
        }))
        setDonors(mapped)
        setTotal(res.total || 0)
        setTotalPages(res.totalPages || 1)
        setSel(undefined)
      } finally { setLoading(false) }
    })()
    return ()=>{ mounted = false }
  }, [page, limit, refreshTick, q])
  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <div className="text-2xl font-semibold">Donors</div>
          <div className="text-sm text-slate-500">Manage donor records and registrations.</div>
        </div>
      <BB_AddBag
        open={openBag}
        initial={bagInitial as any}
        onClose={()=>setOpenBag(false)}
        onCreate={async (r)=>{
          try {
            await labApi.createBBBag({
              bagId: r.id,
              donorName: r.donor,
              bloodType: r.type,
              volume: r.vol,
              collectionDate: r.coll,
              expiryDate: r.exp,
              status: r.status,
              notes: (r as any).notes,
            })
            setOpenBag(false)
          } catch {}
        }}
      />
        <div className="flex items-center gap-2">
          <input value={qDraft} onChange={e=>setQDraft(e.target.value)} placeholder="Search name/phone/cnic" className="w-56 rounded-md border border-slate-300 px-2 py-1 text-sm" />
          <button onClick={()=>{ setPage(1); setQ(qDraft.trim()); }} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm">Search</button>
          <button onClick={()=>{ setQDraft(''); setQ(''); setPage(1); }} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm">Clear</button>
          <button onClick={()=>setOpenAdd(true)} className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700">+ Add Donor</button>
        </div>
      </div>

      <div className="mb-4">
        <BB_DonorList
          rows={donors}
          selectedId={sel}
          onSelect={(id)=>setSel(id)}
          onView={(id)=>{ const d = donors.find(x=>x.id===id); setProfileDonor(d); setOpenProfile(Boolean(d)); }}
          onEdit={(id)=>{ const d = donors.find(x=>x.id===id); setEditDonor(d); setOpenEdit(Boolean(d)); }}
          onAddToInventory={(id)=>{
            const d = donors.find(x=>x.id===id)
            if (!d) return
            setBagInitial({ id: '', donor: d.name, type: d.type || '', vol: 450, coll: '', exp: '', status: 'Available' })
            setOpenBag(true)
          }}
          onDelete={async (id)=>{
            try {
              await labApi.deleteBBDonor(id)
              const res = await labApi.listBBDonors({ q: q || undefined, page, limit })
              if ((res.items||[]).length === 0 && page > 1) {
                setPage(p=> Math.max(1, p-1))
              } else {
                const mapped: Donor[] = (res.items || []).map((d: any)=>({
                  id: d._id,
                  code: d.code,
                  name: d.name,
                  gender: d.gender || '',
                  type: d.type || '',
                  age: d.age,
                  cnic: d.cnic,
                  phone: d.phone,
                  address: d.address,
                  weight: d.weight,
                  height: d.height,
                  lastDonationDate: d.lastDonationDate,
                  donated3Months: d.donated3Months || '',
                  tattoo6Months: d.tattoo6Months || '',
                  antibiotics: d.antibiotics || '',
                  traveled6Months: d.traveled6Months || '',
                  consent: !!d.consent,
                }))
                setDonors(mapped)
                setTotal(res.total || 0)
                setTotalPages(res.totalPages || 1)
                setSel(s=> s===id ? undefined : s)
              }
            } catch {}
          }}
        />
      </div>
      <div className="flex items-center justify-between text-sm text-slate-600">
        <div>Page {page} of {totalPages} • {total} total</div>
        <div className="flex items-center gap-2">
          <button disabled={loading || page<=1} onClick={()=>setPage(p=> Math.max(1, p-1))} className="rounded-md border border-slate-300 px-2 py-1 disabled:opacity-50">Prev</button>
          <button disabled={loading || page>=totalPages} onClick={()=>setPage(p=> p+1)} className="rounded-md border border-slate-300 px-2 py-1 disabled:opacity-50">Next</button>
          <select value={limit} onChange={e=>{ setPage(1); setLimit(Number(e.target.value)) }} className="rounded-md border border-slate-300 px-2 py-1">
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>
      <BB_AddDonor
        open={openAdd}
        onClose={()=>setOpenAdd(false)}
        onCreate={async (d)=>{
          try {
            await labApi.createBBDonor({
              name: d.name,
              gender: d.gender,
              type: d.type,
              age: d.age,
              cnic: d.cnic,
              phone: d.phone,
              address: d.address,
              weight: d.weight,
              height: d.height,
              lastDonationDate: d.lastDonationDate,
              donated3Months: d.donated3Months,
              tattoo6Months: d.tattoo6Months,
              antibiotics: d.antibiotics,
              traveled6Months: d.traveled6Months,
              consent: d.consent,
            })
            setOpenAdd(false)
            setPage(1)
            setRefreshTick(t=>t+1)
          } catch {}
        }}
      />
      <BB_AddDonor
        open={openEdit}
        mode="edit"
        initial={editDonor}
        onClose={()=>setOpenEdit(false)}
        onUpdate={async (d)=>{
          try {
            await labApi.updateBBDonor(d.id, {
              name: d.name,
              gender: d.gender,
              type: d.type,
              age: d.age,
              cnic: d.cnic,
              phone: d.phone,
              address: d.address,
              weight: d.weight,
              height: d.height,
              lastDonationDate: d.lastDonationDate,
              donated3Months: d.donated3Months,
              tattoo6Months: d.tattoo6Months,
              antibiotics: d.antibiotics,
              traveled6Months: d.traveled6Months,
              consent: d.consent,
            })
            setOpenEdit(false)
            setSel(d.id)
            setRefreshTick(t=>t+1)
          } catch {}
        }}
      />
      <BB_DonorProfile
        open={openProfile}
        onClose={()=>setOpenProfile(false)}
        donor={profileDonor}
      />
    </div>
  )
}
