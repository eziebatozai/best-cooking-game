// Authentic Indonesian street-food recipes and plate-assembly matching rules.

export const RECIPES = {
  nasi_goreng: {
    id: 'nasi_goreng',
    name: 'Nasi Goreng',
    subtitle: 'Wok Fried Rice',
    tier: 1,
    baseCoins: 45,
    maxTip: 25,
    patience: 66,
    accent: '#d96b27',
    ingredients: ['fried_rice', 'chopped_veggies', 'fried_egg'],
    stepsHint: ['Wok Rice', 'Chop Veg', 'Fry Egg'],
  },
  mie_goreng: {
    id: 'mie_goreng',
    name: 'Mie Goreng',
    subtitle: 'Stir-Fry Noodles',
    tier: 1,
    baseCoins: 45,
    maxTip: 25,
    patience: 64,
    accent: '#c98a1e',
    ingredients: ['wok_noodles', 'chopped_veggies', 'fried_egg'],
    stepsHint: ['Wok Mie', 'Chop Veg', 'Fry Egg'],
  },
  sate_ayam: {
    id: 'sate_ayam',
    name: 'Sate Ayam',
    subtitle: 'Charcoal Skewers',
    tier: 1,
    baseCoins: 50,
    maxTip: 28,
    patience: 68,
    accent: '#a8441c',
    ingredients: ['grilled_sate', 'peanut_sauce', 'rice'],
    stepsHint: ['Grill Chkn', 'Peanut', 'Rice'],
  },
  mie_ayam: {
    id: 'mie_ayam',
    name: 'Mie Ayam',
    subtitle: 'Chicken Noodle Bowl',
    tier: 2,
    baseCoins: 55,
    maxTip: 30,
    patience: 68,
    accent: '#d99e26',
    ingredients: ['boiled_noodles', 'wok_chicken', 'chopped_veggies'],
    stepsHint: ['Pot Mie', 'Wok Chkn', 'Chop Veg'],
  },
  nasi_spesial: {
    id: 'nasi_spesial',
    name: 'Nasi Spesial',
    subtitle: 'Deluxe Sambal Rice',
    tier: 3,
    baseCoins: 70,
    maxTip: 38,
    patience: 74,
    accent: '#c72c21',
    ingredients: ['fried_rice', 'wok_chicken', 'fried_egg', 'sambal'],
    stepsHint: ['Wok Rice', 'Wok Chkn', 'Fry Egg', 'Sambal'],
  },
};

export const RECIPE_LIST = Object.values(RECIPES);

export function getRecipe(dishId) {
  return RECIPES[dishId] ?? null;
}

export function getRecipesForTier(tier) {
  return RECIPE_LIST.filter((recipe) => recipe.tier <= tier);
}

/**
 * Returns every recipe that contains all components currently on a plate (with no duplicates).
 */
export function matchPartialRecipes(components) {
  if (components.length === 0) return RECIPE_LIST;
  return RECIPE_LIST.filter((recipe) =>
    components.every((comp) => recipe.ingredients.includes(comp)),
  );
}

/**
 * Checks whether adding `ingredientId` to `components` still leads toward at least one valid recipe.
 */
export function canAddToPlate(components, ingredientId) {
  if (components.includes(ingredientId)) return false;
  const next = [...components, ingredientId];
  return matchPartialRecipes(next).length > 0;
}

/**
 * Returns the completed recipe if `components` matches all ingredients of a recipe exactly.
 */
export function matchCompletedRecipe(components) {
  for (const recipe of RECIPE_LIST) {
    if (
      recipe.ingredients.length === components.length &&
      recipe.ingredients.every((req) => components.includes(req))
    ) {
      return recipe;
    }
  }
  return null;
}

/**
 * Picks the best target recipe to display as a hint for a mid-assembly plate,
 * preferring recipes that are currently ordered on the order board.
 */
export function inferTargetRecipe(components, activeOrders = []) {
  const candidates = matchPartialRecipes(components);
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];
  for (const order of activeOrders) {
    const found = candidates.find((recipe) => recipe.id === order.dishId);
    if (found) return found;
  }
  return candidates[0];
}
