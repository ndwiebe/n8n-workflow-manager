# AGENTS.md

## Claude-Primary Workflow

Claude Code is Nathan's primary coding agent for this repository. This file exists so Codex can orient itself without maintaining a second, drifting rulebook.

## Source of Truth

- Read `CLAUDE.md` first and follow it for project context, branch workflow, commands, constraints, and current state.
- Treat `CLAUDE.md` as authoritative unless Nathan gives newer instructions in the current thread.
- Do not duplicate long-lived project rules here. When durable repo guidance changes, update `CLAUDE.md` first.
- Use Codex as a second-pass reviewer, verifier, focused implementer, or parallel worker in its own branch/worktree.
- If this file conflicts with `CLAUDE.md`, follow `CLAUDE.md` and flag the conflict.

## Side-by-Side Safety

- Do not edit the same checkout concurrently with Claude Code unless Nathan explicitly coordinates that work.
- Prefer separate branches or worktrees for parallel Codex and Claude Code tasks.
- Preserve local `.env` files and other ignored secrets. Never commit credentials.
