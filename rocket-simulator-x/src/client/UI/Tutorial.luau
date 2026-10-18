--!strict
-- Tutorial.luau  (ModuleScript in StarterPlayerScripts.Client.UI)
-- Sprechblase mit Pfeil, die Einsteigern die ersten 3 Schritte zeigt. Den Fortschritt speichert der Server.

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local TweenService = game:GetService("TweenService")

local Remotes = require(ReplicatedStorage:WaitForChild("Shared"):WaitForChild("Remotes"))
local Controllers = script.Parent.Parent:WaitForChild("Controllers")
local DataController = require(Controllers:WaitForChild("DataController"))
local FlightController = require(Controllers:WaitForChild("FlightController"))
local Theme = require(script.Parent:WaitForChild("Theme"))
local Components = require(script.Parent:WaitForChild("Components"))
local Context = require(script.Parent:WaitForChild("Context"))

local Tutorial = {}

local STEPS = {
	[0] = { Anchor = "LaunchButton", Text = "👋 Willkommen! Drück STARTEN, um deine erste Rakete fliegen zu lassen.", Side = "Top" },
	[1] = { Anchor = "UpgradesButton", Text = "Super Flug! Kauf jetzt ein Upgrade, damit du noch höher kommst.", Side = "Right" },
	[2] = { Anchor = "ShopButton", Text = "Im Raketen-Shop warten 20 Raketen auf dich. Schau mal rein!", Side = "Right" },
}

function Tutorial.mount(ctx: Context.Context)
	local bubble = Components.panel({
		Name = "TutorialBubble",
		Size = UDim2.fromOffset(330, 120),
		BackgroundColor3 = Theme.Colors.PanelLight,
		Visible = false,
		ZIndex = 40,
		Parent = ctx.Root,
	})
	local stroke = bubble:FindFirstChildOfClass("UIStroke")
	if stroke then
		stroke.Color = Theme.Colors.Gold
		stroke.Thickness = 3
	end
	local text = Components.label({
		Text = "",
		Size = UDim2.new(1, -24, 1, -44),
		Position = UDim2.fromOffset(12, 8),
		TextSize = Theme.TextSize.Small,
		TextXAlignment = Enum.TextXAlignment.Left,
		ZIndex = 41,
		Parent = bubble,
	})
	local skip = Components.button({
		Text = "Überspringen",
		Size = UDim2.fromOffset(130, 30),
		Position = UDim2.new(1, -140, 1, -38),
		Color = Theme.Colors.PanelDark,
		TextSize = 15,
		Parent = bubble,
		OnClick = function()
			Remotes.event("TutorialAdvance"):FireServer(3)
			bubble.Visible = false
		end,
	})
	skip.ZIndex = 41
	local arrow = Components.label({
		Text = "▼",
		Size = UDim2.fromOffset(40, 40),
		TextSize = 34,
		TextColor3 = Theme.Colors.Gold,
		ZIndex = 41,
		Parent = bubble,
	})

	local step = -1
	local bob = 0

	local function place()
		local info = STEPS[step]
		local anchor: GuiObject? = if info then ctx.Anchors[info.Anchor] else nil
		if info == nil or anchor == nil or FlightController.getActive() ~= nil then
			bubble.Visible = false
			return
		end
		bubble.Visible = true
		text.Text = info.Text
		-- Position des Ziel-Knopfs in Design-Pixeln (die Oberfläche ist skaliert)
		local scale = ctx.Scale.Scale
		local rootPos = ctx.Root.AbsolutePosition
		local pos = (anchor.AbsolutePosition - rootPos) / scale
		local size = anchor.AbsoluteSize / scale
		local wobble = math.sin(bob * 4) * 6
		if info.Side == "Top" then
			bubble.Position = UDim2.fromOffset(pos.X + size.X / 2 - 165, pos.Y - 150 + wobble)
			arrow.Text = "▼"
			arrow.Position = UDim2.new(0.5, -20, 1, -6)
		else
			bubble.Position = UDim2.fromOffset(pos.X + size.X + 26 + wobble, pos.Y + size.Y / 2 - 60)
			arrow.Text = "◀"
			arrow.Position = UDim2.new(0, -34, 0.5, -20)
		end
	end

	RunService.RenderStepped:Connect(function(dt: number)
		if step >= 0 and step <= 2 then
			bob += dt
			place()
		end
	end)

	DataController.Changed:Connect(function(data: any)
		if data.TutorialStep ~= step then
			step = data.TutorialStep
			if STEPS[step] then
				local scale = bubble:FindFirstChildOfClass("UIScale") or Components.new("UIScale", { Parent = bubble })
				scale.Scale = 0.7
				TweenService:Create(scale, Theme.Tween.Pop, { Scale = 1 }):Play()
			else
				bubble.Visible = false
			end
		end
	end)

	-- Schritt 2: Shop geöffnet -> Tutorial fertig
	local shop = ctx.Windows.Shop
	if shop then
		shop.Opened.Event:Connect(function()
			if step == 2 then
				Remotes.event("TutorialAdvance"):FireServer(3)
			end
		end)
	end
end

return Tutorial
