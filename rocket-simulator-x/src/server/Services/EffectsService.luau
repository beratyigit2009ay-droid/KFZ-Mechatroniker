--!strict
-- EffectsService.luau  (ModuleScript in ServerScriptService.Server.Services)
-- Kurzlebige Effekte, die alle Spieler sehen: Startrauch, Gipfel-Blitz, Lande-Staub.
-- Regeln gegen Lag: höchstens MAX_ACTIVE Effekte gleichzeitig, jeder räumt sich nach kurzer Zeit selbst weg,
-- Partikel werden mit :Emit() einmalig ausgestoßen statt dauerhaft zu laufen.

local Debris = game:GetService("Debris")
local TweenService = game:GetService("TweenService")
local Workspace = game:GetService("Workspace")

local EffectsService = {}

local MAX_ACTIVE = 24
local SMOKE_TEXTURE = "rbxasset://textures/particles/smoke_main.dds"
local SPARKLE_TEXTURE = "rbxasset://textures/particles/sparkles_main.dds"

local active = 0

local function effectsFolder(): Instance
	return Workspace:FindFirstChild("Effects") or Workspace
end

-- Unsichtbarer Träger-Part für Partikel
local function carrier(position: Vector3, lifetime: number): Part?
	if active >= MAX_ACTIVE then
		return nil
	end
	active += 1
	local p = Instance.new("Part")
	p.Name = "Effect"
	p.Anchored = true
	p.CanCollide = false
	p.CanTouch = false
	p.CanQuery = false
	p.Transparency = 1
	p.Size = Vector3.one
	p.CFrame = CFrame.new(position)
	p.Parent = effectsFolder()
	Debris:AddItem(p, lifetime)
	task.delay(lifetime, function()
		active -= 1
	end)
	return p
end

local function smokeEmitter(parent: Instance, color: Color3, size: number, speed: number, lifetime: number): ParticleEmitter
	local emitter = Instance.new("ParticleEmitter")
	emitter.Texture = SMOKE_TEXTURE
	emitter.Color = ColorSequence.new(color)
	emitter.Size = NumberSequence.new({
		NumberSequenceKeypoint.new(0, size * 0.4),
		NumberSequenceKeypoint.new(1, size),
	})
	emitter.Transparency = NumberSequence.new({
		NumberSequenceKeypoint.new(0, 0.3),
		NumberSequenceKeypoint.new(1, 1),
	})
	emitter.Lifetime = NumberRange.new(lifetime * 0.7, lifetime)
	emitter.Speed = NumberRange.new(speed * 0.5, speed)
	emitter.Drag = 2
	emitter.Rotation = NumberRange.new(0, 360)
	emitter.RotSpeed = NumberRange.new(-30, 30)
	emitter.Rate = 0
	emitter.Parent = parent
	return emitter
end

-- Rauchwolke, die sich beim Start am Boden ausbreitet
function EffectsService.launchSmoke(position: Vector3, radius: number)
	local p = carrier(position, 6)
	if p == nil then
		return
	end
	local emitter = smokeEmitter(p, Color3.fromRGB(225, 225, 230), radius * 4, 45, 3.5)
	emitter.SpreadAngle = Vector2.new(85, 85)
	emitter.EmissionDirection = Enum.NormalId.Top
	emitter:Emit(45)
end

-- Heller Blitz + Funkenregen am höchsten Punkt
function EffectsService.apexBurst(position: Vector3, color: Color3)
	local p = carrier(position, 3)
	if p == nil then
		return
	end
	local flash = Instance.new("Part")
	flash.Name = "Flash"
	flash.Shape = Enum.PartType.Ball
	flash.Anchored = true
	flash.CanCollide = false
	flash.CanTouch = false
	flash.CanQuery = false
	flash.Material = Enum.Material.Neon
	flash.Color = color
	flash.Size = Vector3.one * 4
	flash.CFrame = CFrame.new(position)
	flash.Parent = p
	TweenService:Create(flash, TweenInfo.new(0.8, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
		Size = Vector3.one * 40,
		Transparency = 1,
	}):Play()

	local light = Instance.new("PointLight")
	light.Color = color
	light.Range = 60
	light.Brightness = 6
	light.Parent = p
	TweenService:Create(light, TweenInfo.new(1.2), { Brightness = 0 }):Play()

	local sparks = Instance.new("ParticleEmitter")
	sparks.Texture = SPARKLE_TEXTURE
	sparks.Color = ColorSequence.new(color, Color3.new(1, 1, 1))
	sparks.LightEmission = 1
	sparks.Size = NumberSequence.new({
		NumberSequenceKeypoint.new(0, 1.2),
		NumberSequenceKeypoint.new(1, 0),
	})
	sparks.Lifetime = NumberRange.new(0.8, 1.6)
	sparks.Speed = NumberRange.new(40, 90)
	sparks.SpreadAngle = Vector2.new(180, 180)
	sparks.Drag = 1.5
	sparks.Rate = 0
	sparks.Parent = p
	sparks:Emit(70)
end

-- Staubring bei der Landung der Kapsel
function EffectsService.landingDust(position: Vector3)
	local p = carrier(position, 4)
	if p == nil then
		return
	end
	local emitter = smokeEmitter(p, Color3.fromRGB(190, 175, 150), 9, 25, 2)
	emitter.SpreadAngle = Vector2.new(80, 80)
	emitter.EmissionDirection = Enum.NormalId.Top
	emitter:Emit(25)

	local ring = Instance.new("Part")
	ring.Name = "Shockwave"
	ring.Shape = Enum.PartType.Cylinder
	ring.Anchored = true
	ring.CanCollide = false
	ring.CanTouch = false
	ring.CanQuery = false
	ring.Material = Enum.Material.Neon
	ring.Color = Color3.fromRGB(255, 230, 170)
	ring.Transparency = 0.3
	ring.Size = Vector3.new(0.2, 2, 2)
	ring.CFrame = CFrame.new(position - Vector3.new(0, 1, 0)) * CFrame.Angles(0, 0, math.rad(90))
	ring.Parent = p
	TweenService:Create(ring, TweenInfo.new(0.7, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
		Size = Vector3.new(0.2, 24, 24),
		Transparency = 1,
	}):Play()
end

return EffectsService
