-- Config.lua
-- Alle Einstellungen des Spiels an einem Ort.
-- Hier kannst du Preise, Schaden, Geld usw. ändern, ohne den restlichen Code anzufassen.

local Config = {}

-- Wie viele Städte (= Spieler mit eigener Stadt) es pro Server gibt. Maximal 4.
Config.MAX_STAEDTE = 4

-- Geld
Config.STARTGELD = 500
Config.GRUNDEINKOMMEN = 10 -- so viel Geld gibt es immer, auch ohne Gebäude
Config.EINKOMMEN_INTERVALL = 5 -- alle 5 Sekunden gibt es Geld

-- Städte
Config.STADT_GROESSE = 120 -- Kantenlänge einer Stadt in Studs
Config.STADT_ABSTAND = 170 -- Abstand der Stadtmitte zur Kartenmitte

-- Raketen
Config.SCHUSS_PAUSE = 2 -- Sekunden zwischen zwei Abschüssen
Config.BELOHNUNG_ANTEIL = 0.5 -- für ein zerstörtes Gebäude bekommst du 50 % seines Preises

-- Gebäude, die man in seiner Stadt bauen kann
Config.Gebaeude = {
	Haus = {
		Name = "Haus",
		Preis = 50,
		Einkommen = 3,
		Leben = 100,
	},
	Fabrik = {
		Name = "Fabrik",
		Preis = 150,
		Einkommen = 8,
		Leben = 150,
	},
	Abwehr = {
		Name = "Flugabwehr",
		Preis = 300,
		Einkommen = 0,
		Leben = 200,
		IstAbwehr = true,
		Reichweite = 140, -- so nah muss eine Rakete kommen, damit die Abwehr schießt
		Trefferchance = 0.6, -- 60 % Chance, die Rakete abzufangen
		Nachladezeit = 4, -- Sekunden bis zum nächsten Schuss
	},
}
Config.GebaeudeReihenfolge = { "Haus", "Fabrik", "Abwehr" }

-- Raketen, die man kaufen und abschießen kann
Config.Raketen = {
	Kurzstrecke = {
		Name = "Kurzstrecken-Rakete",
		Preis = 100,
		Schaden = 70,
		Radius = 22, -- Explosionsradius in Studs
		Flugzeit = 7, -- Sekunden in der Luft
		Hoehe = 120, -- wie hoch der Bogen geht
		Groesse = 1,
	},
	Schwer = {
		Name = "Schwere Rakete",
		Preis = 250,
		Schaden = 140,
		Radius = 32,
		Flugzeit = 10,
		Hoehe = 180,
		Groesse = 1.6,
	},
}
Config.RaketenReihenfolge = { "Kurzstrecke", "Schwer" }

-- Sounds
-- Die "rbxasset://"-Sounds sind in Roblox eingebaut und funktionieren immer.
-- Du kannst sie durch eigene Sounds aus der Toolbox ersetzen:
-- Sound in der Toolbox suchen -> Rechtsklick -> "Copy Asset ID" -> hier als "rbxassetid://ZAHL" eintragen.
Config.Sounds = {
	Start = "rbxasset://sounds/Rocket shot.wav", -- Abschuss
	Flug = "rbxasset://sounds/Rocket whoosh 01.wav", -- Fluggeräusch (läuft in Schleife)
	-- Trage hier eine echte Sirene ein, z.B. "rbxassetid://1234567890" (Toolbox: "air raid siren").
	-- Solange das leer ist, wird eine Ersatz-Sirene aus Pieptönen benutzt.
	Sirene = "",
	Piep = "rbxasset://sounds/electronicpingshort.wav",
}

return Config
