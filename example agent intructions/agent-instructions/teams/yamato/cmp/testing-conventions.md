---
title: 'Testing Conventions'
description: 'Testing patterns and conventions for Field Scheme components'
related:
  - ../../common/unit-testing.md
  - ../../common/integration-testing.md
tags: [testing, conventions, field-scheme, unit-testing, integration-testing]
---

# Testing Conventions

## File Naming Conventions

### Test Files

- **Unit Tests**: `{ComponentName}.test.tsx` (e.g., `DropdownSelect.test.tsx`,
  `ActionsMenu.test.tsx`)
- **Integration Tests**: `test.tsx` (e.g., `useInitializeClientData/test.tsx`)
- **Examples**: `{ComponentName}.examples.tsx` (e.g., `AssociatedFieldsTable.examples.tsx`)
- **Visual Regression Tests**: `vr-tests/index.vr.tsx`

### Test Structure

- Tests are placed in the `tests/` directory
- Each component has its own test file in the tests directory
- Integration tests are placed in controller directories
- Visual regression tests are in dedicated `vr-tests/` subdirectories

## Testing Patterns

### Unit Testing

- Use `@atlassian/jira-testing-library` for rendering and user interactions
- Use `renderWithDi` for dependency injection in tests
- Test accessibility with `toBeAccessible()` matcher
- Use `userEvent` for user interaction testing
- Use `waitFor` for async operations
- Read ../../common/unit-testing.md for foundational unit testing guidelines, but prioritise
  conventions in this document
- Focus on testing custom logic written within the component, do not test inherent atlaskit
  component functionality, as these can be assumed to be adequately tested already

### Critical Testing Rules

1. **NEVER replace existing MockedRelayProvider** if it's working for any test in the package
2. **ALWAYS check for existing mock infrastructure** before creating new mocks
3. **Write tests in a single describe block** - no nested describe blocks
4. **Focus on working tests first** - document failures instead of skipping tests
5. **Check component examples** in `/examples` directory for working patterns
6. **Use direct mock data references** instead of hardcoded strings when possible
7. **Keep assertions simple** - avoid unnecessary RegExp constructors and regex string matching
8. **Extract constants only for test-specific values not in mock data**
9. **Remove redundant tests** - avoid testing the same functionality multiple times
10. **Use focused test queries** - prefer `getByText` over `getByDisplayValue` for better
    reliability
11. **Import mock data directly** - use `DEFAULT_FIELD_SCHEMES[0].name` instead of creating test
    constants

### Integration Testing

- Test hooks with `renderHook` from testing library
- Use `injectable` from `react-magnetic-di` for dependency injection
- Mock Relay environments with `createMockEnvironment` from the package's mock utilities
- Test data initialization and state management

### Visual Regression Testing

- Use `@atlassian/jira-vr-testing` package
- Create `vr-tests/index.vr.tsx` files
- Use `snapshot()` function with component examples
- Configure device variants and snapshot options
- Store snapshots in `__snapshots__/` directories

### Examples/Storybook

- Create `.examples.tsx` files for Storybook stories
- Use `Meta` type from `@storybook/react`
- Export default meta configuration
- Create named exports for different story variants

## Test Organization

### Component Tests

- Test accessibility compliance
- If atlaskit component is used, assume base level rendering has been tested to avoid redundant
  tests
- Test rendering with default props
- Test user interactions and state changes
- Test error states and edge cases
- Test integration with Relay fragments

### Mock Data

- Use dedicated mock providers and wrappers in in `MockedRelayProvider.tsx` file
- Create realistic test data that matches GraphQL schema
- **Use direct mock data references** instead of hardcoded strings when possible
- **Import mock data directly** - use `DEFAULT_FIELD_SCHEMES[0].name` instead of creating test
  constants
- **Extract constants only for test-specific values not in mock data** (like error messages)

### Test Optimization

- **Remove redundant tests** - avoid testing the same functionality multiple times
- **Write focused tests** - each test should verify one specific behavior without unnecessary setup
- **Use focused test queries** - prefer `getByText` over `getByDisplayValue` for better reliability
- **Verify both UI state and data state** in pre-selected state tests
- Ask these questions for each test:
  - Does this test verify unique functionality?
  - Is this behavior already covered by another test?
  - Can this test be combined with another test?
  - Does this test add meaningful value?

