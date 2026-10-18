-- Welt.lua
-- Die Landschaft rund um die 4 Städte und das Licht:
--   Gras-Boden (Terrain), Berge mit Schnee am Rand, zwei Seen und Wälder,
--   Straßen mit Laternen zwischen den Städten, ein Kreisel und ein Raketen-Denkmal
--   und ein Wechsel von Tag und Nacht.

local CollectionService = game:GetService("CollectionService")
local Lighting = game:GetService("Lighting")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")

local Config = require(ReplicatedStorage.Shared.Config)
local Modelle = require(script.Parent.Modelle)

local Welt = {}

local teil = Modelle.teil
local ordner: Folder

-- Seen: Mitte (x, z) und Radius. Sie liegen absichtlich nicht auf den Wegen der Panzer.
local SEEN = {
	{ mitte = Vector2.new(0, 330), radius = 48 },
	{ mitte = Vector2.new(-335, 0), radius = 34 },
}

-- Mittelpunkte der 4 Städte (dieselbe Reihenfolge wie im StadtManager)
local function stadtMitten(): { Vector2 }
	local mitten = {}
	for _, ecke in ipairs({ { -1, -1 }, { 1, -1 }, { -1, 1 }, { 1, 1 } }) do
		table.insert(mitten, Vector2.new(ecke[1], ecke[2]) * Config.STADT_ABSTAND)
	end
	return mitten
end

-- Abstand eines Punktes zu einer Strecke von a nach b
local function abstandZurStrecke(p: Vector2, a: Vector2, b: Vector2): number
	local ab = b - a
	local t = math.clamp((p - a):Dot(ab) / ab:Dot(ab), 0, 1)
	return (p - (a + ab * t)).Magnitude
end

------------------------------------------------------------------------
-- Boden, Berge, Seen
------------------------------------------------------------------------

local function terrainBauen()
	local terrain = workspace.Terrain

	-- Gras-Boden: oben genau auf Höhe 0
	terrain:FillBlock(CFrame.new(0, -6, 0), Vector3.new(1200, 12, 1200), Enum.Material.Grass)

	-- Seen mit Sandstrand
	for _, see in ipairs(SEEN) do
		terrain:FillCylinder(CFrame.new(see.mitte.X, -3, see.mitte.Y), 6, see.radius + 8, Enum.Material.Sand)
		terrain:FillCylinder(CFrame.new(see.mitte.X, -4, see.mitte.Y), 8, see.radius, Enum.Material.Water)
	end
	terrain.WaterColor = Color3.fromRGB(35, 105, 135)
	terrain.WaterTransparency = 0.5
	terrain.WaterReflectance = 0.6
	terrain.WaterWaveSize = 0.12
	terrain.WaterWaveSpeed = 8

	-- Berge im Kreis um die Karte: unten Gras, oben Fels, auf den großen Schnee
	local zufall = Random.new(2024)
	local anzahl = 30
	for i = 1, anzahl do
		local winkel = i / anzahl * math.pi * 2 + zufall:NextNumber(-0.08, 0.08)
		local abstand = zufall:NextNumber(470, 540)
		local r = zufall:NextNumber(55, 95)
		local mitte = Vector3.new(math.cos(winkel) * abstand, -r * 0.45, math.sin(winkel) * abstand)
		terrain:FillBall(mitte, r, Enum.Material.Grass)
		terrain:FillBall(mitte + Vector3.new(0, r * 0.3, 0), r * 0.75, Enum.Material.Rock)
		if r > 78 then
			terrain:FillBall(mitte + Vector3.new(0, r * 0.82, 0), r * 0.25, Enum.Material.Snow)
		end
	end

	-- echte Wolken am Himmel
	if not terrain:FindFirstChildOfClass("Clouds") then
		local wolken = Instance.new("Clouds")
		wolken.Cover = 0.55
		wolken.Density = 0.55
		wolken.Parent = terrain
	end

	-- Die graue Platte aus der Studio-Vorlage verstecken, sonst liegt sie über dem Gras
	local platte = workspace:FindFirstChild("Baseplate")
	if platte and platte:IsA("BasePart") then
		platte.Transparency = 1
		platte.CanCollide = false
		for _, kind in ipairs(platte:GetChildren()) do
			if kind:IsA("Texture") or kind:IsA("Decal") then
				kind.Transparency = 1
			end
		end
	end
end

------------------------------------------------------------------------
-- Straßen
------------------------------------------------------------------------

local strassen: { { a: Vector2, b: Vector2 } } = {}

