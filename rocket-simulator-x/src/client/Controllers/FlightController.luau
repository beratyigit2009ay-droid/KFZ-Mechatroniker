--!strict
-- FlightController.luau  (ModuleScript in StarterPlayerScripts.Client.Controllers)
-- Alles, was der Spieler während eines Flugs SIEHT und HÖRT – entschieden wird nichts:
--   • schickt Start- und Boost-Anfragen an den Server (ohne Daten)
--   • Flugkamera: Rampe -> folgt der Rakete -> Gipfel -> Kapsel -> zurück zur Figur
--   • Kamerawackeln beim Start, weiteres Sichtfeld bei hoher Geschwindigkeit
--   • Motorengeräusch, das mit dem Tempo lauter und höher wird
--   • liefert jede Frame Höhe/Tempo/Treibstoff/Mach/G-Kraft an die Anzeige (Telemetry-Signal)
--   • Missions-Ansagen (Callout-Signal): Zündung, Max-Q, Booster-Trennung, Kármán-Linie, Wiedereintritt …
--   • Rütteln durch Luftwiderstand (Max-Q), Überschall-Dampfkegel und Hitze-Plasma an der Spitze (nur lokal)
--   • Boden-Beben für Zuschauer in der Nähe einer startenden Rakete

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local Workspace = game:GetService("Workspace")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Remotes = require(Shared:WaitForChild("Remotes"))
local Signal = require(Shared:WaitForChild("Signal"))
local FlightConfig = require(Shared:WaitForChild("Config"):WaitForChild("Flight"))
local Rockets = require(Shared:WaitForChild("Config"):WaitForChild("Rockets"))
local Formulas = require(Shared:WaitForChild("Formulas"))

local SoundController = require(script.Parent:WaitForChild("SoundController"))
local DataController = require(script.Parent:WaitForChild("DataController"))

local FlightController = {}

local player = Players.LocalPlayer
local RENDER_NAME = "RocketSimFlightCamera"
local RUMBLE_NAME = "RocketSimRumble"
local BASE_FOV = 70
local RUMBLE_RANGE = 380 -- so weit spürt man den Start einer fremden Rakete
local SMOKE_TEXTURE = "rbxasset://textures/particles/smoke_main.dds"
local FIRE_TEXTURE = "rbxasset://textures/particles/fire_main.dds"

export type Telemetry = {
	State: string,
	AltitudeMeters: number,
	MaxAltitudeMeters: number,
	Speed: number, -- Studs/s
	Fuel: number, -- 0..1
	Boost: number, -- 0..1
	Boosting: boolean,
	Mach: number,
	GForce: number, -- gefühlte Beschleunigung in g
	AirDensity: number, -- 1 = Boden, 0 = Weltall
	Layer: string, -- Name der Luftschicht
	Load: number, -- aerodynamische Belastung relativ (1 = Höchstgeschwindigkeit am Boden)
}

export type ActiveFlight = {
	Id: number,
	State: string,
	RocketId: string,
	Rocket: Rockets.RocketDef?,
	Model: Model?,
	Root: BasePart?,
	Capsule: BasePart?,
	StartY: number,
	Height: number,
	EstimateMeters: number,
	BestAltitude: number,
	MaxAltitude: number,
	LastPosition: Vector3?,
	Speed: number,
	Orbit: number,
	Shake: number,
	ApexPosition: Vector3?,
	CameraPosition: Vector3?,
	EngineSound: Sound?,
	WindSound: Sound?,
	ReentrySound: Sound?,
	LastSpeed: number,
	GForce: number,
	Load: number,
	PeakLoad: number,
	MaxQDone: boolean,
	SpaceDone: boolean,
	VaporCone: ParticleEmitter?,
	Plasma: ParticleEmitter?,
}

FlightController.Started = Signal.new() -- (flight)       Countdown beginnt
FlightController.StateChanged = Signal.new() -- (state, flight)
FlightController.Telemetry = Signal.new() -- (Telemetry)
FlightController.Ended = Signal.new() -- (result?)       Landung (mit Ergebnis) oder Abbruch (nil)
FlightController.Callout = Signal.new() -- (text, kind)  Missions-Ansage; kind = "Info" | "Warn" | "Space" | "Danger"

