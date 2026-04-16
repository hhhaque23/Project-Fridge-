import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { GroceryListItem } from '@/lib/types';

interface GroceryState {
  items: GroceryListItem[];
  isLoading: boolean;

  fetchItems: (householdId: string) => Promise<void>;
  addItem: (item: Partial<GroceryListItem>) => Promise<void>;
  togglePurchased: (id: string) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  addFromRecipe: (recipeId: string, householdId: string, userId: string) => Promise<void>;
  clearPurchased: (householdId: string) => Promise<void>;
  updatePrice: (id: string, price: number) => Promise<void>;
}

export const useGroceryStore = create<GroceryState>((set, get) => ({
  items: [],
  isLoading: false,

  fetchItems: async (householdId: string) => {
    set({ isLoading: true });
    const { data } = await supabase
      .from('grocery_list_items')
      .select('*, ingredient:ingredients(*)')
      .eq('household_id', householdId)
      .order('is_purchased', { ascending: true })
      .order('created_at', { ascending: false });

    set({ items: data || [], isLoading: false });
  },

  addItem: async (item: Partial<GroceryListItem>) => {
    const { data } = await supabase
      .from('grocery_list_items')
      .insert(item)
      .select('*, ingredient:ingredients(*)')
      .single();

    if (data) {
      set((state) => ({ items: [data, ...state.items] }));
    }
  },

  togglePurchased: async (id: string) => {
    const item = get().items.find((i) => i.id === id);
    if (!item) return;

    const { data } = await supabase
      .from('grocery_list_items')
      .update({ is_purchased: !item.is_purchased })
      .eq('id', id)
      .select('*, ingredient:ingredients(*)')
      .single();

    if (data) {
      set((state) => ({
        items: state.items.map((i) => (i.id === id ? data : i)),
      }));
    }
  },

  removeItem: async (id: string) => {
    await supabase.from('grocery_list_items').delete().eq('id', id);
    set((state) => ({ items: state.items.filter((i) => i.id !== id) }));
  },

  addFromRecipe: async (recipeId: string, householdId: string, userId: string) => {
    // Get recipe ingredients
    const { data: recipeIngredients } = await supabase
      .from('recipe_ingredients')
      .select('*')
      .eq('recipe_id', recipeId);

    if (!recipeIngredients) return;

    // Get current inventory
    const { data: inventory } = await supabase
      .from('inventory_items')
      .select('ingredient_id')
      .eq('household_id', householdId)
      .not('status', 'in', '("consumed","wasted")');

    const inventoryIds = new Set((inventory || []).map((i) => i.ingredient_id));

    // Only add missing ingredients
    const missing = recipeIngredients.filter(
      (ri) => !ri.is_optional && !inventoryIds.has(ri.ingredient_id)
    );

    for (const ri of missing) {
      await get().addItem({
        household_id: householdId,
        ingredient_id: ri.ingredient_id,
        quantity_text: `${ri.quantity} ${ri.unit}`,
        source: 'recipe',
        added_by: userId,
        is_purchased: false,
      });
    }
  },

  clearPurchased: async (householdId: string) => {
    await supabase
      .from('grocery_list_items')
      .delete()
      .eq('household_id', householdId)
      .eq('is_purchased', true);

    set((state) => ({ items: state.items.filter((i) => !i.is_purchased) }));
  },

  updatePrice: async (id: string, price: number) => {
    await supabase
      .from('grocery_list_items')
      .update({ actual_price: price })
      .eq('id', id);

    set((state) => ({
      items: state.items.map((i) => (i.id === id ? { ...i, actual_price: price } : i)),
    }));
  },
}));
