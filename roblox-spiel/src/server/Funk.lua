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
local einkommenEvent = neu("RemoteEvent", "Einkommen") :: RemoteEvent
local stufeEvent = neu("RemoteEvent", "Stufe") :: RemoteEvent
local beuteEvent = neu("RemoteEvent", "Beute") :: RemoteEvent

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

-- Zeigt dem Spieler, wo sein Geld herkommt: "+20 $" über jedem Gebäude, das Geld bringt.
-- liste: { { pos = Vector3, betrag = Zahl }, ... }
function Funk.einkommen(spieler: Player?, liste: { any })
	if spieler and spieler.Parent then
		einkommenEvent:FireClient(spieler, liste)
	end
end

-- Geld fürs Zerstören: großes "+X $" genau da, wo etwas kaputtgegangen ist
-- liste: { { pos = Vector3, betrag = Zahl }, ... }
function Funk.beute(spieler: Player?, liste: { any })
	if spieler and spieler.Parent and #liste > 0 then
		beuteEvent:FireClient(spieler, liste)
	end
end

-- Neue Stadt-Stufe erreicht: großes Banner beim Spieler
function Funk.stufe(spieler: Player?, stufe: number, bonus: number)
	if spieler and spieler.Parent then
		stufeEvent:FireClient(spieler, stufe, bonus)
	end
end

return Funk
