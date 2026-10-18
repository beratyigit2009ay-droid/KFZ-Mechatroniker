# Raketen-Krieg (Roblox-Spiel)

Ein Roblox-Spiel in Luau: Bis zu 4 Spieler pro Server bekommen jeweils eine eigene Stadt.
Man verdient Geld, baut Häuser, Fabriken und Flugabwehr und schießt Raketen auf die anderen Städte.

## Gemacht fürs Handy

- **Große Touch-Knöpfe** rechts: **BAUEN**, **WAFFEN**, **ANGRIFF** und **KARTE**. Sie sitzen über dem
  Springen-Knopf, damit nichts im Weg ist. Laufen geht mit dem normalen Roblox-Joystick links.
- Tippst du einen Knopf an, öffnet sich ein **großes Fenster mit Karten**: Bild, Name, was es bringt,
  Preis. Grün = du hast genug Geld, einfach antippen.
- **Angriff** in 3 Schritten auf einer Seite: Waffe antippen, mit **− / +** die Anzahl wählen,
  Ziel-Stadt antippen, großer roter Knopf **"3x ABFEUERN!"**. Danach geht das Fenster zu, damit du den Start siehst.
- **KARTE**: Die Kamera fliegt hoch über alle 4 Städte. Mit einem Finger wischen = drehen, mit zwei Fingern = zoomen.
- Alles passt sich der Bildschirmgröße an (Handy, Tablet, PC). Das Spiel läuft im Querformat.

## Grafik

- **Landschaft**: Gras, Berge mit Schnee rundherum, zwei Seen mit Strand, Wälder, echte Wolken.
- **Straßen** mit Mittellinie und Laternen verbinden die Städte, in der Mitte ein Kreisel.
  Daneben steht ein **Raketen-Denkmal** mit den Fahnen der 4 Städte.
- **Tag und Nacht**: 9 Minuten Tag, 3 Minuten Nacht. Nachts leuchten Fenster und Laternen
  (in `Config.lua` bei `TAG_UND_NACHT` abschaltbar).
- **Licht**: "Future"-Beleuchtung mit Schatten, Dunst, Leuchten (Bloom), Sonnenstrahlen und kräftigeren Farben.
- **Explosionen**: Lichtblitz, Feuerball, Druckwelle, Funken, wegfliegende Trümmer, Rauch und ein Brandfleck am Boden.
  Die Kamera **wackelt**, wenn es in deiner Nähe knallt.
- **Raketen** ziehen einen weißen Kondensstreifen hinter sich her.
- Beschädigte Gebäude zeigen einen **Lebensbalken** (grün, gelb, rot).

## Spielgefühl

- **Bauen**: Neue Gebäude wachsen mit einer Staubwolke und einem Geräusch aus dem Boden und federn oben nach.
- **Geld fliegt**: Bei jeder Auszahlung steigt über Fabrik, Büro, Einkaufszentrum und Bank ein goldenes **"+20 $"** auf,
  über der Stadt grün die **Steuern**. Oben links zählt das Geld sichtbar hoch und hüpft kurz.
- **Stadt-Stufen**: Dorf → Kleinstadt → Stadt → Großstadt → Metropole → Mega-City.
  Oben links steht deine Stufe und wie viele Bewohner bis zur nächsten fehlen (z. B. ⭐ Dorf 👥 20/30).
  Bei einer neuen Stufe gibt es ein **Banner mit Konfetti**, einen Jubel-Ton und **Bonus-Geld**.
- **Einschlag-Warnung**: Wo eine Rakete gleich einschlägt, pulsiert ein **roter Kreis** am Boden
  (so groß wie die Explosion) mit einem Countdown darüber. So kannst du noch weglaufen.
