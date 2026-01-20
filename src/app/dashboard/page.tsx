// src/app/dashboard/page.tsx
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { useThemeClasses } from "../contexts/ThemeContext";
import { useTheme } from "../contexts/ThemeContext";
import { useDashboardData } from "./hooks/useDashboardData";
import { useRemovedListings } from "./hooks/useRemovedListings";
import ProfileCard from "./components/ProfileCard";
import StatisticsCards from "./components/StatisticsCards";
import SwipeInsights from "./components/SwipeInsights";
import FavoriteProperties from "./components/FavoriteProperties";
import FavoriteCommunities from "./components/FavoriteCommunities";
import RemovedListingsModal from "./components/RemovedListingsModal";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Theme (must be called before any early returns)
  const {
    currentTheme,
    cardBg,
    cardBorder,
    textPrimary,
    textSecondary,
    textTertiary,
    shadow,
  } = useThemeClasses();
  const { toggleTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  // Dashboard data
  const {
    twoFactorEnabled,
    favorites,
    favoriteCommunities,
    analytics,
    isLoadingFavorites,
    isLoadingCommunities,
    isSyncing,
    selectedListings,
    toggleSelectListing,
    toggleSelectAll,
    deleteSelected,
    removeFavorite,
    removeCommunity,
    bulkRemoveFavorites,
  } = useDashboardData(status);

  // Removed listings detection
  const { removedListingsResult, shouldShowModal, dismissModal } = useRemovedListings(favorites);

  // Auth redirect
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  // Loading state
  if (status === "loading") {
    return <div className="min-h-screen" />;
  }

  if (!session) return null;
  const user = session.user;

  return (
    <div className="min-h-screen" data-page="dashboard">
      {/* Removed Listings Notification Modal */}
      <RemovedListingsModal
        isOpen={shouldShowModal}
        removedListings={removedListingsResult.removedListings}
        onContinue={dismissModal}
        isLight={isLight}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
      />

      {/* Main Content */}
      <div className="py-6 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Welcome Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="mb-6 text-center"
          >
            <h2 className={`text-2xl sm:text-3xl md:text-4xl font-bold ${textPrimary} mb-2`}>
              Welcome back, {user.name || "User"}!
            </h2>
            <p className={`${textSecondary} text-xs sm:text-sm md:text-base`}>
              Your personalized dashboard with favorites and insights
            </p>
          </motion.div>

          {/* Profile Card with Menu */}
          <ProfileCard
            user={user}
            twoFactorEnabled={twoFactorEnabled}
            isLight={isLight}
            cardBg={cardBg}
            cardBorder={cardBorder}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            shadow={shadow}
            toggleTheme={toggleTheme}
          />

          {/* Statistics Cards */}
          {analytics && (
            <StatisticsCards
              analytics={analytics}
              isLight={isLight}
              cardBg={cardBg}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              textTertiary={textTertiary}
            />
          )}

          {/* Swipe Insights */}
          {analytics && (
            <SwipeInsights
              analytics={analytics}
              cardBg={cardBg}
              cardBorder={cardBorder}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              textTertiary={textTertiary}
              shadow={shadow}
            />
          )}

          {/* Favorite Properties */}
          <FavoriteProperties
            favorites={favorites.filter(
              (f) =>
                // Keep listings that have a photo OR have MLS info to fetch photo
                f.primaryPhotoUrl || (f.mlsId && f.mlsSource)
            )}
            isLoadingFavorites={isLoadingFavorites}
            isSyncing={isSyncing}
            selectedListings={selectedListings}
            toggleSelectListing={toggleSelectListing}
            toggleSelectAll={toggleSelectAll}
            deleteSelected={deleteSelected}
            removeFavorite={removeFavorite}
            cardBg={cardBg}
            cardBorder={cardBorder}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            textTertiary={textTertiary}
            shadow={shadow}
            isLight={isLight}
          />

          {/* Favorite Communities */}
          <FavoriteCommunities
            favoriteCommunities={favoriteCommunities}
            isLoadingCommunities={isLoadingCommunities}
            removeCommunity={removeCommunity}
            cardBg={cardBg}
            cardBorder={cardBorder}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            textTertiary={textTertiary}
            shadow={shadow}
            isLight={isLight}
          />
        </div>
      </div>
    </div>
  );
}
