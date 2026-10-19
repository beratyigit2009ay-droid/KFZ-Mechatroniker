--!nocheck
-- tests/run.luau
-- Automatische Tests für alle Module, die ohne Roblox-Dienste funktionieren
-- (Konfiguration, Formeln, Wirtschaft, Datenreparatur, Migration, Rate-Limit, Zahlenformat).
--
-- Ausführen (im Ordner rocket-simulator-x):   lune run tests/run.luau
-- Lune ist eine Luau-Laufzeit für den Computer: https://lune-org.github.io/docs
--
-- So funktioniert es: Der Test-Lader baut einen kleinen Nachbau von "game" mit
-- ReplicatedStorage.Shared und ServerScriptService.Server aus den Ordnern in src/,
-- damit die Module genauso wie in Roblox mit script.Parent:WaitForChild(...) laden.

local fs = require("@lune/fs")
local luau = require("@lune/luau")
local process = require("@lune/process")
local roblox = require("@lune/roblox")
local task = require("@lune/task")

-- ===== Mini-Nachbau der Roblox-Instanzen =====

local FakeInstance = {}
FakeInstance.__index = function(self, key)
	local method = rawget(FakeInstance, key)
	if method then
		return method
	end
	local children = rawget(self, "_children")
	if children and children[key] then
		return children[key]
	end
	return nil
end

local function newFake(name: string, className: string, parent: any?, path: string?)
	local object = setmetatable({ Name = name, ClassName = className, Parent = parent, _children = {}, _path = path }, FakeInstance)
	if parent then
		parent._children[name] = object
	end
	return object
end

function FakeInstance.WaitForChild(self, name: string)
	local child = self._children[name]
	if child == nil then
		error("WaitForChild: " .. name .. " fehlt in " .. self.Name, 2)
	end
	return child
end

function FakeInstance.FindFirstChild(self, name: string)
	return self._children[name]
end

function FakeInstance.GetService(self, name: string)
	return self._children[name] or error("Service fehlt im Test: " .. name)
end

local function mountDirectory(directory: string, fake: any)
	for _, entry in fs.readDir(directory) do
		local full = directory .. "/" .. entry
		if fs.isDir(full) then
			mountDirectory(full, newFake(entry, "Folder", fake))
		else
			local name = string.match(entry, "^(.-)%.luau$")
			if name and not string.find(name, "%.server$") and not string.find(name, "%.client$") then
				newFake(name, "ModuleScript", fake, full)
			end
		end
	end
end

local game = newFake("game", "DataModel")
local replicatedStorage = newFake("ReplicatedStorage", "ReplicatedStorage", game)
local serverScriptService = newFake("ServerScriptService", "ServerScriptService", game)
mountDirectory("src/shared", newFake("Shared", "Folder", replicatedStorage))
mountDirectory("src/server", newFake("Server", "Folder", serverScriptService))
local runService = newFake("RunService", "RunService", game)
function runService.IsServer()
	return true
end
function runService.IsStudio()
	return true
end
function game.GetService(_self, name: string)
	return game._children[name] or error("Service fehlt im Test: " .. name)
end

local cache = {}
local baseEnv = getfenv()

local function fakeRequire(module: any)
	if cache[module] ~= nil then
		return cache[module]
	end
	assert(type(module) == "table" and module._path, "require braucht ein ModuleScript")
	local source = fs.readFile(module._path)
	local env = setmetatable({
		script = module,
		game = game,
		require = fakeRequire,
		task = task,
		warn = function() end,
		Color3 = roblox.Color3,
		Vector3 = roblox.Vector3,
		Vector2 = roblox.Vector2,
		CFrame = roblox.CFrame,
		Enum = roblox.Enum,
		ColorSequence = roblox.ColorSequence,
		NumberSequence = roblox.NumberSequence,
		NumberSequenceKeypoint = roblox.NumberSequenceKeypoint,
		ColorSequenceKeypoint = roblox.ColorSequenceKeypoint,
		NumberRange = roblox.NumberRange,
		UDim2 = roblox.UDim2,
		UDim = roblox.UDim,
		TweenInfo = roblox.TweenInfo,
		Instance = roblox.Instance,
		BrickColor = roblox.BrickColor,
	}, { __index = baseEnv })
	local chunk = luau.load(source, { debugName = module._path, environment = env })
	local result = chunk()
	cache[module] = result
	return result
