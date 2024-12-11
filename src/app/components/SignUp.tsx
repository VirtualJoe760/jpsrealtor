"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

import GoogleIcon from "@/assets/socials/google.svg";
import FacebookIcon from "@/assets/socials/facebook.svg";

const SignUp = () => {

  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();
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
    <div
      className="flex lg:min-h-full xl:min-h-screen flex-1 flex-col justify-center px-6 py-12 lg:px-8 bg-cover bg-center"
      style={{
        backgroundImage: `url("/city-images/palm-desert.jpg")`,
      }}
    >
      <div className="sm:mx-auto sm:w-full sm:max-w-sm bg-gray-900 bg-opacity-80 p-8 rounded-md shadow-md">    
        <h2 className="mt-10 text-center text-2xl font-bold tracking-tight text-white">
          Create an Account
        </h2>

        {error && <p className="text-red-500 text-center">{error}</p>}

        <div className="mt-10">
          <form onSubmit={handleSignUp} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-white">
                Name
              </label>
              <div className="mt-2">
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white">
                Email address
              </label>
              <div className="mt-2">
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white">
                Password
              </label>
              <div className="mt-2">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-white">
                Confirm Password
              </label>
              <div className="mt-2">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="button flex w-full justify-center rounded-md px-3 py-1.5 text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                Sign Up
              </button>
            </div>
          </form>

          {/* Divider for social sign-up */}
          <div className="relative mt-8">
            <hr className="border-t border-gray-700" />
            <span className="absolute inset-x-0 -top-2.5 mx-auto w-max px-4 bg-gray-900 text-sm font-medium text-gray-400">
              Or continue with
            </span>
          </div>

          {/* Social login buttons */}
          <div className="mt-6 grid grid-cols-2 gap-4">
            <button
              onClick={() => signIn("google")}
              className="flex w-full items-center justify-center gap-3 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-500 focus-visible:ring-transparent dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-500"
            >
              <GoogleIcon className="w-5 h-5" aria-hidden="true" />
              <span>Google</span>
            </button>

            <button
              onClick={() => signIn("facebook")}
              className="flex w-full items-center justify-center gap-3 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-500 focus-visible:ring-transparent dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-500"
            >
              <FacebookIcon className="w-5 h-5" aria-hidden="true" />
              <span>Facebook</span>
            </button>
          </div>
        </div>

        <p className="mt-10 text-center text-sm text-gray-400">
          Already have an account?{" "}
          <Link href="/auth/sign-in" className="font-semibold text-indigo-400 hover:text-indigo-300">
            Sign In!
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignUp;
