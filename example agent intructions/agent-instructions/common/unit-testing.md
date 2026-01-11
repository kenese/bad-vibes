<!-- meta:
  mode: pair
  topic: unit-testing
  audience: ai-agent
  model: sonnet-4
  token_budget: medium
  priority: critical
  read_when: writing unit tests
  depends_on: []
  last_review: 2025-09-02
-->

<Core-Packages>
- File name should be `test.tsx` in the same folder, if the file exists and tests are written for the same `view` or `index` file, add them to the existing one. If the tests are written for a different file, then create a new file with `{filename}.test.tsx` and add the tests there.
- Package: `@atlassian/jira-testing-library`

- Purpose: Unified testing utilities for Jira frontend, built on React Testing Library with Magnetic
  DI support.
- Key features:
  - Component rendering with dependency injection (`renderWithDi`)
  - Component rendering with SSR support (`renderWithHydration`)
  - Hook testing (`renderHook`)
  - User event simulation (`userEvent`)
  - Custom queries and matchers for Jira's environment.
- Location: `/jira/src/packages/platform/testing-library/`
- Usage: The primary tool for testing React components, hooks, and UI-related logic.

- Package: `jest` (with Jira configuration)
  - Purpose: Core testing framework for all JavaScript/TypeScript code.
  - Key features:
    - Test runners, matchers, mocking, coverage reporting.
  - Usage: Business logic, utilities, services, data transformations, algorithms.

- Package: `react-magnetic-di`
  - Purpose: Dependency injection for both React and non-React code.
  - Key features:
    - `injectable` for mocking dependencies.
    - `runWithDi` for non-React DI execution.
  - Usage: Consistent DI patterns across the entire codebase.

- Package: `@atlassian/jira-feature-gates-test-mocks`
  - Purpose: Feature gate and experiment mocking utilities for tests.
  - Key features:
    - `passGate`, `failGate`, `mockExp` helpers.
  - Usage: Unit and integration tests involving feature gates/experiments. See
    [feature-gates-experiments.md](./feature-gates-experiments.md) for more details.

- Package: `@atlassian/jira-relay-test-utils`
  - Purpose: Relay environment and payload mocking for tests.
  - Key features:
    - `createMockEnvironment`, `MockPayloadGenerator`.
  - Usage: Testing Relay-based components and hooks </Core-Packages>

<Quick-Reference>
- **Import all testing utilities from `@atlassian/jira-testing-library`** – single entry point for
  Jira testing
- **Use standard Jest for non-UI code** – business logic, utilities, services
- **Always use `renderWithDi`** for component testing
- **Use `renderHook`** for isolated hook testing with DI support
- **Use `runWithDi`** for non React code
- **Mock dependencies with `injectable`** where possible, fallback `jest.mock()` for modules when
  necessary
- **Feature flag testing is mandatory** for ALL code that uses flags
- **Never use cleanups** – all possible resets and cleanup are or should be automated
- **Use mock containers for context providers** – don't mock getters directly
- To **run test** use `afm test <path-to-test-file>` (this is shortcut for jest)
</Quick-Reference>

# Unit testing rules

- Test the logic of a component without relying on the underlying implementations/functions.
- Write enough tests to cover all code paths for a component, we should be only relying on
  Playwright integration testing (see [integration testing instructions](./integration-testing.md))
  for when wiring is super complex and not manageable.
- If need be, simulate error responses (e.g. `4xx`, `5xx`) and verify component behaviour.
- Test hooks independently if their logic is complex enough.
- Isolate non-UI logic for fast, reliable feedback.

## Mocking modules and functions

- Use `jest.mock('module-path')` to mock an entire module or cut dependencies to speed up tests,
  otherwise use `magnetic-di` to mock related module or functions. Do not overuse this
  functionality.
