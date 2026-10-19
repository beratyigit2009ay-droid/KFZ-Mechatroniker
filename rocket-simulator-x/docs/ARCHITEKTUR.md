# Rocket Simulator X – Architektur (Phase 1)

Dieses Dokument erklärt, **wie das Spiel aufgebaut ist**: welche Teile es gibt, wer was entscheidet,
welche Daten gespeichert werden und was bei einem Raketenstart genau passiert.
Es ist der Bauplan für alle weiteren Schritte.

---

## 1. Grundidee in einem Satz

Du stehst auf deiner eigenen Startrampe, drückst **STARTEN**, deine Rakete fliegt mit echter Roblox-Physik
in den Himmel, und je höher sie kommt, desto mehr **Coins, XP und Gems** bekommst du.
Damit kaufst du **Upgrades** und **bessere Raketen** und fliegst noch höher.

## 2. Die wichtigste Regel: Der Server entscheidet

In Roblox gibt es zwei Seiten:

| Seite | Was ist das? | Was darf sie? |
|---|---|---|
| **Server** | Der Computer von Roblox, auf dem das Spiel für alle läuft | Alles Wichtige: Coins, Gems, Käufe, Upgrades, Flugphysik, Belohnungen, Speichern |
| **Client** | Der Computer/das Handy des Spielers | Nur Anzeige: Menüs, Kamera, Sounds, Effekte. Er darf den Server nur **bitten** |

