import { serviceBySlug, services } from './content.js'

export const PREFILL_EVENT = 'firstclass:contact-prefill'

/** Auswahl „Worum geht es?“ im Kontaktformular. */
export const CONTACT_TOPICS = [...services.map((s) => s.title), 'Preisanfrage', 'Sonstiges']

/** Vorbelegung für das Kontaktformular, abhängig vom Anliegen (z. B. aus ?anliegen=…). */
export function prefillFor(topic) {
  if (topic === 'preis') {
    return { topic: 'Preisanfrage', message: 'Ich bitte um eine Preisauskunft für: ' }
  }
  const service = serviceBySlug[topic]
  return service ? { topic: service.title, message: '' } : null
}

export function requestContactPrefill(topic) {
  window.dispatchEvent(new CustomEvent(PREFILL_EVENT, { detail: topic }))
}
