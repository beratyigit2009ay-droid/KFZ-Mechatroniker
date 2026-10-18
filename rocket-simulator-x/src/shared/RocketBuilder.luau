--!strict
-- RocketBuilder.luau  (ModuleScript in ReplicatedStorage.Shared)
-- Baut aus den Daten in Config/Rockets ein Raketenmodell aus normalen Parts (keine Asset-IDs nötig).
-- Der Server benutzt es für die Rampen und den Flug, der Client für die 3D-Vorschau im Shop.
--
-- Aufbau jedes Modells:
--   Root          unsichtbarer Kern, PrimaryPart, an ihm hängen alle Attachments und Kräfte
--   Body, Nose…   sichtbare Teile, mit WeldConstraints an Root geschweißt
--   Effekte       Flammen, Rauch, Funken, Licht, Schweif (zuerst aus, FlightService schaltet sie an)
-- Die Rakete steht auf ihrem Boden. Root sitzt bei 45 % der Höhe; Attribut "RootOffset" sagt genau wo.

local Rockets = require(script.Parent:WaitForChild("Config"):WaitForChild("Rockets"))

local RocketBuilder = {}

local FIRE_TEXTURE = "rbxasset://textures/particles/fire_main.dds"
local SMOKE_TEXTURE = "rbxasset://textures/particles/smoke_main.dds"
local SPARKLE_TEXTURE = "rbxasset://textures/particles/sparkles_main.dds"

-- Namen der Effekte, die beim Zünden an- und ausgeschaltet werden
local ENGINE_EFFECTS = {
	EngineFlame = true,
	EngineSmoke = true,
	EngineSparks = true,
	EngineLight = true,
	EngineTrail = true,
}

-- Zylinder liegen in Roblox entlang der X-Achse. Diese Drehung stellt sie aufrecht.
local UPRIGHT = CFrame.Angles(0, 0, math.rad(90))

type BuildContext = {
	model: Model,
	root: Part,
	rootOffset: number,
}

local function weld(part: BasePart, root: BasePart)
	local constraint = Instance.new("WeldConstraint")
	constraint.Part0 = root
	constraint.Part1 = part
	constraint.Parent = part
end

local function newPart(ctx: BuildContext, name: string, shape: Enum.PartType, size: Vector3, cframe: CFrame, color: Color3, material: Enum.Material): Part
	local part = Instance.new("Part")
	part.Name = name
	part.Shape = shape
	part.Size = size
	-- cframe ist relativ zum Boden der Rakete (0,0,0)
	part.CFrame = cframe
	part.Color = color
	part.Material = material
	part.TopSurface = Enum.SurfaceType.Smooth
	part.BottomSurface = Enum.SurfaceType.Smooth
	part.Anchored = true
	part.CanCollide = false
	part.CanTouch = false
	part.CanQuery = false
	part.Parent = ctx.model
	weld(part, ctx.root)
	return part
end

local function cylinder(ctx: BuildContext, name: string, radius: number, length: number, centerY: number, color: Color3, material: Enum.Material, offset: Vector3?): Part
	local position = Vector3.new(0, centerY, 0) + (offset or Vector3.zero)
	return newPart(ctx, name, Enum.PartType.Cylinder, Vector3.new(length, radius * 2, radius * 2), CFrame.new(position) * UPRIGHT, color, material)
end

-- Ellipsoid über ein SpecialMesh (Kugel-Form, frei skalierbar). Funktioniert ohne Asset-ID.
local function ellipsoid(ctx: BuildContext, name: string, size: Vector3, cframe: CFrame, color: Color3, material: Enum.Material): Part
	local part = newPart(ctx, name, Enum.PartType.Block, size, cframe, color, material)
	local mesh = Instance.new("SpecialMesh")
	mesh.MeshType = Enum.MeshType.Sphere
	mesh.Parent = part
	return part
end

local function wedge(ctx: BuildContext, name: string, size: Vector3, cframe: CFrame, color: Color3, material: Enum.Material): WedgePart
	local part = Instance.new("WedgePart")
	part.Name = name
	part.Size = size
	part.CFrame = cframe
	part.Color = color
	part.Material = material
	part.Anchored = true
	part.CanCollide = false
	part.CanTouch = false
	part.CanQuery = false
	part.Parent = ctx.model
	weld(part, ctx.root)
	return part
end

local function attachment(ctx: BuildContext, name: string, localPosition: Vector3): Attachment
	local a = Instance.new("Attachment")
	a.Name = name
	-- Root sitzt bei rootOffset über dem Boden; Positionen hier sind relativ zum Boden
	a.Position = localPosition - Vector3.new(0, ctx.rootOffset, 0)
	a.Parent = ctx.root
	return a
