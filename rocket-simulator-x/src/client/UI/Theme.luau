--!strict
-- Theme.luau  (ModuleScript in StarterPlayerScripts.Client.UI)
-- Einheitliche Designregeln für die ganze Oberfläche: Farben, Schriften, Größen, Animationen.
-- Weltraum-Look: Dunkelblau als Grund, Violett und Cyan als Akzente, Gold für Belohnungen.

local rgb = Color3.fromRGB

local Theme = {}

Theme.Colors = {
	Background = rgb(10, 14, 34),
	Panel = rgb(18, 24, 56),
	PanelLight = rgb(30, 38, 84),
	PanelDark = rgb(12, 16, 40),
	Stroke = rgb(110, 90, 230),
	Cyan = rgb(60, 220, 255),
	Violet = rgb(140, 90, 255),
	Gold = rgb(255, 200, 60),
	GoldDark = rgb(220, 140, 20),
	Text = rgb(238, 242, 255),
	TextDim = rgb(165, 175, 215),
	Success = rgb(80, 230, 140),
	Danger = rgb(255, 90, 110),
	Disabled = rgb(70, 76, 105),
	Coins = rgb(255, 205, 70),
	Gems = rgb(90, 230, 255),
	White = rgb(255, 255, 255),
}

Theme.Fonts = {
	Title = Enum.Font.FredokaOne,
	Bold = Enum.Font.GothamBold,
	Body = Enum.Font.GothamMedium,
}

-- Schriftgrößen in "Design-Pixeln" (die ganze Oberfläche wird für das Gerät skaliert)
Theme.TextSize = {
	Small = 18,
	Body = 21,
	Large = 26,
	Title = 34,
	Huge = 64,
}

Theme.Corner = 14
Theme.DesignSize = Vector2.new(1100, 620) -- danach richtet sich die automatische Skalierung

Theme.Tween = {
	Fast = TweenInfo.new(0.12, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
	Normal = TweenInfo.new(0.25, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
	Pop = TweenInfo.new(0.35, Enum.EasingStyle.Back, Enum.EasingDirection.Out),
	Slow = TweenInfo.new(0.6, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
}

-- Farbe für Meldungen
Theme.NotifyColors = {
	Info = rgb(60, 220, 255),
	Success = rgb(80, 230, 140),
	Error = rgb(255, 90, 110),
	Reward = rgb(255, 200, 60),
	LevelUp = rgb(170, 120, 255),
} :: { [string]: Color3 }

return Theme
