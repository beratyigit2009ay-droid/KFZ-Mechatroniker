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

	CeilingStuds = 60000, -- Rand des Spielbereichs: hier ist der Flug sicher zu Ende
	MaxFlightSeconds = 90, -- Notbremse, falls etwas hängt
	MaxRewardTolerance = 1.25, -- Server-Höhe darf höchstens 25 % über der Berechnung liegen

	TelemetryHz = 10, -- wie oft der Server Treibstoff/Boost an die Rakete schreibt
	WobbleDegrees = 1.5, -- leichtes Wackeln im Flug (nur Optik)

	CapsuleDropHeight = 160, -- Kapsel erscheint so hoch über der Rampe
	CapsuleTerminalSpeed = 28, -- Sinkgeschwindigkeit am Fallschirm
	CapsuleTimeout = 20, -- spätestens dann gilt sie als gelandet
	CapsuleSideOffset = 26, -- landet so weit neben der Rampe

	PadCount = 12, -- Anzahl Startrampen = maximale Spieler pro Server
}

return Flight
