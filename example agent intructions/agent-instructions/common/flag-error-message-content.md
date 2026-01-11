# Improve Jira Flag error message content

<!-- meta:
  mode: expert
  topic: Find flag error messages, identify if the content is sufficient, and update the content if necessary
  audience: ai-agent
  token_budget: long
  priority: low
  read_when: Working with showing Flag error messages
  depends_on: []
  last_review: 2025-11-03
-->

<Summary>
Your task is to improve the quality of Flag error messages using the content guidelines and error taxonomy attached.
</Summary>

I want you to find an invalid error Flag and change the content based on the guidance here. Look in
the folders where the current developer running this agent works. You may need to ask them what
folders to look at if you do not understand where they work.

## Instructions

<Process>
Make all individual changes:
1. **Find error flags**: Search for flag errors using the patterns provided in the paths the user
   defined.
2. **Locate content**: Find `defineMessages` (often in related `messages.tsx`) files to get the text
3. **Validate with guidelines**: Use the content guidelines to determine if that content needs
   updating. If not, look at the next error message.
4. **Check terminology**: Review the message against the "Selected Jira Terminology for Error Messages"
   section to ensure it uses current Jira Cloud terms (e.g., "work item" not "issue", "work type" not
   "issue type").
5. **Update the content**: Using the content guidelines, error taxonomy, and "Selected Jira Terminology
   for Error Messages" section, update the content in place or add new content, as necessary.
6. **Validate**: Verify the code and content. Ensure it passes the content guidelines and both the
   i18n and flag patterns are valid and pass linting and typechecking
When you're done making changes:
1. **Pull Request**: Validate you're in the right branch then use git to commit and push your
   changes then use the `create_pull_request` tool to open a pull request. If you're not successful,
   proceed and inform the user.
2. **Review**: Use the `content-design-confluence-review` to generate a confluence page using the
   changes and pull request you've made.	 
</Process>

## How to identify error flags

You should ignore tests, examples, **only** touch tests when you update a flag message where the
test would fail.

### Files to Avoid

**NEVER Touch these files**: Assuming you're running from within the `jira/*` folder:

- `./src/packages/platform/ui/flags/*` - Shared flag content
- `./platform/*` - Platform package (not Jira)
- `./post-office/*` - Post-office package (not Jira)
- `./**/(*\.)?(test|example|fixturespec|)s?\.?\.tsx` - Test files
- `./**/_*(test|example|fixture)s?_*/*` - Test directories

### Search Patterns for Different Flag Types

#### Flag Component Patterns

- **Basic flag imports**: `/from.*@atlassian/jira.*flag/`
- **Error flag helpers**: `/showFlag.*(appearance|type).*error/`
- **Flag components**: `/<.*(Flag|FlagRenderer).*(appearance|type).*error/`
- **Error flag components**: `/<.*ErrorFlag.*>/`
- **Auto-dismiss flags**: `/<.*AutoDismissFlag.*>/`

#### Message Definition Patterns

- **Message definitions**: `/defineMessages|formatMessage/` (often in `messages.tsx` files)
- **i18n imports**: `/from.*@atlassian/jira-intl/`
- **Message files**: `/messages\.tsx?$/`

#### Generic Error Patterns

- **Generic error flags**: `/(errorFlags\.)?(genericError|serverError|forbidden|unauthorized)/`
  (imported from `errorFlags`, eg. `import { errorFlags } from '@atlassian/jira-flags';`)
- **Error flag service**: `/useFlagsService|useFlagService/`
- **Error flag renderer**: `/FlagRenderer.*error/`

#### Common File Locations

- **Flag directories**: `./**/flags/**/`
- **Message files**: `./**/messages.tsx`
- **Error components**: `./**/*error*flag*/`
- **Service files**: `./**/*service*/`

### Flag Architecture Overview

Jira uses a wrapper (`'@atlassian/jira-flags'` and maybe others such as
`'@atlassian/jira-issue-error-flag'`) around the Atlassian Design System (ADS) component
(`@atlaskit/flag`) which takes some various shapes.

#### Common Flag Types in Jira

- **ErrorFlag**: Standard error flag component
- **FlagRenderer**: Renders flag objects from services
- **ErrorAutoDismissFlag**: Auto-dismissing error flags
- **SuccessFlag**: Success/confirmation flags
- **WarningFlag**: Warning flags (not error flags)

#### Flag Service Patterns

- **useFlagsService()**: Hook for showing flags programmatically
- **errorFlags**: Predefined error flag objects
- **showFlag()**: Method to display flags with custom content

#### Examples: Flag usage

##### Basic Error Flag with Generic Message

```tsx
import { errorFlags, FlagRenderer } from '@atlassian/jira-flags';
{
	hasError && <FlagRenderer flag={errorFlags.genericError()} />;
}
```

**Note**: This is a generic error - look for opportunities to replace with specific error messages.

##### Programmatic Flag Display with Custom Messages

