--!strict
-- SkyController.luau  (ModuleScript in StarterPlayerScripts.Client.Controllers)
-- Je höher deine Rakete fliegt, desto dunkler wird der Himmel: Der Dunst verschwindet,
-- es wird Nacht und die Sterne kommen heraus. Wie in echt hängt das an der Luftdichte:
-- schon in 30 km ist der Himmel fast schwarz, ab der Kármán-Linie (100 km) bist du im Weltall.
-- Das passiert NUR auf deinem Bildschirm (lokale Lighting-Änderung), andere Spieler sehen ihren eigenen Himmel.

local Lighting = game:GetService("Lighting")
local TweenService = game:GetService("TweenService")

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local FlightController = require(script.Parent:WaitForChild("FlightController"))
local Shared = ReplicatedStorage:WaitForChild("Shared")
local Formulas = require(Shared:WaitForChild("Formulas"))
local FlightConfig = require(Shared:WaitForChild("Config"):WaitForChild("Flight"))

local SkyController = {}

type Snapshot = {
	ClockTime: number,
	Ambient: Color3,
	OutdoorAmbient: Color3,
	ExposureCompensation: number,
	AtmosphereDensity: number?,
	AtmosphereHaze: number?,
}

local original: Snapshot? = nil
local spaceness = 0

local function atmosphere(): Atmosphere?
	return Lighting:FindFirstChildOfClass("Atmosphere")
end

local function capture(): Snapshot
	local atmo = atmosphere()
	return {
		ClockTime = Lighting.ClockTime,
		Ambient = Lighting.Ambient,
		OutdoorAmbient = Lighting.OutdoorAmbient,
		ExposureCompensation = Lighting.ExposureCompensation,
		AtmosphereDensity = if atmo then atmo.Density else nil,
		AtmosphereHaze = if atmo then atmo.Haze else nil,
	}
end

local function apply(t: number)
	local base = original
	if base == nil then
		return
	end
	-- Uhrzeit läuft von Nachmittag (14.5) bis kurz vor Mitternacht (23.8): Sterne werden sichtbar
	Lighting.ClockTime = base.ClockTime + (23.8 - base.ClockTime) * t
	Lighting.Ambient = base.Ambient:Lerp(Color3.fromRGB(40, 40, 70), t)
	Lighting.OutdoorAmbient = base.OutdoorAmbient:Lerp(Color3.fromRGB(70, 70, 110), t)
	Lighting.ExposureCompensation = base.ExposureCompensation + 0.3 * t
	local atmo = atmosphere()
	if atmo and base.AtmosphereDensity and base.AtmosphereHaze then
		atmo.Density = base.AtmosphereDensity * (1 - t)
		atmo.Haze = base.AtmosphereHaze * (1 - t)
	end
end

local function restore()
	local base = original
	if base == nil then
		return
	end
	local info = TweenInfo.new(2, Enum.EasingStyle.Quad, Enum.EasingDirection.Out)
	TweenService:Create(Lighting, info, {
		ClockTime = base.ClockTime,
		Ambient = base.Ambient,
		OutdoorAmbient = base.OutdoorAmbient,
		ExposureCompensation = base.ExposureCompensation,
	}):Play()
	local atmo = atmosphere()
	if atmo and base.AtmosphereDensity and base.AtmosphereHaze then
		TweenService:Create(atmo, info, { Density = base.AtmosphereDensity, Haze = base.AtmosphereHaze }):Play()
	end
	spaceness = 0
	original = nil
end

function SkyController.init()
	FlightController.Started:Connect(function()
		if original == nil then
			original = capture()
		end
		spaceness = 0
	end)
	FlightController.Telemetry:Connect(function(telemetry: FlightController.Telemetry)
		if original == nil then
			return
		end
		-- Wenig Luft = wenig Streulicht = dunkler Himmel (Wurzel, damit es schon früh dunkler wird)
		local density = Formulas.airDensity(telemetry.AltitudeMeters / FlightConfig.MetersPerStud)
		local target = math.clamp(1 - math.sqrt(density), 0, 1)
		-- weich nachziehen, damit nichts springt
		spaceness += (target - spaceness) * 0.08
		apply(spaceness)
	end)
	FlightController.Ended:Connect(restore)
end

return SkyController
