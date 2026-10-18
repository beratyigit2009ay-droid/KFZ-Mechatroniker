--!strict
-- Main.server.luau  (Script in ServerScriptService.Server)
-- Startet alle Server-Systeme in der richtigen Reihenfolge.
-- Regel: Ein Service benutzt nur Services, die VOR ihm gestartet wurden.

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Remotes = require(ReplicatedStorage:WaitForChild("Shared"):WaitForChild("Remotes"))
local Services = script.Parent:WaitForChild("Services")

-- 1. Alle RemoteEvents/RemoteFunctions anlegen (bevor ein Client sie sucht)
Remotes.createAll()

local PlayerDataService = require(Services:WaitForChild("PlayerDataService"))
local RemoteGuard = require(Services:WaitForChild("RemoteGuard"))
local MapService = require(Services:WaitForChild("MapService"))
local PadService = require(Services:WaitForChild("PadService"))
local TutorialService = require(Services:WaitForChild("TutorialService"))
local FlightService = require(Services:WaitForChild("FlightService"))
local RocketService = require(Services:WaitForChild("RocketService"))
local UpgradeService = require(Services:WaitForChild("UpgradeService"))
local SettingsService = require(Services:WaitForChild("SettingsService"))
local LeaderboardService = require(Services:WaitForChild("LeaderboardService"))
local Notifier = require(Services:WaitForChild("Notifier"))

-- 2. Services starten
PlayerDataService.init()
RemoteGuard.init()
MapService.init()
PadService.init()
TutorialService.init()
FlightService.init()
RocketService.init()
UpgradeService.init()
SettingsService.init()
LeaderboardService.init()

-- 3. Remotes, die keinem einzelnen Service gehören
RemoteGuard.onInvoke("GetData", { Rate = 2, Burst = 5, Args = {}, RequireData = false }, function(player: Player)
	local data = PlayerDataService.toClient(player)
	if data == nil then
		return { Ok = false, Message = "Lädt …" }
	end
	return { Ok = true, Data = data, Leaderboard = LeaderboardService.getTop() }
end)

RemoteGuard.onEvent("RequestLaunch", { Rate = 2, Burst = 3, Args = {} }, function(player: Player)
	local ok, message = FlightService.tryLaunch(player)
	if not ok and message then
		Notifier.send(player, message, "Error")
	end
end)

RemoteGuard.onEvent("RequestBoost", { Rate = 3, Burst = 4, Args = {} }, function(player: Player)
	FlightService.tryBoost(player)
end)

print("[Rocket Simulator X] Server gestartet")