local active: ActiveFlight? = nil
local lastRequest = 0

local function settingOn(key: string): boolean
	local data = DataController.get()
	if data == nil then
		return true
	end
	return (data.Settings :: any)[key] == true
end

local function setState(flight: ActiveFlight, state: string)
	flight.State = state
	FlightController.StateChanged:Fire(state, flight)
end

local function restoreCamera()
	RunService:UnbindFromRenderStep(RENDER_NAME)
	local camera = Workspace.CurrentCamera
	camera.CameraType = Enum.CameraType.Custom
	camera.FieldOfView = BASE_FOV
	local character = player.Character
	local humanoid = character and character:FindFirstChildOfClass("Humanoid")
	if humanoid then
		camera.CameraSubject = humanoid
	end
end

local function stopSounds(flight: ActiveFlight)
	SoundController.stopLoop(flight.EngineSound)
	SoundController.stopLoop(flight.WindSound)
	SoundController.stopLoop(flight.ReentrySound)
	flight.EngineSound = nil
	flight.WindSound = nil
	flight.ReentrySound = nil
end

local function callout(text: string, kind: string)
	FlightController.Callout:Fire(text, kind)
end

-- Lokale Zusatz-Effekte an der eigenen Rakete (nur auf deinem Bildschirm, kosten kein Netzwerk):
--   Dampfkegel: Wasserdampf kondensiert in der Druckwelle, wenn die Rakete schnell durch dichte Luft fliegt
--   Plasma:     die Luft vor der Spitze wird so heiß, dass sie glüht
local function addLocalEffects(flight: ActiveFlight, model: Model, root: BasePart)
	if settingOn("ReducedEffects") then
		return
	end
	local rocket = flight.Rocket
	local height = flight.Height
	local rootOffset = model:GetAttribute("RootOffset")
	local offset = if type(rootOffset) == "number" then rootOffset else height * 0.45
	local radius = if rocket then rocket.Style.Radius else 2

	local coneAttachment = Instance.new("Attachment")
	coneAttachment.Name = "LocalVapor"
	coneAttachment.Position = Vector3.new(0, height * 0.6 - offset, 0)
	coneAttachment.Parent = root
	local cone = Instance.new("ParticleEmitter")
	cone.Name = "VaporCone"
	cone.Texture = SMOKE_TEXTURE
	cone.Color = ColorSequence.new(Color3.fromRGB(255, 255, 255))
	cone.LightEmission = 0.3
	cone.Size = NumberSequence.new({
		NumberSequenceKeypoint.new(0, radius * 2.2),
		NumberSequenceKeypoint.new(1, radius * 4),
	})
	cone.Transparency = NumberSequence.new({
		NumberSequenceKeypoint.new(0, 0.35),
		NumberSequenceKeypoint.new(1, 1),
	})
	cone.Lifetime = NumberRange.new(0.15, 0.3)
	cone.Speed = NumberRange.new(4, 10)
	cone.SpreadAngle = Vector2.new(70, 70)
	cone.EmissionDirection = Enum.NormalId.Bottom
	cone.LockedToPart = true
	cone.Rate = 0
	cone.Parent = coneAttachment
	flight.VaporCone = cone

	local noseAttachment = Instance.new("Attachment")
	noseAttachment.Name = "LocalPlasma"
	noseAttachment.Position = Vector3.new(0, height - offset, 0)
	noseAttachment.Parent = root
	local plasma = Instance.new("ParticleEmitter")
	plasma.Name = "Plasma"
	plasma.Texture = FIRE_TEXTURE
	plasma.Color = ColorSequence.new({
		ColorSequenceKeypoint.new(0, Color3.fromRGB(255, 240, 220)),
		ColorSequenceKeypoint.new(0.4, Color3.fromRGB(255, 120, 60)),
		ColorSequenceKeypoint.new(1, Color3.fromRGB(200, 60, 255)),
	})
	plasma.LightEmission = 1
	plasma.LightInfluence = 0
	plasma.Size = NumberSequence.new({
		NumberSequenceKeypoint.new(0, radius * 1.4),
		NumberSequenceKeypoint.new(1, radius * 0.3),
	})
	plasma.Transparency = NumberSequence.new({
		NumberSequenceKeypoint.new(0, 0.2),
		NumberSequenceKeypoint.new(1, 1),
	})
	plasma.Lifetime = NumberRange.new(0.2, 0.35)
	plasma.Speed = NumberRange.new(10, 25)
	plasma.SpreadAngle = Vector2.new(25, 25)
	plasma.EmissionDirection = Enum.NormalId.Bottom
	plasma.Rate = 0
	plasma.Parent = noseAttachment
	flight.Plasma = plasma
