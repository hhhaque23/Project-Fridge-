// Aisle Auto-Learning - learns user's preferred store layout from check-off order
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const STORAGE_KEY = 'freshscan_aisle_layout_v1';

const webStorage = {
  getItem: (k: string) => Promise.resolve(typeof window !== 'undefined' ? window.localStorage.getItem(k) : null),
  setItem: (k: string, v: string) => {
    if (typeof window !== 'undefined') window.localStorage.setItem(k, v);
    return Promise.resolve();
  },
};
const storage = Platform.OS === 'web' ? webStorage : AsyncStorage;

// Default aisle order (most common US grocery store layout)
const DEFAULT_AISLE_ORDER: Record<string, number> = {
  'Produce': 1,
  'Bakery': 2,
  'Grains and Bread': 3,
  'Dairy': 4,
  'Protein': 5,
  'Frozen': 6,
  'Canned and Jarred': 7,
  'Condiments and Sauces': 8,
  'Baking': 9,
  'Spices': 10,
  'Snacks': 11,
  'Beverages': 12,
};

export interface AisleLayout {
  store_name: string | null;
  category_order: Record<string, number>;
  checkoff_history: { category: string; timestamp: string }[];
  visit_count: number;
  last_updated: string;
}

export async function getLayout(storeName?: string): Promise<AisleLayout> {
  const stored = await storage.getItem(STORAGE_KEY);
  if (!stored) {
    return {
      store_name: storeName || null,
      category_order: { ...DEFAULT_AISLE_ORDER },
      checkoff_history: [],
      visit_count: 0,
      last_updated: new Date().toISOString(),
    };
  }
  return JSON.parse(stored);
}

export async function recordCheckoff(category: string): Promise<void> {
  const layout = await getLayout();
  layout.checkoff_history.push({ category, timestamp: new Date().toISOString() });
  // Keep last 200 check-offs
  if (layout.checkoff_history.length > 200) {
    layout.checkoff_history = layout.checkoff_history.slice(-200);
  }
  layout.last_updated = new Date().toISOString();
  await storage.setItem(STORAGE_KEY, JSON.stringify(layout));
}

// Update layout based on recent check-off patterns
export async function recomputeLayout(): Promise<AisleLayout> {
  const layout = await getLayout();
  if (layout.checkoff_history.length < 5) return layout;

  // Compute average position of each category in recent visits
  // Group consecutive check-offs by visit (gaps > 30min = new visit)
  const visits: string[][] = [[]];
  for (let i = 0; i < layout.checkoff_history.length; i++) {
    const c = layout.checkoff_history[i];
    if (i === 0) {
      visits[0].push(c.category);
      continue;
    }
    const prev = layout.checkoff_history[i - 1];
    const gapMin = (new Date(c.timestamp).getTime() - new Date(prev.timestamp).getTime()) / 60000;
    if (gapMin > 30) visits.push([c.category]);
    else visits[visits.length - 1].push(c.category);
  }

  // Average positions
  const positionSum: Record<string, number> = {};
  const positionCount: Record<string, number> = {};
  for (const visit of visits) {
    visit.forEach((cat, idx) => {
      positionSum[cat] = (positionSum[cat] || 0) + idx;
      positionCount[cat] = (positionCount[cat] || 0) + 1;
    });
  }

  const categoryOrder: Record<string, number> = {};
  Object.keys(positionSum).forEach((cat) => {
    categoryOrder[cat] = positionSum[cat] / positionCount[cat];
  });
  // Add unvisited categories at the end with default order
  Object.entries(DEFAULT_AISLE_ORDER).forEach(([cat, order]) => {
    if (!(cat in categoryOrder)) {
      categoryOrder[cat] = 100 + order; // push to end
    }
  });

  layout.category_order = categoryOrder;
  layout.visit_count = visits.length;
  layout.last_updated = new Date().toISOString();
  await storage.setItem(STORAGE_KEY, JSON.stringify(layout));
  return layout;
}

export function sortByAisle<T extends { ingredient?: { category?: string } | null }>(
  items: T[],
  layout: AisleLayout
): T[] {
  return [...items].sort((a, b) => {
    const catA = a.ingredient?.category || 'Snacks';
    const catB = b.ingredient?.category || 'Snacks';
    const orderA = layout.category_order[catA] ?? 100;
    const orderB = layout.category_order[catB] ?? 100;
    return orderA - orderB;
  });
}

export async function getOrderedCategories(): Promise<string[]> {
  const layout = await getLayout();
  return Object.entries(layout.category_order)
    .sort((a, b) => a[1] - b[1])
    .map(([cat]) => cat);
}
