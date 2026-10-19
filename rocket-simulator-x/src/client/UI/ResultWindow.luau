--!strict
-- ResultWindow.luau  (ModuleScript in StarterPlayerScripts.Client.UI)
-- Belohnungsfenster nach der Landung: Höhe, Coins, XP, Gems, Rekord, seltener Fund.
-- Die Zahlen kommen vom Server (FlightEvent "Landed"), der Client zählt sie nur hübsch hoch.

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")

local Format = require(ReplicatedStorage:WaitForChild("Shared"):WaitForChild("Format"))
local Controllers = script.Parent.Parent:WaitForChild("Controllers")
local FlightController = require(Controllers:WaitForChild("FlightController"))
local SoundController = require(Controllers:WaitForChild("SoundController"))
local Theme = require(script.Parent:WaitForChild("Theme"))
local Components = require(script.Parent:WaitForChild("Components"))
local Context = require(script.Parent:WaitForChild("Context"))

local ResultWindow = {}

function ResultWindow.mount(ctx: Context.Context)
	local window = Components.window(ctx.Root, "🚀 Flug beendet!", Vector2.new(480, 420))
	ctx.Windows.Result = window
	local content = window.Content
	Components.list(content, Enum.FillDirection.Vertical, 8, Enum.HorizontalAlignment.Center)

	local headline = Components.label({
		Text = "",
		Size = UDim2.new(1, 0, 0, 40),
		Font = Theme.Fonts.Title,
		TextSize = Theme.TextSize.Title,
		TextColor3 = Theme.Colors.Gold,
		LayoutOrder = 1,
		Parent = content,
	})

	local function row(icon: string, title: string, color: Color3, order: number): TextLabel
		local frame = Components.new("Frame", {
			Size = UDim2.new(1, 0, 0, 44),
			BackgroundColor3 = Theme.Colors.PanelDark,
			LayoutOrder = order,
			Parent = content,
		})
		Components.corner(frame, 10)
		Components.label({
			Text = icon .. "  " .. title,
			Size = UDim2.new(0.55, 0, 1, 0),
			Position = UDim2.fromOffset(14, 0),
			TextXAlignment = Enum.TextXAlignment.Left,
			TextColor3 = Theme.Colors.TextDim,
			Parent = frame,
		})
		return Components.label({
			Text = "0",
			Size = UDim2.new(0.45, -14, 1, 0),
			Position = UDim2.new(0.55, 0, 0, 0),
			TextXAlignment = Enum.TextXAlignment.Right,
			Font = Theme.Fonts.Title,
			TextSize = Theme.TextSize.Large,
			TextColor3 = color,
			Parent = frame,
		})
	end

	local altitudeValue = row("📏", "Höhe", Theme.Colors.Cyan, 2)
	local coinsValue = row("💰", "Coins", Theme.Colors.Coins, 3)
	local xpValue = row("⭐", "XP", Theme.Colors.Violet, 4)
	local gemsValue = row("💎", "Gems", Theme.Colors.Gems, 5)
	local extra = Components.label({
		Text = "",
		Size = UDim2.new(1, 0, 0, 26),
		TextSize = Theme.TextSize.Small,
		TextColor3 = Theme.Colors.Success,
		LayoutOrder = 6,
		Parent = content,
	})
	Components.button({
		Text = "Weiter",
		Size = UDim2.fromOffset(220, 54),
		Color = Theme.Colors.Success,
		TextSize = Theme.TextSize.Large,
		LayoutOrder = 7,
		Parent = content,
		OnClick = window.Close,
	})

	local function countUp(label: TextLabel, target: number, formatter: (number) -> string, prefix: string)
		local value = Instance.new("NumberValue")
		value.Changed:Connect(function(v: number)
			label.Text = prefix .. formatter(v)
		end)
		label.Text = prefix .. formatter(0)
		local tween = TweenService:Create(value, TweenInfo.new(1.1, Enum.EasingStyle.Quart, Enum.EasingDirection.Out), { Value = target })
		tween.Completed:Once(function()
			label.Text = prefix .. formatter(target)
			value:Destroy()
		end)
		tween:Play()
	end

	FlightController.Ended:Connect(function(result: any)
		if type(result) ~= "table" then
			return
		end
		headline.Text = if result.IsRecord then "🏆 NEUER REKORD!" else "Gut geflogen!"
		countUp(altitudeValue, result.AltitudeMeters or 0, function(v)
			return Format.altitude(v)
		end, "")
		countUp(coinsValue, result.Coins or 0, function(v)
			return Format.short(math.floor(v))
		end, "+")
		countUp(xpValue, result.XP or 0, function(v)
			return Format.short(math.floor(v))
		end, "+")
		countUp(gemsValue, result.Gems or 0, function(v)
			return Format.short(math.floor(v))
		end, "+")
		local notes = {}
		if result.RareDrop then
			table.insert(notes, "☄️ Seltener Fund: Meteoritensplitter!")
		end
		if (result.LevelUps or 0) > 0 then
			table.insert(notes, "⭐ Level " .. tostring(result.Level) .. " erreicht!")
		end
		extra.Text = table.concat(notes, "   ")
		ctx.CloseWindows()
		window.Open()
		SoundController.play("Reward")
	end)

	-- Beim nächsten Start schließt sich das Fenster automatisch
	FlightController.Started:Connect(function()
		window.Close()
	end)
end

return ResultWindow