end

local function flameEmitter(parent: Attachment, name: string, style: Rockets.RocketStyle, scale: number, color0: Color3, color1: Color3)
	local flame = Instance.new("ParticleEmitter")
	flame.Name = name
	flame.Texture = FIRE_TEXTURE
	flame.Color = ColorSequence.new(color0, color1)
	flame.LightEmission = 1
	flame.LightInfluence = 0
	flame.Size = NumberSequence.new({
		NumberSequenceKeypoint.new(0, style.Radius * 1.1 * scale),
		NumberSequenceKeypoint.new(1, style.Radius * 0.2 * scale),
	})
	flame.Transparency = NumberSequence.new({
		NumberSequenceKeypoint.new(0, 0.1),
		NumberSequenceKeypoint.new(1, 1),
	})
	flame.Lifetime = NumberRange.new(0.18, 0.32)
	flame.Rate = 90
	flame.Speed = NumberRange.new(35, 55)
	flame.SpreadAngle = Vector2.new(6, 6)
	flame.EmissionDirection = Enum.NormalId.Bottom
	flame.Enabled = false
	flame.Parent = parent
end

local function addEngineEffects(ctx: BuildContext, style: Rockets.RocketStyle, height: number)
	local nozzle = attachment(ctx, "FlameAttachment", Vector3.new(0, -0.2, 0))
	flameEmitter(nozzle, "EngineFlame", style, 1, style.FlameColor, style.FlameTip)
	flameEmitter(nozzle, "BoostFlame", style, 1.6, Color3.fromRGB(220, 245, 255), Color3.fromRGB(80, 160, 255))

	local smoke = Instance.new("ParticleEmitter")
	smoke.Name = "EngineSmoke"
	smoke.Texture = SMOKE_TEXTURE
	smoke.Color = ColorSequence.new(Color3.fromRGB(230, 230, 235), Color3.fromRGB(150, 150, 160))
	smoke.Size = NumberSequence.new({
		NumberSequenceKeypoint.new(0, style.Radius * 1.5),
		NumberSequenceKeypoint.new(1, style.Radius * 5),
	})
	smoke.Transparency = NumberSequence.new({
		NumberSequenceKeypoint.new(0, 0.35),
		NumberSequenceKeypoint.new(1, 1),
	})
	smoke.Lifetime = NumberRange.new(1.5, 2.5)
	smoke.Rate = 30
	smoke.Speed = NumberRange.new(10, 20)
	smoke.Drag = 1.5
	smoke.RotSpeed = NumberRange.new(-40, 40)
	smoke.Rotation = NumberRange.new(0, 360)
	smoke.EmissionDirection = Enum.NormalId.Bottom
	smoke.Enabled = false
	smoke.Parent = nozzle

	local sparks = Instance.new("ParticleEmitter")
	sparks.Name = "EngineSparks"
	sparks.Texture = SPARKLE_TEXTURE
	sparks.Color = ColorSequence.new(style.FlameColor)
	sparks.LightEmission = 1
	sparks.Size = NumberSequence.new(0.35)
	sparks.Lifetime = NumberRange.new(0.3, 0.6)
	sparks.Rate = 25
	sparks.Speed = NumberRange.new(30, 70)
	sparks.SpreadAngle = Vector2.new(25, 25)
	sparks.EmissionDirection = Enum.NormalId.Bottom
	sparks.Enabled = false
	sparks.Parent = nozzle

	local light = Instance.new("PointLight")
	light.Name = "EngineLight"
	light.Color = style.FlameColor
	light.Range = 24
	light.Brightness = 4
	light.Shadows = false
	light.Enabled = false
	light.Parent = nozzle

	-- Schweif: braucht zwei Attachments
	local trailA = attachment(ctx, "TrailA", Vector3.new(-style.Radius * 0.5, 0, 0))
	local trailB = attachment(ctx, "TrailB", Vector3.new(style.Radius * 0.5, 0, 0))
	local trail = Instance.new("Trail")
	trail.Name = "EngineTrail"
	trail.Attachment0 = trailA
	trail.Attachment1 = trailB
	trail.Color = ColorSequence.new(style.FlameColor, style.FlameTip)
	trail.Transparency = NumberSequence.new({
		NumberSequenceKeypoint.new(0, 0.2),
		NumberSequenceKeypoint.new(1, 1),
	})
	trail.Lifetime = 1.2
	trail.LightEmission = 0.7
	trail.FaceCamera = true
	trail.WidthScale = NumberSequence.new({
		NumberSequenceKeypoint.new(0, 1),
		NumberSequenceKeypoint.new(1, 0.2),
	})
	trail.Enabled = false
	trail.Parent = ctx.root

	-- Kraft-Punkt für FlightService
	attachment(ctx, "ForceAttachment", Vector3.new(0, ctx.rootOffset, 0))
	ctx.model:SetAttribute("Height", height)
