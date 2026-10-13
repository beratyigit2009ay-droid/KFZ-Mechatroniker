# Raketen-Krieg (Roblox-Spiel)

Ein Roblox-Spiel in Luau: Bis zu 4 Spieler pro Server bekommen jeweils eine eigene Stadt.
Man verdient Geld, baut Häuser, Fabriken und Flugabwehr und schießt Raketen auf die anderen Städte.

## Was schon drin ist

- **4 Städte pro Server** (rot, blau, grün, gelb). Wer als 5. Spieler kommt, schaut nur zu.
- **Laufen**: Jeder Spieler hat seine normale Roblox-Figur und läuft mit WASD durch seine Stadt.
- **Bauen** (Shop, Reiter "Bauen"): Haus, Hochhaus, Fabrik, Kraftwerk, Flugabwehr, Panzerabwehr.
  - Häuser und Hochhäuser bringen **Bewohner**. Die stehen als kleine Figuren vor ihrem Haus und zahlen Steuern.
  - **Kraftwerke** machen Strom. Ohne genug Strom gibt es **Stromausfall** und nur das halbe Einkommen.
- **Waffen** (Shop, Reiter "Waffen"): 4 Raketen, je stärker desto teurer
  (Kurzstrecke 100 $, Mittelstrecke 200 $, Schwer 400 $, Mega 1000 $), dazu **Panzer** und **Kampfjets**.
- **Angriff** (rechts): Waffe wählen, mit **- / +** einstellen **wie viele**, Ziel-Stadt wählen,
  dann z. B. **"3x Panzer schicken!"** drücken.
  - **Raketen** zünden mit Feuer, Licht, Rauch und Sound, starten senkrecht und fliegen im Bogen.
    Stärkere Raketen sind schwerer abzufangen.
  - **Panzer** fahren über den Boden zur Zielstadt, schießen auf Gebäude und fahren zurück.
  - **Jets** fliegen über die Stadt und werfen Bomben ab.
  - Was überlebt, kommt zurück in dein Lager.
- **Abwehr**: Die Flugabwehr schießt auf Raketen und Jets, die Panzerabwehr auf Panzer.
- **Sirenen**: Wird deine Stadt angegriffen, heult der Sirenenmast (mit rotem Blinklicht),
  du hörst die Sirene und oben steht **LUFTALARM** oder **PANZER-ALARM**.
- **Einschlag**: Explosion, Feuerball, Rauchwolke. Gebäude brennen und fallen auseinander.
  Der Angreifer bekommt Geld für jedes zerstörte Gebäude.

## Ordner

```
roblox-spiel/
  default.project.json   -> sagt Rojo, wo welcher Ordner in Roblox landet
  src/shared/            -> ReplicatedStorage.Shared (Server UND Client)
    Config.lua           -> ALLE Einstellungen: Preise, Schaden, Sounds ...
    Sirene.lua           -> spielt die Sirene ab
  src/server/            -> ServerScriptService.Server (nur Server)
    Main.server.lua      -> Startpunkt, verbindet alles
    Funk.lua             -> Remotes (Verbindung Server <-> Spieler)
    StadtManager.lua     -> Städte, Besitzer, Bauen, Bewohner, Strom, Schaden, Einkommen
    Shop.lua             -> Kaufen (der Server prüft das Geld)
    Angriff.lua          -> prüft einen Angriff und schickt die Waffen los
    Raketen.lua          -> Flug, Abfangen und Einschlag von Raketen
    Einheiten.lua        -> Panzer und Kampfjets
    Effekte.lua          -> Explosionen, Rauch, Schüsse, Abfangraketen
    Modelle.lua          -> baut Städte, Gebäude, Bewohner, Raketen, Panzer und Jets aus Parts
  src/client/            -> StarterPlayerScripts.Client (nur beim Spieler)
    Hud.client.lua       -> Bedienoberfläche (Shop, Angriff, Geld)
    Alarm.client.lua     -> Luftalarm-Anzeige und Sirene im Kopfhörer
```

## So bekommst du das Spiel in Roblox Studio

### Weg A: Rojo (empfohlen, bleibt automatisch synchron)

1. Rojo installieren: https://rojo.space/docs/v7/getting-started/installation/
   (das Roblox-Studio-Plugin **und** das Programm `rojo`, z. B. über die VS-Code-Erweiterung "Rojo").
2. Im Ordner `roblox-spiel` ein Terminal öffnen und starten:
   ```
   rojo serve
   ```
3. Roblox Studio öffnen, eine neue **Baseplate** anlegen.
4. Oben im Tab **Plugins** auf **Rojo** klicken und **Connect** drücken.
   Jetzt erscheinen die Scripts in Studio. Jede Änderung an den Dateien landet sofort in Studio.

### Weg B: Fertige Datei bauen

```
rojo build -o RaketenKrieg.rbxlx
```
Dann die Datei `RaketenKrieg.rbxlx` per Doppelklick in Roblox Studio öffnen.

## So testest du es in Studio

**Allein testen (Bauen, Strom, Angreifen):**
1. Oben auf **Play** (F5) drücken. Du landest in deiner Stadt und kannst mit WASD laufen.
2. Links im Shop (Reiter **Bauen**) ein paar **Häuser** kaufen. Vor jedem Haus stehen 2 Bewohner,
   oben links steigt die Zahl der Bewohner.
3. Weiter Häuser bauen, bis oben **STROMAUSFALL** steht. Dann ein **Kraftwerk** bauen: der Strom reicht wieder.
4. Reiter **Waffen**: 2 Panzer und eine Kurzstrecken-Rakete kaufen.
5. Rechts **Panzer** wählen, mit **+** auf 2 stellen, "Stadt 2: leer" wählen und **"2x Panzer schicken!"** drücken.
   Die Panzer fahren los, schießen und kommen zurück (danach steht wieder "2 im Lager").
6. Dasselbe mit der Rakete: auf der Startrampe zündet sie mit Feuer, Rauch und Geräusch.
   In der Zielstadt heult der Sirenenmast und blinkt rot.

**Mit mehreren Spielern testen (Sirene im Kopfhörer, Flugabwehr, Treffer):**
1. Tab **Test** -> bei "Clients and Servers" **2 Players** einstellen -> **Start**.
2. Es öffnen sich 3 Fenster: der Server und zwei Spieler.
3. Spieler 2 baut ein paar Häuser, eine **Flugabwehr** und eine **Panzerabwehr**.
4. Spieler 1 kauft Raketen, Panzer und einen Jet und greift Spieler 2 an.
5. Bei Spieler 2 erscheint **LUFTALARM** oder **PANZER-ALARM**, die Sirene heult, die Abwehr schießt.
   Was durchkommt, lässt Gebäude brennen oder auseinanderfallen, und Spieler 1 bekommt Geld.

## Eigene Sounds einsetzen

In `src/shared/Config.lua` unter `Config.Sounds`:
- Sound in der Studio-Toolbox suchen (z. B. "air raid siren", "missile launch").
- Rechtsklick -> **Copy Asset ID**.
- Eintragen als `"rbxassetid://DIE_ZAHL"`.

Solange bei `Sirene` nichts eingetragen ist, gibt es eine Ersatz-Sirene aus Pieptönen.

## Nur 4 Spieler pro Server

Das Script vergibt nur 4 Städte. Damit gar nicht erst mehr Leute in einen Server kommen:
Im Creator Hub beim Spiel unter **Places -> Server-Größe (Max Players)** den Wert **4** eintragen.
