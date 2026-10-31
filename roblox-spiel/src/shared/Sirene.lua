-- Sirene.lua
-- Spielt eine Sirene auf einem Sound-Objekt ab.
-- Wird vom Server (Sirenenmast in der Stadt) und vom Client (Alarm im Kopfhörer) benutzt.

local Config = require(script.Parent.Config)

local Sirene = {}

-- Merkt sich, bis wann jede Sirene laufen soll
local laeuftBis: { [Sound]: number } = {}

-- sound: das Sound-Objekt, das abgespielt wird
-- dauer: wie viele Sekunden die Sirene heult
-- licht: (optional) ein Licht, das dabei blinkt
function Sirene.starten(sound: Sound, dauer: number, licht: Light?)
	local ende = os.clock() + dauer

	-- Läuft die Sirene schon? Dann einfach verlängern.
	if laeuftBis[sound] then
		laeuftBis[sound] = math.max(laeuftBis[sound], ende)
		return
	end
	laeuftBis[sound] = ende

	task.spawn(function()
		if Config.Sounds.Sirene ~= "" then
			-- Echte Sirene aus der Config
			sound.SoundId = Config.Sounds.Sirene
			sound.Looped = true
			sound.PlaybackSpeed = 1
			sound:Play()
			while os.clock() < laeuftBis[sound] do
				if licht then
					licht.Enabled = not licht.Enabled
				end
				task.wait(0.4)
			end
		else
			-- Ersatz-Sirene: hoher und tiefer Ton im Wechsel ("Tatü-Tata")
			sound.SoundId = Config.Sounds.Piep
			sound.Looped = false
			local hoch = true
			while os.clock() < laeuftBis[sound] do
				sound.PlaybackSpeed = if hoch then 1.25 else 0.9
				sound:Play()
				if licht then
					licht.Enabled = hoch
				end
				hoch = not hoch
				task.wait(0.45)
			end
		end

		sound:Stop()
		if licht then
			licht.Enabled = false
		end
		laeuftBis[sound] = nil
	end)
end

return Sirene
