# Code-Review Instructions for Jira Frontend Development

<!-- meta:
  mode: expert
  topic: code review for self-review and branch/PR code review
  audience: ai-agent
  model: sonnet-4
  token_budget: long
  priority: critical
  read_when: performing code reviews for local or remote code
  depends_on: []
  last_review: 2025-10-03
-->

> Comprehensive pre-push style review providing guidance that complements automated tools. Focused
> on architectural, design, and business logic concerns that ESLint and TypeScript cannot detect.

<Self-Reflection>
- The goal is to catch what humans and tools miss - focus on intent, design, and user impact rather than syntax
- Code reviews should complement automated tools, not duplicate their function
- Existing patterns exist for business reasons - understand context before proposing alternatives
</Self-Reflection>

<Where-To-Find-It>
- **Jira Issues**: hello.jira.atlassian.cloud/browse/{WORKITEM-ID} or jplat.atlassian.net/browse/{WORKITEM-ID}
- **Review Memory**: `[jira-folder]/.ai-cache/review/{branch-name}/context.md`
- **Git Commands**: Use `git diff` and `git log` commands to understand changes
- **Related Instructions**: Consult with `Quick Decision Tree`(already in context) for specific patterns detected in changes.
</Where-To-Find-It>

<Core-Concepts>
This instruction set enables AI agents to perform comprehensive pre-commit code reviews that
complement automated tools. The focus is on architectural, design, and business logic concerns that
ESLint and TypeScript cannot detect.
**Remember**: The goal is to catch what humans and tools miss - focus on intent, design, and user impact rather than syntax.
Be helpful and vigilant, don't try to be gentle or polite. Be direct and clear, its better if you shout at me now, than my peer reviewers later.
Be fast where you can be fast, be thorough where you must be thorough. Its better to have a few interactions and conversations, rather than spending hours on a single pass.
</Core-Concepts>

## Review Prerequisites

**When specific patterns are detected in the changed code**, consult relevant instruction files
linked via `#Quick Decision Tree`. **Only load instruction files when their specific patterns are
detected in the changes.**

## Review Discovery Protocol

### Understanding the Request

Code review can be invoked in multiple ways:

1. **Command with arguments**: `/code-review issue/RVRY-123` or
   `/code-review feature/ABC-456 remote`
2. **Natural language**: "please review XX-YY branch" or "review my changes"
3. **Cursor command**: User types `/code-review` with optional branch name and review type

**Parse the invocation to determine:**

- **Branch name**: Extracted from command arguments or natural language (e.g., `issue/RVRY-123`,
  `feature/ABC-456`)
  - If no branch specified → use current branch
  - Branch names may include prefixes (`issue/`, `feature/`, `spr/t/`) or just ticket ID
    (`RVRY-123`)
- **Review type**:
  - `local` (default) - review local branch, including uncommitted changes
  - `remote` - review remote branch from origin (specified by "remote" keyword)

**Review Scope:**

- **local changes**: review current working branch, committed, staged and unstaged changes. Consider
  it as ongoing work unless explicitly marked "final" / "precommit".
- **specific branch (local)**: review the specified local branch, likely to support ongoing PR. The
  change is expected to be "complete".
- **specific branch (remote)**: review the remote version of the branch, fetching from origin if
  needed.

### Phase 0: Preparation

**🚨 CRITICAL: Choose the appropriate review method based on available tools:**

#### Option A: Bitbucket MCP (Preferred when available)

If Bitbucket MCP is available (check MCP configuration), use it for remote branch reviews:

**Advantages:**

- Direct access to PR information, comments, and build status
- No git permissions needed
- Can fetch PR diff, comments, and metadata in one call
- Can check build/pipeline status
- Can add comments directly to the PR

**When to use:**

- Reviewing remote branches with associated PRs
- Checking build/pipeline status
- Adding review comments to PRs
- Getting PR context and discussion history

**Step 1: Determine if Bitbucket MCP is available**

Check if `bitbucket` MCP server is configured in `~/.cursor/mcp.json` or workspace MCP config.

