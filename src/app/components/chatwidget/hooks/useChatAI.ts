// src/app/components/chatwidget/hooks/useChatAI.ts
// Custom hook for AI chat logic with streaming, retry, and function calling

import { useState } from "react";
import { logChatMessageAsync } from "@/lib/chat-message-logger";
import {
  buildSystemPrompt,
  buildConversationHistory,
  UserData,
} from "@/lib/chat-utils";
import {
  detectFunctionCall,
  executeMLSSearch,
  formatSearchResultsForAI,
} from "@/lib/ai-functions";

export interface UseChatAIProps {
  userId: string;
  messages: any[];
  userLocation: { city?: string; region?: string } | null;
  userData: UserData | null;
  addMessage: (message: any) => void;
  setSearchResults: (results: any[]) => void;
  conversationId: string;
  hasTrackedFirstMessage: boolean;
  setHasTrackedFirstMessage: (tracked: boolean) => void;
  addToConversationHistory: (message: string, id: string) => void;
  updateConversationMessageCount: (id: string) => void;
}

export interface UseChatAIReturn {
  isStreaming: boolean;
  streamingMessage: string;
  error: string;
  retryCount: number;
  handleSend: (userMessage: string) => Promise<void>;
}

const MAX_RETRIES = 2;
const context = "general";

