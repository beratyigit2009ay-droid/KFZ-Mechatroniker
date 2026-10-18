--!strict
-- Worlds.luau  (ModuleScript in ReplicatedStorage.Shared.Config)
-- Die 10 Welten. In der Kernversion ist nur die Erde spielbar. Freischalten, Schwerkraft und
-- Aussehen der anderen Welten kommen im nächsten Schritt (eigener PR). Die Werte stehen schon hier,
-- damit es später keine widersprüchlichen Zahlen gibt.
--   UnlockCost       = Coins zum Freischalten
--   RequiredAltitude = so hoch (m) musst du schon einmal geflogen sein
--   Gravity          = Faktor zur Erd-Schwerkraft (0.17 = Mond)
--   RewardMultiplier = Coins-Faktor in dieser Welt

export type WorldDef = {
	Id: string,
	Order: number,
	Name: string,
	Description: string,
	UnlockCost: number,
	RequiredAltitude: number,
	Gravity: number,
	RewardMultiplier: number,
	SkyColor: Color3,
	GroundColor: Color3,
	AccentColor: Color3,
}

local rgb = Color3.fromRGB

local list: { WorldDef } = {
	{ Id = "earth", Order = 1, Name = "Erde", Description = "Startgebiet und Tutorial.",
		UnlockCost = 0, RequiredAltitude = 0, Gravity = 1, RewardMultiplier = 1,
		SkyColor = rgb(120, 170, 255), GroundColor = rgb(90, 160, 80), AccentColor = rgb(80, 200, 255) },
	{ Id = "moon", Order = 2, Name = "Mond", Description = "Geringe Schwerkraft, graue Krater.",
		UnlockCost = 25000, RequiredAltitude = 15000, Gravity = 0.6, RewardMultiplier = 2,
		SkyColor = rgb(20, 20, 35), GroundColor = rgb(160, 160, 165), AccentColor = rgb(220, 220, 255) },
	{ Id = "mars", Order = 3, Name = "Mars", Description = "Rote Landschaft und Staubstürme.",
		UnlockCost = 400000, RequiredAltitude = 30000, Gravity = 0.8, RewardMultiplier = 4,
		SkyColor = rgb(200, 120, 80), GroundColor = rgb(170, 70, 40), AccentColor = rgb(255, 140, 80) },
	{ Id = "jupiter", Order = 4, Name = "Jupiter", Description = "Riesig, stürmisch, starke Schwerkraft.",
		UnlockCost = 6000000, RequiredAltitude = 50000, Gravity = 1.3, RewardMultiplier = 8,
		SkyColor = rgb(200, 160, 120), GroundColor = rgb(180, 130, 90), AccentColor = rgb(255, 200, 140) },
	{ Id = "saturn", Order = 5, Name = "Saturn", Description = "Ringe und Weltraumstationen.",
		UnlockCost = 80000000, RequiredAltitude = 80000, Gravity = 1.1, RewardMultiplier = 16,
		SkyColor = rgb(230, 210, 160), GroundColor = rgb(210, 190, 140), AccentColor = rgb(255, 230, 170) },
	{ Id = "iceplanet", Order = 6, Name = "Eisplanet", Description = "Alles ist gefroren.",
		UnlockCost = 1e9, RequiredAltitude = 120000, Gravity = 0.9, RewardMultiplier = 32,
		SkyColor = rgb(170, 220, 255), GroundColor = rgb(220, 240, 255), AccentColor = rgb(140, 230, 255) },
	{ Id = "alien", Order = 7, Name = "Alien-Planet", Description = "Futuristische, leuchtende Landschaft.",
		UnlockCost = 1.5e10, RequiredAltitude = 170000, Gravity = 0.85, RewardMultiplier = 64,
		SkyColor = rgb(40, 80, 50), GroundColor = rgb(60, 140, 70), AccentColor = rgb(120, 255, 120) },
	{ Id = "nebula", Order = 8, Name = "Nebula Galaxy", Description = "Leuchtende kosmische Wolken.",
		UnlockCost = 2.5e11, RequiredAltitude = 230000, Gravity = 0.7, RewardMultiplier = 128,
		SkyColor = rgb(90, 40, 140), GroundColor = rgb(60, 30, 100), AccentColor = rgb(255, 120, 230) },
	{ Id = "blackhole", Order = 9, Name = "Black Hole Zone", Description = "Anspruchsvolles Endgame.",
		UnlockCost = 4e12, RequiredAltitude = 320000, Gravity = 1.6, RewardMultiplier = 256,
		SkyColor = rgb(10, 5, 20), GroundColor = rgb(25, 20, 35), AccentColor = rgb(255, 170, 60) },
	{ Id = "cosmic", Order = 10, Name = "Cosmic Dimension", Description = "Seltene Endgame-Belohnungen.",
		UnlockCost = 7e13, RequiredAltitude = 450000, Gravity = 0.5, RewardMultiplier = 512,
		SkyColor = rgb(30, 10, 60), GroundColor = rgb(50, 20, 90), AccentColor = rgb(170, 110, 255) },
}

local Worlds = {}
Worlds.List = list
Worlds.ById = {} :: { [string]: WorldDef }
Worlds.StartId = "earth"
for _, world in list do
	Worlds.ById[world.Id] = world
end

return Worlds
