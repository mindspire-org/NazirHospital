import React from 'react'

export default function BB_KpiCard({ title, value, hint, color = 'sky' }: { title: string; value: React.ReactNode; hint?: string; color?: 'sky'|'emerald'|'amber'|'rose'|'slate' }){
  const colorMap: Record<string, string> = {
    sky: 'bg-sky-100 text-sky-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    rose: 'bg-rose-100 text-rose-700',
    slate: 'bg-slate-100 text-slate-700',
  }
  const badge = colorMap[color] || colorMap.slate
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center gap-3">
        <div className={`rounded-md px-2 py-1 text-xs font-medium ${badge}`}>{title}</div>
        {hint && <div className="ml-auto text-xs text-slate-500 dark:text-slate-400">{hint}</div>}
      </div>
      <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{value}</div>
    </div>
  )
}
