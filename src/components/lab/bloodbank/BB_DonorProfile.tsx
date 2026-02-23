import type { Donor } from './BB_AddDonor'

type Props = {
  open: boolean
  onClose: () => void
  donor?: Donor
}

export default function BB_DonorProfile({ open, onClose, donor }: Props) {
  if (!open || !donor) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-full max-w-3xl rounded-xl bg-white shadow-lg">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="font-semibold">Donor Profile</div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700">✕</button>
        </div>
        <div className="p-4 text-sm">
          <div className="mb-2 text-sm font-semibold text-slate-700">Personal Identification</div>
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-12 sm:col-span-6"><div className="text-xs text-slate-500">Full Name</div><div className="font-medium">{donor.name}</div></div>
            <div className="col-span-6 sm:col-span-3"><div className="text-xs text-slate-500">Gender</div><div className="font-medium">{donor.gender || '-'}</div></div>
            <div className="col-span-6 sm:col-span-3"><div className="text-xs text-slate-500">Blood Type</div><div className="font-medium">{donor.type || '-'}</div></div>
            <div className="col-span-6 sm:col-span-3"><div className="text-xs text-slate-500">Age</div><div className="font-medium">{donor.age ?? '-'}</div></div>
            <div className="col-span-6 sm:col-span-3"><div className="text-xs text-slate-500">CNIC</div><div className="font-medium">{donor.cnic || '-'}</div></div>
          </div>

          <div className="mt-4 mb-2 text-sm font-semibold text-slate-700">Contact Information</div>
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-12 sm:col-span-6"><div className="text-xs text-slate-500">Phone</div><div className="font-medium">{donor.phone || '-'}</div></div>
            <div className="col-span-12"><div className="text-xs text-slate-500">Address</div><div className="font-medium">{donor.address || '-'}</div></div>
          </div>

          <div className="mt-4 mb-2 text-sm font-semibold text-slate-700">Medical Screening</div>
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-4"><div className="text-xs text-slate-500">Weight (kg)</div><div className="font-medium">{donor.weight ?? '-'}</div></div>
            <div className="col-span-4"><div className="text-xs text-slate-500">Height (cm)</div><div className="font-medium">{donor.height ?? '-'}</div></div>
            <div className="col-span-4"><div className="text-xs text-slate-500">Last Donation Date</div><div className="font-medium">{donor.lastDonationDate || '-'}</div></div>
          </div>

          <div className="mt-4 mb-2 text-sm font-semibold text-slate-700">Eligibility</div>
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-6"><div className="text-xs text-slate-500">Donated in last 3 months</div><div className="font-medium">{donor.donated3Months || '-'}</div></div>
            <div className="col-span-6"><div className="text-xs text-slate-500">Tattoo/piercing in last 6 months</div><div className="font-medium">{donor.tattoo6Months || '-'}</div></div>
            <div className="col-span-6"><div className="text-xs text-slate-500">On antibiotics/medication</div><div className="font-medium">{donor.antibiotics || '-'}</div></div>
            <div className="col-span-6"><div className="text-xs text-slate-500">Traveled in last 6 months</div><div className="font-medium">{donor.traveled6Months || '-'}</div></div>
            <div className="col-span-12"><div className="text-xs text-slate-500">Consent</div><div className="font-medium">{donor.consent ? 'Yes' : 'No'}</div></div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
          <button onClick={onClose} className="rounded-md border border-slate-300 px-4 py-2 text-sm">Close</button>
        </div>
      </div>
    </div>
  )
}
