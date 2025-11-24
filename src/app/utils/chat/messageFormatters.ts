/**
 * Message formatting utilities
 * Extracted from IntegratedChatWidget.tsx
 */

// System prompt leakage patterns to remove
const INSTRUCTION_MARKERS = [
  "Function call:",
  "For searching in",
  "For market trends",
  "Remember to:",
  "Supported property types",
  "When suggesting",
  "If unsure about",
  "Example response",
  "FUNCTION CALLING:",
  "Available parameters:",
  "CRITICAL:",
];

export function cleanSystemPromptLeakage(response: string): string {
  let cleanResponse = response;

  for (const marker of INSTRUCTION_MARKERS) {
    const markerIndex = cleanResponse.indexOf(marker);
    if (markerIndex !== -1) {
      cleanResponse = cleanResponse.substring(0, markerIndex).trim();
      break;
    }
  }

  return cleanResponse;
}

export function buildDisambiguationMessage(
  options: any[],
  baseMessage?: string
): string {
  let disambiguationMessage =
    baseMessage ||
    "I found multiple communities with that name. Which one did you mean?\n\n";

  options.forEach((option: any, index: number) => {
    disambiguationMessage += `\n${index + 1}. **${option.displayName}**`;
  });

  disambiguationMessage +=
    "\n\nPlease type the number or name to specify which community you're interested in.";

  return disambiguationMessage;
}
