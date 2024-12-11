"use client";

import React from "react";

interface RoleSpecificFieldsProps {
  role: "agent" | "client";
  setRole: (value: "agent" | "client") => void;
  subtype: boolean;
  setSubtype: (value: boolean) => void;
  isForeignNational: boolean;
  setIsForeignNational: (value: boolean) => void;
  brokerName: string;
  setBrokerName: (value: string) => void;
  licenseNumber: string;
  setLicenseNumber: (value: string) => void;
  interests: string[];
  setInterests: (value: string[]) => void;
}

const RoleSpecificFields: React.FC<RoleSpecificFieldsProps> = ({
  role,
  setRole,
  subtype,
  setSubtype,
  isForeignNational,
  setIsForeignNational,
  brokerName,
  setBrokerName,
  licenseNumber,
  setLicenseNumber,
  interests,
  setInterests,
}) => {
  return (
    <>
      {/* Role Selection */}
      <div>
        <p className="text-sm font-medium text-white">Select Role:</p>
        <div className="flex space-x-4">
          <label className="text-white">
            <input
              type="radio"
              value="client"
              checked={role === "client"}
              onChange={() => setRole("client")}
              className="mr-2"
            />
            Client
          </label>
          <label className="text-white">
            <input
              type="radio"
              value="agent"
              checked={role === "agent"}
              onChange={() => setRole("agent")}
              className="mr-2"
            />
            Agent
          </label>
        </div>
      </div>

      {/* Local Client Checkbox */}
      {role === "client" && (
        <div>
          <label className="text-white">
            <input
              type="checkbox"
              checked={subtype}
              onChange={() => setSubtype(!subtype)}
              className="mr-2"
            />
            Are you a local?
          </label>
        </div>
      )}

      {/* Agent-Specific Fields */}
      {role === "agent" && (
        <>
          <div>
            <label htmlFor="brokerName" className="block text-sm font-medium text-white">
              Broker Name
            </label>
            <input
              id="brokerName"
              type="text"
              value={brokerName}
              onChange={(e) => setBrokerName(e.target.value)}
              className="block w-full rounded-md py-1.5 text-white bg-gray-800"
            />
          </div>

          <div>
            <label htmlFor="licenseNumber" className="block text-sm font-medium text-white">
              {isForeignNational ? "Foreign License Number" : "DRE Number"}
            </label>
            <input
              id="licenseNumber"
              type="text"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              className="block w-full rounded-md py-1.5 text-white bg-gray-800"
            />
          </div>

          <div>
            <label className="text-white">
              <input
                type="checkbox"
                checked={isForeignNational}
                onChange={() => setIsForeignNational(!isForeignNational)}
                className="mr-2"
              />
              Are you a foreign national?
            </label>
          </div>

          {/* Interests */}
          <div>
            <label htmlFor="interests" className="block text-sm font-medium text-white">
              Interests
            </label>
            <select
              id="interests"
              name="interests"
              multiple
              value={interests}
              onChange={(e) =>
                setInterests(Array.from(e.target.selectedOptions, (option) => option.value))
              }
              className="block w-full rounded-md py-1.5 text-white bg-gray-800"
            >
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
              <option value="co-brand">Co-Brand</option>
              <option value="open houses">Open Houses</option>
            </select>
          </div>
        </>
      )}
    </>
  );
};

export default RoleSpecificFields;