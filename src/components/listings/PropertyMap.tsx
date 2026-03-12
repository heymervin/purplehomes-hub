import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent } from '@/components/ui/card';
import { Bed, Bath, AlertCircle, Loader2 } from 'lucide-react';
import type { Property } from '@/types';
import { ZIP_COORDINATES } from '@/lib/proximityCalculator';

interface PropertyMapProps {
  properties: Property[];
  onPropertySelect: (property: Property) => void;
  hoveredPropertyId?: string | null;
  zipCode?: string;
  isDarkMode?: boolean;
  userLocation?: { lat: number; lng: number } | null;
  zoomTarget?: { lat: number; lng: number } | null;
  onZoomComplete?: () => void;
  onMapLoad?: () => void;
  onZoomChange?: (zoom: number) => void;
  fitBoundsKey?: number;
}

export function PropertyMap({ properties, onPropertySelect, hoveredPropertyId, zipCode, isDarkMode = false, userLocation, zoomTarget, onZoomComplete, onMapLoad, onZoomChange, fitBoundsKey }: PropertyMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredProperty, setHoveredProperty] = useState<Property | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const prevIsDarkModeRef = useRef<boolean | null>(null);

  // Refs to avoid stale closures in Mapbox event handlers registered at init time
  const propertiesRef = useRef<Property[]>(properties);
  const onPropertySelectRef = useRef(onPropertySelect);
  useEffect(() => { propertiesRef.current = properties; }, [properties]);
  useEffect(() => { onPropertySelectRef.current = onPropertySelect; }, [onPropertySelect]);

  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;

  // Create GeoJSON from properties
  const getGeoJSON = useCallback(() => {
    return {
      type: 'FeatureCollection' as const,
      features: properties
        .filter(p => p.lat && p.lng)
        .map(property => ({
          type: 'Feature' as const,
          properties: {
            id: property.id,
            price: property.price,
            address: property.address,
            city: property.city,
            beds: property.beds,
            baths: property.baths,
            sqft: property.sqft,
            heroImage: property.heroImage,
          },
          geometry: {
            type: 'Point' as const,
            coordinates: [property.lng!, property.lat!]
          }
        }))
    };
  }, [properties]);

  useEffect(() => {
    if (!mapContainer.current) return;

    if (!mapboxToken) {
      setError('Mapbox token not configured');
      setIsLoading(false);
      return;
    }

    try {
      mapboxgl.accessToken = mapboxToken;

      const propertiesWithCoords = properties.filter(p => p.lat && p.lng);
      let center: [number, number] = [-111.9, 33.45];

      if (propertiesWithCoords.length > 0) {
        const lats = propertiesWithCoords.map(p => p.lat!);
        const lngs = propertiesWithCoords.map(p => p.lng!);
        center = [
          (Math.min(...lngs) + Math.max(...lngs)) / 2,
          (Math.min(...lats) + Math.max(...lats)) / 2
        ];
      }

      // Calculate bounds to fit all properties
      let bounds: mapboxgl.LngLatBounds | null = null;
      if (propertiesWithCoords.length > 1) {
        bounds = new mapboxgl.LngLatBounds();
        propertiesWithCoords.forEach(p => bounds!.extend([p.lng!, p.lat!]));
      }

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: isDarkMode ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11',
        center,
        zoom: propertiesWithCoords.length <= 1 ? 10 : 4,
      });

      // Fit map to show all properties with padding
      if (bounds) {
        map.current.once('load', () => {
          map.current!.fitBounds(bounds!, { padding: 60, maxZoom: 12 });
        });
      }

      map.current.addControl(
        new mapboxgl.NavigationControl({ visualizePitch: false }),
        'bottom-right'
      );

      map.current.on('load', () => {
        if (!map.current) return;

        // Add clustered source
        map.current.addSource('properties', {
          type: 'geojson',
          data: getGeoJSON(),
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: 50
        });

        // Cluster circles
        map.current.addLayer({
          id: 'clusters',
          type: 'circle',
          source: 'properties',
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': [
              'step',
              ['get', 'point_count'],
              '#4f46e5', // indigo-600
              5,
              '#4338ca', // indigo-700
              15,
              '#3730a3'  // indigo-800
            ],
            'circle-radius': [
              'step',
              ['get', 'point_count'],
              20,
              5,
              25,
              15,
              30
            ],
            'circle-stroke-width': 3,
            'circle-stroke-color': 'rgba(255, 255, 255, 0.3)'
          }
        });

        // Cluster count labels
        map.current.addLayer({
          id: 'cluster-count',
          type: 'symbol',
          source: 'properties',
          filter: ['has', 'point_count'],
          layout: {
            'text-field': '{point_count_abbreviated}',
            'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
            'text-size': 14
          },
          paint: {
            'text-color': '#ffffff'
          }
        });

        // Individual property markers
        map.current.addLayer({
          id: 'unclustered-point',
          type: 'circle',
          source: 'properties',
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-color': '#4f46e5',
            'circle-radius': 10,
            'circle-stroke-width': 2,
            'circle-stroke-color': 'rgba(255, 255, 255, 0.5)'
          }
        });

        // Price labels for individual properties
        map.current.addLayer({
          id: 'property-price',
          type: 'symbol',
          source: 'properties',
          filter: ['!', ['has', 'point_count']],
          layout: {
            'text-field': ['concat', '$', ['/', ['get', 'price'], 1000], 'K'],
            'text-font': ['DIN Offc Pro Bold', 'Arial Unicode MS Bold'],
            'text-size': 11,
            'text-offset': [0, -2.5],
            'text-anchor': 'bottom'
          },
          paint: {
            'text-color': '#ffffff',
            'text-halo-color': '#4f46e5',
            'text-halo-width': 2
          }
        });

        // Click on cluster to zoom
        map.current.on('click', 'clusters', (e) => {
          if (!map.current) return;
          const features = map.current.queryRenderedFeatures(e.point, { layers: ['clusters'] });
          const clusterId = features[0]?.properties?.cluster_id;
          if (!clusterId) return;

          const geometry = features[0].geometry;
          if (geometry.type !== 'Point') return;

          (map.current.getSource('properties') as mapboxgl.GeoJSONSource).getClusterExpansionZoom(
            clusterId,
            (err, zoom) => {
              if (err || !map.current) return;
              map.current.easeTo({
                center: geometry.coordinates as [number, number],
                zoom: zoom || 12
              });
            }
          );
        });

        // Click on property
        map.current.on('click', 'unclustered-point', (e) => {
          const features = e.features;
          if (!features || features.length === 0) return;
          const props = features[0].properties;
          const property = propertiesRef.current.find(p => p.id === props?.id);
          if (property) onPropertySelectRef.current(property);
        });

        // Hover effects
        map.current.on('mouseenter', 'unclustered-point', (e) => {
          if (!map.current) return;
          map.current.getCanvas().style.cursor = 'pointer';
          const features = e.features;
          if (!features || features.length === 0) return;
          const props = features[0].properties;
          const property = propertiesRef.current.find(p => p.id === props?.id);
          if (property) setHoveredProperty(property);
        });

        map.current.on('mouseleave', 'unclustered-point', () => {
          if (!map.current) return;
          map.current.getCanvas().style.cursor = '';
          setHoveredProperty(null);
        });

        map.current.on('mouseenter', 'clusters', () => {
          if (map.current) map.current.getCanvas().style.cursor = 'pointer';
        });

        map.current.on('mouseleave', 'clusters', () => {
          if (map.current) map.current.getCanvas().style.cursor = '';
        });

        setIsLoading(false);
        setMapLoaded(true);
        onMapLoad?.();

        // Listen for zoom changes
        map.current.on('zoom', () => {
          if (map.current) {
            onZoomChange?.(map.current.getZoom());
          }
        });

        // Fit bounds
        const propertiesWithCoords = properties.filter(p => p.lat && p.lng);
        if (propertiesWithCoords.length > 1) {
          const bounds = new mapboxgl.LngLatBounds();
          propertiesWithCoords.forEach(p => bounds.extend([p.lng!, p.lat!]));
          map.current.fitBounds(bounds, { padding: 60, maxZoom: 12 });
        }
      });

      map.current.on('error', () => {
        setError('Failed to load map');
        setIsLoading(false);
      });

    } catch (err) {
      setError('Failed to initialize map');
      setIsLoading(false);
    }

    return () => {
      map.current?.remove();
    };
  }, [mapboxToken]);

  // Update data when properties change
  useEffect(() => {
    const propertiesWithCoords = properties.filter(p => p.lat && p.lng);
    console.log('[PropertyMap] Update effect:', {
      hasMap: !!map.current,
      mapLoaded,
      propertiesCount: properties.length,
      propertiesWithCoords: propertiesWithCoords.length
    });

    if (!map.current || !mapLoaded) {
      console.log('[PropertyMap] Skipping update - map not ready');
      return;
    }

    const source = map.current.getSource('properties') as mapboxgl.GeoJSONSource;
    if (source) {
      const geoJSON = {
        type: 'FeatureCollection' as const,
        features: propertiesWithCoords.map(property => ({
          type: 'Feature' as const,
          properties: {
            id: property.id,
            price: property.price,
            address: property.address,
            city: property.city,
            beds: property.beds,
            baths: property.baths,
            sqft: property.sqft,
            heroImage: property.heroImage,
          },
          geometry: {
            type: 'Point' as const,
            coordinates: [property.lng!, property.lat!]
          }
        }))
      };
      console.log('[PropertyMap] Updating map source with features:', geoJSON.features.length);
      if (geoJSON.features.length > 0) {
        console.log('[PropertyMap] Sample feature:', JSON.stringify(geoJSON.features[0], null, 2));
      }
      source.setData(geoJSON);
    } else {
      console.warn('[PropertyMap] No properties source found on map');
    }
  }, [properties, mapLoaded]);

  // Auto-fit map to show all properties when they first load
  const hasFittedBounds = useRef(false);
  useEffect(() => {
    if (!map.current || !mapLoaded || hasFittedBounds.current) return;

    const withCoords = properties.filter(p => p.lat && p.lng);
    if (withCoords.length < 2) return;

    const bounds = new mapboxgl.LngLatBounds();
    withCoords.forEach(p => bounds.extend([p.lng!, p.lat!]));
    map.current.fitBounds(bounds, { padding: 60, maxZoom: 12 });
    hasFittedBounds.current = true;
  }, [properties, mapLoaded]);

  // Pan to ZIP code when searched
  useEffect(() => {
    if (!map.current || !mapLoaded || !zipCode || zipCode.length !== 5) return;

    const coords = ZIP_COORDINATES[zipCode];
    if (coords) {
      map.current.flyTo({
        center: [coords.longitude, coords.latitude],
        zoom: 12,
        duration: 1500,
        essential: true
      });
    }
  }, [zipCode, mapLoaded]);

  // Pan to user location when "Locate Me" is used
  useEffect(() => {
    if (!map.current || !mapLoaded || !userLocation) return;

    map.current.flyTo({
      center: [userLocation.lng, userLocation.lat],
      zoom: 12,
      duration: 1500,
      essential: true
    });
  }, [userLocation, mapLoaded]);

  // Zoom to specific property when "Move" button is clicked
  useEffect(() => {
    if (!map.current || !mapLoaded || !zoomTarget) return;

    // Zoom level 15 is high enough to break clusters and show individual markers
    map.current.flyTo({
      center: [zoomTarget.lng, zoomTarget.lat],
      zoom: 15,
      duration: 1500,
      essential: true
    });

    // Notify parent that zoom is complete so it can clear the target
    if (onZoomComplete) {
      setTimeout(() => onZoomComplete(), 1600);
    }
  }, [zoomTarget, mapLoaded, onZoomComplete]);

  // Fit map to all filtered properties when fitBoundsKey changes (e.g. user searched)
  useEffect(() => {
    if (!map.current || !mapLoaded || fitBoundsKey === undefined || fitBoundsKey === 0) return;
    const withCoords = properties.filter(p => p.lat && p.lng);
    if (withCoords.length === 0) return;
    if (withCoords.length === 1) {
      map.current.flyTo({ center: [withCoords[0].lng!, withCoords[0].lat!], zoom: 13, duration: 1000 });
      return;
    }
    const bounds = new mapboxgl.LngLatBounds();
    withCoords.forEach(p => bounds.extend([p.lng!, p.lat!]));
    map.current.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 1000 });
  }, [fitBoundsKey, mapLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // Highlight hovered property marker from list
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    if (!map.current.getLayer('unclustered-point')) return;

    const hoveredId = hoveredPropertyId ?? '';

    try {
      map.current.setPaintProperty('unclustered-point', 'circle-color', [
        'case',
        ['==', ['get', 'id'], hoveredId],
        '#f59e0b',   // amber highlight
        '#4f46e5',   // default indigo
      ]);

      map.current.setPaintProperty('unclustered-point', 'circle-radius', [
        'case',
        ['==', ['get', 'id'], hoveredId],
        14,
        10,
      ]);

      map.current.setPaintProperty('unclustered-point', 'circle-stroke-width', [
        'case',
        ['==', ['get', 'id'], hoveredId],
        3,
        2,
      ]);
    } catch (_err) {
      // ignore paint errors (layer may not be ready)
    }
  }, [hoveredPropertyId, mapLoaded]);

  // Update map style when theme changes
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Skip on initial load - only run when isDarkMode actually changes
    if (prevIsDarkModeRef.current === null) {
      prevIsDarkModeRef.current = isDarkMode;
      return;
    }

    // If isDarkMode hasn't changed, skip
    if (prevIsDarkModeRef.current === isDarkMode) return;

    prevIsDarkModeRef.current = isDarkMode;

    const newStyle = isDarkMode ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11';

    // Set new style
    map.current.setStyle(newStyle);

    // Re-add layers when style is loaded
    map.current.once('style.load', () => {
      if (!map.current) return;

      // Add clustered source
      map.current.addSource('properties', {
        type: 'geojson',
        data: getGeoJSON(),
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50
      });

      // Cluster circles
      map.current.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'properties',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step',
            ['get', 'point_count'],
            '#4f46e5',
            5,
            '#4338ca',
            15,
            '#3730a3'
          ],
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            20,
            5,
            25,
            15,
            30
          ],
          'circle-stroke-width': 3,
          'circle-stroke-color': 'rgba(255, 255, 255, 0.3)'
        }
      });

      // Cluster count labels
      map.current.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'properties',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
          'text-size': 14
        },
        paint: {
          'text-color': '#ffffff'
        }
      });

      // Individual property markers
      map.current.addLayer({
        id: 'unclustered-point',
        type: 'circle',
        source: 'properties',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': '#4f46e5',
          'circle-radius': 10,
          'circle-stroke-width': 2,
          'circle-stroke-color': 'rgba(255, 255, 255, 0.5)'
        }
      });

      // Price labels for individual properties
      map.current.addLayer({
        id: 'property-price',
        type: 'symbol',
        source: 'properties',
        filter: ['!', ['has', 'point_count']],
        layout: {
          'text-field': ['concat', '$', ['/', ['get', 'price'], 1000], 'K'],
          'text-font': ['DIN Offc Pro Bold', 'Arial Unicode MS Bold'],
          'text-size': 11,
          'text-offset': [0, -2.5],
          'text-anchor': 'bottom'
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': '#4f46e5',
          'text-halo-width': 2
        }
      });
    });
  }, [isDarkMode, mapLoaded, getGeoJSON]);

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-zinc-950/30 to-background">
        <Card className="max-w-sm mx-4 bg-card/90 backdrop-blur border-border/20">
          <CardContent className="pt-6 text-center">
            <div className="w-14 h-14 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-7 w-7 text-indigo-400" />
            </div>
            <h3 className="text-base font-semibold mb-2">Map Configuration Required</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Add your Mapbox token to enable the interactive map.
            </p>
            <div className="text-left bg-muted/50 p-3 rounded-lg">
              <p className="text-xs font-mono text-muted-foreground">
                <span className="text-indigo-400">VITE_MAPBOX_TOKEN</span>=pk.your_token
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading map...</p>
          </div>
        </div>
      )}

      <div ref={mapContainer} className="w-full h-full" />

      {/* Hovered Property Card */}
      {hoveredProperty && (
        <div className="absolute bottom-4 left-4 z-20 animate-fade-in hidden md:block">
          <Card
            className="w-72 bg-card/95 backdrop-blur border-border/50 cursor-pointer hover:border-indigo-500/50 transition-all shadow-xl"
            onClick={() => onPropertySelect(hoveredProperty)}
          >
            <CardContent className="p-0">
              <div className="flex">
                <img
                  src={hoveredProperty.heroImage}
                  alt={hoveredProperty.address}
                  className="w-24 h-24 object-cover rounded-l-lg flex-shrink-0"
                />
                <div className="p-3 flex-1 min-w-0">
                  <p className="text-lg font-bold text-indigo-400 mb-0.5">
                    ${hoveredProperty.price.toLocaleString()}
                  </p>
                  <p className="text-sm font-medium truncate">{hoveredProperty.address}</p>
                  <p className="text-xs text-muted-foreground truncate mb-2">{hoveredProperty.city}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-0.5">
                      <Bed className="h-3 w-3" /> {hoveredProperty.beds}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Bath className="h-3 w-3" /> {hoveredProperty.baths}
                    </span>
                    {hoveredProperty.sqft && (
                      <span>{hoveredProperty.sqft.toLocaleString()} sqft</span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
