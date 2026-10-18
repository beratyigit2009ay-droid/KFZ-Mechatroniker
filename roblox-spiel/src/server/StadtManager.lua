-- StadtManager.lua
-- Verwaltet die 4 Städte: wer welche Stadt besitzt, Gebäude bauen, Schaden und Einkommen.

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Debris = game:GetService("Debris")
local RunService = game:GetService("RunService")
local TweenService = game:GetService("TweenService")

local Config = require(ReplicatedStorage.Shared.Config)
local Sirene = require(ReplicatedStorage.Shared.Sirene)
local Modelle = require(script.Parent.Modelle)
local Effekte = require(script.Parent.Effekte)
local Funk = require(script.Parent.Funk)

local StadtManager = {}

-- Liste aller Städte. Jede Stadt ist eine Tabelle (siehe StadtManager.erstellen)
local staedte = {}

-- Ordner in ReplicatedStorage, über den die Clients sehen, wem welche Stadt gehört
local spielstand: Folder

local FARBEN = Config.STADT_FARBEN
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
			farbe = FARBEN[i],
			besitzer = nil :: Player?,
			mitte = Vector3.new(mitte.X, teile.oben, mitte.Z),
			startPunkt = teile.startPunkt,
			spawn = teile.spawn,
			sireneTon = teile.sireneTon,
			sireneLicht = teile.sireneLicht,
			schild = teile.schild,
			gebaeudeOrdner = teile.gebaeudeOrdner,
			plaetze = plaetze,
			besteStufe = 1, -- höchste Stufe, die diese Stadt schon erreicht hat (für den Bonus)
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

-- Klebt ein Ausrüstungsteil fest an einen Körperteil
local function anbringen(koerperteil: BasePart, eigenschaften: { [string]: any }, versatz: CFrame): BasePart
	local teil = Modelle.teil(koerperteil.Parent, eigenschaften)
	teil.Anchored = false
	teil.CanCollide = false
	teil.CanQuery = false
	teil.Massless = true
	teil.CFrame = koerperteil.CFrame * versatz
	local schweissnaht = Instance.new("WeldConstraint")
	schweissnaht.Part0 = koerperteil
	schweissnaht.Part1 = teil
	schweissnaht.Parent = teil
	return teil
end

-- Spieler sehen anders aus als die Bewohner: Sie sind Kommandanten mit Helm,
-- Weste in der Farbe ihrer Stadt, einem leuchtenden Umriss und einem Namensschild.
local function alsKommandantAusruesten(charakter: Model, stadt, spieler: Player)
	local kopf = charakter:WaitForChild("Head", 5) :: BasePart?
	local oberkoerper = (charakter:FindFirstChild("UpperTorso") or charakter:FindFirstChild("Torso")) :: BasePart?
	if not kopf or not oberkoerper then
		return
	end

	-- Helm
	local helm = anbringen(kopf, {
		Name = "Helm",
		Size = Vector3.new(kopf.Size.X * 1.3, kopf.Size.Y * 0.75, kopf.Size.Z * 1.35),
		Color = Color3.fromRGB(75, 85, 50),
		Material = Enum.Material.Metal,
	}, CFrame.new(0, kopf.Size.Y * 0.35, 0.05))
	local helmForm = Instance.new("SpecialMesh")
	helmForm.MeshType = Enum.MeshType.Sphere
	helmForm.Parent = helm
	-- Streifen in Stadtfarbe am Helm
	anbringen(kopf, {
		Name = "Helmband",
		Size = Vector3.new(kopf.Size.X * 1.32, 0.2, kopf.Size.Z * 1.37),
		Color = stadt.farbe,
		Material = Enum.Material.Neon,
	}, CFrame.new(0, kopf.Size.Y * 0.2, 0.05))

	-- Weste in der Farbe der eigenen Stadt
	anbringen(oberkoerper, {
		Name = "Weste",
		Size = oberkoerper.Size + Vector3.new(0.2, -0.1, 0.25),
		Color = stadt.farbe,
		Material = Enum.Material.Fabric,
	}, CFrame.new())
	-- Rucksack
	anbringen(oberkoerper, {
		Name = "Rucksack",
		Size = Vector3.new(oberkoerper.Size.X * 0.7, oberkoerper.Size.Y * 0.8, 0.6),
		Color = Color3.fromRGB(70, 60, 40),
		Material = Enum.Material.Fabric,
	}, CFrame.new(0, 0, oberkoerper.Size.Z / 2 + 0.3))

	-- leuchtender Umriss in Stadtfarbe
	local umriss = Instance.new("Highlight")
	umriss.FillTransparency = 1
	umriss.OutlineColor = stadt.farbe
	umriss.DepthMode = Enum.HighlightDepthMode.Occluded
	umriss.Parent = charakter

	-- Namensschild über dem Kopf
	local schild = Instance.new("BillboardGui")
	schild.Name = "Rang"
	schild.Size = UDim2.new(0, 220, 0, 36)
	schild.StudsOffset = Vector3.new(0, 3.2, 0)
	schild.MaxDistance = 150
	schild.Parent = kopf
	local text = Instance.new("TextLabel")
	text.Size = UDim2.fromScale(1, 1)
	text.BackgroundTransparency = 1
	text.Font = Enum.Font.GothamBlack
	text.TextScaled = true
	text.TextColor3 = stadt.farbe
	text.TextStrokeTransparency = 0
	text.Text = "Kommandant " .. spieler.DisplayName
	text.Parent = schild
