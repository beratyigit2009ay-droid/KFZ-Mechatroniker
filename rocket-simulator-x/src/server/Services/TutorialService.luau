--!strict
-- TutorialService.luau  (ModuleScript in ServerScriptService.Server.Services)
-- Kleines Einsteiger-Tutorial mit 3 Schritten. Der Server merkt sich den Fortschritt.
--   Schritt 0: erste Rakete starten        -> FlightService ruft advanceFrom(player, 0) nach der Landung
--   Schritt 1: ein Upgrade kaufen          -> UpgradeService ruft advanceFrom(player, 1)
--   Schritt 2: den Raketen-Shop öffnen     -> Client schickt TutorialAdvance(3)
--   Schritt 3: fertig
-- Der Client kann nur "Shop geöffnet" (2 -> 3) melden oder das Tutorial überspringen.

local DataSchemaModule = script.Parent:WaitForChild("DataSchema")
local DataSchema = require(DataSchemaModule)
local PlayerDataService = require(script.Parent:WaitForChild("PlayerDataService"))
local RemoteGuard = require(script.Parent:WaitForChild("RemoteGuard"))

local TutorialService = {}

function TutorialService.advanceFrom(player: Player, fromStep: number)
	local data = PlayerDataService.getData(player)
	if data and data.Tutorial.Step == fromStep and fromStep < DataSchema.TUTORIAL_DONE then
		data.Tutorial.Step = fromStep + 1
		PlayerDataService.markChanged(player)
	end
end

function TutorialService.init()
	RemoteGuard.onEvent("TutorialAdvance", { Rate = 1, Burst = 3, Args = { "number" } }, function(player, target: number)
		local data = PlayerDataService.getData(player)
		if data == nil or target ~= DataSchema.TUTORIAL_DONE then
			return
		end
		-- Erlaubt: Schritt 2 -> 3 (Shop geöffnet) oder Überspringen aus jedem Schritt
		if data.Tutorial.Step < DataSchema.TUTORIAL_DONE then
			data.Tutorial.Step = DataSchema.TUTORIAL_DONE
			PlayerDataService.markChanged(player)
		end
	end)
end

return TutorialService
