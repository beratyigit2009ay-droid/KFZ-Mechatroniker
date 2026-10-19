--!strict
-- UpgradeService.luau  (ModuleScript in ServerScriptService.Server.Services)
-- Upgrades kaufen. Der Client schickt nur die Upgrade-ID; Preis und Stufe rechnet der Server.

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Shared = ReplicatedStorage:WaitForChild("Shared")
local Upgrades = require(Shared:WaitForChild("Config"):WaitForChild("Upgrades"))
local Formulas = require(Shared:WaitForChild("Formulas"))
local Format = require(Shared:WaitForChild("Format"))

local Services = script.Parent
local PlayerDataService = require(Services:WaitForChild("PlayerDataService"))
local EconomyService = require(Services:WaitForChild("EconomyService"))
local RemoteGuard = require(Services:WaitForChild("RemoteGuard"))
local TutorialService = require(Services:WaitForChild("TutorialService"))

local UpgradeService = {}

function UpgradeService.buy(player: Player, upgradeId: string): RemoteGuard.Response
	local def = Upgrades.ById[upgradeId]
	local data = PlayerDataService.getData(player)
	if def == nil or data == nil then
		return { Ok = false, Message = "Unbekanntes Upgrade" }
	end
	local level = data.Upgrades[upgradeId] or 0
	local cost = Formulas.upgradeCost(upgradeId, level)
	if cost == nil then
		return { Ok = false, Message = def.Name .. " ist schon auf Maximalstufe" }
	end
	if not EconomyService.trySpend(player, def.Currency, cost) then
		local icon = if def.Currency == "Gems" then "💎" else "💰"
		return { Ok = false, Message = "Dir fehlen noch " .. Format.short(cost - EconomyService.getBalance(player, def.Currency)) .. " " .. icon }
	end
	data.Upgrades[upgradeId] = level + 1
	PlayerDataService.markChanged(player)
	TutorialService.advanceFrom(player, 1)
	return { Ok = true, Message = string.format("%s %s Stufe %d!", def.Icon, def.Name, level + 1) }
end

function UpgradeService.init()
	RemoteGuard.onInvoke("BuyUpgrade", { Rate = 6, Burst = 10, Args = { "string" } }, UpgradeService.buy)
end

return UpgradeService
