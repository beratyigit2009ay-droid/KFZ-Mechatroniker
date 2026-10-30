# Visuelles Konzept

**PREMIUM AUTOMOTIVE × FUTURISTIC × INDUSTRIAL × MINIMAL**

Das Ziel ist, dass die Seite auf den ersten Blick wie eine Automobilmarke wirkt und nicht wie ein Handwerker-Template. Trotzdem soll sie sofort beantworten: *Was macht der Betrieb? Warum kann ich ihm vertrauen? Wie bekomme ich einen Termin?*

## 1. Leitidee: Fakten statt Floskeln

Der Inhalt stützt sich ausschließlich auf belegte Daten: Name, Inhaber, Adresse, Telefon, Öffnungszeiten, Google-Bewertung. Statt erfundener Versprechen („seit 1987“, „Meisterbetrieb“, „Festpreis“) inszeniert die Seite, was prüfbar ist:

- Die **Google-Bewertung** wird zum Rundinstrument. Die Nadel fährt beim Einscrollen wie bei einer „Zündung“ einmal voll aus und pendelt sich dann auf dem echten Wert ein.
- Der **Live-Öffnungsstatus** („Jetzt geöffnet · bis 17:30 Uhr“) wird aus den echten Zeiten in der Zeitzone Europe/Berlin berechnet.
- Ein **Datenblatt** im Stil eines Fahrzeugdatenblatts fasst alle Eckdaten zusammen.
- Fehlende Angaben werden nicht überspielt, sondern führen zum Telefon („Öffnungszeiten telefonisch erfragen“).

## 2. Eigene Identität pro Betrieb

Alle vier Betriebe teilen dasselbe Designsystem, jeder bekommt aber eine eigene Signatur:

| Betrieb | Akzent | Claim | Idee |
| --- | --- | --- | --- |
| KFZ-Service Patran | Signal-Orange `#FF6A1A` | *Kfz-Service. Fünf Sterne.* | Die perfekte 5,0-Bewertung ist das Markenversprechen. |
| Georg Abdullahad | Acid-Lime `#C6F432` | *Reparatur. Verlässlich.* | 46 Bewertungen als breite Vertrauensbasis, klare Werktagszeiten. |
| Kfz-Werkstätte Karl Sauter | Rosso-Rot `#FF3B3F` | *Handwerk, das überzeugt.* | 4,9 Sterne aus 47 Bewertungen, klassisch-kraftvoll. |
| Lothar Maurer | Ice-Blue `#3EA2FF` | *Fahrzeugtechnik nach Feierabend.* | Das echte Alleinstellungsmerkmal: abends und samstags geöffnet. |

Die Markenfarbe zieht sich durch das ganze Erlebnis: Bremssattel und Nabendeckel im 3D-Rad (mit Namen und Initialen), Lichtreflexe in allen Renderings, Buttons, Tacho, Favicon. Jeder Betrieb hat außerdem eine eigene Bildmarke: ein Tacho-Bogen mit Initialen.

## 3. Gestaltungsmittel

- **Farbwelt:** tiefes Schwarz (`#07080A`), Anthrazit-Stufen, Weiß, eine einzige starke Akzentfarbe. Der Abschnitt „Über uns“ ist als heller Papier-Abschnitt gesetzt und bringt so Rhythmus in die dunkle Seite.
- **Typografie:** *Archivo* mit breitlaufender Achse (wdth 118–125 %) für Headlines wie auf Fahrzeug-Typenschildern, *Geist* für ruhigen Fließtext, *Geist Mono* für technische Beschriftungen. Alle Schriften liegen lokal, ohne Google-Server.
- **3D:** ein echtes, prozedural modelliertes Rad (Reifen mit Profil, geschüsselte Doppelspeichen-Felge, gelochte Bremsscheibe, Sattel) mit Studio-Reflexionen. Im Hero dreht es sich live, folgt der Maus und reagiert auf den Scroll. Alle weiteren Motive sind Offline-Renderings aus derselben 3D-Pipeline.
- **Motion:** Headlines steigen wortweise aus einer Maske, die Galerie ist am Desktop an den Scroll gekoppelt, die Fahrzeug-Silhouette zeichnet sich wie ein Lichtstrich und wird von einem Diagnose-Scan überlaufen. Dazu Count-ups, magnetische Buttons mit Lichtkante, Cursor-Spotlight auf Karten und Smooth Scrolling. Jede Animation hat eine Aufgabe; bei „Bewegung reduzieren“ fallen sie weg.
- **Tiefe:** technisches Raster, dezentes Filmkorn, Glas-Flächen nur dort, wo Inhalt darunter liegt (Navigation, Buttons).

## 4. Struktur und Conversion

1. **Hero:** Claim, Kurzbeschreibung, CTA „Termin vereinbaren“ und „Jetzt anrufen“ mit Nummer, Sterne und Live-Status
2. **Laufband:** Eckdaten
3. **Leistungen:** Sticky-Bühne mit Bildwechsel, je Leistung „Service anfragen“
4. **Warum:** Bento-Kacheln mit prüfbaren Fakten
5. **Über uns:** Text und Datenblatt
6. **Einblicke:** horizontale Galerie, am Ende „Route planen“
7. **Fahrzeug-Check:** Bereich am Auto antippen, Anzeichen lesen, als Anliegen übernehmen
8. **Bewertungen:** Tacho, Link zu Google
9. **Termin:** vier Schritte und eine *Anfrage-Vorbereitung*, die eine Gesprächsnotiz erzeugt (kopierbar, ohne Datenübertragung)
10. **FAQ:** nur aus belegten Daten generiert
11. **Kontakt:** riesige Telefonnummer, Adresse, Öffnungszeiten mit „Heute“-Markierung, Karte per Zwei-Klick-Lösung (DSGVO)
12. **Footer**

Da der einzige belegte Kontaktweg das Telefon ist, führt jede Conversion-Strecke dorthin. Auf dem Smartphone gibt es dafür eine eigene **Aktionsleiste** (Anrufen · Termin · Route) in Daumenreichweite und einen Anruf-Button in der Kopfzeile.

## 5. Mobile

Mobil ist die Seite eigens gestaltet und nicht nur verkleinert:

- Das Rad sitzt oben rechts im Anschnitt, der Text darunter, und beide CTAs liegen im ersten Screen.
- Die Galerie ist eine native Wisch-Galerie mit Snap statt Scroll-Kopplung.
- Das Vollbild-Menü öffnet sich mit einer Kreis-Maske vom Menü-Button aus.
- Die Aktionsleiste unten erscheint erst, wenn der Hero verlassen ist.
- Das 3D läuft mit reduziertem Detailgrad. Schafft ein Gerät keine flüssige Darstellung, bleibt automatisch das vorgerenderte Bild stehen.