end

local function zurStadtTeleportieren(spieler: Player, charakter: Model)
	local stadt = StadtManager.stadtVon(spieler)
	if not stadt then
		return
	end
	charakter:WaitForChild("HumanoidRootPart")
	task.wait() -- kurz warten, sonst setzt Roblox den Spieler wieder auf den Spawn
	charakter:PivotTo(stadt.spawn + Vector3.new(0, 4, 0))
	alsKommandantAusruesten(charakter, stadt, spieler)
end

function StadtManager.spielerBeitreten(spieler: Player)
	-- Geld-Anzeige in der Spielerliste (oben rechts)
	local leaderstats = Instance.new("Folder")
	leaderstats.Name = "leaderstats"
	local geld = Instance.new("IntValue")
	geld.Name = "Geld"
	geld.Value = Config.STARTGELD
	geld.Parent = leaderstats
	-- Rangliste: wie viele gegnerische Gebäude der Spieler schon zerstört hat
	local zerstoert = Instance.new("IntValue")
	zerstoert.Name = "Zerstört"
	zerstoert.Parent = leaderstats
	leaderstats.Parent = spieler

	-- Waffen-Lager: z.B. Attribut "Lager_Kurzstrecke" = Anzahl
	for typ in pairs(Config.Raketen) do
		spieler:SetAttribute("Lager_" .. typ, 0)
	end
	for typ in pairs(Config.Einheiten) do
		spieler:SetAttribute("Lager_" .. typ, 0)
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
		StadtManager.aktualisieren(frei)
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
	stadt.besteStufe = 1
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

	-- Bewohner, die vor dem Haus stehen (1 Figur pro 5 Bewohner, höchstens 4)
	local anzahl = math.min(math.floor((info.Bewohner or 0) / 5), 4)
	for i = 1, anzahl do
		local x = (i - (anzahl + 1) / 2) * 2.2
		local pos = platz.pos + Vector3.new(x, 0, -8 - math.random() * 1.5)
		Modelle.bewohner(gebaeude, pos, math.rad(180 + math.random(-40, 40)))
	end

	gebaeude.Parent = stadt.gebaeudeOrdner
	platz.gebaeude = gebaeude
	StadtManager.aktualisieren(stadt)
	task.spawn(StadtManager.ausDemBodenWachsen, gebaeude, platz.pos)
	return true
end

-- Bau-Animation: Das Gebäude wächst mit einer Staubwolke aus dem Boden
-- und federt oben kurz nach. Dazu gibt es ein Bau-Geräusch.
function StadtManager.ausDemBodenWachsen(gebaeude: Model, pos: Vector3)
	local ziel = gebaeude:GetPivot()
	local hoehe = gebaeude:GetExtentsSize().Y + 1
	gebaeude:PivotTo(ziel - Vector3.new(0, hoehe, 0))

	Effekte.rauchwolke(pos, 25, 4, Color3.fromRGB(190, 170, 140))
	local ton = Instance.new("Sound")
	ton.SoundId = Config.Sounds.Bauen
	ton.Volume = 0.8
	ton.RollOffMaxDistance = 250
	ton.Parent = gebaeude.PrimaryPart or gebaeude:FindFirstChildWhichIsA("BasePart", true)
	ton:Play()
	Debris:AddItem(ton, 3)

	local DAUER = 0.9
	local beginn = os.clock()
	while gebaeude.Parent do
		local a = math.min((os.clock() - beginn) / DAUER, 1)
		local weich = TweenService:GetValue(a, Enum.EasingStyle.Back, Enum.EasingDirection.Out)
		gebaeude:PivotTo(ziel - Vector3.new(0, hoehe * (1 - weich), 0))
		if a >= 1 then
			break
		end
		RunService.Heartbeat:Wait()
	end
