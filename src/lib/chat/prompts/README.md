# Modular Prompt System

This directory contains the modular prompt system for the AI chat assistant. Prompts are split into focused, reusable modules that can be composed based on context.

## Architecture

### Phase 1: Text-Only Mode (Current)
- **Implemented**: Text-only mode for map digests
- **Structure**: Modular composition with focused prompts
- **Benefits**: Smaller prompts, better performance, easier testing

### Future Phases
- **Phase 2**: Extract UI component instructions
- **Phase 3**: Split tool documentation by category
- **Phase 4**: Dynamic tool loading based on query analysis

## Directory Structure

```
/src/lib/chat/prompts/
├── README.md          ← This file
├── index.ts           ← Main entry point, exports buildSystemPrompt()
├── base.ts            ← Core identity, role, communication style
├── sources.ts         ← Citation rules and [SOURCES] formatting
├── text-only.ts       ← Map digest mode (markdown-only responses)
└── (future modules)
    ├── components.ts  ← UI component instructions (Phase 2)
    ├── tools/         ← Tool-specific documentation (Phase 3)
    │   ├── database.ts
    │   ├── analytics.ts
    │   └── articles.ts
    └── formulas.ts    ← Investment calculation formulas (Phase 3)
```

## Usage

### Standard Full-Featured Prompt

```typescript
import { buildSystemPrompt } from '@/lib/chat/prompts';

const prompt = buildSystemPrompt();
// Returns: Complete system prompt with all features (~3000 tokens)
```

### Text-Only Mode (Map Digests)

```typescript
import { buildSystemPrompt } from '@/lib/chat/prompts';

const prompt = buildSystemPrompt({ textOnly: true });
// Returns: Focused prompt for markdown-only responses (~800 tokens)
// Includes: base + text-only + sources
```

### Custom Dates (Testing)

```typescript
import { buildSystemPrompt } from '@/lib/chat/prompts';

const prompt = buildSystemPrompt({
  dates: {
    currentDate: '2025-01-15',
    sevenDaysAgo: '2025-01-08',
  }
});
```

### Direct Module Access

```typescript
import {
  buildBasePrompt,
  buildSourcesPrompt,
  buildTextOnlyPrompt
} from '@/lib/chat/prompts';

// Build custom combination
const customPrompt = buildBasePrompt(dates) + buildTextOnlyPrompt();
```

## Module Reference

### `index.ts` - Main Entry Point

**Exports:**
- `buildSystemPrompt(options)` - Primary composition function
- `PromptOptions` - TypeScript interface for options
- Individual module builders (re-exported for direct access)

**Options:**
```typescript
interface PromptOptions {
  textOnly?: boolean;  // Enable text-only mode
  dates?: {            // Override dates (for testing)
    currentDate?: string;
    currentDateTime?: string;
    sevenDaysAgo?: string;
    thirtyDaysAgo?: string;
  };
}
```

### `base.ts` - Core Identity

**Purpose:** Core AI identity, role, and communication style

**Content:**
- AI role and capabilities
- Current date/time information
- Communication tone and style
- Language guidelines
- Example interactions

**Token Count:** ~400 tokens

**When to use:** Always included in every prompt

### `sources.ts` - Citation Rules

**Purpose:** [SOURCES] block formatting and citation rules

**Content:**
- When to include [SOURCES]
- Format specifications
- Source type rules (web, mls, article, analytics)
- Examples

**Token Count:** ~300 tokens

**When to use:** Always included in every prompt

### `text-only.ts` - Map Digest Mode

**Purpose:** Instructions for markdown-only responses (no UI components)

**Content:**
- Text-only mode explanation
- Response guidelines (2-3 paragraphs, facts, market insights)
- What NOT to include (UI components)
- Example responses

**Token Count:** ~200 tokens

**When to use:** When `textOnly: true` option is set

## Performance Comparison

| Mode | Token Count | Use Case | Components |
|------|-------------|----------|------------|
| **Full** | ~3000 | Standard chat queries | All features |
| **Text-Only** | ~800 | Map digests | base + text-only + sources |
| **Future: Components** | ~2500 | UI-heavy responses | base + components + sources + select tools |
| **Future: Analytics** | ~2000 | Investment analysis | base + analytics + formulas + sources |

## Token Savings

**Example: Map Digest Query**
- Old system: 3000 tokens (full prompt)
- New system: 800 tokens (text-only prompt)
- **Savings: 73% reduction**

