-- Modelle.lua
-- Hier werden alle 3D-Modelle aus einfachen Bauteilen (Parts) zusammengebaut:
-- Städte, Gebäude, Flugabwehr und Raketen.
-- So brauchst du keine fertigen Modelle aus der Toolbox.

local CollectionService = game:GetService("CollectionService")

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

-- Kleines Schild mit Text auf einer Seite eines Parts (z.B. "BANK")
local function schrift(teilMitSchild: BasePart, seite: Enum.NormalId, inhalt: string, farbe: Color3)
	local gui = Instance.new("SurfaceGui")
	gui.Face = seite
	gui.SizingMode = Enum.SurfaceGuiSizingMode.PixelsPerStud
	gui.PixelsPerStud = 40
	gui.LightInfluence = 0
	gui.Parent = teilMitSchild
	local text = Instance.new("TextLabel")
	text.Size = UDim2.fromScale(1, 1)
	text.BackgroundTransparency = 1
	text.Font = Enum.Font.GothamBlack
	text.TextScaled = true
	text.TextColor3 = farbe
	text.Text = inhalt
	text.Parent = gui
end

-- Fenster mit weißem Rahmen auf der Vorderseite (-Z) oder einer anderen Seite
local function fenster(m: Model, cf: CFrame, breite: number, hoehe: number)
	teil(m, {
		Name = "Fensterrahmen",
		Size = Vector3.new(breite + 0.4, hoehe + 0.4, 0.2),
		CFrame = cf,
		Color = Color3.fromRGB(245, 245, 240),
		Material = Enum.Material.SmoothPlastic,
	})
	local glas = teil(m, {
		Name = "Fenster",
		Size = Vector3.new(breite, hoehe, 0.3),
		CFrame = cf,
		Color = Color3.fromRGB(150, 200, 240),
		Material = Enum.Material.Glass,
		Transparency = 0.2,
	})
	-- Nachts geht in vielen Fenstern das Licht an (siehe Welt.lua)
	CollectionService:AddTag(glas, "Nachtfenster")
end

local function busch(m: Model, pos: Vector3, groesse: number)
	teil(m, {
		Name = "Busch",
		Shape = Enum.PartType.Ball,
		Size = Vector3.one * groesse,
		CFrame = CFrame.new(pos + Vector3.new(0, groesse * 0.4, 0)),
		Color = Color3.fromRGB(60, 130, 55),
		Material = Enum.Material.Grass,
		CanCollide = false,
	})
end

local HAUSFARBEN = {
	Color3.fromRGB(235, 220, 190),
	Color3.fromRGB(245, 235, 215),
	Color3.fromRGB(220, 180, 150),
	Color3.fromRGB(200, 215, 230),
	Color3.fromRGB(230, 205, 160),
}
local DACHFARBEN = {
	Color3.fromRGB(150, 50, 40),
	Color3.fromRGB(90, 70, 60),
	Color3.fromRGB(70, 80, 95),
}

