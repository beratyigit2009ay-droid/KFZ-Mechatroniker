--!strict
-- PadService.luau  (ModuleScript in ServerScriptService.Server.Services)
-- Verwaltet die Startrampen:
--   • baut die Rampen-Modelle (Plattform, Leuchtring, Turm mit Halte-Armen, Schild, ProximityPrompt)
--   • gibt jedem Spieler beim Beitreten eine freie Rampe und gibt sie beim Verlassen wieder frei
--   • stellt die ausgerüstete Rakete des Spielers auf seine Rampe (für alle sichtbar)
--   • setzt den Spieler beim Spawnen neben seine Rampe

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")
local Workspace = game:GetService("Workspace")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Rockets = require(Shared:WaitForChild("Config"):WaitForChild("Rockets"))
local RocketBuilder = require(Shared:WaitForChild("RocketBuilder"))
local Signal = require(Shared:WaitForChild("Signal"))
local MapService = require(script.Parent:WaitForChild("MapService"))
local PlayerDataService = require(script.Parent:WaitForChild("PlayerDataService"))
local Notifier = require(script.Parent:WaitForChild("Notifier"))

local PadService = {}

PadService.PadTopHeight = 1.5
PadService.PromptTriggered = Signal.new() -- (player)

export type Pad = {
	Index: number,
	Model: Model,
	TopCFrame: CFrame, -- Mitte der Plattform-Oberfläche, LookVector zeigt zur Platzmitte
	Owner: Player?,
	Display: Model?,
	ArmPivots: { { Part: BasePart, Closed: CFrame, Open: CFrame } },
	Sign: TextLabel,
	SubSign: TextLabel,
}

local pads: { Pad } = {}
local padOf: { [Player]: Pad } = {}
local waiting: { Player } = {}

local PAD_COLORS = {
	Color3.fromRGB(60, 220, 255),
	Color3.fromRGB(150, 100, 255),
	Color3.fromRGB(255, 200, 60),
}

local UPRIGHT = CFrame.Angles(0, 0, math.rad(90))

local function newPart(parent: Instance, props: { [string]: any }): Part
	local p = Instance.new("Part")
	p.Anchored = true
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	for key, value in props do
		(p :: any)[key] = value
	end
	p.Parent = parent
	return p
end

