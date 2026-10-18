-- Raketen.lua
-- Flug, Abfangen und Einschlag einer Rakete.
--
-- Ablauf einer Rakete:
--   1. Zündung auf der Startrampe (Feuer, Rauchwolke, Startgeräusch)
--   2. Senkrechter Start nach oben
--   3. Bogenflug zur Zielstadt (dabei kann die Flugabwehr der Zielstadt schießen)
--   4. Einschlag: Explosion, Lichtblitz, Rauch und Schaden

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

local Config = require(ReplicatedStorage.Shared.Config)
local Modelle = require(script.Parent.Modelle)
local StadtManager = require(script.Parent.StadtManager)
local Effekte = require(script.Parent.Effekte)
local Funk = require(script.Parent.Funk)

local Raketen = {}

Raketen.ZUENDUNG_ZEIT = 1.2 -- Sekunden auf der Rampe, bevor sie abhebt
Raketen.BOOST_ZEIT = 1.5 -- Sekunden senkrecht nach oben
local BOOST_HOEHE = 40
local ABFANG_FLUGZEIT = 1 -- so lange fliegt eine Abfangrakete

-- Punkt auf einer Bézier-Kurve (das ist eine schöne, weiche Flugbahn)
local function bezier(p0: Vector3, p1: Vector3, p2: Vector3, p3: Vector3, t: number): Vector3
	local u = 1 - t
	return p0 * (u * u * u) + p1 * (3 * u * u * t) + p2 * (3 * u * t * t) + p3 * (t * t * t)
end

-- Flugrichtung auf der Bézier-Kurve
local function bezierRichtung(p0: Vector3, p1: Vector3, p2: Vector3, p3: Vector3, t: number): Vector3
	local u = 1 - t
	return (p1 - p0) * (3 * u * u) + (p2 - p1) * (6 * u * t) + (p3 - p2) * (3 * t * t)
end

