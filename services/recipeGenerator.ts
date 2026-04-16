// AI Recipe Generation Service - uses Claude to generate custom recipes from inventory

import type { Recipe, InventoryItem, NutritionInfo, RecipeStep } from '@/lib/types';

const ANTHROPIC_API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || '';
const RECIPE_MODEL = 'claude-sonnet-4-20250514';

interface GenerateRecipeOptions {
  prioritizeExpiring?: boolean;
  cuisine?: string;
  maxTimeMin?: number;
  dietaryRestrictions?: string[];
  servings?: number;
}

const SYSTEM_PROMPT = `You are a creative chef. Generate a recipe using the user's available ingredients, prioritizing items that are expiring soon.

Return ONLY a JSON object with this exact shape:
{
  "title": "Recipe name",
  "description": "1-2 sentence description",
  "cuisine": "cuisine type",
  "difficulty": "easy" | "medium" | "hard",
  "prep_time_min": number,
  "cook_time_min": number,
  "total_time_min": number,
  "servings": number,
  "ingredients": [
    { "name": "ingredient name", "quantity": "1", "unit": "cup", "preparation": "diced" }
  ],
  "instructions": [
    { "step": 1, "instruction": "Step text", "timer_minutes": null, "tip": null }
  ],
  "nutrition_per_serving": {
    "calories": number,
    "protein_g": number,
    "carbs_g": number,
    "fat_g": number,
    "fiber_g": number,
    "sodium_mg": number
  },
  "tags": ["quick", "healthy", etc.]
}

Rules:
- Only use ingredients from the provided list (or common pantry staples like salt, pepper, oil)
- Provide realistic, accurate nutrition estimates
- Make instructions clear and actionable
- Include timer_minutes for steps that need timing
- Add helpful tips where useful`;

