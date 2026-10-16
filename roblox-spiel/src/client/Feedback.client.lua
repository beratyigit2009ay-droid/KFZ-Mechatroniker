-- Feedback.client.lua
-- Kleine Belohnungen, damit sich das Spiel gut anfühlt:
-- 1) Geld fliegt: Über jedem Gebäude, das Geld bringt, steigt "+20 $" in Gold auf.
-- 2) Neue Stadt-Stufe: großes Banner mit Konfetti, Jubel-Ton und Bonus-Geld.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")
local Debris = game:GetService("Debris")

local Config = require(ReplicatedStorage:WaitForChild("Shared"):WaitForChild("Config"))
local Remotes = ReplicatedStorage:WaitForChild("Remotes")

local spieler = Players.LocalPlayer
local spielerGui = spieler:WaitForChild("PlayerGui")

------------------------------------------------------------------------
-- 1) "+X $" über den Gebäuden
------------------------------------------------------------------------

-- Ordner nur auf diesem Handy, die anderen Spieler sehen dein Geld nicht
local ordner = Instance.new("Folder")
ordner.Name = "GeldAnzeigen"
ordner.Parent = workspace

local function geldSteigtAuf(pos: Vector3, betrag: number, steuern: boolean)
	local halter = Instance.new("Part")
	halter.Anchored = true
	halter.CanCollide = false
	halter.CanQuery = false
	halter.CanTouch = false
	halter.Transparency = 1
	halter.Size = Vector3.one
	halter.Position = pos
	halter.Parent = ordner

	local schild = Instance.new("BillboardGui")
	schild.Size = UDim2.fromOffset(140, 34)
	schild.AlwaysOnTop = true
	schild.MaxDistance = 260
	schild.Parent = halter
	local text = Instance.new("TextLabel")
	text.Size = UDim2.fromScale(1, 1)
	text.BackgroundTransparency = 1
	text.Font = Enum.Font.GothamBlack
	text.TextScaled = true
	text.TextColor3 = if steuern then Color3.fromRGB(140, 255, 160) else Color3.fromRGB(255, 216, 74)
	text.TextStrokeTransparency = 0.2
	text.Text = "+" .. betrag .. " $" .. (if steuern then " Steuern" else "")
	text.Parent = schild

	local info = TweenInfo.new(1.6, Enum.EasingStyle.Quad, Enum.EasingDirection.Out)
	TweenService:Create(schild, info, { StudsOffsetWorldSpace = Vector3.new(0, 7, 0) }):Play()
	TweenService:Create(text, TweenInfo.new(1.6, Enum.EasingStyle.Quad, Enum.EasingDirection.In), {
		TextTransparency = 1,
		TextStrokeTransparency = 1,
	}):Play()
	Debris:AddItem(halter, 1.7)
end

Remotes:WaitForChild("Einkommen").OnClientEvent:Connect(function(liste)
	for i, eintrag in ipairs(liste) do
		if eintrag.betrag > 0 then
			-- leicht versetzt, damit es wie ein kleiner Geldregen aussieht
			task.delay((i - 1) * 0.06, geldSteigtAuf, eintrag.pos, eintrag.betrag, eintrag.steuern == true)
		end
	end
end)

------------------------------------------------------------------------
-- 2) Banner für eine neue Stadt-Stufe
------------------------------------------------------------------------

local gui = Instance.new("ScreenGui")
gui.Name = "StufeBanner"
gui.ResetOnSpawn = false
gui.IgnoreGuiInset = true
gui.DisplayOrder = 20
gui.Enabled = false
gui.Parent = spielerGui

local jubel = Instance.new("Sound")
jubel.SoundId = Config.Sounds.Stufe
jubel.Volume = 0.6
jubel.Parent = gui

local karte = Instance.new("Frame")
karte.AnchorPoint = Vector2.new(0.5, 0.5)
karte.Position = UDim2.fromScale(0.5, 0.42)
karte.Size = UDim2.fromOffset(340, 150)
karte.BackgroundColor3 = Color3.fromRGB(24, 28, 40)
karte.BackgroundTransparency = 0.05
karte.Parent = gui
local ecke = Instance.new("UICorner")
ecke.CornerRadius = UDim.new(0, 22)
ecke.Parent = karte
local rand = Instance.new("UIStroke")
rand.Color = Color3.fromRGB(255, 216, 74)
rand.Thickness = 3
rand.Parent = karte
local skala = Instance.new("UIScale")
skala.Parent = karte

local function zeile(y: number, hoehe: number, farbe: Color3): TextLabel
	local t = Instance.new("TextLabel")
	t.Position = UDim2.fromOffset(12, y)
	t.Size = UDim2.new(1, -24, 0, hoehe)
	t.BackgroundTransparency = 1
	t.Font = Enum.Font.GothamBlack
	t.TextScaled = true
	t.TextColor3 = farbe
	t.Parent = karte
	return t
end
local oben = zeile(12, 26, Color3.fromRGB(255, 216, 74))
oben.Text = "⭐ NEUE STUFE! ⭐"
local mitte = zeile(42, 52, Color3.new(1, 1, 1))
local unten = zeile(102, 32, Color3.fromRGB(124, 255, 155))

local KONFETTI_FARBEN = {
	Color3.fromRGB(255, 80, 80),
	Color3.fromRGB(255, 216, 74),
	Color3.fromRGB(90, 200, 255),
	Color3.fromRGB(124, 255, 155),
	Color3.fromRGB(230, 120, 255),
}

local function konfetti()
	for _ = 1, 40 do
		local stueck = Instance.new("Frame")
		stueck.Size = UDim2.fromOffset(math.random(6, 12), math.random(10, 18))
		stueck.Position = UDim2.new(math.random(), 0, 0, -20)
		stueck.Rotation = math.random(0, 360)
		stueck.BackgroundColor3 = KONFETTI_FARBEN[math.random(1, #KONFETTI_FARBEN)]
		stueck.BorderSizePixel = 0
		stueck.Parent = gui
		local dauer = 1.8 + math.random() * 1.4
		TweenService:Create(stueck, TweenInfo.new(dauer, Enum.EasingStyle.Quad, Enum.EasingDirection.In), {
			Position = UDim2.new(stueck.Position.X.Scale + (math.random() - 0.5) * 0.2, 0, 1.05, 0),
			Rotation = stueck.Rotation + math.random(-360, 360),
		}):Play()
		Debris:AddItem(stueck, dauer)
	end
end

local bannerNummer = 0
Remotes:WaitForChild("Stufe").OnClientEvent:Connect(function(stufe: number, bonus: number)
	local info = Config.STUFEN[stufe]
	if not info then
		return
	end
	bannerNummer += 1
	local meine = bannerNummer
	mitte.Text = string.upper(info.Name)
	unten.Text = if bonus > 0 then "Bonus: +" .. bonus .. " $" else ""
	gui.Enabled = true
	skala.Scale = 0.2
	TweenService:Create(skala, TweenInfo.new(0.45, Enum.EasingStyle.Back), { Scale = 1 }):Play()
	jubel:Play()
	konfetti()
	task.delay(3.2, function()
		if bannerNummer == meine then
			TweenService:Create(skala, TweenInfo.new(0.25), { Scale = 0 }):Play()
			task.wait(0.3)
			if bannerNummer == meine then
				gui.Enabled = false
			end
		end
	end)
end)
