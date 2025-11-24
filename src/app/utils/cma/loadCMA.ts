// src/app/utils/cma/loadCMA.ts
// Utilities for loading and hydrating CMA reports

import type { CMAReport } from '@/lib/cma/cmaTypes';
import type { MapFilters } from '@/app/utils/mls/filterListingsServerSide';
import { getCMAById, getAllSavedCMAs, getRecentCMAs, type SavedCMA } from './saveCMA';

export interface LoadedCMA {
  id: string;
  report: CMAReport;
  filters: MapFilters;
  subjectAddress?: string;
  subjectPropertyId?: string;
  generatedAt: string;
  isValid: boolean;
  errors: string[];
}

/**
 * Load and validate a CMA by ID
 */
export async function loadCMA(id: string): Promise<LoadedCMA | null> {
  try {
    // Try localStorage first
    const savedCMA = getCMAById(id);
    if (savedCMA) {
      return validateAndHydrateCMA(savedCMA);
    }

    // Try IndexedDB if not in localStorage
    const idbCMA = await loadFromIndexedDB(id);
    if (idbCMA) {
      return validateAndHydrateCMA(idbCMA);
    }

    console.warn(`CMA ${id} not found in storage`);
    return null;
  } catch (error) {
    console.error('Failed to load CMA:', error);
    return null;
  }
}

/**
 * Load recent CMAs for dashboard
 */
export async function loadRecentCMAs(limit: number = 5): Promise<LoadedCMA[]> {
  try {
    const recentCMAs = getRecentCMAs(limit);
    const validated = recentCMAs
      .map(cma => validateAndHydrateCMA(cma))
      .filter((cma): cma is LoadedCMA => cma !== null && cma.isValid);

    return validated;
  } catch (error) {
    console.error('Failed to load recent CMAs:', error);
    return [];
  }
}

/**
 * Load all saved CMAs with validation
 */
export async function loadAllCMAs(): Promise<LoadedCMA[]> {
  try {
    const allCMAs = getAllSavedCMAs();
    const validated = allCMAs
      .map(cma => validateAndHydrateCMA(cma))
      .filter((cma): cma is LoadedCMA => cma !== null);

    return validated;
  } catch (error) {
    console.error('Failed to load all CMAs:', error);
    return [];
  }
}

/**
 * Load CMAs by property ID
 */
export async function loadCMAsByProperty(propertyId: string): Promise<LoadedCMA[]> {
  try {
    const allCMAs = getAllSavedCMAs();
    const matchingCMAs = allCMAs.filter(cma =>
      cma.subjectPropertyId === propertyId
    );

    const validated = matchingCMAs
      .map(cma => validateAndHydrateCMA(cma))
      .filter((cma): cma is LoadedCMA => cma !== null && cma.isValid);

    return validated;
  } catch (error) {
    console.error('Failed to load CMAs by property:', error);
    return [];
  }
}

/**
 * Load CMAs by address search
 */
export async function loadCMAsByAddress(address: string): Promise<LoadedCMA[]> {
  try {
    const allCMAs = getAllSavedCMAs();
    const lowerAddress = address.toLowerCase();

    const matchingCMAs = allCMAs.filter(cma =>
      cma.subjectAddress?.toLowerCase().includes(lowerAddress)
    );

    const validated = matchingCMAs
      .map(cma => validateAndHydrateCMA(cma))
      .filter((cma): cma is LoadedCMA => cma !== null && cma.isValid);

    return validated;
  } catch (error) {
    console.error('Failed to load CMAs by address:', error);
    return [];
  }
}

/**
 * Get CMA preview data for cards without full hydration
 */
export function getCMAPreview(id: string): SavedCMA['previewData'] | null {
  try {
    const savedCMA = getCMAById(id);
    return savedCMA?.previewData || null;
  } catch (error) {
    console.error('Failed to get CMA preview:', error);
    return null;
  }
}

/**
 * Check if a CMA exists
 */
export function cmaExists(id: string): boolean {
  try {
    const savedCMA = getCMAById(id);
    return savedCMA !== null;
  } catch (error) {
    return false;
  }
}

/**
 * Get CMA count
 */
export function getCMACount(): number {
  try {
    const allCMAs = getAllSavedCMAs();
    return allCMAs.length;
  } catch (error) {
    return 0;
  }
}

/**
 * Validate and hydrate a saved CMA
 */
