-- Modelle.lua
-- Hier werden alle 3D-Modelle aus einfachen Bauteilen (Parts) zusammengebaut:
-- Städte, Gebäude, Flugabwehr und Raketen.
-- So brauchst du keine fertigen Modelle aus der Toolbox.

local Modelle = {}

local GRAD = math.rad
local STEHEND = CFrame.Angles(0, 0, GRAD(90)) -- dreht einen Zylinder senkrecht
local LIEGEND = CFrame.Angles(0, GRAD(90), 0) -- dreht einen Zylinder nach vorne (Z-Richtung)

-- Baut ein Part mit den angegebenen Eigenschaften
local function teil(eltern: Instance, eigenschaften: { [string]: any }): Part
	local p = Instance.new("Part")
	p.Anchored = true
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	for name, wert in pairs(eigenschaften) do
		(p :: any)[name] = wert
	end
	p.Parent = eltern
	return p
end
Modelle.teil = teil

------------------------------------------------------------------------
-- STADT
------------------------------------------------------------------------

-- Baut die Grundfläche einer Stadt mit Startrampe, Sirenenmast und Namensschild.
-- Gibt das Modell und eine Tabelle mit wichtigen Teilen zurück.
function Modelle.stadt(index: number, mitte: Vector3, farbe: Color3, groesse: number)
	local m = Instance.new("Model")
	m.Name = "Stadt" .. index

	-- farbiger Rand, damit man die Städte unterscheiden kann
	teil(m, {
		Name = "Rand",
		Size = Vector3.new(groesse + 6, 1, groesse + 6),
		CFrame = CFrame.new(mitte),
		Color = farbe,
		Material = Enum.Material.SmoothPlastic,
	})
	local boden = teil(m, {
		Name = "Boden",
		Size = Vector3.new(groesse, 1.2, groesse),
		CFrame = CFrame.new(mitte + Vector3.new(0, 0.1, 0)),
		Color = Color3.fromRGB(110, 110, 115),
		Material = Enum.Material.Concrete,
	})
	local oben = boden.Position.Y + boden.Size.Y / 2

	local gebaeudeOrdner = Instance.new("Folder")
	gebaeudeOrdner.Name = "Gebaeude"
	gebaeudeOrdner.Parent = m

	-- Hilfsfunktion: Position in der Stadt (x, z relativ zur Mitte, h = Höhe über dem Boden)
	local function ort(x: number, z: number, h: number): Vector3
		return Vector3.new(mitte.X + x, oben + h, mitte.Z + z)
	end

	-- Startrampe für Raketen
	teil(m, {
		Name = "Startrampe",
		Size = Vector3.new(12, 1, 12),
		CFrame = CFrame.new(ort(-36, 46, 0.5)),
		Color = Color3.fromRGB(50, 50, 55),
		Material = Enum.Material.DiamondPlate,
	})
	for _, ecke in ipairs({ { -5, -5 }, { 5, -5 }, { -5, 5 }, { 5, 5 } }) do
		teil(m, {
			Name = "Warnstreifen",
			Size = Vector3.new(2, 1.1, 2),
			CFrame = CFrame.new(ort(-36 + ecke[1], 46 + ecke[2], 0.55)),
			Color = Color3.fromRGB(240, 200, 0),
			Material = Enum.Material.SmoothPlastic,
		})
	end
	-- Startturm neben der Rakete
	teil(m, {
		Name = "Startturm",
		Size = Vector3.new(1.2, 18, 1.2),
		CFrame = CFrame.new(ort(-32, 46, 10)),
		Color = Color3.fromRGB(200, 60, 40),
		Material = Enum.Material.Metal,
	})
	local startPunkt = ort(-36, 46, 1)

	-- Sirenenmast
	teil(m, {
		Name = "Mast",
		Shape = Enum.PartType.Cylinder,
		Size = Vector3.new(22, 1, 1),
		CFrame = CFrame.new(ort(36, 46, 11)) * STEHEND,
		Color = Color3.fromRGB(120, 120, 125),
		Material = Enum.Material.Metal,
	})
	local sireneKopf = teil(m, {
		Name = "Sirene",
		Size = Vector3.new(3, 2, 3),
		CFrame = CFrame.new(ort(36, 46, 23)),
		Color = Color3.fromRGB(160, 160, 165),
		Material = Enum.Material.Metal,
	})
	local sireneTon = Instance.new("Sound")
	sireneTon.Name = "SireneTon"
	sireneTon.Volume = 1
	sireneTon.RollOffMinDistance = 30
	sireneTon.RollOffMaxDistance = 500
	sireneTon.Parent = sireneKopf
	local sireneLicht = Instance.new("PointLight")
	sireneLicht.Name = "SireneLicht"
	sireneLicht.Color = Color3.fromRGB(255, 30, 30)
	sireneLicht.Brightness = 6
	sireneLicht.Range = 40
	sireneLicht.Enabled = false
	sireneLicht.Parent = sireneKopf

	-- Namensschild über der Stadt
	local schild = Instance.new("BillboardGui")
	schild.Name = "Schild"
	schild.Size = UDim2.new(0, 320, 0, 60)
	schild.StudsOffset = Vector3.new(0, 30, 0)
	schild.MaxDistance = 2000
	schild.Parent = boden
	local text = Instance.new("TextLabel")
	text.Name = "Text"
	text.Size = UDim2.fromScale(1, 1)
	text.BackgroundTransparency = 1
	text.TextScaled = true
	text.Font = Enum.Font.GothamBlack
	text.TextColor3 = farbe
	text.TextStrokeTransparency = 0
	text.Text = "Stadt " .. index .. " (frei)"
	text.Parent = schild

	return m,
		{
			oben = oben,
			startPunkt = startPunkt,
			spawn = CFrame.new(ort(0, 46, 4)),
			sireneTon = sireneTon,
			sireneLicht = sireneLicht,
			schild = text,
			gebaeudeOrdner = gebaeudeOrdner,
		}
