import { motion } from 'framer-motion'

export interface GalleryPhoto {
  publicId: string
  title: string
  location: string
  date: string
  alt?: string
  imgSrc: string
  imgSrcSet: string
}

interface VerticalStripProps {
  photos: GalleryPhoto[]
  onSelect: (index: number) => void
}

export default function VerticalStrip({
  photos,
  onSelect,
}: VerticalStripProps) {
  return (
    <div className="w-full h-[calc(100vh-120px)] md:h-[calc(100vh-160px)] overflow-y-auto overflow-x-hidden">
      <div className="max-w-3xl mx-auto px-6 md:px-0 pb-16 flex flex-col gap-16 md:gap-24">
        {photos.map((photo, i) => (
          <motion.div
            key={photo.publicId}
            className="cursor-pointer group"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.5,
              delay: Math.min(i * 0.05, 0.8),
              ease: [0.16, 1, 0.3, 1],
            }}
            onClick={() => onSelect(i)}
          >
            <div className="relative overflow-hidden bg-black/5 shadow-xl group-hover:shadow-2xl transition-shadow duration-500">
              <img
                src={photo.imgSrc}
                srcSet={photo.imgSrcSet}
                sizes="(min-width: 768px) 768px, 100vw"
                alt={photo.alt ?? `${photo.title}, ${photo.location}`}
                loading="lazy"
                decoding="async"
                draggable={false}
                className="w-full h-auto block"
              />
            </div>
            <div className="mt-4 flex justify-between items-baseline">
              <div>
                <h3 className="text-base md:text-lg font-medium tracking-wide text-black/90">
                  {photo.title}
                </h3>
                <p className="text-[10px] text-black/40 tracking-[0.2em] uppercase mt-1 font-semibold">
                  {photo.location} &mdash;{' '}
                  {new Date(photo.date).toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <span className="text-[9px] text-black/20 tracking-[0.3em] uppercase font-bold flex-shrink-0 ml-4">
                {i + 1} / {photos.length}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
