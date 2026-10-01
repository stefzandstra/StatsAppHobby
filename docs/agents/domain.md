# Domain docs

## Layout

This is a single-context repository:
- CONTEXT.md at the repository root holds domain terminology.
- docs/adr/ holds architectural decision records.

## Before exploring

Read CONTEXT.md and any ADRs relevant to the work.

If these files do not exist, proceed silently. Do not suggest
creating them upfront. The domain-modeling skill creates them
as terminology and decisions are resolved.

## Use the glossary's vocabulary

Use the terms defined in CONTEXT.md in issues, proposals,
hypotheses, and tests. Avoid synonyms the glossary excludes.

If a concept is missing, reconsider the term or note the gap
for domain-modeling.

## Flag ADR conflicts

Explicitly identify any proposal that contradicts an existing
ADR and explain why the decision should be reconsidered.