**Step 2: For remote branches with PRs, use Bitbucket MCP tools:**

```bash
# First, identify if there's a PR for this branch
# Search for PRs in the repository
# Use: mcp_bitbucket_list_repositories to find the repo
# Use: mcp_bitbucket_get_pull_request to get PR details
# Use: mcp_bitbucket_get_pull_request_changes to get the diff
# Use: mcp_bitbucket_get_pull_request_comments to see existing review comments
# Use: mcp_bitbucket_get_build_status to check pipeline status
```

**Example workflow with Bitbucket MCP:**

1. Get build status: `mcp_bitbucket_get_build_status(workspace, repo_slug, branch_name)`
2. Find PR by searching or using PR URL
3. Get PR details: `mcp_bitbucket_get_pull_request(workspace, repo_slug, pull_request_id)`
4. Get PR changes: `mcp_bitbucket_get_pull_request_changes(workspace, repo_slug, pull_request_id)`
5. Get existing comments:
   `mcp_bitbucket_get_pull_request_comments(workspace, repo_slug, pull_request_id)`
6. Optionally add review comments: `mcp_bitbucket_add_pull_request_comment(...)`

**Note:** Bitbucket URLs like `https://bitbucket.org/workspace/repo/pull-requests/123` can be parsed
to extract workspace, repo_slug, and pull_request_id.

#### Option B: Git-based Review (Fallback)

If Bitbucket MCP is not available or for local-only reviews, use the helper script:

**Step 1: Determine script arguments from the invocation**

Examples:

- `/code-review` → Run: `./jira/docs/llm/agent-instructions/scripts/code-review-helper.sh`
- `/code-review issue/RVRY-123` → Run:
  `./jira/docs/llm/agent-instructions/scripts/code-review-helper.sh issue/RVRY-123`
- `/code-review issue/RVRY-123 remote` → Run:
  `./jira/docs/llm/agent-instructions/scripts/code-review-helper.sh issue/RVRY-123 remote`
- "review my changes" → Run: `./jira/docs/llm/agent-instructions/scripts/code-review-helper.sh`
- "review feature/ABC-456 branch" → Run:
  `./jira/docs/llm/agent-instructions/scripts/code-review-helper.sh feature/ABC-456`

**Step 2: Execute the helper script with parsed arguments**

```bash
# For current branch (no arguments)
./jira/docs/llm/agent-instructions/scripts/code-review-helper.sh

# For specific local branch
./jira/docs/llm/agent-instructions/scripts/code-review-helper.sh <branch-name>

# For remote branch
./jira/docs/llm/agent-instructions/scripts/code-review-helper.sh <branch-name> remote
```

**This script MUST be run before proceeding with the review. It:**

- Automatically searches for remote branches if not found locally (using `git ls-remote`)
- Auto-switches to remote review mode when remote branch is found
- Extracts ticket ID from branch name (e.g., `JPO-35050` from `JPO-35050-foster-ai-cleanup`)
- Finds only commits relevant to the ticket/branch (avoiding merged master commits)
- Creates a single comprehensive `review.md` file with all information
- Eliminates the need for individual git command permissions
- Handles both local and remote branches automatically

**⚠️ DO NOT run individual git commands - use the prepared review.md file instead.**

**Step 3: Verify script execution**

After running the script, confirm the review file exists at:
`{jira-dir}/.ai-cache/review/{branch-name}/review.md`

This file contains:

- Branch metadata and ticket ID
- Summary statistics (commits, files changed, insertions/deletions)
- List of relevant commits (filtered by ticket ID)
- Changed files list with change types
- Change statistics
- Full diff of all relevant changes

If the file is missing or contains hundreds of thousands of lines, the script may have failed.
Report the error to the user.

Branch name is expected to follow pattern like `feature/ABC-123-description` or `issue/ABS-123` or
`ABC-123-description`, where `ABC-123` is the JIRA Workitem. Read the JIRA ticket description to
understand the task context and acceptance criteria. Jira tickets can be found at:

- "HELLO": https://hello.jira.atlassian.cloud/browse/{WORKITEM-ID}
- "JPLAT": https://jplat.atlassian.net/browse/{WORKITEM-ID}

_Remember_ where a particular ticket was found and reuse that instance next time. For example
`MAGMA-X` lives at JPLAT, while `JPO-Y` lives in HELLO. Update `# Appendix A: Prefix mapping table`
to add new prefixes as they are discovered.

- Prefixes like `XYZ-000` or `WIP-` are placeholders and do not have meaningful descriptions.
- Prefixes like `spr/t/JFP-5248` or `spr/master/t/JFP-5248` should be treated as `JFP-5248`.

### Phase 1: Context Gathering (1-2 iterations)

**Base branch** for Jira development is `master` unless another base branch is specified by
developer. Local master branch is not expected to be up-to-date with remote master. Always assume
local master may be stale and use `origin/master`.

You must follow the procedures below to discover changes. If you need to deviate - communicate to
the user, explain and ask permission first.

#### Procedure for Local Changes (Default)

**After running the helper script, use the generated review.md file instead of individual git
commands:**

```bash
# Step 1: Check current working directory for path handling
## Current directory
pwd
## Repository root
git rev-parse --show-toplevel

# Step 2: Read the comprehensive review file (no permission prompts needed)
# All git data is consolidated in a single file:
# {jira-dir}/.ai-cache/review/{branch-name}/review.md
#
# This file contains:
# - Branch metadata and ticket ID
# - Summary statistics
# - Relevant commits (filtered by ticket ID)
# - Changed files list
# - Change statistics
# - Full diff of all changes
# - Working tree status (for local branches)

# Read the review file:
cat {jira-dir}/.ai-cache/review/{branch-name}/review.md
```

> Note: in no circumstances use `open_files`(tool) to read `review.md`. If you must use
> `expand_code_chunks(file_path, [[0, -1]])` to read it in full. Prefer the bash script above.

**If review.md shows "MANY" changed files OR the file is excessively large (hundreds of thousands of
lines)**

- This indicates the script failed to properly filter commits (likely the branch contains merged
  master commits)
- Inform user that the script needs debugging - the review.md should be concise (typically < 1000
  lines)
- Check the "Summary" section at the top of review.md:
  - If "Relevant Commits" is > 10, something is wrong
  - If "Files Changed" is > 100, something is wrong
- "MANY" depends on the available token budget, consider 100k tokens as a hard limit, and 50k tokens
  as a soft limit. Or 1000+ lines changed

#### For Remote Branches/PRs (Reviewing Someone Else's Work)

When reviewing a specific branch or commit that isn't currently checked out:

**CRITICAL: Use Explicit Branch Names**

- When given a branch name like `ANY-BRANCH-NAME`, use that EXACT name
- Do NOT search for variations, alternatives, or similar names
- Do NOT use grep, pattern matching, or fuzzy searching to find "similar" branches
- Do not use `git branch -a | grep "branch"` to "discover" branches.
- If the exact branch doesn't exist, report that fact directly

**Critical: do not interfere:**

- NEVER switch branches to avoid disrupting user's work
- Always `git fetch origin {branch-name}` before analyzing remote branches
- Use `git diff origin/branch-name` and `git log origin/branch-name` (with proper merge-base
  context) without switching
- For merge commits, use `commit^1..commit` to see the actual changes being merged
- For specific commits, use `git show commit-hash` for complete context
- ONLY switch branches if explicitly requested by user or analysis is impossible without checkout
  (e.g., massive generated diffs requiring context resolution)

**Error Handling (Fail Fast):**

- If fetch fails with missing ref → STOP: `Branch '{branch-name}' does not exist on remote.`
- If fetch fails for network / auth → STOP and report exact stderr; request user intervention
  (sandbox, credentials, manual fetch)
- If any diff/log command errors → STOP; do not invent alternative heuristics