local function strasseBauen(a: Vector2, b: Vector2)
	local laenge = (b - a).Magnitude
	local mitte = (a + b) / 2
	local cf = CFrame.lookAt(Vector3.new(mitte.X, 0, mitte.Y), Vector3.new(b.X, 0, b.Y))

	teil(ordner, {
		Name = "Strasse",
		Size = Vector3.new(12, 0.2, laenge), -- ganz flach, damit Panzer nicht einsinken
		CFrame = cf,
		Color = Color3.fromRGB(48, 49, 54),
		Material = Enum.Material.Asphalt,
	})
	for seite = -1, 1, 2 do
		teil(ordner, {
			Name = "Bordstein",
			Size = Vector3.new(0.8, 0.5, laenge),
			CFrame = cf * CFrame.new(seite * 6.4, 0.15, 0),
			Color = Color3.fromRGB(175, 175, 170),
			Material = Enum.Material.Concrete,
		})
	end
	-- gestrichelte Mittellinie
	for d = -laenge / 2 + 5, laenge / 2 - 5, 10 do
		teil(ordner, {
			Name = "Mittellinie",
			Size = Vector3.new(0.4, 0.22, 4.5),
			CFrame = cf * CFrame.new(0, 0, d),
			Color = Color3.fromRGB(240, 240, 235),
			Material = Enum.Material.SmoothPlastic,
			CanCollide = false,
		})
	end
	-- Laternen abwechselnd links und rechts
	local anzahl = math.floor(laenge / 45)
	for i = 1, anzahl do
		local seite = if i % 2 == 0 then 1 else -1
		local pos = (cf * CFrame.new(seite * 8.2, 0, -laenge / 2 + i * laenge / (anzahl + 1))).Position
		Modelle.laterne(ordner, pos, cf.RightVector * -seite)
	end

	table.insert(strassen, { a = a, b = b })
end

local function strassenBauen()
	local mitten = stadtMitten()
	-- 4 Straßen außen herum und 2 quer durch die Mitte (genau dort, wo die Panzer fahren)
	local paare = { { 1, 2 }, { 3, 4 }, { 1, 3 }, { 2, 4 }, { 1, 4 }, { 2, 3 } }
	local rand = Config.STADT_GROESSE / 2 + 6
	for _, paar in ipairs(paare) do
		local a, b = mitten[paar[1]], mitten[paar[2]]
		local richtung = (b - a).Unit
		-- bis zum Rand der Stadt kürzen
		local kuerzen = rand / math.max(math.abs(richtung.X), math.abs(richtung.Y))
		local anfang, ende = a + richtung * kuerzen, b - richtung * kuerzen
		if math.abs(richtung.X) > 0.1 and math.abs(richtung.Y) > 0.1 then
			-- schräge Straße: in der Mitte für den Kreisel (Radius 25) unterbrechen
			local mitte = (a + b) / 2
			strasseBauen(anfang, mitte - richtung * 25)
			strasseBauen(mitte + richtung * 25, ende)
		else
			strasseBauen(anfang, ende)
		end
	end
end

------------------------------------------------------------------------
-- Kreisel in der Mitte und Raketen-Denkmal mit 4 Fahnen
------------------------------------------------------------------------

-- Das Denkmal steht neben der Kreuzung, damit die Panzer nicht hindurchfahren
local DENKMAL = Vector2.new(0, -95)

local function scheibe(name: string, pos: Vector3, durchmesser: number, dicke: number, farbe: Color3, material: Enum.Material)
	return teil(ordner, {
		Name = name,
		Shape = Enum.PartType.Cylinder,
		Size = Vector3.new(dicke, durchmesser, durchmesser),
		CFrame = CFrame.new(pos) * CFrame.Angles(0, 0, math.rad(90)),
		Color = farbe,
		Material = material,
	})
end