### Test Utilities

- Create reusable test utilities in `test-utils.tsx`
- Use consistent mock providers across tests
- Extract common test setup into helper functions
- Use proper TypeScript typing for test data

## Accessibility Testing

- Always include accessibility tests with `toBeAccessible()`
- Test keyboard navigation and screen reader compatibility
- Ensure proper ARIA labels and roles
- Test focus management and return targets

## Feature flagging

- Ensure tests have specific feature gate tests if there are feature gating or flagging present in
  component code
- Unit tests use 'passGate' and 'failGate' jira packages to test each scenario

```typescript
import { passGate, failGate } from '@atlassian/jira-feature-gates-test-mocks';
```

## Relay Testing

- Use `@relay_test_operation` directive for test queries
- Mock Relay providers using `createMockEnvironment` and `createMockRelayProvider` from the
  package's common mock utilities, usually within the package root. If these providers are not
  present, use providers from 'react-relay' import
- Test fragment usage and data masking
- Verify proper data flow through component tree
- Use `createMockEnvironment` from the package's mock utilities for Relay environment setup
- **Use common mock variables** like `commonMocks` for consistent mock setup
- **Always pass `gqlMocks` to test renderer** for proper GraphQL data

### Enhanced Mock Strategy

```typescript
// Common mock setup
const commonMocks = [
  {
    request: queryMocks.componentQuery.request,
    result: () => getComponentQueryResponse(),
  },
  queryMocks.componentUpdateMutation,
];

// Use in tests
renderWithDi(<ComponentTestRenderer gqlMocks={commonMocks} />, mockDeps);
```

### Mutation Testing with Flags

For mutations if component has success or error flags for graphql mutation results, use assertions
around seeing if flags have been called for test cases, for example:

```typescript
(injectable(useFlags, () => ({
	showSuccessFlag: showSuccessFlagMock,
	showErrorFlag: showErrorFlagMock,
})),
	await waitFor(() => {
		expect(showErrorFlagMock).toHaveBeenCalledWith({
			title: 'Error creating field scheme',
			description: 'A field scheme with this name already exists.',
		});
	}));
```

## Best Practices

### ✅ DO:

- Use existing MockedRelayProvider if available
- Start with accessibility and basic rendering tests
- Add complexity progressively (interactions → errors → feature gates)
- Document test areas that need work in comments
- Use specific, meaningful assertions
- Check component examples for working patterns
- **Use direct mock data references** instead of hardcoded strings
- **Keep assertions simple** - avoid unnecessary RegExp constructors and regex string matching
- **Extract constants only for test-specific values not in mock data**
- **Use common mock variables** like `commonMocks` for consistent mock setup
- **Always pass `gqlMocks` to test renderer** for proper GraphQL data
- **Resolve ESLint warnings** by removing redundant assertions or applying suggested fixes
- **Write focused tests** - each test should verify one specific behavior without unnecessary setup
- **Remove redundant tests** - avoid testing the same functionality multiple times
- **Use `getByText` over `getByDisplayValue`** for more reliable text-based queries
- **Verify both UI state and data state** in pre-selected state tests

### ❌ DON'T:

- Replace working MockedRelayProvider with custom mocks
- Use `it.skip()` for failing tests
- Create nested describe blocks
- Test Atlaskit component internals
- Use generic assertions like `expect(mockCallback).toHaveBeenCalled()`
- **Hardcode strings that exist in mock data**
- **Use `new RegExp()` unnecessarily** - use direct string matching
- **Use regex for simple string matching** - prefer exact string matches
- **Create constants for data that exists in mock files**
- **Forget to pass `gqlMocks` to test renderer**
- **Ignore ESLint warnings** - address them by removing redundant code or applying fixes
- **Include unnecessary interactions** in focused tests - keep each test focused on one specific
  behavior
- **Write redundant tests** - avoid testing the same functionality multiple times
- **Use `getByDisplayValue` when `getByText` works** - prefer more reliable text-based queries
- **Test only UI state without data state** - verify both checkbox state and selected values

## See Also

- [Unit Testing](../../common/unit-testing.md) - Comprehensive unit testing patterns
- [Integration Testing](../../common/integration-testing.md) - Playwright integration testing
