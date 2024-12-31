"use client";

import React, { useState, useEffect } from "react";

export default function LocalBusinessChat({ cityId }: { cityId: string }) {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const introPhrases = ["Okay, I found some", "Alright, here's a list of", "Here's what I discovered for"];
  const adjectives = ["highly-rated", "well-reviewed", "top-rated", "popular"];
  const signoffs = ["that you might consider for your needs.", "that could match what you're looking for.", "that you might find interesting."];

  const getRandomElement = (array: string[]) => array[Math.floor(Math.random() * array.length)];

  useEffect(() => {
    if (messages.length > 0) {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!query.trim()) return;

    const userMessage = { role: "user", content: query };
    setMessages((prev) => [...prev, userMessage]);
    setQuery("");
    setLoading(true);

    try {
      const response = await fetch("/api/yelp-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location: cityId, term: query }),
      });

      if (response.ok) {
        const data = await response.json();
        const businesses = data.businesses || [];

        // Generate the preamble dynamically
        const intro = `<p class='text-xl font-semibold mb-2'>${getRandomElement(introPhrases)} <strong>${query}</strong> ${getRandomElement(adjectives)} ${getRandomElement(signoffs)}</p>`;
        const highlights = businesses.slice(0, 3).map((business: any) => {
          const description = business.categories.map((c: any) => c.title).join(", ");
          return `<p class='mb-2'><strong>${business.name}</strong>: ${description}. Located at ${business.location.address1}, ${business.location.city}, ${business.location.state} ${business.location.zip_code}.</p>`;
        }).join("");

        const preamble = businesses.length
          ? `<div class='mb-4 leading-7'>${intro}<div class='mt-2'>${highlights}</div></div>`
          : "<p>No results found for your query.</p>";

        const listings = businesses.map(
          (business: any) => {
            return `
              <a href="${business.url}" target="_blank" rel="noopener noreferrer" class="block p-4 bg-black rounded-lg mb-4 hover:bg-gray-800">
                <div class="flex items-center mb-2">
                  <img src="${business.image_url}" alt="${business.name}" class="w-16 h-16 rounded-full mr-4"/>
                  <div>
                    <h3 class="text-lg font-bold text-white">${business.name}</h3>
                    <p class="text-yellow-400">${business.rating} ★ (${business.review_count} reviews)</p>
                    <p class="text-gray-300">${business.categories.map((c: any) => c.title).join(", ")}</p>
                  </div>
                </div>
                <p class="text-gray-300">${business.location.address1}, ${business.location.city}, ${business.location.state} ${business.location.zip_code}</p>
                ${business.snippet_text ? `<p class="text-gray-300 italic mt-2">"${business.snippet_text}"</p>` : ""}
                ${business.photos?.slice(0, 3).map((photo: string) => `<img src="${photo}" alt="Photo of ${business.name}" class="w-full h-20 object-cover rounded-md mt-2" />`).join("") || ""}
              </a>`;
          }
        ).join("");

        const content = `${preamble}<div>${listings}</div>`;

        const botMessage = { role: "bot", content };
        setMessages((prev) => [...prev, botMessage]);
      } else {
        const errorMessage = "<p>Oops! Something went wrong. Please try again.</p>";
        setMessages((prev) => [...prev, { role: "bot", content: errorMessage }]);
      }
    } catch (error) {
      console.error("Error in fetching data:", error);
      const errorMessage = "<p>There was an error fetching results. Please try again.</p>";
      setMessages((prev) => [...prev, { role: "bot", content: errorMessage }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      handleSendMessage();
    }
  };

  return (
    <div className="bg-black text-white p-6 rounded-lg shadow-md">
      <div>
        {messages.map((message, index) => (
          <div
            key={index}
            className={`mb-4 p-4 rounded-lg leading-7 ${
              message.role === "user" ? "bg-black text-right border border-white" : "bg-black text-left border border-white"
            }`}
            dangerouslySetInnerHTML={{ __html: message.content }}
          />
        ))}
        {loading && <div className="text-gray-300">Searching...</div>}
      </div>

      <div className="flex items-center mt-4">
        <input
          type="text"
          placeholder="e.g., dentists in coachella valley"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          className="flex-1 px-4 py-2 bg-black text-white border border-white rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
        />
        <button
          onClick={handleSendMessage}
          disabled={loading}
          className="ml-2 px-4 py-2 bg-black text-white border border-white font-bold rounded-md hover:bg-gray-800 disabled:bg-gray-500"
        >
          Send
        </button>
      </div>
    </div>
  );
}
