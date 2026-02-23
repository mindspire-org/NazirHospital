import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import Hospital_BirthCertificateForm from '../../../components/hospital/hospital_BirthCertificateForm'
import { hospitalApi } from '../../../utils/api'

export default function Hospital_BirthCertificateDetail(){
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
          admissionNo: enc.admissionNo,
        })
      }
    } catch {}
  })() }, [id])

  return (
    <div className="space-y-4">
      <div className="text-lg font-semibold text-slate-800">Birth Certificate</div>
      <Hospital_BirthCertificateForm encounterId={String(id)} patient={patient||{}} />
    </div>
  )
}
