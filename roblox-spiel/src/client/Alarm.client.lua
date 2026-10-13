-- Alarm.client.lua
-- Wenn deine Stadt angegriffen wird: Sirene im Kopfhörer und ein roter, blinkender Balken.
-- Wenn eine andere Stadt angegriffen wird: kurzer gelber Hinweis.

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

-- Bildschirm-Anzeige bauen
local gui = Instance.new("ScreenGui")
gui.Name = "AlarmGui"
gui.ResetOnSpawn = false
gui.Parent = spieler:WaitForChild("PlayerGui")

local balken = Instance.new("TextLabel")
balken.Name = "Balken"
balken.AnchorPoint = Vector2.new(0.5, 0)
balken.Position = UDim2.new(0.5, 0, 0, 10)
balken.Size = UDim2.new(0.5, 0, 0, 60)
balken.BackgroundColor3 = Color3.fromRGB(200, 0, 0)
balken.TextColor3 = Color3.new(1, 1, 1)
balken.Font = Enum.Font.GothamBlack
balken.TextScaled = true
balken.Visible = false
balken.Parent = gui
local ecken = Instance.new("UICorner")
ecken.CornerRadius = UDim.new(0, 10)
ecken.Parent = balken

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
		while os.clock() < alarmBis do
			if blinkModus then
				balken.BackgroundTransparency = if balken.BackgroundTransparency == 0 then 0.5 else 0
			end
			task.wait(0.4)
		end
		balken.Visible = false
		balken.BackgroundTransparency = 0
		blinktGerade = false
		blinkModus = false
	end)
end

Remotes:WaitForChild("Alarm").OnClientEvent:Connect(function(zielIndex: number, angreifer: string, dauer: number)
	if zielIndex == spieler:GetAttribute("Stadt") then
		Sirene.starten(ton, dauer)
		alarmAnzeigen("LUFTALARM! Rakete von " .. angreifer .. "!", Color3.fromRGB(200, 0, 0), dauer, true)
	elseif not blinktGerade then
		alarmAnzeigen(angreifer .. " greift Stadt " .. zielIndex .. " an!", Color3.fromRGB(200, 140, 0), 3, false)
	end
end)