end

local function buildNose(ctx: BuildContext, style: Rockets.RocketStyle, baseY: number, length: number)
	local r = style.Radius
	if style.Nose == "Round" then
		ellipsoid(ctx, "Nose", Vector3.new(r * 2, length * 1.6, r * 2), CFrame.new(0, baseY, 0), style.Accent, style.BodyMaterial)
		return
	end
	local steps = if style.Nose == "Needle" then 6 else 5
	local stepLength = length / steps
	for i = 1, steps do
		local t = (i - 1) / steps
		local radius = r * (1 - t) * (if style.Nose == "Needle" then 0.9 else 0.97)
		cylinder(ctx, "Nose" .. i, math.max(radius, 0.15), stepLength + 0.02, baseY + stepLength * (i - 0.5), style.Accent, style.BodyMaterial)
	end
	local tipY = baseY + length
	if style.Nose == "Needle" then
		cylinder(ctx, "Antenna", 0.08, length * 0.35, tipY + length * 0.17, style.Trim, Enum.Material.Metal)
		local ball = newPart(ctx, "AntennaTip", Enum.PartType.Ball, Vector3.one * 0.35, CFrame.new(0, tipY + length * 0.35, 0), style.Accent, Enum.Material.Neon)
		ball.Name = "AntennaTip"
	else
		newPart(ctx, "NoseTip", Enum.PartType.Ball, Vector3.one * math.max(r * 0.45, 0.3), CFrame.new(0, tipY, 0), style.Accent, style.BodyMaterial)
	end
end

local function buildFins(ctx: BuildContext, style: Rockets.RocketStyle, height: number)
	local r = style.Radius
	local finHeight, finLength, bottomY
	if style.FinShape == "Swept" then
		finHeight, finLength, bottomY = height * 0.32, r * 1.2, -height * 0.03
	elseif style.FinShape == "Wing" then
		finHeight, finLength, bottomY = height * 0.4, r * 1.7, height * 0.04
	else -- Delta
		finHeight, finLength, bottomY = height * 0.26, r * 1.05, 0
	end
	for i = 1, style.Fins do
		local angle = (i - 1) / style.Fins * math.pi * 2
		local outward = Vector3.new(math.cos(angle), 0, math.sin(angle))
		local center = outward * (r * 0.9 + finLength / 2) + Vector3.new(0, bottomY + finHeight / 2, 0)
		-- WedgePart: hohe Seite hinten (+Z). lookAt dreht -Z nach außen, also hohe Seite zum Rumpf.
		local cf = CFrame.lookAt(center, center + outward)
		wedge(ctx, "Fin" .. i, Vector3.new(0.28, finHeight, finLength), cf, style.Accent, style.BodyMaterial)
		if style.FinShape == "Wing" then
			-- kleine leuchtende Kante an der Flügelspitze
			local tip = outward * (r * 0.9 + finLength) + Vector3.new(0, bottomY + 0.6, 0)
			newPart(ctx, "FinTip" .. i, Enum.PartType.Block, Vector3.new(0.32, 1.2, 0.5), CFrame.lookAt(tip, tip + outward), style.Trim, style.AccentMaterial)
		end
	end
end

local function buildBoosters(ctx: BuildContext, style: Rockets.RocketStyle, height: number)
	if style.Boosters <= 0 then
		return
	end
	local r = style.Radius
	local boosterRadius = r * 0.42
	local boosterLength = height * 0.42
	for i = 1, style.Boosters do
		-- Booster sitzen zwischen den Flossen
		local angle = ((i - 1) / style.Boosters + 0.5 / math.max(style.Fins, 1)) * math.pi * 2
		local offset = Vector3.new(math.cos(angle), 0, math.sin(angle)) * (r + boosterRadius * 0.85)
		local bottom = height * 0.05
		cylinder(ctx, "Booster" .. i, boosterRadius, boosterLength, bottom + boosterLength / 2, style.Body, style.BodyMaterial, offset)
		cylinder(ctx, "BoosterBand" .. i, boosterRadius * 1.08, 0.4, bottom + boosterLength * 0.7, style.Trim, style.AccentMaterial, offset)
		ellipsoid(
			ctx,
			"BoosterCap" .. i,
			Vector3.new(boosterRadius * 2, boosterRadius * 2.6, boosterRadius * 2),
			CFrame.new(offset + Vector3.new(0, bottom + boosterLength, 0)),
			style.Accent,
			style.BodyMaterial
		)
		cylinder(ctx, "BoosterNozzle" .. i, boosterRadius * 0.7, 0.8, bottom - 0.3, style.Trim, Enum.Material.Metal, offset)
		local flameAttachment = attachment(ctx, "BoosterFlame" .. i, offset + Vector3.new(0, bottom - 0.8, 0))
		flameEmitter(flameAttachment, "EngineFlame", style, 0.5, style.FlameColor, style.FlameTip)
	end
