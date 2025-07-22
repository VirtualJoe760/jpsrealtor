// src/app/curb-appeal/page.tsx

"use client";

import { useState } from "react";

export default function CurbAppealPage() {
  const [imageUrl, setImageUrl] = useState("");
  const [prompt, setPrompt] = useState("Generate a cinematic real estate video");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [status, setStatus] = useState("Idle");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const handleSubmit = async () => {
    setStatus("Uploading...");
    try {
      const res = await fetch("/api/ai/runway", {
        method: "POST",
        body: JSON.stringify({ imageUrl, prompt }),
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (!data.taskId) {
        console.error("No taskId returned:", data);
        setStatus("Failed to create task.");
        return;
      }

      setTaskId(data.taskId);
      setStatus("Processing...");

      pollForStatus(data.taskId);
    } catch (error) {
      console.error("Submission failed:", error);
      setStatus("Error during submission.");
    }
  };

  const pollForStatus = async (id: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/ai/runway/${id}`);
        const data = await res.json();

        if (data.status === "complete") {
          setStatus("Complete");
          setVideoUrl(data.videoUrl);
          clearInterval(interval);
        } else if (data.status === "failed") {
          setStatus("Failed");
          clearInterval(interval);
        } else {
          console.log("Status:", data.status);
        }
      } catch (error) {
        console.error("Polling error:", error);
        setStatus("Error polling");
        clearInterval(interval);
      }
    }, 5000);
  };

  return (
    <div className="max-w-xl mx-auto py-12 px-4">
      <h1 className="text-2xl font-semibold mb-4">AI Curb Appeal Generator</h1>
      <input
        type="text"
        placeholder="Enter image URL"
        value={imageUrl}
        onChange={(e) => setImageUrl(e.target.value)}
        className="w-full border rounded px-3 py-2 mb-3 text-black"
      />
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        className="w-full border rounded px-3 py-2 mb-3 text-black"
        rows={2}
      />
      <button
        onClick={handleSubmit}
        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
      >
        Generate Video
      </button>
      <p className="mt-4 text-sm">Status: {status}</p>

      {videoUrl && (
        <div className="mt-6">
          <h2 className="text-lg font-medium mb-2">Preview</h2>
          <video
            src={videoUrl}
            controls
            className="w-full max-w-xl rounded shadow"
          />
        </div>
      )}
    </div>
  );
}
