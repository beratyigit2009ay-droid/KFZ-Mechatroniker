--!strict
-- Formulas.luau  (ModuleScript in ReplicatedStorage.Shared)
-- Reine Rechenfunktionen ohne Nebenwirkungen. Server UND Client benutzen sie:
--   • der Server, um wirklich zu rechnen (Preise, Flugwerte, Belohnungen),
--   • der Client nur, um Vorschauen anzuzeigen ("Erwartete Höhe").
-- Hier gibt es keine Roblox-Dienste, deshalb laufen diese Funktionen auch in den automatischen Tests.

local Config = script.Parent:WaitForChild("Config")
local Rockets = require(Config:WaitForChild("Rockets"))
local Upgrades = require(Config:WaitForChild("Upgrades"))
local Economy = require(Config:WaitForChild("Economy"))
local Flight = require(Config:WaitForChild("Flight"))

local Formulas = {}

export type UpgradeLevels = { [string]: number }

export type FlightStats = {
	Thrust: number, -- Studs/s²
	BurnTime: number, -- s
	Drag: number, -- Luftwiderstands-Faktor k (Beschleunigung = k × v²)
	BoostTime: number, -- s
	BoostMultiplier: number,
	RewardMultiplier: number,
	Gravity: number, -- Studs/s²
}

export type FlightEstimate = {
	MaxAltitudeStuds: number,
	MaxAltitudeMeters: number,
	Duration: number,
	TopSpeed: number,
}

export type Reward = { Coins: number, XP: number }

local function levelOf(levels: UpgradeLevels?, id: string): number
	if levels == nil then
		return 0
	end
	local value = levels[id]
	if type(value) ~= "number" then
		return 0
	end
	return value
end

-- Kosten der NÄCHSTEN Stufe. Gibt nil zurück, wenn das Upgrade schon auf Maximalstufe ist.
function Formulas.upgradeCost(upgradeId: string, currentLevel: number): number?
	local def = Upgrades.ById[upgradeId]
	if def == nil or currentLevel >= def.MaxLevel or currentLevel < 0 then
		return nil
	end
	return math.floor(def.BaseCost * def.Growth ^ currentLevel)
end

-- Luftwiderstand so wählen, dass die Basis-Rakete genau ihre MaxSpeed erreicht.
function Formulas.dragFor(rocket: Rockets.RocketDef, gravity: number): number
	local netThrust = math.max(rocket.Thrust - gravity, 1)
	return netThrust / (rocket.MaxSpeed * rocket.MaxSpeed)
end

-- Endgültige Flugwerte aus Rakete + Upgrades (+ Welt-Schwerkraft, Standard: Erde).
function Formulas.getFlightStats(rocket: Rockets.RocketDef, levels: UpgradeLevels?, gravityFactor: number?): FlightStats
	local gravity = Flight.DefaultGravity * (gravityFactor or 1)
	local engine = Upgrades.ById.Engine
	local fuel = Upgrades.ById.Fuel
	local aero = Upgrades.ById.Aero
	local boost = Upgrades.ById.Boost

	local drag = Formulas.dragFor(rocket, Flight.DefaultGravity)
	return {
		Thrust = rocket.Thrust * (1 + engine.EffectPerLevel * levelOf(levels, "Engine")),
		BurnTime = rocket.BurnTime * (1 + fuel.EffectPerLevel * levelOf(levels, "Fuel")),
		Drag = drag * (1 - aero.EffectPerLevel) ^ levelOf(levels, "Aero"),
		BoostTime = Flight.BaseBoostTime + boost.EffectPerLevel * levelOf(levels, "Boost"),
		BoostMultiplier = Flight.BoostMultiplier,
		RewardMultiplier = rocket.RewardMultiplier,
		Gravity = gravity,
	}
end

-- Schub als Beschleunigung (Studs/s²) für den aktuellen Flugzustand.
function Formulas.thrustAcceleration(stats: FlightStats, burning: boolean, boosting: boolean): number
	if burning then
		return stats.Thrust * (if boosting then stats.BoostMultiplier else 1)
	elseif boosting then
		return stats.Thrust * Flight.CoastBoostThrust
	end
	return 0
