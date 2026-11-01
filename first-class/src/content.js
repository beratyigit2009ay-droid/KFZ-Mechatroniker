import { site } from './config.js'

/**
 * Leistungen des Schlüsseldienstes. Jede bekommt eine eigene Unterseite
 * (`<slug>.html`). Zeit- und Qualitätsangaben stammen aus den bisherigen
 * Angaben des Betriebs.
 */
const allServices = [
  {
    slug: 'tueroeffnung',
    title: 'Türöffnung',
    icon: 'door',
    image: 'tueroeffnung',
    teaser:
      'Ausgesperrt? Wir öffnen Haus- und Wohnungstüren, Garagen und Tresore – rund um die Uhr und möglichst beschädigungsfrei.',
    metaDescription:
      '24-Stunden-Schlüsselnotdienst für Augsburg, Gersthofen und Umgebung: FIRST CLASS öffnet Haus- und Wohnungstüren, Garagen und Tresore – in der Regel in ca. 20–30 Minuten vor Ort.',
    intro: `Unser Schlüsselnotdienst ist rund um die Uhr für Sie da – in ${site.area}, auch an Wochenenden sowie an Sonn- und Feiertagen. In der Regel sind wir in ca. 20–30 Minuten bei Ihnen, und rund 90 % der zugefallenen Türen öffnen wir beschädigungsfrei.`,
    situations: [
      'Die Haus- oder Wohnungstür ist zugefallen, der Schlüssel liegt drinnen.',
      'Der Schlüssel ist verloren, gestohlen oder im Schloss abgebrochen.',
      'Die Tür ist abgeschlossen und kein Schlüssel ist zur Hand.',
      'Garagentor oder Tresor lassen sich nicht mehr öffnen.',
    ],
    approach: [
      'Sie rufen an – wir nennen Ihnen Ankunftszeit und Kosten.',
      'Vor Ort prüfen wir Tür und Schloss, bevor wir etwas tun.',
      'Wir öffnen so schonend, wie es die Situation erlaubt.',
      'Ist das Schloss defekt, bauen wir auf Wunsch direkt ein neues ein.',
    ],
    notes: [
      'Bitte halten Sie einen Nachweis bereit, dass Sie zum Betreten der Wohnung berechtigt sind – zum Beispiel Ihren Ausweis mit Meldeadresse.',
      'Einsätze in der Nacht, am Wochenende oder an Feiertagen können anders berechnet werden. Darüber informieren wir Sie vor Arbeitsbeginn.',
    ],
  },
  {
    slug: 'schlosswechsel',
    title: 'Schlosswechsel',
    icon: 'cylinder',
    image: 'schlosswechsel',
    teaser:
      'Austausch defekter, veralteter oder beschädigter Schlösser und Zylinder – auf Wunsch direkt vor Ort.',
    metaDescription:
      'Schlosswechsel und Zylindertausch in Augsburg und Gersthofen: FIRST CLASS baut neue Schlösser vor Ort ein – mit Markenprodukten und Beratung.',
    intro:
      'Ein hakendes Schloss, ein verlorener Schlüssel oder der Einzug in eine neue Wohnung: Wir tauschen Schlösser und Zylinder direkt bei Ihnen vor Ort. In unserem Ladengeschäft im City Center Gersthofen führen wir Schlösser vieler namhafter Hersteller – vom einfachen Zimmerschloss bis zum einbruchhemmenden Sicherheitszylinder.',
    situations: [
      'Ein Schlüssel ist verloren gegangen oder wurde gestohlen.',
      'Der Zylinder ist schwergängig, defekt oder beschädigt.',
      'Sie ziehen ein und möchten wissen, wer Schlüssel besitzt.',
      'Sie wünschen sich einen höherwertigen Sicherheitszylinder.',
    ],
    approach: [
      'Wir prüfen Tür, Schloss und die benötigten Maße.',
      'Wir zeigen Ihnen geeignete Zylinder und erklären die Unterschiede.',
      'Sie erfahren die Kosten, bevor wir mit dem Austausch beginnen.',
      'Nach dem Einbau prüfen wir gemeinsam die Funktion und übergeben die Schlüssel.',
    ],
    notes: [
      'In Mietwohnungen sollten Sie einen Zylindertausch vorher mit Ihrer Vermieterin oder Ihrem Vermieter abstimmen – besonders, wenn die Tür zu einer Schließanlage gehört.',
      'Bewahren Sie eine eventuell mitgelieferte Sicherungskarte gut auf. Sie wird bei vielen Zylindern für Nachschlüssel benötigt.',
    ],
  },
  {
    slug: 'sicherheitstechnik',
    title: 'Sicherheitstechnik',
    icon: 'lock',
    image: 'sicherheitstechnik',
    teaser:
      'Schließanlagen, Sicherheitszylinder und Türsicherungen – für Privatpersonen, Firmen und Hausverwaltungen.',
    metaDescription:
      'Schließanlagen und Sicherheitstechnik in Augsburg und Gersthofen: Beratung, Planung und Montage für Privatpersonen, Firmen und Hausverwaltungen.',
    intro:
      'Wir beraten Sie kompetent zu Schließanlagen und zur Absicherung Ihres Objekts – vom Zimmerschlüssel bis zum Sicherheitsschloss. Wir betreuen Privatpersonen, Firmen und Hausverwaltungen und montieren die passende Lösung fachgerecht.',
    situations: [
      'Schließanlagen – mehrere Türen, abgestufte Berechtigungen, ein Schlüssel.',
      'Sicherheitszylinder mit erhöhtem Schutz, zum Beispiel gegen Aufbohren.',
      'Schutzbeschläge, die den Zylinder zusätzlich abdecken.',
      'Zusätzliche Türsicherungen wie Zusatzschlösser oder Türspaltsperren.',
    ],
    approach: [
      'Wir klären, welche Türen gesichert werden sollen und wer Zugang braucht.',
      'Wir stellen geeignete Lösungen vor und erklären Vor- und Nachteile.',
      'Vor der Montage erhalten Sie eine klare Information zu den Kosten.',
      'Wir montieren sorgfältig und erklären Ihnen die Bedienung.',
    ],
    notes: [
      'Für Hausverwaltungen und Firmen planen wir Schließanlagen so, dass sie später erweitert werden können.',
    ],
  },
  {
    slug: 'einbruchschutz',
    title: 'Einbruchschutz',
    icon: 'shield',
    image: 'einbruchschutz',
    teaser: 'Persönliche Beratung und passende Schutzlösungen für Wohnungs- und Haustüren.',
    metaDescription:
      'Einbruchschutz für Wohnungs- und Haustüren in Augsburg und Gersthofen: FIRST CLASS berät persönlich und montiert passende Schutzlösungen.',
    intro:
      'Viele Türen lassen sich mit überschaubarem Aufwand deutlich besser sichern. Wir sehen uns Ihre Tür an, zeigen Schwachstellen auf und schlagen Lösungen vor, die zu Tür, Gebäude und Budget passen – persönlich und ohne Verkaufsdruck.',
    situations: [
      'Sie möchten wissen, wie gut Ihre Wohnungs- oder Haustür geschützt ist.',
      'Nach einem Einbruch oder Einbruchsversuch soll nachgerüstet werden.',
      'Ältere Türen sollen sicherer werden, ohne sie komplett zu ersetzen.',
      'Sie wünschen eine ehrliche Einschätzung, bevor Sie investieren.',
    ],
    approach: [
      'Gemeinsamer Blick auf Tür, Rahmen, Schloss und Beschlag.',
      'Verständliche Erklärung, welche Maßnahmen sinnvoll sind – und welche nicht.',
      'Klare Information zu den Kosten, bevor wir etwas montieren.',
      'Sorgfältige Montage und Einweisung in die Bedienung.',
    ],
    notes: [
      'Nicht jede Maßnahme passt zu jeder Tür. Wir empfehlen nur, was für Ihre Situation sinnvoll ist.',
      'Bei Mietobjekten sollten bauliche Veränderungen vorab mit der Vermieterseite abgestimmt werden.',
    ],
  },
  {
    slug: 'autoschluessel',
    title: 'Autoschlüssel',
    icon: 'car',
    image: 'autooeffnung',
    teaser:
      'Autoschlüssel nachmachen – auf Wunsch mit Fernbedienung – und Hilfe bei verschlossenen Fahrzeugen.',
    metaDescription:
      'Autoschlüssel nachmachen in Gersthofen, auf Wunsch mit Fernbedienung, und Autoöffnung im Raum Augsburg – schnell und günstig bei FIRST CLASS.',
    intro:
      'Nur ein Autoschlüssel beim Fahrzeugkauf bekommen oder den Zweitschlüssel verloren? Wir fertigen Autoschlüssel nach – auf Wunsch inklusive Fernbedienung, schnell und günstig. Und wenn der Schlüssel im verschlossenen Wagen liegt, klären wir am Telefon, ob und wie wir helfen können.',
    situations: [
      'Sie brauchen einen Zweit- oder Ersatzschlüssel für Ihr Auto.',
      'Die Fernbedienung soll mit nachgemacht werden.',
      'Der Fahrzeugschlüssel liegt im verschlossenen Auto.',
      'Das Türschloss am Fahrzeug lässt sich nicht mehr bedienen.',
    ],
    approach: [
      'Sie nennen uns Marke, Modell und Baujahr – wir sagen, was möglich ist.',
      'Sie erhalten vorab eine klare Information zu den Kosten.',
      'Wir fertigen den Schlüssel an und prüfen gemeinsam die Funktion.',
    ],
    notes: ['Bitte bringen Sie Ihren vorhandenen Schlüssel und den Fahrzeugschein mit.'],
  },
  {
    slug: 'schluessel',
    title: 'Schlüssel nachmachen',
    icon: 'key',
    image: 'schluessel',
    teaser:
      'Ersatzschlüssel vom Zimmerschlüssel bis zum Sicherheitsschlüssel – in unserem Laden im City Center Gersthofen.',
    metaDescription:
      'Schlüssel nachmachen in Gersthofen: Ersatzschlüssel vom Zimmerschlüssel bis zum Sicherheitsschlüssel im Ladengeschäft im City Center Gersthofen.',
    intro:
      'Ob Haustür, Briefkasten, Zimmer oder Büro: In unserem Ladengeschäft im City Center Gersthofen fertigen wir Ersatzschlüssel an – vom einfachen Zimmerschlüssel bis zum Sicherheitsschlüssel. Kommen Sie einfach vorbei.',
    situations: [
      'Ersatzschlüssel für Haus- und Wohnungstür',
      'Briefkasten-, Zimmer- und Möbelschlüssel',
      'Schlüssel für Büro und Gewerbe',
      'Sicherheitsschlüssel mit Sicherungskarte',
    ],
    approach: [
      'Bringen Sie den Originalschlüssel in unser Ladengeschäft.',
      'Wir prüfen das Profil und nennen Ihnen den Preis.',
      'Wir fertigen den Schlüssel an und prüfen die Passgenauigkeit.',
    ],
    notes: [
      'Für viele Sicherheitsschlüssel ist die Sicherungskarte nötig. Bitte bringen Sie sie mit.',
      `Unser Laden hat ${site.hours} geöffnet.`,
    ],
  },
]

