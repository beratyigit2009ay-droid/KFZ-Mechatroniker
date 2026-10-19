--!strict
-- FlightService.luau  (ModuleScript in ServerScriptService.Server.Services)
-- Steuert jeden Raketenflug mit einer Zustandsmaschine und echter Roblox-Physik:
--
--   Idle ─► Countdown ─► Burn ─► Coast ─► Apex ─► Descent ─► Landed ─► Cooldown ─► Idle
--             (Zündung)   (Booster-Trennung)        (Wiedereintritt, Fallschirm)
--
--   • Pro Spieler gibt es höchstens EINEN Flug. Ein zweiter Start wird abgelehnt (keine Doppelstarts).
--   • Die Rakete gehört physikalisch dem Server (SetNetworkOwner(nil)). Kein Client kann sie bewegen.
--   • Schub und Luftwiderstand wirken über eine VectorForce, die jede Physik-Runde neu berechnet wird.
--     Echte Physik: Die Luft wird nach oben dünner, die Rakete wird leichter, je mehr Treibstoff verbrennt,
--     und die Schwerkraft wird mit der Höhe schwächer (alles in Formulas, gleiche Rechnung wie die Vorschau).
--   • Eine AlignOrientation hält die Rakete senkrecht.
--   • Der Server misst die Höhe selbst und vergibt die Belohnung genau einmal pro Flug.

