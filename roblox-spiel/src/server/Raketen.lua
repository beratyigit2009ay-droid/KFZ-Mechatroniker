-- Raketen.lua
-- Abschuss, Flug, Abfangen und Einschlag der Raketen.
--
-- Ablauf einer Rakete:
--   1. Zündung auf der Startrampe (Feuer, Rauchwolke, Startgeräusch) + Sirene in der Zielstadt
--   2. Senkrechter Start nach oben
--   3. Bogenflug zur Zielstadt (dabei kann die Flugabwehr der Zielstadt schießen)
--   4. Einschlag: Explosion, Lichtblitz, Rauch und Schaden

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local TweenService = game:GetService("TweenService")
local Debris = game:GetService("Debris")

local Config = require(ReplicatedStorage.Shared.Config)
local Modelle = require(script.Parent.Modelle)
local StadtManager = require(script.Parent.StadtManager)

local Raketen = {}

local ZUENDUNG_ZEIT = 1.2 -- Sekunden auf der Rampe, bevor sie abhebt
local BOOST_ZEIT = 1.5 -- Sekunden senkrecht nach oben
local BOOST_HOEHE = 40
local ABFANG_FLUGZEIT = 1 -- so lange fliegt eine Abfangrakete

local alarmEvent: RemoteEvent
local nachrichtEvent: RemoteEvent
local raketenOrdner: Folder
local letzterSchuss: { [Player]: number } = {}

function Raketen.init(alarm: RemoteEvent, nachricht: RemoteEvent)
	alarmEvent = alarm
	nachrichtEvent = nachricht
	raketenOrdner = Instance.new("Folder")
	raketenOrdner.Name = "Raketen"
	raketenOrdner.Parent = workspace
	Players.PlayerRemoving:Connect(function(spieler)
		letzterSchuss[spieler] = nil
	end)
end

------------------------------------------------------------------------
-- Hilfsfunktionen
------------------------------------------------------------------------

-- Punkt auf einer Bézier-Kurve (das ist eine schöne, weiche Flugbahn)
local function bezier(p0: Vector3, p1: Vector3, p2: Vector3, p3: Vector3, t: number): Vector3
	local u = 1 - t
	return p0 * (u * u * u) + p1 * (3 * u * u * t) + p2 * (3 * u * t * t) + p3 * (t * t * t)
end

-- Flugrichtung auf der Bézier-Kurve
local function bezierRichtung(p0: Vector3, p1: Vector3, p2: Vector3, p3: Vector3, t: number): Vector3
	local u = 1 - t
	return (p1 - p0) * (3 * u * u) + (p2 - p1) * (6 * u * t) + (p3 - p2) * (3 * t * t)
end

-- CFrame an Position pos, das in Richtung "richtung" zeigt
local function ausrichten(pos: Vector3, richtung: Vector3): CFrame
	if richtung.Magnitude < 0.001 then
		return CFrame.new(pos)
	end
	local oben = Vector3.yAxis
	if math.abs(richtung.Unit:Dot(oben)) > 0.99 then
		oben = Vector3.zAxis -- fast senkrecht: anderen "Oben"-Vektor nehmen
	end
	return CFrame.lookAt(pos, pos + richtung, oben)
end

local function nachricht(spieler: Player?, text: string)
	if spieler and spieler.Parent then
		nachrichtEvent:FireClient(spieler, text)
	end
end

