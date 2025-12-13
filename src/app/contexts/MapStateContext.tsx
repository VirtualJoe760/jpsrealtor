"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import type { MapListing } from "@/types/types";

/**
 * Global Map State Context
 *
 * Manages map state across the application, allowing chat and other components
 * to control the map background without page navigation.
 *
 * This context persists map state even when the map component unmounts,
 * enabling seamless transitions between pages.
 */

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
  zoom: number;
}

export interface MapViewState {
  centerLat: number;
  centerLng: number;
  zoom: number;
}

interface MapStateContextType {
  // Map visibility
  isMapVisible: boolean;
  setMapVisible: (visible: boolean) => void;

  // Map position and bounds
  viewState: MapViewState | null;
  setViewState: (state: MapViewState) => void;

  // Selected listing
  selectedListing: MapListing | null;
  setSelectedListing: (listing: MapListing | null) => void;

  // Listings to display
  displayListings: MapListing[];
  setDisplayListings: (listings: MapListing[]) => void;

  // Map interactions
  flyToLocation: (lat: number, lng: number, zoom?: number) => void;
  setBounds: (bounds: MapBounds) => void;

  // Map style
  mapStyle: 'toner' | 'dark' | 'satellite' | 'bright';
  setMapStyle: (style: 'toner' | 'dark' | 'satellite' | 'bright') => void;

  // Opacity control for layering
  mapOpacity: number;
  setMapOpacity: (opacity: number) => void;
}

const MapStateContext = createContext<MapStateContextType | undefined>(undefined);

interface MapStateProviderProps {
  children: ReactNode;
}

export function MapStateProvider({ children }: MapStateProviderProps) {
  const [isMapVisible, setIsMapVisible] = useState(false);
  const [viewState, setViewStateInternal] = useState<MapViewState | null>(null);
  const [selectedListing, setSelectedListing] = useState<MapListing | null>(null);
  const [displayListings, setDisplayListings] = useState<MapListing[]>([]);
  const [mapStyle, setMapStyle] = useState<'toner' | 'dark' | 'satellite' | 'bright'>('dark');
  const [mapOpacity, setMapOpacity] = useState(1.0);

  // Pending actions to be executed when map mounts
  const [pendingFlyTo, setPendingFlyTo] = useState<{ lat: number; lng: number; zoom: number } | null>(null);
  const [pendingBounds, setPendingBounds] = useState<MapBounds | null>(null);

  const setMapVisible = useCallback((visible: boolean) => {
    console.log('🗺️ [MapStateContext] Setting map visibility:', visible);
    setIsMapVisible(visible);
  }, []);

  const setViewState = useCallback((state: MapViewState) => {
    console.log('🗺️ [MapStateContext] Setting view state:', state);
    setViewStateInternal(state);
  }, []);

  const flyToLocation = useCallback((lat: number, lng: number, zoom: number = 13) => {
    console.log('🗺️ [MapStateContext] Fly to location:', { lat, lng, zoom });
    setPendingFlyTo({ lat, lng, zoom });
    setViewStateInternal({ centerLat: lat, centerLng: lng, zoom });
    setIsMapVisible(true);
  }, []);

  const setBounds = useCallback((bounds: MapBounds) => {
    console.log('🗺️ [MapStateContext] Setting bounds:', bounds);
    setPendingBounds(bounds);
    setIsMapVisible(true);
  }, []);

  const value: MapStateContextType = {
    isMapVisible,
    setMapVisible,
    viewState,
    setViewState,
    selectedListing,
    setSelectedListing,
    displayListings,
    setDisplayListings,
    flyToLocation,
    setBounds,
    mapStyle,
    setMapStyle,
    mapOpacity,
    setMapOpacity,
  };

  return (
    <MapStateContext.Provider value={value}>
      {children}
    </MapStateContext.Provider>
  );
}

export function useMapState() {
  const context = useContext(MapStateContext);
  if (context === undefined) {
    throw new Error("useMapState must be used within MapStateProvider");
  }
  return context;
}
