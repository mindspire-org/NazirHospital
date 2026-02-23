import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Hospital_AddFloorModal from '../../components/hospital/bed-management/Hospital_AddFloorModal'
import Hospital_AddRoomModal from '../../components/hospital/bed-management/Hospital_AddRoomModal'
import Hospital_AddWardModal from '../../components/hospital/bed-management/Hospital_AddWardModal'
import Hospital_ManageRoomsModal from '../../components/hospital/bed-management/Hospital_ManageRoomsModal'
import Hospital_ManageWardsModal from '../../components/hospital/bed-management/Hospital_ManageWardsModal'
import Hospital_ManageFloorsModal from '../../components/hospital/bed-management/Hospital_ManageFloorsModal'
import Hospital_ManageBedsModal from '../../components/hospital/bed-management/Hospital_ManageBedsModal'
import Hospital_AddBedModal from '../../components/hospital/bed-management/Hospital_AddBedModal'
import { hospitalApi } from '../../utils/api'

type Floor = { id: string; name: string; number?: string }
type Room = { id: string; name: string; floorId: string }
type Ward = { id: string; name: string; floorId: string }

type Bed = {
  id: string
  label: string
  floorId: string
  locationType: 'room' | 'ward'
  locationId: string
  status: 'available' | 'occupied'
  charges?: number
  category?: string
  occupantName?: string
  occupantMrn?: string
  occupantEncounterId?: string
}

// Remote-backed Bed Management (no localStorage)

