import { useEffect, useRef, useState } from 'react'
import { site, telHref } from '../config.js'
import { useLinks } from '../context.js'
import CallButton from '../components/CallButton.jsx'
import Icon from '../components/Icon.jsx'
import { PREFILL_EVENT, prefillText } from '../prefill.js'

const empty = { name: '', phone: '', message: '', consent: false, company: '' }

const validators = {
  name: (v) => (v.trim().length < 2 ? 'Bitte geben Sie Ihren Namen an.' : ''),
  phone: (v) => {
    const value = v.trim()
    const digits = value.replace(/\D/g, '')
    if (!value) return 'Bitte geben Sie eine Telefonnummer für den Rückruf an.'
    if (!/^\+?[\d\s()/.-]+$/.test(value) || digits.length < 6 || digits.length > 16) {
      return 'Bitte prüfen Sie die Telefonnummer. Erlaubt sind Ziffern, Leerzeichen und + / - ( ).'
    }
    return ''
  },
  message: (v) =>
    v.trim().length < 10
      ? 'Bitte beschreiben Sie Ihr Anliegen in ein paar Worten (mindestens 10 Zeichen).'
      : '',
  consent: (v) => (v ? '' : 'Bitte bestätigen Sie den Hinweis zum Datenschutz.'),
}

const fieldOrder = ['name', 'phone', 'message', 'consent']

function validate(values) {
  return Object.fromEntries(fieldOrder.map((key) => [key, validators[key](values[key])]))
}