export const services = allServices.filter(
  (service) => service.slug !== 'autoschluessel' || site.offersCarOpening,
)

export const serviceBySlug = Object.fromEntries(services.map((s) => [s.slug, s]))

/** Weitere Leistungen im Ladengeschäft (ohne eigene Unterseite). */
export const shopServices = [
  {
    icon: 'stamp',
    title: 'Stempel',
    text: 'Mit uns setzen Sie ein Zeichen – Ihr persönlicher Stempel.',
  },
  {
    icon: 'battery',
    title: 'Batteriewechsel',
    text: 'Neue Energie für Uhren, Hörgeräte sowie elektrische und elektronische Geräte.',
  },
  { icon: 'trophy', title: 'Pokale & Medaillen', text: 'Für Sport, Verein oder privat.' },
  {
    icon: 'engrave',
    title: 'Schilder & Gravur',
    text: 'Schilder und Geschenke mit persönlicher Gravur.',
  },
]

export const heroBenefits = [
  '24-Stunden-Notdienst – auch sonn- und feiertags',
  'In der Regel in ca. 20–30 Minuten vor Ort',
  'Klare Kosten vor Arbeitsbeginn',
]

/** Kennzahlen laut bisherigen Angaben des Betriebs. */
export const facts = [
  { value: '24 h', label: 'Schlüsselnotdienst, auch an Sonn- und Feiertagen' },
  { value: '20–30 Min.', label: 'in der Regel bis zur Ankunft vor Ort' },
  { value: 'rund 90 %', label: 'der zugefallenen Türen beschädigungsfrei geöffnet' },
  { value: 'vor Ort', label: 'Einbau neuer Schlösser direkt beim Einsatz' },
]

