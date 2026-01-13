import { useState, useEffect } from 'react';
import type { Comparable } from '../types';

export function useComparables(
  contactId: string,
  isOpen: boolean,
  latitude?: number,
  longitude?: number
) {
  const [comparables, setComparables] = useState<Comparable[]>([]);
  const [loadingComparables, setLoadingComparables] = useState(false);

  useEffect(() => {
    if (!isOpen || !latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
      setComparables([]);
      return;
    }

    const fetchComparables = async () => {
      setLoadingComparables(true);
      try {
        const response = await fetch(
          `/api/crm/contacts/${contactId}/comparables?latitude=${latitude}&longitude=${longitude}&radius=0.5&limit=10`
        );
        const data = await response.json();

        if (data.success) {
          setComparables(data.comparables || []);
          console.log('[useComparables] Loaded recent market activity:', data.comparables?.length);
        }
      } catch (error) {
        console.error('[useComparables] Error loading market activity:', error);
      } finally {
        setLoadingComparables(false);
      }
    };

    fetchComparables();
  }, [isOpen, latitude, longitude, contactId]);

  return {
    comparables,
    loadingComparables,
  };
}
