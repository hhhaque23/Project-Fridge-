import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { InventoryItem, StorageLocation, InventoryStatus } from '@/lib/types';

interface InventoryState {
  items: InventoryItem[];
  isLoading: boolean;
  hasInitializedDemo: boolean;
  filter: {
    location: StorageLocation | 'all';
    status: InventoryStatus | 'all';
    category: string | 'all';
    search: string;
  };

  fetchItems: (householdId: string) => Promise<void>;
  loadDemoIfEmpty: () => void;
  addItem: (item: Partial<InventoryItem>) => Promise<InventoryItem | null>;
  updateItem: (id: string, updates: Partial<InventoryItem>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  markAsOpened: (id: string) => Promise<void>;
  moveLocation: (id: string, newLocation: StorageLocation) => Promise<void>;
  freezeToSave: (id: string) => Promise<void>;
  markConsumed: (id: string) => Promise<void>;
  markWasted: (id: string, reason: string) => Promise<void>;
  setFilter: (filter: Partial<InventoryState['filter']>) => void;
  getFilteredItems: () => InventoryItem[];
}

function getDemoItems(): InventoryItem[] {
  // Build dates from a stable reference (today at 00:00 client local time, computed once on client)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isoDate = (n: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + n);
    return d.toISOString().split('T')[0];
  };
  const isoTs = today.toISOString();

  const baseIngredient = (name: string, category: any, fridge = 7, freezer = 180) => ({
    id: `ing-${name.toLowerCase().replace(/\s+/g, '-')}`,
    name,
    category,
    subcategory: '',
    aliases: [],
    default_shelf_life_fridge_days: fridge,
    default_shelf_life_freezer_days: freezer,
    default_shelf_life_pantry_days: 14,
    default_shelf_life_opened_days: 4,
    storage_tips: '',
    ethylene_producer: false,
    ethylene_sensitive: false,
    common_substitutes: [],
    usda_fdc_id: null,
    barcode_ids: [],
    embedding: null,
  });

  const make = (
    id: string,
    name: string,
    category: any,
    qty: string,
    location: StorageLocation,
    expiresInDays: number,
    originalDays: number,
    isOpened: boolean,
    price: number,
    source: any = 'vision_scan',
    confidence: number | null = 90,
    fridgeDays = 7
  ): InventoryItem => ({
    id,
    household_id: 'demo',
    ingredient_id: `ing-${name.toLowerCase().replace(/\s+/g, '-')}`,
    storage_location: location,
    quantity_text: qty,
    quantity_numeric: null,
    is_opened: isOpened,
    expiry_date: isoDate(expiresInDays),
    original_expiry_date: isoDate(originalDays),
    purchase_date: isoDate(-Math.max(1, originalDays - expiresInDays)),
    purchase_price: price,
    purchased_by: null,
    source,
    confidence_score: confidence,
    photo_url: null,
    status: expiresInDays <= 0 ? 'expiring_today' : expiresInDays <= 3 ? 'expiring_soon' : 'fresh',
    frozen_to_save: null,
    notes: null,
    created_at: isoTs,
    updated_at: isoTs,
    ingredient: baseIngredient(name, category, fridgeDays),
  });

  return [
    make('1', 'Baby Spinach', 'Produce', '1 bag', 'crisper', 1, 7, true, 3.99, 'vision_scan', 88, 5),
    make('2', 'Eggs', 'Protein', '8 remaining', 'fridge_door', 14, 21, true, 5.49, 'vision_scan', 92, 21),
    make('3', 'Whole Milk', 'Dairy', '1 gallon, 3/4 full', 'fridge_door', 2, 10, true, 4.29, 'vision_scan', 95, 10),
    make('4', 'Chicken Breast', 'Protein', '1 lb pack', 'fridge_middle', 2, 3, false, 8.99, 'receipt', 100, 3),
    make('5', 'Cheddar Cheese', 'Dairy', '1 block', 'fridge_middle', 10, 21, true, 6.99, 'barcode', 100, 21),
    make('6', 'Red Bell Pepper', 'Produce', '2', 'crisper', 8, 10, false, 2.5, 'manual', null, 10),
    make('7', 'Greek Yogurt', 'Dairy', '3 cups', 'fridge_top', 12, 14, false, 4.99, 'vision_scan', 87, 14),
    make('8', 'Sourdough Bread', 'Grains and Bread', '1 loaf', 'pantry', 3, 7, true, 3.49, 'manual', null, 7),
    make('9', 'Strawberries', 'Produce', '1 container', 'crisper', 0, 5, false, 4.99, 'vision_scan', 82, 5),
    make('10', 'Frozen Peas', 'Frozen', '1 bag', 'freezer', 180, 180, false, 2.99, 'manual', null, 7),
  ];
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  items: [],
  isLoading: false,
  hasInitializedDemo: false,
  filter: {
    location: 'all',
    status: 'all',
    category: 'all',
    search: '',
  },

