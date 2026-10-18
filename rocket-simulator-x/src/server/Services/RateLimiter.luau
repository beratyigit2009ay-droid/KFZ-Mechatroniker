--!strict
-- RateLimiter.luau  (ModuleScript in ServerScriptService.Server.Services)
-- "Token-Bucket" gegen Spam: Jeder Spieler hat pro Remote einen Eimer mit Marken.
-- Jede Anfrage kostet eine Marke, pro Sekunde kommen "rate" Marken nach, höchstens "burst".
-- Ist der Eimer leer, wird die Anfrage ignoriert.

local RateLimiter = {}
RateLimiter.__index = RateLimiter

type Bucket = { tokens: number, last: number }

export type RateLimiter = typeof(setmetatable(
	{} :: { rate: number, burst: number, clock: () -> number, buckets: { [any]: Bucket } },
	RateLimiter
))

-- clock ist austauschbar, damit die Tests die Zeit selbst steuern können
function RateLimiter.new(rate: number, burst: number, clock: (() -> number)?): RateLimiter
	return setmetatable({
		rate = rate,
		burst = burst,
		clock = clock or os.clock,
		buckets = {},
	}, RateLimiter)
end

function RateLimiter.allow(self: RateLimiter, key: any): boolean
	local now = self.clock()
	local bucket = self.buckets[key]
	if bucket == nil then
		bucket = { tokens = self.burst, last = now }
		self.buckets[key] = bucket
	end
	bucket.tokens = math.min(self.burst, bucket.tokens + (now - bucket.last) * self.rate)
	bucket.last = now
	if bucket.tokens >= 1 then
		bucket.tokens -= 1
		return true
	end
	return false
end

function RateLimiter.remove(self: RateLimiter, key: any)
	self.buckets[key] = nil
end

return RateLimiter
