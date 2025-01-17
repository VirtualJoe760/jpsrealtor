// src/components/BookAppointmentButton.tsx
"use client";

import React from "react";
import { useRouter } from "next/navigation";

const BookAppointmentButton: React.FC = () => {
  const router = useRouter();

  const handleClick = () => {
    router.push("/book-appointment");
  };

  return (
    <button
      onClick={handleClick}
      className="px-6 py-3 bg-gray-700 text-white text-lg font-semibold rounded-md hover:bg-gray-600 transition-all duration-300"
    >
      Book Appointment
    </button>
  );
};

export default BookAppointmentButton;
