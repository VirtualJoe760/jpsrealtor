"use client";

import React from "react";

interface AuthFormProps {
  name: string;
  setName: (value: string) => void;
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  confirmPassword: string;
  setConfirmPassword: (value: string) => void;
}

const AuthForm: React.FC<AuthFormProps> = ({
  name,
  setName,
  email,
  setEmail,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
}) => {
  return (
    <>
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-white">Name</label>
        <input
          id="name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="block w-full rounded-md py-1.5 text-white bg-gray-800"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-white">Email</label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="block w-full rounded-md py-1.5 text-white bg-gray-800"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-white">Password</label>
        <input
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="block w-full rounded-md py-1.5 text-white bg-gray-800"
        />
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-white">Confirm Password</label>
        <input
          id="confirmPassword"
          type="password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="block w-full rounded-md py-1.5 text-white bg-gray-800"
        />
      </div>
    </>
  );
};

export default AuthForm;
