--!strict
-- Remotes.luau  (ModuleScript in ReplicatedStorage.Shared)
-- Erzeugt (Server) bzw. findet (Client) alle RemoteEvents und RemoteFunctions.
-- Du musst in Studio KEINE Remotes von Hand anlegen.

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

local Remotes = {}

-- Name -> Klasse. Die Bedeutung jeder Remote steht in docs/ARCHITEKTUR.md (Abschnitt 6).
Remotes.Definitions = {
	-- Client -> Server (mit Antwort)
	GetData = "RemoteFunction",
	BuyRocket = "RemoteFunction",
	EquipRocket = "RemoteFunction",
	BuyUpgrade = "RemoteFunction",
	-- Client -> Server
	RequestLaunch = "RemoteEvent",
	RequestBoost = "RemoteEvent",
	UpdateSetting = "RemoteEvent",
	TutorialAdvance = "RemoteEvent",
	-- Server -> Client
	DataUpdate = "RemoteEvent",
	FlightEvent = "RemoteEvent",
	Notify = "RemoteEvent",
	LeaderboardUpdate = "RemoteEvent",
} :: { [string]: string }

local FOLDER_NAME = "Remotes"

local function getFolder(): Folder
	if RunService:IsServer() then
		local existing = ReplicatedStorage:FindFirstChild(FOLDER_NAME)
		if existing and existing:IsA("Folder") then
			return existing
		end
		local folder = Instance.new("Folder")
		folder.Name = FOLDER_NAME
		folder.Parent = ReplicatedStorage
		return folder
	end
	return ReplicatedStorage:WaitForChild(FOLDER_NAME) :: Folder
end

-- Nur der Server ruft das einmal beim Start auf.
function Remotes.createAll()
	assert(RunService:IsServer(), "Remotes.createAll darf nur auf dem Server laufen")
	local folder = getFolder()
	for name, className in Remotes.Definitions do
		if folder:FindFirstChild(name) == nil then
			local remote = Instance.new(className)
			remote.Name = name
			remote.Parent = folder
		end
	end
end

local function find(name: string, className: string): Instance
	assert(Remotes.Definitions[name] == className, "Unbekannte Remote: " .. name)
	local folder = getFolder()
	if RunService:IsServer() then
		local remote = folder:FindFirstChild(name)
		assert(remote, "Remote fehlt (createAll vergessen?): " .. name)
		return remote
	end
	local remote = folder:WaitForChild(name, 30)
	assert(remote, "Remote nicht gefunden: " .. name)
	return remote
end

function Remotes.event(name: string): RemoteEvent
	return find(name, "RemoteEvent") :: RemoteEvent
end

function Remotes.func(name: string): RemoteFunction
	return find(name, "RemoteFunction") :: RemoteFunction
end

return Remotes
