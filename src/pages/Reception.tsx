import { Link } from 'react-router-dom'

export default function Reception() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-6">
        <Link to="/" className="text-sky-700 hover:underline">← Back</Link>
      </div>
      <h2 className="text-2xl font-bold text-slate-800">Reception</h2>
      <p className="mt-2 text-slate-600">Front-desk, patient registration, and triage.</p>
    </div>
  )
}
