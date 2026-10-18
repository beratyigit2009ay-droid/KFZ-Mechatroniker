--!strict
-- Signal.luau  (ModuleScript in ReplicatedStorage.Shared)
-- Ein kleines Ereignis-System für Scripts untereinander (wie ein BindableEvent, aber ohne Instanz).
--   local changed = Signal.new()
--   local connection = changed:Connect(function(value) print(value) end)
--   changed:Fire(42)
--   connection:Disconnect()

export type Connection = { Disconnect: (self: Connection) -> (), Connected: boolean }

local Signal = {}
Signal.__index = Signal

export type Signal = typeof(setmetatable({} :: { _handlers: { [any]: (...any) -> () } }, Signal))

function Signal.new(): Signal
	return setmetatable({ _handlers = {} }, Signal)
end

function Signal.Connect(self: Signal, handler: (...any) -> ()): Connection
	local key = {}
	self._handlers[key] = handler
	local connection = { Connected = true } :: any
	function connection.Disconnect(conn: any)
		if conn.Connected then
			conn.Connected = false
			self._handlers[key] = nil
		end
	end
	return connection
end

-- Ruft alle Handler auf. Jeder Handler läuft in einem eigenen Thread, damit ein Fehler die anderen nicht stoppt.
function Signal.Fire(self: Signal, ...: any)
	for _, handler in self._handlers do
		task.spawn(handler, ...)
	end
end

function Signal.DisconnectAll(self: Signal)
	table.clear(self._handlers)
end

return Signal
