--!strict
-- Sounds.luau  (ModuleScript in ReplicatedStorage.Shared.Config)
-- Alle Sounds an einem Ort. Die "rbxasset://"-Dateien sind Sounds, die mit Roblox selbst mitgeliefert
-- werden (keine erfundenen Asset-IDs). Sie wurden NICHT in Studio angehört.
-- Ist ein Sound stumm oder gefällt er dir nicht: Im Studio-Toolbox einen Sound wählen, dessen ID
-- kopieren und hier z. B. Id = "rbxassetid://DEINE_ZAHL" eintragen. Leeres Id = Sound wird übersprungen.

export type SoundDef = { Id: string, Volume: number, PlaybackSpeed: number?, Looped: boolean? }

local Sounds: { [string]: SoundDef } = {
	Click = { Id = "rbxasset://sounds/button.wav", Volume = 0.5 },
	Hover = { Id = "", Volume = 0.2 },
	Purchase = { Id = "rbxasset://sounds/electronicpingshort.wav", Volume = 0.6 },
	Error = { Id = "rbxasset://sounds/clickfast.wav", Volume = 0.5 },
	Countdown = { Id = "rbxasset://sounds/electronicpingshort.wav", Volume = 0.5, PlaybackSpeed = 0.8 },
	Ignition = { Id = "rbxasset://sounds/Rocket whoosh 01.wav", Volume = 1, PlaybackSpeed = 0.55 },
	Launch = { Id = "rbxasset://sounds/Rocket shot.wav", Volume = 1 },
	Engine = { Id = "rbxasset://sounds/Rocket whoosh 01.wav", Volume = 0.6, Looped = true },
	Wind = { Id = "rbxasset://sounds/swoosh.wav", Volume = 0.3, Looped = true },
	Boost = { Id = "rbxasset://sounds/swoosh.wav", Volume = 0.8, PlaybackSpeed = 1.4 },
	Staging = { Id = "rbxasset://sounds/collide.wav", Volume = 0.9, PlaybackSpeed = 1.4 },
	MaxQ = { Id = "rbxasset://sounds/electronicpingshort.wav", Volume = 0.4, PlaybackSpeed = 0.6 },
	Space = { Id = "rbxasset://sounds/victory.wav", Volume = 0.5, PlaybackSpeed = 0.8 },
	Reentry = { Id = "rbxasset://sounds/Rocket whoosh 01.wav", Volume = 0.5, PlaybackSpeed = 0.4, Looped = true },
	Parachute = { Id = "rbxasset://sounds/swoosh.wav", Volume = 0.9, PlaybackSpeed = 0.6 },
	Apex = { Id = "rbxasset://sounds/collide.wav", Volume = 0.8 },
	Landing = { Id = "rbxasset://sounds/collide.wav", Volume = 0.6, PlaybackSpeed = 0.7 },
	Reward = { Id = "rbxasset://sounds/victory.wav", Volume = 0.6 },
	LevelUp = { Id = "rbxasset://sounds/victory.wav", Volume = 0.8, PlaybackSpeed = 1.2 },
	Ambient = { Id = "", Volume = 0.3, Looped = true }, -- Musik/Ambiente: eigene ID eintragen
}

return Sounds
