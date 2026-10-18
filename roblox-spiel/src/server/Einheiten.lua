-- Einheiten.lua
-- Panzer und Kampfjets.
--
-- Panzer: fahren über den Boden bis an den Rand der Zielstadt, schießen dort auf Gebäude
--         und fahren dann zurück. Die Panzerabwehr der Zielstadt schießt auf sie.
-- Jets:   fliegen über die Zielstadt, werfen Bomben ab und fliegen weiter.
--         Die Flugabwehr der Zielstadt kann sie abschießen.
-- Was überlebt, kommt zurück ins Lager des Spielers.

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local Debris = game:GetService("Debris")

local Config = require(ReplicatedStorage.Shared.Config)
local Modelle = require(script.Parent.Modelle)
local StadtManager = require(script.Parent.StadtManager)
local Effekte = require(script.Parent.Effekte)
local Funk = require(script.Parent.Funk)

local Einheiten = {}

local RAND_ABSTAND = 95 -- so weit von der Stadtmitte entfernt starten und halten die Panzer
local ABFANG_FLUGZEIT = 1

-- Richtung von Stadt A zu Stadt B (flach am Boden) und die Richtung zur Seite
local function richtungen(start, ziel): (Vector3, Vector3)
	local richtung = (ziel.mitte - start.mitte) * Vector3.new(1, 0, 1)
	richtung = richtung.Unit
	local seite = Vector3.yAxis:Cross(richtung).Unit
	return richtung, seite
end

-- Schickt eine Einheit zurück ins Lager
local function zurueckInsLager(spieler: Player, typName: string)
	if spieler.Parent then
		local attribut = "Lager_" .. typName
		spieler:SetAttribute(attribut, (spieler:GetAttribute(attribut) or 0) + 1)
	end
end

------------------------------------------------------------------------
-- PANZER
------------------------------------------------------------------------

-- nummer/anzahl: der wievielte Panzer in der Gruppe (damit sie nebeneinander fahren)
function Einheiten.panzer(spieler: Player, start, ziel, nummer: number, anzahl: number)
	local typ = Config.Einheiten.Panzer
	local richtung, seite = richtungen(start, ziel)
	local versatz = seite * ((nummer - (anzahl + 1) / 2) * 9)
	local flach = Vector3.new(1, 0, 1)
	local startPos = start.mitte * flach + richtung * RAND_ABSTAND + versatz
	local haltePos = ziel.mitte * flach - richtung * RAND_ABSTAND + versatz

	local panzer = Modelle.panzer(start.farbe)
	panzer:PivotTo(CFrame.lookAt(startPos, startPos + richtung))
	panzer.Parent = Effekte.ordner
	local staub = panzer:FindFirstChild("Staub", true) :: ParticleEmitter
	local motor = panzer.Wurzel.Motor :: Sound
	motor.SoundId = Config.Sounds.Flug
	motor:Play()

	local leben = typ.Leben

	-- Panzerabwehr der Zielstadt schießt, wenn der Panzer nah genug ist
	local function abwehrSchiesst(pos: Vector3)
		local info = Config.Gebaeude.Panzerabwehr
		for _, abwehr in ipairs(StadtManager.gebaeudeMit(ziel, "IstPanzerabwehr")) do
			local bereitAb = abwehr:GetAttribute("BereitAb") or 0
			if os.clock() >= bereitAb and (abwehr:GetPivot().Position - pos).Magnitude <= info.Reichweite then
				abwehr:SetAttribute("BereitAb", os.clock() + info.Nachladezeit)
				local rohr = abwehr:FindFirstChild("Rohr") :: BasePart?
				local von = if rohr then rohr.Position else abwehr:GetPivot().Position
				Effekte.schuss(von, pos + Vector3.new(0, 3, 0))
				Effekte.explosion(pos + Vector3.new(0, 3, 0), 4)
				leben -= info.Schaden
			end
		end
	end

	local function zerstoert(): boolean
		if leben > 0 then
			return false
		end
		local pos = panzer:GetPivot().Position
		Effekte.explosion(pos + Vector3.new(0, 3, 0), 12)
		Effekte.ausblenden(panzer)
		Funk.nachricht(spieler, "Einer deiner Panzer wurde vor " .. ziel.name .. " zerstört!")
		local betrag = StadtManager.abschussBelohnung(ziel, typ.Preis, pos)
		Funk.nachricht(ziel.besitzer, "Deine Panzerabwehr hat einen Panzer zerstört! +" .. betrag .. " $")
		return true
	end

	-- Fährt von a nach b. Gibt false zurück, wenn der Panzer unterwegs zerstört wurde.
	local function fahren(a: Vector3, b: Vector3): boolean
		local dauer = (b - a).Magnitude / typ.Tempo
		local blick = (b - a).Unit
		staub.Enabled = true
		local beginn = os.clock()
		while true do
			local t = math.min((os.clock() - beginn) / dauer, 1)
			local pos = a:Lerp(b, t)
			-- leichtes Wackeln, damit es nach Gelände aussieht
			local wackeln = CFrame.Angles(math.sin(os.clock() * 7) * 0.02, 0, math.sin(os.clock() * 5) * 0.02)
			panzer:PivotTo(CFrame.lookAt(pos, pos + blick) * wackeln)
			abwehrSchiesst(pos)
			if zerstoert() then
				return false
			end
			if t >= 1 then
				break
			end
			RunService.Heartbeat:Wait()
		end
		staub.Enabled = false
		return true
	end

	-- 1) Hinfahren
	if not fahren(startPos, haltePos) then
		return
	end

	-- 2) Schießen
	local rohr = panzer:FindFirstChild("Rohr") :: BasePart
	local muendung = rohr:FindFirstChild("Muendung") :: Attachment
	local zerstoertGesamt, belohnungGesamt = 0, 0
	for _ = 1, typ.Schuesse do
		local zielPunkt = StadtManager.zufallsZiel(ziel)
		Effekte.schuss(muendung.WorldPosition, zielPunkt + Vector3.new(0, 3, 0))
		Effekte.explosion(zielPunkt + Vector3.new(0, 2, 0), 8)
		local z, b = StadtManager.schaden(zielPunkt, 8, typ.Schaden, spieler)
		zerstoertGesamt += z
		belohnungGesamt += b

		-- während der Panzer nachlädt, kann die Abwehr schießen
		local warten = os.clock() + typ.Schussabstand
		while os.clock() < warten do
			abwehrSchiesst(panzer:GetPivot().Position)
			if zerstoert() then
				return
			end
			RunService.Heartbeat:Wait()
		end
	end
	if zerstoertGesamt > 0 then
		Funk.nachricht(spieler, "Panzer-Treffer! " .. zerstoertGesamt .. " Gebäude zerstört. +" .. belohnungGesamt .. " $")
	end

	-- 3) Zurückfahren und wieder ins Lager
	if not fahren(haltePos, startPos) then
		return
	end
	Effekte.ausblenden(panzer)
	zurueckInsLager(spieler, "Panzer")
