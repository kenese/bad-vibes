# Content Design Confluence Review

<!-- meta:
  mode: expert
  topic: Generate a Confluence page to document any content design changes made for review
  audience: ai-agent
  token_budget: long
  priority: medium
  read_when: After making changes to content or i18n that will require review from a content designer
  depends_on: []
  last_review: 2025-11-03
-->

<Summary>
You are designed to generate a Confluence page that a developer would handover to a content designer
for review alongside a Pull Request.
</Summary>

## Instructions

<Process>
1. **Determine** if the user has made changes or if they're committed first. Use `git status --porcelain` to help determine that.
1. **Capture** all content changes (both commits and uncommitted) via `git diff`, `git status --porcelain`, or otherwise and any other context. Capture things like the branch name or Pull request (if available)
2. **Create** one or more Confluence page(s) with those changes
   - Create a **NEW PAGE** in the Confluence space the user provided. If not, ask them.
   - This **MUST BE** a new page using `create_confluence_page`
	 - **YOU MUST NEVER USE** `update_confluence_page`
3. **Return** the user the link(s)! Keep your response to the user **very short** and the link must be at the bottom of your response so they can find it easier.
</Process>

<Output-Format>
- Keep your response very short
- Inform the user if you **COULD NOT** create a Confluence page for any important diffs
- At the very end, return a link of all Confluence page(s) created
</Output-Format>

## Capturing the content changes

Using `git diff`, `git status --porcelain`, etc, grab all of the changes a user made.

Primarily, we're looking at any diffs that are primarily content (or i18n format of content). Often
these diffs are a part of a `defineMessages` or `@atlassian/jira-intl` block of code. You also want
to find the context that was changed with it.

### Search Patterns for Content Changes

#### Primary Patterns

- **i18n patterns**: `defineMessages|formatMessage|useIntl`
- **Message files**: `messages.tsx|messages.ts|*.messages.*`
- **Content strings**: `defaultMessage|title|description|label`
- **Customer-facing text**: Ignore tests, etc., only report on user-facing changes
- **Customer messaging**: Things like flag messages, validation text, notifications

#### Flag-Specific Patterns

- **Basic flag imports**: `/from.*@atlassian/jira.*flag/`
- **Error flag helpers**: `/showFlag.*(appearance|type).*error/`
- **Flag components**: `/<.*(Flag|FlagRenderer).*(appearance|type).*error/`
- **Error flag components**: `/<.*ErrorFlag.*>/`
- **Auto-dismiss flags**: `/<.*AutoDismissFlag.*>/`
- **Error flag service**: `/useFlagsService|useFlagService/`
- **Error flag renderer**: `/FlagRenderer.*error/`

#### Message Definition Patterns

- **Message definitions**: `/defineMessages|formatMessage/` (often in `messages.tsx` files)
- **i18n imports**: `/from.*@atlassian/jira-intl/`
- **Message files**: `/messages\.tsx?$/`

#### Generic Error Patterns

- **Generic error flags**: `/(errorFlags\.)?(genericError|serverError|forbidden|unauthorized)/`
  (imported from `errorFlags`, eg. `import { errorFlags } from '@atlassian/jira-flags';`)

#### Common File Locations

- **Flag directories**: `./**/flags/**/`
- **Message files**: `./**/messages.tsx`
- **Error components**: `./**/*error*flag*/`
- **Service files**: `./**/*service*/`

#### Advanced UI Patterns

- **Error messages**: `errorFlags\.|showFlag.*error|ErrorFlag`
- **Validation text**: `validation|invalid|required|error`
- **UI labels**: `aria-label|alt=|placeholder=`
- **Button text**: `buttonText|actionText|ctaText`
- **Form labels**: `label.*=|fieldLabel|inputLabel`

```tsx
// messages.tsx
import { defineMessages } from '@atlassian/jira-intl';
export default defineMessages({
	title: {
		id: 'software.main.flags.card-cover-toggle-failed.title',
		defaultMessage: 'We couldn’t show your card images',
		description: 'Title for the card cover toggle failed flag',
	},
	description: {
		id: 'software.main.flags.card-cover-toggle-failed.description',
		defaultMessage: 'Reload the page and try again.',
		description: 'Description for the card cover toggle failed flag',
	},
});
```

