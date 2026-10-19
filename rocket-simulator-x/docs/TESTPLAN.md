# Testplan – Rocket Simulator X (Kernversion)

Ehrlich getrennt: **Was wirklich geprüft wurde** und **was du in Roblox Studio testen musst**.
Roblox Studio selbst konnte bei der Entwicklung nicht gestartet werden. Das Spiel wurde also
**noch nie in Roblox ausgeführt**.

## A. Wirklich geprüft (automatisch, außerhalb von Roblox)

| Prüfung | Werkzeug | Ergebnis |
|---|---|---|
| Typprüfung aller 50 Dateien gegen die echte Roblox-API (Eigenschaften, Methoden, Enums, Typen) | `luau-lsp analyze` (strict) mit den offiziellen Roblox-Typdefinitionen + Rojo-Sourcemap | 0 Fehler |
| Projekt baut zu einer Studio-Datei | `rojo build` | `RocketSimulatorX.rbxlx` erzeugt, 1 Script, 1 LocalScript, 48 ModuleScripts an den richtigen Orten |
| 36 automatische Tests | `lune run tests/run.luau` | 36 bestanden, 0 fehlgeschlagen |

Die 36 Tests prüfen:

- **Konfiguration**: 20 Raketen, eindeutige IDs, alle 7 Typen, jede Rakete teurer, besser belohnt und höher als die vorige,
  gültige Aussehen-Werte, Spielfeldgrenze wird auch voll ausgebaut nicht überschritten; 4 Upgrades; 10 Welten.
- **Echte Physik**: Luftdichte (e^(−h/8,5 km)), schwächere Schwerkraft oben, leere Rakete leichter und schneller,
  Schub/Gewicht beim Start 1,2–1,8 (wie echte Raketen), Mach, Luftschichten, Belastung (Max-Q).
- **Formeln**: Upgrade-Kosten und Maximalstufe, Endgeschwindigkeit am Boden stimmt, jedes Upgrade und der Boost bringen Höhe,
  Belohnung abgerundet und nie negativ, mehrere Level-Ups auf einmal, Maximallevel.
- **Zahlenformat**: 1.25K, 3.4M, 12.3 km, ×1.6 usw.
- **Datenschema**: Standardwerte, Reparatur kaputter Daten (Text statt Zahl, negative Werte, NaN, unbekannte Raketen,
  Upgrades über Maximum, nicht gekaufte ausgerüstete Rakete), Migration von Version 0, Erkennung neuerer Daten,
  `deepCopy`, Client-Kopie ohne Meta-Daten.
- **Spieler-Grenze**: höchstens 8 Spieler pro Server, der 9. wird mit Meldung hinausgeschickt.
- **Rate-Limit**: Puffer, Sperre, Nachfüllen; 100 Spam-Anfragen pro Sekunde → höchstens 10 kommen durch.
- **Raketenmodelle**: alle 20 Raketen und Kapseln werden mit echten Roblox-Instanzen (Lune) gebaut; jedes Teil ist an Root
  geschweißt, verankert, ohne Kollision; Motor-Effekte starten ausgeschaltet; höchstens 47 Parts pro Rakete.
- **Booster-Trennung**: Booster lösen sich als eigene Modelle, der Rest bleibt richtig verschweißt.
- **Kapsel**: Fallschirm erst versteckt, Wiedereintritts-Feuer an/aus; Abgasstrahl im Vakuum breiter und ohne Rauch.
- **Wirtschaft**: simulierter Spieler kauft Upgrades und Raketen. Ergebnis: alle 20 Raketen nach ca. 175 Flügen
  (≈ 105 Minuten), jede neue Rakete braucht 6–12 Flüge.

## B. In Roblox Studio testen (bitte abhaken)

Vorbereitung: Spiel veröffentlichen und **Game Settings › Security › Enable Studio Access to API Services** einschalten.

