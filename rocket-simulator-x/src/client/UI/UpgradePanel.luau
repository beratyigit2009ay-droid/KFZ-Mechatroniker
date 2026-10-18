--!strict
-- UpgradePanel.luau  (ModuleScript in StarterPlayerScripts.Client.UI)
-- Upgrade-Menü: Motor, Treibstofftank, Aerodynamik, Boost.
-- Jede Zeile zeigt Stufe, Wirkung jetzt → nach dem Kauf, wie viel höher du dann fliegst, und den Preis.

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Config = Shared:WaitForChild("Config")
local Rockets = require(Config:WaitForChild("Rockets"))
local Upgrades = require(Config:WaitForChild("Upgrades"))
local FlightConfig = require(Config:WaitForChild("Flight"))
local Formulas = require(Shared:WaitForChild("Formulas"))
local Format = require(Shared:WaitForChild("Format"))
local Remotes = require(Shared:WaitForChild("Remotes"))

local Controllers = script.Parent.Parent:WaitForChild("Controllers")
local DataController = require(Controllers:WaitForChild("DataController"))
local SoundController = require(Controllers:WaitForChild("SoundController"))

local Theme = require(script.Parent:WaitForChild("Theme"))
local Components = require(script.Parent:WaitForChild("Components"))
local Context = require(script.Parent:WaitForChild("Context"))

local UpgradePanel = {}

type Row = {
	Upgrade: Upgrades.UpgradeDef,
	Level: TextLabel,
	Effect: TextLabel,
	Gain: TextLabel,
	Bar: Components.ProgressBar,
	Button: TextButton,
}

-- Wirkung einer Stufe als Text, z. B. "+9 % Schub"
local function effectText(upgrade: Upgrades.UpgradeDef, level: number): string
	if upgrade.Id == "Engine" then
		return string.format("+%d %% Schub", math.floor(upgrade.EffectPerLevel * level * 100 + 0.5))
	elseif upgrade.Id == "Fuel" then
		return string.format("+%d %% Brenndauer", math.floor(upgrade.EffectPerLevel * level * 100 + 0.5))
	elseif upgrade.Id == "Aero" then
		local reduction = 1 - (1 - upgrade.EffectPerLevel) ^ level
		return string.format("−%d %% Luftwiderstand", math.floor(reduction * 100 + 0.5))
	elseif upgrade.Id == "Boost" then
		return string.format("%.2f s Boost", FlightConfig.BaseBoostTime + upgrade.EffectPerLevel * level)
	end
	return tostring(level)
end

