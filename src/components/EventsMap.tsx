import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, ExternalLink, Key } from 'lucide-react';

interface Event {
  id: string;
  name: string;
  date: string;
  location: string | null;
  phase: string;
}

interface EventsMapProps {
  events: Event[];
  onEventClick?: (eventId: string) => void;
}

// Location coordinates mapping
const LOCATION_COORDS: Record<string, [number, number]> = {
  // Japan
  "Tokyo, Japan": [139.6917, 35.6895],
  "Osaka, Japan": [135.5023, 34.6937],
  // France
  "Paris, France": [2.3522, 48.8566],
  "Montpellier, France": [3.8767, 43.6108],
  "Lyon, France": [4.8357, 45.7640],
  "Nantes, France": [-1.5534, 47.2184],
  // Germany
  "Berlin, Germany": [13.4050, 52.5200],
  "Bochum, Germany": [7.2162, 51.4818],
  // UK
  "London, UK": [-0.1276, 51.5074],
  // South Korea
  "Seoul, South Korea": [126.9780, 37.5665],
  // USA
  "Los Angeles, USA": [-118.2437, 34.0522],
  "Philadelphia, USA": [-75.1652, 39.9526],
  "Phoenix, USA": [-112.0740, 33.4484],
  // Netherlands
  "Amsterdam, Netherlands": [4.9041, 52.3676],
  "Heerlen, Netherlands": [5.9814, 50.8882],
  "Rotterdam, Netherlands": [4.4777, 51.9244],
  // Poland
  "Warsaw, Poland": [21.0122, 52.2297],
  "Kraków, Poland": [19.9450, 50.0647],
  // Spain
  "Barcelona, Spain": [2.1734, 41.3851],
  // Russia
  "Moscow, Russia": [37.6173, 55.7558],
  // Denmark
  "Copenhagen, Denmark": [12.5683, 55.6761],
  // Sweden
  "Stockholm, Sweden": [18.0686, 59.3293],
  // Lithuania
  "Vilnius, Lithuania": [25.2797, 54.6872],
  // Singapore
  "Singapore, Singapore": [103.8198, 1.3521],
  // South Africa
  "Johannesburg, South Africa": [28.0473, -26.2041],
};

const getPhaseColor = (phase: string): string => {
  switch (phase) {
    case "registration":
      return "#22c55e"; // green
    case "selection":
      return "#eab308"; // yellow
    case "bracket":
      return "#ef4444"; // red (live)
    case "completed":
      return "#6b7280"; // gray
    default:
      return "#3b82f6"; // blue
  }
};

const getPhaseLabel = (phase: string): string => {
  switch (phase) {
    case "registration":
      return "Open";
    case "selection":
      return "Selection";
    case "bracket":
      return "Live";
    case "completed":
      return "Completed";
    default:
      return phase;
  }
};

const MAPBOX_TOKEN_KEY = 'mapbox_public_token';

