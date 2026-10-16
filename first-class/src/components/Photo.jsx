import { useEffect, useRef, useState } from 'react'
import { imageSources, images } from '../images.js'

/**
 * Responsives Foto mit srcset. Lädt ein Bild nicht, bleibt eine dunkle,
 * gestaltete Fläche mit Logo-Prägung stehen – nie ein kaputtes Bild-Icon.
 */
export default function Photo({
  name,
  sizes = '100vw',
  className = '',
  imgClassName = '',
  priority = false,
  maxWidth,
  decorative = false,
}) {
  const image = images[name]
  const ref = useRef(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const img = ref.current
    // Fehler, die vor der Hydration aufgetreten sind, nachträglich erkennen.
    if (img && img.complete && img.naturalWidth === 0) {
      img.decode?.().catch(() => setFailed(true))
    }
  }, [])

  const { src, srcSet } = imageSources(image, maxWidth)

  return (
    <div className={`photo-frame ${className}`}>
      {!failed && (
        <img
          ref={ref}
          src={src}
          srcSet={srcSet}
          sizes={sizes}
          alt={decorative ? '' : image.alt}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : undefined}
          decoding={priority ? 'sync' : 'async'}
          onError={() => setFailed(true)}
          style={image.position ? { objectPosition: image.position } : undefined}
          className={`h-full w-full object-cover ${imgClassName}`}
        />
      )}
    </div>
  )
}
