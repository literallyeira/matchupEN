-- pending_orders: callback'te 404 gelince token ile sipariş bulmak için
ALTER TABLE pending_orders ADD COLUMN IF NOT EXISTS gateway_token TEXT;
CREATE INDEX IF NOT EXISTS idx_pending_orders_gateway_token ON pending_orders(gateway_token) WHERE gateway_token IS NOT NULL;
