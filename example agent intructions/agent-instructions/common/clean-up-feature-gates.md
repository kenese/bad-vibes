<!-- meta:
  mode: default
  topic: clean-up-feature-gates-and-experiments
  audience: ai-agent
  model: sonnet-4
  token_budget: medium
  read_when: cleaning up or removing feature gates or experiments
  depends_on: []
  last_review: 2025-10-03
-->

# Feature Gate cleanup

-`#{GATEXP}` refers to a "Feature Gate", "Feature Flag" or an "Experiment".

- `#{CLEANUP_STATE}` refers to the code path we evaluate the feature gate to when removing code. The
  assumption that `fg()` always returns `true` unless otherwise stated.

- For Switcheroo URLs, the feature gate is the last path of the URL e.g
  `https://switcheroo.atlassian.com/ui/gates/.../key/#{GATEXP}`,

- Do not transition or change the status of any Jira tickets.

Important: `#{GATEXP}` should be recognized as one word. There could be no variation in spelling or
spacing.

<Core-Packages>

**Package**: `@atlassian/jira-feature-gates-test-mocks`

- Purpose: Provides testing utilities for mocking feature gate behavior in unit tests and storybooks
- Key features:
  - `passGate()` function to mock feature gates as enabled/passing
  - `failGate()` function to mock feature gates as disabled/failing
  - Test isolation and cleanup utilities
  - Integration with Jest testing framework
- Imports: `import { passGate, failGate } from '@atlassian/jira-feature-gates-test-mocks';`
- Usage: Unit tests and storybook stories that need to test different feature gate states

**Package**: `@atlassian/jira-feature-gating`

- Purpose: Provides the core feature gating functionality for runtime feature flag evaluation
- Key features:
  - `fg()` function for checking feature gate status
  - Runtime feature flag evaluation
  - Integration with Jira's feature management system
  - Type-safe feature gate checking
- Imports: `import { fg } from '@atlassian/jira-feature-gating';`
- Usage: All components and code that need to conditionally render or execute based on feature flags

</Core-Packages>

<Managing-Remove-Feature-Gate-Jira-Work-Item>

### Only execute the instructions in this block if the agent has capabilities to update and create Jira Work Items

- When instructed to create a ticket, **Always** first search for a ticket of item type
  `Remove Feature Flag` that refers to the exact gate. This is not the `FD` or `Feature Delivery`
  Work item, which has the type `New Feature`. Only if no matching tickets are found, create a new
  Jira work item titled `FG Cleanup - #{GATEXP}` of type `Remove Feature Flag`.
- Add `afm-ai-rules-assisted` to the labels field of the existing or newly created ticket. Set
  Assignee field to the person who is making this prompt or request, this will be the `user`.
- Continue with the Feature gate Clean-up

</Managing-Remove-Feature-Gate-Jira-Work-Item>

### Cleanup procedure

Prefer `grep tool` over `grep bash` to search operation.

**Produce minimal changes** - The intention is to remove the `fg()` without altering any existing
logic. Keep code changes to minimal and only do what is necessary. Do not refactor code

### Simple pass

In some cases user might ask to perform a "specific" cleanup of a feature gate. In this case skip
the "simple pass" and continue with "Advanced cleanup".

Simple cleanup is only applicable if `#{CLEANUP_STATE}` set to `true`. Reverse cleanup is not
supported.

- Collect information about call sites - perform search for `#{GATEXP}` in the code
- Use a codemod to automate the process to perform 90% of the work.
  - review the changes being made to the current branch (run `git diff`). You shall not interfere
    with it, user knows better.
  - perform `afm fg-cleanup #{GATEXP}`. Just run this command without any extra steps of folder
    change.
  - review the changes made using `git --no-pager diff --unified=12`.
    - note - we "expand" the diff to 12 lines to get better context of the changes.
    - A lot of changes can be seen as a "clear cut" (consult with expected result via ##Examples
      below) and can be accepted as is.
    - Some changes may need further verification or cleanup. Keep in mind **fg-cleanup can make
      mistakes**
    - If you see any mistakes or changes that "should have" been handled by "Advanced cleanup", undo
      the changes and start from "Advanced cleanup" section.
  - `fg-cleanup` will remove all unused imports. If you dont see any other usages of `#{GATEXP}`, we
    are done.

