--!strict
-- DataSchema.luau  (ModuleScript in ServerScriptService.Server.Services)
-- Beschreibt die gespeicherten Spielerdaten:
--   • Standardwerte für neue Spieler
--   • Migration: alte Daten-Versionen auf die aktuelle Version umbauen
--   • Reparatur: fehlende/kaputte Werte durch sichere Standards ersetzen
--   • toClient: die Kopie, die der Client sehen darf
-- Dieses Modul benutzt keine Roblox-Dienste und wird von den automatischen Tests geprüft.

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Shared = ReplicatedStorage:WaitForChild("Shared")
local Config = Shared:WaitForChild("Config")
local Rockets = require(Config:WaitForChild("Rockets"))
local Upgrades = require(Config:WaitForChild("Upgrades"))
local Economy = require(Config:WaitForChild("Economy"))
local Worlds = require(Config:WaitForChild("Worlds"))
local Formulas = require(Shared:WaitForChild("Formulas"))
local Types = require(Shared:WaitForChild("Types"))

local DataSchema = {}

DataSchema.VERSION = 1
DataSchema.TUTORIAL_DONE = 3

function DataSchema.defaults(now: number): Types.PlayerData
	local upgradeLevels = {}
	for _, upgrade in Upgrades.List do
		upgradeLevels[upgrade.Id] = 0
	end
	return {
		Version = DataSchema.VERSION,
		Coins = Economy.StartCoins,
		Gems = Economy.StartGems,
		XP = 0,
		Level = 1,
		BestAltitude = 0,
		TotalLaunches = 0,
		TotalCoinsEarned = 0,
		EquippedRocket = Rockets.StarterId,
		OwnedRockets = { [Rockets.StarterId] = true },
		Upgrades = upgradeLevels,
		UnlockedWorlds = { [Worlds.StartId] = true },
		CurrentWorld = Worlds.StartId,
		Rebirths = 0,
		Pets = {},
		EquippedPets = {},
		Quests = {},
		Achievements = {},
		Daily = { LastClaim = 0, Streak = 0 },
		Settings = { SfxVolume = 0.8, CameraShake = true, ReducedEffects = false },
		Tutorial = { Step = 0 },
		Meta = {
			CreatedAt = now,
			LastSaved = 0,
			SaveCount = 0,
			Lock = { JobId = "", Time = 0 },
		},
	}
end

-- Migrationen: Migrations[n] baut Daten von Version n auf Version n + 1 um.
-- Version 0 = Daten ohne Versionsfeld (z. B. aus einem frühen Test).
-- Für eine neue Version: VERSION erhöhen und hier eine Funktion ergänzen.
DataSchema.Migrations = {
	[0] = function(data: { [string]: any }): { [string]: any }
		data.Version = 1
		return data
	end,
} :: { [number]: (data: { [string]: any }) -> { [string]: any } }

local function isFiniteNumber(value: any): boolean
	return type(value) == "number" and value == value and value ~= math.huge and value ~= -math.huge
end

local function cleanInteger(value: any, fallback: number, minimum: number, maximum: number): number
	if not isFiniteNumber(value) then
		return fallback
	end
	return math.clamp(math.floor(value), minimum, maximum)
end

local function cleanBoolean(value: any, fallback: boolean): boolean
	if type(value) == "boolean" then
		return value
	end
	return fallback
end

local function cleanTable(value: any): { [any]: any }
	if type(value) == "table" then
		return value
	end
	return {}
end

