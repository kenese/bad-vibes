<!-- meta:
  mode: pair
  topic: storybook-examples
  audience: ai-agent
  model: sonnet-4
  token_budget: medium
  priority: high
  read_when: creating or extending Storybook examples files
  depends_on: [feature-gates-experiments.md, integration-testing.md]
  last_review: 2025-10-22
-->

<Self-Reflection>
- Storybook examples serve as visual documentation, development environment, and integration test fixtures
- Relay environment consistency is critical - same mock environment must be used throughout
- Mock data should be reusable and maintainable, not inline magic values
- Examples should cover success paths, error states, and edge cases systematically
</Self-Reflection>

<Where-To-Find-It>
- **Examples location**: `{package}/examples/{ComponentName}.examples.tsx`
- **Mock utilities**: Often in `{package}/tests/` directory
- **Relay mocks**: `@atlassian/relay-test-utils`
- **Feature flags**: `@atlassian/jira-flag-app` for `withFlags` decorator
- **Storybook**: `@storybook/react` for Meta types and decorators
</Where-To-Find-It>

<Core-Packages>
- Package: `@storybook/react`
  - Purpose: React-specific Storybook utilities
  - Key features: Meta types, decorators, addon-actions
  - Usage: All Storybook example files

- Package: `@atlassian/relay-test-utils`
  - Purpose: Relay mocking utilities for testing and Storybook
  - Key features: `createMockEnvironment`, `MockResponseRelay`, mock providers
  - Usage: Components using Relay for data fetching

- Package: `@atlassian/jira-flag-app`
  - Purpose: Feature flag decorator for Storybook
  - Key features: `withFlags` decorator for flag context
  - Usage: Stories that use feature gates

- Package: `@atlassian/jira-feature-gates-storybook-mocks`
  - Purpose: Feature gate mocking for Storybook
  - Key features: `withGate`, `passGate` for controlling feature flags in stories
  - Location: `/jira/src/packages/platform/feature-gates-storybook-mocks/`
  - Usage: Stories testing feature-flagged behavior </Core-Packages>

<Quick-Reference>
- **Environment consistency**: Create mock environment ONCE, use for both `loadQuery` and component rendering
- **Mock strategy**: Default stories use common mocks, error stories add custom overrides
- **Variable naming**: Use descriptive names (`schemeData`, `userData`) not generic `data`
- **Import order**: React → Relay → Storybook → Atlaskit → Context → Feature flags → Mocks → Component → Types
- **Feature flags**: Add `withGate()` decorator when component uses `fg()`
- **Reusable patterns**: Create render component that accepts optional mock overrides
</Quick-Reference>

# Storybook Examples for Jira Components

<Purpose>
Storybook examples serve multiple purposes in Jira frontend:
1. **Visual documentation** - Show component variations and usage patterns
2. **Development environment** - Isolated component development
3. **Integration test fixtures** - Stories are used by Playwright tests
4. **Mock data validation** - Verify component behavior with different data states
</Purpose>

<File-Structure>

## Location Conventions

```
{package}/
├── src/
│   └── Component.tsx
├── examples/
│   └── Component.examples.tsx
└── tests/
    ├── MockedRelayProvider.tsx  # Common mock utilities
    └── createMockData.tsx        # Mock data generators
```

## File Naming

- Pattern: `{ComponentName}.examples.tsx`
- Export: Named stories + default Meta export
- One file per major component </File-Structure>

<Critical-Patterns>

## 1. Environment Consistency (CRITICAL)

**Problem**: "usePreloadedQuery was passed a preloaded query that was created with a different
environment"

**Solution**: Create environment ONCE per story, use for both query loading and component rendering

```tsx
const RenderComponent = ({ gqlMocks }: { gqlMocks?: MockResponseRelay[] }) => {
	// Create environment once using useMemo
	const mockedEnvironment = useMemo(() => createMockEnvironment(gqlMocks), [gqlMocks]);

	// Load query using SAME environment
	const queryRef = useMemo(
		() => loadQuery<MyQuery>(mockedEnvironment, MY_QUERY, variables),
		[mockedEnvironment],
	);

	// Create provider using SAME environment
	const RelayEnvironment = useMemo(
		() => createMockRelayProvider(mockedEnvironment),
		[mockedEnvironment],
	);

	return (
		<RelayEnvironment>
			<MyComponent queries={{ queryRef }} />
		</RelayEnvironment>
	);
};
```

