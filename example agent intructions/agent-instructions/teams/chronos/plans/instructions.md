# Instructions for Jira Plans

Jira Plans (Advanced Roadmaps) is a sophisticated planning and visualization tool within Jira that
allows teams to create cross-project roadmaps, manage dependencies, and track progress across
multiple teams and initiatives.

## Architecture Overview

Jira Plans follows a **layered architecture** with clear separation of concerns:

### 1. **Core Layers**

- **`view/`** - React components and UI layer organized by feature areas
- **`query/`** - Data layer with selectors, reducers, and business logic
- **`command/`** - Action creators and command handlers for state mutations
- **`state/`** - Redux state management with domain and UI state separation
- **`observer/`** - Background processes and state synchronization
- **`analytics/`** - Event tracking and performance monitoring
- **`util/`** - Shared utilities and helper functions

### 2. **State Management Architecture**

Plans uses **Redux** with a **CQRS-like pattern**:

```typescript
// Main state structure
type State = {
	readonly domain: Domain; // Business logic state
	readonly ui: Ui; // UI-specific state
};
```

**Command Pattern**: All state mutations go through command dispatchers:

- Commands handle business logic and validation
- Queries provide read-only access to state
- Observer pattern handles side effects and background sync

### 3. **Main Feature Areas**

The application is organized into core feature areas under `view/main/tabs/`:

- **`roadmap/`** - Timeline visualization, Gantt charts, issue bars
- **`dependencies/`** - Cross-project dependency management
- **`releases/`** - Release planning and version management
- **`teams/`** - Team capacity and resource planning

## Key Components and Patterns

### 1. **Query Layer Pattern**

All data access goes through the query layer with strong typing:

```typescript
// Example from query/issues/index.tsx
export const getFilteredIssues = createSelector(
	[getRawIssues, getActiveFilters],
	(issues, filters) => applyFilters(issues, filters),
);
```

### 2. **Command Pattern**

State mutations use command objects:

```typescript
// Commands are dispatched through the command layer
type InitialLoadAction = {
	type: typeof INITIAL_LOAD;
	payload: InitialConfig;
};
```

### 3. **Observer Pattern**

Background processes handle:

- **Relations Loader** - Fetches related data (projects, sprints, versions)
- **Active View Persistor** - Saves user preferences
- **Solution Validity Checker** - Validates plan consistency

### 4. **Component Architecture**

Components follow a **container/presenter pattern**:

```tsx
// Feature components are organized by domain
src/app-simple-plans/view/main/tabs/roadmap/
├── timeline/           # Timeline visualization
├── table/             # Issue table view
├── scope/             # Issue scope management
├── dependencies-flyout/ # Dependency editing
└── view-settings/     # Display configuration
```

## Development Guidelines

### 1. **State Management**

- **Always use selectors** from the query layer, never access state directly
- **Commands** should be dispatched through the command layer
- **Keep UI state separate** from domain state
- **Use observers** for side effects and background data loading

### 2. **Component Development**

- **Storybook first**: Develop components in isolation with [`examples.tsx`] files
- **Feature-based organization**: Group related components by business domain
- **Separation of concerns**: Keep presentation logic separate from business logic

### 3. **Data Flow**

```
User Interaction → Command → State Update → Query Selectors → Component Re-render
                     ↓
                  Observer → Background Sync
```

### 4. **Performance Considerations**

- **Memoized selectors**: Use `reselect` for expensive computations
- **Lazy loading**: Features load asynchronously as needed
- **Virtual scrolling**: For large datasets in timeline views
- **Relaxed scheduling**: Background tasks use `requestIdleCallback`

### 5. **Integration Points**

Plans integrates with several Jira systems:

- **Jira Issues API** - Core issue data and updates
- **Agile/Scrum data** - Sprints, boards, and velocity
- **Project configuration** - Custom fields, workflows, permissions
- **Cross-project dependencies** - Issue links and blocking relationships

## Common Development Patterns

### 1. **Adding New Features**

1. **Define command types** in `command/feature/types.tsx`
2. **Create query selectors** in `query/feature/index.tsx`
3. **Build UI components** in `view/main/tabs/feature/`
4. **Add state reducers** in appropriate domain areas
5. **Create Storybook examples** for testing

### 2. **State Updates**

```typescript
// Always dispatch through commands
dispatch(
	updateIssueCommand({
		issueId: 'PROJ-123',
		updates: { assignee: 'user-id' },
	}),
);

// Read through selectors
const issues = useSelector(getFilteredIssues);
```

### 3. **Feature Flags**

Plans extensively uses feature flags for gradual rollout:

```tsx
import { fg } from '@atlassian/jira-feature-flag';

// Feature-gated components
{
	fg('advanced_roadmaps_new_timeline') && <NewTimelineView />;
}
```

### 4. **Testing Strategy**

- **Unit tests**: Test selectors and utility functions
- **Integration tests**: Use Playwright for end-to-end flows
- **Storybook**: Visual regression testing with examples
- **Performance**: Monitor with analytics and long-task tracking

## Key Files and Entry Points

- [`view/main/tabs/roadmap/`] - Main timeline and roadmap visualization
- [`query/issues/index.tsx`] - Core issue data and filtering
- [`state/types.tsx`] - Root state type definitions
- [`command/types.tsx`] - Command action type definitions
- [`observer/`] - Background sync and side effect management

## Common Gotchas

1. **Always use query selectors** - Never access Redux state directly
2. **Commands for mutations** - All state changes must go through the command layer
3. **Feature flag everything** - New features should be behind feature gates
4. **Performance-conscious** - Plans handles large datasets, optimize accordingly
5. **Cross-project complexity** - Be aware of multi-project data dependencies

## Related Packages

Plans integrates with several related packages:

- [`@atlassian/jira-portfolio-3-common`] - Shared utilities and types
- [`spa-apps/advanced-roadmaps/plan`] - Modern React-based Plans implementation
- [`global-pages/directories/plans-directory`] - Plans listing and navigation

This architecture supports complex planning scenarios while maintaining performance and user
experience across large-scale Jira deployments.
