--!strict
-- MapService.luau  (ModuleScript in ServerScriptService.Server.Services)
-- Baut die Startbasis auf der Erde: Boden, Platz mit Spawn, Denkmal, Wege, Bäume, Hügel,
-- Laternen, Wolken und zwei Tafeln (Bestenliste, Anleitung).
-- Alles entsteht beim Serverstart. Die Teilezahl bleibt bewusst klein (ca. 400 Parts),
-- große Flächen sind wenige große Parts statt vieler kleiner.

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Workspace = game:GetService("Workspace")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Rockets = require(Shared:WaitForChild("Config"):WaitForChild("Rockets"))
local Flight = require(Shared:WaitForChild("Config"):WaitForChild("Flight"))
local RocketBuilder = require(Shared:WaitForChild("RocketBuilder"))

local MapService = {}

MapService.GroundY = 0
MapService.PadRadius = 112
MapService.PadCFrames = {} :: { CFrame }
MapService.LeaderboardFace = nil :: Part?

local mapFolder: Folder

local function part(props: { [string]: any }): Part
	local p = Instance.new("Part")
	p.Anchored = true
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	for key, value in props do
		if key ~= "Parent" then
			(p :: any)[key] = value
		end
	end
	p.Parent = props.Parent or mapFolder
	return p
end

local function folder(name: string, parent: Instance): Folder
	local f = Instance.new("Folder")
	f.Name = name
	f.Parent = parent
	return f
end

local UPRIGHT = CFrame.Angles(0, 0, math.rad(90))

local function buildGround()
	part({
		Name = "Ground", Size = Vector3.new(1600, 4, 1600), CFrame = CFrame.new(0, -2, 0),
		Color = Color3.fromRGB(88, 152, 74), Material = Enum.Material.Grass,
	})
	-- Platz in der Mitte
	part({
		Name = "Plaza", Shape = Enum.PartType.Cylinder, Size = Vector3.new(0.4, 84, 84),
		CFrame = CFrame.new(0, 0.2, 0) * UPRIGHT, Color = Color3.fromRGB(175, 180, 192), Material = Enum.Material.Concrete,
	})
	part({
		Name = "PlazaGlow", Shape = Enum.PartType.Cylinder, Size = Vector3.new(0.3, 86, 86),
		CFrame = CFrame.new(0, 0.12, 0) * UPRIGHT, Color = Color3.fromRGB(60, 220, 255), Material = Enum.Material.Neon,
	})
	part({
		Name = "PlazaInner", Shape = Enum.PartType.Cylinder, Size = Vector3.new(0.45, 30, 30),
		CFrame = CFrame.new(0, 0.22, 0) * UPRIGHT, Color = Color3.fromRGB(40, 45, 75), Material = Enum.Material.Marble,
	})

	local spawn = Instance.new("SpawnLocation")
	spawn.Name = "Spawn"
	spawn.Anchored = true
	spawn.Size = Vector3.new(12, 1, 12)
	spawn.CFrame = CFrame.new(0, 0.5, 27)
	spawn.Color = Color3.fromRGB(140, 90, 255)
	spawn.Material = Enum.Material.Neon
	spawn.Transparency = 0.3
	spawn.Neutral = true
	spawn.Duration = 0
	spawn.TopSurface = Enum.SurfaceType.Smooth
	spawn.Parent = mapFolder
end