end

local function endFlight(result: any)
	local flight = active
	if flight == nil then
		return
	end
	stopSounds(flight)
	active = nil
	restoreCamera()
	FlightController.Ended:Fire(result)
end

local function shakeOffset(intensity: number): Vector3
	if intensity <= 0.01 or not settingOn("CameraShake") then
		return Vector3.zero
	end
	return Vector3.new(math.random() - 0.5, math.random() - 0.5, math.random() - 0.5) * intensity
end

-- Richtung von der Rakete zur Spielfigur (oder zur Platzmitte), flach auf dem Boden
local function viewDirection(from: Vector3): Vector3
	local character = player.Character
	local root = character and character:FindFirstChild("HumanoidRootPart") :: BasePart?
	local target = if root then root.Position else Vector3.zero
	local flat = Vector3.new(target.X - from.X, 0, target.Z - from.Z)
	if flat.Magnitude < 1 then
		return Vector3.new(0, 0, 1)
	end
	return flat.Unit
end

local function updateCamera(dt: number)
	local flight = active
	if flight == nil then
		return
	end
	local camera = Workspace.CurrentCamera
	camera.CameraType = Enum.CameraType.Scriptable
	flight.Shake = math.max(flight.Shake - dt * 1.5, 0)

	local root = flight.Root
	if flight.State == "Countdown" and root then
		local base = root.Position
		local direction = viewDirection(base)
		local distance = flight.Height * 1.2 + 22
		local position = base + direction * distance + Vector3.new(0, 4, 0)
		flight.Shake = math.max(flight.Shake, 0.15)
		camera.CFrame = CFrame.lookAt(position + shakeOffset(flight.Shake), base + Vector3.new(0, flight.Height * 0.15, 0))
		flight.CameraPosition = position
	elseif (flight.State == "Burn" or flight.State == "Coast") and root and root.Parent then
		local target = root.Position
		-- Tempo aus der Positionsänderung (glatt gerechnet)
		if flight.LastPosition and dt > 0 then
			local instant = (target - flight.LastPosition).Magnitude / dt
			flight.Speed += (instant - flight.Speed) * math.min(dt * 6, 1)
		end
		flight.LastPosition = target
		if dt > 0 then
			-- Gefühlte G-Kraft = (Beschleunigung + Schwerkraft) / Erdschwerkraft
			local acceleration = (flight.Speed - flight.LastSpeed) / dt
			local felt = (acceleration + Workspace.Gravity) / FlightConfig.DefaultGravity
			flight.GForce += (felt - flight.GForce) * math.min(dt * 4, 1)
		end
		flight.LastSpeed = flight.Speed

		-- Aerodynamische Belastung: Rütteln, Max-Q, Dampfkegel, Plasma
		local altitudeStuds = math.max(target.Y - flight.StartY, 0)
		local rocket = flight.Rocket
		if rocket then
			flight.Load = Formulas.dynamicPressure(rocket, flight.Speed, altitudeStuds)
			if flight.State == "Burn" then
				flight.Shake = math.max(flight.Shake, math.clamp(flight.Load, 0, 1.6) * 0.45)
			end
			if flight.Load > flight.PeakLoad then
				flight.PeakLoad = flight.Load
			elseif not flight.MaxQDone and flight.PeakLoad > 0.2 and flight.Load < flight.PeakLoad * 0.92 then
				flight.MaxQDone = true
				SoundController.play("MaxQ")
				callout("⚠️ MAX-Q: höchste Belastung durch die Luft", "Warn")
			end
			local density = Formulas.airDensity(altitudeStuds)
			local heat = density * (flight.Speed / rocket.MaxSpeed) ^ 3
			if flight.VaporCone then
				flight.VaporCone.Rate = if flight.Load > 0.35 and density > 0.08 then 70 else 0
			end
			if flight.Plasma then
				flight.Plasma.Rate = math.clamp((heat - 0.6) * 80, 0, 110)
			end
		end
		if not flight.SpaceDone and altitudeStuds * FlightConfig.MetersPerStud >= FlightConfig.KarmanLineMeters then
			flight.SpaceDone = true
			SoundController.play("Space")
			callout("🌌 KÁRMÁN-LINIE: Du bist im Weltall!", "Space")
		end

		flight.Orbit += dt * 0.12
		local direction = viewDirection(target)
		local around = CFrame.Angles(0, flight.Orbit, 0):VectorToWorldSpace(direction)
		local distance = flight.Height * 1.4 + 20 + math.min(flight.Speed * 0.02, 30)
		local position = target + around * distance - Vector3.new(0, flight.Height * 0.35, 0)
		camera.CFrame = CFrame.lookAt(position + shakeOffset(flight.Shake), target + Vector3.new(0, flight.Height * 0.25, 0))
		camera.FieldOfView = BASE_FOV + math.clamp(flight.Speed / 70, 0, 22)
		flight.CameraPosition = position
	elseif flight.State == "Apex" then
		local apex = flight.ApexPosition
		local position = flight.CameraPosition
		if apex and position then
			camera.CFrame = CFrame.lookAt(position + shakeOffset(flight.Shake), apex)
		end
		camera.FieldOfView += (BASE_FOV - camera.FieldOfView) * math.min(dt * 3, 1)
	elseif flight.State == "Descent" or flight.State == "Landed" then
		local capsule = flight.Capsule
		if capsule and capsule.Parent then
			local target = capsule.Position
			local direction = viewDirection(target)
			-- Beim Wiedereintritt etwas weiter weg und von unten: man sieht die Feuerspur
			local reentry = flight.State == "Descent" and flight.ReentrySound ~= nil
			local position = if reentry
				then target + direction * 48 - Vector3.new(0, 14, 0)
				else target + direction * 34 + Vector3.new(0, 8, 0)
			camera.CFrame = CFrame.lookAt(position + shakeOffset(flight.Shake), target + Vector3.new(0, 3, 0))
		end
		camera.FieldOfView += (BASE_FOV - camera.FieldOfView) * math.min(dt * 3, 1)
	end

	-- Motorengeräusch passend zum Tempo
	local intensity = math.clamp(flight.Speed / 600, 0.25, 1.3)
	SoundController.setLoopIntensity(flight.EngineSound, intensity, 0.8 + intensity * 0.5)
	SoundController.setLoopIntensity(flight.WindSound, math.clamp(flight.Speed / 900, 0, 1), 0.7 + intensity * 0.4)
