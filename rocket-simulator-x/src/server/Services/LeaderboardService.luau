--!strict
-- LeaderboardService.luau  (ModuleScript in ServerScriptService.Server.Services)
-- Zwei Bestenlisten:
--   1. Server-Liste oben rechts (Roblox "leaderstats"): Rekordhöhe und Level jedes Spielers.
--   2. Globale Liste über alle Server (OrderedDataStore): Top 10 der höchsten Flüge.
--      Wird alle 2 Minuten neu geladen und auf der Tafel im Spiel und im Menü angezeigt.
-- Schreiben in den OrderedDataStore passiert gebündelt (max. 1× pro Minute pro Spieler).

local DataStoreService = game:GetService("DataStoreService")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Remotes = require(Shared:WaitForChild("Remotes"))
local Format = require(Shared:WaitForChild("Format"))
local PlayerDataService = require(script.Parent:WaitForChild("PlayerDataService"))
local MapService = require(script.Parent:WaitForChild("MapService"))

local LeaderboardService = {}

local STORE_NAME = "RocketSimX_BestAltitude_v1"
local SUBMIT_INTERVAL = 60
local REFRESH_INTERVAL = 120
local TOP_COUNT = 10

export type Entry = { Rank: number, UserId: number, Name: string, Altitude: number }

local orderedStore: OrderedDataStore? = nil
local pending: { [number]: number } = {} -- UserId -> Rekord, noch nicht hochgeladen
local submitted: { [number]: number } = {}
local nameCache: { [number]: string } = {}
local topList: { Entry } = {}

local function makeLeaderstats(player: Player)
	local stats = Instance.new("Folder")
	stats.Name = "leaderstats"
	local best = Instance.new("IntValue")
	best.Name = "Rekord (m)"
	best.Parent = stats
	local level = Instance.new("IntValue")
	level.Name = "Level"
	level.Parent = stats
	stats.Parent = player
end

local function updateLeaderstats(player: Player)
	local data = PlayerDataService.getData(player)
	local stats = player:FindFirstChild("leaderstats")
	if data == nil or stats == nil then
		return
	end
	local best = stats:FindFirstChild("Rekord (m)") :: IntValue?
	local level = stats:FindFirstChild("Level") :: IntValue?
	if best then
		best.Value = data.BestAltitude
	end
	if level then
		level.Value = data.Level
	end
	if data.BestAltitude > (submitted[player.UserId] or 0) then
		pending[player.UserId] = data.BestAltitude
	end
end

local function nameFor(userId: number): string
	local cached = nameCache[userId]
	if cached then
		return cached
	end
	local player = Players:GetPlayerByUserId(userId)
	if player then
		nameCache[userId] = player.DisplayName
		return player.DisplayName
	end
	local ok, name = pcall(function()
		return Players:GetNameFromUserIdAsync(userId)
	end)
	local result = if ok and type(name) == "string" then name else ("Spieler " .. userId)
	nameCache[userId] = result
	return result
end

local function renderBoard()
	local board = MapService.LeaderboardFace
	if board == nil then
		return
	end
	local display = board:FindFirstChild("Display")
	local content = display and display:FindFirstChild("Content")
	local list = content and content:FindFirstChild("List")
	if list == nil or not list:IsA("TextLabel") then
		return
	end
	if #topList == 0 then
		list.Text = if orderedStore then "Noch keine Flüge. Sei der Erste!" else "Bestenliste offline (Studio ohne API-Zugriff)"
		return
	end
	local lines = {}
	for _, entry in topList do
		table.insert(lines, string.format("%d.  %s  —  %s", entry.Rank, entry.Name, Format.altitude(entry.Altitude)))
	end
	list.Text = table.concat(lines, "\n")
end

local function submitPending()
	local activeStore = orderedStore
	if activeStore == nil then
		return
	end
	for userId, value in pending do
		if DataStoreService:GetRequestBudgetForRequestType(Enum.DataStoreRequestType.SetIncrementSortedAsync) < 2 then
			break -- Budget sparen, Rest beim nächsten Mal
		end
		pending[userId] = nil
		local ok, err = pcall(function()
			activeStore:SetAsync(tostring(userId), math.floor(value))
		end)
		if ok then
			submitted[userId] = value
		else
			pending[userId] = value
			warn("[Leaderboard] Hochladen fehlgeschlagen: " .. tostring(err))
		end
	end
end

local function refreshTop()
	local activeStore = orderedStore
	if activeStore == nil then
		renderBoard()
		return
	end
	if DataStoreService:GetRequestBudgetForRequestType(Enum.DataStoreRequestType.GetSortedAsync) < 1 then
		return
	end
	local ok, pages = pcall(function()
		return activeStore:GetSortedAsync(false, TOP_COUNT)
	end)
	if not ok then
		warn("[Leaderboard] Laden fehlgeschlagen: " .. tostring(pages))
		return
	end
	local entries: { Entry } = {}
	for rank, item in (pages :: DataStorePages):GetCurrentPage() do
		local userId = tonumber(item.key)
		if userId then
			table.insert(entries, {
				Rank = rank,
				UserId = userId,
				Name = nameFor(userId),
				Altitude = tonumber(item.value) or 0,
			})
		end
	end
	topList = entries
	renderBoard()
	Remotes.event("LeaderboardUpdate"):FireAllClients(topList)
end

function LeaderboardService.getTop(): { Entry }
	return topList
end

function LeaderboardService.init()
	local ok, result = pcall(function()
		return DataStoreService:GetOrderedDataStore(STORE_NAME)
	end)
	if ok then
		orderedStore = result
	else
		warn("[Leaderboard] OrderedDataStore nicht verfügbar: " .. tostring(result))
	end

	Players.PlayerAdded:Connect(makeLeaderstats)
	for _, player in Players:GetPlayers() do
		makeLeaderstats(player)
	end
	PlayerDataService.Loaded:Connect(function(player: Player)
		updateLeaderstats(player)
		Remotes.event("LeaderboardUpdate"):FireClient(player, topList)
	end)
	PlayerDataService.Changed:Connect(function(player: Player)
		updateLeaderstats(player)
	end)
	Players.PlayerRemoving:Connect(function(player)
		submitted[player.UserId] = nil
	end)

	task.spawn(function()
		refreshTop()
		local sinceRefresh = 0
		while true do
			task.wait(SUBMIT_INTERVAL)
			submitPending()
			sinceRefresh += SUBMIT_INTERVAL
			if sinceRefresh >= REFRESH_INTERVAL then
				sinceRefresh = 0
				refreshTop()
			end
		end
	end)

	game:BindToClose(function()
		submitPending()
	end)
end

return LeaderboardService