end

------------------------------------------------------------------------
-- GEBÄUDE (pos = Mitte des Bauplatzes auf dem Boden)
------------------------------------------------------------------------

function Modelle.Haus(pos: Vector3): Model
	local m = Instance.new("Model")
	m.Name = "Haus"
	local wand = teil(m, {
		Name = "Wand",
		Size = Vector3.new(10, 8, 10),
		CFrame = CFrame.new(pos + Vector3.new(0, 4, 0)),
		Color = Color3.fromRGB(230, 215, 185),
		Material = Enum.Material.Brick,
	})
	-- Ein um 45° gedrehter Block sieht aus wie ein Satteldach
	teil(m, {
		Name = "Dach",
		Size = Vector3.new(7.2, 7.2, 10.6),
		CFrame = CFrame.new(pos + Vector3.new(0, 8, 0)) * CFrame.Angles(0, 0, GRAD(45)),
		Color = Color3.fromRGB(150, 50, 40),
		Material = Enum.Material.Slate,
	})
	teil(m, {
		Name = "Tuer",
		Size = Vector3.new(2.4, 4, 0.3),
		CFrame = CFrame.new(pos + Vector3.new(0, 2, -5.1)),
		Color = Color3.fromRGB(100, 60, 30),
		Material = Enum.Material.Wood,
	})
	for _, x in ipairs({ -3, 3 }) do
		teil(m, {
			Name = "Fenster",
			Size = Vector3.new(2, 2, 0.3),
			CFrame = CFrame.new(pos + Vector3.new(x, 5, -5.1)),
			Color = Color3.fromRGB(150, 200, 255),
			Material = Enum.Material.Glass,
		})
	end
	m.PrimaryPart = wand
	return m
end

function Modelle.Fabrik(pos: Vector3): Model
	local m = Instance.new("Model")
	m.Name = "Fabrik"
	local halle = teil(m, {
		Name = "Halle",
		Size = Vector3.new(14, 9, 12),
		CFrame = CFrame.new(pos + Vector3.new(0, 4.5, 0)),
		Color = Color3.fromRGB(150, 150, 160),
		Material = Enum.Material.CorrodedMetal,
	})
	local schornstein = teil(m, {
		Name = "Schornstein",
		Shape = Enum.PartType.Cylinder,
		Size = Vector3.new(10, 2.5, 2.5),
		CFrame = CFrame.new(pos + Vector3.new(4, 14, 3)) * STEHEND,
		Color = Color3.fromRGB(140, 60, 45),
		Material = Enum.Material.Brick,
	})
	local rauch = Instance.new("Smoke")
	rauch.Color = Color3.fromRGB(90, 90, 90)
	rauch.Size = 2
	rauch.RiseVelocity = 6
	rauch.Opacity = 0.3
	rauch.Parent = schornstein
	teil(m, {
		Name = "Tor",
		Size = Vector3.new(5, 5, 0.3),
		CFrame = CFrame.new(pos + Vector3.new(-2, 2.5, -6.1)),
		Color = Color3.fromRGB(70, 70, 75),
		Material = Enum.Material.DiamondPlate,
	})
	m.PrimaryPart = halle
	return m
