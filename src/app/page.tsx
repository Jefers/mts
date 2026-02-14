'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTripStore } from '@/lib/trip-store';
import {
  Trip,
  TripType,
  CostBreakdown,
  TRIP_TYPE_CONFIG,
  CATEGORY_LABELS,
  CURRENCIES,
  calculateFuelCost,
  createEmptyCosts,
} from '@/lib/trip-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import {
  MapPin,
  Car,
  Sun,
  Bed,
  Tent,
  Settings,
  Plus,
  History,
  Calendar,
  Fuel,
  Banknote,
  Ticket,
  UtensilsCrossed,
  CircleHelp,
  Backpack,
  ChevronDown,
  ChevronUp,
  Trash2,
  Copy,
  Save,
  ArrowLeft,
  Check,
  Users,
  MapPinned,
  Sparkles,
  Menu,
  X,
  Download,
} from 'lucide-react';

// Icon mapping for trip types
const TRIP_ICONS: Record<string, React.ReactNode> = {
  'day-trip': <Sun className="w-4 h-4" />,
  'road-trip': <Car className="w-4 h-4" />,
  'overnight': <Bed className="w-4 h-4" />,
  'camping': <Tent className="w-4 h-4" />,
  'custom': <Settings className="w-4 h-4" />,
};

// Icon mapping for categories
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  fuel: <Fuel className="w-4 h-4" />,
  tolls: <Banknote className="w-4 h-4" />,
  parking: <Car className="w-4 h-4" />,
  vehicleRental: <CircleHelp className="w-4 h-4" />,
  transportTickets: <Ticket className="w-4 h-4" />,
  accommodation: <Bed className="w-4 h-4" />,
  campsiteFee: <Tent className="w-4 h-4" />,
  equipmentRental: <Backpack className="w-4 h-4" />,
  food: <UtensilsCrossed className="w-4 h-4" />,
  activities: <Ticket className="w-4 h-4" />,
  miscellaneous: <CircleHelp className="w-4 h-4" />,
};

type View = 'planner' | 'history' | 'settings';
type CostMode = 'planned' | 'actual';

