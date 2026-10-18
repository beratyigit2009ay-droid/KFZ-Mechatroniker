--!strict
-- RocketService.luau  (ModuleScript in ServerScriptService.Server.Services)
-- Raketen kaufen und ausrüsten. Regeln:
--   • Raketen werden der Reihe nach freigeschaltet: man braucht die vorherige Rakete.
--   • Preis und Währung kommen aus Config/Rockets, nie vom Client.
--   • Wechseln geht nicht während eines Flugs.

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Shared = ReplicatedStorage:WaitForChild("Shared")
local Rockets = require(Shared:WaitForChild("Config"):WaitForChild("Rockets"))
local Format = require(Shared:WaitForChild("Format"))

local Services = script.Parent
local PlayerDataService = require(Services:WaitForChild("PlayerDataService"))
local EconomyService = require(Services:WaitForChild("EconomyService"))
local RemoteGuard = require(Services:WaitForChild("RemoteGuard"))
local PadService = require(Services:WaitForChild("PadService"))
local FlightService = require(Services:WaitForChild("FlightService"))

local RocketService = {}

local function equip(player: Player, rocketId: string): RemoteGuard.Response
	local data = PlayerDataService.getData(player)
	local rocket = Rockets.get(rocketId)
	if data == nil or rocket == nil then
		return { Ok = false, Message = "Unbekannte Rakete" }
	end
	if not data.OwnedRockets[rocketId] then
		return { Ok = false, Message = "Diese Rakete gehört dir noch nicht" }
	end
	if FlightService.isFlying(player) then
		return { Ok = false, Message = "Warte, bis dein Flug vorbei ist" }
	end
	if data.EquippedRocket ~= rocketId then
		data.EquippedRocket = rocketId
		PlayerDataService.markChanged(player)
		PadService.refreshDisplay(player)
	end
	return { Ok = true, Message = "🚀 " .. rocket.Name .. " ausgerüstet" }
end

function RocketService.buy(player: Player, rocketId: string): RemoteGuard.Response
	local data = PlayerDataService.getData(player)
	local rocket = Rockets.get(rocketId)
	if data == nil or rocket == nil then
		return { Ok = false, Message = "Unbekannte Rakete" }
	end
	if data.OwnedRockets[rocketId] then
		return { Ok = false, Message = "Die hast du schon" }
	end
	local previous = Rockets.List[rocket.Order - 1]
	if previous and not data.OwnedRockets[previous.Id] then
		return { Ok = false, Message = "Kauf zuerst " .. previous.Name }
	end
	if not EconomyService.trySpend(player, rocket.Currency, rocket.Price) then
		local icon = if rocket.Currency == "Gems" then "💎" else "💰"
		local missing = rocket.Price - EconomyService.getBalance(player, rocket.Currency)
		return { Ok = false, Message = "Dir fehlen noch " .. Format.short(missing) .. " " .. icon }
	end
	data.OwnedRockets[rocketId] = true
	PlayerDataService.markChanged(player)
	-- Neue Rakete gleich ausrüsten (außer im Flug)
	if not FlightService.isFlying(player) then
		equip(player, rocketId)
	end
	return { Ok = true, Message = "🎉 " .. rocket.Name .. " gekauft!" }
end

RocketService.equip = equip

function RocketService.init()
	RemoteGuard.onInvoke("BuyRocket", { Rate = 4, Burst = 6, Args = { "string" } }, RocketService.buy)
	RemoteGuard.onInvoke("EquipRocket", { Rate = 4, Burst = 6, Args = { "string" } }, equip)
end

return RocketService