function Modelle.Haus(pos: Vector3): Model
	local m = Instance.new("Model")
	m.Name = "Haus"
	local wandFarbe = HAUSFARBEN[math.random(1, #HAUSFARBEN)]
	local dachFarbe = DACHFARBEN[math.random(1, #DACHFARBEN)]

	-- Garten und Sockel
	teil(m, { Name = "Garten", Size = Vector3.new(16, 0.2, 16), CFrame = CFrame.new(pos + Vector3.new(0, 0.1, 0)), Color = Color3.fromRGB(95, 160, 75), Material = Enum.Material.Grass })
	teil(m, { Name = "Sockel", Size = Vector3.new(11, 0.8, 10), CFrame = CFrame.new(pos + Vector3.new(0, 0.5, 0)), Color = Color3.fromRGB(120, 120, 120), Material = Enum.Material.Concrete })
	local wand = teil(m, {
		Name = "Wand",
		Size = Vector3.new(10, 7, 9),
		CFrame = CFrame.new(pos + Vector3.new(0, 4.4, 0)),
		Color = wandFarbe,
		Material = Enum.Material.Plaster,
	})
	-- Satteldach: ein um 45° gedrehter Block, der halb in der Wand steckt
	teil(m, {
		Name = "Dach",
		Size = Vector3.new(8, 8, 8.98),
		CFrame = CFrame.new(pos + Vector3.new(0, 7.9, 0)) * CFrame.Angles(0, 0, GRAD(45)),
		Color = dachFarbe,
		Material = Enum.Material.Slate,
	})
	teil(m, {
		Name = "Schornstein",
		Size = Vector3.new(1.4, 4, 1.4),
		CFrame = CFrame.new(pos + Vector3.new(2.6, 11, 2)),
		Color = Color3.fromRGB(140, 70, 55),
		Material = Enum.Material.Brick,
	})
	-- Tür mit Vordach und Stufe
	teil(m, { Name = "Tuer", Size = Vector3.new(2.2, 4, 0.3), CFrame = CFrame.new(pos + Vector3.new(0, 2.9, -4.6)), Color = Color3.fromRGB(110, 65, 35), Material = Enum.Material.Wood })
	teil(m, { Name = "Tuerknauf", Shape = Enum.PartType.Ball, Size = Vector3.one * 0.3, CFrame = CFrame.new(pos + Vector3.new(0.7, 2.8, -4.8)), Color = Color3.fromRGB(230, 190, 60), Material = Enum.Material.Metal })
	teil(m, { Name = "Vordach", Size = Vector3.new(3.6, 0.3, 1.6), CFrame = CFrame.new(pos + Vector3.new(0, 5.2, -5.2)), Color = dachFarbe, Material = Enum.Material.Slate })
	teil(m, { Name = "Stufe", Size = Vector3.new(3, 0.4, 1.4), CFrame = CFrame.new(pos + Vector3.new(0, 0.3, -5.4)), Color = Color3.fromRGB(150, 150, 150), Material = Enum.Material.Concrete })
	-- Fenster vorne und an den Seiten
	for _, x in ipairs({ -3.2, 3.2 }) do
		fenster(m, CFrame.new(pos + Vector3.new(x, 4.8, -4.55)), 1.8, 2)
	end
	for _, x in ipairs({ -5.05, 5.05 }) do
		fenster(m, CFrame.new(pos + Vector3.new(x, 4.8, 0)) * CFrame.Angles(0, GRAD(90), 0), 2, 2)
	end
	-- Blumenkästen und Büsche
	for _, x in ipairs({ -3.2, 3.2 }) do
		teil(m, { Name = "Blumen", Size = Vector3.new(2, 0.5, 0.5), CFrame = CFrame.new(pos + Vector3.new(x, 3.6, -4.9)), Color = Color3.fromRGB(220, 70, 120), Material = Enum.Material.Grass })
	end
	busch(m, pos + Vector3.new(-6.5, 0, -5), 2.2)
	busch(m, pos + Vector3.new(6.5, 0, -5), 2.2)
	-- Briefkasten
	teil(m, { Name = "Briefkasten", Size = Vector3.new(0.8, 0.7, 0.6), CFrame = CFrame.new(pos + Vector3.new(3.5, 2.2, -7.5)), Color = Color3.fromRGB(240, 200, 0), Material = Enum.Material.Metal })
	teil(m, { Name = "Pfosten", Size = Vector3.new(0.2, 1.8, 0.2), CFrame = CFrame.new(pos + Vector3.new(3.5, 1, -7.5)), Color = Color3.fromRGB(80, 80, 80), Material = Enum.Material.Metal })
	m.PrimaryPart = wand
	return m
end

function Modelle.Hochhaus(pos: Vector3): Model
	local m = Instance.new("Model")
	m.Name = "Hochhaus"
	local beton = Color3.fromRGB(210, 205, 195)
	-- Eingang aus Glas
	teil(m, { Name = "Lobby", Size = Vector3.new(11, 4, 11), CFrame = CFrame.new(pos + Vector3.new(0, 2, 0)), Color = Color3.fromRGB(120, 170, 210), Material = Enum.Material.Glass, Transparency = 0.15 })
	teil(m, { Name = "Vordach", Size = Vector3.new(6, 0.4, 3), CFrame = CFrame.new(pos + Vector3.new(0, 4.2, -6.5)), Color = Color3.fromRGB(60, 60, 65), Material = Enum.Material.Metal })
	local turm = teil(m, {
		Name = "Turm",
		Size = Vector3.new(11.6, 30, 11.6),
		CFrame = CFrame.new(pos + Vector3.new(0, 19, 0)),
		Color = beton,
		Material = Enum.Material.Concrete,
	})
	-- Stockwerke: Fensterband und Balkone
	for stock = 0, 6 do
		local y = 6.5 + stock * 4.2
		local band = teil(m, { Name = "Fensterband", Size = Vector3.new(11.8, 2.2, 11.8), CFrame = CFrame.new(pos + Vector3.new(0, y, 0)), Color = Color3.fromRGB(110, 160, 210), Material = Enum.Material.Glass })
		CollectionService:AddTag(band, "Nachtfenster")
		teil(m, { Name = "Balkon", Size = Vector3.new(5, 0.3, 1.6), CFrame = CFrame.new(pos + Vector3.new(-2.5, y - 1.3, -6.5)), Color = beton, Material = Enum.Material.Concrete })
		teil(m, { Name = "Gelaender", Size = Vector3.new(5, 0.9, 0.15), CFrame = CFrame.new(pos + Vector3.new(-2.5, y - 0.75, -7.25)), Color = Color3.fromRGB(70, 70, 75), Material = Enum.Material.Metal })
	end
	-- Ecksäulen
	for _, ecke in ipairs({ { -5.9, -5.9 }, { 5.9, -5.9 }, { -5.9, 5.9 }, { 5.9, 5.9 } }) do
		teil(m, { Name = "Saeule", Size = Vector3.new(0.8, 30, 0.8), CFrame = CFrame.new(pos + Vector3.new(ecke[1], 19, ecke[2])), Color = Color3.fromRGB(150, 150, 155), Material = Enum.Material.Metal })
	end
	-- Dach mit Antenne und rotem Warnlicht
	teil(m, { Name = "Dachrand", Size = Vector3.new(12.4, 0.8, 12.4), CFrame = CFrame.new(pos + Vector3.new(0, 34.4, 0)), Color = Color3.fromRGB(90, 90, 95), Material = Enum.Material.Metal })
	teil(m, { Name = "Technik", Size = Vector3.new(4, 2, 3), CFrame = CFrame.new(pos + Vector3.new(2, 35.8, 2)), Color = Color3.fromRGB(160, 160, 160), Material = Enum.Material.Metal })
	teil(m, { Name = "Antenne", Size = Vector3.new(0.3, 7, 0.3), CFrame = CFrame.new(pos + Vector3.new(-3, 38.3, -3)), Color = Color3.fromRGB(200, 200, 200), Material = Enum.Material.Metal })
	local lampe = teil(m, { Name = "Warnlicht", Shape = Enum.PartType.Ball, Size = Vector3.one * 0.7, CFrame = CFrame.new(pos + Vector3.new(-3, 42, -3)), Color = Color3.fromRGB(255, 40, 40), Material = Enum.Material.Neon })
	local licht = Instance.new("PointLight")
	licht.Color = Color3.fromRGB(255, 40, 40)
	licht.Range = 10
	licht.Parent = lampe
	m.PrimaryPart = turm
	return m
end

function Modelle.Fabrik(pos: Vector3): Model
	local m = Instance.new("Model")
	m.Name = "Fabrik"
	local halle = teil(m, {
		Name = "Halle",
		Size = Vector3.new(15, 8, 12),
		CFrame = CFrame.new(pos + Vector3.new(0, 4, 0)),
		Color = Color3.fromRGB(165, 95, 70),
		Material = Enum.Material.Brick,
	})
	-- Sheddach (Sägezahn-Dach) mit Oberlichtern
	for i = 0, 2 do
		local x = -5 + i * 5
		teil(m, {
			Name = "Sheddach",
			Size = Vector3.new(3.6, 3.6, 11.98),
			CFrame = CFrame.new(pos + Vector3.new(x, 8, 0)) * CFrame.Angles(0, 0, GRAD(45)),
			Color = Color3.fromRGB(110, 115, 120),
			Material = Enum.Material.CorrodedMetal,
		})
	end
	for _, x in ipairs({ 4, 6.2 }) do
		local schornstein = teil(m, {
			Name = "Schornstein",
			Shape = Enum.PartType.Cylinder,
			Size = Vector3.new(12, 2.2, 2.2),
			CFrame = CFrame.new(pos + Vector3.new(x, 12, 4.5)) * STEHEND,
			Color = Color3.fromRGB(150, 65, 45),
			Material = Enum.Material.Brick,
		})
		teil(m, { Name = "Ring", Shape = Enum.PartType.Cylinder, Size = Vector3.new(0.5, 2.4, 2.4), CFrame = CFrame.new(pos + Vector3.new(x, 16.5, 4.5)) * STEHEND, Color = Color3.fromRGB(240, 240, 240), Material = Enum.Material.SmoothPlastic })
		local rauch = Instance.new("Smoke")
		rauch.Color = Color3.fromRGB(90, 90, 90)
		rauch.Size = 2
		rauch.RiseVelocity = 6
		rauch.Opacity = 0.3
		rauch.Parent = schornstein
	end
	-- Rolltor, Rampe, Fenster und Rohre
	teil(m, { Name = "Rolltor", Size = Vector3.new(5, 5, 0.3), CFrame = CFrame.new(pos + Vector3.new(-3, 2.5, -6.1)), Color = Color3.fromRGB(200, 200, 205), Material = Enum.Material.DiamondPlate })
	teil(m, { Name = "Rampe", Size = Vector3.new(6, 0.8, 2.5), CFrame = CFrame.new(pos + Vector3.new(-3, 0.4, -7.2)), Color = Color3.fromRGB(110, 110, 110), Material = Enum.Material.Concrete })
	for _, x in ipairs({ 2.5, 5.5 }) do
		fenster(m, CFrame.new(pos + Vector3.new(x, 5, -6.05)), 2, 2.4)
	end
	teil(m, { Name = "Rohr", Shape = Enum.PartType.Cylinder, Size = Vector3.new(12, 0.6, 0.6), CFrame = CFrame.new(pos + Vector3.new(0, 7, 6.3)) * CFrame.Angles(0, 0, 0), Color = Color3.fromRGB(180, 180, 185), Material = Enum.Material.Metal })
	teil(m, { Name = "Kiste", Size = Vector3.new(1.6, 1.6, 1.6), CFrame = CFrame.new(pos + Vector3.new(-6.8, 0.8, -7)), Color = Color3.fromRGB(160, 120, 70), Material = Enum.Material.WoodPlanks })
	teil(m, { Name = "Kiste", Size = Vector3.new(1.6, 1.6, 1.6), CFrame = CFrame.new(pos + Vector3.new(-6.8, 2.4, -7)) * CFrame.Angles(0, GRAD(20), 0), Color = Color3.fromRGB(160, 120, 70), Material = Enum.Material.WoodPlanks })
	m.PrimaryPart = halle
	return m
end

-- Bürogebäude aus Glas: bringt viel Geld
function Modelle.Buero(pos: Vector3): Model
	local m = Instance.new("Model")
	m.Name = "Buero"
	local glas = teil(m, {
		Name = "Glasturm",
		Size = Vector3.new(13, 24, 12),
		CFrame = CFrame.new(pos + Vector3.new(0, 12.5, 0)),
		Color = Color3.fromRGB(70, 130, 190),
		Material = Enum.Material.Glass,
		Reflectance = 0.25,
	})
	-- Metall-Streben, damit es nach Glasfassade aussieht
	for i = -2, 2 do
		teil(m, { Name = "Strebe", Size = Vector3.new(0.3, 24, 12.2), CFrame = CFrame.new(pos + Vector3.new(i * 3.1, 12.5, 0)), Color = Color3.fromRGB(200, 205, 215), Material = Enum.Material.Metal })
	end
	for stock = 1, 5 do
		teil(m, { Name = "Etage", Size = Vector3.new(13.2, 0.3, 12.2), CFrame = CFrame.new(pos + Vector3.new(0, stock * 4.4, 0)), Color = Color3.fromRGB(200, 205, 215), Material = Enum.Material.Metal })
	end
	teil(m, { Name = "Sockel", Size = Vector3.new(14, 1, 13), CFrame = CFrame.new(pos + Vector3.new(0, 0.5, 0)), Color = Color3.fromRGB(60, 60, 65), Material = Enum.Material.Granite })
	teil(m, { Name = "Eingang", Size = Vector3.new(5, 0.4, 3), CFrame = CFrame.new(pos + Vector3.new(0, 4, -7.4)), Color = Color3.fromRGB(40, 40, 45), Material = Enum.Material.Metal })
	local dach = teil(m, { Name = "Dach", Size = Vector3.new(13.4, 1.2, 12.4), CFrame = CFrame.new(pos + Vector3.new(0, 25, 0)), Color = Color3.fromRGB(60, 60, 65), Material = Enum.Material.Metal })
	schrift(dach, Enum.NormalId.Front, "BÜRO", Color3.fromRGB(120, 220, 255))
	teil(m, { Name = "Klimaanlage", Size = Vector3.new(3, 1.5, 2), CFrame = CFrame.new(pos + Vector3.new(-3, 26.3, 2)), Color = Color3.fromRGB(180, 180, 180), Material = Enum.Material.Metal })
	busch(m, pos + Vector3.new(-6, 0, -7.5), 1.8)
	busch(m, pos + Vector3.new(6, 0, -7.5), 1.8)
	m.PrimaryPart = glas
	return m
end

-- Einkaufszentrum mit bunten Markisen: bringt viel Geld
function Modelle.Einkaufszentrum(pos: Vector3): Model
	local m = Instance.new("Model")
	m.Name = "Einkaufszentrum"
	local bau = teil(m, {
		Name = "Gebaeude",
		Size = Vector3.new(17, 9, 12),
		CFrame = CFrame.new(pos + Vector3.new(0, 4.5, 1)),
		Color = Color3.fromRGB(240, 235, 225),
		Material = Enum.Material.SmoothPlastic,
	})
	teil(m, { Name = "Glasfront", Size = Vector3.new(15, 5, 0.3), CFrame = CFrame.new(pos + Vector3.new(0, 3, -5.1)), Color = Color3.fromRGB(150, 200, 230), Material = Enum.Material.Glass, Transparency = 0.2 })
	local markisen = { Color3.fromRGB(220, 60, 60), Color3.fromRGB(240, 190, 40), Color3.fromRGB(60, 160, 220), Color3.fromRGB(80, 180, 90) }
	for i, farbe in ipairs(markisen) do
		teil(m, {
			Name = "Markise",
			Size = Vector3.new(3.6, 0.3, 2),
			CFrame = CFrame.new(pos + Vector3.new(-5.7 + (i - 1) * 3.8, 5.8, -6)) * CFrame.Angles(GRAD(-20), 0, 0),
			Color = farbe,
			Material = Enum.Material.Fabric,
		})
	end
	local schild = teil(m, { Name = "Schild", Size = Vector3.new(10, 2.2, 0.4), CFrame = CFrame.new(pos + Vector3.new(0, 8, -5.2)), Color = Color3.fromRGB(200, 40, 90), Material = Enum.Material.SmoothPlastic })
	schrift(schild, Enum.NormalId.Front, "SHOPPING", Color3.new(1, 1, 1))
	-- kleiner Parkplatz mit Autos
	teil(m, { Name = "Parkplatz", Size = Vector3.new(17, 0.15, 3.5), CFrame = CFrame.new(pos + Vector3.new(0, 0.1, -8)), Color = Color3.fromRGB(60, 60, 65), Material = Enum.Material.Asphalt })
	for i, farbe in ipairs({ Color3.fromRGB(200, 30, 30), Color3.fromRGB(30, 80, 200), Color3.fromRGB(240, 240, 240) }) do
		local x = -5 + (i - 1) * 5
		teil(m, { Name = "Auto", Size = Vector3.new(2, 1, 3.2), CFrame = CFrame.new(pos + Vector3.new(x, 0.7, -8)), Color = farbe, Material = Enum.Material.SmoothPlastic })
		teil(m, { Name = "Autodach", Size = Vector3.new(1.8, 0.7, 1.6), CFrame = CFrame.new(pos + Vector3.new(x, 1.5, -8.1)), Color = Color3.fromRGB(40, 50, 70), Material = Enum.Material.Glass })
	end
	m.PrimaryPart = bau
	return m
end

-- Bank mit Säulen und Gold: bringt am meisten Geld
function Modelle.Bank(pos: Vector3): Model
	local m = Instance.new("Model")
	m.Name = "Bank"
	local marmor = Color3.fromRGB(240, 238, 230)
	teil(m, { Name = "Treppe1", Size = Vector3.new(15, 0.6, 13), CFrame = CFrame.new(pos + Vector3.new(0, 0.3, 0)), Color = marmor, Material = Enum.Material.Marble })
	teil(m, { Name = "Treppe2", Size = Vector3.new(14, 0.6, 12), CFrame = CFrame.new(pos + Vector3.new(0, 0.9, 0.3)), Color = marmor, Material = Enum.Material.Marble })
	local haus = teil(m, {
		Name = "Halle",
		Size = Vector3.new(12, 8, 8),
		CFrame = CFrame.new(pos + Vector3.new(0, 5.2, 1.5)),
		Color = Color3.fromRGB(225, 220, 205),
		Material = Enum.Material.Marble,
	})
	-- Säulen vorne
	for i = 0, 5 do
		teil(m, {
			Name = "Saeule",
			Shape = Enum.PartType.Cylinder,
			Size = Vector3.new(8, 1, 1),
			CFrame = CFrame.new(pos + Vector3.new(-5.5 + i * 2.2, 5.2, -3.8)) * STEHEND,
			Color = marmor,
			Material = Enum.Material.Marble,
		})
	end
	teil(m, { Name = "Gebaelk", Size = Vector3.new(14, 1.2, 10.5), CFrame = CFrame.new(pos + Vector3.new(0, 9.8, 0.3)), Color = marmor, Material = Enum.Material.Marble })
	teil(m, { Name = "Attika", Size = Vector3.new(11, 1.4, 8.5), CFrame = CFrame.new(pos + Vector3.new(0, 11.1, 0.8)), Color = marmor, Material = Enum.Material.Marble })
	local schild = teil(m, { Name = "Schild", Size = Vector3.new(6, 1.2, 0.3), CFrame = CFrame.new(pos + Vector3.new(0, 9.8, -5)), Color = Color3.fromRGB(30, 60, 40), Material = Enum.Material.SmoothPlastic })
	schrift(schild, Enum.NormalId.Front, "BANK", Color3.fromRGB(255, 210, 60))
	local dollar = teil(m, { Name = "Dollar", Shape = Enum.PartType.Cylinder, Size = Vector3.new(0.4, 3, 3), CFrame = CFrame.new(pos + Vector3.new(0, 13.3, 0.8)) * LIEGEND, Color = Color3.fromRGB(255, 200, 40), Material = Enum.Material.Neon })
	schrift(dollar, Enum.NormalId.Right, "$", Color3.fromRGB(120, 80, 0))
	teil(m, { Name = "Tuer", Size = Vector3.new(3, 5, 0.3), CFrame = CFrame.new(pos + Vector3.new(0, 3.7, -2.6)), Color = Color3.fromRGB(120, 85, 40), Material = Enum.Material.Wood })
	m.PrimaryPart = haus
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

function Modelle.Kraftwerk(pos: Vector3): Model
	local m = Instance.new("Model")
	m.Name = "Kraftwerk"
	local halle = teil(m, {
		Name = "Halle",
		Size = Vector3.new(8, 7, 12),
		CFrame = CFrame.new(pos + Vector3.new(-3.5, 3.5, 0)),
		Color = Color3.fromRGB(200, 200, 190),
		Material = Enum.Material.Concrete,
	})
	-- Kühlturm mit Dampf
	local kuehlturm = teil(m, {
		Name = "Kuehlturm",
		Shape = Enum.PartType.Cylinder,
		Size = Vector3.new(14, 7, 7),
		CFrame = CFrame.new(pos + Vector3.new(4, 7, 0)) * STEHEND,
		Color = Color3.fromRGB(215, 215, 210),
		Material = Enum.Material.Concrete,
	})
	local dampf = Instance.new("Smoke")
	dampf.Color = Color3.fromRGB(245, 245, 245)
	dampf.Size = 5
	dampf.RiseVelocity = 5
	dampf.Opacity = 0.25
	dampf.Parent = kuehlturm
	-- gelbes Blitz-Schild
	teil(m, {
		Name = "Schild",
		Size = Vector3.new(3, 3, 0.3),
		CFrame = CFrame.new(pos + Vector3.new(-3.5, 4.5, -6.1)) * CFrame.Angles(0, 0, GRAD(45)),
		Color = Color3.fromRGB(250, 210, 0),
		Material = Enum.Material.Neon,
	})
	m.PrimaryPart = halle
	return m
end

function Modelle.Panzerabwehr(pos: Vector3): Model
	local m = Instance.new("Model")
	m.Name = "Panzerabwehr"
	local sandsaecke = teil(m, {
		Name = "Sandsaecke",
		Shape = Enum.PartType.Cylinder,
		Size = Vector3.new(3, 9, 9),
		CFrame = CFrame.new(pos + Vector3.new(0, 1.5, 0)) * STEHEND,
		Color = Color3.fromRGB(170, 145, 100),
		Material = Enum.Material.Sand,
	})
	teil(m, {
		Name = "Geschuetz",
		Size = Vector3.new(3, 2, 4),
		CFrame = CFrame.new(pos + Vector3.new(0, 4, 0)),
		Color = Color3.fromRGB(70, 75, 60),
		Material = Enum.Material.Metal,
	})
	teil(m, {
		Name = "Rohr",
		Shape = Enum.PartType.Cylinder,
		Size = Vector3.new(8, 0.8, 0.8),
		CFrame = CFrame.new(pos + Vector3.new(0, 4.3, -5)) * LIEGEND,
		Color = Color3.fromRGB(50, 50, 45),
		Material = Enum.Material.Metal,
	})
	m.PrimaryPart = sandsaecke
	return m
end

-- Raketenwerfer: ein Startgestell mit 4 senkrechten Rohren.
-- Oben in jedem Rohr sitzt ein Attachment "Startpunkt", dort starten die Raketen.
function Modelle.Raketenwerfer(pos: Vector3): Model
	local m = Instance.new("Model")
	m.Name = "Raketenwerfer"
	local oliv = Color3.fromRGB(80, 90, 55)
	local platte = teil(m, {
		Name = "Platte",
		Size = Vector3.new(13, 0.8, 13),
		CFrame = CFrame.new(pos + Vector3.new(0, 0.4, 0)),
		Color = Color3.fromRGB(55, 55, 60),
		Material = Enum.Material.DiamondPlate,
	})
	-- gelb-schwarze Warnecken
	for _, ecke in ipairs({ { -5.5, -5.5 }, { 5.5, -5.5 }, { -5.5, 5.5 }, { 5.5, 5.5 } }) do
		teil(m, {
			Name = "Warnecke",
			Size = Vector3.new(2, 0.9, 2),
			CFrame = CFrame.new(pos + Vector3.new(ecke[1], 0.45, ecke[2])),
			Color = Color3.fromRGB(240, 200, 0),
			Material = Enum.Material.SmoothPlastic,
		})
	end
	teil(m, {
		Name = "Gestell",
		Size = Vector3.new(8, 2, 8),
		CFrame = CFrame.new(pos + Vector3.new(0, 1.8, 0)),
		Color = oliv,
		Material = Enum.Material.Metal,
	})
	for i, ecke in ipairs({ { -2, -2 }, { 2, -2 }, { -2, 2 }, { 2, 2 } }) do
		local rohr = teil(m, {
			Name = "Rohr" .. i,
			Shape = Enum.PartType.Cylinder,
			Size = Vector3.new(6, 2.6, 2.6),
			CFrame = CFrame.new(pos + Vector3.new(ecke[1], 5.8, ecke[2])) * STEHEND,
			Color = Color3.fromRGB(60, 65, 45),
			Material = Enum.Material.Metal,
		})
		-- dunkle Öffnung oben
		teil(m, {
			Name = "Oeffnung",
			Shape = Enum.PartType.Cylinder,
			Size = Vector3.new(0.2, 2, 2),
			CFrame = CFrame.new(pos + Vector3.new(ecke[1], 8.8, ecke[2])) * STEHEND,
			Color = Color3.fromRGB(15, 15, 15),
			Material = Enum.Material.SmoothPlastic,
		})
		local punkt = Instance.new("Attachment")
		punkt.Name = "Startpunkt"
		punkt.Position = Vector3.new(3, 0, 0) -- das senkrechte Rohr zeigt mit +X nach oben
		punkt.Parent = rohr
	end
	-- Antenne mit rotem Licht
	teil(m, {
		Name = "Antenne",
		Size = Vector3.new(0.3, 6, 0.3),
		CFrame = CFrame.new(pos + Vector3.new(5, 3.8, -5)),
		Color = Color3.fromRGB(180, 180, 180),
		Material = Enum.Material.Metal,
	})
	teil(m, {
		Name = "Lampe",
		Size = Vector3.new(0.7, 0.7, 0.7),
		CFrame = CFrame.new(pos + Vector3.new(5, 7, -5)),
		Color = Color3.fromRGB(255, 40, 40),
		Material = Enum.Material.Neon,
	})
	m.PrimaryPart = platte
	return m
end

-- Ein kleiner Bewohner, der vor seinem Haus steht
function Modelle.bewohner(eltern: Instance, pos: Vector3, drehung: number)
	local cf = CFrame.new(pos) * CFrame.Angles(0, drehung, 0)
	local hemden = {
		Color3.fromRGB(200, 60, 60),
		Color3.fromRGB(60, 120, 200),
		Color3.fromRGB(60, 160, 80),
		Color3.fromRGB(230, 180, 40),
		Color3.fromRGB(150, 80, 180),
	}
	local haut = Color3.fromRGB(240, 200, 160)
	local function koerperteil(name, groesse, versatz, farbe)
		teil(eltern, {
			Name = name,
			Size = groesse,
			CFrame = cf * CFrame.new(versatz),
			Color = farbe,
			Material = Enum.Material.SmoothPlastic,
			CanCollide = false,
		})
	end
	koerperteil("Bein", Vector3.new(0.45, 1.2, 0.45), Vector3.new(-0.25, 0.6, 0), Color3.fromRGB(40, 50, 90))
	koerperteil("Bein", Vector3.new(0.45, 1.2, 0.45), Vector3.new(0.25, 0.6, 0), Color3.fromRGB(40, 50, 90))
	koerperteil("Bauch", Vector3.new(1, 1.2, 0.5), Vector3.new(0, 1.8, 0), hemden[math.random(1, #hemden)])
	koerperteil("Arm", Vector3.new(0.35, 1.1, 0.35), Vector3.new(-0.7, 1.8, 0), haut)
	koerperteil("Arm", Vector3.new(0.35, 1.1, 0.35), Vector3.new(0.7, 1.8, 0), haut)
	koerperteil("Kopf", Vector3.new(0.7, 0.7, 0.7), Vector3.new(0, 2.8, 0), haut)
end

------------------------------------------------------------------------
-- FAHRZEUGE (zeigen nach vorne = -Z, Mittelpunkt unten auf dem Boden)
------------------------------------------------------------------------

function Modelle.panzer(farbe: Color3): Model
	local m = Instance.new("Model")
	m.Name = "Panzer"
	local oliv = Color3.fromRGB(85, 95, 55)
	local function neu(eigenschaften)
		eigenschaften.CanCollide = false
		eigenschaften.CanQuery = false
		return teil(m, eigenschaften)
	end
	local wurzel = neu({ Name = "Wurzel", Size = Vector3.one * 0.2, Transparency = 1, CFrame = CFrame.new() })
	for _, x in ipairs({ -3.8, 3.8 }) do
		neu({
			Name = "Kette",
			Size = Vector3.new(2, 2.2, 12),
			CFrame = CFrame.new(x, 1.1, 0),
			Color = Color3.fromRGB(35, 35, 35),
			Material = Enum.Material.DiamondPlate,
		})
	end
	neu({ Name = "Wanne", Size = Vector3.new(6, 2.4, 11), CFrame = CFrame.new(0, 2.3, 0), Color = oliv, Material = Enum.Material.Metal })
	neu({ Name = "Turm", Size = Vector3.new(5, 2, 5.5), CFrame = CFrame.new(0, 4.4, 0.5), Color = oliv, Material = Enum.Material.Metal })
	-- Streifen in der Farbe der eigenen Stadt
	neu({ Name = "Streifen", Size = Vector3.new(5.1, 0.6, 5.6), CFrame = CFrame.new(0, 5.2, 0.5), Color = farbe, Material = Enum.Material.SmoothPlastic })
	local rohr = neu({
		Name = "Rohr",
		Shape = Enum.PartType.Cylinder,
		Size = Vector3.new(8, 0.7, 0.7),
		CFrame = CFrame.new(0, 4.4, -6) * LIEGEND,
		Color = Color3.fromRGB(60, 65, 40),
		Material = Enum.Material.Metal,
	})
	-- Mündung vorne am Rohr, für den Mündungsblitz
	local muendung = Instance.new("Attachment")
	muendung.Name = "Muendung"
	muendung.Position = Vector3.new(4, 0, 0) -- das gedrehte Rohr zeigt mit +X nach vorne
	muendung.Parent = rohr
	-- Staub hinter den Ketten
	local staub = Instance.new("ParticleEmitter")
	staub.Name = "Staub"
	staub.Texture = "rbxasset://textures/particles/smoke_main.dds"
	staub.Color = ColorSequence.new(Color3.fromRGB(160, 140, 110))
	staub.Size = NumberSequence.new(1.5, 5)
	staub.Transparency = NumberSequence.new(0.4, 1)
	staub.Lifetime = NumberRange.new(1, 2)
	staub.Rate = 25
	staub.Speed = NumberRange.new(2, 5)
	staub.SpreadAngle = Vector2.new(30, 30)
	staub.EmissionDirection = Enum.NormalId.Back
	staub.Enabled = false
	staub.Parent = neu({ Name = "Staubquelle", Size = Vector3.new(8, 0.5, 0.5), Transparency = 1, CFrame = CFrame.new(0, 0.5, 6.5) })

	local motor = Instance.new("Sound")
	motor.Name = "Motor"
	motor.Looped = true
	motor.Volume = 0.5
	motor.PlaybackSpeed = 0.4
	motor.RollOffMaxDistance = 300
	motor.Parent = wurzel

	m.PrimaryPart = wurzel
	return m
end

function Modelle.jet(farbe: Color3): Model
	local m = Instance.new("Model")
	m.Name = "Jet"
	local grau = Color3.fromRGB(140, 145, 155)
	local function neu(eigenschaften)
		eigenschaften.CanCollide = false
		eigenschaften.CanQuery = false
		eigenschaften.CanTouch = false
		return teil(m, eigenschaften)
	end
	local wurzel = neu({ Name = "Wurzel", Size = Vector3.one * 0.2, Transparency = 1, CFrame = CFrame.new() })
	neu({ Name = "Rumpf", Shape = Enum.PartType.Cylinder, Size = Vector3.new(14, 2, 2), CFrame = LIEGEND, Color = grau, Material = Enum.Material.Metal })
	local nase = neu({ Name = "Nase", Size = Vector3.new(2, 2, 5), CFrame = CFrame.new(0, 0, -7), Color = grau, Material = Enum.Material.Metal })
	local kugel = Instance.new("SpecialMesh")
	kugel.MeshType = Enum.MeshType.Sphere
	kugel.Parent = nase
	local cockpit = neu({ Name = "Cockpit", Size = Vector3.new(1.4, 1.2, 3.5), CFrame = CFrame.new(0, 1, -3.5), Color = Color3.fromRGB(40, 60, 90), Material = Enum.Material.Glass })
	local kugel2 = Instance.new("SpecialMesh")
	kugel2.MeshType = Enum.MeshType.Sphere
	kugel2.Parent = cockpit
	neu({ Name = "Fluegel", Size = Vector3.new(16, 0.35, 4.5), CFrame = CFrame.new(0, -0.2, 0.5), Color = grau, Material = Enum.Material.Metal })
	neu({ Name = "Fluegelspitze", Size = Vector3.new(16.2, 0.4, 1), CFrame = CFrame.new(0, -0.2, 2.2), Color = farbe, Material = Enum.Material.SmoothPlastic })
	neu({ Name = "Hoehenruder", Size = Vector3.new(7, 0.3, 2.2), CFrame = CFrame.new(0, 0, 6), Color = grau, Material = Enum.Material.Metal })
	neu({ Name = "Seitenruder", Size = Vector3.new(0.3, 3.5, 2.8), CFrame = CFrame.new(0, 1.8, 6), Color = farbe, Material = Enum.Material.SmoothPlastic })

	-- Nachbrenner
	local ausstoss = neu({ Name = "Ausstoss", Size = Vector3.one * 0.4, Transparency = 1, CFrame = CFrame.new(0, 0, 7.4) })
	local feuer = Instance.new("ParticleEmitter")
	feuer.Name = "Feuer"
	feuer.Texture = "rbxasset://textures/particles/fire_main.dds"
	feuer.Color = ColorSequence.new(Color3.fromRGB(255, 220, 150), Color3.fromRGB(255, 90, 20))
	feuer.LightEmission = 1
	feuer.Size = NumberSequence.new(1.4, 0.2)
	feuer.Transparency = NumberSequence.new(0.1, 1)
	feuer.Lifetime = NumberRange.new(0.1, 0.2)
	feuer.Rate = 120
	feuer.Speed = NumberRange.new(20, 30)
	feuer.EmissionDirection = Enum.NormalId.Back
	feuer.Parent = ausstoss
	local licht = Instance.new("PointLight")
	licht.Color = Color3.fromRGB(255, 140, 50)
	licht.Brightness = 4
	licht.Range = 20
	licht.Parent = ausstoss

	local ton = Instance.new("Sound")
	ton.Name = "Flug"
	ton.Looped = true
	ton.Volume = 0.8
	ton.PlaybackSpeed = 0.7
	ton.RollOffMinDistance = 30
	ton.RollOffMaxDistance = 700
	ton.Parent = wurzel

	m.PrimaryPart = wurzel
	return m
end

function Modelle.bombe(): Part
	local bombe = Instance.new("Part")
	bombe.Name = "Bombe"
	bombe.Shape = Enum.PartType.Cylinder
	bombe.Size = Vector3.new(2.4, 0.9, 0.9)
	bombe.Color = Color3.fromRGB(50, 55, 45)
	bombe.Material = Enum.Material.Metal
	bombe.Anchored = true
	bombe.CanCollide = false
	bombe.CanQuery = false
	return bombe
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

	-- Kondensstreifen: eine lange weiße Spur, die langsam verblasst
	local a0 = Instance.new("Attachment")
	a0.Position = Vector3.new(-0.5 * dicke, 0, 0)
	a0.Parent = ausstoss
	local a1 = Instance.new("Attachment")
	a1.Position = Vector3.new(0.5 * dicke, 0, 0)
	a1.Parent = ausstoss
	local spur = Instance.new("Trail")
	spur.Name = "Spur"
	spur.Attachment0 = a0
	spur.Attachment1 = a1
	spur.Color = ColorSequence.new(Color3.fromRGB(255, 220, 160), Color3.fromRGB(200, 200, 200))
	spur.Transparency = NumberSequence.new({
		NumberSequenceKeypoint.new(0, 0.15),
		NumberSequenceKeypoint.new(0.3, 0.55),
		NumberSequenceKeypoint.new(1, 1),
	})
	spur.WidthScale = NumberSequence.new(0.6, 3)
	spur.Lifetime = math.clamp(2.5 * s, 0.6, 4)
	spur.FaceCamera = true
	spur.MinLength = 0.2
	spur.Enabled = false
	spur.Parent = ausstoss

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
		if effekt:IsA("ParticleEmitter") or effekt:IsA("Light") or effekt:IsA("Trail") then
			effekt.Enabled = an
		end
	end
end

------------------------------------------------------------------------
-- LANDSCHAFT
------------------------------------------------------------------------

local BLATTFARBEN = {
	Color3.fromRGB(60, 125, 50),
	Color3.fromRGB(75, 140, 55),
	Color3.fromRGB(50, 110, 60),
	Color3.fromRGB(95, 145, 50),
}

-- Laubbaum: Stamm und 3 runde Baumkronen. groesse 1 = normal
function Modelle.baum(eltern: Instance, pos: Vector3, groesse: number, zufall: Random)
	local m = Instance.new("Model")
	m.Name = "Baum"
	local hoehe = 7 * groesse
	teil(m, {
		Name = "Stamm",
		Shape = Enum.PartType.Cylinder,
		Size = Vector3.new(hoehe, 1.3 * groesse, 1.3 * groesse),
		CFrame = CFrame.new(pos + Vector3.new(0, hoehe / 2, 0)) * STEHEND,
		Color = Color3.fromRGB(105, 75, 50),
		Material = Enum.Material.Wood,
	})
	local farbe = BLATTFARBEN[zufall:NextInteger(1, #BLATTFARBEN)]
	for i = 1, 3 do
		local d = (5 + zufall:NextNumber() * 2.5) * groesse
		local versatz = Vector3.new(zufall:NextNumber(-1.6, 1.6), zufall:NextNumber(-0.5, 1.5), zufall:NextNumber(-1.6, 1.6)) * groesse
		teil(m, {
			Name = "Krone",
			Shape = Enum.PartType.Ball,
			Size = Vector3.one * d,
			CFrame = CFrame.new(pos + Vector3.new(0, hoehe + 0.5 * groesse * i, 0) + versatz),
			Color = farbe:Lerp(Color3.new(0, 0, 0), zufall:NextNumber() * 0.15),
			Material = Enum.Material.LeafyGrass,
			CanCollide = false,
		})
	end
	m.Parent = eltern
	return m
end

-- Nadelbaum: Stamm und 3 übereinander gestapelte, immer kleinere "Etagen"
function Modelle.tanne(eltern: Instance, pos: Vector3, groesse: number)
	local m = Instance.new("Model")
	m.Name = "Tanne"
	teil(m, {
		Name = "Stamm",
		Size = Vector3.new(1, 4 * groesse, 1),
		CFrame = CFrame.new(pos + Vector3.new(0, 2 * groesse, 0)),
		Color = Color3.fromRGB(95, 65, 45),
		Material = Enum.Material.Wood,
	})
	for i = 0, 2 do
		local breite = (7 - i * 2) * groesse
		local etage = teil(m, {
			Name = "Zweige",
			Size = Vector3.new(breite, 3.2 * groesse, breite),
			CFrame = CFrame.new(pos + Vector3.new(0, (4.5 + i * 2.6) * groesse, 0)) * CFrame.Angles(0, math.rad(i * 30), 0),
			Color = Color3.fromRGB(40, 95, 55),
			Material = Enum.Material.LeafyGrass,
			CanCollide = false,
		})
		-- gestauchte Kugel: sieht aus wie eine Etage aus Tannenzweigen
		local form = Instance.new("SpecialMesh")
		form.MeshType = Enum.MeshType.Sphere
		form.Parent = etage
	end
	m.Parent = eltern
	return m
end

-- Straßenlaterne: tagsüber aus, nachts an (Welt.lua schaltet alles mit dem Tag "Laterne")
function Modelle.laterne(eltern: Instance, pos: Vector3, blickRichtung: Vector3)
	local m = Instance.new("Model")
	m.Name = "Laterne"
	local cf = CFrame.lookAt(pos, pos + Vector3.new(blickRichtung.X, 0, blickRichtung.Z))
	teil(m, {
		Name = "Fuss",
		Size = Vector3.new(1.4, 0.6, 1.4),
		CFrame = cf * CFrame.new(0, 0.3, 0),
		Color = Color3.fromRGB(50, 52, 58),
		Material = Enum.Material.Metal,
	})
	teil(m, {
		Name = "Mast",
		Size = Vector3.new(0.5, 13, 0.5),
		CFrame = cf * CFrame.new(0, 6.8, 0),
		Color = Color3.fromRGB(60, 62, 70),
		Material = Enum.Material.Metal,
	})
	teil(m, {
		Name = "Arm",
		Size = Vector3.new(0.4, 0.4, 3.5),
		CFrame = cf * CFrame.new(0, 13.1, -1.6),
		Color = Color3.fromRGB(60, 62, 70),
		Material = Enum.Material.Metal,
	})
	local kopf = teil(m, {
		Name = "Lampe",
		Size = Vector3.new(1.4, 0.5, 2),
		CFrame = cf * CFrame.new(0, 12.8, -3.2),
		Color = Color3.fromRGB(120, 120, 110),
		Material = Enum.Material.SmoothPlastic,
		CanCollide = false,
	})
	local licht = Instance.new("SpotLight")
	licht.Face = Enum.NormalId.Bottom
	licht.Angle = 110
	licht.Range = 28
	licht.Brightness = 3
	licht.Color = Color3.fromRGB(255, 210, 150)
	licht.Shadows = false
	licht.Enabled = false
	licht.Parent = kopf
	CollectionService:AddTag(kopf, "Laterne")
	m.Parent = eltern
	return m
end

return Modelle
