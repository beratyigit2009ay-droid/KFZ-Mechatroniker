--!strict
-- Rockets.luau  (ModuleScript in ReplicatedStorage.Shared.Config)
-- Alle 20 Raketen des Spiels. Hier änderst du Preise, Flugwerte und Aussehen.
--
-- Flugwerte (echte Physik, Einheit "Studs"):
--   Thrust           = Schub als Beschleunigung in Studs/s². Muss größer als die Schwerkraft (196.2) sein.
--   BurnTime         = wie viele Sekunden der Treibstoff reicht.
--   MaxSpeed         = Höchstgeschwindigkeit (Studs/s), bei der Luftwiderstand und Schub gleich stark sind.
--   RewardMultiplier = Faktor für die Coins pro Meter.
-- Price/Currency = was die Rakete im Shop kostet ("Coins" oder "Gems").
--
-- Style beschreibt das Aussehen. RocketBuilder.luau baut daraus das Modell aus normalen Parts.

local Rockets = {}

export type RocketStyle = {
	Height: number, -- Länge des Rumpfes in Studs
	Radius: number, -- Radius des Rumpfes
	Body: Color3,
	Accent: Color3,
	Trim: Color3,
	BodyMaterial: Enum.Material,
	AccentMaterial: Enum.Material,
	Fins: number, -- Anzahl Flossen (3, 4 oder 6)
	FinShape: string, -- "Delta" | "Swept" | "Wing"
	Nose: string, -- "Cone" | "Round" | "Needle"
	Boosters: number, -- seitliche Booster (0, 2 oder 4)
	Rings: number, -- leuchtende Ringe am Rumpf
	Window: boolean,
	FlameColor: Color3,
	FlameTip: Color3,
	Glow: boolean, -- Rumpf hat ein Licht
	Sparkles: boolean, -- funkelt im Stand
}

export type RocketDef = {
	Id: string,
	Order: number,
	Name: string,
	Type: string,
	Description: string,
	Price: number,
	Currency: string,
	Thrust: number,
	BurnTime: number,
	MaxSpeed: number,
	RewardMultiplier: number,
	Style: RocketStyle,
}

export type RocketType = { Name: string, Color: Color3 }

-- Raketentypen: Name und Farbe für das Etikett im Shop
Rockets.Types = {
	Starter = { Name = "Anfänger", Color = Color3.fromRGB(120, 200, 255) },
	Fire = { Name = "Feuer", Color = Color3.fromRGB(255, 120, 50) },
	Ice = { Name = "Eis", Color = Color3.fromRGB(140, 235, 255) },
	Plasma = { Name = "Plasma", Color = Color3.fromRGB(255, 80, 220) },
	Alien = { Name = "Alien", Color = Color3.fromRGB(110, 255, 120) },
	Gold = { Name = "Gold", Color = Color3.fromRGB(255, 205, 60) },
	Cosmic = { Name = "Kosmisch", Color = Color3.fromRGB(170, 110, 255) },
} :: { [string]: RocketType }

local M = Enum.Material
local rgb = Color3.fromRGB

