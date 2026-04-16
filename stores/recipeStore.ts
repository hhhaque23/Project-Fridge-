import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { Recipe, RecipeScore, InventoryItem } from '@/lib/types';

interface RecipeState {
  recipes: Recipe[];
  rankedRecipes: (Recipe & { score: RecipeScore })[];
  cookNowRecipes: Recipe[];
  almostThereRecipes: Recipe[];
  isLoading: boolean;

  hasInitializedDemo?: boolean;
  loadDemoIfEmpty?: () => void;
  fetchRecipes: () => Promise<void>;
  rankRecipes: (inventoryItems: InventoryItem[]) => void;
  getRecipeById: (id: string) => Recipe | undefined;
  searchRecipes: (query: string) => Recipe[];
}

function calculateRecipeScore(
  recipe: Recipe,
  inventoryItems: InventoryItem[]
): RecipeScore {
  const recipeIngredients = recipe.ingredients || [];
  const inventoryIngredientIds = new Set(inventoryItems.map((i) => i.ingredient_id));

  // Inventory Coverage (25%)
  const totalIngredients = recipeIngredients.filter((ri) => !ri.is_optional).length;
  const availableCount = recipeIngredients.filter(
    (ri) => !ri.is_optional && inventoryIngredientIds.has(ri.ingredient_id)
  ).length;
  const inventory_coverage = totalIngredients > 0 ? availableCount / totalIngredients : 0;

  // Expiry Urgency (35%)
  const now = new Date();
  let expiry_urgency = 0;
  for (const ri of recipeIngredients) {
    const invItem = inventoryItems.find((i) => i.ingredient_id === ri.ingredient_id);
    if (invItem) {
      const daysUntilExpiry = Math.max(
        0,
        (new Date(invItem.expiry_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntilExpiry <= 1) expiry_urgency += 10;
      else if (daysUntilExpiry <= 2) expiry_urgency += 7;
      else if (daysUntilExpiry <= 3) expiry_urgency += 4;
      else if (daysUntilExpiry <= 5) expiry_urgency += 1;
    }
  }
  expiry_urgency = Math.min(1, expiry_urgency / 10);

  // Ease Score (10%)
  const ease_score = Math.max(0, 1 - (recipe.total_time_min / 120));

  // Nutrition Score (10%) - simplified
  const nutrition_score = recipe.nutrition_per_serving
    ? Math.min(1, recipe.nutrition_per_serving.protein_g / 30)
    : 0.5;

  // Cost Efficiency (5%) - simplified
  const missingCount = totalIngredients - availableCount;
  const cost_efficiency = Math.max(0, 1 - missingCount * 0.2);

  // Preference Fit (15%) - placeholder, needs user history
  const preference_fit = 0.5;

  const composite =
    0.35 * expiry_urgency +
    0.25 * inventory_coverage +
    0.15 * preference_fit +
    0.10 * ease_score +
    0.10 * nutrition_score +
    0.05 * cost_efficiency;

  return {
    recipe_id: recipe.id,
    expiry_urgency,
    inventory_coverage,
    preference_fit,
    ease_score,
    nutrition_score,
    cost_efficiency,
    composite,
  };
}

function getDemoRecipes(): Recipe[] {
  const baseIng = (id: string, name: string) => ({
    id, name, category: 'Produce' as any, subcategory: '', aliases: [],
    default_shelf_life_fridge_days: 7, default_shelf_life_freezer_days: 180,
    default_shelf_life_pantry_days: 14, default_shelf_life_opened_days: 4,
    storage_tips: '', ethylene_producer: false, ethylene_sensitive: false,
    common_substitutes: [], usda_fdc_id: null, barcode_ids: [], embedding: null,
  });

  return [
    {
      id: 'r1', title: 'Spinach & Mushroom Frittata', description: 'Quick high-protein meal that uses up wilting spinach and aging eggs.',
      cuisine: 'Italian', difficulty: 'easy', prep_time_min: 10, cook_time_min: 15, total_time_min: 25,
      servings: 4, source_type: 'curated', source_url: null, image_url: null,
      avg_rating: 4.6, rating_count: 312, tags: ['quick', 'high-protein', 'vegetarian'],
      embedding: null, created_at: new Date().toISOString(),
      instructions: [
        { step: 1, instruction: 'Preheat oven to 375F. Whisk 8 eggs in a bowl with salt and pepper.' },
        { step: 2, instruction: 'In an oven-safe skillet, sauté mushrooms in butter for 5 min.', timer_minutes: 5 },
        { step: 3, instruction: 'Add spinach, cook until wilted, 1 min.', timer_minutes: 1 },
        { step: 4, instruction: 'Pour eggs over veggies, sprinkle cheese on top.' },
        { step: 5, instruction: 'Bake 15 min until set in the center.', timer_minutes: 15 },
      ],
      nutrition_per_serving: { calories: 245, protein_g: 18, carbs_g: 4, fat_g: 17, fiber_g: 1, sodium_mg: 320 },
      ingredients: [
        { recipe_id: 'r1', ingredient_id: 'ing-eggs', quantity: 8, unit: 'whole', preparation: null, is_optional: false, substitute_ingredient_ids: null, ingredient: baseIng('ing-eggs', 'Eggs') },
        { recipe_id: 'r1', ingredient_id: 'ing-spinach', quantity: 2, unit: 'cups', preparation: 'fresh', is_optional: false, substitute_ingredient_ids: null, ingredient: baseIng('ing-spinach', 'Baby Spinach') },
        { recipe_id: 'r1', ingredient_id: 'ing-cheese', quantity: 0.5, unit: 'cup', preparation: 'shredded', is_optional: false, substitute_ingredient_ids: null, ingredient: baseIng('ing-cheese', 'Cheddar Cheese') },
      ],
    },
    {
      id: 'r2', title: 'Chicken Stir Fry', description: 'Use up your chicken before it expires with this 20-min stir fry.',
      cuisine: 'Asian', difficulty: 'easy', prep_time_min: 10, cook_time_min: 10, total_time_min: 20,
      servings: 4, source_type: 'curated', source_url: null, image_url: null,
      avg_rating: 4.8, rating_count: 521, tags: ['quick', 'one-pan'],
      embedding: null, created_at: new Date().toISOString(),
      instructions: [
        { step: 1, instruction: 'Slice chicken into thin strips. Season with soy sauce.' },
        { step: 2, instruction: 'Heat oil in wok over high heat. Sear chicken 5 min.', timer_minutes: 5 },
        { step: 3, instruction: 'Add bell peppers and stir fry 3 more min.', timer_minutes: 3 },
        { step: 4, instruction: 'Toss with sauce. Serve over rice.' },
      ],
      nutrition_per_serving: { calories: 320, protein_g: 32, carbs_g: 12, fat_g: 16, fiber_g: 3, sodium_mg: 580 },
      ingredients: [
        { recipe_id: 'r2', ingredient_id: 'ing-chicken', quantity: 1, unit: 'lb', preparation: 'sliced', is_optional: false, substitute_ingredient_ids: null, ingredient: baseIng('ing-chicken', 'Chicken Breast') },
        { recipe_id: 'r2', ingredient_id: 'ing-pepper', quantity: 2, unit: 'whole', preparation: 'sliced', is_optional: false, substitute_ingredient_ids: null, ingredient: baseIng('ing-pepper', 'Red Bell Pepper') },
      ],
    },
    {
      id: 'r3', title: 'Strawberry Yogurt Parfait', description: 'Rescue strawberries before they spoil with this 5-minute breakfast.',
      cuisine: 'American', difficulty: 'easy', prep_time_min: 5, cook_time_min: 0, total_time_min: 5,
      servings: 2, source_type: 'curated', source_url: null, image_url: null,
      avg_rating: 4.5, rating_count: 198, tags: ['no-cook', 'breakfast', 'quick'],
      embedding: null, created_at: new Date().toISOString(),
      instructions: [
        { step: 1, instruction: 'Slice strawberries.' },
        { step: 2, instruction: 'Layer yogurt, berries, granola in a glass.' },
        { step: 3, instruction: 'Drizzle with honey if desired.' },
      ],
      nutrition_per_serving: { calories: 220, protein_g: 14, carbs_g: 32, fat_g: 4, fiber_g: 5, sodium_mg: 80 },
      ingredients: [
        { recipe_id: 'r3', ingredient_id: 'ing-strawberries', quantity: 1, unit: 'cup', preparation: 'sliced', is_optional: false, substitute_ingredient_ids: null, ingredient: baseIng('ing-strawberries', 'Strawberries') },
        { recipe_id: 'r3', ingredient_id: 'ing-yogurt', quantity: 2, unit: 'cups', preparation: null, is_optional: false, substitute_ingredient_ids: null, ingredient: baseIng('ing-yogurt', 'Greek Yogurt') },
      ],
    },
    {
      id: 'r4', title: 'French Toast', description: 'A weekend classic that uses up bread before it goes stale.',
      cuisine: 'American', difficulty: 'easy', prep_time_min: 5, cook_time_min: 10, total_time_min: 15,
      servings: 2, source_type: 'curated', source_url: null, image_url: null,
      avg_rating: 4.7, rating_count: 412, tags: ['breakfast', 'quick'],
      embedding: null, created_at: new Date().toISOString(),
      instructions: [
        { step: 1, instruction: 'Whisk 3 eggs with milk, cinnamon, and vanilla in a bowl.' },
        { step: 2, instruction: 'Soak bread slices for 30 sec each side.' },
        { step: 3, instruction: 'Cook in butter on medium heat, 2-3 min per side.', timer_minutes: 6 },
        { step: 4, instruction: 'Serve with maple syrup and powdered sugar.' },
      ],
      nutrition_per_serving: { calories: 285, protein_g: 12, carbs_g: 32, fat_g: 12, fiber_g: 2, sodium_mg: 320 },
      ingredients: [
        { recipe_id: 'r4', ingredient_id: 'ing-bread', quantity: 4, unit: 'slices', preparation: null, is_optional: false, substitute_ingredient_ids: null, ingredient: baseIng('ing-bread', 'Sourdough Bread') },
        { recipe_id: 'r4', ingredient_id: 'ing-eggs', quantity: 3, unit: 'whole', preparation: null, is_optional: false, substitute_ingredient_ids: null, ingredient: baseIng('ing-eggs', 'Eggs') },
        { recipe_id: 'r4', ingredient_id: 'ing-milk', quantity: 0.5, unit: 'cup', preparation: null, is_optional: false, substitute_ingredient_ids: null, ingredient: baseIng('ing-milk', 'Milk') },
      ],
    },
    {
      id: 'r5', title: 'Caprese Salad', description: 'Simple Italian salad - just three ingredients.',
      cuisine: 'Italian', difficulty: 'easy', prep_time_min: 5, cook_time_min: 0, total_time_min: 5,
      servings: 2, source_type: 'curated', source_url: null, image_url: null,
      avg_rating: 4.4, rating_count: 156, tags: ['no-cook', 'vegetarian'],
      embedding: null, created_at: new Date().toISOString(),
      instructions: [
        { step: 1, instruction: 'Slice tomatoes and mozzarella.' },
        { step: 2, instruction: 'Layer on plate with basil leaves.' },
        { step: 3, instruction: 'Drizzle olive oil and balsamic. Season with salt.' },
      ],
      nutrition_per_serving: { calories: 285, protein_g: 14, carbs_g: 8, fat_g: 22, fiber_g: 2, sodium_mg: 380 },
      ingredients: [
        { recipe_id: 'r5', ingredient_id: 'ing-tomato', quantity: 2, unit: 'whole', preparation: 'sliced', is_optional: false, substitute_ingredient_ids: null, ingredient: baseIng('ing-tomato', 'Tomato') },
        { recipe_id: 'r5', ingredient_id: 'ing-mozzarella', quantity: 1, unit: 'ball', preparation: 'sliced', is_optional: false, substitute_ingredient_ids: null, ingredient: baseIng('ing-mozzarella', 'Mozzarella') },
      ],
    },
    {
      id: 'r6', title: 'Veggie Pasta Primavera', description: 'A 25-min pasta loaded with whatever veggies you have.',
      cuisine: 'Italian', difficulty: 'medium', prep_time_min: 10, cook_time_min: 15, total_time_min: 25,
      servings: 4, source_type: 'curated', source_url: null, image_url: null,
      avg_rating: 4.5, rating_count: 287, tags: ['vegetarian', 'pasta'],
      embedding: null, created_at: new Date().toISOString(),
      instructions: [
        { step: 1, instruction: 'Boil pasta to package directions.', timer_minutes: 10 },
        { step: 2, instruction: 'Sauté chopped peppers, spinach, and garlic in olive oil.', timer_minutes: 5 },
        { step: 3, instruction: 'Toss pasta with veggies and parmesan cheese.' },
      ],
      nutrition_per_serving: { calories: 410, protein_g: 14, carbs_g: 65, fat_g: 12, fiber_g: 5, sodium_mg: 380 },
      ingredients: [
        { recipe_id: 'r6', ingredient_id: 'ing-pasta', quantity: 1, unit: 'lb', preparation: null, is_optional: false, substitute_ingredient_ids: null, ingredient: baseIng('ing-pasta', 'Pasta') },
        { recipe_id: 'r6', ingredient_id: 'ing-spinach', quantity: 1, unit: 'cup', preparation: null, is_optional: false, substitute_ingredient_ids: null, ingredient: baseIng('ing-spinach', 'Baby Spinach') },
        { recipe_id: 'r6', ingredient_id: 'ing-pepper', quantity: 1, unit: 'whole', preparation: 'diced', is_optional: false, substitute_ingredient_ids: null, ingredient: baseIng('ing-pepper', 'Red Bell Pepper') },
      ],
    },
  ];
}

export const useRecipeStore = create<RecipeState>((set, get) => ({
  recipes: [],
  rankedRecipes: [],
  cookNowRecipes: [],
  almostThereRecipes: [],
  isLoading: false,
  hasInitializedDemo: false,

  loadDemoIfEmpty: () => {
    const state = get();
    if ((state as any).hasInitializedDemo) return;
    const demos = getDemoRecipes();
    set({ recipes: demos, hasInitializedDemo: true } as any);
  },

  fetchRecipes: async () => {
    set({ isLoading: true });
    try {
      const { data } = await supabase
        .from('recipes')
        .select('*, ingredients:recipe_ingredients(*, ingredient:ingredients(*))')
        .order('avg_rating', { ascending: false })
        .limit(200);

      // Don't wipe demo data if Supabase returns nothing (demo mode)
      if (data && data.length > 0) {
        set({ recipes: data, isLoading: false, hasInitializedDemo: true } as any);
      } else {
        // Fall back to demo recipes
        set({ recipes: getDemoRecipes(), isLoading: false, hasInitializedDemo: true } as any);
      }
    } catch {
      set({ recipes: getDemoRecipes(), isLoading: false, hasInitializedDemo: true } as any);
    }
  },

  rankRecipes: (inventoryItems: InventoryItem[]) => {
    const { recipes } = get();
    const inventoryIngredientIds = new Set(inventoryItems.map((i) => i.ingredient_id));

    const scored = recipes.map((recipe) => ({
      ...recipe,
      score: calculateRecipeScore(recipe, inventoryItems),
    }));

    scored.sort((a, b) => b.score.composite - a.score.composite);

    const cookNow = scored
      .filter((r) => r.score.inventory_coverage === 1)
      .map(({ score, ...recipe }) => recipe);

    const almostThere = scored
      .filter((r) => {
        const total = (r.ingredients || []).filter((i) => !i.is_optional).length;
        const missing = total - Math.round(r.score.inventory_coverage * total);
        return missing >= 1 && missing <= 2;
      })
      .map(({ score, ...recipe }) => recipe);

    set({
      rankedRecipes: scored,
      cookNowRecipes: cookNow,
      almostThereRecipes: almostThere,
    });
  },

  getRecipeById: (id: string) => {
    return get().recipes.find((r) => r.id === id);
  },

  searchRecipes: (query: string) => {
    const q = query.toLowerCase();
    return get().recipes.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.cuisine.toLowerCase().includes(q) ||
        r.tags.some((t) => t.toLowerCase().includes(q))
    );
  },
}));