end

local Shared = replicatedStorage.Shared
local Services = serverScriptService.Server.Services
local Rockets = fakeRequire(Shared.Config.Rockets)
local Upgrades = fakeRequire(Shared.Config.Upgrades)
local Economy = fakeRequire(Shared.Config.Economy)
local Worlds = fakeRequire(Shared.Config.Worlds)
local Flight = fakeRequire(Shared.Config.Flight)
local Formulas = fakeRequire(Shared.Formulas)
local Format = fakeRequire(Shared.Format)
local Signal = fakeRequire(Shared.Signal)
local DataSchema = fakeRequire(Services.DataSchema)
local RateLimiter = fakeRequire(Services.RateLimiter)
local RocketBuilder = fakeRequire(Shared.RocketBuilder)

-- ===== Mini-Testframework =====

local passed, failed = 0, 0
local currentGroup = ""

local function describe(name: string, body: () -> ())
	currentGroup = name
	print("\n● " .. name)
	body()
end

local function it(name: string, body: () -> ())
	local ok, err = pcall(body)
	if ok then
		passed += 1
		print("   ✓ " .. name)
	else
		failed += 1
		print("   ✗ " .. name .. "\n       " .. tostring(err))
	end
end

local function expectEqual(actual: any, expected: any, message: string?)
	if actual ~= expected then
		error(string.format("%s: erwartet %s, bekommen %s", message or "Wert", tostring(expected), tostring(actual)), 2)
	end
end

local function expectTrue(value: any, message: string)
	if not value then
		error(message, 2)
	end
end

local function zeroUpgrades()
	return { Engine = 0, Fuel = 0, Aero = 0, Boost = 0 }
end

-- ===== Tests =====

