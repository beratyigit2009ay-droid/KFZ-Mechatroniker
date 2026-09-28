import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon } from '../components/Icon';
import { EASE } from '../components/Reveal';
import company from '../lib/company';
import { cityLine } from '../lib/links';
import { stopScroll } from '../lib/scroll';

type Page = 'impressum' | 'datenschutz';

/** Platzhalteradressen gehören nicht in Pflichtangaben. */
const legalEmail = company.email && !company.emailPlaceholder ? company.email : null;

/** Platzhalter für Pflichtangaben, die (noch) nicht belegt sind. */
function Missing({ children = 'wird vor Veröffentlichung ergänzt' }: { children?: ReactNode }) {
  return (
    <span className="rounded border border-dashed border-accent/60 bg-accent/10 px-1.5 py-0.5 font-mono text-[0.8em] text-accent">
      [{children}]
    </span>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-line py-7">
      <h3 className="font-semiwide text-lg font-bold tracking-[-0.01em]">{title}</h3>
      <div className="mt-3 space-y-3 leading-relaxed text-fg-2">{children}</div>
    </section>
  );
}

const Address = () => (
  <p>
    {company.name}
    <br />
    {company.owner ? (
      <>
        Inhaber: {company.owner}
        <br />
      </>
    ) : (
      <>
        Inhaber: <Missing />
        <br />
      </>
    )}
    {company.address.street}
    <br />
    {cityLine(company)}
  </p>
);

function Impressum() {
  return (
    <>
      <Block title="Angaben gemäß § 5 DDG">
        <Address />
      </Block>
      <Block title="Kontakt">
        <p>
          Telefon: {company.phone.display}
          <br />
          E-Mail: {legalEmail ?? <Missing />}
        </p>
      </Block>
      <Block title="Umsatzsteuer-ID">
        <p>
          Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG: <Missing>falls vorhanden ergänzen</Missing>
        </p>
      </Block>
      <Block title="Berufsrechtliche Angaben">
        <p>
          Berufsbezeichnung und zuständige Handwerkskammer: <Missing />
        </p>
      </Block>
      <Block title="Verbraucherstreitbeilegung">
        <p>
          Angabe zur Teilnahme an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle: <Missing>vom Betrieb festzulegen</Missing>
        </p>
      </Block>
      <Block title="Bildnachweis">
        <p>
          {company.symbolicImages
            ? 'Die Bilder auf dieser Website sind 3D-Visualisierungen (Symbolbilder) und zeigen keine Aufnahmen aus dem Betrieb.'
            : 'Fotos: ' }
          {!company.symbolicImages && <Missing />}
        </p>
      </Block>
    </>
  );
}

function Datenschutz() {
  return (
    <>
      <Block title="1. Verantwortlicher">
        <Address />
        <p>
          Telefon: {company.phone.display}
          <br />
          E-Mail: {legalEmail ?? <Missing />}
        </p>
      </Block>
      <Block title="2. Hosting und Server-Logfiles">
        <p>
          Beim Aufruf der Website verarbeitet der Hosting-Anbieter technisch notwendige Daten (z. B. IP-Adresse, Zeitpunkt, aufgerufene
          Seite) in Server-Logfiles. Anbieter, Speicherdauer und Rechtsgrundlage: <Missing />
        </p>
      </Block>
      <Block title="3. Keine Cookies, kein Tracking">
        <p>
          Diese Website setzt keine Cookies und verwendet keine Analyse- oder Marketing-Dienste. Schriften und Bilder werden vom eigenen
          Server geladen – es besteht keine Verbindung zu Google Fonts.
        </p>
      </Block>
      <Block title="4. Anfrage-Vorbereitung">
        <p>
          Die Angaben in der Anfrage-Vorbereitung (Anliegen, Fahrzeugdaten, Beschreibung) werden nicht übertragen. Sie werden ausschließlich
          im lokalen Speicher Ihres Browsers abgelegt, damit Ihr Entwurf beim nächsten Besuch erhalten bleibt, und können jederzeit über
          „Zurücksetzen“ oder die Browsereinstellungen gelöscht werden.
        </p>
      </Block>
      <Block title="5. Google Maps">
        <p>
          Die Karte im Kontaktbereich wird erst nach Ihrem Klick auf „Karte laden“ eingebunden. Erst dann werden Daten (u. a. Ihre
          IP-Adresse) an Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland, übertragen. Rechtsgrundlage ist Ihre
          Einwilligung (Art. 6 Abs. 1 lit. a DSGVO). Links zu Google Maps (Route, Bewertungen) öffnen die Google-Website in einem neuen
          Fenster.
        </p>
      </Block>
      <Block title="6. Ihre Rechte">
        <p>
          Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit sowie Widerspruch
          (Art. 15–21 DSGVO) und können eine erteilte Einwilligung jederzeit widerrufen. Zudem besteht ein Beschwerderecht bei einer
          Aufsichtsbehörde, etwa dem Landesbeauftragten für den Datenschutz und die Informationsfreiheit Baden-Württemberg.
        </p>
      </Block>
    </>
  );
}

export function LegalSheet() {
  const [page, setPage] = useState<Page | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const read = () => {
      const h = window.location.hash.replace('#', '');
      setPage(h === 'impressum' || h === 'datenschutz' ? h : null);
    };
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);

  useEffect(() => {
    stopScroll(!!page);
    if (page) window.setTimeout(() => closeRef.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [page]);

  const close = () => {
    history.replaceState(null, '', window.location.pathname + window.location.search);
    setPage(null);
  };

  return (
    <AnimatePresence>
      {page && (
        <motion.div
          key="legal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="legal-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex justify-end bg-black/60 backdrop-blur-sm"
          onClick={close}
        >
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.7, ease: EASE }}
            onClick={(e) => e.stopPropagation()}
            data-lenis-prevent
            className="h-full w-full max-w-2xl overflow-y-auto border-l border-line bg-ink-2 px-6 pb-16 pt-6 sm:px-10"
          >
            <div className="sticky top-0 z-10 -mx-6 flex items-center justify-between bg-ink-2/90 px-6 py-4 backdrop-blur sm:-mx-10 sm:px-10">
              <span className="eyebrow text-mute">{company.name}</span>
              <button ref={closeRef} type="button" onClick={close} aria-label="Schließen" className="glass grid h-11 w-11 place-items-center rounded-full">
                <Icon name="close" className="h-5 w-5" />
              </button>
            </div>
            <h2 id="legal-title" className="display-md mt-6">
              {page === 'impressum' ? 'Impressum' : 'Datenschutz'}
            </h2>
            <p className="mt-5 rounded-xl border border-dashed border-line-2 p-4 text-sm text-mute">
              Entwurf: Vor Veröffentlichung vom Betrieb zu vervollständigen und rechtlich zu prüfen. Markierte Stellen fehlen noch.
            </p>
            <div className="mt-6">{page === 'impressum' ? <Impressum /> : <Datenschutz />}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
