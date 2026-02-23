import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import Hospital_ShortStayForm from '../../../components/hospital/hospital_ShortStayForm'
import { hospitalApi } from '../../../utils/api'

export default function Hospital_ShortStayDetail(){
  const { id = '' } = useParams()
  const [patient, setPatient] = useState<any>(null)

  useEffect(()=>{ (async()=>{
    if (!id) return
    try {
      const e: any = await hospitalApi.getIPDAdmissionById(String(id)).catch(()=>null)
      const enc = e?.encounter
      if (enc){
        setPatient({
          name: enc.patientId?.fullName,
          mrn: enc.patientId?.mrn,
          address: enc.patientId?.address,
          phone: enc.patientId?.phoneNormalized,
          age: enc.patientId?.age,
          gender: enc.patientId?.gender,
          admissionNo: enc.admissionNo,
          doctor: enc.doctorId?.name,
          admitted: enc.startAt,
          endAt: enc.endAt,
        })
      }
    } catch {}
  })() }, [id])

  return (
    <div className="space-y-4">
      <div className="text-lg font-semibold text-slate-800">Short Stay</div>
      <Hospital_ShortStayForm encounterId={String(id)} patient={patient||{}} />
    </div>
  )
}
