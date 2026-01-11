# AI Unit Test Generation Guide - Field Scheme

> **Base Instructions**: Follow the comprehensive testing guide in
> [Unit Testing](/jira/docs/llm/agent-instructions/common/unit-testing.md)
>
> This document provides **Field Scheme team-specific** mock strategies and generation workflows.

Generate comprehensive unit tests for Field Scheme components following testing conventions.

## 🚨 CRITICAL RULES

1. **NEVER replace existing MockedRelayProvider** if it's working for any test in the package
2. **ALWAYS check for existing mock infrastructure** before creating new mocks
3. **Write tests in a single describe block** - no nested describe blocks
4. **Focus on working tests first** - document failures instead of skipping tests
5. **Check component examples** in `/examples` directory for working patterns
6. **Use direct mock data references** instead of hardcoded strings when possible
7. **Keep assertions simple** - avoid unnecessary RegExp constructors and regex string matching
8. **Extract constants only for frequently used, longer strings**
9. **Remove redundant tests** - avoid testing the same functionality multiple times
10. **Use focused test queries** - prefer `getByText` over `getByDisplayValue` for better
    reliability
11. **Import mock data directly** - use `DEFAULT_FIELD_SCHEMES[0].name` instead of creating test
    constants

## Quick Start Checklist

- [ ] Component exists in `src/` directory
- [ ] Tests directory exists at `tests/`
- [ ] Package path identified (e.g., `src/packages/admin-pages/field-schemes`)
- [ ] Existing tests analyzed (if any)
- [ ] Mock infrastructure checked
- [ ] Component examples reviewed

## Step 1: Analyze Existing Infrastructure

**ALWAYS START HERE** - Check what already exists:

```bash
# Check if tests exist
ls {PACKAGE_PATH}/tests/{ComponentName}.test.tsx

# If tests exist, run them to see current state
cd atlassian-frontend-monorepo/jira
yarn test {PACKAGE_PATH}/tests/{ComponentName}.test.tsx --verbose

# Check for existing mock infrastructure
ls {PACKAGE_PATH}/tests/MockedRelayProvider.tsx

# Check component examples for working patterns
ls {PACKAGE_PATH}/examples/{ComponentName}.examples.tsx
```

**Key Questions to Answer:**