## 2. Mock Data Strategy

### Default Mocks Pattern

Create common mocks in a shared file, reuse across stories:

```tsx
// tests/MockedRelayProvider.tsx
export const queryMocks = {
	userQuery: {
		request: { query: USER_QUERY },
		result: { data: { user: MockUser } },
	},
	projectsQuery: {
		request: { query: PROJECTS_QUERY },
		result: { data: { projects: { nodes: [MockProject] } } },
	},
};
```

### Story Patterns

**Default Story (Success Path)**

```tsx
// Uses common mocks - no custom mocks needed
export const Default = () => <RenderComponent />;
```

**Error Story (Custom Mocks)**

```tsx
// Override specific queries, keep common mocks
export const ErrorState = () => {
	const customMocks = [
		{
			request: { query: MUTATION, variables: /.*/ },
			result: {
				data: {
					mutationName: {
						success: false,
						errors: [{ message: 'Something went wrong' }],
					},
				},
			},
		},
	];

	// Combine custom + common mocks
	return <RenderComponent gqlMocks={[...customMocks, ...Object.values(queryMocks)]} />;
};
```

## 3. Mock Data References

**DO**: Use mock data generators and references

```tsx
// tests/createMockUser.tsx
export const createMockUser = (overrides = {}) => ({
	__typename: 'User',
	id: 'user-123',
	name: 'Test User',
	email: 'test@example.com',
	...overrides,
});

// In examples:
const MockUser = createMockUser({ name: 'Custom Name' });
```

**DON'T**: Inline magic values

```tsx
// ❌ Bad
const user = {
	id: 'abc123',
	name: 'John',
	// Missing __typename, incomplete fields
};
```

## 4. Variable Naming

**DO**: Descriptive variable names

```tsx
const userData = usePreloadedQuery(graphql`...`, queries.userQuery);
const schemeData = usePreloadedQuery(graphql`...`, queries.schemeQuery);
const fieldConfig = userData?.node?.fieldConfig;
```

**DON'T**: Generic names

```tsx
const data = usePreloadedQuery(graphql`...`, queries.userQuery); // ❌ Too generic
const data2 = usePreloadedQuery(graphql`...`, queries.schemeQuery); // ❌ Numbered variables
```

</Critical-Patterns>

<Standard-Implementation>

## Complete Example Structure

```tsx
/**
 * Storybook examples for MyComponent
 */
import React, { useMemo } from 'react';
import { loadQuery } from 'react-relay';
import type { Meta } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { withFlags } from '@atlassian/jira-flag-app/src/index.tsx';
import { withGate } from '@atlassian/jira-feature-gates-storybook-mocks';
import type { MockResponseRelay } from '@atlassian/relay-test-utils';
import {
	createMockRelayProvider,
	createMockEnvironment,
	queryMocks,
} from '../tests/MockedRelayProvider.tsx';
import { createMockData } from '../tests/createMockData.tsx';
import { MyComponent } from '../src/MyComponent.tsx';
import MY_QUERY, { type MyQuery } from '../src/__generated__/MyQuery.graphql.ts';
import MY_MUTATION from '../src/__generated__/MyMutation.graphql.ts';

// Mock data setup
const MockData = createMockData({
	name: 'Test Data',
	description: 'Example mock data',
});

// Reusable render component
const RenderComponent = ({ gqlMocks }: { gqlMocks?: MockResponseRelay[] }) => {
	const mockedEnvironment = useMemo(() => createMockEnvironment(gqlMocks), [gqlMocks]);

	const queryRef = useMemo(
		() =>
			loadQuery<MyQuery>(mockedEnvironment, MY_QUERY, {
				id: MockData.id,
			}),
		[mockedEnvironment],
	);

	const RelayEnvironment = useMemo(
		() => createMockRelayProvider(mockedEnvironment),
		[mockedEnvironment],
	);

	return (
		<RelayEnvironment>
			<MyComponent
				queries={{ queryRef }}
				props={{
					onSuccess: action('onSuccess'),
					onError: action('onError'),
				}}
				entryPoints={{}}
				extraProps={{}}
			/>
		</RelayEnvironment>
	);
};

// Stories
export const Default = () => <RenderComponent />;

export const ErrorState = () => {
	const errorMocks = [
		{
			request: { query: MY_MUTATION, variables: /.*/ },
			result: {
				data: {
					myMutation: {
						success: false,
						errors: [{ message: 'Operation failed' }],
					},
				},
			},
		},
	];

	return <RenderComponent gqlMocks={[...errorMocks, ...Object.values(queryMocks)]} />;
};

// Meta configuration
const meta: Meta<typeof MyComponent> = {
	component: MyComponent,
	decorators: [
		withFlags,
		withGate('my-feature-flag'), // Only if component uses fg()
	],
};

export default meta;
```