local Debris = game:GetService("Debris")
local Players = game:GetService("Players")
local PhysicsService = game:GetService("PhysicsService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local Workspace = game:GetService("Workspace")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Config = Shared:WaitForChild("Config")
local Rockets = require(Config:WaitForChild("Rockets"))
local Economy = require(Config:WaitForChild("Economy"))
local FlightConfig = require(Config:WaitForChild("Flight"))
local Formulas = require(Shared:WaitForChild("Formulas"))
local Format = require(Shared:WaitForChild("Format"))
local Remotes = require(Shared:WaitForChild("Remotes"))
local RocketBuilder = require(Shared:WaitForChild("RocketBuilder"))

local Services = script.Parent
local PlayerDataService = require(Services:WaitForChild("PlayerDataService"))
local EconomyService = require(Services:WaitForChild("EconomyService"))
local PadService = require(Services:WaitForChild("PadService"))
local MapService = require(Services:WaitForChild("MapService"))
local EffectsService = require(Services:WaitForChild("EffectsService"))
local TutorialService = require(Services:WaitForChild("TutorialService"))
local Notifier = require(Services:WaitForChild("Notifier"))

local FlightService = {}

local CAPSULE_GROUP = "Capsules"
local CHARACTER_GROUP = "Characters"

export type FlightResult = {
	AltitudeMeters: number,
	Coins: number,
	XP: number,
	Gems: number,
	IsRecord: boolean,
	RareDrop: boolean,
	LevelUps: number,
	Level: number,
	RocketName: string,
}

type FlightRecord = {
	Id: number,
	Player: Player,
	State: string,
	Rocket: Rockets.RocketDef,
	Stats: Formulas.FlightStats,
	Pad: PadService.Pad,
	Model: Model?,
	Root: BasePart?,
	Force: VectorForce?,
	Align: AlignOrientation?,
	Mass: number,
	StartY: number,
	MaxY: number,
	Elapsed: number,
	FuelLeft: number,
	BoostLeft: number,
	Boosting: boolean,
	Staged: boolean,
	PlumeLevel: number,
	TelemetryTimer: number,
	MaxPlausible: number,
	Rewarded: boolean,
	Result: FlightResult?,
	Capsule: Model?,
	CapsuleRoot: BasePart?,
	CapsuleForce: VectorForce?,
	CapsuleMass: number,
	DescentTime: number,
	ChuteOpen: boolean,
}

local flights: { [Player]: FlightRecord } = {}
local nextFlightId = 0
local random = Random.new()

local function fire(player: Player, payload: { [string]: any })
	if player.Parent == Players then
		Remotes.event("FlightEvent"):FireClient(player, payload)
	end
end

local function isCurrent(flight: FlightRecord): boolean
	return flights[flight.Player] == flight
end

local function modelMass(model: Model): number
	local total = 0
	for _, item in model:GetDescendants() do
		if item:IsA("BasePart") then
			total += item:GetMass()
		end
	end
	return math.max(total, 0.1)
end

local function setCollisionGroup(model: Instance, group: string)
	for _, item in model:GetDescendants() do
		if item:IsA("BasePart") then
			item.CollisionGroup = group
		end
	end
end

local function makeForce(root: BasePart): VectorForce
	local attachment = root:FindFirstChild("ForceAttachment") :: Attachment
	local force = Instance.new("VectorForce")
	force.Name = "FlightForce"
	force.Attachment0 = attachment
	force.RelativeTo = Enum.ActuatorRelativeTo.World
	force.ApplyAtCenterOfMass = true
	force.Force = Vector3.zero
	force.Parent = root
	return force
end

local function destroyFlightObjects(flight: FlightRecord)
	if flight.Model then
		flight.Model:Destroy()
		flight.Model = nil
	end
	if flight.Capsule then
		flight.Capsule:Destroy()
		flight.Capsule = nil
	end
	flight.Root = nil
	flight.CapsuleRoot = nil
	if flight.Player.Parent == Players then
		flight.Player.ReplicationFocus = nil
	end
end

-- Flug komplett beenden und Rampe zurücksetzen
local function finish(flight: FlightRecord)
	if not isCurrent(flight) then
		return
	end
	destroyFlightObjects(flight)
	flights[flight.Player] = nil
	PadService.setDisplayVisible(flight.Player, true)
	PadService.setArmsOpen(flight.Pad, false)
end

local function abort(flight: FlightRecord, reason: string)
	if not isCurrent(flight) then
		return
	end
	warn("[Flight] Abbruch für " .. flight.Player.Name .. ": " .. reason)
	fire(flight.Player, { Type = "Cancelled", FlightId = flight.Id })
	finish(flight)
end

-- ===== Belohnung (genau einmal pro Flug) =====
local function grantReward(flight: FlightRecord): FlightResult?
	if flight.Rewarded then
		return flight.Result
	end
	flight.Rewarded = true
	local player = flight.Player
	local data = PlayerDataService.getData(player)
	if data == nil then
		return nil
	end

	-- Höhe kommt NUR aus der Server-Physik und wird zusätzlich auf einen glaubwürdigen Wert begrenzt
	local altitudeStuds = math.clamp(flight.MaxY - flight.StartY, 0, flight.MaxPlausible)
	local meters = Formulas.studsToMeters(altitudeStuds)
	local reward = Formulas.flightReward(meters, flight.Rocket, 1)

	local gems = 0
	local isRecord = meters > data.BestAltitude
	if isRecord then
		data.BestAltitude = meters
		gems += Economy.RecordGems
	end
	local rareDrop = random:NextNumber() < Economy.RareDropChance
	if rareDrop then
		gems += random:NextInteger(Economy.RareDropGemsMin, Economy.RareDropGemsMax)
	end
	data.TotalLaunches += 1

	EconomyService.add(player, "Coins", reward.Coins, "flight")
	if gems > 0 then
		EconomyService.add(player, "Gems", gems, "flight")
	end
	local levelUps = EconomyService.addXp(player, reward.XP)
	PlayerDataService.markChanged(player)

	local result: FlightResult = {
		AltitudeMeters = meters,
		Coins = reward.Coins,
		XP = reward.XP,
		Gems = gems,
		IsRecord = isRecord,
		RareDrop = rareDrop,
		LevelUps = levelUps,
		Level = data.Level,
		RocketName = flight.Rocket.Name,
	}
	flight.Result = result

	-- Neuer persönlicher Rekord ab 10 km: kurze Ansage an alle anderen im Server
	if isRecord and meters >= 10000 then
		local text = string.format("🏆 %s hat einen neuen Rekord: %s!", player.DisplayName, Format.altitude(meters))
		for _, other in Players:GetPlayers() do
			if other ~= player then
				Notifier.send(other, text, "Info")
			end
		end
	end
	return result
end

-- ===== Zustände =====

local function startDescent(flight: FlightRecord)
	local capsule = RocketBuilder.buildCapsule(flight.Rocket)
	capsule.Name = "Capsule_" .. flight.Player.UserId
	capsule.ModelStreamingMode = Enum.ModelStreamingMode.PersistentPerPlayer
	local drop = flight.Pad.TopCFrame * CFrame.new(FlightConfig.CapsuleSideOffset, FlightConfig.CapsuleDropHeight, 0)
	RocketBuilder.place(capsule, drop)
	-- Wiedereintritt: Kapsel kommt glühend und schnell herunter, Fallschirm noch zu
	RocketBuilder.setParachute(capsule, false)
	RocketBuilder.setReentry(capsule, true)
	setCollisionGroup(capsule, CAPSULE_GROUP)
	capsule.Parent = Workspace:WaitForChild("Flights")
	pcall(capsule.AddPersistentPlayer, capsule, flight.Player) -- nur wichtig, falls StreamingEnabled an ist

	local root = capsule.PrimaryPart :: BasePart
	flight.CapsuleMass = modelMass(capsule)
	flight.CapsuleForce = makeForce(root)
	RocketBuilder.setAnchored(capsule, false)
	pcall(function()
		root:SetNetworkOwner(nil)
	end)
	root.AssemblyLinearVelocity = Vector3.new(0, -FlightConfig.CapsuleReentrySpeed, 0)
	flight.Capsule = capsule
	flight.CapsuleRoot = root
	flight.DescentTime = 0
	flight.ChuteOpen = false
	flight.State = "Descent"
	flight.Player.ReplicationFocus = root
end

local function reachApex(flight: FlightRecord)
	if flight.State == "Apex" or not isCurrent(flight) then
		return
	end
	flight.State = "Apex"
	local root = flight.Root
	local apexPosition = if root then root.Position else flight.Pad.TopCFrame.Position
	local result = grantReward(flight)

	EffectsService.apexBurst(apexPosition, flight.Rocket.Style.Accent)
	if flight.Model then
		flight.Model:Destroy()
		flight.Model = nil
		flight.Root = nil
	end
	fire(flight.Player, {
		Type = "Apex",
		Reentry = true,
		FlightId = flight.Id,
		AltitudeMeters = if result then result.AltitudeMeters else 0,
		Position = apexPosition,
	})

	-- Kurz den Blitz zeigen, dann kommt die Kapsel
	task.delay(1.2, function()
		if isCurrent(flight) and flight.State == "Apex" then
			startDescent(flight)
		end
	end)
end

local function land(flight: FlightRecord)
	if flight.State ~= "Descent" then
		return
	end
	flight.State = "Landed"
	local capsule = flight.Capsule
	local root = flight.CapsuleRoot
	if capsule and root then
		RocketBuilder.setAnchored(capsule, true)
		RocketBuilder.setReentry(capsule, false)
		RocketBuilder.setParachute(capsule, true)
		EffectsService.landingDust(root.Position - Vector3.new(0, root.Size.Y / 2, 0))
	end
	fire(flight.Player, { Type = "Landed", FlightId = flight.Id, Result = flight.Result })
	TutorialService.advanceFrom(flight.Player, 0)

	task.delay(3, function()
		if isCurrent(flight) and (flight.State :: string) == "Landed" then
			flight.State = "Cooldown"
			destroyFlightObjects(flight)
			task.delay(FlightConfig.CooldownSeconds, finish, flight)
		end
	end)
end

-- Zündung kurz vor dem Abheben: Die Motoren laufen schon, die Rakete wird noch festgehalten.
local function ignite(flight: FlightRecord)
	if not isCurrent(flight) or flight.State ~= "Countdown" then
		return
	end
	local model = flight.Model
	if model == nil or model.Parent == nil then
		return
	end
	RocketBuilder.setEngine(model, true)
	model:SetAttribute("State", "Ignition")
	EffectsService.launchSmoke(flight.Pad.TopCFrame.Position, flight.Rocket.Style.Radius)
	fire(flight.Player, { Type = "Ignition", FlightId = flight.Id })
end

-- Booster-Trennung: Die leeren Booster werden abgesprengt und fallen trudelnd zurück.
local function separateBoosters(flight: FlightRecord)
	flight.Staged = true
	local model = flight.Model
	local root = flight.Root
	if model == nil or root == nil then
		return
	end
	local velocity = root.AssemblyLinearVelocity
	local boosters = RocketBuilder.detachBoosters(model)
	if #boosters == 0 then
		return
	end
	local folder = Workspace:FindFirstChild("Effects") or Workspace
	for _, booster in boosters do
		local main = booster.PrimaryPart
		if main then
			booster.Parent = folder
			local outward = Vector3.new(main.Position.X - root.Position.X, 0, main.Position.Z - root.Position.Z)
			local push = if outward.Magnitude > 0.01 then outward.Unit * 30 else Vector3.zero
			pcall(function()
				main:SetNetworkOwner(nil)
			end)
			-- Booster sind leer und bremsen in der Luft stark: deutlich langsamer als die Rakete
			main.AssemblyLinearVelocity = velocity * 0.55 + push
			main.AssemblyAngularVelocity = Vector3.new(random:NextNumber(-2, 2), random:NextNumber(-1, 1), random:NextNumber(-2, 2))
			EffectsService.boosterTrail(main, flight.Rocket.Style.FlameColor)
			Debris:AddItem(booster, FlightConfig.BoosterDebrisLifetime)
		end
	end
	-- Ohne Booster ist die Rakete leichter: Kraft muss zur echten Masse passen
	flight.Mass = modelMass(model)
	EffectsService.separationPuff(root.Position, flight.Rocket.Style.Accent)
	fire(flight.Player, { Type = "Staging", FlightId = flight.Id })
end

local function liftoff(flight: FlightRecord)
	if not isCurrent(flight) or flight.State ~= "Countdown" then
		return
	end
	local model = flight.Model
	local root = flight.Root
	if model == nil or root == nil or model.Parent == nil then
		abort(flight, "Modell fehlt")
		return
	end

	local force = makeForce(root)
	force.Force = Vector3.yAxis * flight.Mass * flight.Stats.Thrust
	flight.Force = force

	local align = Instance.new("AlignOrientation")
	align.Name = "Upright"
	align.Mode = Enum.OrientationAlignmentMode.OneAttachment
	align.Attachment0 = root:FindFirstChild("ForceAttachment") :: Attachment
	align.RigidityEnabled = false
	align.MaxTorque = math.huge
	align.Responsiveness = 30
	align.CFrame = flight.Pad.TopCFrame.Rotation
	align.Parent = root
	flight.Align = align

	RocketBuilder.setAnchored(model, false)
	local ok, err = pcall(function()
		root:SetNetworkOwner(nil) -- Server rechnet die Physik
	end)
	if not ok then
		warn("[Flight] SetNetworkOwner fehlgeschlagen: " .. tostring(err))
	end

	RocketBuilder.setEngine(model, true)
	flight.StartY = root.Position.Y
	flight.MaxY = flight.StartY
	flight.State = "Burn"
	flight.Player.ReplicationFocus = root
	fire(flight.Player, { Type = "Liftoff", FlightId = flight.Id })
end

-- ===== Physik-Schritt (vor jeder Physik-Runde) =====

local function stepAscent(flight: FlightRecord, dt: number)
	local root = flight.Root
	local force = flight.Force
	if root == nil or force == nil or root.Parent == nil then
		abort(flight, "Rakete verschwunden")
		return
	end
	local stats = flight.Stats
	flight.Elapsed += dt

	local burning = flight.FuelLeft > 0
	local boosting = flight.Boosting and flight.BoostLeft > 0
	if burning then
		flight.FuelLeft = math.max(flight.FuelLeft - dt, 0)
	end
	if boosting then
		flight.BoostLeft = math.max(flight.BoostLeft - dt, 0)
		if flight.BoostLeft <= 0 then
			flight.Boosting = false
			if flight.Model then
				RocketBuilder.setBoost(flight.Model, false)
			end
		end
	end

	local velocity = root.AssemblyLinearVelocity
	local speed = velocity.Magnitude
	local altitude = math.max(root.Position.Y - flight.StartY, 0)
	local mass = Formulas.massFactor(stats, stats.BurnTime - flight.FuelLeft)
	local thrust = Formulas.thrustAcceleration(stats, burning, boosting, mass)
	local drag = Formulas.dragAcceleration(stats, speed, altitude, mass)
	local dragVector = if speed > 0.01 then -velocity.Unit * drag else Vector3.zero
	-- Workspace.Gravity zieht schon nach unten. Echte Schwerkraft in dieser Höhe (und andere Welten): Unterschied ausgleichen.
	local gravityCompensation = Workspace.Gravity - Formulas.gravityAt(stats, altitude)
	force.Force = (Vector3.yAxis * (thrust + gravityCompensation) + dragVector) * flight.Mass

	-- Booster-Trennung, wenn ihr Treibstoff verbraucht ist
	if not flight.Staged and burning and (stats.BurnTime - flight.FuelLeft) >= stats.BurnTime * FlightConfig.BoosterSeparation then
		if flight.Rocket.Style.Boosters > 0 then
			separateBoosters(flight)
		else
			flight.Staged = true
		end
	end

	-- Leichtes Wackeln (nur Optik)
	local align = flight.Align
	if align then
		local w = math.rad(FlightConfig.WobbleDegrees)
		align.CFrame = flight.Pad.TopCFrame.Rotation
			* CFrame.Angles(w * math.sin(flight.Elapsed * 1.7), 0, w * math.cos(flight.Elapsed * 1.3))
	end

	local y = root.Position.Y
	if y > flight.MaxY then
		flight.MaxY = y
	end

	if flight.State == "Burn" and flight.FuelLeft <= 0 then
		flight.State = "Coast"
		if flight.Model then
			RocketBuilder.setEngine(flight.Model, false)
		end
		fire(flight.Player, { Type = "Burnout", FlightId = flight.Id })
	end

	-- Telemetrie für die Anzeige (Attribute werden automatisch an alle Clients übertragen)
	flight.TelemetryTimer += dt
	local model = flight.Model
	if model and flight.TelemetryTimer >= 1 / FlightConfig.TelemetryHz then
		flight.TelemetryTimer = 0
		model:SetAttribute("Fuel", flight.FuelLeft / math.max(stats.BurnTime, 0.01))
		model:SetAttribute("Boost", flight.BoostLeft / math.max(stats.BoostTime, 0.01))
		model:SetAttribute("Boosting", flight.Boosting)
		model:SetAttribute("State", flight.State)
		-- Abgasstrahl wird in dünner Luft breiter (nur bei spürbarer Änderung, spart Netzwerk)
		local vacuum = 1 - Formulas.airDensity(altitude)
		if math.abs(vacuum - flight.PlumeLevel) > 0.05 then
			flight.PlumeLevel = vacuum
			RocketBuilder.setPlume(model, vacuum)
		end
	end

	local apexReached = flight.State == "Coast" and not flight.Boosting and velocity.Y <= 0
	altitude = y - flight.StartY
	if apexReached or altitude >= FlightConfig.CeilingStuds or flight.Elapsed >= FlightConfig.MaxFlightSeconds then
		reachApex(flight)
	end
end

local function stepDescent(flight: FlightRecord, dt: number)
	local root = flight.CapsuleRoot
	local force = flight.CapsuleForce
	if root == nil or force == nil or root.Parent == nil then
		abort(flight, "Kapsel verschwunden")
		return
	end
	flight.DescentTime += dt
	local velocity = root.AssemblyLinearVelocity
	local gravity = Workspace.Gravity
	local bottom = root.Position.Y - root.Size.Y / 2

	-- Fallschirm öffnet in ParachuteHeight über dem Boden
	if not flight.ChuteOpen and bottom - MapService.GroundY <= FlightConfig.ParachuteHeight then
		flight.ChuteOpen = true
		local capsule = flight.Capsule
		if capsule then
			RocketBuilder.setReentry(capsule, false)
			RocketBuilder.setParachute(capsule, true)
		end
		EffectsService.parachutePuff(root.Position + Vector3.new(0, 10, 0))
		fire(flight.Player, { Type = "Parachute", FlightId = flight.Id })
	end

	-- Luftwiderstand wächst mit der Sinkgeschwindigkeit². Ohne Schirm: schneller Fall (Wiedereintritt),
	-- mit Schirm: sanftes Sinken (CapsuleTerminalSpeed). Beim Aufgehen gibt es einen kräftigen Ruck.
	local terminal = if flight.ChuteOpen then FlightConfig.CapsuleTerminalSpeed else FlightConfig.CapsuleReentrySpeed
	local down = math.max(-velocity.Y, 0)
	local lift = math.min(gravity * (down / terminal) ^ 2, gravity * (if flight.ChuteOpen then 4 else 2.5))
	local horizontal = Vector3.new(velocity.X, 0, velocity.Z) * -2
	force.Force = (Vector3.yAxis * lift + horizontal) * flight.CapsuleMass

	local onGround = bottom - MapService.GroundY < 0.8 and math.abs(velocity.Y) < 6
	if onGround or flight.DescentTime >= FlightConfig.CapsuleTimeout then
		land(flight)
	end
end

local function step(dt: number)
	for _, flight in flights do
		if flight.State == "Burn" or flight.State == "Coast" then
			stepAscent(flight, dt)
		elseif flight.State == "Descent" then
			stepDescent(flight, dt)
		end
	end
end

-- ===== Öffentliche Funktionen =====

function FlightService.isFlying(player: Player): boolean
	return flights[player] ~= nil
end

-- Start-Anfrage. Gibt (ok, Meldung?) zurück. Prüft alles auf dem Server.
function FlightService.tryLaunch(player: Player): (boolean, string?)
	if flights[player] then
		return false, nil -- läuft schon: still ignorieren (verhindert Doppelstarts)
	end
	local data = PlayerDataService.getData(player)
	if data == nil then
		return false, "Deine Daten werden noch geladen …"
	end
	local pad = PadService.getPad(player)
	if pad == nil then
		return false, "Du hast noch keine Startrampe."
	end
	local rocket = Rockets.get(data.EquippedRocket)
	if rocket == nil then
		return false, "Unbekannte Rakete."
	end

	nextFlightId += 1
	local stats = Formulas.getFlightStats(rocket, data.Upgrades)
	local flight: FlightRecord = {
		Id = nextFlightId,
		Player = player,
		State = "Countdown",
		Rocket = rocket,
		Stats = stats,
		Pad = pad,
		Model = nil,
		Root = nil,
		Force = nil,
		Align = nil,
		Mass = 1,
		StartY = 0,
		MaxY = 0,
		Elapsed = 0,
		FuelLeft = stats.BurnTime,
		BoostLeft = stats.BoostTime,
		Boosting = false,
		Staged = false,
		PlumeLevel = 0,
		TelemetryTimer = 0,
		MaxPlausible = Formulas.maxPlausibleAltitude(stats),
		Rewarded = false,
		Result = nil,
		Capsule = nil,
		CapsuleRoot = nil,
		CapsuleForce = nil,
		CapsuleMass = 1,
		DescentTime = 0,
		ChuteOpen = false,
	}
	flights[player] = flight

	-- Flugmodell an die Stelle der Ausstellungs-Rakete setzen
	local model = RocketBuilder.build(rocket)
	model.Name = "Flight_" .. player.UserId
	model.ModelStreamingMode = Enum.ModelStreamingMode.PersistentPerPlayer
	RocketBuilder.place(model, pad.TopCFrame)
	model:SetAttribute("OwnerUserId", player.UserId)
	model:SetAttribute("Fuel", 1)
	model:SetAttribute("Boost", 1)
	model:SetAttribute("State", "Countdown")
	PadService.setDisplayVisible(player, false)
	model.Parent = Workspace:WaitForChild("Flights")
	pcall(model.AddPersistentPlayer, model, player) -- nur wichtig, falls StreamingEnabled an ist
	flight.Model = model
	flight.Root = model.PrimaryPart
	flight.Mass = modelMass(model)

	PadService.setArmsOpen(pad, true)

	local estimate = Formulas.simulateFlight(stats, false)
	fire(player, {
		Type = "Countdown",
		FlightId = flight.Id,
		Seconds = FlightConfig.CountdownSeconds,
		ModelName = model.Name,
		RocketId = rocket.Id,
		PadY = pad.TopCFrame.Position.Y,
		EstimateMeters = estimate.MaxAltitudeMeters,
		BestAltitude = data.BestAltitude,
	})
	task.delay(math.max(FlightConfig.CountdownSeconds - FlightConfig.IgnitionLead, 0), ignite, flight)
	task.delay(FlightConfig.CountdownSeconds, liftoff, flight)
	return true, nil
end

-- Boost-Anfrage: nur im Steigflug, nur wenn Boost übrig ist, nur einmal pro Flug
function FlightService.tryBoost(player: Player)
	local flight = flights[player]
	if flight == nil or (flight.State ~= "Burn" and flight.State ~= "Coast") then
		return
	end
	if flight.Boosting or flight.BoostLeft <= 0 then
		return
	end
	flight.Boosting = true
	if flight.Model then
		RocketBuilder.setBoost(flight.Model, true)
	end
	fire(player, { Type = "Boost", FlightId = flight.Id })
end

function FlightService.init()
	pcall(function()
		PhysicsService:RegisterCollisionGroup(CAPSULE_GROUP)
	end)
	pcall(function()
		PhysicsService:RegisterCollisionGroup(CHARACTER_GROUP)
	end)
	PhysicsService:CollisionGroupSetCollidable(CAPSULE_GROUP, CHARACTER_GROUP, false)

	-- Spielerfiguren in die Gruppe "Characters", damit Kapseln niemanden umwerfen
	local function onCharacter(character: Model)
		setCollisionGroup(character, CHARACTER_GROUP)
		character.DescendantAdded:Connect(function(item)
			if item:IsA("BasePart") then
				item.CollisionGroup = CHARACTER_GROUP
			end
		end)
	end
	local function onPlayer(player: Player)
		player.CharacterAdded:Connect(onCharacter)
		if player.Character then
			onCharacter(player.Character)
		end
	end
	Players.PlayerAdded:Connect(onPlayer)
	for _, player in Players:GetPlayers() do
		onPlayer(player)
	end

	RunService.PreSimulation:Connect(step)

	PadService.PromptTriggered:Connect(function(player: Player)
		local ok, message = FlightService.tryLaunch(player)
		if not ok and message then
			Notifier.send(player, message, "Error")
		end
	end)

	Players.PlayerRemoving:Connect(function(player)
		local flight = flights[player]
		if flight then
			destroyFlightObjects(flight)
			flights[player] = nil
		end
	end)
end

return FlightService
