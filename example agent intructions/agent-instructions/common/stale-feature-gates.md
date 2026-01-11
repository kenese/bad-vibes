<!-- meta:
  topic: stale-feature-gates
  audience: ai-agent
  token_budget: medium
  mode: default
  read_when: tackling stale feature gates at scale (200+ rows), creating/updating Jira tickets, exporting lists, and driving next steps
  depends_on: [./feature-gates-experiments.md, ./clean-up-feature-gates.md]
  last_review: 2025-10-22
-->

# Stale Feature Gates: Scalable Workflow (200+ rows)

> End-to-end, scalable guidance for reviewing stale feature gates (FGs), creating and maintaining
> Jira tickets, exporting tracking lists, and iterating on next steps. Optimized for large datasets
> and token limits.

<Self-Reflection>
- Assume prior engineers were smart; confirm intent before removing code paths.
- Prefer small, reversible, well-documented steps; batch work to reduce overhead.
- Optimize I/O and token usage via chunking and minimal payloads.
</Self-Reflection>

<Where-To-Find-It>
- FG implementation patterns: ./feature-gates-experiments.md
- Cleanup mechanics: ./clean-up-feature-gates.md
- Dev tooling (reference): /jira/dev-tooling/*
</Where-To-Find-It>

<Inputs-And-Definitions>
- Input file: ./ai-cache/stale_feature_gates.csv (AI staging area only)
- Required columns (header names): Team, team_id, maintainer, accountId, featureDeliveryKey, lifecycleState, gate_name, url
- Lifecycle states: Implementing, Dogfooding, Launching, Paused, Tidying, Archived
- Parent Epic: a Jira parent key (PARENT_ISSUE_KEY) to link all created tickets
</Inputs-And-Definitions>

<Token-and-Scale-Strategy>
- Process in chunks to respect token limits and API rate limits (e.g., 50 rows per batch).
- Do not inline full CSV into prompts; load headers once; stream rows in batches.
- Persist progress after each batch (e.g., write batch summaries to .ai-cache/ or an external artifact).
- Keep per-ticket descriptions concise and templated; avoid repeating global context.
- Use minimal fields in cross-referencing (issue key, gate_name, lifecycleState, accountId, maintainer).

<CSV-Validation>
- Access strategy: Do not search the repo. Immediately attempt to open the CSV from the AI staging area using open_files in this exact order:
  1) ./ai-cache/stale_feature_gates.csv
  2) ./.ai-cache/stale_feature_gates.csv (hidden variant used by Jira AI staging area)
  - If both attempts fail, STOP and prompt the operator to run the Dashboard and save the results to the AI staging area as ./ai-cache/stale_feature_gates.csv (or ./.ai-cache/stale_feature_gates.csv).
  - Dashboard: https://socrates-workbench-01.cloud.databricks.com/editor/queries/1543269066784374?contextId=sql-editor&o=4246564776986330
  - Note: The operator must add their team id in the dashboard before exporting.
  - Do not rely on grep, folder expansion, or repo-wide search to discover it.
- Only check these two exact paths in the Jira product root: ./ai-cache/stale_feature_gates.csv and ./.ai-cache/stale_feature_gates.csv
- Working-directory assumption: you are running from the Jira product root.
- Must have: Team, team_id, maintainer, accountId, featureDeliveryKey, lifecycleState, gate_name, url
- Normalization allowed: lifecycleStatus→lifecycleState, gateName→gate_name, maintainerAccountId→accountId (log mappings)

<Summary-Statistics>
Purpose: Give the operator a quick overview before ticket creation.

- Compute counts per lifecycleState (e.g., Implementing: N, Dogfooding: N, Launching: N, Paused: N,
  Tidying: N, Archived: N)
- Identify immediately actionable FGs: lifecycleState == Tidying
- Identify FGs needing coordination with maintainers: lifecycleState in [Implementing, Dogfooding,
  Launching, Paused]
- Identify FGs likely no-op: lifecycleState == Archived (verify residuals only)
- Present as a short summary block, e.g.: """ Summary (from ./ai-cache/stale_feature_gates.csv):
  - Total: <count>
  - Implementing: <count>
  - Dogfooding: <count>
  - Launching: <count>
  - Paused: <count>
  - Tidying (ready to clean up now): <count>
  - Archived: <count>

  Ready to clean up now (Tidying): <comma-separated gate names or first N + link to CSV> Requires
  coordination (Implementing/Dogfooding/Launching/Paused): <counts> """

<Parent-Issue-Requirements>
- Require PARENT_ISSUE_KEY (Epic or equivalent). If missing, prompt operator or create an Epic: "[YYYY-MM-DD] Stale feature gates cleanup".
- Link children via Epic Link/parent field; do not duplicate parent in description.

<Assignee-and-Comments-Policy>
Purpose: ensure the maintainer is clearly identified and notified.

- Notification path: assign the ticket to the maintainer (notification guaranteed by Jira).
  - Preferred assignment identifier: accountId from CSV
  - Fallback: maintainer email (if your Jira instance supports email-based assignment)
- Comment mention style: include plain maintainer email in the comment (not a tag). Example:
  "Maintainer: dxu@atlassian.com". Do not rely on comment tagging for notification.
- Two-comment approach after assignment:
  1. Visibility comment (no tag, includes email): asks to confirm rollout vs cleanup and includes FG
     link + lifecycle
  2. Assignee guidance comment (no tag): concrete next steps checklist (Statsig VC90/TTAI → 100% +
     releases → cleanup)

<Decision-Framework>
- Implementing/Dogfooding/Launching/Paused:
  - Ask maintainer if continuing rollout or cleaning up new path
  - If continuing: validate Statsig VC90/TTAI, roll to 100% + additional releases, then cleanup and archive
- Tidying: Proceed with cleanup PR; archive after rollout
- Archived: No action unless residuals found

<Ticket-Templates>
- Title: [YYYY-MM-DD] clean up: <gate_name>
- Description (general):
  """
  ## Context
  - Team: **<Team>** (id: `<team_id>`)
  - Feature Delivery Key: **<featureDeliveryKey>**
  - FG: [<gate_name>](<url>)
  - Lifecycle: **<lifecycleState>**

## Recommended Actions

- Continue rollout:
  - Check Statsig metrics (esp. VC90/TTAI performance)
  - If healthy → roll out to 100% of users + additional release cycles
  - After successful rollout → clean up the FG and remove the gated branch
- Clean up now:
  - Remove the `<new|old>` path
  - Remove FG checks, tests, and mocks tied to this FG

## Next Steps

- Confirm with maintainer whether to continue rollout or clean up the new code path
- If cleaning up: follow FG cleanup guide (tests, SSR, analytics, stories) and archive post-rollout
  """
- Description (tidying): """

  ## Goal

  Clean up feature gate **<gate_name>** (status: Tidying)

  ## Decision Required
  - Which path to remove? `NEW` or `OLD`

  ## Tasks
  - [ ] Remove selected path and FG guards (fg/experiment checks)
  - [ ] Update tests and mocks
  - [ ] Remove story toggles and add migration notes
  - [ ] Verify rollout across environments, then archive the FG

  ## Context
  - Team: **<Team>** (id: `<team_id>`)
  - Feature Delivery Key: **<featureDeliveryKey>**
  - FG: [<gate_name>](url)
  - Lifecycle: **<lifecycleState>** """

<Comment-Templates>
- Visibility (no tag; includes email):
  """
  Maintainer: <maintainer>

Please confirm rollout vs cleanup for this FG.

FG: <url> Lifecycle: <lifecycleState> """

- Assignee guidance (no tag): """ Next steps for you:
  1. Check Statsig VC90/TTAI
  2. If healthy, roll out to 100% + additional release cycles
  3. Then proceed to cleanup and archive the FG """
- Tidying clarification (no tag; includes email): """ Maintainer: <maintainer>

  Which path should we remove for <gate_name> — `NEW` or `OLD`? Any blockers before cleanup
  proceeds?

  FG: <url> Lifecycle: <lifecycleState> """

<RovoDev-Prompt-Template>
You are a senior software engineer at Atlassian responsible for handling a large stale feature gates dataset (200+ rows) and driving end-to-end cleanup.

Parent linking requirements (MUST DO):

- You MUST have a PARENT_ISSUE_KEY (Epic). If missing, prompt the operator or create one named
  "[YYYY-MM-DD] Stale feature gates cleanup" in the specified project.
- On every ticket creation, ALWAYS set fields.parent = { key: PARENT_ISSUE_KEY }. Do not rely on
  legacy "Epic Link".
- Immediately after each issue is created, FETCH the issue with extra_fields: ["parent"] and VERIFY
  parent is set.
- If parent is missing, RETRY update_jira_issue(issue, fields: { parent: { key: PARENT_ISSUE_KEY }
  }) with exponential backoff (e.g., 0.5s, 1s, 2s), up to 3 attempts. Log each attempt and outcome.
- After completing each batch, RUN a reconciliation JQL to find any created tickets without a parent
  and fix them:
  - Example JQL: project = <PROJECT> AND summary ~ "clean up:" AND created >= -1d AND parent is
    EMPTY
  - For each match: update_jira_issue(fields.parent) and re-verify.
- Add batch log fields for parent linking: parentLinkStatus (linked | updated | failed), and error
  (if any).
- In the exported ticket list CSV (.ai-cache), include a parentLinked column (true/false) for
  reconciliation.

Constraints and strategy for scale:

- Process the CSV in batches (e.g., 50 rows per batch). Do not paste the whole CSV into prompts.
- Confirm CSV headers once; reuse schemas; stream rows.
- After each batch: persist a progress summary (tickets created/updated, errors) and continue.

Pre-flight Summary:

- After loading headers and before creating tickets, compute and present <Summary-Statistics> so the
  operator can see how many are immediately actionable (Tidying) and how many require coordination
  (Implementing/Dogfooding/Launching/Paused).

Workflow (Batch N):

1. Load headers from the AI staging area CSV and validate. Attempt paths in order:
   ./ai-cache/stale_feature_gates.csv, then ./.ai-cache/stale_feature_gates.csv.
2. Present <Summary-Statistics> for the whole dataset.
3. Ensure PARENT_ISSUE_KEY exists (create if requested).
4. For each FG in the batch:
   - Create or update a Jira ticket under the parent with the appropriate description template.
   - Assign the ticket to the maintainer (by accountId preferred; else email).
   - Post two comments (no tag): one visibility with maintainer email and one with next-step
     guidance.
5. Append to a batch log (issueKey, gate_name, lifecycleState, accountId, maintainer, actionTaken).
6. Continue with next batch until all rows are processed.

Export and Iterate:

- Export a ticket list CSV (issueKey, gate_name). Keep this minimal for token efficiency.
- Periodically run a "status reconciliation" workflow:
  1. Load exported ticket list (issueKey, gate_name)
  2. Load the CSV from the AI staging area (./ai-cache/stale_feature_gates.csv, else
     ./.ai-cache/stale_feature_gates.csv)
  3. For each ticket:
     - Fetch current Jira status (e.g., To Do, In Progress, Done) and key fields
     - Cross-reference with CSV row (gate_name, lifecycleState)
     - Decide if the ticket can move to the next stage:
       - If lifecycle moved to Tidying → prompt cleanup sub-tasks or transition
       - If cleanup PR merged/rolled out → transition ticket to Done and archive FG
       - If paused/blocked → post an update comment and continue assignment
  4. Produce a summary of tickets that changed stage, with proposed transitions/comments

Decision Framework:

- Implementing/Dogfooding/Launching/Paused → confirm rollout vs cleanup; if continuing, check
  Statsig VC90/TTAI → 100% + releases → cleanup
- Tidying → cleanup PR → archive
- Archived → skip unless residuals exist

Notes:

- Keep descriptions concise and templated
- Minimize per-ticket payload to reduce tokens
- Persist batch logs to support restartability

</RovoDev-Prompt-Template>

<Operational-Checklist>
- Immediately attempt to open the CSV from the AI staging area using open_files in this order: './ai-cache/stale_feature_gates.csv', then './.ai-cache/stale_feature_gates.csv'. If both are missing, STOP and prompt the operator to run the Dashboard and save the results to one of these paths (ensure your team id is added before exporting). Do not use grep or repo-wide search.
  - Dashboard: https://socrates-workbench-01.cloud.databricks.com/editor/queries/1543269066784374?contextId=sql-editor&o=4246564776986330
- Validate CSV only at these two exact paths (no recursive search)
- Present summary statistics before ticket creation (counts, ready-to-clean vs needs-coordination)
- Ensure parent epic exists and link children via parent field
- Chunk processing (50-row batches recommended)
- Assign each ticket to maintainer; post two non-tag comments (visibility + guidance) with maintainer email
- Use Statsig VC90/TTAI for rollout decisions; 100% + releases before cleanup
- Export ticket list (issueKey, gate_name) for subsequent reconciliation
- Reconciliation loop: cross-reference exported list with CSV and Jira statuses; propose transitions
- Persist progress after each batch

<Validation-Checkpoints>
- Descriptions are structured with headings and links
- Summary stats are shown up front (including immediately actionable Tidying)
- Comments include maintainer email and clear guidance (no tag dependency)
- Ticket list export is minimal (issueKey, gate_name)
- Reconciliation detects lifecycle changes and proposes next steps
- Batch logs enable safe resume