**Cost Impact (at 1M map searches/year):**
- Old: 3B tokens = $45/year
- New: 800M tokens = $12/year
- **Savings: $33/year per million queries**

## Testing

### Test Text-Only Mode

```typescript
// Test in API route
const prompt = buildSystemPrompt({ textOnly: true });
console.log('Text-only prompt length:', prompt.length);
console.log('Includes text-only?', prompt.includes('TEXT-ONLY MODE'));
console.log('Excludes components?', !prompt.includes('LISTING_CAROUSEL'));
```

### Validate Module Output

```typescript
import { buildBasePrompt, buildTextOnlyPrompt } from '@/lib/chat/prompts';

const dates = {
  currentDate: '2025-01-01',
  currentDateTime: '2025-01-01T00:00:00Z',
  sevenDaysAgo: '2024-12-25',
  thirtyDaysAgo: '2024-12-02',
};

const base = buildBasePrompt(dates);
assert(base.includes('2025-01-01'));
assert(base.includes('Your Role'));

const textOnly = buildTextOnlyPrompt();
assert(textOnly.includes('TEXT-ONLY MODE'));
assert(textOnly.includes('Palm Springs'));
```

## Migration Guide

### For AI Development

**Old Way:**
```typescript
import { buildEnhancedSystemPrompt } from '@/lib/chat/system-prompt';

const prompt = buildEnhancedSystemPrompt();
```

**New Way:**
```typescript
import { buildSystemPrompt } from '@/lib/chat/prompts';

// Same behavior
const prompt = buildSystemPrompt();

// Or with options
const prompt = buildSystemPrompt({ textOnly: true });
```

### Backward Compatibility

The new system is **100% backward compatible**:
- `buildSystemPrompt()` with no options returns the same full prompt as before
- All existing functionality preserved
- No breaking changes

## Future Roadmap

### Phase 2: Component Module (Planned)

```typescript
// Future: Extract UI component instructions
import { buildComponentsPrompt } from '@/lib/chat/prompts';

const prompt = buildSystemPrompt({ includeComponents: true });
// Includes: base + components + sources + core tools
```

### Phase 3: Tool Categories (Planned)

```typescript
// Future: Load only relevant tools
import { buildSystemPrompt } from '@/lib/chat/prompts';

const prompt = buildSystemPrompt({
  focusTools: ['queryDatabase', 'getAppreciation']
});
// Includes: base + selected tool docs + sources
```

### Phase 4: Query Analysis (Planned)

```typescript
// Future: Automatic tool selection based on query
const prompt = await buildSystemPrompt({
  query: "Show me homes in Palm Desert",
  autoSelectTools: true
});
// Analyzes query, loads only: queryDatabase, matchLocation tools
```

## Best Practices

1. **Use the index.ts export**
   - Always import from `@/lib/chat/prompts` (index)
   - Don't import individual modules directly unless needed

2. **Test both modes**
   - Test standard prompts with `buildSystemPrompt()`
   - Test text-only with `buildSystemPrompt({ textOnly: true })`

3. **Monitor token usage**
   - Log prompt lengths in development
   - Track API costs per mode

4. **Keep modules focused**
   - Each module should have one clear purpose
   - Modules should be independently useful
   - Aim for 200-500 tokens per module

5. **Document changes**
   - Update this README when adding modules
   - Include token counts
   - Explain when to use each module

## Troubleshooting

### Issue: Prompt too large

**Solution:** Use focused mode or split into smaller modules
```typescript
// Instead of full prompt
const prompt = buildSystemPrompt({ textOnly: true });
```

### Issue: Missing functionality

**Solution:** Check which modules are loaded
```typescript
const prompt = buildSystemPrompt({ textOnly: true });
console.log('Includes tools?', prompt.includes('queryDatabase'));
// Should be false in text-only mode
```

### Issue: Inconsistent responses

**Solution:** Ensure same modules loaded
```typescript
// Always use same options for same use case
const mapDigest = buildSystemPrompt({ textOnly: true });
```

## Contributing

When adding new modules:

1. Create file in `/prompts/` directory
2. Export a `build*Prompt()` function
3. Add to `index.ts` composition logic
4. Document in this README
5. Update token counts
6. Add usage examples
7. Test both in isolation and composed

## Questions?

See the main system-prompt.ts file for the legacy monolithic implementation.
All new features should use the modular system in this directory.