| # | Test | So geht's | Erwartet |
|---|---|---|---|
| 1 | Beitreten | Play (F5) | Ladebildschirm, dann HUD. Du stehst neben „deiner“ Rampe, dein Name steht darüber, die Starter-Rakete „Funke“ steht drauf. |
| 2 | Erster Start | STARTEN (oder F) | Countdown 3-2-1 mit Ton, Arme klappen weg. Bei „1“: „🔥 ZÜNDUNG“, Flamme brennt, Rakete steht noch, riesige Rauchwolke breitet sich am Boden aus. Dann hebt sie langsam ab und wird immer schneller. Kamera wackelt, folgt. |
| 3 | Flug-Anzeige | während des Flugs | Höhe steigt, Tempo in km/h, Mach-Zahl und G-Kraft (am Anfang ca. 1,4 G, steigt bis Brennschluss), Luftschicht + „Luft %“ sinken, Belastungs-Leiste steigt kurz und fällt wieder („⚠️ MAX-Q“), Treibstoff-Leiste wird leer. |
| 3a | Booster-Trennung | Rakete mit Boostern (z. B. #4 Glutstern) | Knall, „💥 BOOSTER-TRENNUNG“, die Booster fallen trudelnd mit Rauchfahne ab. Die Rakete fliegt normal weiter. |
| 3b | Dünne Luft | höhere Rakete | Flamme wird oben breiter, Rauch hört auf, Himmel wird schon in ~30 km fast schwarz. Ab 100 km: „🌌 KÁRMÁN-LINIE“. Dampfkegel (weiß) und Glühen an der Spitze nur in dichter Luft bei hohem Tempo. |
| 4 | Boost | im Flug BOOST antippen | blaue Zusatzflamme, Kamera wackelt, Boost-Leiste wird leer. Zweites Drücken: nichts. |
| 5 | Gipfel + Landung | abwarten | Lichtblitz, Rakete verschwindet. Kapsel fällt glühend mit Feuerspur („☄️ WIEDEREINTRITT“), kurz über dem Boden geht mit Ruck der Fallschirm auf („🪂“), Landung neben der Rampe mit Staubring. Belohnungsfenster. Danach steht die Rakete wieder auf der Rampe. |
| 6 | Belohnung | Belohnungsfenster vs. Coins oben links | Coins oben links steigen um genau den Betrag im Fenster. |
| 7 | Doppelstart | STARTEN schnell 10× drücken / F gedrückt halten | Nur EIN Flug startet. |
| 8 | Upgrade | Upgrades › Motor kaufen | Coins sinken um den Preis, Stufe 1/25, STARTEN zeigt höhere Höhe. Nächster Flug geht höher. |
| 9 | Zu wenig Geld | teures Upgrade antippen | rote Meldung „Dir fehlen noch …“, nichts wird abgezogen. |
| 10 | Rakete kaufen | Raketen › „Pionier“ (300) | Meldung „gekauft“, Rakete steht sofort auf der Rampe, Karte zeigt „✓ Ausgerüstet“. |
| 11 | Reihenfolge | Raketen › Rakete #5 ohne #3/#4 | Knopf mit 🔒, Server antwortet „Kauf zuerst …“. |
| 12 | Wechseln | ältere Rakete „Ausrüsten“ | Rampe zeigt die gewählte Rakete. Während eines Flugs: „Warte, bis dein Flug vorbei ist“. |
| 13 | Level-Up | mehrere Flüge | lila Meldung „Level X erreicht! +N 💎“, Gems steigen. |
| 14 | Speichern | Coins verdienen, Stop, Play | Coins, Raketen, Upgrades, Rekord und Tutorial-Schritt sind wieder da. |
| 15 | DataStore aus | API-Zugriff ausschalten, Play | Spiel läuft, Meldung „Speichern ist aus …“, Optionen zeigen „⚠️ Speichern ist gerade AUS“. Nach erneutem Einschalten sind die alten Daten unverändert. |
| 16 | Respawn | im Flug und danach: Figur zurücksetzen (Esc › Reset) | Flug läuft weiter, HUD bleibt, Knöpfe funktionieren, Kamera kommt danach zur neuen Figur. |
| 17 | Verlassen im Flug | Test › Clients and Servers, Spieler im Flug schließen | Server: keine Fehler, Rakete und Kapsel verschwinden, Rampe wird „frei“. |
| 18 | Mehrspieler | Test › Clients and Servers, 2–3 Spieler (max. 8) | Jeder hat eine eigene Rampe, sieht die Raketen der anderen. Prompt „Rakete starten“ nur an der eigenen Rampe. Startet ein anderer in der Nähe, wackelt deine Kamera leicht (Boden-Beben). |
| 19 | Rangliste | Spielerliste oben rechts / Menü Rangliste | „Rekord (m)“ und „Level“ stimmen. Tafel am Platz zeigt die Top 10 (in Studio oft leer). |
| 20 | Handy | Test › Device › z. B. iPhone 14 | Alle Texte lesbar, nichts abgeschnitten, STARTEN-Knopf gut erreichbar, Fenster passen auf den Bildschirm. |
| 21 | Gamepad | Xbox-Controller | R2 = Start/Boost, Menüs per Steuerkreuz bedienbar, B schließt Fenster. |
| 22 | Server fährt herunter | Clients and Servers, Server stoppen | Ausgabe ohne Fehler; danach sind die Daten gespeichert. |
| 23 | Spam / Manipulation | Befehlsleiste (Client): `game.ReplicatedStorage.Remotes.BuyUpgrade:InvokeServer("Engine")` 50× in einer Schleife | höchstens wenige Käufe, danach „Nicht so schnell!“. `BuyRocket:InvokeServer("gibtsnicht")` → „Unbekannte Rakete“. |
| 24 | Sounds | überall | Klick, Kauf, Countdown, Start, Motor, Gipfel, Landung, Level-Up hörbar? Stumme Sounds in `Config/Sounds.luau` austauschen. |
| 25 | Weniger Effekte | Optionen › Weniger Effekte AN | deutlich weniger Rauch und Funken beim nächsten Flug, kein Dampfkegel/Plasma. |
| 26 | Leistung | Top-Rakete mit Boostern, 3 Spieler gleichzeitig | Keine Ruckler, Ausgabe ohne Fehler. Abgeworfene Booster verschwinden nach ca. 7 s. |
| 27 | Server voll | Test › Clients and Servers, **9** Spieler › Start | 8 Fenster spielen normal, das 9. zeigt „Dieser Server ist voll (8/8 Spieler) …“. Schließt einer, kann ein neuer wieder rein. |

### Was noch nicht drin ist (folgt in eigenen PRs)

Welten freischalten, Pets & Eggs, Quests, Daily Rewards, Login-Streak, Achievements, Rebirth,
Gamepasses/Developer Products, Musik. Die Datenfelder dafür sind schon im Speicherformat vorhanden.