export default function Hospital_BedManagement() {
  const navigate = useNavigate()
  const [floors, setFloors] = useState<Floor[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [wards, setWards] = useState<Ward[]>([])
  const [beds, setBeds] = useState<Bed[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(()=>{ void loadAll() }, [])
  async function loadAll(){
    setLoading(true)
    try {
      const [fRes, rRes, wRes, bRes] = await Promise.all([
        hospitalApi.listFloors() as any,
        hospitalApi.listRooms() as any,
        hospitalApi.listWards() as any,
        hospitalApi.listBeds() as any,
      ])
      setFloors((fRes.floors||[]).map((x:any)=>({ id: String(x._id), name: x.name, number: x.number })))
      setRooms((rRes.rooms||[]).map((x:any)=>({ id: String(x._id), name: x.name, floorId: String(x.floorId) })))
      setWards((wRes.wards||[]).map((x:any)=>({ id: String(x._id), name: x.name, floorId: String(x.floorId) })))
      setBeds((bRes.beds||[]).map((x:any)=>({ id: String(x._id), label: x.label, floorId: String(x.floorId), locationType: x.locationType, locationId: String(x.locationId), status: x.status, charges: x.charges, category: x.category, occupantName: x.occupantName, occupantMrn: x.occupantMrn, occupantEncounterId: x.occupantEncounterId ? String(x.occupantEncounterId) : undefined })))
    } finally { setLoading(false) }
  }

  const [filterFloor, setFilterFloor] = useState<string>('all')
  const [filterRoom, setFilterRoom] = useState<string>('all')
  const [filterWard, setFilterWard] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'available' | 'occupied'>('all')

  const filteredBeds = useMemo(() => {
    return beds.filter(b => {
      if (filterFloor !== 'all' && b.floorId !== filterFloor) return false
      if (filterRoom !== 'all' && b.locationType === 'room' && b.locationId !== filterRoom) return false
      if (filterWard !== 'all' && b.locationType === 'ward' && b.locationId !== filterWard) return false
      if (filterStatus !== 'all' && b.status !== filterStatus) return false
      return true
    })
  }, [beds, filterFloor, filterRoom, filterWard, filterStatus])

  const [openAddFloor, setOpenAddFloor] = useState(false)
  const [openAddRoom, setOpenAddRoom] = useState(false)
  const [openAddWard, setOpenAddWard] = useState(false)
  const [openManageRooms, setOpenManageRooms] = useState(false)
  const [openManageWards, setOpenManageWards] = useState(false)
  const [openAddBed, setOpenAddBed] = useState(false)
  const [openManageFloors, setOpenManageFloors] = useState(false)
  const [openManageBeds, setOpenManageBeds] = useState(false)

  

  const saveFloor = async (data: { name: string; number?: string }) => {
    await hospitalApi.createFloor({ name: data.name, number: data.number })
    setOpenAddFloor(false)
    await loadAll()
  }

  const saveRoom = async (data: { floorId: string; name: string }) => {
    await hospitalApi.createRoom({ floorId: data.floorId, name: data.name })
    setOpenAddRoom(false)
    await loadAll()
  }

  const saveWard = async (data: { floorId: string; name: string }) => {
    await hospitalApi.createWard({ floorId: data.floorId, name: data.name })
    setOpenAddWard(false)
    await loadAll()
  }

  const saveBeds = async (data: { floorId: string; locationType: 'room' | 'ward'; locationId: string; labels: string; charges?: string; category?: string }) => {
    const labels = data.labels.split(/\n|,/).map(s => s.trim()).filter(Boolean)
    if (!labels.length) return
    await hospitalApi.addBeds({ floorId: data.floorId, locationType: data.locationType, locationId: data.locationId, labels, charges: data.charges ? Number(data.charges) : undefined, category: data.category || undefined })
    setOpenAddBed(false)
    await loadAll()
  }

  const floorsMap = useMemo(() => Object.fromEntries(floors.map(f => [f.id, f])), [floors])
  const roomsByFloor = useMemo(() => floors.reduce<Record<string, Room[]>>((acc, f) => { acc[f.id] = rooms.filter(r => r.floorId === f.id); return acc }, {}), [floors, rooms])
  const wardsByFloor = useMemo(() => floors.reduce<Record<string, Ward[]>>((acc, f) => { acc[f.id] = wards.filter(w => w.floorId === f.id); return acc }, {}), [floors, wards])

  const groups = useMemo(() => {
    const byLocation: Record<string, { title: string; items: Bed[] }> = {}
    filteredBeds.forEach(b => {
      const key = `${b.locationType}:${b.locationId}`
      const locName = b.locationType === 'room' ? rooms.find(r => r.id === b.locationId)?.name : wards.find(w => w.id === b.locationId)?.name
      const floorName = floorsMap[b.floorId]?.name
      const title = locName ? `${locName} (${floorName || ''})` : `${b.locationType} (${floorName || ''})`
      if (!byLocation[key]) byLocation[key] = { title, items: [] }
      byLocation[key].items.push(b)
    })
    return byLocation
  }, [filteredBeds, rooms, wards, floorsMap])


  const updateFloor = async (id: string, data: { name?: string; number?: string }) => { await hospitalApi.updateFloor(id, data as any); await loadAll() }
  const removeFloor = async (id: string) => { if (!confirm('Delete this floor?')) return; await hospitalApi.deleteFloor(id); await loadAll() }

  const updateRoom = async (id: string, data: { name?: string; floorId?: string }) => { await hospitalApi.updateRoom(id, data as any); await loadAll() }
  const removeRoom = async (id: string) => { if (!confirm('Delete this room?')) return; await hospitalApi.deleteRoom(id); await loadAll() }

  const updateWard = async (id: string, data: { name?: string; floorId?: string }) => { await hospitalApi.updateWard(id, data as any); await loadAll() }
  const removeWard = async (id: string) => { if (!confirm('Delete this ward?')) return; await hospitalApi.deleteWard(id); await loadAll() }

  const updateBed = async (id: string, data: { label?: string; charges?: number; category?: string }) => { await hospitalApi.updateBed(id, data as any); await loadAll() }
  const removeBed = async (id: string) => { if (!confirm('Delete this bed?')) return; await hospitalApi.deleteBed(id); await loadAll() }

  return (
    <div>
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-2xl font-bold text-slate-800">Bed Management</div>
          <div className="flex flex-wrap gap-2">
            <button className="rounded-md border border-slate-300 px-3 py-1.5 text-sm" onClick={() => setOpenAddFloor(true)}>Add Floor</button>
            <button className="rounded-md border border-slate-300 px-3 py-1.5 text-sm" onClick={() => setOpenManageFloors(true)}>Manage Floors</button>
            <button className="rounded-md border border-slate-300 px-3 py-1.5 text-sm" onClick={() => setOpenAddRoom(true)}>Add Room</button>
            <button className="rounded-md border border-slate-300 px-3 py-1.5 text-sm" onClick={() => setOpenAddWard(true)}>Add Ward</button>
            <button className="rounded-md border border-slate-300 px-3 py-1.5 text-sm" onClick={() => setOpenManageRooms(true)}>Manage Rooms</button>
            <button className="rounded-md border border-slate-300 px-3 py-1.5 text-sm" onClick={() => setOpenManageWards(true)}>Manage Wards</button>
            <button className="rounded-md bg-violet-600 px-3 py-1.5 text-sm font-medium text-white" onClick={() => setOpenAddBed(true)}>Add Bed</button>
            <button className="rounded-md border border-slate-300 px-3 py-1.5 text-sm" onClick={() => setOpenManageBeds(true)}>Manage Beds</button>
          </div>
        </div>
        {loading && <div className="mt-3 text-sm text-slate-500">Loading...</div>}
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">
          <div>
            <div className="text-xs text-slate-500">Floor</div>
            <select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" value={filterFloor} onChange={e => { setFilterFloor(e.target.value); setFilterRoom('all'); setFilterWard('all') }}>
              <option value="all">All</option>
              {floors.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div>
            <div className="text-xs text-slate-500">Room</div>
            <select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" value={filterRoom} onChange={e => setFilterRoom(e.target.value)}>
              <option value="all">All</option>
              {rooms.filter(r => filterFloor === 'all' || r.floorId === filterFloor).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div>
            <div className="text-xs text-slate-500">Ward</div>
            <select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" value={filterWard} onChange={e => setFilterWard(e.target.value)}>
              <option value="all">All</option>
              {wards.filter(w => filterFloor === 'all' || w.floorId === filterFloor).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div>
            <div className="text-xs text-slate-500">Status</div>
            <select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}>
              <option value="all">All</option>
              <option value="available">Available</option>
              <option value="occupied">Occupied</option>
            </select>
          </div>
        </div>
      </div>

      {Object.entries(groups).map(([key, group]) => (
        <div key={key} className="mt-6">
          <div className="text-base font-semibold text-slate-800">{group.title}</div>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {group.items.map(b => (
              <div
                key={b.id}
                className={`rounded-xl border p-4 ${b.status === 'occupied' ? 'border-rose-200 bg-rose-50' : 'border-emerald-200 bg-emerald-50'} ${b.status==='occupied' && b.occupantEncounterId ? 'cursor-pointer hover:shadow-md' : ''}`}
                onClick={() => { if (b.status==='occupied' && b.occupantEncounterId) navigate(`/hospital/patient/${b.occupantEncounterId}`) }}
                role={b.status==='occupied' && b.occupantEncounterId ? 'button' : undefined}
                aria-label={b.status==='occupied' && b.occupantEncounterId ? `Open profile for ${b.occupantName||'patient'}` : undefined}
              >
                <div className={`text-3xl ${b.status === 'occupied' ? 'text-rose-500' : 'text-emerald-500'}`}>🛏️</div>
                <div className={`mt-2 text-2xl font-semibold ${b.status === 'occupied' ? 'text-rose-600' : 'text-emerald-600'}`}>{b.label}</div>
                <div className={`text-sm ${b.status === 'occupied' ? 'text-rose-600' : 'text-emerald-600'}`}>{b.status === 'occupied' ? 'Occupied' : 'Available'}</div>
                {b.status === 'occupied' && (
                  <div className="mt-1 text-sm text-rose-700">
                    {b.occupantName ? b.occupantName : '—'}
                    {b.occupantMrn ? <div className="text-xs text-rose-500">{b.occupantMrn}</div> : null}
                  </div>
                )}
                
              </div>
            ))}
          </div>
        </div>
      ))}

      <Hospital_AddFloorModal open={openAddFloor} onClose={() => setOpenAddFloor(false)} onSave={saveFloor} />
      <Hospital_ManageFloorsModal open={openManageFloors} onClose={() => setOpenManageFloors(false)} floors={floors} onUpdate={updateFloor} onDelete={removeFloor} />

      <Hospital_AddRoomModal open={openAddRoom} onClose={() => setOpenAddRoom(false)} floors={floors} onSave={saveRoom} />

      <Hospital_AddWardModal open={openAddWard} onClose={() => setOpenAddWard(false)} floors={floors} onSave={saveWard} />

      <Hospital_ManageRoomsModal open={openManageRooms} onClose={() => setOpenManageRooms(false)} rooms={rooms} floors={floors} floorsMap={floorsMap} onUpdate={updateRoom} onDelete={removeRoom} />

      <Hospital_ManageWardsModal open={openManageWards} onClose={() => setOpenManageWards(false)} wards={wards} floors={floors} floorsMap={floorsMap} onUpdate={updateWard} onDelete={removeWard} />

      <Hospital_AddBedModal open={openAddBed} onClose={() => setOpenAddBed(false)} floors={floors} roomsByFloor={roomsByFloor} wardsByFloor={wardsByFloor} onSave={saveBeds} />
      <Hospital_ManageBedsModal open={openManageBeds} onClose={() => setOpenManageBeds(false)} beds={beds} floorsMap={floorsMap} rooms={rooms} wards={wards} onUpdate={updateBed} onDelete={removeBed} />
    </div>
  )
}
