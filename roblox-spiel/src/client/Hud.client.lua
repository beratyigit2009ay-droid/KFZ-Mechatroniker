-- Hud.client.lua
-- Die Bedienoberfläche, gemacht fürs Handy (geht aber auch am PC):
--   oben links: Geld, Bewohner, Strom und Einkommen
--   rechts:     4 runde Knöpfe: BAUEN, WAFFEN, ANGRIFF, KARTE
--               (sie sitzen über dem Springen-Knopf, damit sie nicht im Weg sind)
--   Mitte:      ein großes Fenster mit Karten zum Antippen
-- Alles wird automatisch passend zur Bildschirmgröße vergrößert oder verkleinert.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")

local Config = require(ReplicatedStorage:WaitForChild("Shared"):WaitForChild("Config"))
local Remotes = ReplicatedStorage:WaitForChild("Remotes")
local kaufenRF = Remotes:WaitForChild("Kaufen") :: RemoteFunction
local angriffRF = Remotes:WaitForChild("Angriff") :: RemoteFunction
local spielstand = ReplicatedStorage:WaitForChild("Spielstand")

local spieler = Players.LocalPlayer
local geld = spieler:WaitForChild("leaderstats"):WaitForChild("Geld") :: IntValue

local FARBE = {
	fenster = Color3.fromRGB(16, 20, 30),
	karte = Color3.fromRGB(32, 38, 54),
	karteAktiv = Color3.fromRGB(40, 62, 100),
	blau = Color3.fromRGB(45, 140, 255),
	gruen = Color3.fromRGB(40, 185, 95),
	rot = Color3.fromRGB(235, 55, 55),
	orange = Color3.fromRGB(255, 145, 35),
	gelb = Color3.fromRGB(255, 210, 70),
	grau = Color3.fromRGB(80, 86, 105),
	text = Color3.new(1, 1, 1),
	textGrau = Color3.fromRGB(165, 175, 200),
}

------------------------------------------------------------------------
-- Hilfsfunktionen
------------------------------------------------------------------------

local function neu(klasse: string, eigenschaften: { [string]: any }, eltern: Instance?): any
	local objekt = Instance.new(klasse)
	for name, wert in pairs(eigenschaften) do
		(objekt :: any)[name] = wert
	end
	objekt.Parent = eltern
	return objekt
end

local function ecken(objekt: Instance, radius: number)
	neu("UICorner", { CornerRadius = UDim.new(0, radius) }, objekt)
end

local function rund(objekt: Instance)
	neu("UICorner", { CornerRadius = UDim.new(0.5, 0) }, objekt)
end

local function rand(objekt: Instance, farbe: Color3, durchsichtig: number, dicke: number?): UIStroke
	return neu("UIStroke", {
		Color = farbe,
		Transparency = durchsichtig,
		Thickness = dicke or 1.5,
		ApplyStrokeMode = Enum.ApplyStrokeMode.Border,
	}, objekt)
end

-- leichter Verlauf von oben (hell) nach unten (dunkler), damit Knöpfe plastisch aussehen
local function verlauf(objekt: Instance)
	neu("UIGradient", {
		Rotation = 90,
		Color = ColorSequence.new(Color3.new(1, 1, 1), Color3.fromRGB(190, 190, 190)),
	}, objekt)
end

local function polster(objekt: Instance, seitlich: number, oben: number?)
	neu("UIPadding", {
		PaddingLeft = UDim.new(0, seitlich),
		PaddingRight = UDim.new(0, seitlich),
		PaddingTop = UDim.new(0, oben or seitlich),
		PaddingBottom = UDim.new(0, oben or seitlich),
	}, objekt)
end

local function schrift(eltern: Instance, eigenschaften: { [string]: any }): TextLabel
	local alle = {
		BackgroundTransparency = 1,
		TextColor3 = FARBE.text,
		Font = Enum.Font.GothamBold,
		TextSize = 16,
		TextXAlignment = Enum.TextXAlignment.Left,
	}
	for name, wert in pairs(eigenschaften) do
		alle[name] = wert
	end
	return neu("TextLabel", alle, eltern)
end

-- Kleine Töne für die Knöpfe (Sounds in der PlayerGui hört nur dieser Spieler)
local function ton(id: string, lautstaerke: number): Sound
	return neu("Sound", { SoundId = id, Volume = lautstaerke }, spieler:WaitForChild("PlayerGui"))
end
local klickTon = ton(Config.Sounds.Klick, 0.35)
local geldTon = ton(Config.Sounds.Geld, 0.5)

-- Knöpfe werden beim Antippen kurz kleiner und klicken, so fühlt es sich wie ein echter Knopf an
local function drueckGefuehl(knopf: GuiButton)
	local skala = neu("UIScale", {}, knopf)
	knopf.Activated:Connect(function()
		klickTon:Play()
	end)
	local function loslassen()
		TweenService:Create(skala, TweenInfo.new(0.25, Enum.EasingStyle.Back), { Scale = 1 }):Play()
	end
	knopf.InputBegan:Connect(function(eingabe)
		if eingabe.UserInputType == Enum.UserInputType.Touch or eingabe.UserInputType == Enum.UserInputType.MouseButton1 then
			TweenService:Create(skala, TweenInfo.new(0.08), { Scale = 0.93 }):Play()
		end
	end)
	knopf.InputEnded:Connect(loslassen)
	knopf.MouseLeave:Connect(loslassen)
end

------------------------------------------------------------------------
-- Grundgerüst
------------------------------------------------------------------------

local gui = neu("ScreenGui", {
	Name = "Hud",
	ResetOnSpawn = false,
	ZIndexBehavior = Enum.ZIndexBehavior.Sibling,
	-- nichts unter die Kamera-Kerbe oder die Roblox-Knöpfe legen
	ScreenInsets = Enum.ScreenInsets.CoreUISafeInsets,
}, spieler:WaitForChild("PlayerGui"))

