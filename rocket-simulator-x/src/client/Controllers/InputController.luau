--!strict
-- InputController.luau  (ModuleScript in StarterPlayerScripts.Client.Controllers)
-- Tastatur und Gamepad: F oder R2 = Starten (am Boden) bzw. Boost (im Flug).
-- Touch-Spieler benutzen den großen STARTEN-Knopf in der Oberfläche.

local ContextActionService = game:GetService("ContextActionService")

local FlightController = require(script.Parent:WaitForChild("FlightController"))

local InputController = {}

function InputController.init()
	ContextActionService:BindAction("RocketSimLaunch", function(_name: string, state: Enum.UserInputState, _input: InputObject)
		if state == Enum.UserInputState.Begin then
			FlightController.requestLaunchOrBoost()
			return Enum.ContextActionResult.Sink
		end
		return Enum.ContextActionResult.Pass
	end, false, Enum.KeyCode.F, Enum.KeyCode.ButtonR2)
end

return InputController
