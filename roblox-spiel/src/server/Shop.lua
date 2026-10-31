-- Shop.lua
-- Kaufen von Gebäuden, Raketen, Panzern und Jets.
-- Wichtig: Der Server prüft alles selbst (Geld, Platz), damit niemand schummeln kann.

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Config = require(ReplicatedStorage.Shared.Config)
local StadtManager = require(script.Parent.StadtManager)

local Shop = {}

-- art: "Gebaeude" oder "Waffe", typ: z.B. "Haus", "Kurzstrecke" oder "Panzer"
-- Gibt zurück: hat es geklappt (true/false) und eine Nachricht für den Spieler
function Shop.kaufen(spieler: Player, art: any, typ: any): (boolean, string)
	if typeof(art) ~= "string" or typeof(typ) ~= "string" then
		return false, "Ungültiger Kauf."
	end

	local stadt = StadtManager.stadtVon(spieler)
	if not stadt then
		return false, "Du hast keine Stadt (der Server ist voll). Du kannst nur zuschauen."
	end

	local geld = spieler.leaderstats.Geld

	if art == "Gebaeude" then
		local info = Config.Gebaeude[typ]
		if not info then
			return false, "Dieses Gebäude gibt es nicht."
		end
		if geld.Value < info.Preis then
			return false, "Nicht genug Geld! " .. info.Name .. " kostet " .. info.Preis .. " $."
		end
		if not StadtManager.bauen(stadt, typ) then
			return false, "Deine Stadt ist voll! Kein freier Bauplatz mehr."
		end
		geld.Value -= info.Preis
		local w = StadtManager.werte(stadt)
		if w.stromausfall then
			return true, info.Name .. " gebaut! Achtung: Zu wenig Strom, bau ein Kraftwerk!"
		end
		return true, info.Name .. " gebaut!"
	elseif art == "Waffe" then
		local info = Config.waffe(typ)
		if not info then
			return false, "Diese Waffe gibt es nicht."
		end
		if geld.Value < info.Preis then
			return false, "Nicht genug Geld! " .. info.Name .. " kostet " .. info.Preis .. " $."
		end
		geld.Value -= info.Preis
		local attribut = "Lager_" .. typ
		spieler:SetAttribute(attribut, (spieler:GetAttribute(attribut) or 0) + 1)
		return true, info.Name .. " gekauft!"
	end

	return false, "Ungültiger Kauf."
end

return Shop