-- Alle UIScale-Objekte, die bei jeder Bildschirmgröße neu eingestellt werden
local skalierer: { UIScale } = {}
local function skaliert(objekt: Instance)
	table.insert(skalierer, neu("UIScale", {}, objekt))
end

------------------------------------------------------------------------
-- OBEN LINKS: Werte der Stadt als kleine "Chips"
------------------------------------------------------------------------

local werte = neu("Frame", {
	Name = "Werte",
	Position = UDim2.fromOffset(8, 6),
	Size = UDim2.fromOffset(0, 32),
	AutomaticSize = Enum.AutomaticSize.X,
	BackgroundTransparency = 1,
}, gui)
neu("UIListLayout", {
	FillDirection = Enum.FillDirection.Horizontal,
	Padding = UDim.new(0, 6),
	VerticalAlignment = Enum.VerticalAlignment.Center,
	SortOrder = Enum.SortOrder.LayoutOrder,
}, werte)
skaliert(werte)

local function chip(eltern: Instance, reihenfolge: number): TextLabel
	local c = schrift(eltern, {
		LayoutOrder = reihenfolge,
		Size = UDim2.fromOffset(0, 30),
		AutomaticSize = Enum.AutomaticSize.X,
		BackgroundColor3 = FARBE.fenster,
		BackgroundTransparency = 0.2,
		TextSize = 16,
		RichText = true,
	})
	ecken(c, 15)
	polster(c, 10, 0)
	rand(c, Color3.new(1, 1, 1), 0.88)
	return c
end
local geldChip = chip(werte, 1)
local bewohnerChip = chip(werte, 2)
local stromChip = chip(werte, 3)
local einkommenChip = chip(werte, 4)

------------------------------------------------------------------------
-- Kurze Nachrichten (z.B. "Haus gebaut!")
------------------------------------------------------------------------

local nachricht = schrift(gui, {
	Name = "Nachricht",
	AnchorPoint = Vector2.new(0.5, 0),
	Position = UDim2.new(0.5, 0, 0, 44),
	Size = UDim2.fromOffset(0, 40),
	AutomaticSize = Enum.AutomaticSize.X,
	BackgroundColor3 = FARBE.fenster,
	BackgroundTransparency = 0.08,
	TextSize = 17,
	TextXAlignment = Enum.TextXAlignment.Center,
	ZIndex = 50,
	Visible = false,
})
ecken(nachricht, 20)
polster(nachricht, 18, 0)
local nachrichtRand = rand(nachricht, FARBE.gruen, 0.2, 2)
skaliert(nachricht)

local nachrichtNummer = 0
local function zeigeNachricht(text: string, gut: boolean?)
	nachrichtNummer += 1
	local meine = nachrichtNummer
	nachricht.Text = text
	nachrichtRand.Color = if gut == false then FARBE.rot else FARBE.gruen
	nachricht.Position = UDim2.new(0.5, 0, 0, 30)
	nachricht.Visible = true
	TweenService:Create(nachricht, TweenInfo.new(0.3, Enum.EasingStyle.Back), { Position = UDim2.new(0.5, 0, 0, 44) }):Play()
	task.delay(3, function()
		if nachrichtNummer == meine then
			nachricht.Visible = false
		end
	end)
end

------------------------------------------------------------------------
-- RECHTS: runde Knöpfe
------------------------------------------------------------------------

local seite = neu("Frame", {
	Name = "Knoepfe",
	AnchorPoint = Vector2.new(1, 0.5),
	Position = UDim2.new(1, -8, 0.4, 0),
	Size = UDim2.fromOffset(60, 0),
	AutomaticSize = Enum.AutomaticSize.Y,
	BackgroundTransparency = 1,
}, gui)
neu("UIListLayout", {
	Padding = UDim.new(0, 8),
	HorizontalAlignment = Enum.HorizontalAlignment.Right,
	SortOrder = Enum.SortOrder.LayoutOrder,
}, seite)
skaliert(seite)

local function rundKnopf(reihenfolge: number, icon: string, beschriftung: string, farbe: Color3): (TextButton, TextLabel)
	local k = neu("TextButton", {
		Name = beschriftung,
		LayoutOrder = reihenfolge,
		Size = UDim2.fromOffset(56, 56),
		BackgroundColor3 = farbe,
		Text = "",
		AutoButtonColor = true,
	}, seite)
	rund(k)
	rand(k, Color3.new(1, 1, 1), 0.45, 2)
	verlauf(k)
	drueckGefuehl(k)
	schrift(k, {
		Size = UDim2.fromScale(1, 0.62),
		Position = UDim2.fromScale(0, 0.04),
		Text = icon,
		TextScaled = true,
		TextXAlignment = Enum.TextXAlignment.Center,
	})
	local unten = schrift(k, {
		Size = UDim2.new(1, 8, 0.26, 0),
		Position = UDim2.new(0, -4, 0.66, 0),
		Text = beschriftung,
		Font = Enum.Font.GothamBlack,
		TextScaled = true,
		TextXAlignment = Enum.TextXAlignment.Center,
		TextStrokeTransparency = 0.4,
	})
	return k, unten
end

local knopfBauen = rundKnopf(1, "🏗️", "BAUEN", FARBE.gruen)
local knopfWaffen = rundKnopf(2, "🛒", "WAFFEN", FARBE.orange)
local knopfAngriff = rundKnopf(3, "🚀", "ANGRIFF", FARBE.rot)
local knopfKarte, karteText = rundKnopf(4, "🗺️", "KARTE", FARBE.blau)

-- gelbe Zahl am Angriff-Knopf: so viele Waffen hast du im Lager
local abzeichen = schrift(knopfAngriff, {
	AnchorPoint = Vector2.new(0.5, 0.5),
	Position = UDim2.fromScale(0.86, 0.12),
	Size = UDim2.fromOffset(22, 22),
	BackgroundColor3 = FARBE.gelb,
	TextColor3 = Color3.new(0, 0, 0),
	Font = Enum.Font.GothamBlack,
	TextSize = 13,
	TextXAlignment = Enum.TextXAlignment.Center,
	Visible = false,
})
rund(abzeichen)

