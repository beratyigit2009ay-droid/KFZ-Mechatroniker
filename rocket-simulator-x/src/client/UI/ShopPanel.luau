--!strict
-- ShopPanel.luau  (ModuleScript in StarterPlayerScripts.Client.UI)
-- Raketen-Shop: alle 20 Raketen als Karten mit 3D-Vorschau, Typ, Werten und Kauf-/Ausrüsten-Knopf.
-- "Höhe ≈" rechnet mit DEINEN Upgrades – so kannst du Raketen direkt vergleichen.
-- Der Knopf schickt nur die Raketen-ID an den Server. Preis und Erlaubnis prüft der Server.

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Rockets = require(Shared:WaitForChild("Config"):WaitForChild("Rockets"))
local Formulas = require(Shared:WaitForChild("Formulas"))
local Format = require(Shared:WaitForChild("Format"))
local Remotes = require(Shared:WaitForChild("Remotes"))
local RocketBuilder = require(Shared:WaitForChild("RocketBuilder"))

local Controllers = script.Parent.Parent:WaitForChild("Controllers")
local DataController = require(Controllers:WaitForChild("DataController"))
local SoundController = require(Controllers:WaitForChild("SoundController"))

local Theme = require(script.Parent:WaitForChild("Theme"))
local Components = require(script.Parent:WaitForChild("Components"))
local Context = require(script.Parent:WaitForChild("Context"))

local ShopPanel = {}

type Card = {
	Rocket: Rockets.RocketDef,
	Frame: Frame,
	Button: TextButton,
	Estimate: TextLabel,
	Lock: TextLabel,
}

local function buildPreview(parent: Frame, rocket: Rockets.RocketDef)
	local viewport = Components.new("ViewportFrame", {
		Size = UDim2.new(1, -16, 0, 118),
		Position = UDim2.fromOffset(8, 8),
		BackgroundColor3 = Theme.Colors.PanelDark,
		Ambient = Color3.fromRGB(150, 150, 170),
		LightColor = Color3.fromRGB(255, 255, 255),
		LightDirection = Vector3.new(-1, -1, -0.5),
		Parent = parent,
	}) :: ViewportFrame
	Components.corner(viewport, 10)
	local model = RocketBuilder.build(rocket)
	-- Partikel werden in einer Vorschau nicht gezeigt; entfernen spart Speicher
	for _, item in model:GetDescendants() do
		if item:IsA("ParticleEmitter") or item:IsA("Trail") or item:IsA("Light") then
			item:Destroy()
		end
	end
	model:PivotTo(CFrame.new(0, rocket.Style.Height * 0.45, 0) * CFrame.Angles(0, math.rad(200), 0))
	model.Parent = viewport
	local camera = Instance.new("Camera")
	camera.FieldOfView = 40
	local height = rocket.Style.Height
	local center = Vector3.new(0, height * 0.5, 0)
	local distance = height * 1.75
	camera.CFrame = CFrame.lookAt(center + Vector3.new(0.35, 0.12, 1).Unit * distance, center)
	camera.Parent = viewport
	viewport.CurrentCamera = camera
end