- For components that wrap third-party libraries, use `injectable` from `react-magnetic-di` to mock
  the whole module.

  ```tsx
  import { incrementMetric } from 'utilities/metrics';
  import { injectable } from 'react-magnetic-di';
  import axios from 'axios';
  import { ComponentName } from './index.tsx';
  // ...
  const axiosMock = jest.fn();
  const incrementMetricMock = jest.fn();
  const deps = [injectable(axios, axiosMock), injectable(incrementMetric, incrementMetricMock)];
  // ...
  it('', () => {
  	const { container } = renderWithDi(<ComponentName />, deps);

  	await expect(container).toBeAccessible();
  });
  ```

- When testing hooks, use the `renderHook` from `@atlassian/jira-testing-library/src/main.tsx`:

  ```tsx
  import { renderHook } from '@atlassian/jira-testing-library/src/main.tsx';
  import { useCustomHook } from './index.tsx';

  const mockUseCustomHookProps = {
  	property: 'Value',
  };

  describe('useCustomHook', () => {
  	const deps = [injectable(someDependency, someDependencyMock)];

  	beforeEach(() => {
  		jest.resetAllMocks();
  	});

  	it('should set the default state to valid when the queryFieldDefaultValue prop is empty', () => {
  		const hookResult = renderHook(() => useCustomHook(mockUseCustomHookProps), {
  			args: [],
  			dependencies: deps,
  		});
  		expect(hookResult.current.lastValidationResult.type).toEqual('valid');
  	});
  });
  ```

- Use the `act` utility from `@atlassian/jira-testing-library` to run the asynchronous logic inside
  the hook:

  ```tsx
  import { act } from '@atlassian/jira-testing-library';
  import { performGetRequest } from '@atlassian/jira-fetch/src/utils/requests.tsx';
  import { renderHook } from '@atlassian/jira-testing-library/src/main.tsx';
  import { useFetchFieldNameService, type ResponseShape } from './index.tsx';

  jest.mock('@atlassian/jira-fetch/src/utils/requests.tsx');

  const defaultResponse: ResponseShape = {
  	values: [
  		{
  			name: 'My custom field name',
  		},
  	],
  };

  describe('useFetchFieldNameService', () => {
  	const performGetRequestMock: jest.MockedFunction<
  		(...args: [string]) => Promise<ResponseShape>
  	> = performGetRequest;
  	const customFieldId = '12345';

  	beforeEach(() => {
  		jest.resetAllMocks();
  	});

  	it('should return default state', async () => {
  		// Mock response with a delay so we can get the initial state first
  		performGetRequestMock.mockReturnValue(new Promise(() => {}));
  		let hookValue: Record<string, any> = {};
  		await act(async () => {
  			hookValue = renderHook(() => useFetchFieldNameService(customFieldId), {
  				args: [],
  			});
  		});

  		const defaultState = {
  			data: undefined,
  			loading: true,
  			error: undefined,
  		};

  		expect(hookValue.current).toEqual(defaultState);
  	});
  });
  ```

## Test structure

- Use the utility functions from `@atlassian/jira-testing-library` like `renderWithDi` and `screen`.
- Use the `injectable` from `react-magnetic-di` to provide dependencies to components.
- Use `describe` blocks to group related tests or break up large tests.
- Use `beforeEach` for common setup.
- Prefer `screen.getByRole`, `screen.getByText`, `screen.getByLabelText`,
  `screen.getByPlaceHolderText`, `screen.getByDisplayValue` over `screen.getByTestId` when asserting
  conditions.
- Do not rely on the result of above queries to fail a test, always explicitly assert `visibility`,
  or `toBeInTheDocument` checks. Example:

  ```tsx
  import { injectable } from 'react-magnetic-di';
  import { renderWithDi, screen } from '@atlassian/jira-testing-library';
  import { ComponentName } from '../component/path/index.tsx';

  const dept = [
  	injectable(ComponentName, () => (
  		<div data-testid="calendar.ui.calendar-top-controls-bar">TopControls</div>
  	)),

  	injectable(hookName, mockHookName),
  ];

  function TestWrapper() {
  	return <ComponentName />;
  }

  describe('Example Component', () => {
  	beforeEach(() => {});

  	it('Test body', () => {
  		renderWithDi(<TestWrapper />, deps);

  		expect(screen.queryByText('some text')).not.toBeInTheDocument();
  	});
  });
  ```

