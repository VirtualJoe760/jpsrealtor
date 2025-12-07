# Debugging Documentation

**Purpose**: Temporary debugging and troubleshooting documentation

---

## 📋 Guidelines

### What Goes Here
- **Temporary debug logs** and analysis during active troubleshooting
- **Issue investigation notes** (error logs, stack traces, reproduction steps)
- **Performance profiling** results during optimization
- **Quick debugging guides** for specific bugs
- **Test results** and debugging output

### What Doesn't Go Here
- **Permanent documentation** (move to appropriate directory when complete)
- **General architecture docs** (use `/architecture/`)
- **Feature documentation** (use `/features/`)
- **Completed fixes** (consolidate into main docs and delete debug notes)

---

## 🗑️ Cleanup Policy

**Files in this directory should be temporary!**

### When to Delete
- ✅ **After bug is fixed** - Delete debug docs or consolidate into permanent docs
- ✅ **After 2 weeks** - If no longer actively debugging, archive or delete
- ✅ **When creating permanent docs** - Move insights to appropriate directory, delete raw debug notes

### Best Practices
1. **Date stamp all files** - Use format: `YYYY-MM-DD-issue-name.md`
2. **Include issue description** at top of file
3. **Link to related code/PRs** if applicable
4. **Clean up after resolution** - Don't let debug docs accumulate

---

## 📝 Template for Debug Documentation

```markdown
# [Issue Name] - Debugging

**Date**: YYYY-MM-DD
**Status**: 🔍 Investigating | ✅ Resolved | ❌ Blocked
**Related Code**: path/to/file.ts:123

## Problem Description
Brief description of the issue

## Reproduction Steps
1. Step 1
2. Step 2
3. Expected vs Actual behavior

## Investigation Log

### [Timestamp] - Initial Investigation
- Found X in Y
- Tried Z approach
- Result: ...

### [Timestamp] - Discovery
- Key finding: ...
- Evidence: ...

## Solution (if resolved)
- What fixed it
- Why it worked
- Files modified

## Follow-up Actions
- [ ] Update permanent docs
- [ ] Add tests
- [ ] Delete this debug doc
```

---

## 🔍 Current Debugging Sessions

*None active - directory empty*

---

## 📚 Recent Debugging (Archived)

### December 6, 2025
- **Map Server Crash** - Resolved, documented in `/map/MAP_FIXES_COMPLETE.md`
  - Issue: Server crashes at zoom 9 with 600 listings
  - Root cause: Aggressive prefetching (100+ concurrent requests)
  - Solution: Intelligent prefetching with debouncing and concurrency limiting
  - Debug docs deleted, consolidated into permanent documentation

- **React Duplicate Key Error** - Resolved, documented in `/map/UNIFIED_LISTINGS_AUDIT.md`
  - Issue: `Encountered two children with the same key`
  - Root cause: Using `_id` instead of `listingKey` for React keys
  - Solution: Changed to `listingKey` (true business identifier)
  - Debug docs deleted, consolidated into audit documentation

---

## 💡 Tips for Effective Debugging Documentation

1. **Be detailed during investigation** - You'll forget details quickly
2. **Log timestamps** - Track when you discovered things
3. **Include error messages verbatim** - Don't paraphrase stack traces
4. **Screenshot when helpful** - Visual evidence is valuable
5. **Link to commits/PRs** - Makes it easy to reference later
6. **Clean up when done** - Don't let old debug docs accumulate

---

**Remember**: This is a temporary workspace. Move valuable insights to permanent docs and delete old debug files regularly!
