# Groq API Context Guide
**Created**: December 17, 2025 10:40 PM
**Purpose**: Reference guide to avoid confusion from outdated training data
**Last Updated**: December 17, 2025

---

## ⚠️ CRITICAL: Training Data vs Current Reality

**My Training Data**: January 2025
**Current Date**: December 2025 and beyond
**Time Gap**: 11+ months

**RULE**: When working with Groq API, ALWAYS fetch current documentation. Never trust training data for API behavior, model capabilities, or best practices.

**Official Docs**: https://console.groq.com/docs/tool-use/overview

---

## Model Selection Guide (December 2025)

### Current Production Models

| Model | Model ID | Tool Support | Parallel Calls | Use Case | Status |
|-------|----------|--------------|----------------|----------|--------|
| **GPT-OSS 120B** | `openai/gpt-oss-120b` | ✅ Excellent | ❌ No | **BEST reasoning & tool use** | **PRIMARY** |
| GPT-OSS 20B | `openai/gpt-oss-20b` | ✅ Good | ❌ No | Lighter reasoning | Production |
| Llama 3.3 70B | `llama-3.3-70b-versatile` | ✅ Good | ✅ Yes | Parallel tool needs | Production |
| Llama 3.1 8B | `llama-3.1-8b-instant` | ✅ Basic | ✅ Yes | Fast/cheap | Legacy |
| Compound | `groq/compound` | Built-in only | N/A | Server-side tools | Production |

### Decision Tree

```
Do you need the BEST reasoning and tool use quality?
├─ YES → Use openai/gpt-oss-120b (ALWAYS)
└─ NO → Ask these questions:
    ├─ Need parallel tool calls? → llama-3.3-70b-versatile
    ├─ Need absolute cheapest? → llama-3.1-8b-instant
    └─ Need server-side tools? → groq/compound
```

### For This Project

**Always use**: `openai/gpt-oss-120b`

**Why**:
1. Best tool selection (understands which tool to use)
2. Best argument generation (creates correct JSON)
3. Best reasoning (understands complex queries)
4. We don't need parallel calls (sequential is fine)

**NEVER downgrade** to llama-3.1-8b unless there's a documented, specific reason.

---

## Tool Definition Requirements

### Valid JSON Schema Structure

```typescript
{
  type: "function",
  function: {
    name: "toolName",  // Function identifier
    description: "Clear description - helps model decide when to use this tool",
    parameters: {
      type: "object",
      properties: {
        paramName: {
          type: "string" | "number" | "boolean" | "array" | "object",
          description: "Parameter description",
          // Optional:
          enum: ["value1", "value2"],  // For fixed choices
        }
      },
      required: ["paramName"]  // Array of required parameter names
    }
  }
}
```

### ❌ INVALID Schema Fields

These fields will confuse the model and cause malformed JSON output:

```typescript
// ❌ WRONG - "default" is NOT part of JSON Schema for function calling
{
  paramName: {
    type: "boolean",
    default: true  // ❌ REMOVE THIS
  }
}

// ✅ CORRECT - Use description to guide the model
{
  paramName: {
    type: "boolean",
    description: "Whether to include stats. Recommended to always use true for comprehensive data."
  }
}
```

**Common Invalid Fields**:
- ❌ `default` - Use description instead to recommend values
- ❌ `examples` - Not standard JSON Schema for function calling
- ❌ `format` - Not widely supported in function calling context

### ✅ VALID Schema Patterns

**String Parameter**:
```typescript
{
  city: {
    type: "string",
    description: "City name (e.g., 'Palm Desert', 'Indian Wells')"
  }
}
```

**Number Parameter**:
```typescript
{
  maxPrice: {
    type: "number",
    description: "Maximum price in dollars"
  }
}
```

**Boolean Parameter**:
```typescript
{
  includeStats: {
    type: "boolean",
    description: "Include market statistics. Recommended to always set true for comprehensive data."
  }
}
```

**Enum Parameter**:
```typescript
{
  sort: {
    type: "string",
    enum: ["price-asc", "price-desc", "newest", "oldest"],
    description: "Sort order for results"
  }
}
```

**Optional Parameter**:
```typescript
{
  parameters: {
    type: "object",
    properties: {
      requiredParam: { type: "string" },
      optionalParam: { type: "number" }
    },
    required: ["requiredParam"]  // optionalParam is optional
  }
}
```

---

## Tool Calling Workflow

### 4-Step Process

```
1. Initial Request
   ├─ User: "Show me homes in Palm Desert"
   ├─ System: buildSystemPrompt()
   └─ API: POST with messages + tools array

2. Model Response
   ├─ Model analyzes query
   ├─ Selects appropriate tool(s)
   └─ Returns: tool_calls: [{
         id: "call_abc123",
         function: {
           name: "queryDatabase",
           arguments: '{"city":"Palm Desert","includeStats":true}'
         }
       }]

3. Tool Execution
   ├─ Parse arguments: JSON.parse(arguments)
   ├─ Execute: await executeQueryDatabase(args)
   ├─ Format result as tool message
   └─ Append to conversation: {
         role: "tool",
         tool_call_id: "call_abc123",
         content: JSON.stringify(result)
       }

4. Final Response
   ├─ Model receives tool results
   ├─ Analyzes data
   ├─ Either:
   │   ├─ Makes more tool calls (back to step 2)
   │   └─ Generates final markdown response
   └─ Stream to user
```

### Sequential vs Parallel Tool Calling

**GPT-OSS Models (120B, 20B)**:
- ✅ Support sequential tool calling (perfect for our use case)
- ❌ Do NOT support parallel tool calling
- ✅ Higher quality reasoning and argument generation
- **Use when**: Quality matters more than parallelism

