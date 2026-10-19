# 🚀 Rocket Simulator X (Roblox, Luau)

Ein Raketen-Simulator für Roblox: Rakete starten, mit echter Physik möglichst hoch fliegen,
Coins, XP und Gems verdienen, Upgrades und 20 verschiedene Raketen kaufen.

Dies ist die **Kernversion** (Schritt 1 von 7, siehe [`docs/ARCHITEKTUR.md`](docs/ARCHITEKTUR.md)).
Welten, Pets, Quests, Rebirth und Monetarisierung folgen als eigene Pull Requests.

---

## Was schon drin ist

| Bereich | Inhalt |
|---|---|
| **Raketen** | 20 Raketen in 7 Typen (Anfänger, Feuer, Eis, Plasma, Alien, Gold, Kosmisch). Jede sieht anders aus (Form, Nase, Flossen, Booster, Ringe, Material, Flammenfarbe) und fliegt anders. |
| **Echter Flug** | Server-Physik mit `VectorForce` und `AlignOrientation`, wie bei echten Raketen: Die Luft wird nach oben dünner (Skalenhöhe 8,5 km), die Rakete wird leichter, je mehr Treibstoff verbrennt, und die Schwerkraft wird oben schwächer. Schub beim Start nur 1,3–1,6 × Gewicht: Die Rakete hebt langsam ab und wird immer schneller. |
| **Startablauf** | Countdown, Halte-Arme klappen weg, Zündung 1,2 s vor dem Abheben (Rakete noch festgehalten), riesige Rauchwolke über dem Boden, Flamme mit heißem Kern und Schockdiamanten. Booster-Raketen sprengen ihre Booster ab, die trudelnd zurückfallen. Im Vakuum wird der Abgasstrahl breit und der Rauch verschwindet. Am Gipfel ein Lichtblitz, dann der Wiedereintritt: Die Kapsel kommt glühend herunter, kurz über dem Boden geht mit Ruck der Fallschirm auf. |
| **Kamera & Himmel** | Flugkamera folgt der Rakete, wackelt beim Start und durch den Luftwiderstand (Max-Q), Sichtfeld wird mit dem Tempo weiter. Dampfkegel und Hitze-Plasma an der Spitze. Der Himmel wird nach der Luftdichte dunkel (in 30 km fast schwarz, Sterne). Zuschauer in der Nähe spüren den Start als Boden-Beben. |
| **Flug-Anzeige** | Höhe, Tempo, Mach, G-Kraft, Luftschicht (Troposphäre … Weltall) und Luftdichte, Belastung, Treibstoff, Boost, Ansagen: Zündung, Max-Q, Booster-Trennung, Brennschluss, Kármán-Linie (100 km), Wiedereintritt, Fallschirm. |
| **Upgrades** | Motor, Treibstofftank, Aerodynamik (Coins), Boost (Gems). Jedes Upgrade zeigt, wie viel höher du danach fliegst. |
| **Wirtschaft** | Coins pro Meter × Raketen-Bonus, XP und Level (Gems bei Level-Up), Rekord-Gems, seltener Fund (3 %). Alles rechnet der Server. |
| **Speichern** | DataStore mit `UpdateAsync`, Session-Sperre, Wiederholungen, Autosave (90 s), Speichern beim Verlassen und Herunterfahren, Versionen + Migration, Reparatur kaputter Daten. Schlägt das Laden fehl, wird **nicht** gespeichert (alte Daten bleiben heil). |
| **Sicherheit** | Jede Anfrage geht durch `RemoteGuard`: Rate-Limit, Typprüfung, Daten geladen?, Fehlerfang. Der Client schickt nie Beträge, Preise oder Höhen. |
| **Multiplayer** | 8 Startrampen (8 Spieler pro Server), jeder Spieler bekommt eine eigene mit Namensschild. Alle sehen alle Raketen. Server-Rangliste (leaderstats) und globale Top 10 (OrderedDataStore, Tafel im Spiel + Menü). |
| **Oberfläche** | Ladebildschirm, Coins/Gems, Level-Leiste, STARTEN/BOOST-Knopf, Flug-Anzeige, Raketen-Shop mit 3D-Vorschau, Upgrade-Menü, Rangliste, Optionen, Belohnungsfenster, Meldungen, Tutorial. Skaliert automatisch für PC, Tablet und Handy. Gamepad: R2 = Start/Boost, B = Fenster schließen. |

---

## Installation in Roblox Studio

### Weg A: fertige Datei öffnen (am einfachsten)

1. Lade **`RocketSimulatorX.rbxlx`** herunter (liegt im Projekt-Ordner `rocket-simulator-x/`
   oder du baust sie selbst, siehe unten).
2. Öffne **Roblox Studio** → **Datei › Öffnen** (File › Open from File) → `RocketSimulatorX.rbxlx` wählen.
3. Drück **Play** (F5). Fertig.

### Weg B: mit Rojo (für Entwickler, Code bleibt mit diesem Ordner verbunden)

1. Rojo installieren: <https://rojo.space/docs/v7/getting-started/installation/> (CLI + Studio-Plugin).
2. In diesem Ordner: `rojo serve`
3. In Studio eine leere Baseplate öffnen → Rojo-Plugin → **Connect**.
4. Alternativ eine Datei bauen: `rojo build default.project.json -o RocketSimulatorX.rbxlx`

### Diese Einstellungen musst du selbst machen

