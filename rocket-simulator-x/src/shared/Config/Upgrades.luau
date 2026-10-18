--!strict
-- Upgrades.luau  (ModuleScript in ReplicatedStorage.Shared.Config)
-- Die vier Raketen-Upgrades. Sie gelten für JEDE Rakete, auch wenn du die Rakete wechselst.
--
--   Kosten für die nächste Stufe = BaseCost × Growth ^ (aktuelle Stufe)
--   EffectPerLevel: was eine Stufe bringt (siehe Beschreibung bei jedem Upgrade)

export type UpgradeDef = {
	Id: string,
	Order: number,
	Name: string,
	Icon: string,
	Description: string,
	Currency: string, -- "Coins" oder "Gems"
	BaseCost: number,
	Growth: number,
	MaxLevel: number,
	EffectPerLevel: number,
}

local Upgrades = {}

local list: { UpgradeDef } = {
	{
		-- Schub × (1 + 0.03 × Stufe)
		Id = "Engine", Order = 1, Name = "Motor", Icon = "🔥",
		Description = "Mehr Schub: die Rakete beschleunigt stärker.",
		Currency = "Coins", BaseCost = 40, Growth = 1.62, MaxLevel = 25, EffectPerLevel = 0.03,
	},
	{
		-- Brenndauer × (1 + 0.04 × Stufe)
		Id = "Fuel", Order = 2, Name = "Treibstofftank", Icon = "⛽",
		Description = "Größerer Tank: der Motor brennt länger.",
		Currency = "Coins", BaseCost = 50, Growth = 1.62, MaxLevel = 25, EffectPerLevel = 0.04,
	},
	{
		-- Luftwiderstand × (1 − 0.025) ^ Stufe
		Id = "Aero", Order = 3, Name = "Aerodynamik", Icon = "🪶",
		Description = "Weniger Luftwiderstand: höhere Höchstgeschwindigkeit.",
		Currency = "Coins", BaseCost = 60, Growth = 1.62, MaxLevel = 25, EffectPerLevel = 0.025,
	},
	{
		-- Boost-Dauer = Grunddauer + 0.25 s × Stufe
		Id = "Boost", Order = 4, Name = "Boost", Icon = "⚡",
		Description = "Längerer Boost während des Flugs (kostet Gems).",
		Currency = "Gems", BaseCost = 3, Growth = 1.22, MaxLevel = 20, EffectPerLevel = 0.25,
	},
}

Upgrades.List = list
Upgrades.ById = {} :: { [string]: UpgradeDef }
for _, upgrade in list do
	Upgrades.ById[upgrade.Id] = upgrade
end

return Upgrades
