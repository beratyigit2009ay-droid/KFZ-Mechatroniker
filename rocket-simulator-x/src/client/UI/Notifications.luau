--!strict
-- Notifications.luau  (ModuleScript in StarterPlayerScripts.Client.UI)
-- Kleine Meldungen oben in der Mitte ("Upgrade gekauft!", "Dir fehlen 50 Coins" …).
-- Höchstens 4 gleichzeitig, jede verschwindet nach ein paar Sekunden von selbst.

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")

local Remotes = require(ReplicatedStorage:WaitForChild("Shared"):WaitForChild("Remotes"))
local SoundController = require(script.Parent.Parent:WaitForChild("Controllers"):WaitForChild("SoundController"))
local Theme = require(script.Parent:WaitForChild("Theme"))
local Components = require(script.Parent:WaitForChild("Components"))
local Context = require(script.Parent:WaitForChild("Context"))

local Notifications = {}

local MAX_VISIBLE = 4

function Notifications.mount(ctx: Context.Context): (text: string, kind: string?) -> ()
	local container = Components.new("Frame", {
		Name = "Notifications",
		Size = UDim2.fromOffset(520, 300),
		Position = UDim2.new(0.5, 0, 0, 76),
		AnchorPoint = Vector2.new(0.5, 0),
		BackgroundTransparency = 1,
		ZIndex = 50,
		Parent = ctx.Root,
	})
	local layout = Components.list(container, Enum.FillDirection.Vertical, 8, Enum.HorizontalAlignment.Center)
	layout.VerticalAlignment = Enum.VerticalAlignment.Top

	local order = 0
	local function show(text: string, kind: string?)
		local color = Theme.NotifyColors[kind or "Info"] or Theme.NotifyColors.Info
		order += 1
		local toasts = {}
		for _, child in container:GetChildren() do
			if child:IsA("Frame") then
				table.insert(toasts, child)
			end
		end
		if #toasts >= MAX_VISIBLE then
			table.sort(toasts, function(a, b)
				return a.LayoutOrder < b.LayoutOrder
			end)
			toasts[1]:Destroy()
		end

		local toast = Components.panel({
			Name = "Toast",
			Size = UDim2.fromOffset(500, 50),
			BackgroundColor3 = Theme.Colors.PanelDark,
			LayoutOrder = order,
			ZIndex = 50,
			Parent = container,
		})
		local stroke = toast:FindFirstChildOfClass("UIStroke")
		if stroke then
			stroke.Color = color
		end
		local bar = Components.new("Frame", {
			Size = UDim2.new(0, 6, 1, -16),
			Position = UDim2.fromOffset(10, 8),
			BackgroundColor3 = color,
			BorderSizePixel = 0,
			ZIndex = 51,
			Parent = toast,
		})
		Components.corner(bar, 3)
		local label = Components.label({
			Text = text,
			Size = UDim2.new(1, -36, 1, 0),
			Position = UDim2.fromOffset(26, 0),
			TextSize = Theme.TextSize.Body - 2,
			TextXAlignment = Enum.TextXAlignment.Left,
			ZIndex = 51,
			Parent = toast,
		})
		-- Lange Texte bekommen eine zweite Zeile
		if #text > 46 then
			toast.Size = UDim2.fromOffset(500, 74)
		end
		local scale = Components.new("UIScale", { Scale = 0.6, Parent = toast }) :: UIScale
		TweenService:Create(scale, Theme.Tween.Pop, { Scale = 1 }):Play()
		if kind == "Error" then
			SoundController.play("Error")
		elseif kind == "LevelUp" then
			SoundController.play("LevelUp")
		end

		local lifetime = if #text > 46 then 6 else 3.5
		task.delay(lifetime, function()
			if toast.Parent == nil then
				return
			end
			local fade = TweenService:Create(scale, Theme.Tween.Normal, { Scale = 0 })
			TweenService:Create(label, Theme.Tween.Normal, { TextTransparency = 1 }):Play()
			fade.Completed:Once(function()
				toast:Destroy()
			end)
			fade:Play()
		end)
	end

	Remotes.event("Notify").OnClientEvent:Connect(function(payload: any)
		if type(payload) == "table" and type(payload.Text) == "string" then
			show(payload.Text, if type(payload.Kind) == "string" then payload.Kind else "Info")
		end
	end)
	return show
end

return Notifications