local function denkmalBauen()
	-- flacher Kreisel, über den die Panzer fahren können
	scheibe("Kreisel", Vector3.new(0, 0, 0), 50, 0.3, Color3.fromRGB(48, 49, 54), Enum.Material.Asphalt)
	scheibe("Kreiselmitte", Vector3.new(0, 0, 0), 22, 0.4, Color3.fromRGB(80, 150, 65), Enum.Material.Grass)

	local mitte = Vector3.new(DENKMAL.X, 0, DENKMAL.Y)
	scheibe("Denkmalplatz", mitte, 40, 0.4, Color3.fromRGB(150, 145, 135), Enum.Material.Pavement)
	local sockel = teil(ordner, {
		Name = "Sockel",
		Size = Vector3.new(7, 6, 7),
		CFrame = CFrame.new(mitte + Vector3.new(0, 3.2, 0)),
		Color = Color3.fromRGB(110, 110, 115),
		Material = Enum.Material.Granite,
	})
	local s = 2.2
	local rakete = Modelle.rakete(s, Color3.fromRGB(235, 235, 235))
	-- Der Drehpunkt der Rakete ist ihre Mitte. Die Düse soll genau auf dem Sockel stehen.
	local raketenMitte = sockel.Position + Vector3.new(0, sockel.Size.Y / 2 + 9 * s / 2 + 0.8 * s, 0)
	rakete:PivotTo(CFrame.lookAt(raketenMitte, raketenMitte + Vector3.yAxis, Vector3.zAxis))
	rakete.Name = "Denkmal"
	rakete.Parent = ordner

	-- Fahnen in den Farben der Städte, jede zeigt in Richtung ihrer Stadt
	for i, stadtMitte in ipairs(stadtMitten()) do
		local richtung = (stadtMitte - DENKMAL).Unit
		local fussPunkt = mitte + Vector3.new(richtung.X, 0, richtung.Y) * 14
		teil(ordner, {
			Name = "Fahnenmast",
			Size = Vector3.new(0.35, 16, 0.35),
			CFrame = CFrame.new(fussPunkt + Vector3.new(0, 8, 0)),
			Color = Color3.fromRGB(220, 220, 220),
			Material = Enum.Material.Metal,
		})
		local oben = fussPunkt + Vector3.new(0, 14.4, 0)
		teil(ordner, {
			Name = "Fahne",
			Size = Vector3.new(4.5, 2.8, 0.1),
			-- so gedreht, dass die Fahne vom Mast weg in Richtung Stadt weht
			CFrame = CFrame.lookAt(oben, oben + Vector3.new(richtung.Y, 0, -richtung.X)) * CFrame.new(2.4, 0, 0),
			Color = Config.STADT_FARBEN[i],
			Material = Enum.Material.Fabric,
			CanCollide = false,
		})
	end
end

------------------------------------------------------------------------
-- Wälder
------------------------------------------------------------------------

-- Darf hier ein Baum stehen? Nicht in Städten, auf Straßen, in Seen oder in den Bergen.
local function platzFrei(p: Vector2): boolean
	if p.Magnitude > 440 or p.Magnitude < 36 then
		return false
	end
	for _, mitte in ipairs(stadtMitten()) do
		local d = p - mitte
		if math.max(math.abs(d.X), math.abs(d.Y)) < Config.STADT_GROESSE / 2 + 18 then
			return false
		end
	end
	for _, strasse in ipairs(strassen) do
		if abstandZurStrecke(p, strasse.a, strasse.b) < 12 then
			return false
		end
	end
	for _, see in ipairs(SEEN) do
		if (p - see.mitte).Magnitude < see.radius + 12 then
			return false
		end
	end
	if (p - DENKMAL).Magnitude < 30 then
		return false
	end
	return true
end

local function waelderBauen()
	local wald = Instance.new("Folder")
	wald.Name = "Wald"
	wald.Parent = ordner
	local zufall = Random.new(7)

	local function baumSetzen(p: Vector2)
		local groesse = zufall:NextNumber(0.8, 1.4)
		if zufall:NextNumber() < 0.65 then
			Modelle.baum(wald, Vector3.new(p.X, 0, p.Y), groesse, zufall)
		else
			Modelle.tanne(wald, Vector3.new(p.X, 0, p.Y), groesse)
		end
	end

	-- Waldstücke: an 18 Stellen stehen mehrere Bäume dicht zusammen
	local gruppen, versuche = 0, 0
	while gruppen < 18 and versuche < 2000 do
		versuche += 1
		local mitte = Vector2.new(zufall:NextNumber(-440, 440), zufall:NextNumber(-440, 440))
		if platzFrei(mitte) then
			gruppen += 1
			for _ = 1, zufall:NextInteger(5, 9) do
				local p = mitte + Vector2.new(zufall:NextNumber(-22, 22), zufall:NextNumber(-22, 22))
				if platzFrei(p) then
					baumSetzen(p)
				end
			end
		end
	end
	-- dazu einzelne Bäume überall verteilt
	local einzeln = 0
	versuche = 0
	while einzeln < 40 and versuche < 2000 do
		versuche += 1
		local p = Vector2.new(zufall:NextNumber(-440, 440), zufall:NextNumber(-440, 440))
		if platzFrei(p) then
			einzeln += 1
			baumSetzen(p)
		end
	end
