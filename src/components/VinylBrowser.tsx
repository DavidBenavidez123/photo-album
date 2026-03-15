import { useRef, useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'

interface VinylPhoto {
  publicId: string
  title: string
  location: string
  date: string
  alt?: string
  imgSrc: string
  imgSrcSet: string
}

interface VinylBrowserProps {
  photos: VinylPhoto[]
  onSelect: (index: number) => void
  onColorChange?: (color: string) => void
}

const CARD_WIDTH = 720
const CARD_GAP = 40
const BASE_TILT = 20

// Extract dominant color from an image via a tiny offscreen canvas
const colorCache = new Map<string, string>()

function extractColor(src: string): Promise<string> {
  if (colorCache.has(src)) return Promise.resolve(colorCache.get(src)!)

  // Use a tiny 32px thumbnail for fast color sampling
  const thumbSrc = src.replace(/w_\d+/, 'w_32').replace(/q_auto:\w+/, 'q_auto')

  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const size = 8
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve('0, 0, 0')
          return
        }
        ctx.drawImage(img, 0, 0, size, size)
        const data = ctx.getImageData(0, 0, size, size).data
        let r = 0,
          g = 0,
          b = 0,
          count = 0
        for (let i = 0; i < data.length; i += 4) {
          r += data[i]
          g += data[i + 1]
          b += data[i + 2]
          count++
        }
        r = Math.round(r / count)
        g = Math.round(g / count)
        b = Math.round(b / count)
        const color = `${r}, ${g}, ${b}`
        colorCache.set(src, color)
        resolve(color)
      } catch {
        resolve('0, 0, 0')
      }
    }
    img.onerror = () => resolve('0, 0, 0')
    img.src = thumbSrc
  })
}