end

-- Alle Gebäude einer Stadt mit einer bestimmten Eigenschaft, z.B. "IstFlugabwehr"
function StadtManager.gebaeudeMit(stadt, eigenschaft: string): { Model }
	local liste = {}
	for _, platz in ipairs(stadt.plaetze) do
		local g = platz.gebaeude
		if g and Config.Gebaeude[g:GetAttribute("Typ")][eigenschaft] then
			table.insert(liste, g)
		end
	end
	return liste
end

-- Rechnet Bewohner, Strom und Einkommen einer Stadt aus
function StadtManager.werte(stadt)
	local bewohner, fabrikGeld = 0, 0
	local stromErzeugt, stromBedarf = Config.GRUNDSTROM, 0
	for _, platz in ipairs(stadt.plaetze) do
		if platz.gebaeude then
			local info = Config.Gebaeude[platz.gebaeude:GetAttribute("Typ")]
			bewohner += info.Bewohner or 0
			fabrikGeld += info.Einkommen or 0
			local strom = info.Strom or 0
			if strom > 0 then
				stromErzeugt += strom
			else
				stromBedarf -= strom
			end
		end
	end
	local stromausfall = stromBedarf > stromErzeugt
	local einkommen = Config.GRUNDEINKOMMEN + math.floor(bewohner * Config.STEUER_PRO_BEWOHNER) + fabrikGeld
	if stromausfall then
		einkommen = math.floor(einkommen / 2) -- Stromausfall: nur halbes Einkommen
	end
	return {
		bewohner = bewohner,
		stromErzeugt = stromErzeugt,
		stromBedarf = stromBedarf,
		stromausfall = stromausfall,
		einkommen = einkommen,
	}
end

