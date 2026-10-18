--!strict
-- Hud.luau  (ModuleScript in StarterPlayerScripts.Client.UI)
-- Die Dauer-Anzeige: Coins, Gems, Level-Leiste, Menü-Knöpfe links und der große STARTEN/BOOST-Knopf.

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")
local UserInputService = game:GetService("UserInputService")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Rockets = require(Shared:WaitForChild("Config"):WaitForChild("Rockets"))
local Formulas = require(Shared:WaitForChild("Formulas"))
local Format = require(Shared:WaitForChild("Format"))

local Controllers = script.Parent.Parent:WaitForChild("Controllers")
local DataController = require(Controllers:WaitForChild("DataController"))
local FlightController = require(Controllers:WaitForChild("FlightController"))

local Theme = require(script.Parent:WaitForChild("Theme"))
local Components = require(script.Parent:WaitForChild("Components"))
local Context = require(script.Parent:WaitForChild("Context"))

local Hud = {}

-- Zählt eine Zahl sichtbar hoch und lässt die Anzeige kurz hüpfen
local function animatedNumber(label: TextLabel, scale: UIScale, formatter: (number) -> string)
	local value = Instance.new("NumberValue")
	local current = 0
	value.Changed:Connect(function(v: number)
		label.Text = formatter(v)
	end)
	return function(target: number)
		if target == current then
			label.Text = formatter(target)
			return
		end
		local grew = target > current
		current = target
		TweenService:Create(value, TweenInfo.new(0.6, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), { Value = target }):Play()
		if grew then
			scale.Scale = 1.15
			TweenService:Create(scale, Theme.Tween.Pop, { Scale = 1 }):Play()
		end
	end
end

local function currencyPill(parent: Instance, icon: string, color: Color3, order: number): (TextLabel, UIScale)
	local pill = Components.panel({
		Name = "Pill",
		Size = UDim2.fromOffset(210, 50),
		LayoutOrder = order,
		Parent = parent,
	})
	local scale = Components.new("UIScale", { Parent = pill }) :: UIScale
	Components.label({
		Text = icon,
		Size = UDim2.fromOffset(46, 50),
		Position = UDim2.fromOffset(6, 0),
		TextSize = 30,
		Parent = pill,
	})
	local value = Components.label({
		Text = "0",
		Size = UDim2.new(1, -62, 1, 0),
		Position = UDim2.fromOffset(54, 0),
		Font = Theme.Fonts.Title,
		TextSize = Theme.TextSize.Large + 2,
		TextColor3 = color,
		TextXAlignment = Enum.TextXAlignment.Left,
		Parent = pill,
	})
	return value, scale
end

