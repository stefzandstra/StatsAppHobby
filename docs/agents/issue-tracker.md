# Issue tracker: GitHub

Issues and PRDs live in stefzandstra/StatsAppHobby on GitHub.
Use the gh CLI with --repo stefzandstra/StatsAppHobby.

## Conventions

- Create: gh issue create --title "..." --body-file <file>
- Read: gh issue view <number> --comments
- List: gh issue list --state open --json number,title,body,labels
- Comment: gh issue comment <number> --body-file <file>
- Add/remove labels: gh issue edit <number> --add-label "..."
  or --remove-label "..."
- Close: gh issue close <number> --comment "..."

Include --repo stefzandstra/StatsAppHobby in each command.
Use a temporary text file for multiline bodies.

## Pull requests as a triage surface

PRs as a request surface: no.
Triage issues only; do not include external pull requests.

## Skill terminology

"Publish to the issue tracker" means create a GitHub issue.
"Fetch the relevant ticket" means read the issue and its comments.
