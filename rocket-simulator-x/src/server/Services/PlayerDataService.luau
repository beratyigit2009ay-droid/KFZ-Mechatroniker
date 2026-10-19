--!strict
-- PlayerDataService.luau  (ModuleScript in ServerScriptService.Server.Services)
-- Lädt und speichert die Spielerdaten sicher im DataStore.
--
-- Schutzmechanismen:
--   • UpdateAsync + Session-Sperre: zwei Server können dieselben Daten nicht gleichzeitig benutzen.
--   • Wiederholungen mit wachsender Pause bei Roblox-Störungen.
--   • Laden fehlgeschlagen -> Ersatzdaten, die NIE gespeichert werden (alte Daten bleiben heil).
--   • Speichern nur, wenn sich etwas geändert hat; Budget wird vorher geprüft.
--   • Autosave, Speichern beim Verlassen und beim Herunterfahren (BindToClose).

local DataStoreService = game:GetService("DataStoreService")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Signal = require(Shared:WaitForChild("Signal"))
local Remotes = require(Shared:WaitForChild("Remotes"))
local Types = require(Shared:WaitForChild("Types"))
local DataSchema = require(script.Parent:WaitForChild("DataSchema"))
local ServerLimitService = require(script.Parent:WaitForChild("ServerLimitService"))

local PlayerDataService = {}

local STORE_NAME = "RocketSimX_PlayerData_v1"
local AUTOSAVE_INTERVAL = 90 -- Sekunden
local LOCK_TIMEOUT = 300 -- eine Sperre, die älter ist, gilt als verwaist
local LOAD_ATTEMPTS = 5
local LOCK_WAIT = 6 -- Sekunden warten, wenn ein anderer Server die Daten noch hält
local LOCK_ATTEMPTS = 6

export type Profile = {
	Player: Player,
	Data: Types.PlayerData,
	SavingEnabled: boolean, -- false = Ersatzdaten, werden nie gespeichert
	Dirty: boolean,
	Saving: boolean,
	Released: boolean,
	LastSave: number,
}

local profiles: { [Player]: Profile } = {}
local pendingSync: { [Player]: boolean } = {}
local store: DataStore? = nil
local storeError: string? = nil
local jobId = if game.JobId ~= "" then game.JobId else ("studio-" .. tostring(math.random(1, 1e9)))
local isStudio = RunService:IsStudio()
local shuttingDown = false

PlayerDataService.Loaded = Signal.new() -- (player, profile)
PlayerDataService.Changed = Signal.new() -- (player, data)

local function keyFor(player: Player): string
	return "Player_" .. player.UserId
end

local function waitForBudget(requestType: Enum.DataStoreRequestType)
	local started = os.clock()
	while DataStoreService:GetRequestBudgetForRequestType(requestType) < 1 and os.clock() - started < 15 do
		task.wait(1)
	end
end

local function notify(player: Player, text: string, kind: string)
	Remotes.event("Notify"):FireClient(player, { Text = text, Kind = kind })
end

-- Versucht einmal, die Daten zu laden und die Sperre zu setzen.
-- Ergebnis: "ok" + Daten, "locked" oder "error" + Meldung
local function tryLoadOnce(player: Player): (string, Types.PlayerData?, string?)
	local activeStore = store
	if activeStore == nil then
		return "error", nil, storeError
	end
	local now = os.time()
	local outcome = "error"
	local migrateWarning: string? = nil
	local loaded: Types.PlayerData? = nil

	waitForBudget(Enum.DataStoreRequestType.UpdateAsync)
	local success, err = pcall(function()
		activeStore:UpdateAsync(keyFor(player), function(old: any)
			-- Wichtig: diese Funktion kann mehrmals laufen. Sie darf nur rechnen, nicht warten.
			outcome = "error"
			local data, warning = DataSchema.migrate(old, now)
			migrateWarning = warning
			if warning then
				-- Daten nicht verändern, wenn wir sie nicht verstehen
				outcome = "incompatible"
				loaded = data
				return nil
			end
			local lock = data.Meta.Lock
			local lockedByOther = lock.JobId ~= "" and lock.JobId ~= jobId and (now - lock.Time) < LOCK_TIMEOUT
			if lockedByOther and not isStudio then
				outcome = "locked"
				return nil -- abbrechen, nichts schreiben
			end
			data.Meta.Lock = { JobId = jobId, Time = now }
			outcome = "ok"
			loaded = data
			return data
		end)
	end)
	if not success then
		return "error", nil, tostring(err)
	end
	if outcome == "incompatible" then
		return "error", loaded, migrateWarning
	end
	if outcome == "ok" and loaded then
		return "ok", DataSchema.deepCopy(loaded), nil
	end
	return outcome, nil, nil