export async function generateRecipe(
  availableItems: InventoryItem[],
  options: GenerateRecipeOptions = {}
): Promise<Recipe | null> {
  if (!ANTHROPIC_API_KEY) {
    return getDemoGeneratedRecipe();
  }

  const expiringFirst = options.prioritizeExpiring
    ? [...availableItems].sort(
        (a, b) =>
          new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime()
      )
    : availableItems;

  const inventoryList = expiringFirst.slice(0, 30).map((i) => {
    const daysUntilExpiry = Math.ceil(
      (new Date(i.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return `- ${i.ingredient?.name || 'Unknown'} (${i.quantity_text}, ${
      daysUntilExpiry <= 0 ? 'EXPIRED' : `${daysUntilExpiry} days left`
    })`;
  }).join('\n');

  const userPrompt = `Available ingredients:
${inventoryList}

${options.cuisine ? `Preferred cuisine: ${options.cuisine}` : ''}
${options.maxTimeMin ? `Max total time: ${options.maxTimeMin} minutes` : ''}
${options.servings ? `Servings: ${options.servings}` : 'Servings: 4'}
${options.dietaryRestrictions?.length ? `Restrictions: ${options.dietaryRestrictions.join(', ')}` : ''}

Generate a recipe that uses the most urgent (expiring) items first. Return ONLY the JSON object.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: RECIPE_MODEL,
        max_tokens: 2048,
        temperature: 0.7,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    return mapToRecipe(parsed);
  } catch {
    return null;
  }
}

function mapToRecipe(parsed: any): Recipe {
  return {
    id: `ai-${Date.now()}`,
    title: parsed.title,
    description: parsed.description,
    cuisine: parsed.cuisine,
    difficulty: parsed.difficulty,
    prep_time_min: parsed.prep_time_min,
    cook_time_min: parsed.cook_time_min,
    total_time_min: parsed.total_time_min,
    servings: parsed.servings,
    instructions: parsed.instructions as RecipeStep[],
    nutrition_per_serving: parsed.nutrition_per_serving as NutritionInfo,
    source_type: 'ai_generated',
    source_url: null,
    image_url: null,
    avg_rating: 0,
    rating_count: 0,
    tags: parsed.tags || [],
    embedding: null,
    created_at: new Date().toISOString(),
    ingredients: (parsed.ingredients || []).map((ing: any, idx: number) => ({
      recipe_id: `ai-${Date.now()}`,
      ingredient_id: `ai-ing-${idx}`,
      quantity: parseFloat(ing.quantity) || 1,
      unit: ing.unit || '',
      preparation: ing.preparation || null,
      is_optional: false,
      substitute_ingredient_ids: null,
      ingredient: {
        id: `ai-ing-${idx}`,
        name: ing.name,
        category: 'Produce' as any,
        subcategory: '',
        aliases: [],
        default_shelf_life_fridge_days: 7,
        default_shelf_life_freezer_days: 180,
        default_shelf_life_pantry_days: 30,
        default_shelf_life_opened_days: 5,
        storage_tips: '',
        ethylene_producer: false,
        ethylene_sensitive: false,
        common_substitutes: [],
        usda_fdc_id: null,
        barcode_ids: [],
        embedding: null,
      },
    })),
  };
}

function getDemoGeneratedRecipe(): Recipe {
  const id = `ai-demo-${Date.now()}`;
  return {
    id,
    title: 'Spinach & Egg Scramble with Cheese',
    description: 'A quick high-protein breakfast that uses your aging spinach and eggs before they expire.',
    cuisine: 'American',
    difficulty: 'easy',
    prep_time_min: 5,
    cook_time_min: 8,
    total_time_min: 13,
    servings: 2,
    instructions: [
      { step: 1, instruction: 'Wash the spinach and pat dry with a paper towel.', timer_minutes: undefined, tip: undefined },
      { step: 2, instruction: 'Crack 4 eggs into a bowl, whisk with a splash of milk and a pinch of salt.', timer_minutes: undefined, tip: 'Adding milk makes them fluffier.' },
      { step: 3, instruction: 'Heat butter in a non-stick pan over medium heat.', timer_minutes: 1, tip: undefined },
      { step: 4, instruction: 'Add spinach and saute until wilted (about 1 minute).', timer_minutes: 1, tip: undefined },
      { step: 5, instruction: 'Pour in eggs, gently scramble for 2-3 minutes.', timer_minutes: 3, tip: 'Take off heat while still slightly wet - residual heat will finish.' },
      { step: 6, instruction: 'Sprinkle shredded cheese on top, fold and serve immediately.', timer_minutes: undefined, tip: undefined },
    ],
    nutrition_per_serving: {
      calories: 285,
      protein_g: 21,
      carbs_g: 4,
      fat_g: 20,
      fiber_g: 2,
      sodium_mg: 340,
    },
    source_type: 'ai_generated',
    source_url: null,
    image_url: null,
    avg_rating: 0,
    rating_count: 0,
    tags: ['quick', 'high-protein', 'breakfast', 'expiry-rescue'],
    embedding: null,
    created_at: new Date().toISOString(),
    ingredients: [
      { recipe_id: id, ingredient_id: 'eggs', quantity: 4, unit: 'whole', preparation: null, is_optional: false, substitute_ingredient_ids: null, ingredient: { id: 'eggs', name: 'Eggs', category: 'Protein' as any } as any },
      { recipe_id: id, ingredient_id: 'spinach', quantity: 2, unit: 'cups', preparation: 'fresh', is_optional: false, substitute_ingredient_ids: null, ingredient: { id: 'spinach', name: 'Baby Spinach', category: 'Produce' as any } as any },
      { recipe_id: id, ingredient_id: 'cheese', quantity: 0.5, unit: 'cup', preparation: 'shredded', is_optional: false, substitute_ingredient_ids: null, ingredient: { id: 'cheese', name: 'Cheddar Cheese', category: 'Dairy' as any } as any },
      { recipe_id: id, ingredient_id: 'butter', quantity: 1, unit: 'tbsp', preparation: null, is_optional: false, substitute_ingredient_ids: null, ingredient: { id: 'butter', name: 'Butter', category: 'Dairy' as any } as any },
      { recipe_id: id, ingredient_id: 'milk', quantity: 2, unit: 'tbsp', preparation: null, is_optional: true, substitute_ingredient_ids: null, ingredient: { id: 'milk', name: 'Milk', category: 'Dairy' as any } as any },
    ],
  };
}
