import { forwardRef, useImperativeHandle, useState } from 'react'
import SuggestField from '../SuggestField'

type Props = {
  initialTestsText?: string
  initialNotes?: string
  suggestionsTests?: string[]
  suggestionsNotes?: string[]
}

type Data = {
  tests?: string[]
  notes?: string
}

type Display = {
  testsText: string
  notes: string
}

export default forwardRef(function PrescriptionDiagnosticOrders({ initialTestsText = '', initialNotes = '', suggestionsTests = [], suggestionsNotes = [] }: Props, ref) {
  const [testsText, setTestsText] = useState<string>(initialTestsText)
  const [notes, setNotes] = useState<string>(initialNotes)

  useImperativeHandle(ref, () => ({
    getData(): Data {
      const tests = String(testsText||'').split(/\n|,/).map(s=>s.trim()).filter(Boolean)
      return {
        tests: tests.length ? tests : undefined,
        notes: notes?.trim() ? notes.trim() : undefined,
      }
    },
    getDisplay(): Display { return { testsText, notes } },
    setDisplay(next: Partial<Display>){ if (next.testsText !== undefined) setTestsText(next.testsText||''); if (next.notes !== undefined) setNotes(next.notes||'') },
  }))

  return (
    <div>
      <div className="mb-1 block text-sm font-semibold text-slate-700">Diagnostic Orders</div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm text-slate-700">Diagnostic Tests (comma or one per line)</label>
          <SuggestField rows={3} value={testsText} onChange={v=>setTestsText(v)} suggestions={suggestionsTests} placeholder="Ultrasound Abdomen, Echocardiography, CT Scan" />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-700">Diagnostic Notes</label>
          <SuggestField rows={2} value={notes} onChange={v=>setNotes(v)} suggestions={suggestionsNotes} />
        </div>
      </div>
    </div>
  )
})
