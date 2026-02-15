-- Link business leads to real restaurants (directory or Google Places)
ALTER TABLE business_leads ADD COLUMN restaurant_id UUID REFERENCES restaurants(id) ON DELETE SET NULL;
ALTER TABLE business_leads ADD COLUMN google_place_id TEXT;

CREATE INDEX idx_business_leads_restaurant_id ON business_leads(restaurant_id) WHERE restaurant_id IS NOT NULL;
CREATE INDEX idx_business_leads_google_place_id ON business_leads(google_place_id) WHERE google_place_id IS NOT NULL;
