# Pandora Team Sentry Investigation

## Process

1. Get Sentry issue details using issue ID
2. Identify components from error traces (fragments, user locations, stack traces)
3. Check package ownership in `package.json` files (look for `"team"`, `"slackChannel"`)

## Ownership Decision

- **Pandora owned** → Create PNDR ticket
- **Not Pandora** → After confirmation, reassign in Sentry to correct team

## Tools

```bash
# Get Sentry details
mcp__ops_sherpa__invoke_tool get_sentry_issue_details {"issue_id": "ID", "organization": "atlassian-2y"}
mcp__ops_sherpa__invoke_tool get_sentry_issue_events {"issue_id": "ID", "organization": "atlassian-2y", "limit": 5}

# Find ownership
grep -r "team.*Pandora" **/package.json
grep -r "component-name" **/package.json

# Create ticket (Pandora only)
mcp__atlassian__invoke_tool create_jira_issue
```

## Ticket Template (Pandora issues only)

- Include Sentry link, error patterns, impact, technical details
- Add labels: `sentry-issue`, component-specific
- Priority based on user impact
