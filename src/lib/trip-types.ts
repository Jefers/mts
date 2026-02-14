// Trip Types for TripScout PWA

export type TripType = 'day-trip' | 'road-trip' | 'overnight' | 'camping' | 'custom';
export type TripStatus = 'planned' | 'active' | 'completed';

export interface FuelCost {
  distance: number; // in km
  pricePerLiter: number;
  efficiency: number; // km per liter
}

export interface CostBreakdown {
  fuel?: FuelCost;
  tolls?: number;
  parking?: number;
  vehicleRental?: number;
  transportTickets?: number;
  accommodation?: number;
  campsiteFee?: number;
  equipmentRental?: number;
  food?: number;
  activities?: number;
  miscellaneous?: number;
}

export interface TripLocation {
  name: string;
  lat?: number;
  lon?: number;
}

export interface Trip {
  id: string;
  name: string;
  date: string;
  type: TripType;
  status: TripStatus;
  plannedCosts: CostBreakdown;
  actualCosts: CostBreakdown;
  totalPlanned: number;
  totalActual: number;
  variance: number;
  numberOfPeople: number;
  location?: TripLocation;
  customCategories?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TripTemplate {
  id: string;
  name: string;
  type: TripType;
  location?: TripLocation;
  plannedCosts: CostBreakdown;
  customCategories?: string[];
  createdAt: string;
}

export interface AppSettings {
  currency: string;
  currencySymbol: string;
  decimalPlaces: number;
  defaultEfficiency: number; // km per liter
  darkMode: boolean;
}

export const CURRENCIES: { code: string; symbol: string; name: string }[] = [
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'THB', symbol: '฿', name: 'Thai Baht' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah' },
  { code: 'VND', symbol: '₫', name: 'Vietnamese Dong' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
];

export const TRIP_TYPE_CONFIG: Record<TripType, { 
  label: string; 
  icon: string; 
  description: string;
  categories: (keyof CostBreakdown)[];
}> = {
  'day-trip': {
    label: 'Day Trip',
    icon: 'sun',
    description: 'Short trips without overnight stay',
    categories: ['transportTickets', 'parking', 'food', 'activities', 'miscellaneous'],
  },
  'road-trip': {
    label: 'Road Trip',
    icon: 'car',
    description: 'Travel by car with fuel costs',
    categories: ['fuel', 'tolls', 'parking', 'vehicleRental', 'food', 'accommodation', 'activities', 'miscellaneous'],
  },
  'overnight': {
    label: 'Overnight Stay',
    icon: 'bed',
    description: 'Trips with hotel or lodging',
    categories: ['accommodation', 'food', 'activities', 'transportTickets', 'parking', 'miscellaneous'],
  },
  'camping': {
    label: 'Camping',
    icon: 'tent',
    description: 'Outdoor camping adventures',
    categories: ['campsiteFee', 'equipmentRental', 'food', 'fuel', 'transportTickets', 'miscellaneous'],
  },
  'custom': {
    label: 'Custom',
    icon: 'settings',
    description: 'Create your own categories',
    categories: ['fuel', 'tolls', 'parking', 'vehicleRental', 'transportTickets', 'accommodation', 'campsiteFee', 'equipmentRental', 'food', 'activities', 'miscellaneous'],
  },
};

export const CATEGORY_LABELS: Record<keyof CostBreakdown, { label: string; icon: string }> = {
  fuel: { label: 'Fuel', icon: 'fuel' },
  tolls: { label: 'Tolls', icon: 'banknote' },
  parking: { label: 'Parking', icon: 'car' },
  vehicleRental: { label: 'Vehicle Rental', icon: 'key' },
  transportTickets: { label: 'Transport Tickets', icon: 'ticket' },
  accommodation: { label: 'Accommodation', icon: 'bed' },
  campsiteFee: { label: 'Campsite Fee', icon: 'tent' },
  equipmentRental: { label: 'Equipment Rental', icon: 'backpack' },
  food: { label: 'Food & Drinks', icon: 'utensils' },
  activities: { label: 'Activities', icon: 'ticket' },
  miscellaneous: { label: 'Miscellaneous', icon: 'circle-help' },
};

export function calculateFuelCost(fuel?: FuelCost): number {
  if (!fuel || !fuel.distance || !fuel.pricePerLiter || !fuel.efficiency) return 0;
  return (fuel.distance / fuel.efficiency) * fuel.pricePerLiter;
}

export function calculateTotalCost(costs: CostBreakdown): number {
  let total = 0;
  
  if (costs.fuel) {
    total += calculateFuelCost(costs.fuel);
  }
  
  const directCosts: (keyof CostBreakdown)[] = [
    'tolls', 'parking', 'vehicleRental', 'transportTickets',
    'accommodation', 'campsiteFee', 'equipmentRental',
    'food', 'activities', 'miscellaneous'
  ];
  
  for (const key of directCosts) {
    const value = costs[key];
    if (typeof value === 'number') {
      total += value;
    }
  }
  
  return total;
}

export function createEmptyCosts(): CostBreakdown {
  return {};
}

export function createDefaultTrip(name: string = '', type: TripType = 'day-trip'): Trip {
  const now = new Date().toISOString();
  const today = new Date().toISOString().split('T')[0];
  
  return {
    id: generateId(),
    name,
    date: today,
    type,
    status: 'planned',
    plannedCosts: createEmptyCosts(),
    actualCosts: createEmptyCosts(),
    totalPlanned: 0,
    totalActual: 0,
    variance: 0,
    numberOfPeople: 1,
    createdAt: now,
    updatedAt: now,
  };
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
