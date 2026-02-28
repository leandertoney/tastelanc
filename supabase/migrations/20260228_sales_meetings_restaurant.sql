-- Add restaurant_id to sales_meetings so meetings can be linked to restaurants directly
ALTER TABLE sales_meetings
  ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES restaurants(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sales_meetings_restaurant_id
  ON sales_meetings(restaurant_id) WHERE restaurant_id IS NOT NULL;
