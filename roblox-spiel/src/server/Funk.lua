-- Funk.lua
-- Die "Funkverbindung" zwischen Server und Spielern (Remotes).
-- Legt die Remotes in ReplicatedStorage an, damit die Clients sie finden.

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Funk = {}

local remotes = Instance.new("Folder")
remotes.Name = "Remotes"

local function neu(klasse: string, name: string)
	local r = Instance.new(klasse)
	r.Name = name
	r.Parent = remotes
	return r
end

Funk.kaufen = neu("RemoteFunction", "Kaufen") :: RemoteFunction -- Spieler kauft etwas
Funk.angriff = neu("RemoteFunction", "Angriff") :: RemoteFunction -- Spieler schickt Raketen/Panzer/Jets
local alarmEvent = neu("RemoteEvent", "Alarm") :: RemoteEvent
local nachrichtEvent = neu("RemoteEvent", "Nachricht") :: RemoteEvent

remotes.Parent = ReplicatedStorage

-- Kurze Nachricht unten am Bildschirm eines Spielers
function Funk.nachricht(spieler: Player?, text: string)
	if spieler and spieler.Parent then
		nachrichtEvent:FireClient(spieler, text)
	end
end

-- Alarm an alle: Die angegriffene Stadt sieht "textZiel" (rot + Sirene), alle anderen "textAndere" (gelb)
function Funk.alarm(zielIndex: number, textZiel: string, textAndere: string, dauer: number)
	alarmEvent:FireAllClients(zielIndex, textZiel, textAndere, dauer)
end

return Funk