/** Kundenstimmen von der bisherigen Website des Betriebs. */
export const testimonials = [
  {
    quote:
      'Super schneller Schlüsselnotdienst! Echt faire Preise. Danke nochmal für die schnelle Hilfe.',
    name: 'M. M. aus Hirblingen',
    topic: 'Schlüsselnotdienst',
  },
  {
    quote:
      'Toller und schneller Service. Wurde kompetent und schnell bedient. Ich habe mehrere Schlüssel nachmachen und Batterien meiner Uhren wechseln lassen.',
    name: 'U. K. aus Augsburg',
    topic: 'Schlüsseldienst & Batteriewechsel',
  },
  {
    quote:
      'Beim Kauf meines Autos bekam ich leider nur einen Schlüssel. Ich habe hier einen neuen anfertigen lassen, inklusive Fernbedienung, zum deutlich günstigeren Preis als beim Autohändler. Funktioniert super, danke!',
    name: 'D. H. aus Gersthofen',
    topic: 'Autoschlüssel',
  },
]

export const promises = [
  {
    icon: 'transparency',
    title: 'Transparenz',
    text: 'Sie erhalten eine klare Information zu den Kosten, bevor die Arbeit beginnt.',
  },
  {
    icon: 'care',
    title: 'Sorgfalt',
    text: 'Wir behandeln Türen, Schlösser und Eigentum mit größter Sorgfalt.',
  },
  {
    icon: 'clock',
    title: 'Zuverlässigkeit',
    text: 'Wir besprechen mit Ihnen das Vorgehen und informieren Sie über die voraussichtliche Ankunftszeit.',
  },
]

