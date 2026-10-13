-- Main.server.lua
-- Startpunkt des Spiels auf dem Server. Verbindet alle Teile miteinander.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Config = require(ReplicatedStorage.Shared.Config)
local Funk = require(script.Parent.Funk) -- legt die Remotes an
local StadtManager = require(script.Parent.StadtManager)
local Shop = require(script.Parent.Shop)
local Angriff = require(script.Parent.Angriff)

-- 1) Die 4 Städte bauen
StadtManager.erstellen()

-- 2) Was passiert, wenn ein Spieler etwas kauft oder angreift
Funk.kaufen.OnServerInvoke = function(spieler, art, typ)
	return Shop.kaufen(spieler, art, typ)
end

Funk.angriff.OnServerInvoke = function(spieler, typ, zielIndex, anzahl)
	return Angriff.starten(spieler, typ, zielIndex, anzahl)
end

-- 3) Spieler kommen und gehen
Players.PlayerAdded:Connect(StadtManager.spielerBeitreten)
Players.PlayerRemoving:Connect(StadtManager.spielerVerlassen)
for _, spieler in ipairs(Players:GetPlayers()) do
	task.spawn(StadtManager.spielerBeitreten, spieler)
end

-- 4) Einkommen: alle paar Sekunden bekommt jede Stadt Geld (Steuern der Bewohner + Fabriken)
while true do
	task.wait(Config.EINKOMMEN_INTERVALL)
	for _, stadt in ipairs(StadtManager.alleStaedte()) do
		local spieler = stadt.besitzer
		local geld = spieler and spieler:FindFirstChild("leaderstats") and spieler.leaderstats:FindFirstChild("Geld")
		if geld then
			local w = StadtManager.werte(stadt)
			geld.Value += w.einkommen
			StadtManager.aktualisieren(stadt)
		end
	end
end
