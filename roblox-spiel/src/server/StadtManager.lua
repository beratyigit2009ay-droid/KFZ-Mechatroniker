-- StadtManager.lua
-- Verwaltet die 4 Städte: wer welche Stadt besitzt, Gebäude bauen, Schaden und Einkommen.

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Debris = game:GetService("Debris")

local Config = require(ReplicatedStorage.Shared.Config)
local Sirene = require(ReplicatedStorage.Shared.Sirene)
local Modelle = require(script.Parent.Modelle)

local StadtManager = {}

-- Liste aller Städte. Jede Stadt ist eine Tabelle (siehe StadtManager.erstellen)
local staedte = {}

-- Ordner in ReplicatedStorage, über den die Clients sehen, wem welche Stadt gehört
local spielstand: Folder

local FARBEN = {
	Color3.fromRGB(210, 60, 60), -- rot
	Color3.fromRGB(60, 110, 220), -- blau
	Color3.fromRGB(70, 180, 80), -- grün
	Color3.fromRGB(235, 190, 40), -- gelb
}
-- Die 4 Städte liegen in den 4 Ecken der Karte
local RICHTUNGEN = {
	Vector3.new(-1, 0, -1),
	Vector3.new(1, 0, -1),
	Vector3.new(-1, 0, 1),
	Vector3.new(1, 0, 1),
}
-- Bauplätze in einer Stadt (relativ zur Mitte): 5 Spalten x 4 Reihen
local BAUPLATZ_X = { -40, -20, 0, 20, 40 }
local BAUPLATZ_Z = { -45, -25, -5, 15 }

function StadtManager.erstellen()
	spielstand = Instance.new("Folder")
	spielstand.Name = "Spielstand"
	spielstand.Parent = ReplicatedStorage

	local ordner = Instance.new("Folder")
	ordner.Name = "Staedte"
	ordner.Parent = workspace

	-- Falls es keinen Boden gibt (z.B. leere Vorlage), bauen wir einen
	if not workspace:FindFirstChild("Baseplate") then
		local boden = Modelle.teil(workspace, {
			Name = "Baseplate",
			Size = Vector3.new(800, 2, 800),
			CFrame = CFrame.new(0, -1, 0),
			Color = Color3.fromRGB(90, 140, 70),
			Material = Enum.Material.Grass,
		})
		boden.Locked = true
	end

	for i = 1, math.min(Config.MAX_STAEDTE, 4) do
		local mitte = RICHTUNGEN[i] * Config.STADT_ABSTAND + Vector3.new(0, 0.5, 0)
		local modell, teile = Modelle.stadt(i, mitte, FARBEN[i], Config.STADT_GROESSE)
		modell.Parent = ordner

		local plaetze = {}
		for _, z in ipairs(BAUPLATZ_Z) do
			for _, x in ipairs(BAUPLATZ_X) do
				table.insert(plaetze, {
					pos = Vector3.new(mitte.X + x, teile.oben, mitte.Z + z),
					gebaeude = nil,
				})
			end
		end

		staedte[i] = {
			index = i,
			name = "Stadt " .. i,
			modell = modell,
			besitzer = nil :: Player?,
			mitte = Vector3.new(mitte.X, teile.oben, mitte.Z),
			startPunkt = teile.startPunkt,
			spawn = teile.spawn,
			sireneTon = teile.sireneTon,
			sireneLicht = teile.sireneLicht,
			schild = teile.schild,
			gebaeudeOrdner = teile.gebaeudeOrdner,
			plaetze = plaetze,
		}
		spielstand:SetAttribute("Besitzer" .. i, "")
	end
end

function StadtManager.holeStadt(index: any)
	return staedte[index]
end

function StadtManager.alleStaedte()
	return staedte
end

-- Gibt die Stadt des Spielers zurück (oder nil, wenn er Zuschauer ist)
function StadtManager.stadtVon(spieler: Player)
	local stadt = staedte[spieler:GetAttribute("Stadt")]
	if stadt and stadt.besitzer == spieler then
		return stadt
	end
	return nil