end

-- Baut die Rakete. Die Unterseite liegt bei Y = 0, das Modell ist verankert (Anchored).
function RocketBuilder.build(rocket: Rockets.RocketDef): Model
	local style = rocket.Style
	local height = style.Height
	local r = style.Radius

	local model = Instance.new("Model")
	model.Name = rocket.Id

	local rootOffset = height * 0.45
	local root = Instance.new("Part")
	root.Name = "Root"
	root.Size = Vector3.new(1, 1, 1)
	root.CFrame = CFrame.new(0, rootOffset, 0)
	root.Transparency = 1
	root.Anchored = true
	root.CanCollide = false
	root.CanTouch = false
	root.CanQuery = false
	root.Parent = model
	model.PrimaryPart = root

	local ctx: BuildContext = { model = model, root = root, rootOffset = rootOffset }

	local nozzleLength = height * 0.1
	local bodyBottom = nozzleLength
	local bodyLength = height * 0.64
	local noseBase = bodyBottom + bodyLength

	cylinder(ctx, "Nozzle", r * 0.62, nozzleLength, nozzleLength / 2, style.Trim, Enum.Material.Metal)
	cylinder(ctx, "NozzleRing", r * 0.8, 0.35, nozzleLength - 0.1, style.Trim, Enum.Material.DiamondPlate)
	cylinder(ctx, "Body", r, bodyLength, bodyBottom + bodyLength / 2, style.Body, style.BodyMaterial)

	for i = 1, style.Rings do
		local y = bodyBottom + bodyLength * (i / (style.Rings + 1))
		cylinder(ctx, "Ring" .. i, r * 1.04, 0.4, y, style.Accent, style.AccentMaterial)
	end
	cylinder(ctx, "TopRing", r * 1.03, 0.3, noseBase, style.Trim, style.AccentMaterial)

	buildNose(ctx, style, noseBase, height - noseBase)

	if style.Window then
		local windowY = bodyBottom + bodyLength * 0.78
		newPart(ctx, "WindowFrame", Enum.PartType.Ball, Vector3.one * r * 1.05, CFrame.new(0, windowY, -r * 0.62), style.Trim, Enum.Material.Metal)
		local glass = newPart(ctx, "Window", Enum.PartType.Ball, Vector3.one * r * 0.85, CFrame.new(0, windowY, -r * 0.78), Color3.fromRGB(140, 220, 255), Enum.Material.Glass)
		glass.Transparency = 0.15
		glass.Reflectance = 0.2
	end

	buildFins(ctx, style, height)
	buildBoosters(ctx, style, height)
	addEngineEffects(ctx, style, height)

	if style.Glow then
		local glow = Instance.new("PointLight")
		glow.Name = "BodyGlow"
		glow.Color = style.Accent
		glow.Range = r * 6
		glow.Brightness = 1.2
		glow.Shadows = false
		glow.Parent = root
	end

	if style.Sparkles then
		local sparkleAttachment = attachment(ctx, "SparkleAttachment", Vector3.new(0, height * 0.5, 0))
		local sparkles = Instance.new("ParticleEmitter")
		sparkles.Name = "IdleSparkles"
		sparkles.Texture = SPARKLE_TEXTURE
		sparkles.Color = ColorSequence.new(style.Accent, style.Trim)
		sparkles.LightEmission = 1
		sparkles.Size = NumberSequence.new({
			NumberSequenceKeypoint.new(0, 0.6),
			NumberSequenceKeypoint.new(1, 0),
		})
		sparkles.Lifetime = NumberRange.new(1, 1.6)
		sparkles.Rate = 6
		sparkles.Speed = NumberRange.new(1, 3)
		sparkles.SpreadAngle = Vector2.new(180, 180)
		sparkles.Parent = sparkleAttachment
	end

	model:SetAttribute("RocketId", rocket.Id)
	model:SetAttribute("RootOffset", rootOffset)
	return model
