import { useEffect, useRef, useState } from 'react'
import { images } from '../images.js'

/**
 * Bild mit eleganter Rückfallfläche: Lädt eine Datei nicht, bleibt eine
 * dunkle, gestaltete Fläche mit Logo-Prägung stehen – nie ein kaputtes Bild-Icon.
 */
export default function Photo({ name, className = '', imgClassName = '', priority = false, decorative = false }) {
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

  return (
    <div className={`photo-frame ${className}`}>
      {!failed && (
        <img
          ref={ref}
          src={image.src}
          alt={decorative ? '' : image.alt}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : undefined}
          decoding="async"
          onError={() => setFailed(true)}
          className={`h-full w-full object-cover ${imgClassName}`}
        />
      )}
    </div>
  )
}