- Use `passGate` and `failGate` utility functions from `@atlassian/jira-feature-gates-test-mocks` to
  mock feature gates if test cases don't exists with or without the gate. Example:
  ```tsx
  it('test description', () => {
  	passGate('feature_gate_name');
  	renderWithDi(<Container {...defaultProps} />, commonDeps);
  });
  ```
- When testing functionality with a feature gate in consideration you can use the `fg` utility to
  check results:

  ```tsx
  test('should provide answer for the universe', () => {
  	expect(answer()).toBe(fg('know-the-meme') ? 42 : 24);
  });
  ```

- Use `await` in `async` test functions to test asynchronous logic like user events.
- Use the `userEvent` from `@atlassian/jira-testing-library` to simulate user events rather than
  relying on methods available on selectors. Example:

  ```tsx
  import { renderWithDi, screen, userEvent } from '@atlassian/jira-testing-library';

  const expectedCallbackObject = {
  	//...
  } as const;

  it('test description', async () => {
  	renderWithDi(<Component {...defaultProps} updateEvent={updateEventMock} />);

  	await userEvent.click(screen.getByRole('button', { name: 'button name' }));
  	expect(updateEventMock).toHaveBeenCalledWith(expectedCallbackObject);

  	// or
  	await userEvent.type(screen.getByRole('textbox'), 'something');
  });
  ```

- If the components are using `react-relay`, use the `createMockEnvironment` from
  `@atlassian/jira-relay-test-utils/src/ui/mock-environment/index.tsx` and
  `RelayEnvironmentProvider` from `react-relay` to setup the test.

  ```tsx
  import { RelayEnvironmentProvider } from 'react-relay';
  import { injectable } from 'react-magnetic-di';
  import { createMockEnvironment } from '@atlassian/jira-relay-test-utils/src/ui/mock-environment/index.tsx';
  import { act, renderHook } from '@atlassian/jira-testing-library';
  import { customHook } from './index.tsx';
  import { useOtherHook } from './dependency-hook/index.tsx';
  describe('Custom hook', () => {
  	const useOtherHookMock = jest.fn().mockReturnValue({
  		property: 'value',
  	});

  	const mockEnvironment = createMockEnvironment();

  	const wrapper = ({ children }: { children: React.ReactNode }) => (
  		<RelayEnvironmentProvider environment={mockEnvironment}>
  			<SidebarsContextProvider>{children}</SidebarsContextProvider>
  		</RelayEnvironmentProvider>
  	);

  	it('should be ready after hydration completes', async () => {
  		let hookValue: Record<string, any> = {};

  		await act(async () => {
  			hookValue = renderHook(() => customHook(), {
  				wrapper,
  				dependencies: [injectable(useOtherHook, useOtherHookMock)],
  			});
  		});

  		expect(hookValue.current.isReady).toBe(true);
  	});
  });
  ```

- Use `environment.mock.queueOperationResolver` and `MockPayloadGenerator.generate` to automatically
  mock all graphql queries/fragments in the component.

  ```tsx
  import { MockPayloadGenerator } from 'relay-test-utils';

  environment.mock.queueOperationResolver((operation) =>
  		MockPayloadGenerator.generate(operation, {
  				Sprint: () => {
  						name: 'my awesome Sprint',
  				},
  		}),
  );
  ```