describe("Konfiguration: Raketen", function()
	it("es gibt mindestens 20 Raketen mit eindeutigen IDs", function()
		expectTrue(#Rockets.List >= 20, "zu wenige Raketen: " .. #Rockets.List)
		local seen = {}
		for _, rocket in Rockets.List do
			expectTrue(not seen[rocket.Id], "doppelte ID " .. rocket.Id)
			seen[rocket.Id] = true
			expectTrue(string.match(rocket.Id, "^[a-z]+$") ~= nil, "ID nur Kleinbuchstaben: " .. rocket.Id)
		end
	end)
	it("alle 7 Raketentypen kommen vor", function()
		local types = {}
		for _, rocket in Rockets.List do
			expectTrue(Rockets.Types[rocket.Type] ~= nil, "unbekannter Typ " .. rocket.Type)
			types[rocket.Type] = true
		end
		for _, name in { "Starter", "Fire", "Ice", "Plasma", "Alien", "Gold", "Cosmic" } do
			expectTrue(types[name], "Typ fehlt: " .. name)
		end
	end)
	it("Startrakete ist gratis, jede weitere teurer und besser", function()
		expectEqual(Rockets.List[1].Id, Rockets.StarterId, "Starter-ID")
		expectEqual(Rockets.List[1].Price, 0, "Starterpreis")
		for i = 2, #Rockets.List do
			local a, b = Rockets.List[i - 1], Rockets.List[i]
			expectTrue(b.Price > a.Price, b.Name .. " muss teurer sein als " .. a.Name)
			expectTrue(b.RewardMultiplier > a.RewardMultiplier, b.Name .. " braucht mehr Belohnung")
			local ha = Formulas.simulateFlight(Formulas.getFlightStats(a, zeroUpgrades()), false).MaxAltitudeStuds
			local hb = Formulas.simulateFlight(Formulas.getFlightStats(b, zeroUpgrades()), false).MaxAltitudeStuds
			expectTrue(hb > ha, b.Name .. " muss höher fliegen als " .. a.Name)
		end
	end)
	it("Schub ist immer größer als die Schwerkraft und Werte sind gültig", function()
		for _, rocket in Rockets.List do
			expectTrue(rocket.Thrust > Flight.DefaultGravity, rocket.Name .. ": Schub zu klein")
			expectTrue(rocket.BurnTime > 0 and rocket.MaxSpeed > 0, rocket.Name .. ": ungültige Werte")
			expectTrue(rocket.Currency == "Coins" or rocket.Currency == "Gems", rocket.Name .. ": Währung")
			local style = rocket.Style
			expectTrue(style.Fins == 3 or style.Fins == 4 or style.Fins == 6, rocket.Name .. ": Flossen")
			expectTrue(style.FinShape == "Delta" or style.FinShape == "Swept" or style.FinShape == "Wing", rocket.Name .. ": Flossenform")
			expectTrue(style.Nose == "Cone" or style.Nose == "Round" or style.Nose == "Needle", rocket.Name .. ": Nase")
			expectTrue(style.Boosters == 0 or style.Boosters == 2 or style.Boosters == 4, rocket.Name .. ": Booster")
			expectTrue(style.Height > 0 and style.Radius > 0, rocket.Name .. ": Größe")
		end
	end)
	it("Raketen fliegen nicht über die Spielfeldgrenze (auch mit allen Upgrades)", function()
		local maxed = {}
		for _, upgrade in Upgrades.List do
			maxed[upgrade.Id] = upgrade.MaxLevel
		end
		local top = Rockets.List[#Rockets.List]
		local estimate = Formulas.simulateFlight(Formulas.getFlightStats(top, maxed), true)
		expectTrue(estimate.MaxAltitudeStuds <= Flight.CeilingStuds, "Grenze überschritten")
		print(string.format("       (Top-Rakete voll ausgebaut: %s, Höchsttempo %d Studs/s)", Format.altitude(estimate.MaxAltitudeMeters), estimate.TopSpeed))
	end)
end)

describe("Konfiguration: Upgrades und Welten", function()
	it("4 Upgrades mit gültigen Werten", function()
		expectEqual(#Upgrades.List, 4, "Anzahl")
		for _, upgrade in Upgrades.List do
			expectTrue(upgrade.BaseCost > 0 and upgrade.Growth > 1 and upgrade.MaxLevel > 0, upgrade.Id)
		end
	end)
	it("10 Welten, Erde zuerst und gratis, danach steigende Kosten", function()
		expectEqual(#Worlds.List, 10, "Anzahl Welten")
		expectEqual(Worlds.List[1].Id, "earth", "erste Welt")
		expectEqual(Worlds.List[1].UnlockCost, 0, "Erde gratis")
		for i = 2, #Worlds.List do
			expectTrue(Worlds.List[i].UnlockCost > Worlds.List[i - 1].UnlockCost, "Kosten Welt " .. i)
			expectTrue(Worlds.List[i].RewardMultiplier > Worlds.List[i - 1].RewardMultiplier, "Bonus Welt " .. i)
		end
	end)
end)

describe("Formeln", function()
	it("Upgrade-Kosten wachsen und enden bei der Maximalstufe", function()
		expectEqual(Formulas.upgradeCost("Engine", 0), 40, "Motor Stufe 0")
		expectEqual(Formulas.upgradeCost("Engine", 1), 64, "Motor Stufe 1")
		expectEqual(Formulas.upgradeCost("Engine", Upgrades.ById.Engine.MaxLevel), nil, "Maximalstufe")
		expectEqual(Formulas.upgradeCost("Engine", -1), nil, "negative Stufe")
		expectEqual(Formulas.upgradeCost("Gibtsnicht", 0), nil, "unbekannt")
	end)
	it("am Boden ist MaxSpeed die Endgeschwindigkeit, oben wird die Rakete schneller", function()
		local rocket = Rockets.List[1]
		local stats = Formulas.getFlightStats(rocket, zeroUpgrades())
		local terminal = math.sqrt((stats.Thrust - stats.Gravity) / stats.Drag)
		expectTrue(math.abs(terminal - rocket.MaxSpeed) < 0.01, "Höchstgeschwindigkeit " .. terminal)
		local estimate = Formulas.simulateFlight(stats, false)
		expectTrue(estimate.TopSpeed > rocket.MaxSpeed, "in dünner Luft muss die Rakete schneller werden")
	end)
	it("echte Physik: Luft wird dünner, Schwerkraft schwächer, leere Rakete leichter", function()
		expectEqual(Formulas.airDensity(0), 1, "Boden")
		local scale = Formulas.airDensity(Flight.ScaleHeightStuds)
		expectTrue(math.abs(scale - math.exp(-1)) < 1e-9, "Skalenhöhe")
		expectTrue(Formulas.airDensity(10000) < 1e-4, "Weltall fast ohne Luft")
		expectEqual(Formulas.airDensity(-50), 1, "unter dem Boden nicht dichter als 1")
		local stats = Formulas.getFlightStats(Rockets.List[1], zeroUpgrades())
		expectEqual(Formulas.gravityAt(stats, 0), stats.Gravity, "g am Boden")
		expectTrue(Formulas.gravityAt(stats, 60000) < stats.Gravity * 0.9, "g oben schwächer")
		expectEqual(Formulas.massFactor(stats, 0), 1, "volle Tanks")
		expectTrue(math.abs(Formulas.massFactor(stats, stats.BurnTime) - (1 - Flight.FuelMassFraction)) < 1e-9, "leere Tanks")
		expectEqual(Formulas.massFactor(stats, stats.BurnTime * 5), 1 - Flight.FuelMassFraction, "nicht leichter als leer")
		local full = Formulas.thrustAcceleration(stats, true, false, 1)
		local empty = Formulas.thrustAcceleration(stats, true, false, 0.7)
		expectTrue(empty > full, "leichte Rakete beschleunigt stärker")
		expectTrue(Formulas.dragAcceleration(stats, 100, 3000) < Formulas.dragAcceleration(stats, 100, 0), "dünne Luft bremst weniger")
	end)
	it("Startbeschleunigung ist realistisch (1,2–1,8 g) und jede Rakete hebt ab", function()
		for _, rocket in Rockets.List do
			local ratio = rocket.Thrust / Flight.DefaultGravity
			expectTrue(ratio >= 1.2 and ratio <= 1.8, rocket.Name .. ": Schub/Gewicht " .. ratio)
		end
	end)
	it("Mach, Luftschichten und Belastung", function()
		expectTrue(math.abs(Formulas.mach(34.3) - 1) < 1e-9, "Mach 1")
		expectEqual(Formulas.atmosphereLayer(5000), "Troposphäre")
		expectEqual(Formulas.atmosphereLayer(30000), "Stratosphäre")
		expectEqual(Formulas.atmosphereLayer(60000), "Mesosphäre")
		expectEqual(Formulas.atmosphereLayer(90000), "Thermosphäre")
		expectEqual(Formulas.atmosphereLayer(150000), "Weltall (Thermosphäre)")
		local rocket = Rockets.List[1]
		expectTrue(math.abs(Formulas.dynamicPressure(rocket, rocket.MaxSpeed, 0) - 1) < 1e-9, "Belastung 1 bei MaxSpeed am Boden")
		expectTrue(Formulas.dynamicPressure(rocket, rocket.MaxSpeed, 5000) < 0.01, "oben fast keine Belastung")
	end)
	it("jedes Upgrade und der Boost machen den Flug höher", function()
		local rocket = Rockets.List[3]
		local base = Formulas.simulateFlight(Formulas.getFlightStats(rocket, zeroUpgrades()), false).MaxAltitudeStuds
		for _, id in { "Engine", "Fuel", "Aero" } do
			local levels = zeroUpgrades()
			levels[id] = 5
			local h = Formulas.simulateFlight(Formulas.getFlightStats(rocket, levels), false).MaxAltitudeStuds
			expectTrue(h > base, id .. " bringt nichts")
		end
		local boosted = Formulas.simulateFlight(Formulas.getFlightStats(rocket, zeroUpgrades()), true).MaxAltitudeStuds
		expectTrue(boosted > base, "Boost bringt nichts")
	end)
	it("geringere Schwerkraft (z. B. Mond) bringt mehr Höhe", function()
		local rocket = Rockets.List[1]
		local earth = Formulas.simulateFlight(Formulas.getFlightStats(rocket, zeroUpgrades(), 1), false).MaxAltitudeStuds
		local moon = Formulas.simulateFlight(Formulas.getFlightStats(rocket, zeroUpgrades(), 0.6), false).MaxAltitudeStuds
		expectTrue(moon > earth, "Mond sollte höher sein")
	end)
	it("Belohnung wird abgerundet und negative Höhen geben 0", function()
		local rocket = Rockets.List[2] -- Bonus 1.6
		local reward = Formulas.flightReward(1234, rocket, 1)
		expectEqual(reward.Coins, math.floor(1234 * Economy.CoinsPerMeter * 1.6), "Coins")
		expectEqual(reward.XP, math.floor(1234 * Economy.XpPerMeter), "XP")
		local negative = Formulas.flightReward(-500, rocket, 1)
		expectEqual(negative.Coins, 0, "negative Höhe")
		local badMultiplier = Formulas.flightReward(1000, rocket, -5)
		expectEqual(badMultiplier.Coins, 0, "negativer Multiplikator")
	end)
	it("XP: mehrere Level-Ups auf einmal und Maximallevel", function()
		local need1 = Formulas.xpForLevel(1)
		local need2 = Formulas.xpForLevel(2)
		local level, xp, gained = Formulas.applyXp(1, 0, need1 + need2 + 5)
		expectEqual(level, 3, "Level")
		expectEqual(xp, 5, "Rest-XP")
		expectEqual(gained, 2, "Level-Ups")
		local maxLevel = Formulas.applyXp(Economy.MaxLevel, 0, 1e12)
		expectEqual(maxLevel, Economy.MaxLevel, "nicht über Maximallevel")
		local same = Formulas.applyXp(5, 10, -100)
		expectEqual(same, 5, "negative XP ändern nichts")
	end)
	it("glaubwürdige Höchsthöhe liegt über der normalen Flughöhe", function()
		local stats = Formulas.getFlightStats(Rockets.List[1], zeroUpgrades())
		local normal = Formulas.simulateFlight(stats, false).MaxAltitudeStuds
		expectTrue(Formulas.maxPlausibleAltitude(stats) > normal, "Grenze zu niedrig")
	end)
end)

describe("Zahlenformat", function()
	it("kurze Zahlen", function()
		expectEqual(Format.short(0), "0")
		expectEqual(Format.short(999), "999")
		expectEqual(Format.short(1000), "1K")
		expectEqual(Format.short(1250), "1.25K")
		expectEqual(Format.short(15500), "15.5K")
		expectEqual(Format.short(3400000), "3.4M")
		expectEqual(Format.short(290000000), "290M")
		expectEqual(Format.short(-1500), "-1.5K")
		expectEqual(Format.short(0 / 0), "0")
	end)
	it("Höhen und Tausenderpunkte", function()
		expectEqual(Format.altitude(9500), "9500 m")
		expectEqual(Format.altitude(12345), "12.3 km")
		expectEqual(Format.full(1234567), "1.234.567")
		expectEqual(Format.full(999), "999")
		expectEqual(Format.multiplier(1.6), "×1.6")
		expectEqual(Format.multiplier(43), "×43")
		expectEqual(Format.multiplier(7600), "×7.6K")
	end)
end)

describe("Datenschema: Standardwerte, Reparatur, Migration", function()
	it("neue Spieler bekommen gültige Standardwerte", function()
		local data = DataSchema.defaults(100)
		expectEqual(data.Version, DataSchema.VERSION, "Version")
		expectEqual(data.Coins, Economy.StartCoins, "Startcoins")
		expectTrue(data.OwnedRockets[Rockets.StarterId], "Starter fehlt")
		expectEqual(data.EquippedRocket, Rockets.StarterId, "ausgerüstet")
		expectEqual(data.Meta.CreatedAt, 100, "CreatedAt")
	end)
	it("kaputte Werte werden repariert", function()
		local data = DataSchema.sanitize({
			Version = 1,
			Coins = "viel",
			Gems = -50,
			Level = 0 / 0,
			XP = math.huge,
			BestAltitude = -10,
			EquippedRocket = "singularitaet", -- nicht gekauft
			OwnedRockets = { pionier = true, fakerakete = true, funke = false, glutstern = "ja" },
			Upgrades = { Engine = 999, Fuel = -3, Aero = 2.7, Hack = 5 },
			Settings = { SfxVolume = 7, CameraShake = "nein" },
			Tutorial = { Step = 99 },
		}, 0)
		expectEqual(data.Coins, Economy.StartCoins, "Text statt Zahl")
		expectEqual(data.Gems, 0, "negative Gems")
		expectEqual(data.Level, 1, "NaN-Level")
		expectEqual(data.BestAltitude, 0, "negative Höhe")
		expectEqual(data.EquippedRocket, Rockets.StarterId, "nicht gekaufte Rakete")
		expectTrue(data.OwnedRockets.pionier, "gekaufte Rakete fehlt")
		expectTrue(data.OwnedRockets.funke, "Starter muss bleiben")
		expectEqual(data.OwnedRockets.fakerakete, nil, "unbekannte Rakete")
		expectEqual(data.OwnedRockets.glutstern, nil, "kein echtes true")
		expectEqual(data.Upgrades.Engine, Upgrades.ById.Engine.MaxLevel, "Upgrade über Maximum")
		expectEqual(data.Upgrades.Fuel, 0, "negatives Upgrade")
		expectEqual(data.Upgrades.Aero, 2, "Kommazahl")
		expectEqual(data.Upgrades.Hack, nil, "unbekanntes Upgrade")
		expectEqual(data.Settings.SfxVolume, 1, "Lautstärke begrenzt")
		expectEqual(data.Settings.CameraShake, true, "falscher Typ -> Standard")
		expectEqual(data.Tutorial.Step, DataSchema.TUTORIAL_DONE, "Tutorial begrenzt")
	end)
	it("gar keine Daten oder Müll -> Standardwerte", function()
		expectEqual(DataSchema.sanitize(nil, 0).Coins, Economy.StartCoins, "nil")
		expectEqual(DataSchema.sanitize("kaputt", 0).Coins, Economy.StartCoins, "Text")
		local migrated, warning = DataSchema.migrate(nil, 0)
		expectEqual(warning, nil, "neuer Spieler ohne Warnung")
		expectEqual(migrated.Version, DataSchema.VERSION, "Version")
	end)
	it("alte Daten ohne Version werden migriert und behalten ihre Werte", function()
		local migrated, warning = DataSchema.migrate({ Coins = 1234, OwnedRockets = { pionier = true } }, 0)
		expectEqual(warning, nil, "keine Warnung")
		expectEqual(migrated.Version, DataSchema.VERSION, "Version")
		expectEqual(migrated.Coins, 1234, "Coins bleiben")
		expectTrue(migrated.OwnedRockets.pionier, "Rakete bleibt")
	end)
	it("Daten aus einer neueren Version werden erkannt (nicht überschreiben!)", function()
		local _, warning = DataSchema.migrate({ Version = DataSchema.VERSION + 1, Coins = 5 }, 0)
		expectTrue(warning ~= nil, "Warnung fehlt")
	end)
	it("deepCopy ist unabhängig vom Original", function()
		local original = DataSchema.defaults(0)
		local copy = DataSchema.deepCopy(original)
		copy.Upgrades.Engine = 7
		copy.OwnedRockets.pionier = true
		expectEqual(original.Upgrades.Engine, 0, "Original verändert")
		expectEqual(original.OwnedRockets.pionier, nil, "Original verändert")
	end)
	it("Client-Kopie enthält keine internen Meta-Daten", function()
		local view = DataSchema.toClient(DataSchema.defaults(0), true)
		expectEqual(view.Meta, nil, "Meta darf nicht zum Client")
		expectEqual(view.XPNeeded, Formulas.xpForLevel(1), "XPNeeded")
		expectEqual(view.SavingEnabled, true, "SavingEnabled")
	end)
end)

describe("Rate-Limit gegen Spam", function()
	it("lässt einen Puffer durch, blockiert dann, füllt sich wieder auf", function()
		local now = 0
		local limiter = RateLimiter.new(2, 3, function()
			return now
		end)
		expectTrue(limiter:allow("a") and limiter:allow("a") and limiter:allow("a"), "Puffer")
		expectTrue(not limiter:allow("a"), "4. Anfrage muss blockiert werden")
		expectTrue(limiter:allow("b"), "andere Spieler unabhängig")
		now = 0.5 -- 0.5 s × 2/s = 1 neue Marke
		expectTrue(limiter:allow("a"), "nach Wartezeit wieder erlaubt")
		expectTrue(not limiter:allow("a"), "aber nur eine")
		now = 100
		for _ = 1, 3 do
			expectTrue(limiter:allow("a"), "voll aufgefüllt")
		end
		expectTrue(not limiter:allow("a"), "nie mehr als der Puffer")
	end)
	it("100 Spam-Anfragen in einer Sekunde: höchstens Puffer + Rate kommen durch", function()
		local now = 0
		local limiter = RateLimiter.new(4, 6, function()
			return now
		end)
		local allowed = 0
		for i = 1, 100 do
			now = i / 100
			if limiter:allow("spammer") then
				allowed += 1
			end
		end
		expectTrue(allowed <= 6 + 4, "zu viele durchgelassen: " .. allowed)
	end)
end)

describe("Raketenmodelle (mit echten Roblox-Instanzen aus Lune gebaut)", function()
	it("alle Raketen und Kapseln lassen sich bauen, Eigenschaften sind gültig", function()
		local most = 0
		for _, rocket in Rockets.List do
			local model = RocketBuilder.build(rocket)
			expectTrue(model.PrimaryPart ~= nil and model.PrimaryPart.Name == "Root", rocket.Name .. ": Root fehlt")
			local parts, welds = 0, 0
			for _, item in model:GetDescendants() do
				if item:IsA("BasePart") then
					parts += 1
					expectTrue(item.Anchored and not item.CanCollide, rocket.Name .. ": " .. item.Name .. " muss verankert und ohne Kollision sein")
				elseif item:IsA("WeldConstraint") then
					welds += 1
					expectTrue(item.Part0 == model.PrimaryPart, rocket.Name .. ": Schweißnaht nicht an Root")
				elseif item:IsA("ParticleEmitter") and item.Name ~= "IdleSparkles" then
					expectTrue(not item.Enabled, rocket.Name .. ": Motor-Effekt muss zuerst aus sein")
				end
			end
			expectEqual(welds, parts - 1, rocket.Name .. ": jedes Teil außer Root braucht eine Schweißnaht")
			expectTrue(model.PrimaryPart:FindFirstChild("ForceAttachment") ~= nil, rocket.Name .. ": ForceAttachment fehlt")
			most = math.max(most, parts)
			local capsule = RocketBuilder.buildCapsule(rocket)
			expectTrue(capsule.PrimaryPart ~= nil and capsule.PrimaryPart:FindFirstChild("ForceAttachment") ~= nil, rocket.Name .. ": Kapsel")
		end
		expectTrue(most <= 80, "zu viele Parts pro Rakete: " .. most)
		print(string.format("       (größte Rakete: %d Parts)", most))
	end)
	it("Motor an/aus schaltet Flammen, Rauch, Licht und Schweif", function()
		local model = RocketBuilder.build(Rockets.List[5])
		RocketBuilder.setEngine(model, true)
		local flame = model:FindFirstChild("EngineFlame", true)
		local trail = model:FindFirstChild("EngineTrail", true)
		local light = model:FindFirstChild("EngineLight", true)
		expectTrue(flame.Enabled and trail.Enabled and light.Enabled, "nicht eingeschaltet")
		RocketBuilder.setEngine(model, false)
		expectTrue(not flame.Enabled and not trail.Enabled and not light.Enabled, "nicht ausgeschaltet")
	end)
end)

describe("Booster-Trennung und Kapsel", function()
	it("Booster lösen sich als eigene Modelle, Rest bleibt an Root geschweißt", function()
		for _, rocket in Rockets.List do
			if rocket.Style.Boosters > 0 then
				local model = RocketBuilder.build(rocket)
				local before = #model:GetDescendants()
				local boosters = RocketBuilder.detachBoosters(model)
				expectEqual(#boosters, rocket.Style.Boosters, rocket.Name .. ": Anzahl Booster")
				for _, booster in boosters do
					local main = booster.PrimaryPart
					expectTrue(main ~= nil, rocket.Name .. ": Booster ohne PrimaryPart")
					for _, item in booster:GetDescendants() do
						if item:IsA("WeldConstraint") then
							expectTrue(item.Part0 == main, rocket.Name .. ": Booster-Teil nicht am Booster geschweißt")
						end
					end
				end
				for _, item in model:GetDescendants() do
					expectTrue(item:GetAttribute("Booster") == nil, rocket.Name .. ": Booster-Rest an der Rakete: " .. item.Name)
					if item:IsA("WeldConstraint") then
						expectTrue(item.Part0 == model.PrimaryPart, rocket.Name .. ": Schweißnaht nicht an Root")
					end
				end
				expectTrue(#model:GetDescendants() < before, rocket.Name .. ": nichts entfernt")
			else
				expectEqual(#RocketBuilder.detachBoosters(RocketBuilder.build(rocket)), 0, rocket.Name .. ": hat keine Booster")
			end
		end
	end)
	it("Kapsel: Fallschirm erst zu, Wiedereintritts-Feuer an und aus", function()
		local capsule = RocketBuilder.buildCapsule(Rockets.List[1])
		local chute = capsule:FindFirstChild("Parachute", true)
		local fire = capsule:FindFirstChild("ReentryFire", true)
		expectTrue(not fire.Enabled, "Feuer muss zuerst aus sein")
		RocketBuilder.setParachute(capsule, false)
		RocketBuilder.setReentry(capsule, true)
		expectEqual(chute.Transparency, 1, "Schirm versteckt")
		expectTrue(fire.Enabled, "Feuer an")
		RocketBuilder.setReentry(capsule, false)
		RocketBuilder.setParachute(capsule, true)
		expectTrue(chute.Transparency < 0.1 and not fire.Enabled, "Schirm offen, Feuer aus")
	end)
	it("Abgasstrahl: im Weltall breiter, ohne Rauch", function()
		local model = RocketBuilder.build(Rockets.List[5])
		RocketBuilder.setEngine(model, true)
		RocketBuilder.setPlume(model, 1)
		local flame = model:FindFirstChild("EngineFlame", true)
		local smoke = model:FindFirstChild("EngineSmoke", true)
		expectTrue(flame.SpreadAngle.X > 50, "Strahl breiter")
		expectTrue(not smoke.Enabled, "kein Rauch im Vakuum")
	end)
end)

describe("Signal", function()
	it("Handler bekommen Werte und lassen sich trennen", function()
		local signal = Signal.new()
		local received = 0
		local connection = signal:Connect(function(value)
			received += value
		end)
		signal:Fire(5)
		connection:Disconnect()
		signal:Fire(5)
		expectEqual(received, 5, "nach Disconnect kein Aufruf mehr")
	end)
end)

describe("Wirtschaft: Spielablauf-Simulation", function()
	it("jede Rakete braucht mehrere Flüge, das ganze Spiel ist weder zu schnell noch endlos", function()
		-- Ein Spieler fliegt immer wieder, kauft das günstigste Upgrade (wenn es weniger als 35 % der
		-- nächsten Rakete kostet) und die nächste Rakete, sobald er genug Coins hat. Ohne Boost-Nutzung.
		local coins = Economy.StartCoins
		local levels = zeroUpgrades()
		local owned = 1
		local flights = 0
		local seconds = 0
		local flightsPerRocket = {}
		local sinceLast = 0
		while owned < #Rockets.List and flights < 5000 do
			local rocket = Rockets.List[owned]
			local estimate = Formulas.simulateFlight(Formulas.getFlightStats(rocket, levels), false, 1 / 30)
			coins += Formulas.flightReward(estimate.MaxAltitudeMeters, rocket, 1).Coins
			flights += 1
			sinceLast += 1
			-- Countdown + Flug + Wiedereintritt/Fallschirm + Pause ≈ Flugzeit + 19 s
			seconds += estimate.Duration + Flight.CountdownSeconds + 12 + Flight.CooldownSeconds + 2
			local buying = true
			while buying do
				buying = false
				local nextRocket = Rockets.List[owned + 1]
				if nextRocket and coins >= nextRocket.Price then
					coins -= nextRocket.Price
					owned += 1
					table.insert(flightsPerRocket, sinceLast)
					sinceLast = 0
					buying = true
				else
					local bestId, bestCost = nil, math.huge
					for _, upgrade in Upgrades.List do
						if upgrade.Currency == "Coins" then
							local cost = Formulas.upgradeCost(upgrade.Id, levels[upgrade.Id])
							if cost and cost < bestCost then
								bestId, bestCost = upgrade.Id, cost
							end
						end
					end
					local limit = if nextRocket then nextRocket.Price * 0.35 else math.huge
					if bestId and coins >= bestCost and bestCost < limit then
						coins -= bestCost
						levels[bestId] += 1
						buying = true
					end
				end
			end
		end
		expectEqual(owned, #Rockets.List, "nicht alle Raketen erreichbar")
		local minutes = seconds / 60
		print(string.format("       (alle %d Raketen nach %d Flügen ≈ %d Minuten Spielzeit)", #Rockets.List, flights, math.floor(minutes)))
		print("       (Flüge pro neuer Rakete: " .. table.concat(flightsPerRocket, ", ") .. ")")
		for index, count in flightsPerRocket do
			expectTrue(count >= 2, "Rakete " .. (index + 1) .. " kommt zu schnell (nach " .. count .. " Flug)")
		end
		expectTrue(minutes >= 45, "zu schnell durchgespielt")
		expectTrue(minutes <= 600, "zu langsam")
	end)
end)

print(string.format("\n%d Tests bestanden, %d fehlgeschlagen", passed, failed))
if failed > 0 then
	process.exit(1)
end