```tsx
import { useIntl } from '@atlassian/jira-intl';
import { useFlagsService } from '@atlassian/jira-flags';

const { formatMessage } = useIntl();
const { showFlag } = useFlagsService();

const onError = useCallback(() => {
	showFlag({
		id: 'addPeopleToPlanError',
		type: 'error',
		title: formatMessage(messages.errorTitle),
		description: formatMessage(messages.errorDescription, { planTitle }),
		messageId: 'jet-plan-action-menu.ui.invite-people-trigger.show-flag.error',
		messageType: 'transactional',
	});
}, [showFlag, formatMessage, planTitle]);
```

**Key points**:

- Uses `formatMessage()` with custom messages
- Includes `messageId` for tracking
- Uses interpolation for dynamic content (`{ planTitle }`)
- Note: This example shows `invite-people-trigger` in the messageId (technical identifier) - while
  user-facing text should use "add people", technical IDs can preserve existing naming for backward
  compatibility

##### Auto-Dismissing Error Flag

```tsx
import { useIntl } from '@atlassian/jira-intl';
import ErrorAutoDismissFlag from '@atlassian/jira-flags/src/common/ui/components/error-auto-dismiss-flag';

<ErrorAutoDismissFlag
	id={flagProps.key}
	key={flagProps.key}
	title={formatMessage(messages.errorFlagTitle)}
	description={firstError.error}
	messageId="servicedesk-insight-object-type-configuration.ui.inheritance-tab.error-auto-dismiss-flag"
	messageType="transactional"
/>;
```

**Key points**:

- Auto-dismisses after a timeout
- Uses `firstError.error` directly (may need improvement)
- Includes proper `messageId` for tracking

##### Issue-Specific Error Flag

```tsx
import { ErrorFlag } from '@atlassian/jira-issue-error-flag/src/index.tsx';
<ErrorFlag
	error={cmdbObjectFieldError}
	title={messages.errorTitleCmdbAssets}
	description={messages.errorMessage}
/>;
```

**Key points**:

- Uses issue-specific error flag component
- References `messages` object directly (not `formatMessage`)
- May need to be updated to use proper i18n patterns

#### Examples: i18n content

Every error message in Jira should be using i18n (internationalization) via `@atlassian/jira-intl`
or some similar wrapper. The basic structure of this is typically:

##### Basic Message Structure

```tsx
import { defineMessages } from '@atlassian/jira-intl';

export default defineMessages({
	title: {
		id: 'scope.identifier',
		description: 'Human readable description of what this message means',
		defaultMessage: 'The default English translation for this message',
	},
});
```

##### Required Fields

- **`id`**: Unique identifier following the pattern `package.feature.component.message`
- **`defaultMessage`**: The English text that will be displayed
- **`description`**: Helpful context for translators and developers

#### Mapping Flag Usage to i18n Content

You're typically looking for a variable called `message` or `messages`, often from `./messages`
(tsx) file that uses `defineMessages`. When `formatMessage()` is being used, you're on the right
track.

##### Step-by-Step Process

1. **Find the flag component** that displays the error
2. **Look for `formatMessage()` calls** - these indicate i18n usage
3. **Follow the `messages` import** to find the message definitions
4. **Check the `messages.tsx` file** for the actual error text
5. **Update the `defaultMessage`** with improved content

##### Example: Component Using Messages

```tsx
// example: jira/src/packages/software/board/src/flags/card-cover-toggle-failed/index.tsx
import { ErrorFlag } from '@atlassian/jira-flags';
import { useIntl } from '@atlassian/jira-intl';
import messages from './messages.tsx';

const { formatMessage } = useIntl();
<ErrorFlag
	title={formatMessage(messages.title)}
	description={formatMessage(messages.description)}
	id={id}
	onDismissed={onDismissed}
/>;
```

##### Example: Message Definitions

Then follow that to find the `defineMessages` value, shown below. This will be the message itself.

```tsx
// example: jira/src/packages/software/board/src/flags/card-cover-toggle-failed/messages.tsx
import { defineMessages } from '@atlassian/jira-intl';
export default defineMessages({
	title: {
		id: 'software.main.flags.card-cover-toggle-failed.title',
		defaultMessage: "We couldn't show your card images",
		description: 'Title for the card cover toggle failed flag',
	},
	description: {
		id: 'software.main.flags.card-cover-toggle-failed.description',
		defaultMessage: 'Reload the page and try again.',
		description: 'Description for the card cover toggle failed flag',
	},
});
```

**This is a good example** - it follows the "We couldn't" pattern and provides actionable next
steps.

#### Examples: Predefined Generic Messages

You may see predefined generic messages from `errorFlags` out of `@atlassian/jira-flags` that are
acceptable if there is no context or known error to provide more to the user, but if you have more
context these may be worth replacing.

##### Generic Error Flag Usage

```tsx
import { errorFlags, useFlagService, FlagRenderer } from '@atlassian/jira-flags';

const { showFlag } = useFlagService();
showFlag(errorFlags.forbidden());
<FlagRenderer flag={errorFlags.genericError()} />;
showFlag(errorFlags.serverError());
<FlagRenderer flag={errorFlags.unauthorized()} />;
```

