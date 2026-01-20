// src/app/dashboard/utils/formatters.ts

export function formatRoleName(role: string): string {
  const roleMap: Record<string, string> = {
    endUser: "End User",
    admin: "Administrator",
    vacationRentalHost: "Vacation Rental Host",
    realEstateAgent: "Real Estate Agent",
    serviceProvider: "Service Provider",
  };
  return roleMap[role] || role;
}

export function decodePropertyType(code: string): string {
  const propertyTypeMap: Record<string, string> = {
    A: "Residential Sale",
    B: "Residential Lease",
    C: "Residential Income",
    D: "Land",
    E: "Manufactured In Park",
    F: "Commercial Sale",
    G: "Commercial Lease",
    H: "Business Opportunity",
    I: "Vacation Rental",
  };
  return propertyTypeMap[code] || code;
}
