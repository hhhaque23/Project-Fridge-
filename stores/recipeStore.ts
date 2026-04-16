import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { Recipe, RecipeScore, InventoryItem } from '@/lib/types';

interface RecipeState {
  recipes: Recipe[];
  rankedRecipes: (Recipe & { score: RecipeScore })[];
  cookNowRecipes: Recipe[];
  almostThereRecipes: Recipe[];
  isLoading: boolean;

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

export const useRecipeStore = create<RecipeState>((set, get) => ({
  recipes: [],
  rankedRecipes: [],
  cookNowRecipes: [],
  almostThereRecipes: [],
  isLoading: false,

  fetchRecipes: async () => {
    set({ isLoading: true });
    const { data } = await supabase
      .from('recipes')
      .select('*, ingredients:recipe_ingredients(*, ingredient:ingredients(*))')
      .order('avg_rating', { ascending: false })
      .limit(200);

    set({ recipes: data || [], isLoading: false });
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
