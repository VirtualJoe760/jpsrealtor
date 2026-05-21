# Operating rules for Claude Code in jpsrealtor (ChatRealty platform)

1. **Full Windows absolute paths for every file op.**
   Form: `F:\web-clients\joseph-sardella\jpsrealtor\...`. There's a Claude Code bug with relative paths on Windows.

2. **Before any non-trivial task — read `docs/ARCHITECTURE.md`**, then the relevant area's README under `docs/{area}/`. State back what you understand before writing code.

3. **After completing the task — update the docs you read** in the same commit. Bump `last_verified` to today. If no doc existed for the area you touched, create one per `docs/CLAUDE.md`.

4. **Doc drift is a bug.** If a doc contradicts code, the doc is wrong. Fix it in the same session.
