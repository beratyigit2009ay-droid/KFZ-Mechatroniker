--!strict
-- SettingsPanel.luau  (ModuleScript in StarterPlayerScripts.Client.UI)
-- Einstellungen: Lautstärke, Kamerawackeln, weniger Effekte. Werden auf dem Server gespeichert.

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Remotes = require(ReplicatedStorage:WaitForChild("Shared"):WaitForChild("Remotes"))
local Controllers = script.Parent.Parent:WaitForChild("Controllers")
local DataController = require(Controllers:WaitForChild("DataController"))
local Theme = require(script.Parent:WaitForChild("Theme"))
local Components = require(script.Parent:WaitForChild("Components"))
local Context = require(script.Parent:WaitForChild("Context"))

local SettingsPanel = {}

function SettingsPanel.mount(ctx: Context.Context)
	local window = Components.window(ctx.Root, "⚙️ Optionen", Vector2.new(560, 470))
	ctx.Windows.Settings = window
	local content = window.Content
	Components.list(content, Enum.FillDirection.Vertical, 12, Enum.HorizontalAlignment.Center).VerticalAlignment = Enum.VerticalAlignment.Top

	local function row(title: string, order: number): Frame
		local frame = Components.new("Frame", {
			Size = UDim2.new(1, 0, 0, 64),
			BackgroundColor3 = Theme.Colors.PanelLight,
			LayoutOrder = order,
			Parent = content,
		}) :: Frame
		Components.corner(frame, 12)
		Components.label({
			Text = title,
			Size = UDim2.new(0.5, 0, 1, 0),
			Position = UDim2.fromOffset(16, 0),
			TextXAlignment = Enum.TextXAlignment.Left,
			Parent = frame,
		})
		return frame
	end

	local function send(key: string, value: any)
		Remotes.event("UpdateSetting"):FireServer(key, value)
	end

	-- Lautstärke mit − / + (gut auf dem Handy bedienbar)
	local volumeRow = row("🔊 Effekt-Lautstärke", 1)
	local volumeLabel = Components.label({
		Text = "80 %",
		Size = UDim2.fromOffset(90, 64),
		Position = UDim2.new(1, -160, 0, 0),
		Font = Theme.Fonts.Title,
		TextColor3 = Theme.Colors.Cyan,
		Parent = volumeRow,
	})
	local function changeVolume(delta: number)
		local data = DataController.get()
		if data == nil then
			return
		end
		local value = math.clamp(math.floor((data.Settings.SfxVolume + delta) * 20 + 0.5) / 20, 0, 1)
		send("SfxVolume", value)
	end
	Components.button({ Text = "−", Size = UDim2.fromOffset(52, 48), Position = UDim2.new(1, -220, 0, 8), Parent = volumeRow, OnClick = function()
		changeVolume(-0.1)
	end })
	Components.button({ Text = "+", Size = UDim2.fromOffset(52, 48), Position = UDim2.new(1, -66, 0, 8), Parent = volumeRow, OnClick = function()
		changeVolume(0.1)
	end })

	local function toggleRow(title: string, key: string, order: number): TextButton
		local frame = row(title, order)
		local button = Components.button({
			Text = "AN",
			Size = UDim2.fromOffset(120, 48),
			Position = UDim2.new(1, -136, 0, 8),
			Parent = frame,
			OnClick = function()
				local data = DataController.get()
				if data then
					send(key, not (data.Settings :: any)[key])
				end
			end,
		})
		return button
	end
	local shakeButton = toggleRow("📳 Kamerawackeln", "CameraShake", 2)
	local effectsButton = toggleRow("✨ Weniger Effekte", "ReducedEffects", 3)

	local saveInfo = Components.label({
		Text = "",
		Size = UDim2.new(1, 0, 0, 60),
		TextSize = Theme.TextSize.Small,
		TextColor3 = Theme.Colors.TextDim,
		LayoutOrder = 4,
		Parent = content,
	})

	Components.button({
		Text = "Tutorial überspringen",
		Size = UDim2.fromOffset(260, 46),
		Color = Theme.Colors.PanelLight,
		LayoutOrder = 5,
		Parent = content,
		OnClick = function()
			Remotes.event("TutorialAdvance"):FireServer(3)
		end,
	})

	local function render()
		local data = DataController.get()
		if data == nil then
			return
		end
		volumeLabel.Text = math.floor(data.Settings.SfxVolume * 100 + 0.5) .. " %"
		shakeButton.Text = if data.Settings.CameraShake then "AN" else "AUS"
		Components.setEnabled(shakeButton, true, if data.Settings.CameraShake then Theme.Colors.Success else Theme.Colors.Disabled)
		effectsButton.Text = if data.Settings.ReducedEffects then "AN" else "AUS"
		Components.setEnabled(effectsButton, true, if data.Settings.ReducedEffects then Theme.Colors.Success else Theme.Colors.Disabled)
		saveInfo.Text = if data.SavingEnabled
			then "💾 Dein Fortschritt wird automatisch gespeichert."
			else "⚠️ Speichern ist gerade AUS. Dein Fortschritt in dieser Sitzung wird nicht gespeichert."
		saveInfo.TextColor3 = if data.SavingEnabled then Theme.Colors.TextDim else Theme.Colors.Danger
	end
	DataController.Changed:Connect(render)
	window.Opened.Event:Connect(render)
end

return SettingsPanel
