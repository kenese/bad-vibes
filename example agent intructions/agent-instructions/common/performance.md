# Performance Optimization

<!-- meta:
  mode: expert
  topic: performance
  audience: ai-agent
  model: sonnet-4
  token_budget: long
  priority: high
  read_when: implementing features with rendering or loading concerns
  depends_on: [state-management.md]
  last_review: 2025-01-24
-->

> Strategic guidance for building high-performance React applications in Jira. Focus on critical
> metrics like TTVC (Time to Visually Complete), component rendering optimization, and data loading
> patterns.

<Self-Reflection>
- Performance patterns exist for critical business reasons - Jira serves millions of users
- TTVC (Time to Visually Complete) is a primary metric; don't compromise initial paint for
  convenience
- Existing patterns like Relay fragments and resource loading reflect real-world scale constraints
- Component architecture decisions have cascading performance impacts across the entire tree
</Self-Reflection>

<Where-To-Find-It>

- **State patterns**: See [State Management](./state-management.md) for Relay, Sweet State, and
  resource patterns
- Code splitting: `@atlassian/react-loosely-lazy` → TTVC-optimized lazy loading with browser
  scheduling
- Entrypoints: `@atlassian/jira-entrypoint-*` → `/jira/src/packages/platform/entrypoints/`
- Performance monitoring: `@atlaskit/react-ufo` → UFO performance tracking, TTVC metrics
- Bundle analysis: Webpack bundle analyzer tools
- Component profiling: React DevTools Profiler </Where-To-Find-It>

<Design-Philosophy-Rationale>

Performance is a feature, not an afterthought. Jira's scale demands proactive performance patterns:

- **TTVC First**: Critical content must render immediately; defer everything else
- **Minimize Render Cascades**: Component isolation prevents unnecessary re-rendering of large trees
- **Strategic Code Splitting**: Balance bundle size with TTVC requirements
- **Optimal Data Loading**: Start data fetching as early as possible in the page lifecycle when
  needed for initial paint </Design-Philosophy-Rationale>

<Core-Concepts>

### Render Optimization Hierarchy

1. **State Management Patterns** - See [State Management](./state-management.md) for Relay fragments
   and Sweet State selectors
2. **Component Architecture** - Isolate re-rendering concerns through strategic component splitting
3. **Algorithmic Efficiency** - Optimize data structures and iteration patterns

### Loading Performance Hierarchy

1. **Resource Loading** - See [State Management](./state-management.md) for data fetching patterns
2. **Bundle Optimization** - Strategic code splitting with entrypoints
3. **Critical Path Prioritization** - TTVC metric optimization </Core-Concepts>

<Quick-Decision-Framework>

**Data fetching for initial paint?**

- YES → See [State Management](./state-management.md) for resource patterns, consider SSR
- NO → Async entrypoint acceptable

**Component causing parent re-renders?**

- Use state isolation patterns from [State Management](./state-management.md) (Relay fragments,
  Sweet State selectors)
- Large render tree → Split component architecture

**Adding new feature?**

- **Route-connected content** → **PREFER entrypoints** (parallel bundle + data loading)
- **Modals/popups/dropdowns** → **PREFER entrypoints** (proper preload on trigger)
- Critical for initial paint → Bundle with main, no code splitting
- SSR initial display only → `lazyForPaint` acceptable (user-blocking priority)
- Self-loading components → `lazyAfterPaint` preferred (user-visible priority)
- Non-critical background code → `lazy` (background priority)

**Performance problem detected?**

- Nested loops → Hash maps/optimized algorithms
- Re-render cascade → Component isolation patterns
- Slow initial load → Resource vs useEffect audit

## Implementation Patterns

### State-Based Render Optimization

**Foundation**: See [State Management](./state-management.md) for Relay fragments and Sweet State
selector patterns.

**Performance Focus**: Use these patterns specifically to isolate re-renders:

- **Relay fragments** isolate components to only re-render when their specific data changes
- **Sweet State selectors** prevent re-renders by subscribing to specific state slices
- **Component colocations** ensure data dependencies don't cause unnecessary parent re-renders