-- Startet eine Rakete von Stadt "start" auf Stadt "ziel". Läuft, bis die Rakete eingeschlagen ist.
-- startPunkt: wo sie abhebt (Startrampe der Stadt oder ein Rohr eines Raketenwerfers)
function Raketen.fliegen(spieler: Player, typ, start, ziel, startPunkt: Vector3?)
	local abschuss = startPunkt or start.startPunkt
	local zielPos = StadtManager.zufallsZiel(ziel)

	local rakete = Modelle.rakete(typ.Groesse, typ.Farbe)
	local startTon, flugTon = Effekte.toeneSetzen(rakete)
	local startPos = abschuss + Vector3.new(0, rakete:GetAttribute("Laenge") / 2, 0)
	rakete:PivotTo(Effekte.ausrichten(startPos, Vector3.yAxis))
	rakete.Parent = Effekte.ordner

	-- 1) Zündung
	Modelle.zuenden(rakete, true)
	startTon:Play()
	Effekte.rauchwolke(abschuss, 30, 5, Color3.fromRGB(220, 220, 220))
	task.wait(Raketen.ZUENDUNG_ZEIT)

	-- 2) Senkrechter Start (wird immer schneller)
	flugTon:Play()
	local beginn = os.clock()
	while true do
		local a = math.min((os.clock() - beginn) / Raketen.BOOST_ZEIT, 1)
		rakete:PivotTo(Effekte.ausrichten(startPos + Vector3.new(0, BOOST_HOEHE * a * a, 0), Vector3.yAxis))
		if a >= 1 then
			break
		end
		RunService.Heartbeat:Wait()
	end

	-- 3) Bogenflug: startet senkrecht nach oben und stürzt am Ende senkrecht nach unten
	local p0 = startPos + Vector3.new(0, BOOST_HOEHE, 0)
	local p1 = p0 + Vector3.new(0, typ.Hoehe, 0)
	local p2 = zielPos + Vector3.new(0, typ.Hoehe, 0)
	local p3 = zielPos

	-- roter Warnkreis am Einschlagsort, damit alle sehen, wo es gleich knallt
	local marker = Effekte.zielMarker(zielPos, typ.Radius, typ.Flugzeit)

	local abfangT: number? = nil -- Zeitpunkt, an dem die Rakete abgefangen wird
	local abfangPunkt: Vector3? = nil
	beginn = os.clock()

	while true do
		local t = math.min((os.clock() - beginn) / typ.Flugzeit, 1)
		local pos = bezier(p0, p1, p2, p3, t)
		rakete:PivotTo(Effekte.ausrichten(pos, bezierRichtung(p0, p1, p2, p3, t)))

		-- Flugabwehr der Zielstadt: schießt, wenn die Rakete im Sinkflug in Reichweite ist
		if not abfangT and t > 0.4 then
			local info = Config.Gebaeude.Abwehr
			for _, abwehr in ipairs(StadtManager.gebaeudeMit(ziel, "IstFlugabwehr")) do
				local bereitAb = abwehr:GetAttribute("BereitAb") or 0
				local abstand = (abwehr:GetPivot().Position - pos).Magnitude
				local tTreffer = t + ABFANG_FLUGZEIT / typ.Flugzeit
				if os.clock() >= bereitAb and abstand <= info.Reichweite and tTreffer < 0.95 then
					abwehr:SetAttribute("BereitAb", os.clock() + info.Nachladezeit)
					local trefferPunkt = bezier(p0, p1, p2, p3, tTreffer)
					-- Stärkere Raketen sind schwerer abzufangen
					local trifft = math.random() < info.Trefferchance * typ.Abfangbar
					task.spawn(Effekte.abfangrakete, abwehr, trefferPunkt, trifft, ABFANG_FLUGZEIT)
					if trifft then
						abfangT = tTreffer
						abfangPunkt = trefferPunkt
						break
					end
				end
			end
		end

		-- Abgefangen? Dann explodiert die Rakete in der Luft
		if abfangT and abfangPunkt and t >= abfangT then
			Effekte.ausblenden(rakete)
			marker:Destroy()
			Effekte.explosion(abfangPunkt, typ.Radius * 0.7)
			Funk.nachricht(spieler, "Deine " .. typ.Name .. " wurde über " .. ziel.name .. " abgefangen!")
			local betrag = StadtManager.abschussBelohnung(ziel, typ.Preis, abfangPunkt)
			Funk.nachricht(ziel.besitzer, "Deine Flugabwehr hat eine " .. typ.Name .. " abgefangen! +" .. betrag .. " $")
			return
		end

		if t >= 1 then
			break
		end
		RunService.Heartbeat:Wait()
	end

	-- 4) Einschlag
	Effekte.ausblenden(rakete)
	marker:Destroy()
	local zerstoert, belohnung
	if typ.Streu then
		zerstoert, belohnung = Raketen.streubomben(spieler, typ, zielPos)
	else
		Effekte.explosion(zielPos, typ.Radius)
		Effekte.spielerSchaden(zielPos, typ.Radius)
		zerstoert, belohnung = StadtManager.schaden(zielPos, typ.Radius, typ.Schaden, spieler)
	end
	if zerstoert > 0 then
		Funk.nachricht(spieler, "Treffer! " .. zerstoert .. " Gebäude zerstört. +" .. belohnung .. " $")
	else
		Funk.nachricht(spieler, "Einschlag in " .. ziel.name .. "!")
	end
end

-- Streu-Rakete: platzt kurz über dem Ziel und verteilt viele kleine Bomben,
-- die nacheinander rund um das Ziel einschlagen.
function Raketen.streubomben(spieler: Player, typ, zielPos: Vector3): (number, number)
	Effekte.explosion(zielPos + Vector3.new(0, 25, 0), 6) -- die Rakete platzt in der Luft
	local zerstoert, belohnung = 0, 0
	for i = 1, typ.Streu do
		local winkel = math.random() * math.pi * 2
		local weite = math.sqrt(math.random()) * typ.StreuRadius
		local pos = zielPos + Vector3.new(math.cos(winkel) * weite, 0, math.sin(winkel) * weite)
		task.wait(0.08 + math.random() * 0.12)
		Effekte.explosion(pos, typ.Radius)
		Effekte.spielerSchaden(pos, typ.Radius)
		local z, b = StadtManager.schaden(pos, typ.Radius, typ.Schaden, spieler)
		zerstoert += z
		belohnung += b
	end
	return zerstoert, belohnung
end

-- Wie lange der Alarm für eine Rakete dauern soll
function Raketen.alarmDauer(typ): number
	return Raketen.ZUENDUNG_ZEIT + Raketen.BOOST_ZEIT + typ.Flugzeit
end

return Raketen
