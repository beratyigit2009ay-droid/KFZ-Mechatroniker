import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import App from './App.jsx'

export { site, isPlaceholder, telHref } from './config.js'
export { pages } from './pages.js'

export function render(page) {
  return renderToString(
    <StrictMode>
      <App page={page} />
    </StrictMode>,
  )
}
