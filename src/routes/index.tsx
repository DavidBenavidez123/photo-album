import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import photoData from '../data/photos.json'
import {
  cloudinaryDownloadUrl,
  cloudinaryGalleryUrl,
  cloudinaryOriginalUrl,
  cloudinaryPreviewUrl,
  hasCloudinaryConfig,
} from '../lib/cloudinary'
import { motion, AnimatePresence } from 'framer-motion'
import VinylBrowser from '../components/VinylBrowser'
import MasonryGallery from '../components/MasonryGallery'
import VerticalStrip from '../components/VerticalStrip'

const ParticlesBackground = lazy(
  () => import('../components/ParticlesBackground'),
)

const photoSchema = z.object({
  title: z.string(),
  location: z.string(),
  date: z.string(),
  tags: z.array(z.string()),
  publicId: z.string(),
  description: z.string().optional(),
  alt: z.string().optional(),
})

type PhotoEntry = z.infer<typeof photoSchema>

const photos: Array<PhotoEntry & { timestamp: number }> = z
  .array(photoSchema)
  .parse(photoData)
  .map((entry) => ({
    ...entry,
    timestamp: new Date(entry.date).getTime(),
  }))
  .sort((a, b) => b.timestamp - a.timestamp)

// Extract unique years for the top filter
const availableYears = [
  ...new Set(photos.map((p) => new Date(p.date).getFullYear().toString())),
].sort((a, b) => b.localeCompare(a))
const latestYear = availableYears[0] ?? new Date().getFullYear().toString()

const searchSchema = z.object({
  year: z.string().default(latestYear),
})

export const Route = createFileRoute('/')({
  component: App,
  validateSearch: searchSchema,
})

