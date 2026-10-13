-- Shop.lua
-- Kaufen von Gebäuden, Flugabwehr und Raketen.
-- Wichtig: Der Server prüft alles selbst (Geld, Platz), damit niemand schummeln kann.

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Config = require(ReplicatedStorage.Shared.Config)
local StadtManager = require(script.Parent.StadtManager)

local Shop = {}

-- art: "Gebaeude" oder "Rakete", typ: z.B. "Haus" oder "Kurzstrecke"
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
		return true, info.Name .. " gebaut!"
	elseif art == "Rakete" then
		local info = Config.Raketen[typ]
		if not info then
			return false, "Diese Rakete gibt es nicht."
		end
		if geld.Value < info.Preis then
			return false, "Nicht genug Geld! " .. info.Name .. " kostet " .. info.Preis .. " $."
		end
		geld.Value -= info.Preis
		local attribut = "Rakete_" .. typ
		spieler:SetAttribute(attribut, (spieler:GetAttribute(attribut) or 0) + 1)
		return true, info.Name .. " gekauft!"
	end

	return false, "Ungültiger Kauf."
end

return Shop