// Extend WindowEventMap for beforeinstallprompt
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function TripScout() {
  const { toast } = useToast();
  const {
    trips,
    templates,
    settings,
    currentTrip,
    isActualMode,
    createTrip,
    updateTrip,
    deleteTrip,
    duplicateTrip,
    loadTrip,
    clearCurrentTrip,
    updatePlannedCosts,
    updateActualCosts,
    setActualMode,
    updateSettings,
    getUpcomingTrips,
    getPastTrips,
  } = useTripStore();

  const [activeView, setActiveView] = useState<View>('planner');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [showNewTripDialog, setShowNewTripDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [tripToDelete, setTripToDelete] = useState<string | null>(null);
  const [newTripName, setNewTripName] = useState('');
  const [newTripType, setNewTripType] = useState<TripType>('day-trip');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const urlActionProcessedRef = useRef(false);

  // Compute costMode from store state
  const costMode: CostMode = isActualMode ? 'actual' : 'planned';

  // Register service worker on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.error);
    }
  }, []);

  // Handle PWA install prompt
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) return;

    const lastDismissed = localStorage.getItem('installPromptDismissed');
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    const shouldShowPrompt = !lastDismissed || (Date.now() - parseInt(lastDismissed) > oneWeek);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      if (shouldShowPrompt) {
        setTimeout(() => setShowInstallBanner(true), 3000);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Show install banner if no prompt event but should still suggest install
    if (shouldShowPrompt && !installPrompt) {
      const timer = setTimeout(() => {
        // Only show on second visit or after some time
        const firstVisit = localStorage.getItem('firstVisit');
        if (!firstVisit) {
          localStorage.setItem('firstVisit', Date.now().toString());
        } else {
          setShowInstallBanner(true);
        }
      }, 5000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [installPrompt]);

  const handleInstallAccept = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') {
        localStorage.setItem('installPromptAccepted', Date.now().toString());
      }
      setInstallPrompt(null);
    }
    setShowInstallBanner(false);
    localStorage.setItem('installPromptDismissed', Date.now().toString());
  };

  const handleInstallDismiss = () => {
    setShowInstallBanner(false);
    localStorage.setItem('installPromptDismissed', Date.now().toString());
  };

  // Handle URL params for new trip action - only once on mount
  useEffect(() => {
    if (urlActionProcessedRef.current) return;
    urlActionProcessedRef.current = true;
    
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('action') === 'new') {
        // Use setTimeout to defer setState outside of effect
        const timer = setTimeout(() => setShowNewTripDialog(true), 0);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const handleCreateTrip = () => {
    if (!newTripName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a trip name',
        variant: 'destructive',
      });
      return;
    }
    createTrip(newTripName.trim(), newTripType);
    setNewTripName('');
    setNewTripType('day-trip');
    setShowNewTripDialog(false);
    setActiveView('planner');
    toast({
      title: 'Trip Created',
      description: `${newTripName} has been created successfully`,
    });
  };

  const handleLoadTrip = (tripId: string) => {
    loadTrip(tripId);
    setActiveView('planner');
    toast({
      title: 'Trip Loaded',
      description: 'Your trip has been loaded',
    });
  };

  const handleDeleteTrip = () => {
    if (tripToDelete) {
      const trip = trips.find((t) => t.id === tripToDelete);
      deleteTrip(tripToDelete);
      setTripToDelete(null);
      setShowDeleteDialog(false);
      toast({
        title: 'Trip Deleted',
        description: `${trip?.name} has been deleted`,
      });
    }
  };

  const handleDuplicateTrip = (tripId: string) => {
    const newTrip = duplicateTrip(tripId);
    if (newTrip) {
      toast({
        title: 'Trip Duplicated',
        description: `${newTrip.name} has been created`,
      });
    }
  };

  const handleUpdateCost = (
    category: keyof CostBreakdown,
    field: string | null,
    value: number
  ) => {
    if (!currentTrip) return;

    const costs = costMode === 'planned' ? currentTrip.plannedCosts : currentTrip.actualCosts;
    const updatedCosts = { ...costs };

    if (category === 'fuel') {
      const fuel = (updatedCosts.fuel as any) || { distance: 0, pricePerLiter: 0, efficiency: settings.defaultEfficiency };
      updatedCosts.fuel = {
        ...fuel,
        [field || 'value']: value,
      };
    } else {
      (updatedCosts as any)[category] = value;
    }

    if (costMode === 'planned') {
      updatePlannedCosts(currentTrip.id, updatedCosts);
    } else {
      updateActualCosts(currentTrip.id, updatedCosts);
    }
  };

  const handleUpdateTripField = (field: keyof Trip, value: any) => {
    if (!currentTrip) return;
    updateTrip(currentTrip.id, { [field]: value });
  };

  const formatCurrency = (amount: number): string => {
    return `${settings.currencySymbol}${amount.toFixed(settings.decimalPlaces)}`;
  };

  const renderCostInput = (
    category: keyof CostBreakdown,
    costs: CostBreakdown
  ) => {
    const categoryInfo = CATEGORY_LABELS[category];
    const isExpanded = expandedCategories.has(category);

    if (category === 'fuel') {
      const fuel = costs.fuel || { distance: 0, pricePerLiter: 0, efficiency: settings.defaultEfficiency };
      const calculatedCost = calculateFuelCost(costs.fuel);

      return (
        <div key={category} className="glass-card mb-3 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleCategory(category)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20 text-purple-300">
                {CATEGORY_ICONS[category]}
              </div>
              <div>
                <div className="font-medium text-white">{categoryInfo.label}</div>
                <div className="text-sm text-purple-300">
                  {formatCurrency(calculatedCost)}
                </div>
              </div>
            </div>
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-purple-300" />
            ) : (
              <ChevronDown className="w-5 h-5 text-purple-300" />
            )}
          </button>
          {isExpanded && (
            <div className="px-4 pb-4 space-y-3 border-t border-purple-500/20">
              <div className="pt-4 grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs text-purple-300">Distance (km)</Label>
                  <Input
                    type="number"
                    value={fuel.distance || ''}
                    onChange={(e) =>
                      handleUpdateCost(category, 'distance', parseFloat(e.target.value) || 0)
                    }
                    className="glass-input mt-1"
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label className="text-xs text-purple-300">Price/L</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={fuel.pricePerLiter || ''}
                    onChange={(e) =>
                      handleUpdateCost(category, 'pricePerLiter', parseFloat(e.target.value) || 0)
                    }
                    className="glass-input mt-1"
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label className="text-xs text-purple-300">km/L</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={fuel.efficiency || settings.defaultEfficiency}
                    onChange={(e) =>
                      handleUpdateCost(category, 'efficiency', parseFloat(e.target.value) || settings.defaultEfficiency)
                    }
                    className="glass-input mt-1"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    const value = costs[category] as number | undefined;

    return (
      <div key={category} className="glass-card mb-3 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20 text-purple-300">
              {CATEGORY_ICONS[category]}
            </div>
            <Label className="text-white font-medium">{categoryInfo.label}</Label>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-purple-400">{settings.currencySymbol}</span>
            <Input
              type="number"
              step="0.01"
              value={value || ''}
              onChange={(e) =>
                handleUpdateCost(category, null, parseFloat(e.target.value) || 0)
              }
              className="glass-input w-24 text-right"
              placeholder="0.00"
            />
          </div>
        </div>
      </div>
    );
  };

  const renderPlannerView = () => (
    <div className="flex-1 overflow-y-auto custom-scrollbar pb-24">
      {!currentTrip ? (
        // No trip selected - show welcome screen
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center mb-6 animate-float">
            <MapPinned className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Welcome to TripScout</h2>
          <p className="text-purple-300 mb-8 max-w-sm">
            Plan your trips, track expenses, and stay on budget with our smart trip planner.
          </p>
          <Dialog open={showNewTripDialog} onOpenChange={setShowNewTripDialog}>
            <DialogTrigger asChild>
              <Button className="glass-button px-8 py-6 text-lg rounded-2xl">
                <Plus className="w-5 h-5 mr-2" />
                Create Your First Trip
              </Button>
            </DialogTrigger>
            {renderNewTripDialog()}
          </Dialog>
        </div>
      ) : (
        // Trip is selected - show planner
        <div className="px-4 pt-4">
          {/* Trip Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <Input
                value={currentTrip.name}
                onChange={(e) => handleUpdateTripField('name', e.target.value)}
                className="glass-input text-xl font-bold border-none bg-transparent p-0 focus-visible:ring-0"
              />
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1 text-purple-300 text-sm">
                  <Calendar className="w-4 h-4" />
                  <Input
                    type="date"
                    value={currentTrip.date}
                    onChange={(e) => handleUpdateTripField('date', e.target.value)}
                    className="glass-input w-auto text-sm border-none bg-transparent p-0 focus-visible:ring-0"
                  />
                </div>
                <div className="flex items-center gap-1 text-purple-300 text-sm">
                  <Users className="w-4 h-4" />
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={currentTrip.numberOfPeople}
                    onChange={(e) =>
                      handleUpdateTripField('numberOfPeople', parseInt(e.target.value) || 1)
                    }
                    className="glass-input w-12 text-sm text-center border-none bg-transparent p-0 focus-visible:ring-0"
                  />
                  <span>people</span>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                clearCurrentTrip();
                setActiveView('history');
              }}
              className="text-purple-300 hover:text-white hover:bg-purple-500/20"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Trip Type Selector */}
          <div className="mb-6">
            <Label className="text-sm text-purple-300 mb-2 block">Trip Type</Label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(TRIP_TYPE_CONFIG) as TripType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => handleUpdateTripField('type', type)}
                  className={`trip-type-chip flex items-center gap-2 ${
                    currentTrip.type === type ? 'active' : ''
                  }`}
                >
                  {TRIP_ICONS[type]}
                  {TRIP_TYPE_CONFIG[type].label}
                </button>
              ))}
            </div>
          </div>

          {/* Status and Mode */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Badge
                className={
                  currentTrip.status === 'planned'
                    ? 'status-planned'
                    : currentTrip.status === 'active'
                    ? 'status-active'
                    : 'status-completed'
                }
              >
                {currentTrip.status.charAt(0).toUpperCase() + currentTrip.status.slice(1)}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-purple-300">Planned</span>
              <Switch
                checked={isActualMode}
                onCheckedChange={(checked) => {
                  setActualMode(checked);
                  if (checked && currentTrip.status === 'planned') {
                    handleUpdateTripField('status', 'active');
                  }
                }}
              />
              <span className="text-sm text-purple-300">Actual</span>
            </div>
          </div>

          {/* Cost Categories */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-3">
              {costMode === 'planned' ? 'Estimated Costs' : 'Actual Expenses'}
            </h3>
            {TRIP_TYPE_CONFIG[currentTrip.type].categories.map((category) =>
              renderCostInput(
                category,
                costMode === 'planned' ? currentTrip.plannedCosts : currentTrip.actualCosts
              )
            )}
          </div>

          {/* Total Display */}
          <div className="total-display mb-6 purple-glow">
            <div className="text-sm text-purple-300 mb-1">
              {costMode === 'planned' ? 'Total Estimated' : 'Total Actual'}
            </div>
            <div className="text-4xl font-bold gradient-text">
              {formatCurrency(costMode === 'planned' ? currentTrip.totalPlanned : currentTrip.totalActual)}
            </div>
            <div className="text-sm text-purple-300 mt-2">
              {formatCurrency(
                (costMode === 'planned' ? currentTrip.totalPlanned : currentTrip.totalActual) /
                  currentTrip.numberOfPeople
              )}{' '}
              per person
            </div>
            {costMode === 'actual' && currentTrip.totalPlanned > 0 && (
              <div className="mt-4 pt-4 border-t border-purple-500/30">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-purple-300">Budget</span>
                  <span className="text-white">{formatCurrency(currentTrip.totalPlanned)}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-purple-300">Spent</span>
                  <span className="text-white">{formatCurrency(currentTrip.totalActual)}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2 pt-2 border-t border-purple-500/20">
                  <span className="text-purple-300">Variance</span>
                  <span
                    className={
                      currentTrip.variance >= 0 ? 'variance-positive' : 'variance-negative'
                    }
                  >
                    {currentTrip.variance >= 0 ? '+' : ''}
                    {formatCurrency(currentTrip.variance)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mb-6">
            {currentTrip.status === 'active' && (
              <Button
                onClick={() => handleUpdateTripField('status', 'completed')}
                className="flex-1 glass-button rounded-xl py-6"
              >
                <Check className="w-4 h-4 mr-2" />
                Mark Complete
              </Button>
            )}
            <Button
              onClick={() => handleDuplicateTrip(currentTrip.id)}
              variant="outline"
              className="glass-button rounded-xl py-6"
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => {
                setTripToDelete(currentTrip.id);
                setShowDeleteDialog(true);
              }}
              variant="outline"
              className="glass-button text-red-400 hover:text-red-300 rounded-xl py-6"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  const renderHistoryView = () => {
    const upcomingTrips = getUpcomingTrips();
    const pastTrips = getPastTrips();

    return (
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-24 px-4 pt-4">
        {/* Upcoming Trips */}
        {upcomingTrips.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              Upcoming Trips
            </h2>
            <div className="space-y-3">
              {upcomingTrips.map((trip) => (
                <div
                  key={trip.id}
                  onClick={() => handleLoadTrip(trip.id)}
                  className="trip-card cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-white">{trip.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-purple-300 mt-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(trip.date).toLocaleDateString()}
                        <span className="mx-1">•</span>
                        {TRIP_ICONS[trip.type]}
                        {TRIP_TYPE_CONFIG[trip.type].label}
                      </div>
                    </div>
                    <Badge className="status-planned">Planned</Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-purple-300">Budget</span>
                    <span className="text-lg font-semibold text-white">
                      {formatCurrency(trip.totalPlanned)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Past Trips */}
        {pastTrips.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <History className="w-5 h-5 text-purple-400" />
              Trip History
            </h2>
            <div className="space-y-3">
              {pastTrips.map((trip) => (
                <div
                  key={trip.id}
                  onClick={() => handleLoadTrip(trip.id)}
                  className="trip-card cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-white">{trip.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-purple-300 mt-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(trip.date).toLocaleDateString()}
                        <span className="mx-1">•</span>
                        {TRIP_ICONS[trip.type]}
                        {TRIP_TYPE_CONFIG[trip.type].label}
                      </div>
                    </div>
                    <Badge
                      className={
                        trip.status === 'active' ? 'status-active' : 'status-completed'
                      }
                    >
                      {trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
                    </Badge>
                  </div>
                  {trip.totalActual > 0 && (
                    <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <div className="text-purple-400">Budget</div>
                        <div className="text-white font-medium">
                          {formatCurrency(trip.totalPlanned)}
                        </div>
                      </div>
                      <div>
                        <div className="text-purple-400">Actual</div>
                        <div className="text-white font-medium">
                          {formatCurrency(trip.totalActual)}
                        </div>
                      </div>
                      <div>
                        <div className="text-purple-400">Variance</div>
                        <div
                          className={`font-medium ${
                            trip.variance >= 0 ? 'variance-positive' : 'variance-negative'
                          }`}
                        >
                          {trip.variance >= 0 ? '+' : ''}
                          {formatCurrency(trip.variance)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {upcomingTrips.length === 0 && pastTrips.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="w-16 h-16 rounded-2xl bg-purple-500/20 flex items-center justify-center mb-4">
              <History className="w-8 h-8 text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No trips yet</h3>
            <p className="text-purple-300 mb-6">
              Create your first trip to start planning
            </p>
            <Button
              onClick={() => setShowNewTripDialog(true)}
              className="glass-button px-6 py-4 rounded-xl"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Trip
            </Button>
          </div>
        )}

        {/* New Trip Dialog */}
        <Dialog open={showNewTripDialog} onOpenChange={setShowNewTripDialog}>
          {renderNewTripDialog()}
        </Dialog>
      </div>
    );
  };

  const renderSettingsView = () => (
    <div className="flex-1 overflow-y-auto custom-scrollbar pb-24 px-4 pt-4">
      <h2 className="text-xl font-bold text-white mb-6">Settings</h2>

      {/* Currency */}
      <div className="glass-card mb-4 p-4">
        <Label className="text-white font-medium mb-2 block">Currency</Label>
        <Select
          value={settings.currency}
          onValueChange={(value) => updateSettings({ currency: value })}
        >
          <SelectTrigger className="glass-input w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#2e1065] border-purple-500/30">
            {CURRENCIES.map((currency) => (
              <SelectItem
                key={currency.code}
                value={currency.code}
                className="text-white hover:bg-purple-500/20"
              >
                {currency.symbol} {currency.code} - {currency.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Decimal Places */}
      <div className="glass-card mb-4 p-4">
        <Label className="text-white font-medium mb-2 block">Decimal Places</Label>
        <Select
          value={settings.decimalPlaces.toString()}
          onValueChange={(value) => updateSettings({ decimalPlaces: parseInt(value) })}
        >
          <SelectTrigger className="glass-input w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#2e1065] border-purple-500/30">
            <SelectItem value="0" className="text-white hover:bg-purple-500/20">
              0 (whole numbers)
            </SelectItem>
            <SelectItem value="1" className="text-white hover:bg-purple-500/20">
              1 decimal place
            </SelectItem>
            <SelectItem value="2" className="text-white hover:bg-purple-500/20">
              2 decimal places
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Default Fuel Efficiency */}
      <div className="glass-card mb-4 p-4">
        <Label className="text-white font-medium mb-2 block">
          Default Fuel Efficiency (km/L)
        </Label>
        <Input
          type="number"
          step="0.1"
          min="1"
          max="50"
          value={settings.defaultEfficiency}
          onChange={(e) =>
            updateSettings({ defaultEfficiency: parseFloat(e.target.value) || 10 })
          }
          className="glass-input"
        />
      </div>

      {/* App Info */}
      <div className="glass-card mt-8 p-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <MapPin className="w-5 h-5 text-purple-400" />
          <span className="text-lg font-bold gradient-text">TripScout</span>
        </div>
        <p className="text-sm text-purple-300">
          Plan, forecast, and track your trips
        </p>
        <p className="text-xs text-purple-400 mt-2">Version 1.0.0</p>
      </div>
    </div>
  );

  const renderNewTripDialog = () => (
    <DialogContent className="bg-[#1e1033] border-purple-500/30 text-white max-w-md">
      <DialogHeader>
        <DialogTitle className="text-xl gradient-text">Create New Trip</DialogTitle>
        <DialogDescription className="text-purple-300">
          Start planning your next adventure
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div>
          <Label className="text-white mb-2 block">Trip Name</Label>
          <Input
            value={newTripName}
            onChange={(e) => setNewTripName(e.target.value)}
            placeholder="e.g., Weekend Beach Getaway"
            className="glass-input"
          />
        </div>
        <div>
          <Label className="text-white mb-2 block">Trip Type</Label>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(TRIP_TYPE_CONFIG) as TripType[]).map((type) => (
              <button
                key={type}
                onClick={() => setNewTripType(type)}
                className={`trip-type-chip flex items-center justify-center gap-2 ${
                  newTripType === type ? 'active' : ''
                }`}
              >
                {TRIP_ICONS[type]}
                {TRIP_TYPE_CONFIG[type].label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button
          variant="ghost"
          onClick={() => setShowNewTripDialog(false)}
          className="text-purple-300 hover:text-white"
        >
          Cancel
        </Button>
        <Button onClick={handleCreateTrip} className="glass-button">
          <Plus className="w-4 h-4 mr-2" />
          Create Trip
        </Button>
      </DialogFooter>
    </DialogContent>
  );

  return (
    <div className="flex flex-col min-h-screen min-h-[100dvh]">
      {/* Header */}
      <header className="glass-card sticky top-0 z-50 rounded-none border-t-0 border-l-0 border-r-0 px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">TripScout</span>
          </div>
          {currentTrip && (
            <Badge
              className={
                currentTrip.status === 'planned'
                  ? 'status-planned'
                  : currentTrip.status === 'active'
                  ? 'status-active'
                  : 'status-completed'
              }
            >
              {currentTrip.status}
            </Badge>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-lg mx-auto w-full">
        {activeView === 'planner' && renderPlannerView()}
        {activeView === 'history' && renderHistoryView()}
        {activeView === 'settings' && renderSettingsView()}
      </main>

      {/* Floating Action Button */}
      {activeView === 'planner' && !currentTrip && (
        <Dialog open={showNewTripDialog} onOpenChange={setShowNewTripDialog}>
          <DialogTrigger asChild>
            <button className="fab">
              <Plus className="w-6 h-6" />
            </button>
          </DialogTrigger>
          {renderNewTripDialog()}
        </Dialog>
      )}

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <div className="flex items-center justify-around max-w-lg mx-auto">
          <button
            onClick={() => setActiveView('planner')}
            className={`nav-item ${activeView === 'planner' ? 'active' : ''}`}
          >
            <MapPin className="w-5 h-5" />
            <span className="text-xs">Planner</span>
          </button>
          <button
            onClick={() => setActiveView('history')}
            className={`nav-item ${activeView === 'history' ? 'active' : ''}`}
          >
            <History className="w-5 h-5" />
            <span className="text-xs">History</span>
          </button>
          <button
            onClick={() => setActiveView('settings')}
            className={`nav-item ${activeView === 'settings' ? 'active' : ''}`}
          >
            <Settings className="w-5 h-5" />
            <span className="text-xs">Settings</span>
          </button>
        </div>
      </nav>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-[#1e1033] border-purple-500/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Trip?</AlertDialogTitle>
            <AlertDialogDescription className="text-purple-300">
              This action cannot be undone. This will permanently delete your trip
              and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="glass-button">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTrip}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Toaster />

      {/* PWA Install Banner */}
      {showInstallBanner && (
        <div className="fixed bottom-20 left-4 right-4 z-[60] glass-card p-4 rounded-2xl border-purple-500/30 animate-slide-up">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center flex-shrink-0">
                <Download className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-semibold text-white text-sm">Install TripScout</div>
                <div className="text-xs text-purple-300">Add to home screen for quick access</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleInstallDismiss}
                className="px-3 py-1.5 text-xs text-purple-300 hover:text-white transition-colors"
              >
                Later
              </button>
              <button
                onClick={handleInstallAccept}
                className="px-4 py-1.5 text-xs font-medium rounded-lg bg-gradient-to-r from-purple-500 to-purple-700 text-white hover:opacity-90 transition-opacity"
              >
                Install
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
