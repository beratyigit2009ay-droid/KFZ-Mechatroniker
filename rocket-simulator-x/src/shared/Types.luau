--!strict
-- Types.luau  (ModuleScript in ReplicatedStorage.Shared)
-- So sehen die gespeicherten Spielerdaten aus. Der Server ist der Einzige, der sie ändert.

export type Settings = {
	SfxVolume: number, -- 0 bis 1
	CameraShake: boolean,
	ReducedEffects: boolean,
}

export type PlayerData = {
	Version: number,
	Coins: number,
	Gems: number,
	XP: number,
	Level: number,
	BestAltitude: number, -- Meter
	TotalLaunches: number,
	TotalCoinsEarned: number,
	EquippedRocket: string,
	OwnedRockets: { [string]: boolean },
	Upgrades: { [string]: number },
	UnlockedWorlds: { [string]: boolean },
	CurrentWorld: string,
	Rebirths: number,
	Pets: { any },
	EquippedPets: { any },
	Quests: { [string]: any },
	Achievements: { [string]: any },
	Daily: { LastClaim: number, Streak: number },
	Settings: Settings,
	Tutorial: { Step: number },
	Meta: {
		CreatedAt: number,
		LastSaved: number,
		SaveCount: number,
		Lock: { JobId: string, Time: number },
	},
}

-- Was der Client nach jeder Änderung bekommt (ohne interne Meta-Daten)
export type ClientData = {
	Coins: number,
	Gems: number,
	XP: number,
	XPNeeded: number,
	Level: number,
	BestAltitude: number,
	TotalLaunches: number,
	EquippedRocket: string,
	OwnedRockets: { [string]: boolean },
	Upgrades: { [string]: number },
	Settings: Settings,
	TutorialStep: number,
	SavingEnabled: boolean,
}

-- Nachrichten über FlightEvent (Server -> Client)
export type FlightEvent = {
	Type: string, -- "Countdown" | "Liftoff" | "Burnout" | "Boost" | "Apex" | "Landed" | "Cancelled"
	FlightId: number,
	[string]: any,
}

return {}
