-- Effekte.lua
-- Explosionen, Rauch, Schüsse und Abfangraketen.
-- Wird von Raketen, Panzern und Jets gemeinsam benutzt.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local TweenService = game:GetService("TweenService")
local Debris = game:GetService("Debris")

local Config = require(ReplicatedStorage.Shared.Config)
local Modelle = require(script.Parent.Modelle)

local Effekte = {}

-- Ordner für alles, was gerade fliegt oder fährt
local ordner = Instance.new("Folder")
ordner.Name = "Kampf"
ordner.Parent = workspace
Effekte.ordner = ordner

-- CFrame an Position pos, das in Richtung "richtung" zeigt
function Effekte.ausrichten(pos: Vector3, richtung: Vector3): CFrame
	if richtung.Magnitude < 0.001 then
		return CFrame.new(pos)
	end
	local oben = Vector3.yAxis
	if math.abs(richtung.Unit:Dot(oben)) > 0.99 then
		oben = Vector3.zAxis -- fast senkrecht: anderen "Oben"-Vektor nehmen
	end
	return CFrame.lookAt(pos, pos + richtung, oben)
end

-- Eine Rauchwolke an einer Stelle
function Effekte.rauchwolke(pos: Vector3, anzahl: number, groesse: number, farbe: Color3)
	local halter = Modelle.teil(ordner, {
		Name = "Rauchwolke",
		Size = Vector3.one,
		Transparency = 1,
		CanCollide = false,
		CanQuery = false,
		CanTouch = false,
		CFrame = CFrame.new(pos),
	})
	local rauch = Instance.new("ParticleEmitter")
	rauch.Texture = "rbxasset://textures/particles/smoke_main.dds"
	rauch.Color = ColorSequence.new(farbe)
	rauch.Size = NumberSequence.new(groesse, groesse * 3)
	rauch.Transparency = NumberSequence.new(0.2, 1)
	rauch.Lifetime = NumberRange.new(3, 6)
	rauch.Speed = NumberRange.new(groesse, groesse * 3)
	rauch.SpreadAngle = Vector2.new(180, 180)
	rauch.Drag = 2
	rauch.Rotation = NumberRange.new(0, 360)
	rauch.RotSpeed = NumberRange.new(-20, 20)
	rauch.Enabled = false
	rauch.Parent = halter
	rauch:Emit(anzahl)
	Debris:AddItem(halter, 8)
end