However, to additionally find the context where those messages are used.

### What to Capture

#### Primary Content Types

- **i18n changes**: `defineMessages`, `@atlassian/jira-intl`, `useIntl()` related modifications
- **Customer-facing text**: Any user-visible strings, labels, messages
- **Content context**: Find where messages are used (follow imports to `messages.title`,
  `messages.description`)
- **UI text changes**: Button labels, form text, error messages, notifications
- **Accessibility text**: Alt text, aria-labels, screen reader content

#### Error Message Specifics

- **Flag messages**: Error flags, success flags, warning flags
- **Validation messages**: Form validation, input errors, field requirements
- **Permission messages**: Access denied, unauthorized, forbidden actions
- **System messages**: Server errors, network issues, timeout messages
- **Workflow messages**: Status changes, transition errors, process failures

### What to Ignore

- **Non-content files**: Tests, fixtures, examples, build files
- **Non-customer-facing**: Code comments, internal variable names, technical strings
- **UI markup**: Component props like `appearance="primary"` that aren't user-visible
- **Non-TypeScript/JavaScript**: Only process `.ts`, `.tsx`, `.js`, `.jsx` files

### Content Change Types

#### Message Changes

- **New messages**: Adding new `defineMessages` entries
- **Updated messages**: Modifying existing `defaultMessage` content
- **Removed messages**: Deleting unused message definitions
- **Context changes**: Moving or restructuring message usage

#### Content Quality Improvements

- **Generic to specific**: Replacing "Something went wrong" with specific error messages
- **Tone improvements**: Making messages more helpful and actionable
- **Accessibility enhancements**: Improving screen reader content and aria-labels
- **Consistency fixes**: Aligning with content guidelines and patterns
- **Localization updates**: Improving i18n structure and descriptions

## Describing the content changes

Your primary goal is to create a single clear, concise, and informative Confluence page(s) that
captures all of the content changes the developer has made on their current branch alongside the
context you have available in those file(s) or commit messages.

DO NOT summarize or consolidate changes. If the user makes a change to applicable text, even if it's
just changing the capitalization, I want to see it in a **Before** and **After**.

Additionally, capture related content strings, eg. if you have a `title` and `description` and you
changed the `title`, show the `description` for context as well (even if unchanged)

### Guidelines for Confluence content

#### Content Focus

- **Target audience**: Content designers (non-technical) - avoid excessive code
- **Focus on content**: Show the actual text changes, not technical implementation
- **Explain reasoning**: Use expandable sections for change rationale, not inline comments
- **Group related changes**: Link connected modifications (e.g., new `messages.tsx` + import
  changes)

### Content Quality Checklist

#### Content Organization

- [ ] Changes are grouped logically by feature/component
- [ ] Context is clear for each change
- [ ] Reasoning is explained in expandable sections
- [ ] Diffs are clean and focused on content changes
- [ ] We show ONE SECTION per Flag changed (this could include title, description, and actions);
      other Flag messages go into other sections.
- [ ] We show a MAXIMUM of 10 sections per page. Split additional sections into additional pages.
- [ ] DO NOT ever summarize details. If you have a simple typo, you MUST create a Section for it.

#### Content Designer Readability

- [ ] Language is accessible to content designers
- [ ] All customer-facing changes are captured
- [ ] Technical implementation details are minimized
- [ ] Changes show "before" and "after" in a table form
- [ ] You DO NOT have any changes that are simply summarized, eg. "we did this for this list of
      files as well". Every change MUST have a Table.

### Confluence Page Template

- You MUST use file links if at all possible, eg. if the file's absolute path on the machine is like
  `…/atlassian-frontend-monorepo/jira/src/packages/platform/feature/messages.ts`, the link would be
  https://bitbucket.org/atlassian/atlassian-frontend-monorepo/src/master/jira/src/packages/platform/feature/messages.ts
