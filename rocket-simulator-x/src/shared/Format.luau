--!strict
-- Format.luau  (ModuleScript in ReplicatedStorage.Shared)
-- Zahlen kurz und lesbar anzeigen: 1250 -> "1.25K", 3400000 -> "3.4M".

local Format = {}

local suffixes = { "", "K", "M", "B", "T", "Qa", "Qi", "Sx" }

-- Kurzform für große Zahlen (Coins, Gems, Preise)
function Format.short(value: number): string
	if value ~= value then -- NaN
		return "0"
	end
	local negative = value < 0
	local n = math.abs(value)
	local index = 1
	while n >= 1000 and index < #suffixes do
		n /= 1000
		index += 1
	end
	local text
	if index == 1 then
		text = tostring(math.floor(n))
	elseif n >= 100 then
		text = string.format("%d", math.floor(n))
	elseif n >= 10 then
		text = string.format("%.1f", math.floor(n * 10) / 10)
	else
		text = string.format("%.2f", math.floor(n * 100) / 100)
	end
	-- "2.50K" -> "2.5K", "3.00M" -> "3M"
	if string.find(text, "%.") then
		text = string.gsub(text, "0+$", "")
		text = string.gsub(text, "%.$", "")
	end
	return (if negative then "-" else "") .. text .. suffixes[index]
end

-- Faktoren wie "×1.6" oder "×7.6K"
function Format.multiplier(value: number): string
	if value < 1000 then
		local text = string.format("%.1f", value)
		text = string.gsub(text, "%.0$", "")
		return "×" .. text
	end
	return "×" .. Format.short(value)
end

-- Höhe in Metern: unter 10 km in m, darüber in km
function Format.altitude(meters: number): string
	if meters < 10000 then
		return string.format("%d m", math.floor(meters))
	end
	local km = meters / 1000
	if km < 1000 then
		return string.format("%.1f km", math.floor(km * 10) / 10)
	end
	return Format.short(km) .. " km"
end

-- Geschwindigkeit: Studs/s in km/h umgerechnet (über MetersPerStud)
function Format.speed(studsPerSecond: number, metersPerStud: number): string
	local kmh = math.abs(studsPerSecond) * metersPerStud * 3.6
	return Format.short(math.floor(kmh)) .. " km/h"
end

-- Mit Tausenderpunkten: 1234567 -> "1.234.567"
function Format.full(value: number): string
	local text = tostring(math.floor(math.abs(value)))
	local result = string.reverse((string.gsub(string.reverse(text), "(%d%d%d)", "%1.")))
	if string.sub(result, 1, 1) == "." then
		result = string.sub(result, 2)
	end
	return (if value < 0 then "-" else "") .. result
end

return Format