local list: { RocketDef } = {
	{
		Id = "funke", Order = 0, Name = "Funke", Type = "Starter",
		Description = "Deine erste Rakete. Klein, aber sie fliegt!",
		Price = 0, Currency = "Coins",
		Thrust = 320, BurnTime = 3.5, MaxSpeed = 220, RewardMultiplier = 1,
		Style = {
			Height = 14, Radius = 1.6, Body = rgb(235, 238, 245), Accent = rgb(230, 60, 60), Trim = rgb(60, 70, 90),
			BodyMaterial = M.SmoothPlastic, AccentMaterial = M.SmoothPlastic,
			Fins = 3, FinShape = "Delta", Nose = "Cone", Boosters = 0, Rings = 0, Window = true,
			FlameColor = rgb(255, 170, 60), FlameTip = rgb(255, 60, 20), Glow = false, Sparkles = false,
		},
	},
	{
		Id = "pionier", Order = 0, Name = "Pionier", Type = "Starter",
		Description = "Stabiler Rumpf und ein bisschen mehr Schub.",
		Price = 300, Currency = "Coins",
		Thrust = 339, BurnTime = 3.8, MaxSpeed = 239, RewardMultiplier = 1.6,
		Style = {
			Height = 15, Radius = 1.7, Body = rgb(245, 245, 250), Accent = rgb(40, 110, 230), Trim = rgb(50, 55, 70),
			BodyMaterial = M.SmoothPlastic, AccentMaterial = M.SmoothPlastic,
			Fins = 4, FinShape = "Delta", Nose = "Cone", Boosters = 0, Rings = 1, Window = true,
			FlameColor = rgb(255, 180, 70), FlameTip = rgb(255, 80, 30), Glow = false, Sparkles = false,
		},
	},
	{
		Id = "kometenjaeger", Order = 0, Name = "Kometenjäger", Type = "Starter",
		Description = "Schlank und schnell, mit spitzer Nase.",
		Price = 640, Currency = "Coins",
		Thrust = 360, BurnTime = 4.1, MaxSpeed = 259, RewardMultiplier = 2.6,
		Style = {
			Height = 16, Radius = 1.6, Body = rgb(60, 70, 95), Accent = rgb(90, 220, 255), Trim = rgb(230, 235, 245),
			BodyMaterial = M.Metal, AccentMaterial = M.SmoothPlastic,
			Fins = 4, FinShape = "Swept", Nose = "Needle", Boosters = 0, Rings = 1, Window = true,
			FlameColor = rgb(255, 190, 80), FlameTip = rgb(255, 90, 40), Glow = false, Sparkles = false,
		},
	},
	{
		Id = "glutstern", Order = 0, Name = "Glutstern", Type = "Fire",
		Description = "Glühende Streifen und eine heiße Flamme.",
		Price = 1400, Currency = "Coins",
		Thrust = 381, BurnTime = 4.5, MaxSpeed = 281, RewardMultiplier = 4.1,
		Style = {
			Height = 17, Radius = 1.8, Body = rgb(60, 25, 20), Accent = rgb(255, 110, 30), Trim = rgb(255, 200, 80),
			BodyMaterial = M.Slate, AccentMaterial = M.Neon,
			Fins = 3, FinShape = "Swept", Nose = "Cone", Boosters = 0, Rings = 2, Window = false,
			FlameColor = rgb(255, 140, 30), FlameTip = rgb(255, 40, 0), Glow = true, Sparkles = false,
		},
	},
	{
		Id = "inferno", Order = 0, Name = "Inferno", Type = "Fire",
		Description = "Zwei Booster voller Feuer.",
		Price = 3000, Currency = "Coins",
		Thrust = 404, BurnTime = 4.9, MaxSpeed = 305, RewardMultiplier = 6.6,
		Style = {
			Height = 18, Radius = 1.9, Body = rgb(170, 30, 25), Accent = rgb(255, 150, 40), Trim = rgb(40, 20, 20),
			BodyMaterial = M.SmoothPlastic, AccentMaterial = M.Neon,
			Fins = 4, FinShape = "Delta", Nose = "Round", Boosters = 2, Rings = 2, Window = false,
			FlameColor = rgb(255, 120, 20), FlameTip = rgb(200, 20, 0), Glow = true, Sparkles = false,
		},
	},
	{
		Id = "phoenix", Order = 0, Name = "Phönix", Type = "Fire",
		Description = "Flügel wie ein Feuervogel.",
		Price = 6400, Currency = "Coins",
		Thrust = 428, BurnTime = 5.3, MaxSpeed = 331, RewardMultiplier = 10.5,
		Style = {
			Height = 19, Radius = 1.9, Body = rgb(255, 170, 40), Accent = rgb(230, 40, 20), Trim = rgb(255, 230, 120),
			BodyMaterial = M.SmoothPlastic, AccentMaterial = M.Neon,
			Fins = 4, FinShape = "Wing", Nose = "Needle", Boosters = 0, Rings = 3, Window = true,
			FlameColor = rgb(255, 200, 60), FlameTip = rgb(255, 50, 10), Glow = true, Sparkles = true,
		},
	},
	{
		Id = "frostpfeil", Order = 0, Name = "Frostpfeil", Type = "Ice",
		Description = "Eiskalt und windschnittig.",
		Price = 14000, Currency = "Coins",
		Thrust = 454, BurnTime = 5.7, MaxSpeed = 359, RewardMultiplier = 16.8,
		Style = {
			Height = 20, Radius = 1.9, Body = rgb(200, 235, 255), Accent = rgb(80, 190, 255), Trim = rgb(255, 255, 255),
			BodyMaterial = M.Ice, AccentMaterial = M.Glass,
			Fins = 3, FinShape = "Swept", Nose = "Needle", Boosters = 0, Rings = 2, Window = true,
			FlameColor = rgb(150, 230, 255), FlameTip = rgb(40, 120, 255), Glow = true, Sparkles = false,
		},
	},
	{
		Id = "gletscher", Order = 0, Name = "Gletscher", Type = "Ice",
		Description = "Schwer gepanzert mit vier Eis-Boostern.",
		Price = 30000, Currency = "Coins",
		Thrust = 481, BurnTime = 6.2, MaxSpeed = 389, RewardMultiplier = 26.8,
		Style = {
			Height = 21, Radius = 2.3, Body = rgb(160, 210, 240), Accent = rgb(230, 250, 255), Trim = rgb(60, 110, 160),
			BodyMaterial = M.Glacier, AccentMaterial = M.Ice,
			Fins = 4, FinShape = "Delta", Nose = "Round", Boosters = 4, Rings = 1, Window = false,
			FlameColor = rgb(170, 240, 255), FlameTip = rgb(60, 140, 255), Glow = true, Sparkles = false,
		},
	},
	{
		Id = "polarlicht", Order = 0, Name = "Polarlicht", Type = "Ice",
		Description = "Leuchtet grün und blau wie Nordlichter.",
		Price = 64000, Currency = "Coins",
		Thrust = 510, BurnTime = 6.7, MaxSpeed = 423, RewardMultiplier = 43,
		Style = {
			Height = 22, Radius = 2.0, Body = rgb(30, 50, 80), Accent = rgb(80, 255, 200), Trim = rgb(120, 160, 255),
			BodyMaterial = M.Glass, AccentMaterial = M.Neon,
			Fins = 6, FinShape = "Swept", Nose = "Needle", Boosters = 0, Rings = 4, Window = true,
			FlameColor = rgb(120, 255, 220), FlameTip = rgb(60, 120, 255), Glow = true, Sparkles = true,
		},
	},
	{
		Id = "ionenblitz", Order = 0, Name = "Ionenblitz", Type = "Plasma",
		Description = "Ein Plasma-Antrieb mit pinker Flamme.",
		Price = 140000, Currency = "Coins",
		Thrust = 541, BurnTime = 7.3, MaxSpeed = 458, RewardMultiplier = 69,
		Style = {
			Height = 22, Radius = 2.0, Body = rgb(40, 30, 60), Accent = rgb(255, 70, 220), Trim = rgb(200, 200, 230),
			BodyMaterial = M.Metal, AccentMaterial = M.Neon,
			Fins = 3, FinShape = "Wing", Nose = "Cone", Boosters = 2, Rings = 3, Window = false,
			FlameColor = rgb(255, 120, 255), FlameTip = rgb(140, 40, 255), Glow = true, Sparkles = false,
		},
	},
	{
		Id = "plasmasturm", Order = 0, Name = "Plasmasturm", Type = "Plasma",
		Description = "Sechs Flossen und knisternde Energie.",
		Price = 290000, Currency = "Coins",
		Thrust = 573, BurnTime = 7.9, MaxSpeed = 497, RewardMultiplier = 110,
		Style = {
			Height = 24, Radius = 2.2, Body = rgb(20, 20, 35), Accent = rgb(0, 230, 255), Trim = rgb(255, 60, 200),
			BodyMaterial = M.DiamondPlate, AccentMaterial = M.Neon,
			Fins = 6, FinShape = "Delta", Nose = "Round", Boosters = 0, Rings = 4, Window = false,
			FlameColor = rgb(80, 220, 255), FlameTip = rgb(255, 60, 220), Glow = true, Sparkles = true,
		},
	},
	{
		Id = "quasar", Order = 0, Name = "Quasar", Type = "Plasma",
		Description = "So hell wie ein Quasar am Nachthimmel.",
		Price = 630000, Currency = "Coins",
		Thrust = 607, BurnTime = 8.6, MaxSpeed = 540, RewardMultiplier = 180,
		Style = {
			Height = 25, Radius = 2.3, Body = rgb(245, 240, 255), Accent = rgb(180, 60, 255), Trim = rgb(60, 220, 255),
			BodyMaterial = M.Marble, AccentMaterial = M.Neon,
			Fins = 4, FinShape = "Swept", Nose = "Needle", Boosters = 4, Rings = 3, Window = true,
			FlameColor = rgb(200, 120, 255), FlameTip = rgb(60, 200, 255), Glow = true, Sparkles = true,
		},
	},
	{
		Id = "xenospaeher", Order = 0, Name = "Xeno-Späher", Type = "Alien",
		Description = "Eine Alien-Sonde mit grünem Auge.",
		Price = 1400000, Currency = "Coins",
		Thrust = 644, BurnTime = 9.3, MaxSpeed = 586, RewardMultiplier = 280,
		Style = {
			Height = 24, Radius = 2.4, Body = rgb(70, 90, 70), Accent = rgb(120, 255, 90), Trim = rgb(30, 40, 30),
			BodyMaterial = M.Foil, AccentMaterial = M.Neon,
			Fins = 3, FinShape = "Wing", Nose = "Round", Boosters = 0, Rings = 2, Window = true,
			FlameColor = rgb(150, 255, 100), FlameTip = rgb(40, 200, 60), Glow = true, Sparkles = false,
		},
	},
	{
		Id = "ufobrecher", Order = 0, Name = "Ufo-Brecher", Type = "Alien",
		Description = "Breiter Rumpf, vier Booster, Alien-Technik.",
		Price = 2900000, Currency = "Coins",
		Thrust = 683, BurnTime = 10.1, MaxSpeed = 635, RewardMultiplier = 450,
		Style = {
			Height = 25, Radius = 2.7, Body = rgb(130, 140, 150), Accent = rgb(90, 255, 160), Trim = rgb(200, 255, 80),
			BodyMaterial = M.DiamondPlate, AccentMaterial = M.Neon,
			Fins = 4, FinShape = "Delta", Nose = "Round", Boosters = 4, Rings = 3, Window = true,
			FlameColor = rgb(120, 255, 170), FlameTip = rgb(30, 160, 90), Glow = true, Sparkles = false,
		},
	},
	{
		Id = "schwarmkoenigin", Order = 0, Name = "Schwarm-Königin", Type = "Alien",
		Description = "Lila Panzer, giftgrüne Flammen.",
		Price = 6300000, Currency = "Coins",
		Thrust = 723, BurnTime = 11.0, MaxSpeed = 689, RewardMultiplier = 720,
		Style = {
			Height = 27, Radius = 2.6, Body = rgb(70, 30, 90), Accent = rgb(170, 255, 60), Trim = rgb(220, 120, 255),
			BodyMaterial = M.Granite, AccentMaterial = M.Neon,
			Fins = 6, FinShape = "Wing", Nose = "Needle", Boosters = 2, Rings = 4, Window = false,
			FlameColor = rgb(180, 255, 60), FlameTip = rgb(120, 40, 200), Glow = true, Sparkles = true,
		},
	},
	{
		Id = "goldfalke", Order = 0, Name = "Goldfalke", Type = "Gold",
		Description = "Echtes Gold glänzt bis ins All.",
		Price = 14000000, Currency = "Coins",
		Thrust = 767, BurnTime = 11.9, MaxSpeed = 748, RewardMultiplier = 1200,
		Style = {
			Height = 27, Radius = 2.5, Body = rgb(255, 200, 60), Accent = rgb(255, 245, 200), Trim = rgb(150, 100, 20),
			BodyMaterial = M.Foil, AccentMaterial = M.Neon,
			Fins = 4, FinShape = "Swept", Nose = "Needle", Boosters = 2, Rings = 2, Window = true,
			FlameColor = rgb(255, 230, 120), FlameTip = rgb(255, 140, 20), Glow = true, Sparkles = true,
		},
	},
	{
		Id = "midas", Order = 0, Name = "Midas", Type = "Gold",
		Description = "Alles, was sie berührt, wird zu Gold.",
		Price = 29000000, Currency = "Coins",
		Thrust = 813, BurnTime = 12.9, MaxSpeed = 812, RewardMultiplier = 1800,
		Style = {
			Height = 28, Radius = 2.8, Body = rgb(230, 170, 30), Accent = rgb(40, 30, 20), Trim = rgb(255, 230, 140),
			BodyMaterial = M.Foil, AccentMaterial = M.Metal,
			Fins = 6, FinShape = "Delta", Nose = "Round", Boosters = 4, Rings = 3, Window = true,
			FlameColor = rgb(255, 220, 90), FlameTip = rgb(255, 120, 0), Glow = true, Sparkles = true,
		},
	},
	{
		Id = "sternenstaub", Order = 0, Name = "Sternenstaub", Type = "Cosmic",
		Description = "Aus Sternenstaub gebaut. Sie funkelt.",
		Price = 63000000, Currency = "Coins",
		Thrust = 862, BurnTime = 14.0, MaxSpeed = 880, RewardMultiplier = 3000,
		Style = {
			Height = 29, Radius = 2.5, Body = rgb(25, 20, 60), Accent = rgb(140, 90, 255), Trim = rgb(255, 220, 120),
			BodyMaterial = M.Glass, AccentMaterial = M.Neon,
			Fins = 4, FinShape = "Wing", Nose = "Needle", Boosters = 2, Rings = 5, Window = true,
			FlameColor = rgb(170, 140, 255), FlameTip = rgb(255, 100, 230), Glow = true, Sparkles = true,
		},
	},
	{
		Id = "nebulatitan", Order = 0, Name = "Nebula-Titan", Type = "Cosmic",
		Description = "Ein Riese, der ganze Nebel durchquert.",
		Price = 130000000, Currency = "Coins",
		Thrust = 913, BurnTime = 15.2, MaxSpeed = 955, RewardMultiplier = 4700,
		Style = {
			Height = 32, Radius = 3.0, Body = rgb(40, 20, 80), Accent = rgb(60, 220, 255), Trim = rgb(255, 120, 230),
			BodyMaterial = M.Granite, AccentMaterial = M.Neon,
			Fins = 6, FinShape = "Swept", Nose = "Round", Boosters = 4, Rings = 5, Window = true,
			FlameColor = rgb(90, 220, 255), FlameTip = rgb(200, 80, 255), Glow = true, Sparkles = true,
		},
	},
	{
		Id = "singularitaet", Order = 0, Name = "Singularität", Type = "Cosmic",
		Description = "Die stärkste Rakete. Schwarz wie ein schwarzes Loch.",
		Price = 290000000, Currency = "Coins",
		Thrust = 968, BurnTime = 16.5, MaxSpeed = 1037, RewardMultiplier = 7600,
		Style = {
			Height = 34, Radius = 3.0, Body = rgb(10, 10, 15), Accent = rgb(255, 200, 80), Trim = rgb(150, 80, 255),
			BodyMaterial = M.Glass, AccentMaterial = M.Neon,
			Fins = 6, FinShape = "Wing", Nose = "Needle", Boosters = 4, Rings = 6, Window = false,
			FlameColor = rgb(255, 220, 140), FlameTip = rgb(140, 60, 255), Glow = true, Sparkles = true,
		},
	},
}

Rockets.List = list
Rockets.ById = {} :: { [string]: RocketDef }
Rockets.StarterId = "funke"

for index, rocket in list do
	rocket.Order = index
	Rockets.ById[rocket.Id] = rocket
end

function Rockets.get(id: string): RocketDef?
	return Rockets.ById[id]
end

return Rockets