end

local function sendTelemetry()
	local flight = active
	if flight == nil then
		return
	end
	local root = flight.Root
	local model = flight.Model
	local altitude = 0
	local altitudeStuds = 0
	if root and root.Parent and flight.State ~= "Countdown" then
		altitudeStuds = math.max(root.Position.Y - flight.StartY, 0)
		altitude = math.max(root.Position.Y - flight.StartY, 0) * FlightConfig.MetersPerStud
	elseif flight.State ~= "Countdown" then
		altitude = flight.MaxAltitude
	end
	if altitude > flight.MaxAltitude then
		flight.MaxAltitude = altitude
	end
	local fuel = if model then model:GetAttribute("Fuel") else 0
	local boost = if model then model:GetAttribute("Boost") else 0
	local boosting = if model then model:GetAttribute("Boosting") else false
	FlightController.Telemetry:Fire({
		State = flight.State,
		AltitudeMeters = altitude,
		MaxAltitudeMeters = flight.MaxAltitude,
		Speed = flight.Speed,
		Fuel = if type(fuel) == "number" then fuel else 0,
		Boost = if type(boost) == "number" then boost else 0,
		Boosting = boosting == true,
		Mach = Formulas.mach(flight.Speed),
		GForce = if flight.State == "Burn" or flight.State == "Coast" then flight.GForce else 1,
		AirDensity = Formulas.airDensity(altitudeStuds),
		Layer = Formulas.atmosphereLayer(altitude),
		Load = flight.Load,
	} :: Telemetry)