-- Eine Rauchwolke an einer Stelle
local function rauchwolke(pos: Vector3, anzahl: number, groesse: number, farbe: Color3)
	local halter = Modelle.teil(workspace, {
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
local function explosion(pos: Vector3, radius: number)
	local ex = Instance.new("Explosion")
	ex.Position = pos
	ex.BlastRadius = radius
	ex.BlastPressure = 0 -- nichts wegschleudern
	ex.DestroyJointRadiusPercent = 0 -- Spieler nicht sofort töten
	ex.Parent = workspace

	-- heller Feuerball, der größer und durchsichtig wird
	local ball = Modelle.teil(workspace, {
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

	rauchwolke(pos, math.floor(radius * 1.5), radius / 4, Color3.fromRGB(60, 55, 50))
end

-- Spieler in der Nähe der Explosion bekommen Schaden
local function spielerSchaden(pos: Vector3, radius: number)
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

-- Rakete unsichtbar machen. Der Rauch bleibt noch ein paar Sekunden in der Luft stehen.
local function ausblenden(rakete: Model)
	for _, teil in ipairs(rakete:GetDescendants()) do
		if teil:IsA("BasePart") then
			teil.Transparency = 1
		elseif teil:IsA("ParticleEmitter") or teil:IsA("Light") then
			teil.Enabled = false
		elseif teil:IsA("Sound") then
			teil:Stop()
		end
	end
	Debris:AddItem(rakete, 6)
end

local function toeneSetzen(rakete: Model)
	local koerper = rakete:FindFirstChild("Koerper")
	koerper.Start.SoundId = Config.Sounds.Start
	koerper.Flug.SoundId = Config.Sounds.Flug
	return koerper.Start, koerper.Flug
end

------------------------------------------------------------------------
-- Abfangrakete der Flugabwehr
------------------------------------------------------------------------

local function abfangrakete(abwehr: Model, zielPunkt: Vector3, trifft: boolean)
	local rohr = abwehr:FindFirstChild("Rohr") :: BasePart?
	local startPos = if rohr then rohr.Position else abwehr:GetPivot().Position + Vector3.new(0, 6, 0)
	local ende = zielPunkt
	if not trifft then
		-- daneben geschossen
		ende += Vector3.new(math.random(-15, 15), math.random(-8, 8), math.random(-15, 15))
	end

	local rakete = Modelle.rakete(0.35, Color3.fromRGB(245, 245, 245))
	local startTon = toeneSetzen(rakete)
	rakete:PivotTo(ausrichten(startPos, ende - startPos))
	rakete.Parent = raketenOrdner
	Modelle.zuenden(rakete, true)
	startTon:Play()
	rauchwolke(startPos, 8, 2, Color3.fromRGB(200, 200, 200))

	local beginn = os.clock()
	while true do
		local a = math.min((os.clock() - beginn) / ABFANG_FLUGZEIT, 1)
		rakete:PivotTo(ausrichten(startPos:Lerp(ende, a), ende - startPos))
		if a >= 1 then
			break
		end
		RunService.Heartbeat:Wait()
	end

	ausblenden(rakete)
	if not trifft then
		explosion(ende, 5) -- kleiner Knall in der Luft
	end
end

------------------------------------------------------------------------
-- Flug einer Rakete
------------------------------------------------------------------------

local function flug(spieler: Player, typ, start, ziel)
	local zielPos = StadtManager.zufallsZiel(ziel)

	local rakete = Modelle.rakete(typ.Groesse)
	local startTon, flugTon = toeneSetzen(rakete)
	local startPos = start.startPunkt + Vector3.new(0, rakete:GetAttribute("Laenge") / 2, 0)
	rakete:PivotTo(ausrichten(startPos, Vector3.yAxis))
	rakete.Parent = raketenOrdner

	-- Alarm! Alle Clients bekommen Bescheid, die Sirene der Zielstadt heult
	local gesamtZeit = ZUENDUNG_ZEIT + BOOST_ZEIT + typ.Flugzeit
	alarmEvent:FireAllClients(ziel.index, spieler.Name, gesamtZeit)
	StadtManager.sireneAn(ziel, gesamtZeit + 1)

	-- 1) Zündung
	Modelle.zuenden(rakete, true)
	startTon:Play()
	rauchwolke(start.startPunkt, 30, 5, Color3.fromRGB(220, 220, 220))
	task.wait(ZUENDUNG_ZEIT)

	-- 2) Senkrechter Start (wird immer schneller)
	flugTon:Play()
	local beginn = os.clock()
	while true do
		local a = math.min((os.clock() - beginn) / BOOST_ZEIT, 1)
		rakete:PivotTo(ausrichten(startPos + Vector3.new(0, BOOST_HOEHE * a * a, 0), Vector3.yAxis))
		if a >= 1 then
			break
		end
		RunService.Heartbeat:Wait()
	end

	-- 3) Bogenflug: startet senkrecht nach oben und stürzt am Ende senkrecht nach unten
	local p0 = startPos + Vector3.new(0, BOOST_HOEHE, 0)
	local p1 = p0 + Vector3.new(0, typ.Hoehe, 0)
	local p2 = zielPos + Vector3.new(0, typ.Hoehe, 0)
	local p3 = zielPos

	local abfangT: number? = nil -- Zeitpunkt, an dem die Rakete abgefangen wird
	local abfangPunkt: Vector3? = nil
	beginn = os.clock()

	while true do
		local t = math.min((os.clock() - beginn) / typ.Flugzeit, 1)
		local pos = bezier(p0, p1, p2, p3, t)
		rakete:PivotTo(ausrichten(pos, bezierRichtung(p0, p1, p2, p3, t)))

		-- Flugabwehr der Zielstadt: schießt, wenn die Rakete im Sinkflug in Reichweite ist
		if not abfangT and t > 0.4 then
			local info = Config.Gebaeude.Abwehr
			for _, abwehr in ipairs(StadtManager.abwehrIn(ziel)) do
				local bereitAb = abwehr:GetAttribute("BereitAb") or 0
				local abstand = (abwehr:GetPivot().Position - pos).Magnitude
				local tTreffer = t + ABFANG_FLUGZEIT / typ.Flugzeit
				if os.clock() >= bereitAb and abstand <= info.Reichweite and tTreffer < 0.95 then
					abwehr:SetAttribute("BereitAb", os.clock() + info.Nachladezeit)
					local trefferPunkt = bezier(p0, p1, p2, p3, tTreffer)
					local trifft = math.random() < info.Trefferchance
					task.spawn(abfangrakete, abwehr, trefferPunkt, trifft)
					if trifft then
						abfangT = tTreffer
						abfangPunkt = trefferPunkt
						break
					end
				end
			end
		end

		-- Abgefangen? Dann explodiert die Rakete in der Luft
		if abfangT and abfangPunkt and t >= abfangT then
			ausblenden(rakete)
			explosion(abfangPunkt, typ.Radius * 0.7)
			nachricht(spieler, "Deine Rakete wurde von der Flugabwehr in " .. ziel.name .. " abgefangen!")
			nachricht(ziel.besitzer, "Deine Flugabwehr hat eine Rakete abgefangen!")
			return
		end

		if t >= 1 then
			break
		end
		RunService.Heartbeat:Wait()
	end

	-- 4) Einschlag
	ausblenden(rakete)
	explosion(zielPos, typ.Radius)
	spielerSchaden(zielPos, typ.Radius)
	local zerstoert, belohnung = StadtManager.schaden(zielPos, typ.Radius, typ.Schaden, spieler)
	if zerstoert > 0 then
		nachricht(spieler, "Treffer! " .. zerstoert .. " Gebäude zerstört. +" .. belohnung .. " $")
	else
		nachricht(spieler, "Einschlag in " .. ziel.name .. "!")
	end
