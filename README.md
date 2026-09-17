# Agent harness

A coding agent that is given 110 rules at once follows them worse than one given
the dozen that apply to the file in front of it.

This is the mechanism I use to fix that: a `PreToolUse` hook that fires on every
file an agent reads or edits, works out which module that file belongs to, and
injects **only** the rules governing it. No human decides what to load, and
nothing is loaded twice in the same conversation.

```
agent opens lib/invoice.ts
        │
        ▼
.claude/hooks/module-rules          ← fires automatically, 5s timeout
        │
        ├─ rules-map.json           ← which module owns this path?
        ├─ already injected this session?   (sha256(session_id + module))
        │
        ▼
rules/facturacion.md  ──▶  additionalContext
```

## Why this shape

**Just-in-time, not up-front.** The alternative is one large instruction file
loaded every session. It competes with itself: the rules about invoice rounding
are burning attention while the agent edits CSS. Splitting the file only helps if
something puts the right piece back at the right moment — otherwise you have
traded one oversized prompt for a folder nobody reads.

**Fail open, always.** The hook never blocks and never fails loudly. On any error
it exits 0 with no output. It is a convenience; the guarantee is the table in
`AGENTS.md`, which a human can read. A hook that can stop an agent from working
is a hook you will disable the first time it misfires.

**One injection per module per session.** The marker is
`sha256(f"{session_id}:{slug}")`, written as an empty file in the temp directory.
Without it, opening eight files of the same module re-injects the same rules
eight times — which is the problem this was built to solve, reintroduced.

**A file can belong to more than one module.** `lib/invoice-mail.ts` composes an
email *and* renders a document, so it gets both rule sets, in map order. Whoever
edits it with only half the rules in front of them will write the other half
wrong.

## Measured, not assumed

The way this breaks is silently. A rules file nobody routes to any more does not
error — it just stops arriving, and the decision it protected comes undone months
later with nothing to show for it.

So the routing is tested. `npm test` runs **ten tests** that fail when:

- `AGENTS.md` grows past its byte budget (the cost is context loaded every
  session, so the budget is in bytes, not lines)
- a rules file exists that `AGENTS.md` never names — nobody will read it
- a rules file exists that the map never routes to — it will never arrive
- the map routes to a rules file that does not exist — it injects nothing, quietly
- a glob in the map matches no file on disk — a rename left it dead
- a rules file does not declare which code it governs
- a path a rules file declares no longer exists
- the header of a rules file and the map disagree about what it governs
- the hook has lost its executable bit — Claude Code will not call it

The last one is the cheapest and the one that has saved the most time.

## What gets retired

The point of measuring is being able to remove things. Rules that stopped
changing an outcome come out; generated code that fails review against these
conventions does not get merged because it was generated. A harness that only
ever grows is a harness nobody is reading.

## Blast radius

`.claude/settings.json` denies cloud credentials and secret paths outright:

```json
"permissions": {
  "deny": ["Bash(aws)", "Bash(aws:*)", "Read(~/.aws)", "Read(~/.aws/**)"]
}
```

The access model is declared, not assumed. An agent that *could* read your
credentials and chose not to is an agent you got lucky with.

## Try it

```bash
echo '{"session_id":"demo","hook_event_name":"PreToolUse","tool_input":{"file_path":"lib/invoice.ts"}}' \
  | CLAUDE_PROJECT_DIR=$PWD .claude/hooks/module-rules
```

Run it twice with the same `session_id` — the second time is silent, on purpose.

```bash
npm test   # ten tests, no database, milliseconds
```

## What this repo is, and what it isn't

The hook runs in a private product of mine. **The only change here: the module
map moved from a literal list inside the hook to `rules-map.json`**, so that
publishing the mechanism does not publish that product's file tree. Everything
else — the glob matching, the session marker, the fail-open behaviour, the
comments — is the code that runs.

The rules under `rules/` and the files under `lib/` and `app/` are small
stand-ins written for this repository, so the tests have something real to assert
against. The rules in the private version are longer and are about that product.

The tests are ported: the originals assert against that product's own docs, so
the five of them that check things specific to it (error-reporting token
redaction, public pricing claims) are not here. The ten about routing and the
index are.

Comments and rules are in Spanish, as they are in the original. I did not
translate them for this repository; the reasoning is the artifact, and rewriting
it would make it something else.

## License

MIT