-- Bringt beliebige (auch kaputte) Daten in eine gültige Form. Gibt immer gültige Daten zurück.
function DataSchema.sanitize(raw: any, now: number): Types.PlayerData
	local defaults = DataSchema.defaults(now)
	if type(raw) ~= "table" then
		return defaults
	end
	local data = defaults

	data.Coins = cleanInteger(raw.Coins, defaults.Coins, 0, Economy.MaxCoins)
	data.Gems = cleanInteger(raw.Gems, defaults.Gems, 0, Economy.MaxGems)
	data.Level = cleanInteger(raw.Level, 1, 1, Economy.MaxLevel)
	data.XP = cleanInteger(raw.XP, 0, 0, Formulas.xpForLevel(data.Level))
	data.BestAltitude = cleanInteger(raw.BestAltitude, 0, 0, 1e12)
	data.TotalLaunches = cleanInteger(raw.TotalLaunches, 0, 0, 1e12)
	data.TotalCoinsEarned = cleanInteger(raw.TotalCoinsEarned, 0, 0, Economy.MaxCoins)
	data.Rebirths = cleanInteger(raw.Rebirths, 0, 0, 1e6)

	-- Raketen: nur bekannte IDs; die Starter-Rakete gehört immer dazu
	local owned = { [Rockets.StarterId] = true }
	for id, value in cleanTable(raw.OwnedRockets) do
		if type(id) == "string" and Rockets.ById[id] and value == true then
			owned[id] = true
		end
	end
	data.OwnedRockets = owned
	if type(raw.EquippedRocket) == "string" and owned[raw.EquippedRocket] then
		data.EquippedRocket = raw.EquippedRocket
	end

	-- Upgrades: nur bekannte, im erlaubten Bereich
	local rawUpgrades = cleanTable(raw.Upgrades)
	for _, upgrade in Upgrades.List do
		data.Upgrades[upgrade.Id] = cleanInteger(rawUpgrades[upgrade.Id], 0, 0, upgrade.MaxLevel)
	end

	-- Welten (vorbereitet)
	local worlds = { [Worlds.StartId] = true }
	for id, value in cleanTable(raw.UnlockedWorlds) do
		if type(id) == "string" and Worlds.ById[id] and value == true then
			worlds[id] = true
		end
	end
	data.UnlockedWorlds = worlds
	if type(raw.CurrentWorld) == "string" and worlds[raw.CurrentWorld] then
		data.CurrentWorld = raw.CurrentWorld
	end

	-- Vorbereitete Systeme: Inhalt wird von ihren eigenen Services geprüft
	data.Pets = cleanTable(raw.Pets)
	data.EquippedPets = cleanTable(raw.EquippedPets)
	data.Quests = cleanTable(raw.Quests)
	data.Achievements = cleanTable(raw.Achievements)
	local daily = cleanTable(raw.Daily)
	data.Daily = {
		LastClaim = cleanInteger(daily.LastClaim, 0, 0, 1e11),
		Streak = cleanInteger(daily.Streak, 0, 0, 1e6),
	}

	local settings = cleanTable(raw.Settings)
	local volume = settings.SfxVolume
	data.Settings = {
		SfxVolume = if isFiniteNumber(volume) then math.clamp(volume, 0, 1) else defaults.Settings.SfxVolume,
		CameraShake = cleanBoolean(settings.CameraShake, true),
		ReducedEffects = cleanBoolean(settings.ReducedEffects, false),
	}

	data.Tutorial = { Step = cleanInteger(cleanTable(raw.Tutorial).Step, 0, 0, DataSchema.TUTORIAL_DONE) }

	local meta = cleanTable(raw.Meta)
	local lock = cleanTable(meta.Lock)
	data.Meta = {
		CreatedAt = cleanInteger(meta.CreatedAt, now, 0, 1e11),
		LastSaved = cleanInteger(meta.LastSaved, 0, 0, 1e11),
		SaveCount = cleanInteger(meta.SaveCount, 0, 0, 1e12),
		Lock = {
			JobId = if type(lock.JobId) == "string" then lock.JobId else "",
			Time = cleanInteger(lock.Time, 0, 0, 1e11),
		},
	}
	data.Version = DataSchema.VERSION
	return data
end

-- Migriert (falls nötig) und repariert. Gibt (Daten, Fehlermeldung?) zurück.
-- Daten aus einer NEUEREN Version (z. B. nach einem Rollback des Spiels) werden nicht angefasst:
-- dann kommt eine Fehlermeldung zurück und der Spieler spielt ohne Speichern weiter.
function DataSchema.migrate(raw: any, now: number): (Types.PlayerData, string?)
	if type(raw) ~= "table" then
		return DataSchema.defaults(now), nil
	end
	local version = if isFiniteNumber(raw.Version) then math.floor(raw.Version) else 0
	if version > DataSchema.VERSION then
		return DataSchema.sanitize(raw, now), "Daten stammen aus einer neueren Spielversion"
	end
	local data = raw
	while version < DataSchema.VERSION do
		local step = DataSchema.Migrations[version]
		if step == nil then
			return DataSchema.sanitize(data, now), "Migration fehlt für Version " .. version
		end
		data = step(data)
		version += 1
	end
	return DataSchema.sanitize(data, now), nil
end

-- Tiefe Kopie (z. B. bevor Daten an UpdateAsync gegeben werden)
function DataSchema.deepCopy<T>(value: T): T
	if type(value) ~= "table" then
		return value
	end
	local copy = {}
	for key, inner in value :: any do
		copy[DataSchema.deepCopy(key)] = DataSchema.deepCopy(inner)
	end
	return (copy :: any) :: T
end

function DataSchema.toClient(data: Types.PlayerData, savingEnabled: boolean): Types.ClientData
	return {
		Coins = data.Coins,
		Gems = data.Gems,
		XP = data.XP,
		XPNeeded = Formulas.xpForLevel(data.Level),
		Level = data.Level,
		BestAltitude = data.BestAltitude,
		TotalLaunches = data.TotalLaunches,
		EquippedRocket = data.EquippedRocket,
		OwnedRockets = table.clone(data.OwnedRockets),
		Upgrades = table.clone(data.Upgrades),
		Settings = table.clone(data.Settings),
		TutorialStep = data.Tutorial.Step,
		SavingEnabled = savingEnabled,
	}
end

return DataSchema
