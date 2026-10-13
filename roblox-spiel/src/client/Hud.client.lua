-- Hud.client.lua
-- Die Bedienoberfläche: Geld-Anzeige, Shop (links) und Angriff (rechts).

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Config = require(ReplicatedStorage:WaitForChild("Shared"):WaitForChild("Config"))
local Remotes = ReplicatedStorage:WaitForChild("Remotes")
local kaufenRF = Remotes:WaitForChild("Kaufen") :: RemoteFunction
local abschiessenRF = Remotes:WaitForChild("Abschiessen") :: RemoteFunction
local spielstand = ReplicatedStorage:WaitForChild("Spielstand")

local spieler = Players.LocalPlayer
local geld = spieler:WaitForChild("leaderstats"):WaitForChild("Geld") :: IntValue

local DUNKEL = Color3.fromRGB(30, 32, 40)
local GRAU = Color3.fromRGB(70, 74, 88)
local AUSGEWAEHLT = Color3.fromRGB(40, 140, 220)

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

local function panel(name: string, position: UDim2, anker: Vector2, eltern: Instance): Frame
	local rahmen = neu("Frame", {
		Name = name,
		Position = position,
		AnchorPoint = anker,
		Size = UDim2.new(0, 230, 0, 0),
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
	neu("UIListLayout", { Padding = UDim.new(0, 6), SortOrder = Enum.SortOrder.LayoutOrder }, rahmen)
	return rahmen
end

local reihenfolge = 0
local function text(eltern: Instance, inhalt: string, groesse: number?): TextLabel
	reihenfolge += 1
	return neu("TextLabel", {
		LayoutOrder = reihenfolge,
		Size = UDim2.new(1, 0, 0, groesse or 22),
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
		Size = UDim2.new(1, 0, 0, 34),
		BackgroundColor3 = farbe,
		Text = inhalt,
		TextColor3 = Color3.new(1, 1, 1),
		Font = Enum.Font.GothamBold,
		TextScaled = true,
		AutoButtonColor = true,
	}, eltern)
	runden(k)
	neu("UIPadding", { PaddingLeft = UDim.new(0, 6), PaddingRight = UDim.new(0, 6) }, k)
	k.Activated:Connect(beiKlick)
	return k
end

------------------------------------------------------------------------
-- Oberfläche bauen
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

-- LINKS: Info und Shop
local links = panel("Shop", UDim2.new(0, 10, 0.5, 0), Vector2.new(0, 0.5), gui)
local geldLabel = text(links, "", 28)
local stadtLabel = text(links, "", 20)
text(links, "SHOP - Gebäude", 24)

local function kaufen(art: string, typ: string)
	local ok, antwort = kaufenRF:InvokeServer(art, typ)
	zeigeNachricht(antwort, ok)
end

for _, typ in ipairs(Config.GebaeudeReihenfolge) do
	local info = Config.Gebaeude[typ]
	local beschreibung = if info.IstAbwehr then "schießt Raketen ab" else "+" .. info.Einkommen .. " $"
	knopf(links, info.Name .. " - " .. info.Preis .. " $ (" .. beschreibung .. ")", Color3.fromRGB(60, 140, 70), function()
		kaufen("Gebaeude", typ)
	end)
end

text(links, "SHOP - Raketen", 24)
for _, typ in ipairs(Config.RaketenReihenfolge) do
	local info = Config.Raketen[typ]
	knopf(links, info.Name .. " - " .. info.Preis .. " $", Color3.fromRGB(150, 90, 40), function()
		kaufen("Rakete", typ)
	end)
end

-- RECHTS: Angriff
local rechts = panel("Angriff", UDim2.new(1, -10, 0.5, 0), Vector2.new(1, 0.5), gui)
text(rechts, "ANGRIFF", 28)
text(rechts, "1. Rakete wählen:", 20)

local gewaehlteRakete: string? = nil
local gewaehltesZiel: number? = nil
local raketenKnoepfe: { [string]: TextButton } = {}
local zielKnoepfe: { [number]: TextButton } = {}

local function aktualisieren()
	geldLabel.Text = "Geld: " .. geld.Value .. " $"

	local meineStadt = spieler:GetAttribute("Stadt") or 0
	stadtLabel.Text = if meineStadt > 0 then "Deine Stadt: Stadt " .. meineStadt else "Server voll - du schaust zu"

	for typ, k in pairs(raketenKnoepfe) do
		local anzahl = spieler:GetAttribute("Rakete_" .. typ) or 0
		k.Text = Config.Raketen[typ].Name .. " (" .. anzahl .. " Stück)"
		k.BackgroundColor3 = if gewaehlteRakete == typ then AUSGEWAEHLT else GRAU
	end

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
end

for _, typ in ipairs(Config.RaketenReihenfolge) do
	raketenKnoepfe[typ] = knopf(rechts, "", GRAU, function()
		gewaehlteRakete = typ
		aktualisieren()
	end)
end

text(rechts, "2. Ziel wählen:", 20)
for index = 1, Config.MAX_STAEDTE do
	zielKnoepfe[index] = knopf(rechts, "", GRAU, function()
		if index ~= spieler:GetAttribute("Stadt") then
			gewaehltesZiel = index
			aktualisieren()
		end
	end)
end

local feuerKnopf = knopf(rechts, "FEUER!", Color3.fromRGB(200, 30, 30), function()
	if not gewaehlteRakete then
		zeigeNachricht("Wähle zuerst eine Rakete aus.", false)
		return
	end
	if not gewaehltesZiel then
		zeigeNachricht("Wähle zuerst ein Ziel aus.", false)
		return
	end
	local ok, antwort = abschiessenRF:InvokeServer(gewaehlteRakete, gewaehltesZiel)
	zeigeNachricht(antwort, ok)
end)
feuerKnopf.Size = UDim2.new(1, 0, 0, 50)

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
