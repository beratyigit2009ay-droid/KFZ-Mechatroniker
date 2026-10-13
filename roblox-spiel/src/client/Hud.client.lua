-- Hud.client.lua
-- Die Bedienoberfläche:
--   oben links: Geld, Bewohner, Strom, Einkommen
--   links:      Shop mit zwei Reitern ("Bauen" und "Waffen")
--   rechts:     Angriff (Waffe wählen, wie viele, Ziel, losschicken)

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Config = require(ReplicatedStorage:WaitForChild("Shared"):WaitForChild("Config"))
local Remotes = ReplicatedStorage:WaitForChild("Remotes")
local kaufenRF = Remotes:WaitForChild("Kaufen") :: RemoteFunction
local angriffRF = Remotes:WaitForChild("Angriff") :: RemoteFunction
local spielstand = ReplicatedStorage:WaitForChild("Spielstand")

local spieler = Players.LocalPlayer
local geld = spieler:WaitForChild("leaderstats"):WaitForChild("Geld") :: IntValue

local DUNKEL = Color3.fromRGB(30, 32, 40)
local GRAU = Color3.fromRGB(70, 74, 88)
local AUSGEWAEHLT = Color3.fromRGB(40, 140, 220)
local GRUEN = Color3.fromRGB(60, 140, 70)
local BRAUN = Color3.fromRGB(150, 90, 40)
local ROT = Color3.fromRGB(200, 30, 30)

------------------------------------------------------------------------
-- Hilfsfunktionen zum Bauen der Oberfläche
------------------------------------------------------------------------

local function neu(klasse: string, eigenschaften: { [string]: any }, eltern: Instance?): any
	local objekt = Instance.new(klasse)
	for name, wert in pairs(eigenschaften) do
		(objekt :: any)[name] = wert
	end
	objekt.Parent = eltern
	return objekt
end

local function runden(objekt: Instance)
	neu("UICorner", { CornerRadius = UDim.new(0, 8) }, objekt)
end

local function liste(objekt: Instance, abstand: number?)
	neu("UIListLayout", { Padding = UDim.new(0, abstand or 5), SortOrder = Enum.SortOrder.LayoutOrder }, objekt)
end

local function panel(name: string, position: UDim2, anker: Vector2, eltern: Instance): Frame
	local rahmen = neu("Frame", {
		Name = name,
		Position = position,
		AnchorPoint = anker,
		Size = UDim2.new(0, 240, 0, 0),
		AutomaticSize = Enum.AutomaticSize.Y,
		BackgroundColor3 = DUNKEL,
		BackgroundTransparency = 0.15,
	}, eltern)
	runden(rahmen)
	neu("UIPadding", {
		PaddingTop = UDim.new(0, 8),
		PaddingBottom = UDim.new(0, 8),
		PaddingLeft = UDim.new(0, 8),
		PaddingRight = UDim.new(0, 8),
	}, rahmen)
	liste(rahmen)
	return rahmen
end

-- leere Gruppe, die ihre Kinder untereinander stapelt (für die Shop-Reiter)
local function gruppe(eltern: Instance, reihenfolge: number): Frame
	local g = neu("Frame", {
		LayoutOrder = reihenfolge,
		Size = UDim2.new(1, 0, 0, 0),
		AutomaticSize = Enum.AutomaticSize.Y,
		BackgroundTransparency = 1,
	}, eltern)
	liste(g)
	return g
end

local reihenfolge = 0
local function text(eltern: Instance, inhalt: string, groesse: number?): TextLabel
	reihenfolge += 1
	return neu("TextLabel", {
		LayoutOrder = reihenfolge,
		Size = UDim2.new(1, 0, 0, groesse or 18),
		BackgroundTransparency = 1,
		Text = inhalt,
		TextColor3 = Color3.new(1, 1, 1),
		Font = Enum.Font.GothamBold,
		TextScaled = true,
		TextXAlignment = Enum.TextXAlignment.Left,
	}, eltern)
end

local function knopf(eltern: Instance, inhalt: string, farbe: Color3, beiKlick: () -> ()): TextButton
	reihenfolge += 1
	local k = neu("TextButton", {
		LayoutOrder = reihenfolge,
		Size = UDim2.new(1, 0, 0, 28),
		BackgroundColor3 = farbe,
		Text = inhalt,
		TextColor3 = Color3.new(1, 1, 1),
		Font = Enum.Font.GothamBold,
		TextScaled = true,
		AutoButtonColor = true,
	}, eltern)
	runden(k)
	neu("UIPadding", {
		PaddingLeft = UDim.new(0, 6),
		PaddingRight = UDim.new(0, 6),
		PaddingTop = UDim.new(0, 4),
		PaddingBottom = UDim.new(0, 4),
	}, k)
	k.Activated:Connect(beiKlick)
	return k