- Do tests already exist? (enhance, don't replace)
- Is MockedRelayProvider available? (use existing)
- Are there working examples? (adapt patterns)
- What's the current test coverage?

## Step 2: Choose Mock Strategy

**DECISION TREE** - Choose the right approach based on what exists:

### Option A: Use Existing MockedRelayProvider (PREFERRED)

```typescript
// ✅ Use this if MockedRelayProvider.tsx exists and works
import { MockedRelayProvider, mockedEnvironment } from './MockedRelayProvider.tsx';

const ComponentTestRenderer = () => {
  const queryRef = useMemo(
    () => loadQuery<ComponentQuery>(mockedEnvironment, COMPONENT_QUERY, { variables }),
    [],
  );

  return (
    <MockedRelayProvider>
      <ComponentName queries={{ data: queryRef }} />
    </MockedRelayProvider>
  );
};
```

### Option B: Use Examples Pattern (FALLBACK)

```typescript
// ✅ Use this if examples exist but no MockedRelayProvider
import { createMockEnvironment, createMockRelayProvider } from './MockedRelayProvider.tsx';

const ComponentTestRenderer = ({ gqlMocks }: { gqlMocks?: MockResponseRelay[] }) => {
  const mockedEnvironment = useMemo(() => createMockEnvironment(gqlMocks), [gqlMocks]);
  const queryRef = useMemo(
    () => loadQuery<ComponentQuery>(mockedEnvironment, COMPONENT_QUERY, { variables }),
    [mockedEnvironment],
  );
  const RelayEnvironment = useMemo(
    () => createMockRelayProvider(mockedEnvironment),
    [mockedEnvironment],
  );

  return (
    <RelayEnvironment>
      <ComponentName queries={{ data: queryRef }} />
    </RelayEnvironment>
  );
};
```

### Option C: Enhanced Pattern with Common Mock Variables (RECOMMENDED)

```typescript
// ✅ Use this pattern for comprehensive test coverage
import { createMockEnvironment, createMockRelayProvider, getComponentQueryResponse, queryMocks } from './MockedRelayProvider.tsx';

// Common mock setup
const commonMocks = [
  {
    request: queryMocks.componentQuery.request,
    result: () => getComponentQueryResponse(),
  },
  queryMocks.componentUpdateMutation,
];

const ComponentTestRenderer = ({ gqlMocks }: { gqlMocks?: MockResponseRelay[] }) => {
  const mockedEnvironment = useMemo(() => createMockEnvironment(gqlMocks), [gqlMocks]);
  const queryRef = useMemo(
    () => loadQuery<ComponentQuery>(mockedEnvironment, COMPONENT_QUERY, { variables }),
    [mockedEnvironment],
  );
  const RelayEnvironment = useMemo(
    () => createMockRelayProvider(mockedEnvironment),
    [mockedEnvironment],
  );

  return (
    <RelayEnvironment>
      <ModalProviders> {/* Use appropriate providers */}
        <ComponentName queries={{ data: queryRef }} />
      </ModalProviders>
    </RelayEnvironment>
  );
};
```

## Step 3: Generate Test Template

**Copy this enhanced template and customize for your component:**

```typescript
import React, { useMemo } from 'react';
import { injectable } from 'react-magnetic-di';
import { loadQuery } from 'react-relay';
import { renderWithDi, screen, userEvent, waitFor } from '@atlassian/jira-testing-library';
import { passGate, failGate } from '@atlassian/jira-feature-gates-test-mocks';

import { ComponentName } from '../src/ComponentName.tsx';
// Choose import strategy based on Step 2
import {
  createMockRelayProvider,
  createMockEnvironment,
  getComponentQueryResponse,
  queryMocks
} from './MockedRelayProvider.tsx';
import { ModalProviders } from './StorybookMockedProviders.tsx'; // Use appropriate providers
import COMPONENT_QUERY, { type ComponentQuery } from '../src/__generated__/ComponentQuery.graphql';
import { DEFAULT_MOCK_DATA } from './mockData.tsx'; // Import mock data arrays

// Mock functions
const mockCallback = jest.fn();
const showSuccessFlagMock = jest.fn();
const showErrorFlagMock = jest.fn();

// Test constants - only for frequently used, longer strings that don't exist in mock data
const ERROR_TITLE = 'Something went wrong';
const ERROR_DESCRIPTION = 'Refresh the page and try again.';

// ✅ GOOD: Use direct mock data references instead of creating constants
expect(screen.getByText(DEFAULT_FIELD_SCHEMES[0].name)).toBeVisible();

// ✅ GOOD: Use exact string matching instead of regex
expect(screen.getByText('Delete Field Scheme')).toBeVisible();

// ❌ AVOID: Creating constants for data that already exists in mock files
const SCHEME_NAME_MARKETING = 'Marketing Field Scheme';
expect(screen.getByText(SCHEME_NAME_MARKETING)).toBeVisible();

// ❌ AVOID: Using regex for simple string matching
expect(screen.getByText(/Delete.*Field.*Scheme/i)).toBeVisible();

// Test renderer (use Option C pattern)
const ComponentTestRenderer = ({ gqlMocks }: { gqlMocks?: MockResponseRelay[] }) => {
  const mockedEnvironment = useMemo(() => createMockEnvironment(gqlMocks), [gqlMocks]);
  const queryRef = useMemo(
    () => loadQuery<ComponentQuery>(mockedEnvironment, COMPONENT_QUERY, { variables }),
    [mockedEnvironment],
  );
  const RelayEnvironment = useMemo(
    () => createMockRelayProvider(mockedEnvironment),
    [mockedEnvironment],
  );

  return (
    <RelayEnvironment>
      <ModalProviders>
        <ComponentName queries={{ data: queryRef }} />
      </ModalProviders>
    </RelayEnvironment>
  );
};

// Common mock setup
const commonMocks = [
  {
    request: queryMocks.componentQuery.request,
    result: () => getComponentQueryResponse(),
  },
  queryMocks.componentUpdateMutation,
];

// Dependency injection mocks (only if needed)
const mockDeps = [
  injectable(dependency, mockFunction),
  // Add more mocks as needed
];

describe('ComponentName', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  // Start with these basic tests - they should always work
  it('should be accessible', async () => {
    const { container } = renderWithDi(<ComponentTestRenderer gqlMocks={commonMocks} />);
    await expect(container).toBeAccessible();
  });

  it('should render with default props and show expected content', () => {
    renderWithDi(<ComponentTestRenderer gqlMocks={commonMocks} />);

    // Use direct mock data references instead of hardcoded strings
    expect(screen.getByRole('button', { name: /save/i })).toBeVisible();
    expect(screen.getByText(/expected text content/i)).toBeVisible();
  });

  // Add more tests as they work...
});
```

## Step 4: Test Optimization and Redundancy Removal

**BEFORE adding new tests, optimize existing ones:**

### Comment Cleanup

**Remove unnecessary comments from test files:**

```typescript
// ❌ UNNECESSARY: Comments that just restate what the code does
it('should render with default props and show expected content', () => {
  renderWithDi(<ComponentTestRenderer gqlMocks={commonMocks} />);

  // Check if the button is visible
  expect(screen.getByRole('button', { name: /save/i })).toBeVisible();
  // Check if the text is visible
  expect(screen.getByText(/expected text content/i)).toBeVisible();
});

// ✅ BETTER: Only keep comments that explain non-obvious behavior
it('should render with default props and show expected content', () => {
  renderWithDi(<ComponentTestRenderer gqlMocks={commonMocks} />);

  // The heading includes a warning icon, so the accessible name includes "warning"
  expect(screen.getByRole('heading', { name: /warning.*Delete.*Default Field Scheme Is No More/i })).toBeVisible();
  // The text is split across multiple elements with HTML formatting
  expect(screen.getByText('Please confirm you wish to delete')).toBeVisible();
  expect(screen.getByText(DEFAULT_FIELD_SCHEMES[0].name)).toBeVisible();
});
```

**When to keep comments:**

- Explain complex test setup or mock configuration
- Clarify non-obvious behavior (e.g., feature gates, conditional rendering)
- Document workarounds for known issues
- Explain why certain assertions are needed

**When to remove comments:**

- Comments that just restate what the code does
- Obvious setup steps
- Comments that don't add value beyond the code itself

### Test Redundancy Analysis

**Ask these questions for each test:**

- Does this test verify unique functionality?
- Is this behavior already covered by another test?
- Can this test be combined with another test?
- Does this test add meaningful value?

### Common Redundant Patterns to Remove

```typescript
// ❌ REDUNDANT: Testing checkbox state when dropdown content is already tested
it('should show legacy schemes when checkbox is checked', () => {
	// ... setup
	expect(checkbox).toBeChecked();
	expect(screen.getByRole('option', { name: LEGACY_SCHEME })).toBeVisible();
});

// ✅ BETTER: Focus on unique behavior
it('should render with pre-selected legacy scheme with checkbox checked', () => {
	// ... setup with pre-selected data
	expect(screen.getByRole('checkbox')).toBeChecked();
	expect(screen.getByText(LEGACY_SCHEME_NAME)).toBeVisible();
});
```

### Test Query Optimization

```typescript
// ❌ LESS RELIABLE: Form-specific queries
expect(screen.getByDisplayValue('Scheme Name')).toBeVisible();

// ✅ MORE RELIABLE: Text-based queries with exact string matching
expect(screen.getByText('Scheme Name')).toBeVisible();

// ❌ AVOID: Using regex for simple text matching
expect(screen.getByText(/scheme.*name/i)).toBeVisible();

// ❌ LESS FOCUSED: Testing multiple behaviors in one test
it('should handle complete workflow', () => {
	// Tests checkbox, dropdown, selection, validation, etc.
});

// ✅ MORE FOCUSED: Single behavior per test
it('should render with pre-selected scheme', () => {
	// Tests only pre-selection behavior
});
```

### Test Consolidation Strategy

1. **Identify overlapping tests** - Look for tests that verify similar functionality
2. **Keep the most comprehensive test** - Choose the test that covers the most important scenario
3. **Remove redundant variations** - Delete tests that only test minor variations
4. **Focus on user-facing behavior** - Prioritize tests that verify what users see/experience

## Step 5: Add Test Categories (Progressive Enhancement)

**Add tests in this order** - start with basics, add complexity gradually:

### 1. Basic Tests (ALWAYS START HERE)

```typescript
it('should be accessible', async () => {
  const { container } = renderWithDi(<ComponentTestRenderer gqlMocks={commonMocks} />);
  await expect(container).toBeAccessible();
});

it('should render with default props and show expected content', () => {
  renderWithDi(<ComponentTestRenderer gqlMocks={commonMocks} />);

  // Replace with actual component elements
  expect(screen.getByRole('button', { name: /save/i })).toBeVisible();
  expect(screen.getByText(/expected text content/i)).toBeVisible();
});
```

### 2. User Interactions (ADD WHEN BASIC TESTS WORK)

**Key Pattern from CreateSidebarContent.test.tsx:**

- Use `await userEvent.type()` for text inputs
- Use `await userEvent.click()` for buttons/clicks
- Always use `await` with userEvent methods
- Use `waitFor()` for async state changes

#### Text Input Interactions

```typescript
it('should handle text input and form submission', async () => {
  renderWithDi(<ComponentTestRenderer gqlMocks={commonMocks} />);

  // Get text inputs by role and accessible name
  const nameInput = screen.getByRole('textbox', { name: 'Name' });
  const descriptionInput = screen.getByRole('textbox', { name: 'Description' });

  // Type text into inputs (always use await)
  await userEvent.type(nameInput, 'Test Scheme');
  await userEvent.type(descriptionInput, 'Test Description');

  // Submit form
  await userEvent.click(screen.getByRole('button', { name: 'Create' }));

  // Verify state changes with waitFor for async operations
  await waitFor(() => {
    expect(showSuccessFlagMock).toHaveBeenCalledWith({
      title: 'Test Scheme created',
      description: 'Expected success message',
    });
  });
});
```

#### Button Click Interactions

```typescript
it('should handle button clicks and verify callbacks', async () => {
  const mockCallback = jest.fn();
  renderWithDi(<ComponentTestRenderer onAction={mockCallback} gqlMocks={commonMocks} />);

  const actionButton = screen.getByRole('button', { name: /action/i });
  await userEvent.click(actionButton);

  expect(mockCallback).toHaveBeenCalledWith(expectedArguments);
  expect(actionButton).toBeDisabled();
});
```

#### Form Validation Interactions

```typescript
it('should handle form validation errors', async () => {
  renderWithDi(<ComponentTestRenderer gqlMocks={commonMocks} />);

  // Fill form with invalid data
  const nameInput = screen.getByRole('textbox', { name: 'Name' });
  await userEvent.type(nameInput, 'Invalid Name');

  // Submit form
  await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

  // Verify error handling
  await waitFor(() => {
    expect(showErrorFlagMock).toHaveBeenCalledWith({
      title: 'Validation Error',
      description: 'Expected error message',
    });
  });
});
```

### 3. Error Handling (ADD WHEN INTERACTIONS WORK)

```typescript
it('should display specific error when operation fails', async () => {
  const errorMock = jest.fn().mockRejectedValue(new Error('Test error'));
  const errorMocks = [injectable(operation, errorMock)];

  renderWithDi(<ComponentTestRenderer gqlMocks={commonMocks} />, errorMocks);
  await userEvent.click(screen.getByRole('button', { name: /submit/i }));

  await waitFor(() => {
    expect(showErrorFlagMock).toHaveBeenCalledWith({
      title: 'Operation Failed',
      description: 'There was a problem with the operation.',
    });
  });

  expect(screen.getByRole('button', { name: /submit/i })).toBeVisible();
});
```

### 4. Feature Gates (ADD WHEN ERROR HANDLING WORKS)

```typescript
it('should show feature-specific content when feature gate is enabled', async () => {
  passGate('feature-gate-name');
  renderWithDi(<ComponentTestRenderer gqlMocks={commonMocks} />);

  expect(screen.getByRole('combobox', { name: 'Feature-specific control' })).toBeVisible();
  expect(screen.getByText(/feature-specific content/i)).toBeVisible();
});

it('should hide feature-specific content when feature gate is disabled', async () => {
  failGate('feature-gate-name');
  renderWithDi(<ComponentTestRenderer gqlMocks={commonMocks} />);

  expect(screen.queryByRole('combobox', { name: 'Feature-specific control' })).not.toBeInTheDocument();
  expect(screen.queryByText(/feature-specific content/i)).not.toBeInTheDocument();
});
```

### 5. Complex Interactions (ADD LAST)

#### Multi-Step Form Workflows

```typescript
it('should handle complete form workflow with validation', async () => {
  renderWithDi(<ComponentTestRenderer gqlMocks={commonMocks} />);

  // Step 1: Fill form fields
  const nameInput = screen.getByRole('textbox', { name: 'Name' });
  const descriptionInput = screen.getByRole('textbox', { name: 'Description' });

  await userEvent.type(nameInput, 'Test Scheme');
  await userEvent.type(descriptionInput, 'Test Description');

  // Step 2: Submit form
  await userEvent.click(screen.getByRole('button', { name: 'Create' }));

  // Step 3: Verify success state
  await waitFor(() => {
    expect(showSuccessFlagMock).toHaveBeenCalledWith({
      title: 'Test Scheme created',
      description: 'Expected success message',
    });
  });

  // Step 4: Verify side effects
  expect(closeSidebarMock).toHaveBeenCalled();
  expect(fireTrackAnalyticsMock).toHaveBeenCalled();
});
```

#### Dropdown and Selection Interactions

```typescript
it('should handle dropdown interactions and scheme selection', async () => {
  renderWithDi(<ComponentTestRenderer gqlMocks={commonMocks} />);

  const checkbox = screen.getByRole('checkbox');
  const combobox = screen.getByRole('combobox');

  // Test checkbox toggle
  expect(checkbox).toBeChecked();
  await userEvent.click(checkbox);
  expect(checkbox).not.toBeChecked();

  // Test dropdown opening and scheme display
  await userEvent.click(combobox);

  // Use direct mock data references for assertions
  await waitFor(() => {
    expect(screen.getByRole('option', { name: DEFAULT_MOCK_DATA[0].name })).toBeVisible();
  });

  expect(screen.getByRole('option', { name: DEFAULT_MOCK_DATA[1].name })).toBeVisible();

  // Test keyboard interactions
  await userEvent.keyboard('{Escape}');

  await waitFor(() => {
    expect(screen.queryByRole('option', { name: DEFAULT_MOCK_DATA[0].name })).not.toBeInTheDocument();
  });
});
```

#### Focused Keyboard Interaction Testing

```typescript
// ✅ GOOD: Focused test for specific keyboard functionality
it('should handle escape key to close dropdown', async () => {
  renderWithDi(<ComponentTestRenderer gqlMocks={commonMocks} />);

  const combobox = screen.getByRole('combobox');

  // Open dropdown
  await userEvent.click(combobox);

  await waitFor(() => {
    expect(screen.getByRole('option', { name: SCHEME_NAME_MARKETING })).toBeVisible();
  });

  // Test escape key functionality
  await userEvent.keyboard('{Escape}');

  await waitFor(() => {
    expect(screen.queryByRole('option', { name: SCHEME_NAME_MARKETING })).not.toBeInTheDocument();
  });

  // Verify combobox remains accessible
  expect(screen.getByRole('combobox')).toBeVisible();
});

// ❌ BAD: Unnecessary interactions in focused test
it('should handle escape key to close dropdown', async () => {
  renderWithDi(<ComponentTestRenderer gqlMocks={commonMocks} />);

  const checkbox = screen.getByRole('checkbox');
  const combobox = screen.getByRole('combobox');

  // Unnecessary checkbox interaction for escape key test
  await userEvent.click(checkbox);
  expect(checkbox).not.toBeChecked();

  await userEvent.click(combobox);
  // ... rest of test
});
```

#### Pre-selected State Testing

```typescript
// ✅ GOOD: Comprehensive pre-selected state verification
it('should render with pre-selected legacy scheme with checkbox checked', () => {
  const legacySchemeAri = DEFAULT_FIELD_CONFIG_SCHEMES[0].id;
  const mocks = [
    {
      request: queryMocks.componentQuery.request,
      result: () => getComponentQueryResponse({ legacySchemeAri }),
    },
    queryMocks.componentUpdateMutation,
  ];

  renderWithDi(<ComponentTestRenderer gqlMocks={mocks} />);

  // Verify both UI state and data state
  expect(screen.getByRole('checkbox')).toBeChecked();
  expect(screen.getByText(DEFAULT_FIELD_CONFIG_SCHEMES[0].name)).toBeVisible();
});

it('should render with pre-selected modern scheme with checkbox unchecked', () => {
  const schemeAri = DEFAULT_FIELD_SCHEMES[0].id;
  const mocks = [
    {
      request: queryMocks.componentQuery.request,
      result: () => getComponentQueryResponse({ schemeAri }),
    },
    queryMocks.componentUpdateMutation,
  ];

  renderWithDi(<ComponentTestRenderer gqlMocks={mocks} />);

  // Verify both UI state and data state
  expect(screen.getByRole('checkbox')).not.toBeChecked();
  expect(screen.getByText(DEFAULT_FIELD_SCHEMES[0].name)).toBeVisible();
});

// ❌ AVOID: Redundant state restoration tests
it('should restore pre-selected scheme when toggling checkbox', () => {
  // This functionality is already covered by other tests
  // and doesn't add unique value
});
```

#### Error State Testing with Custom Mocks

```typescript
it('should handle mutation failures with specific error types', async () => {
  // Expect console errors for Relay mock warnings
  expectConsoleError('Warning: MutationHandlers: Expected target node to exist.');

  // Create custom mutation mock for specific error
  const failMutationMock = {
    request: { query: CREATE_SCHEME_MUTATION, variables: /.*/ },
    result: () => ({
      data: {
        jira_createFieldScheme: {
          success: false,
          fieldScheme: null,
          errors: [
            {
              __typename: 'JiraCreateFieldSchemeError',
              message: 'FIELD_SCHEME_DUPLICATE',
            },
          ],
        },
      },
    }),
  };

  renderWithDi(<ComponentTestRenderer />, mockDeps, {
    wrapper: ({ children }) => (
      <MockedRelayProvider mocks={[failMutationMock]}>{children}</MockedRelayProvider>
    ),
  });

  // Fill form and submit
  const nameInput = screen.getByRole('textbox', { name: 'Name' });
  await userEvent.type(nameInput, 'Test Scheme');
  await userEvent.click(screen.getByRole('button', { name: 'Create' }));

  // Verify specific error handling
  await waitFor(() => {
    expect(showErrorFlagMock).toHaveBeenCalledWith({
      title: 'Couldn't create field scheme',
      description: 'A field scheme with this name already exists. Give this one a unique name to continue.',
    });
  });

  // Verify side effects don't happen on error
  expect(closeSidebarMock).not.toHaveBeenCalled();
  expect(fireTrackAnalyticsMock).not.toHaveBeenCalled();
});
```

#### Component Lifecycle Testing

```typescript
it('should handle component unmounting correctly', () => {
  const { unmount } = renderWithDi(<ComponentTestRenderer gqlMocks={commonMocks} />, {
    wrapper: MockedRelayProvider,
  });

  // Verify initial state
  expect(resetSidebarFocusOnCloseMock).not.toHaveBeenCalled();

  // Trigger unmount
  unmount();

  // Verify cleanup
  expect(resetSidebarFocusOnCloseMock).toHaveBeenCalled();
});
```

## Step 5: Run and Validate Tests

**Execute tests and validate results:**

```bash
cd atlassian-frontend-monorepo/jira
yarn test {PACKAGE_PATH}/tests/{ComponentName}.test.tsx --verbose
```

### Progressive Test Development Strategy

Follow the
[Progressive Test Development Strategy](/jira/docs/llm/agent-instructions/common/unit-testing.md#progressive-test-development-strategy)
from the common guide:

1. **Phase 1: Basic Foundation** - Accessibility + rendering
2. **Phase 2: User Interactions** - Form submissions, clicks
3. **Phase 3: Error Handling** - Error states and failures
4. **Phase 4: Feature Gates** - Enabled/disabled states
5. **Phase 5: Complex Workflows** - Multi-step interactions

**Field Scheme Specifics:**

- Always pass `gqlMocks` to test renderer for proper GraphQL data
- Use existing MockedRelayProvider infrastructure
- Reference mock data directly (e.g., `DEFAULT_FIELD_SCHEMES[0].name`)

### Document Test Areas for Later

**Add this section at the end of your test file for areas that need work:**

```typescript
// 📋 TEST AREAS TO ADDRESS LATER
/*
TEST AREAS TO ADDRESS LATER:

1. [Test Category Name]
   - Issue: [Specific problem description]
   - Component: [Which part of component]
   - Next Steps:
     * [Actionable step 1]
     * [Actionable step 2]
     * [Actionable step 3]

2. [Another Test Category]
   - Issue: [Specific problem description]
   - Component: [Which part of component]
   - Next Steps:
     * [Actionable step 1]
     * [Actionable step 2]

RESOLUTION PRIORITY:
1. Basic rendering and accessibility (should always work)
2. Simple user interactions (button clicks, form inputs)
3. Error handling tests
4. Feature gate tests
5. Complex interaction workflows

COMMON ISSUES TO CHECK:
- Mock environment setup (use existing MockedRelayProvider)
- GraphQL query mocks matching component expectations
- Component prop handling and mock injection
- Feature gate names and conditional rendering logic
*/
```

## Step 6: Troubleshooting Common Issues

See
[Troubleshooting Common Issues](/jira/docs/llm/agent-instructions/common/unit-testing.md#troubleshooting-common-issues)
in the common guide for:

- Tests fail with "not found" errors
- ESLint warnings about assertions
- Relay mock environment not working
- Dependency injection not working

### Field Scheme-Specific Issues

#### Issue: Component renders empty HTML (`<div />`)

**Root Cause:** Incorrect Relay mock setup for Field Scheme components

**Solution:**

1. **Check if MockedRelayProvider exists** - Look in `tests/MockedRelayProvider.tsx`
2. **Use existing infrastructure** - Don't create new mocks if MockedRelayProvider works
3. **Verify mock data structure** - Ensure it matches Field Scheme GraphQL schema
4. **Check component examples** - Look in `/examples` directory for working patterns

#### Issue: "Mock not found" errors for Field Scheme queries

**Root Cause:** Missing GraphQL query mocks specific to Field Scheme

**Solution:**

1. **Check component examples first** - Field Scheme examples show working mock patterns
2. **Use existing `queryMocks`** from MockedRelayProvider (e.g., `queryMocks.fieldSchemeQuery`)
3. **Verify query variables** - Ensure mock request matches component's query variables
4. **Use `getComponentQueryResponse()`** helper if available in MockedRelayProvider

## Step 7: Best Practices Summary

See
[Best Practices Summary](/jira/docs/llm/agent-instructions/common/unit-testing.md#best-practices-summary)
in the common guide for comprehensive DO/DON'T lists.

### Field Scheme-Specific Best Practices

#### ✅ DO (Field Scheme):

- **Use existing MockedRelayProvider** - Check `tests/MockedRelayProvider.tsx` before creating new
  mocks
- **Use direct mock data references** - `DEFAULT_FIELD_SCHEMES[0].name` instead of hardcoded strings
- **Use common mock variables** - `const commonMocks = [...]` for consistent GraphQL mock setup
- **Always pass `gqlMocks` to test renderer** - Required for proper Field Scheme GraphQL data
- **Check component examples** - `/examples` directory shows working Field Scheme patterns
- **Verify both UI and data state** - Test checkbox state AND selected field scheme values

#### ❌ DON'T (Field Scheme):

- **Replace working MockedRelayProvider** - If it works for other tests, use it
- **Hardcode field scheme names** - Use mock data arrays like `DEFAULT_FIELD_SCHEMES`
- **Forget `gqlMocks` parameter** - All Field Scheme test renderers need GraphQL mocks
- **Create redundant mocks** - Use existing `queryMocks.fieldSchemeQuery` patterns
- **Use `getByDisplayValue` for scheme names** - Use `getByText` for better reliability

### ⚠️ Critical: Avoid Meaningless Assertions

See
[Avoid Meaningless Assertions](/jira/docs/llm/agent-instructions/common/unit-testing.md#best-practices-summary)
in the common guide.

**Field Scheme Example:**

```typescript
// ❌ NEVER: Meaningless assertion
it('should render field scheme selector', () => {
	renderWithDi(<ComponentTestRenderer gqlMocks={commonMocks} />);
	expect(true).toBe(true); // Doesn't test anything
});

// ✅ DO THIS: Test actual Field Scheme behavior
it('should render field scheme selector with default scheme', () => {
	renderWithDi(<ComponentTestRenderer gqlMocks={commonMocks} />);
	expect(screen.getByRole('combobox', { name: 'Field scheme' })).toBeVisible();
	expect(screen.getByText(DEFAULT_FIELD_SCHEMES[0].name)).toBeVisible();
});
```

## Final Validation Checklist

See
[Validation Checklist](/jira/docs/llm/agent-instructions/common/unit-testing.md#validation-checklist)
in the common guide for complete requirements.

### Field Scheme-Specific Checklist

- [ ] **MockedRelayProvider used** - Existing infrastructure, not new custom mocks
- [ ] **GraphQL mocks passed** - `gqlMocks` parameter provided to test renderer
- [ ] **Direct mock data references** - `DEFAULT_FIELD_SCHEMES[0].name` instead of hardcoded
- [ ] **Common mock variables** - `commonMocks` pattern for consistent setup
- [ ] **Component examples reviewed** - Patterns from `/examples` directory followed
- [ ] **Field Scheme patterns** - Relay query naming conventions followed
- [ ] **Both UI and data state tested** - Not just checkbox visible, but selected scheme verified

## Success Patterns from OptInModal.test.tsx

### Key Success Factors

1. **Enhanced Mock Strategy**: Used `commonMocks` variable for consistent GraphQL mock setup
2. **Direct Mock Data References**: Used `DEFAULT_FIELD_SCHEMES[0].name` instead of hardcoded
   strings
3. **Simple Assertions**: Avoided `new RegExp()` constructors and regex string matching, used direct
   string matching
4. **Comprehensive Coverage**: 25 tests covering accessibility, rendering, interactions, feature
   gates, and error handling
5. **Progressive Enhancement**: Started with basic tests, added complexity gradually
6. **Proper Mock Setup**: Always passed `gqlMocks` to test renderer for proper GraphQL data

### Test Categories That Worked Well

- **Accessibility**: `toBeAccessible()` test
- **Basic Rendering**: Element visibility and role checks
- **User Interactions**: Checkbox toggles, dropdown interactions, keyboard events
- **Feature Gates**: Both enabled and disabled states with proper terminology
- **Error Handling**: GraphQL error scenarios
- **State Management**: Pre-selected schemes and state restoration
- **Complex Workflows**: Multi-step interactions with proper async handling

### Mock Data Integration Pattern

```typescript
// ✅ GOOD: Use direct mock data references
expect(screen.getByText(DEFAULT_FIELD_SCHEMES[0].name)).toBeVisible();
expect(screen.getByRole('option', { name: DEFAULT_FIELD_CONFIG_SCHEMES[0].name })).toBeVisible();

// ❌ BAD: Creating unnecessary constants for existing mock data
const SCHEME_NAME_MARKETING = 'Marketing Field Scheme';
expect(screen.getByText(SCHEME_NAME_MARKETING)).toBeVisible();

// ❌ BAD: Hardcoded strings
expect(screen.getByText('Default Field Scheme Is No More')).toBeVisible();
```

### Test Constants Strategy

```typescript
// ✅ GOOD: Constants only for test-specific values not in mock data
const ERROR_TITLE = 'Something went wrong';
const ERROR_DESCRIPTION = 'Refresh the page and try again.';

// ✅ GOOD: Direct mock data references
expect(screen.getByText(DEFAULT_FIELD_SCHEMES[0].name)).toBeVisible();

// ❌ AVOID: Constants for data that exists in mock files
const SCHEME_NAME_LEGACY_MARKETING = DEFAULT_FIELD_CONFIG_SCHEMES[0].name;
expect(screen.getByText(SCHEME_NAME_LEGACY_MARKETING)).toBeVisible();
```

### Common Mock Variable Pattern

```typescript
// ✅ GOOD: Consistent mock setup
const commonMocks = [
  {
    request: queryMocks.optInModalQuery.request,
    result: () => getOptInModalQueryResponse(),
  },
  queryMocks.optInModalUpdateMutation,
];

// Use in tests
renderWithDi(<ComponentTestRenderer gqlMocks={commonMocks} />);
```

## userEvent Interaction Patterns

See
[Common userEvent Patterns](/jira/docs/llm/agent-instructions/common/unit-testing.md#common-userevent-patterns)
in the common guide for:

- Text input interactions
- Button and click interactions
- Keyboard interactions
- Form element interactions
- Best practices

### Field Scheme-Specific Patterns from CreateSidebarContent.test.tsx

#### Form Submission Pattern

```typescript
// 1. Fill form fields
const nameInput = screen.getByRole('textbox', { name: 'Name' });
const descriptionInput = screen.getByRole('textbox', { name: 'Description' });
await userEvent.type(nameInput, 'Test Scheme');
await userEvent.type(descriptionInput, 'Test Description');

// 2. Submit form
await userEvent.click(screen.getByRole('button', { name: 'Create' }));

// 3. Verify async results
await waitFor(() => {
	expect(showSuccessFlagMock).toHaveBeenCalledWith({
		title: 'Test Scheme created',
		description: 'Expected success message',
	});
});
```

#### Error Handling Pattern

```typescript
// 1. Fill form with invalid data
const nameInput = screen.getByRole('textbox', { name: 'Name' });
await userEvent.type(nameInput, 'Invalid Name');

// 2. Submit form
await userEvent.click(screen.getByRole('button', { name: 'Create' }));

// 3. Verify error state
await waitFor(() => {
	expect(showErrorFlagMock).toHaveBeenCalledWith({
		title: 'Validation Error',
		description: 'Expected error message',
	});
});

// 4. Verify side effects don't happen
expect(closeSidebarMock).not.toHaveBeenCalled();
```

## Key Imports Reference

**Field Scheme-specific imports:**

```typescript
// Field Scheme mock infrastructure (use existing)
import {
	MockedRelayProvider,
	mockedEnvironment,
	queryMocks,
	getComponentQueryResponse,
} from './MockedRelayProvider.tsx';
import { DEFAULT_FIELD_SCHEMES, DEFAULT_FIELD_CONFIG_SCHEMES } from './mockData.tsx';

// Relay for Field Scheme components
import { loadQuery } from 'react-relay';
import FIELD_SCHEME_QUERY, {
	type FieldSchemeQuery,
} from '../src/__generated__/FieldSchemeQuery.graphql';
```

For core testing utilities, see the
[common unit-testing guide](/jira/docs/llm/agent-instructions/common/unit-testing.md).
