import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { InventoryItem, StorageLocation, InventoryStatus } from '@/lib/types';

interface InventoryState {
  items: InventoryItem[];
  isLoading: boolean;
  filter: {
    location: StorageLocation | 'all';
    status: InventoryStatus | 'all';
    category: string | 'all';
    search: string;
  };

  fetchItems: (householdId: string) => Promise<void>;
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
  getExpiringItems: () => InventoryItem[];
}

function getDemoItems(): InventoryItem[] {
  const today = new Date();
  const daysFromNow = (n: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + n);
    return d.toISOString().split('T')[0];
  };
  const baseIngredient = (name: string, category: any, fridge = 7, freezer = 180) => ({
    id: `ing-${name.toLowerCase()}`,
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

  const demos: InventoryItem[] = [
    { id: '1', household_id: 'demo', ingredient_id: 'ing-spinach', storage_location: 'crisper', quantity_text: '1 bag', quantity_numeric: 1, is_opened: true, expiry_date: daysFromNow(1), original_expiry_date: daysFromNow(7), purchase_date: daysFromNow(-5), purchase_price: 3.99, purchased_by: null, source: 'vision_scan', confidence_score: 88, photo_url: null, status: 'expiring_soon', frozen_to_save: null, notes: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ingredient: baseIngredient('Baby Spinach', 'Produce', 5) },
    { id: '2', household_id: 'demo', ingredient_id: 'ing-eggs', storage_location: 'fridge_door', quantity_text: '8 remaining', quantity_numeric: 8, is_opened: true, expiry_date: daysFromNow(14), original_expiry_date: daysFromNow(21), purchase_date: daysFromNow(-7), purchase_price: 5.49, purchased_by: null, source: 'vision_scan', confidence_score: 92, photo_url: null, status: 'fresh', frozen_to_save: null, notes: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ingredient: baseIngredient('Eggs', 'Protein', 21) },
    { id: '3', household_id: 'demo', ingredient_id: 'ing-milk', storage_location: 'fridge_door', quantity_text: '1 gallon, 3/4 full', quantity_numeric: 0.75, is_opened: true, expiry_date: daysFromNow(2), original_expiry_date: daysFromNow(10), purchase_date: daysFromNow(-8), purchase_price: 4.29, purchased_by: null, source: 'vision_scan', confidence_score: 95, photo_url: null, status: 'expiring_soon', frozen_to_save: null, notes: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ingredient: baseIngredient('Whole Milk', 'Dairy', 10) },
    { id: '4', household_id: 'demo', ingredient_id: 'ing-chicken', storage_location: 'fridge_middle', quantity_text: '1 lb pack', quantity_numeric: 1, is_opened: false, expiry_date: daysFromNow(2), original_expiry_date: daysFromNow(3), purchase_date: daysFromNow(-1), purchase_price: 8.99, purchased_by: null, source: 'receipt', confidence_score: 100, photo_url: null, status: 'expiring_soon', frozen_to_save: null, notes: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ingredient: baseIngredient('Chicken Breast', 'Protein', 3, 270) },
    { id: '5', household_id: 'demo', ingredient_id: 'ing-cheese', storage_location: 'fridge_middle', quantity_text: '1 block', quantity_numeric: 1, is_opened: true, expiry_date: daysFromNow(10), original_expiry_date: daysFromNow(21), purchase_date: daysFromNow(-3), purchase_price: 6.99, purchased_by: null, source: 'barcode', confidence_score: 100, photo_url: null, status: 'fresh', frozen_to_save: null, notes: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ingredient: baseIngredient('Cheddar Cheese', 'Dairy', 21) },
    { id: '6', household_id: 'demo', ingredient_id: 'ing-pepper', storage_location: 'crisper', quantity_text: '2', quantity_numeric: 2, is_opened: false, expiry_date: daysFromNow(8), original_expiry_date: daysFromNow(10), purchase_date: daysFromNow(-2), purchase_price: 2.5, purchased_by: null, source: 'manual', confidence_score: null, photo_url: null, status: 'fresh', frozen_to_save: null, notes: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ingredient: baseIngredient('Red Bell Pepper', 'Produce', 10) },
    { id: '7', household_id: 'demo', ingredient_id: 'ing-yogurt', storage_location: 'fridge_top', quantity_text: '3 cups', quantity_numeric: 3, is_opened: false, expiry_date: daysFromNow(12), original_expiry_date: daysFromNow(14), purchase_date: daysFromNow(-2), purchase_price: 4.99, purchased_by: null, source: 'vision_scan', confidence_score: 87, photo_url: null, status: 'fresh', frozen_to_save: null, notes: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ingredient: baseIngredient('Greek Yogurt', 'Dairy', 14) },
    { id: '8', household_id: 'demo', ingredient_id: 'ing-bread', storage_location: 'pantry', quantity_text: '1 loaf', quantity_numeric: 1, is_opened: true, expiry_date: daysFromNow(3), original_expiry_date: daysFromNow(7), purchase_date: daysFromNow(-4), purchase_price: 3.49, purchased_by: null, source: 'manual', confidence_score: null, photo_url: null, status: 'expiring_soon', frozen_to_save: null, notes: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ingredient: baseIngredient('Sourdough Bread', 'Grains and Bread', 7) },
    { id: '9', household_id: 'demo', ingredient_id: 'ing-strawberries', storage_location: 'crisper', quantity_text: '1 container', quantity_numeric: 1, is_opened: false, expiry_date: daysFromNow(0), original_expiry_date: daysFromNow(5), purchase_date: daysFromNow(-5), purchase_price: 4.99, purchased_by: null, source: 'vision_scan', confidence_score: 82, photo_url: null, status: 'expiring_today', frozen_to_save: null, notes: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ingredient: baseIngredient('Strawberries', 'Produce', 5) },
    { id: '10', household_id: 'demo', ingredient_id: 'ing-frozen-peas', storage_location: 'freezer', quantity_text: '1 bag', quantity_numeric: 1, is_opened: false, expiry_date: daysFromNow(180), original_expiry_date: daysFromNow(180), purchase_date: daysFromNow(-30), purchase_price: 2.99, purchased_by: null, source: 'manual', confidence_score: null, photo_url: null, status: 'fresh', frozen_to_save: null, notes: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ingredient: baseIngredient('Frozen Peas', 'Frozen', 7, 240) },
  ];
  return demos;
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  items: getDemoItems(),
  isLoading: false,
  filter: {
    location: 'all',
    status: 'all',
    category: 'all',
    search: '',
  },

  fetchItems: async (householdId: string) => {
    if (!householdId || householdId === 'demo') {
      // Keep demo items
      set({ isLoading: false });
      return;
    }
    set({ isLoading: true });
    const { data } = await supabase
      .from('inventory_items')
      .select('*, ingredient:ingredients(*)')
      .eq('household_id', householdId)
      .not('status', 'in', '("consumed","wasted")')
      .order('expiry_date', { ascending: true });

    set({ items: data && data.length > 0 ? data : getDemoItems(), isLoading: false });
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

    await get().updateItem(id, {
      is_opened: true,
      expiry_date: newExpiry.toISOString().split('T')[0],
    });
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

    await get().updateItem(id, {
      storage_location: newLocation,
      expiry_date: newExpiry.toISOString().split('T')[0],
    });
  },

  freezeToSave: async (id: string) => {
    await get().moveLocation(id, 'freezer');
    await get().updateItem(id, {
      status: 'frozen_to_save',
      frozen_to_save: new Date().toISOString(),
    });
  },

  markConsumed: async (id: string) => {
    await get().updateItem(id, { status: 'consumed' });
    set((state) => ({ items: state.items.filter((item) => item.id !== id) }));
  },

  markWasted: async (id: string, reason: string) => {
    const item = get().items.find((i) => i.id === id);
    if (!item) return;

    await supabase.from('waste_log').insert({
      household_id: item.household_id,
      inventory_item_id: id,
      ingredient_id: item.ingredient_id,
      quantity_wasted: item.quantity_text,
      estimated_value: item.purchase_price || 0,
      reason,
    });

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

  getExpiringItems: () => {
    const { items } = get();
    const now = new Date();
    const threeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    return items
      .filter((item) => {
        const expiry = new Date(item.expiry_date);
        return expiry <= threeDays && item.status !== 'consumed' && item.status !== 'wasted';
      })
      .sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime());
  },
}));
