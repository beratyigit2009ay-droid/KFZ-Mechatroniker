--!strict
-- Components.luau  (ModuleScript in StarterPlayerScripts.Client.UI)
-- Wiederverwendbare UI-Bausteine. Alle Menüs werden aus diesen Teilen gebaut, damit alles gleich aussieht:
--   new, corner, stroke, gradient, padding, list  -> Grundwerkzeuge
--   label, panel, button, progressBar, window     -> fertige Bausteine

local TweenService = game:GetService("TweenService")

local Theme = require(script.Parent:WaitForChild("Theme"))
local SoundController = require(script.Parent.Parent:WaitForChild("Controllers"):WaitForChild("SoundController"))

local Components = {}

-- Erstellt eine Instanz mit Eigenschaften. Parent wird zuletzt gesetzt (schneller und sicherer).
function Components.new(className: string, props: { [string]: any }?, children: { Instance }?): any
	local instance = Instance.new(className) :: any
	local parent = nil
	if props then
		for key, value in props do
			if key == "Parent" then
				parent = value
			else
				instance[key] = value
			end
		end
	end
	if children then
		for _, child in children do
			child.Parent = instance
		end
	end
	if parent then
		instance.Parent = parent
	end
	return instance
end

function Components.corner(parent: Instance, radius: number?): UICorner
	return Components.new("UICorner", { CornerRadius = UDim.new(0, radius or Theme.Corner), Parent = parent })
end

function Components.stroke(parent: Instance, color: Color3?, thickness: number?, transparency: number?): UIStroke
	return Components.new("UIStroke", {
		Color = color or Theme.Colors.Stroke,
		Thickness = thickness or 2,
		Transparency = transparency or 0.2,
		ApplyStrokeMode = Enum.ApplyStrokeMode.Border,
		Parent = parent,
	})
end

function Components.gradient(parent: Instance, top: Color3, bottom: Color3, rotation: number?): UIGradient
	return Components.new("UIGradient", {
		Color = ColorSequence.new(top, bottom),
		Rotation = rotation or 90,
		Parent = parent,
	})
end

function Components.padding(parent: Instance, pixels: number): UIPadding
	local p = UDim.new(0, pixels)
	return Components.new("UIPadding", { PaddingTop = p, PaddingBottom = p, PaddingLeft = p, PaddingRight = p, Parent = parent })
end

function Components.list(parent: Instance, direction: Enum.FillDirection, spacing: number, align: Enum.HorizontalAlignment?): UIListLayout
	return Components.new("UIListLayout", {
		FillDirection = direction,
		Padding = UDim.new(0, spacing),
		SortOrder = Enum.SortOrder.LayoutOrder,
		HorizontalAlignment = align or Enum.HorizontalAlignment.Left,
		VerticalAlignment = Enum.VerticalAlignment.Center,
		Parent = parent,
	})
end

function Components.label(props: { [string]: any }): TextLabel
	local defaults: { [string]: any } = {
		BackgroundTransparency = 1,
		Font = Theme.Fonts.Bold,
		TextColor3 = Theme.Colors.Text,
		TextSize = Theme.TextSize.Body,
		TextWrapped = true,
		RichText = false,
	}
	for key, value in props do
		defaults[key] = value
	end
	return Components.new("TextLabel", defaults)
end

-- Abgerundetes Panel mit leichtem Verlauf und violettem Rand
function Components.panel(props: { [string]: any }): Frame
	local defaults: { [string]: any } = {
		BackgroundColor3 = Theme.Colors.Panel,
		BorderSizePixel = 0,
	}
	for key, value in props do
		defaults[key] = value
	end
	local frame = Components.new("Frame", defaults)
	Components.corner(frame)
	Components.stroke(frame)
	Components.gradient(frame, Color3.new(1, 1, 1), Color3.fromRGB(190, 195, 225))
	return frame
end