function App() {
  const { year: activeYearParam } = Route.useSearch()
  const navigate = Route.useNavigate()

  const [modalIndex, setModalIndex] = useState<number | null>(null)
  const [originalReady, setOriginalReady] = useState(false)
  const [ambientColor, setAmbientColor] = useState('200, 200, 200')
  const [layout, setLayout] = useState<'vinyl' | 'masonry' | 'strip'>('vinyl')

  // Zoom state
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const isPanning = useRef(false)
  const skipTransition = useRef(false)
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 })

  const switchLayout = (mode: 'vinyl' | 'masonry' | 'strip') => {
    setLayout(mode)
    if (mode !== 'vinyl') setAmbientColor('200, 200, 200')
  }

  const activeYear =
    activeYearParam === 'all'
      ? 'all'
      : availableYears.includes(activeYearParam)
        ? activeYearParam
        : latestYear

  const setYear = (year: string) => {
    navigate({
      search: { year: year === latestYear ? undefined : year },
      replace: true,
    })
  }

  const displayedPhotos = useMemo(() => {
    if (activeYear === 'all') return photos
    return photos.filter(
      (p) => new Date(p.date).getFullYear().toString() === activeYear,
    )
  }, [activeYear])

  const vinylPhotos = useMemo(
    () =>
      displayedPhotos.map((photo) => ({
        publicId: photo.publicId,
        title: photo.title,
        location: photo.location,
        date: photo.date,
        alt: photo.alt,
        imgSrc: cloudinaryGalleryUrl(photo.publicId),
        imgSrcSet: `${cloudinaryGalleryUrl(photo.publicId, 720)} 720w, ${cloudinaryGalleryUrl(photo.publicId, 1440)} 1440w, ${cloudinaryGalleryUrl(photo.publicId, 2160)} 2160w`,
      })),
    [displayedPhotos],
  )

  useEffect(() => {
    if (modalIndex === null) return

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setModalIndex(null)
      if (event.key === 'ArrowRight') {
        setModalIndex((current) => {
          if (current === null || displayedPhotos.length === 0) return current
          return (current + 1) % displayedPhotos.length
        })
      }
      if (event.key === 'ArrowLeft') {
        setModalIndex((current) => {
          if (current === null || displayedPhotos.length === 0) return current
          return (current - 1 + displayedPhotos.length) % displayedPhotos.length
        })
      }
    }

    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [modalIndex, displayedPhotos.length])

  useEffect(() => {
    if (modalIndex !== null) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
    document.body.style.overflow = ''
    return undefined
  }, [modalIndex])

  useEffect(() => {
    setOriginalReady(false)
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [modalIndex])

  const selectedPhoto = modalIndex === null ? null : displayedPhotos[modalIndex]

  return (
    <main
      className={`relative w-full h-screen bg-[#fafafa] text-[#111111] selection:bg-black selection:text-white font-sans ${layout === 'vinyl' ? 'overflow-hidden' : 'overflow-y-auto overflow-x-hidden'}`}
    >
      {/* Spotify-style Ambient Background */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          backgroundColor: `rgb(${ambientColor})`,
          opacity: 0.35,
          maskImage:
            'radial-gradient(ellipse at 50% 50%, black 0%, rgba(0,0,0,0.5) 30%, transparent 70%)',
          WebkitMaskImage:
            'radial-gradient(ellipse at 50% 50%, black 0%, rgba(0,0,0,0.5) 30%, transparent 70%)',
          transition: 'background-color 1.2s ease-in-out',
        }}
      />

      {/* Floating Particles */}
      <Suspense fallback={null}>
        <ParticlesBackground />
      </Suspense>

      {/* Soft Year Filters */}
      <header className="relative z-10 w-full pt-10 pb-4 md:pt-16 md:pb-6 flex flex-wrap justify-center items-center gap-6 md:gap-12 px-6">
        <button
          onClick={() => setYear('all')}
          className={`text-sm md:text-base tracking-[0.25em] uppercase transition-all duration-700 ease-out focus:outline-none ${
            activeYear === 'all'
              ? 'text-black font-medium scale-105'
              : 'text-black/30 hover:text-black/60'
          }`}
        >
          All
        </button>
        {availableYears.map((year) => (
          <button
            key={year}
            onClick={() => setYear(year)}
            className={`text-sm md:text-base tracking-[0.25em] uppercase transition-all duration-700 ease-out focus:outline-none ${
              activeYear === year
                ? 'text-black font-medium scale-105'
                : 'text-black/30 hover:text-black/60'
            }`}
          >
            {year}
          </button>
        ))}

        {/* Layout switcher */}
        <div className="flex items-center gap-1 ml-2 border-l border-black/10 pl-4">
          {/* Vinyl / Carousel */}
          <button
            onClick={() => switchLayout('vinyl')}
            className={`p-1.5 rounded transition-all duration-300 focus:outline-none ${layout === 'vinyl' ? 'text-black/70' : 'text-black/20 hover:text-black/40'}`}
            aria-label="Carousel view"
            title="Carousel"
          >
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
              <rect x="2" y="6" width="20" height="12" rx="2" />
              <line x1="7" y1="6" x2="7" y2="18" />
              <line x1="17" y1="6" x2="17" y2="18" />
            </svg>
          </button>
          {/* Masonry */}
          <button
            onClick={() => switchLayout('masonry')}
            className={`p-1.5 rounded transition-all duration-300 focus:outline-none ${layout === 'masonry' ? 'text-black/70' : 'text-black/20 hover:text-black/40'}`}
            aria-label="Masonry view"
            title="Masonry"
          >
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
              <rect x="3" y="3" width="7" height="10" rx="1" />
              <rect x="14" y="3" width="7" height="6" rx="1" />
              <rect x="3" y="16" width="7" height="5" rx="1" />
              <rect x="14" y="12" width="7" height="9" rx="1" />
            </svg>
          </button>
          {/* Vertical strip */}
          <button
            onClick={() => switchLayout('strip')}
            className={`p-1.5 rounded transition-all duration-300 focus:outline-none ${layout === 'strip' ? 'text-black/70' : 'text-black/20 hover:text-black/40'}`}
            aria-label="Strip view"
            title="Strip"
          >
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
              <rect x="4" y="2" width="16" height="6" rx="1" />
              <rect x="4" y="10" width="16" height="6" rx="1" />
              <rect x="4" y="18" width="16" height="4" rx="1" />
            </svg>
          </button>
        </div>
      </header>

      {/* Gallery */}
      <div className="relative z-10">
        {displayedPhotos.length === 0 ? (
          <div className="h-[60vh] flex items-center justify-center">
            <p className="text-sm tracking-widest uppercase text-black/50">
              No photos available.
            </p>
          </div>
        ) : layout === 'vinyl' ? (
          <VinylBrowser
            photos={vinylPhotos}
            onSelect={(index) => setModalIndex(index)}
            onColorChange={setAmbientColor}
          />
        ) : layout === 'masonry' ? (
          <MasonryGallery
            photos={vinylPhotos}
            onSelect={(index) => setModalIndex(index)}
          />
        ) : (
          <VerticalStrip
            photos={vinylPhotos}
            onSelect={(index) => setModalIndex(index)}
          />
        )}
      </div>

      {/* Subtle Demo Cloud Tag */}
      {!hasCloudinaryConfig() && (
        <div className="fixed bottom-6 right-6 z-40 px-3 py-1.5 bg-white/80 backdrop-blur-md rounded-full text-[9px] text-black/60 tracking-[0.2em] uppercase border border-black/10 pointer-events-none font-bold">
          Demo Cloud
        </div>
      )}

      {/* Cinematic Modal */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#fafafa]/95 backdrop-blur-xl"
            role="dialog"
            aria-modal="true"
            aria-label={selectedPhoto.title}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <button
              className="absolute top-8 right-8 z-50 text-black/40 hover:text-black transition-colors focus:outline-none"
              onClick={() => setModalIndex(null)}
              aria-label="Close image"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>

            <div
              className="relative w-full h-full flex flex-col items-center justify-center p-8 md:p-16"
              onClick={() => {
                if (zoom > 1) {
                  setZoom(1)
                  setPan({ x: 0, y: 0 })
                } else {
                  setModalIndex(null)
                }
              }}
              onWheel={(e) => {
                e.stopPropagation()
                const imgEl = e.currentTarget.querySelector('img')
                if (!imgEl) return
                const rect = imgEl.getBoundingClientRect()
                const mx = e.clientX - (rect.left + rect.width / 2)
                const my = e.clientY - (rect.top + rect.height / 2)
                setZoom((z) => {
                  const next = Math.max(1, Math.min(5, z - e.deltaY * 0.003))
                  if (next === 1) {
                    setPan({ x: 0, y: 0 })
                  } else {
                    setPan((p) => ({
                      x: p.x + mx * (1 / next - 1 / z),
                      y: p.y + my * (1 / next - 1 / z),
                    }))
                  }
                  return next
                })
              }}
            >
              <motion.div
                className="flex items-center justify-center"
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                onClick={(e) => e.stopPropagation()}
              >
                <img
                  src={cloudinaryPreviewUrl(selectedPhoto.publicId)}
                  alt={
                    selectedPhoto.alt ??
                    `${selectedPhoto.title}, ${selectedPhoto.location}`
                  }
                  className={`max-w-full max-h-[80vh] object-contain shadow-2xl ${zoom > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in'}`}
                  style={{
                    transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
                    transition:
                      isPanning.current || skipTransition.current
                        ? 'none'
                        : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                  draggable={false}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (isPanning.current) return
                    if (zoom > 1) {
                      setZoom(1)
                      setPan({ x: 0, y: 0 })
                    } else {
                      const rect = e.currentTarget.getBoundingClientRect()
                      const mx = e.clientX - (rect.left + rect.width / 2)
                      const my = e.clientY - (rect.top + rect.height / 2)
                      setZoom(2.5)
                      setPan({ x: -mx, y: -my })
                    }
                  }}
                  onPointerDown={(e) => {
                    if (zoom <= 1) return
                    e.stopPropagation()
                    isPanning.current = false
                    panStart.current = {
                      x: e.clientX,
                      y: e.clientY,
                      panX: pan.x,
                      panY: pan.y,
                    }

                    const onMove = (ev: PointerEvent) => {
                      const dx = (ev.clientX - panStart.current.x) / zoom
                      const dy = (ev.clientY - panStart.current.y) / zoom
                      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
                        isPanning.current = true
                      }
                      setPan({
                        x: panStart.current.panX + dx,
                        y: panStart.current.panY + dy,
                      })
                    }

                    const onUp = () => {
                      window.removeEventListener('pointermove', onMove)
                      window.removeEventListener('pointerup', onUp)
                      setTimeout(() => {
                        isPanning.current = false
                      }, 50)
                    }

                    window.addEventListener('pointermove', onMove)
                    window.addEventListener('pointerup', onUp)
                  }}
                />
              </motion.div>

              <motion.div
                className={`absolute bottom-8 left-8 right-8 md:bottom-12 md:left-16 md:right-16 flex flex-col md:flex-row md:justify-between items-start md:items-end gap-6 text-black pointer-events-none transition-opacity duration-300 ${zoom > 1 ? 'opacity-0' : 'opacity-100'}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <div>
                  <h2 className="text-2xl md:text-3xl font-medium tracking-wide mb-2">
                    {selectedPhoto.title}
                  </h2>
                  <p className="text-[10px] md:text-xs text-black/50 tracking-[0.2em] uppercase font-bold">
                    {selectedPhoto.location} &mdash;{' '}
                    {new Date(selectedPhoto.date).toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                  {selectedPhoto.description && (
                    <p className="text-black/70 text-sm mt-3 max-w-lg font-light leading-relaxed">
                      {selectedPhoto.description}
                    </p>
                  )}
                </div>

                <div className="pointer-events-auto flex flex-col items-start md:items-end gap-2">
                  <a
                    href={cloudinaryOriginalUrl(selectedPhoto.publicId)}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setOriginalReady(true)}
                    className="text-[10px] uppercase tracking-[0.2em] text-black/60 hover:text-black border-b border-black/20 hover:border-black pb-1 transition-all font-bold"
                  >
                    View Original
                  </a>

                  <AnimatePresence>
                    {originalReady && (
                      <motion.a
                        href={cloudinaryDownloadUrl(selectedPhoto.publicId)}
                        download
                        rel="noreferrer"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-[10px] uppercase tracking-[0.2em] text-black hover:text-black/60 transition-colors mt-2 font-bold"
                      >
                        Download Asset
                      </motion.a>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