- If a component is exporting a fragment wrap it with a test query:

  ```tsx
  import React from 'react';
  import { createMockEnvironment, MockPayloadGenerator } from 'relay-test-utils';
  import { injectable } from 'react-magnetic-di';
  import { RelayEnvironmentProvider, useLazyLoadQuery, graphql } from 'react-relay'; // eslint-disable-line jira/import/no-restricted-import
  import { useIntl } from '@atlassian/jira-intl-controller';
  import { renderWithDi } from '@atlassian/jira-testing-library';
  import messages from './messages';
  import { componentNameMock } from './mocks';
  import { ComponentName } from './index';
  // https://relay.dev/docs/guides/testing-relay-components/#fragment-component-tests
  const TestRenderer = () => {
  	const data = useLazyLoadQuery(
  		graphql`
  			query testComponentNameQuery @relay_test_operation {
  				boardScope(boardId: "test-id") {
  					sprint(sprintId: "test-sprint-id") {
  						...ComponentName
  					}
  				}
  			}
  		`,
  		{},
  	);
  	return <ComponentName currentSprint={data.boardScope.sprint} />;
  };
  describe('Component Name', () => {
  	let environment;
  	beforeEach(() => {
  		environment = createMockEnvironment();
  	});
  	test('should display correct header title', () => {
  		environment.mock.queueOperationResolver((operation) =>
  			MockPayloadGenerator.generate(operation, {
  				Sprint: () => componentNameMock,
  			}),
  		);
  		const wrapper = renderWithDi(
  			<RelayEnvironmentProvider environment={environment}>
  				<TestRenderer />
  			</RelayEnvironmentProvider>,
  			deps,
  		);
  		expect(wrapper.getByRole('heading', { name: 'Header' })).toHaveLength(1);
  	});
  });
  ```

- If the component is expecting query parameters from the router, use the `Router` from
  `@atlassian/jira-router-components/src/ui/router/index.tsx` to setup the component and render it:

  ```tsx
  import * as historyHelper from 'history';
  import { Router } from '@atlassian/jira-router-components/src/ui/router/index.tsx';
  import { globalRoute } from '@atlassian/path-to-routes/index.tsx';

  import { useFilters, useQueryParamsState } from './index.tsx';

  const historyBuildOptions = {
  	initialEntries: [globalRoute.path],
  };

  const mockRoutes = [
  	{
  		...globalRoute,
  		component: () => <>path</>,
  	},
  ];

  const MockComponent = ({ children, ...rest }: { children: (props: object) => React.ReactNode }) =>
  	children(rest);

  let history = historyHelper.createMemoryHistory(historyBuildOptions);

  describe('useFilter', () => {
  	beforeEach(() => {
  		history = historyHelper.createMemoryHistory(historyBuildOptions);
  	});

  	afterEach(() => {
  		jest.resetAllMocks();
  	});

  	it('should return correct initial values', () => {
  		const hookValue = renderHook(useFilters);
  		expect(hookValue.current.filters).toEqual({ priorityIds: [], schemeName: '' });
  	});

  	it('should return correct values from query params', async () => {
  		history.push(
  			`${globalSettingsIssuesPrioritySchemesRoute.path}?schemeName=test&priorityId=1%2C2%2C3`,
  		);

  		renderWithDi(
  			<Router history={history} routes={mockRoutes}>
  				<MockComponent>
  					{() => {
  						const { filters } = useFilters();
  						expect(filters).toEqual({
  							priorityIds: ['1', '2', '3'],
  							schemeName: 'test',
  						});

  						return null;
  					}}
  				</MockComponent>
  			</Router>,
  		);
  	});
  });
  ```

- don't call for `jest.clearAllMocks()` as it's already called in the global setup

### Hydration/SSR testing

Just a few components needs a comprehensive hydration test, for those use the `renderWithHydration`
from `@atlassian/jira-testing-library`. In most of the cases `should render on server` case should
replicate `a11y` test case.

```tsx
it('should capture and report a11y violations', async () => {
	const { container } = renderWithDi(<ProjectSettingsButton />, deps);

	await expect(container).toBeAccessible();
});

it('should render on the server', () => {
	const { passed } = renderWithHydration(<ProjectSettingsButton />, deps);

	expect(passed).toBe(true);
});
```

Hydration might fail and it could be captured in console expectations

