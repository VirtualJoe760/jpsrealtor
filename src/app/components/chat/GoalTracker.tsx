// src/app/components/chat/GoalTracker.tsx
// Component to display extracted user goals on the dashboard

"use client";

import React, { useState, useEffect } from "react";
import {
  Home,
  DollarSign,
  MapPin,
  Sparkles,
  Calendar,
  TrendingUp,
  Loader2,
} from "lucide-react";

interface UserGoals {
  minBudget?: number;
  maxBudget?: number;
  minBeds?: number;
  maxBeds?: number;
  minBaths?: number;
  maxBaths?: number;
  minSqft?: number;
  maxSqft?: number;
  preferredCities?: string[];
  preferredSubdivisions?: string[];
  mustHave?: string[];
  niceToHave?: string[];
  propertyTypes?: string[];
  timeline?: string;
  lifestylePreferences?: string[];
}

interface GoalTrackerProps {
  userId: string;
  className?: string;
}

export default function GoalTracker({ userId, className = "" }: GoalTrackerProps) {
  const [goals, setGoals] = useState<UserGoals | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchGoals = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/chat/goals?userId=${userId}`);
        const data = await response.json();

        if (data.success && data.goals) {
          setGoals(data.goals.goals);
        }
      } catch (err) {
        console.error("Error fetching goals:", err);
        setError("Failed to load your preferences");
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchGoals();
    }
  }, [userId]);

  if (loading) {
    return (
      <div className={`bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6 ${className}`}>
        <p className="text-red-400 text-sm text-center">{error}</p>
      </div>
    );
  }

  if (!goals || Object.keys(goals).length === 0) {
    return (
      <div className={`bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6 ${className}`}>
        <div className="text-center py-8">
          <Sparkles className="w-12 h-12 mx-auto mb-4 text-gray-600" />
          <h3 className="text-lg font-semibold text-white mb-2">No Preferences Yet</h3>
          <p className="text-gray-400 text-sm mb-4">
            Chat with our AI assistant to help us understand your dream home!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6 ${className}`}>
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
        <Sparkles className="w-6 h-6 mr-2 text-blue-400" />
        Your Dream Home Profile
      </h2>

      <div className="space-y-6">
        {/* Budget */}
        {(goals.minBudget || goals.maxBudget) && (
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-5 h-5 text-green-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-gray-300 mb-1">Budget</h3>
              <p className="text-white font-medium">
                {goals.minBudget
                  ? `$${goals.minBudget.toLocaleString()}`
                  : "No min"}{" "}
                -{" "}
                {goals.maxBudget
                  ? `$${goals.maxBudget.toLocaleString()}`
                  : "No max"}
              </p>
            </div>
          </div>
        )}

        {/* Beds & Baths */}
        {(goals.minBeds || goals.minBaths) && (
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Home className="w-5 h-5 text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-gray-300 mb-1">Property Size</h3>
              <div className="flex gap-4">
                {goals.minBeds && (
                  <p className="text-white">
                    <span className="font-medium">{goals.minBeds}+</span>{" "}
                    <span className="text-gray-400">beds</span>
                  </p>
                )}
                {goals.minBaths && (
                  <p className="text-white">
                    <span className="font-medium">{goals.minBaths}+</span>{" "}
                    <span className="text-gray-400">baths</span>
                  </p>
                )}
                {goals.minSqft && (
                  <p className="text-white">
                    <span className="font-medium">{goals.minSqft.toLocaleString()}+</span>{" "}
                    <span className="text-gray-400">sqft</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Preferred Cities */}
        {goals.preferredCities && goals.preferredCities.length > 0 && (
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5 text-purple-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-gray-300 mb-2">Preferred Locations</h3>
              <div className="flex flex-wrap gap-2">
                {goals.preferredCities.map((city) => (
                  <span
                    key={city}
                    className="px-3 py-1 bg-purple-600/20 border border-purple-500/50 text-purple-300 rounded-full text-xs font-medium"
                  >
                    {city}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Must-Have Features */}
        {goals.mustHave && goals.mustHave.length > 0 && (
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-gray-300 mb-2">Must-Have Features</h3>
              <div className="flex flex-wrap gap-2">
                {goals.mustHave.map((feature) => (
                  <span
                    key={feature}
                    className="px-3 py-1 bg-amber-600/20 border border-amber-500/50 text-amber-300 rounded-full text-xs font-medium"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Nice-to-Have Features */}
        {goals.niceToHave && goals.niceToHave.length > 0 && (
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-cyan-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-gray-300 mb-2">Nice to Have</h3>
              <div className="flex flex-wrap gap-2">
                {goals.niceToHave.map((feature) => (
                  <span
                    key={feature}
                    className="px-3 py-1 bg-cyan-600/20 border border-cyan-500/50 text-cyan-300 rounded-full text-xs font-medium"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Timeline */}
        {goals.timeline && (
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-pink-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Calendar className="w-5 h-5 text-pink-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-gray-300 mb-1">Timeline</h3>
              <p className="text-white font-medium">{goals.timeline}</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-6 pt-6 border-t border-gray-800">
        <p className="text-xs text-gray-500 text-center">
          Your preferences are learned from your conversations with our AI assistant and
          automatically updated as you chat.
        </p>
      </div>
    </div>
  );
}