**Llama Models (3.3-70B, 3.1-8B)**:
- ✅ Support parallel tool calling
- ✅ Can call multiple tools in one response
- ⚠️ Lower quality reasoning than GPT-OSS
- **Use when**: Need to call 3+ tools simultaneously

**For our chat system**: We rarely need parallel calls. Sequential is fine and gives better quality.

---

## Common Mistakes & Solutions

### Mistake 1: Blaming the Model Prematurely

**Symptom**: Malformed JSON like `"includeStats\\\": true\"`

**Wrong Reaction**: "The model is broken, switch to a different one"

**Correct Debugging Process**:
1. ✅ Check tool definitions for invalid JSON Schema
2. ✅ Check for "fake" tools that inject prompts instead of returning data
3. ✅ Verify tool array isn't polluted with misleading tools
4. ✅ Check current Groq documentation for known issues
5. ✅ Test with simplest possible tool definition
6. ❌ ONLY THEN consider if it's a model issue

**Root Cause Usually**:
- Invalid schema fields (`default`, `examples`, etc.)
- Fake tools polluting the tools array
- Malformed tool definitions
- Conflicting tool descriptions

### Mistake 2: Using Outdated Models

**Symptom**: Using `llama-3.1-8b-instant` for production

**Why It's Wrong**:
- It's a legacy model (not even on main models page anymore)
- Lowest quality reasoning
- Designed for speed/cost, not quality
- When we have access to GPT-OSS 120B (the BEST model)

**Fix**: Always use `openai/gpt-oss-120b` unless there's a specific, documented reason to use something else.

### Mistake 3: Creating "Fake" Tools

**Symptom**: Tool that just returns a prompt string instead of data

**Example**:
```typescript
// ❌ WRONG - Fake tool
async function executeGetLocationSnapshot(args: any) {
  return {
    success: true,
    message: `Please provide a real estate snapshot for ${args.name}...`
  };
}
```

**Why It's Wrong**:
- Pollutes tools array with non-tool
- Confuses model's JSON generator
- Misleads AI about capabilities
- Breaks tool calling for OTHER tools

**Fix**: Use prompt-level modes instead
```typescript
// ✅ CORRECT - Prompt-level mode
buildSystemPrompt({
  locationSnapshot: {
    name: "Indian Wells",
    type: "city"
  }
})
```

### Mistake 4: Trusting Training Data for Current API State

**Symptom**: "In my training data, gpt-oss-120b had bugs..."

**Why It's Wrong**:
- Training data is 11+ months old (January 2025)
- Models improve constantly
- APIs change
- Documentation updates frequently

**Fix**: ALWAYS fetch current documentation before making assumptions about model capabilities.

---

## Testing Checklist

### Before Deploying Tool Changes

- [ ] All tool definitions have valid JSON Schema (no `default` fields)
- [ ] No "fake" tools that just inject prompts
- [ ] Using `openai/gpt-oss-120b` for production
- [ ] Tool descriptions are clear and specific
- [ ] Required parameters are marked in `required` array
- [ ] Tested with curl command
- [ ] Verified JSON arguments are properly formed
- [ ] Checked error logs for malformed JSON
- [ ] Tested multi-round tool calling
- [ ] Verified streaming works

### Sample Test Command

```bash
curl -X POST http://localhost:3000/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role":"user","content":"Show me homes in Palm Desert"}],
    "userId": "test",
    "userTier": "premium"
  }'
```

**Expected Behavior**:
1. Tool call: `queryDatabase` with `{"city":"Palm Desert","includeStats":true}`
2. Tool result: Listings data
3. Final response: Markdown with [LISTING_CAROUSEL] component

**Red Flags**:
- Malformed JSON in tool arguments
- Multiple failed parsing attempts
- Model not calling any tools
- Model calling wrong tools
- Timeouts or hangs

---

## Quick Reference

### Model Comparison (December 2025)

| Feature | GPT-OSS 120B | Llama 3.3 70B | Llama 3.1 8B |
|---------|--------------|---------------|--------------|
| Reasoning Quality | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| Tool Selection | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| Argument Quality | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| Speed | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Parallel Calls | ❌ | ✅ | ✅ |
| Built-in Tools | ✅ | ❌ | ❌ |
| **Overall** | **BEST** | Good | Legacy |

### Valid Schema Types

```typescript
type: "string"   // Text values
type: "number"   // Numeric values (int or float)
type: "boolean"  // true/false
type: "array"    // Lists (specify items schema)
type: "object"   // Nested objects (specify properties)
```

### Tool Caching Strategy

```typescript
// Fast-changing data
queryDatabase: 2 minutes

// Slow-changing data
getAppreciation: 10 minutes
getMarketStats: 10 minutes

// Rarely changing
searchArticles: 30 minutes
lookupSubdivision: 60 minutes
```

---

## Documentation Links

**Official Groq Docs**:
- Tool Use Overview: https://console.groq.com/docs/tool-use/overview
- Models Page: https://console.groq.com/docs/models
- API Reference: https://console.groq.com/docs/api-reference

**Always Check**: Before making any assumptions about Groq capabilities, fetch current docs.

---

## Summary: The Golden Rules

1. **Always use `openai/gpt-oss-120b`** - It's the BEST reasoning model
2. **Never trust training data for current API state** - Fetch current docs
3. **No invalid JSON Schema fields** - Especially no `default` field
4. **No fake tools** - Use prompt-level modes instead
5. **Debug YOUR code first** - Before blaming the model
6. **Sequential tool calling is fine** - We don't need parallel calls
7. **Test with curl** - Before deploying to production
8. **Clear descriptions matter** - Helps model select right tools

---

## Change Log

**December 17, 2025**: Initial guide created based on lessons learned from chat tool calling debugging. Key insight: Training data is outdated, always fetch current Groq documentation.