export default function VinylBrowser({
  photos,
  onSelect,
  onColorChange,
}: VinylBrowserProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const cardsRef = useRef<(HTMLDivElement | null)[]>([])
  const rafRef = useRef<number | null>(null)
  const draggedRef = useRef(false)
  const momentumRef = useRef<number | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  // Extract color when active image changes
  useEffect(() => {
    const photo = photos[activeIndex]
    if (!photo || !onColorChange) return
    extractColor(photo.imgSrc).then(onColorChange)
  }, [activeIndex, photos, onColorChange])

  const updateCards = useCallback(() => {
    const track = trackRef.current
    if (!track) return

    const trackRect = track.getBoundingClientRect()
    const centerX = trackRect.left + trackRect.width / 2

    let closestDist = Infinity
    let closestIdx = 0

    cardsRef.current.forEach((card, i) => {
      if (!card) return

      const cardRect = card.getBoundingClientRect()
      const cardCenter = cardRect.left + cardRect.width / 2
      const distFromCenter = cardCenter - centerX
      const absDist = Math.abs(distFromCenter)

      if (absDist < closestDist) {
        closestDist = absDist
        closestIdx = i
      }

      const normalized = Math.min(absDist / (CARD_WIDTH * 1.2), 1)

      const direction = distFromCenter > 0 ? -1 : 1
      const tilt = direction * BASE_TILT * normalized

      const scale = 1 + (1 - normalized) * 0.08
      const translateZ = (1 - normalized) * 60
      const opacity = 0.4 + (1 - normalized) * 0.6
      const translateY = -(1 - normalized) * 20

      card.style.transform = `perspective(1200px) rotateY(${tilt}deg) scale(${scale}) translateZ(${translateZ}px) translateY(${translateY}px)`
      card.style.opacity = String(opacity)
      card.style.zIndex = String(Math.round((1 - normalized) * 100))
    })

    setActiveIndex(closestIdx)
  }, [])

  const onScroll = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(updateCards)
  }, [updateCards])

  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    track.addEventListener('scroll', onScroll, { passive: true })

    // Convert vertical wheel → horizontal scroll with smooth momentum
    let wheelVelocity = 0
    let wheelMomentumId: number | null = null

    const tickWheelMomentum = () => {
      if (Math.abs(wheelVelocity) < 0.3) {
        wheelMomentumId = null
        return
      }
      track.scrollLeft += wheelVelocity
      wheelVelocity *= 0.85
      wheelMomentumId = requestAnimationFrame(tickWheelMomentum)
    }

    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
      e.preventDefault()
      wheelVelocity += e.deltaY * 0.12
      const MAX_VELOCITY = 18
      wheelVelocity = Math.max(
        -MAX_VELOCITY,
        Math.min(MAX_VELOCITY, wheelVelocity),
      )
      if (!wheelMomentumId) {
        wheelMomentumId = requestAnimationFrame(tickWheelMomentum)
      }
    }
    track.addEventListener('wheel', onWheel, { passive: false })

    // Drag-to-scroll with inertia
    let isDragging = false
    let startX = 0
    let scrollStart = 0
    let prevX = 0
    let prevTime = 0
    let velocity = 0

    const stopMomentum = () => {
      if (momentumRef.current) {
        cancelAnimationFrame(momentumRef.current)
        momentumRef.current = null
      }
    }

    const tickMomentum = () => {
      if (Math.abs(velocity) < 0.5) {
        momentumRef.current = null
        return
      }
      track.scrollLeft -= velocity
      velocity *= 0.95
      momentumRef.current = requestAnimationFrame(tickMomentum)
    }

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return
      stopMomentum()
      isDragging = true
      draggedRef.current = false
      startX = e.clientX
      prevX = e.clientX
      prevTime = Date.now()
      velocity = 0
      scrollStart = track.scrollLeft
      track.style.cursor = 'grabbing'
      window.addEventListener('pointermove', onPointerMove)
      window.addEventListener('pointerup', onPointerUp)
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return
      const now = Date.now()
      const dx = e.clientX - startX
      const dt = Math.max(now - prevTime, 1)

      velocity = ((e.clientX - prevX) / dt) * 16
      prevX = e.clientX
      prevTime = now

      if (Math.abs(dx) > 5) draggedRef.current = true
      track.scrollLeft = scrollStart - dx
    }

    const onPointerUp = () => {
      if (!isDragging) return
      isDragging = false
      track.style.cursor = ''
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)

      if (Math.abs(velocity) > 1) {
        momentumRef.current = requestAnimationFrame(tickMomentum)
      }
    }

    track.addEventListener('pointerdown', onPointerDown)

    updateCards()

    return () => {
      track.removeEventListener('scroll', onScroll)
      track.removeEventListener('wheel', onWheel)
      track.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (wheelMomentumId) cancelAnimationFrame(wheelMomentumId)
      stopMomentum()
    }
  }, [onScroll, updateCards])

  useEffect(() => {
    updateCards()
  }, [photos, updateCards])

  const scrollToCard = useCallback((index: number) => {
    const track = trackRef.current
    const card = cardsRef.current[index]
    if (!track || !card) return

    const trackRect = track.getBoundingClientRect()
    const cardRect = card.getBoundingClientRect()
    const cardCenter = cardRect.left + cardRect.width / 2
    const trackCenter = trackRect.left + trackRect.width / 2
    const scrollOffset = cardCenter - trackCenter

    track.scrollBy({ left: scrollOffset, behavior: 'smooth' })
  }, [])

  const activePhoto = photos[activeIndex]

  return (
    <div className="relative w-full h-[calc(100vh-120px)] md:h-[calc(100vh-160px)] flex flex-col items-center justify-center select-none">
      <div
        ref={trackRef}
        className="w-full flex-1 flex items-center overflow-x-auto overflow-y-hidden cursor-grab"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <div
          className="flex-shrink-0"
          style={{ width: `calc(50vw - ${CARD_WIDTH / 2}px)` }}
        />

        <div
          className="flex items-center flex-shrink-0"
          style={{ gap: `${CARD_GAP}px` }}
        >
          {photos.map((photo, i) => (
            <div
              key={photo.publicId}
              ref={(el) => {
                cardsRef.current[i] = el
              }}
              className="flex-shrink-0 cursor-pointer"
              style={{
                width: `${CARD_WIDTH}px`,
                transition:
                  'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease-out',
                transformStyle: 'preserve-3d',
                willChange: 'transform, opacity',
              }}
              onClick={() => {
                if (draggedRef.current) return
                scrollToCard(i)
                if (i === activeIndex) {
                  onSelect(i)
                }
              }}
            >
              <div className="relative overflow-hidden bg-black/5 shadow-2xl">
                <img
                  src={photo.imgSrc}
                  srcSet={photo.imgSrcSet}
                  sizes={`${CARD_WIDTH}px`}
                  alt={photo.alt ?? `${photo.title}, ${photo.location}`}
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  className="w-full h-auto block"
                />
                <div className="absolute inset-0 shadow-[inset_-4px_0_16px_-4px_rgba(0,0,0,0.2),inset_4px_0_16px_-4px_rgba(0,0,0,0.1)] pointer-events-none" />
              </div>
            </div>
          ))}
        </div>

        <div
          className="flex-shrink-0"
          style={{ width: `calc(50vw - ${CARD_WIDTH / 2}px)` }}
        />
      </div>

      {activePhoto && (
        <motion.div
          key={activePhoto.publicId}
          className="flex-shrink-0 text-center pb-8 md:pb-12 pt-6"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <h2 className="text-xl md:text-2xl font-medium tracking-wide text-black/90">
            {activePhoto.title}
          </h2>
          <p className="text-[10px] md:text-xs text-black/40 tracking-[0.25em] uppercase mt-2 font-semibold">
            {activePhoto.location} &mdash;{' '}
            {new Date(activePhoto.date).toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric',
            })}
          </p>
          <p className="text-[9px] text-black/25 tracking-[0.3em] uppercase mt-3 font-bold">
            {activeIndex + 1} / {photos.length}
          </p>
        </motion.div>
      )}

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 text-black/20">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
        <span className="text-[9px] tracking-[0.3em] uppercase font-bold">
          Scroll to browse
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </div>
  )
}