Reminder: Agent might be running in a sandbox mode with reduced capabilities. Any command can fail
unexpectedly due to environment restrictions. Dont fight with it - if a command fails, STOP and
report the error.

Guardrail: Remote branch analysis MUST treat current local branch as unrelated. Comparisons anchor
to `origin/master` unless an explicit alternative base is provided.

```bash
# Step 1: Context for path handling
## Current directory
pwd
## Repository root
git rev-parse --show-toplevel

# Step 2: Read the comprehensive review file (no permission prompts needed)
# The helper script already fetched the remote branch and prepared all data:
# {jira-dir}/.ai-cache/review/{branch-name}/review.md
#
# This file contains:
# - Branch metadata and ticket ID
# - Summary statistics
# - Relevant commits (filtered by ticket ID to avoid merged master commits)
# - Changed files list
# - Change statistics
# - Full diff of all changes

# Read the review file:
cat {jira-dir}/.ai-cache/review/{branch-name}/review.md

# Additional commit details (if needed)
# Note: The helper script provides comprehensive data, but if specific commit details are needed:
# git --no-pager show {commit-hash}
```

**CRITICAL: File Path Handling**

Git diffs show paths relative to the repository root, but you may be running in a subdirectory.
**You MUST normalize paths before any file operations.**

**Path Normalization Algorithm (Robust Version):** Some git operations return paths from the repo
root, others from current directory.

- understand repo root (already performed)

```bash
git rev-parse --show-toplevel
```

- understand current directory (already performed)

```bash
pwd
```

- operate with root relative paths internally
  - add `-z` to git commands to get a deterministic paths
  - prefer `--porcelain=v2` NUL-delimited, unambiguous, root-relative paths.
- **CRITICAL**: remember that many commands such as `git show file`, `git diff file` or `cat file`
  expect paths relative to current directory.

Example:

- `git diff` returns `jira/src/packages/foo/bar.tsx`
- current directory is `/home/user/atlassian-frontend-monoreport/jira/src/`
- repo root is `/home/user/atlassian-frontend-monoreport/`
- to read the file, you must use `cat ./packages/foo/bar.tsx`

**Validation (Hard Stops):** The expected area of development is "JIRA" and all instructions assume
that.

- Any changed file outside `[jira-root]/` (with rare exceptions for: `[root]/platform/`) → STOP &
  report scope anomaly.
  - where `platform/` is `repo-root/platform/`, not `jira/platform/` (which is just a symlink)
- Any attempt to traverse (`../`) or absolute paths in diff context → flag as suspicious.

### Phase 2: Review the Generated Data

#### If using Bitbucket MCP:

The MCP tools provide structured data directly:

- **PR metadata**: Title, description, author, reviewers, status
- **PR changes**: Full diff with file paths and line numbers
- **PR comments**: Existing review comments and discussions
- **Build status**: Pipeline results and failures

Store this information in: `[jira-folder]/.ai-cache/review/{branch-name}/pr-data.md`

**Structure for PR data file:**

```markdown
# PR Review Data

## PR Information

- PR ID: [number]
- Title: [title]
- Author: [author]
- Status: [status]
- URL: [bitbucket URL]

## Build Status

[Pipeline results from mcp_bitbucket_get_build_status]

## PR Description

[Full description from PR]

## Changes Summary

[From mcp_bitbucket_get_pull_request_changes]

## Existing Comments

[From mcp_bitbucket_get_pull_request_comments]
```

#### If using Git-based review:

The helper script has already created: `[jira-folder]/.ai-cache/review/{branch-name}/review.md`

This file contains all the information needed for the review. Read it to understand:

- What commits are being reviewed (filtered by ticket ID)
- What files changed
- The actual code changes (full diff)

**If you need to create additional analysis notes**, you can create:
`[jira-folder]/.ai-cache/review/{branch-name}/context.md`

**If iterative review** (file exists): read first; append new findings under a new timestamp.

**Memory file structure (optional):**

