"use client";
import React, { useState } from "react";

const TextForm: React.FC = () => {
  const [to, setTo] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");

  const sendText = async () => {
    try {
      const response = await fetch("/api/twilio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, message }),
      });
  
      if (response.ok) {
        setStatus("Text sent successfully!");
        setTo("");
        setMessage("");
      } else {
        const error = await response.json();
        setStatus(`Failed to send text: ${error.error}`);
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        setStatus(`Error: ${error.message}`);
      } else {
        setStatus("An unknown error occurred.");
      }
    }
  };
  

  return (
    <div className="text-form">
      <h2 className="text-2xl font-semibold mb-4">Send a Text</h2>
      <input
        type="text"
        placeholder="Enter phone number"
        value={to}
        onChange={(e) => setTo(e.target.value)}
        className="block w-full mb-4 p-2 border rounded"
      />
      <textarea
        placeholder="Enter your message"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        className="block w-full mb-4 p-2 border rounded"
      />
      <button
        onClick={sendText}
        className="px-4 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700"
      >
        Send Text
      </button>
      {status && <p className="mt-4">{status}</p>}
    </div>
  );
};

export default TextForm;