-- Hinweis für den Anfang: "Tippe hier, um zu bauen"
local hinweis = schrift(gui, {
	Name = "Hinweis",
	AnchorPoint = Vector2.new(1, 0.5),
	Size = UDim2.fromOffset(0, 34),
	AutomaticSize = Enum.AutomaticSize.X,
	BackgroundColor3 = FARBE.gelb,
	TextColor3 = Color3.new(0, 0, 0),
	TextSize = 15,
	Text = "Tippe hier, um zu bauen 👉",
	TextXAlignment = Enum.TextXAlignment.Center,
})
ecken(hinweis, 17)
polster(hinweis, 12, 0)
skaliert(hinweis)
task.spawn(function()
	-- wippt neben dem BAUEN-Knopf hin und her, bis man das erste Mal tippt
	while hinweis.Parent do
		local p = knopfBauen.AbsolutePosition - gui.AbsolutePosition
		hinweis.Position = UDim2.fromOffset(p.X - 8 + math.sin(os.clock() * 5) * 4, p.Y + knopfBauen.AbsoluteSize.Y / 2)
		task.wait()
	end
end)

------------------------------------------------------------------------
-- MITTE: das große Fenster mit 3 Seiten
------------------------------------------------------------------------

local fenster = neu("Frame", {
	Name = "Fenster",
	AnchorPoint = Vector2.new(0.5, 0.5),
	Position = UDim2.fromScale(0.5, 0.5),
	Size = UDim2.fromOffset(780, 360),
	BackgroundColor3 = FARBE.fenster,
	BackgroundTransparency = 0.04,
	ZIndex = 10,
	Visible = false,
	Active = true, -- Antippen geht nicht durch das Fenster hindurch
}, gui)
ecken(fenster, 18)
rand(fenster, Color3.new(1, 1, 1), 0.85, 1.5)
polster(fenster, 10)
skaliert(fenster)

-- Kopfzeile: Reiter links; freie Bauplätze, Geld und Schließen-Knopf rechts
local kopf = neu("Frame", { Size = UDim2.new(1, 0, 0, 42), BackgroundTransparency = 1 }, fenster)
local reiterLeiste = neu("Frame", { Size = UDim2.fromScale(1, 1), BackgroundTransparency = 1 }, kopf)
neu("UIListLayout", {
	FillDirection = Enum.FillDirection.Horizontal,
	Padding = UDim.new(0, 6),
	SortOrder = Enum.SortOrder.LayoutOrder,
}, reiterLeiste)

local kopfRechts = neu("Frame", {
	AnchorPoint = Vector2.new(1, 0),
	Position = UDim2.fromScale(1, 0),
	Size = UDim2.fromOffset(0, 42),
	AutomaticSize = Enum.AutomaticSize.X,
	BackgroundTransparency = 1,
}, kopf)
neu("UIListLayout", {
	FillDirection = Enum.FillDirection.Horizontal,
	HorizontalAlignment = Enum.HorizontalAlignment.Right,
	VerticalAlignment = Enum.VerticalAlignment.Center,
	Padding = UDim.new(0, 6),
	SortOrder = Enum.SortOrder.LayoutOrder,
}, kopfRechts)
local platzChip = chip(kopfRechts, 1)
platzChip.BackgroundColor3 = FARBE.karte
local fensterGeld = chip(kopfRechts, 2)
fensterGeld.BackgroundColor3 = FARBE.karte

local schliessen = neu("TextButton", {
	LayoutOrder = 3,
	Size = UDim2.fromOffset(42, 42),
	BackgroundColor3 = FARBE.grau,
	Text = "✕",
	TextColor3 = FARBE.text,
	Font = Enum.Font.GothamBlack,
	TextSize = 22,
}, kopfRechts)
rund(schliessen)
drueckGefuehl(schliessen)

local inhalt = neu("Frame", {
	Name = "Inhalt",
	Position = UDim2.fromOffset(0, 50),
	Size = UDim2.new(1, 0, 1, -50),
	BackgroundTransparency = 1,
}, fenster)

local function scrollSeite(name: string): (ScrollingFrame, UIGridLayout)
	local s = neu("ScrollingFrame", {
		Name = name,
		Size = UDim2.fromScale(1, 1),
		BackgroundTransparency = 1,
		BorderSizePixel = 0,
		ScrollBarThickness = 5,
		ScrollBarImageColor3 = FARBE.textGrau,
		CanvasSize = UDim2.new(),
		AutomaticCanvasSize = Enum.AutomaticSize.Y,
		ScrollingDirection = Enum.ScrollingDirection.Y,
		Visible = false,
	}, inhalt)
	local raster = neu("UIGridLayout", {
		CellPadding = UDim2.fromOffset(8, 8),
		CellSize = UDim2.fromOffset(170, 116),
		SortOrder = Enum.SortOrder.LayoutOrder,
	}, s)
	neu("UIPadding", { PaddingRight = UDim.new(0, 8), PaddingBottom = UDim.new(0, 4) }, s)
	return s, raster
end

local seiteBauen, rasterBauen = scrollSeite("Bauen")
local seiteWaffen, rasterWaffen = scrollSeite("Waffen")
local seiteAngriff = neu("Frame", { Name = "Angriff", Size = UDim2.fromScale(1, 1), BackgroundTransparency = 1, Visible = false }, inhalt)

local SEITEN = {
	{ name = "Bauen", icon = "🏗️", seite = seiteBauen, farbe = FARBE.gruen },
	{ name = "Waffen", icon = "🛒", seite = seiteWaffen, farbe = FARBE.orange },
	{ name = "Angriff", icon = "🚀", seite = seiteAngriff, farbe = FARBE.rot },
}
local reiterKnoepfe = {}
local offeneSeite: string? = nil

