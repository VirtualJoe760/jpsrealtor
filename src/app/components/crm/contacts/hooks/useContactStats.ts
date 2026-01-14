// useContactStats hook - Handles fetching and managing contact statistics and tags

import { useState, useEffect, useCallback } from 'react';
import { Tag, ContactStats } from '../types';

export function useContactStats() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [stats, setStats] = useState<ContactStats>({ total: 0, byStatus: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch tags from API
   */
  const fetchTags = useCallback(async () => {
    try {
      const response = await fetch('/api/crm/contacts/tags');
      const data = await response.json();

      if (data.success) {
        setTags(data.tags || []);
      } else {
        console.error('[useContactStats] Tags API error:', data.error);
        setError(data.error);
      }
    } catch (error) {
      console.error('[useContactStats] Error fetching tags:', error);
      setError('Failed to fetch tags');
    }
  }, []);

  /**
   * Fetch stats from API
   */
  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/crm/contacts/stats');
      const data = await response.json();

      if (data.success) {
        setStats(data.stats);
      } else {
        console.error('[useContactStats] Stats API error:', data.error);
        setError(data.error);
      }
    } catch (error) {
      console.error('[useContactStats] Error fetching stats:', error);
      setError('Failed to fetch stats');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch both tags and stats
   */
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    await Promise.all([fetchTags(), fetchStats()]);
  }, [fetchTags, fetchStats]);

  /**
   * Refetch all data
   */
  const refetch = useCallback(() => {
    return fetchAll();
  }, [fetchAll]);

  /**
   * Get tag by name
   */
  const getTagByName = useCallback((name: string): Tag | undefined => {
    return tags.find(tag => tag.name === name);
  }, [tags]);

  /**
   * Get count for a specific status
   */
  const getStatusCount = useCallback((status: string): number => {
    return stats.byStatus[status] || 0;
  }, [stats]);

  // Fetch on mount
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return {
    // Data
    tags,
    stats,
    loading,
    error,

    // Actions
    refetch,
    fetchTags,
    fetchStats,

    // Helpers
    getTagByName,
    getStatusCount
  };
}
