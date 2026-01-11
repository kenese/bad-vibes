<!-- meta:
  mode: expert
  topic: feature-gates-experiments
  audience: ai-agent
  model: sonnet-4
  token_budget: medium
  priority: critical
  read_when: implementing feature gates or experiments
  depends_on: []
  last_review: 2025-09-02
-->

- For instructions to clean up or remove Feature Gates Follow instructions
  [feature gate cleanup instructions](./clean-up-feature-gates.md)

<Core-Packages>
- Package: `@atlassian/jira-feature-gating`

- Purpose: Provides the main API (`fg`) for feature gating logic in Jira frontend components
- Key features:
  - `fg` conditional helper for feature gates
  - Static analysis-friendly string literal enforcement
- Location: `/jira/src/packages/platform/feature-gating/`
- Usage: Gating logic in React components and business logic

- Package: `@atlassian/jira-feature-gate-component`
  - Purpose: Enables feature gating at the React component level
  - Key features:
    - `componentWithFG` HOC for React components
    - Cleaner syntax for component-level gating
  - Location: `/jira/src/packages/platform/feature-gate-component/`
  - Usage: Module-level component exports, subcomponent gating

- Package: `@atlassian/jira-feature-flagging-utils`
  - Purpose: Utility for gating non-component functions and hooks
  - Key features:
    - `functionWithCondition` for business logic and selectors
    - Supports gating hooks and non-React functions
  - Location: `/jira/src/packages/platform/feature-flagging-utils/`
  - Usage: Business logic, selectors, hooks

- Package: `@atlassian/jira-feature-gates-storybook-mocks`
  - Purpose: Storybook helpers for feature gate testing and visual regression
  - Key features:
    - `passGate` and `failGate` for controlling gate state in stories
  - Location: `/jira/src/packages/platform/feature-gates-storybook-mocks/`
  - Usage: Storybook stories, visual regression </Core-Packages>

There are additional functions that could be used for feature flagging. They usually called as
XYZWithCondition. They are not covered in this document as they are not commonly used.

# Feature Gates - When user implements a feature gate

## Available conditional helpers

- `fg` from `@atlassian/jira-feature-gating` is the most common way to gate logic in components
- How to use `fg`

```typescript
if (fg('my_gate')) {
	return newThing();
}
return oldThing();
```

- Never use `fg` at module level
- Always add the gate name as string literal in `fg`. We don't allow variables for names to improve
  static analysis. Keep it simple so it can be easily cleaned up later
- When a refactoring becomes too complex for `fg`, break up the components or functions using
  `componentWithFG` or `functionWithCondition`
- `componentWithFG` from `@atlassian/jira-feature-gate-component` can be used for:
  - React components only
  - Module-level component exports
  - Cleaner syntax for component feature gating, breaking up a change into subcomponents
- `functionWithCondition` from `@atlassian/jira-feature-flagging-utils` can be used for:
  - Functions that aren't React components, business logic, selectors
  - Functions with same signature
- Recommendation for hooks: gate the usage, not the hook call. Place the feature gate around the
  usage of the hook's result, not the hook itself. If you must gate the hook itself,
  `functionWithCondition` can be used to gate the "whole" hook.

<Quick-Reference>
- **Use `fg` from `@atlassian/jira-feature-gating`** for all feature gate logic
- **Gate logic at the usage site, not module level**
- **Always use string literals for gate names** (no variables)
- **For React components, use `componentWithFG`** for clean gating
- **For non-component logic including hooks, use `functionWithCondition`**
- **For Storybook/VR, use `passGate`/`failGate` from storybook mocks**
- **Dont overthink testing, there is Jira-specific automation in place**
</Quick-Reference>

# Next Steps Suggestions

- After implementing a change with a feature gate, suggest adding test coverage

## Visual regression testing

- Add visual regression coverage: find the nearest `examples.tsx` and create a variation of the
  stories using `passGate` from `@atlassian/jira-feature-gates-storybook-mocks`

```typescript
// In examples.tsx
export const MyComponent = () => {
	passGate('my_gate');
	return <MyComponent />;
};
```

## Integration testing

- To find out if a story is used for integration testing, search Playwright files for that story
  name. Stories are referenced as follows:

```tsx
await page.visitStorybook('path/to/story', 'ExampleStoryName');
```

- If a story is used for integration testing, make sure to add a special decorator to the story.
  This decorator enables automatic control of feature gates and allows the use of
  `withAllFeatureFlagsVariations` to test the story with different combinations of feature flag
  values.

```tsx
import {
	withFeatureFlagsKnob,
	featureFlagArgTypes,
} from '@atlassian/jira-feature-flagging-integration-testing-utils/src/utils/index.tsx';

//...
const meta = {
	component: Component,
	decorators: [
		withFeatureFlagsKnob, // apply this decorator
	],
	argTypes: { ...featureFlagArgTypes }, // add these argTypes
} as Meta<typeof Component>;
```

## Unit testing

- Add unit testing, scan files referencing the changes and implement coverage in test files
- We have tools to randomise gates in unit testing, you should always be explicit on what gate
  values are necessary for satisfying test
- If possible make the test work for both variants of the feature gate

```typescript
// Conditional expectations (preferred)
it('should work based on gate', () => {
	render(<Component />);
	if (fg('my_gate')) {
		expect(screen.getByText('New')).toBeVisible();
	} else {
		expect(screen.getByText('Old')).toBeVisible();
	}
});
```

- if necesserary set an explicit gate value using `passGate` or `failGate` from
  `@atlassian/jira-feature-gates-test`

```typescript
// Explicit control (alternative)
it('should work with gate on', () => {
	passGate('my_gate');
	render(<Component />);
	expect(screen.getByText('New')).toBeVisible();
});
```

# Experiments - When user implements an experiment

- Use `expVal` to implement experiue

```typescript
import { expVal } from '@atlassian/jira-feature-experiments';

if (expVal('my_experiment', 'isEnabled', false)) {
	return newThing();
}
```

## Testing

```typescript
import { mockExp } from '@atlassian/jira-feature-gates-test-mocks';

beforeEach(() => {
	mockExp('my_experiment', { isEnabled: true });
});
```

## ImportCond - Bundle Size Edge Cases

**Use only when significant bundle size differences exist** (e.g., large dependency differences
between implementations).

```jsx
const ComponentBase = importCond<
  typeof import('./heavy-implementation.tsx'),
  typeof import('./light-implementation.tsx')
>('gate-name', './heavy-implementation.tsx', './light-implementation.tsx');
```

- `importCond` is globally available
- Expect bundler warning requiring team approval
- Most component changes should use `componentWithFG` instead
