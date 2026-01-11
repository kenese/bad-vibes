---
title: 'Directory Structure'
description: 'Project organization and file structure for Field Scheme admin interface'
related:
  - coding-standards.md
  - testing-conventions.md
  - project-conventions.md
  - project-overview.md
  - ../../common/entry-points.md
tags: [directory-structure, project-organization, field-scheme]
---

# Directory Structure

## Project Layout

The project uses a **flattened structure** for component organization:

1. **Flattened Structure** (Current): Most components placed directly in the `src/` directory

### Root Level Structure

- **examples/**: Storybook examples and component stories
- **src/**: Main source code directory
- **tests/**: Unit and integration tests
- **vr-tests/**: Visual regression tests

## Flattened Structure

Most components are placed directly in the `src/` directory for easier navigation and maintenance.

### Source Directory (`src/`)

The `src/` directory contains components organized by naming conventions rather than deep folder
hierarchies.

## Component Organization Principles

### Flattened Structure Principles

The flattened structure organizes components by **functional purpose** rather than deep folder
hierarchies:

1. **Core Components**: Main application and page components (FieldSchemesApp, FieldSchemesPage)
2. **Feature Components**: Domain-specific UI components (ActionsMenu, Content, OptInModal)
3. **Entry Points**: Entry point components for modals and sidebars
4. **Utility Components**: Reusable UI components (EmptyTablePanel, SearchFilterInput)
5. **Custom Hooks**: Business logic and state management hooks (useFlags, useOpenCreateSidebar)
6. **Constants & Utilities**: Shared constants and utility functions
7. **Type Definitions**: TypeScript type definitions organized by feature
8. **Message Files**: Internationalization message files
9. **Specialized UI**: Complex UI components with VR tests in `ui/` subdirectories
10. **Tests**: Co-located in `tests/` directory for easy maintenance

## File Naming Conventions

- **Components**: `{ComponentName}.tsx` (e.g., `ActionsMenu.tsx`, `Content.tsx`)
- **Tests**: `{ComponentName}.test.tsx` (e.g., `ActionsMenu.test.tsx`, `Content.test.tsx`)
- **Examples**: `{ComponentName}.examples.tsx` (e.g., `ActionsMenu.examples.tsx`,
  `Content.examples.tsx`)
- **Types**: `{FeatureName}.types.tsx` (e.g., `FormData.types.tsx`, `SidebarId.types.tsx`)
- **Messages**: `{ComponentName}.messages.tsx` (e.g., `ActionsMenu.messages.tsx`)
- **Entry Points**: `{feature}EntryPoint.tsx` (e.g., `createSidebarEntryPoint.tsx`)
- **Custom Hooks**: `use{FeatureName}.tsx` (e.g., `useFlags.tsx`, `useOpenCreateSidebar.tsx`)
- **Constants**: `{feature}.constants.tsx` (e.g., `maxFieldNameCharLength.constants.tsx`)
- **Utilities**: `{featureName}.tsx` (e.g., `getMutationErrorMessage.tsx`, `hydrateClientData.tsx`)

## When to Use Subdirectories

Subdirectories are still used for:

- **Complex UI Components**: Components with multiple related files (e.g., `ui/modals/`,
  `ui/sidebars/`)
- **Visual Regression Tests**: VR tests are co-located with their components
- **Generated Files**: Auto-generated VR test files are kept in dedicated subdirectories

## See Also

- [Coding Standards](./coding-standards.md) - General coding best practices
- [Testing Conventions](./testing-conventions.md) - Testing patterns and conventions
- [Project Conventions](./project-conventions.md) - Component architecture patterns
- [Project Overview](./project-overview.md) - High-level project goals
- [Entry Points](../../common/entry-points.md) - Entry point organization patterns