end

------------------------------------------------------------------------
-- KAMPFJET
------------------------------------------------------------------------

-- Eine Bombe fällt vom Jet nach unten und explodiert am Boden
local function bombeFallen(spieler: Player, pos: Vector3, geschwindigkeit: Vector3, bodenHoehe: number)
	local typ = Config.Einheiten.Jet
	local bombe = Modelle.bombe()
	bombe.CFrame = CFrame.lookAt(pos, pos + geschwindigkeit) * CFrame.Angles(0, math.rad(90), 0)
	bombe.Parent = Effekte.ordner
	local tempo = geschwindigkeit
	while pos.Y > bodenHoehe do
		local dt = RunService.Heartbeat:Wait()
		tempo += Vector3.new(0, -workspace.Gravity * 0.5 * dt, 0)
		pos += tempo * dt
		bombe.CFrame = CFrame.lookAt(pos, pos + tempo) * CFrame.Angles(0, math.rad(90), 0)
	end
	pos = Vector3.new(pos.X, bodenHoehe, pos.Z)
	bombe:Destroy()
	Effekte.explosion(pos, typ.BombenRadius)
	Effekte.spielerSchaden(pos, typ.BombenRadius)
	return StadtManager.schaden(pos, typ.BombenRadius, typ.BombenSchaden, spieler)
end

