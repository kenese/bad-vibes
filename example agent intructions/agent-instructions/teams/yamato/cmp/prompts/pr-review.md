---
title: 'PR Review Instructions'
description: 'Field Scheme PR review with team-specific standards'
related:
  - /jira/docs/llm/agent-instructions/teams/yamato/cmp/coding-standards.md
  - /jira/docs/llm/agent-instructions/teams/yamato/cmp/testing-conventions.md
  - /jira/docs/llm/agent-instructions/teams/yamato/cmp/project-conventions.md
  - /jira/docs/llm/agent-instructions/teams/yamato/cmp/directory-structure.md
  - /jira/docs/llm/agent-instructions/common/code-review.md
tags: [pr-review, code-review, field-scheme]
---

# PR Review Instructions - Field Scheme

> **Base Instructions**: Follow the comprehensive review workflow in
> [Code Review](/jira/docs/llm/agent-instructions/common/code-review.md)
>
> This document provides **Field Scheme team-specific** context and focus areas.

## Package Context

```bash
PACKAGE_PATH="jira/src/packages/admin-pages/field-scheme"
```

## Review Workflow

Follow the standard review workflow from
[Code Review Instructions](/jira/docs/llm/agent-instructions/common/code-review.md):

1. **Phase 0**: Run the code-review-helper script
2. **Phase 1**: Read generated `review.md` file
3. **Phase 2**: Analyze changes using team standards (below)
4. **Phase 3**: Report findings using standard output format

## Team-Specific Review Context

Before reviewing, load these team standards:

- [Coding Standards](/jira/docs/llm/agent-instructions/teams/yamato/cmp/coding-standards.md) -
  React, TypeScript, and Atlaskit best practices
- [Testing Conventions](/jira/docs/llm/agent-instructions/teams/yamato/cmp/testing-conventions.md) -
  Unit testing, integration testing, and accessibility patterns
- [Project Conventions](/jira/docs/llm/agent-instructions/teams/yamato/cmp/project-conventions.md) -
  Relay vs Standard React components, entry points, and GraphQL patterns
- [Directory Structure](/jira/docs/llm/agent-instructions/teams/yamato/cmp/directory-structure.md) -
  Project organization and file naming conventions

## Field Scheme Focus Areas

When reviewing changes in `field-scheme`, prioritize these team-specific concerns:

### Architecture & Patterns

- **Component patterns**: Relay components (domain logic) vs Standard React components (reusable UI)
- **Directory structure**: `/common/ui` for reusable components, `/ui` for feature components,
  `/controllers` for business logic
- **Entry points**: Use preloaded queries, avoid lazy loading for performance
- **Data management**: Proper Relay fragment usage, fragment references over raw values
- **GraphQL**: Use descriptive field aliases, proper fragment naming (`{ComponentName}_data`)

### Testing Requirements

- **Coverage**: Unit tests (`.test.tsx`), integration tests (`test.tsx`), examples (`.examples.tsx`)
- **Patterns**: Use `@atlassian/jira-testing-library`, `renderWithDi`, `createMockEnvironment`
- **Accessibility**: Always include `toBeAccessible()` matcher
- **Mock data**: Realistic test data matching GraphQL schema, proper factory functions
- **Visual regression**: Use `@atlassian/jira-vr-testing` for `vr-tests/index.vr.tsx`

### Component Implementation

- **Atlaskit**: Use compiled primitives (Box, Stack, Inline), Button components
- **Styling**: Use token values (`token('space.200')`), prefer xcss over styled-components
- **Performance**: React.memo, useMemo, useCallback, virtualization for large lists
- **Error handling**: Proper error boundaries and graceful degradation
- **Internationalization**: Use FormattedMessage/useIntl for all user-facing strings

### Code Quality Priorities

- **Naming**: Descriptive names that express intent (`hasNoSchemes` vs `flag`, `fieldConfig` vs
  `data`)
- **Type safety**: Use optional chaining (`?.`) for nested GraphQL properties
- **Single responsibility**: Each component should have one clear purpose
- **Test selectors**: Follow pattern `admin-pages-{feature}-{component}.{element}`

### Accessibility Requirements

- **ARIA**: Proper labels, keyboard navigation, screen reader compatibility
- **Focus management**: Proper focus handling and return targets
- **Testing**: Use userEvent for interaction testing

## Output Format

Use the standard format from
[Code Review Instructions](/jira/docs/llm/agent-instructions/common/code-review.md#output-format):

- 🔴 **Critical Issues** - Must fix before merge
- 🟡 **Important Improvements** - Should address
- 🟢 **Nice-to-haves** - Consider for future
- ❓ **Questions** - Need clarification

**Focus on problems only.** Do NOT comment on what's done well.
