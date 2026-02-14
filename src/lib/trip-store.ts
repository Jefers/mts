import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  Trip,
  TripTemplate,
  AppSettings,
  createDefaultTrip,
  generateId,
  calculateTotalCost,
  TripType,
  CURRENCIES,
} from './trip-types';

interface TripStore {
  // State
  trips: Trip[];
  templates: TripTemplate[];
  settings: AppSettings;
  currentTrip: Trip | null;
  isActualMode: boolean;

  // Trip Actions
  createTrip: (name: string, type: TripType) => Trip;
  updateTrip: (id: string, updates: Partial<Trip>) => void;
  deleteTrip: (id: string) => void;
  duplicateTrip: (id: string) => Trip | null;
  loadTrip: (id: string) => void;
  clearCurrentTrip: () => void;
  
  // Cost Actions
  updatePlannedCosts: (tripId: string, costs: Trip['plannedCosts']) => void;
  updateActualCosts: (tripId: string, costs: Trip['actualCosts']) => void;
  
  // Mode Actions
  setActualMode: (isActual: boolean) => void;
  
  // Template Actions
  saveAsTemplate: (tripId: string, templateName: string) => void;
  createTripFromTemplate: (templateId: string, name: string) => Trip | null;
  deleteTemplate: (id: string) => void;
  
  // Settings Actions
  updateSettings: (settings: Partial<AppSettings>) => void;
  
  // Utility
  getTripsByStatus: (status: Trip['status']) => Trip[];
  getUpcomingTrips: () => Trip[];
  getPastTrips: () => Trip[];
  recalculateTotals: (tripId: string) => void;
}

const defaultSettings: AppSettings = {
  currency: 'PHP',
  currencySymbol: '₱',
  decimalPlaces: 2,
  defaultEfficiency: 10, // 10 km per liter
  darkMode: false,
};