end

------------------------------------------------------------------------
-- Wird aufgerufen, wenn ein Spieler auf "FEUER!" drückt
------------------------------------------------------------------------

function Raketen.abschiessen(spieler: Player, typName: any, zielIndex: any): (boolean, string)
	local typ = if typeof(typName) == "string" then Config.Raketen[typName] else nil
	if not typ then
		return false, "Diese Rakete gibt es nicht."
	end

	local start = StadtManager.stadtVon(spieler)
	if not start then
		return false, "Du hast keine Stadt, von der du schießen kannst."
	end

	local ziel = if typeof(zielIndex) == "number" then StadtManager.holeStadt(zielIndex) else nil
	if not ziel or ziel == start then
		return false, "Wähle eine andere Stadt als Ziel."
	end

	local attribut = "Rakete_" .. typName
	local anzahl = spieler:GetAttribute(attribut) or 0
	if anzahl <= 0 then
		return false, "Du hast keine " .. typ.Name .. " mehr. Kauf eine im Shop!"
	end

	local jetzt = os.clock()
	if jetzt - (letzterSchuss[spieler] or 0) < Config.SCHUSS_PAUSE then
		return false, "Die Startrampe lädt noch nach..."
	end
	letzterSchuss[spieler] = jetzt

	spieler:SetAttribute(attribut, anzahl - 1)
	task.spawn(flug, spieler, typ, start, ziel)
	return true, typ.Name .. " startet in Richtung " .. ziel.name .. "!"
end

return Raketen
