--!strict
-- UIController.luau  (ModuleScript in StarterPlayerScripts.Client.UI)
-- Baut die komplette Oberfläche und kümmert sich um:
--   • automatische Skalierung für PC, Tablet und Handy (Design-Größe 1100×620)
--   • Fenster-Verwaltung: immer nur ein Menü offen, Gamepad-Taste B schließt es
--   • ResetOnSpawn = false: die Oberfläche überlebt Respawns

local ContextActionService = game:GetService("ContextActionService")
local GuiService = game:GetService("GuiService")
local Players = game:GetService("Players")
local UserInputService = game:GetService("UserInputService")

local Theme = require(script.Parent:WaitForChild("Theme"))
local Components = require(script.Parent:WaitForChild("Components"))
local Context = require(script.Parent:WaitForChild("Context"))

local UIController = {}

local MODULES = { "Hud", "FlightHud", "ShopPanel", "UpgradePanel", "LeaderboardPanel", "SettingsPanel", "ResultWindow", "Tutorial" }

local function firstButton(container: Instance): GuiObject?
	for _, item in container:GetDescendants() do
		if item:IsA("GuiButton") and item.Visible and item.Name ~= "Close" then
			return item
		end
	end
	return nil
end

function UIController.init()
	local playerGui = Players.LocalPlayer:WaitForChild("PlayerGui")

	local gui = Components.new("ScreenGui", {
		Name = "RocketSimUI",
		ResetOnSpawn = false,
		IgnoreGuiInset = false,
		ZIndexBehavior = Enum.ZIndexBehavior.Sibling,
		ScreenInsets = Enum.ScreenInsets.CoreUISafeInsets,
		Parent = playerGui,
	}) :: ScreenGui

	-- Wurzel in Design-Pixeln. UIScale bringt sie auf die echte Bildschirmgröße.
	local root = Components.new("Frame", {
		Name = "Root",
		BackgroundTransparency = 1,
		Size = UDim2.fromOffset(Theme.DesignSize.X, Theme.DesignSize.Y),
		Parent = gui,
	}) :: Frame
	local scale = Components.new("UIScale", { Parent = root }) :: UIScale

	local function rescale()
		local screen = gui.AbsoluteSize
		if screen.X <= 0 or screen.Y <= 0 then
			return
		end
		local s = math.clamp(math.min(screen.X / Theme.DesignSize.X, screen.Y / Theme.DesignSize.Y), 0.5, 1.6)
		scale.Scale = s
		root.Size = UDim2.fromOffset(screen.X / s, screen.Y / s)
	end
	gui:GetPropertyChangedSignal("AbsoluteSize"):Connect(rescale)
	rescale()

	local windows: { [string]: Components.Window } = {}
	local openName: string? = nil

	local function closeWindows()
		for _, window in windows do
			window.Close()
		end
		openName = nil
		GuiService.SelectedObject = nil
		ContextActionService:UnbindAction("RocketSimCloseWindow")
	end

	local function openWindow(name: string)
		local window = windows[name]
		if window == nil then
			return
		end
		for otherName, other in windows do
			if otherName ~= name then
				other.Close()
			end
		end
		window.Open()
		openName = name
		-- Gamepad: Auswahl in das Fenster setzen und B zum Schließen belegen
		if UserInputService.GamepadEnabled then
			task.defer(function()
				GuiService.SelectedObject = firstButton(window.Frame)
			end)
		end
		ContextActionService:BindAction("RocketSimCloseWindow", function(_n: string, state: Enum.UserInputState)
			if state == Enum.UserInputState.Begin then
				closeWindows()
				return Enum.ContextActionResult.Sink
			end
			return Enum.ContextActionResult.Pass
		end, false, Enum.KeyCode.ButtonB)
	end

	local function toggleWindow(name: string)
		local window = windows[name]
		if window and window.IsOpen() then
			closeWindows()
		else
			openWindow(name)
		end
	end

	local ctx: Context.Context = {
		Gui = gui,
		Root = root,
		Scale = scale,
		Windows = windows,
		OpenWindow = openWindow,
		ToggleWindow = toggleWindow,
		CloseWindows = closeWindows,
		Notify = function() end,
		Anchors = {},
	}

	-- Meldungen zuerst, damit alle anderen Module ctx.Notify benutzen können
	local Notifications = require(script.Parent:WaitForChild("Notifications"))
	ctx.Notify = Notifications.mount(ctx)

	for _, moduleName in MODULES do
		local module = require(script.Parent:WaitForChild(moduleName)) :: any
		local ok, err = pcall(module.mount, ctx)
		if not ok then
			warn("[UI] " .. moduleName .. " konnte nicht geladen werden: " .. tostring(err))
		end
	end

	-- Fenster schließen sich auch über ihr eigenes X: Zustand mitführen
	for name, window in windows do
		window.Closed.Event:Connect(function()
			if openName == name then
				openName = nil
				ContextActionService:UnbindAction("RocketSimCloseWindow")
			end
		end)
	end
end

return UIController
