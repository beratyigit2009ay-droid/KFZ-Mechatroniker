import { site } from './config.js'

/**
 * Leistungen. Jede Leistung bekommt eine eigene Unterseite (`<slug>.html`).
 * Texte bewusst ohne Preis-, Zeit- oder Qualifikationsversprechen.
 */
const allServices = [
  {
    slug: 'tueroeffnung',
    title: 'Türöffnung',
    icon: 'door',
    image: 'tueroeffnung',
    teaser:
      'Wir helfen Ihnen, wenn Sie sich ausgesperrt haben, und öffnen Ihre Tür möglichst schonend.',
    metaDescription:
      'Ausgesperrt? FIRST CLASS Schlüsseldienst öffnet Ihre Tür möglichst schonend – mit klarer Information zu den Kosten vor Arbeitsbeginn.',
    intro:
      'Eine zugefallene oder verschlossene Tür ist ärgerlich – besonders, wenn es schnell gehen muss. Wir nehmen uns Ihrer Situation an, prüfen die Tür vor Ort und wählen die Methode, die Tür und Schloss so weit wie möglich schont.',
    situations: [
      'Die Tür ist zugefallen und der Schlüssel liegt in der Wohnung.',
      'Der Schlüssel ist verloren, gestohlen oder im Schloss abgebrochen.',
      'Die Tür ist abgeschlossen und kein Schlüssel ist zur Hand.',
      'Das Schloss klemmt oder lässt sich nicht mehr bedienen.',
    ],
    approach: [
      'Wir schauen uns Tür und Schloss genau an, bevor wir etwas tun.',
      'Sie erfahren vor Arbeitsbeginn, welche Kosten anfallen.',
      'Wir öffnen die Tür so schonend, wie es die Situation erlaubt.',
      'Muss ein Teil ersetzt werden, besprechen wir das vorher mit Ihnen.',
    ],
    notes: [
      'Bitte halten Sie einen Nachweis bereit, dass Sie zum Betreten der Wohnung berechtigt sind – zum Beispiel Ihren Ausweis mit Meldeadresse.',
      'Eine nur zugezogene Tür lässt sich oft ohne Beschädigung öffnen. Bei abgeschlossenen Türen kann ein Austausch des Zylinders nötig werden – das klären wir vorher mit Ihnen.',
    ],
  },
  {
    slug: 'schlosswechsel',
    title: 'Schlosswechsel',
    icon: 'cylinder',
    image: 'schlosswechsel',
    teaser: 'Austausch defekter, veralteter oder beschädigter Schlösser und Zylinder.',
    metaDescription:
      'Schlosswechsel und Zylindertausch: FIRST CLASS ersetzt defekte, veraltete oder beschädigte Schlösser – mit Beratung und Kostenklarheit vorab.',
    intro:
      'Ein Schloss, das hakt, ein verlorener Schlüssel oder ein neuer Lebensabschnitt in einer neuen Wohnung: Es gibt viele gute Gründe, Schloss oder Zylinder zu erneuern. Wir beraten Sie, was zu Ihrer Tür passt, und tauschen sorgfältig aus.',
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
    slug: 'einbruchschutz',
    title: 'Einbruchschutz',
    icon: 'shield',
    image: 'einbruchschutz',
    teaser: 'Verbessern Sie die Sicherheit Ihres Zuhauses mit passenden Schutzlösungen.',
    metaDescription:
      'Einbruchschutz für Wohnungs- und Haustüren: FIRST CLASS berät zu passenden Schutzlösungen und montiert sie sorgfältig.',
    intro:
      'Viele Türen lassen sich mit überschaubarem Aufwand deutlich besser sichern. Wir sehen uns Ihre Tür an, zeigen mögliche Schwachstellen auf und schlagen Lösungen vor, die zu Tür, Gebäude und Budget passen.',
    situations: [
      'Sie möchten wissen, wie gut Ihre Wohnungs- oder Haustür geschützt ist.',
      'Nach einem Einbruch oder Einbruchsversuch soll nachgerüstet werden.',
      'Ältere Türen sollen sicherer werden, ohne sie komplett zu ersetzen.',
      'Sie planen eine Nachrüstung und wünschen eine ehrliche Einschätzung.',
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
    slug: 'sicherheitstechnik',
    title: 'Sicherheitstechnik',
    icon: 'lock',
    image: 'sicherheitstechnik',
    teaser: 'Beratung und Montage geeigneter Sicherheitszylinder und Türsicherungen.',
    metaDescription:
      'Sicherheitstechnik von FIRST CLASS: Beratung und Montage geeigneter Sicherheitszylinder und Türsicherungen für Ihr Zuhause.',
    intro:
      'Gute Sicherheitstechnik muss zum Alltag passen: Sie soll schützen und sich trotzdem einfach bedienen lassen. Wir beraten Sie zu Sicherheitszylindern und Türsicherungen und montieren die gewählte Lösung fachgerecht.',
    situations: [
      'Sicherheitszylinder mit erhöhtem Schutz, zum Beispiel gegen Aufbohren.',
      'Schutzbeschläge, die den Zylinder zusätzlich abdecken.',
      'Zusätzliche Türsicherungen wie Zusatzschlösser oder Türspaltsperren.',
      'Gleichschließende Zylinder – mehrere Türen mit einem Schlüssel.',
    ],
    approach: [
      'Wir klären, welche Türen gesichert werden sollen und wie Sie sie nutzen.',
      'Wir stellen geeignete Lösungen vor und erklären Vor- und Nachteile.',
      'Vor der Montage erhalten Sie eine klare Information zu den Kosten.',
      'Wir montieren sorgfältig und erklären Ihnen die Bedienung.',
    ],
    notes: [
      'Welche Lösung sinnvoll ist, hängt von Tür, Rahmen und Nutzung ab. Deshalb beraten wir immer mit Blick auf Ihre konkrete Situation.',
    ],
  },
  {
    slug: 'autooeffnung',
    title: 'Autoöffnung',
    icon: 'car',
    image: 'autooeffnung',
    teaser:
      'Hilfe bei verschlossenen Fahrzeugen – ob wir bei Ihrem Fahrzeug helfen können, klären wir vorab am Telefon.',
    metaDescription:
      'Fahrzeug verschlossen, Schlüssel innen? Rufen Sie FIRST CLASS an – wir klären am Telefon, ob und wie wir bei Ihrem Fahrzeug helfen können.',
    intro:
      'Der Schlüssel liegt im Wagen, die Türen sind zu? Fahrzeuge unterscheiden sich stark. Deshalb klären wir am Telefon, ob wir bei Ihrem Modell helfen können, bevor wir losfahren – so verlieren Sie keine Zeit.',
    situations: [
      'Der Fahrzeugschlüssel liegt im verschlossenen Auto.',
      'Die Zentralverriegelung hat das Fahrzeug unerwartet verriegelt.',
      'Das Türschloss am Fahrzeug lässt sich nicht mehr bedienen.',
    ],
    approach: [
      'Sie nennen uns Marke, Modell und Standort des Fahrzeugs.',
      'Wir sagen Ihnen offen, ob wir helfen können, und informieren über die Kosten.',
      'Vor Ort gehen wir mit Ihrem Fahrzeug so schonend wie möglich um.',
    ],
    notes: [
      'Bitte halten Sie einen Nachweis bereit, dass Sie über das Fahrzeug verfügen dürfen – zum Beispiel Ausweis und Fahrzeugschein.',
    ],
  },
  {
    slug: 'beratung',
    title: 'Beratung',
    icon: 'consult',
    image: 'beratung',
    teaser: 'Persönliche Beratung rund um Türsicherheit, Schließzylinder und Einbruchschutz.',
    metaDescription:
      'Persönliche Beratung zu Türsicherheit, Schließzylindern und Einbruchschutz – verständlich, ehrlich und passend zu Ihrer Tür.',
    intro:
      'Welcher Zylinder ist der richtige? Lohnt sich eine Zusatzsicherung? Wir nehmen uns Zeit für Ihre Fragen und erklären verständlich, welche Möglichkeiten es gibt – ohne Fachchinesisch und ohne Verkaufsdruck.',
    situations: [
      'Welcher Schließzylinder passt zu meiner Tür?',
      'Wie kann ich meine Wohnungs- oder Haustür zusätzlich sichern?',
      'Was ist nach einem Schlüsselverlust sinnvoll?',
      'Wie lassen sich mehrere Türen mit einem Schlüssel schließen?',
    ],
    approach: [
      'Sie schildern uns Ihr Anliegen telefonisch oder über das Kontaktformular.',
      'Wir besprechen mit Ihnen die Möglichkeiten für Ihre Tür.',
      'Sie erhalten eine verständliche Empfehlung und eine klare Information zu möglichen Kosten.',
    ],
    notes: [
      'Eine Beratung verpflichtet Sie zu nichts. Sie entscheiden in Ruhe, ob und welche Maßnahme Sie umsetzen möchten.',
    ],
  },
]

export const services = allServices.filter(
  (service) => service.slug !== 'autooeffnung' || site.offersCarOpening,
)

export const serviceBySlug = Object.fromEntries(services.map((s) => [s.slug, s]))

export const heroBenefits = [
  'Schnelle Hilfe vor Ort',
  'Transparente Preise vor Arbeitsbeginn',
  'Professioneller und sorgfältiger Service',
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

export const faqs = [
  {
    q: 'Wie schnell können Sie vor Ort sein?',
    a: [
      'Das hängt davon ab, wo Sie sich befinden, zu welcher Uhrzeit Sie anrufen und wie die Verkehrslage ist. Eine feste Ankunftszeit können wir deshalb nicht pauschal zusagen.',
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
      'Nicht zwingend. Eine nur zugezogene Tür lässt sich oft ohne Beschädigung öffnen. Ist die Tür abgeschlossen oder das Schloss defekt, kann ein Austausch nötig werden.',
      'Das besprechen wir vor Ort mit Ihnen – bevor wir etwas tun.',
    ],
  },
  {
    q: 'Sind Einsätze am Wochenende möglich?',
    a: [
      `Unsere Erreichbarkeit: ${site.hours}. Rufen Sie im Zweifel einfach an – wir sagen Ihnen offen, ob und wann wir helfen können.`,
      'Bitte beachten Sie, dass Einsätze außerhalb üblicher Zeiten mit anderen Kosten verbunden sein können. Auch darüber informieren wir Sie vorab.',
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
      'Art der Tür, z. B. Wohnungstür, Haustür oder Nebeneingang',
      'Ist die Tür nur zugezogen oder abgeschlossen?',
      'Steckt innen ein Schlüssel im Schloss?',
      'Eine Telefonnummer, unter der wir Sie zurückrufen können',
    ],
    after:
      'Vor Ort benötigen wir einen Nachweis, dass Sie zum Zutritt berechtigt sind – zum Beispiel Ihren Ausweis mit Meldeadresse.',
  },
]
