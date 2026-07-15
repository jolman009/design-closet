// Shared app state + design constants.
export const S = {
  user: null, // Supabase user object once authenticated
  items: [],
  events: [],
  outfits: [],
  profile: null,
  tab: 'home',
  closetFilter: 'all',
  occasion: 'work',
  genOutfit: null,
  weather: { temp: 22, desc: 'Sunny & Dry', icon: 'sunny' },
  loaded: false,
  online: navigator.onLine,
  _homeFit: null,
}

export const COLOR_HEX = {
  white: '#f2f0ea', ecru: '#e9e0cf', sand: '#d8c9ae', camel: '#b3906a', tobacco: '#8a5a2b',
  espresso: '#4b3427', sage: '#8da399', olive: '#6b7d5e', slate: '#64748b', indigo: '#3f4a6b', navy: '#2c3550',
  charcoal: '#3a3a38', black: '#1d1d1b', grey: '#9a9a94', burgundy: '#6e2b3a', blush: '#e2b7ad', cream: '#f4ecdd',
}

export const CAT_ICON = {
  top: 'apparel', bottom: 'styler', dress: 'checkroom', outerwear: 'checkroom',
  shoes: 'steps', accessory: 'shopping_bag',
}
export const CAT_LABEL = {
  top: 'Tops', bottom: 'Bottoms', dress: 'Dresses', outerwear: 'Outerwear',
  shoes: 'Shoes', accessory: 'Accessories',
}
export const EVENT_ICON = {
  work: 'work', date: 'restaurant', casual: 'weekend', formal: 'diamond',
  active: 'exercise', travel: 'flight_takeoff',
}
export const OCCASIONS = [
  { key: 'work', label: 'Work', icon: 'work' },
  { key: 'date', label: 'Date Night', icon: 'restaurant' },
  { key: 'casual', label: 'Casual', icon: 'weekend' },
  { key: 'formal', label: 'Formal', icon: 'diamond' },
  { key: 'active', label: 'Active', icon: 'exercise' },
  { key: 'travel', label: 'Travel', icon: 'flight_takeoff' },
]
export const OUTFIT_NAMES = {
  work: ['The Executive Minimalist', 'The Modern Professional', 'Boardroom Poise', 'The Tailored Standard', 'Quiet Authority'],
  date: ['Midnight Sophistication', 'Candlelight Charm', 'The Evening Edit', 'Velvet Hour', 'The Slow Dinner'],
  casual: ['Effortless Sunday', 'The Weekend Uniform', 'Café Minimalist', 'Easy Elegance', 'The Morning Stroll'],
  formal: ['The Gallery Opening', 'Evening Couture', 'The Grand Occasion', 'Monochrome Formal', 'First Impression'],
  active: ['Motion Ready', 'The Morning Run', 'Studio to Street'],
  travel: ['Terminal Chic', 'The Departure Look', 'Carry-On Curated'],
}

export const TABS = [
  { key: 'home', label: 'Home', icon: 'home' },
  { key: 'closet', label: 'Closet', icon: 'checkroom' },
  { key: 'outfits', label: 'Outfits', icon: 'styler' },
  { key: 'events', label: 'Events', icon: 'calendar_month' },
  { key: 'profile', label: 'Profile', icon: 'person' },
]
