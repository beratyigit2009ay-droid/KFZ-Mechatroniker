# Testplan – Rocket Simulator X (Kernversion)

Ehrlich getrennt: **Was wirklich geprüft wurde** und **was du in Roblox Studio testen musst**.
Roblox Studio selbst konnte bei der Entwicklung nicht gestartet werden. Das Spiel wurde also
**noch nie in Roblox ausgeführt**.

## A. Wirklich geprüft (automatisch, außerhalb von Roblox)

| Prüfung | Werkzeug | Ergebnis |
|---|---|---|
| Typprüfung aller 50 Dateien gegen die echte Roblox-API (Eigenschaften, Methoden, Enums, Typen) | `luau-lsp analyze` (strict) mit den offiziellen Roblox-Typdefinitionen + Rojo-Sourcemap | 0 Fehler |
| Projekt baut zu einer Studio-Datei | `rojo build` | `RocketSimulatorX.rbxlx` erzeugt, 1 Script, 1 LocalScript, 48 ModuleScripts an den richtigen Orten |
| 29 automatische Tests | `lune run tests/run.luau` | 29 bestanden, 0 fehlgeschlagen |

Die 29 Tests prüfen:

- **Konfiguration**: 20 Raketen, eindeutige IDs, alle 7 Typen, jede Rakete teurer, besser belohnt und höher als die vorige,
  gültige Aussehen-Werte, Spielfeldgrenze wird auch voll ausgebaut nicht überschritten; 4 Upgrades; 10 Welten.
- **Formeln**: Upgrade-Kosten und Maximalstufe, Höchstgeschwindigkeit stimmt, jedes Upgrade und der Boost bringen Höhe,
  Belohnung abgerundet und nie negativ, mehrere Level-Ups auf einmal, Maximallevel.
- **Zahlenformat**: 1.25K, 3.4M, 12.3 km, ×1.6 usw.
- **Datenschema**: Standardwerte, Reparatur kaputter Daten (Text statt Zahl, negative Werte, NaN, unbekannte Raketen,
  Upgrades über Maximum, nicht gekaufte ausgerüstete Rakete), Migration von Version 0, Erkennung neuerer Daten,
  `deepCopy`, Client-Kopie ohne Meta-Daten.
- **Rate-Limit**: Puffer, Sperre, Nachfüllen; 100 Spam-Anfragen pro Sekunde → höchstens 10 kommen durch.
- **Raketenmodelle**: alle 20 Raketen und Kapseln werden mit echten Roblox-Instanzen (Lune) gebaut; jedes Teil ist an Root
  geschweißt, verankert, ohne Kollision; Motor-Effekte starten ausgeschaltet; höchstens 47 Parts pro Rakete.
- **Wirtschaft**: simulierter Spieler kauft Upgrades und Raketen. Ergebnis: alle 20 Raketen nach ca. 200 Flügen
  (≈ 110 Minuten), jede neue Rakete braucht 8–15 Flüge.

## B. In Roblox Studio testen (bitte abhaken)

Vorbereitung: Spiel veröffentlichen und **Game Settings › Security › Enable Studio Access to API Services** einschalten.

| # | Test | So geht's | Erwartet |
|---|---|---|---|
| 1 | Beitreten | Play (F5) | Ladebildschirm, dann HUD. Du stehst neben „deiner“ Rampe, dein Name steht darüber, die Starter-Rakete „Funke“ steht drauf. |
| 2 | Erster Start | STARTEN (oder F) | Countdown 3-2-1 mit Ton, Arme klappen weg, Rauch am Boden, Rakete fliegt senkrecht mit Flamme und Schweif. Kamera folgt. |
| 3 | Flug-Anzeige | während des Flugs | Höhe steigt, Tempo in km/h, Treibstoff-Leiste wird leer, Coins-Schätzung steigt. |
| 4 | Boost | im Flug BOOST antippen | blaue Zusatzflamme, Kamera wackelt, Boost-Leiste wird leer. Zweites Drücken: nichts. |
| 5 | Gipfel + Landung | abwarten | Lichtblitz, Rakete verschwindet, Kapsel am Fallschirm landet neben der Rampe mit Staubring. Belohnungsfenster. Danach steht die Rakete wieder auf der Rampe. |
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
| 18 | Mehrspieler | Test › Clients and Servers, 2–3 Spieler | Jeder hat eine eigene Rampe, sieht die Raketen der anderen. Prompt „Rakete starten“ nur an der eigenen Rampe. |
| 19 | Rangliste | Spielerliste oben rechts / Menü Rangliste | „Rekord (m)“ und „Level“ stimmen. Tafel am Platz zeigt die Top 10 (in Studio oft leer). |
| 20 | Handy | Test › Device › z. B. iPhone 14 | Alle Texte lesbar, nichts abgeschnitten, STARTEN-Knopf gut erreichbar, Fenster passen auf den Bildschirm. |
| 21 | Gamepad | Xbox-Controller | R2 = Start/Boost, Menüs per Steuerkreuz bedienbar, B schließt Fenster. |
| 22 | Server fährt herunter | Clients and Servers, Server stoppen | Ausgabe ohne Fehler; danach sind die Daten gespeichert. |
| 23 | Spam / Manipulation | Befehlsleiste (Client): `game.ReplicatedStorage.Remotes.BuyUpgrade:InvokeServer("Engine")` 50× in einer Schleife | höchstens wenige Käufe, danach „Nicht so schnell!“. `BuyRocket:InvokeServer("gibtsnicht")` → „Unbekannte Rakete“. |
| 24 | Sounds | überall | Klick, Kauf, Countdown, Start, Motor, Gipfel, Landung, Level-Up hörbar? Stumme Sounds in `Config/Sounds.luau` austauschen. |
| 25 | Weniger Effekte | Optionen › Weniger Effekte AN | deutlich weniger Rauch und Funken beim nächsten Flug. |

### Was noch nicht drin ist (folgt in eigenen PRs)

Welten freischalten, Pets & Eggs, Quests, Daily Rewards, Login-Streak, Achievements, Rebirth,
Gamepasses/Developer Products, Musik. Die Datenfelder dafür sind schon im Speicherformat vorhanden.
