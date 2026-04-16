-- FreshScan Database Schema
-- Supabase PostgreSQL with pgvector extension

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ── Users ──────────────────────────────────────────────

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  auth_provider TEXT NOT NULL DEFAULT 'email',
  avatar_url TEXT DEFAULT '',
  household_id UUID,
  dietary_profile JSONB DEFAULT '{}',
  notification_preferences JSONB DEFAULT '{"expiry_alerts": true, "weekly_report": true, "scan_reminders": true, "frequency": "daily_digest"}',
  onboarding_completed BOOLEAN DEFAULT FALSE,
  subscription_tier TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Households ─────────────────────────────────────────

CREATE TABLE households (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL DEFAULT substr(md5(random()::text), 1, 8),
  owner_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE users ADD CONSTRAINT fk_users_household
  FOREIGN KEY (household_id) REFERENCES households(id);

-- ── Ingredients (taxonomy) ─────────────────────────────

CREATE TYPE ingredient_category AS ENUM (
  'Produce', 'Dairy', 'Protein', 'Grains and Bread',
  'Canned and Jarred', 'Frozen', 'Condiments and Sauces',
  'Snacks', 'Beverages', 'Baking', 'Spices'
);

CREATE TABLE ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category ingredient_category NOT NULL,
  subcategory TEXT DEFAULT '',
  aliases TEXT[] DEFAULT '{}',
  default_shelf_life_fridge_days INTEGER DEFAULT 7,
  default_shelf_life_freezer_days INTEGER DEFAULT 180,
  default_shelf_life_pantry_days INTEGER DEFAULT 30,
  default_shelf_life_opened_days INTEGER DEFAULT 5,
  storage_tips TEXT DEFAULT '',
  ethylene_producer BOOLEAN DEFAULT FALSE,
  ethylene_sensitive BOOLEAN DEFAULT FALSE,
  common_substitutes UUID[] DEFAULT '{}',
  usda_fdc_id TEXT,
  barcode_ids TEXT[] DEFAULT '{}',
  embedding VECTOR(384)
);

CREATE INDEX idx_ingredients_name ON ingredients(name);
CREATE INDEX idx_ingredients_category ON ingredients(category);
CREATE INDEX idx_ingredients_barcode ON ingredients USING GIN(barcode_ids);

-- ── Inventory Items ────────────────────────────────────

CREATE TYPE storage_location AS ENUM (
  'fridge_top', 'fridge_middle', 'fridge_bottom', 'fridge_door',
  'crisper', 'freezer', 'pantry', 'countertop', 'custom'
);

CREATE TYPE inventory_status AS ENUM (
  'fresh', 'expiring_soon', 'expiring_today',
  'expired', 'consumed', 'wasted', 'frozen_to_save'
);

CREATE TYPE item_source AS ENUM (
  'vision_scan', 'barcode', 'receipt', 'voice', 'manual', 'loyalty_sync'
);

CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id),
  ingredient_id UUID NOT NULL REFERENCES ingredients(id),
  storage_location storage_location NOT NULL DEFAULT 'fridge_middle',
  quantity_text TEXT NOT NULL DEFAULT '1',
  quantity_numeric DECIMAL,
  is_opened BOOLEAN DEFAULT FALSE,
  expiry_date DATE NOT NULL,
  original_expiry_date DATE NOT NULL,
  purchase_date DATE,
  purchase_price DECIMAL,
  purchased_by UUID REFERENCES users(id),
  source item_source NOT NULL DEFAULT 'manual',
  confidence_score INTEGER,
  photo_url TEXT,
  status inventory_status NOT NULL DEFAULT 'fresh',
  frozen_to_save TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inventory_household ON inventory_items(household_id);
CREATE INDEX idx_inventory_status ON inventory_items(status);
CREATE INDEX idx_inventory_expiry ON inventory_items(expiry_date);

-- ── Recipes ────────────────────────────────────────────

CREATE TYPE recipe_difficulty AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE recipe_source_type AS ENUM ('curated', 'ai_generated', 'user_submitted', 'web_import');

CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  cuisine TEXT DEFAULT '',
  difficulty recipe_difficulty DEFAULT 'medium',
  prep_time_min INTEGER DEFAULT 0,
  cook_time_min INTEGER DEFAULT 0,
  total_time_min INTEGER DEFAULT 0,
  servings INTEGER DEFAULT 4,
  instructions JSONB DEFAULT '[]',
  nutrition_per_serving JSONB DEFAULT '{}',
  source_type recipe_source_type DEFAULT 'curated',
  source_url TEXT,
  image_url TEXT,
  avg_rating DECIMAL DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  embedding VECTOR(384),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recipes_cuisine ON recipes(cuisine);