-- Schreibt die Werte der Stadt an den Besitzer, damit seine Anzeige sie zeigen kann
function StadtManager.aktualisieren(stadt)
	local spieler = stadt.besitzer
	if not spieler then
		return
	end
	local w = StadtManager.werte(stadt)
	spieler:SetAttribute("Bewohner", w.bewohner)
	spieler:SetAttribute("StromErzeugt", w.stromErzeugt)
	spieler:SetAttribute("StromBedarf", w.stromBedarf)
	spieler:SetAttribute("Einkommen", w.einkommen)

	-- Wie viele Gebäude jeder Sorte stehen und wie viele Bauplätze noch frei sind
	local anzahl = {}
	local frei = 0
	for _, platz in ipairs(stadt.plaetze) do
		if platz.gebaeude then
			local typ = platz.gebaeude:GetAttribute("Typ")
			anzahl[typ] = (anzahl[typ] or 0) + 1
		else
			frei += 1
		end
	end
	for typ in pairs(Config.Gebaeude) do
		spieler:SetAttribute("Gebaut_" .. typ, anzahl[typ] or 0)
	end
	spieler:SetAttribute("BauplaetzeFrei", frei)
	spieler:SetAttribute("Bauplaetze", #stadt.plaetze)

	-- Stadt-Stufe: Dorf -> Kleinstadt -> ... Bei einer neuen Stufe gibt es einmal Bonus-Geld.
	local stufe = Config.stufeFuer(w.bewohner)
	spieler:SetAttribute("Stufe", stufe)
	if stufe > stadt.besteStufe then
		local bonus = 0
		for s = stadt.besteStufe + 1, stufe do
			bonus += Config.STUFEN[s].Bonus
		end
		stadt.besteStufe = stufe
		local geld = spieler:FindFirstChild("leaderstats") and spieler.leaderstats:FindFirstChild("Geld")
		if geld then
			geld.Value += bonus
		end
		Funk.stufe(spieler, stufe, bonus)
	end
end

-- Zahlt das Einkommen einer Stadt aus und zeigt dem Besitzer, woher das Geld kommt
function StadtManager.einkommenAuszahlen(stadt)
	local spieler = stadt.besitzer
	local geld = spieler and spieler:FindFirstChild("leaderstats") and spieler.leaderstats:FindFirstChild("Geld")
	if not geld then
		return
	end
	local w = StadtManager.werte(stadt)
	geld.Value += w.einkommen

	-- Für jedes Geld-Gebäude ein "+X $" über dem Dach, die Steuern über der Stadtmitte
	local teiler = if w.stromausfall then 2 else 1
	local liste = {}
	local gebaeudeGeld = 0
	for _, platz in ipairs(stadt.plaetze) do
		local g = platz.gebaeude
		local info = g and Config.Gebaeude[g:GetAttribute("Typ")]
		if g and info.Einkommen then
			local betrag = math.floor(info.Einkommen / teiler)
			gebaeudeGeld += betrag
			table.insert(liste, { pos = platz.pos + Vector3.new(0, g:GetExtentsSize().Y + 2, 0), betrag = betrag })
		end
	end
	table.insert(liste, { pos = stadt.mitte + Vector3.new(0, 8, -40), betrag = w.einkommen - gebaeudeGeld, steuern = true })
	Funk.einkommen(spieler, liste)
	StadtManager.aktualisieren(stadt)
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

-- Lebensbalken über einem beschädigten Gebäude (grün -> gelb -> rot)
local function lebensbalken(g: Model, leben: number, maxLeben: number)
	local teil = g.PrimaryPart
	if not teil then
		return
	end
	local schild = teil:FindFirstChild("Lebensbalken") :: BillboardGui?
	if not schild then
		local neu = Instance.new("BillboardGui")
		neu.Name = "Lebensbalken"
		neu.Size = UDim2.new(0, 90, 0, 12)
		neu.StudsOffsetWorldSpace = Vector3.new(0, teil.Size.Y / 2 + 4, 0)
		neu.MaxDistance = 250
		neu.AlwaysOnTop = true
		neu.Parent = teil
		local hinten = Instance.new("Frame")
		hinten.Size = UDim2.fromScale(1, 1)
		hinten.BackgroundColor3 = Color3.fromRGB(20, 20, 25)
		hinten.Parent = neu
		Instance.new("UICorner").Parent = hinten
		local balken = Instance.new("Frame")
		balken.Name = "Balken"
		balken.Size = UDim2.fromScale(1, 1)
		balken.Parent = hinten
		Instance.new("UICorner").Parent = balken
		schild = neu
	end
	local anteil = math.clamp(leben / maxLeben, 0, 1)
	local balken = (schild :: BillboardGui).Frame.Balken
	balken.Size = UDim2.fromScale(anteil, 1)
	balken.BackgroundColor3 = Color3.fromRGB(230, 60, 50):Lerp(Color3.fromRGB(70, 210, 90), anteil)
end

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

-- Gibt einem Spieler Geld und zeigt "+X $" an der Stelle pos (z. B. für einen Abschuss)
function StadtManager.geldGeben(spieler: Player?, betrag: number, pos: Vector3)
	local geld = spieler and spieler:FindFirstChild("leaderstats") and spieler.leaderstats:FindFirstChild("Geld")
	if not geld or betrag <= 0 then
		return
	end
	geld.Value += betrag
	Funk.beute(spieler, { { pos = pos, betrag = betrag } })
end

-- Belohnung für die Abwehr, wenn sie eine Waffe (Rakete, Jet, Panzer) abschießt
function StadtManager.abschussBelohnung(stadt, preis: number, pos: Vector3): number
	local betrag = math.floor(preis * Config.ABSCHUSS_ANTEIL)
	StadtManager.geldGeben(stadt.besitzer, betrag, pos)
	return betrag
end

-- Macht Schaden an allen Gebäuden im Radius um pos.
-- Gibt zurück: wie viele Gebäude zerstört wurden und wie viel Belohnung es gab.
function StadtManager.schaden(pos: Vector3, radius: number, menge: number, angreifer: Player?)
	local zerstoert, belohnung = 0, 0
	local beute = {} -- wo der Angreifer Geld bekommt (für die "+X $"-Anzeige)
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
							local betrag = math.floor(info.Preis * Config.BELOHNUNG_ANTEIL)
							belohnung += betrag
							table.insert(beute, { pos = platz.pos + Vector3.new(0, 6, 0), betrag = betrag })
							local rangliste = angreifer:FindFirstChild("leaderstats")
							local punkte = rangliste and rangliste:FindFirstChild("Zerstört") :: IntValue?
							if punkte then
								punkte.Value += 1
							end
						end
					else
						g:SetAttribute("Leben", leben)
						lebensbalken(g, leben, g:GetAttribute("MaxLeben"))
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

	for _, stadt in ipairs(staedte) do
		StadtManager.aktualisieren(stadt)
	end

	if angreifer and angreifer.Parent and belohnung > 0 then
		local geld = angreifer:FindFirstChild("leaderstats") and angreifer.leaderstats:FindFirstChild("Geld")
		if geld then
			geld.Value += belohnung
			Funk.beute(angreifer, beute)
		end
	end
	return zerstoert, belohnung
end

-- Lässt die Sirene in der Stadt heulen
function StadtManager.sireneAn(stadt, dauer: number)
	Sirene.starten(stadt.sireneTon, dauer, stadt.sireneLicht)
end

return StadtManager
