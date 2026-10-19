--!strict
-- Notifier.luau  (ModuleScript in ServerScriptService.Server.Services)
-- Schickt kurze Meldungen an einen Spieler. Kind bestimmt die Farbe:
-- "Info", "Success", "Error", "Reward", "LevelUp"

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Remotes = require(ReplicatedStorage:WaitForChild("Shared"):WaitForChild("Remotes"))

local Notifier = {}

function Notifier.send(player: Player, text: string, kind: string?)
	Remotes.event("Notify"):FireClient(player, { Text = text, Kind = kind or "Info" })
end

return Notifier