```markdown
# Review Context

## Branch Information

- Branch: [branch-name]
- Base: origin/master
- Author: [if known]
- Jira Ticket: [TICKET-ID with link]
- Review Started: [TIMESTAMP]
- Last Updated: [TIMESTAMP]

## Changed Files Summary

| File                     | Change Type | Lines +/- | Status         |
| ------------------------ | ----------- | --------- | -------------- |
| src/packages/foo/bar.tsx | modified    | +45/-12   | ✅ Reviewed    |
| src/packages/baz/qux.ts  | added       | +120/-0   | 🔍 In Progress |

## Commit History

[Only commits on current branch since branching from master]

- abc1234 feat: implement feature X
- def5678 fix: resolve bug Y
- ghi9012 refactor: improve code clarity

## Key Changes by File

### src/packages/foo/bar.tsx

**Type of change**: Bug fix / New feature / Refactor / etc. **Summary**: [What changed and why]
**Diff highlights**: [Important code snippets or patterns] **Concerns**: [Any issues identified]

### src/packages/baz/qux.ts

**Type of change**: [...] **Summary**: [...]

## Review Focus Areas

- [ ] State management patterns (if applicable)
- [ ] Entry points / modals (if applicable)
- [ ] Feature flags usage (if applicable)
- [ ] Performance implications (if applicable)
- [ ] Security considerations (if applicable)
- [ ] Accessibility concerns (if applicable)

## Findings

### Iteration 1 - [TIMESTAMP]

- Critical: [issues found]
- Important: [concerns noted]
- Questions: [clarifications needed]

### Iteration 2 - [TIMESTAMP]

[New findings from subsequent review]

## Review Status

- Current Phase: [Discovery / Analysis / Synthesis / Complete]
- Completion: [XX%]
- Next Steps: [What to do next]

## Review Metadata

### Run X - [TIMESTAMP]

- Reviewer: [agent-model] │
- Instructions Version: [commit-hash or date] │
- Token Budget: [used/allocated] [Work performed]
```

(Structure unchanged; see original template. Do not delete earlier iterations; append.)

**Additional Files (optional):**

- Analysis details: `[jira-folder]/.ai-cache/review/{branch-name}/analysis.md`
- Review notes: `[jira-folder]/.ai-cache/review/{branch-name}/context.md`

**Note**: The main review data is already in `review.md` created by the helper script.

### Phase 3: Focused Analysis Strategy

Perform a fast pre-review to size and classify risk, then progressively deepen:

1. Map file categories (logic vs types vs generated vs tests)
2. Identify architectural hotspots (state management, cross-layer boundaries, API surfaces)
3. Drill into only changed logic paths first; defer low-impact cosmetic diffs
4. Correlate related files (e.g., action + reducer + selector) before commenting in isolation

## Review Focus Areas (Focus on Changes Made)

**PRIMARY FOCUS**: Review ONLY the changes made on the current branch.

Use `git --no-pager diff origin/master...HEAD` for branch delta. Existing code issues: note only if
severe or directly impacted by the change.

**Escalation Triggers (Deep Dive Required):**

- Silent behavior changes (logic altered without tests updated)
- Feature flag removal / gating logic inversion
- Concurrency / async flow rewrites
- Security-relevant surface (auth headers, permissions, data filtering)
- Performance-sensitive loops / large allocations / render frequency changes

If none triggered → keep to lightweight confirmation style.

**Consult Additional Guidelines When:**

- State management → state-management.md
- Entry points / modals → entry-points.md
- Feature flags → feature-gates-experiments.md
- Forms → forms.md
- Performance-critical → performance.md
- SSR implications → ssr.md

If changes or intent behind them are related to other available instructions - load them for deeper
guidance. Example: changes in unit tests require consulting unit-testing.md before providing
feedback on test quality.

#### Change categories to consider:

Pick the first matching category, and follow its guidance. If none match, use "Out of category"

##### Normal change

Perform normal review.

Examples:

- A change under a feature flag (`fg` / `expVal`)

> Everything else obviously falls under "non feature flagged" code.

##### Non feature flagged code