export const steps = [
  {
    icon: 'phone',
    title: 'Anrufen',
    text: 'Sie schildern uns kurz Ihr Anliegen.',
  },
  {
    icon: 'info',
    title: 'Informationen erhalten',
    text: 'Wir erklären das weitere Vorgehen und nennen die verfügbaren Informationen zu Anfahrt und Kosten.',
  },
  {
    icon: 'pin',
    title: 'Vor-Ort-Service',
    text: 'Der Monteur prüft die Situation und bespricht die Arbeiten vor Beginn mit Ihnen.',
  },
  {
    icon: 'key',
    title: 'Türöffnung oder Reparatur',
    text: 'Die vereinbarte Leistung wird sorgfältig durchgeführt.',
  },
]

export const costFactors = [
  {
    icon: 'clock',
    title: 'Uhrzeit',
    text: 'Einsätze am Abend, in der Nacht oder am Wochenende können anders berechnet werden als tagsüber.',
  },
  {
    icon: 'route',
    title: 'Anfahrt',
    text: 'Die Entfernung zu Ihrem Standort fließt in die Kosten ein.',
  },
  {
    icon: 'door',
    title: 'Türsituation',
    text: 'Ob eine Tür nur zugezogen oder abgeschlossen ist, macht einen Unterschied.',
  },
  {
    icon: 'tools',
    title: 'Arbeitsaufwand',
    text: 'Entscheidend ist, was tatsächlich nötig ist – etwa, ob ein Teil ersetzt werden muss.',
  },
]

