// Ingredients, preparation states, cooking transformations, and item factories for Warung Rush.

export const ITEM_DEFS = {
  // Raw ingredients from crates
  rice: {
    id: 'rice',
    label: 'Rice',
    short: 'RICE',
    category: 'raw',
    color: '#fbf6ec',
    accent: '#d8ccb8',
    choppable: false,
    cookMap: { wok: 'fried_rice' },
    plateable: true, // Steamed rice goes on Sate Ayam directly!
  },
  noodles: {
    id: 'noodles',
    label: 'Noodles',
    short: 'MIE',
    category: 'raw',
    color: '#f2c85b',
    accent: '#c48d1f',
    choppable: false,
    cookMap: { pot: 'boiled_noodles', wok: 'wok_noodles' },
    plateable: false,
  },
  chicken: {
    id: 'chicken',
    label: 'Chicken',
    short: 'CHKN',
    category: 'raw',
    color: '#f0b8a8',
    accent: '#c97c69',
    choppable: true,
    chopResult: 'chopped_chicken',
    cookMap: {},
    plateable: false,
  },
  veggies: {
    id: 'veggies',
    label: 'Veggies',
    short: 'VEG',
    category: 'raw',
    color: '#4ea846',
    accent: '#d63b2a',
    choppable: true,
    chopResult: 'chopped_veggies',
    cookMap: {},
    plateable: false,
  },
  egg: {
    id: 'egg',
    label: 'Egg',
    short: 'EGG',
    category: 'raw',
    color: '#f2d9b6',
    accent: '#c79c6b',
    choppable: false,
    cookMap: { wok: 'fried_egg' },
    plateable: false,
  },

  // Chopped ingredients
  chopped_chicken: {
    id: 'chopped_chicken',
    label: 'Diced Chicken',
    short: 'CHOP CHKN',
    category: 'prepped',
    color: '#f3c2b0',
    accent: '#b86853',
    choppable: false,
    cookMap: { wok: 'wok_chicken', grill: 'grilled_sate' },
    plateable: false,
  },
  chopped_veggies: {
    id: 'chopped_veggies',
    label: 'Chopped Veg',
    short: 'CHOP VEG',
    category: 'prepped',
    color: '#5ec150',
    accent: '#e34234',
    choppable: false,
    cookMap: {},
    plateable: true,
  },

  // Cooked components
  fried_rice: {
    id: 'fried_rice',
    label: 'Wok Rice',
    short: 'WOK RICE',
    category: 'cooked',
    color: '#c97b36',
    accent: '#7a3d14',
    choppable: false,
    cookMap: {},
    plateable: true,
  },
  fried_egg: {
    id: 'fried_egg',
    label: 'Fried Egg',
    short: 'FRY EGG',
    category: 'cooked',
    color: '#ffffff',
    accent: '#f4b41a',
    choppable: false,
    cookMap: {},
    plateable: true,
  },
  wok_chicken: {
    id: 'wok_chicken',
    label: 'Spiced Chicken',
    short: 'WOK CHKN',
    category: 'cooked',
    color: '#b86228',
    accent: '#632e0f',
    choppable: false,
    cookMap: {},
    plateable: true,
  },
  boiled_noodles: {
    id: 'boiled_noodles',
    label: 'Broth Noodles',
    short: 'POT MIE',
    category: 'cooked',
    color: '#f6d573',
    accent: '#b8821d',
    choppable: false,
    cookMap: {},
    plateable: true,
  },
  wok_noodles: {
    id: 'wok_noodles',
    label: 'Wok Noodles',
    short: 'WOK MIE',
    category: 'cooked',
    color: '#bf6e26',
    accent: '#69340e',
    choppable: false,
    cookMap: {},
    plateable: true,
  },
  grilled_sate: {
    id: 'grilled_sate',
    label: 'Grilled Sate',
    short: 'SATE',
    category: 'cooked',
    color: '#a34d1d',
    accent: '#4a1d09',
    choppable: false,
    cookMap: {},
    plateable: true,
  },

  // Ready-to-use warung condiments
  peanut_sauce: {
    id: 'peanut_sauce',
    label: 'Peanut Sauce',
    short: 'PEANUT',
    category: 'condiment',
    color: '#9c5a23',
    accent: '#5c310e',
    choppable: false,
    cookMap: {},
    plateable: true,
  },
  sambal: {
    id: 'sambal',
    label: 'Chili Sambal',
    short: 'SAMBAL',
    category: 'condiment',
    color: '#cf2a1e',
    accent: '#7a1109',
    choppable: false,
    cookMap: {},
    plateable: true,
  },

  // Burnt item
  burnt: {
    id: 'burnt',
    label: 'Burnt Food',
    short: 'BURNT',
    category: 'burnt',
    color: '#2b2726',
    accent: '#574f4c',
    choppable: false,
    cookMap: {},
    plateable: false,
  },
};

export function createIngredientItem(itemId) {
  return {
    kind: 'ingredient',
    id: itemId,
  };
}

export function createPlateItem(components = [], dishId = null) {
  return {
    kind: 'plate',
    components: [...components],
    dishId,
  };
}

export function getItemDef(itemId) {
  return ITEM_DEFS[itemId] ?? null;
}

export function canChopItem(item) {
  if (!item || item.kind !== 'ingredient') return false;
  const def = ITEM_DEFS[item.id];
  return Boolean(def && def.choppable);
}

export function getChoppedResult(item) {
  if (!canChopItem(item)) return null;
  return createIngredientItem(ITEM_DEFS[item.id].chopResult);
}

export function canCookAtAppliance(item, applianceType) {
  if (!item || item.kind !== 'ingredient') return false;
  const def = ITEM_DEFS[item.id];
  return Boolean(def && def.cookMap && def.cookMap[applianceType]);
}

export function getCookedResultId(item, applianceType) {
  if (!canCookAtAppliance(item, applianceType)) return null;
  return ITEM_DEFS[item.id].cookMap[applianceType];
}

export function isPlateableIngredient(item) {
  if (!item || item.kind !== 'ingredient') return false;
  const def = ITEM_DEFS[item.id];
  return Boolean(def && def.plateable);
}

export function describeItem(item) {
  if (!item) return '';
  if (item.kind === 'ingredient') {
    return ITEM_DEFS[item.id]?.label ?? item.id;
  }
  if (item.kind === 'plate') {
    if (item.dishId) return item.dishId;
    if (item.components.length === 0) return 'Empty Plate';
    return `Plate (${item.components.length})`;
  }
  return '';
}
