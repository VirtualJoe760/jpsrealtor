// src\app\components\auth\SignUp.tsx
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthForm from "@/components/auth/AuthForm";
import RoleSpecificFields from "@/components/auth/RoleSpecificFields";

const SignUp = () => {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"agent" | "client">("client");
  const [subtype, setSubtype] = useState(false);
  const [isForeignNational, setIsForeignNational] = useState(false);
  const [brokerName, setBrokerName] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
  
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
  
    const payload = {
      name,
      email,
      password,
      role,
      subtype: subtype ? "local" : undefined,
      isForeignNational,
      brokerName: role === "agent" ? brokerName : undefined,
      licenseNumber: role === "agent" ? licenseNumber : undefined,
      interests: role === "agent" ? interests : undefined,
    };
  
    console.log("Sending Payload:", payload);
  
    try {
      const response = await fetch("/api/user/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    
      console.log("Response status:", response.status);
      console.log("Raw response body:", await response.text());
    
      if (!response.ok) {
        setError("Failed to create account. Please try again.");
        return;
      }
    
      const data = await response.json();
      console.log("Parsed response data:", data);
    
      if (data.success) {
        router.push("/auth/signin");
      } else {
        setError(data.message || "Failed to create account");
      }
    } catch (error) {
      console.error("Sign-up error:", error);
      setError("An error occurred. Please try again.");
    }
    
  };
  

  return (
    <div className="flex lg:min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm bg-gray-900 p-8 rounded-md">
        <h2 className="text-center text-2xl font-bold tracking-tight text-white">Create an Account</h2>

        {error && <p className="text-red-500 text-center">{error}</p>}

        <form onSubmit={handleSignUp} className="space-y-6 mt-6">
          <AuthForm
            name={name}
            setName={setName}
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            confirmPassword={confirmPassword}
            setConfirmPassword={setConfirmPassword}
          />
          <RoleSpecificFields
            role={role}
            setRole={setRole}
            subtype={subtype}
            setSubtype={setSubtype}
            isForeignNational={isForeignNational}
            setIsForeignNational={setIsForeignNational}
            brokerName={brokerName}
            setBrokerName={setBrokerName}
            licenseNumber={licenseNumber}
            setLicenseNumber={setLicenseNumber}
            interests={interests}
            setInterests={setInterests}
          />
          <button
            type="submit"
            className="button flex w-full justify-center rounded-md px-3 py-1.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500"
          >
            Sign Up
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-400">
          Already have an account?{" "}
          <Link href="/auth/sign-in" className="font-semibold text-indigo-400 hover:text-indigo-300">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignUp;
