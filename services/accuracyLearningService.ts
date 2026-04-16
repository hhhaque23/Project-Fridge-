// Per-user accuracy learning - stores corrections and builds personalized prompt addendums
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const STORAGE_KEY = 'freshscan_accuracy_corrections_v1';

export interface AccuracyCorrection {
  id: string;
  timestamp: string;
  ai_suggestion: string;
  user_correction: string;
  category_ai: string | null;
  category_user: string | null;
  scan_type: 'vision' | 'barcode' | 'receipt';
  confidence: number;
}

export interface CorrectionStats {
  total_corrections: number;
  most_common_misidentifications: { ai_said: string; user_says: string; count: number }[];
  accuracy_trend: number; // 0-100, percentage that need correction
  user_specific_items: string[]; // items unique to this user
}

const webStorage = {
  getItem: (k: string) => Promise.resolve(typeof window !== 'undefined' ? window.localStorage.getItem(k) : null),
  setItem: (k: string, v: string) => {
    if (typeof window !== 'undefined') window.localStorage.setItem(k, v);
    return Promise.resolve();
  },
};
const storage = Platform.OS === 'web' ? webStorage : AsyncStorage;

export async function logCorrection(c: Omit<AccuracyCorrection, 'id' | 'timestamp'>): Promise<void> {
  const stored = await storage.getItem(STORAGE_KEY);
  const corrections: AccuracyCorrection[] = stored ? JSON.parse(stored) : [];
  corrections.push({
    ...c,
    id: `corr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
  });
  // Keep last 200
  const trimmed = corrections.slice(-200);
  await storage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

export async function getCorrections(): Promise<AccuracyCorrection[]> {
  const stored = await storage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

export async function getCorrectionStats(): Promise<CorrectionStats> {
  const corrections = await getCorrections();
  const last30 = corrections.filter((c) => {
    const ts = new Date(c.timestamp).getTime();
    return ts > Date.now() - 30 * 24 * 60 * 60 * 1000;
  });

  // Count misidentifications
  const misMap: Record<string, number> = {};
  for (const c of corrections) {
    const key = `${c.ai_suggestion}|||${c.user_correction}`;
    misMap[key] = (misMap[key] || 0) + 1;
  }
  const misIds = Object.entries(misMap)
    .map(([k, count]) => {
      const [ai_said, user_says] = k.split('|||');
      return { ai_said, user_says, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // User-specific items (corrections where user_correction appears 3+ times)
  const userItemMap: Record<string, number> = {};
  for (const c of corrections) {
    userItemMap[c.user_correction] = (userItemMap[c.user_correction] || 0) + 1;
  }
  const userItems = Object.entries(userItemMap)
    .filter(([, count]) => count >= 3)
    .map(([name]) => name);

  return {
    total_corrections: corrections.length,
    most_common_misidentifications: misIds,
    accuracy_trend: last30.length === 0 ? 100 : Math.max(0, 100 - last30.length * 2),
    user_specific_items: userItems,
  };
}

// Builds a personalized prompt addendum for the vision API based on user's correction history
export async function buildPromptAddendum(): Promise<string> {
  const stats = await getCorrectionStats();
  if (stats.total_corrections < 5) return '';

  const parts: string[] = [];

  if (stats.most_common_misidentifications.length > 0) {
    parts.push('Past misidentifications to be careful of:');
    for (const m of stats.most_common_misidentifications.slice(0, 3)) {
      parts.push(`- When seeing what looks like "${m.ai_said}", the user has corrected it to "${m.user_says}" ${m.count}x. Consider this carefully.`);
    }
  }

  if (stats.user_specific_items.length > 0) {
    parts.push('\nThis user frequently has these specific items:');
    for (const item of stats.user_specific_items.slice(0, 10)) {
      parts.push(`- ${item}`);
    }
  }

  return parts.join('\n');
}

export async function clearCorrections(): Promise<void> {
  await storage.setItem(STORAGE_KEY, '[]');
}

// Seed demo data for the accuracy screen
export async function seedDemoCorrections(): Promise<void> {
  const existing = await getCorrections();
  if (existing.length > 0) return;
  const demoCorrections: Omit<AccuracyCorrection, 'id' | 'timestamp'>[] = [
    { ai_suggestion: 'Cilantro', user_correction: 'Parsley', category_ai: 'Produce', category_user: 'Produce', scan_type: 'vision', confidence: 78 },
    { ai_suggestion: 'Cilantro', user_correction: 'Parsley', category_ai: 'Produce', category_user: 'Produce', scan_type: 'vision', confidence: 72 },
    { ai_suggestion: 'Lemon', user_correction: 'Lime', category_ai: 'Produce', category_user: 'Produce', scan_type: 'vision', confidence: 81 },
    { ai_suggestion: 'Greek Yogurt', user_correction: 'Skyr', category_ai: 'Dairy', category_user: 'Dairy', scan_type: 'vision', confidence: 70 },
    { ai_suggestion: 'Greek Yogurt', user_correction: 'Skyr', category_ai: 'Dairy', category_user: 'Dairy', scan_type: 'vision', confidence: 68 },
    { ai_suggestion: 'Greek Yogurt', user_correction: 'Skyr', category_ai: 'Dairy', category_user: 'Dairy', scan_type: 'vision', confidence: 75 },
    { ai_suggestion: 'Mozzarella', user_correction: 'Burrata', category_ai: 'Dairy', category_user: 'Dairy', scan_type: 'vision', confidence: 65 },
    { ai_suggestion: 'Mozzarella', user_correction: 'Burrata', category_ai: 'Dairy', category_user: 'Dairy', scan_type: 'vision', confidence: 70 },
  ];
  for (const c of demoCorrections) {
    await logCorrection(c);
  }
}
