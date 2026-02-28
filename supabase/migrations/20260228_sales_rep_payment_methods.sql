-- Sales rep payment method preferences
-- Each rep can enable multiple methods and provide usernames/details

ALTER TABLE sales_reps ADD COLUMN IF NOT EXISTS payment_cashapp TEXT;      -- Cash App $cashtag
ALTER TABLE sales_reps ADD COLUMN IF NOT EXISTS payment_venmo TEXT;        -- Venmo username
ALTER TABLE sales_reps ADD COLUMN IF NOT EXISTS payment_zelle TEXT;        -- Zelle phone/email
ALTER TABLE sales_reps ADD COLUMN IF NOT EXISTS payment_applepay TEXT;     -- Apple Pay phone/email
ALTER TABLE sales_reps ADD COLUMN IF NOT EXISTS payment_cashapp_enabled BOOLEAN DEFAULT false;
ALTER TABLE sales_reps ADD COLUMN IF NOT EXISTS payment_venmo_enabled BOOLEAN DEFAULT false;
ALTER TABLE sales_reps ADD COLUMN IF NOT EXISTS payment_zelle_enabled BOOLEAN DEFAULT false;
ALTER TABLE sales_reps ADD COLUMN IF NOT EXISTS payment_applepay_enabled BOOLEAN DEFAULT false;
