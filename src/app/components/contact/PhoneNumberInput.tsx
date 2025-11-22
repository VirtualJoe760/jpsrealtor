"use client";

import { useState } from "react";
import { COUNTRY_CODES } from "@/constants/countryCodes";
import { useThemeClasses } from "@/app/contexts/ThemeContext";

export default function PhoneNumberInput() {
  const { textPrimary, currentTheme } = useThemeClasses();
  const isLight = currentTheme === "lightgradient";
  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState("+1");

  // Function to format phone number as (555) 555-5555
  const formatPhoneNumber = (value: string) => {
    // Remove all non-numeric characters
    const cleaned = value.replace(/D/g, "");

    // Format into (XXX) XXX-XXXX
    const match = cleaned.match(/^(d{0,3})(d{0,3})(d{0,4})$/);

    if (match) {
      const part1 = match[1] ? `(${match[1]}` : "";
      const part2 = match[2] ? `) ${match[2]}` : "";
      const part3 = match[3] ? `-${match[3]}` : "";

      return `${part1}${part2}${part3}`.trim();
    }

    return value;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedNumber = formatPhoneNumber(e.target.value);
    setPhoneNumber(formattedNumber);
  };

  return (
    <div className="sm:col-span-2">
      <label htmlFor="phone" className={`block text-sm/6 font-semibold ${textPrimary}`}>
        Phone Number
      </label>
      <div className="mt-2.5 flex gap-4">
        {/* Country Code Dropdown */}
        <select
          id="countryCode"
          name="countryCode"
          value={countryCode}
          onChange={(e) => setCountryCode(e.target.value)}
          className={`w-1/4 rounded-md px-3.5 py-2 outline outline-1 ${textPrimary} ${
            isLight
              ? "bg-white border-gray-300 outline-gray-300 focus:outline-indigo-500"
              : "bg-gray-800 border-gray-700 outline-gray-700 focus:outline-indigo-500"
          }`}
          required
        >
          {COUNTRY_CODES.map((country) => (
            <option key={country.code} value={country.code}>
              {`${country.code}`}
            </option>
          ))}
        </select>

        {/* Phone Number Input */}
        <input
          id="phone"
          name="phone"
          type="tel"
          value={phoneNumber}
          onChange={handlePhoneChange}
          placeholder="(555) 555-5555"
          className={`w-3/4 rounded-md px-3.5 py-2 text-base outline outline-1 ${textPrimary} ${
            isLight
              ? "bg-white border-gray-300 outline-gray-300 placeholder-gray-400 focus:outline-indigo-500"
              : "bg-gray-800 border-gray-700 outline-gray-700 placeholder-gray-500 focus:outline-indigo-500"
          }`}
          required
        />
      </div>
    </div>
  );
}