end

local function onRender(dt: number)
	updateCamera(dt)
	sendTelemetry()
end

local function findInFlights(name: string, timeout: number): Instance?
	local folder = Workspace:WaitForChild("Flights", timeout)
	if folder == nil then
		return nil
	end
	return folder:WaitForChild(name, timeout)
end

local function onFlightEvent(event: any)
	if type(event) ~= "table" or type(event.Type) ~= "string" then
		return
	end
	local kind = event.Type

	if kind == "Countdown" then
		if active then
			endFlight(nil)
		end
		local rocket = Rockets.get(event.RocketId)
		local flight: ActiveFlight = {
			Id = event.FlightId,
			State = "Countdown",
			RocketId = event.RocketId,
			Rocket = rocket,
			Model = nil,
			Root = nil,
			Capsule = nil,
			StartY = 0,
			Height = if rocket then rocket.Style.Height else 20,
			EstimateMeters = event.EstimateMeters or 0,
			BestAltitude = event.BestAltitude or 0,
			MaxAltitude = 0,
			LastPosition = nil,
			Speed = 0,
			Orbit = 0,
			Shake = 0.2,
			ApexPosition = nil,
			CameraPosition = nil,
			EngineSound = nil,
			WindSound = nil,
			ReentrySound = nil,
			LastSpeed = 0,
			GForce = 1,
			Load = 0,
			PeakLoad = 0,
			MaxQDone = false,
			SpaceDone = false,
			VaporCone = nil,
			Plasma = nil,
		}
		active = flight
		FlightController.Started:Fire(flight)
		setState(flight, "Countdown")
		task.spawn(function()
			local model = findInFlights(event.ModelName, 5)
			if active ~= flight then
				return
			end
			if model and model:IsA("Model") and model.PrimaryPart then
				flight.Model = model
				flight.Root = model.PrimaryPart
				flight.StartY = model.PrimaryPart.Position.Y
				addLocalEffects(flight, model, model.PrimaryPart)
			end
			-- auch ohne Modell binden: Gipfel- und Kapsel-Kamera funktionieren trotzdem
			RunService:BindToRenderStep(RENDER_NAME, Enum.RenderPriority.Camera.Value + 1, onRender)
		end)
		for i = 0, (event.Seconds or 3) - 1 do
			task.delay(i, function()
				if active == flight and flight.State == "Countdown" then
					SoundController.play("Countdown", 0.8 + i * 0.1)
				end
			end)
		end
		return
	end

	local flight = active
	if flight == nil or flight.Id ~= event.FlightId then
		return
	end

	if kind == "Ignition" then
		-- Motoren laufen, Rakete wird noch von den Klammern gehalten
		flight.Shake = math.max(flight.Shake, 0.8)
		SoundController.play("Ignition")
		if flight.EngineSound == nil then
			flight.EngineSound = SoundController.startLoop("Engine")
		end
		callout("🔥 ZÜNDUNG – Haltearme lösen", "Danger")
	elseif kind == "Liftoff" then
		flight.Shake = 1.8
		SoundController.play("Launch")
		if flight.EngineSound == nil then
			flight.EngineSound = SoundController.startLoop("Engine")
		end
		flight.WindSound = SoundController.startLoop("Wind")
		setState(flight, "Burn")
	elseif kind == "Staging" then
		flight.Shake = math.max(flight.Shake, 1.1)
		SoundController.play("Staging")
		callout("💥 BOOSTER-TRENNUNG", "Danger")
	elseif kind == "Burnout" then
		SoundController.stopLoop(flight.EngineSound)
		flight.EngineSound = nil
		if flight.VaporCone then
			flight.VaporCone.Rate = 0
		end
		callout("Brennschluss – die Rakete steigt ohne Antrieb weiter", "Info")
		setState(flight, "Coast")
	elseif kind == "Boost" then
		flight.Shake = math.max(flight.Shake, 0.8)
		SoundController.play("Boost")
		FlightController.StateChanged:Fire(flight.State, flight)
	elseif kind == "Apex" then
		flight.ApexPosition = event.Position
		flight.Shake = 0.6
		if type(event.AltitudeMeters) == "number" then
			flight.MaxAltitude = event.AltitudeMeters -- Server-Wert ist der echte
		end
		stopSounds(flight)
		SoundController.play("Apex")
		setState(flight, "Apex")
		task.spawn(function()
			local capsule = findInFlights("Capsule_" .. player.UserId, 6)
			if active == flight and capsule and capsule:IsA("Model") and capsule.PrimaryPart then
				flight.Capsule = capsule.PrimaryPart
				flight.ReentrySound = SoundController.startLoop("Reentry")
				flight.Shake = math.max(flight.Shake, 0.7)
				callout("☄️ WIEDEREINTRITT – Hitzeschild glüht", "Danger")
				setState(flight, "Descent")
			end
		end)
	elseif kind == "Parachute" then
		SoundController.stopLoop(flight.ReentrySound)
		flight.ReentrySound = nil
		flight.Shake = math.max(flight.Shake, 0.9)
		SoundController.play("Parachute")
		callout("🪂 FALLSCHIRM OFFEN", "Info")
	elseif kind == "Landed" then
		flight.Shake = 0.5
		SoundController.play("Landing")
		setState(flight, "Landed")
		local result = event.Result
		task.delay(1.6, function()
			if active == flight then
				endFlight(result)
			end
		end)
	elseif kind == "Cancelled" then
		endFlight(nil)
	end
