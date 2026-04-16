// Storage Advisor - ethylene gas database + storage tips per ingredient

export const ETHYLENE_PRODUCERS = [
  'apples', 'apple', 'apricots', 'avocados', 'avocado', 'bananas', 'banana',
  'cantaloupes', 'figs', 'honeydew melon', 'kiwi', 'mangoes', 'mango',
  'nectarines', 'papayas', 'passion fruit', 'peaches', 'pears', 'pear',
  'persimmons', 'plums', 'prunes', 'quinces', 'tomatoes', 'tomato',
];

export const ETHYLENE_SENSITIVE = [
  'asparagus', 'broccoli', 'brussels sprouts', 'cabbage', 'carrots', 'carrot',
  'cauliflower', 'cucumbers', 'cucumber', 'eggplant', 'green beans',
  'kale', 'leafy greens', 'spinach', 'lettuce', 'parsley', 'cilantro',
  'peppers', 'pepper', 'bell pepper', 'squash', 'sweet potatoes',
  'watermelon', 'watercress', 'zucchini',
];

export interface StorageTip {
  ingredient: string;
  optimal_location: string;
  shelf_life_note: string;
  prep_tip: string;
  ethylene_producer: boolean;
  ethylene_sensitive: boolean;
  warnings: string[];
}

const STORAGE_DATABASE: Record<string, StorageTip> = {
  banana: {
    ingredient: 'Banana', optimal_location: 'Countertop',
    shelf_life_note: 'Lasts 3-5 days at room temp; refrigerate when ripe to extend',
    prep_tip: 'Wrap stems in plastic wrap to slow ripening by 2-3 days',
    ethylene_producer: true, ethylene_sensitive: false,
    warnings: ['Will ripen other produce nearby - keep away from leafy greens'],
  },
  apple: {
    ingredient: 'Apple', optimal_location: 'Crisper drawer (high humidity)',
    shelf_life_note: '4-6 weeks in fridge; 2-3 weeks at room temp',
    prep_tip: 'Store away from other produce in a sealed container',
    ethylene_producer: true, ethylene_sensitive: false,
    warnings: ['Strong ethylene producer - isolate from leafy greens, broccoli'],
  },
  tomato: {
    ingredient: 'Tomato', optimal_location: 'Countertop (not fridge!)',
    shelf_life_note: '5-7 days at room temp; refrigeration ruins texture',
    prep_tip: 'Store stem-side down to prevent moisture loss',
    ethylene_producer: true, ethylene_sensitive: false,
    warnings: ['Refrigeration makes them mealy - keep on counter', 'Keeps potatoes from sprouting if stored together'],
  },
  spinach: {
    ingredient: 'Spinach', optimal_location: 'Crisper drawer with paper towel',
    shelf_life_note: '5-7 days; quickly wilts',
    prep_tip: 'Wrap in dry paper towel inside container to absorb moisture',
    ethylene_producer: false, ethylene_sensitive: true,
    warnings: ['Very ethylene-sensitive - store away from apples, bananas, tomatoes'],
  },
  lettuce: {
    ingredient: 'Lettuce', optimal_location: 'Crisper drawer with paper towel',
    shelf_life_note: '7-10 days for romaine; 5-7 for iceberg',
    prep_tip: 'Don\'t wash until ready to use; wrap in paper towels',
    ethylene_producer: false, ethylene_sensitive: true,
    warnings: ['Ethylene-sensitive - keep away from fruit'],
  },
  potato: {
    ingredient: 'Potato', optimal_location: 'Cool dark pantry',
    shelf_life_note: '3-5 weeks in pantry; do NOT refrigerate',
    prep_tip: 'Store with apples to prevent sprouting',
    ethylene_producer: false, ethylene_sensitive: false,
    warnings: ['Refrigeration converts starch to sugar - bad texture', 'Keep away from onions (both spoil faster)'],
  },
  onion: {
    ingredient: 'Onion', optimal_location: 'Cool dry pantry, away from potatoes',
    shelf_life_note: '1-2 months whole; 7-10 days cut (in fridge)',
    prep_tip: 'Store in mesh bag or basket for airflow',
    ethylene_producer: false, ethylene_sensitive: false,
    warnings: ['Storing with potatoes makes both spoil faster'],
  },
  avocado: {
    ingredient: 'Avocado', optimal_location: 'Countertop until ripe, then fridge',
    shelf_life_note: '4-7 days at room; 2-3 days in fridge once ripe',
    prep_tip: 'To ripen faster: bag with banana. To slow: keep in fridge',
    ethylene_producer: true, ethylene_sensitive: false,
    warnings: ['Strong ethylene producer'],
  },
  bread: {
    ingredient: 'Bread', optimal_location: 'Bread box or pantry shelf',
    shelf_life_note: '5-7 days in pantry; freeze to extend 2-3 months',
    prep_tip: 'Slice before freezing for easy single-slice toasting',
    ethylene_producer: false, ethylene_sensitive: false,
    warnings: ['Refrigeration makes bread stale faster - never refrigerate fresh bread'],
  },
  egg: {
    ingredient: 'Egg', optimal_location: 'Middle shelf of fridge (not door!)',
    shelf_life_note: '3-5 weeks in fridge in original carton',
    prep_tip: 'Door fluctuates in temperature - use middle shelf',
    ethylene_producer: false, ethylene_sensitive: false,
    warnings: ['Don\'t store on door - temperature swings shorten life'],
  },
  milk: {
    ingredient: 'Milk', optimal_location: 'Back of fridge (coldest)',
    shelf_life_note: 'Sealed: until use-by date. Opened: 5-7 days',
    prep_tip: 'Keep in coldest part of fridge, not door',
    ethylene_producer: false, ethylene_sensitive: false,
    warnings: ['Door is too warm - back of fridge maintains 36-38F'],
  },
  cheese: {
    ingredient: 'Cheese', optimal_location: 'Cheese drawer or middle shelf',
    shelf_life_note: 'Hard: 3-4 weeks. Soft: 1-2 weeks',
    prep_tip: 'Wrap in cheese paper or wax paper, then loose plastic',
    ethylene_producer: false, ethylene_sensitive: false,
    warnings: ['Plastic wrap traps moisture - use wax/parchment for long-term'],
  },
  meat: {
    ingredient: 'Meat', optimal_location: 'Bottom shelf of fridge',
    shelf_life_note: 'Raw: 1-2 days. Cooked: 3-4 days. Freezer: 4-12 months',
    prep_tip: 'Bottom shelf prevents drips contaminating other foods',
    ethylene_producer: false, ethylene_sensitive: false,
    warnings: ['Always store on bottom shelf to prevent cross-contamination'],
  },
  chicken: {
    ingredient: 'Chicken', optimal_location: 'Bottom shelf of fridge',
    shelf_life_note: 'Raw: 1-2 days. Freezer: 9 months',
    prep_tip: 'If not cooking within 2 days, freeze immediately',
    ethylene_producer: false, ethylene_sensitive: false,
    warnings: ['Bottom shelf, in pan to catch drips'],
  },
  yogurt: {
    ingredient: 'Yogurt', optimal_location: 'Middle shelf of fridge',
    shelf_life_note: 'Sealed: 1-2 weeks past date. Opened: 5-7 days',
    prep_tip: 'Keep sealed - exposure to air invites mold',
    ethylene_producer: false, ethylene_sensitive: false,
    warnings: [],
  },
  strawberry: {
    ingredient: 'Strawberries', optimal_location: 'Crisper drawer',
    shelf_life_note: '3-5 days; very perishable',
    prep_tip: 'Don\'t wash until ready to eat. Quick vinegar-water rinse extends life',
    ethylene_producer: false, ethylene_sensitive: true,
    warnings: ['One moldy berry contaminates the rest - check daily'],
  },
};

