-- Alarm.client.lua
-- Wenn deine Stadt angegriffen wird: Sirene im Kopfhörer, ein roter blinkender Balken
-- und der Bildschirmrand leuchtet rot.
-- Wenn eine andere Stadt angegriffen wird: kurzer gelber Hinweis.
-- Das gilt für Raketen, Panzer und Jets.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local SoundService = game:GetService("SoundService")

local Sirene = require(ReplicatedStorage:WaitForChild("Shared"):WaitForChild("Sirene"))
local Remotes = ReplicatedStorage:WaitForChild("Remotes")

local spieler = Players.LocalPlayer

-- Sound im SoundService spielt "2D", also überall gleich laut
local ton = Instance.new("Sound")
ton.Name = "AlarmTon"
ton.Volume = 0.6
ton.Parent = SoundService

------------------------------------------------------------------------
-- Roter Rand um den ganzen Bildschirm
------------------------------------------------------------------------

local randGui = Instance.new("ScreenGui")
randGui.Name = "AlarmRand"
randGui.ResetOnSpawn = false
randGui.IgnoreGuiInset = true
randGui.ScreenInsets = Enum.ScreenInsets.None
randGui.DisplayOrder = 5
randGui.Enabled = false
randGui.Parent = spieler:WaitForChild("PlayerGui")

-- 4 Streifen, die zur Bildschirmmitte hin durchsichtig werden
local STREIFEN = {
	{ pos = UDim2.fromScale(0, 0), groesse = UDim2.fromScale(1, 0.22), drehung = 90 }, -- oben
	{ pos = UDim2.fromScale(0, 0.78), groesse = UDim2.fromScale(1, 0.22), drehung = -90 }, -- unten
	{ pos = UDim2.fromScale(0, 0), groesse = UDim2.fromScale(0.14, 1), drehung = 0 }, -- links
	{ pos = UDim2.fromScale(0.86, 0), groesse = UDim2.fromScale(0.14, 1), drehung = 180 }, -- rechts
}
for _, s in ipairs(STREIFEN) do
	local f = Instance.new("Frame")
	f.Position = s.pos
	f.Size = s.groesse
	f.BackgroundColor3 = Color3.fromRGB(255, 0, 0)
	f.BorderSizePixel = 0
	f.Parent = randGui
	local verlauf = Instance.new("UIGradient")
	verlauf.Rotation = s.drehung
	verlauf.Transparency = NumberSequence.new(0.35, 1)
	verlauf.Parent = f
end

------------------------------------------------------------------------
-- Balken oben in der Mitte
------------------------------------------------------------------------

local gui = Instance.new("ScreenGui")
gui.Name = "AlarmGui"
gui.ResetOnSpawn = false
gui.DisplayOrder = 10 -- über dem Shop-Fenster
gui.ScreenInsets = Enum.ScreenInsets.CoreUISafeInsets
gui.Parent = spieler.PlayerGui

local balken = Instance.new("TextLabel")
balken.Name = "Balken"
balken.AnchorPoint = Vector2.new(0.5, 0)
balken.Position = UDim2.new(0.5, 0, 0, 90)
balken.Size = UDim2.new(0.6, 0, 0, 52)
balken.BackgroundColor3 = Color3.fromRGB(200, 0, 0)
balken.TextColor3 = Color3.new(1, 1, 1)
balken.Font = Enum.Font.GothamBlack
balken.TextScaled = true
balken.TextStrokeTransparency = 0.5
balken.Visible = false
balken.Parent = gui
local ecken = Instance.new("UICorner")
ecken.CornerRadius = UDim.new(0, 14)
ecken.Parent = balken
local polster = Instance.new("UIPadding")
polster.PaddingLeft = UDim.new(0, 12)
polster.PaddingRight = UDim.new(0, 12)
polster.PaddingTop = UDim.new(0, 6)
polster.PaddingBottom = UDim.new(0, 6)
polster.Parent = balken
local randLinie = Instance.new("UIStroke")
randLinie.Color = Color3.new(1, 1, 1)
randLinie.Thickness = 2
randLinie.Transparency = 0.3
randLinie.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
randLinie.Parent = balken
local groesse = Instance.new("UITextSizeConstraint")
groesse.MaxTextSize = 30
groesse.Parent = balken

local alarmBis = 0
local blinktGerade = false
local blinkModus = false

local function alarmAnzeigen(text: string, farbe: Color3, dauer: number, blinken: boolean)
	balken.Text = text
	balken.BackgroundColor3 = farbe
	alarmBis = math.max(alarmBis, os.clock() + dauer)
	balken.Visible = true
	if blinken then
		blinkModus = true
	end
	if blinktGerade then
		return
	end
	blinktGerade = true
	task.spawn(function()
		local an = true
		while os.clock() < alarmBis do
			if blinkModus then
				an = not an
				balken.BackgroundTransparency = if an then 0 else 0.45
				randGui.Enabled = an
			end
			task.wait(0.4)
		end
		balken.Visible = false
		balken.BackgroundTransparency = 0
		randGui.Enabled = false
		blinktGerade = false
		blinkModus = false
	end)
end

Remotes:WaitForChild("Alarm").OnClientEvent:Connect(function(zielIndex: number, textZiel: string, textAndere: string, dauer: number)
	if zielIndex == spieler:GetAttribute("Stadt") then
		Sirene.starten(ton, dauer)
		alarmAnzeigen("🚨 " .. textZiel, Color3.fromRGB(200, 0, 0), dauer, true)
	elseif not blinktGerade then
		alarmAnzeigen(textAndere, Color3.fromRGB(200, 130, 0), 3, false)
	end
end)