Ein Hacker kann den Client verändern. Deshalb fragt der Client nur höflich („Ich möchte Rakete X kaufen"),
und der Server prüft alles selbst: Gibt es die Rakete? Hat der Spieler genug Coins? Kam die Anfrage zu oft?
**Der Client schickt niemals Beträge, Preise oder Flughöhen.**

## 3. Ordnerstruktur (Rojo-Format)

```
rocket-simulator-x/
├── default.project.json        Rojo-Bauplan: welcher Ordner wohin in Roblox Studio kommt
├── README.md                   Installation und Test in Studio
├── docs/
│   ├── ARCHITEKTUR.md          dieses Dokument
│   └── TESTPLAN.md             Testabläufe: was automatisch geprüft wurde, was du in Studio testest
├── tests/                      automatische Tests (laufen mit "lune", außerhalb von Roblox)
└── src/
    ├── shared/   → ReplicatedStorage.Shared       (Server UND Client)
    │   ├── Config/                                 ALLE Zahlen des Spiels an einem Ort
    │   │   ├── Rockets.luau        20 Raketen: Werte, Preise, Aussehen
    │   │   ├── Upgrades.luau       Motor, Treibstoff, Aerodynamik, Boost
    │   │   ├── Economy.luau        Belohnungen, Level, XP, Gems
    │   │   ├── Flight.luau         Physik-Konstanten, Countdown, Landung
    │   │   ├── Worlds.luau         10 Welten (Daten schon fertig, Spielsystem folgt in eigenem PR)
    │   │   └── Sounds.luau         austauschbare Sound-Liste
    │   ├── Formulas.luau           reine Rechenfunktionen (Kosten, Werte, Belohnung, Level)
    │   ├── RocketBuilder.luau      baut aus den Config-Daten ein Raketenmodell aus Parts
    │   ├── Remotes.luau            erzeugt/holt alle RemoteEvents und RemoteFunctions
    │   ├── Format.luau             Zahlen kurz anzeigen (1.2K, 3.4M, 5B)
    │   └── Types.luau              Datentypen (z. B. wie die Spielerdaten aussehen)
    ├── server/   → ServerScriptService.Server
    │   ├── Main.server.luau        startet alle Services in der richtigen Reihenfolge
    │   └── Services/
    │       ├── DataSchema.luau         Standardwerte, Versionen, Migration, Reparatur kaputter Daten
    │       ├── PlayerDataService.luau  Laden/Speichern mit DataStore, Session-Sperre, Autosave
    │       ├── RemoteGuard.luau        Schutz für alle Remotes: Rate-Limit, Typprüfung, Fehlerfang
    │       ├── RateLimiter.luau        Token-Bucket gegen Spam
    │       ├── Notifier.luau           schickt Meldungen an Spieler
    │       ├── EconomyService.luau     Coins, Gems, XP, Level-Ups (nur hier ändern sich Währungen)
    │       ├── RocketService.luau      Raketen kaufen und ausrüsten
    │       ├── UpgradeService.luau     Upgrades kaufen
    │       ├── TutorialService.luau    kleines Einsteiger-Tutorial
    │       ├── SettingsService.luau    Einstellungen speichern
    │       ├── MapService.luau         baut die Startbasis (Boden, Deko, Startrampen, Tafel)
    │       ├── PadService.luau         verteilt Startrampen, zeigt die Rakete jedes Spielers
    │       ├── FlightService.luau      Zustandsmaschine + Physik jedes Fluges
    │       ├── EffectsService.luau     Explosion, Staubring, Funken (kurzlebig, begrenzt)
    │       └── LeaderboardService.luau leaderstats + globale Bestenliste
    └── client/   → StarterPlayer.StarterPlayerScripts.Client
        ├── Main.client.luau        startet alle Controller
        ├── Controllers/
        │   ├── DataController.luau     hält die letzte Datenkopie vom Server
        │   ├── FlightController.luau   Flugkamera, Kamerawackeln, Flug-Infos
        │   ├── SkyController.luau      Himmel wird beim Steigen dunkel (Weltall)
        │   ├── SoundController.luau    spielt Sounds aus Config/Sounds
        │   ├── SettingsController.luau Lautstärke und "Weniger Effekte" anwenden
        │   ├── PadController.luau      Start-Prompt nur an der eigenen Rampe zeigen
        │   └── InputController.luau    Tastatur (F) und Gamepad (R2) für Start/Boost
        └── UI/
            ├── Theme.luau          Farben, Schriften, Größen (Dunkelblau, Violett, Cyan, Gold)
            ├── Components.luau     wiederverwendbare Bausteine: Panel, Button, Leiste, Fenster
            ├── Context.luau        was jedes UI-Modul vom UIController bekommt
            ├── UIController.luau   baut die Oberfläche, skaliert für PC/Tablet/Handy
            ├── Hud.luau            Coins, Gems, Level-Leiste, Menü-Knöpfe, STARTEN-Knopf
            ├── FlightHud.luau      Höhe, Tempo, Treibstoff, Boost, Countdown
            ├── ShopPanel.luau      Raketen-Shop mit 3D-Vorschau
            ├── UpgradePanel.luau   Upgrade-Menü
            ├── LeaderboardPanel.luau Bestenliste
            ├── SettingsPanel.luau  Einstellungen
            ├── ResultWindow.luau   Belohnungsfenster nach der Landung
            ├── Notifications.luau  kleine Meldungen oben
            ├── Tutorial.luau       Hinweise für Einsteiger
            └── LoadingScreen.luau  Ladebildschirm
```

**Was wird automatisch erstellt?** Fast alles: Die Karte, die Startrampen, die Raketenmodelle,
alle RemoteEvents, die Oberfläche und die Effekte werden beim Start von den Scripts gebaut.
Du musst in Studio **keine Parts, Ordner oder Remotes von Hand anlegen.**
So kann nichts „vergessen" werden und der Code ist die einzige Wahrheit.

Wie diese Struktur zu den Vorschlägen aus dem Auftrag passt:

| Vorschlag | Hier |
|---|---|
| ReplicatedStorage › Remotes | wird von `Remotes.luau` beim Start erzeugt |
| ReplicatedStorage › Shared/Config | `src/shared` und `src/shared/Config` |
| ServerScriptService › Services/Data | `src/server/Services` |
| ServerStorage › RocketModels | nicht nötig: `RocketBuilder` baut Modelle aus Daten (keine doppelten Werte) |
| StarterGui › MainUI | wird von `UIController` in die PlayerGui gebaut (`ResetOnSpawn = false`) |
| Workspace › Map/LaunchPads | wird von `MapService`/`PadService` gebaut |

## 4. Die Systeme und wer wen benutzt

```
Main.server
 ├─ PlayerDataService ──► DataSchema           (laden, reparieren, speichern)
 ├─ EconomyService    ──► PlayerDataService    (Coins/Gems/XP ändern)
 ├─ RocketService     ──► Economy, Formulas, PadService
 ├─ UpgradeService    ──► Economy, Formulas
 ├─ MapService                                  (Welt bauen)
 ├─ PadService        ──► MapService, RocketBuilder
 ├─ FlightService     ──► PadService, Economy, Formulas, EffectsService, LeaderboardService
 ├─ LeaderboardService──► PlayerDataService
 └─ RemoteGuard       ──► RateLimiter, PlayerDataService (jede Anfrage geht hier durch)
```

Regel: Ein Service ruft nur Services auf, die **vor** ihm gestartet wurden. So gibt es keine Kreise.

## 5. Datenmodell (was gespeichert wird)

Ein Spieler wird im DataStore `RocketSimX_PlayerData` unter dem Schlüssel `Player_<UserId>` gespeichert.

```lua
{
    Version = 1,                 -- Daten-Version für spätere Umbauten (Migration)
    Coins = 0, Gems = 0,
    XP = 0, Level = 1,
    BestAltitude = 0,            -- Rekordhöhe in Metern
    TotalLaunches = 0,
    TotalCoinsEarned = 0,
    EquippedRocket = "funke",
    OwnedRockets = { funke = true },
    Upgrades = { Engine = 0, Fuel = 0, Aero = 0, Boost = 0 },
    UnlockedWorlds = { earth = true }, CurrentWorld = "earth",   -- vorbereitet
    Rebirths = 0,                                                 -- vorbereitet
    Pets = {}, EquippedPets = {},                                 -- vorbereitet
    Quests = {}, Achievements = {},                               -- vorbereitet
    Daily = { LastClaim = 0, Streak = 0 },                        -- vorbereitet
    Settings = { SfxVolume = 0.8, CameraShake = true, ReducedEffects = false },
    Tutorial = { Step = 0 },
    Meta = { CreatedAt = 0, LastSaved = 0, SaveCount = 0,
             Lock = { JobId = "", Time = 0 } },                   -- Session-Sperre
}
```

**Sicherheit beim Speichern** (`PlayerDataService`):

1. **Laden mit `UpdateAsync`** und Session-Sperre: Ist der Spieler noch auf einem anderen Server aktiv,
   wird gewartet und erneut versucht. So können zwei Server die Daten nicht gegenseitig überschreiben.
2. **Wiederholen mit Pause** (1 s, 2 s, 4 s …), wenn Roblox kurz Probleme hat.
3. **Laden fehlgeschlagen?** Der Spieler bekommt eine Meldung und eine **Ersatz-Sitzung**.
   Diese wird **niemals gespeichert**, damit alte echte Daten nicht überschrieben werden.
4. **Reparatur:** Fehlende oder kaputte Werte (z. B. Text statt Zahl, negative Coins, unbekannte Rakete)
   werden durch sichere Standardwerte ersetzt.
5. **Migration:** Jede Daten-Version hat eine Umbau-Funktion (`Migrations[1] = function(data) … end`).
6. **Speichern** alle 90 Sekunden (nur wenn sich etwas geändert hat), beim Verlassen und beim Herunterfahren
   des Servers (`game:BindToClose`). Vorher wird das DataStore-Budget geprüft.

## 6. Remote-Schnittstellen (Client ↔ Server)

Alle Remotes liegen in `ReplicatedStorage.Remotes` und werden von `Shared/Remotes.luau` erzeugt.

| Name | Art | Richtung | Daten | Prüfung auf dem Server |
|---|---|---|---|---|
| `GetData` | RemoteFunction | Client → Server | – | Daten geladen? max. 2/s |
| `BuyRocket` | RemoteFunction | Client → Server | `rocketId: string` | existiert? schon gekauft? genug Geld? 4/s |
| `EquipRocket` | RemoteFunction | Client → Server | `rocketId: string` | gekauft? nicht im Flug? 4/s |
| `BuyUpgrade` | RemoteFunction | Client → Server | `upgradeId: string` | existiert? Max-Stufe? genug Coins? 6/s |
| `RequestLaunch` | RemoteEvent | Client → Server | – | Rampe vorhanden? nicht schon im Flug? Abklingzeit? 2/s |
| `RequestBoost` | RemoteEvent | Client → Server | – | im Steigflug? Boost übrig? 3/s |
| `UpdateSetting` | RemoteEvent | Client → Server | `key: string, value: any` | erlaubter Schlüssel? richtiger Typ/Bereich? 5/s |
| `TutorialAdvance` | RemoteEvent | Client → Server | `step: number` | nur erlaubter nächster Schritt |
| `DataUpdate` | RemoteEvent | Server → Client | Kopie der Spielerdaten | – |
| `FlightEvent` | RemoteEvent | Server → Client | `{Type, ...}` (Countdown, Liftoff, Apex, Landed …) | – |
| `Notify` | RemoteEvent | Server → Client | `{Text, Kind}` | – |
| `LeaderboardUpdate` | RemoteEvent | Server → Client | Top-10-Liste | – |

`RemoteGuard` macht für **jede** Client-Anfrage dasselbe: Rate-Limit prüfen → Datentypen prüfen →
Daten geladen? → Handler in `pcall` ausführen → bei Fehler eine harmlose Antwort zurück.

## 7. Ablauf eines Raketenstarts

```
Spieler drückt STARTEN (Knopf, Taste F, Gamepad R2 oder ProximityPrompt an der Rampe)
   │
   ▼  RequestLaunch  (keine Daten!)
Server: FlightService.tryLaunch(player)
   ├─ Zustand muss "Idle" sein  → sonst ignorieren (verhindert Doppelstarts)
   ├─ Werte berechnen: Formulas.getFlightStats(Rakete, Upgrades)
   ├─ Zustand = "Countdown" (3 s): Halte-Arme fahren weg,                  FlightEvent{Countdown}
   │     • 1,2 s vor dem Abheben: Zündung, Rakete noch festgehalten,       FlightEvent{Ignition}
   │       riesige Rauchwolke wälzt sich über den Boden
   ├─ Flugmodell bauen, Physik einschalten:
   │     • Anker lösen, alle Parts verschweißt, CanCollide aus
   │     • SetNetworkOwner(nil)  → der SERVER rechnet die Physik, kein Client kann schummeln
   │     • VectorForce = Schub − Luftwiderstand (jede Physik-Runde neu berechnet)
   │     • echte Physik: Luftdichte e^(−Höhe/8,5 km), Rakete wird leichter (Treibstoff),
   │       Schwerkraft wird mit der Höhe schwächer
   │     • AlignOrientation hält die Rakete senkrecht
   ├─ Zustand = "Burn": Treibstoff wird verbraucht, Flammen, Funken, Licht   FlightEvent{Liftoff}
   │     (Boost-Knopf: kurzzeitig mehr Schub, solange Boost übrig ist)
   │     • nach 45 % der Brenndauer: Booster werden abgesprengt und fallen   FlightEvent{Staging}
   │     • Abgasstrahl wird in dünner Luft breiter, Rauch verschwindet im Vakuum
   ├─ Zustand = "Coast": Treibstoff leer, Rakete steigt weiter und wird langsamer
   ├─ Zustand = "Apex": höchster Punkt (Geschwindigkeit nach oben ≤ 0)
   │     • Server misst die Höhe selbst und berechnet die Belohnung
   │     • EconomyService gibt Coins, XP, evtl. Gems (genau einmal pro Flug-ID)
   │     • Rakete zerfällt in einem Lichtblitz, die Kapsel kehrt zurück   FlightEvent{Apex}
   ├─ Zustand = "Descent": Wiedereintritt: Kapsel fällt glühend und schnell,
   │     in 170 Studs Höhe geht der Fallschirm auf                         FlightEvent{Parachute}
   ├─ Zustand = "Landed": Staubring, Belohnungsfenster                    FlightEvent{Landed, Ergebnis}
   └─ Zustand = "Cooldown" (2 s) → "Idle": Rakete steht wieder auf der Rampe
```

Der Client macht in dieser Zeit nur Anzeige: Countdown, Flugkamera, Höhe/Tempo/Mach/G-Kraft/Luftschicht,
Missions-Ansagen (Zündung, Max-Q, Booster-Trennung, Kármán-Linie, Wiedereintritt, Fallschirm),
Rütteln durch Luftwiderstand, Dampfkegel und Hitze-Plasma an der Spitze, dunkler werdender Himmel
(nach Luftdichte), Motorengeräusch, am Ende das Belohnungsfenster. Zuschauer in der Nähe spüren den
Start als Boden-Beben.

**Warum hört der Flug am höchsten Punkt auf?** Eine Rakete, die aus 15 km Höhe zurückfällt,
würde minutenlang fallen. Deshalb kehrt nach dem Gipfel nur die Kapsel mit Fallschirm zur Rampe zurück.
Der Flug selbst ist echte Physik.

## 8. Wirtschaft (Grundregeln)

- **Coins** pro Flug = Höhe in Metern × `CoinsPerMeter` × Raketen-Bonus (später × Welt × Rebirth × Pets).
- **XP** pro Flug = Höhe ÷ 20. Level-Kurve: `XP für nächstes Level = 60 × Level^1.45`.
- **Gems**: bei jedem Level-Up, bei neuem Höhenrekord und als seltener Fund (3 %).
- **Raketenpreise** steigen pro Rakete etwa um das 2-Fache, die Belohnung pro Rakete um das 1,55-Fache.
  So braucht jede neue Rakete einige Flüge plus ein paar Upgrades.
- **Upgrade-Kosten** = `Grundpreis × Faktor^Stufe`, jedes Upgrade hat eine Maximalstufe.

Alle Zahlen stehen nur in `src/shared/Config`. Es gibt keine doppelten Werte.

## 9. Umsetzungsplan (in kleinen Schritten)

| Schritt | Inhalt | Status |
|---|---|---|
| **1. Kernversion** (dieser PR) | Architektur, Projektstruktur, Speichern, Raketen (20), Shop, Upgrades, echter Flug, Belohnungen, Level, Bestenliste, UI, Effekte, Tutorial, Tests | fertig, in Studio zu testen |
| 2. Welten | 10 Welten freischalten, eigene Schwerkraft, Himmel, Belohnungen, Geheimnisse | geplant |
| 3. Pets & Eggs | 30+ Pets, 7 Seltenheiten, Eggs, Schlüpf-Animation, Shiny, Fusion | geplant |
| 4. Quests & Daily | tägliche/wöchentliche Quests, Daily Rewards, Login-Streak, Spielzeit-Belohnungen, Erfolge | geplant |
| 5. Rebirth | Wiedergeburt mit Multiplikator | geplant |
| 6. Monetarisierung | Gamepasses, Developer Products mit sicherem `ProcessReceipt` | geplant |
| 7. Feinschliff | Sounds, Musik, Profil, Raketen vergleichen, Performance-Messung | geplant |

Die Datenfelder für Schritt 2–6 sind schon im Datenmodell vorhanden, damit später keine Migration nötig ist.