local function fensterSchliessen()
	offeneSeite = nil
	fenster.Visible = false
end

-- Was beim Öffnen einer Seite passieren soll (wird weiter unten für "Angriff" gesetzt)
local beimOeffnen: { [string]: () -> () } = {}

local function seiteZeigen(name: string)
	if beimOeffnen[name] then
		beimOeffnen[name]()
	end
	if hinweis.Parent then
		hinweis:Destroy() -- der Spieler hat verstanden, wie es geht
	end
	local warZu = not fenster.Visible
	offeneSeite = name
	for _, s in ipairs(SEITEN) do
		local aktiv = s.name == name
		s.seite.Visible = aktiv
		reiterKnoepfe[s.name].BackgroundColor3 = if aktiv then s.farbe else FARBE.karte
	end
	platzChip.Visible = name == "Bauen"
	fenster.Visible = true
	if warZu then
		fenster.Position = UDim2.new(0.5, 0, 0.5, 30)
		TweenService:Create(fenster, TweenInfo.new(0.3, Enum.EasingStyle.Back), { Position = UDim2.fromScale(0.5, 0.5) }):Play()
	end
end

for i, s in ipairs(SEITEN) do
	local r = neu("TextButton", {
		LayoutOrder = i,
		Size = UDim2.fromOffset(0, 42),
		AutomaticSize = Enum.AutomaticSize.X,
		BackgroundColor3 = FARBE.karte,
		Text = s.icon .. " " .. s.name,
		TextColor3 = FARBE.text,
		Font = Enum.Font.GothamBlack,
		TextSize = 16,
	}, reiterLeiste)
	ecken(r, 12)
	polster(r, 12, 0)
	drueckGefuehl(r)
	r.Activated:Connect(function()
		seiteZeigen(s.name)
	end)
	reiterKnoepfe[s.name] = r
end

local function umschalten(name: string)
	if offeneSeite == name then
		fensterSchliessen()
	else
		seiteZeigen(name)
	end
end
schliessen.Activated:Connect(fensterSchliessen)
knopfBauen.Activated:Connect(function()
	umschalten("Bauen")
end)
knopfWaffen.Activated:Connect(function()
	umschalten("Waffen")
end)
knopfAngriff.Activated:Connect(function()
	umschalten("Angriff")
end)
knopfKarte.Activated:Connect(function()
	-- Kamera.client.lua schaut auf dieses Attribut und fliegt hoch über die Karte
	local an = not spieler:GetAttribute("Kartenansicht")
	spieler:SetAttribute("Kartenansicht", an)
	karteText.Text = if an then "ZURÜCK" else "KARTE"
	fensterSchliessen()
end)

------------------------------------------------------------------------
-- Karten zum Kaufen (Seiten "Bauen" und "Waffen")
------------------------------------------------------------------------

type Kaufkarte = { preis: number, preisFeld: TextLabel, zusatz: TextLabel, typ: string, art: string, tipp: TextLabel }
local kaufkarten: { Kaufkarte } = {}

local function lager(typ: string): number
	return spieler:GetAttribute("Lager_" .. typ) or 0
end

local function kaufKarte(eltern: Instance, reihenfolge: number, art: string, typ: string, info, beschreibung: string, farbe: Color3)
	local k = neu("TextButton", {
		LayoutOrder = reihenfolge,
		BackgroundColor3 = FARBE.karte,
		Text = "",
		AutoButtonColor = true,
	}, eltern)
	ecken(k, 14)
	rand(k, Color3.new(1, 1, 1), 0.9)
	drueckGefuehl(k)

	local bild = neu("Frame", {
		Position = UDim2.fromOffset(10, 10),
		Size = UDim2.fromOffset(44, 44),
		BackgroundColor3 = farbe,
		BackgroundTransparency = 0.7,
	}, k)
	ecken(bild, 12)
	polster(bild, 6)
	schrift(bild, {
		Size = UDim2.fromScale(1, 1),
		Text = info.Icon or "?",
		TextScaled = true,
		TextXAlignment = Enum.TextXAlignment.Center,
	})

	schrift(k, {
		Position = UDim2.fromOffset(62, 10),
		Size = UDim2.new(1, -68, 0, 20),
		Text = info.Name,
		Font = Enum.Font.GothamBlack,
		TextSize = 15,
		TextTruncate = Enum.TextTruncate.AtEnd,
	})
	schrift(k, {
		Position = UDim2.fromOffset(62, 30),
		Size = UDim2.new(1, -68, 0, 26),
		Text = beschreibung,
		TextColor3 = FARBE.textGrau,
		TextSize = 12,
		TextWrapped = true,
		TextYAlignment = Enum.TextYAlignment.Top,
		RichText = true,
	})
	local zusatz = schrift(k, {
		Position = UDim2.fromOffset(10, 58),
		Size = UDim2.new(1, -20, 0, 14),
		TextColor3 = FARBE.gelb,
		TextSize = 12,
	})
	local preisFeld = schrift(k, {
		AnchorPoint = Vector2.new(0, 1),
		Position = UDim2.new(0, 10, 1, -8),
		Size = UDim2.new(1, -20, 0, 32),
		BackgroundColor3 = FARBE.gruen,
		Font = Enum.Font.GothamBlack,
		TextSize = 16,
		TextXAlignment = Enum.TextXAlignment.Center,
		Text = info.Preis .. " $",
	})
	ecken(preisFeld, 10)
	verlauf(preisFeld)

	-- "TIPP"-Schild rechts über dem Preis: zeigt Anfängern, was sie als Nächstes bauen sollten
	local tipp = schrift(k, {
		AnchorPoint = Vector2.new(1, 0),
		Position = UDim2.new(1, -10, 0, 54),
		Size = UDim2.fromOffset(62, 22),
		BackgroundColor3 = FARBE.gelb,
		TextColor3 = Color3.new(0, 0, 0),
		Font = Enum.Font.GothamBlack,
		TextSize = 13,
		TextXAlignment = Enum.TextXAlignment.Center,
		Text = "👍 TIPP",
		ZIndex = 3,
		Visible = false,
	})
	ecken(tipp, 11)

	k.Activated:Connect(function()
		local ok, antwort = kaufenRF:InvokeServer(art, typ)
		zeigeNachricht(antwort, ok)
		if ok then
			geldTon:Play()
		end
	end)
	table.insert(kaufkarten, { preis = info.Preis, preisFeld = preisFeld, zusatz = zusatz, typ = typ, art = art, tipp = tipp })