function validateAndHydrateCMA(savedCMA: SavedCMA): LoadedCMA | null {
  const errors: string[] = [];

  // Validate required fields
  if (!savedCMA.id) {
    errors.push('Missing CMA ID');
  }

  if (!savedCMA.report) {
    errors.push('Missing CMA report data');
    return null; // Cannot proceed without report
  }

  if (!savedCMA.generatedAt) {
    errors.push('Missing generation timestamp');
  }

  // Validate report structure
  if (!savedCMA.report.summary) {
    errors.push('Missing CMA summary');
  }

  if (!Array.isArray(savedCMA.report.comps)) {
    errors.push('Missing or invalid comps data');
  }

  // Validate data integrity
  if (savedCMA.report.summary) {
    if (savedCMA.report.summary.estimatedValue === null ||
        savedCMA.report.summary.estimatedValue === undefined) {
      errors.push('Missing estimated value');
    }

    if (savedCMA.report.summary.confidenceScore === null ||
        savedCMA.report.summary.confidenceScore === undefined) {
      errors.push('Missing confidence score');
    }
  }

  // Check if CMA is stale (older than 30 days)
  const generatedDate = new Date(savedCMA.generatedAt);
  const now = new Date();
  const daysSinceGenerated = Math.floor((now.getTime() - generatedDate.getTime()) / (1000 * 60 * 60 * 24));

  if (daysSinceGenerated > 30) {
    errors.push('CMA is outdated (>30 days old)');
  }

  // Return loaded CMA with validation results
  return {
    id: savedCMA.id,
    report: savedCMA.report,
    filters: savedCMA.filters,
    subjectAddress: savedCMA.subjectAddress,
    subjectPropertyId: savedCMA.subjectPropertyId,
    generatedAt: savedCMA.generatedAt,
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Hydrate CMA data for display
 */
export function hydrateCMAForDisplay(loadedCMA: LoadedCMA): {
  summary: string;
  valueRange: string;
  confidenceLevel: string;
  compCount: number;
  appreciationRate?: string;
  capRate?: string;
  monthlyRent?: string;
  daysOnMarket?: number;
} {
  const { report } = loadedCMA;

  return {
    summary: formatCMASummary(report),
    valueRange: formatValueRange(report.summary.lowRange, report.summary.highRange),
    confidenceLevel: formatConfidenceLevel(report.summary.confidenceScore),
    compCount: report.comps.length,
    appreciationRate: report.appreciation?.cagr5
      ? `${(report.appreciation.cagr5 * 100).toFixed(2)}%`
      : undefined,
    capRate: report.cashflow?.capRate
      ? `${(report.cashflow.capRate * 100).toFixed(2)}%`
      : undefined,
    monthlyRent: report.cashflow?.netOperatingIncome
      ? `$${(report.cashflow.netOperatingIncome / 12).toLocaleString()}`
      : undefined,
    daysOnMarket: report.summary.avgDaysOnMarket,
  };
}

/**
 * Format CMA summary text
 */
function formatCMASummary(report: CMAReport): string {
  const value = report.summary.estimatedValue;
  const confidence = report.summary.confidenceScore;

  if (value === null || confidence === null) {
    return 'Unable to generate accurate valuation';
  }

  const confidenceText = confidence >= 0.8 ? 'high confidence' :
                         confidence >= 0.6 ? 'moderate confidence' :
                         'low confidence';

  return `Estimated value: $${value.toLocaleString()} (${confidenceText})`;
}

/**
 * Format value range
 */
function formatValueRange(low: number | null, high: number | null): string {
  if (low === null || high === null) {
    return 'N/A';
  }
  return `$${low.toLocaleString()} - $${high.toLocaleString()}`;
}

/**
 * Format confidence level
 */
function formatConfidenceLevel(score: number | null): string {
  if (score === null) return 'Unknown';

  const percentage = Math.round(score * 100);

  if (score >= 0.8) return `High (${percentage}%)`;
  if (score >= 0.6) return `Moderate (${percentage}%)`;
  return `Low (${percentage}%)`;
}

/**
 * Get CMA age in days
 */
export function getCMAAge(generatedAt: string): number {
  const generated = new Date(generatedAt);
  const now = new Date();
  return Math.floor((now.getTime() - generated.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Check if CMA is stale
 */
export function isCMAStale(generatedAt: string, maxDays: number = 30): boolean {
  return getCMAAge(generatedAt) > maxDays;
}

/**
 * Format CMA age for display
 */
export function formatCMAAge(generatedAt: string): string {
  const days = getCMAAge(generatedAt);

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
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

async function loadFromIndexedDB(id: string): Promise<SavedCMA | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  } catch (error) {
    console.error('IndexedDB load failed:', error);
    return null;
  }
}
