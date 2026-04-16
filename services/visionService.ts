import * as FileSystem from 'expo-file-system';
import type { VisionScanItem } from '@/lib/types';

const ANTHROPIC_API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || '';
const VISION_MODEL = 'claude-sonnet-4-20250514';

const SYSTEM_PROMPT = `You are a food inventory scanner. Analyze this photo of a refrigerator/pantry shelf. Return a JSON array of every distinct food item visible.

Each item must include:
- name (string): the specific food item name (e.g., "Chobani Greek Yogurt", "Whole Milk", "Red Bell Pepper")
- quantity (string): estimated quantity (e.g., "3 eggs", "half gallon", "1 bunch")
- category (string): one of: Produce, Dairy, Protein, Grains and Bread, Canned and Jarred, Frozen, Condiments and Sauces, Snacks, Beverages, Baking, Spices
- condition (string): one of: fresh, aging, expired
- confidence (number): 0-100 confidence score for identification accuracy
- notes (string, optional): any relevant observation

Rules:
- Do NOT identify non-food items (containers, shelving, appliances)
- Do NOT guess items that are fully obscured
- For packaged goods, read the label text when possible
- For produce, distinguish between similar items (lemon vs lime, cilantro vs parsley)
- Estimate fill level for bottles/jars (full, half, low)

Return ONLY a valid JSON array, no other text.`;

export async function scanFridgeImage(imageUri: string): Promise<VisionScanItem[]> {
  if (!ANTHROPIC_API_KEY) {
    // Return demo data when no API key is set
    return getDemoScanResults();
  }

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
      model: VISION_MODEL,
      max_tokens: 4096,
      temperature: 0.1,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: base64,
              },
            },
            {
              type: 'text',
              text: 'Identify all food items in this image.',
            },
          ],
        },
      ],
    }),
  });

  const data = await response.json();
  const text = data.content?.[0]?.text || '[]';

  // Extract JSON array from response
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  const items: VisionScanItem[] = JSON.parse(jsonMatch[0]);
  return items;
}

function getDemoScanResults(): VisionScanItem[] {
  return [
    { name: 'Whole Milk', quantity: '1 gallon, 3/4 full', category: 'Dairy', condition: 'fresh', confidence: 95 },
    { name: 'Eggs', quantity: '8 remaining', category: 'Protein', condition: 'fresh', confidence: 92 },
    { name: 'Cheddar Cheese', quantity: '1 block, half used', category: 'Dairy', condition: 'fresh', confidence: 88 },
    { name: 'Baby Spinach', quantity: '1 bag, mostly full', category: 'Produce', condition: 'aging', confidence: 85 },
    { name: 'Red Bell Pepper', quantity: '2', category: 'Produce', condition: 'fresh', confidence: 90 },
    { name: 'Greek Yogurt', quantity: '3 cups', category: 'Dairy', condition: 'fresh', confidence: 87 },
    { name: 'Chicken Breast', quantity: '1 pack', category: 'Protein', condition: 'fresh', confidence: 78 },
    { name: 'Strawberries', quantity: '1 container', category: 'Produce', condition: 'aging', confidence: 82 },
    { name: 'Orange Juice', quantity: '1 carton, half full', category: 'Beverages', condition: 'fresh', confidence: 91 },
    { name: 'Butter', quantity: '1 stick', category: 'Dairy', condition: 'fresh', confidence: 70, notes: 'Partially obscured' },
  ];
}
