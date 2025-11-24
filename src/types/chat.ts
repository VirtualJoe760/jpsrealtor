/**
 * Chat type definitions
 * Extracted from IntegratedChatWidget.tsx
 */
import type { Listing } from "@/app/components/chat/ListingCarousel";
import type { CMAReport } from "./cma";

export interface DisplayMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  isLoading?: boolean;
  listings?: Listing[];
  cmaReport?: CMAReport;
  disambiguationOptions?: any[];
  locationMetadata?: {
    type: string;
    name: string;
    city?: string;
    slug?: string;
    cityId?: string;
  };
  searchFilters?: any;
}

export interface ChatMetadata {
  functionCalls?: any[];
  processingTime?: number;
  model?: string;
}
