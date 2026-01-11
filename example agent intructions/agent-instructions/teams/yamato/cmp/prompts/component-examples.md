---
title: 'Component Examples Generation Prompt - Field Schemes'
description: 'Field Scheme-specific patterns for Storybook examples'
related:
  - /jira/docs/llm/agent-instructions/teams/yamato/cmp/testing-conventions.md
  - /jira/docs/llm/agent-instructions/common/storybook-examples.md
tags: [ai-prompt, examples, storybook, relay-mocking, component-examples, field-schemes]
---

# Component Examples Generation Prompt - Field Schemes

**IMPORTANT**: This guide contains Field Scheme-specific patterns. For general Storybook examples
patterns, see
[Storybook Examples (Common)](/jira/docs/llm/agent-instructions/common/storybook-examples.md) first.

Use this prompt when generating `.examples.tsx` files for Field Scheme components. This ensures
consistency with team patterns and proper Relay mocking.

## Prerequisites

Read [Storybook Examples (Common)](/jira/docs/llm/agent-instructions/common/storybook-examples.md)
for:

- Environment consistency patterns (CRITICAL)
- Mock data strategies
- Feature flag integration
- Import order standards
- Troubleshooting common issues

## AI Prompt Template

Generate or extend a component example file for {ComponentName} following these requirements:

## Step 1: Check Existing File

- If file exists: Read it, identify gaps, and extend it
- If file doesn't exist: Create new file from scratch

## Step 2: Field Scheme-Specific Patterns

### Mock Data Utilities

Field Schemes package provides these utilities in `tests/`:

- **`createFieldScheme()`**: Generate mock field scheme data
- **`MockedRelayProvider.tsx`**: Common query mocks and environment utilities
- **`queryMocks`**: Shared mocks for field schemes queries

Example:

```typescript
import { createFieldScheme } from '../tests/createFieldScheme.tsx';
import { queryMocks } from '../tests/MockedRelayProvider.tsx';

const MockedFieldScheme = createFieldScheme({
	name: 'Test Field Scheme',
	description: 'A test field scheme',
	fieldsCount: 5,
	projectsCount: 3,
});
```

### Common Field Scheme Queries

Most Field Scheme components use these queries (import from generated):

- `FieldSchemeQuery` - Fetch single scheme details
- `FieldSchemesQuery` - List all schemes
- `UpdateFieldSchemeMutation` - Modify scheme
- `DeleteFieldSchemeMutation` - Delete scheme
- `CreateFieldSchemeMutation` - Create new scheme

### Typical Variables Pattern

```typescript
const schemeQuery = loadQuery<FieldSchemeQuery>(mockedEnvironment, FIELD_SCHEME_QUERY, {
	fieldSchemeAri: MockedFieldScheme.id, // Use ARI format
});
```

## Step 3: Field Scheme-Specific Implementation

### Modal Component Pattern

Field Scheme modals typically follow this pattern:

```typescript
// 1. Mock field scheme data
const MockedFieldScheme = createFieldScheme({
  name: 'Default Field Scheme',
  description: 'Used in most projects',
  fieldsCount: 42,
  projectsCount: 15,
});

// 2. Render with modal wrappers (see common guide for full pattern)
const RenderModal = ({ gqlMocks }: { gqlMocks?: MockResponseRelay[] }) => {
  // Environment setup per common guide...

  return (
    <RelayEnvironment>
      <ModalContextProvider>
        <ModalDialog onClose={action('onClose')}>
          <FieldSchemeComponent
            queries={{ schemeQuery }}
            props={{
              onClose: action('onClose'),
              // Field Scheme modals typically control modal behavior
              setShouldCloseOnEscapePress: action('setShouldCloseOnEscapePress'),
              setShouldCloseOnOverlayClick: action('setShouldCloseOnOverlayClick'),
            }}
            entryPoints={{}}
            extraProps={{}}
          />
        </ModalDialog>
      </ModalContextProvider>
    </RelayEnvironment>
  );
};
```

### Common Error Scenarios for Field Schemes

```typescript
// Scheme not found error
export const SchemeNotFound = () => {
  const ERROR_TYPES = {
    SCHEME_NOT_FOUND: 'SCHEME_NOT_FOUND',
  };

  const mocks = [{
    request: { query: UPDATE_FIELD_SCHEME_MUTATION, variables: /.*/ },
    result: {
      data: {
        jira_updateFieldScheme: {
          success: false,
          errors: [{ message: ERROR_TYPES.SCHEME_NOT_FOUND }],
        },
      },
    },
  }];

  return <RenderModal gqlMocks={[...mocks, ...Object.values(queryMocks)]} />;
};

// Scheme in use (cannot delete)
export const SchemeInUse = () => {
  const mocks = [{
    request: { query: DELETE_FIELD_SCHEME_MUTATION, variables: /.*/ },
    result: {
      data: {
        jira_deleteFieldScheme: {
          success: false,
          errors: [{ message: 'Cannot delete scheme that is in use' }],
        },
      },
    },
  }];

  return <RenderModal gqlMocks={[...mocks, ...Object.values(queryMocks)]} />;
};
```

## Step 4: Validation

See
[Common Guide - Implementation Checklist](/jira/docs/llm/agent-instructions/common/storybook-examples.md#Implementation-Checklist)
plus Field Scheme specifics:

- [ ] Uses `createFieldScheme()` for mock data
- [ ] Modal components wrapped with `ModalContextProvider` and `ModalDialog`
- [ ] Field Scheme-specific modal props included
- [ ] Common error scenarios covered (NotFound, InUse, etc.)
- [ ] `queryMocks` imported from `MockedRelayProvider`

## Reference Files

**Field Scheme Examples:**

- `DeleteSchemeModal.examples.tsx` - Modal with delete mutation
- `EditSchemeModal.examples.tsx` - Modal with update mutation
- `CreateSchemeModal.examples.tsx` - Modal with create mutation

**Team Documentation:**

- [Testing Conventions](/jira/docs/llm/agent-instructions/teams/yamato/cmp/testing-conventions.md) -
  Field Scheme-specific mock patterns
- [Directory Structure](/jira/docs/llm/agent-instructions/teams/yamato/cmp/directory-structure.md) -
  Package organization
- [Coding Standards](/jira/docs/llm/agent-instructions/teams/yamato/cmp/coding-standards.md) - Team
  code style

**Common Documentation:**

- [Storybook Examples (Common)](/jira/docs/llm/agent-instructions/common/storybook-examples.md) -
  General patterns and troubleshooting
- [Feature Gates](/jira/docs/llm/agent-instructions/common/feature-gates-experiments.md) - Feature
  flag integration
- [Integration Testing](/jira/docs/llm/agent-instructions/common/integration-testing.md) - If
  examples used in Playwright tests
