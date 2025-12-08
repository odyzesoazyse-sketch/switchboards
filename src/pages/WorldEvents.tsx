import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { format, isAfter, isBefore, parseISO, addDays } from "date-fns";
import { 
  Calendar as CalendarIcon, 
  MapPin, 
  Users, 
  Trophy, 
  ArrowRight, 
  Search,
  Plus,
  Globe,
  Filter,
  X,
  Clock,
  Flame,
  TrendingUp,
  Star,
  ChevronDown,
  Map,
  List,
  Plane,
  Heart,
  Share2,
  ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Battle {
  id: string;
  name: string;
  date: string;
  location: string | null;
  phase: string;
  nomination_count: number;
  organizer_id: string;
}

interface FilterState {
  search: string;
  continent: string;
  country: string;
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  phase: string;
  style: string;
}

// Country data with coordinates for map
const COUNTRIES_DATA: Record<string, { name: string; continent: string; flag: string }> = {
  "USA": { name: "United States", continent: "North America", flag: "🇺🇸" },
  "France": { name: "France", continent: "Europe", flag: "🇫🇷" },
  "Japan": { name: "Japan", continent: "Asia", flag: "🇯🇵" },
  "Germany": { name: "Germany", continent: "Europe", flag: "🇩🇪" },
  "UK": { name: "United Kingdom", continent: "Europe", flag: "🇬🇧" },
  "Brazil": { name: "Brazil", continent: "South America", flag: "🇧🇷" },
  "South Korea": { name: "South Korea", continent: "Asia", flag: "🇰🇷" },
  "Russia": { name: "Russia", continent: "Europe", flag: "🇷🇺" },
  "Netherlands": { name: "Netherlands", continent: "Europe", flag: "🇳🇱" },
  "Poland": { name: "Poland", continent: "Europe", flag: "🇵🇱" },
  "Spain": { name: "Spain", continent: "Europe", flag: "🇪🇸" },
  "Italy": { name: "Italy", continent: "Europe", flag: "🇮🇹" },
  "Canada": { name: "Canada", continent: "North America", flag: "🇨🇦" },
  "Australia": { name: "Australia", continent: "Oceania", flag: "🇦🇺" },
  "China": { name: "China", continent: "Asia", flag: "🇨🇳" },
  "India": { name: "India", continent: "Asia", flag: "🇮🇳" },
  "Mexico": { name: "Mexico", continent: "North America", flag: "🇲🇽" },
  "South Africa": { name: "South Africa", continent: "Africa", flag: "🇿🇦" },
  "Egypt": { name: "Egypt", continent: "Africa", flag: "🇪🇬" },
  "Argentina": { name: "Argentina", continent: "South America", flag: "🇦🇷" },
};

const CONTINENTS = ["All", "Europe", "North America", "South America", "Asia", "Africa", "Oceania"];

const DANCE_STYLES = ["All Styles", "Breaking", "Hip-Hop", "Popping", "Locking", "House", "Krump", "Waacking", "All Styles Battle"];

// Sample fictional battles data
const SAMPLE_BATTLES = [
  { name: "Red Bull BC One World Final 2025", location: "Tokyo, Japan", date: "2025-11-15", phase: "registration" },
  { name: "Battle of the Year 2025", location: "Montpellier, France", date: "2025-10-20", phase: "registration" },
  { name: "Outbreak Europe", location: "Bochum, Germany", date: "2025-06-14", phase: "selection" },
  { name: "UK B-Boy Championships", location: "London, UK", date: "2025-09-28", phase: "registration" },
  { name: "R16 Korea", location: "Seoul, South Korea", date: "2025-08-10", phase: "bracket" },
  { name: "Freestyle Session World Finals", location: "Los Angeles, USA", date: "2025-07-25", phase: "registration" },
  { name: "IBE - Notorious IBE", location: "Heerlen, Netherlands", date: "2025-08-22", phase: "registration" },
  { name: "Summer Dance Forever", location: "Amsterdam, Netherlands", date: "2025-08-01", phase: "selection" },
  { name: "Silverback Open", location: "Philadelphia, USA", date: "2025-05-17", phase: "bracket" },
  { name: "Juste Debout World Final", location: "Paris, France", date: "2025-03-09", phase: "completed" },
  { name: "Floor Wars International", location: "Copenhagen, Denmark", date: "2025-04-05", phase: "completed" },
  { name: "World B-Boy Classic", location: "Rotterdam, Netherlands", date: "2025-02-22", phase: "completed" },
  { name: "Undisputed Masters", location: "Berlin, Germany", date: "2025-12-20", phase: "registration" },
  { name: "Chelles Battle Pro", location: "Paris, France", date: "2025-02-15", phase: "completed" },
  { name: "Hip Opsession", location: "Nantes, France", date: "2025-03-28", phase: "completed" },
  { name: "SDK Europe", location: "Berlin, Germany", date: "2025-09-05", phase: "registration" },
  { name: "King of the Kidz", location: "Warsaw, Poland", date: "2025-06-21", phase: "registration" },
  { name: "Radikal Forze Jam", location: "Singapore", date: "2025-10-11", phase: "registration" },
  { name: "B-Boy Park", location: "Tokyo, Japan", date: "2025-08-15", phase: "selection" },
  { name: "Hip Hop International", location: "Phoenix, USA", date: "2025-08-08", phase: "registration" },
  { name: "Street Star", location: "Stockholm, Sweden", date: "2025-09-14", phase: "registration" },
  { name: "Funk Stylers World Final", location: "Osaka, Japan", date: "2025-11-22", phase: "registration" },
  { name: "Battle De Vaulx", location: "Lyon, France", date: "2025-10-04", phase: "registration" },
  { name: "UnVsti Vilnius", location: "Vilnius, Lithuania", date: "2025-07-12", phase: "registration" },
  { name: "Break The Floor", location: "Moscow, Russia", date: "2025-05-24", phase: "selection" },
  { name: "The Notorious IBE", location: "Heerlen, Netherlands", date: "2025-08-23", phase: "registration" },
  { name: "Red Bull Dance Your Style", location: "Johannesburg, South Africa", date: "2025-09-20", phase: "registration" },
  { name: "World of Dance Finals", location: "Los Angeles, USA", date: "2025-08-03", phase: "registration" },
  { name: "Keep On Dancing", location: "Barcelona, Spain", date: "2025-06-07", phase: "registration" },
  { name: "Battle Of Est", location: "Kraków, Poland", date: "2025-11-08", phase: "registration" },
];

export default function WorldEvents() {
  const navigate = useNavigate();
  const [battles, setBattles] = useState<Battle[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list" | "calendar">("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    continent: "All",
    country: "",
    dateFrom: undefined,
    dateTo: undefined,
    phase: "all",
    style: "All Styles",
  });

  // New event form state
  const [newEvent, setNewEvent] = useState({
    name: "",
    location: "",
    date: new Date(),
    description: "",
    website: "",
    style: "Breaking",
  });

  useEffect(() => {
    loadBattles();
    // Load favorites from localStorage
    const savedFavorites = localStorage.getItem("eventFavorites");
    if (savedFavorites) {
      setFavorites(new Set(JSON.parse(savedFavorites)));
    }
  }, []);

  const loadBattles = async () => {
    try {
      const { data, error } = await supabase
        .from("battles")
        .select(`*, nominations (count)`)
        .order("date", { ascending: true });

      if (error) throw error;

      if (data) {
        const battlesWithCounts = data.map(b => ({
          ...b,
          nomination_count: b.nominations?.[0]?.count || 0,
        }));
        setBattles(battlesWithCounts);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = (id: string) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(id)) {
        newFavorites.delete(id);
      } else {
        newFavorites.add(id);
      }
      localStorage.setItem("eventFavorites", JSON.stringify([...newFavorites]));
      return newFavorites;
    });
  };

  const getPhaseInfo = (phase: string) => {
    switch (phase) {
      case "registration":
        return { label: "Open", color: "bg-success/15 text-success border-success/30", icon: Flame };
      case "selection":
        return { label: "Selection", color: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30", icon: Clock };
      case "bracket":
        return { label: "Live", color: "bg-primary/15 text-primary border-primary/30", icon: TrendingUp };
      case "completed":
        return { label: "Completed", color: "bg-muted text-muted-foreground border-border", icon: Trophy };
      default:
        return { label: phase, color: "bg-muted text-muted-foreground border-border", icon: Star };
    }
  };

  const getCountryFromLocation = (location: string | null): string => {
    if (!location) return "";
    const parts = location.split(",");
    const lastPart = parts[parts.length - 1]?.trim();
    return lastPart || "";
  };

  const getContinentFromLocation = (location: string | null): string => {
    const country = getCountryFromLocation(location);
    return COUNTRIES_DATA[country]?.continent || "";
  };

  const getFlagFromLocation = (location: string | null): string => {
    const country = getCountryFromLocation(location);
    return COUNTRIES_DATA[country]?.flag || "🌍";
  };

  // Filter battles based on current filter state
  const filteredBattles = useMemo(() => {
    return battles.filter(battle => {
      // Search filter
      if (filters.search && !battle.name.toLowerCase().includes(filters.search.toLowerCase()) && 
          !battle.location?.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }

      // Continent filter
      if (filters.continent !== "All") {
        const continent = getContinentFromLocation(battle.location);
        if (continent !== filters.continent) return false;
      }

      // Country filter
      if (filters.country) {
        const country = getCountryFromLocation(battle.location);
        if (!country.toLowerCase().includes(filters.country.toLowerCase())) return false;
      }

      // Date range filter
      if (filters.dateFrom) {
        const battleDate = parseISO(battle.date);
        if (isBefore(battleDate, filters.dateFrom)) return false;
      }
      if (filters.dateTo) {
        const battleDate = parseISO(battle.date);
        if (isAfter(battleDate, filters.dateTo)) return false;
      }

      // Phase filter
      if (filters.phase !== "all" && battle.phase !== filters.phase) {
        return false;
      }

      return true;
    });
  }, [battles, filters]);

  // Group battles by time
  const upcomingBattles = filteredBattles.filter(b => 
    b.phase === "registration" || b.phase === "selection" || b.phase === "bracket"
  );
  const pastBattles = filteredBattles.filter(b => b.phase === "completed");

  // Group by month for calendar view
  const battlesByMonth = useMemo(() => {
    const groups: Record<string, Battle[]> = {};
    filteredBattles.forEach(battle => {
      const month = format(parseISO(battle.date), "MMMM yyyy");
      if (!groups[month]) groups[month] = [];
      groups[month].push(battle);
    });
    return groups;
  }, [filteredBattles]);

  // Stats
  const stats = useMemo(() => ({
    total: filteredBattles.length,
    upcoming: upcomingBattles.length,
    live: filteredBattles.filter(b => b.phase === "bracket").length,
    countries: new Set(filteredBattles.map(b => getCountryFromLocation(b.location)).filter(Boolean)).size,
  }), [filteredBattles, upcomingBattles]);

  const handleSubmitEvent = async () => {
    const { data: session } = await supabase.auth.getSession();
    
    if (!session?.session?.user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to submit an event",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    try {
      const { error } = await supabase.from("battles").insert({
        name: newEvent.name,
        location: newEvent.location,
        date: newEvent.date.toISOString(),
        organizer_id: session.session.user.id,
        phase: "registration",
      });

      if (error) throw error;

      toast({
        title: "Event submitted!",
        description: "Your event has been added to the global calendar.",
      });

      setIsSubmitDialogOpen(false);
      setNewEvent({ name: "", location: "", date: new Date(), description: "", website: "", style: "Breaking" });
      loadBattles();
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to submit event. Please try again.",
        variant: "destructive",
      });
    }
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      continent: "All",
      country: "",
      dateFrom: undefined,
      dateTo: undefined,
      phase: "all",
      style: "All Styles",
    });
  };

  const hasActiveFilters = filters.continent !== "All" || filters.country || filters.dateFrom || filters.dateTo || filters.phase !== "all";

  const shareEvent = (battle: Battle) => {
    if (navigator.share) {
      navigator.share({
        title: battle.name,
        text: `Check out ${battle.name} on ${format(parseISO(battle.date), "MMMM d, yyyy")} in ${battle.location}`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({ title: "Link copied!", description: "Event link copied to clipboard" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Globe className="w-16 h-16 mx-auto text-primary animate-pulse mb-4" />
          <p className="text-muted-foreground">Loading events worldwide...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <h1 
            className="text-xl sm:text-2xl font-display font-bold tracking-tight cursor-pointer"
            onClick={() => navigate("/")}
          >
            SWITCHBOARD
          </h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/battles")}>
              My Region
            </Button>
            <Button onClick={() => navigate("/auth")} size="sm">
              Sign In
            </Button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Hero Section */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
            <Globe className="w-4 h-4" />
            <span className="text-sm font-medium">Global Dance Events</span>
          </div>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold mb-4">
            Discover Battles <span className="text-gradient-mixed">Worldwide</span>
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Find breaking, hip-hop, and street dance events happening around the globe. 
            Travel, compete, and connect with the dance community.
          </p>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto mb-8">
            <div className="glass rounded-xl p-4">
              <div className="text-2xl sm:text-3xl font-bold text-foreground">{stats.total}</div>
              <div className="text-xs sm:text-sm text-muted-foreground">Total Events</div>
            </div>
            <div className="glass rounded-xl p-4">
              <div className="text-2xl sm:text-3xl font-bold text-success">{stats.upcoming}</div>
              <div className="text-xs sm:text-sm text-muted-foreground">Upcoming</div>
            </div>
            <div className="glass rounded-xl p-4">
              <div className="text-2xl sm:text-3xl font-bold text-primary">{stats.live}</div>
              <div className="text-xs sm:text-sm text-muted-foreground">Live Now</div>
            </div>
            <div className="glass rounded-xl p-4">
              <div className="text-2xl sm:text-3xl font-bold text-secondary">{stats.countries}</div>
              <div className="text-xs sm:text-sm text-muted-foreground">Countries</div>
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search events, cities, countries..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="pl-12 h-12 text-base"
            />
            {filters.search && (
              <button 
                onClick={() => setFilters(prev => ({ ...prev, search: "" }))}
                className="absolute right-4 top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-2">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as typeof viewMode)} className="hidden sm:block">
              <TabsList className="h-12">
                <TabsTrigger value="grid" className="px-4">
                  <Map className="w-4 h-4 mr-2" />
                  Grid
                </TabsTrigger>
                <TabsTrigger value="list" className="px-4">
                  <List className="w-4 h-4 mr-2" />
                  List
                </TabsTrigger>
                <TabsTrigger value="calendar" className="px-4">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  Calendar
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Button 
              variant={showFilters ? "default" : "outline"} 
              onClick={() => setShowFilters(!showFilters)}
              className="h-12"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center">
                  !
                </Badge>
              )}
            </Button>

            {/* Submit Event Button */}
            <Dialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
              <DialogTrigger asChild>
                <Button className="h-12 bg-gradient-to-r from-primary to-secondary text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Submit Event</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-xl font-display">Submit Your Event</DialogTitle>
                  <DialogDescription>
                    Add your dance event to the global calendar for dancers worldwide to discover.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label>Event Name *</Label>
                    <Input 
                      placeholder="e.g., Red Bull BC One Cypher" 
                      value={newEvent.name}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Location *</Label>
                    <Input 
                      placeholder="e.g., Tokyo, Japan" 
                      value={newEvent.location}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, location: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Date *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(newEvent.date, "PPP")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={newEvent.date}
                          onSelect={(date) => date && setNewEvent(prev => ({ ...prev, date }))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label>Dance Style</Label>
                    <Select 
                      value={newEvent.style} 
                      onValueChange={(value) => setNewEvent(prev => ({ ...prev, style: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DANCE_STYLES.slice(1).map(style => (
                          <SelectItem key={style} value={style}>{style}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea 
                      placeholder="Tell dancers about your event..."
                      value={newEvent.description}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Website (optional)</Label>
                    <Input 
                      placeholder="https://..." 
                      value={newEvent.website}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, website: e.target.value }))}
                    />
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={handleSubmitEvent}
                    disabled={!newEvent.name || !newEvent.location}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Submit Event
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <Card className="mb-6 animate-in slide-in-from-top-2 duration-200">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Continent */}
                <div>
                  <Label className="text-sm text-muted-foreground mb-2 block">Continent</Label>
                  <Select 
                    value={filters.continent} 
                    onValueChange={(value) => setFilters(prev => ({ ...prev, continent: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTINENTS.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Country */}
                <div>
                  <Label className="text-sm text-muted-foreground mb-2 block">Country</Label>
                  <Input 
                    placeholder="Any country"
                    value={filters.country}
                    onChange={(e) => setFilters(prev => ({ ...prev, country: e.target.value }))}
                  />
                </div>

                {/* Date From */}
                <div>
                  <Label className="text-sm text-muted-foreground mb-2 block">From Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.dateFrom ? format(filters.dateFrom, "MMM d") : "Any"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filters.dateFrom}
                        onSelect={(date) => setFilters(prev => ({ ...prev, dateFrom: date }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Date To */}
                <div>
                  <Label className="text-sm text-muted-foreground mb-2 block">To Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.dateTo ? format(filters.dateTo, "MMM d") : "Any"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filters.dateTo}
                        onSelect={(date) => setFilters(prev => ({ ...prev, dateTo: date }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Status */}
                <div>
                  <Label className="text-sm text-muted-foreground mb-2 block">Status</Label>
                  <Select 
                    value={filters.phase} 
                    onValueChange={(value) => setFilters(prev => ({ ...prev, phase: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="registration">Open</SelectItem>
                      <SelectItem value="selection">Selection</SelectItem>
                      <SelectItem value="bracket">Live</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {hasActiveFilters && (
                <div className="flex justify-end mt-4">
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="w-4 h-4 mr-2" />
                    Clear filters
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Continent Quick Filters */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
          {CONTINENTS.map(continent => (
            <Button
              key={continent}
              variant={filters.continent === continent ? "default" : "outline"}
              size="sm"
              onClick={() => setFilters(prev => ({ ...prev, continent }))}
              className="whitespace-nowrap"
            >
              {continent === "All" ? "🌍" : ""} {continent}
            </Button>
          ))}
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{filteredBattles.length}</span> events
            {filters.continent !== "All" && ` in ${filters.continent}`}
          </p>
        </div>

        {/* Grid View */}
        {viewMode === "grid" && (
          <>
            {/* Upcoming Events */}
            {upcomingBattles.length > 0 && (
              <section className="mb-12">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                    <Flame className="w-5 h-5 text-success" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-display font-bold">Upcoming Events</h2>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {upcomingBattles.map((battle) => {
                    const phaseInfo = getPhaseInfo(battle.phase);
                    const PhaseIcon = phaseInfo.icon;
                    return (
                      <Card
                        key={battle.id}
                        className="group cursor-pointer hover-lift border-border/50 hover:border-primary/30 overflow-hidden relative"
                        onClick={() => navigate(`/battles/${battle.id}`)}
                      >
                        {/* Favorite Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(battle.id);
                          }}
                          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-background/80 backdrop-blur flex items-center justify-center hover:bg-background transition-colors"
                        >
                          <Heart 
                            className={cn(
                              "w-4 h-4 transition-colors",
                              favorites.has(battle.id) ? "fill-primary text-primary" : "text-muted-foreground"
                            )} 
                          />
                        </button>

                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-2 pr-8">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">{getFlagFromLocation(battle.location)}</span>
                              <CardTitle className="text-lg group-hover:text-primary transition-colors line-clamp-1">
                                {battle.name}
                              </CardTitle>
                            </div>
                          </div>
                          <CardDescription className="flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4 flex-shrink-0" />
                            {format(parseISO(battle.date), "EEE, MMM d, yyyy")}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="space-y-3">
                            {battle.location && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <MapPin className="w-4 h-4 flex-shrink-0" />
                                <span className="truncate">{battle.location}</span>
                              </div>
                            )}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Users className="w-4 h-4" />
                                {battle.nomination_count} {battle.nomination_count === 1 ? "category" : "categories"}
                              </div>
                              <Badge variant="outline" className={cn("flex items-center gap-1", phaseInfo.color)}>
                                <PhaseIcon className="w-3 h-3" />
                                {phaseInfo.label}
                              </Badge>
                            </div>
                            
                            {/* Quick Actions */}
                            <div className="flex gap-2 pt-2 border-t border-border/50">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="flex-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  shareEvent(battle);
                                }}
                              >
                                <Share2 className="w-4 h-4 mr-1" />
                                Share
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="flex-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/battles/${battle.id}`);
                                }}
                              >
                                <Plane className="w-4 h-4 mr-1" />
                                Details
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Past Events */}
            {pastBattles.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-display font-bold text-muted-foreground">Past Events</h2>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {pastBattles.map((battle) => (
                    <Card 
                      key={battle.id} 
                      className="border-border/30 opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
                      onClick={() => navigate(`/battles/${battle.id}`)}
                    >
                      <CardHeader className="py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getFlagFromLocation(battle.location)}</span>
                          <CardTitle className="text-base line-clamp-1">{battle.name}</CardTitle>
                        </div>
                        <CardDescription className="flex items-center gap-2 text-xs">
                          <CalendarIcon className="w-3 h-3" />
                          {format(parseISO(battle.date), "MMM d, yyyy")}
                          {battle.location && (
                            <>
                              <span className="text-border">•</span>
                              <span className="truncate">{battle.location}</span>
                            </>
                          )}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* List View */}
        {viewMode === "list" && (
          <div className="space-y-2">
            {filteredBattles.map((battle) => {
              const phaseInfo = getPhaseInfo(battle.phase);
              const PhaseIcon = phaseInfo.icon;
              return (
                <Card
                  key={battle.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => navigate(`/battles/${battle.id}`)}
                >
                  <CardContent className="py-4">
                    <div className="flex items-center gap-4">
                      <span className="text-2xl">{getFlagFromLocation(battle.location)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold truncate">{battle.name}</h3>
                          <Badge variant="outline" className={cn("flex-shrink-0", phaseInfo.color)}>
                            <PhaseIcon className="w-3 h-3 mr-1" />
                            {phaseInfo.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <CalendarIcon className="w-3 h-3" />
                            {format(parseISO(battle.date), "MMM d, yyyy")}
                          </span>
                          {battle.location && (
                            <span className="flex items-center gap-1 truncate">
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              {battle.location}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(battle.id);
                          }}
                          className="p-2 hover:bg-muted rounded-lg"
                        >
                          <Heart 
                            className={cn(
                              "w-4 h-4",
                              favorites.has(battle.id) ? "fill-primary text-primary" : "text-muted-foreground"
                            )} 
                          />
                        </button>
                        <ArrowRight className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Calendar View */}
        {viewMode === "calendar" && (
          <div className="space-y-8">
            {Object.entries(battlesByMonth).map(([month, monthBattles]) => (
              <section key={month}>
                <h3 className="text-lg font-display font-bold mb-4 sticky top-20 bg-background py-2 z-10">
                  {month}
                </h3>
                <div className="space-y-2">
                  {monthBattles.map((battle) => {
                    const phaseInfo = getPhaseInfo(battle.phase);
                    return (
                      <Card
                        key={battle.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => navigate(`/battles/${battle.id}`)}
                      >
                        <CardContent className="py-3">
                          <div className="flex items-center gap-4">
                            <div className="text-center min-w-[50px]">
                              <div className="text-2xl font-bold">{format(parseISO(battle.date), "d")}</div>
                              <div className="text-xs text-muted-foreground uppercase">{format(parseISO(battle.date), "EEE")}</div>
                            </div>
                            <div className="h-10 w-px bg-border" />
                            <span className="text-xl">{getFlagFromLocation(battle.location)}</span>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium truncate">{battle.name}</h4>
                              <p className="text-sm text-muted-foreground truncate">{battle.location}</p>
                            </div>
                            <Badge variant="outline" className={phaseInfo.color}>
                              {phaseInfo.label}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}

        {/* Empty State */}
        {filteredBattles.length === 0 && (
          <Card className="py-16">
            <CardContent className="text-center">
              <Globe className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-display font-semibold mb-2">No Events Found</h3>
              <p className="text-muted-foreground mb-6">
                {hasActiveFilters 
                  ? "Try adjusting your filters to see more events"
                  : "Be the first to add an event in this region!"}
              </p>
              <div className="flex gap-3 justify-center">
                {hasActiveFilters && (
                  <Button variant="outline" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                )}
                <Button onClick={() => setIsSubmitDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Submit Event
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Call to Action */}
        <Card className="mt-12 bg-gradient-to-r from-primary/10 via-background to-secondary/10 border-primary/20">
          <CardContent className="py-8 text-center">
            <h3 className="text-xl sm:text-2xl font-display font-bold mb-2">
              Organizing an Event?
            </h3>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              Add your battle, jam, or workshop to the global calendar. 
              Reach dancers from around the world.
            </p>
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-primary to-secondary text-white"
              onClick={() => setIsSubmitDialogOpen(true)}
            >
              <Plus className="w-5 h-5 mr-2" />
              Submit Your Event
            </Button>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 mt-16">
        <div className="container mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              © 2025 SWITCHBOARD. Global Dance Events Platform.
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <button onClick={() => navigate("/")}>Home</button>
              <button onClick={() => navigate("/battles")}>Battles</button>
              <button onClick={() => navigate("/auth")}>Sign In</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}