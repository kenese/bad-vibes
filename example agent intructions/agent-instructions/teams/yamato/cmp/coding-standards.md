---
title: 'Coding Standards'
description: 'React, TypeScript, and Atlaskit best practices for Field Scheme development'
related:
  - testing-conventions.md
  - project-conventions.md
  - directory-structure.md
  - ../../common/entry-points.md
  - ../../common/feature-gates-experiments.md
  - ../../common/forms.md
tags: [coding-standards, react, typescript, atlaskit, field-scheme]
---

# Base coding standards

Follow [Base Coding Standards](../../docs/llm/agent-instructions/common.md) for foundation-level
coding conventions.

## General Best Practices

- **Handle errors gracefully**: Implement proper error boundaries and error handling patterns
- **Optimize for performance**: Use React.memo, useMemo, and useCallback appropriately to prevent
  unnecessary re-renders
- **Write self-documenting code**: Use clear function and variable names that explain intent without
  requiring comments
- **Keep components focused**: Follow single responsibility principle - each component should have
  one clear purpose
- **Use descriptive variable names**: Choose meaningful names that clearly express intent and
  purpose (e.g., `hasNoSchemes`, `isFeatureEnabled` instead of generic names like `flag` or `value`)
- **Use descriptive names for Relay query results**: When destructuring Relay query results, use
  meaningful variable names that reflect the content being queried (e.g., `fieldConfig`,
  `schemeData`, `queryData`) instead of generic names like `data`
- **Prefer optional chaining for type safety**: Use optional chaining (`?.`) when accessing nested
  properties from GraphQL queries or fragment data to prevent runtime errors when data might be
  undefined and improve code robustness

## Styling Guidelines

- **Prefer token values over hardcoded measurements**: Use token values (e.g., token('space.200'))
  instead of hardcoded pixel values
- **Prefer xcss over styled-components**: Prefer xcss with @atlaskit/css over styled-components

## Component Usage

- **Use compiled atlaskit primitives**: Consider using @atlaskit primitives (Box, Stack, Inline),
  specifically compiled exports ('@atlaskit/primitives/compiled') instead of div elements
- **Use components from @atlaskit**: Prioritise @atlaskit components instead of HTML elements

## React Patterns

- **Use consistent event handlers**: Use consistent event handler naming and parameters

## Testing

- **Proper test helpers**: Consider adding proper typing to mock functions
- **Reliable test selectors**: Ensure testids follow the pattern:
  'admin-pages-{feature}-{component}.{element}'

## Data Management

- **Relay connection handling**: Import ConnectionHandler from relay-runtime before using it
- **Mock data in production code**: Ensure mock data generators are only used in tests or
  development. Ensure mock data between components are captured in the common mock file, whilst
  single use mocks are captured in test and example files
- **Relay fragment container pattern**: Ensure Relay fragments follow naming conventions:
  {ComponentName}

## Performance

- **Performance for large lists**: Consider using virtualization for large lists or memoizing list
  items
- **Optimize conditional logic**: Leverage JavaScript's lazy evaluation by ordering conditions from
  most likely to least likely, or from cheapest to most expensive operations (e.g., place boolean
  checks before length checks for better performance)

## See Also

- [Testing Conventions](./testing-conventions.md) - Testing patterns and conventions
- [Project Conventions](./project-conventions.md) - Relay vs Standard React patterns
- [Directory Structure](./directory-structure.md) - Project organization
- [Entry Points](../../common/entry-points.md) - Modal, popup, and dropdown patterns
- [Feature Gates & Experiments](../../common/feature-gates-experiments.md) - Feature gating patterns
- [Forms](../../common/forms.md) - Form implementation with @atlaskit/form
