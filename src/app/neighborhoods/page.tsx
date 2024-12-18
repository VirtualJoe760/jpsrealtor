import React from "react";
import VariableHero from "@/components/VariableHero";
import { coachellaValleyCities } from "@/constants/cities";
import CityCard from "@/components/CityCard";
import { citiesPageContent } from "@/constants/staticContent";
import { Metadata } from "next";
import Link from "next/link";

// Generate metadata for the Cities page
export const generateMetadata: Metadata = {
  title: "Coachella Valley Real Estate",
  description: "Explore real estate in the Coachella Valley. Discover listings in popular cities and find your dream home.",
};

const Cities: React.FC = () => {
  const mainCity = coachellaValleyCities.find(
    (c) => c.id === citiesPageContent.hero.cityId
  );

  if (!mainCity) {
    return (
      <div className="text-red-500 text-center">
        {citiesPageContent.cityNotFound}
      </div>
    ); // Handle case where the main city is not found
  }

  return (
    <>
      {/* Hero Section */}
      <VariableHero
        backgroundImage={citiesPageContent.hero.backgroundImage}
        heroContext={mainCity.name} // Updated from serviceName to heroContext
        description={mainCity.description}
      />

      {/* Main city details section */}
      <section className="mx-5 2xl:px-80 lg:px-40 my-10 py-10 px-2">
        <h1 className="py-10 text-6xl">{mainCity.heading}</h1>
        <h2 className="text-2xl ml-5">Population: {mainCity.population}</h2>
        <p className="ml-5 py-10 text-2xl justify-start leading-loose">{mainCity.body}</p>
      </section>

      {/* Cities List Section */}
      <div className="bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:max-w-4xl">
            <h1 className="text-4xl pb-8 text-black sm:text-6xl">
              {citiesPageContent.sections.serviceAreas.heading}
            </h1>
            <p className="mt-5 text-xl leading-8 text-black">
              {citiesPageContent.sections.serviceAreas.description}
            </p>

            {/* City cards for each service area */}
            <div className="mt-16 space-y-20 lg:mt-20 lg:space-y-20">
              {coachellaValleyCities
                .filter((city) => city.id !== citiesPageContent.hero.cityId) // Exclude the main city
                .map((city) => (
                  <Link
                    key={city.id}
                    href={`/neighborhoods/${city.id}`} // Updated to coachella-valley route
                    className="block"
                  >
                    <CityCard city={city} />
                  </Link>
                ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Cities;