- **Rangliste**: In der Spielerliste steht neben dem Geld, wie viele gegnerische Gebäude du **zerstört** hast.
- Alle Knöpfe **klicken** beim Antippen, ein erfolgreicher Kauf macht "Pling".
- **Leicht für Anfänger**: 1500 $ Startgeld und mehr Grundeinkommen. Beim Bauen zeigt ein gelbes **"👍 TIPP"**,
  was du als Nächstes bauen solltest (z. B. Kraftwerk, wenn der Strom knapp wird).
  Beim Öffnen von **ANGRIFF** sind schon eine Waffe, die du hast, und eine gegnerische Stadt gewählt:
  oft reicht ein Tipp auf den roten Knopf.

## Was schon drin ist

- **4 Städte pro Server** (rot, blau, grün, gelb). Wer als 5. Spieler kommt, schaut nur zu.
- **Laufen**: Jeder Spieler hat seine normale Roblox-Figur und läuft mit dem Joystick (am PC mit WASD) durch seine Stadt.
  Spieler sind **Kommandanten**: Helm, Weste in der Farbe ihrer Stadt, leuchtender Umriss und
  ein Namensschild. So sieht man sofort, wer Spieler und wer Bewohner ist.
- **Bauen** (Knopf "BAUEN"): Haus, Hochhaus, Fabrik, Bürogebäude, Einkaufszentrum, Bank,
  Kraftwerk, Flugabwehr, Panzerabwehr. Häuser haben Garten, Fenster, Schornstein und Büsche.
  - **Bürogebäude** (+20 $), **Einkaufszentrum** (+35 $) und **Bank** (+60 $) bringen viel Geld, brauchen aber Strom.
  - Häuser und Hochhäuser bringen **Bewohner**. Die stehen als kleine Figuren vor ihrem Haus und zahlen Steuern.
  - **Kraftwerke** machen Strom. Ohne genug Strom gibt es **Stromausfall** und nur das halbe Einkommen.
- **Waffen** (Knopf "WAFFEN"): 4 Raketen, je stärker desto teurer
  (Kurzstrecke 100 $, Mittelstrecke 200 $, Schwer 400 $, Mega 1000 $), dazu **Panzer** und **Kampfjets**.
- **Angriff** (Knopf "ANGRIFF"): Waffe wählen, mit **− / +** einstellen **wie viele**, Ziel-Stadt wählen,
  dann z. B. **"3x LOSSCHICKEN!"** drücken.
  - **Raketen** zünden mit Feuer, Licht, Rauch und Sound, starten senkrecht und fliegen im Bogen.
    Stärkere Raketen sind schwerer abzufangen.
  - **Panzer** fahren über den Boden zur Zielstadt, schießen auf Gebäude und fahren zurück.
  - **Jets** fliegen über die Stadt und werfen Bomben ab.
  - Was überlebt, kommt zurück in dein Lager.
- **Abwehr**: Die Flugabwehr schießt auf Raketen und Jets, die Panzerabwehr auf Panzer.
- **Sirenen**: Wird deine Stadt angegriffen, heult der Sirenenmast (mit rotem Blinklicht),
  du hörst die Sirene und oben steht **LUFTALARM** oder **PANZER-ALARM**.
- **Einschlag**: Explosion, Feuerball, Rauchwolke. Gebäude brennen und fallen auseinander.
  Der Angreifer bekommt den **ganzen Preis** jedes zerstörten Gebäudes, am Ziel steigt groß **"💥 +250 $"** auf.
  Schießt deine Abwehr eine Rakete, einen Jet oder Panzer ab, bekommst du die Hälfte von deren Preis.

## Ordner

