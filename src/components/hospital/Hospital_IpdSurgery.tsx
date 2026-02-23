import { useState } from 'react'
import PreoperativeNotes from './Hospital_IpdPreoperativeNotes'
import OperationNotes from './Hospital_IpdOperationNotes'
import PostOperativeOrder from './Hospital_IpdPostOperativeOrder'
import ConsultantNotes from './Hospital_IpdConsultantNotes'

export default function Hospital_IpdSurgery({ encounterId }: { encounterId: string }){
  const [tab, setTab] = useState<'preop'|'operation'|'postop'|'consultant'>('preop')
  return (
    <div className="space-y-3" data-encounterid={encounterId}>
      <div className="flex flex-wrap gap-1">
        <SurgeryTab label="Pre-Operative" active={tab==='preop'} onClick={()=>setTab('preop')} />
        <SurgeryTab label="Operation Notes" active={tab==='operation'} onClick={()=>setTab('operation')} />
        <SurgeryTab label="Post-Operative" active={tab==='postop'} onClick={()=>setTab('postop')} />
        <SurgeryTab label="Consultant Notes" active={tab==='consultant'} onClick={()=>setTab('consultant')} />
      </div>
      {tab==='preop' && (<PreoperativeNotes encounterId={encounterId} />)}
      {tab==='operation' && (<OperationNotes encounterId={encounterId} />)}
      {tab==='postop' && (<PostOperativeOrder encounterId={encounterId} />)}
      {tab==='consultant' && (<ConsultantNotes encounterId={encounterId} />)}
    </div>
  )
}

function SurgeryTab({ label, active, onClick }: { label: string; active?: boolean; onClick: ()=>void }){
  return (
    <button onClick={onClick} className={`rounded-md px-3 py-1 text-sm ${active ? 'bg-slate-200 text-slate-900' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>{label}</button>
  )
}
