"use client";

import React, { useState } from "react";
import Image from "next/image";

export default function FileUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) {
      alert("Please select a file.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (response.ok) {
      setUploadedUrl(data.url);
    } else {
      alert(data.error || "Upload failed.");
    }
  };

  return (
    <div>
      <input type="file" onChange={handleFileChange} />
      <button onClick={handleUpload}>Upload</button>
      {uploadedUrl && (
        <div>
          <p>Uploaded Image:</p>
          <Image
            src={uploadedUrl}
            alt="Uploaded"
            width={500} // Specify width
            height={500} // Specify height
          />
        </div>
      )}
    </div>
  );
}
