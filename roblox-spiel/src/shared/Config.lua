-- Config.lua
-- Alle Einstellungen des Spiels an einem Ort.
-- Hier kannst du Preise, Schaden, Geld usw. ändern, ohne den restlichen Code anzufassen.

local Config = {}

-- Wie viele Städte (= Spieler mit eigener Stadt) es pro Server gibt. Maximal 4.
Config.MAX_STAEDTE = 4

-- Geld
Config.STARTGELD = 1500
Config.GRUNDEINKOMMEN = 25 -- so viel Geld gibt es immer, auch ohne Gebäude
Config.EINKOMMEN_INTERVALL = 5 -- alle 5 Sekunden gibt es Geld
Config.STEUER_PRO_BEWOHNER = 0.3 -- jeder Bewohner zahlt 0,3 $ Steuern pro Runde

-- Strom
-- Jede Stadt hat ein kleines Grund-Netz. Für mehr Gebäude brauchst du Kraftwerke.
-- Ohne genug Strom gibt es nur das halbe Einkommen (Stromausfall!).
Config.GRUNDSTROM = 10

-- Städte
Config.STADT_GROESSE = 120 -- Kantenlänge einer Stadt in Studs
Config.STADT_ABSTAND = 170 -- Abstand der Stadtmitte zur Kartenmitte
Config.STADT_FARBEN = {
	Color3.fromRGB(210, 60, 60), -- rot
	Color3.fromRGB(60, 110, 220), -- blau
	Color3.fromRGB(70, 180, 80), -- grün
	Color3.fromRGB(235, 190, 40), -- gelb
}

-- Tag und Nacht: so viele Minuten dauert der Tag und die Nacht.
-- Nachts leuchten Fenster und Straßenlaternen, Raketen sieht man dann besonders gut.
Config.TAG_UND_NACHT = true -- auf false stellen, dann ist immer Nachmittag
Config.TAG_MINUTEN = 9
Config.NACHT_MINUTEN = 3

-- Stadt-Stufen: Je mehr Bewohner, desto höher die Stufe deiner Stadt.
-- Bei jeder neuen Stufe gibt es einmal einen Geld-Bonus.
Config.STUFEN = {
	{ Name = "Dorf", Bewohner = 0, Bonus = 0 },
	{ Name = "Kleinstadt", Bewohner = 30, Bonus = 150 },
	{ Name = "Stadt", Bewohner = 80, Bonus = 300 },
	{ Name = "Großstadt", Bewohner = 160, Bonus = 600 },
	{ Name = "Metropole", Bewohner = 300, Bonus = 1200 },
	{ Name = "Mega-City", Bewohner = 500, Bonus = 2500 },
}

-- Gibt die Stufe (1, 2, 3, ...) für eine Anzahl Bewohner zurück
function Config.stufeFuer(bewohner: number): number
	local stufe = 1
	for i, s in ipairs(Config.STUFEN) do
		if bewohner >= s.Bewohner then
			stufe = i
		end
	end
	return stufe
end

-- Angriffe
Config.ANGRIFF_PAUSE = 1 -- Sekunden zwischen zwei Angriffen
Config.MAX_ANZAHL = 20 -- so viele Raketen/Panzer/Jets kann man auf einmal schicken
Config.BELOHNUNG_ANTEIL = 1 -- für ein zerstörtes Gebäude bekommst du seinen ganzen Preis
Config.ABSCHUSS_ANTEIL = 0.5 -- schießt deine Abwehr eine Rakete, einen Jet oder Panzer ab, bekommst du 50 % ihres Preises