export const useTripStore = create<TripStore>()(
  persist(
    (set, get) => ({
      // Initial State
      trips: [],
      templates: [],
      settings: defaultSettings,
      currentTrip: null,
      isActualMode: false,

      // Trip Actions
      createTrip: (name: string, type: TripType) => {
        const trip = createDefaultTrip(name, type);
        set((state) => ({
          trips: [...state.trips, trip],
          currentTrip: trip,
          isActualMode: false,
        }));
        return trip;
      },

      updateTrip: (id: string, updates: Partial<Trip>) => {
        set((state) => ({
          trips: state.trips.map((trip) =>
            trip.id === id
              ? { ...trip, ...updates, updatedAt: new Date().toISOString() }
              : trip
          ),
          currentTrip:
            state.currentTrip?.id === id
              ? { ...state.currentTrip, ...updates, updatedAt: new Date().toISOString() }
              : state.currentTrip,
        }));
        get().recalculateTotals(id);
      },

      deleteTrip: (id: string) => {
        set((state) => ({
          trips: state.trips.filter((trip) => trip.id !== id),
          currentTrip: state.currentTrip?.id === id ? null : state.currentTrip,
        }));
      },

      duplicateTrip: (id: string) => {
        const trip = get().trips.find((t) => t.id === id);
        if (!trip) return null;

        const newTrip: Trip = {
          ...trip,
          id: generateId(),
          name: `${trip.name} (Copy)`,
          status: 'planned',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        set((state) => ({
          trips: [...state.trips, newTrip],
        }));

        return newTrip;
      },

      loadTrip: (id: string) => {
        const trip = get().trips.find((t) => t.id === id);
        if (trip) {
          set({
            currentTrip: trip,
            isActualMode: trip.status === 'active' || trip.status === 'completed',
          });
        }
      },

      clearCurrentTrip: () => {
        set({ currentTrip: null, isActualMode: false });
      },

      // Cost Actions
      updatePlannedCosts: (tripId: string, costs: Trip['plannedCosts']) => {
        set((state) => ({
          trips: state.trips.map((trip) =>
            trip.id === tripId
              ? {
                  ...trip,
                  plannedCosts: costs,
                  totalPlanned: calculateTotalCost(costs),
                  variance: calculateTotalCost(costs) - trip.totalActual,
                  updatedAt: new Date().toISOString(),
                }
              : trip
          ),
          currentTrip:
            state.currentTrip?.id === tripId
              ? {
                  ...state.currentTrip,
                  plannedCosts: costs,
                  totalPlanned: calculateTotalCost(costs),
                  variance: calculateTotalCost(costs) - state.currentTrip.totalActual,
                  updatedAt: new Date().toISOString(),
                }
              : state.currentTrip,
        }));
      },

      updateActualCosts: (tripId: string, costs: Trip['actualCosts']) => {
        set((state) => ({
          trips: state.trips.map((trip) =>
            trip.id === tripId
              ? {
                  ...trip,
                  actualCosts: costs,
                  totalActual: calculateTotalCost(costs),
                  variance: trip.totalPlanned - calculateTotalCost(costs),
                  updatedAt: new Date().toISOString(),
                }
              : trip
          ),
          currentTrip:
            state.currentTrip?.id === tripId
              ? {
                  ...state.currentTrip,
                  actualCosts: costs,
                  totalActual: calculateTotalCost(costs),
                  variance: state.currentTrip.totalPlanned - calculateTotalCost(costs),
                  updatedAt: new Date().toISOString(),
                }
              : state.currentTrip,
        }));
      },

      // Mode Actions
      setActualMode: (isActual: boolean) => {
        set({ isActualMode: isActual });
      },

      // Template Actions
      saveAsTemplate: (tripId: string, templateName: string) => {
        const trip = get().trips.find((t) => t.id === tripId);
        if (!trip) return;

        const template: TripTemplate = {
          id: generateId(),
          name: templateName,
          type: trip.type,
          location: trip.location,
          plannedCosts: { ...trip.plannedCosts },
          customCategories: trip.customCategories,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          templates: [...state.templates, template],
        }));
      },

      createTripFromTemplate: (templateId: string, name: string) => {
        const template = get().templates.find((t) => t.id === templateId);
        if (!template) return null;

        const trip: Trip = {
          id: generateId(),
          name,
          date: new Date().toISOString().split('T')[0],
          type: template.type,
          status: 'planned',
          plannedCosts: { ...template.plannedCosts },
          actualCosts: {},
          totalPlanned: calculateTotalCost(template.plannedCosts),
          totalActual: 0,
          variance: calculateTotalCost(template.plannedCosts),
          numberOfPeople: 1,
          location: template.location,
          customCategories: template.customCategories,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        set((state) => ({
          trips: [...state.trips, trip],
          currentTrip: trip,
          isActualMode: false,
        }));

        return trip;
      },

      deleteTemplate: (id: string) => {
        set((state) => ({
          templates: state.templates.filter((t) => t.id !== id),
        }));
      },

      // Settings Actions
      updateSettings: (newSettings: Partial<AppSettings>) => {
        set((state) => {
          const updated = { ...state.settings, ...newSettings };
          
          // Update currency symbol if currency changed
          if (newSettings.currency) {
            const currencyInfo = CURRENCIES.find((c) => c.code === newSettings.currency);
            if (currencyInfo) {
              updated.currencySymbol = currencyInfo.symbol;
            }
          }
          
          return { settings: updated };
        });
      },

      // Utility
      getTripsByStatus: (status: Trip['status']) => {
        return get().trips.filter((trip) => trip.status === status);
      },

      getUpcomingTrips: () => {
        const today = new Date().toISOString().split('T')[0];
        return get().trips.filter(
          (trip) => trip.date >= today && trip.status === 'planned'
        ).sort((a, b) => a.date.localeCompare(b.date));
      },

      getPastTrips: () => {
        const today = new Date().toISOString().split('T')[0];
        return get().trips.filter(
          (trip) => trip.date < today || trip.status === 'completed'
        ).sort((a, b) => b.date.localeCompare(a.date));
      },

      recalculateTotals: (tripId: string) => {
        const trip = get().trips.find((t) => t.id === tripId);
        if (!trip) return;

        const totalPlanned = calculateTotalCost(trip.plannedCosts);
        const totalActual = calculateTotalCost(trip.actualCosts);
        const variance = totalPlanned - totalActual;

        set((state) => ({
          trips: state.trips.map((t) =>
            t.id === tripId
              ? { ...t, totalPlanned, totalActual, variance }
              : t
          ),
          currentTrip:
            state.currentTrip?.id === tripId
              ? { ...state.currentTrip, totalPlanned, totalActual, variance }
              : state.currentTrip,
        }));
      },
    }),
    {
      name: 'tripscout-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        trips: state.trips,
        templates: state.templates,
        settings: state.settings,
      }),
    }
  )
);
