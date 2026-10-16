import { site } from '../config.js'
import Icon from '../components/Icon.jsx'
import PageHero from '../components/PageHero.jsx'

/**
 * Vorbereitete Rechtstexte. Die Platzhalter in eckigen Klammern müssen vor
 * der Veröffentlichung ersetzt und die Texte rechtlich geprüft werden.
 */
const documents = {
  impressum: {
    title: 'Impressum',
    note: 'Vorlage: Bitte alle Platzhalter in eckigen Klammern durch die tatsächlichen Unternehmensangaben ersetzen und das Impressum vor der Veröffentlichung rechtlich prüfen lassen.',
    sections: [
      {
        heading: 'Angaben gemäß § 5 DDG',
        lines: [
          '[FIRMENNAME BZW. NAME DES INHABERS]',
          '[RECHTSFORM]',
          '[STRASSE UND HAUSNUMMER]',
          '[PLZ UND ORT]',
        ],
      },
      {
        heading: 'Kontakt',
        lines: [`Telefon: ${site.phone}`, 'E-Mail: [E-MAIL-ADRESSE]'],
      },
      {
        heading: 'Vertretungsberechtigt',
        lines: ['[NAME DER VERTRETUNGSBERECHTIGTEN PERSON – bei Gesellschaften]'],
      },
      {
        heading: 'Registereintrag',
        lines: ['[REGISTERGERICHT UND REGISTERNUMMER – falls vorhanden]'],
      },
      {
        heading: 'Umsatzsteuer-ID',
        lines: ['[UMSATZSTEUER-IDENTIFIKATIONSNUMMER gemäß § 27a UStG – falls vorhanden]'],
      },
      {
        heading: 'Berufsrechtliche Angaben',
        lines: ['[ZUSTÄNDIGE KAMMER / EINTRAGUNG IN DIE HANDWERKSROLLE – falls zutreffend]'],
      },
      {
        heading: 'Verantwortlich für den Inhalt',
        lines: ['[NAME UND ANSCHRIFT – gemäß § 18 Abs. 2 MStV]'],
      },
      {
        heading: 'Verbraucherstreitbeilegung',
        lines: ['[HINWEIS GEMÄSS § 36 VSBG ERGÄNZEN]'],
      },
    ],
  },
  datenschutz: {
    title: 'Datenschutzerklärung',
    note: 'Vorlage: Dieses Gerüst ersetzt keine vollständige Datenschutzerklärung. Bitte vor der Veröffentlichung vervollständigen – etwa mit einem seriösen Datenschutz-Generator oder rechtlicher Beratung.',
    sections: [
      {
        heading: '1. Verantwortliche Stelle',
        lines: [
          '[FIRMENNAME BZW. NAME DES INHABERS]',
          '[STRASSE UND HAUSNUMMER], [PLZ UND ORT]',
          `Telefon: ${site.phone}`,
          'E-Mail: [E-MAIL-ADRESSE]',
        ],
      },
      {
        heading: '2. Hosting und Server-Logfiles',
        text: [
          'Beim Aufruf dieser Website verarbeitet der Hosting-Anbieter technisch notwendige Daten, zum Beispiel die IP-Adresse sowie Datum und Uhrzeit des Abrufs.',
          '[HOSTING-ANBIETER, SPEICHERDAUER UND RECHTSGRUNDLAGE ERGÄNZEN]',
        ],
      },
      {
        heading: '3. Kontaktaufnahme per Telefon und Kontaktformular',
        text: [
          'Wenn Sie uns anrufen oder das Kontaktformular nutzen, verarbeiten wir Ihre Angaben (Name, Telefonnummer, Nachricht), um Ihre Anfrage zu bearbeiten.',
          '[DIENSTLEISTER FÜR DEN FORMULARVERSAND, SPEICHERDAUER UND RECHTSGRUNDLAGE ERGÄNZEN]',
        ],
      },
      {
        heading: '4. Schriftarten und Bilder',
        text: [
          'Schriftarten und Bilder sind lokal auf dem Server eingebunden. Beim Aufruf der Website wird keine Verbindung zu Servern von Google, Bilddiensten oder anderen Drittanbietern hergestellt.',
        ],
      },
      {
        heading: '5. Cookies und Analyse',
        text: [
          'Diese Website setzt keine Cookies und verwendet keine Analyse- oder Tracking-Dienste.',
        ],
      },
      {
        heading: '6. Ihre Rechte',
        text: [
          'Sie haben nach Maßgabe der DSGVO das Recht auf Auskunft, Berichtigung, Löschung und Einschränkung der Verarbeitung Ihrer Daten, auf Datenübertragbarkeit sowie auf Widerspruch gegen die Verarbeitung. Außerdem können Sie sich bei einer Datenschutz-Aufsichtsbehörde beschweren.',
        ],
      },
      {
        heading: 'Stand',
        lines: ['[DATUM]'],
      },
    ],
  },
}

export default function LegalPage({ kind }) {
  const doc = documents[kind]
  return (
    <>
      <PageHero title={doc.title} crumbs={[{ label: doc.title }]} />
      <section aria-label={doc.title} className="bg-cream-50 py-20 lg:py-28">
        <div className="container-x">
          <div className="max-w-3xl">
            <p className="flex gap-4 rounded-2xl border border-gold-600/35 bg-gold-500/[0.08] p-6 text-[0.95rem] leading-relaxed text-graphite">
              <Icon name="info" className="mt-0.5 h-5 w-5 shrink-0 text-gold-700" />
              <span>{doc.note}</span>
            </p>

            <div className="mt-14 space-y-12">
              {doc.sections.map((section) => (
                <div key={section.heading}>
                  <h2 className="font-display text-[1.8rem] leading-tight font-medium text-ink-900">
                    {section.heading}
                  </h2>
                  <div className="mt-4 space-y-3 text-[1.02rem] leading-relaxed text-slate">
                    {section.lines && (
                      <p>
                        {section.lines.map((line, index) => (
                          <span key={line}>
                            {index > 0 && <br />}
                            {line}
                          </span>
                        ))}
                      </p>
                    )}
                    {section.text?.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
