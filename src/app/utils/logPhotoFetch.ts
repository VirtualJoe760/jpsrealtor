// src\app\utils\logPhotoFetch.ts

if (typeof window !== "undefined") {
    const originalFetch = window.fetch;
  
    window.fetch = async (...args) => {
      const [resource, config] = args;
  
      if (typeof resource === "string" && resource.includes("/api/photos/")) {
        console.trace(`🕵️ fetch to /api/photos triggered: ${resource}`);
      }
  
      return originalFetch(...args);
    };
  }