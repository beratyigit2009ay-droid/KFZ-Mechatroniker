--!strict
-- Economy.luau  (ModuleScript in ReplicatedStorage.Shared.Config)
-- Belohnungen, Level und Grenzen. Alle Beträge rechnet nur der Server aus.

local Economy = {
	StartCoins = 50, -- damit man sofort das erste Upgrade kaufen kann
	StartGems = 0,

	-- Belohnung pro Flug
	CoinsPerMeter = 0.01, -- Coins = Höhe (m) × CoinsPerMeter × Raketen-Bonus
	XpPerMeter = 0.01, -- XP = Höhe (m) × XpPerMeter

	-- Level-Kurve: XP für das nächste Level = LevelXpBase × Level ^ LevelXpExponent
	LevelXpBase = 60,
	LevelXpExponent = 1.45,
	MaxLevel = 500,

	-- Gems
	LevelUpGemsBase = 2, -- Gems pro Level-Up = Base + floor(Level / LevelUpGemsEvery)
	LevelUpGemsEvery = 5,
	RecordGems = 1, -- neuer Höhenrekord
	RareDropChance = 0.03, -- 3 % Chance auf einen Meteoritensplitter
	RareDropGemsMin = 2,
	RareDropGemsMax = 5,

	-- Sicherheitsgrenzen gegen kaputte Werte
	MaxCoins = 1e15,
	MaxGems = 1e9,
}

return Economy
