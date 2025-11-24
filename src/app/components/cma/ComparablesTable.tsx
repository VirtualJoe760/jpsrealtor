// src/app/components/cma/ComparablesTable.tsx
"use client";

import { useTheme } from "@/app/contexts/ThemeContext";
import { MapPin, TrendingUp, Calendar, Home } from "lucide-react";
import type { ComparableProperty, SubjectProperty } from "@/types/cma";
import Link from "next/link";

interface ComparablesTableProps {
  subject: SubjectProperty;
  comparables: ComparableProperty[];
  className?: string;
}

export default function ComparablesTable({
  subject,
  comparables,
  className = "",
}: ComparablesTableProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  const properties = [{ ...subject, isSubject: true }, ...comparables];

  return (
    <div className={`${className} overflow-x-auto`}>
      <div
        className={`rounded-2xl border ${
          isLight ? "border-gray-300" : "border-gray-700/30"
        }`}
      >
        <table className="w-full">
          <thead>
            <tr
              className={`border-b ${
                isLight
                  ? "bg-gray-50 border-gray-300"
                  : "bg-gray-900/50 border-gray-700/30"
              }`}
            >
              <th
                className={`px-4 py-3 text-left text-xs font-semibold ${
                  isLight ? "text-gray-900" : "text-gray-300"
                }`}
              >
                Property
              </th>
              <th
                className={`px-4 py-3 text-right text-xs font-semibold ${
                  isLight ? "text-gray-900" : "text-gray-300"
                }`}
              >
                Price
              </th>
              <th
                className={`px-4 py-3 text-center text-xs font-semibold ${
                  isLight ? "text-gray-900" : "text-gray-300"
                }`}
              >
                Beds/Baths
              </th>
              <th
                className={`px-4 py-3 text-right text-xs font-semibold ${
                  isLight ? "text-gray-900" : "text-gray-300"
                }`}
              >
                SqFt
              </th>
              <th
                className={`px-4 py-3 text-right text-xs font-semibold ${
                  isLight ? "text-gray-900" : "text-gray-300"
                }`}
              >
                $/SqFt
              </th>
              <th
                className={`px-4 py-3 text-center text-xs font-semibold ${
                  isLight ? "text-gray-900" : "text-gray-300"
                }`}
              >
                Status
              </th>
              <th
                className={`px-4 py-3 text-right text-xs font-semibold ${
                  isLight ? "text-gray-900" : "text-gray-300"
                }`}
              >
                Distance
              </th>
              <th
                className={`px-4 py-3 text-center text-xs font-semibold ${
                  isLight ? "text-gray-900" : "text-gray-300"
                }`}
              >
                Match
              </th>
            </tr>
          </thead>
          <tbody>
            {properties.map((property, index) => {
              const isSubject = "isSubject" in property && property.isSubject;
              const price = property.soldPrice || property.listPrice;

              return (
                <tr
                  key={property.listingKey}
                  className={`border-b ${
                    isLight ? "border-gray-200" : "border-gray-800/30"
                  } ${
                    isSubject
                      ? isLight
                        ? "bg-blue-50"
                        : "bg-blue-500/10"
                      : isLight
                        ? "bg-white hover:bg-gray-50"
                        : "bg-gray-900/30 hover:bg-gray-800/30"
                  } transition-colors`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-3">
                      {property.primaryPhotoUrl && (
                        <img
                          src={property.primaryPhotoUrl}
                          alt={property.address}
                          className="w-16 h-12 object-cover rounded"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div
                          className={`text-sm font-semibold truncate ${
                            isLight ? "text-gray-900" : "text-white"
                          }`}
                        >
                          {isSubject && (
                            <span
                              className={`inline-block px-2 py-0.5 rounded mr-2 text-xs ${
                                isLight
                                  ? "bg-blue-500 text-white"
                                  : "bg-blue-500/20 text-blue-400"
                              }`}
                            >
                              Subject
                            </span>
                          )}
                          {property.address}
                        </div>
                        <div
                          className={`text-xs ${
                            isLight ? "text-gray-600" : "text-gray-400"
                          }`}
                        >
                          {property.city}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td
                    className={`px-4 py-3 text-right text-sm font-semibold ${
                      isLight ? "text-gray-900" : "text-white"
                    }`}
                  >
                    ${price.toLocaleString()}
                  </td>
                  <td
                    className={`px-4 py-3 text-center text-sm ${
                      isLight ? "text-gray-700" : "text-gray-300"
                    }`}
                  >
                    {property.bedroomsTotal || "-"} / {property.bathroomsTotalInteger || "-"}
                  </td>
                  <td
                    className={`px-4 py-3 text-right text-sm ${
                      isLight ? "text-gray-700" : "text-gray-300"
                    }`}
                  >
                    {property.livingArea?.toLocaleString() || "-"}
                  </td>
                  <td
                    className={`px-4 py-3 text-right text-sm font-semibold ${
                      isLight ? "text-gray-900" : "text-white"
                    }`}
                  >
                    ${property.pricePerSqFt || "-"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                        property.standardStatus === "Active"
                          ? isLight
                            ? "bg-green-100 text-green-700"
                            : "bg-green-500/20 text-green-400"
                          : property.standardStatus === "Closed"
                            ? isLight
                              ? "bg-blue-100 text-blue-700"
                              : "bg-blue-500/20 text-blue-400"
                            : isLight
                              ? "bg-gray-100 text-gray-700"
                              : "bg-gray-500/20 text-gray-400"
                      }`}
                    >
                      {property.standardStatus}
                    </span>
                  </td>
                  <td
                    className={`px-4 py-3 text-right text-sm ${
                      isLight ? "text-gray-700" : "text-gray-300"
                    }`}
                  >
                    {isSubject
                      ? "-"
                      : property.distanceFromSubject
                        ? `${property.distanceFromSubject.toFixed(2)} mi`
                        : "-"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {!isSubject && property.similarity !== undefined && (
                      <div className="flex items-center justify-center gap-1">
                        <div
                          className={`text-sm font-semibold ${
                            property.similarity >= 80
                              ? isLight
                                ? "text-green-700"
                                : "text-green-400"
                              : property.similarity >= 60
                                ? isLight
                                  ? "text-yellow-700"
                                  : "text-yellow-400"
                                : isLight
                                  ? "text-orange-700"
                                  : "text-orange-400"
                          }`}
                        >
                          {property.similarity}%
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