end

local function syncToClient(player: Player)
	if pendingSync[player] then
		return
	end
	pendingSync[player] = true
	-- Mehrere Änderungen im selben Moment werden zu einer Nachricht zusammengefasst
	task.defer(function()
		pendingSync[player] = nil
		local profile = profiles[player]
		if profile and player.Parent == Players then
			Remotes.event("DataUpdate"):FireClient(player, DataSchema.toClient(profile.Data, profile.SavingEnabled))
		end
	end)
end

local function save(profile: Profile, release: boolean): boolean
	if not profile.SavingEnabled or store == nil then
		return false
	end
	if profile.Released then
		return false
	end
	-- Läuft schon ein Speichervorgang, warten wir (max. 30 s) und speichern danach erneut
	local waited = 0
	while profile.Saving and waited < 30 do
		task.wait(0.5)
		waited += 0.5
	end
	if profile.Released then
		return false
	end
	profile.Saving = true
	profile.Dirty = false
	local snapshot = DataSchema.deepCopy(profile.Data)
	local activeStore = store :: DataStore
	local ok = false
	local lostLock = false

	for attempt = 1, 4 do
		waitForBudget(Enum.DataStoreRequestType.UpdateAsync)
		local now = os.time()
		local success, err = pcall(function()
			activeStore:UpdateAsync(keyFor(profile.Player), function(old: any)
				lostLock = false
				if type(old) == "table" and type(old.Meta) == "table" and type(old.Meta.Lock) == "table" then
					local lockJob = old.Meta.Lock.JobId
					if lockJob ~= "" and lockJob ~= jobId then
						-- Ein anderer Server hat die Daten übernommen: NICHT überschreiben
						lostLock = true
						return nil
					end
				end
				snapshot.Meta.LastSaved = now
				snapshot.Meta.SaveCount += 1
				snapshot.Meta.Lock = if release then { JobId = "", Time = 0 } else { JobId = jobId, Time = now }
				return snapshot
			end)
		end)
		if success then
			ok = not lostLock
			break
		end
		warn(string.format("[PlayerData] Speichern fehlgeschlagen für %s (Versuch %d): %s", profile.Player.Name, attempt, tostring(err)))
		task.wait(2 ^ attempt)
	end

	if ok then
		profile.Data.Meta.SaveCount = snapshot.Meta.SaveCount
		profile.Data.Meta.LastSaved = snapshot.Meta.LastSaved
		profile.LastSave = os.clock()
	else
		profile.Dirty = true -- später erneut versuchen
		if lostLock then
			warn("[PlayerData] Sperre verloren für " .. profile.Player.Name .. ", Speichern gestoppt")
			profile.SavingEnabled = false
		end
	end
	if release and ok then
		profile.Released = true
	end
	profile.Saving = false
	return ok
end