### Component Architecture: Render Isolation

**Pattern**: Split components to isolate re-rendering concerns

```typescript
// AVOID: Hook in parent causes entire app re-render
const App = () => {
  const notifications = useNotifications(); // Causes App re-render
  return (
    <Layout>
      <Header />
      <Sidebar />
      <MainContent />
      <NotificationBadge count={notifications.length} />
    </Layout>
  );
};

// PREFERRED: Isolate re-rendering component
const App = () => (
  <Layout>
    <Header />
    <Sidebar />
    <MainContent />
    <IsolatedNotifications />
  </Layout>
);

const IsolatedNotifications = () => {
  const notifications = useNotifications(); // Only this component re-renders
  return <NotificationBadge count={notifications.length} />;
};
```

### Bundle Optimization: Strategic Code Splitting

**Package**: `@atlassian/jira-entrypoint-*`  
**Purpose**: Load non-critical features asynchronously without impacting Visually Complete

**Package**: `@atlassian/react-loosely-lazy`  
**Purpose**: Component-level code splitting with browser scheduling

**CRITICAL Decision Framework**:

- **Route-connected content** → **STRONGLY PREFER** entrypoints (eliminates waterfall)
- **Modals and dynamic UI** → **STRONGLY PREFER** entrypoints
- **SSR routes (initial display only)** → React-loosely-lazy is acceptable
- **Self-loading components** (render body/useEffect data fetching) → React-loosely-lazy preferred

**Critical Path (bundle immediately)**:

```typescript
// Essential for initial paint - NO code splitting
import { IssueList } from './IssueList';
import { IssueDetails } from './IssueDetails';
```

**Critical but Deferrable (paint-aware splitting)**:

```typescript
import { lazyForPaint } from '@atlassian/react-loosely-lazy';

// Loads during paint phase with 'user-blocking' priority
// Use for components needed soon after initial paint
const IssueCommentsPanel = lazyForPaint(() => import('./IssueCommentsPanel'));
const IssueActivityStream = lazyForPaint(() => import('./IssueActivityStream'));
```

**Behind Interactions (after paint)**:

```typescript
import { lazyAfterPaint } from '@atlassian/react-loosely-lazy';

// Loads after paint with 'user-visible' priority
// Use for modal dialogs, admin panels, advanced features
const AdminSettingsModal = lazyAfterPaint(() => import('./AdminSettingsModal'));
const AdvancedSearchDialog = lazyAfterPaint(() => import('./AdvancedSearchDialog'));
```

**Non-Critical Features (background loading)**:

```typescript
import { lazy } from '@atlassian/react-loosely-lazy';

// Loads in background with lowest priority
// Use for large features not affecting main workflow
const ReportsSection = lazy(() => import('./reports/ReportsEntrypoint'));
const IntegrationsPanel = lazy(() => import('./integrations/IntegrationsEntrypoint'));
```

**Code Splitting Decision Matrix**:

| Content Type              | Approach                  | Priority      | Rationale                           |
| ------------------------- | ------------------------- | ------------- | ----------------------------------- |
| Route-connected content   | **Route Entrypoints**     | Parallel      | Eliminates bundle/data waterfall    |
| Modals, popups, dropdowns | **Component Entrypoints** | On-demand     | User interactions, proper preload   |
| Critical path             | No splitting              | N/A           | Essential for initial paint         |
| SSR initial display       | `lazyForPaint`            | user-blocking | SSR + RLL works for initial render  |
| Self-loading components   | `lazyAfterPaint`          | user-visible  | Component handles own data fetching |
| Background features       | `lazy`                    | background    | Large, non-essential features       |

### Data Loading Performance

**Foundation**: See [State Management](./state-management.md) for resource loading patterns and
remote state approaches.

**Performance Focus**:

- Prioritize resource loading over `useEffect` for critical path data
- Use SSR for fast resources that improve TTVC metrics
- Avoid data fetching in render paths that block initial paint

### Algorithmic Optimization

**Hash Maps Over Nested Loops**:

```typescript
// AVOID: O(n*m) complexity
const findMatchingIssues = (issues: Issue[], filters: Filter[]) => {
	return issues.filter(
		(issue) => filters.some((filter) => matchesFilter(issue, filter)), // Nested iteration
	);
};

// PREFERRED: O(n+m) with hash map
const findMatchingIssues = (issues: Issue[], filters: Filter[]) => {
	const filterMap = new Map(filters.map((f) => [f.key, f.value]));

	return issues.filter((issue) => {
		const filterValue = filterMap.get(issue.type);
		return filterValue && matchesFilter(issue, filterValue);
	});
};
```

## Performance and Correctness

### Critical Metrics

- **TTVC (Time to Visually Complete)**: Primary Atlassian performance metric - prioritize above all
  else
- **Time to Interactive**: Balance async loading with user interaction needs
- **Bundle Size**: Monitor with webpack-bundle-analyzer, but don't over-optimize
- **Re-render Frequency**: Use React DevTools Profiler to identify cascading renders

### Performance Monitoring

**Package**: `@atlaskit/react-ufo`  
**Purpose**: Atlassian's blessed performance tracking framework

```typescript
// Component-level performance measurement
import { UFOSegment } from '@atlaskit/react-ufo';

const IssueListComponent = () => {
  return (
    <UFOSegment name="issue-list-render">
      {/* Component content - UFO automatically measures render time */}
      <IssueList />
    </UFOSegment>
  );
};

// Page-level tracking handled by central watcher
// DO NOT call traceUFOPageLoad/traceUFOTransition directly from components
```

**Key Features**:

- **TTVC tracking** - Measures when page elements stop changing
- **UFO Dev Tool Extension** - Chrome extension for debugging performance
- **Performance Portal integration** - Centralized performance dashboards
- **Component isolation** - UFOSegment for individual component measurement
  </Performance-And-Correctness>

<LLM-Agent-Decision-Matrix>

**When implementing new features**:

1. **Determine criticality**: Is this required for initial paint?
   - YES → Bundle immediately, use resources for data
   - NO → Consider async entrypoint

2. **Choose appropriate code splitting**:
   - **Route-connected → PREFER entrypoints** (eliminates waterfall)
   - **Modals/dynamic UI → PREFER entrypoints** (proper preload)
   - Essential for TTVC → Bundle immediately
   - SSR initial display → `lazyForPaint` acceptable
   - Self-loading components → `lazyAfterPaint` preferred
   - Large/non-critical → `lazy`

3. **Identify data patterns**:
   - GraphQL available → Use Relay fragments
   - Complex state → Sweet state selectors
   - Simple state → Built-in React patterns

4. **Analyze render impact**:
   - Component affects large tree → Isolate with architecture split
   - Frequent updates → Memoization and selective rendering
   - Complex calculations → Hash maps and algorithmic optimization

5. **Validate performance impact**:
   - TTVC measurement with UFO monitoring and Performance Portal
   - Bundle size analysis with webpack tools
   - Render profiling with React DevTools and UFOSegment
   - Load testing with realistic data volumes </LLM-Agent-Decision-Matrix>

<Navigation-For-LLM-Agents>

**Prerequisites** (read BEFORE starting):

- [State Management](./state-management.md) - CRITICAL for render optimization and data loading
  patterns
- [Component Design](../implementation/component-design.md) - for architectural decisions

**Workflow Dependencies** (consult DURING implementation):

- [Feature Gates](../implementation/feature-gates.md) - performance features need gating
- [SSR Guidelines](./ssr.md) - when considering server-side rendering

**Validation Checkpoints** (verify AFTER implementation):

- [Unit Testing](../implementation/unit-testing.md) - performance impact in tests
- UFO Performance Portal - verify TTVC metrics and page load performance
- Bundle analysis tools - verify code splitting impact

**Conditional Navigation**:

- IF implementing data-heavy features → [State Management](./state-management.md)
- IF adding new entrypoints → Build tools documentation
- IF render performance issues → [State Management](./state-management.md) for isolation patterns
- IF complex state updates → [State Management](./state-management.md) for selector patterns
  </Navigation-For-LLM-Agents>
