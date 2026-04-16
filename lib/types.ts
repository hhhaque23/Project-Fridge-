// FreshScan Database Types - derived from schema specification

export type UUID = string;

// ── Enums ──────────────────────────────────────────────

export type StorageLocation =
  | 'fridge_top'
  | 'fridge_middle'
  | 'fridge_bottom'
  | 'fridge_door'
  | 'crisper'
  | 'freezer'
  | 'pantry'
  | 'countertop'
  | 'custom';

export type InventoryStatus =
  | 'fresh'
  | 'expiring_soon'
  | 'expiring_today'
  | 'expired'
  | 'consumed'
  | 'wasted'
  | 'frozen_to_save';

export type ItemSource =
  | 'vision_scan'
  | 'barcode'
  | 'receipt'
  | 'voice'
  | 'manual'
  | 'loyalty_sync';

export type IngredientCategory =
  | 'Produce'
  | 'Dairy'
  | 'Protein'
  | 'Grains and Bread'
  | 'Canned and Jarred'
  | 'Frozen'
  | 'Condiments and Sauces'
  | 'Snacks'
  | 'Beverages'
  | 'Baking'
  | 'Spices';

export type RecipeDifficulty = 'easy' | 'medium' | 'hard';

export type RecipeSourceType =
  | 'curated'
  | 'ai_generated'
  | 'user_submitted'
  | 'web_import';

export type GroceryItemSource =
  | 'recipe'
  | 'manual'
  | 'staple_restock'
  | 'waste_rebuy';

export type WasteReason =
  | 'expired'
  | 'spoiled'
  | 'leftover_forgotten'
  | 'overcooked'
  | 'other';

export type InteractionType =
  | 'viewed'
  | 'saved'
  | 'cooked'
  | 'rated'
  | 'shared';

export type ScanType = 'vision' | 'barcode' | 'receipt' | 'voice';

// ── Table Types ────────────────────────────────────────

export interface User {
  id: UUID;
  email: string;
  display_name: string;
  auth_provider: string;
  avatar_url: string;
  household_id: UUID | null;
  dietary_profile: DietaryProfile | null;
  notification_preferences: NotificationPreferences | null;
  onboarding_completed: boolean;
  subscription_tier: string;
  created_at: string;
  updated_at: string;
}

export interface DietaryProfile {
  allergies: string[];
  intolerances: string[];
  diet_type: string | null;
  calorie_target: number | null;
  macro_split: { protein: number; carbs: number; fat: number } | null;
}

export interface NotificationPreferences {
  expiry_alerts: boolean;
  weekly_report: boolean;
  scan_reminders: boolean;
  quiet_hours: { start: string; end: string } | null;
  frequency: 'realtime' | 'daily_digest' | 'weekly_summary';
}

export interface Household {
  id: UUID;
  name: string;
  invite_code: string;
  owner_id: UUID;
  created_at: string;
}

export interface InventoryItem {
  id: UUID;
  household_id: UUID;
  ingredient_id: UUID;
  storage_location: StorageLocation;
  quantity_text: string;
  quantity_numeric: number | null;
  is_opened: boolean;
  expiry_date: string;
  original_expiry_date: string;
  purchase_date: string | null;
  purchase_price: number | null;
  purchased_by: UUID | null;
  source: ItemSource;
  confidence_score: number | null;
  photo_url: string | null;
  status: InventoryStatus;
  frozen_to_save: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  ingredient?: Ingredient;
}

export interface Ingredient {
  id: UUID;
  name: string;
  category: IngredientCategory;
  subcategory: string;
  aliases: string[];
  default_shelf_life_fridge_days: number;
  default_shelf_life_freezer_days: number;
  default_shelf_life_pantry_days: number;
  default_shelf_life_opened_days: number;
  storage_tips: string;
  ethylene_producer: boolean;
  ethylene_sensitive: boolean;
  common_substitutes: UUID[];
  usda_fdc_id: string | null;
  barcode_ids: string[];
  embedding: number[] | null;
}

export interface Recipe {
  id: UUID;
  title: string;
  description: string;
  cuisine: string;
  difficulty: RecipeDifficulty;
  prep_time_min: number;
  cook_time_min: number;
  total_time_min: number;
  servings: number;
  instructions: RecipeStep[];
  nutrition_per_serving: NutritionInfo;
  source_type: RecipeSourceType;
  source_url: string | null;
  image_url: string | null;
  avg_rating: number;
  rating_count: number;
  tags: string[];
  embedding: number[] | null;
  created_at: string;
  // Computed fields
  ingredients?: RecipeIngredient[];
  composite_score?: number;
  inventory_coverage?: number;
  missing_ingredients?: string[];
}

export interface RecipeStep {
  step: number;
  instruction: string;
  timer_minutes?: number;
  tip?: string;
}

export interface NutritionInfo {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  sodium_mg: number;
}

export interface RecipeIngredient {
  recipe_id: UUID;
  ingredient_id: UUID;
  quantity: number;
  unit: string;
  preparation: string | null;
  is_optional: boolean;
  substitute_ingredient_ids: UUID[] | null;
  // Joined
  ingredient?: Ingredient;
}

export interface GroceryListItem {
  id: UUID;
  household_id: UUID;
  ingredient_id: UUID;
  quantity_text: string;
  source: GroceryItemSource;
  added_by: UUID;
  assigned_to: UUID | null;
  is_purchased: boolean;
  estimated_price: number | null;
  actual_price: number | null;
  store_aisle: string | null;
  created_at: string;
  // Joined
  ingredient?: Ingredient;
}

export interface WasteLogEntry {
  id: UUID;
  household_id: UUID;
  inventory_item_id: UUID;
  ingredient_id: UUID;
  quantity_wasted: string;
  estimated_value: number;
  reason: WasteReason;
  wasted_at: string;
  // Joined
  ingredient?: Ingredient;
}

export interface UserRecipeInteraction {
  id: UUID;
  user_id: UUID;
  recipe_id: UUID;
  interaction_type: InteractionType;
  rating: number | null;
  cooked_servings: number;
  created_at: string;
}

export interface ScanHistoryEntry {
  id: UUID;
  user_id: UUID;
  scan_type: ScanType;
  photo_url: string | null;
  raw_api_response: any;
  items_detected: number;
  items_confirmed: number;
  items_corrected: number;
  processing_time_ms: number;
  api_cost_estimate: number;
  created_at: string;
}

// ── Vision API Types ───────────────────────────────────

export interface VisionScanItem {
  name: string;
  quantity: string;
  category: IngredientCategory;
  condition: 'fresh' | 'aging' | 'expired';
  confidence: number;
  notes?: string;
}

export interface VisionScanResult {
  items: VisionScanItem[];
  processing_time_ms: number;
}

// ── Recipe Ranking ─────────────────────────────────────

export interface RecipeScore {
  recipe_id: UUID;
  expiry_urgency: number;
  inventory_coverage: number;
  preference_fit: number;
  ease_score: number;
  nutrition_score: number;
  cost_efficiency: number;
  composite: number;
}

// ── Waste Analytics ────────────────────────────────────

export interface WasteMetrics {
  monthly_waste_score: number;
  money_saved: number;
  money_wasted: number;
  co2_saved_kg: number;
  items_rescued: number;
  items_wasted: number;
  most_wasted: { ingredient_name: string; count: number; total_value: number }[];
  trend: 'improving' | 'stable' | 'declining';
}
