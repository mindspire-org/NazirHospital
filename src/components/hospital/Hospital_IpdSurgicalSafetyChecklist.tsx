import { useState } from 'react'
import SignIn from './Hospital_IpdSurgicalSafetySignIn'
import TimeOut from './Hospital_IpdSurgicalSafetyTimeOut'
import SignOut from './Hospital_IpdSurgicalSafetySignOut'

export default function Hospital_IpdSurgicalSafetyChecklist({ encounterId }: { encounterId: string }) {
  const [tab, setTab] = useState<'signin' | 'timeout' | 'signout'>('signin')

  return (
    <div className="space-y-3" data-encounterid={encounterId}>
      <div className="flex flex-wrap gap-1">
        <SubTab label="Sign In" active={tab === 'signin'} onClick={() => setTab('signin')} />
        <SubTab label="Time Out" active={tab === 'timeout'} onClick={() => setTab('timeout')} />
        <SubTab label="Sign Out" active={tab === 'signout'} onClick={() => setTab('signout')} />
      </div>

      {tab === 'signin' && <SignIn encounterId={encounterId} />}
      {tab === 'timeout' && <TimeOut encounterId={encounterId} />}
      {tab === 'signout' && <SignOut encounterId={encounterId} />}
    </div>
  )
}

function SubTab({ label, active, onClick }: { label: string; active?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-3 py-1 text-sm ${active ? 'bg-slate-200 text-slate-900' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
    >
      {label}
    </button>
  )
}