-- Explosion mit Lichtblitz, Feuerball, Druckwelle, Funken, Trümmern und Rauch
-- (nur Optik, der Schaden wird extra berechnet)
function Effekte.explosion(pos: Vector3, radius: number)
	local ex = Instance.new("Explosion")
	ex.Position = pos
	ex.BlastRadius = radius
	ex.BlastPressure = 0 -- nichts wegschleudern
	ex.DestroyJointRadiusPercent = 0 -- Spieler nicht sofort töten
	ex.Parent = workspace -- die Spieler-Kamera wackelt dabei (siehe Kamera.client.lua)

	local function effektTeil(eigenschaften)
		eigenschaften.CanCollide = false
		eigenschaften.CanQuery = false
		eigenschaften.CanTouch = false
		eigenschaften.CastShadow = false
		return Modelle.teil(ordner, eigenschaften)
	end

	-- heller Kern und Feuerball, die größer und durchsichtig werden
	local kern = effektTeil({
		Name = "Kern",
		Shape = Enum.PartType.Ball,
		Size = Vector3.one * 2,
		CFrame = CFrame.new(pos),
		Color = Color3.fromRGB(255, 250, 220),
		Material = Enum.Material.Neon,
	})
	TweenService:Create(kern, TweenInfo.new(0.25), { Size = Vector3.one * radius * 0.7, Transparency = 1 }):Play()
	Debris:AddItem(kern, 0.3)

	local ball = effektTeil({
		Name = "Feuerball",
		Shape = Enum.PartType.Ball,
		Size = Vector3.one * 2,
		CFrame = CFrame.new(pos),
		Color = Color3.fromRGB(255, 140, 40),
		Material = Enum.Material.Neon,
		Transparency = 0.1,
	})
	local licht = Instance.new("PointLight")
	licht.Color = Color3.fromRGB(255, 160, 60)
	licht.Brightness = 12
	licht.Range = math.min(radius * 3, 60)
	licht.Shadows = true
	licht.Parent = ball
	TweenService:Create(ball, TweenInfo.new(0.7, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
		Size = Vector3.one * radius * 1.3,
		Transparency = 1,
		Color = Color3.fromRGB(120, 40, 20),
	}):Play()
	TweenService:Create(licht, TweenInfo.new(1.2), { Brightness = 0 }):Play()
	Debris:AddItem(ball, 1.3)

	-- Druckwelle: flacher Ring, der schnell auseinanderläuft
	local ring = effektTeil({
		Name = "Druckwelle",
		Shape = Enum.PartType.Cylinder,
		Size = Vector3.new(0.4, 2, 2),
		CFrame = CFrame.new(pos + Vector3.new(0, 0.5, 0)) * CFrame.Angles(0, 0, math.rad(90)),
		Color = Color3.fromRGB(255, 230, 200),
		Material = Enum.Material.Neon,
		Transparency = 0.3,
	})
	TweenService:Create(ring, TweenInfo.new(0.5, Enum.EasingStyle.Quart, Enum.EasingDirection.Out), {
		Size = Vector3.new(0.2, radius * 3.2, radius * 3.2),
		Transparency = 1,
	}):Play()
	Debris:AddItem(ring, 0.6)

	-- Funken, die in alle Richtungen fliegen und herunterfallen
	local funkenHalter = effektTeil({ Name = "Funken", Size = Vector3.one, Transparency = 1, CFrame = CFrame.new(pos) })
	local funken = Instance.new("ParticleEmitter")
	funken.Texture = "rbxasset://textures/particles/fire_main.dds"
	funken.Color = ColorSequence.new(Color3.fromRGB(255, 230, 150), Color3.fromRGB(255, 90, 20))
	funken.LightEmission = 1
	funken.Size = NumberSequence.new(0.8, 0)
	funken.Lifetime = NumberRange.new(0.6, 1.4)
	funken.Speed = NumberRange.new(radius * 1.5, radius * 3)
	funken.SpreadAngle = Vector2.new(180, 180)
	funken.Acceleration = Vector3.new(0, -60, 0)
	funken.Drag = 1
	funken.Enabled = false
	funken.Parent = funkenHalter
	funken:Emit(math.floor(20 + radius))
	Debris:AddItem(funkenHalter, 2)

	-- ein paar dunkle Trümmer fliegen weg
	for _ = 1, math.clamp(math.floor(radius / 5), 3, 8) do
		local stueck = Modelle.teil(ordner, {
			Name = "Truemmer",
			Size = Vector3.new(math.random(5, 15) / 10, math.random(5, 15) / 10, math.random(5, 15) / 10),
			CFrame = CFrame.new(pos + Vector3.new(0, 1, 0)) * CFrame.Angles(math.random() * 6, math.random() * 6, 0),
			Color = Color3.fromRGB(45, 40, 38),
			Material = Enum.Material.Slate,
			CanQuery = false,
			CanTouch = false,
		})
		stueck.Anchored = false
		stueck.AssemblyLinearVelocity = Vector3.new(math.random(-40, 40), math.random(30, 70), math.random(-40, 40))
		stueck.AssemblyAngularVelocity = Vector3.new(math.random(-10, 10), math.random(-10, 10), math.random(-10, 10))
		Debris:AddItem(stueck, 4)
	end

	-- Brandfleck auf dem Boden, wenn die Explosion nah am Boden war
	local suche = RaycastParams.new()
	suche.FilterType = Enum.RaycastFilterType.Exclude
	suche.FilterDescendantsInstances = { ordner }
	local boden = workspace:Raycast(pos + Vector3.new(0, 2, 0), Vector3.new(0, -20, 0), suche)
	if boden then
		local fleck = effektTeil({
			Name = "Brandfleck",
			Shape = Enum.PartType.Cylinder,
			Size = Vector3.new(0.2, radius * 1.2, radius * 1.2),
			CFrame = CFrame.new(boden.Position + Vector3.new(0, 0.08, 0)) * CFrame.Angles(0, 0, math.rad(90)),
			Color = Color3.fromRGB(30, 26, 24),
			Material = Enum.Material.Slate,
			Transparency = 0.15,
		})
		TweenService:Create(fleck, TweenInfo.new(25, Enum.EasingStyle.Linear), { Transparency = 1 }):Play()
		Debris:AddItem(fleck, 25)
	end

	-- dicker Rauch: erst schwarz, dann grau
	Effekte.rauchwolke(pos, math.floor(radius * 1.5), radius / 4, Color3.fromRGB(45, 40, 38))
	Effekte.rauchwolke(pos + Vector3.new(0, radius / 3, 0), math.floor(radius), radius / 3, Color3.fromRGB(110, 105, 100))