function UpgradePanel.mount(ctx: Context.Context)
	local window = Components.window(ctx.Root, "🛠️ Upgrades", Vector2.new(760, 540))
	ctx.Windows.Upgrades = window
	local content = window.Content
	Components.list(content, Enum.FillDirection.Vertical, 10, Enum.HorizontalAlignment.Center).VerticalAlignment = Enum.VerticalAlignment.Top

	local summary = Components.label({
		Text = "",
		Size = UDim2.new(1, 0, 0, 30),
		TextColor3 = Theme.Colors.Cyan,
		LayoutOrder = 0,
		Parent = content,
	})

	local rows: { Row } = {}

	for _, upgrade in Upgrades.List do
		local frame = Components.new("Frame", {
			Name = upgrade.Id,
			Size = UDim2.new(1, 0, 0, 98),
			BackgroundColor3 = Theme.Colors.PanelLight,
			LayoutOrder = upgrade.Order,
			Parent = content,
		})
		Components.corner(frame, 12)
		Components.stroke(frame, Theme.Colors.Stroke, 1, 0.5)

		local iconBack = Components.new("Frame", {
			Size = UDim2.fromOffset(70, 70),
			Position = UDim2.new(0, 14, 0.5, 0),
			AnchorPoint = Vector2.new(0, 0.5),
			BackgroundColor3 = Theme.Colors.PanelDark,
			Parent = frame,
		})
		Components.corner(iconBack, 35)
		Components.label({ Text = upgrade.Icon, Size = UDim2.fromScale(1, 1), TextSize = 36, Parent = iconBack })

		Components.label({
			Text = upgrade.Name,
			Size = UDim2.fromOffset(300, 28),
			Position = UDim2.fromOffset(98, 8),
			Font = Theme.Fonts.Title,
			TextSize = Theme.TextSize.Large,
			TextXAlignment = Enum.TextXAlignment.Left,
			Parent = frame,
		})
		local level = Components.label({
			Text = "Stufe 0/" .. upgrade.MaxLevel,
			Size = UDim2.fromOffset(150, 28),
			Position = UDim2.fromOffset(330, 8),
			TextSize = Theme.TextSize.Small,
			TextColor3 = Theme.Colors.TextDim,
			TextXAlignment = Enum.TextXAlignment.Right,
			Parent = frame,
		})
		local bar = Components.progressBar({
			Size = UDim2.fromOffset(382, 10),
			Position = UDim2.fromOffset(98, 40),
			Parent = frame,
		}, Theme.Colors.Cyan, Theme.Colors.Violet)
		local effect = Components.label({
			Text = "",
			Size = UDim2.fromOffset(382, 22),
			Position = UDim2.fromOffset(98, 54),
			TextSize = Theme.TextSize.Small,
			TextXAlignment = Enum.TextXAlignment.Left,
			Parent = frame,
		})
		local gain = Components.label({
			Text = "",
			Size = UDim2.fromOffset(382, 20),
			Position = UDim2.fromOffset(98, 75),
			TextSize = Theme.TextSize.Small - 3,
			TextColor3 = Theme.Colors.Success,
			TextXAlignment = Enum.TextXAlignment.Left,
			Parent = frame,
		})
		local button = Components.button({
			Text = "…",
			Size = UDim2.fromOffset(200, 58),
			Position = UDim2.new(1, -14, 0.5, 0),
			AnchorPoint = Vector2.new(1, 0.5),
			TextSize = Theme.TextSize.Large - 4,
			Parent = frame,
			OnClick = function()
				local ok, response = pcall(function()
					return Remotes.func("BuyUpgrade"):InvokeServer(upgrade.Id)
				end)
				if ok and type(response) == "table" then
					if response.Ok then
						SoundController.play("Purchase")
						ctx.Notify(response.Message or "Upgrade gekauft", "Success")
					else
						ctx.Notify(response.Message or "Geht gerade nicht", "Error")
					end
				else
					ctx.Notify("Keine Verbindung zum Server", "Error")
				end
			end,
		})
		table.insert(rows, { Upgrade = upgrade, Level = level, Effect = effect, Gain = gain, Bar = bar, Button = button })
	end

	local function refresh()
		local data = DataController.get()
		if data == nil then
			return
		end
		local rocket = Rockets.get(data.EquippedRocket) or Rockets.ById[Rockets.StarterId]
		local now = Formulas.simulateFlight(Formulas.getFlightStats(rocket, data.Upgrades), false).MaxAltitudeMeters
		summary.Text = "Mit " .. rocket.Name .. " fliegst du jetzt ≈ " .. Format.altitude(now) .. " hoch"

		for _, row in rows do
			local upgrade = row.Upgrade
			local current = data.Upgrades[upgrade.Id] or 0
			local cost = Formulas.upgradeCost(upgrade.Id, current)
			row.Level.Text = "Stufe " .. current .. "/" .. upgrade.MaxLevel
			row.Bar.Set(current / upgrade.MaxLevel, true)
			if cost == nil then
				row.Effect.Text = effectText(upgrade, current) .. "  (Maximum)"
				row.Gain.Text = ""
				row.Button.Text = "MAX"
				Components.setEnabled(row.Button, false)
			else
				row.Effect.Text = effectText(upgrade, current) .. "  →  " .. effectText(upgrade, current + 1)
				if upgrade.Id == "Boost" then
					row.Gain.Text = "Mehr Boost = mehr Höhe, wenn du BOOST drückst"
				else
					local nextLevels = table.clone(data.Upgrades)
					nextLevels[upgrade.Id] = current + 1
					local after = Formulas.simulateFlight(Formulas.getFlightStats(rocket, nextLevels), false).MaxAltitudeMeters
					row.Gain.Text = "≈ +" .. Format.altitude(math.max(after - now, 0)) .. " Höhe"
				end
				local icon = if upgrade.Currency == "Gems" then "💎" else "💰"
				local balance = if upgrade.Currency == "Gems" then data.Gems else data.Coins
				row.Button.Text = icon .. " " .. Format.short(cost)
				local color = if upgrade.Currency == "Gems" then Theme.Colors.Cyan else Theme.Colors.GoldDark
				-- Auch ohne genug Geld klickbar: der Server sagt dann, wie viel noch fehlt
				Components.setEnabled(row.Button, true, if balance >= cost then color else Theme.Colors.Disabled)
			end
		end
	end

	window.Opened.Event:Connect(refresh)
	DataController.Changed:Connect(function()
		if window.IsOpen() then
			refresh()
		end
	end)
end

return UpgradePanel
