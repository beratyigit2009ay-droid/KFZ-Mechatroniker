--!strict
-- ServerLimitService.luau  (ModuleScript in ServerScriptService.Server.Services)
-- Harte Grenze: höchstens so viele Spieler pro Server, wie es Startrampen gibt (Flight.PadCount = 8).
-- Wer dazukommt, wenn der Server voll ist, wird mit einer freundlichen Meldung hinausgeschickt,
-- BEVOR seine Daten geladen werden (so bleibt sein Spielstand unberührt).
-- Zusätzlich sollte im Creator Dashboard › Places › Server Size = 8 eingestellt sein:
-- Dann schickt Roblox neue Spieler gleich auf einen anderen Server, und niemand sieht diese Meldung.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Flight = require(ReplicatedStorage:WaitForChild("Shared"):WaitForChild("Config"):WaitForChild("Flight"))

local ServerLimitService = {}

ServerLimitService.MaxPlayers = Flight.PadCount

local admitted: { [Player]: boolean } = {}
local admittedCount = 0

-- true = Spieler darf bleiben. false = Server voll, Spieler wird gekickt.
-- Darf mehrfach für denselben Spieler aufgerufen werden.
function ServerLimitService.admit(player: Player): boolean
	if admitted[player] then
		return true
	end
	if player.Parent ~= Players then
		return false
	end
	if admittedCount >= ServerLimitService.MaxPlayers then
		player:Kick(string.format("Dieser Server ist voll (%d/%d Spieler). Tritt einfach noch einmal bei, dann kommst du auf einen anderen Server!", admittedCount, ServerLimitService.MaxPlayers))
		return false
	end
	admitted[player] = true
	admittedCount += 1
	return true
end

function ServerLimitService.init()
	Players.PlayerRemoving:Connect(function(player)
		if admitted[player] then
			admitted[player] = nil
			admittedCount -= 1
		end
	end)
end

return ServerLimitService