local function buildMonument()
	-- Die stärkste Rakete als großes Denkmal: zeigt allen Spielern ihr Ziel
	local statueRocket = Rockets.List[#Rockets.List]
	local statue = RocketBuilder.build(statueRocket)
	statue.Name = "Monument"
	RocketBuilder.place(statue, CFrame.new(0, 0.45, 0))
	statue:ScaleTo(1.4)
	statue:SetAttribute("RootOffset", (statue:GetAttribute("RootOffset") :: number) * 1.4)
	RocketBuilder.place(statue, CFrame.new(0, 0.45, 0))
	statue.Parent = mapFolder

	local sign = part({
		Name = "MonumentSign", Size = Vector3.new(16, 3, 1), CFrame = CFrame.new(0, 2, 16),
		Color = Color3.fromRGB(20, 24, 50), Material = Enum.Material.SmoothPlastic,
	})
	local gui = Instance.new("SurfaceGui")
	gui.Face = Enum.NormalId.Back
	gui.CanvasSize = Vector2.new(640, 120)
	gui.LightInfluence = 0
	gui.Parent = sign
	local label = Instance.new("TextLabel")
	label.Size = UDim2.fromScale(1, 1)
	label.BackgroundTransparency = 1
	label.Text = "ROCKET SIMULATOR X"
	label.TextColor3 = Color3.fromRGB(255, 205, 70)
	label.Font = Enum.Font.FredokaOne
	label.TextScaled = true
	label.Parent = gui
end

local function buildPadSpotsAndPaths()
	table.clear(MapService.PadCFrames)
	local paths = folder("Paths", mapFolder)
	for i = 1, Flight.PadCount do
		local angle = (i - 1) / Flight.PadCount * math.pi * 2
		local direction = Vector3.new(math.cos(angle), 0, math.sin(angle))
		local position = direction * MapService.PadRadius
		-- Rampe "schaut" zur Mitte (LookVector zeigt zum Platz)
		table.insert(MapService.PadCFrames, CFrame.lookAt(position, Vector3.zero))

		local pathLength = MapService.PadRadius - 42 - 12
		local pathCenter = direction * (42 + pathLength / 2)
		part({
			Name = "Path" .. i, Size = Vector3.new(7, 0.3, pathLength),
			CFrame = CFrame.lookAt(pathCenter + Vector3.new(0, 0.15, 0), Vector3.new(0, 0.15, 0)),
			Color = Color3.fromRGB(150, 155, 168), Material = Enum.Material.Concrete, Parent = paths,
		})
	end
end

local function buildLamps()
	local lamps = folder("Lamps", mapFolder)
	for i = 1, 8 do
		local angle = (i - 0.5) / 8 * math.pi * 2
		local position = Vector3.new(math.cos(angle), 0, math.sin(angle)) * 46
		part({
			Name = "LampPost", Shape = Enum.PartType.Cylinder, Size = Vector3.new(10, 0.6, 0.6),
			CFrame = CFrame.new(position + Vector3.new(0, 5, 0)) * UPRIGHT,
			Color = Color3.fromRGB(50, 55, 75), Material = Enum.Material.Metal, Parent = lamps,
		})
		local bulb = part({
			Name = "LampBulb", Shape = Enum.PartType.Ball, Size = Vector3.one * 1.6,
			CFrame = CFrame.new(position + Vector3.new(0, 10.5, 0)),
			Color = Color3.fromRGB(150, 230, 255), Material = Enum.Material.Neon, Parent = lamps,
		})
		local light = Instance.new("PointLight")
		light.Range = 22
		light.Brightness = 1.5
		light.Color = Color3.fromRGB(150, 230, 255)
		light.Parent = bulb
	end
end

local function buildNature()
	local random = Random.new(42) -- fester Startwert: jeder Server sieht gleich aus
	local trees = folder("Trees", mapFolder)
	local placed = 0
	while placed < 42 do
		local angle = random:NextNumber(0, math.pi * 2)
		local radius = random:NextNumber(150, 430)
		-- erst ab Radius 150, also hinter den Rampen
		local position = Vector3.new(math.cos(angle), 0, math.sin(angle)) * radius
		local height = random:NextNumber(10, 18)
		part({
			Name = "Trunk", Shape = Enum.PartType.Cylinder, Size = Vector3.new(height, 1.6, 1.6),
			CFrame = CFrame.new(position + Vector3.new(0, height / 2, 0)) * UPRIGHT,
			Color = Color3.fromRGB(105, 70, 45), Material = Enum.Material.Wood, Parent = trees,
		})
		local leafColor = Color3.fromHSV(random:NextNumber(0.24, 0.33), 0.6, random:NextNumber(0.45, 0.62))
		part({
			Name = "Leaves", Shape = Enum.PartType.Ball, Size = Vector3.one * random:NextNumber(8, 12),
			CFrame = CFrame.new(position + Vector3.new(0, height + 2, 0)),
			Color = leafColor, Material = Enum.Material.Grass, Parent = trees,
		})
		part({
			Name = "Leaves", Shape = Enum.PartType.Ball, Size = Vector3.one * random:NextNumber(6, 9),
			CFrame = CFrame.new(position + Vector3.new(random:NextNumber(-2, 2), height + 6, random:NextNumber(-2, 2))),
			Color = leafColor:Lerp(Color3.new(1, 1, 1), 0.08), Material = Enum.Material.Grass, Parent = trees,
		})
		placed += 1
	end

	-- Hügel und Berge am Rand: wenige große Kugeln, halb im Boden
	local hills = folder("Hills", mapFolder)
	for i = 1, 16 do
		local angle = (i / 16) * math.pi * 2 + random:NextNumber(-0.1, 0.1)
		local radius = random:NextNumber(560, 700)
		local size = random:NextNumber(140, 260)
		local position = Vector3.new(math.cos(angle), 0, math.sin(angle)) * radius
		local mountain = i % 3 == 0
		part({
			Name = if mountain then "Mountain" else "Hill", Shape = Enum.PartType.Ball, Size = Vector3.one * size,
			CFrame = CFrame.new(position + Vector3.new(0, -size * (if mountain then 0.15 else 0.3), 0)),
			Color = if mountain then Color3.fromRGB(120, 125, 135) else Color3.fromRGB(78, 135, 66),
			Material = if mountain then Enum.Material.Rock else Enum.Material.Grass,
			CanCollide = false, CastShadow = false, Parent = hills,
		})
		if mountain then
			part({
				Name = "Snow", Shape = Enum.PartType.Ball, Size = Vector3.one * size * 0.45,
				CFrame = CFrame.new(position + Vector3.new(0, size * 0.27, 0)),
				Color = Color3.fromRGB(245, 248, 255), Material = Enum.Material.Snow,
				CanCollide = false, CastShadow = false, Parent = hills,
			})
		end
	end

	local clouds = Workspace.Terrain:FindFirstChildOfClass("Clouds") or Instance.new("Clouds")
	clouds.Cover = 0.55
	clouds.Density = 0.55
	clouds.Color = Color3.fromRGB(255, 255, 255)
	clouds.Parent = Workspace.Terrain
end

local function makeBoard(name: string, position: Vector3, title: string): (Part, Frame)
	local board = part({
		Name = name, Size = Vector3.new(26, 16, 1),
		CFrame = CFrame.lookAt(position, Vector3.new(0, position.Y, 0)),
		Color = Color3.fromRGB(16, 20, 44), Material = Enum.Material.SmoothPlastic,
	})
	part({
		Name = name .. "Frame", Size = Vector3.new(27, 17, 0.8),
		CFrame = board.CFrame * CFrame.new(0, 0, 0.3), Color = Color3.fromRGB(140, 90, 255), Material = Enum.Material.Neon,
	})
	for _, side in { -1, 1 } do
		part({
			Name = name .. "Leg", Size = Vector3.new(1, position.Y, 1),
			CFrame = board.CFrame * CFrame.new(side * 11, -position.Y / 2, 0.6),
			Color = Color3.fromRGB(50, 55, 75), Material = Enum.Material.Metal,
		})
	end
	local gui = Instance.new("SurfaceGui")
	gui.Name = "Display"
	gui.Face = Enum.NormalId.Front
	gui.CanvasSize = Vector2.new(780, 480)
	gui.LightInfluence = 0
	gui.Parent = board
	local content = Instance.new("Frame")
	content.Name = "Content"
	content.Size = UDim2.fromScale(1, 1)
	content.BackgroundTransparency = 1
	content.Parent = gui
	local header = Instance.new("TextLabel")
	header.Name = "Title"
	header.Size = UDim2.new(1, 0, 0, 70)
	header.BackgroundTransparency = 1
	header.Text = title
	header.TextColor3 = Color3.fromRGB(255, 205, 70)
	header.Font = Enum.Font.FredokaOne
	header.TextSize = 46
	header.Parent = content
	return board, content
end

local function buildBoards()
	local board, content = makeBoard("LeaderboardBoard", Vector3.new(-17.6, 12, -65.7), "🏆 HÖCHSTE FLÜGE")
	local list = Instance.new("TextLabel")
	list.Name = "List"
	list.Position = UDim2.fromOffset(30, 80)
	list.Size = UDim2.new(1, -60, 1, -100)
	list.BackgroundTransparency = 1
	list.Font = Enum.Font.GothamBold
	list.TextSize = 30
	list.TextColor3 = Color3.fromRGB(235, 240, 255)
	list.TextXAlignment = Enum.TextXAlignment.Left
	list.TextYAlignment = Enum.TextYAlignment.Top
	list.Text = "Wird geladen …"
	list.Parent = content
	MapService.LeaderboardFace = board

	local _, help = makeBoard("HelpBoard", Vector3.new(17.6, 12, -65.7), "🚀 SO SPIELST DU")
	local text = Instance.new("TextLabel")
	text.Position = UDim2.fromOffset(30, 80)
	text.Size = UDim2.new(1, -60, 1, -100)
	text.BackgroundTransparency = 1
	text.Font = Enum.Font.GothamMedium
	text.TextSize = 28
	text.TextWrapped = true
	text.TextColor3 = Color3.fromRGB(235, 240, 255)
	text.TextXAlignment = Enum.TextXAlignment.Left
	text.TextYAlignment = Enum.TextYAlignment.Top
	text.Text = "1. Geh zu deiner Rampe (dein Name steht darüber).\n"
		.. "2. Drück STARTEN (Taste F / Gamepad R2).\n"
		.. "3. Im Flug: BOOST für mehr Schub.\n"
		.. "4. Je höher, desto mehr Coins und XP.\n"
		.. "5. Kauf Upgrades und neue Raketen!"
	text.Parent = help
end

function MapService.init()
	local existing = Workspace:FindFirstChild("Map")
	if existing then
		existing:Destroy()
	end
	mapFolder = folder("Map", Workspace)
	buildGround()
	buildMonument()
	buildPadSpotsAndPaths()
	buildLamps()
	buildNature()
	buildBoards()
	folder("LaunchPads", Workspace)
	folder("Flights", Workspace)
	folder("Effects", Workspace)
end

return MapService