Note: `afm fg-cleanup`

- will handle:
  - unit tests
  - components
  - import conditions
  - running eslint on the updated code
  - removing no longer needed imports
  - running eslint on top of changed files
- will NOT handle:
  - GraphQL
  - i18n messages (requires manual cleanup - see Advanced cleanup instructions)
  - address comments

**Important**: After running `afm fg-cleanup`, always check for unused message keys in any
messages.tsx files that were affected by the feature gate removal. Use the systematic approach
outlined in [unused message key cleanup instructions](./unused-message-key-cleanup.md).

### Advanced cleanup

Continue with extra steps if `#{GATEXP}` is not fully cleaned up or if diff raised concerns.

- **Remove the feature flag condition** - Remove code paths that are not executable when `fg`
  evaluates to the `#{CLEANUP_STATE}`
  - this step should be covered by `afm fg-cleanup` in most cases
- **Remove comments referencing the flag** - For all comments referencing the feature gate, execute
  the suggestion and then remove the comment. Do not add new comments referencing the gate.
- **Keep only the "new" code path** - Delete the legacy/fallback code
- **Update TypeScript types** - Address Comments that contain the feature gate and follow
  instructions such as removing optional markers (`?`) from new fields
- **Update i18n messages** - Use new message keys and remove unused messages as a result of the
  clean up. Follow the [unused message key cleanup instructions](./unused-message-key-cleanup.md) to
  systematically identify and remove unused message keys from messages.tsx files
- **Clean unit tests and storybook** - Clean up mocking of the feature gate in unit tests and story
  book often mocked by the methods `passGate` and `failGate`
- **Remove used imports and variables** - Remove unused imports as a result of code removal, For
  example import of functions `fg` if it is no longer used in the file. Also remove unused
  variables.
- **Clean up GraphQL** - Clean up `@include` or `@skip` directives. Remove the argument definitions
  if it the clean up results in the argument is always set to `#{CLEANUP_STATE}` such as `true` or
  `false`.

### Finalization

You dont need to run tests, lint or build to verify the change. Leave this to the user.

## Examples

### 1. Basic Conditional Cleanup

**Before cleanup:**

```tsx
if (fg('my-feature-gate')) {
	// New feature code
	return <NewComponent />;
}
// Legacy code
return <OldComponent />;
```

**After cleanup:**

```tsx
// New feature code
return <NewComponent />;
```

**Before cleanup (ternary):**

```tsx
const component = fg('my-feature-gate') ? <NewComponent /> : <OldComponent />;
const numExcludedReleases = fg('my-feature-gate')
	? numberSelectedReleases
	: numExcludedReleasesLEGACY;
```

**After cleanup:**

```tsx
const component = <NewComponent />;
const numExcludedReleases = numberSelectedReleases;
```

### 2. Inline Feature Flag Cleanup

**Before cleanup:**

```tsx
const isCsmProject = (projectType: ProjectType) => {
	return projectType === CUSTOMER_SERVICE_PROJECT && fg('my-feature-gate');
};
```

**After cleanup:**

```tsx
const isCsmProject = (projectType: ProjectType) => {
	return projectType === CUSTOMER_SERVICE_PROJECT;
};
```

### 3. Hook Feature Flag Cleanup

**Before cleanup:**

```tsx
const Component = () => {
	let someValue;

	if (fg('my-feature-gate')) {
		// eslint-disable-next-line react-hooks/rules-of-hooks
		({ someValue } = useSomeHook());
	}

	return (
		<Box xcss={fg('my-feature-gate') && someValue ? newStyle : oldStyle}>
			<Content />
		</Box>
	);
};
```

**After cleanup:**

```tsx
const Component = () => {
	const { someValue } = useSomeHook();

	return (
		<Box xcss={someValue ? newStyle : oldStyle}>
			<Content />
		</Box>
	);
};
```

### 4. GraphQL Query Field Cleanup

**Before cleanup (query usage):**

- If the clean up of the argument is only based on the feature gate and cleaning it up will make it
  always evaluate to `#{CLEANUP_STATE}`. Delete the argument completely