CREATE INDEX idx_recipes_source ON recipes(source_type);

-- ── Recipe Ingredients (join table) ────────────────────

CREATE TABLE recipe_ingredients (
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id),
  quantity DECIMAL NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT '',
  preparation TEXT,
  is_optional BOOLEAN DEFAULT FALSE,
  substitute_ingredient_ids UUID[],
  PRIMARY KEY (recipe_id, ingredient_id)
);

-- ── Grocery List Items ─────────────────────────────────

CREATE TYPE grocery_item_source AS ENUM ('recipe', 'manual', 'staple_restock', 'waste_rebuy');

CREATE TABLE grocery_list_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id),
  ingredient_id UUID NOT NULL REFERENCES ingredients(id),
  quantity_text TEXT NOT NULL DEFAULT '1',
  source grocery_item_source DEFAULT 'manual',
  added_by UUID NOT NULL REFERENCES users(id),
  assigned_to UUID REFERENCES users(id),
  is_purchased BOOLEAN DEFAULT FALSE,
  estimated_price DECIMAL,
  actual_price DECIMAL,
  store_aisle TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_grocery_household ON grocery_list_items(household_id);

-- ── Waste Log ──────────────────────────────────────────

CREATE TYPE waste_reason AS ENUM ('expired', 'spoiled', 'leftover_forgotten', 'overcooked', 'other');

CREATE TABLE waste_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id),
  inventory_item_id UUID REFERENCES inventory_items(id),
  ingredient_id UUID NOT NULL REFERENCES ingredients(id),
  quantity_wasted TEXT NOT NULL DEFAULT '',
  estimated_value DECIMAL DEFAULT 0,
  reason waste_reason DEFAULT 'expired',
  wasted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_waste_household ON waste_log(household_id);

-- ── User Recipe Interactions ───────────────────────────

CREATE TYPE interaction_type AS ENUM ('viewed', 'saved', 'cooked', 'rated', 'shared');

CREATE TABLE user_recipe_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  recipe_id UUID NOT NULL REFERENCES recipes(id),
  interaction_type interaction_type NOT NULL,
  rating INTEGER,
  cooked_servings INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_interactions_user ON user_recipe_interactions(user_id);

-- ── Scan History ───────────────────────────────────────

CREATE TYPE scan_type AS ENUM ('vision', 'barcode', 'receipt', 'voice');

CREATE TABLE scan_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  scan_type scan_type NOT NULL,
  photo_url TEXT,
  raw_api_response JSONB DEFAULT '{}',
  items_detected INTEGER DEFAULT 0,
  items_confirmed INTEGER DEFAULT 0,
  items_corrected INTEGER DEFAULT 0,
  processing_time_ms INTEGER DEFAULT 0,
  api_cost_estimate DECIMAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Row Level Security ─────────────────────────────────

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE grocery_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_recipe_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_history ENABLE ROW LEVEL SECURITY;

-- Users can read/update their own profile
CREATE POLICY "users_own_profile" ON users
  FOR ALL USING (auth.uid() = id);

-- Users can see their household members
CREATE POLICY "users_household_members" ON users
  FOR SELECT USING (household_id IN (
    SELECT household_id FROM users WHERE id = auth.uid()
  ));

-- Household policies
CREATE POLICY "household_member_access" ON households
  FOR ALL USING (id IN (
    SELECT household_id FROM users WHERE id = auth.uid()
  ));

-- Inventory: household members can CRUD
CREATE POLICY "inventory_household_access" ON inventory_items
  FOR ALL USING (household_id IN (
    SELECT household_id FROM users WHERE id = auth.uid()
  ));

-- Recipes: everyone can read curated, own recipes editable
CREATE POLICY "recipes_read_all" ON recipes
  FOR SELECT USING (TRUE);

CREATE POLICY "recipe_ingredients_read_all" ON recipe_ingredients
  FOR SELECT USING (TRUE);

-- Grocery list: household access
CREATE POLICY "grocery_household_access" ON grocery_list_items
  FOR ALL USING (household_id IN (
    SELECT household_id FROM users WHERE id = auth.uid()
  ));

-- Waste log: household access
CREATE POLICY "waste_household_access" ON waste_log
  FOR ALL USING (household_id IN (
    SELECT household_id FROM users WHERE id = auth.uid()
  ));

-- Interactions: own records
CREATE POLICY "interactions_own" ON user_recipe_interactions
  FOR ALL USING (user_id = auth.uid());

-- Scan history: own records
CREATE POLICY "scan_history_own" ON scan_history
  FOR ALL USING (user_id = auth.uid());