##### When to Replace Generic Messages

- **Generic errors**: `errorFlags.genericError()` - too vague
- **Server errors**: `errorFlags.serverError()` - not user-friendly
- **Permission errors**: `errorFlags.forbidden()` - doesn't explain why
- **Auth errors**: `errorFlags.unauthorized()` - doesn't guide next steps

**Priority**: Look for these patterns and replace with specific, actionable error messages when
context is available.

## How to add or update error content

### Requirements

<Requirements>
- **ONLY** update content when you have enough context to provide a meaningful or high-confidence
  change
- **NEVER** directly modify examples, tests, fixtures, or non-typescript files
- **NEVER** modify `jira/platform/**` or `jira/post-office/**` as those are NOT a part of Jira
- **NEVER** modify the root Flag error message that looks generic and shared, eg. from
  `src/packages/platform/ui/flags` or just `genericErrorMessage()`.
- You **MUST** only modify Flag error message content.
- You **MUST** use the i18n patterns described here (`defineMessages`).
- You **MUST** follow the content guidelines described here (see section: "Guidelines for Jira Error
  Flag content")
- You **MUST** not remove content or `defaultMessage` if it exists, only improve them in place. If
  it's invalid, you can add a comment suggesting it's invalid, but you couldn't adjust it.
- If you add new content, you **MUST** have `id, defaultMessage, description`, consider them all
  required.
- You **MUST** validate your formatting of quotes and escape apostrophes, eg.:
  - ❌ Broken: `'It's okay'`
  - ✅ Good: `"It's okay"`
- AVOID adding any supplementary functionality such as adding analytics events or new UI.
</Requirements>

### Pre-Change Validation

- [ ] Located the correct `defineMessages` to update
- [ ] Identified the specific error context
- [ ] Confirmed this is a user-facing error (not test/example)
- [ ] Verified the error needs improvement
- [ ] Checked if error has sufficient context to provide meaningful message
- [ ] Confirmed the error is not in a shared/generic location
- [ ] Verified the error is not already following best practices

### Post-Change Validation

- [ ] Message follows the content guidelines
- [ ] Escapes apostrophes correctly
- [ ] Includes actionable next steps (if applicable)
- [ ] Links are separate from body text in actionable links (if applicable)
- [ ] Uses `defineMessages` i18n pattern
- [ ] Has `id`, `defaultMessage`, and `description`
- [ ] Title starts with "We can't" or "We couldn't"
- [ ] Description is at grade 7 or below readability
- [ ] No technical jargon or error codes
- [ ] Consistent tone with other error messages
- [ ] Appropriate for target user role (admin vs end user)
- [ ] Code compiles and passes linting

### Common Error Message Patterns

#### Dynamic Content with Variables

When error messages need to include dynamic content, use i18n interpolation:

```tsx
// Good: Using interpolation for dynamic content
title: {
  id: 'software.main.flags.export-failed.title',
  defaultMessage: "We couldn't export {itemType}",
  description: 'Title when export fails, where {itemType} is the type of item being exported',
},
description: {
  id: 'software.main.flags.export-failed.description',
  defaultMessage: "The export failed for {itemName}. Try again in a moment.",
  description: 'Description when export fails, where {itemName} is the specific item name',
},
```

#### Conditional Messages for Different User Types

When the same error needs different messages for different user roles:

```tsx
// Good: Separate messages for different user types
adminTitle: {
  id: 'software.main.flags.permission-error.admin.title',
  defaultMessage: "We can't perform this action",
  description: 'Error title for admin users',
},
adminDescription: {
  id: 'software.main.flags.permission-error.admin.description',
  defaultMessage: "You need additional permissions. Contact your system admin.",
  description: 'Error description for admin users',
},
endUserTitle: {
  id: 'software.main.flags.permission-error.end-user.title',
  defaultMessage: "We can't perform this action",
  description: 'Error title for end users',
},
endUserDescription: {
  id: 'software.main.flags.permission-error.end-user.description',
  defaultMessage: "You don't have permission for this action. Contact your Jira admin.",
  description: 'Error description for end users',
},
```

#### Error Messages with Action Buttons

When errors need action buttons or links:

```tsx
// Good: Error with action button
title: {
  id: 'software.main.flags.retry-action.title',
  defaultMessage: "We couldn't save your changes",
  description: 'Title when save fails',
},
description: {
  id: 'software.main.flags.retry-action.description',
  defaultMessage: "Your changes were lost. Select **Save** to try again.",
  description: 'Description with action guidance',
},
actionButton: {
  id: 'software.main.flags.retry-action.button',
  defaultMessage: "Save",
  description: 'Button text for retry action',
},
```

### Edge Cases and Special Considerations

#### When to Skip Improvement

- **Generic shared errors**: Don't modify errors from `@atlassian/jira-flags` or platform packages
- **Test files**: Never modify test examples or fixtures
- **Already good**: If the error already follows best practices, leave it alone
- **No context**: If you can't determine what the error is about, don't guess

#### Handling Complex Error States

For errors that can have multiple causes, provide the most common solution:

```tsx
// Good: Addresses the most common cause with general guidance
title: {
  id: 'software.main.flags.complex-error.title',
  defaultMessage: "We couldn't process your request",
  description: 'Title for complex error with multiple possible causes',
},
description: {
  id: 'software.main.flags.complex-error.description',
  defaultMessage: "This usually happens when the server is busy. Try again in a few minutes, or contact support if the problem continues.",
  description: 'Description addressing most common cause with escalation path',
},
```

### If it exists, update it

If the bad message already exists, update it. Find the `messages.tsx` file or `defineMessages(…)`
call imported or used in the current file and make your changes.

#### Example 1: Basic Error Message Update

```diff
import { defineMessages } from '@atlassian/jira-intl';
export default defineMessages({
	title: {
		id: 'software.main.flags.card-cover-toggle-failed.title',
-		defaultMessage: "Something went wrong",
+		defaultMessage: "We couldn't show your card images",
		description: 'Title for the card cover toggle failed flag',
	},
	description: {
		id: 'software.main.flags.card-cover-toggle-failed.description',
		defaultMessage: "Reload the page and try again.",
		description: 'Description for the card cover toggle failed flag',
	},
});
```

#### Example 2: Adding Action Button

```diff
// messages.tsx
import { defineMessages } from '@atlassian/jira-intl';
export default defineMessages({
	title: {
		id: 'software.main.flags.export-failed.title',
		defaultMessage: "We couldn't export your data",
		description: 'Title when export fails',
	},
	description: {
		id: 'software.main.flags.export-failed.description',
-		defaultMessage: "Try again later.",
+		defaultMessage: "The export was interrupted. Select **Export** to try again.",
		description: 'Description when export fails',
	},
+	actionButton: {
+		id: 'software.main.flags.export-failed.action-button',
+		defaultMessage: "Export",
+		description: 'Button text for retry export action',
+	},
+ contactSupport: {
+		id: 'software.main.flags.export-failed.contact-support',
+		defaultMessage: "Contact support",
+		description: 'Button text for contact support action',
+	},
});

// index.tsx (partial example)
import { useFlagsService } from '@atlassian/jira-flags';
import { useIntl } from '@atlassian/jira-intl';
import messages from './messages.tsx';

const Component = () => {
	const { formatMessage } = useIntl();
	const { showFlag, dismissFlag } = useFlagsService();

	showFlag({
		id: '…',
		type: 'error',
		title: formatMessage(messages.title),
		description: formatMessage(messages.description),
		messageId: '…',
		messageType: '…',
		actions: [
			{
				content: formatMessage(messages.actionButton), // Export
				onClick: () => {
					dismissFlag('save-error-flag');
					retry();
				},
			},
			{
				content: formatMessage(messages.contactSupport), // "Contact support"
				onClick: () => window.open('https://support.atlassian.com/contact/', '_blank'),
			},
		]
	});
});
```

#### Example 3: Improving Validation Error

```diff
import { defineMessages } from '@atlassian/jira-intl';
export default defineMessages({
	title: {
		id: 'software.main.flags.validation-error.title',
-		defaultMessage: "Invalid input",
+		defaultMessage: "We can't save your changes",
		description: 'Title when validation fails',
	},
	description: {
		id: 'software.main.flags.validation-error.description',
-		defaultMessage: "Please check your input.",
+		defaultMessage: "The summary is too long. Keep it under 255 characters.",
		description: 'Description when validation fails',
	},
});
```

### If it doesn't exist, create it

#### When there are messages defined

Find the `messages.tsx` file or `defineMessages(…)` call imported or used in the current file and
add a new message with your changes.

```diff
import { defineMessages } from '@atlassian/jira-intl';
export default defineMessages({
+	title: {
+		id: 'software.main.flags.card-cover-toggle-failed.title',
+		defaultMessage: "We couldn't show your card images",
+		description: 'Title for the card cover toggle failed flag',
+	},
	description: {
		id: 'software.main.flags.card-cover-toggle-failed.description',
		defaultMessage: "Reload the page and try again.",
		description: 'Description for the card cover toggle failed flag',
	},
});
```

#### When there are no messages defined yet

If there is no `messages.tsx` file or `defineMessages(…)` call, you should create a new
`./messages.tsx` file and import that.

##### Step 1: Create the messages file

```tsx
// Create: ./messages.tsx
import { defineMessages } from '@atlassian/jira-intl';

export default defineMessages({
	title: {
		id: 'software.main.flags.card-cover-toggle-failed.title',
		defaultMessage: "We couldn't show your card images",
		description: 'Title for the card cover toggle failed flag',
	},
	description: {
		id: 'software.main.flags.card-cover-toggle-failed.description',
		defaultMessage: 'Reload the page and try again.',
		description: 'Description for the card cover toggle failed flag',
	},
});
```

##### Step 2: Update the component to use the messages

```tsx
// Update: jira/src/packages/software/board/src/flags/card-cover-toggle-failed/index.tsx
import { ErrorFlag } from '@atlassian/jira-flags';
import { useIntl } from '@atlassian/jira-intl';
+import messages from './messages.tsx';

const { formatMessage } = useIntl();
<ErrorFlag
+	title={formatMessage(messages.title)}
+	description={formatMessage(messages.description)}
	id={id}
	onDismissed={onDismissed}
/>;
```

#### Advanced Example: Error with Multiple States

For complex errors that need different messages based on context:

```tsx
// Create: ./messages.tsx
import { defineMessages } from '@atlassian/jira-intl';

export default defineMessages({
	// Basic error
	title: {
		id: 'software.main.flags.export-error.title',
		defaultMessage: "We couldn't export your data",
		description: 'Title when export fails',
	},
	description: {
		id: 'software.main.flags.export-error.description',
		defaultMessage: 'The export was interrupted. Try again in a moment.',
		description: 'Description when export fails',
	},

	// Network error variant
	networkTitle: {
		id: 'software.main.flags.export-error.network.title',
		defaultMessage: "We couldn't export your data",
		description: 'Title when export fails due to network',
	},
	networkDescription: {
		id: 'software.main.flags.export-error.network.description',
		defaultMessage: 'Check your internet connection and try again.',
		description: 'Description when export fails due to network',
	},

	// Permission error variant
	permissionTitle: {
		id: 'software.main.flags.export-error.permission.title',
		defaultMessage: "We can't export your data",
		description: 'Title when export fails due to permissions',
	},
	permissionDescription: {
		id: 'software.main.flags.export-error.permission.description',
		defaultMessage: "You don't have permission to export this data. Contact your admin.",
		description: 'Description when export fails due to permissions',
	},

	// Action button
	retryButton: {
		id: 'software.main.flags.export-error.retry-button',
		defaultMessage: 'Try again',
		description: 'Button text for retry action',
	},
});
```

#### Usage in Component

```tsx
// Update: ./index.tsx
import { ErrorFlag } from '@atlassian/jira-flags';
import { useIntl } from '@atlassian/jira-intl';
import messages from './messages.tsx';

const { formatMessage } = useIntl();
<ErrorFlag
	title={formatMessage(messages.title)}
	description={formatMessage(messages.description)}
	id={id}
	onDismissed={onDismissed}
/>;
```

## Examples of good and bad errors

<!-- Source: https://hello.atlassian.net/wiki/spaces/fcds/pages/5907158873/Content+system+Error+taxonomy -->

We **ONLY** care about **error flags** in this. If it's a success, warning, or informational
message, you can ignore it.

- **After action fails** → Error Flag
- **After action succeeds** → Success Flag
- **Before destructive action** → Modal
- **Before significant action** → Modal or Warning Flag
- **Loading/processing** → Info Flag

### Good Error Flag Examples

#### ✅ Specific and Actionable

```tsx
// Good: Clear what failed and what to do next
title: "We couldn't show your card images";
body: 'Reload the page and try again.';
```

```tsx
// Good: Specific context with actionable guidance
title: "We couldn't load your filters";
body: "One or more of your filters can't be used right now. You can check your filter queries and try again.";
action: 'Manage custom filters';
```

```tsx
// Good: Clear action failure with next steps
title: "We couldn't export your timeline";
body: 'Refresh the page and try again.';
```

```tsx
// Good: Specific to user action with clear guidance
title: "We couldn't move your card";
body: "The card couldn't be moved due to workflow restrictions. Check the work item's current status.";
```

#### ✅ Context-Aware for Different Users

```tsx
// Good: Different messages for admin vs end users
title: "We couldn't load your filters";
body: "One or more of your filters can't be used right now. You can check your filter queries and try again.";
action: 'Manage custom filters';

// End user variant
title: "We couldn't load your filters";
body: "One or more of your filters can't be used right now. Contact your Jira admin to check the filter queries, then try again.";
action: 'OK';
```

#### ✅ Progressive Error Information

```tsx
// Good: Escalating levels of detail based on user needs
title: "We couldn't save your changes";
body: 'Try again in a moment.';

// Detailed variant
title: "We couldn't save your changes";
body: 'The server is temporarily unavailable. Try again in a few minutes, or contact support if the problem persists.';
action: 'Contact support';
```

#### ✅ Time-Sensitive Context

```tsx
// Good: Acknowledges timing and provides appropriate actions
title: "We couldn't process your request";
body: 'The system is currently under heavy load. Your request will be processed automatically in a few minutes.';
```

#### ✅ Recovery-Oriented Messaging

```tsx
// Good: Focuses on recovery rather than failure
title: "We couldn't complete the export";
body: 'The export was interrupted. Select **Export** to start a new export.';
action: 'Export';
```

### Bad Error Flag Examples

#### ❌ Generic and Unhelpful

```tsx
// Bad: Too generic, no context
title: 'Something went wrong';
body: 'Reload the timeline to continue.';
```

```tsx
// Bad: Vague and not actionable
title: "Something's gone wrong";
body: 'You cannot star items right now due to an error.';
```

```tsx
// Bad: Apologetic but not helpful
title: "Sorry, something went wrong and we couldn't delete the issue type. Try again.";
```

#### ❌ Technical Jargon

```tsx
// Bad: Technical error details users don't understand
title: 'Database connection failed';
body: 'Error 500: Internal server error occurred during the operation.';
```

#### ❌ Blame-Focused Language

```tsx
// Bad: Blames the user
title: "You can't save your changes";
body: 'Your changes are invalid and cannot be saved.';
```

#### ❌ Overly Apologetic

```tsx
// Bad: Too much apologizing, not enough help
title: "We're so sorry, but we couldn't process your request";
body: "We apologize for the inconvenience. Please try again later. We're really sorry about this.";
```

#### ❌ Inconsistent Tone

```tsx
// Bad: Mixing formal and casual language
title: "We couldn't save your changes";
body: 'Oops! The server is having issues. Please retry your request at your earliest convenience.';
```

#### ❌ Missing Context

```tsx
// Bad: No indication of what failed or why
title: 'Error';
body: 'An error occurred.';
```

#### ❌ Overly Technical

```tsx
// Bad: Technical details that don't help users
title: 'HTTP 422 Unprocessable Entity';
body: "Validation failed: field 'summary' exceeds maximum length of 255 characters. Error code: VALIDATION_ERROR_001.";
```

### Error Taxonomy Categories

#### 1. **Operation Failure Errors**

- **When**: After a user action fails
- **Good**: "We couldn't [specific action]"
- **Bad**: "Something went wrong"
- **Examples**:
  - ✅ "We couldn't save your changes"
  - ✅ "We couldn't move your card"
  - ✅ "We couldn't delete the work item"
  - ❌ "Operation failed"
  - ❌ "Something went wrong"

#### 2. **Validation Errors**

- **When**: User input doesn't meet requirements
- **Good**: "We can't save your changes. [Specific reason]"
- **Bad**: "Invalid input"
- **Examples**:
  - ✅ "We can't save your changes. The summary is too long."
  - ✅ "We can't create this work item. The due date must be in the future."
  - ❌ "Validation error"
  - ❌ "Invalid data"

#### 3. **System-Level Errors**

- **When**: Server or system issues
- **Good**: "We couldn't load your data. Refresh the page and try again."
- **Bad**: "Server error occurred"
- **Examples**:
  - ✅ "We couldn't load your work items. Refresh the page and try again."
  - ✅ "We couldn't save your changes. The server is temporarily unavailable."
  - ❌ "Internal server error"
  - ❌ "System error"

#### 4. **Service/Network Errors**

- **When**: Network connectivity issues
- **Good**: "We couldn't connect to the server. Check your internet connection and try again."
- **Bad**: "Network error"
- **Examples**:
  - ✅ "We couldn't load your data. Check your internet connection and try again."
  - ✅ "We couldn't sync your changes. You may be offline."
  - ❌ "Network timeout"
  - ❌ "Connection failed"

#### 5. **Permissions & Authentication Errors**

- **When**: User lacks required permissions
- **Good**: "We can't perform this action. Contact your admin to request access."
- **Bad**: "Access denied"
- **Examples**:
  - ✅ "We can't delete this work item. Contact your admin to request delete permissions."
  - ✅ "We can't view this project. You don't have access to this project."
  - ❌ "Permission denied"
  - ❌ "Unauthorized"

#### 6. **Custom Workflow Errors**

- **When**: Workflow-specific restrictions
- **Good**: "We can't move this work item. It's currently in a status that prevents transitions."
- **Bad**: "Workflow error"
- **Examples**:
  - ✅ "We can't move this work item. It's currently in a status that prevents transitions."
  - ✅ "We can't assign this work item. The current workflow doesn't allow assignment."
  - ❌ "Workflow validation failed"
  - ❌ "Transition not allowed"

#### 7. **Data/Resource Errors**

- **When**: Data conflicts or resource limitations
- **Good**: "We can't create this work item. A duplicate already exists."
- **Bad**: "Resource conflict"
- **Examples**:
  - ✅ "We can't create this work item. A work item with this key already exists."
  - ✅ "We can't upload this file. It's too large."
  - ❌ "Duplicate key error"
  - ❌ "Resource limit exceeded"

#### 8. **Generic Errors** (Use sparingly)

- **When**: No specific context available
- **Good**: "We couldn't complete your request. Try again in a moment."
- **Bad**: "An error occurred"
- **Examples**:
  - ✅ "We couldn't complete your request. Try again in a moment."
  - ✅ "We couldn't process your action. Please try again."
  - ❌ "An error occurred"
  - ❌ "Unknown error"

### Quick Reference: Error Message Patterns

#### ✅ **Always Use These Patterns**

```tsx
// Pattern 1: Action-specific failure
title: "We couldn't [specific action]";
body: '[Actionable next step]';

// Pattern 2: Context + Solution
title: "We can't [prevented action]";
body: '[Reason]. [What user can do]';

// Pattern 3: Recovery-focused
title: "We couldn't [complete action]";
body: '[What happened]. [How to recover]';
```

#### ❌ **Never Use These Patterns**

```tsx
// Pattern 1: Generic failure
title: 'Something went wrong';
body: 'Try again';

// Pattern 2: Technical jargon
title: '[Error code]';
body: '[Technical details]';

// Pattern 3: Blame-focused
title: "You can't [action]";
body: 'Your [input] is invalid';
```

### Error Message Checklist

Before implementing an error flag, verify:

- [ ] **Title starts with "We can't" or "We couldn't"**
- [ ] **Description explains what happened in user terms**
- [ ] **Next steps are clear and actionable**
- [ ] **Tone is helpful, not blaming**
- [ ] **Language is at grade 7 or below**
- [ ] **No technical jargon or error codes**
- [ ] **Appropriate for user's role (admin vs end user)**
- [ ] **Consistent with other error messages in the feature**

## Selected Jira Terminology for Error Messages

**CRITICAL**: Always use current Jira Cloud terminology. Deprecated terms were replaced Feb
25, 2024.

### Current vs Deprecated Terms

| ✅ Use This           | ❌ Not This          | Context                                   |
| --------------------- | -------------------- | ----------------------------------------- |
| work item             | issue                | Individual piece of work                  |
| work items            | issues               | Plural form                               |
| work item fields      | issue fields         | Information about work                    |
| work type             | issue type           | Category of work (epic, task, story, bug) |
| work type hierarchy   | issue type hierarchy | Ladder of work from broad to granular     |
| assigned work items   | assigned issues      | Work assigned to someone                  |
| unassigned work items | unassigned issues    | Work not yet assigned                     |
| watch work items      | watch issues         | Monitoring updates                        |
| work item collectors  | issue collectors     | Bug reporting tools                       |

### Standard Terms (Shared with Jira Glossary)

**Work Types** (specific types):

- **epic**: Large body of work broken into smaller tasks (capitalize in UI: Epic ABC-123)
- **story**: Short requirements from user perspective
- **task**: Single work item broken down from epic
- **subtask**: Granular work broken down from task (one word, not "sub-task")
- **bug**: Problem impacting functionality or progress

**Project Terms**:

- **project**: Contains tasks to reach a goal
- **project permissions**: Admin-controlled access settings
- **team-managed project**: Simplified configuration (always hyphenated)
- **company-managed project**: Admin-managed uniform configuration (always hyphenated)

**Field Terms**:

- **field**: Input space capturing work information
- **work item fields**: Information about work (title, description, assignee, due date, status)
- **custom fields**: Fields created by admins or in team-managed projects

**Filter Terms**:

- **filter**: Saved work item searches using specified criteria
- **filters**: Multiple saved searches
- ✅ Say "clear filters" (preferred)
- ❌ Don't say "remove filters" or "delete filters" in user-facing messages

**User Roles**:

- **admin**: Person with administrative permissions
- **Jira admin**: Specific admin role (capitalize Jira)
- **assignee**: Person assigned to complete work item
- **reporter**: Person who creates work item

**User Actions**:

- **star/unstar**: Use for accessibility announcements (not "favorites" or "add to favorites")
- **add people**: Use when adding users to projects/boards (not "invite people")
- **email**: Use when referring to notifications (not "notify someone") - aligns with Notification
  settings terminology

### Capitalization Rules

**Don't capitalize** (unless at sentence start or in UI paths):

- work item, work type, project, board, sprint, epic, story, task, bug, subtask
- workflow, status, filter, timeline, field, admin, assignee, reporter

**Do capitalize**:

- Jira (always)
- Product names: Confluence, Trello, Bitbucket
- Field names in UI paths: "Select **Settings** then select **Products**"
- Proper nouns and acronyms

### Formatting Rules

**Hyphenation**:

- Always hyphenated: team-managed, company-managed, cross-project
- One word: workflow, swimlane, subtask, unmapped
- Two words: work item, work type, story points, time tracking

**Bold formatting**:

- Use **bold** for UI elements in instructions
- ✅ "Select **Settings** then select **Products**"
- ❌ Don't use quotation marks for UI elements

### Placeholders for Dynamic Content

Use these placeholder patterns in error messages:

```tsx
// Work item references
title: "We couldn't move {workItemType} {workItemKey}";
// Example: "We couldn't move Epic ABC-123"

// Generic work item
title: "We couldn't delete this work item";

// Field references
title: "We can't save your changes";
body: 'The {fieldName} is too long.';

// Project references
title: "We can't access this project";
body: "You don't have access to this project.";
```

### Common Terminology Mistakes

❌ **Don't use**:

- "issue" (use "work item")
- "issue type" (use "work type")
- "issues" when referring to Jira items (use "work items")
- "sub-task" or "sub task" (use "subtask")
- "remove filters" or "delete filters" (use "clear filters")
- "invite people" (use "add people")
- "favorites" or "add to favorites" (use "star" or "unstar")
- "notify someone" (use "email")
- "remove" for permanent deletion (use "delete")

✅ **Do use**:

- "issues" when meaning problems/difficulties (e.g., "server issues", "connectivity issues")
- Specific work type names when known (epic, task, story, bug, subtask)
- "work item" as generic fallback when specific type unknown
- "clear filters" when referring to removing applied filters
- "add people" when adding users to projects or boards
- "star/unstar" for accessibility announcements
- "email" when referring to notification actions

### Package and Technical Names

**Preserve these technical names** (don't update to new terminology):

- `@atlassian/jira-issue-error-flag` (package name)
- `jira-issue-error-flag` (import paths)
- Variable names in code: `issueKey`, `issueType` (unless refactoring)
- API response fields that use "issue"

These are technical identifiers and should remain unchanged for backward compatibility.

## Content guidelines to follow

<!-- Owner: jfleetwood@atlassian.com -->

This section provides comprehensive guidelines for LLMs to design effective error flags and
determine when to use them versus other UI components in Jira.

### When to use an error flag

- ✅ Use when the user has initiated a non-destructive action but the system is unable to complete
  it.
- ❌ Don't use when the action has completed successfully.
- ❌ Don't use when the user hasn't initiated the action yet.

### Content

Error flags must help the user recognize, diagnose, and recover from errors.

### Structure

Error flags have three major elements: heading, body, and links

**Heading:**

- **Content:** A high-level description of the error.
- Use H2.
- Use sentence case.
- Keep headings concise - maximum 2 lines.
- Start headings with "We" to avoid blaming the user.
  - ✅ "We can't save your changes".
  - ❌ "You can't save your changes".

**Body:**

- **Content:** Provide additional context for the user to understand the problem, reason for the
  error, and what specific action they should take next.
- **Length:** 1-3 lines.
- Avoid using "You" at the start of sentence:
  - ✅ "Save failed due to permissions."
  - ❌ "You can't save your changes due to permissions."
- Use full stops at the end of sentences.

**Links/CTAs:**

- Links MUST NOT be inline in the title or description. If you have text like "Something went wrong
  <a>try again</a>" that's an automatic fail. Use the "Example 2: Adding Action Button" example
  instead!
- Use when either of the following are true:
  - There's a system action the user can take to resolve the error.
  - There's additional content to help the user understand the error or learn how to prevent it.
- Max 2 links per flag, placed at bottom, separate from body copy.
- Each link should be a verb-led phrase of no more than 3 words.
  - Don't use "Learn more" as a lead-in verb
  - Examples:
    - ❌ "Learn more about project permissions"
    - ✅ "About project permissions"
    - ✅ "Contact admin"
    - ✅ "Refresh"

### General guidelines

#### Do

- **Use inclusive language** - avoid "Click to" or "Click here" (not everyone uses a mouse).
  - Use "Select" for desktop or "Tap" for mobile.
- **Use American English** - e.g. color not colour.
- **Keep copy at readability grade 7 or below** - check using The Hemingway app.
- **Capitalize product names** and most feature names - e.g. Jira.
  - More guidance in our naming hub.
- **Get to the point, fast** - tell users what they need to know.
- **Choose appropriate tone** (Voice and tone - Content - Atlassian Design System).
  - We're bold, optimistic, practical with a wink.
- **Be conversational** - read your copy out loud. Does it make sense or is it long-winded?

#### Do not

- **Avoid "please" or "thank you"** - that's reserved for times like major incidents.
- **Don't use abbreviations or acronyms**
- **Don't use symbols to communicate user paths** - spell it out instead.
  - Bold the UI label and use "select" not "click".
  - ✅ "To enable or disable local data storage: Select **Settings** then select **Products**."
  - ❌ "To enable or disable local data storage: Settings > Products."
- **Avoid 'directional' copy** - don't use "See this table below", "Check the information above".
- **Avoid specifying drag and drop** - this isn't inclusive for keyboard-only users.
  - Use "Move left", "Move right" instead.
- **Don't use emojis**

### Troubleshooting

#### Edge-cases

- **Dynamic content**: Use placeholder patterns inline with i18n patterns, eg. `{workItem}`
- **Permission errors**: You may have different messages based on audience and permissions, eg.
  admins vs users

#### Generic error without context

- Check surrounding code for error context
- Look at API calls or user actions
- Create specific body if context is clear

### Content quality checklist

- [ ] Error flag content uses `"We can't …"` or `"We couldn't …"` framing
- [ ] Errors have actionable next steps
- [ ] No generic "Something went wrong" content
- [ ] All content follows i18n patterns