```tsx
graph`
fragment processFields on JiraIssueFieldConfig
 @argumentDefinitions(isIncludeNewFieldFG: { type: "Boolean", defaultValue: false }) {
  id
  name
  newField @include(if: $isIncludeNewFieldFG)
 }
`;

refetch({ isIncludeNewFieldFG: fg('my-feature-gate') });
```

**After cleanup:**

- Assuming `#{CLEANUP_STATE}` is `true`.

```tsx
graph`
fragment processFields on JiraIssueFieldConfig {
 id
 name
 newField
}
`;

refetch({});
```

### 5. Props and API Types Cleanup

**Before cleanup:**

```tsx
type ApiResult = {
	isDone: boolean;
	newField?: NewFieldType; // Clean up optional when removing FG my-feature-gate
};
```

**After cleanup:**

```tsx
type ApiResult = {
	isDone: boolean;
	newField: NewFieldType;
};
```

### 9. Destructuring Cleanup

**Before cleanup:**

```tsx
const { valueA, valueB, ...rest } = obj;

if (!fg('my-feature-gate')) {
	if ('valueB' in obj) {
		methodCall({ ...rest, valueB });
	}
}
```

**After cleanup:**

```tsx
const { valueA, valueB, ...rest } = obj;
methodCall(rest);
```

### 10. i18n Messages Cleanup

**Before cleanup:**

```tsx
const messages = defineMessages({
	oldTitle: { id: 'old.title', defaultMessage: 'Old Title' },
	newTitle: { id: 'new.title', defaultMessage: 'New Title' },
});

const Component = () => {
	const { formatMessage } = useI18n();
	return <h1>{formatMessage(fg('my-feature-gate') ? messages.newTitle : messages.oldTitle)}</h1>;
};
```

**After cleanup:**

```tsx
const messages = defineMessages({
	title: { id: 'new.title', defaultMessage: 'New Title' },
});

const Component = () => {
	const { formatMessage } = useI18n();
	return <h1>{formatMessage(messages.title)}</h1>;
};
```

**Note**: After removing the feature gate and cleaning up the messages, verify that no other message
keys in the same messages.tsx file have become unused. Follow the
[unused message key cleanup process](./unused-message-key-cleanup.md) to identify and remove any
additional unused keys that may have been orphaned by the feature gate removal.

### 11. Unit tests and storybook passGate and failGate Cleanup

**Before cleanup:**

```tsx
describe('MyComponent', () => {
	it('should render new feature when gate is enabled', () => {
		passGate('my-feature-gate');
		render(<MyComponent />);
		expect(screen.getByText('New Feature')).toBeInTheDocument();
	});

	it('should render old feature when gate is disabled', () => {
		failGate('my-feature-gate');
		render(<MyComponent />);
		expect(screen.getByText('Old Feature')).toBeInTheDocument();
	});
});
```

**After cleanup:**

```tsx
describe('MyComponent', () => {
	it('should render the feature', () => {
		render(<MyComponent />);
		expect(screen.getByText('New Feature')).toBeInTheDocument();
	});
});
```

**Before cleanup (Storybook):**

```tsx
export const Default = {
 passGate('my-feature-gate');
   return <Example/>;
}
```

**After cleanup:**

```tsx
export const Default = {
   return <Example/>;
}
```

### 12. componentWithFg Cleanup

**Before cleanup:**

```tsx
export default componentWithFg('my-feature-gate', NewComponent, OldComponent);
```

**After cleanup:**

```tsx
export default NewComponent;
```

### 13. Performance hooks

**Before cleanup:**

```tsx
export default memoWithCondition(
	() => fg('my-feature-gate'),
	(props) => {
		const stable = useShallowStableReference(props, fg('my-feature-gate'));
		const data = useMemoWithCondition(
			() => stable,
			[stable],
			() => fg('my-feature-gate'),
		);
		const onClick = useCallbackWithCondition(
			() => {
				report(data);
			},
			[data],
			() => fg('my-feature-gate'),
		);
	},
});
```

**After cleanup:**

```tsx
export default memo((props) => {
	const stable = useShallowStableReference(props);
	const data = useMemo(() => stable, [stable]);
	const onClick = useCallback(() => {
		report(data);
	}, [data]);
});
```
