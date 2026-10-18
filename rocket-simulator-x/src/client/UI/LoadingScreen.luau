--!strict
-- LoadingScreen.luau  (ModuleScript in StarterPlayerScripts.Client.UI)
-- Ladebildschirm, bis die Spielerdaten vom Server da sind. Liegt in einer eigenen ScreenGui ganz oben.

local Players = game:GetService("Players")
local TweenService = game:GetService("TweenService")

local DataController = require(script.Parent.Parent:WaitForChild("Controllers"):WaitForChild("DataController"))
local Theme = require(script.Parent:WaitForChild("Theme"))
local Components = require(script.Parent:WaitForChild("Components"))

local LoadingScreen = {}

function LoadingScreen.show()
	local gui = Components.new("ScreenGui", {
		Name = "RocketSimLoading",
		ResetOnSpawn = false,
		IgnoreGuiInset = true,
		DisplayOrder = 100,
		ZIndexBehavior = Enum.ZIndexBehavior.Sibling,
		Parent = Players.LocalPlayer:WaitForChild("PlayerGui"),
	}) :: ScreenGui
	local background = Components.new("Frame", {
		Size = UDim2.fromScale(1, 1),
		BackgroundColor3 = Color3.new(1, 1, 1), -- weiß, damit der Verlauf seine Farben zeigt
		BorderSizePixel = 0,
		Parent = gui,
	}) :: Frame
	Components.gradient(background, Color3.fromRGB(40, 20, 90), Theme.Colors.Background, 90)

	local title = Components.label({
		Text = "ROCKET SIMULATOR X",
		Size = UDim2.new(0.9, 0, 0.14, 0),
		Position = UDim2.fromScale(0.5, 0.36),
		AnchorPoint = Vector2.new(0.5, 0.5),
		Font = Theme.Fonts.Title,
		TextScaled = true,
		TextColor3 = Theme.Colors.Gold,
		Parent = background,
	})
	Components.new("UITextSizeConstraint", { MaxTextSize = 90, Parent = title })
	local rocket = Components.label({
		Text = "🚀",
		Size = UDim2.fromOffset(120, 120),
		Position = UDim2.fromScale(0.5, 0.58),
		AnchorPoint = Vector2.new(0.5, 0.5),
		TextSize = 90,
		Rotation = -45,
		Parent = background,
	})
	local status = Components.label({
		Text = "Startrampe wird vorbereitet …",
		Size = UDim2.new(0.9, 0, 0, 40),
		Position = UDim2.fromScale(0.5, 0.75),
		AnchorPoint = Vector2.new(0.5, 0.5),
		TextColor3 = Theme.Colors.TextDim,
		TextSize = 24,
		Parent = background,
	})

	local bobTween = TweenService:Create(rocket, TweenInfo.new(0.8, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut, -1, true), {
		Position = UDim2.fromScale(0.5, 0.55),
	})
	bobTween:Play()

	task.spawn(function()
		local started = os.clock()
		task.spawn(function()
			while gui.Parent and DataController.get() == nil do
				task.wait(1)
				if os.clock() - started > 8 then
					status.Text = "Daten werden geladen … das dauert gerade etwas länger."
				end
			end
		end)
		DataController.waitForData()
		status.Text = "Bereit zum Start!"
		task.wait(0.4)
		local fade = TweenInfo.new(0.6)
		TweenService:Create(background, fade, { BackgroundTransparency = 1 }):Play()
		for _, label in { title, rocket, status } do
			TweenService:Create(label, fade, { TextTransparency = 1 }):Play()
		end
		task.wait(0.7)
		bobTween:Cancel()
		gui:Destroy()
	end)
end

return LoadingScreen