  loadDemoIfEmpty: () => {
    const state = get();
    if (state.hasInitializedDemo) return;
    set({ items: getDemoItems(), hasInitializedDemo: true });
  },

  fetchItems: async (householdId: string) => {
    if (!householdId || householdId === 'demo') {
      get().loadDemoIfEmpty();
      return;
    }
    set({ isLoading: true });
    const { data } = await supabase
      .from('inventory_items')
      .select('*, ingredient:ingredients(*)')
      .eq('household_id', householdId)
      .not('status', 'in', '("consumed","wasted")')
      .order('expiry_date', { ascending: true });

    set({ items: data && data.length > 0 ? data : getDemoItems(), isLoading: false, hasInitializedDemo: true });
  },

  addItem: async (item: Partial<InventoryItem>) => {
    const { data } = await supabase
      .from('inventory_items')
      .insert(item)
      .select('*, ingredient:ingredients(*)')
      .single();

    if (data) {
      set((state) => ({ items: [...state.items, data] }));
    }
    return data;
  },

  updateItem: async (id: string, updates: Partial<InventoryItem>) => {
    const { data } = await supabase
      .from('inventory_items')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*, ingredient:ingredients(*)')
      .single();

    if (data) {
      set((state) => ({
        items: state.items.map((item) => (item.id === id ? data : item)),
      }));
    } else {
      // Demo mode: update locally
      set((state) => ({
        items: state.items.map((item) => (item.id === id ? { ...item, ...updates } : item)),
      }));
    }
  },

  deleteItem: async (id: string) => {
    await supabase.from('inventory_items').delete().eq('id', id);
    set((state) => ({ items: state.items.filter((item) => item.id !== id) }));
  },

  markAsOpened: async (id: string) => {
    const item = get().items.find((i) => i.id === id);
    if (!item?.ingredient) return;
    const openedDays = item.ingredient.default_shelf_life_opened_days;
    const newExpiry = new Date();
    newExpiry.setDate(newExpiry.getDate() + openedDays);
    await get().updateItem(id, { is_opened: true, expiry_date: newExpiry.toISOString().split('T')[0] });
  },

  moveLocation: async (id: string, newLocation: StorageLocation) => {
    const item = get().items.find((i) => i.id === id);
    if (!item?.ingredient) return;
    let shelfDays: number;
    if (newLocation === 'freezer') {
      shelfDays = item.ingredient.default_shelf_life_freezer_days;
    } else if (newLocation === 'pantry' || newLocation === 'countertop') {
      shelfDays = item.ingredient.default_shelf_life_pantry_days;
    } else {
      shelfDays = item.is_opened
        ? item.ingredient.default_shelf_life_opened_days
        : item.ingredient.default_shelf_life_fridge_days;
    }
    const newExpiry = new Date();
    newExpiry.setDate(newExpiry.getDate() + shelfDays);
    await get().updateItem(id, { storage_location: newLocation, expiry_date: newExpiry.toISOString().split('T')[0] });
  },

  freezeToSave: async (id: string) => {
    await get().moveLocation(id, 'freezer');
    await get().updateItem(id, { status: 'frozen_to_save', frozen_to_save: new Date().toISOString() });
  },

  markConsumed: async (id: string) => {
    await get().updateItem(id, { status: 'consumed' });
    set((state) => ({ items: state.items.filter((item) => item.id !== id) }));
  },

  markWasted: async (id: string, reason: string) => {
    const item = get().items.find((i) => i.id === id);
    if (!item) return;
    try {
      await supabase.from('waste_log').insert({
        household_id: item.household_id,
        inventory_item_id: id,
        ingredient_id: item.ingredient_id,
        quantity_wasted: item.quantity_text,
        estimated_value: item.purchase_price || 0,
        reason,
      });
    } catch {}
    await get().updateItem(id, { status: 'wasted' });
    set((state) => ({ items: state.items.filter((i) => i.id !== id) }));
  },

  setFilter: (filter) => {
    set((state) => ({ filter: { ...state.filter, ...filter } }));
  },

  getFilteredItems: () => {
    const { items, filter } = get();
    return items.filter((item) => {
      if (filter.location !== 'all' && item.storage_location !== filter.location) return false;
      if (filter.status !== 'all' && item.status !== filter.status) return false;
      if (filter.category !== 'all' && item.ingredient?.category !== filter.category) return false;
      if (filter.search) {
        const search = filter.search.toLowerCase();
        return item.ingredient?.name.toLowerCase().includes(search);
      }
      return true;
    });
  },
}));

// Helper: derive expiring items via React render-side computation, NOT a Zustand selector
// (using a Zustand selector that returns a new array each call causes infinite re-renders)
export function selectExpiringItems(items: InventoryItem[]): InventoryItem[] {
  const now = new Date();
  const threeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  return items
    .filter((item) => {
      const expiry = new Date(item.expiry_date);
      return expiry <= threeDays && item.status !== 'consumed' && item.status !== 'wasted';
    })
    .sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime());
}