| Einstellung | Wo | Warum |
|---|---|---|
| Spiel veröffentlichen | **Datei › Publish to Roblox** | DataStores (Speichern, globale Rangliste) gibt es nur für veröffentlichte Spiele. |
| **Enable Studio Access to API Services** | **Home › Game Settings › Security** | Ohne das wird in Studio nicht gespeichert. Das Spiel läuft trotzdem und zeigt eine Meldung „Speichern ist aus“. |
| Max. Spieler: **8** | Creator Dashboard › dein Spiel › Places › Server Size | Es gibt 8 Startrampen. Das Spiel lässt sowieso nie mehr als 8 Spieler rein (`ServerLimitService`: der 9. bekommt „Dieser Server ist voll“). Mit Server Size 8 schickt Roblox ihn aber gleich auf einen anderen Server. |

**Du musst keine Parts, Ordner, RemoteEvents oder GUIs von Hand anlegen.** Die Scripts bauen beim Start
automatisch: die Karte (`Workspace.Map`), die Startrampen (`Workspace.LaunchPads`), die Ordner
`Workspace.Flights` und `Workspace.Effects`, alle Remotes (`ReplicatedStorage.Remotes`) und die Oberfläche
(`PlayerGui.RocketSimUI`).

---

## Alle Scripts: Name, Typ, Ort in Studio

| Datei in `src/` | Typ in Studio | Ort in Studio |
|---|---|---|
| `server/Main.server.luau` | **Script** `Main` | ServerScriptService › Server |
| `server/Services/*.luau` (16 Stück) | **ModuleScript** | ServerScriptService › Server › Services |
| `shared/*.luau` (Formulas, RocketBuilder, Remotes, Format, Signal, Types) | **ModuleScript** | ReplicatedStorage › Shared |
| `shared/Config/*.luau` (Rockets, Upgrades, Economy, Flight, Worlds, Sounds) | **ModuleScript** | ReplicatedStorage › Shared › Config |
| `client/Main.client.luau` | **LocalScript** `Main` | StarterPlayer › StarterPlayerScripts › Client |
| `client/Controllers/*.luau` (7 Stück) | **ModuleScript** | StarterPlayer › StarterPlayerScripts › Client › Controllers |
| `client/UI/*.luau` (14 Stück) | **ModuleScript** | StarterPlayer › StarterPlayerScripts › Client › UI |

Die Endung `.server.luau` wird zum Script, `.client.luau` zum LocalScript, alles andere zum ModuleScript.

---

## Werte ändern (ohne Programmieren)

Alle Zahlen stehen an **einem** Ort: `src/shared/Config/`.

- **`Rockets.luau`**: Preis, Schub, Brenndauer, Höchstgeschwindigkeit, Belohnung und Aussehen jeder Rakete.
- **`Upgrades.luau`**: Grundpreis, Preis-Steigerung, Maximalstufe und Wirkung pro Stufe.
- **`Economy.luau`**: Coins/XP pro Meter, Level-Kurve, Gems, Startgeld.
- **`Flight.luau`**: Countdown, Zündung, Boost, Booster-Trennung, Luft (Skalenhöhe), Treibstoffmasse, Kapsel und Fallschirm, Anzahl Rampen, Spielfeldgrenze.
- **`Sounds.luau`**: alle Sounds. Eingetragen sind Sounds, die mit Roblox mitgeliefert werden (`rbxasset://sounds/...`).
  Sie wurden **nicht** in Studio angehört. Ist einer stumm: in der Toolbox einen Sound wählen und dessen
  `rbxassetid://ZAHL` eintragen. Leeres `Id = ""` = Sound wird übersprungen.

Nach einer Änderung an Preisen am besten die Tests laufen lassen (siehe unten): Sie prüfen z. B.,
dass jede Rakete teurer ist als die vorige und dass das Spiel nicht zu schnell durchgespielt ist.

---

## So testest du in Studio

Ausführliche Liste: [`docs/TESTPLAN.md`](docs/TESTPLAN.md). Die wichtigsten Schritte:

1. **Play (F5)**: Ladebildschirm → du stehst neben deiner Rampe (dein Name steht darüber).
2. **STARTEN** drücken (oder F / R2 / Prompt „Rakete starten“ an der Rampe): Countdown 3-2-1, die Arme klappen weg,
   die Rakete fliegt. Rechts siehst du Höhe, Tempo, Treibstoff, Boost.
3. Im Flug **BOOST** drücken: blaue Zusatzflamme, Rakete beschleunigt.
4. Am Gipfel: Lichtblitz → Kapsel landet am Fallschirm → **Belohnungsfenster** mit Höhe, Coins, XP.
5. **Upgrades** öffnen und den Motor kaufen → STARTEN-Knopf zeigt eine höhere erwartete Höhe.
6. **Raketen** öffnen → „Pionier“ für 300 Coins kaufen → sie steht sofort auf deiner Rampe.
7. **Mehrspieler**: Test › Clients and Servers › 2 Spieler › Start. Jeder bekommt eine eigene Rampe und sieht die Rakete des anderen.
8. **Handy**: Test › Device-Emulator (z. B. iPhone) → alle Knöpfe lesbar und erreichbar?

## Automatische Tests (außerhalb von Roblox)

```
lune run tests/run.luau
```

[Lune](https://lune-org.github.io/docs) ist eine Luau-Laufzeit für den Computer. Die Tests prüfen Konfiguration,
Formeln, Wirtschaft (simulierter Spielablauf), Datenreparatur, Migration, Rate-Limit, Zahlenformat und bauen
alle 20 Raketenmodelle mit echten Roblox-Instanzen nach.