export function useChatAI({
  userId,
  messages,
  userLocation,
  userData,
  addMessage,
  setSearchResults,
  conversationId,
  hasTrackedFirstMessage,
  setHasTrackedFirstMessage,
  addToConversationHistory,
  updateConversationMessageCount,
}: UseChatAIProps): UseChatAIReturn {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [useAPIFallback] = useState(true); // Always use Groq API

  // Get AI response from Groq API
  const getAIResponse = async (
    llmMessages: any[],
    attemptNumber: number = 0
  ): Promise<string> => {
    if (useAPIFallback) {
      try {
        const response = await fetch("/api/chat/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: llmMessages,
            userId,
            userTier: "free",
          }),
        });

        if (!response.ok) {
          throw new Error(`API request failed: ${response.statusText}`);
        }

        const data = await response.json();
        return data.response;
      } catch (error) {
        console.error("Groq API failed:", error);
        throw error;
      }
    }
    return "";
  };

  // Handle disambiguation response
  const handleDisambiguation = async (
    userMessage: string,
    lastMessage: any
  ): Promise<boolean> => {
    const options = (lastMessage as any).disambiguationOptions;
    if (!options) return false;

    // Try to match user's response to one of the options
    let selectedOption = null;

    // Check if user typed a number (e.g., "1", "2")
    const numberMatch = userMessage.match(/^\d+$/);
    if (numberMatch) {
      const index = parseInt(numberMatch[0]) - 1;
      if (index >= 0 && index < options.length) {
        selectedOption = options[index];
      }
    }

    // Check if user typed a name or part of a name
    if (!selectedOption) {
      const userLower = userMessage.toLowerCase();
      selectedOption = options.find(
        (opt: any) =>
          opt.name.toLowerCase().includes(userLower) ||
          opt.city.toLowerCase().includes(userLower) ||
          opt.displayName.toLowerCase().includes(userLower)
      );
    }

    if (selectedOption) {
      addMessage({
        role: "user",
        content: userMessage,
        context: "general",
      });

      setStreamingMessage("Searching properties...");

      try {
        const matchResponse = await fetch("/api/chat/match-location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: selectedOption.name,
            specificChoice: selectedOption,
          }),
        });

        if (!matchResponse.ok) {
          throw new Error(`Location match API failed: ${matchResponse.status}`);
        }

        const matchResult = await matchResponse.json();
        setStreamingMessage("");

        if (matchResult.success && matchResult.searchParams) {
          const searchResponse = await executeMLSSearch(matchResult.searchParams);

          if (searchResponse.success && searchResponse.listings.length > 0) {
            const actualCount = searchResponse.listings.length;
            const messageContent = `Found ${actualCount} ${
              actualCount === 1 ? "property" : "properties"
            } in ${selectedOption.displayName}`;

            addMessage({
              role: "assistant",
              content: messageContent,
              context: "general",
              listings: searchResponse.listings,
              searchFilters: matchResult.searchParams,
            });

            setSearchResults(searchResponse.listings);

            const resultsContext = formatSearchResultsForAI(searchResponse.listings);
            addMessage({
              role: "system",
              content: `[Search Results] ${resultsContext}`,
              context: "general",
            });
          } else {
            addMessage({
              role: "assistant",
              content: `I couldn't find any properties in ${selectedOption.displayName}.`,
              context: "general",
            });
          }
        }
      } catch (error) {
        console.error("Disambiguation search error:", error);
        setStreamingMessage("");
        addMessage({
          role: "assistant",
          content: "I encountered an error while searching. Please try again.",
          context: "general",
        });
      } finally {
        setIsStreaming(false);
      }

      return true; // Handled disambiguation
    }

    return false; // Not a disambiguation response
  };

  // Handle function call (matchLocation)
  const handleFunctionCall = async (
    functionCall: any,
    userMessage: string
  ): Promise<void> => {
    // Track conversation history
    if (!hasTrackedFirstMessage) {
      addToConversationHistory(userMessage, conversationId);
      setHasTrackedFirstMessage(true);
    } else {
      updateConversationMessageCount(conversationId);
    }

    // Log function call
    logChatMessageAsync("system", `Function call detected: matchLocation`, userId, {
      functionCall: functionCall.params,
      timestamp: new Date().toISOString(),
    });

    // Add user message
    addMessage({
      role: "user",
      content: userMessage,
      context: "general",
    });

    // Show loading
    setStreamingMessage("Finding location match...");

    try {
      const matchResponse = await fetch("/api/chat/match-location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(functionCall.params),
      });

      if (!matchResponse.ok) {
        throw new Error(`Location match API failed: ${matchResponse.status}`);
      }

      const matchResult = await matchResponse.json();
      setStreamingMessage("");

      // Log match results
      logChatMessageAsync(
        "system",
        `Location match completed: ${matchResult.match?.type}`,
        userId,
        {
          matchResults: matchResult,
          timestamp: new Date().toISOString(),
        }
      );

      // Handle disambiguation
      if (matchResult.needsDisambiguation && matchResult.options) {
        let disambiguationMessage =
          matchResult.message ||
          "I found multiple communities with that name. Which one did you mean?\n\n";

        matchResult.options.forEach((option: any, index: number) => {
          disambiguationMessage += `\n${index + 1}. **${option.displayName}**`;
        });

        disambiguationMessage +=
          "\n\nPlease type the number or name to specify which community you're interested in.";

        addMessage({
          role: "assistant",
          content: disambiguationMessage,
          context: "general",
          disambiguationOptions: matchResult.options,
        });

        return;
      }

      // Execute search if match found
      if (matchResult.success && matchResult.searchParams) {
        const locationName = matchResult.match.name;
        const locationType = matchResult.match.type;
        const isSubdivision = locationType === "subdivision";
        const isCounty = locationType === "county";
        const limitApplied = matchResult.limitApplied || false;

        setStreamingMessage("Searching properties...");

        const searchResponse = await executeMLSSearch(matchResult.searchParams);
        setStreamingMessage("");

        if (searchResponse.success && searchResponse.listings.length > 0) {
          const actualCount = searchResponse.listings.length;
          let messageContent = `Found ${actualCount} ${
            actualCount === 1 ? "property" : "properties"
          } in ${locationName}`;

          if (isSubdivision) {
            messageContent += " (subdivision)";
          } else if (isCounty) {
            messageContent += " (county";
            if (limitApplied) {
              messageContent +=
                " - showing first 100).\n\nClick **Map View** to explore all available listings";
            } else {
              messageContent += ")";
            }
          } else if (locationType === "city") {
            messageContent += " (city)";
          }

          addMessage({
            role: "assistant",
            content: messageContent,
            context: "general",
            listings: searchResponse.listings,
            searchFilters: matchResult.searchParams,
          });

          setSearchResults(searchResponse.listings);

          const resultsContext = formatSearchResultsForAI(searchResponse.listings);
          addMessage({
            role: "system",
            content: `[Search Results] ${resultsContext}`,
            context: "general",
          });
        } else if (isSubdivision && searchResponse.listings.length === 0) {
          const cityName =
            matchResult.match.city || matchResult.searchParams.cities?.[0];

          if (cityName) {
            addMessage({
              role: "assistant",
              content: `I couldn't find any properties currently listed in ${locationName} (subdivision). Would you like to see properties in ${cityName} (city) instead?`,
              context: "general",
            });
          } else {
            addMessage({
              role: "assistant",
              content: `I couldn't find any properties in ${locationName}. Would you like to try a different location or adjust your search criteria?`,
              context: "general",
            });
          }
        } else {
          addMessage({
            role: "assistant",
            content: `I couldn't find any properties in ${locationName}. Would you like to try a different location or adjust your search criteria?`,
            context: "general",
          });
        }
      } else {
        let noMatchMessage =
          matchResult.message ||
          "I couldn't find that location. Could you provide more details or try a different area?";

        if (matchResult.suggestions && matchResult.suggestions.length > 0) {
          noMatchMessage += "\n\nDid you mean one of these?\n";
          matchResult.suggestions.forEach((suggestion: string, index: number) => {
            noMatchMessage += `\n${index + 1}. ${suggestion}`;
          });
        }

        addMessage({
          role: "assistant",
          content: noMatchMessage,
          context: "general",
        });
      }
    } catch (error) {
      console.error("Function call error:", error);
      setStreamingMessage("");
      addMessage({
        role: "assistant",
        content: "I encountered an error while processing your request. Please try again.",
        context: "general",
      });
    }
  };

  // Main send handler
  const handleSend = async (userMessage: string): Promise<void> => {
    if (!userMessage.trim() || isStreaming || !userId) return;

    setError("");
    setIsStreaming(true);
    const startTime = Date.now();

    // Log user message
    logChatMessageAsync("user", userMessage, userId, {
      timestamp: new Date().toISOString(),
    });

    // Check for disambiguation
    const lastMessage = messages[messages.length - 1];
    if (
      lastMessage &&
      lastMessage.role === "assistant" &&
      (lastMessage as any).disambiguationOptions
    ) {
      const handled = await handleDisambiguation(userMessage, lastMessage);
      if (handled) return;
    }

    // Try to get AI response with retries
    let currentAttempt = 0;
    let fullResponse = "";

    while (currentAttempt <= MAX_RETRIES) {
      try {
        const conversationMessages = messages.filter(
          (msg) => (!msg.context || msg.context === context) && msg.role !== "system"
        );
        const history = buildConversationHistory(
          conversationMessages.map((m) => ({
            role: m.role,
            content: m.content,
          }))
        );

        history.push({ role: "user", content: userMessage });

        const systemPrompt = buildSystemPrompt("general", null, userLocation, userData);

        const enhancedSystemPrompt = `${systemPrompt}

DEPRECATED FUNCTION CALLING (use /api/chat/stream instead):
- This widget uses the old searchListings function which has been removed
- You can respond naturally to property search questions
- DON'T echo conversation history ("User: ...", "You: ...")
- Keep responses conversational and helpful`;

        const llmMessages = [
          { role: "system", content: enhancedSystemPrompt },
          ...history,
        ];

        fullResponse = await getAIResponse(llmMessages, currentAttempt);
        setStreamingMessage("");

        // Log AI response
        logChatMessageAsync("assistant", fullResponse, userId, {
          loadingTime: Date.now() - startTime,
          attemptNumber: currentAttempt,
          timestamp: new Date().toISOString(),
        });

        setRetryCount(0);
        break;
      } catch (err: any) {
        currentAttempt++;
        console.error(`Chat error (attempt ${currentAttempt}/${MAX_RETRIES + 1}):`, err);

        setStreamingMessage("");

        if (currentAttempt > MAX_RETRIES) {
          throw err;
        }

        const waitTime = Math.min(1000 * Math.pow(2, currentAttempt - 1), 5000);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }

    // Check for function calls
    try {
      const functionCall = detectFunctionCall(fullResponse);

      if (functionCall && functionCall.type === "matchLocation") {
        await handleFunctionCall(functionCall, userMessage);
      } else {
        // No function call - just add messages
        if (!hasTrackedFirstMessage) {
          addToConversationHistory(userMessage, conversationId);
          setHasTrackedFirstMessage(true);
        } else {
          updateConversationMessageCount(conversationId);
        }

        addMessage({
          role: "user",
          content: userMessage,
          context: "general",
        });

        addMessage({
          role: "assistant",
          content: fullResponse,
          context: "general",
        });
      }
    } catch (err: any) {
      console.error("Error processing AI response:", err);
      setError(err.message || "Failed to send message");

      addMessage({
        role: "assistant",
        content: "I encountered an error. Please try again.",
        context: "general",
      });
    } finally {
      setIsStreaming(false);
    }
  };

  return {
    isStreaming,
    streamingMessage,
    error,
    retryCount,
    handleSend,
  };
}
