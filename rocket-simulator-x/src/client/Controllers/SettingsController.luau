--!strict
-- SettingsController.luau  (ModuleScript in StarterPlayerScripts.Client.Controllers)
-- Wendet die gespeicherten Einstellungen auf DEINEM Gerät an:
--   • Effekt-Lautstärke -> SoundController
--   • "Weniger Effekte" -> weniger Partikel bei Raketen und Effekten (gut für schwache Handys)

local Workspace = game:GetService("Workspace")

local DataController = require(script.Parent:WaitForChild("DataController"))
local SoundController = require(script.Parent:WaitForChild("SoundController"))

local SettingsController = {}

local REDUCED_FACTOR = 0.35
local reduced = false
local watched: { ParticleEmitter } = {}

local function applyEmitter(emitter: ParticleEmitter)
	local original = emitter:GetAttribute("OriginalRate")
	if type(original) ~= "number" then
		original = emitter.Rate
		emitter:SetAttribute("OriginalRate", original)
	end
	emitter.Rate = if reduced then (original :: number) * REDUCED_FACTOR else original :: number
	if emitter.Name == "IdleSparkles" then
		emitter.Enabled = not reduced
	end
end

local function watchFolder(name: string)
	task.spawn(function()
		local folder = Workspace:WaitForChild(name, 30)
		if folder == nil then
			return
		end
		local function consider(item: Instance)
			if item:IsA("ParticleEmitter") then
				table.insert(watched, item)
				applyEmitter(item)
				item.Destroying:Once(function()
					local index = table.find(watched, item)
					if index then
						table.remove(watched, index)
					end
				end)
			end
		end
		for _, item in folder:GetDescendants() do
			consider(item)
		end
		folder.DescendantAdded:Connect(consider)
	end)
end

function SettingsController.init()
	watchFolder("Flights")
	watchFolder("LaunchPads")
	DataController.Changed:Connect(function(data: any)
		SoundController.setMasterVolume(data.Settings.SfxVolume)
		if data.Settings.ReducedEffects ~= reduced then
			reduced = data.Settings.ReducedEffects
			for _, emitter in watched do
				applyEmitter(emitter)
			end
		end
	end)
end

return SettingsController
