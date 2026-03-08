'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'cms_deployments';
const DEPLOYMENT_DURATION_MS = 180000; // 3 minutes

export interface Deployment {
  slug: string;
  startedAt: string;
  expiresAt: string;
  status: 'deploying' | 'completed';
  environment: 'production' | 'localhost';
}

export function useDeploymentStatus() {
  const [deployments, setDeployments] = useState<Deployment[]>([]);

  // Load deployments from localStorage
  const loadDeployments = useCallback(() => {
    if (typeof window === 'undefined') return [];

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];

      const parsed: Deployment[] = JSON.parse(stored);
      const now = Date.now();

      // Filter out expired deployments
      const active = parsed.filter(d => new Date(d.expiresAt).getTime() > now);

      // Clean up expired ones from storage
      if (active.length !== parsed.length) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(active));
      }

      return active;
    } catch (error) {
      console.error('Failed to load deployments:', error);
      return [];
    }
  }, []);

  // Save deployments to localStorage
  const saveDeployments = useCallback((deps: Deployment[]) => {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(deps));
      setDeployments(deps);
    } catch (error) {
      console.error('Failed to save deployments:', error);
    }
  }, []);

  // Initialize deployments on mount
  useEffect(() => {
    const loaded = loadDeployments();
    setDeployments(loaded);
  }, [loadDeployments]);

  // Auto-cleanup timer
  useEffect(() => {
    const interval = setInterval(() => {
      const active = loadDeployments();
      setDeployments(active);
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [loadDeployments]);

  // Start tracking a new deployment
  const startDeployment = useCallback((slug: string, environment: 'production' | 'localhost' = 'production') => {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + DEPLOYMENT_DURATION_MS);

    const newDeployment: Deployment = {
      slug,
      startedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      status: 'deploying',
      environment,
    };

    const existing = loadDeployments();
    // Remove any existing deployment for this slug
    const filtered = existing.filter(d => d.slug !== slug);
    const updated = [...filtered, newDeployment];

    saveDeployments(updated);
  }, [loadDeployments, saveDeployments]);

  // Mark deployment as completed
  const completeDeployment = useCallback((slug: string) => {
    const existing = loadDeployments();
    const updated = existing.map(d =>
      d.slug === slug ? { ...d, status: 'completed' as const } : d
    );
    saveDeployments(updated);
  }, [loadDeployments, saveDeployments]);

  // Remove deployment
  const removeDeployment = useCallback((slug: string) => {
    const existing = loadDeployments();
    const updated = existing.filter(d => d.slug !== slug);
    saveDeployments(updated);
  }, [loadDeployments, saveDeployments]);

  // Check if slug is currently deploying
  const isDeploying = useCallback((slug: string): boolean => {
    const deployment = deployments.find(d => d.slug === slug);
    if (!deployment) return false;

    const now = Date.now();
    const expiresAt = new Date(deployment.expiresAt).getTime();

    return deployment.status === 'deploying' && expiresAt > now;
  }, [deployments]);

  // Get time remaining for a deployment (in seconds)
  const getTimeRemaining = useCallback((slug: string): number => {
    const deployment = deployments.find(d => d.slug === slug);
    if (!deployment) return 0;

    const now = Date.now();
    const expiresAt = new Date(deployment.expiresAt).getTime();
    const remaining = Math.max(0, Math.ceil((expiresAt - now) / 1000));

    return remaining;
  }, [deployments]);

  // Get deployment info
  const getDeployment = useCallback((slug: string): Deployment | undefined => {
    return deployments.find(d => d.slug === slug);
  }, [deployments]);

  return {
    deployments,
    startDeployment,
    completeDeployment,
    removeDeployment,
    isDeploying,
    getTimeRemaining,
    getDeployment,
  };
}
