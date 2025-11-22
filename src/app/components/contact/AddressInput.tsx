"use client";

import { STATES } from "@/constants/states";
import { COUNTRIES } from "@/app/constants/countries";
import { useThemeClasses } from "@/app/contexts/ThemeContext";

export default function AddressInput() {
  const { textPrimary, currentTheme } = useThemeClasses();
  const isLight = currentTheme === "lightgradient";

  const inputClasses = `mt-2.5 block w-full rounded-md px-3.5 py-2 text-base outline outline-1 ${textPrimary} ${
    isLight
      ? "bg-white border-gray-300 outline-gray-300 placeholder-gray-400 focus:outline-indigo-500"
      : "bg-gray-800 border-gray-700 outline-gray-700 placeholder-gray-500 focus:outline-indigo-500"
  }`;

  return (
    <div className="sm:col-span-2">
      <label htmlFor="street" className={`block text-sm/6 font-semibold ${textPrimary}`}>
        Street
      </label>
      <input
        id="street"
        name="street"
        type="text"
        placeholder="123 Main St"
        className={inputClasses}
      />

      <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-3">
        {/* City */}
        <div className="sm:col-span-1">
          <label htmlFor="city" className={`block text-sm/6 font-semibold ${textPrimary}`}>
            City
          </label>
          <input
            id="city"
            name="city"
            type="text"
            placeholder="Palm Desert"
            className={inputClasses}
          />
        </div>

        {/* State */}
        <div className="sm:col-span-1">
          <label htmlFor="state" className={`block text-sm/6 font-semibold ${textPrimary}`}>
            State
          </label>
          <select
            id="state"
            name="state"
            defaultValue=""
            className={inputClasses}
          >
            <option value="" disabled>
              Select State
            </option>
            {STATES.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </div>

        {/* Zip */}
        <div className="sm:col-span-1">
          <label htmlFor="zip" className={`block text-sm/6 font-semibold ${textPrimary}`}>
            Zip Code
          </label>
          <input
            id="zip"
            name="zip"
            type="text"
            placeholder="92211"
            className={inputClasses}
          />
        </div>
      </div>

      {/* Country */}
      <div className="mt-6">
        <label htmlFor="country" className={`block text-sm/6 font-semibold ${textPrimary}`}>
          Country
        </label>
        <select
          id="country"
          name="country"
          defaultValue=""
          className={inputClasses}
        >
          <option value="" disabled>
            Select Country
          </option>
          {COUNTRIES.map((country) => (
            <option key={country} value={country}>
              {country}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