```tsx
it('should render on the server', () => {
	// we do expect this error. "Fixing" component will fail the test
	expectConsoleError('Expected server HTML to contain a matching <div> in <div>.');
	const { passed } = renderWithHydration(<ProjectSettingsButton />, deps);
	expect(passed).toBe(true); // still can be true
});
```

### ✅ DO:

- maintain `renderWithHydration` if it's already used or the goal is clearly about supporting SSR.
  One test is enough.

### ❌ DON'T:

- Add `renderWithHydration` when there is no explicit need. It adds complexity and cost

### Automatic gate checking

- When running tests you might see "duplication" like

```
 ✓ should render children after client is ready <- this is the "real test"
 ✓ 🔁 should render children after client is ready  (🧪ff-on) <- this is the "automatic gate check"
```

There can be up to 4 duplication: all gates off(default), all gates on (`ff-on`), some gates on
(`ff-3x`), some gates off (`ff-3x-off`). This functionality covers all gates and "boolean"
experiments automatically, so you don't need to write separate tests for gates.

## Progressive Test Development Strategy

When writing tests, follow this progression to ensure quality and maintainability:

### Test Development Phases

**Phase 1: Basic Foundation** (Always start here)

```typescript
// 1. Accessibility test - should always work
it('should be accessible', async () => {
	const { container } = renderWithDi(<ComponentName />);
	await expect(container).toBeAccessible();
});

// 2. Basic rendering - verify core elements appear
it('should render with default props', () => {
	renderWithDi(<ComponentName />);
	expect(screen.getByRole('button', { name: 'Submit' })).toBeVisible();
	expect(screen.getByText('Expected content')).toBeVisible();
});
```

**Phase 2: User Interactions** (Add when Phase 1 works)

```typescript
// Test realistic user workflows
it('should handle form submission', async () => {
	renderWithDi(<ComponentName />);

	// Fill form
	await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), 'Test Name');

	// Submit
	await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

	// Verify results
	await waitFor(() => {
		expect(mockCallback).toHaveBeenCalledWith({ name: 'Test Name' });
	});
});
```

**Phase 3: Error Handling** (Add when interactions work)

```typescript
// Test error scenarios
it('should handle submission errors', async () => {
	const errorMock = jest.fn().mockRejectedValue(new Error('Network error'));
	const deps = [injectable(submitHandler, errorMock)];

	renderWithDi(<ComponentName />, deps);
	await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

	await waitFor(() => {
		expect(screen.getByText('Something went wrong')).toBeVisible();
	});
});
```

**Phase 4: Feature Gates** (Add when error handling works)

```typescript
// Test feature gate variations
it('should show new feature when gate is enabled', () => {
	passGate('new-feature-gate');
	renderWithDi(<ComponentName />);
	expect(screen.getByRole('button', { name: 'New Feature' })).toBeVisible();
});

it('should hide new feature when gate is disabled', () => {
	failGate('new-feature-gate');
	renderWithDi(<ComponentName />);
	expect(screen.queryByRole('button', { name: 'New Feature' })).not.toBeInTheDocument();
});
```

**Phase 5: Complex Workflows** (Add last)

```typescript
// Test multi-step interactions
it('should handle complete workflow', async () => {
	renderWithDi(<ComponentName />);

	// Step 1: Open dropdown
	await userEvent.click(screen.getByRole('combobox'));

	// Step 2: Select option
	await userEvent.click(screen.getByRole('option', { name: 'Option 1' }));

	// Step 3: Verify selection
	expect(screen.getByText('Option 1')).toBeVisible();

	// Step 4: Submit
	await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

	// Step 5: Verify side effects
	await waitFor(() => {
		expect(mockCallback).toHaveBeenCalled();
	});
});
```

### Progressive Development Guidelines

1. **Start simple** - Basic tests should always pass
2. **Add incrementally** - One test category at a time
3. **Verify frequently** - Run tests after each addition
4. **Document gaps** - Note test areas that need work
5. **Focus on user behavior** - Test what users see and do, not implementation details

## Test Optimization and Quality

### Removing Test Redundancy

Before adding new tests, check for redundant coverage:

