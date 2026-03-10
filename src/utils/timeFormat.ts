export function fmt12(hhmm: string): string {
  try{
    if (!hhmm) return ''
    const s = String(hhmm).trim()
    if (/[ap]m/i.test(s)){
      const mm = s.match(/^(\d{1,2}):(\d{2})\s*([ap]m)$/i)
      if (mm){
        const h = Math.max(1, Math.min(12, parseInt(mm[1], 10) || 12))
        return `${String(h).padStart(2,'0')}:${mm[2]} ${mm[3].toUpperCase()}`
      }
      return s.replace(/(am|pm)/i, (m)=>m.toUpperCase())
    }
    const parts = s.split(':')
    if (parts.length < 2) return s
    const h = parseInt(parts[0], 10)
    const m = parts[1].slice(0, 2)
    if (isNaN(h)) return s
    const am = h < 12
    const h12 = (h % 12) || 12
    return `${String(h12).padStart(2,'0')}:${m} ${am ? 'AM' : 'PM'}`
  } catch {
    return hhmm
  }
}

export function fmtDate(d: any): string {
  try{
    const x = d instanceof Date ? d : new Date(d)
    if (!x || isNaN(x.getTime())) return ''
    const dd = String(x.getDate()).padStart(2, '0')
    const mm = String(x.getMonth() + 1).padStart(2, '0')
    const yyyy = String(x.getFullYear())
    return `${dd}/${mm}/${yyyy}`
  } catch {
    return ''
  }
}

export function fmtDateTime12(d: any): string {
  try{
    const x = d instanceof Date ? d : new Date(d)
    if (!x || isNaN(x.getTime())) return ''
    const hh = String(x.getHours()).padStart(2, '0')
    const mm = String(x.getMinutes()).padStart(2, '0')
    return `${fmtDate(x)}, ${fmt12(`${hh}:${mm}`)}`
  } catch {
    return ''
  }
}
