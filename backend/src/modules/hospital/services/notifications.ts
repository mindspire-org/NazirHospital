import { Response } from 'express'

// In-memory SSE clients keyed by doctorId
const doctorStreams = new Map<string, Set<Response>>()

export function registerDoctorStream(doctorId: string, res: Response){
  if (!doctorStreams.has(doctorId)) doctorStreams.set(doctorId, new Set())
  const set = doctorStreams.get(doctorId)!
  set.add(res)
  return () => {
    try { set.delete(res) } catch {}
    if (set.size === 0) doctorStreams.delete(doctorId)
  }
}

export function notifyDoctor(doctorId: string, payload: any){
  const set = doctorStreams.get(String(doctorId))
  if (!set || set.size === 0) return
  const data = `event: doctor-notification\n` + `data: ${JSON.stringify(payload)}\n\n`
  for (const res of Array.from(set)){
    try { res.write(data) } catch { /* ignore broken pipe */ }
  }
}

export function broadcastPing(){
  for (const set of doctorStreams.values()){
    for (const res of Array.from(set)){
      try { res.write(`event: ping\n` + `data: {}\n\n`) } catch {}
    }
  }
}
