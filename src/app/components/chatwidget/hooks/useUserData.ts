// src/app/components/chatwidget/hooks/useUserData.ts
// Custom hook for fetching and managing user data (profile, favorites, goals)

import { useState, useEffect } from "react";
import { type UserData } from "@/lib/chat-utils";

export interface UseUserDataReturn {
  userData: UserData | null;
  isLoading: boolean;
  error: string | null;
}

export function useUserData(
  session: any,
  userId: string
): UseUserDataReturn {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!session?.user?.email && !userId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Fetch user profile if authenticated
        if (session?.user?.email) {
          const profileResponse = await fetch("/api/user/profile");
          if (profileResponse.ok) {
            const { profile } = await profileResponse.json();

            // Fetch favorites and analytics
            const favoritesResponse = await fetch("/api/user/favorites");
            const favoritesData = favoritesResponse.ok
              ? await favoritesResponse.json()
              : null;

            // Fetch chat goals
            const goalsResponse = await fetch(`/api/chat/goals?userId=${userId}`);
            const goalsData = goalsResponse.ok
              ? await goalsResponse.json()
              : null;

            // Combine all user data
            setUserData({
              ...profile,
              favorites: favoritesData?.favorites || [],
              goals: goalsData?.goals || [],
            });
          }
        }
      } catch (err: any) {
        console.error("Failed to fetch user data:", err);
        setError(err.message || "Failed to load user data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [session, userId]);

  return {
    userData,
    isLoading,
    error,
  };
}