end

------------------------------------------------------------------------
-- Grundgerüst
------------------------------------------------------------------------

local gui = neu("ScreenGui", { Name = "Hud", ResetOnSpawn = false }, spieler:WaitForChild("PlayerGui"))

-- Nachrichten unten in der Mitte
local nachrichtLabel = neu("TextLabel", {
	Name = "Nachricht",
	AnchorPoint = Vector2.new(0.5, 1),
	Position = UDim2.new(0.5, 0, 1, -100),
	Size = UDim2.new(0.5, 0, 0, 40),
	BackgroundColor3 = DUNKEL,
	BackgroundTransparency = 0.2,
	TextColor3 = Color3.new(1, 1, 1),
	Font = Enum.Font.GothamBold,
	TextScaled = true,
	Visible = false,
}, gui)
runden(nachrichtLabel)

local nachrichtNummer = 0
local function zeigeNachricht(inhalt: string, gut: boolean?)
	nachrichtNummer += 1
	local meine = nachrichtNummer
	nachrichtLabel.Text = inhalt
	nachrichtLabel.TextColor3 = if gut == false then Color3.fromRGB(255, 120, 120) else Color3.new(1, 1, 1)
	nachrichtLabel.Visible = true
	task.delay(3, function()
		if nachrichtNummer == meine then
			nachrichtLabel.Visible = false
		end
	end)
end

------------------------------------------------------------------------
-- OBEN LINKS: Werte der Stadt
------------------------------------------------------------------------

local leiste = neu("Frame", {
	Name = "Werte",
	Position = UDim2.new(0, 10, 0, 10),
	Size = UDim2.new(0, 0, 0, 34),
	AutomaticSize = Enum.AutomaticSize.X,
	BackgroundColor3 = DUNKEL,
	BackgroundTransparency = 0.15,
}, gui)
runden(leiste)
neu("UIListLayout", {
	FillDirection = Enum.FillDirection.Horizontal,
	Padding = UDim.new(0, 14),
	VerticalAlignment = Enum.VerticalAlignment.Center,
}, leiste)
neu("UIPadding", { PaddingLeft = UDim.new(0, 10), PaddingRight = UDim.new(0, 10) }, leiste)

local function wert(): TextLabel
	return neu("TextLabel", {
		Size = UDim2.new(0, 0, 0, 22),
		AutomaticSize = Enum.AutomaticSize.X,
		BackgroundTransparency = 1,
		TextColor3 = Color3.new(1, 1, 1),
		Font = Enum.Font.GothamBold,
		TextSize = 18,
	}, leiste)
end
local geldLabel = wert()
local bewohnerLabel = wert()
local stromLabel = wert()
local einkommenLabel = wert()
local stadtLabel = wert()

------------------------------------------------------------------------
-- LINKS: Shop mit zwei Reitern
------------------------------------------------------------------------

local links = panel("Shop", UDim2.new(0, 10, 0.5, 20), Vector2.new(0, 0.5), gui)
text(links, "SHOP", 24)

local reiterLeiste = neu("Frame", { LayoutOrder = 2, Size = UDim2.new(1, 0, 0, 30), BackgroundTransparency = 1 }, links)
reihenfolge = 10
local seiteBauen = gruppe(links, 3)
local seiteWaffen = gruppe(links, 4)
seiteWaffen.Visible = false

local reiterBauen, reiterWaffen
local function reiterWaehlen(bauen: boolean)
	seiteBauen.Visible = bauen
	seiteWaffen.Visible = not bauen
	reiterBauen.BackgroundColor3 = if bauen then AUSGEWAEHLT else GRAU
	reiterWaffen.BackgroundColor3 = if bauen then GRAU else AUSGEWAEHLT
end
reiterBauen = knopf(reiterLeiste, "Bauen", AUSGEWAEHLT, function()
	reiterWaehlen(true)
end)
reiterWaffen = knopf(reiterLeiste, "Waffen", GRAU, function()
	reiterWaehlen(false)
end)
reiterBauen.Size = UDim2.new(0.5, -3, 1, 0)
reiterWaffen.Size = UDim2.new(0.5, -3, 1, 0)
reiterWaffen.Position = UDim2.new(0.5, 3, 0, 0)

