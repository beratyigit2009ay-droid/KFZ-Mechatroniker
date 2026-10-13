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

-- Explosion mit Lichtblitz und Rauch (nur Optik, der Schaden wird extra berechnet)
function Effekte.explosion(pos: Vector3, radius: number)
	local ex = Instance.new("Explosion")
	ex.Position = pos
	ex.BlastRadius = radius
	ex.BlastPressure = 0 -- nichts wegschleudern
	ex.DestroyJointRadiusPercent = 0 -- Spieler nicht sofort töten
	ex.Parent = workspace

	-- heller Feuerball, der größer und durchsichtig wird
	local ball = Modelle.teil(ordner, {
		Name = "Feuerball",
		Shape = Enum.PartType.Ball,
		Size = Vector3.one * 2,
		CFrame = CFrame.new(pos),
		Color = Color3.fromRGB(255, 170, 60),
		Material = Enum.Material.Neon,
		CanCollide = false,
		CanQuery = false,
		CanTouch = false,
	})
	local licht = Instance.new("PointLight")
	licht.Color = Color3.fromRGB(255, 160, 60)
	licht.Brightness = 10
	licht.Range = 60
	licht.Parent = ball
	TweenService:Create(ball, TweenInfo.new(0.6), { Size = Vector3.one * radius * 1.4, Transparency = 1 }):Play()
	TweenService:Create(licht, TweenInfo.new(0.8), { Brightness = 0 }):Play()
	Debris:AddItem(ball, 1)

	Effekte.rauchwolke(pos, math.floor(radius * 1.5), radius / 4, Color3.fromRGB(60, 55, 50))
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
