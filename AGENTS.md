<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project architecture

- Daily Brief cards only render `SportsHighlight` output from `HighlightEngine` (src/lib/highlights); thresholds live in rules.ts and per-sport logic in sports.ts adapters, so new sports and live data plug in without UI changes.
- Live Daily Brief input is built server-side in src/lib/daily-brief.server.ts (ESPN latest slate + box scores + season averages, 10-min cache); the mock input stays only as fallback when ESPN fails.

## Agent skills

### Issue tracker
Issues and PRDs live in GitHub Issues for stefzandstra/StatsAppHobby.
External PRs are not a triage surface.
See `docs/agents/issue-tracker.md`.

### Triage labels
Use the five default triage labels.
See `docs/agents/triage-labels.md`.

### Domain docs
Single-context: root `CONTEXT.md` and `docs/adr/`.
See `docs/agents/domain.md`.
