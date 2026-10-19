--!strict
-- PadController.luau  (ModuleScript in StarterPlayerScripts.Client.Controllers)
-- Zeigt den "Rakete starten"-Prompt nur an DEINER Rampe und nur, wenn du gerade nicht fliegst.
-- (Nur Komfort: Der Server prüft beim Auslösen sowieso, wem die Rampe gehört.)

local Players = game:GetService("Players")
local Workspace = game:GetService("Workspace")

local FlightController = require(script.Parent:WaitForChild("FlightController"))

local PadController = {}

local player = Players.LocalPlayer

local function promptOf(pad: Instance): ProximityPrompt?
	local found = pad:FindFirstChild("LaunchPrompt", true)
	return if found and found:IsA("ProximityPrompt") then found else nil
end

local function refresh(pad: Instance)
	local prompt = promptOf(pad)
	if prompt then
		prompt.Enabled = pad:GetAttribute("OwnerUserId") == player.UserId and FlightController.getActive() == nil
	end
end

local function refreshAll(folder: Instance)
	for _, pad in folder:GetChildren() do
		refresh(pad)
	end
end

function PadController.init()
	task.spawn(function()
		local folder = Workspace:WaitForChild("LaunchPads")
		local function watch(pad: Instance)
			pad:GetAttributeChangedSignal("OwnerUserId"):Connect(function()
				refresh(pad)
			end)
			-- Prompt kann ein paar Frames nach dem Modell ankommen
			pad.DescendantAdded:Connect(function(item)
				if item:IsA("ProximityPrompt") then
					refresh(pad)
				end
			end)
			refresh(pad)
		end
		folder.ChildAdded:Connect(watch)
		for _, pad in folder:GetChildren() do
			watch(pad)
		end
		FlightController.StateChanged:Connect(function()
			refreshAll(folder)
		end)
		FlightController.Ended:Connect(function()
			refreshAll(folder)
		end)
	end)
end

return PadController