end

------------------------------------------------------------------------
-- Alles bauen
------------------------------------------------------------------------

function Welt.erstellen()
	ordner = Instance.new("Folder")
	ordner.Name = "Landschaft"
	ordner.Parent = workspace

	terrainBauen()
	strassenBauen()
	denkmalBauen()
	waelderBauen()
end

-- 4 Laternen an den Ecken jeder Stadt
function Welt.stadtLichter(staedte)
	for _, stadt in ipairs(staedte) do
		for _, ecke in ipairs({ { -56, -56 }, { 56, -56 }, { -56, 56 }, { 56, 56 } }) do
			local pos = stadt.mitte + Vector3.new(ecke[1], 0, ecke[2])
			Modelle.laterne(stadt.modell, pos, stadt.mitte - pos)
		end
	end
end

------------------------------------------------------------------------
-- Tag und Nacht
------------------------------------------------------------------------

local istNacht = false
local FENSTER_LICHT = Color3.fromRGB(255, 196, 120)

-- Fenster nachts warm leuchten lassen (nicht jedes, sonst sieht es unecht aus)
local function fensterSetzen(glas: BasePart, nacht: boolean)
	if nacht then
		if glas:GetAttribute("TagFarbe") == nil then
			glas:SetAttribute("TagFarbe", glas.Color)
			glas:SetAttribute("TagMaterial", glas.Material.Name)
			glas:SetAttribute("TagTransparenz", glas.Transparency)
		end
		if math.random() < 0.7 then
			glas.Material = Enum.Material.Neon
			glas.Color = FENSTER_LICHT:Lerp(Color3.fromRGB(255, 240, 210), math.random() * 0.5)
			glas.Transparency = 0
		end
	elseif glas:GetAttribute("TagFarbe") ~= nil then
		glas.Color = glas:GetAttribute("TagFarbe")
		glas.Material = (Enum.Material :: any)[glas:GetAttribute("TagMaterial")]
		glas.Transparency = glas:GetAttribute("TagTransparenz")
	end
end

local function laterneSetzen(lampe: BasePart, nacht: boolean)
	lampe.Material = if nacht then Enum.Material.Neon else Enum.Material.SmoothPlastic
	lampe.Color = if nacht then Color3.fromRGB(255, 225, 170) else Color3.fromRGB(120, 120, 110)
	local licht = lampe:FindFirstChildOfClass("SpotLight")
	if licht then
		licht.Enabled = nacht
	end
end

local tagAmbient: Color3
local function lichterSetzen(nacht: boolean)
	istNacht = nacht
	for _, glas in ipairs(CollectionService:GetTagged("Nachtfenster")) do
		fensterSetzen(glas, nacht)
	end
	for _, lampe in ipairs(CollectionService:GetTagged("Laterne")) do
		laterneSetzen(lampe, nacht)
	end
	local ziel = if nacht then Color3.fromRGB(55, 65, 95) else tagAmbient
	TweenService:Create(Lighting, TweenInfo.new(20), { OutdoorAmbient = ziel }):Play()
end

-- Läuft für immer: dreht die Uhrzeit weiter
function Welt.tagUndNacht()
	tagAmbient = Lighting.OutdoorAmbient

	-- Neu gebaute Häuser bekommen sofort das richtige Licht
	CollectionService:GetInstanceAddedSignal("Nachtfenster"):Connect(function(glas)
		if istNacht then
			fensterSetzen(glas, true)
		end
	end)
	CollectionService:GetInstanceAddedSignal("Laterne"):Connect(function(lampe)
		laterneSetzen(lampe, istNacht)
	end)

	local NACHT_BEGINN, NACHT_ENDE = 18.4, 6.2
	local TAG_STUNDEN = NACHT_BEGINN - NACHT_ENDE -- 12,2 Stunden
	local NACHT_STUNDEN = 24 - TAG_STUNDEN
	Lighting.ClockTime = 14
	while true do
		local dt = task.wait(0.1)
		if Config.TAG_UND_NACHT then
			local t = Lighting.ClockTime
			local nacht = t >= NACHT_BEGINN or t < NACHT_ENDE
			local stundenProSekunde = if nacht
				then NACHT_STUNDEN / (Config.NACHT_MINUTEN * 60)
				else TAG_STUNDEN / (Config.TAG_MINUTEN * 60)
			Lighting.ClockTime = (t + dt * stundenProSekunde) % 24
			if nacht ~= istNacht then
				lichterSetzen(nacht)
			end
		end
	end
end

return Welt