## Import Order (Strict)

1. React core
2. Relay
3. Storybook
4. Atlaskit components
5. Context providers (Modal, Flag)
6. Feature flags
7. Mock utilities
8. Component under test
9. Generated types

```tsx
// 1. React
import React, { useMemo } from 'react';

// 2. Relay
import { loadQuery, usePreloadedQuery } from 'react-relay';

// 3. Storybook
import type { Meta } from '@storybook/react';
import { action } from '@storybook/addon-actions';

// 4. Atlaskit
import ModalDialog from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';

// 5. Context providers
import { ModalContextProvider } from '@atlassian/entry-point-modal-context/ModalContextProvider';

// 6. Feature flags
import { withFlags } from '@atlassian/jira-flag-app/src/index.tsx';
import { withGate } from '@atlassian/jira-feature-gates-storybook-mocks';

// 7. Mock utilities
import type { MockResponseRelay } from '@atlassian/relay-test-utils';
import { createMockEnvironment, queryMocks } from '../tests/MockedRelayProvider.tsx';

// 8. Component
import { MyComponent } from '../src/MyComponent.tsx';

// 9. Generated types
import MY_QUERY, { type MyQuery } from '../src/__generated__/MyQuery.graphql.ts';
```

</Standard-Implementation>

<Feature-Flag-Integration>

## When Component Uses Feature Gates

If component code contains `fg('feature-flag-name')`:

1. **Import the decorator**:

   ```tsx
   import { withGate } from '@atlassian/jira-feature-gates-storybook-mocks';
   ```

2. **Add to meta decorators**:

   ```tsx
   const meta: Meta<typeof Component> = {
   	component: Component,
   	decorators: [
   		withFlags,
   		withGate('feature-flag-name'), // Match the flag in component code
   	],
   };
   ```

3. **For integration tests**: If story is used by Playwright, also add:

   ```tsx
   import {
   	withFeatureFlagsKnob,
   	featureFlagArgTypes,
   } from '@atlassian/jira-feature-flagging-integration-testing-utils/src/utils/index.tsx';

   const meta: Meta<typeof Component> = {
   	component: Component,
   	decorators: [
   		withFlags,
   		withGate('feature-flag-name'),
   		withFeatureFlagsKnob, // For Playwright control
   	],
   	argTypes: {
   		...featureFlagArgTypes, // Exposes flag controls
   	},
   };
   ```

See [Feature Gates](./feature-gates-experiments.md) and
[Integration Testing](./integration-testing.md) for more details.

</Feature-Flag-Integration>

<Modal-Components>

For components rendered in modals:

```tsx
import ModalDialog from '@atlaskit/modal-dialog';
import { ModalContextProvider } from '@atlassian/entry-point-modal-context/ModalContextProvider';

const RenderModal = ({ gqlMocks }: { gqlMocks?: MockResponseRelay[] }) => {
	// ... environment setup ...

	return (
		<RelayEnvironment>
			<ModalContextProvider>
				<ModalDialog onClose={action('onClose')}>
					<MyModalComponent
						queries={{ queryRef }}
						props={{
							onClose: action('onClose'),
							setShouldCloseOnEscapePress: action('setShouldCloseOnEscapePress'),
							setShouldCloseOnOverlayClick: action('setShouldCloseOnOverlayClick'),
						}}
					/>
				</ModalDialog>
			</ModalContextProvider>
		</RelayEnvironment>
	);
};
```

</Modal-Components>

<Common-Patterns>

## Loading States

```tsx
export const Loading = () => {
	const loadingMocks = [
		{
			request: { query: MY_QUERY },
			result: { data: null }, // Will show loading state
			delay: Infinity, // Never resolves
		},
	];

	return <RenderComponent gqlMocks={loadingMocks} />;
};
```