end

-- Was bringt ein Gebäude? (kurz, damit es auf eine Karte passt)
local function gebaeudeText(info): string
	local teile = {}
	if info.IstFlugabwehr then
		table.insert(teile, "fängt Raketen + Jets ab")
	elseif info.IstPanzerabwehr then
		table.insert(teile, "schießt auf Panzer")
	elseif info.IstWerfer then
		table.insert(teile, info.Rohre .. " Raketen gleichzeitig")
	end
	if info.Bewohner then
		table.insert(teile, '<font color="#7CDCFF">+' .. info.Bewohner .. " Bewohner</font>")
	end
	if info.Einkommen then
		table.insert(teile, '<font color="#7CFF9B">+' .. info.Einkommen .. " $</font>")
	end
	if info.Strom and info.Strom > 0 then
		table.insert(teile, '<font color="#FFD84A">+' .. info.Strom .. " Strom</font>")
	elseif info.Strom then
		table.insert(teile, "⚡" .. info.Strom)
	end
	return table.concat(teile, "  ")
end

for i, typ in ipairs(Config.GebaeudeReihenfolge) do
	local info = Config.Gebaeude[typ]
	kaufKarte(seiteBauen, i, "Gebaeude", typ, info, gebaeudeText(info), FARBE.gruen)
end

for i, typ in ipairs(Config.RaketenReihenfolge) do
	local info = Config.Raketen[typ]
	-- Sterne zeigen die Stärke: ★ schwach ... ★★★★★★ sehr stark
	local text = string.rep("★", i) .. '  <font color="#FF8A7A">Schaden ' .. info.Schaden .. "</font>"
	if info.Streu then
		text = '<font color="#FF8A7A">' .. info.Streu .. " Streubomben</font>, große Fläche"
	elseif info.Abfangbar < 0.3 then
		text = '<font color="#FF8A7A">Schaden ' .. info.Schaden .. "</font>, kaum abzufangen"
	end
	kaufKarte(seiteWaffen, i, "Waffe", typ, info, text, FARBE.rot)
end
for i, typ in ipairs(Config.EinheitenReihenfolge) do
	local info = Config.Einheiten[typ]
	local text
	if info.Art == "Panzer" then
		text = "fährt hin, schießt " .. info.Schuesse .. "x" .. '  <font color="#7CDCFF">♥' .. info.Leben .. "</font>"
	else
		text = "wirft " .. info.Bomben .. " Bomben ab"
		if (info.Tarnung or 1) < 0.5 then
			text ..= ", fast unsichtbar"
		end
	end
	kaufKarte(seiteWaffen, 10 + i, "Waffe", typ, info, text, FARBE.orange)
end

------------------------------------------------------------------------
-- Seite "Angriff": links Waffe wählen, rechts Anzahl, Ziel und Feuer-Knopf
------------------------------------------------------------------------

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
local aktualisieren: () -> ()

local links = neu("Frame", { Size = UDim2.new(0.56, -6, 1, 0), BackgroundTransparency = 1 }, seiteAngriff)
schrift(links, { Size = UDim2.new(1, 0, 0, 20), Text = "1. Waffe wählen", Font = Enum.Font.GothamBlack, TextColor3 = FARBE.textGrau })
local waffenListe = neu("ScrollingFrame", {
	Position = UDim2.fromOffset(0, 26),
	Size = UDim2.new(1, 0, 1, -26),
	BackgroundTransparency = 1,
	BorderSizePixel = 0,
	ScrollBarThickness = 5,
	CanvasSize = UDim2.new(),
	AutomaticCanvasSize = Enum.AutomaticSize.Y,
	ScrollingDirection = Enum.ScrollingDirection.Y,
}, links)
local rasterAngriff = neu("UIGridLayout", {
	CellPadding = UDim2.fromOffset(6, 6),
	CellSize = UDim2.fromOffset(200, 62),
	SortOrder = Enum.SortOrder.LayoutOrder,
}, waffenListe)
neu("UIPadding", { PaddingRight = UDim.new(0, 8), PaddingTop = UDim.new(0, 3), PaddingLeft = UDim.new(0, 3) }, waffenListe)

type Waffenkarte = { knopf: TextButton, rand: UIStroke, lagerFeld: TextLabel }
local waffenKarten: { [string]: Waffenkarte } = {}

for i, typ in ipairs(alleWaffen) do
	local info = Config.waffe(typ)
	local k = neu("TextButton", { LayoutOrder = i, BackgroundColor3 = FARBE.karte, Text = "", AutoButtonColor = true }, waffenListe)
	ecken(k, 12)
	local r = rand(k, FARBE.blau, 1, 3)
	drueckGefuehl(k)
	schrift(k, {
		Position = UDim2.fromOffset(8, 9),
		Size = UDim2.fromOffset(44, 44),
		Text = info.Icon or "?",
		TextScaled = true,
		TextXAlignment = Enum.TextXAlignment.Center,
	})
	schrift(k, {
		Position = UDim2.fromOffset(58, 9),
		Size = UDim2.new(1, -62, 0, 20),
		Text = info.Name,
		Font = Enum.Font.GothamBlack,
		TextSize = 14,
		TextTruncate = Enum.TextTruncate.AtEnd,
	})
	local lagerFeld = schrift(k, {
		Position = UDim2.fromOffset(58, 32),
		Size = UDim2.new(1, -62, 0, 18),
		TextSize = 13,
	})
	k.Activated:Connect(function()
		gewaehlteWaffe = typ
		anzahl = math.clamp(anzahl, 1, math.max(1, math.min(Config.MAX_ANZAHL, lager(typ))))
		aktualisieren()
	end)
	waffenKarten[typ] = { knopf = k, rand = r, lagerFeld = lagerFeld }
