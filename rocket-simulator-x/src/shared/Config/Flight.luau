--!strict
-- Flight.luau  (ModuleScript in ReplicatedStorage.Shared.Config)
-- Konstanten für Start, Flugphysik und Landung.

local Flight = {
	MetersPerStud = 10, -- Anzeige: 1 Stud Höhe = 10 Meter
	DefaultGravity = 196.2, -- Roblox-Standard (Workspace.Gravity)

	CountdownSeconds = 3,
	CooldownSeconds = 2,

	BaseBoostTime = 1.5, -- Sekunden Boost ohne Upgrade
	BoostMultiplier = 1.6, -- Schub × 1.6 während des Boosts
	CoastBoostThrust = 0.6, -- Boost nach Brennschluss: 60 % des normalen Schubs

	-- Echte Atmosphäre: Die Luft wird nach oben exponentiell dünner (Dichte = e^(−Höhe / Skalenhöhe)).
	-- Auf der Erde ist die Skalenhöhe ≈ 8,5 km. Mit 10 m pro Stud sind das 850 Studs.
	ScaleHeightStuds = 850,
	-- Treibstoff ist schwer: 30 % der Startmasse verbrennen. Leere Rakete = mehr Beschleunigung pro Schub.
	FuelMassFraction = 0.3,
	-- Schwerkraft nimmt mit der Höhe ab: g × (R / (R + h))². Erdradius 6371 km = 637100 Studs.
	PlanetRadiusStuds = 637100,
	SpeedOfSound = 343, -- m/s (für die Mach-Anzeige)
	KarmanLineMeters = 100000, -- Grenze zum Weltall (Kármán-Linie)

	IgnitionLead = 1.2, -- so viele Sekunden vor dem Abheben zünden die Motoren (Rakete noch festgehalten)
	BoosterSeparation = 0.45, -- Booster fallen ab, wenn 45 % der Brenndauer vorbei sind
	BoosterDebrisLifetime = 7, -- so lange fallen abgeworfene Booster sichtbar nach unten

	CeilingStuds = 60000, -- Rand des Spielbereichs: hier ist der Flug sicher zu Ende
	MaxFlightSeconds = 90, -- Notbremse, falls etwas hängt
	MaxRewardTolerance = 1.25, -- Server-Höhe darf höchstens 25 % über der Berechnung liegen

	TelemetryHz = 10, -- wie oft der Server Treibstoff/Boost an die Rakete schreibt
	WobbleDegrees = 1.5, -- leichtes Wackeln im Flug (nur Optik)

	CapsuleDropHeight = 650, -- Kapsel tritt so hoch über der Rampe wieder ein (glüht, fällt schnell)
	CapsuleReentrySpeed = 150, -- Fallgeschwindigkeit beim Wiedereintritt (Hitzeschild voran)
	ParachuteHeight = 170, -- in dieser Höhe über dem Boden geht der Fallschirm auf
	CapsuleTerminalSpeed = 28, -- Sinkgeschwindigkeit am Fallschirm
	CapsuleTimeout = 30, -- spätestens dann gilt sie als gelandet
	CapsuleSideOffset = 26, -- landet so weit neben der Rampe

	PadCount = 8, -- Anzahl Startrampen = maximale Spieler pro Server
}

return Flight
