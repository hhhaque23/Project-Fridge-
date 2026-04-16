// Barcode lookup using Open Food Facts API (free, 3M+ products)

import type { IngredientCategory } from '@/lib/types';

export interface BarcodeProduct {
  barcode: string;
  name: string;
  brand: string;
  category: IngredientCategory;
  image_url: string | null;
  nutrition?: {
    calories_per_100g?: number;
    protein_g?: number;
    carbs_g?: number;
    fat_g?: number;
  };
  default_shelf_life_days?: number;
}

const CATEGORY_MAP: Record<string, IngredientCategory> = {
  dairy: 'Dairy',
  cheese: 'Dairy',
  yogurt: 'Dairy',
  milk: 'Dairy',
  meat: 'Protein',
  poultry: 'Protein',
  fish: 'Protein',
  seafood: 'Protein',
  produce: 'Produce',
  fruit: 'Produce',
  vegetable: 'Produce',
  fruits: 'Produce',
  vegetables: 'Produce',
  bread: 'Grains and Bread',
  cereal: 'Grains and Bread',
  pasta: 'Grains and Bread',
  rice: 'Grains and Bread',
  canned: 'Canned and Jarred',
  jarred: 'Canned and Jarred',
  frozen: 'Frozen',
  sauce: 'Condiments and Sauces',
  condiment: 'Condiments and Sauces',
  oil: 'Condiments and Sauces',
  vinegar: 'Condiments and Sauces',
  snack: 'Snacks',
  chips: 'Snacks',
  cracker: 'Snacks',
  beverage: 'Beverages',
  drink: 'Beverages',
  juice: 'Beverages',
  baking: 'Baking',
  flour: 'Baking',
  sugar: 'Baking',
  spice: 'Spices',
};

function inferCategory(text: string): IngredientCategory {
  const lower = text.toLowerCase();
  for (const [keyword, category] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(keyword)) return category;
  }
  return 'Snacks';
}

export async function lookupBarcode(barcode: string): Promise<BarcodeProduct | null> {
  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`
    );
    if (!response.ok) return null;
    const data = await response.json();
    if (data.status === 0 || !data.product) {
      return null;
    }
    const p = data.product;
    const categoryText = (p.categories || '') + ' ' + (p.product_name || '');
    return {
      barcode,
      name: p.product_name || 'Unknown product',
      brand: p.brands || '',
      category: inferCategory(categoryText),
      image_url: p.image_url || null,
      nutrition: p.nutriments
        ? {
            calories_per_100g: p.nutriments['energy-kcal_100g'],
            protein_g: p.nutriments['proteins_100g'],
            carbs_g: p.nutriments['carbohydrates_100g'],
            fat_g: p.nutriments['fat_100g'],
          }
        : undefined,
    };
  } catch {
    return null;
  }
}
