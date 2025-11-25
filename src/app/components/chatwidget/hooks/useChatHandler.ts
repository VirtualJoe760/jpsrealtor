import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import type { Listing } from "@/app/components/chat/ListingCarousel";
import {
  buildSystemPrompt,
  buildConversationHistory,
  extractGoalsFromText,
  type UserData,
} from "@/lib/chat-utils";
import {
  detectFunctionCall,
  executeMLSSearch,
  formatSearchResultsForAI,
} from "@/lib/ai-functions";
import {
  addToConversationHistory,
  updateConversationMessageCount,
} from "../EnhancedSidebar";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  context?: "homepage" | "listing" | "dashboard" | "general";
  listings?: Listing[];
  searchFilters?: any;
  disambiguationOptions?: any;
  cmaData?: any;
}

interface UseChatHandlerProps {
  messages: any[];
  addMessage: (message: Message) => void;
  userId: string;
  userLocation: { city?: string; region?: string } | null;
  userData: UserData | null;
  conversationId: string;
  hasTrackedFirstMessage: boolean;
  setHasTrackedFirstMessage: (tracked: boolean) => void;
  setSearchResults: (results: Listing[]) => void;
}

export function useChatHandler({
  messages,
  addMessage,
  userId,
  userLocation,
  userData,
  conversationId,
  hasTrackedFirstMessage,
  setHasTrackedFirstMessage,
  setSearchResults,
}: UseChatHandlerProps) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [error, setError] = useState("");

  const getAIResponse = async (llmMessages: any[]): Promise<string> => {
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
  };

  const handleSend = useCallback(
    async (userMessage: string) => {
      if (!userMessage.trim() || isStreaming || !userId) return;

      setError("");
      setIsStreaming(true);

      try {
        // Check for disambiguation response
        const lastMessage = messages[messages.length - 1];
        if (lastMessage?.role === "assistant" && (lastMessage as any).disambiguationOptions) {
          await handleDisambiguation(userMessage, (lastMessage as any).disambiguationOptions);
          return;
        }

        // Build conversation history
        const conversationMessages = messages.filter(
          (msg) => msg.role !== "system"
        );
        const history = buildConversationHistory(
          conversationMessages.map((m) => ({
            role: m.role,
            content: m.content,
          }))
        );

        history.push({ role: "user", content: userMessage });

        // Build system prompt
        const systemPrompt = buildSystemPrompt(
          "general",
          null,
          userLocation,
          userData
        );

        const llmMessages = [
          { role: "system", content: systemPrompt },
          ...history,
        ];

        // Get AI response
        const fullResponse = await getAIResponse(llmMessages);
        setStreamingMessage("");

        // Add user message
        addMessage({ role: "user", content: userMessage, context: "general" });

        // Add AI response - it already contains [LISTING_CAROUSEL] and [MAP_VIEW] markers
        addMessage({ role: "assistant", content: fullResponse, context: "general" });

        // Track conversation
        if (!hasTrackedFirstMessage) {
          addToConversationHistory(userMessage, conversationId);
          setHasTrackedFirstMessage(true);
        } else {
          updateConversationMessageCount(conversationId);
        }

        // Extract and save goals
        const goals = extractGoalsFromText(userMessage);
        if (Object.keys(goals).length > 0) {
          fetch("/api/chat/goals", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, goals }),
          }).catch(console.error);
        }
      } catch (err: any) {
        console.error("Chat error:", err);
        setError(err.message || "Something went wrong. Please try again.");
      } finally {
        setIsStreaming(false);
        setStreamingMessage("");
      }
    },
    [isStreaming, userId, messages, userLocation, userData, conversationId, hasTrackedFirstMessage]
  );

  const handleDisambiguation = async (userMessage: string, options: any[]) => {
    // Match user's choice
    let selectedOption = null;
    const numberMatch = userMessage.match(/^\d+$/);
    if (numberMatch) {
      const index = parseInt(numberMatch[0]) - 1;
      if (index >= 0 && index < options.length) {
        selectedOption = options[index];
      }
    }

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
      addMessage({ role: "user", content: userMessage, context: "general" });
      setStreamingMessage("Searching properties...");

      const matchResponse = await fetch("/api/chat/match-location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: selectedOption.name,
          specificChoice: selectedOption,
        }),
      });

      const matchResult = await matchResponse.json();
      setStreamingMessage("");

      if (matchResult.success && matchResult.searchParams) {
        const searchResponse = await executeMLSSearch(matchResult.searchParams);

        if (searchResponse.success && searchResponse.listings.length > 0) {
          addMessage({
            role: "assistant",
            content: `Found ${searchResponse.listings.length} ${searchResponse.listings.length === 1 ? "property" : "properties"} in ${selectedOption.displayName}`,
            context: "general",
            listings: searchResponse.listings,
            searchFilters: matchResult.searchParams,
          });
          setSearchResults(searchResponse.listings);
        }
      }
    }
  };

  const handleMatchLocation = async (userMessage: string, params: any) => {
    if (!hasTrackedFirstMessage) {
      addToConversationHistory(userMessage, conversationId);
      setHasTrackedFirstMessage(true);
    } else {
      updateConversationMessageCount(conversationId);
    }

    addMessage({ role: "user", content: userMessage, context: "general" });
    setStreamingMessage("Finding location match...");

    const matchResponse = await fetch("/api/chat/match-location", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    const matchResult = await matchResponse.json();
    setStreamingMessage("");

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

    if (matchResult.success && matchResult.searchParams) {
      setStreamingMessage("Searching properties...");
      const searchResponse = await executeMLSSearch(matchResult.searchParams);
      setStreamingMessage("");

      if (searchResponse.success && searchResponse.listings.length > 0) {
        const locationName = matchResult.match.name;
        addMessage({
          role: "assistant",
          content: `Found ${searchResponse.listings.length} ${searchResponse.listings.length === 1 ? "property" : "properties"} in ${locationName}`,
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
      }
    }
  };

  const handleSearch = async (userMessage: string, params: any) => {
    if (!hasTrackedFirstMessage) {
      addToConversationHistory(userMessage, conversationId);
      setHasTrackedFirstMessage(true);
    } else {
      updateConversationMessageCount(conversationId);
    }

    addMessage({ role: "user", content: userMessage, context: "general" });
    setStreamingMessage("Searching properties...");

    const searchResponse = await executeMLSSearch(params);
    setStreamingMessage("");

    if (searchResponse.success && searchResponse.listings.length > 0) {
      addMessage({
        role: "assistant",
        content: `Found ${searchResponse.listings.length} ${searchResponse.listings.length === 1 ? "property" : "properties"} matching your criteria.`,
        context: "general",
        listings: searchResponse.listings,
        searchFilters: params,
      });
      setSearchResults(searchResponse.listings);

      const resultsContext = formatSearchResultsForAI(searchResponse.listings);
      addMessage({
        role: "system",
        content: `[Search Results] ${resultsContext}`,
        context: "general",
      });
    }
  };

  const handleResearch = async (userMessage: string, params: any) => {
    if (!hasTrackedFirstMessage) {
      addToConversationHistory(userMessage, conversationId);
      setHasTrackedFirstMessage(true);
    } else {
      updateConversationMessageCount(conversationId);
    }

    addMessage({ role: "user", content: userMessage, context: "general" });
    setStreamingMessage("Researching community facts...");

    const researchResponse = await fetch("/api/chat/research-community", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "answer", ...params }),
    });

    const result = await researchResponse.json();
    setStreamingMessage("");

    if (result.success) {
      let responseContent = result.answer;
      if (result.recorded) {
        responseContent += "\n\n✅ *Fact recorded to database for future reference*";
      }
      addMessage({ role: "assistant", content: responseContent, context: "general" });
    }
  };

  return {
    handleSend,
    isStreaming,
    streamingMessage,
    error,
  };
}
