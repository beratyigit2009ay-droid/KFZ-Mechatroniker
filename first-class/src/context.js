import { createContext, useContext } from 'react'
import { pageByKey } from './pages.js'

export const PageContext = createContext('home')

/** Liefert Links, die auf jeder (flachen) Unterseite korrekt funktionieren. */
export function useLinks() {
  const page = useContext(PageContext)
  const isHome = page === 'home'
  return {
    page,
    isHome,
    home: isHome ? '#start' : 'index.html',
    section: (id) => (isHome ? `#${id}` : `index.html#${id}`),
    to: (key) => pageByKey[key]?.file ?? 'index.html',
    contact: (topic) =>
      isHome && !topic ? '#kontakt' : `index.html${topic ? `?anliegen=${topic}` : ''}#kontakt`,
  }
}
