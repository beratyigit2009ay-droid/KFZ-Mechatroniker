--!strict
-- FlightController.luau  (ModuleScript in StarterPlayerScripts.Client.Controllers)
-- Alles, was der Spieler während eines Flugs SIEHT und HÖRT – entschieden wird nichts:
--   • schickt Start- und Boost-Anfragen an den Server (ohne Daten)
--   • Flugkamera: Rampe -> folgt der Rakete -> Gipfel -> Kapsel -> zurück zur Figur
--   • Kamerawackeln beim Start, weiteres Sichtfeld bei hoher Geschwindigkeit
--   • Motorengeräusch, das mit dem Tempo lauter und höher wird
--   • liefert jede Frame Höhe/Tempo/Treibstoff an die Anzeige (Telemetry-Signal)

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local Workspace = game:GetService("Workspace")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Remotes = require(Shared:WaitForChild("Remotes"))
local Signal = require(Shared:WaitForChild("Signal"))
local FlightConfig = require(Shared:WaitForChild("Config"):WaitForChild("Flight"))
local Rockets = require(Shared:WaitForChild("Config"):WaitForChild("Rockets"))

local SoundController = require(script.Parent:WaitForChild("SoundController"))
local DataController = require(script.Parent:WaitForChild("DataController"))

local FlightController = {}

local player = Players.LocalPlayer
local RENDER_NAME = "RocketSimFlightCamera"
local BASE_FOV = 70

export type Telemetry = {
	State: string,
	AltitudeMeters: number,
	MaxAltitudeMeters: number,
	Speed: number, -- Studs/s
	Fuel: number, -- 0..1
	Boost: number, -- 0..1
	Boosting: boolean,
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
}

FlightController.Started = Signal.new() -- (flight)       Countdown beginnt
FlightController.StateChanged = Signal.new() -- (state, flight)
FlightController.Telemetry = Signal.new() -- (Telemetry)
FlightController.Ended = Signal.new() -- (result?)       Landung (mit Ergebnis) oder Abbruch (nil)

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
	flight.EngineSound = nil
	flight.WindSound = nil
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
		flight.Orbit += dt * 0.12
		local direction = viewDirection(target)
		local around = CFrame.Angles(0, flight.Orbit, 0):VectorToWorldSpace(direction)
		local distance = flight.Height * 1.4 + 20 + math.min(flight.Speed * 0.02, 30)
		local position = target + around * distance - Vector3.new(0, flight.Height * 0.35, 0)
		camera.CFrame = CFrame.lookAt(position + shakeOffset(flight.Shake), target + Vector3.new(0, flight.Height * 0.25, 0))
		camera.FieldOfView = BASE_FOV + math.clamp(flight.Speed / 60, 0, 18)
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
			local position = target + direction * 34 + Vector3.new(0, 8, 0)
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
	if root and root.Parent and flight.State ~= "Countdown" then
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

	if kind == "Liftoff" then
		flight.Shake = 1.4
		SoundController.play("Launch")
		flight.EngineSound = SoundController.startLoop("Engine")
		flight.WindSound = SoundController.startLoop("Wind")
		setState(flight, "Burn")
	elseif kind == "Burnout" then
		SoundController.stopLoop(flight.EngineSound)
		flight.EngineSound = nil
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
				setState(flight, "Descent")
			end
		end)
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

function FlightController.init()
	Remotes.event("FlightEvent").OnClientEvent:Connect(onFlightEvent)
	-- Nach einem Respawn während des Flugs bleibt die Flugkamera aktiv; danach wieder die neue Figur
	player.CharacterAdded:Connect(function()
		if active == nil then
			task.defer(restoreCamera)
		end
	end)
end

return FlightController
