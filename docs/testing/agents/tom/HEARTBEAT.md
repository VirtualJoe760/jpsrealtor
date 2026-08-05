<!-- Heartbeat template; comments-only content prevents scheduled heartbeat API calls. -->

# Deliberately empty.

# Tom's polling runs as an `openclaw cron` job (every 15 min, isolated) — the
# same pattern every sibling in this fleet uses. See TOOLS.md → "My schedule"
# and `openclaw cron list`.
#
# Do NOT add a task here. Two schedulers polling the same endpoint would
# double-dispatch: both firings could see the dispatch condition hold and each
# start a test session, and only one report can be open at a time. The second
# would take a 409 and its whole session would be wasted.
