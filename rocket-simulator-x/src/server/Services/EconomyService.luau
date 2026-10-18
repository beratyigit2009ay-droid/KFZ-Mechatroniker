--!strict
-- EconomyService.luau  (ModuleScript in ServerScriptService.Server.Services)
-- Die EINZIGE Stelle, an der sich Coins, Gems und XP ändern.
-- Jeder Betrag wird geprüft: nur ganze, endliche, positive Zahlen; Obergrenzen aus Config/Economy.
-- Kaufen = prüfen und abziehen in einem Schritt ohne Warten dazwischen (kein Doppelkauf möglich).

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Shared = ReplicatedStorage:WaitForChild("Shared")
local Economy = require(Shared:WaitForChild("Config"):WaitForChild("Economy"))
local Formulas = require(Shared:WaitForChild("Formulas"))
local Format = require(Shared:WaitForChild("Format"))
local Signal = require(Shared:WaitForChild("Signal"))
local PlayerDataService = require(script.Parent:WaitForChild("PlayerDataService"))
local Notifier = require(script.Parent:WaitForChild("Notifier"))

local EconomyService = {}

EconomyService.LeveledUp = Signal.new() -- (player, newLevel)

local function validAmount(amount: number): boolean
	return type(amount) == "number" and amount == amount and amount >= 0 and amount < math.huge
end

local function limitFor(currency: string): number
	return if currency == "Gems" then Economy.MaxGems else Economy.MaxCoins
end

function EconomyService.getBalance(player: Player, currency: string): number
	local data = PlayerDataService.getData(player)
	if data == nil then
		return 0
	end
	return if currency == "Gems" then data.Gems else data.Coins
end

function EconomyService.canAfford(player: Player, currency: string, amount: number): boolean
	return validAmount(amount) and EconomyService.getBalance(player, currency) >= amount
end

-- Gibt Coins oder Gems. reason dient nur zur Fehlersuche.
function EconomyService.add(player: Player, currency: string, amount: number, reason: string): boolean
	local data = PlayerDataService.getData(player)
	if data == nil or not validAmount(amount) or (currency ~= "Coins" and currency ~= "Gems") then
		warn(string.format("[Economy] add abgelehnt: %s %s %s (%s)", player.Name, tostring(amount), currency, reason))
		return false
	end
	local whole = math.floor(amount)
	if currency == "Gems" then
		data.Gems = math.min(data.Gems + whole, limitFor("Gems"))
	else
		data.Coins = math.min(data.Coins + whole, limitFor("Coins"))
		data.TotalCoinsEarned = math.min(data.TotalCoinsEarned + whole, Economy.MaxCoins)
	end
	PlayerDataService.markChanged(player)
	return true
end

-- Zieht den Betrag ab, wenn genug da ist. Gibt true zurück, wenn bezahlt wurde.
function EconomyService.trySpend(player: Player, currency: string, amount: number): boolean
	local data = PlayerDataService.getData(player)
	if data == nil or not validAmount(amount) then
		return false
	end
	local whole = math.ceil(amount)
	if currency == "Gems" then
		if data.Gems < whole then
			return false
		end
		data.Gems -= whole
	elseif currency == "Coins" then
		if data.Coins < whole then
			return false
		end
		data.Coins -= whole
	else
		return false
	end
	PlayerDataService.markChanged(player)
	return true
end

-- Gibt XP und kümmert sich um Level-Ups (inkl. Gems als Belohnung). Gibt die Anzahl Level-Ups zurück.
function EconomyService.addXp(player: Player, amount: number): number
	local data = PlayerDataService.getData(player)
	if data == nil or not validAmount(amount) then
		return 0
	end
	local oldLevel = data.Level
	local newLevel, newXp, gained = Formulas.applyXp(data.Level, data.XP, math.floor(amount))
	data.Level = newLevel
	data.XP = newXp
	if gained > 0 then
		local gems = 0
		for level = oldLevel + 1, newLevel do
			gems += Formulas.levelUpGems(level)
		end
		data.Gems = math.min(data.Gems + gems, Economy.MaxGems)
		Notifier.send(player, string.format("⭐ Level %d erreicht! +%s 💎", newLevel, Format.short(gems)), "LevelUp")
		EconomyService.LeveledUp:Fire(player, newLevel)
	end
	PlayerDataService.markChanged(player)
	return gained
end

return EconomyService