```typescript
// ❌ REDUNDANT: Testing the same behavior twice
it('should show dropdown options when opened', async () => {
	renderWithDi(<ComponentName />);
	await userEvent.click(screen.getByRole('combobox'));
	expect(screen.getByRole('option', { name: 'Option 1' })).toBeVisible();
});

it('should display all options in dropdown', async () => {
	renderWithDi(<ComponentName />);
	await userEvent.click(screen.getByRole('combobox'));
	expect(screen.getByRole('option', { name: 'Option 1' })).toBeVisible();
	expect(screen.getByRole('option', { name: 'Option 2' })).toBeVisible();
});

// ✅ BETTER: Combine into one comprehensive test
it('should display all dropdown options when opened', async () => {
	renderWithDi(<ComponentName />);
	await userEvent.click(screen.getByRole('combobox'));

	expect(screen.getByRole('option', { name: 'Option 1' })).toBeVisible();
	expect(screen.getByRole('option', { name: 'Option 2' })).toBeVisible();
});
```

### Comment Cleanup

Remove unnecessary comments that don't add value:

```typescript
// ❌ UNNECESSARY: Comment restates what code does
it('should render submit button', () => {
	renderWithDi(<ComponentName />);
	// Check if submit button is visible
	expect(screen.getByRole('button', { name: 'Submit' })).toBeVisible();
});

// ✅ BETTER: Keep only non-obvious explanations
it('should render submit button', () => {
	renderWithDi(<ComponentName />);
	// Button includes icon in accessible name
	expect(screen.getByRole('button', { name: /warning.*Submit/i })).toBeVisible();
});
```

**Keep comments when:**

- Explaining complex mock setup
- Clarifying non-obvious behavior
- Documenting workarounds for known issues
- Explaining why certain assertions are needed

**Remove comments when:**

- Restating what the code does
- Describing obvious setup steps
- Not adding value beyond the code itself

### Focused Test Writing

Each test should verify one specific behavior:

```typescript
// ❌ TOO BROAD: Testing multiple unrelated behaviors
it('should handle complete workflow', async () => {
	renderWithDi(<ComponentName />);

	// Tests checkbox
	await userEvent.click(screen.getByRole('checkbox'));
	expect(screen.getByRole('checkbox')).toBeChecked();

	// Tests dropdown
	await userEvent.click(screen.getByRole('combobox'));
	expect(screen.getByRole('option', { name: 'Option 1' })).toBeVisible();

	// Tests form submission
	await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
	expect(mockCallback).toHaveBeenCalled();
});

// ✅ FOCUSED: Separate tests for each behavior
it('should toggle checkbox when clicked', async () => {
	renderWithDi(<ComponentName />);
	await userEvent.click(screen.getByRole('checkbox'));
	expect(screen.getByRole('checkbox')).toBeChecked();
});

it('should display dropdown options when opened', async () => {
	renderWithDi(<ComponentName />);
	await userEvent.click(screen.getByRole('combobox'));
	expect(screen.getByRole('option', { name: 'Option 1' })).toBeVisible();
});

it('should call callback when form is submitted', async () => {
	renderWithDi(<ComponentName />);
	await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
	expect(mockCallback).toHaveBeenCalled();
});
```

## Common userEvent Patterns

### Text Input Interactions

```typescript
// Type text into inputs (always use await)
await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), 'Test Value');

// Clear and type new text
await userEvent.clear(screen.getByRole('textbox', { name: 'Name' }));
await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), 'New Value');
```

### Button and Click Interactions

```typescript
// Click buttons by accessible name
await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

// Click checkboxes
await userEvent.click(screen.getByRole('checkbox', { name: 'Enable feature' }));

// Click links
await userEvent.click(screen.getByRole('link', { name: 'Learn more' }));
```

### Keyboard Interactions