end

-- ===== Öffentliche Funktionen =====

function FlightController.getActive(): ActiveFlight?
	return active
end

-- Ein Knopf für alles: am Boden = Starten, im Steigflug = Boost
function FlightController.requestLaunchOrBoost()
	local now = os.clock()
	if now - lastRequest < 0.4 then
		return -- kleine Komfort-Sperre; die echte Prüfung macht der Server
	end
	lastRequest = now
	local flight = active
	if flight == nil then
		Remotes.event("RequestLaunch"):FireServer()
	elseif flight.State == "Burn" or flight.State == "Coast" then
		Remotes.event("RequestBoost"):FireServer()
	end
end

-- Zuschauer spüren startende Raketen in der Nähe: der Boden bebt (kleines Kamerawackeln)
local function rumble()
	if active ~= nil or not settingOn("CameraShake") then
		return
	end
	local folder = Workspace:FindFirstChild("Flights")
	if folder == nil then
		return
	end
	local camera = Workspace.CurrentCamera
	local strongest = 0
	for _, model in folder:GetChildren() do
		if model:IsA("Model") and model.PrimaryPart then
			local state = model:GetAttribute("State")
			if state == "Ignition" or state == "Burn" then
				local distance = (model.PrimaryPart.Position - camera.CFrame.Position).Magnitude
				strongest = math.max(strongest, 1 - distance / RUMBLE_RANGE)
			end
		end
	end
	if strongest > 0 then
		camera.CFrame *= CFrame.new(shakeOffset(strongest * 0.5))
	end
end

function FlightController.init()
	Remotes.event("FlightEvent").OnClientEvent:Connect(onFlightEvent)
	RunService:BindToRenderStep(RUMBLE_NAME, Enum.RenderPriority.Camera.Value + 2, rumble)
	-- Nach einem Respawn während des Flugs bleibt die Flugkamera aktiv; danach wieder die neue Figur
	player.CharacterAdded:Connect(function()
		if active == nil then
			task.defer(restoreCamera)
		end
	end)
end

return FlightController