end

-- Luftwiderstand als Beschleunigung (wirkt immer gegen die Flugrichtung).
function Formulas.dragAcceleration(stats: FlightStats, speed: number): number
	return stats.Drag * speed * speed
end

-- Rechnet einen Flug ohne Roblox-Physik nach (gleiches Modell wie der Server).
-- boostAtStart = true: Boost wird direkt beim Start benutzt.
function Formulas.simulateFlight(stats: FlightStats, boostAtStart: boolean?, dt: number?): FlightEstimate
	local step = dt or (1 / 60)
	local velocity, height, time, topSpeed = 0, 0, 0, 0
	local boostLeft = if boostAtStart then stats.BoostTime else 0
	while time < Flight.MaxFlightSeconds do
		local burning = time < stats.BurnTime
		local boosting = boostLeft > 0
		local acceleration = Formulas.thrustAcceleration(stats, burning, boosting)
			- stats.Gravity
			- Formulas.dragAcceleration(stats, velocity) * (if velocity >= 0 then 1 else -1)
		velocity += acceleration * step
		height += velocity * step
		time += step
		if boosting then
			boostLeft -= step
		end
		if velocity > topSpeed then
			topSpeed = velocity
		end
		if height >= Flight.CeilingStuds then
			height = Flight.CeilingStuds
			break
		end
		if not burning and boostLeft <= 0 and velocity <= 0 then
			break
		end
	end
	height = math.max(height, 0)
	return {
		MaxAltitudeStuds = height,
		MaxAltitudeMeters = Formulas.studsToMeters(height),
		Duration = time,
		TopSpeed = topSpeed,
	}
end

function Formulas.studsToMeters(studs: number): number
	return math.floor(studs * Flight.MetersPerStud)
end

-- Belohnung für einen Flug. multiplier = weitere Boni (Welt, Rebirth, Pets – später).
function Formulas.flightReward(altitudeMeters: number, rocket: Rockets.RocketDef, multiplier: number?): Reward
	local meters = math.max(0, altitudeMeters)
	local extra = math.max(multiplier or 1, 0)
	return {
		Coins = math.floor(meters * Economy.CoinsPerMeter * rocket.RewardMultiplier * extra),
		XP = math.floor(meters * Economy.XpPerMeter),
	}
end

-- XP, die man auf diesem Level braucht, um ins nächste Level zu kommen.
function Formulas.xpForLevel(level: number): number
	return math.floor(Economy.LevelXpBase * math.max(level, 1) ^ Economy.LevelXpExponent)
end

-- Fügt XP hinzu und gibt das neue Level, die übrigen XP und die Anzahl Level-Ups zurück.
function Formulas.applyXp(level: number, xp: number, gained: number): (number, number, number)
	local newLevel, newXp = level, xp + math.max(gained, 0)
	local levelsGained = 0
	while newLevel < Economy.MaxLevel do
		local need = Formulas.xpForLevel(newLevel)
		if newXp < need then
			break
		end
		newXp -= need
		newLevel += 1
		levelsGained += 1
	end
	if newLevel >= Economy.MaxLevel then
		newXp = 0
	end
	return newLevel, newXp, levelsGained
end

-- Gems für das Erreichen eines Levels.
function Formulas.levelUpGems(reachedLevel: number): number
	return Economy.LevelUpGemsBase + math.floor(reachedLevel / Economy.LevelUpGemsEvery)
end

-- Höchste Höhe (Studs), die der Server für diese Werte als glaubwürdig akzeptiert.
function Formulas.maxPlausibleAltitude(stats: FlightStats): number
	local withBoost = Formulas.simulateFlight(stats, true)
	return math.min(withBoost.MaxAltitudeStuds * Flight.MaxRewardTolerance + 50, Flight.CeilingStuds)
end

return Formulas
