--!strict
-- FlightHud.luau  (ModuleScript in StarterPlayerScripts.Client.UI)
-- Anzeige während des Flugs: Countdown, Höhe, Tempo, Mach, G-Kraft, Luftschicht und Luftdichte,
-- Treibstoff, Boost, geschätzte Belohnung, Rekord und Missions-Ansagen (Zündung, Max-Q, Weltall …).

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Formulas = require(Shared:WaitForChild("Formulas"))
local Format = require(Shared:WaitForChild("Format"))
local FlightConfig = require(Shared:WaitForChild("Config"):WaitForChild("Flight"))

local Controllers = script.Parent.Parent:WaitForChild("Controllers")
local FlightController = require(Controllers:WaitForChild("FlightController"))
local SoundController = require(Controllers:WaitForChild("SoundController"))

local Theme = require(script.Parent:WaitForChild("Theme"))
local Components = require(script.Parent:WaitForChild("Components"))
local Context = require(script.Parent:WaitForChild("Context"))

local FlightHud = {}

function FlightHud.mount(ctx: Context.Context)
	local root = ctx.Root

	local panel = Components.panel({
		Name = "FlightHud",
		Size = UDim2.fromOffset(280, 386),
		Position = UDim2.new(1, -16, 0.5, 0),
		AnchorPoint = Vector2.new(1, 0.5),
		Visible = false,
		Parent = root,
	})
	Components.padding(panel, 14)
	Components.list(panel, Enum.FillDirection.Vertical, 6, Enum.HorizontalAlignment.Center)

	local function small(text: string, order: number): TextLabel
		return Components.label({
			Text = text,
			Size = UDim2.new(1, 0, 0, 20),
			TextSize = Theme.TextSize.Small - 2,
			TextColor3 = Theme.Colors.TextDim,
			TextXAlignment = Enum.TextXAlignment.Left,
			LayoutOrder = order,
			Parent = panel,
		})
	end

	small("HÖHE", 1)
	local altitude = Components.label({
		Text = "0 m",
		Size = UDim2.new(1, 0, 0, 46),
		Font = Theme.Fonts.Title,
		TextSize = 42,
		TextColor3 = Theme.Colors.Cyan,
		TextXAlignment = Enum.TextXAlignment.Left,
		LayoutOrder = 2,
		Parent = panel,
	})
	local speed = Components.label({
		Text = "0 km/h",
		Size = UDim2.new(1, 0, 0, 24),
		TextColor3 = Theme.Colors.Text,
		TextXAlignment = Enum.TextXAlignment.Left,
		LayoutOrder = 3,
		Parent = panel,
	})
	local physics = Components.label({
		Text = "Mach 0.0  ·  1.0 G",
		Size = UDim2.new(1, 0, 0, 22),
		TextSize = Theme.TextSize.Small,
		TextColor3 = Theme.Colors.Gold,
		TextXAlignment = Enum.TextXAlignment.Left,
		LayoutOrder = 4,
		Parent = panel,
	})
	local layer = Components.label({
		Text = "Troposphäre  ·  Luft 100 %",
		Size = UDim2.new(1, 0, 0, 20),
		TextSize = Theme.TextSize.Small - 2,
		TextColor3 = Theme.Colors.TextDim,
		TextXAlignment = Enum.TextXAlignment.Left,
		LayoutOrder = 5,
		Parent = panel,
	})
	small("BELASTUNG (LUFTDRUCK)", 6)
	local load = Components.progressBar({ Size = UDim2.new(1, 0, 0, 10), LayoutOrder = 7, Parent = panel }, Theme.Colors.Success, Theme.Colors.Danger)
	small("TREIBSTOFF", 8)
	local fuel = Components.progressBar({ Size = UDim2.new(1, 0, 0, 16), LayoutOrder = 9, Parent = panel }, Theme.Colors.Gold, Color3.fromRGB(255, 110, 40))
	small("BOOST", 10)
	local boost = Components.progressBar({ Size = UDim2.new(1, 0, 0, 16), LayoutOrder = 11, Parent = panel }, Theme.Colors.Cyan, Theme.Colors.Violet)
	local reward = Components.label({
		Text = "≈ +0 💰",
		Size = UDim2.new(1, 0, 0, 30),
		Font = Theme.Fonts.Title,
		TextSize = Theme.TextSize.Large,
		TextColor3 = Theme.Colors.Coins,
		TextXAlignment = Enum.TextXAlignment.Left,
		LayoutOrder = 12,
		Parent = panel,
	})
	local record = Components.label({
		Text = "Rekord: –",
		Size = UDim2.new(1, 0, 0, 22),
		TextSize = Theme.TextSize.Small,
		TextColor3 = Theme.Colors.TextDim,
		TextXAlignment = Enum.TextXAlignment.Left,
		LayoutOrder = 13,
		Parent = panel,
	})

	-- Großer Countdown in der Mitte
	local countdown = Components.label({
		Name = "Countdown",
		Text = "",
		Size = UDim2.fromOffset(500, 140),
		Position = UDim2.fromScale(0.5, 0.38),
		AnchorPoint = Vector2.new(0.5, 0.5),
		Font = Theme.Fonts.Title,
		TextSize = 120,
		TextColor3 = Theme.Colors.Gold,
		TextStrokeTransparency = 0.3,
		Visible = false,
		Parent = root,
	})
	local countdownScale = Components.new("UIScale", { Parent = countdown }) :: UIScale

	local banner = Components.label({
		Name = "RecordBanner",
		Text = "🏆 NEUER REKORD!",
		Size = UDim2.fromOffset(520, 64),
		Position = UDim2.fromScale(0.5, 0.2),
		AnchorPoint = Vector2.new(0.5, 0.5),
		Font = Theme.Fonts.Title,
		TextSize = 48,
		TextColor3 = Theme.Colors.Gold,
		TextStrokeTransparency = 0.3,
		Visible = false,
		Parent = root,
	})
	local bannerScale = Components.new("UIScale", { Parent = banner }) :: UIScale

	-- Missions-Ansage (wie der Sprecher bei einem echten Start)
	local calloutLabel = Components.label({
		Name = "Callout",
		Text = "",
		Size = UDim2.fromOffset(680, 46),
		Position = UDim2.fromScale(0.5, 0.62),
		AnchorPoint = Vector2.new(0.5, 0.5),
		Font = Theme.Fonts.Title,
		TextSize = 32,
		TextColor3 = Theme.Colors.Text,
		TextStrokeTransparency = 0.25,
		Visible = false,
		Parent = root,
	})
	local calloutScale = Components.new("UIScale", { Parent = calloutLabel }) :: UIScale
	local calloutColors: { [string]: Color3 } = {
		Info = Theme.Colors.Cyan,
		Warn = Theme.Colors.Gold,
		Space = Theme.Colors.Violet,
		Danger = Color3.fromRGB(255, 140, 70),
	}
	local calloutId = 0

	local function pop(label: TextLabel, scale: UIScale, text: string)
		label.Text = text
		label.Visible = true
		scale.Scale = 1.6
		TweenService:Create(scale, Theme.Tween.Pop, { Scale = 1 }):Play()
	end

	local currentFlight: FlightController.ActiveFlight? = nil
	local recordShown = false

	FlightController.Callout:Connect(function(text: string, kind: string)
		calloutId += 1
		local id = calloutId
		calloutLabel.TextColor3 = calloutColors[kind] or Theme.Colors.Text
		pop(calloutLabel, calloutScale, text)
		task.delay(2.6, function()
			if calloutId == id then
				calloutLabel.Visible = false
			end
		end)
	end)

	FlightController.Started:Connect(function(flight: FlightController.ActiveFlight)
		currentFlight = flight
		recordShown = false
		panel.Visible = true
		record.Text = if flight.BestAltitude > 0 then "Rekord: " .. Format.altitude(flight.BestAltitude) else "Erster Flug!"
		altitude.Text = "0 m"
		speed.Text = "0 km/h"
		physics.Text = "Mach 0.0  ·  1.0 G"
		layer.Text = "Troposphäre  ·  Luft 100 %"
		load.Set(0)
		fuel.Set(1)
		boost.Set(1)
		reward.Text = "≈ +0 💰"
		-- 3 … 2 … 1 … START!
		for i = 3, 1, -1 do
			task.delay(3 - i, function()
				if currentFlight == flight and flight.State == "Countdown" then
					pop(countdown, countdownScale, tostring(i))
				end
			end)
		end
	end)

	FlightController.StateChanged:Connect(function(state: string)
		if state == "Burn" then
			pop(countdown, countdownScale, "START!")
			task.delay(0.9, function()
				if countdown.Text == "START!" then
					countdown.Visible = false
				end
			end)
		elseif state ~= "Countdown" then
			countdown.Visible = false
		end
	end)

	FlightController.Telemetry:Connect(function(t: FlightController.Telemetry)
		local flight = currentFlight
		if flight == nil then
			return
		end
		altitude.Text = Format.altitude(t.MaxAltitudeMeters)
		speed.Text = "🚀 " .. Format.speed(t.Speed, FlightConfig.MetersPerStud)
		physics.Text = string.format("Mach %.1f  ·  %.1f G", t.Mach, math.max(t.GForce, 0))
		local percent = t.AirDensity * 100
		layer.Text = t.Layer .. "  ·  Luft " .. (if percent >= 1 then string.format("%d %%", math.floor(percent + 0.5)) else "< 1 %")
		load.Set(math.clamp(t.Load / 1.2, 0, 1))
		fuel.Set(t.Fuel)
		boost.Set(t.Boost)
		if flight.Rocket then
			-- Nur eine Schätzung zum Anschauen. Die echte Belohnung berechnet der Server.
			local preview = Formulas.flightReward(t.MaxAltitudeMeters, flight.Rocket, 1)
			reward.Text = "≈ +" .. Format.short(preview.Coins) .. " 💰"
		end
		if not recordShown and flight.BestAltitude > 0 and t.MaxAltitudeMeters > flight.BestAltitude then
			recordShown = true
			pop(banner, bannerScale, "🏆 NEUER REKORD!")
			SoundController.play("Reward")
			task.delay(2.2, function()
				banner.Visible = false
			end)
		end
	end)

	FlightController.Ended:Connect(function()
		currentFlight = nil
		panel.Visible = false
		countdown.Visible = false
		banner.Visible = false
		calloutLabel.Visible = false
	end)
end

return FlightHud
