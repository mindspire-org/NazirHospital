let urduNastaleeqB64: string | null = null

async function fetchBase64(url: string): Promise<string> {
  try {
    const resp = await fetch(url)
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const buf = await resp.arrayBuffer()
    const bytes = new Uint8Array(buf)
    let binary = ''
    const chunk = 0x8000
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
    }
    return btoa(binary)
  } catch (error) {
    console.warn('Failed to fetch Urdu font from URL:', url, error)
    throw error
  }
}

export async function ensureUrduNastaleeq(doc: any){
  // Expect this file to exist in the frontend build output.
  // Required path: src/assets/fonts/AlQalamTajNastaleeq.ttf
  const url = '/assets/fonts/AlQalamTajNastaleeq.ttf'

  try {
    if (!urduNastaleeqB64) {
      try {
        urduNastaleeqB64 = await fetchBase64(url)
      } catch (error) {
        console.warn('Failed to load AlQalam Taj Nastaleeq font from local assets. Urdu instructions will use fallback font.', error)
        return
      }
    }
  } catch {
    return
  }
  
  try {
    doc.addFileToVFS('AlQalamTajNastaleeq.ttf', urduNastaleeqB64)
    doc.addFont('AlQalamTajNastaleeq.ttf', 'AlQalamTajNastaleeq', 'normal')
    console.log('AlQalam Taj Nastaleeq font loaded successfully')
  } catch (error) {
    console.warn('Failed to register AlQalam Taj Nastaleeq font:', error)
  }
}
