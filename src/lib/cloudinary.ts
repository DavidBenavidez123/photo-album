const DEFAULT_GALLERY_WIDTH = 1200
const DEFAULT_MODAL_WIDTH = 2200

function cloudName() {
  return import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'demo'
}

function encodedPublicId(publicId: string) {
  return publicId
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/')
}

export function hasCloudinaryConfig() {
  return Boolean(import.meta.env.VITE_CLOUDINARY_CLOUD_NAME)
}

export function cloudinaryGalleryUrl(
  publicId: string,
  width = DEFAULT_GALLERY_WIDTH,
) {
  const cloud = cloudName()

  return `https://res.cloudinary.com/${cloud}/image/upload/f_auto,q_auto:best,c_limit,w_${width}/${encodedPublicId(publicId)}`
}

export function cloudinaryPreviewUrl(
  publicId: string,
  width = DEFAULT_MODAL_WIDTH,
) {
  const cloud = cloudName()

  return `https://res.cloudinary.com/${cloud}/image/upload/f_auto,q_auto:good,dpr_auto,c_limit,w_${width}/${encodedPublicId(publicId)}`
}

export function cloudinaryOriginalUrl(publicId: string) {
  const cloud = cloudName()

  return `https://res.cloudinary.com/${cloud}/image/upload/${encodedPublicId(publicId)}`
}

export function cloudinaryDownloadUrl(publicId: string) {
  const cloud = cloudName()

  return `https://res.cloudinary.com/${cloud}/image/upload/fl_attachment/${encodedPublicId(publicId)}`
}