end

function Modelle.Abwehr(pos: Vector3): Model
	local m = Instance.new("Model")
	m.Name = "Flugabwehr"
	local oliv = Color3.fromRGB(85, 95, 60)
	local sockel = teil(m, {
		Name = "Sockel",
		Shape = Enum.PartType.Cylinder,
		Size = Vector3.new(2, 9, 9),
		CFrame = CFrame.new(pos + Vector3.new(0, 1, 0)) * STEHEND,
		Color = oliv,
		Material = Enum.Material.Metal,
	})
	teil(m, {
		Name = "Turm",
		Size = Vector3.new(5, 3, 5),
		CFrame = CFrame.new(pos + Vector3.new(0, 3.5, 0)),
		Color = oliv,
		Material = Enum.Material.Metal,
	})
	-- Zwei Startrohre, schräg nach oben gerichtet
	for i, x in ipairs({ -1.2, 1.2 }) do
		teil(m, {
			Name = if i == 1 then "Rohr" else "Rohr2",
			Size = Vector3.new(0.9, 0.9, 7),
			CFrame = CFrame.new(pos + Vector3.new(x, 6, -1.5)) * CFrame.Angles(GRAD(40), 0, 0),
			Color = Color3.fromRGB(60, 65, 45),
			Material = Enum.Material.Metal,
		})
	end
	-- kleines Radar
	teil(m, {
		Name = "Radar",
		Size = Vector3.new(3, 1.6, 0.3),
		CFrame = CFrame.new(pos + Vector3.new(0, 6.5, 2.2)) * CFrame.Angles(GRAD(-20), 0, 0),
		Color = Color3.fromRGB(200, 200, 200),
		Material = Enum.Material.Metal,
	})
	m.PrimaryPart = sockel
	return m
end

------------------------------------------------------------------------
-- RAKETE
------------------------------------------------------------------------