local function buildPad(index: number, baseCFrame: CFrame): Pad
	local model = Instance.new("Model")
	model.Name = "Pad" .. index
	local accent = PAD_COLORS[(index - 1) % #PAD_COLORS + 1]
	local top = PadService.PadTopHeight

	local base = newPart(model, {
		Name = "Base", Shape = Enum.PartType.Cylinder, Size = Vector3.new(top, 22, 22),
		CFrame = baseCFrame * CFrame.new(0, top / 2, 0) * UPRIGHT,
		Color = Color3.fromRGB(58, 62, 80), Material = Enum.Material.Concrete,
	})
	newPart(model, {
		Name = "Ring", Shape = Enum.PartType.Cylinder, Size = Vector3.new(0.5, 23, 23),
		CFrame = baseCFrame * CFrame.new(0, 0.25, 0) * UPRIGHT, Color = accent, Material = Enum.Material.Neon,
	})
	newPart(model, {
		Name = "Grate", Shape = Enum.PartType.Cylinder, Size = Vector3.new(0.1, 9, 9),
		CFrame = baseCFrame * CFrame.new(0, top + 0.03, 0) * UPRIGHT,
		Color = Color3.fromRGB(35, 38, 50), Material = Enum.Material.DiamondPlate,
	})
	model.PrimaryPart = base

	-- Turm auf der Außenseite (weg von der Platzmitte), damit die Kamera freie Sicht hat
	local towerHeight = 34
	local towerCFrame = baseCFrame * CFrame.new(0, 0, 15)
	newPart(model, {
		Name = "Tower", Size = Vector3.new(3, towerHeight, 3),
		CFrame = towerCFrame * CFrame.new(0, towerHeight / 2, 0),
		Color = Color3.fromRGB(200, 205, 215), Material = Enum.Material.DiamondPlate,
	})
	newPart(model, {
		Name = "TowerLight", Shape = Enum.PartType.Ball, Size = Vector3.one * 1.4,
		CFrame = towerCFrame * CFrame.new(0, towerHeight + 0.7, 0), Color = accent, Material = Enum.Material.Neon,
	})

	-- Halte-Arme: drehen sich beim Countdown vom Rumpf weg
	local arms = {}
	for i, height in { 9, 18 } do
		local length = 11
		local hinge = towerCFrame * CFrame.new(0, height, 0)
		local closed = hinge * CFrame.new(0, 0, -length / 2)
		local open = hinge * CFrame.Angles(0, math.rad(if i == 1 then 75 else -75), 0) * CFrame.new(0, 0, -length / 2)
		local arm = newPart(model, {
			Name = "Arm" .. i, Size = Vector3.new(1.4, 1.2, length), CFrame = closed,
			Color = Color3.fromRGB(230, 90, 60), Material = Enum.Material.Metal, CanCollide = false,
		})
		table.insert(arms, { Part = arm :: BasePart, Closed = closed, Open = open })
	end

	-- Schild über dem Turm mit Spielername
	local signAnchor = newPart(model, {
		Name = "SignAnchor", Size = Vector3.one, Transparency = 1, CanCollide = false, CanQuery = false,
		CFrame = towerCFrame * CFrame.new(0, towerHeight + 5, 0),
	})
	local billboard = Instance.new("BillboardGui")
	billboard.Name = "OwnerSign"
	billboard.Size = UDim2.fromOffset(260, 74)
	billboard.MaxDistance = 260
	billboard.LightInfluence = 0
	billboard.Parent = signAnchor
	local sign = Instance.new("TextLabel")
	sign.Name = "Owner"
	sign.Size = UDim2.new(1, 0, 0.6, 0)
	sign.BackgroundTransparency = 1
	sign.Font = Enum.Font.FredokaOne
	sign.TextScaled = true
	sign.TextColor3 = Color3.fromRGB(255, 255, 255)
	sign.TextStrokeTransparency = 0.4
	sign.Text = "Rampe " .. index .. " · frei"
	sign.Parent = billboard
	local subSign = Instance.new("TextLabel")
	subSign.Name = "Rocket"
	subSign.Position = UDim2.fromScale(0, 0.6)
	subSign.Size = UDim2.new(1, 0, 0.4, 0)
	subSign.BackgroundTransparency = 1
	subSign.Font = Enum.Font.GothamBold
	subSign.TextScaled = true
	subSign.TextColor3 = accent
	subSign.TextStrokeTransparency = 0.5
	subSign.Text = ""
	subSign.Parent = billboard

	-- ProximityPrompt: nur der Besitzer kann starten (Server prüft, Client blendet ihn für andere aus)
	local promptAttachment = Instance.new("Attachment")
	promptAttachment.Name = "PromptAttachment"
	promptAttachment.Parent = base -- erst Parent setzen, dann die Welt-Position
	promptAttachment.WorldCFrame = baseCFrame * CFrame.new(0, top + 3, -8)
	local prompt = Instance.new("ProximityPrompt")
	prompt.Name = "LaunchPrompt"
	prompt.ActionText = "Rakete starten"
	prompt.ObjectText = "Rampe " .. index
	prompt.KeyboardKeyCode = Enum.KeyCode.E
	prompt.GamepadKeyCode = Enum.KeyCode.ButtonX
	prompt.HoldDuration = 0.25
	prompt.MaxActivationDistance = 16
	prompt.RequiresLineOfSight = false
	prompt.Parent = promptAttachment

	model:SetAttribute("PadIndex", index)
	model:SetAttribute("OwnerUserId", 0)
	model.Parent = Workspace:WaitForChild("LaunchPads")

	local pad: Pad = {
		Index = index,
		Model = model,
		TopCFrame = baseCFrame * CFrame.new(0, top, 0),
		Owner = nil,
		Display = nil,
		ArmPivots = arms,
		Sign = sign,
		SubSign = subSign,
	}

	prompt.Triggered:Connect(function(player: Player)
		if pad.Owner == player then
			PadService.PromptTriggered:Fire(player)
		end
	end)
	return pad
end

local function updateSign(pad: Pad)
	local owner = pad.Owner
	if owner == nil then
		pad.Sign.Text = "Rampe " .. pad.Index .. " · frei"
		pad.SubSign.Text = ""
		return
	end
	pad.Sign.Text = owner.DisplayName
	local data = PlayerDataService.getData(owner)
	local rocket = data and Rockets.get(data.EquippedRocket)
	pad.SubSign.Text = if rocket then "🚀 " .. rocket.Name else ""
end

local function moveCharacterToPad(player: Player)
	local pad = padOf[player]
	local character = player.Character
	if pad == nil or character == nil then
		return
	end
	-- Neben die Rampe, Blick zur Rakete
	local standPosition = (pad.TopCFrame * CFrame.new(0, 3, -16)).Position
	local lookAt = pad.TopCFrame.Position + Vector3.new(0, 3, 0)
	character:PivotTo(CFrame.lookAt(standPosition, Vector3.new(lookAt.X, standPosition.Y, lookAt.Z)))
end

local function assign(player: Player)
	if padOf[player] then
		return
	end
	for _, pad in pads do
		if pad.Owner == nil then
			pad.Owner = player
			padOf[player] = pad
			pad.Model:SetAttribute("OwnerUserId", player.UserId)
			player:SetAttribute("PadIndex", pad.Index)
			PadService.refreshDisplay(player)
			updateSign(pad)
			moveCharacterToPad(player)
			return
		end
	end
	table.insert(waiting, player)
	Notifier.send(player, "Alle Startrampen sind belegt. Du bekommst die nächste freie Rampe.", "Info")
end

local function release(player: Player)
	local index = table.find(waiting, player)
	if index then
		table.remove(waiting, index)
	end
	local pad = padOf[player]
	if pad == nil then
		return
	end
	padOf[player] = nil
	pad.Owner = nil
	pad.Model:SetAttribute("OwnerUserId", 0)
	if pad.Display then
		pad.Display:Destroy()
		pad.Display = nil
	end
	PadService.setArmsOpen(pad, false)
	updateSign(pad)
	-- Nächster wartender Spieler bekommt die Rampe
	local nextPlayer = table.remove(waiting, 1)
	if nextPlayer and nextPlayer.Parent == Players then
		assign(nextPlayer)
	end
end

-- ===== Öffentliche Funktionen =====

function PadService.getPad(player: Player): Pad?
	return padOf[player]
end

-- Baut die ausgerüstete Rakete neu auf die Rampe (z. B. nach Kauf/Wechsel)
function PadService.refreshDisplay(player: Player)
	local pad = padOf[player]
	local data = PlayerDataService.getData(player)
	if pad == nil or data == nil then
		return
	end
	if pad.Display then
		pad.Display:Destroy()
		pad.Display = nil
	end
	local rocket = Rockets.get(data.EquippedRocket) or Rockets.ById[Rockets.StarterId]
	local display = RocketBuilder.build(rocket)
	display.Name = "Display"
	RocketBuilder.place(display, pad.TopCFrame)
	display.Parent = pad.Model
	pad.Display = display
	updateSign(pad)
end

function PadService.setDisplayVisible(player: Player, visible: boolean)
	local pad = padOf[player]
	if pad == nil or pad.Display == nil then
		return
	end
	if visible then
		pad.Display.Parent = pad.Model
	else
		pad.Display.Parent = nil -- nur ausgeblendet, nicht zerstört
	end
end

function PadService.setArmsOpen(pad: Pad, open: boolean)
	for _, arm in pad.ArmPivots do
		TweenService:Create(arm.Part, TweenInfo.new(1.2, Enum.EasingStyle.Quad, Enum.EasingDirection.InOut), {
			CFrame = if open then arm.Open else arm.Closed,
		}):Play()
	end
end

function PadService.init()
	for index, cframe in MapService.PadCFrames do
		table.insert(pads, buildPad(index, cframe))
	end

	PlayerDataService.Loaded:Connect(function(player: Player)
		assign(player)
	end)
	Players.PlayerRemoving:Connect(release)
	local function watchCharacter(player: Player)
		player.CharacterAdded:Connect(function(character)
			-- kurz warten, bis Roblox die Figur fertig platziert hat
			character:WaitForChild("HumanoidRootPart", 5)
			task.wait(0.1)
			moveCharacterToPad(player)
		end)
	end
	Players.PlayerAdded:Connect(watchCharacter)
	for _, player in Players:GetPlayers() do
		watchCharacter(player)
	end
end

return PadService
