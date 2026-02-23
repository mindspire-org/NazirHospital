const POPPINS_REGULAR_URL = 'https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/Poppins-Regular.ttf'
const POPPINS_BOLD_URL = 'https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/Poppins-SemiBold.ttf'

let poppinsRegularB64: string | null = null
let poppinsBoldB64: string | null = null

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
    console.warn('Failed to fetch font from URL:', url, error)
    throw error
  }
}

export async function ensurePoppins(doc: any){
  try {
    if (!poppinsRegularB64) {
      try {
        poppinsRegularB64 = await fetchBase64(POPPINS_REGULAR_URL)
      } catch {
        console.warn('Failed to load Poppins Regular font, falling back to helvetica')
        return
      }
    }
    if (!poppinsBoldB64) {
      try {
        poppinsBoldB64 = await fetchBase64(POPPINS_BOLD_URL)
      } catch {
        console.warn('Failed to load Poppins Bold font, falling back to helvetica')
        return
      }
    }
  } catch {
    return
  }
  
  try {
    doc.addFileToVFS('Poppins-Regular.ttf', poppinsRegularB64)
    doc.addFont('Poppins-Regular.ttf', 'Poppins', 'normal')
    doc.addFileToVFS('Poppins-SemiBold.ttf', poppinsBoldB64)
    doc.addFont('Poppins-SemiBold.ttf', 'Poppins', 'bold')
    console.log('Poppins fonts loaded successfully')
  } catch (error) {
    console.warn('Failed to register Poppins fonts:', error)
  }
}