function Hud.mount(ctx: Context.Context)
	local root = ctx.Root

	-- ===== Coins & Gems (oben links) =====
	local wallet = Components.new("Frame", {
		Name = "Wallet",
		Size = UDim2.fromOffset(210, 112),
		Position = UDim2.fromOffset(16, 12),
		BackgroundTransparency = 1,
		Parent = root,
	})
	Components.list(wallet, Enum.FillDirection.Vertical, 10)
	local coinsLabel, coinsScale = currencyPill(wallet, "💰", Theme.Colors.Coins, 1)
	local gemsLabel, gemsScale = currencyPill(wallet, "💎", Theme.Colors.Gems, 2)
	local setCoins = animatedNumber(coinsLabel, coinsScale, function(v)
		return Format.short(math.floor(v))
	end)
	local setGems = animatedNumber(gemsLabel, gemsScale, function(v)
		return Format.short(math.floor(v))
	end)

	-- ===== Level & XP (oben Mitte) =====
	local levelFrame = Components.panel({
		Name = "Level",
		Size = UDim2.fromOffset(400, 52),
		Position = UDim2.new(0.5, 0, 0, 12),
		AnchorPoint = Vector2.new(0.5, 0),
		Parent = root,
	})
	local badge = Components.new("Frame", {
		Size = UDim2.fromOffset(64, 64),
		Position = UDim2.new(0, -14, 0.5, 0),
		AnchorPoint = Vector2.new(0, 0.5),
		BackgroundColor3 = Theme.Colors.Violet,
		Parent = levelFrame,
	})
	Components.corner(badge, 32)
	Components.stroke(badge, Theme.Colors.Gold, 3, 0)
	local levelLabel = Components.label({
		Text = "1",
		Size = UDim2.fromScale(1, 1),
		Font = Theme.Fonts.Title,
		TextSize = 30,
		Parent = badge,
	})
	local xpBar = Components.progressBar({
		Size = UDim2.new(1, -78, 0, 20),
		Position = UDim2.fromOffset(62, 8),
		Parent = levelFrame,
	}, Theme.Colors.Violet, Theme.Colors.Cyan)
	local xpLabel = Components.label({
		Text = "0 / 60 XP",
		Size = UDim2.new(1, -78, 0, 20),
		Position = UDim2.fromOffset(62, 29),
		TextSize = Theme.TextSize.Small,
		TextColor3 = Theme.Colors.TextDim,
		Parent = levelFrame,
	})

	-- ===== Menü-Knöpfe (links) =====
	local menu = Components.new("Frame", {
		Name = "Menu",
		Size = UDim2.fromOffset(92, 400),
		Position = UDim2.new(0, 16, 0.5, 30),
		AnchorPoint = Vector2.new(0, 0.5),
		BackgroundTransparency = 1,
		Parent = root,
	})
	Components.list(menu, Enum.FillDirection.Vertical, 12)
	local entries = {
		{ Name = "Shop", Icon = "🚀", Text = "Raketen", Color = Theme.Colors.Violet },
		{ Name = "Upgrades", Icon = "🛠️", Text = "Upgrades", Color = Theme.Colors.Cyan },
		{ Name = "Leaderboard", Icon = "🏆", Text = "Rangliste", Color = Theme.Colors.GoldDark },
		{ Name = "Settings", Icon = "⚙️", Text = "Optionen", Color = Theme.Colors.PanelLight },
	}
	for index, entry in entries do
		local button = Components.button({
			Name = entry.Name,
			Text = "",
			Size = UDim2.fromOffset(88, 84),
			Color = entry.Color,
			LayoutOrder = index,
			Parent = menu,
			OnClick = function()
				ctx.ToggleWindow(entry.Name)
			end,
		})
		Components.label({ Text = entry.Icon, Size = UDim2.new(1, 0, 0, 50), Position = UDim2.fromOffset(0, 4), TextSize = 34, Parent = button })
		Components.label({
			Text = entry.Text,
			Size = UDim2.new(1, -4, 0, 24),
			Position = UDim2.new(0, 2, 1, -28),
			TextSize = Theme.TextSize.Small - 2,
			Parent = button,
		})
		ctx.Anchors[entry.Name .. "Button"] = button
	end

	-- ===== STARTEN / BOOST (unten Mitte) =====
	local launch = Components.button({
		Name = "Launch",
		Text = "",
		Size = UDim2.fromOffset(300, 96),
		Position = UDim2.new(0.5, 0, 1, -18),
		AnchorPoint = Vector2.new(0.5, 1),
		Color = Theme.Colors.Gold,
		Parent = root,
		OnClick = function()
			FlightController.requestLaunchOrBoost()
		end,
	})
	ctx.Anchors.LaunchButton = launch
	local launchTitle = Components.label({
		Text = "STARTEN",
		Size = UDim2.new(1, 0, 0, 52),
		Position = UDim2.fromOffset(0, 8),
		Font = Theme.Fonts.Title,
		TextSize = 44,
		TextColor3 = Color3.fromRGB(60, 30, 0),
		Parent = launch,
	})
	local launchSub = Components.label({
		Text = "",
		Size = UDim2.new(1, -16, 0, 26),
		Position = UDim2.fromOffset(8, 60),
		TextSize = Theme.TextSize.Small,
		TextColor3 = Color3.fromRGB(80, 45, 0),
		Parent = launch,
	})
	local keyHint = Components.label({
		Text = "[F]",
		Size = UDim2.fromOffset(60, 24),
		Position = UDim2.new(1, -64, 0, 6),
		TextSize = 16,
		TextColor3 = Color3.fromRGB(90, 50, 0),
		Parent = launch,
	})
	local function updateHint()
		if UserInputService.GamepadEnabled then
			keyHint.Text = "[R2]"
		elseif UserInputService.TouchEnabled and not UserInputService.KeyboardEnabled then
			keyHint.Text = ""
		else
			keyHint.Text = "[F]"
		end
	end
	updateHint()
	UserInputService.GamepadConnected:Connect(updateHint)
	UserInputService.GamepadDisconnected:Connect(updateHint)

	local function setLaunchLook(title: string, sub: string, color: Color3, dark: boolean)
		launchTitle.Text = title
		launchSub.Text = sub
		local textColor = if dark then Color3.fromRGB(60, 30, 0) else Theme.Colors.White
		launchTitle.TextColor3 = textColor
		launchSub.TextColor3 = if dark then Color3.fromRGB(80, 45, 0) else Theme.Colors.TextDim
		TweenService:Create(launch, Theme.Tween.Fast, { BackgroundColor3 = color }):Play()
	end

	local function idleLook()
		local data = DataController.get()
		if data == nil then
			setLaunchLook("LÄDT …", "", Theme.Colors.Disabled, false)
			return
		end
		local rocket = Rockets.get(data.EquippedRocket)
		if rocket then
			local estimate = Formulas.simulateFlight(Formulas.getFlightStats(rocket, data.Upgrades), false)
			setLaunchLook("STARTEN", "≈ " .. Format.altitude(estimate.MaxAltitudeMeters) .. " · " .. rocket.Name, Theme.Colors.Gold, true)
		end
	end

	local boostUsed = false
	FlightController.StateChanged:Connect(function(state: string, _flight: any)
		if state == "Countdown" then
			boostUsed = false
			setLaunchLook("3 … 2 … 1", "Gleich geht's los!", Theme.Colors.Disabled, false)
		elseif state == "Burn" or state == "Coast" then
			if not boostUsed then
				setLaunchLook("⚡ BOOST", "Antippen für mehr Schub", Theme.Colors.Cyan, true)
			end
		elseif state == "Apex" or state == "Descent" or state == "Landed" then
			setLaunchLook("KAPSEL LANDET", "Belohnung kommt gleich", Theme.Colors.Disabled, false)
		end
	end)
	FlightController.Telemetry:Connect(function(t: FlightController.Telemetry)
		if (t.State == "Burn" or t.State == "Coast") and t.Boosting and not boostUsed then
			boostUsed = true
			setLaunchLook("BOOST AKTIV", "Volle Kraft!", Theme.Colors.Violet, false)
		end
	end)
	FlightController.Ended:Connect(function()
		task.delay(0.5, idleLook)
	end)

	-- ===== Daten anzeigen =====
	local function render(data: any)
		setCoins(data.Coins)
		setGems(data.Gems)
		levelLabel.Text = tostring(data.Level)
		xpBar.Set(data.XP / math.max(data.XPNeeded, 1), true)
		xpLabel.Text = Format.short(data.XP) .. " / " .. Format.short(data.XPNeeded) .. " XP"
		if FlightController.getActive() == nil then
			idleLook()
		end
	end
	DataController.Changed:Connect(render)
	local data = DataController.get()
	if data then
		render(data)
	else
		idleLook()
	end
end

return Hud