-- Gebäude, die man in seiner Stadt bauen kann
-- Bewohner: wie viele Leute darin wohnen (zahlen Steuern)
-- Einkommen: so viel Geld bringt das Gebäude zusätzlich pro Runde
-- Strom: positiv = erzeugt Strom, negativ = verbraucht Strom
Config.Gebaeude = {
	Haus = {
		Name = "Haus",
		Icon = "🏠", -- Bild auf dem Knopf (ein Emoji)
		Preis = 50,
		Bewohner = 10,
		Strom = -2,
		Leben = 100,
	},
	Hochhaus = {
		Name = "Hochhaus",
		Icon = "🏢",
		Preis = 250,
		Bewohner = 50,
		Strom = -8,
		Leben = 250,
	},
	Fabrik = {
		Name = "Fabrik",
		Icon = "🏭",
		Preis = 150,
		Einkommen = 8,
		Strom = -6,
		Leben = 150,
	},
	Buero = {
		Name = "Bürogebäude",
		Icon = "💼",
		Preis = 400,
		Einkommen = 20,
		Strom = -8,
		Leben = 200,
	},
	Einkaufszentrum = {
		Name = "Einkaufszentrum",
		Icon = "🛍️",
		Preis = 700,
		Einkommen = 35,
		Strom = -12,
		Leben = 250,
	},
	Bank = {
		Name = "Bank",
		Icon = "🏦",
		Preis = 1200,
		Einkommen = 60,
		Strom = -6,
		Leben = 300,
	},
	Kraftwerk = {
		Name = "Kraftwerk",
		Icon = "⚡",
		Preis = 200,
		Strom = 30,
		Leben = 200,
	},
	Abwehr = {
		Name = "Flugabwehr",
		Icon = "🛡️",
		Preis = 300,
		Strom = -4,
		Leben = 200,
		IstFlugabwehr = true, -- schießt auf Raketen und Jets
		Reichweite = 140, -- so nah muss eine Rakete/ein Jet kommen, damit die Abwehr schießt
		Trefferchance = 0.6, -- 60 % Chance zu treffen
		Nachladezeit = 4, -- Sekunden bis zum nächsten Schuss
	},
	Raketenwerfer = {
		Name = "Raketenwerfer",
		Icon = "🎆",
		Preis = 600,
		Strom = -4,
		Leben = 220,
		IstWerfer = true, -- jeder Raketenwerfer startet 4 Raketen GLEICHZEITIG
		Rohre = 4,
	},
	Panzerabwehr = {
		Name = "Panzerabwehr",
		Icon = "🎯",
		Preis = 250,
		Strom = -3,
		Leben = 200,
		IstPanzerabwehr = true, -- schießt auf Panzer
		Reichweite = 110,
		Schaden = 45,
		Nachladezeit = 2.5,
	},
}
Config.GebaeudeReihenfolge =
	{ "Haus", "Hochhaus", "Fabrik", "Buero", "Einkaufszentrum", "Bank", "Kraftwerk", "Abwehr", "Panzerabwehr", "Raketenwerfer" }

-- Raketen: je stärker, desto teurer
-- Abfangbar: 1 = die Flugabwehr trifft normal, 0.4 = nur noch 40 % so oft
Config.Raketen = {
	Kurzstrecke = {
		Name = "Kurzstrecken-Rakete",
		Icon = "🚀",
		Preis = 100,
		Schaden = 60,
		Radius = 18, -- Explosionsradius in Studs
		Flugzeit = 6, -- Sekunden in der Luft
		Hoehe = 110, -- wie hoch der Bogen geht
		Groesse = 0.9,
		Abfangbar = 1,
	},
	Mittelstrecke = {
		Name = "Mittelstrecken-Rakete",
		Icon = "🚀",
		Preis = 200,
		Schaden = 90,
		Radius = 24,
		Flugzeit = 7,
		Hoehe = 140,
		Groesse = 1.2,
		Abfangbar = 0.85,
	},
	Schwer = {
		Name = "Schwere Rakete",
		Icon = "🔥",
		Preis = 400,
		Schaden = 150,
		Radius = 32,
		Flugzeit = 9,
		Hoehe = 180,
		Groesse = 1.6,
		Abfangbar = 0.7,
	},
	Mega = {
		Name = "Mega-Rakete",
		Icon = "☢️",
		Preis = 1000,
		Schaden = 300,
		Radius = 50,
		Flugzeit = 11,
		Hoehe = 230,
		Groesse = 2.3,
		Abfangbar = 0.4,
	},
}
Config.RaketenReihenfolge = { "Kurzstrecke", "Mittelstrecke", "Schwer", "Mega" }

-- Fahrzeuge: Panzer fahren über den Boden, Jets fliegen über die Stadt und werfen Bomben.
-- Was den Angriff überlebt, kommt zurück in dein Lager.
Config.Einheiten = {
	Panzer = {
		Name = "Panzer",
		Icon = "💥",
		Preis = 200,
		Leben = 120,
		Tempo = 22, -- Studs pro Sekunde
		Schaden = 30, -- pro Schuss
		Schuesse = 6,
		Schussabstand = 1.5, -- Sekunden zwischen zwei Schüssen
	},
	Jet = {
		Name = "Kampfjet",
		Icon = "✈️",
		Preis = 400,
		Tempo = 130,
		Hoehe = 90,
		Bomben = 3,
		BombenSchaden = 70,
		BombenRadius = 18,
	},
}
Config.EinheitenReihenfolge = { "Panzer", "Jet" }

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
	Klick = "rbxasset://sounds/button.wav", -- Knopf antippen
	Bauen = "rbxasset://sounds/swoosh.wav", -- Gebäude wächst aus dem Boden
	Geld = "rbxasset://sounds/electronicpingshort.wav", -- Kauf hat geklappt
	Stufe = "rbxasset://sounds/victory.wav", -- neue Stadt-Stufe erreicht
}

-- Hilfsfunktion: Infos zu einer Waffe (Rakete oder Fahrzeug) holen
function Config.waffe(typ: string)
	return Config.Raketen[typ] or Config.Einheiten[typ]
end

return Config
