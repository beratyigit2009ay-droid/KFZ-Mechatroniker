-- Main.server.lua
-- Startpunkt des Spiels auf dem Server. Verbindet alle Teile miteinander.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Config = require(ReplicatedStorage.Shared.Config)
local StadtManager = require(script.Parent.StadtManager)
local Shop = require(script.Parent.Shop)
local Raketen = require(script.Parent.Raketen)

-- 1) Remotes: darüber reden Client (Spieler-PC) und Server miteinander
local remotes = Instance.new("Folder")
remotes.Name = "Remotes"

local kaufen = Instance.new("RemoteFunction")
kaufen.Name = "Kaufen"
kaufen.Parent = remotes

local abschiessen = Instance.new("RemoteFunction")
abschiessen.Name = "Abschiessen"
abschiessen.Parent = remotes

local alarm = Instance.new("RemoteEvent")
alarm.Name = "Alarm"
alarm.Parent = remotes

local nachricht = Instance.new("RemoteEvent")
nachricht.Name = "Nachricht"
nachricht.Parent = remotes

remotes.Parent = ReplicatedStorage

-- 2) Die 4 Städte bauen
StadtManager.erstellen()
Raketen.init(alarm, nachricht)

-- 3) Was passiert, wenn ein Spieler etwas kauft oder schießt
kaufen.OnServerInvoke = function(spieler, art, typ)
	return Shop.kaufen(spieler, art, typ)
end

abschiessen.OnServerInvoke = function(spieler, typ, zielIndex)
	return Raketen.abschiessen(spieler, typ, zielIndex)
end

-- 4) Spieler kommen und gehen
Players.PlayerAdded:Connect(StadtManager.spielerBeitreten)
Players.PlayerRemoving:Connect(StadtManager.spielerVerlassen)
for _, spieler in ipairs(Players:GetPlayers()) do
	task.spawn(StadtManager.spielerBeitreten, spieler)
end

-- 5) Einkommen: alle paar Sekunden bekommt jede Stadt Geld
while true do
	task.wait(Config.EINKOMMEN_INTERVALL)
	for _, stadt in ipairs(StadtManager.alleStaedte()) do
		local spieler = stadt.besitzer
		local geld = spieler and spieler:FindFirstChild("leaderstats") and spieler.leaderstats:FindFirstChild("Geld")
		if geld then
			geld.Value += StadtManager.einkommen(stadt)
		end
	end
end