Requires light review, focused on ensuring the "purity" of the change. For example, "feature flag
cleanup" should do exactly and only that. If change types are mixed (e.g., cleanup + new feature),
raise a red flag.

Examples (matching Risk mitigation field in PR):

- Dependency Bump
- Documentation / Non-Production Code / Testing utilities / Storybook examples / Prototypes
- Refactoring (Non-functional)
- Configuration / CI/CD / Schema changes
- New Unused Code
- Feature Flag Cleanup
- Logs
- Tests
- Revert
- Operational Flag
- Hot Fix
- Code Deletion
- Public API - External to Atlassian

If no category matches, or multiple categories match → use "Out of category changes".

#### Out of category changes

Raise a red flag. Requires deep and careful review. Specify why it is out of category and provide
guidance on how to proceed.

#### Noise reduction

- changes in `jira/local-conf` can be ignored (auto generated)
- changes in `*/tsconfig.*.json` dont matter much unless they are "small" (partially auto generated)
- changes in `*.graphql.ts` can be ignored (auto generated)

### Step 4: Synthesis & Prioritization

Combine findings into:

1. **Understanding of the change**: Summarize what was changed and why
2. **Critical Issues**: Must fix before commit (bugs, security, breaking changes)
3. **Important Improvements**: Should address soon (design, maintainability, performance)
4. **Nice-to-haves**: Consider for future iteration (code quality, minor optimizations)
5. **Questions**: Need developer clarification (intent, constraints, trade-offs)
6. **What problem we solve**: Self-reflect on whatever ticket is doing vs should be doing.
   - Are tests (if they exists) actually testing the right thing?
   - Are changes aligned with expectations?
   - Are there any "unexpected" changes that should not be here (in another PR or nowhere)
   - internally follow `problem-solving-framework.md` to guide your thinking.

If many items → cluster by theme (state, API, performance) to reduce cognitive load.

### Step 5: Celebrate Good Work & Encourage Growth

After findings, add a concise inspirational or balancing comment. If quality is low, keep tone
constructively firm—avoid unearned praise.

Sample Comments:

- Kent C. Dodds: “Let’s make it better! Every small improvement counts.”
- Guido van Rossum: “Readability counts—and this is a pleasure to read.”
- Grace Hopper: “The most dangerous phrase is ‘we’ve always done it this way.’ Nice to see
  innovation here!”
- Ada Lovelace: “Imagination is the discovering faculty—great to see it in action.”
- Margaret Hamilton: “Quality is never an accident. This is a great example.”
- Brian Kernighan: “Debugging is twice as hard as writing the code in the first place. Nice job
  making it clear!”

Please maintain the balance and if code quality is poor, avoid overly positive comments. Be a
gatekeeper, not a cheerleader:

- Linus Torvalds: This is exactly the kind of over-engineered solution that makes me want to throw
  my laptop
- Robert C. Martin (Uncle Bob): “The only way to go fast is to go well.”
- Dan Abramov: "This feels like a premature abstraction. Duplication is often cheaper than the wrong
  abstraction."

## Output Format

Do not bother user with technical details, they should already know current branch and working
environment. Focus on what is important to share.

### Bitbucket MCP Integration

**When using Bitbucket MCP for PR reviews:**

1. **Include build status in review**: If pipelines are failing, mention it prominently
2. **Reference existing comments**: Acknowledge and build upon existing review discussions
3. **Offer to post comments**: Ask user if they want review findings posted to the PR
4. **Link to PR**: Include the Bitbucket PR URL in the review summary

**Example prompt for posting comments:**

> "Would you like me to post these findings as comments on the PR? I can add them as:
>
> - A single summary comment
> - Individual inline comments on specific lines
> - Task items for critical issues"

### Review Summary

The following format is a preferred template for the final review output. Adjust sections as needed
as every change is unique.