export const trustTips = [
  'Fragen Sie schon am Telefon, mit welchen Kosten Sie rechnen müssen – inklusive Anfahrt und möglicher Zuschläge.',
  'Lassen Sie sich vor Arbeitsbeginn den Preis nennen und erklären, welche Arbeiten nötig sind.',
  'Eine nur zugezogene Tür lässt sich oft ohne Schlosstausch öffnen. Fragen Sie nach, wenn sofort ausgetauscht werden soll.',
  'Leisten Sie keine Vorauszahlung und unterschreiben Sie nichts unter Zeitdruck.',
  'Bestehen Sie auf einer Rechnung mit Aufstellung der Leistungen.',
]

export const faqs = [
  {
    q: 'Wie schnell können Sie vor Ort sein?',
    a: [
      `In ${site.area} sind wir in der Regel in ca. 20–30 Minuten bei Ihnen. Die genaue Zeit hängt von Entfernung, Uhrzeit und Verkehr ab.`,
      'Beim Anruf nennen wir Ihnen die voraussichtliche Ankunftszeit und melden uns, falls sich daran etwas ändert.',
    ],
  },
  {
    q: 'Was kostet eine Türöffnung?',
    a: [
      'Die Kosten hängen unter anderem von Uhrzeit, Anfahrt, Türsituation und dem notwendigen Arbeitsaufwand ab. Ohne die Situation zu kennen, nennen wir deshalb keine Pauschalpreise.',
      'Sicher ist: Sie erhalten eine klare Information zu den Kosten, bevor wir mit der Arbeit beginnen.',
    ],
  },
  {
    q: 'Muss das Schloss bei einer Türöffnung ausgetauscht werden?',
    a: [
      'Meist nicht: Rund 90 % der zugefallenen Türen öffnen wir beschädigungsfrei. Ist die Tür abgeschlossen oder das Schloss defekt, kann ein Austausch nötig werden.',
      'Dann bauen wir auf Wunsch direkt vor Ort ein neues Schloss ein – nach Absprache mit Ihnen.',
    ],
  },
  {
    q: 'Sind Einsätze am Wochenende möglich?',
    a: [
      `Ja. Unser Schlüsselnotdienst ist rund um die Uhr für Sie da – auch an Wochenenden sowie an Sonn- und Feiertagen. Unser Ladengeschäft im ${site.shop} hat ${site.hours} geöffnet.`,
      'Einsätze außerhalb üblicher Zeiten können mit anderen Kosten verbunden sein. Darüber informieren wir Sie vorab.',
    ],
  },
  {
    q: 'Betreuen Sie auch Firmen und Hausverwaltungen?',
    a: [
      'Ja. Wir betreuen Privatpersonen, Firmen und Hausverwaltungen – von einzelnen Schlössern bis zur kompletten Schließanlage.',
    ],
  },
  {
    q: 'Können Sie Autoschlüssel nachmachen?',
    a: [
      'Ja, auf Wunsch auch mit Fernbedienung. Am besten nennen Sie uns vorab Marke, Modell und Baujahr – dann sagen wir Ihnen, was möglich ist. Bitte bringen Sie den vorhandenen Schlüssel und den Fahrzeugschein mit.',
    ],
  },
  {
    q: 'Welche Zahlungsmöglichkeiten gibt es?',
    a: [
      `Folgende Zahlungsarten sind möglich: ${site.paymentMethods}.`,
      'Sie erhalten eine Rechnung mit einer Aufstellung der erbrachten Leistungen.',
    ],
  },
  {
    q: 'Welche Informationen sollte ich beim Anruf bereithalten?',
    a: ['Damit wir Sie gut einschätzen und beraten können, helfen uns folgende Angaben:'],
    list: [
      'Ihre genaue Adresse bzw. Ihr Standort',
      'Art der Tür, z. B. Wohnungstür, Haustür, Garage oder Tresor',
      'Ist die Tür nur zugezogen oder abgeschlossen?',
      'Steckt innen ein Schlüssel im Schloss?',
      'Eine Telefonnummer, unter der wir Sie zurückrufen können',
    ],
    after:
      'Vor Ort benötigen wir einen Nachweis, dass Sie zum Zutritt berechtigt sind – zum Beispiel Ihren Ausweis mit Meldeadresse.',
  },
]