end

-- Spieler in der Nähe einer Explosion bekommen Schaden
function Effekte.spielerSchaden(pos: Vector3, radius: number)
	for _, spieler in ipairs(Players:GetPlayers()) do
		local charakter = spieler.Character
		local wurzel = charakter and charakter:FindFirstChild("HumanoidRootPart")
		local humanoid = charakter and charakter:FindFirstChildOfClass("Humanoid")
		if wurzel and humanoid then
			local abstand = (wurzel.Position - pos).Magnitude
			if abstand < radius then
				humanoid:TakeDamage(60 * (1 - abstand / radius))
			end
		end
	end
end

-- Modell unsichtbar machen. Der Rauch bleibt noch ein paar Sekunden in der Luft stehen.
function Effekte.ausblenden(modell: Model)
	for _, teil in ipairs(modell:GetDescendants()) do
		if teil:IsA("BasePart") then
			teil.Transparency = 1
		elseif teil:IsA("ParticleEmitter") or teil:IsA("Light") or teil:IsA("Smoke") or teil:IsA("Fire") then
			teil.Enabled = false
		elseif teil:IsA("Sound") then
			teil:Stop()
		end
	end
	Debris:AddItem(modell, 6)
end

-- Ein Schuss: heller Leuchtstreifen von "von" nach "nach" mit Mündungsblitz
function Effekte.schuss(von: Vector3, nach: Vector3)
	local laenge = (nach - von).Magnitude
	local strahl = Modelle.teil(ordner, {
		Name = "Schuss",
		Size = Vector3.new(0.3, 0.3, laenge),
		CFrame = CFrame.lookAt((von + nach) / 2, nach),
		Color = Color3.fromRGB(255, 220, 120),
		Material = Enum.Material.Neon,
		CanCollide = false,
		CanQuery = false,
		CanTouch = false,
	})
	local blitz = Instance.new("PointLight")
	blitz.Color = Color3.fromRGB(255, 200, 100)
	blitz.Brightness = 6
	blitz.Range = 15
	blitz.Parent = strahl
	TweenService:Create(strahl, TweenInfo.new(0.25), { Transparency = 1 }):Play()
	Debris:AddItem(strahl, 0.3)

	local knall = Instance.new("Sound")
	knall.SoundId = Config.Sounds.Start
	knall.PlaybackSpeed = 1.6
	knall.Volume = 0.6
	knall.RollOffMaxDistance = 400
	knall.Parent = strahl
	knall:Play()
end

-- Setzt die Sounds einer Rakete aus der Config
function Effekte.toeneSetzen(rakete: Model): (Sound, Sound)
	local koerper = rakete:FindFirstChild("Koerper")
	koerper.Start.SoundId = Config.Sounds.Start
	koerper.Flug.SoundId = Config.Sounds.Flug
	return koerper.Start, koerper.Flug
end

-- Abfangrakete der Flugabwehr: fliegt in "dauer" Sekunden zum Zielpunkt.
-- Wenn sie nicht trifft, fliegt sie knapp daneben und explodiert dort.
function Effekte.abfangrakete(abwehr: Model, zielPunkt: Vector3, trifft: boolean, dauer: number)
	local rohr = abwehr:FindFirstChild("Rohr") :: BasePart?
	local startPos = if rohr then rohr.Position else abwehr:GetPivot().Position + Vector3.new(0, 6, 0)
	local ende = zielPunkt
	if not trifft then
		ende += Vector3.new(math.random(-15, 15), math.random(-8, 8), math.random(-15, 15))
	end

	local rakete = Modelle.rakete(0.35, Color3.fromRGB(245, 245, 245))
	local startTon = Effekte.toeneSetzen(rakete)
	rakete:PivotTo(Effekte.ausrichten(startPos, ende - startPos))
	rakete.Parent = ordner
	Modelle.zuenden(rakete, true)
	startTon:Play()
	Effekte.rauchwolke(startPos, 8, 2, Color3.fromRGB(200, 200, 200))

	local beginn = os.clock()
	while true do
		local a = math.min((os.clock() - beginn) / dauer, 1)
		rakete:PivotTo(Effekte.ausrichten(startPos:Lerp(ende, a), ende - startPos))
		if a >= 1 then
			break
		end
		RunService.Heartbeat:Wait()
	end

	Effekte.ausblenden(rakete)
	if not trifft then
		Effekte.explosion(ende, 5) -- kleiner Knall in der Luft
	end
end

return Effekte