function Einheiten.jet(spieler: Player, start, ziel, nummer: number, anzahl: number)
	local typ = Config.Einheiten.Jet
	local richtung, seite = richtungen(start, ziel)
	local versatz = seite * ((nummer - (anzahl + 1) / 2) * 14)
	local hoehe = Vector3.new(0, typ.Hoehe + nummer * 3, 0)
	local startPos = start.mitte + hoehe + versatz
	local mitte = ziel.mitte + hoehe + versatz
	local endPos = mitte + richtung * 300
	local strecke = (endPos - startPos).Magnitude
	local dauer = strecke / typ.Tempo
	local geschwindigkeit = richtung * typ.Tempo

	local jet = Modelle.jet(start.farbe)
	jet:PivotTo(CFrame.lookAt(startPos, endPos))
	jet.Parent = Effekte.ordner
	local ton = jet.Wurzel.Flug :: Sound
	ton.SoundId = Config.Sounds.Flug
	ton:Play()

	-- An diesen Stellen der Strecke (0 bis 1) fallen die Bomben: kurz vor, über und kurz nach der Stadtmitte
	local abwurf = {}
	-- Bomben fliegen beim Fallen noch ein Stück nach vorne, deshalb früher abwerfen
	local fallZeit = math.sqrt(2 * (mitte.Y - ziel.mitte.Y) / (workspace.Gravity * 0.5))
	local vorlauf = typ.Tempo * 0.6 * fallZeit
	local mitteAnteil = ((mitte - startPos).Magnitude - vorlauf) / strecke
	for i = 1, typ.Bomben do
		local verschiebung = (i - (typ.Bomben + 1) / 2) * 25 / strecke
		table.insert(abwurf, mitteAnteil + verschiebung)
	end
	local naechsteBombe = 1

	local abgeschossenUm: number? = nil
	local beginn = os.clock()
	local zerstoertGesamt, belohnungGesamt = 0, 0

	while true do
		local t = math.min((os.clock() - beginn) / dauer, 1)
		local pos = startPos:Lerp(endPos, t)
		-- leicht schaukeln
		jet:PivotTo(CFrame.lookAt(pos, pos + richtung) * CFrame.Angles(0, 0, math.sin(os.clock() * 2 + nummer) * 0.08))

		-- Bomben abwerfen
		if not abgeschossenUm and naechsteBombe <= #abwurf and t >= abwurf[naechsteBombe] then
			naechsteBombe += 1
			task.spawn(function()
				local z, b = bombeFallen(spieler, pos - Vector3.new(0, 2, 0), geschwindigkeit * 0.6, ziel.mitte.Y)
				zerstoertGesamt += z
				belohnungGesamt += b
			end)
		end

		-- Flugabwehr der Zielstadt
		if not abgeschossenUm then
			local info = Config.Gebaeude.Abwehr
			for _, abwehr in ipairs(StadtManager.gebaeudeMit(ziel, "IstFlugabwehr")) do
				local bereitAb = abwehr:GetAttribute("BereitAb") or 0
				if os.clock() >= bereitAb and (abwehr:GetPivot().Position - pos).Magnitude <= info.Reichweite then
					abwehr:SetAttribute("BereitAb", os.clock() + info.Nachladezeit)
					local spaeter = math.min(t + ABFANG_FLUGZEIT / dauer, 1)
					local trefferPunkt = startPos:Lerp(endPos, spaeter)
					local trifft = math.random() < info.Trefferchance
					task.spawn(Effekte.abfangrakete, abwehr, trefferPunkt, trifft, ABFANG_FLUGZEIT)
					if trifft then
						abgeschossenUm = os.clock() + ABFANG_FLUGZEIT
						break
					end
				end
			end
		end

		-- Abgeschossen: Explosion in der Luft, Wrack stürzt ab
		if abgeschossenUm and os.clock() >= abgeschossenUm then
			Effekte.explosion(pos, 14)
			Funk.nachricht(spieler, "Einer deiner Jets wurde über " .. ziel.name .. " abgeschossen!")
			local betrag = StadtManager.abschussBelohnung(ziel, typ.Preis, pos)
			Funk.nachricht(ziel.besitzer, "Deine Flugabwehr hat einen Jet abgeschossen! +" .. betrag .. " $")
			for _, teil in ipairs(jet:GetDescendants()) do
				if teil:IsA("BasePart") then
					teil.Anchored = false
					teil.CanCollide = true
					teil.Color = teil.Color:Lerp(Color3.new(0.1, 0.1, 0.1), 0.6)
					teil.AssemblyLinearVelocity = geschwindigkeit * 0.4 + Vector3.new(0, 10, 0)
				elseif teil:IsA("ParticleEmitter") or teil:IsA("Light") then
					teil.Enabled = false
				elseif teil:IsA("Sound") then
					teil:Stop()
				end
			end
			Debris:AddItem(jet, 6)
			return
		end

		if t >= 1 then
			break
		end
		RunService.Heartbeat:Wait()
	end

	Effekte.ausblenden(jet)
	if zerstoertGesamt > 0 then
		Funk.nachricht(spieler, "Bomben-Treffer! " .. zerstoertGesamt .. " Gebäude zerstört. +" .. belohnungGesamt .. " $")
	end
	zurueckInsLager(spieler, "Jet")
end

-- Ungefähre Dauer eines Angriffs (für die Sirene)
function Einheiten.alarmDauer(typName: string, start, ziel): number
	local abstand = ((ziel.mitte - start.mitte) * Vector3.new(1, 0, 1)).Magnitude
	if typName == "Panzer" then
		local typ = Config.Einheiten.Panzer
		return (abstand - 2 * RAND_ABSTAND) / typ.Tempo + typ.Schuesse * typ.Schussabstand
	end
	return abstand / Config.Einheiten.Jet.Tempo + 2
end

return Einheiten
