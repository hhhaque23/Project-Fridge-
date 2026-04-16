// Receipt OCR Service - extracts line items from receipt photos using Claude Vision
import * as FileSystem from 'expo-file-system';
import type { IngredientCategory } from '@/lib/types';

const ANTHROPIC_API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || '';
const MODEL = 'claude-sonnet-4-20250514';

export interface ReceiptLineItem {
  name: string;
  quantity: string;
  price: number | null;
  category: IngredientCategory;
  is_food: boolean;
}

export interface ReceiptScanResult {
  store: string | null;
  date: string | null;
  total: number | null;
  items: ReceiptLineItem[];
}

const SYSTEM_PROMPT = `You are a grocery receipt parser. Extract ALL line items from this receipt photo.

Return ONLY a JSON object:
{
  "store": "store name or null",
  "date": "YYYY-MM-DD or null",
  "total": total amount as number or null,
  "items": [
    {
      "name": "item name (clean, expanded if abbreviated)",
      "quantity": "quantity if shown, e.g. '2 lb' or '1 ea'",
      "price": price as number or null,
      "category": "Produce|Dairy|Protein|Grains and Bread|Canned and Jarred|Frozen|Condiments and Sauces|Snacks|Beverages|Baking|Spices",
      "is_food": true/false
    }
  ]
}

Rules:
- Expand abbreviations (e.g. "MLK 2%" -> "2% Milk", "ORG SPNCH" -> "Organic Spinach")
- Skip non-food items (paper towels, batteries) but include them with is_food: false
- Skip discount lines, tax lines, totals
- For each food item, classify into the right category`;

export async function scanReceipt(imageUri: string): Promise<ReceiptScanResult> {
  if (!ANTHROPIC_API_KEY) {
    return getDemoReceipt();
  }

  try {
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: 'base64' as any,
    });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4096,
        temperature: 0.1,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
              { type: 'text', text: 'Extract every line item from this receipt.' },
            ],
          },
        ],
      }),
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || '{}';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return getDemoReceipt();
    return JSON.parse(jsonMatch[0]);
  } catch {
    return getDemoReceipt();
  }
}

function getDemoReceipt(): ReceiptScanResult {
  return {
    store: 'Trader Joe\'s',
    date: new Date().toISOString().split('T')[0],
    total: 47.83,
    items: [
      { name: 'Organic Baby Spinach', quantity: '5 oz bag', price: 2.49, category: 'Produce', is_food: true },
      { name: '2% Reduced Fat Milk', quantity: '1 gallon', price: 4.29, category: 'Dairy', is_food: true },
      { name: 'Free-Range Eggs', quantity: '1 dozen', price: 5.49, category: 'Protein', is_food: true },
      { name: 'Sourdough Bread', quantity: '1 loaf', price: 3.49, category: 'Grains and Bread', is_food: true },
      { name: 'Greek Yogurt Plain', quantity: '32 oz', price: 4.99, category: 'Dairy', is_food: true },
      { name: 'Chicken Breast', quantity: '1.5 lb', price: 8.99, category: 'Protein', is_food: true },
      { name: 'Red Bell Peppers', quantity: '3 ct', price: 3.50, category: 'Produce', is_food: true },
      { name: 'Cheddar Cheese Block', quantity: '8 oz', price: 4.99, category: 'Dairy', is_food: true },
      { name: 'Strawberries', quantity: '1 lb', price: 4.99, category: 'Produce', is_food: true },
      { name: 'Paper Towels', quantity: '6 pack', price: 8.99, category: 'Snacks', is_food: false },
    ],
  };
}
