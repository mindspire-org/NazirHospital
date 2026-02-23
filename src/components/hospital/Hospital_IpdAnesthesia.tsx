import { useState } from 'react'
import Hospital_IpdAnesPreAssessment from './Hospital_IpdAnesPreAssessment'
import Hospital_IpdAnesIntraAssessment from './Hospital_IpdAnesIntraAssessment'
import Hospital_IpdAnesRecovery from './Hospital_IpdAnesRecovery'
import Hospital_IpdAnesPostRecovery from './Hospital_IpdAnesPostRecovery'
import Hospital_IpdAnesAdverseEvents from './Hospital_IpdAnesAdverseEvents'

export default function Hospital_IpdAnesthesia({ encounterId }: { encounterId: string }){
  const [tab, setTab] = useState<'pre'|'intra'|'recovery'|'post'|'adverse'>('pre')
  return (
    <div className="space-y-3" data-encounterid={encounterId}>
      <div className="flex flex-wrap gap-1">
        <AnesTab label="Pre-Assessment" active={tab==='pre'} onClick={()=>setTab('pre')} />
        <AnesTab label="Intra" active={tab==='intra'} onClick={()=>setTab('intra')} />
        <AnesTab label="Recovery" active={tab==='recovery'} onClick={()=>setTab('recovery')} />
        <AnesTab label="Post-Recovery" active={tab==='post'} onClick={()=>setTab('post')} />
        <AnesTab label="Adverse Events" active={tab==='adverse'} onClick={()=>setTab('adverse')} />
      </div>
      {tab==='pre' && (<Hospital_IpdAnesPreAssessment encounterId={encounterId} />)}
      {tab==='intra' && (<Hospital_IpdAnesIntraAssessment encounterId={encounterId} />)}
      {tab==='recovery' && (<Hospital_IpdAnesRecovery encounterId={encounterId} />)}
      {tab==='post' && (<Hospital_IpdAnesPostRecovery encounterId={encounterId} />)}
      {tab==='adverse' && (<Hospital_IpdAnesAdverseEvents encounterId={encounterId} />)}
    </div>
  )
}

function AnesTab({ label, active, onClick }: { label: string; active?: boolean; onClick: ()=>void }){
  return (
    <button onClick={onClick} className={`rounded-md px-3 py-1 text-sm ${active ? 'bg-slate-200 text-slate-900' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>{label}</button>
  )
}
