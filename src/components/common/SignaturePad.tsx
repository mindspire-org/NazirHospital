import { useEffect, useRef } from 'react'

type Props = {
  width?: number
  height?: number
  background?: string
  penColor?: string
  onChange?: (dataUrl: string|null)=> void
}

export default function SignaturePad({ width=500, height=180, background='#fff', penColor='#111', onChange }: Props){
  const canvasRef = useRef<HTMLCanvasElement|null>(null)
  const drawingRef = useRef(false)
  const lastRef = useRef<{x:number;y:number}|null>(null)

  useEffect(()=>{
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = background
    ctx.fillRect(0,0,canvas.width, canvas.height)
  }, [background])

  const start = (x:number, y:number)=>{
    drawingRef.current = true
    lastRef.current = { x, y }
  }
  const move = (x:number, y:number)=>{
    if (!drawingRef.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const last = lastRef.current
    ctx.strokeStyle = penColor
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    if (last){
      ctx.beginPath()
      ctx.moveTo(last.x, last.y)
      ctx.lineTo(x, y)
      ctx.stroke()
      lastRef.current = { x, y }
    }
    if (onChange) onChange(canvas.toDataURL('image/png'))
  }
  const end = ()=>{ drawingRef.current = false; lastRef.current = null }

  const touch = (e: React.TouchEvent<HTMLCanvasElement>)=>{
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect()
    const t = e.touches[0]
    move(t.clientX - rect.left, t.clientY - rect.top)
  }
  const touchStart = (e: React.TouchEvent<HTMLCanvasElement>)=>{
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect()
    const t = e.touches[0]
    start(t.clientX - rect.left, t.clientY - rect.top)
  }

  const mouse = (e: React.MouseEvent<HTMLCanvasElement>)=>{
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect()
    move(e.clientX - rect.left, e.clientY - rect.top)
  }
  const mouseStart = (e: React.MouseEvent<HTMLCanvasElement>)=>{
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect()
    start(e.clientX - rect.left, e.clientY - rect.top)
  }

  const clear = ()=>{
    const c = canvasRef.current; if (!c) return
    const ctx = c.getContext('2d')!
    ctx.fillStyle = background
    ctx.fillRect(0,0,c.width, c.height)
    if (onChange) onChange(null)
  }

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="border border-slate-300 rounded-md touch-none"
        onMouseDown={mouseStart}
        onMouseMove={mouse}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={touchStart}
        onTouchMove={touch}
        onTouchEnd={end}
      />
      <div>
        <button type="button" onClick={clear} className="rounded-md border border-slate-300 px-3 py-1 text-sm">Clear</button>
      </div>
    </div>
  )
}