```markdown
# Code Review Summary

[Quick intro summary validating understanding of scope & intent]

## 🔗 PR Information (if using Bitbucket MCP)

- **PR**: [Bitbucket PR URL]
- **Author**: [author name]
- **Build Status**: ✅ Passing / ⚠️ Failing / 🔄 In Progress
- **Existing Comments**: [count] comments, [count] unresolved threads

## 🔴 Critical Issues

[Issues that could cause bugs, security problems, data integrity violations, major UX regressions]

## 🟡 Important Improvements

[Design concerns, maintainability issues, performance opportunities, coupling risks, naming
clarifications]

## 🟢 Nice-to-haves

[Polish, minor optimizations, non-blocking refactors]

## ❓ Questions for Developer

[Clarifications about intent, constraints, trade-offs]

## 🤖 Observations

[Positive patterns, resilience improvements, test quality, consistency wins]

## 📌 Deferred / Out-of-Scope Severe Legacy (omit if not applicable)

[List problems discovered in the surrounding code that are out of scope for this change]

## 📈 Risk & Confidence

- Overall Risk: (Low|Medium|High)
- Review Confidence: (Provisional|Solid|Limited — due to [reason])
```

## Cleanup Protocol

After review completion (when developer confirms the work is "done" or "merged"):

1. Archive the review session:
   - Move `review.md`, `context.md` (if created), and `analysis.md` (if created) to
     `[jira-folder]/.ai-cache/review/{branch-name}/archive/{timestamp}/`
   - OR delete them if explicitly requested
2. Confirm cleanup with user: "Review session archived. Memory cleared for next iteration."

**Note**: The helper script creates `review.md` with all the git data. You may optionally create
`context.md` and `analysis.md` for your own notes during the review process.

If more commits appear after review completion → re-run the helper script to regenerate `review.md`
with updated data.

<Navigation-For-LLM-Agents>
**Prerequisites** (read BEFORE starting):
- Detect pattern triggers before loading specialized instruction files.

**Workflow Dependencies** (consult DURING implementation):

- IF state management changes → [State Management](./state-management.md)
- IF entry points/modals → [Entry Points](./entry-points.md)
- IF feature flags → [Feature Gates](./feature-gates-experiments.md)
- IF forms → [Forms](./forms.md)
- IF performance-critical → [Performance](./performance.md)
- IF SSR changes → [SSR Guidelines](./ssr.md)

**Validation Checkpoints** (verify AFTER implementation):

- IF unit testing needed → [Unit Testing](./unit-testing.md)
- IF integration testing needed → [Integration Testing](./integration-testing.md)

**Conditional Navigation**:

- IF reviewing feature flag cleanup → [Clean up Feature Gates](./clean-up-feature-gates.md)
- IF TypeScript suppressions →
  [TypeScript Error Suppression Removal](./typescript-error-suppression-removal.md)
- IF error handling concerns → [Error Handling](./handling-errors.md)

</Navigation-For-LLM-Agents>

<Success-Metrics>
A successful review should:

- ✅ Identify issues automated tools miss
- ✅ Provide actionable improvement suggestions
- ✅ Ask clarifying questions where intent is unclear
- ✅ Reinforce good patterns explicitly (why they are good)
- ✅ Reduce PR iteration count & cognitive load
- ✅ Avoid scope creep into unrelated legacy </Success-Metrics>

<EmergencyProtocols>
**If review becomes too complex**:
1. Focus on highest-risk changes only
2. Ask developer to highlight specific concerns
3. Defer comprehensive review to PR stage if necessary

**If architectural concerns arise**:

1. Load relevant instruction files
2. Document unresolved architectural questions in summary

**If you encounter any issues during execution**:

1. Stop immediately
2. Report the issue clearly to the user
3. Do not attempt speculative workarounds

</EmergencyProtocols>

# Appendix A: Prefix mapping table

> This table is expected to be updated as new prefixes are discovered.

| Prefix | Instance | comment                                                |
| ------ | -------- | ------------------------------------------------------ |
| MAGMA- | JPLAT    |                                                        |
| JFP-   | JPLAT    |                                                        |
| JPO-   | HELLO    |                                                        |
| FD-    | HELLO    | Not expected usage, FD tickets are for "tracking" only |