export type ButtonProps = {
	Text: string,
	Size: UDim2,
	Position: UDim2?,
	AnchorPoint: Vector2?,
	Color: Color3?,
	TextColor: Color3?,
	TextSize: number?,
	Font: Enum.Font?,
	LayoutOrder: number?,
	Parent: Instance?,
	OnClick: (() -> ())?,
	Name: string?,
}

-- Knopf mit Hover-, Klick- und Ton-Feedback. Gibt den TextButton zurück.
function Components.button(props: ButtonProps): TextButton
	local color = props.Color or Theme.Colors.Violet
	local button = Components.new("TextButton", {
		Name = props.Name or "Button",
		Text = props.Text,
		Size = props.Size,
		Position = props.Position or UDim2.new(),
		AnchorPoint = props.AnchorPoint or Vector2.zero,
		BackgroundColor3 = color,
		BorderSizePixel = 0,
		AutoButtonColor = false,
		Font = props.Font or Theme.Fonts.Bold,
		TextSize = props.TextSize or Theme.TextSize.Body,
		TextColor3 = props.TextColor or Theme.Colors.White,
		TextWrapped = true,
		LayoutOrder = props.LayoutOrder or 0,
		Selectable = true,
	}) :: TextButton
	Components.corner(button, 12)
	Components.gradient(button, Color3.new(1, 1, 1), Color3.fromRGB(175, 175, 200))
	local stroke = Components.stroke(button, Color3.new(1, 1, 1), 2, 0.75)
	local scale = Components.new("UIScale", { Name = "Scale", Parent = button }) :: UIScale

	button.MouseEnter:Connect(function()
		if button:GetAttribute("Disabled") then
			return
		end
		TweenService:Create(scale, Theme.Tween.Fast, { Scale = 1.05 }):Play()
		TweenService:Create(stroke, Theme.Tween.Fast, { Transparency = 0.3 }):Play()
	end)
	button.MouseLeave:Connect(function()
		TweenService:Create(scale, Theme.Tween.Fast, { Scale = 1 }):Play()
		TweenService:Create(stroke, Theme.Tween.Fast, { Transparency = 0.75 }):Play()
	end)
	button.SelectionGained:Connect(function()
		TweenService:Create(scale, Theme.Tween.Fast, { Scale = 1.06 }):Play()
	end)
	button.SelectionLost:Connect(function()
		TweenService:Create(scale, Theme.Tween.Fast, { Scale = 1 }):Play()
	end)
	button.Activated:Connect(function()
		if button:GetAttribute("Disabled") then
			SoundController.play("Error")
			return
		end
		scale.Scale = 0.92
		TweenService:Create(scale, Theme.Tween.Pop, { Scale = 1 }):Play()
		SoundController.play("Click")
		if props.OnClick then
			props.OnClick()
		end
	end)
	if props.Parent then
		button.Parent = props.Parent
	end
	return button
end

-- Knopf optisch und logisch sperren (der Server prüft trotzdem alles selbst)
function Components.setEnabled(button: GuiButton, enabled: boolean, color: Color3?)
	button:SetAttribute("Disabled", not enabled)
	local target = if enabled then (color or Theme.Colors.Violet) else Theme.Colors.Disabled
	TweenService:Create(button, Theme.Tween.Fast, { BackgroundColor3 = target }):Play()
end

export type ProgressBar = { Frame: Frame, Fill: Frame, Set: (value: number, animate: boolean?) -> () }

