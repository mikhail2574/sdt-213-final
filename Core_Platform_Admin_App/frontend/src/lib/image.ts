/** Reads an image file and scales it down to a small JPEG suitable for a profile photo. */
export function imageToJpeg(file: File, maxSize = 512): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Choose an image file.'))
      return
    }
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(image.width, image.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(image.width * scale)
      canvas.height = Math.round(image.height * scale)
      canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('The image could not be read.'))), 'image/jpeg', 0.85)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('The image could not be read.'))
    }
    image.src = url
  })
}
