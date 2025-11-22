import { STATES } from "@/constants/states";
import { COUNTRIES } from "@/app/constants/countries";

export default function AddressInput() {
  return (
    <div className="sm:col-span-2">
      <label htmlFor="street" className="block text-sm/6 font-semibold text-white">
        Street
      </label>
      <input
        id="street"
        name="street"
        type="text"
        placeholder="123 Main St"
        className="mt-2.5 block w-full rounded-md bg-gray-800 px-3.5 py-2 text-base text-white outline outline-1 outline-gray-700 placeholder:text-gray-500 focus:outline-indigo-500"
      />

      <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-3">
        {/* City */}
        <div className="sm:col-span-1">
          <label htmlFor="city" className="block text-sm/6 font-semibold text-white">
            City
          </label>
          <input
            id="city"
            name="city"
            type="text"
            placeholder="Palm Desert"
            className="mt-2.5 block w-full rounded-md bg-gray-800 px-3.5 py-2 text-base text-white outline outline-1 outline-gray-700 placeholder:text-gray-500 focus:outline-indigo-500"
          />
        </div>

        {/* State */}
        <div className="sm:col-span-1">
          <label htmlFor="state" className="block text-sm/6 font-semibold text-white">
            State
          </label>
          <select
            id="state"
            name="state"
            defaultValue=""
            className="mt-2.5 block w-full rounded-md bg-gray-800 px-3.5 py-2 text-base text-white outline outline-1 outline-gray-700 focus:outline-indigo-500"
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
          <label htmlFor="zip" className="block text-sm/6 font-semibold text-white">
            Zip Code
          </label>
          <input
            id="zip"
            name="zip"
            type="text"
            placeholder="92211"
            className="mt-2.5 block w-full rounded-md bg-gray-800 px-3.5 py-2 text-base text-white outline outline-1 outline-gray-700 placeholder:text-gray-500 focus:outline-indigo-500"
          />
        </div>
      </div>

      {/* Country */}
      <div className="mt-6">
        <label htmlFor="country" className="block text-sm/6 font-semibold text-white">
          Country
        </label>
        <select
          id="country"
          name="country"
          defaultValue=""
          className="mt-2.5 block w-full rounded-md bg-gray-800 px-3.5 py-2 text-base text-white outline outline-1 outline-gray-700 focus:outline-indigo-500"
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