export function getStorageTip(itemName: string): StorageTip | null {
  const lower = itemName.toLowerCase();
  for (const [key, tip] of Object.entries(STORAGE_DATABASE)) {
    if (lower.includes(key)) return tip;
  }
  return null;
}

export function isEthyleneProducer(name: string): boolean {
  const lower = name.toLowerCase();
  return ETHYLENE_PRODUCERS.some((e) => lower.includes(e));
}

export function isEthyleneSensitive(name: string): boolean {
  const lower = name.toLowerCase();
  return ETHYLENE_SENSITIVE.some((e) => lower.includes(e));
}

export interface EthyleneWarning {
  producer: string;
  sensitive: string;
  message: string;
}

// Detects pairs of ethylene-producing and ethylene-sensitive items in the same location
export function detectEthyleneConflicts(items: { name: string; location: string }[]): EthyleneWarning[] {
  const warnings: EthyleneWarning[] = [];
  const byLocation: Record<string, typeof items> = {};
  for (const item of items) {
    if (!byLocation[item.location]) byLocation[item.location] = [];
    byLocation[item.location].push(item);
  }

  for (const [, locationItems] of Object.entries(byLocation)) {
    const producers = locationItems.filter((i) => isEthyleneProducer(i.name));
    const sensitives = locationItems.filter((i) => isEthyleneSensitive(i.name));
    for (const p of producers) {
      for (const s of sensitives) {
        warnings.push({
          producer: p.name,
          sensitive: s.name,
          message: `${p.name} releases ethylene gas that accelerates spoilage of ${s.name}. Move one to a different location.`,
        });
      }
    }
  }
  return warnings;
}

export function getAllStorageTips(): StorageTip[] {
  return Object.values(STORAGE_DATABASE);
}
