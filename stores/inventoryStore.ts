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

export const useInventoryStore = create<InventoryState>((set, get) => ({
  items: [],
  isLoading: false,
  filter: {
    location: 'all',
    status: 'all',
    category: 'all',
    search: '',
  },

  fetchItems: async (householdId: string) => {
    set({ isLoading: true });
    const { data } = await supabase
      .from('inventory_items')
      .select('*, ingredient:ingredients(*)')
      .eq('household_id', householdId)
      .not('status', 'in', '("consumed","wasted")')
      .order('expiry_date', { ascending: true });

    set({ items: data || [], isLoading: false });
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
