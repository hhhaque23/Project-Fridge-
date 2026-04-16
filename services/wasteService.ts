import { supabase } from '@/lib/supabase';
import type { WasteMetrics } from '@/lib/types';

export async function fetchWasteMetrics(
  householdId: string,
  period: string = 'month'
): Promise<WasteMetrics> {
  const now = new Date();
  let startDate: Date;
  switch (period) {
    case 'week':
      startDate = new Date(now.setDate(now.getDate() - 7));
      break;
    case 'year':
      startDate = new Date(now.setFullYear(now.getFullYear() - 1));
      break;
    default:
      startDate = new Date(now.setMonth(now.getMonth() - 1));
  }

  const startISO = startDate.toISOString();

  // Fetch waste log entries
  const { data: wasteEntries } = await supabase
    .from('waste_log')
    .select('*, ingredient:ingredients(name)')
    .eq('household_id', householdId)
    .gte('wasted_at', startISO);

  // Fetch consumed items (for "rescued" count)
  const { data: consumedItems } = await supabase
    .from('inventory_items')
    .select('id, purchase_price')
    .eq('household_id', householdId)
    .eq('status', 'consumed')
    .gte('updated_at', startISO);

  const wasteList = wasteEntries || [];
  const consumedList = consumedItems || [];

  const items_wasted = wasteList.length;
  const items_rescued = consumedList.length;
  const total = items_wasted + items_rescued;
  const monthly_waste_score = total === 0 ? 100 : Math.round((items_rescued / total) * 100);

  const money_wasted = wasteList.reduce((sum, w: any) => sum + (Number(w.estimated_value) || 0), 0);
  const money_saved = consumedList.reduce((sum, c: any) => sum + (Number(c.purchase_price) || 0), 0);
  const co2_saved_kg = items_rescued * 0.18; // ~0.18kg CO2 per kg food saved (USDA)

  // Aggregate most wasted items
  const wasteMap: Record<string, { count: number; total_value: number }> = {};
  for (const w of wasteList as any[]) {
    const name = w.ingredient?.name || 'Unknown';
    if (!wasteMap[name]) wasteMap[name] = { count: 0, total_value: 0 };
    wasteMap[name].count++;
    wasteMap[name].total_value += Number(w.estimated_value) || 0;
  }
  const most_wasted = Object.entries(wasteMap)
    .map(([name, v]) => ({ ingredient_name: name, count: v.count, total_value: v.total_value }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    monthly_waste_score,
    money_saved,
    money_wasted,
    co2_saved_kg,
    items_rescued,
    items_wasted,
    most_wasted,
    trend: monthly_waste_score >= 80 ? 'improving' : monthly_waste_score >= 60 ? 'stable' : 'declining',
  };
}
