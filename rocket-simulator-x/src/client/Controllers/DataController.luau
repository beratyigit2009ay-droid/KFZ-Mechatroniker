--!strict
-- DataController.luau  (ModuleScript in StarterPlayerScripts.Client.Controllers)
-- Hält die letzte Kopie der Spielerdaten, die der Server geschickt hat.
-- WICHTIG: Diese Kopie ist nur zum Anzeigen. Ändern kann sie nur der Server.

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Remotes = require(Shared:WaitForChild("Remotes"))
local Signal = require(Shared:WaitForChild("Signal"))
local Types = require(Shared:WaitForChild("Types"))

local DataController = {}

DataController.Changed = Signal.new() -- (newData, oldData?)
DataController.LeaderboardChanged = Signal.new() -- (entries)

local current: Types.ClientData? = nil
local leaderboard: { any } = {}

local function apply(data: Types.ClientData)
	local old = current
	current = data
	DataController.Changed:Fire(data, old)
end

function DataController.get(): Types.ClientData?
	return current
end

function DataController.getLeaderboard(): { any }
	return leaderboard
end

-- Wartet, bis die ersten Daten da sind
function DataController.waitForData(): Types.ClientData
	while current == nil do
		task.wait(0.1)
	end
	return current :: Types.ClientData
end

function DataController.init()
	Remotes.event("DataUpdate").OnClientEvent:Connect(function(data: any)
		if type(data) == "table" then
			apply(data)
		end
	end)
	Remotes.event("LeaderboardUpdate").OnClientEvent:Connect(function(entries: any)
		if type(entries) == "table" then
			leaderboard = entries
			DataController.LeaderboardChanged:Fire(entries)
		end
	end)
	-- Falls DataUpdate schon vor uns kam: aktiv nachfragen, bis die Daten geladen sind
	task.spawn(function()
		local getData = Remotes.func("GetData")
		while current == nil do
			local ok, response = pcall(function()
				return getData:InvokeServer()
			end)
			if ok and type(response) == "table" and response.Ok and current == nil then
				apply(response.Data)
				if type(response.Leaderboard) == "table" then
					leaderboard = response.Leaderboard
					DataController.LeaderboardChanged:Fire(leaderboard)
				end
			end
			if current == nil then
				task.wait(1)
			end
		end
	end)
end

return DataController