end

------------------------------------------------------------------------
-- Spieler kommen und gehen
------------------------------------------------------------------------

local function zurStadtTeleportieren(spieler: Player, charakter: Model)
	local stadt = StadtManager.stadtVon(spieler)
	if not stadt then
		return
	end
	charakter:WaitForChild("HumanoidRootPart")
	task.wait() -- kurz warten, sonst setzt Roblox den Spieler wieder auf den Spawn
	charakter:PivotTo(stadt.spawn + Vector3.new(0, 4, 0))
end

function StadtManager.spielerBeitreten(spieler: Player)
	-- Geld-Anzeige in der Spielerliste (oben rechts)
	local leaderstats = Instance.new("Folder")
	leaderstats.Name = "leaderstats"
	local geld = Instance.new("IntValue")
	geld.Name = "Geld"
	geld.Value = Config.STARTGELD
	geld.Parent = leaderstats
	leaderstats.Parent = spieler

	-- Raketen-Lager: z.B. Attribut "Rakete_Kurzstrecke" = Anzahl
	for typ in pairs(Config.Raketen) do
		spieler:SetAttribute("Rakete_" .. typ, 0)
	end

	-- Freie Stadt suchen
	local frei = nil
	for _, stadt in ipairs(staedte) do
		if not stadt.besitzer then
			frei = stadt
			break
		end
	end

	if frei then
		frei.besitzer = spieler
		spieler:SetAttribute("Stadt", frei.index)
		spielstand:SetAttribute("Besitzer" .. frei.index, spieler.Name)
		frei.schild.Text = frei.name .. ": " .. spieler.Name
	else
		-- Alle 4 Städte sind vergeben: Spieler schaut nur zu
		spieler:SetAttribute("Stadt", 0)
	end

	spieler.CharacterAdded:Connect(function(charakter)
		zurStadtTeleportieren(spieler, charakter)
	end)
	if spieler.Character then
		task.spawn(zurStadtTeleportieren, spieler, spieler.Character)
	end
end

function StadtManager.spielerVerlassen(spieler: Player)
	local stadt = StadtManager.stadtVon(spieler)
	if not stadt then
		return
	end
	-- Stadt wieder freigeben und alle Gebäude abreißen
	for _, platz in ipairs(stadt.plaetze) do
		if platz.gebaeude then
			platz.gebaeude:Destroy()
			platz.gebaeude = nil
		end
	end
	stadt.besitzer = nil
	spielstand:SetAttribute("Besitzer" .. stadt.index, "")
	stadt.schild.Text = stadt.name .. " (frei)"
end

------------------------------------------------------------------------
-- Bauen
------------------------------------------------------------------------