end

local rechts = neu("Frame", {
	Position = UDim2.new(0.56, 6, 0, 0),
	Size = UDim2.new(0.44, -6, 1, 0),
	BackgroundTransparency = 1,
}, seiteAngriff)
local rechtsOben = neu("Frame", { Size = UDim2.new(1, 0, 1, -62), BackgroundTransparency = 1 }, rechts)
neu("UIListLayout", { Padding = UDim.new(0, 6), SortOrder = Enum.SortOrder.LayoutOrder }, rechtsOben)

schrift(rechtsOben, { LayoutOrder = 1, Size = UDim2.new(1, 0, 0, 20), Text = "2. Wie viele?", Font = Enum.Font.GothamBlack, TextColor3 = FARBE.textGrau })
local anzahlZeile = neu("Frame", { LayoutOrder = 2, Size = UDim2.new(1, 0, 0, 46), BackgroundTransparency = 1 }, rechtsOben)

local function kleinerKnopf(eltern: Instance, text: string, farbe: Color3, beiKlick: () -> ()): TextButton
	local k = neu("TextButton", {
		BackgroundColor3 = farbe,
		Text = text,
		TextColor3 = FARBE.text,
		Font = Enum.Font.GothamBlack,
		TextSize = 22,
	}, eltern)
	ecken(k, 12)
	verlauf(k)
	drueckGefuehl(k)
	k.Activated:Connect(beiKlick)
	return k
end

local minus = kleinerKnopf(anzahlZeile, "−", FARBE.grau, function()
	anzahl = math.max(1, anzahl - 1)
	aktualisieren()
end)
minus.Size = UDim2.fromOffset(46, 46)
local anzahlFeld = schrift(anzahlZeile, {
	Position = UDim2.fromOffset(50, 0),
	Size = UDim2.new(1, -164, 1, 0),
	BackgroundColor3 = FARBE.karte,
	Font = Enum.Font.GothamBlack,
	TextSize = 26,
	TextXAlignment = Enum.TextXAlignment.Center,
	Text = "1",
})
ecken(anzahlFeld, 12)
local plus = kleinerKnopf(anzahlZeile, "+", FARBE.grau, function()
	anzahl = math.min(Config.MAX_ANZAHL, math.max(1, lager(gewaehlteWaffe)), anzahl + 1)
	aktualisieren()
end)
plus.Size = UDim2.fromOffset(46, 46)
plus.Position = UDim2.new(1, -110, 0, 0)
local alle = kleinerKnopf(anzahlZeile, "Alle", FARBE.blau, function()
	anzahl = math.clamp(lager(gewaehlteWaffe), 1, Config.MAX_ANZAHL)
	aktualisieren()
end)
alle.Size = UDim2.fromOffset(60, 46)
alle.Position = UDim2.new(1, -60, 0, 0)
alle.TextSize = 16

schrift(rechtsOben, { LayoutOrder = 3, Size = UDim2.new(1, 0, 0, 20), Text = "3. Welche Stadt?", Font = Enum.Font.GothamBlack, TextColor3 = FARBE.textGrau })
local zielRaster = neu("Frame", { LayoutOrder = 4, Size = UDim2.new(1, 0, 0, 94), BackgroundTransparency = 1 }, rechtsOben)
neu("UIGridLayout", {
	CellPadding = UDim2.fromOffset(6, 6),
	CellSize = UDim2.new(0.5, -3, 0, 44),
	SortOrder = Enum.SortOrder.LayoutOrder,
}, zielRaster)

type Zielknopf = { knopf: TextButton, rand: UIStroke, text: TextLabel }
local zielKnoepfe: { Zielknopf } = {}
for index = 1, Config.MAX_STAEDTE do
	local k = neu("TextButton", { LayoutOrder = index, BackgroundColor3 = FARBE.karte, Text = "", AutoButtonColor = true }, zielRaster)
	ecken(k, 12)
	local r = rand(k, FARBE.rot, 1, 3)
	drueckGefuehl(k)
	local punkt = neu("Frame", {
		AnchorPoint = Vector2.new(0, 0.5),
		Position = UDim2.new(0, 10, 0.5, 0),
		Size = UDim2.fromOffset(14, 14),
		BackgroundColor3 = Config.STADT_FARBEN[index] or FARBE.grau,
	}, k)
	rund(punkt)
	local t = schrift(k, {
		Position = UDim2.fromOffset(30, 0),
		Size = UDim2.new(1, -34, 1, 0),
		TextSize = 13,
		TextWrapped = true,
		RichText = true,
	})
	k.Activated:Connect(function()
		if index ~= spieler:GetAttribute("Stadt") then
			gewaehltesZiel = index
			aktualisieren()
		end
	end)
	zielKnoepfe[index] = { knopf = k, rand = r, text = t }
end

local feuerKnopf = neu("TextButton", {
	AnchorPoint = Vector2.new(0, 1),
	Position = UDim2.fromScale(0, 1),
	Size = UDim2.new(1, 0, 0, 56),
	BackgroundColor3 = FARBE.rot,
	TextColor3 = FARBE.text,
	Font = Enum.Font.GothamBlack,
	TextSize = 19,
	TextWrapped = true,
}, rechts)
ecken(feuerKnopf, 14)
rand(feuerKnopf, Color3.fromRGB(255, 180, 180), 0.3, 2)
verlauf(feuerKnopf)
drueckGefuehl(feuerKnopf)

