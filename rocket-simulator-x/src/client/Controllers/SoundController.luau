--!strict
-- SoundController.luau  (ModuleScript in StarterPlayerScripts.Client.Controllers)
-- Spielt die Sounds aus Config/Sounds ab. Fehlt eine ID (leer), passiert einfach nichts.
-- Lautstärke = Wert aus der Config × Einstellung "Effekt-Lautstärke".

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local SoundService = game:GetService("SoundService")

local SoundConfig = require(ReplicatedStorage:WaitForChild("Shared"):WaitForChild("Config"):WaitForChild("Sounds"))

local SoundController = {}

local masterVolume = 0.8
local cache: { [string]: Sound } = {}
local loops: { [Sound]: number } = {} -- Loop-Sound -> Grundlautstärke

local folder = Instance.new("Folder")
folder.Name = "RocketSimSounds"
folder.Parent = SoundService

local function makeSound(name: string): Sound?
	local def = SoundConfig[name]
	if def == nil or def.Id == "" then
		return nil
	end
	local sound = Instance.new("Sound")
	sound.Name = name
	sound.SoundId = def.Id
	sound.Volume = def.Volume * masterVolume
	sound.PlaybackSpeed = def.PlaybackSpeed or 1
	sound.Looped = def.Looped == true
	sound.Parent = folder
	return sound
end

-- Kurzer Effekt-Sound (z. B. Klick, Kauf)
function SoundController.play(name: string, speed: number?)
	local sound = cache[name] :: Sound?
	if sound == nil then
		sound = makeSound(name)
		if sound == nil then
			return
		end
		cache[name] = sound
	end
	assert(sound, "unreachable")
	local def = SoundConfig[name]
	sound.Volume = def.Volume * masterVolume
	sound.PlaybackSpeed = speed or def.PlaybackSpeed or 1
	sound.TimePosition = 0
	sound:Play()
end

-- Dauer-Sound (z. B. Motor). Gibt den Sound zurück, damit man Tempo/Lautstärke ändern kann.
function SoundController.startLoop(name: string): Sound?
	local sound = makeSound(name)
	if sound == nil then
		return nil
	end
	sound.Looped = true
	loops[sound] = SoundConfig[name].Volume
	sound:Play()
	return sound
end

-- intensity 0..1 skaliert die Lautstärke des Loops
function SoundController.setLoopIntensity(sound: Sound?, intensity: number, speed: number?)
	if sound == nil then
		return
	end
	local base = loops[sound] or 0.5
	sound.Volume = base * masterVolume * math.clamp(intensity, 0, 1.5)
	if speed then
		sound.PlaybackSpeed = speed
	end
end

function SoundController.stopLoop(sound: Sound?)
	if sound == nil then
		return
	end
	loops[sound] = nil
	sound:Stop()
	sound:Destroy()
end

function SoundController.setMasterVolume(volume: number)
	masterVolume = math.clamp(volume, 0, 1)
	for name, sound in cache do
		sound.Volume = SoundConfig[name].Volume * masterVolume
	end
end

return SoundController
