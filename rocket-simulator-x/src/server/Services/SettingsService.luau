--!strict
-- SettingsService.luau  (ModuleScript in ServerScriptService.Server.Services)
-- Speichert die Einstellungen des Spielers. Nur bekannte Schlüssel mit dem richtigen Typ werden angenommen.

local PlayerDataService = require(script.Parent:WaitForChild("PlayerDataService"))
local RemoteGuard = require(script.Parent:WaitForChild("RemoteGuard"))

local SettingsService = {}

-- Schlüssel -> Prüffunktion (gibt den bereinigten Wert oder nil zurück)
local validators: { [string]: (any) -> any } = {
	SfxVolume = function(value: any): any
		if type(value) ~= "number" or value ~= value then
			return nil
		end
		return math.floor(math.clamp(value, 0, 1) * 20 + 0.5) / 20 -- in 5-%-Schritten
	end,
	CameraShake = function(value: any): any
		return if type(value) == "boolean" then value else nil
	end,
	ReducedEffects = function(value: any): any
		return if type(value) == "boolean" then value else nil
	end,
}

function SettingsService.init()
	RemoteGuard.onEvent("UpdateSetting", { Rate = 5, Burst = 10, Args = { "string", "any" } }, function(player, key: string, value: any)
		local validate = validators[key]
		local data = PlayerDataService.getData(player)
		if validate == nil or data == nil then
			return
		end
		local clean = validate(value)
		if clean == nil then
			return
		end
		(data.Settings :: any)[key] = clean
		PlayerDataService.markChanged(player)
	end)
end

return SettingsService
