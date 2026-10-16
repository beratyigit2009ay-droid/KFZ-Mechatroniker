import { useId, useState } from 'react'
import { faqs } from '../content.js'
import CallButton from '../components/CallButton.jsx'
import Icon from '../components/Icon.jsx'

function FaqItem({ item, open, onToggle }) {
  const id = useId()
  const buttonId = `${id}-button`
  const panelId = `${id}-panel`
  return (
    <li className="border-b border-ink-900/10">
      <h3>
        <button
          id={buttonId}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className="group flex w-full items-center justify-between gap-6 py-6 text-left font-display text-[1.4rem] leading-snug font-medium text-ink-900 transition-colors hover:text-gold-700 sm:text-[1.6rem]"
        >
          <span>{item.q}</span>
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-1 transition-[transform,background-color,color] duration-500 ease-[var(--ease-soft)] ${
              open
                ? 'rotate-45 bg-ink-900 text-gold-300 ring-ink-900'
                : 'text-ink-900 ring-ink-900/15 group-hover:ring-gold-600'
            }`}
          >
            <Icon name="plus" className="h-4 w-4" strokeWidth={1.8} />
          </span>
        </button>
      </h3>
      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        className="accordion-panel"
        data-open={open}
        inert={!open}
      >
        <div>
          <div className="space-y-3 pr-4 pb-7 text-[1rem] leading-relaxed text-slate sm:pr-16">
            {item.a.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {item.list && (
              <ul className="space-y-2 pt-1">
                {item.list.map((entry) => (
                  <li key={entry} className="flex gap-3">
                    <Icon name="check" className="mt-1 h-4 w-4 shrink-0 text-gold-700" strokeWidth={2} />
                    <span>{entry}</span>
                  </li>
                ))}
              </ul>
            )}
            {item.after && <p className="pt-1">{item.after}</p>}
          </div>
        </div>
      </div>
    </li>
  )
}

export default function Faq() {
  const [openIndex, setOpenIndex] = useState(0)

  return (
    <section id="faq" aria-labelledby="faq-title" className="bg-cream-50 py-24 sm:py-28 lg:py-36">
      <div className="container-x grid gap-14 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-5 xl:col-span-4">
          <div className="lg:sticky lg:top-32" data-reveal>
            <p className="eyebrow text-gold-700">
              <span className="font-display text-base tracking-normal italic">06</span>
              Häufige Fragen
            </p>
            <h2
              id="faq-title"
              className="mt-5 font-display text-[2.4rem] leading-[1.05] font-medium text-ink-900 sm:text-5xl lg:text-[3.4rem]"
            >
              Gut zu wissen.
            </h2>
            <p className="mt-6 max-w-md text-[1.03rem] leading-relaxed text-slate">
              Antworten auf die Fragen, die uns am häufigsten gestellt werden – ehrlich und ohne
              Versprechen, die wir nicht halten können.
            </p>

            <div className="grain mt-10 overflow-hidden rounded-[1.5rem] bg-ink-900 p-7 text-white">
              <p className="font-display text-[1.5rem] leading-snug">
                Ihre Frage ist nicht dabei?
              </p>
              <p className="mt-2 text-[0.95rem] leading-relaxed text-mist">
                Rufen Sie uns an – wir beantworten sie gern persönlich.
              </p>
              <CallButton size="sm" className="mt-6" />
            </div>
          </div>
        </div>

        <ul className="border-t border-ink-900/10 lg:col-span-7 xl:col-span-8" data-reveal>
          {faqs.map((item, index) => (
            <FaqItem
              key={item.q}
              item={item}
              open={openIndex === index}
              onToggle={() => setOpenIndex(openIndex === index ? -1 : index)}
            />
          ))}
        </ul>
      </div>
    </section>
  )
}