-- Baut eine Rakete, die nach vorne (-Z) zeigt.
-- s = Größe (1 = normal), farbe = Farbe des Rumpfs
function Modelle.rakete(s: number, farbe: Color3?): Model
	local m = Instance.new("Model")
	m.Name = "Rakete"
	local laenge, dicke = 9 * s, 1.4 * s

	local function neu(eigenschaften)
		eigenschaften.CanCollide = false
		eigenschaften.CanQuery = false
		eigenschaften.CanTouch = false
		return teil(m, eigenschaften)
	end

	-- unsichtbarer Mittelpunkt, an dem die ganze Rakete bewegt wird
	local wurzel = neu({ Name = "Wurzel", Size = Vector3.one * 0.2, Transparency = 1, CFrame = CFrame.new() })

	local koerper = neu({
		Name = "Koerper",
		Shape = Enum.PartType.Cylinder,
		Size = Vector3.new(laenge, dicke, dicke),
		CFrame = LIEGEND,
		Color = farbe or Color3.fromRGB(230, 230, 230),
		Material = Enum.Material.Metal,
	})
	-- Spitze: eine in die Länge gezogene Kugel
	local spitze = neu({
		Name = "Spitze",
		Size = Vector3.new(dicke, dicke, dicke * 2.4),
		CFrame = CFrame.new(0, 0, -laenge / 2),
		Color = Color3.fromRGB(180, 30, 30),
		Material = Enum.Material.Metal,
	})
	local kugel = Instance.new("SpecialMesh")
	kugel.MeshType = Enum.MeshType.Sphere
	kugel.Parent = spitze
	-- roter Ring
	neu({
		Name = "Ring",
		Shape = Enum.PartType.Cylinder,
		Size = Vector3.new(0.4 * s, dicke * 1.03, dicke * 1.03),
		CFrame = CFrame.new(0, 0, -laenge / 2 + 1.5 * s) * LIEGEND,
		Color = Color3.fromRGB(180, 30, 30),
		Material = Enum.Material.Metal,
	})
	-- 4 Flossen hinten
	for i = 0, 3 do
		neu({
			Name = "Flosse",
			Size = Vector3.new(0.2 * s, 1.6 * s, 2.4 * s),
			CFrame = CFrame.Angles(0, 0, GRAD(90 * i + 45)) * CFrame.new(0, dicke / 2 + 0.7 * s, laenge / 2 - 1.4 * s),
			Color = Color3.fromRGB(60, 60, 65),
			Material = Enum.Material.Metal,
		})
	end
	-- Düse
	neu({
		Name = "Duese",
		Shape = Enum.PartType.Cylinder,
		Size = Vector3.new(0.8 * s, dicke * 0.75, dicke * 0.75),
		CFrame = CFrame.new(0, 0, laenge / 2 + 0.4 * s) * LIEGEND,
		Color = Color3.fromRGB(40, 40, 40),
		Material = Enum.Material.Metal,
	})

	-- Unsichtbares Teil hinter der Düse: hier kommen Feuer, Rauch und Licht raus
	local ausstoss = neu({
		Name = "Ausstoss",
		Size = Vector3.one * 0.3 * s,
		Transparency = 1,
		CFrame = CFrame.new(0, 0, laenge / 2 + 0.9 * s),
	})

	local feuer = Instance.new("ParticleEmitter")
	feuer.Name = "Feuer"
	feuer.Texture = "rbxasset://textures/particles/fire_main.dds"
	feuer.Color = ColorSequence.new({
		ColorSequenceKeypoint.new(0, Color3.fromRGB(255, 255, 200)),
		ColorSequenceKeypoint.new(0.4, Color3.fromRGB(255, 160, 40)),
		ColorSequenceKeypoint.new(1, Color3.fromRGB(200, 50, 10)),
	})
	feuer.LightEmission = 1
	feuer.Size = NumberSequence.new(1.6 * s, 0.2 * s)
	feuer.Transparency = NumberSequence.new(0.1, 1)
	feuer.Lifetime = NumberRange.new(0.15, 0.3)
	feuer.Rate = 150
	feuer.Speed = NumberRange.new(20, 30)
	feuer.SpreadAngle = Vector2.new(6, 6)
	feuer.EmissionDirection = Enum.NormalId.Back -- nach hinten, weg von der Spitze
	feuer.Enabled = false
	feuer.Parent = ausstoss

	local rauch = Instance.new("ParticleEmitter")
	rauch.Name = "Rauch"
	rauch.Texture = "rbxasset://textures/particles/smoke_main.dds"
	rauch.Color = ColorSequence.new(Color3.fromRGB(230, 230, 230), Color3.fromRGB(130, 130, 130))
	rauch.Size = NumberSequence.new(1.5 * s, 9 * s)
	rauch.Transparency = NumberSequence.new(0.35, 1)
	rauch.Lifetime = NumberRange.new(3, 5)
	rauch.Rate = 50
	rauch.Speed = NumberRange.new(4, 8)
	rauch.SpreadAngle = Vector2.new(12, 12)
	rauch.Drag = 1.5
	rauch.Rotation = NumberRange.new(0, 360)
	rauch.RotSpeed = NumberRange.new(-30, 30)
	rauch.EmissionDirection = Enum.NormalId.Back
	rauch.Enabled = false
	rauch.Parent = ausstoss

	local licht = Instance.new("PointLight")
	licht.Name = "Licht"
	licht.Color = Color3.fromRGB(255, 150, 50)
	licht.Brightness = 6
	licht.Range = math.min(25 * s, 60)
	licht.Enabled = false
	licht.Parent = ausstoss

	local startTon = Instance.new("Sound")
	startTon.Name = "Start"
	startTon.SoundId = "" -- wird in Raketen.lua aus der Config gesetzt
	startTon.Volume = 1
	startTon.RollOffMinDistance = 20
	startTon.RollOffMaxDistance = 800
	startTon.Parent = koerper

	local flugTon = Instance.new("Sound")
	flugTon.Name = "Flug"
	flugTon.Looped = true
	flugTon.Volume = 0.7
	flugTon.RollOffMinDistance = 20
	flugTon.RollOffMaxDistance = 600
	flugTon.Parent = koerper

	m.PrimaryPart = wurzel
	m:SetAttribute("Laenge", laenge + dicke * 1.2 + s)
	return m
end

-- Schaltet Feuer, Rauch und Licht einer Rakete an oder aus
function Modelle.zuenden(rakete: Model, an: boolean)
	local ausstoss = rakete:FindFirstChild("Ausstoss")
	if not ausstoss then
		return
	end
	for _, effekt in ipairs(ausstoss:GetChildren()) do
		if effekt:IsA("ParticleEmitter") or effekt:IsA("Light") then
			effekt.Enabled = an
		end
	end
end

return Modelle