-- Baut ein Gebäude auf einem zufälligen freien Bauplatz. Gibt true zurück, wenn es geklappt hat.
function StadtManager.bauen(stadt, typ: string): boolean
	local info = Config.Gebaeude[typ]
	local bauen = Modelle[typ]
	if not info or not bauen then
		return false
	end

	local freie = {}
	for _, platz in ipairs(stadt.plaetze) do
		if not platz.gebaeude then
			table.insert(freie, platz)
		end
	end
	if #freie == 0 then
		return false
	end

	local platz = freie[math.random(1, #freie)]
	local gebaeude: Model = bauen(platz.pos)
	gebaeude:SetAttribute("Typ", typ)
	gebaeude:SetAttribute("Leben", info.Leben)
	gebaeude:SetAttribute("MaxLeben", info.Leben)
	gebaeude.Parent = stadt.gebaeudeOrdner
	platz.gebaeude = gebaeude
	return true
end

-- Alle Flugabwehr-Stellungen einer Stadt
function StadtManager.abwehrIn(stadt): { Model }
	local liste = {}
	for _, platz in ipairs(stadt.plaetze) do
		local g = platz.gebaeude
		if g and Config.Gebaeude[g:GetAttribute("Typ")].IstAbwehr then
			table.insert(liste, g)
		end
	end
	return liste
end

-- Wie viel Geld die Stadt pro Runde verdient
function StadtManager.einkommen(stadt): number
	local summe = Config.GRUNDEINKOMMEN
	for _, platz in ipairs(stadt.plaetze) do
		if platz.gebaeude then
			summe += Config.Gebaeude[platz.gebaeude:GetAttribute("Typ")].Einkommen
		end
	end
	return summe
end

-- Sucht ein Ziel in der Stadt: ein zufälliges Gebäude oder eine zufällige Stelle
function StadtManager.zufallsZiel(stadt): Vector3
	local gebaeude = {}
	for _, platz in ipairs(stadt.plaetze) do
		if platz.gebaeude then
			table.insert(gebaeude, platz)
		end
	end
	if #gebaeude > 0 then
		return gebaeude[math.random(1, #gebaeude)].pos
	end
	return stadt.mitte + Vector3.new(math.random(-40, 40), 0, math.random(-40, 30))
end

------------------------------------------------------------------------
-- Schaden
------------------------------------------------------------------------

local function zerstoeren(platz)
	local gebaeude = platz.gebaeude
	platz.gebaeude = nil
	-- Teile lösen, damit das Gebäude auseinanderfällt
	for _, teil in ipairs(gebaeude:GetDescendants()) do
		if teil:IsA("BasePart") then
			teil.Anchored = false
			teil.CanCollide = true
			teil.Color = teil.Color:Lerp(Color3.new(0.1, 0.1, 0.1), 0.6)
			teil.AssemblyLinearVelocity = Vector3.new(math.random(-30, 30), math.random(20, 50), math.random(-30, 30))
		end
	end
	Debris:AddItem(gebaeude, 6)
end

-- Macht Schaden an allen Gebäuden im Radius um pos.
-- Gibt zurück: wie viele Gebäude zerstört wurden und wie viel Belohnung es gab.
function StadtManager.schaden(pos: Vector3, radius: number, menge: number, angreifer: Player?)
	local zerstoert, belohnung = 0, 0
	for _, stadt in ipairs(staedte) do
		for _, platz in ipairs(stadt.plaetze) do
			local g = platz.gebaeude
			if g then
				local abstand = (Vector3.new(platz.pos.X, 0, platz.pos.Z) - Vector3.new(pos.X, 0, pos.Z)).Magnitude
				if abstand <= radius then
					-- In der Mitte voller Schaden, am Rand nur noch halb so viel
					local echt = math.floor(menge * (1 - 0.5 * abstand / radius))
					local leben = g:GetAttribute("Leben") - echt
					local info = Config.Gebaeude[g:GetAttribute("Typ")]
					if leben <= 0 then
						zerstoeren(platz)
						zerstoert += 1
						if angreifer and angreifer ~= stadt.besitzer then
							belohnung += math.floor(info.Preis * Config.BELOHNUNG_ANTEIL)
						end
					else
						g:SetAttribute("Leben", leben)
						-- Beschädigte Gebäude brennen
						if leben < g:GetAttribute("MaxLeben") / 2 and g.PrimaryPart and not g.PrimaryPart:FindFirstChild("Brand") then
							local brand = Instance.new("Fire")
							brand.Name = "Brand"
							brand.Size = 8
							brand.Heat = 12
							brand.Parent = g.PrimaryPart
						end
					end
				end
			end
		end
	end

	if angreifer and angreifer.Parent and belohnung > 0 then
		local geld = angreifer:FindFirstChild("leaderstats") and angreifer.leaderstats:FindFirstChild("Geld")
		if geld then
			geld.Value += belohnung
		end
	end
	return zerstoert, belohnung
end

-- Lässt die Sirene in der Stadt heulen
function StadtManager.sireneAn(stadt, dauer: number)
	Sirene.starten(stadt.sireneTon, dauer, stadt.sireneLicht)
end

return StadtManager