```
roblox-spiel/
  default.project.json   -> sagt Rojo, wo welcher Ordner in Roblox landet
  src/shared/            -> ReplicatedStorage.Shared (Server UND Client)
    Config.lua           -> ALLE Einstellungen: Preise, Schaden, Sounds ...
    Sirene.lua           -> spielt die Sirene ab
  src/server/            -> ServerScriptService.Server (nur Server)
    Main.server.lua      -> Startpunkt, verbindet alles
    Welt.lua             -> Landschaft, Straßen, Wälder, Denkmal, Tag und Nacht
    Funk.lua             -> Remotes (Verbindung Server <-> Spieler)
    StadtManager.lua     -> Städte, Besitzer, Bauen, Bewohner, Strom, Schaden, Einkommen
    Shop.lua             -> Kaufen (der Server prüft das Geld)
    Angriff.lua          -> prüft einen Angriff und schickt die Waffen los
    Raketen.lua          -> Flug, Abfangen und Einschlag von Raketen
    Einheiten.lua        -> Panzer und Kampfjets
    Effekte.lua          -> Explosionen, Rauch, Schüsse, Abfangraketen
    Modelle.lua          -> baut Städte, Gebäude, Bewohner, Raketen, Panzer und Jets aus Parts
  src/client/            -> StarterPlayerScripts.Client (nur beim Spieler)
    Hud.client.lua       -> Bedienoberfläche fürs Handy (Knöpfe, Fenster, Karten, Geld)
    Alarm.client.lua     -> Luftalarm-Anzeige, roter Bildschirmrand und Sirene im Kopfhörer
    Kamera.client.lua    -> Kamera-Wackeln bei Explosionen und die Kartenansicht
    Feedback.client.lua  -> "+X $" über den Gebäuden und das Banner für neue Stadt-Stufen
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

**Wie auf dem Handy testen (Geräte-Simulator):**
1. Oben den Tab **Test** öffnen und auf **Device** klicken (Geräte-Simulator).
2. Oben im Bild ein Handy auswählen, z. B. **iPhone 14** oder **Samsung Galaxy**, und auf **Querformat** drehen.
3. **Play** (F5) drücken. Jetzt siehst du das Spiel wie auf dem Handy: Joystick links, Springen rechts unten,
   darüber die 4 runden Knöpfe. Mit der Maus "tippst" du wie mit dem Finger.

**Allein testen (Bauen, Strom, Angreifen):**
1. **Play** drücken. Du landest in deiner Stadt. Neben **BAUEN** wippt ein gelber Hinweis.
2. **BAUEN** antippen und ein paar **Häuser** kaufen. Jedes Haus wächst aus dem Boden, davor stehen 2 Bewohner,
   oben links steigt die Zahl bei 👥. Beim 3. Haus (30 Bewohner) kommt das Banner **KLEINSTADT** mit Konfetti.
   Eine **Fabrik** bauen und ein paar Sekunden warten: Darüber steigt "+8 $" auf.
3. Weiter Häuser bauen, bis oben bei ⚡ **AUSFALL!** steht. Dann ein **Kraftwerk** bauen: der Strom reicht wieder.
4. **WAFFEN** antippen: 2 Panzer und eine Kurzstrecken-Rakete kaufen.
   Am **ANGRIFF**-Knopf zeigt jetzt eine gelbe Zahl, wie viele Waffen du hast.
5. **ANGRIFF** antippen, **Panzer** antippen, mit **+** auf 2 stellen, **Stadt 2** antippen und **"2x LOSSCHICKEN!"** drücken.
   Die Panzer fahren über die Straße los, schießen und kommen zurück.
6. Dasselbe mit der Rakete: auf der Startrampe zündet sie mit Feuer, Rauch, Kondensstreifen und Geräusch.
   Dann **KARTE** drücken: Die Kamera fliegt hoch und du siehst die Rakete über die Karte fliegen.
   In Stadt 2 pulsiert ein roter Kreis mit Countdown genau da, wo sie einschlägt.
7. Warte auf die Nacht (nach gut 3 Minuten): Fenster und Laternen gehen an.

**Auf deinem echten Handy spielen:**
1. In Studio **Datei -> Auf Roblox veröffentlichen** (Publish to Roblox).
2. Die Roblox-App auf dem Handy öffnen, unter **Erstellungen** bzw. auf deinem Profil das Spiel öffnen und spielen.
   Als Besitzer darfst du es spielen, auch wenn es noch privat ist.

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
