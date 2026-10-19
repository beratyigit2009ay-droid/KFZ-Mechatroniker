--!strict
-- LeaderboardPanel.luau  (ModuleScript in StarterPlayerScripts.Client.UI)
-- Bestenliste mit zwei Reitern: "Global" (alle Server, vom Server alle 2 Minuten aktualisiert)
-- und "Dieser Server" (aus den leaderstats der Spieler hier).

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Format = require(ReplicatedStorage:WaitForChild("Shared"):WaitForChild("Format"))
local DataController = require(script.Parent.Parent:WaitForChild("Controllers"):WaitForChild("DataController"))
local Theme = require(script.Parent:WaitForChild("Theme"))
local Components = require(script.Parent:WaitForChild("Components"))
local Context = require(script.Parent:WaitForChild("Context"))

local LeaderboardPanel = {}

type Entry = { Rank: number, Name: string, Altitude: number, IsMe: boolean }

function LeaderboardPanel.mount(ctx: Context.Context)
	local window = Components.window(ctx.Root, "🏆 Rangliste", Vector2.new(600, 540))
	ctx.Windows.Leaderboard = window
	local content = window.Content
	local localPlayer = Players.LocalPlayer

	local tabs = Components.new("Frame", { Size = UDim2.new(1, 0, 0, 48), BackgroundTransparency = 1, Parent = content })
	Components.list(tabs, Enum.FillDirection.Horizontal, 10, Enum.HorizontalAlignment.Center)

	local list = Components.new("ScrollingFrame", {
		Size = UDim2.new(1, 0, 1, -60),
		Position = UDim2.fromOffset(0, 60),
		BackgroundTransparency = 1,
		BorderSizePixel = 0,
		ScrollBarThickness = 6,
		ScrollBarImageColor3 = Theme.Colors.Violet,
		AutomaticCanvasSize = Enum.AutomaticSize.Y,
		CanvasSize = UDim2.new(),
		Parent = content,
	}) :: ScrollingFrame
	Components.list(list, Enum.FillDirection.Vertical, 6, Enum.HorizontalAlignment.Center).VerticalAlignment = Enum.VerticalAlignment.Top

	local mode = "Global"
	local globalTab: TextButton
	local serverTab: TextButton

	local function render(entries: { Entry }, emptyText: string)
		for _, child in list:GetChildren() do
			if child:IsA("Frame") or child:IsA("TextLabel") then
				child:Destroy()
			end
		end
		if #entries == 0 then
			Components.label({ Text = emptyText, Size = UDim2.new(1, 0, 0, 60), TextColor3 = Theme.Colors.TextDim, Parent = list })
			return
		end
		for _, entry in entries do
			local medal = if entry.Rank == 1 then "🥇" elseif entry.Rank == 2 then "🥈" elseif entry.Rank == 3 then "🥉" else "#" .. entry.Rank
			local row = Components.new("Frame", {
				Size = UDim2.new(1, -12, 0, 46),
				BackgroundColor3 = if entry.IsMe then Theme.Colors.Violet else Theme.Colors.PanelLight,
				LayoutOrder = entry.Rank,
				Parent = list,
			})
			Components.corner(row, 10)
			Components.label({ Text = medal, Size = UDim2.fromOffset(60, 46), TextSize = 24, Parent = row })
			Components.label({
				Text = entry.Name,
				Size = UDim2.new(1, -230, 1, 0),
				Position = UDim2.fromOffset(64, 0),
				TextXAlignment = Enum.TextXAlignment.Left,
				TextTruncate = Enum.TextTruncate.AtEnd,
				TextWrapped = false,
				Parent = row,
			})
			Components.label({
				Text = Format.altitude(entry.Altitude),
				Size = UDim2.fromOffset(150, 46),
				Position = UDim2.new(1, -160, 0, 0),
				TextXAlignment = Enum.TextXAlignment.Right,
				Font = Theme.Fonts.Title,
				TextColor3 = Theme.Colors.Cyan,
				Parent = row,
			})
		end
	end

	local function refresh()
		Components.setEnabled(globalTab, true, if mode == "Global" then Theme.Colors.Violet else Theme.Colors.PanelLight)
		Components.setEnabled(serverTab, true, if mode == "Server" then Theme.Colors.Violet else Theme.Colors.PanelLight)
		if mode == "Global" then
			local entries: { Entry } = {}
			for _, item in DataController.getLeaderboard() do
				if type(item) == "table" then
					table.insert(entries, {
						Rank = tonumber(item.Rank) or 0,
						Name = tostring(item.Name),
						Altitude = tonumber(item.Altitude) or 0,
						IsMe = item.UserId == localPlayer.UserId,
					})
				end
			end
			render(entries, "Noch keine Einträge. Die globale Liste braucht im Studio den API-Zugriff.")
		else
			local entries: { Entry } = {}
			for _, other in Players:GetPlayers() do
				local stats = other:FindFirstChild("leaderstats")
				local best = stats and stats:FindFirstChild("Rekord (m)")
				table.insert(entries, {
					Rank = 0,
					Name = other.DisplayName,
					Altitude = if best and best:IsA("IntValue") then best.Value else 0,
					IsMe = other == localPlayer,
				})
			end
			table.sort(entries, function(a, b)
				return a.Altitude > b.Altitude
			end)
			for index, entry in entries do
				entry.Rank = index
			end
			render(entries, "Niemand da.")
		end
	end

	globalTab = Components.button({
		Text = "🌍 Global",
		Size = UDim2.fromOffset(200, 44),
		Parent = tabs,
		OnClick = function()
			mode = "Global"
			refresh()
		end,
	})
	serverTab = Components.button({
		Text = "🖥️ Dieser Server",
		Size = UDim2.fromOffset(200, 44),
		Parent = tabs,
		OnClick = function()
			mode = "Server"
			refresh()
		end,
	})

	window.Opened.Event:Connect(refresh)
	DataController.LeaderboardChanged:Connect(function()
		if window.IsOpen() then
			refresh()
		end
	end)
end

return LeaderboardPanel