- You MUST follow the Confluence template as close as possible. Generate tables, bold items,
  color-code, or other formatting.
- You MUST use the "Before" and "After" table as much as possible, we REQUIRE "Before" context.
- You MUST have **ONE SECTION** per Flag changed. If you change a description and title in the Flag,
  you MUST them in the same table. If you change another Flag in the same file, split into multiple
  sections.
- Limit each page to **10 SECTIONS**. Split into multiple pages, grouped by package, file path,
  context, and/or team if necessary.

```md
# Content Design Review - [Feature Name]

<!-- START:CONFLUENCE_TABLE -->

| Key        | Value                 |
| ---------- | --------------------- |
| **PR**     | [Link to PR]          |
| **Branch** | `feature_branch_name` |
| **Author** | @username             |
| **Date**   | YYYY-MM-DD            |
| **Status** | Ready for Review      |

<!-- END:CONFLUENCE_TABLE -->

---

## Summary

1-2 sentences describing all changes

- **Where this content lives**: Add the experience name (e.g., Board view)
- **When this is content is triggered**: Add the error trigger (e.g., uploaded a non-compliant
  attachment).
- **Action the LLM took**: Explain content design rationale (e.g., replaced generic error messages
  with specific, actionable content for Bitbucket connection failures in the one-click connect flow)

### Description of file/experience/feature

- **File**: Link to file (example:
  https://bitbucket.org/atlassian/atlassian-frontend-monorepo/src/master/jira/src/packages/platform/feature/messages.ts)
- **Context**: 1 sentence to describe the context if it differs from the top-level summary
- **Change**: Explain content design rationale (e.g., replaced generic error messages with specific,
  actionable content for Bitbucket connection failures in the one-click connect flow)

<!-- START:CONFLUENCE_TABLE -->

|                 | Before               | After                                                                                      |
| --------------- | -------------------- | ------------------------------------------------------------------------------------------ |
| **Title**       | Something went wrong | We couldn't move your card                                                                 |
| **Description** | Please try again     | The card couldn't be moved due to workflow restrictions. Check the issue's current status. |

<!-- END:CONFLUENCE_TABLE -->

### Description of file/experience/feature

…
```

## Validation and Quality Checks

### Pre-Generation Checklist

- [ ] ALL content changes identified. If the user provides 50 files, you need to have a `git diff`
      for ALL 50 files.
- [ ] Context for each change documented, eg. the existing, untouched content
- [ ] Changes grouped logically
- [ ] Technical noise filtered out
- [ ] Customer-facing focus maintained
- [ ] What pages and sections to create

### Post-Generation Checklist

- [ ] Confluence page is readable by content designers
- [ ] All changes are properly explained
- [ ] Reasoning is clear and accessible
- [ ] Diffs are clean and focused
- [ ] Link(s) are provided to user

## Generating the Confluence page

You have a tool call to generate the Confluence page — use `create_confluence_page` primarily.

**VERY IMPORTANT**, do not just arbitrarily inject HTML such as `<h2>Summary</h2>` or
`<details><summary>` as that is NOT VALID in Confluence. If the tool does not tell you how to format
it, the HTML just renders as text and is confusing. Please follow the tool call for guidance on
creating a page.

### Requirements

- Use the **Confluence space or folder provided**: if the user provides you with a Confluence link,
  use it. Otherwise, you **MUST** ask before proceeding.
- Create a **NEW PAGE** in that space or folder. This will often be a child item of whatever the
  user provided.
- **Page structure**: Follow the template above for consistent formatting
- **Content focus**: Prioritize content changes over technical implementation
- **Link placement**: Return the Confluence link **towards the bottom** of your response to the user
  for easy access in their terminal

### Success Criteria

- [ ] All content changes captured and documented
- [ ] Changes grouped logically by category
- [ ] Context and reasoning provided for each change
- [ ] Page is readable by content designers
- [ ] Confluence link provided to user
- [ ] Technical implementation details minimized