function ShopPanel.mount(ctx: Context.Context)
	local window = Components.window(ctx.Root, "🚀 Raketen-Shop", Vector2.new(880, 560))
	ctx.Windows.Shop = window

	local scroller = Components.new("ScrollingFrame", {
		Size = UDim2.fromScale(1, 1),
		BackgroundTransparency = 1,
		BorderSizePixel = 0,
		ScrollBarThickness = 8,
		ScrollBarImageColor3 = Theme.Colors.Violet,
		AutomaticCanvasSize = Enum.AutomaticSize.Y,
		CanvasSize = UDim2.new(),
		ScrollingDirection = Enum.ScrollingDirection.Y,
		Parent = window.Content,
	}) :: ScrollingFrame
	Components.new("UIGridLayout", {
		CellSize = UDim2.fromOffset(200, 268),
		CellPadding = UDim2.fromOffset(12, 12),
		SortOrder = Enum.SortOrder.LayoutOrder,
		HorizontalAlignment = Enum.HorizontalAlignment.Center,
		Parent = scroller,
	})
	Components.new("UIPadding", { PaddingTop = UDim.new(0, 4), PaddingBottom = UDim.new(0, 12), Parent = scroller })

	local cards: { Card } = {}
	local built = false

	local function refresh()
		local data = DataController.get()
		if data == nil or not built then
			return
		end
		for _, card in cards do
			local rocket = card.Rocket
			local owned = data.OwnedRockets[rocket.Id] == true
			local equipped = data.EquippedRocket == rocket.Id
			local previous = Rockets.List[rocket.Order - 1]
			local unlocked = previous == nil or data.OwnedRockets[previous.Id] == true
			local balance = if rocket.Currency == "Gems" then data.Gems else data.Coins
			local icon = if rocket.Currency == "Gems" then "💎" else "💰"

			local estimate = Formulas.simulateFlight(Formulas.getFlightStats(rocket, data.Upgrades), false)
			card.Estimate.Text = "📏 Höhe ≈ " .. Format.altitude(estimate.MaxAltitudeMeters)
			card.Lock.Visible = not owned and not unlocked

			if equipped then
				card.Button.Text = "✓ Ausgerüstet"
				Components.setEnabled(card.Button, false)
			elseif owned then
				card.Button.Text = "Ausrüsten"
				Components.setEnabled(card.Button, true, Theme.Colors.Cyan)
			elseif not unlocked then
				card.Button.Text = "🔒 " .. icon .. " " .. Format.short(rocket.Price)
				Components.setEnabled(card.Button, false)
			else
				card.Button.Text = icon .. " " .. Format.short(rocket.Price)
				-- Auch ohne genug Geld klickbar: der Server sagt dann, wie viel noch fehlt
				Components.setEnabled(card.Button, true, if balance >= rocket.Price then Theme.Colors.GoldDark else Theme.Colors.Disabled)
			end
		end
	end

	local function onCardClick(rocket: Rockets.RocketDef)
		local data = DataController.get()
		if data == nil then
			return
		end
		local remote = if data.OwnedRockets[rocket.Id] then "EquipRocket" else "BuyRocket"
		local ok, response = pcall(function()
			return Remotes.func(remote):InvokeServer(rocket.Id)
		end)
		if ok and type(response) == "table" then
			if response.Ok then
				SoundController.play("Purchase")
				ctx.Notify(response.Message or "Erledigt", "Success")
			else
				ctx.Notify(response.Message or "Geht gerade nicht", "Error")
			end
		else
			ctx.Notify("Keine Verbindung zum Server", "Error")
		end
	end

	local function build()
		if built then
			return
		end
		built = true
		for _, rocket in Rockets.List do
			local typeInfo = Rockets.Types[rocket.Type]
			local card = Components.panel({
				Name = rocket.Id,
				LayoutOrder = rocket.Order,
				BackgroundColor3 = Theme.Colors.PanelLight,
				Parent = scroller,
			})
			buildPreview(card, rocket)

			local tag = Components.new("Frame", {
				Size = UDim2.fromOffset(92, 24),
				Position = UDim2.fromOffset(14, 14),
				BackgroundColor3 = if typeInfo then typeInfo.Color else Theme.Colors.Violet,
				Parent = card,
			})
			Components.corner(tag, 12)
			Components.label({
				Text = if typeInfo then typeInfo.Name else rocket.Type,
				Size = UDim2.fromScale(1, 1),
				TextSize = 15,
				TextColor3 = Color3.fromRGB(20, 20, 35),
				Parent = tag,
			})
			Components.label({
				Text = "#" .. rocket.Order,
				Size = UDim2.fromOffset(40, 24),
				Position = UDim2.new(1, -52, 0, 14),
				TextSize = 15,
				TextColor3 = Theme.Colors.TextDim,
				Parent = card,
			})
			Components.label({
				Text = rocket.Name,
				Size = UDim2.new(1, -16, 0, 28),
				Position = UDim2.fromOffset(8, 128),
				Font = Theme.Fonts.Title,
				TextSize = Theme.TextSize.Large - 2,
				Parent = card,
			})
			local estimate = Components.label({
				Text = "📏 Höhe ≈ …",
				Size = UDim2.new(1, -16, 0, 22),
				Position = UDim2.fromOffset(8, 158),
				TextSize = Theme.TextSize.Small - 2,
				TextColor3 = Theme.Colors.Cyan,
				Parent = card,
			})
			Components.label({
				Text = "💰 Belohnung " .. Format.multiplier(rocket.RewardMultiplier),
				Size = UDim2.new(1, -16, 0, 22),
				Position = UDim2.fromOffset(8, 180),
				TextSize = Theme.TextSize.Small - 2,
				TextColor3 = Theme.Colors.Coins,
				Parent = card,
			})
			local button = Components.button({
				Text = "…",
				Size = UDim2.new(1, -20, 0, 44),
				Position = UDim2.new(0, 10, 1, -54),
				TextSize = Theme.TextSize.Body - 1,
				Parent = card,
				OnClick = function()
					onCardClick(rocket)
				end,
			})
			local lock = Components.label({
				Text = "🔒",
				Size = UDim2.fromOffset(60, 60),
				Position = UDim2.fromOffset(70, 36),
				TextSize = 44,
				Visible = false,
				Parent = card,
			})
			table.insert(cards, { Rocket = rocket, Frame = card, Button = button, Estimate = estimate, Lock = lock })
		end
		refresh()
	end

	window.Opened.Event:Connect(function()
		build()
		refresh()
	end)
	DataController.Changed:Connect(function()
		if window.IsOpen() then
			refresh()
		end
	end)
end

return ShopPanel