local function kaufen(art: string, typ: string)
	local ok, antwort = kaufenRF:InvokeServer(art, typ)
	zeigeNachricht(antwort, ok)
end

-- Kurze Beschreibung, was ein Gebäude bringt
local function gebaeudeInfo(info): string
	if info.IstFlugabwehr then
		return "gegen Raketen + Jets"
	elseif info.IstPanzerabwehr then
		return "gegen Panzer"
	elseif info.Bewohner then
		return "+" .. info.Bewohner .. " Bewohner"
	elseif info.Einkommen then
		return "+" .. info.Einkommen .. " $"
	elseif info.Strom and info.Strom > 0 then
		return "+" .. info.Strom .. " Strom"
	end
	return ""
end

for _, typ in ipairs(Config.GebaeudeReihenfolge) do
	local info = Config.Gebaeude[typ]
	knopf(seiteBauen, info.Name .. " " .. info.Preis .. "$ (" .. gebaeudeInfo(info) .. ")", GRUEN, function()
		kaufen("Gebaeude", typ)
	end)
end

text(seiteWaffen, "Raketen (je stärker, desto teurer)", 16)
for _, typ in ipairs(Config.RaketenReihenfolge) do
	local info = Config.Raketen[typ]
	knopf(seiteWaffen, info.Name .. " " .. info.Preis .. "$ (Schaden " .. info.Schaden .. ")", BRAUN, function()
		kaufen("Waffe", typ)
	end)
end
text(seiteWaffen, "Fahrzeuge", 16)
for _, typ in ipairs(Config.EinheitenReihenfolge) do
	local info = Config.Einheiten[typ]
	knopf(seiteWaffen, info.Name .. " " .. info.Preis .. "$", Color3.fromRGB(85, 95, 55), function()
		kaufen("Waffe", typ)
	end)
end

------------------------------------------------------------------------
-- RECHTS: Angriff
------------------------------------------------------------------------

local rechts = panel("Angriff", UDim2.new(1, -10, 0.5, 20), Vector2.new(1, 0.5), gui)
reihenfolge = 100
text(rechts, "ANGRIFF", 24)
text(rechts, "1. Was willst du schicken?", 16)

-- alle Waffen in einer Liste: erst Raketen, dann Fahrzeuge
local alleWaffen = {}
for _, typ in ipairs(Config.RaketenReihenfolge) do
	table.insert(alleWaffen, typ)
end
for _, typ in ipairs(Config.EinheitenReihenfolge) do
	table.insert(alleWaffen, typ)
end

local gewaehlteWaffe: string = alleWaffen[1]
local anzahl = 1
local gewaehltesZiel: number? = nil
local waffenKnoepfe: { [string]: TextButton } = {}
local zielKnoepfe: { [number]: TextButton } = {}
local anzahlLabel: TextLabel
local losKnopf: TextButton

local function lager(typ: string): number
	return spieler:GetAttribute("Lager_" .. typ) or 0
end

