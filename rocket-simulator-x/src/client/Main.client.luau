--!strict
-- Main.client.luau  (LocalScript in StarterPlayer.StarterPlayerScripts.Client)
-- Startet alle Client-Systeme. Liegt in StarterPlayerScripts: läuft EINMAL pro Spieler
-- und überlebt Respawns (anders als StarterCharacterScripts).

local Controllers = script.Parent:WaitForChild("Controllers")
local UI = script.Parent:WaitForChild("UI")

local LoadingScreen = require(UI:WaitForChild("LoadingScreen"))
LoadingScreen.show()

local DataController = require(Controllers:WaitForChild("DataController"))
local SettingsController = require(Controllers:WaitForChild("SettingsController"))
local FlightController = require(Controllers:WaitForChild("FlightController"))
local SkyController = require(Controllers:WaitForChild("SkyController"))
local InputController = require(Controllers:WaitForChild("InputController"))
local PadController = require(Controllers:WaitForChild("PadController"))
local UIController = require(UI:WaitForChild("UIController"))

DataController.init()
SettingsController.init()
FlightController.init()
SkyController.init()
InputController.init()
PadController.init()
UIController.init()
