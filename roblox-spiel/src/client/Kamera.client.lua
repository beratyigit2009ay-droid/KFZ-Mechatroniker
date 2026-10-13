-- Kamera.client.lua
-- 1) Kamera wackelt bei Explosionen in der Nähe (je näher und größer, desto stärker).
-- 2) Kartenansicht: Mit dem KARTE-Knopf fliegt die Kamera hoch über alle 4 Städte.
--    Dort kannst du mit einem Finger wischen (drehen) und mit zwei Fingern zoomen.

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local UserInputService = game:GetService("UserInputService")

local spieler = Players.LocalPlayer

------------------------------------------------------------------------
-- Wackeln
------------------------------------------------------------------------

local wackeln = 0 -- wie stark die Kamera gerade wackelt

workspace.DescendantAdded:Connect(function(objekt)
	if objekt:IsA("Explosion") then
		local kamera = workspace.CurrentCamera
		local abstand = (kamera.Focus.Position - objekt.Position).Magnitude
		local staerke = objekt.BlastRadius * 2.5 / math.max(abstand, 12)
		if staerke > 0.05 then
			wackeln = math.min(math.max(wackeln, staerke), 2.5)
		end
	end
end)

------------------------------------------------------------------------
-- Kartenansicht
------------------------------------------------------------------------

local karteAn = false
local drehung = 0 -- Blickrichtung rund um die Karte
local entfernung = 470 -- wie weit weg die Kamera ist (Zoom)
local NEIGUNG = math.rad(52) -- wie steil sie nach unten schaut
local uebergangStart: CFrame? = nil
local uebergangZeit = 0

-- Steuerung (Joystick) während der Kartenansicht ausschalten
local steuerung = nil
task.spawn(function()
	local ok, modul = pcall(function()
		return require(spieler:WaitForChild("PlayerScripts"):WaitForChild("PlayerModule"))
	end)
	if ok and modul then
		steuerung = modul:GetControls()
	end
end)

local function kartenBlick(): CFrame
	local waagerecht = math.cos(NEIGUNG) * entfernung
	local pos = Vector3.new(math.sin(drehung) * waagerecht, math.sin(NEIGUNG) * entfernung, math.cos(drehung) * waagerecht)
	return CFrame.lookAt(pos, Vector3.new(0, 0, 0))
end

spieler:GetAttributeChangedSignal("Kartenansicht"):Connect(function()
	karteAn = spieler:GetAttribute("Kartenansicht") == true
	local kamera = workspace.CurrentCamera
	if karteAn then
		-- von der eigenen Stadt aus auf die Karte schauen
		local stadt = spieler:GetAttribute("Stadt") or 0
		local ecken = { Vector2.new(-1, -1), Vector2.new(1, -1), Vector2.new(-1, 1), Vector2.new(1, 1) }
		local ecke = ecken[stadt]
		if ecke then
			drehung = math.atan2(ecke.X, ecke.Y)
		end
		uebergangStart = kamera.CFrame
		uebergangZeit = 0
		kamera.CameraType = Enum.CameraType.Scriptable
		if steuerung then
			steuerung:Disable()
		end
	else
		kamera.CameraType = Enum.CameraType.Custom
		if steuerung then
			steuerung:Enable()
		end
	end
end)

-- Wischen dreht die Karte
UserInputService.InputChanged:Connect(function(eingabe, verarbeitet)
	if not karteAn or verarbeitet then
		return
	end
	if eingabe.UserInputType == Enum.UserInputType.Touch then
		drehung -= eingabe.Delta.X * 0.006
	elseif eingabe.UserInputType == Enum.UserInputType.MouseMovement and UserInputService:IsMouseButtonPressed(Enum.UserInputType.MouseButton1) then
		drehung -= eingabe.Delta.X * 0.006
	elseif eingabe.UserInputType == Enum.UserInputType.MouseWheel then
		entfernung = math.clamp(entfernung - eingabe.Position.Z * 30, 200, 700)
	end
end)

-- Zwei Finger zusammen/auseinander: zoomen
local zoomStart = entfernung
UserInputService.TouchPinch:Connect(function(_, skala, _, zustand, verarbeitet)
	if not karteAn or verarbeitet then
		return
	end
	if zustand == Enum.UserInputState.Begin then
		zoomStart = entfernung
	end
	entfernung = math.clamp(zoomStart / math.max(skala, 0.1), 200, 700)
end)

------------------------------------------------------------------------
-- Jedes Bild: Kamera setzen und wackeln lassen
------------------------------------------------------------------------

RunService:BindToRenderStep("RaketenKriegKamera", Enum.RenderPriority.Camera.Value + 1, function(dt)
	local kamera = workspace.CurrentCamera
	if karteAn then
		local ziel = kartenBlick()
		if uebergangStart then
			-- weich hochfliegen
			uebergangZeit = math.min(uebergangZeit + dt / 1.2, 1)
			local a = 1 - (1 - uebergangZeit) ^ 3
			kamera.CFrame = uebergangStart:Lerp(ziel, a)
			if uebergangZeit >= 1 then
				uebergangStart = nil
			end
		else
			kamera.CFrame = ziel
		end
	end

	if wackeln > 0.01 then
		local t = os.clock() * 22
		local w = wackeln
		kamera.CFrame *= CFrame.new(math.noise(t, 1.3) * w * 0.5, math.noise(t, 7.1) * w * 0.5, 0)
			* CFrame.Angles(math.noise(t, 3.7) * w * 0.02, math.noise(t, 5.9) * w * 0.02, math.noise(t, 9.2) * w * 0.015)
		wackeln *= math.exp(-dt * 3.5)
	else
		wackeln = 0
	end
end)
