--!strict
-- RemoteGuard.luau  (ModuleScript in ServerScriptService.Server.Services)
-- Jede Anfrage vom Client läuft hier durch, bevor ein Service sie bearbeitet:
--   1. Rate-Limit (Spam wird still ignoriert)
--   2. Sind die Spielerdaten geladen?
--   3. Stimmen Anzahl und Typen der Argumente? (Texte max. 64 Zeichen, Zahlen endlich)
--   4. Handler läuft in pcall: ein Fehler bricht nie den Server, der Client bekommt eine harmlose Antwort
-- Lokale UI-Sperren auf dem Client sind nur Komfort; die echte Prüfung passiert hier und im Service.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Remotes = require(ReplicatedStorage:WaitForChild("Shared"):WaitForChild("Remotes"))
local RateLimiter = require(script.Parent:WaitForChild("RateLimiter"))
local PlayerDataService = require(script.Parent:WaitForChild("PlayerDataService"))

local RemoteGuard = {}

export type Options = {
	Rate: number, -- Anfragen pro Sekunde
	Burst: number?, -- kurzer Puffer (Standard: Rate)
	Args: { string }, -- erwartete Typen: "string", "number", "boolean", "any"
	RequireData: boolean?, -- Standard: true
}

export type Response = { Ok: boolean, Message: string? }

local MAX_STRING_LENGTH = 64
local limiters: { RateLimiter.RateLimiter } = {}

local function validArgs(expected: { string }, args: { any }): boolean
	for index, kind in expected do
		local value = args[index]
		if kind == "any" then
			continue
		end
		if type(value) ~= kind then
			return false
		end
		if kind == "string" and #value > MAX_STRING_LENGTH then
			return false
		end
		if kind == "number" and (value ~= value or value == math.huge or value == -math.huge) then
			return false
		end
	end
	return true
end

local function makeLimiter(options: Options): RateLimiter.RateLimiter
	local limiter = RateLimiter.new(options.Rate, options.Burst or math.max(options.Rate, 1))
	table.insert(limiters, limiter)
	return limiter
end

-- Für RemoteEvents (keine Antwort)
function RemoteGuard.onEvent(name: string, options: Options, handler: (Player, ...any) -> ...any)
	local limiter = makeLimiter(options)
	Remotes.event(name).OnServerEvent:Connect(function(player: Player, ...: any)
		if not limiter:allow(player) then
			return
		end
		if options.RequireData ~= false and not PlayerDataService.isLoaded(player) then
			return
		end
		local args = table.pack(...)
		if not validArgs(options.Args, args) then
			return
		end
		local ok, err = pcall(handler, player, table.unpack(args, 1, #options.Args))
		if not ok then
			warn(string.format("[RemoteGuard] Fehler in %s (%s): %s", name, player.Name, tostring(err)))
		end
	end)
end

-- Für RemoteFunctions (mit Antwort {Ok, Message, ...})
function RemoteGuard.onInvoke(name: string, options: Options, handler: (Player, ...any) -> any)
	local limiter = makeLimiter(options)
	Remotes.func(name).OnServerInvoke = function(player: Player, ...: any): any
		if not limiter:allow(player) then
			return { Ok = false, Message = "Nicht so schnell!" }
		end
		if options.RequireData ~= false and not PlayerDataService.isLoaded(player) then
			return { Ok = false, Message = "Deine Daten werden noch geladen …" }
		end
		local args = table.pack(...)
		if not validArgs(options.Args, args) then
			return { Ok = false, Message = "Ungültige Anfrage" }
		end
		local ok, result = pcall(handler, player, table.unpack(args, 1, #options.Args))
		if not ok then
			warn(string.format("[RemoteGuard] Fehler in %s (%s): %s", name, player.Name, tostring(result)))
			return { Ok = false, Message = "Etwas ist schiefgelaufen" }
		end
		return result
	end
end

function RemoteGuard.init()
	Players.PlayerRemoving:Connect(function(player)
		for _, limiter in limiters do
			limiter:remove(player)
		end
	end)
end

return RemoteGuard