local function aktualisieren()
	-- Werte oben links
	geldLabel.Text = "Geld: " .. geld.Value .. " $"
	bewohnerLabel.Text = "Bewohner: " .. (spieler:GetAttribute("Bewohner") or 0)
	local erzeugt = spieler:GetAttribute("StromErzeugt") or Config.GRUNDSTROM
	local bedarf = spieler:GetAttribute("StromBedarf") or 0
	stromLabel.Text = "Strom: " .. bedarf .. " / " .. erzeugt
	stromLabel.TextColor3 = if bedarf > erzeugt then Color3.fromRGB(255, 90, 90) else Color3.fromRGB(255, 230, 90)
	einkommenLabel.Text = "+" .. (spieler:GetAttribute("Einkommen") or Config.GRUNDEINKOMMEN) .. " $ / " .. Config.EINKOMMEN_INTERVALL .. "s"
	local meineStadt = spieler:GetAttribute("Stadt") or 0
	stadtLabel.Text = if meineStadt > 0 then "Stadt " .. meineStadt else "Zuschauer (Server voll)"
	if bedarf > erzeugt then
		stromLabel.Text ..= "  STROMAUSFALL!"
	end

	-- Waffen-Liste
	for typ, k in pairs(waffenKnoepfe) do
		k.Text = Config.waffe(typ).Name .. " (" .. lager(typ) .. " im Lager)"
		k.BackgroundColor3 = if gewaehlteWaffe == typ then AUSGEWAEHLT else GRAU
	end

	-- Anzahl
	anzahlLabel.Text = tostring(anzahl)

	-- Ziele
	for index, k in pairs(zielKnoepfe) do
		local besitzer = spielstand:GetAttribute("Besitzer" .. index) or ""
		if index == meineStadt then
			k.Text = "Stadt " .. index .. " (deine)"
			k.BackgroundColor3 = Color3.fromRGB(45, 45, 50)
			k.AutoButtonColor = false
		else
			k.Text = "Stadt " .. index .. ": " .. (if besitzer ~= "" then besitzer else "leer")
			k.BackgroundColor3 = if gewaehltesZiel == index then AUSGEWAEHLT else GRAU
			k.AutoButtonColor = true
		end
	end

	-- Text auf dem großen Knopf, z.B. "3 Panzer schicken!"
	local name = Config.waffe(gewaehlteWaffe).Name
	if Config.Raketen[gewaehlteWaffe] then
		losKnopf.Text = anzahl .. "x " .. name .. " abfeuern!"
	else
		losKnopf.Text = anzahl .. "x " .. name .. " schicken!"
	end
end

for _, typ in ipairs(alleWaffen) do
	waffenKnoepfe[typ] = knopf(rechts, "", GRAU, function()
		gewaehlteWaffe = typ
		aktualisieren()
	end)
end

text(rechts, "2. Wie viele?", 16)
reihenfolge += 1
local anzahlZeile = neu("Frame", { LayoutOrder = reihenfolge, Size = UDim2.new(1, 0, 0, 30), BackgroundTransparency = 1 }, rechts)
local minus = knopf(anzahlZeile, "-", GRAU, function()
	anzahl = math.max(1, anzahl - 1)
	aktualisieren()
end)
minus.Size = UDim2.new(0, 40, 1, 0)
anzahlLabel = neu("TextLabel", {
	Position = UDim2.new(0, 46, 0, 0),
	Size = UDim2.new(1, -150, 1, 0),
	BackgroundTransparency = 1,
	TextColor3 = Color3.new(1, 1, 1),
	Font = Enum.Font.GothamBlack,
	TextScaled = true,
	Text = "1",
}, anzahlZeile)
local plus = knopf(anzahlZeile, "+", GRAU, function()
	anzahl = math.min(Config.MAX_ANZAHL, anzahl + 1)
	aktualisieren()
end)
plus.Size = UDim2.new(0, 40, 1, 0)
plus.Position = UDim2.new(1, -98, 0, 0)
local alle = knopf(anzahlZeile, "Alle", GRAU, function()
	anzahl = math.clamp(lager(gewaehlteWaffe), 1, Config.MAX_ANZAHL)
	aktualisieren()
end)
alle.Size = UDim2.new(0, 52, 1, 0)
alle.Position = UDim2.new(1, -52, 0, 0)

text(rechts, "3. Welche Stadt?", 16)
for index = 1, Config.MAX_STAEDTE do
	zielKnoepfe[index] = knopf(rechts, "", GRAU, function()
		if index ~= spieler:GetAttribute("Stadt") then
			gewaehltesZiel = index
			aktualisieren()
		end
	end)
end

losKnopf = knopf(rechts, "", ROT, function()
	if not gewaehltesZiel then
		zeigeNachricht("Wähle zuerst eine Stadt als Ziel aus.", false)
		return
	end
	local ok, antwort = angriffRF:InvokeServer(gewaehlteWaffe, gewaehltesZiel, anzahl)
	zeigeNachricht(antwort, ok)
end)
losKnopf.Size = UDim2.new(1, 0, 0, 46)
losKnopf.Font = Enum.Font.GothamBlack

------------------------------------------------------------------------
-- Anzeige aktuell halten
------------------------------------------------------------------------

geld.Changed:Connect(aktualisieren)
spieler.AttributeChanged:Connect(aktualisieren)
spielstand.AttributeChanged:Connect(aktualisieren)
Remotes:WaitForChild("Nachricht").OnClientEvent:Connect(function(inhalt: string)
	zeigeNachricht(inhalt, true)
end)
aktualisieren()
