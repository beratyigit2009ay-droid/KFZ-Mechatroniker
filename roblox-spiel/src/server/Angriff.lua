-- Angriff.lua
-- Wird aufgerufen, wenn ein Spieler auf "ANGRIFF!" drückt.
-- Prüft alles (Ziel, Anzahl, Lager) und schickt dann Raketen, Panzer oder Jets los.

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")

local Config = require(ReplicatedStorage.Shared.Config)
local StadtManager = require(script.Parent.StadtManager)
local Raketen = require(script.Parent.Raketen)
local Einheiten = require(script.Parent.Einheiten)
local Funk = require(script.Parent.Funk)

local Angriff = {}

local letzterAngriff: { [Player]: number } = {}
Players.PlayerRemoving:Connect(function(spieler)
	letzterAngriff[spieler] = nil
end)

-- Abstand in Sekunden zwischen zwei Raketen/Panzern/Jets derselben Welle
local ABSTAND = { Rakete = 0.9, Panzer = 0.4, Jet = 0.5 }

function Angriff.starten(spieler: Player, typName: any, zielIndex: any, anzahl: any): (boolean, string)
	local typ = if typeof(typName) == "string" then Config.waffe(typName) else nil
	if not typ then
		return false, "Diese Waffe gibt es nicht."
	end

	local start = StadtManager.stadtVon(spieler)
	if not start then
		return false, "Du hast keine Stadt, von der du angreifen kannst."
	end

	local ziel = if typeof(zielIndex) == "number" then StadtManager.holeStadt(zielIndex) else nil
	if not ziel or ziel == start then
		return false, "Wähle eine andere Stadt als Ziel."
	end

	if typeof(anzahl) ~= "number" or anzahl ~= anzahl then -- (anzahl ~= anzahl prüft auf "keine Zahl")
		return false, "Ungültige Anzahl."
	end
	anzahl = math.clamp(math.floor(anzahl), 1, Config.MAX_ANZAHL)

	local attribut = "Lager_" .. typName
	local imLager = spieler:GetAttribute(attribut) or 0
	if imLager < anzahl then
		if imLager == 0 then
			return false, "Du hast keine " .. typ.Name .. ". Kauf welche im Shop!"
		end
		return false, "Du hast nur " .. imLager .. "x " .. typ.Name .. " im Lager."
	end

	local jetzt = os.clock()
	if jetzt - (letzterAngriff[spieler] or 0) < Config.ANGRIFF_PAUSE then
		return false, "Deine Truppen machen sich noch bereit..."
	end
	letzterAngriff[spieler] = jetzt

	spieler:SetAttribute(attribut, imLager - anzahl)

	-- Welche Art von Waffe ist es?
	local art = if Config.Raketen[typName] then "Rakete" elseif typName == "Panzer" then "Panzer" else "Jet"
	local abstand = ABSTAND[art]

	-- Alarm und Sirene in der Zielstadt
	local dauer
	if art == "Rakete" then
		dauer = Raketen.alarmDauer(typ)
	else
		dauer = Einheiten.alarmDauer(typName, start, ziel)
	end
	-- Raketen starten gleichzeitig von allen Startplätzen (Startrampe + Rohre der Raketenwerfer).
	-- Sind es mehr Raketen als Plätze, startet die nächste Gruppe kurz danach.
	local startPunkte = if art == "Rakete" then StadtManager.startPunkte(start) else {}
	local gruppen = if art == "Rakete" then math.ceil(anzahl / #startPunkte) else anzahl
	dauer += (gruppen - 1) * abstand

	local wer = anzahl .. "x " .. typ.Name .. " von " .. spieler.Name
	local textZiel = if art == "Panzer" then "PANZER-ALARM! " .. wer .. "!" else "LUFTALARM! " .. wer .. "!"
	Funk.alarm(ziel.index, textZiel, spieler.Name .. " greift " .. ziel.name .. " an!", dauer)
	StadtManager.sireneAn(ziel, dauer + 1)

	-- Losschicken, eins nach dem anderen
	for nummer = 1, anzahl do
		local warten = (nummer - 1) * abstand
		local startPunkt = nil
		if art == "Rakete" then
			local platz = (nummer - 1) % #startPunkte + 1
			local gruppe = math.floor((nummer - 1) / #startPunkte)
			startPunkt = startPunkte[platz]
			warten = gruppe * abstand + (platz - 1) * 0.06 -- ganz leicht versetzt, wie eine echte Salve
		end
		task.delay(warten, function()
			if art == "Rakete" then
				Raketen.fliegen(spieler, typ, start, ziel, startPunkt)
			elseif art == "Panzer" then
				Einheiten.panzer(spieler, start, ziel, nummer, anzahl)
			else
				Einheiten.jet(spieler, start, ziel, nummer, anzahl)
			end
		end)
	end

	local verb = if art == "Rakete" then "abgefeuert" else "losgeschickt"
	return true, anzahl .. "x " .. typ.Name .. " " .. verb .. " auf " .. ziel.name .. "!"
end

return Angriff