feuerKnopf.Activated:Connect(function()
	local info = Config.waffe(gewaehlteWaffe)
	if lager(gewaehlteWaffe) <= 0 then
		zeigeNachricht("Du hast keine " .. info.Name .. ". Kauf sie unter Waffen!", false)
		seiteZeigen("Waffen")
		return
	end
	if not gewaehltesZiel then
		zeigeNachricht("Tippe zuerst auf eine Stadt als Ziel.", false)
		return
	end
	local ok, antwort = angriffRF:InvokeServer(gewaehlteWaffe, gewaehltesZiel, anzahl)
	zeigeNachricht(antwort, ok)
	if ok then
		fensterSchliessen() -- damit du den Abschuss sehen kannst
	end
end)

-- Einfacher am Handy: Beim Öffnen der Angriff-Seite ist schon eine Waffe gewählt, die du hast,
-- und eine gegnerische Stadt als Ziel. Dann reicht oft ein Tipp auf den roten Knopf.
beimOeffnen.Angriff = function()
	if lager(gewaehlteWaffe) <= 0 then
		for _, typ in ipairs(alleWaffen) do
			if lager(typ) > 0 then
				gewaehlteWaffe = typ
				break
			end
		end
	end
	anzahl = math.clamp(anzahl, 1, math.max(1, math.min(Config.MAX_ANZAHL, lager(gewaehlteWaffe))))
	local meine = spieler:GetAttribute("Stadt") or 0
	if not gewaehltesZiel or gewaehltesZiel == meine then
		gewaehltesZiel = nil
		-- zuerst eine Stadt mit einem Spieler, sonst irgendeine andere
		for index = 1, Config.MAX_STAEDTE do
			if index ~= meine and (spielstand:GetAttribute("Besitzer" .. index) or "") ~= "" then
				gewaehltesZiel = index
				break
			end
		end
		if not gewaehltesZiel then
			gewaehltesZiel = if meine == 1 then 2 else 1
		end
	end
	aktualisieren()
end

-- Was sollte ein Anfänger als Nächstes bauen? (bekommt das "TIPP"-Schild)
local function tippGebaeude(meinGeld: number): string
	local erzeugt = spieler:GetAttribute("StromErzeugt") or Config.GRUNDSTROM
	local bedarf = spieler:GetAttribute("StromBedarf") or 0
	if bedarf + 6 > erzeugt then
		return "Kraftwerk" -- Strom wird knapp
	end
	if (spieler:GetAttribute("Bewohner") or 0) < 30 then
		return "Haus"
	end
	if (spieler:GetAttribute("Gebaut_Abwehr") or 0) == 0 then
		return "Abwehr" -- Schutz gegen Raketen
	end
	-- sonst das teuerste Geld-Gebäude, das du dir leisten kannst
	local bestes = "Haus"
	for _, typ in ipairs({ "Fabrik", "Buero", "Einkaufszentrum", "Bank" }) do
		if meinGeld >= Config.Gebaeude[typ].Preis then
			bestes = typ
		end
	end
	return bestes
end

------------------------------------------------------------------------
-- Anzeige aktuell halten
------------------------------------------------------------------------

-- 12345 -> "12.345"
local function zahl(n: number): string
	local s = tostring(math.floor(n))
	local mitPunkten = s:reverse():gsub("(%d%d%d)", "%1."):reverse()
	return (mitPunkten:gsub("^%.", ""))
end

-- Das Geld oben links zählt sichtbar hoch (oder runter) und hüpft kurz, wenn Geld dazukommt
local angezeigtesGeld = neu("NumberValue", { Value = geld.Value }, gui)
local geldHuepfer = neu("UIScale", {}, geldChip)
local letztesGeld = geld.Value
local function geldTextSetzen()
	local text = '💰 <font color="#FFD84A">' .. zahl(angezeigtesGeld.Value) .. " $</font>"
	geldChip.Text = text
	fensterGeld.Text = text
end
angezeigtesGeld.Changed:Connect(geldTextSetzen)
geld.Changed:Connect(function(neuerWert)
	TweenService:Create(angezeigtesGeld, TweenInfo.new(0.6, Enum.EasingStyle.Quad), { Value = neuerWert }):Play()
	if neuerWert > letztesGeld then
		geldHuepfer.Scale = 1.18
		TweenService:Create(geldHuepfer, TweenInfo.new(0.35, Enum.EasingStyle.Back), { Scale = 1 }):Play()
	end
	letztesGeld = neuerWert
end)