function Field({ id, label, error, hint, children }) {
  return (
    <div>
      <label htmlFor={id} className="block text-[0.8rem] font-semibold tracking-[0.08em] text-ink-900">
        {label} <span className="text-gold-700" aria-hidden="true">*</span>
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-2 text-[0.82rem] text-slate">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-2 flex items-start gap-2 text-[0.85rem] font-medium text-[#a1281d]">
          <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}

const inputClass =
  'mt-2.5 block w-full rounded-xl border bg-white px-4 py-3.5 text-[1rem] text-ink-900 placeholder:text-[#736e66] transition-[border-color,box-shadow] duration-300 focus:outline-none focus:ring-4'

function inputState(error) {
  return error
    ? 'border-[#a1281d] focus:border-[#a1281d] focus:ring-[#a1281d]/15'
    : 'border-ink-900/15 hover:border-ink-900/30 focus:border-gold-600 focus:ring-gold-500/20'
}

export default function Contact() {
  const links = useLinks()
  const [values, setValues] = useState(empty)
  const [touched, setTouched] = useState({})
  const [status, setStatus] = useState('idle') // idle | sending | sent | error | offline
  const formRef = useRef(null)
  const statusRef = useRef(null)

  const errors = validate(values)
  const showError = (key) => (touched[key] ? errors[key] : '')

  // Vorbelegung über ?anliegen=… oder den Button „Preis anfragen“.
  useEffect(() => {
    const apply = (topic) => {
      const text = prefillText(topic)
      if (!text) return
      setValues((current) => (current.message.trim() ? current : { ...current, message: text }))
    }
    const topic = new URLSearchParams(window.location.search).get('anliegen')
    if (topic) apply(topic)
    const onPrefill = (event) => {
      apply(event.detail)
      setStatus('idle')
    }
    window.addEventListener(PREFILL_EVENT, onPrefill)
    return () => window.removeEventListener(PREFILL_EVENT, onPrefill)
  }, [])

  useEffect(() => {
    if (status !== 'idle' && status !== 'sending') statusRef.current?.focus()
  }, [status])

  const update = (key) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value
    setValues((current) => ({ ...current, [key]: value }))
  }
  const blur = (key) => () => setTouched((current) => ({ ...current, [key]: true }))

  async function handleSubmit(event) {
    event.preventDefault()
    setTouched({ name: true, phone: true, message: true, consent: true })
    const firstInvalid = fieldOrder.find((key) => errors[key])
    if (firstInvalid) {
      formRef.current?.querySelector(`[name="${firstInvalid}"]`)?.focus()
      return
    }
    // Honeypot: von Menschen unsichtbares Feld – ausgefüllt nur durch Bots.
    if (values.company) return

    if (!site.formEndpoint) {
      setStatus('offline')
      return
    }

    setStatus('sending')
    try {
      const response = await fetch(site.formEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          name: values.name.trim(),
          telefon: values.phone.trim(),
          nachricht: values.message.trim(),
        }),
      })
      setStatus(response.ok ? 'sent' : 'error')
    } catch {
      setStatus('error')
    }
  }

  const reset = () => {
    setStatus('idle')
    if (status === 'sent') {
      setValues(empty)
      setTouched({})
    }
  }

  const describedBy = (key, hint) =>
    [showError(key) ? `${key}-error` : '', hint && !showError(key) ? `${key}-hint` : '']
      .filter(Boolean)
      .join(' ') || undefined

  return (
    <section
      id="kontakt"
      aria-labelledby="kontakt-title"
      className="grain relative overflow-hidden bg-ink-900 py-24 text-white sm:py-28 lg:py-36"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 right-[-20%] h-[46rem] w-[46rem] rounded-full bg-[radial-gradient(closest-side,rgb(196_158_86/0.12),transparent)]"
      />
      <div className="container-x relative grid gap-16 lg:grid-cols-12 lg:gap-12 xl:gap-20">
        <div className="lg:col-span-5" data-reveal>
          <p className="eyebrow text-gold-400">
            <span className="font-display text-base tracking-normal italic">07</span>
            Kontakt
          </p>
          <h2
            id="kontakt-title"
            className="mt-5 font-display text-[2.5rem] leading-[1.04] font-medium sm:text-5xl lg:text-[3.6rem]"
          >
            Wir sind für Sie <span className="text-gold-300 italic">erreichbar.</span>
          </h2>
          <p className="mt-6 max-w-md text-[1.03rem] leading-relaxed text-mist">
            Wenn Sie ausgesperrt sind, erreichen Sie uns am schnellsten telefonisch. Für Beratungen
            und Terminwünsche können Sie uns auch eine Rückrufbitte senden.
          </p>

          <dl className="mt-12 space-y-7">
            <div className="flex gap-5">
              <dt className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-gold-300 ring-1 ring-gold-500/40">
                <Icon name="phone" className="h-5 w-5" />
                <span className="sr-only">Telefon</span>
              </dt>
              <dd>
                <span className="block text-[0.68rem] font-semibold tracking-[0.28em] text-smoke uppercase" aria-hidden="true">
                  Telefon
                </span>
                <a
                  href={telHref()}
                  className="mt-1 inline-block font-display text-[1.9rem] leading-tight text-white transition-colors hover:text-gold-300"
                >
                  {site.phone}
                </a>
              </dd>
            </div>
            <div className="flex gap-5">
              <dt className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-gold-300 ring-1 ring-gold-500/40">
                <Icon name="pin" className="h-5 w-5" />
                <span className="sr-only">Einsatzgebiet</span>
              </dt>
              <dd>
                <span className="block text-[0.68rem] font-semibold tracking-[0.28em] text-smoke uppercase" aria-hidden="true">
                  Einsatzgebiet
                </span>
                <span className="mt-1 block text-[1.05rem] text-white">{site.area}</span>
              </dd>
            </div>
            <div className="flex gap-5">
              <dt className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-gold-300 ring-1 ring-gold-500/40">
                <Icon name="clock" className="h-5 w-5" />
                <span className="sr-only">Öffnungszeiten</span>
              </dt>
              <dd>
                <span className="block text-[0.68rem] font-semibold tracking-[0.28em] text-smoke uppercase" aria-hidden="true">
                  Öffnungszeiten
                </span>
                <span className="mt-1 block text-[1.05rem] text-white">{site.hours}</span>
              </dd>
            </div>
          </dl>

          <CallButton className="mt-12" showNumber />
        </div>

        <div className="lg:col-span-7" data-reveal style={{ '--delay': '140ms' }}>
          <div className="rounded-[2rem] bg-cream-50 p-6 text-graphite shadow-[0_60px_120px_-60px_rgb(0_0_0/0.9)] sm:p-10 lg:p-12">
            {status === 'offline' || status === 'sent' || status === 'error' ? (
              <div
                ref={statusRef}
                tabIndex={-1}
                role="status"
                className="scroll-mt-28 focus:outline-none"
              >
                <span
                  className={`flex h-14 w-14 items-center justify-center rounded-full ${
                    status === 'sent' ? 'bg-ink-900 text-gold-300' : 'bg-gold-500/15 text-gold-700'
                  }`}
                >
                  <Icon name={status === 'sent' ? 'check' : 'info'} className="h-6 w-6" strokeWidth={1.8} />
                </span>

                {status === 'sent' && (
                  <>
                    <h3 className="mt-7 font-display text-[2.1rem] leading-tight text-ink-900">
                      Vielen Dank, {values.name.trim()}.
                    </h3>
                    <p className="mt-4 text-[1.02rem] leading-relaxed text-slate">
                      Ihre Rückrufbitte ist bei uns eingegangen. Wir melden uns unter{' '}
                      <strong className="text-ink-900">{values.phone.trim()}</strong>. Ist es
                      dringend, rufen Sie uns bitte direkt an.
                    </p>
                  </>
                )}

                {status === 'offline' && (
                  <>
                    <h3 className="mt-7 font-display text-[2.1rem] leading-tight text-ink-900">
                      Danke, {values.name.trim()} – Ihre Angaben sind vollständig.
                    </h3>
                    <p className="mt-4 text-[1.02rem] leading-relaxed text-slate">
                      Bitte beachten Sie: Das Kontaktformular ist noch nicht mit einem Versand
                      verbunden. <strong className="text-ink-900">Ihre Anfrage wurde daher nicht
                      übermittelt.</strong> So erreichen Sie uns sofort:
                    </p>
                  </>
                )}

                {status === 'error' && (
                  <>
                    <h3 className="mt-7 font-display text-[2.1rem] leading-tight text-ink-900">
                      Das hat leider nicht geklappt.
                    </h3>
                    <p className="mt-4 text-[1.02rem] leading-relaxed text-slate">
                      Ihre Anfrage konnte nicht gesendet werden. Bitte versuchen Sie es erneut oder
                      rufen Sie uns direkt an.
                    </p>
                  </>
                )}

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <CallButton showNumber />
                  <button type="button" onClick={reset} className="btn btn-outline-dark">
                    {status === 'sent' ? 'Neue Anfrage' : 'Angaben bearbeiten'}
                  </button>
                </div>
              </div>
            ) : (
              <form ref={formRef} noValidate onSubmit={handleSubmit} aria-labelledby="form-title">
                <h3 id="form-title" className="font-display text-[2.1rem] leading-tight text-ink-900">
                  Rückruf anfragen
                </h3>
                <p className="mt-2 text-[0.92rem] text-slate">
                  Wir melden uns bei Ihnen. Mit <span className="text-gold-700">*</span> markierte
                  Felder sind Pflichtfelder.
                </p>

                <div className="mt-9 grid gap-6 sm:grid-cols-2">
                  <Field id="name" label="Name" error={showError('name')}>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      required
                      value={values.name}
                      onChange={update('name')}
                      onBlur={blur('name')}
                      aria-invalid={Boolean(showError('name'))}
                      aria-describedby={describedBy('name')}
                      className={`${inputClass} ${inputState(showError('name'))}`}
                      placeholder="Vor- und Nachname"
                    />
                  </Field>
                  <Field
                    id="phone"
                    label="Telefonnummer"
                    error={showError('phone')}
                    hint="Für den Rückruf."
                  >
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      required
                      value={values.phone}
                      onChange={update('phone')}
                      onBlur={blur('phone')}
                      aria-invalid={Boolean(showError('phone'))}
                      aria-describedby={describedBy('phone', true)}
                      className={`${inputClass} ${inputState(showError('phone'))}`}
                      placeholder="z. B. 0171 2345678"
                    />
                  </Field>
                </div>

                <div className="mt-6">
                  <Field id="message" label="Nachricht" error={showError('message')}>
                    <textarea
                      id="message"
                      name="message"
                      rows={5}
                      required
                      value={values.message}
                      onChange={update('message')}
                      onBlur={blur('message')}
                      aria-invalid={Boolean(showError('message'))}
                      aria-describedby={describedBy('message')}
                      className={`${inputClass} ${inputState(showError('message'))} resize-y`}
                      placeholder="Worum geht es? Zum Beispiel Schlosswechsel, Beratung oder Terminwunsch."
                    />
                  </Field>
                </div>

                {/* Honeypot gegen Spam – für Menschen unsichtbar */}
                <div className="absolute -left-[9999px]" aria-hidden="true">
                  <label htmlFor="company">Firma</label>
                  <input
                    id="company"
                    name="company"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={values.company}
                    onChange={update('company')}
                  />
                </div>

                <div className="mt-7">
                  <label htmlFor="consent" className="flex cursor-pointer items-start gap-3.5">
                    <input
                      id="consent"
                      name="consent"
                      type="checkbox"
                      checked={values.consent}
                      onChange={update('consent')}
                      onBlur={blur('consent')}
                      aria-invalid={Boolean(showError('consent'))}
                      aria-describedby={describedBy('consent')}
                      className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded border-ink-900/30 accent-[#a8833e]"
                    />
                    <span className="text-[0.9rem] leading-relaxed text-slate">
                      Ich bin einverstanden, dass meine Angaben zur Bearbeitung meiner Anfrage
                      verwendet werden. Details in der{' '}
                      <a
                        href={links.to('datenschutz')}
                        className="font-semibold text-ink-900 underline decoration-gold-600/60 underline-offset-4 hover:text-gold-700"
                      >
                        Datenschutzerklärung
                      </a>
                      . <span className="text-gold-700" aria-hidden="true">*</span>
                    </span>
                  </label>
                  {showError('consent') && (
                    <p id="consent-error" className="mt-2 flex items-start gap-2 text-[0.85rem] font-medium text-[#a1281d]">
                      <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0" />
                      {showError('consent')}
                    </p>
                  )}
                </div>

                <div className="mt-9 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="submit"
                    className="btn btn-gold w-full sm:w-auto"
                    disabled={status === 'sending'}
                  >
                    <Icon name="phone" className="h-4 w-4" strokeWidth={1.8} />
                    {status === 'sending' ? 'Wird gesendet …' : 'Rückruf anfragen'}
                  </button>
                  <p className="text-center text-[0.82rem] text-slate sm:text-right">
                    Ausgesperrt? Bitte rufen Sie direkt an.
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
