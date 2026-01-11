---
title: 'Project Overview'
description: 'High-level goals and features for Field Scheme admin interface'
related:
  - coding-standards.md
  - testing-conventions.md
  - project-conventions.md
  - directory-structure.md
  - ../../common/entry-points.md
  - ../../common/performance.md
  - ../../common/state-management.md
tags: [project-overview, field-scheme, admin-interface, jira]
---

# Project Overview

## Goal

Build a front end UI for admin settings within Jira to enable users to manage specific field schemes

## Key Features

- User can view and filter a table of field schemes
- Users can access sidebars within the action menu for each table cell row
- Users can view and edit the configuration of a specific field scheme
- Comprehensive dropdown selection for work types
- Field association management
- Advanced settings configuration

## Technical Stack

- **Frontend Framework**: React with TypeScript
- **UI Components**: Atlaskit design system
- **State Management**: Relay for GraphQL data
- **Testing**: Jest with React Testing Library
- **Styling**: xcss with Atlaskit tokens

## Architecture Overview

The application follows a component-based architecture with clear separation between:

- **Common UI Components**: Reusable, generic components
- **Feature Components**: Domain-specific business logic
- **Controllers**: Business logic and data management
- **Entry Points**: Application entry points with data preloading

## See Also

- [Coding Standards](./coding-standards.md) - Development best practices
- [Testing Conventions](./testing-conventions.md) - Testing guidelines
- [Project Conventions](./project-conventions.md) - Component architecture
- [Directory Structure](./directory-structure.md) - Project organization
- [Entry Points](../../common/entry-points.md) - Entry point architecture
- [Performance](../../common/performance.md) - Performance considerations
- [State Management](../../common/state-management.md) - Data management patterns
