'use client'

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { useTranslations } from 'next-intl'
import { Eraser } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

/**
 * A signature drawn with a finger or the mouse. The value is a PNG data URL,
 * kept with the intake so the printed sheet can show who signed.
 */
export function SignaturePad({
  id,
  label,
  value,
  onChange,
  disabled = false,
}: {
  id: string
  label: string
  value: string | null
  onChange: (value: string | null) => void
  disabled?: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const [hasInk, setHasInk] = useState(Boolean(value))
  const t = useTranslations('service.wash')

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ratio = window.devicePixelRatio || 1
    const width = canvas.clientWidth || 600
    const height = 140
    canvas.width = width * ratio
    canvas.height = height * ratio
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(ratio, ratio)
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#0f172a'
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)

    if (value) {
      const image = new Image()
      image.onload = () => ctx.drawImage(image, 0, 0, width, height)
      image.src = value
    }
    // Only the first mount needs the saved image; redrawing while typing would
    // wipe what is being signed.
  }, [])

  const point = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  const start = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (disabled) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    const p = point(event)
    if (!canvas || !ctx || !p) return
    event.currentTarget.setPointerCapture(event.pointerId)
    drawing.current = true
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
  }

  const move = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || disabled) return
    const ctx = canvasRef.current?.getContext('2d')
    const p = point(event)
    if (!ctx || !p) return
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
  }

  const end = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return
    drawing.current = false
    event.currentTarget.releasePointerCapture?.(event.pointerId)
    const canvas = canvasRef.current
    if (!canvas) return
    setHasInk(true)
    onChange(canvas.toDataURL('image/png'))
  }

  const clear = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const ratio = window.devicePixelRatio || 1
    ctx.clearRect(0, 0, canvas.width / ratio, canvas.height / ratio)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width / ratio, canvas.height / ratio)
    setHasInk(false)
    onChange(null)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        {hasInk && !disabled && (
          <Button type="button" variant="ghost" size="sm" onClick={clear} className="h-7 text-xs">
            <Eraser className="mr-1 h-3.5 w-3.5" />
            {t('clearSignature')}
          </Button>
        )}
      </div>
      <canvas
        id={id}
        ref={canvasRef}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        className="h-[140px] w-full touch-none rounded-lg border bg-white"
        aria-label={label}
      />
    </div>
  )
}
