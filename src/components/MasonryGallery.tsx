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

interface MasonryGalleryProps {
  photos: GalleryPhoto[]
  onSelect: (index: number) => void
}

export default function MasonryGallery({
  photos,
  onSelect,
}: MasonryGalleryProps) {
  return (
    <div className="w-full h-[calc(100vh-120px)] md:h-[calc(100vh-160px)] overflow-y-auto overflow-x-hidden px-4 md:px-8 pb-12">
      <div className="columns-2 md:columns-3 lg:columns-4 gap-3 md:gap-4">
        {photos.map((photo, i) => (
          <motion.div
            key={photo.publicId}
            className="break-inside-avoid mb-3 md:mb-4 cursor-pointer group"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.4,
              delay: Math.min(i * 0.03, 0.6),
              ease: [0.16, 1, 0.3, 1],
            }}
            onClick={() => onSelect(i)}
          >
            <div className="relative overflow-hidden bg-black/5 shadow-lg group-hover:shadow-2xl transition-shadow duration-500">
              <img
                src={photo.imgSrc}
                srcSet={photo.imgSrcSet}
                sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                alt={photo.alt ?? `${photo.title}, ${photo.location}`}
                loading="lazy"
                decoding="async"
                draggable={false}
                className="w-full h-auto block group-hover:scale-[1.02] transition-transform duration-700 ease-out"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-500" />
            </div>
            <div className="mt-2 px-0.5">
              <p className="text-[10px] text-black/40 tracking-[0.2em] uppercase font-semibold truncate">
                {photo.title}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="text-center py-8">
        <p className="text-[9px] text-black/25 tracking-[0.3em] uppercase font-bold">
          {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
        </p>
      </div>
    </div>
  )
}