end

-- Stellt die Rakete mit ihrem Boden auf eine Position (bottomCFrame zeigt nach oben).
function RocketBuilder.place(model: Model, bottomCFrame: CFrame)
	local rootOffset = model:GetAttribute("RootOffset")
	local offset = if type(rootOffset) == "number" then rootOffset else 0
	model:PivotTo(bottomCFrame * CFrame.new(0, offset, 0))
end

-- Motor-Effekte an/aus (Flamme, Rauch, Funken, Licht, Schweif)
function RocketBuilder.setEngine(model: Model, enabled: boolean)
	for _, item in model:GetDescendants() do
		if ENGINE_EFFECTS[item.Name] then
			if item:IsA("ParticleEmitter") or item:IsA("Trail") or item:IsA("Light") then
				(item :: any).Enabled = enabled
			end
		end
	end
end

-- Boost-Flamme an/aus
function RocketBuilder.setBoost(model: Model, enabled: boolean)
	for _, item in model:GetDescendants() do
		if item.Name == "BoostFlame" and item:IsA("ParticleEmitter") then
			item.Enabled = enabled
		end
	end
end

-- Löst alle Anker, damit die Physik übernehmen kann
function RocketBuilder.setAnchored(model: Model, anchored: boolean)
	for _, item in model:GetDescendants() do
		if item:IsA("BasePart") then
			item.Anchored = anchored
		end
	end
end

-- Rückkehr-Kapsel mit Fallschirm (nach dem Gipfel)
function RocketBuilder.buildCapsule(rocket: Rockets.RocketDef): Model
	local style = rocket.Style
	local model = Instance.new("Model")
	model.Name = "Capsule"

	local size = math.clamp(style.Radius * 1.6, 2.6, 4.5)
	local root = Instance.new("Part")
	root.Name = "Root"
	root.Shape = Enum.PartType.Ball
	root.Size = Vector3.one * size
	root.CFrame = CFrame.new(0, size / 2, 0)
	root.Color = style.Body
	root.Material = style.BodyMaterial
	root.Anchored = true
	root.CanCollide = true
	root.CanTouch = false
	root.CanQuery = false
	root.Parent = model
	model.PrimaryPart = root

	local ctx: BuildContext = { model = model, root = root, rootOffset = size / 2 }

	local band = newPart(ctx, "Band", Enum.PartType.Cylinder, Vector3.new(0.5, size * 1.05, size * 1.05), CFrame.new(0, size / 2, 0) * UPRIGHT, style.Accent, style.AccentMaterial)
	band.CanCollide = false
	local window = newPart(ctx, "Window", Enum.PartType.Ball, Vector3.one * size * 0.4, CFrame.new(0, size * 0.62, -size * 0.36), Color3.fromRGB(140, 220, 255), Enum.Material.Glass)
	window.Transparency = 0.15

	local canopyY = size + 9
	local canopy = ellipsoid(ctx, "Parachute", Vector3.new(13, 4.5, 13), CFrame.new(0, canopyY, 0), style.Accent, Enum.Material.Fabric)
	canopy.Transparency = 0.05
	local stripe = ellipsoid(ctx, "ParachuteStripe", Vector3.new(13.3, 3, 4), CFrame.new(0, canopyY + 0.4, 0), Color3.fromRGB(245, 245, 250), Enum.Material.Fabric)
	stripe.CanCollide = false

	-- Seile als sichtbare RopeConstraints (die Teile sind verschweißt, die Seile sind nur Optik)
	local bottomAttachment = Instance.new("Attachment")
	bottomAttachment.Name = "RopeBottom"
	bottomAttachment.Position = Vector3.new(0, size / 2, 0)
	bottomAttachment.Parent = root
	for i = 1, 4 do
		local angle = (i - 1) / 4 * math.pi * 2
		local top = Instance.new("Attachment")
		top.Name = "RopeTop" .. i
		top.Position = Vector3.new(math.cos(angle) * 5.8, -1, math.sin(angle) * 5.8)
		top.Parent = canopy
		local rope = Instance.new("RopeConstraint")
		rope.Name = "Rope" .. i
		rope.Attachment0 = bottomAttachment
		rope.Attachment1 = top
		rope.Visible = true
		rope.Thickness = 0.08
		rope.Color = BrickColor.new("Institutional white")
		rope.Length = 11
		rope.Parent = root
	end

	local forceAttachment = Instance.new("Attachment")
	forceAttachment.Name = "ForceAttachment"
	forceAttachment.Parent = root

	model:SetAttribute("RootOffset", size / 2)
	return model
end

return RocketBuilder