function Components.progressBar(props: { [string]: any }, fillTop: Color3, fillBottom: Color3): ProgressBar
	local defaults: { [string]: any } = {
		BackgroundColor3 = Theme.Colors.PanelDark,
		BorderSizePixel = 0,
	}
	for key, value in props do
		defaults[key] = value
	end
	local frame = Components.new("Frame", defaults) :: Frame
	Components.corner(frame, 8)
	Components.stroke(frame, Color3.new(1, 1, 1), 1, 0.85)
	local fill = Components.new("Frame", {
		Name = "Fill",
		Size = UDim2.fromScale(0, 1),
		BackgroundColor3 = Color3.new(1, 1, 1),
		BorderSizePixel = 0,
		Parent = frame,
	}) :: Frame
	Components.corner(fill, 8)
	Components.gradient(fill, fillTop, fillBottom, 0)

	local function set(value: number, animate: boolean?)
		local clamped = math.clamp(if value == value then value else 0, 0, 1)
		local goal = UDim2.fromScale(clamped, 1)
		if animate then
			TweenService:Create(fill, Theme.Tween.Normal, { Size = goal }):Play()
		else
			fill.Size = goal
		end
	end
	return { Frame = frame, Fill = fill, Set = set }
end

export type Window = {
	Frame: Frame,
	Content: Frame,
	Open: () -> (),
	Close: () -> (),
	IsOpen: () -> boolean,
	Opened: BindableEvent,
	Closed: BindableEvent,
}

-- Fenster mit Titelleiste und Schließen-Knopf (X). Öffnet mit kleiner "Pop"-Animation.
function Components.window(parent: Instance, title: string, size: Vector2): Window
	local frame = Components.panel({
		Name = "Window_" .. title,
		Size = UDim2.fromOffset(size.X, size.Y),
		Position = UDim2.fromScale(0.5, 0.5),
		AnchorPoint = Vector2.new(0.5, 0.5),
		Visible = false,
		ZIndex = 10,
		Parent = parent,
	})
	local scale = Components.new("UIScale", { Parent = frame }) :: UIScale

	local header = Components.new("Frame", {
		Name = "Header",
		Size = UDim2.new(1, 0, 0, 58),
		BackgroundColor3 = Theme.Colors.PanelLight,
		BorderSizePixel = 0,
		ZIndex = 11,
		Parent = frame,
	})
	Components.corner(header)
	Components.gradient(header, Theme.Colors.Violet, Theme.Colors.PanelLight, 0)
	Components.label({
		Text = title,
		Font = Theme.Fonts.Title,
		TextSize = Theme.TextSize.Title - 4,
		Size = UDim2.new(1, -80, 1, 0),
		Position = UDim2.fromOffset(20, 0),
		TextXAlignment = Enum.TextXAlignment.Left,
		ZIndex = 12,
		Parent = header,
	})

	local content = Components.new("Frame", {
		Name = "Content",
		Size = UDim2.new(1, -28, 1, -76),
		Position = UDim2.fromOffset(14, 66),
		BackgroundTransparency = 1,
		ZIndex = 11,
		Parent = frame,
	}) :: Frame

	local opened = Instance.new("BindableEvent")
	local closed = Instance.new("BindableEvent")
	local isOpen = false

	local function open()
		if isOpen then
			return
		end
		isOpen = true
		frame.Visible = true
		scale.Scale = 0.85
		TweenService:Create(scale, Theme.Tween.Pop, { Scale = 1 }):Play()
		opened:Fire()
	end
	local function close()
		if not isOpen then
			return
		end
		isOpen = false
		local tween = TweenService:Create(scale, Theme.Tween.Fast, { Scale = 0.9 })
		tween.Completed:Once(function()
			if not isOpen then
				frame.Visible = false
			end
		end)
		tween:Play()
		closed:Fire()
	end

	Components.button({
		Name = "Close",
		Text = "✕",
		Size = UDim2.fromOffset(44, 44),
		Position = UDim2.new(1, -52, 0, 7),
		Color = Theme.Colors.Danger,
		TextSize = Theme.TextSize.Large,
		Parent = header,
		OnClick = close,
	}).ZIndex = 12

	return {
		Frame = frame,
		Content = content,
		Open = open,
		Close = close,
		IsOpen = function()
			return isOpen
		end,
		Opened = opened,
		Closed = closed,
	}
end

return Components
