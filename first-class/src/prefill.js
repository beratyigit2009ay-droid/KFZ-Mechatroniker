import { serviceBySlug } from './content.js'

export const PREFILL_EVENT = 'firstclass:contact-prefill'

/** Vorschlagstext für das Nachrichtenfeld, abhängig vom Anliegen. */
export function prefillText(topic) {
  if (topic === 'preis') return 'Ich bitte um eine Preisauskunft für: '
  const service = serviceBySlug[topic]
  return service ? `Mein Anliegen: ${service.title}. ` : ''
}

export function requestContactPrefill(topic) {
  window.dispatchEvent(new CustomEvent(PREFILL_EVENT, { detail: topic }))
}
