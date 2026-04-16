// Loyalty Card Sync Service
// Real impl would require API partnerships with Kroger, Walmart, Target
// This is a mock that demonstrates the integration shape

import type { IngredientCategory } from '@/lib/types';

export type LoyaltyProvider = 'kroger' | 'walmart' | 'target' | 'safeway';

export interface LoyaltyAccount {
  provider: LoyaltyProvider;
  account_id: string;
  email: string;
  connected_at: string;
  last_sync: string | null;
  is_active: boolean;
}

export interface LoyaltyPurchase {
  id: string;
  provider: LoyaltyProvider;
  store_name: string;
  purchase_date: string;
  total: number;
  items: {
    name: string;
    quantity: string;
    unit_price: number;
    category: IngredientCategory;
    upc?: string;
  }[];
}

const PROVIDER_INFO: Record<LoyaltyProvider, { name: string; color: string; logo: string }> = {
  kroger: { name: 'Kroger', color: '#004990', logo: 'shopping-basket' },
  walmart: { name: 'Walmart', color: '#0071CE', logo: 'shopping-cart' },
  target: { name: 'Target', color: '#CC0000', logo: 'bullseye' },
  safeway: { name: 'Safeway', color: '#E2231A', logo: 'shopping-bag' },
};

export function getProviderInfo(provider: LoyaltyProvider) {
  return PROVIDER_INFO[provider];
}

export function getAllProviders(): LoyaltyProvider[] {
  return Object.keys(PROVIDER_INFO) as LoyaltyProvider[];
}

// Mock OAuth flow - in production, redirect to provider's OAuth endpoint
export async function connectLoyaltyAccount(
  provider: LoyaltyProvider,
  email: string
): Promise<LoyaltyAccount> {
  // Simulate API delay
  await new Promise((r) => setTimeout(r, 800));

  return {
    provider,
    account_id: `${provider}-${Math.random().toString(36).slice(2, 10)}`,
    email,
    connected_at: new Date().toISOString(),
    last_sync: null,
    is_active: true,
  };
}

export async function disconnectLoyaltyAccount(provider: LoyaltyProvider): Promise<boolean> {
  await new Promise((r) => setTimeout(r, 300));
  return true;
}

export async function syncRecentPurchases(
  provider: LoyaltyProvider
): Promise<LoyaltyPurchase[]> {
  // Mock recent purchases - in production, this would call the provider's API
  await new Promise((r) => setTimeout(r, 600));

  const today = new Date();
  const daysAgo = (n: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - n);
    return d.toISOString().split('T')[0];
  };

  return [
    {
      id: 'p1',
      provider,
      store_name: PROVIDER_INFO[provider].name,
      purchase_date: daysAgo(2),
      total: 67.43,
      items: [
        { name: 'Organic Whole Milk', quantity: '1 gal', unit_price: 5.99, category: 'Dairy', upc: '011110089014' },
        { name: 'Free-Range Eggs', quantity: '1 dozen', unit_price: 5.49, category: 'Protein' },
        { name: 'Sourdough Loaf', quantity: '1', unit_price: 4.99, category: 'Grains and Bread' },
        { name: 'Baby Spinach', quantity: '5oz bag', unit_price: 3.49, category: 'Produce' },
        { name: 'Chicken Breast', quantity: '2 lb', unit_price: 12.99, category: 'Protein' },
        { name: 'Cherry Tomatoes', quantity: '1 pint', unit_price: 4.99, category: 'Produce' },
        { name: 'Greek Yogurt', quantity: '32oz', unit_price: 5.49, category: 'Dairy' },
        { name: 'Sharp Cheddar', quantity: '8oz', unit_price: 4.99, category: 'Dairy' },
        { name: 'Avocados', quantity: '4 ct', unit_price: 6.00, category: 'Produce' },
        { name: 'Pasta - Penne', quantity: '1 lb', unit_price: 2.49, category: 'Grains and Bread' },
        { name: 'Olive Oil', quantity: '500ml', unit_price: 10.49, category: 'Condiments and Sauces' },
      ],
    },
    {
      id: 'p2',
      provider,
      store_name: PROVIDER_INFO[provider].name,
      purchase_date: daysAgo(7),
      total: 32.18,
      items: [
        { name: 'Bananas', quantity: '1 bunch', unit_price: 2.49, category: 'Produce' },
        { name: 'Strawberries', quantity: '1 lb', unit_price: 4.99, category: 'Produce' },
        { name: 'Whole Wheat Bread', quantity: '1 loaf', unit_price: 4.49, category: 'Grains and Bread' },
        { name: 'Salted Butter', quantity: '1 lb', unit_price: 6.99, category: 'Dairy' },
        { name: 'Cucumbers', quantity: '2', unit_price: 1.98, category: 'Produce' },
      ],
    },
  ];
}