local function loadPlayer(player: Player)
	local data: Types.PlayerData? = nil
	local failureReason: string? = nil
	local lockAttempts = 0
	local attempt = 0

	while attempt < LOAD_ATTEMPTS do
		if player.Parent ~= Players then
			return
		end
		local outcome, result, message = tryLoadOnce(player)
		if outcome == "ok" then
			data = result
			break
		elseif outcome == "locked" then
			lockAttempts += 1
			if lockAttempts >= LOCK_ATTEMPTS then
				player:Kick("Deine Daten werden noch auf einem anderen Server gespeichert. Bitte tritt in einer Minute erneut bei.")
				return
			end
			task.wait(LOCK_WAIT)
		else
			attempt += 1
			failureReason = message
			if store == nil or result ~= nil then
				break -- kein DataStore oder inkompatible Daten: Wiederholen bringt nichts
			end
			task.wait(2 ^ attempt)
		end
	end

	if player.Parent ~= Players then
		-- Spieler ist während des Ladens gegangen: Sperre sofort wieder freigeben
		if data then
			local profile: Profile = {
				Player = player, Data = data, SavingEnabled = true, Dirty = false,
				Saving = false, Released = false, LastSave = os.clock(),
			}
			save(profile, true)
		end
		return
	end

	local savingEnabled = data ~= nil
	if data == nil then
		warn("[PlayerData] Laden fehlgeschlagen für " .. player.Name .. ": " .. tostring(failureReason))
		data = DataSchema.defaults(os.time())
	end

	local profile: Profile = {
		Player = player,
		Data = data :: Types.PlayerData,
		SavingEnabled = savingEnabled,
		Dirty = false,
		Saving = false,
		Released = false,
		LastSave = os.clock(),
	}
	profiles[player] = profile
	PlayerDataService.Loaded:Fire(player, profile)
	syncToClient(player)

	if not savingEnabled then
		local text = if isStudio and store == nil
			then "Speichern ist aus: In Studio unter Game Settings › Security \"Enable Studio Access to API Services\" einschalten."
			else "Deine Daten konnten nicht geladen werden. Du spielst mit einem Ersatz-Spielstand, der NICHT gespeichert wird. Bitte später neu beitreten."
		task.delay(2, notify, player, text, "Error")
	end
end

local function onPlayerRemoving(player: Player)
	local profile = profiles[player]
	if profile == nil then
		return
	end
	if profile.SavingEnabled then
		save(profile, true)
	end
	profiles[player] = nil
	pendingSync[player] = nil
end

-- ===== Öffentliche Funktionen =====

function PlayerDataService.getProfile(player: Player): Profile?
	return profiles[player]
end

-- Gibt die Daten nur zurück, wenn sie geladen sind
function PlayerDataService.getData(player: Player): Types.PlayerData?
	local profile = profiles[player]
	return if profile then profile.Data else nil
end

function PlayerDataService.isLoaded(player: Player): boolean
	return profiles[player] ~= nil
end

-- Nach JEDER Änderung an den Daten aufrufen: merkt sie zum Speichern vor und schickt sie an den Client
function PlayerDataService.markChanged(player: Player)
	local profile = profiles[player]
	if profile == nil then
		return
	end
	profile.Dirty = true
	syncToClient(player)
	PlayerDataService.Changed:Fire(player, profile.Data)
end

function PlayerDataService.toClient(player: Player): Types.ClientData?
	local profile = profiles[player]
	if profile == nil then
		return nil
	end
	return DataSchema.toClient(profile.Data, profile.SavingEnabled)
end

function PlayerDataService.init()
	local success, result = pcall(function()
		return DataStoreService:GetDataStore(STORE_NAME)
	end)
	if success then
		store = result
	else
		local message = tostring(result)
		storeError = message
		warn("[PlayerData] DataStore nicht verfügbar: " .. message)
	end

	Players.PlayerAdded:Connect(function(player)
		-- Server voll? Dann gar nicht erst laden (Spieler wird hinausgeschickt)
		if ServerLimitService.admit(player) then
			loadPlayer(player)
		end
	end)
	for _, player in Players:GetPlayers() do
		if ServerLimitService.admit(player) then
			task.defer(loadPlayer, player) -- erst nachdem alle Services gestartet sind
		end
	end
	Players.PlayerRemoving:Connect(onPlayerRemoving)

	-- Autosave: nur geänderte Profile, mit kleiner Pause zwischen den Spielern
	task.spawn(function()
		while not shuttingDown do
			task.wait(AUTOSAVE_INTERVAL)
			for _, profile in profiles do
				if profile.Dirty and profile.SavingEnabled and not shuttingDown then
					task.spawn(save, profile, false)
					task.wait(1)
				end
			end
		end
	end)

	-- Server fährt herunter: alle gleichzeitig speichern und warten (Roblox gibt max. 30 s)
	game:BindToClose(function()
		shuttingDown = true
		local remaining = 0
		for _, profile in profiles do
			if profile.SavingEnabled then
				remaining += 1
				task.spawn(function()
					save(profile, true)
					remaining -= 1
				end)
			end
		end
		local started = os.clock()
		while remaining > 0 and os.clock() - started < 25 do
			task.wait(0.25)
		end
	end)
end

return PlayerDataService
