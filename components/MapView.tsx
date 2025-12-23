
import React, { useEffect, useRef } from 'react';
import { TripPlan, Coordinates } from '../types';

interface MapViewProps {
  trip: TripPlan | null;
  selectedDay: number;
  userLocation: Coordinates | null;
}

const MapView: React.FC<MapViewProps> = ({ trip, selectedDay, userLocation }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !(window as any).L) return;
    const L = (window as any).L;

    if (!mapInstanceRef.current && mapContainerRef.current) {
      mapInstanceRef.current = L.map(mapContainerRef.current).setView([20, 0], 2);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapInstanceRef.current);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Handle User Location Marker
  useEffect(() => {
    if (!mapInstanceRef.current || !userLocation || !(window as any).L) return;
    const L = (window as any).L;

    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
    }

    // Custom Blue Dot for User Location
    const userIcon = L.divIcon({
      className: 'user-location-marker',
      html: `<div class="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg animate-pulse"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });

    userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
      .addTo(mapInstanceRef.current)
      .bindPopup("You are here");

    // If no trip is loaded, center on user
    if (!trip) {
      mapInstanceRef.current.setView([userLocation.lat, userLocation.lng], 13);
    }
  }, [userLocation, trip]);

  useEffect(() => {
    if (!mapInstanceRef.current || !trip || !(window as any).L) return;
    const L = (window as any).L;

    // Clear existing trip markers and polyline
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    if (polylineRef.current) polylineRef.current.remove();

    const currentDayData = trip.itinerary.find(d => d.day === selectedDay);
    if (!currentDayData) return;

    const coords: [number, number][] = currentDayData.activities.map(a => [a.coordinates.lat, a.coordinates.lng]);

    // Add trip markers
    currentDayData.activities.forEach((activity, idx) => {
      const marker = L.marker([activity.coordinates.lat, activity.coordinates.lng])
        .addTo(mapInstanceRef.current)
        .bindPopup(`<b>${idx + 1}. ${activity.place}</b><br/>${activity.time}`);
      markersRef.current.push(marker);
    });

    // Draw path
    if (coords.length > 1) {
      polylineRef.current = L.polyline(coords, { color: '#3b82f6', weight: 4, opacity: 0.6, dashArray: '10, 10' }).addTo(mapInstanceRef.current);
    }

    // Adjust view to show both trip and optionally user location
    const allCoords = [...coords];
    if (userLocation) {
        // We don't always want to zoom out to the user if the user is 10,000 miles away
        // but it's good for local trips. Let's prioritize the itinerary.
    }

    if (coords.length > 0) {
      const bounds = L.latLngBounds(coords);
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
    } else {
      mapInstanceRef.current.setView([trip.map_center.lat, trip.map_center.lng], 13);
    }

  }, [trip, selectedDay, userLocation]);

  return <div ref={mapContainerRef} className="h-full w-full rounded-xl overflow-hidden shadow-inner border border-slate-200" />;
};

export default MapView;