export default function EventsMap({ events, onEventClick }: EventsMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapboxToken, setMapboxToken] = useState<string>(() => {
    return localStorage.getItem(MAPBOX_TOKEN_KEY) || '';
  });
  const [tokenInput, setTokenInput] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(!mapboxToken);

  const handleSaveToken = () => {
    if (tokenInput.trim()) {
      localStorage.setItem(MAPBOX_TOKEN_KEY, tokenInput.trim());
      setMapboxToken(tokenInput.trim());
      setShowTokenInput(false);
    }
  };

  const handleClearToken = () => {
    localStorage.removeItem(MAPBOX_TOKEN_KEY);
    setMapboxToken('');
    setShowTokenInput(true);
    setMapLoaded(false);
    if (map.current) {
      markersRef.current.forEach(marker => marker.remove());
      map.current.remove();
      map.current = null;
    }
  };

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [10, 30],
        zoom: 1.5,
        projection: 'mercator',
      });

      map.current.addControl(
        new mapboxgl.NavigationControl({
          visualizePitch: true,
        }),
        'top-right'
      );

      map.current.on('load', () => {
        setMapLoaded(true);
      });

      map.current.on('error', (e: mapboxgl.ErrorEvent) => {
        console.error('Mapbox error:', e);
        // Check if it's an authentication error
        if (e.error?.message?.includes('401') || e.error?.message?.includes('Unauthorized')) {
          handleClearToken();
        }
      });
    } catch (error) {
      console.error('Failed to initialize map:', error);
    }

    return () => {
      markersRef.current.forEach(marker => marker.remove());
      map.current?.remove();
    };
  }, [mapboxToken]);

  // Add markers when map is loaded and events change
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Group events by location for clustering
    const eventsByLocation: Record<string, Event[]> = {};
    events.forEach(event => {
      if (event.location && LOCATION_COORDS[event.location]) {
        if (!eventsByLocation[event.location]) {
          eventsByLocation[event.location] = [];
        }
        eventsByLocation[event.location].push(event);
      }
    });

    // Create markers
    Object.entries(eventsByLocation).forEach(([location, locationEvents]) => {
      const coords = LOCATION_COORDS[location];
      if (!coords) return;

      // Determine marker color based on most urgent phase
      const phases = locationEvents.map(e => e.phase);
      let dominantPhase = 'registration';
      if (phases.includes('bracket')) dominantPhase = 'bracket';
      else if (phases.includes('selection')) dominantPhase = 'selection';
      else if (phases.includes('registration')) dominantPhase = 'registration';
      else dominantPhase = 'completed';

      // Create custom marker element
      const el = document.createElement('div');
      el.className = 'event-marker';
      el.style.cssText = `
        width: ${locationEvents.length > 1 ? '40px' : '32px'};
        height: ${locationEvents.length > 1 ? '40px' : '32px'};
        background: ${getPhaseColor(dominantPhase)};
        border: 3px solid white;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 14px;
        color: white;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        transition: transform 0.2s, box-shadow 0.2s;
      `;
      
      if (locationEvents.length > 1) {
        el.textContent = String(locationEvents.length);
      }

      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.2)';
        el.style.boxShadow = '0 6px 20px rgba(0,0,0,0.4)';
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)';
        el.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
      });

      // Create popup content
      const popupContent = document.createElement('div');
      popupContent.style.cssText = 'max-width: 280px; max-height: 300px; overflow-y: auto;';
      
      locationEvents.forEach((event, idx) => {
        const eventDiv = document.createElement('div');
        eventDiv.style.cssText = `
          padding: 12px;
          ${idx > 0 ? 'border-top: 1px solid #e5e7eb;' : ''}
          cursor: pointer;
          transition: background 0.2s;
        `;
        eventDiv.addEventListener('mouseenter', () => {
          eventDiv.style.background = '#f3f4f6';
        });
        eventDiv.addEventListener('mouseleave', () => {
          eventDiv.style.background = 'transparent';
        });
        eventDiv.addEventListener('click', () => {
          onEventClick?.(event.id);
        });

        eventDiv.innerHTML = `
          <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px; color: #111827;">
            ${event.name}
          </div>
          <div style="display: flex; align-items: center; gap: 8px; font-size: 12px; color: #6b7280;">
            <span>${format(parseISO(event.date), 'MMM d, yyyy')}</span>
            <span style="
              background: ${getPhaseColor(event.phase)}20;
              color: ${getPhaseColor(event.phase)};
              padding: 2px 8px;
              border-radius: 9999px;
              font-weight: 500;
            ">${getPhaseLabel(event.phase)}</span>
          </div>
        `;
        popupContent.appendChild(eventDiv);
      });

      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: true,
        closeOnClick: false,
        maxWidth: '320px',
      }).setDOMContent(popupContent);

      const marker = new mapboxgl.Marker(el)
        .setLngLat(coords)
        .setPopup(popup)
        .addTo(map.current!);

      markersRef.current.push(marker);
    });
  }, [events, mapLoaded, onEventClick]);

  // Show token input if no token is configured
  if (showTokenInput || !mapboxToken) {
    return (
      <Card className="w-full h-[500px] flex items-center justify-center">
        <CardContent className="text-center max-w-md py-12">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
            <MapPin className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-display font-bold mb-2">Configure Map</h3>
          <p className="text-muted-foreground mb-6">
            To display the interactive world map, please enter your Mapbox public token. 
            You can get one for free at mapbox.com
          </p>
          <div className="space-y-4">
            <Input
              placeholder="pk.eyJ1Ijoi... (your Mapbox public token)"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              className="text-center"
            />
            <div className="flex gap-2 justify-center">
              <Button onClick={handleSaveToken} disabled={!tokenInput.trim()}>
                <Key className="w-4 h-4 mr-2" />
                Save Token
              </Button>
              <Button variant="outline" asChild>
                <a href="https://account.mapbox.com/access-tokens/" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Get Token
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="relative w-full h-[500px] rounded-xl overflow-hidden border border-border">
      <div ref={mapContainer} className="absolute inset-0" />
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 glass rounded-lg p-3 text-sm">
        <div className="font-semibold mb-2 text-foreground">Event Status</div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: getPhaseColor('registration') }} />
            <span className="text-muted-foreground">Open for Registration</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: getPhaseColor('selection') }} />
            <span className="text-muted-foreground">Selection Phase</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: getPhaseColor('bracket') }} />
            <span className="text-muted-foreground">Live Now</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: getPhaseColor('completed') }} />
            <span className="text-muted-foreground">Completed</span>
          </div>
        </div>
      </div>

      {/* Event count & settings */}
      <div className="absolute top-4 left-4 flex gap-2">
        <div className="glass rounded-lg px-3 py-2">
          <span className="text-sm font-medium text-foreground">{events.length} events on map</span>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="glass"
          onClick={handleClearToken}
        >
          <Key className="w-3 h-3 mr-1" />
          Change Token
        </Button>
      </div>
    </div>
  );
}