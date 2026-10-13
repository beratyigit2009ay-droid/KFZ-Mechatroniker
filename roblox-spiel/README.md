# Raketen-Krieg (Roblox-Spiel)

Ein Roblox-Spiel in Luau: Bis zu 4 Spieler pro Server bekommen jeweils eine eigene Stadt.
Man verdient Geld, baut Häuser, Fabriken und Flugabwehr und schießt Raketen auf die anderen Städte.

## Was schon drin ist (Grundversion)

- **4 Städte pro Server** (rot, blau, grün, gelb). Wer als 5. Spieler kommt, schaut nur zu.
- **Geld**: Start mit 500 $, alle 5 Sekunden gibt es Einkommen. Häuser und Fabriken bringen mehr.
- **Shop** (links): Haus, Fabrik, Flugabwehr, Kurzstrecken-Rakete, Schwere Rakete.
- **Angriff** (rechts): Rakete wählen, Ziel-Stadt wählen, **FEUER!**
- **Raketen** sehen aus wie echte Raketen (Spitze, Ring, Flossen, Düse) und haben beim Start und im Flug
  **Feuer, Licht, eine Rauchspur und Sound**. Sie starten senkrecht und fliegen dann im Bogen.
- **Flugabwehr** schießt Abfangraketen auf anfliegende Raketen (60 % Trefferchance).
- **Sirenen**: Wird deine Stadt angegriffen, heult der Sirenenmast in der Stadt (mit rotem Blinklicht),
  du hörst die Sirene im Kopfhörer und oben erscheint ein roter **LUFTALARM**-Balken.
- **Einschlag**: Explosion, Feuerball, Rauchwolke. Gebäude bekommen Schaden, fangen an zu brennen
  und fallen auseinander, wenn sie zerstört sind. Der Angreifer bekommt dafür Geld.

## Ordner

```
roblox-spiel/
  default.project.json   -> sagt Rojo, wo welcher Ordner in Roblox landet
  src/shared/            -> ReplicatedStorage.Shared (Server UND Client)
    Config.lua           -> ALLE Einstellungen: Preise, Schaden, Sounds ...
    Sirene.lua           -> spielt die Sirene ab
  src/server/            -> ServerScriptService.Server (nur Server)
    Main.server.lua      -> Startpunkt, verbindet alles
    StadtManager.lua     -> Städte, Besitzer, Bauen, Schaden, Einkommen
    Shop.lua             -> Kaufen (der Server prüft das Geld)
    Raketen.lua          -> Abschuss, Flug, Abfangen, Explosion
    Modelle.lua          -> baut Städte, Gebäude und Raketen aus Parts
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

**Allein testen (Shop, Bauen, Abschießen):**
1. Oben auf **Play** (F5) drücken. Du landest in deiner Stadt.
2. Links im Shop ein paar **Häuser** kaufen: sie erscheinen in deiner Stadt, dein Geld geht runter.
3. Eine **Kurzstrecken-Rakete** kaufen.
4. Rechts die Rakete anklicken, eine andere Stadt (z. B. "Stadt 2: leer") anklicken und **FEUER!** drücken.
5. Auf der Startrampe deiner Stadt zündet die Rakete (Feuer, Rauch, Geräusch) und fliegt los.
   In der Zielstadt heult der Sirenenmast und blinkt rot.

**Mit mehreren Spielern testen (Sirene im Kopfhörer, Flugabwehr, Treffer):**
1. Tab **Test** -> bei "Clients and Servers" **2 Players** einstellen -> **Start**.
2. Es öffnen sich 3 Fenster: der Server und zwei Spieler.
3. Spieler 2 kauft eine **Flugabwehr** und ein paar Häuser.
4. Spieler 1 kauft Raketen und schießt auf die Stadt von Spieler 2.
5. Bei Spieler 2 erscheint **LUFTALARM**, die Sirene heult, die Flugabwehr schießt.
   Trifft die Rakete, brennen die Gebäude oder fallen auseinander, und Spieler 1 bekommt Geld.

## Eigene Sounds einsetzen

In `src/shared/Config.lua` unter `Config.Sounds`:
- Sound in der Studio-Toolbox suchen (z. B. "air raid siren", "missile launch").
- Rechtsklick -> **Copy Asset ID**.
- Eintragen als `"rbxassetid://DIE_ZAHL"`.

Solange bei `Sirene` nichts eingetragen ist, gibt es eine Ersatz-Sirene aus Pieptönen.

## Nur 4 Spieler pro Server

Das Script vergibt nur 4 Städte. Damit gar nicht erst mehr Leute in einen Server kommen:
Im Creator Hub beim Spiel unter **Places -> Server-Größe (Max Players)** den Wert **4** eintragen.