```typescript
// Tab navigation
await userEvent.tab();
await userEvent.tab({ shift: true }); // Shift+Tab

// Arrow keys and special keys
await userEvent.keyboard('{ArrowDown}');
await userEvent.keyboard('{Enter}');
await userEvent.keyboard('{Escape}');

// Key combinations
await userEvent.keyboard('{Control>}a{/Control}'); // Ctrl+A
```

### Form Element Interactions

```typescript
// Select dropdowns
await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Category' }), 'value');

// File uploads
const file = new File(['content'], 'test.txt', { type: 'text/plain' });
await userEvent.upload(screen.getByLabelText('Upload file'), file);
```

### Best Practices with userEvent

- **Always use `await`** with userEvent methods
- **Use semantic queries** (`getByRole`, `getByLabelText`) over `getByTestId`
- **Use `waitFor()`** for async state changes after interactions
- **Test realistic workflows** - fill form → submit → verify results
- **Prefer userEvent over fireEvent** - userEvent simulates more realistic interactions

## Troubleshooting Common Issues

### Issue: Tests fail with "not found" errors

**Cause:** Element doesn't exist in DOM or query is incorrect

**Solutions:**

1. Check if component actually renders the element
2. Verify query matches element's accessible role/name
3. Use `screen.debug()` to inspect rendered output
4. Check if element appears after async operation (use `waitFor`)

```typescript
// Debug rendered output
renderWithDi(<ComponentName />);
screen.debug(); // Prints entire DOM tree

// Wait for async elements
await waitFor(() => {
	expect(screen.getByText('Async content')).toBeVisible();
});
```

### Issue: ESLint warnings about assertions

**Common warning:** Prefer `.toBeVisible()` over `.toBeInTheDocument()`

**Solutions:**

```typescript
// ❌ ESLint warning
expect(screen.getByRole('button')).toBeInTheDocument();

// ✅ Fix: Use toBeVisible for visible elements
expect(screen.getByRole('button')).toBeVisible();

// ✅ Keep toBeInTheDocument only for hidden elements that must exist
expect(screen.getByRole('button')).toBeInTheDocument(); // When CSS hides it
expect(screen.getByRole('button')).not.toBeVisible();
```

### Issue: Relay mock environment not working

**Cause:** Missing GraphQL query mocks or incorrect mock setup

**Solutions:**

1. Verify all queries are mocked with `environment.mock.queueOperationResolver`
2. Check mock data structure matches GraphQL schema
3. Use `MockPayloadGenerator.generate` for automatic mocking
4. Review existing test patterns in your codebase for working examples

```typescript
// Ensure all queries are mocked
environment.mock.queueOperationResolver((operation) =>
	MockPayloadGenerator.generate(operation, {
		ComponentType: () => ({
			field: 'value',
		}),
	}),
);
```

### Issue: Dependency injection not working

**Cause:** Missing or incorrect injectable mocks

**Solutions:**

1. Verify dependencies are properly exported from source file
2. Check mock function signatures match expected interface
3. Ensure `injectable` imports are correct
4. Test with minimal mocks first, add complexity gradually

```typescript
// Verify mock matches expected signature
const mockFunction = jest.fn().mockReturnValue({ expected: 'shape' });
const deps = [injectable(originalFunction, mockFunction)];
```

## Validation Checklist

Before considering tests complete, verify:

**Basic Requirements:**

- [ ] Component renders without errors
- [ ] Accessibility test passes (`toBeAccessible()`)
- [ ] Core functionality tested (user actions → expected outcomes)
- [ ] No skipped tests (`it.skip()`) - only working tests included

**Quality Standards:**

- [ ] Tests follow progressive development strategy
- [ ] Each test verifies one specific behavior
- [ ] Redundant tests removed
- [ ] Unnecessary comments removed
- [ ] ESLint warnings resolved
- [ ] Mock data referenced directly (not hardcoded strings)
- [ ] Semantic queries used (`getByRole`, `getByLabelText`)

**Coverage Requirements:**

- [ ] Error states tested (where applicable)
- [ ] Feature gates tested (both enabled/disabled states, where applicable)
- [ ] User interactions tested with realistic workflows
- [ ] Async behavior handled with proper `waitFor()` usage

