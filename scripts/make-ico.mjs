import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Jimp from 'jimp'
import pngToIco from 'png-to-ico'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function ensureIco() {
  const projectRoot = path.join(__dirname, '..')
  const pub = path.join(projectRoot, 'public')
  const outIco = path.join(pub, 'hospital_icon.ico')

  // Skip if ICO already exists
  if (fs.existsSync(outIco)) {
    console.log('[make-ico] public/hospital_icon.ico already exists; skipping generation')
    return
  }

  // Find a source image
  const candidates = [
    path.join(pub, 'hospital_icon.png'),
    path.join(pub, 'hospital_icon.jpeg'),
    path.join(pub, 'hospital_icon.jpg'),
    path.join(projectRoot, 'dist', 'hospital_icon.png'),
    path.join(projectRoot, 'dist', 'hospital_icon.jpeg'),
    path.join(projectRoot, 'dist', 'hospital_icon.jpg'),
  ]
  const src = candidates.find(p => { try { return fs.existsSync(p) } catch { return false } })
  if (!src) {
    throw new Error('No source icon found. Place hospital_icon.png/.jpg/.jpeg in public/')
  }

  const tmpDir = path.join(__dirname, '.tmp-icons')
  try { fs.mkdirSync(tmpDir, { recursive: true }) } catch {}

  // Generate PNGs for typical ICO sizes
  const sizes = [16, 24, 32, 48, 64, 128, 256]
  const pngPaths = []
  const base = await Jimp.read(src)
  for (const s of sizes) {
    const p = path.join(tmpDir, `icon-${s}.png`)
    const clone = base.clone()
    clone.contain(s, s, Jimp.RESIZE_BILINEAR)
    await clone.writeAsync(p)
    pngPaths.push(p)
  }

  // Build ICO
  const icoBuf = await pngToIco(pngPaths)
  fs.writeFileSync(outIco, icoBuf)
  console.log('[make-ico] Wrote', outIco)
}

ensureIco().catch((e) => {
  console.error('[make-ico] failed:', e?.message || e)
  process.exit(1)
})
