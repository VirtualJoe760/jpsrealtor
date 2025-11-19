// src/lib/webllm.ts
// WebLLM initialization and management for client-side AI

import { CreateMLCEngine, MLCEngine, InitProgressReport } from "@mlc-ai/web-llm";

// Singleton instance
let engineInstance: MLCEngine | null = null;
let isInitializing = false;
let initializationPromise: Promise<MLCEngine> | null = null;

// Progress callbacks for UI updates
type ProgressCallback = (report: InitProgressReport) => void;
const progressCallbacks: Set<ProgressCallback> = new Set();

/**
 * Initialize WebLLM engine with the specified model
 * Uses Phi-3-mini by default (lightweight, ~1.9GB)
 */
export async function initializeWebLLM(
  modelId: string = "Phi-3-mini-4k-instruct-q4f16_1-MLC",
  onProgress?: ProgressCallback
): Promise<MLCEngine> {
  // Return existing instance if already initialized
  if (engineInstance) {
    return engineInstance;
  }

  // Wait for ongoing initialization
  if (isInitializing && initializationPromise) {
    return initializationPromise;
  }

  // Check browser compatibility
  if (typeof window === 'undefined') {
    throw new Error("WebLLM can only run in browser environment");
  }

  // Check for required browser APIs
  if (!('caches' in window)) {
    console.warn("⚠️ Cache API not available - WebLLM may not work properly");
  }

  if (!('gpu' in navigator)) {
    throw new Error("WebGPU is not supported in this browser. Please use Chrome, Edge, or a WebGPU-compatible browser.");
  }

  // Add progress callback if provided
  if (onProgress) {
    progressCallbacks.add(onProgress);
  }

  // Start initialization
  isInitializing = true;
  initializationPromise = (async () => {
    try {
      console.log(`🤖 Initializing WebLLM with model: ${modelId}`);

      const engine = await CreateMLCEngine(modelId, {
        initProgressCallback: (report: InitProgressReport) => {
          console.log(`WebLLM Progress: ${report.text} (${report.progress}%)`);
          // Notify all subscribers
          progressCallbacks.forEach((callback) => callback(report));
        },
      });

      engineInstance = engine;
      console.log("✅ WebLLM engine initialized successfully");
      return engine;
    } catch (error) {
      console.error("❌ Failed to initialize WebLLM:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to initialize AI engine: ${errorMessage}. Please ensure you're using a WebGPU-compatible browser and refresh the page.`);
    } finally {
      isInitializing = false;
      progressCallbacks.clear();
    }
  })();

  return initializationPromise;
}

/**
 * Get the WebLLM engine instance (initialize if needed)
 */
export async function getWebLLM(onProgress?: ProgressCallback): Promise<MLCEngine> {
  return initializeWebLLM(undefined, onProgress);
}

/**
 * Check if WebLLM is initialized
 */
export function isWebLLMReady(): boolean {
  return engineInstance !== null;
}

/**
 * Reset the WebLLM engine (useful for model switching or troubleshooting)
 */
export async function resetWebLLM(): Promise<void> {
  if (engineInstance) {
    try {
      // WebLLM doesn't have a built-in destroy method, so we just null it
      engineInstance = null;
      initializationPromise = null;
      console.log("🔄 WebLLM engine reset");
    } catch (error) {
      console.error("Error resetting WebLLM:", error);
    }
  }
}

/**
 * Generate a chat completion using WebLLM
 */
export async function generateChatCompletion(
  messages: Array<{ role: string; content: string }>,
  options?: {
    temperature?: number;
    maxTokens?: number;
    onProgress?: ProgressCallback;
  }
): Promise<string> {
  const engine = await getWebLLM(options?.onProgress);

  try {
    const completion = await engine.chat.completions.create({
      messages: messages as any,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 500,
    });

    return completion.choices[0]?.message?.content || "";
  } catch (error) {
    console.error("Error generating chat completion:", error);
    throw new Error("Failed to generate AI response. Please try again.");
  }
}

/**
 * Generate a streaming chat completion
 */
export async function* streamChatCompletion(
  messages: Array<{ role: string; content: string }>,
  options?: {
    temperature?: number;
    maxTokens?: number;
    onProgress?: ProgressCallback;
  }
): AsyncGenerator<string, void, unknown> {
  const engine = await getWebLLM(options?.onProgress);

  try {
    const stream = await engine.chat.completions.create({
      messages: messages as any,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 500,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  } catch (error) {
    console.error("Error streaming chat completion:", error);
    throw new Error("Failed to stream AI response. Please try again.");
  }
}