**Documentation:**

- [ ] Test areas needing future work documented in comments
- [ ] Complex mock setups explained
- [ ] Non-obvious behaviors clarified

## Best Practices Summary

### ✅ DO:

- Start with accessibility and basic rendering tests
- Follow progressive development strategy: accessibility → rendering → interactions → errors →
  feature gates → complex
- Add complexity incrementally, verifying each phase works
- Document test areas that need work in comments
- Use specific, meaningful assertions
- Check component examples for working patterns
- Resolve ESLint warnings by removing redundant assertions or applying suggested fixes
- Write focused tests - each test should verify one specific behavior without unnecessary setup
- Remove redundant tests - avoid testing the same functionality multiple times
- Use semantic queries (`getByRole`, `getByLabelText`) over `getByTestId`
- Always use `await` with userEvent methods
- Use `waitFor()` for async state changes
- Reference mock data directly instead of hardcoding strings
- Remove unnecessary comments that don't explain non-obvious behavior
- Stop and clarify progress with the user unless explicitly asked to iterate freely

**Collaborative Testing Approach:**

1. State what behavior(s) needs to be proven (1-2 sentences)
2. Get user approval
3. Break down the behavior into testable parts
4. Implement tests incrementally, verifying each part works before moving on
5. Don't "work" for too long (>1min) without verification

### ❌ DON'T:

- Create nested describe blocks
- Test Atlaskit component internals
- Use generic assertions like `expect(mockCallback).toHaveBeenCalled()` without verifying arguments
- **Force assertions to pass with redundant evaluations** - never use `expect(true).toBe(true)` or
  similar patterns that don't test actual behavior
- Hardcode strings that exist in mock data
- Ignore ESLint warnings - address them by removing redundant code or applying fixes
- Include unnecessary interactions in focused tests - keep each test focused on one specific
  behavior
- Write redundant tests - avoid testing the same functionality multiple times
- Use `fireEvent` when `userEvent` is available - userEvent is more realistic
- Forget `await` with userEvent methods
- Skip intermediate test phases - follow progressive development
- Keep unnecessary comments that restate what code does
- Use `data-testid` when semantic queries work - follow convention
  `package.folder.component.element` (jira/integration/test-id-by-folder-structure)
- Mock `@atlassian/jira-feature-gating` (`fg` utility), `@atlassian/jira-feature-experiments`
  (`expVal` utility), or `@atlassian/jira-feature-flagging-utils`. Use `passGate`, `failGate`, or
  `mockExp` instead

**⚠️ CRITICAL: Avoid Meaningless Assertions**

Tests must verify actual component behavior, not always-true conditions:

```typescript
// ❌ NEVER DO THIS: These assertions always pass regardless of component behavior
it('should render component', () => {
	renderWithDi(<ComponentName />);
	expect(true).toBe(true); // Meaningless assertion
});

it('should handle callback', () => {
	const mockFn = jest.fn();
	renderWithDi(<ComponentName onAction={mockFn} />);
	expect(mockFn).toBeDefined(); // Always true, doesn't test if callback was called
});

it('should show button', () => {
	renderWithDi(<ComponentName />);
	const button = screen.queryByRole('button');
	expect(button !== null || button === null).toBe(true); // Always true
});

// ✅ DO THIS: Assert actual component behavior
it('should render component with expected elements', () => {
	renderWithDi(<ComponentName />);
	expect(screen.getByRole('button', { name: 'Submit' })).toBeVisible();
});

it('should call callback when button is clicked', async () => {
	const mockFn = jest.fn();
	renderWithDi(<ComponentName onAction={mockFn} />);
	await userEvent.click(screen.getByRole('button', { name: 'Action' }));
	expect(mockFn).toHaveBeenCalledWith(expectedArgs);
});

it('should show button with correct label', () => {
	renderWithDi(<ComponentName />);
	expect(screen.getByRole('button', { name: 'Submit' })).toBeVisible();
});
```
