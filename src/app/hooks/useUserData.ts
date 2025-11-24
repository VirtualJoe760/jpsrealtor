/**
 * User data fetching for personalization
 * Extracted from IntegratedChatWidget.tsx
 */
import { useState, useEffect } from "react";
import { Session } from "next-auth";
import { UserData } from "@/lib/chat-utils";

export function useUserData(session: Session | null, userId: string) {
  const [userData, setUserData] = useState<UserData | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!session?.user?.email && !userId) {
        // No authenticated user or anonymous user - skip personalization
        return;
      }

      try {
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
            const goalsResponse = await fetch(
              `/api/chat/goals?userId=${userId}`
            );
            const goalsData = goalsResponse.ok
              ? await goalsResponse.json()
              : null;

            // Build userData object
            const data: UserData = {
              name: profile?.name,
              profileDescription: profile?.profileDescription,
              realEstateGoals: profile?.realEstateGoals,
              homeownerStatus: profile?.homeownerStatus,
              topCities: favoritesData?.analytics?.topCities || [],
              topSubdivisions: favoritesData?.analytics?.topSubdivisions || [],
              favoriteCount: favoritesData?.favorites?.length || 0,
              chatGoals: goalsData?.goals?.goals || undefined,
            };

            setUserData(data);
          }
        }
      } catch (error) {
        console.error("Failed to fetch user data for personalization:", error);
        // Fail gracefully - chat works without personalization
      }
    };

    fetchUserData();
  }, [session, userId]);

  return userData;
}
