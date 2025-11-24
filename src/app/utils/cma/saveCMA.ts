// src/app/utils/cma/saveCMA.ts
// Utilities for saving and managing CMA reports

import type { CMAReport } from '@/lib/cma/cmaTypes';
import type { MapFilters } from '@/app/utils/mls/filterListingsServerSide';

export interface SavedCMA {
  id: string;
  report: CMAReport;
  filters: MapFilters;
  subjectAddress?: string;
  subjectPropertyId?: string;
  generatedAt: string;
  // Preview data for cards
  previewData: {
    estimatedValue: number | null;
    valueRange: string;
    confidenceScore: number | null;
    compCount: number;
    cagr5: number | null;
    capRate: number | null;
  };
}

const STORAGE_KEY = 'jpsrealtor_saved_cmas';
const MAX_SAVED_CMAS = 50; // Keep last 50 CMAs

/**
 * Save a CMA report to localStorage and IndexedDB
 */
export async function saveCMA(
  report: CMAReport,
  filters: MapFilters,
  subjectAddress?: string,
  subjectPropertyId?: string
): Promise<string> {
  const id = `cma_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const savedCMA: SavedCMA = {
    id,
    report,
    filters,
    subjectAddress,
    subjectPropertyId,
    generatedAt: report.generatedAt,
    previewData: {
      estimatedValue: report.summary.estimatedValue,
      valueRange: report.summary.lowRange && report.summary.highRange
        ? `$${report.summary.lowRange.toLocaleString()} - $${report.summary.highRange.toLocaleString()}`
        : 'N/A',
      confidenceScore: report.summary.confidenceScore,
      compCount: report.comps.length,
      cagr5: report.appreciation.cagr5,
      capRate: report.cashflow.capRate,
    },
  };

  try {
    // Save to localStorage
    const existing = getAllSavedCMAs();
    const updated = [savedCMA, ...existing].slice(0, MAX_SAVED_CMAS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    console.log(`📊 Saved CMA ${id} to localStorage`);

    // Try to save to IndexedDB for larger storage
    try {
      await saveToIndexedDB(savedCMA);
      console.log(`📊 Saved CMA ${id} to IndexedDB`);
    } catch (idbError) {
      console.warn('IndexedDB save failed, using localStorage only:', idbError);
    }

    return id;
  } catch (error) {
    console.error('Failed to save CMA:', error);
    throw error;
  }
}

/**
 * Get all saved CMAs from localStorage
 */
export function getAllSavedCMAs(): SavedCMA[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Failed to load saved CMAs:', error);
    return [];
  }
}

/**
 * Get a specific CMA by ID
 */
export function getCMAById(id: string): SavedCMA | null {
  const allCMAs = getAllSavedCMAs();
  return allCMAs.find(cma => cma.id === id) || null;
}

/**
 * Delete a CMA by ID
 */
export function deleteCMA(id: string): void {
  try {
    const allCMAs = getAllSavedCMAs();
    const filtered = allCMAs.filter(cma => cma.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    console.log(`📊 Deleted CMA ${id}`);

    // Try to delete from IndexedDB too
    deleteFromIndexedDB(id).catch(err => {
      console.warn('IndexedDB delete failed:', err);
    });
  } catch (error) {
    console.error('Failed to delete CMA:', error);
  }
}

/**
 * Clear all saved CMAs
 */
export function clearAllCMAs(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('📊 Cleared all saved CMAs');

    // Try to clear IndexedDB too
    clearIndexedDB().catch(err => {
      console.warn('IndexedDB clear failed:', err);
    });
  } catch (error) {
    console.error('Failed to clear CMAs:', error);
  }
}

/**
 * Get recent CMAs (last N)
 */
export function getRecentCMAs(limit: number = 5): SavedCMA[] {
  const allCMAs = getAllSavedCMAs();
  return allCMAs.slice(0, limit);
}

/**
 * Search CMAs by address or property ID
 */
export function searchCMAs(query: string): SavedCMA[] {
  const allCMAs = getAllSavedCMAs();
  const lowerQuery = query.toLowerCase();

  return allCMAs.filter(cma => {
    const addressMatch = cma.subjectAddress?.toLowerCase().includes(lowerQuery);
    const propertyIdMatch = cma.subjectPropertyId?.toLowerCase().includes(lowerQuery);
    return addressMatch || propertyIdMatch;
  });
}

// IndexedDB utilities
const DB_NAME = 'jpsrealtor_cma_db';
const STORE_NAME = 'cmas';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

async function saveToIndexedDB(cma: SavedCMA): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(cma);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

async function deleteFromIndexedDB(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

async function clearIndexedDB(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}