function aktualisieren()
	local meinGeld = geld.Value
	local meineStadt = spieler:GetAttribute("Stadt") or 0

	-- Chips oben links
	geldTextSetzen()
	-- Stadt-Stufe und wie viele Bewohner bis zur nächsten Stufe fehlen
	local bewohner = spieler:GetAttribute("Bewohner") or 0
	local stufe = spieler:GetAttribute("Stufe") or 1
	local naechste = Config.STUFEN[stufe + 1]
	bewohnerChip.Text = "⭐ " .. Config.STUFEN[stufe].Name .. "  👥 " .. bewohner
		.. (if naechste then '<font color="#A5AFC8">/' .. naechste.Bewohner .. "</font>" else "")
	local erzeugt = spieler:GetAttribute("StromErzeugt") or Config.GRUNDSTROM
	local bedarf = spieler:GetAttribute("StromBedarf") or 0
	if bedarf > erzeugt then
		stromChip.Text = '⚡ <font color="#FF6A6A">' .. bedarf .. "/" .. erzeugt .. " AUSFALL!</font>"
	else
		stromChip.Text = "⚡ " .. bedarf .. "/" .. erzeugt
	end
	einkommenChip.Text = '📈 <font color="#7CFF9B">+' .. (spieler:GetAttribute("Einkommen") or Config.GRUNDEINKOMMEN) .. "</font>"
	einkommenChip.Visible = meineStadt > 0
	if meineStadt == 0 then
		bewohnerChip.Text = "👀 Zuschauer: alle 4 Städte sind voll"
	end
	platzChip.Text = "🏗️ " .. (spieler:GetAttribute("BauplaetzeFrei") or 0) .. " Plätze frei"

	-- Kaufkarten: grün, wenn du genug Geld hast
	local tipp = tippGebaeude(meinGeld)
	for _, karte in ipairs(kaufkarten) do
		karte.tipp.Visible = karte.art == "Gebaeude" and karte.typ == tipp
		local genug = meinGeld >= karte.preis
		karte.preisFeld.BackgroundColor3 = if genug then FARBE.gruen else FARBE.grau
		karte.preisFeld.Text = if genug then "KAUFEN · " .. zahl(karte.preis) .. " $" else zahl(karte.preis) .. " $"
		karte.preisFeld.TextColor3 = if genug then FARBE.text else Color3.fromRGB(255, 150, 150)
		if karte.art == "Gebaeude" then
			karte.zusatz.Text = "Gebaut: " .. (spieler:GetAttribute("Gebaut_" .. karte.typ) or 0)
		else
			karte.zusatz.Text = "Im Lager: " .. lager(karte.typ)
		end
	end

	-- Waffen-Karten auf der Angriff-Seite
	local summe = 0
	for typ, karte in pairs(waffenKarten) do
		local n = lager(typ)
		summe += n
		karte.lagerFeld.Text = if n > 0 then n .. " im Lager" else "leer: erst kaufen"
		karte.lagerFeld.TextColor3 = if n > 0 then FARBE.gelb else FARBE.textGrau
		local aktiv = typ == gewaehlteWaffe
		karte.rand.Transparency = if aktiv then 0 else 1
		karte.knopf.BackgroundColor3 = if aktiv then FARBE.karteAktiv else FARBE.karte
	end
	abzeichen.Text = if summe > 99 then "99+" else tostring(summe)
	abzeichen.Visible = summe > 0

	anzahlFeld.Text = tostring(anzahl)

	-- Ziel-Städte
	for index, ziel in ipairs(zielKnoepfe) do
		local besitzer = spielstand:GetAttribute("Besitzer" .. index) or ""
		if index == meineStadt then
			ziel.text.Text = '<font color="#A5AFC8">Stadt ' .. index .. "\nDeine Stadt</font>"
			ziel.knopf.AutoButtonColor = false
			ziel.knopf.BackgroundTransparency = 0.5
			ziel.rand.Transparency = 1
		else
			ziel.text.Text = "<b>Stadt " .. index .. "</b>\n" .. (if besitzer ~= "" then besitzer else "leer")
			ziel.knopf.AutoButtonColor = true
			ziel.knopf.BackgroundTransparency = 0
			ziel.rand.Transparency = if gewaehltesZiel == index then 0 else 1
		end
		ziel.knopf.BackgroundColor3 = if gewaehltesZiel == index then FARBE.karteAktiv else FARBE.karte
	end

	-- großer Feuer-Knopf
	local info = Config.waffe(gewaehlteWaffe)
	if lager(gewaehlteWaffe) <= 0 then
		feuerKnopf.Text = "🛒 " .. info.Name .. " kaufen"
		feuerKnopf.BackgroundColor3 = FARBE.orange
	elseif not gewaehltesZiel then
		feuerKnopf.Text = "Ziel-Stadt wählen"
		feuerKnopf.BackgroundColor3 = FARBE.grau
	else
		local wort = if Config.Raketen[gewaehlteWaffe] then "ABFEUERN" else "LOSSCHICKEN"
		feuerKnopf.Text = "🚀 " .. anzahl .. "x " .. wort .. "!"
		if Config.Raketen[gewaehlteWaffe] and anzahl > 1 then
			-- Startrampe + 4 Rohre pro Raketenwerfer: so viele Raketen starten auf einmal
			local plaetze = 1 + (spieler:GetAttribute("Gebaut_Raketenwerfer") or 0) * Config.Gebaeude.Raketenwerfer.Rohre
			feuerKnopf.Text ..= "  (" .. math.min(plaetze, anzahl) .. " gleichzeitig)"
		end
		feuerKnopf.BackgroundColor3 = FARBE.rot
	end
end

------------------------------------------------------------------------
-- Größe an den Bildschirm anpassen (Handy, Tablet, PC)
------------------------------------------------------------------------

local function anpassen()
	local flaeche = gui.AbsoluteSize
	if flaeche.X < 10 or flaeche.Y < 10 then
		return
	end
	-- Ein Handy quer hat etwa 800 x 370 Punkte. Größere Bildschirme bekommen etwas größere Knöpfe.
	local skala = math.clamp(math.min(flaeche.X / 800, flaeche.Y / 370), 0.7, 1.5)
	for _, s in ipairs(skalierer) do
		s.Scale = skala
	end

	local breite = math.min(flaeche.X / skala - 16, 860)
	local hoehe = math.min(flaeche.Y / skala - 12, 440)
	fenster.Size = UDim2.fromOffset(breite, hoehe)

	-- so viele Karten nebeneinander, wie hinpassen
	local innen = breite - 20 - 8
	local spalten = math.max(2, math.floor((innen + 8) / 178))
	local zelle = math.floor((innen - (spalten - 1) * 8) / spalten)
	rasterBauen.CellSize = UDim2.fromOffset(zelle, 116)
	rasterWaffen.CellSize = UDim2.fromOffset(zelle, 116)

	local linksBreite = (breite - 20) * 0.56 - 6 - 11
	local spaltenAngriff = math.max(1, math.floor((linksBreite + 6) / 150))
	rasterAngriff.CellSize = UDim2.fromOffset(math.floor((linksBreite - (spaltenAngriff - 1) * 6) / spaltenAngriff), 62)
end

gui:GetPropertyChangedSignal("AbsoluteSize"):Connect(anpassen)
anpassen()

geld.Changed:Connect(aktualisieren)
spieler.AttributeChanged:Connect(aktualisieren)
spielstand.AttributeChanged:Connect(aktualisieren)
Remotes:WaitForChild("Nachricht").OnClientEvent:Connect(function(text: string)
	zeigeNachricht(text, true)
end)
aktualisieren()
