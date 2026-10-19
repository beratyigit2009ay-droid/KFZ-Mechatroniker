--!strict
-- Context.luau  (ModuleScript in StarterPlayerScripts.Client.UI)
-- Was jedes UI-Modul vom UIController bekommt: die Wurzel der Oberfläche und Funktionen für Fenster/Meldungen.

local Components = require(script.Parent:WaitForChild("Components"))

export type Context = {
	Gui: ScreenGui,
	Root: Frame, -- skaliert auf Design-Größe 1100×620
	Scale: UIScale,
	Windows: { [string]: Components.Window },
	OpenWindow: (name: string) -> (),
	ToggleWindow: (name: string) -> (),
	CloseWindows: () -> (),
	Notify: (text: string, kind: string?) -> (),
	Anchors: { [string]: GuiObject }, -- wichtige Knöpfe, auf die das Tutorial zeigt
}

return {}
