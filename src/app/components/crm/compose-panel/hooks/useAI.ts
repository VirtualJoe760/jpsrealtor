// useAI hook - Manages AI email generation

import { useState, useCallback } from 'react';
import { COMPOSE_API_ENDPOINTS, AI_PROMPT_SUGGESTIONS } from '../constants';

export function useAI() {
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [lastGeneratedContent, setLastGeneratedContent] = useState<string | null>(null);

  // Get prompt suggestions
  const suggestions = AI_PROMPT_SUGGESTIONS;

  // Open AI modal
  const openAIModal = useCallback(() => {
    setShowAIModal(true);
    setGenerationError(null);
  }, []);

  // Close AI modal
  const closeAIModal = useCallback(() => {
    setShowAIModal(false);
    setAiPrompt('');
    setGenerationError(null);
  }, []);

  // Update prompt
  const updatePrompt = useCallback((prompt: string) => {
    setAiPrompt(prompt);
    setGenerationError(null);
  }, []);

  // Use a suggestion
  const useSuggestion = useCallback((suggestion: string) => {
    setAiPrompt(suggestion);
  }, []);

  // Generate email content with AI
  const generateEmail = useCallback(async (
    onGenerated: (content: string) => void
  ): Promise<boolean> => {
    if (!aiPrompt.trim()) {
      setGenerationError('Please enter a prompt');
      return false;
    }

    setIsGenerating(true);
    setGenerationError(null);

    try {
      const response = await fetch(COMPOSE_API_ENDPOINTS.generateAI, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: aiPrompt }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate email');
      }

      if (data.content) {
        setLastGeneratedContent(data.content);
        onGenerated(data.content);
        closeAIModal();
        return true;
      } else {
        throw new Error('No content received from AI');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate email';
      setGenerationError(errorMessage);
      return false;
    } finally {
      setIsGenerating(false);
    }
  }, [aiPrompt, closeAIModal]);

  // Regenerate using last prompt
  const regenerate = useCallback(async (
    onGenerated: (content: string) => void
  ): Promise<boolean> => {
    return generateEmail(onGenerated);
  }, [generateEmail]);

  // Clear error
  const clearError = useCallback(() => {
    setGenerationError(null);
  }, []);

  return {
    showAIModal,
    aiPrompt,
    isGenerating,
    generationError,
    lastGeneratedContent,
    suggestions,
    openAIModal,
    closeAIModal,
    updatePrompt,
    useSuggestion,
    generateEmail,
    regenerate,
    clearError,
  };
}
