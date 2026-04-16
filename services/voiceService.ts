// Voice Input Service - parses natural language into inventory items

import type { IngredientCategory } from '@/lib/types';

const ANTHROPIC_API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || '';
const MODEL = 'claude-sonnet-4-20250514';

export interface ParsedVoiceItem {
  name: string;
  quantity: string;
  category: IngredientCategory;
}

const SYSTEM_PROMPT = `You are a grocery item parser. The user just said something like "I just bought 2 dozen eggs and a bag of spinach."

Return ONLY a JSON array of items:
[
  { "name": "Eggs", "quantity": "2 dozen", "category": "Protein" },
  { "name": "Baby Spinach", "quantity": "1 bag", "category": "Produce" }
]

Categories must be one of: Produce, Dairy, Protein, Grains and Bread, Canned and Jarred, Frozen, Condiments and Sauces, Snacks, Beverages, Baking, Spices.

Rules:
- Extract every food item mentioned
- Normalize quantities (e.g., "couple of" -> "2", "a bag of" -> "1 bag")
- Use specific names where possible (e.g., "milk" -> "Whole Milk" if context suggests)
- Return [] if no food items mentioned`;

export async function parseVoiceText(text: string): Promise<ParsedVoiceItem[]> {
  if (!ANTHROPIC_API_KEY) {
    return getDemoVoiceItems(text);
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        temperature: 0.1,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: text }],
      }),
    });

    const data = await response.json();
    const content = data.content?.[0]?.text || '[]';
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];
    return JSON.parse(jsonMatch[0]);
  } catch {
    return getDemoVoiceItems(text);
  }
}

function getDemoVoiceItems(text: string): ParsedVoiceItem[] {
  // Simple keyword extraction for demo mode
  const lower = text.toLowerCase();
  const items: ParsedVoiceItem[] = [];
  const keywords: { match: string; item: ParsedVoiceItem }[] = [
    { match: 'egg', item: { name: 'Eggs', quantity: '1 dozen', category: 'Protein' } },
    { match: 'milk', item: { name: 'Whole Milk', quantity: '1 gallon', category: 'Dairy' } },
    { match: 'bread', item: { name: 'Sourdough Bread', quantity: '1 loaf', category: 'Grains and Bread' } },
    { match: 'spinach', item: { name: 'Baby Spinach', quantity: '1 bag', category: 'Produce' } },
    { match: 'chicken', item: { name: 'Chicken Breast', quantity: '1 lb', category: 'Protein' } },
    { match: 'cheese', item: { name: 'Cheddar Cheese', quantity: '1 block', category: 'Dairy' } },
    { match: 'yogurt', item: { name: 'Greek Yogurt', quantity: '1 cup', category: 'Dairy' } },
    { match: 'tomato', item: { name: 'Tomatoes', quantity: '3', category: 'Produce' } },
    { match: 'pepper', item: { name: 'Bell Pepper', quantity: '2', category: 'Produce' } },
    { match: 'banana', item: { name: 'Bananas', quantity: '1 bunch', category: 'Produce' } },
    { match: 'apple', item: { name: 'Apples', quantity: '4', category: 'Produce' } },
    { match: 'avocado', item: { name: 'Avocados', quantity: '2', category: 'Produce' } },
    { match: 'butter', item: { name: 'Butter', quantity: '1 stick', category: 'Dairy' } },
    { match: 'pasta', item: { name: 'Pasta', quantity: '1 box', category: 'Grains and Bread' } },
    { match: 'rice', item: { name: 'Rice', quantity: '1 bag', category: 'Grains and Bread' } },
  ];

  for (const k of keywords) {
    if (lower.includes(k.match)) items.push(k.item);
  }
  return items;
}

// Web Speech API wrapper for voice recognition (web only)
export function startWebSpeechRecognition(
  onResult: (text: string) => void,
  onError?: (err: any) => void
): { stop: () => void } | null {
  if (typeof window === 'undefined') return null;
  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SpeechRecognition) {
    onError?.(new Error('Speech recognition not supported in this browser'));
    return null;
  }
  const recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event: any) => {
    const transcript = event.results[0][0].transcript;
    onResult(transcript);
  };
  recognition.onerror = (event: any) => onError?.(event.error);
  recognition.start();

  return { stop: () => recognition.stop() };
}