## Empty States

```tsx
export const EmptyState = () => {
	const emptyMocks = [
		{
			request: { query: MY_QUERY },
			result: {
				data: {
					items: { nodes: [] },
				},
			},
		},
	];

	return <RenderComponent gqlMocks={[...emptyMocks, ...Object.values(queryMocks)]} />;
};
```

## Error States

```tsx
export const NetworkError = () => {
	const errorMocks = [
		{
			request: { query: MY_QUERY },
			error: new Error('Network error'),
		},
	];

	return <RenderComponent gqlMocks={[...errorMocks, ...Object.values(queryMocks)]} />;
};
```

</Common-Patterns>

<Implementation-Checklist>

Before considering examples complete:

- [ ] Environment created once per story with `useMemo`
- [ ] Same environment used for `loadQuery` and `createMockRelayProvider`
- [ ] Default story uses common `queryMocks` without custom overrides
- [ ] Error stories combine custom mocks with common mocks
- [ ] Reusable render component accepts optional `gqlMocks` parameter
- [ ] Mock data uses generators/helpers (not inline magic values)
- [ ] Descriptive variable names for query results (not generic `data`)
- [ ] Proper import order followed
- [ ] Feature flags integrated with `withGate()` if component uses `fg()`
- [ ] Meta export includes all required decorators
- [ ] Action handlers use `action()` from Storybook
- [ ] TypeScript types for queries and props
- [ ] No ESLint errors (`read_lints` passes)

</Implementation-Checklist>

<Troubleshooting>

## "Different environment" Error

**Error**: "usePreloadedQuery was passed a preloaded query that was created with a different
environment"

**Fix**: Ensure same `mockedEnvironment` used for both `loadQuery` and `createMockRelayProvider`:

```tsx
// ✅ Correct
const mockedEnvironment = useMemo(() => createMockEnvironment(gqlMocks), [gqlMocks]);
const queryRef = useMemo(() => loadQuery(mockedEnvironment, QUERY, vars), [mockedEnvironment]);
const RelayEnvironment = useMemo(
	() => createMockRelayProvider(mockedEnvironment),
	[mockedEnvironment],
);

// ❌ Wrong - creating separate environments
const queryRef = loadQuery(createMockEnvironment(gqlMocks), QUERY, vars);
const RelayEnvironment = createMockRelayProvider(createMockEnvironment(gqlMocks));
```

## Mock Not Applied

**Problem**: Custom mock not being used, default behavior appears

**Fix**: Check mock request matching and ensure custom mocks come BEFORE common mocks:

```tsx
// ✅ Correct order
<RenderComponent gqlMocks={[...customMocks, ...Object.values(queryMocks)]} />

// ❌ Wrong - common mocks override custom
<RenderComponent gqlMocks={[...Object.values(queryMocks), ...customMocks]} />
```

## Feature Flag Not Working

**Problem**: Feature-gated code not rendering

**Fix**: Add both decorators to meta:

```tsx
const meta: Meta<typeof Component> = {
	component: Component,
	decorators: [
		withFlags, // ✅ Required for flag context
		withGate('my-flag'), // ✅ Required to enable specific gate
	],
};
```

</Troubleshooting>

<Navigation-For-LLM-Agents>

**Prerequisites** (read BEFORE starting):

- [Feature Gates](./feature-gates-experiments.md) - for feature flag integration patterns
- [Integration Testing](./integration-testing.md) - if examples will be used in tests

**Workflow Dependencies** (consult DURING implementation):

- Check existing mock utilities in `{package}/tests/` directory
- Look for similar examples in the same package or related packages
- Verify component's feature gate usage for decorator requirements

**Validation Checkpoints** (verify AFTER implementation):

- Run `read_lints(['path/to/examples.tsx'])` and fix all errors
- Test stories in Storybook to verify rendering
- Verify environment consistency (no "different environment" errors)
- Check that feature flags work if component uses them

**Conditional Navigation**:

- IF component uses modals → See Modal Components section
- IF used in Playwright tests → Add `withFeatureFlagsKnob` decorator
- IF component has loading states → Add Loading story pattern
- IF component has error handling → Add error state stories

</Navigation-For-LLM-Agents>
