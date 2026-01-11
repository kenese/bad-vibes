# Field Scheme Development Guidelines

## Quick Reference

- [Coding Standards](./coding-standards.md) - React, TypeScript, and Atlaskit best practices
- [Testing Conventions](./testing-conventions.md) - Testing patterns and tools
- [Project Conventions](./project-conventions.md) - Relay vs Standard React components
- [Directory Structure](./directory-structure.md) - Project organization
- [PR Review Instructions](./prompts/pr-review.md) - How to conduct PR reviews
- [Project Overview](./project-overview.md) - High-level project goals and features

## Common Context Files

- [Entry Points](../../common/entry-points.md) - Modal, popup, and dropdown patterns
- [Feature Gates & Experiments](../../common/feature-gates-experiments.md) - Feature gating patterns
- [Forms](../../common/forms.md) - Form implementation with @atlaskit/form
- [Integration Testing](../../common/integration-testing.md) - Playwright integration testing
- [Performance](../../common/performance.md) - Performance optimization patterns
- [SSR Guidelines](../../common/ssr.md) - Server-side rendering considerations
- [State Management](../../common/state-management.md) - Relay, Sweet State, and routing patterns
- [Unit Testing](../../common/unit-testing.md) - Comprehensive unit testing patterns

## Usage

These files provide comprehensive guidance for developing the Field Scheme admin interface. Start
with the Coding Standards for general practices, then refer to specific sections as needed.

## File Relationships

```
coding-standards.md ← Foundation for all development
         ↓
testing-conventions.md ← Testing-specific guidelines
         ↓
project-conventions.md ← Component architecture patterns
         ↓
directory-structure.md ← Project organization
```

## Development Workflow

1. **Start Here** → Review [Coding Standards](./coding-standards.md) for general practices
2. **Testing** → Follow [Testing Conventions](./testing-conventions.md) for test implementation
3. **Architecture** → Use [Project Conventions](./project-conventions.md) for component design
4. **Organization** → Reference [Directory Structure](./directory-structure.md) for file placement
5. **Review** → Use [PR Review Instructions](./prompts/pr-review.md) for code review process

## Common Patterns Reference

- **Modals/Popups** → [Entry Points](../../common/entry-points.md) for proper implementation
- **Feature Flags** → [Feature Gates & Experiments](../../common/feature-gates-experiments.md) for
  gating patterns
- **Forms** → [Forms](../../common/forms.md) for @atlaskit/form implementation
- **Performance** → [Performance](../../common/performance.md) for optimization patterns
- **State Management** → [State Management](../../common/state-management.md) for Relay/Sweet State
  patterns
