"use client";

import React from "react";
import { useThemeClasses } from "@/app/contexts/ThemeContext";
import type { IListing } from "@/models/listings";

type Props = Pick<
  IListing,
  | "furnished"
  | "associationFee"
  | "associationFeeFrequency"
  | "fireplacesTotal"
  | "heating"
  | "cooling"
  | "poolYn"
  | "spaYn"
  | "viewYn"
  | "roof"
  | "flooring"
  | "laundryFeatures"
  | "interiorFeatures"
  | "exteriorFeatures"
>;

export default function FeatureList(props: Props) {
  const { textPrimary, textSecondary } = useThemeClasses();

  const {
    furnished,
    associationFee,
    associationFeeFrequency,
    fireplacesTotal,
    heating,
    cooling,
    poolYn,
    spaYn,
    viewYn,
    roof,
    flooring,
    laundryFeatures,
    interiorFeatures,
    exteriorFeatures,
  } = props;

  return (
    <section className="mt-6 space-y-4">
      <h2 className={`text-xl font-semibold ${textPrimary}`}>Features</h2>
      <ul className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm ${textSecondary}`}>
        {furnished && <li>Furnished: {furnished}</li>}

        {(associationFee || associationFeeFrequency) && (
          <li>
            HOA: {associationFee ? `$${associationFee.toLocaleString()}` : "–"}
            {associationFeeFrequency ? ` / ${associationFeeFrequency}` : ""}
          </li>
        )}

        {(fireplacesTotal ?? 0) > 0 && (
          <li>Fireplaces: {fireplacesTotal}</li>
        )}

        <li>Heating: {heating || "None"}</li>
        <li>Cooling: {cooling || "None"}</li>
        <li>Pool: {poolYn ? "Yes" : "No"}</li>
        <li>Spa: {spaYn ? "Yes" : "No"}</li>
        <li>View: {viewYn ? "Yes" : "No"}</li>

        {roof && <li>Roof: {roof}</li>}
        {flooring && <li>Flooring: {flooring}</li>}
        {laundryFeatures && <li>Laundry: {laundryFeatures}</li>}
        {interiorFeatures && <li>Interior: {interiorFeatures}</li>}
        {exteriorFeatures && <li>Exterior: {exteriorFeatures}</li>}
      </ul>
    </section>
  );
}
