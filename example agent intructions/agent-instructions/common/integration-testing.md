<!-- meta:
  mode: pair
  topic: integration-testing
  audience: ai-agent
  model: sonnet-4
  token_budget: medium
  priority: critical
  read_when: writing integration tests
  depends_on: []
  last_review: 2025-09-02
-->

## Core Packages

- Package: `@jira-dev/playwright`
  - Purpose: Jira's Playwright test runner and utilities for browser-based integration testing
  - Key features:
    - Custom test runner (`test`)
    - Jira-specific Playwright helpers
    - Integration with Storybook and feature flag testing
  - Location: `/jira/src/packages/platform/playwright/`
  - Usage: All new browser-based integration tests in Jira frontend

- Package: `@playwright/test`
  - Purpose: Core Playwright testing framework for browser automation
  - Key features:
    - Browser automation and assertions
    - Parallel test execution
    - Cross-browser support
  - Usage: Underlying engine for all Playwright-based tests

- Package: `@atlassian/jira-feature-flagging-playwright-integration-testing-utils`
  - Purpose: Utilities for feature flag variation testing in Playwright
  - Key features:
    - `withAllFeatureFlagsVariations` for combinatorial flag testing
    - Storybook feature flag decorators
  - Location: `/jira/src/packages/platform/feature-flagging-playwright-integration-testing-utils/`
  - Usage: Integration tests involving feature flags and Storybook

## Quick Reference

- **Write all new integration tests with Playwright (`@jira-dev/playwright`)**
- **Use CustomPage** from `@jira-dev/playwright/src/fixtures.ts` for PageObjects, do not create own
  utilities.
- **Use the custom `test` runner and helpers from Jira's Playwright package**
- **Assert with `expect` from `@jira-dev/playwright`**
- **Use `withAllFeatureFlagsVariations` for extended feature flag coverage**
- **Reference Storybook stories using full names**
- **Follow directory and file naming conventions strictly**
- **Never use Cypress for new tests**

# Test Structure and Organization

- We use Playwright for our integration tests, in past we used Cypress but we're moving away from
  it. all new tests should be written using Playwright.
- We are also trying to reduce the number of integration test, keep that in mind and only write them
  for critical and complex flows.

## File Naming and Location

- Place integration tests in either `src/packages/<package name>/<feature name>/integration-tests/`
  directory, do not add a new folder structure unless it's the first time adding integration tests.
  Do not add a new folder structure unless it’s the first time adding integration tests. If you
  can’t find the related path, ask the user to provide it.
- Use descriptive names that reflect the feature being tested: `<feature>.spec.tsx`,
  `dependencies.spec.tsx`

## Naming conventions

- Test files: `feature-name.spec.tsx`
- Page objects: `page-objects.tsx`
- Story files: `<story dir>/examples.tsx`
- Utilities: `utils.pw.tsx`

### Directory structure

```txt
src/packages/<package-name>
├── <feature-name>
	├── integration-tests/
		├── page-object.pw.tsx
		└── feature-name.spec.tsx
```

## Test File Structure

- Use the `test` utility from `@jira-dev/playwright` to write the test suites.
- Use the `expect` from `@jira-dev/playwright` for assertions.
- Use `withAllFeatureFlagsVariations` and `test` from
  `@atlassian/jira-feature-flagging-playwright-integration-testing-utils/src/utils/index.tsx` if
  there are feature gates involved.

```tsx
import { test } from '@jira-dev/playwright';
import { expect } from '@jira-dev/playwright';
import { setViewportDimensions } from '../../common/utils.pw.tsx';
import FeaturePageObject from '../../selectors/feature/page-object.pw.tsx';

setViewportDimensions(); // Called at module level, not in beforeEach

test.describe('Feature Name', () => {
	let pageObject: FeaturePageObject;

	test.beforeEach(async ({ page }) => {
		pageObject = new FeaturePageObject(page);
		await page.visitStorybook(
			'spa-apps/advanced-roadmaps/plan/examples/feature-area',
			'ExampleStoryName',
		);
	});

	test('should verify functionality', async () => {
		// Test implementation
	});
});
```

## Feature Flag Testing Patterns

- For tests that need to run with different feature flag combinations:

```tsx
import {
	// note using test not from @playwright/test
	test,
	withAllFeatureFlagsVariations,
} from '@atlassian/jira-feature-flagging-playwright-integration-testing-utils/src/utils/index.tsx';

test.describe('Feature with flag variations', () => {
	withAllFeatureFlagsVariations((storybookOptions) => {
		test.beforeEach(async ({ page }) => {
			await page.visitStorybook(
				'spa-apps/advanced-roadmaps/plan/examples/feature',
				'StoryName',
				storybookOptions, // Pass the flag variations
			);
		});

		test('should work with all flag combinations', async () => {
			// Test implementation
		});
	});
});
```

If you are using the `withAllFeatureFlagsVariations` utility, the storybook examples should be using
`withFeatureFlagsKnob` decorator from
`@atlassian/jira-feature-flagging-integration-testing-utils/src/utils/index.tsx`.

```tsx
const meta = {
	decorators: [withFeatureFlagsKnob],
	component: Component,
	argTypes: { ...componentArgs },
} as Meta<typeof Component>;

export default meta;
```

## Viewport Configuration Update

- When in need of specific viewport dimensions use below patterns:

```tsx
// Called at module level, not per test
setViewportDimensions(); // Uses default 1280x1024

// Or with custom dimensions
setViewportDimensions({ width: 1440, height: 900 });

// Can also be called with page instance
setViewportDimensions({ page, width: 1280, height: 1024 });
```

## Storybook Integration Patterns

### Story Setup

- Always use Storybook for consistent test data and component isolation
- Reference stories from the `examples/` directory structure
- Use descriptive story names that match the test scenario

```tsx
await page.visitStorybook(
	'spa-apps/advanced-roadmaps/plan/examples/plan-timeline/capacity',
	'CapacityInformationExample',
);
```

### Page Object Structure

- **Single Responsibility**: Each page object should focus on one UI area or feature
- **Descriptive Methods**: Use clear, intention-revealing method names
- **Reusable Selectors**: Use best practice locators like `getByRole`, `getByLabel`, etc and only
  use `getByTestId` as last resort for reliable element location.
- **Async/Await**: Always use async methods for interactions.
- **Error Handling**: Include appropriate waits and stability checks.

```tsx
import type { CustomPage } from '@jira-dev/playwright/src/fixtures';

export default class FeaturePageObject {
	page: CustomPage;

	constructor(page: CustomPage) {
		this.page = page;
	}

	// Finder methods - return locators
	findElement(identifier: string) {
		return this.page.getByRole('button', { name: identifier });
	}

	// Action methods - perform interactions
	async clickButton(buttonName: string) {
		await this.findElement(buttonName).click();
	}

	// Assertion helpers - verify states
	async assertElementVisible(identifier: string) {
		await expect(this.findElement(identifier)).toBeVisible();
	}
}
```

## Assertion Patterns

### Visual Assertions

- DO NOT use integration tests to assert visual attributes, suggest using VR tests for that.

### State Assertions

```typescript
// Element visibility
await expect(element).toBeVisible();
await expect(element).toBeAttached();
await expect(element).toBeHidden();

// Element state
await expect(input).toHaveValue('expected value');
await expect(checkbox).toBeChecked();
await expect(select).toHaveValue('selected-option');

// Element counts and collections
await expect(page.getByRole('listitem')).toHaveCount(3);
```

### Custom Assertions

```tsx
// Create reusable assertion helpers
class CustomAssertions {
	static async assertCapacityPercentage(element: Locator, percentage: number) {
		await expect(element).toHaveAttribute('style', new RegExp(`height: ${percentage}%`));
	}

	static async assertSprintState(
		page: CustomPage,
		sprintName: string,
		state: 'active' | 'completed',
	) {
		const sprint = page.getByText(`sprint.${sprintName}`);
		await expect(sprint).toHaveAttribute('data-state', state);
	}
}
```

## Debug Helpers

- Use these helpers to allow developers to debug their tests;

```tsx
// Visual debugging
await page.screenshot({ path: 'debug-screenshot.png', fullPage: true });
await page.pause(); // Interactive debugging

// State inspection
console.log('Element count:', await page.getByRole('link').count());
console.log('Current URL:', page.url());

// Wait for manual intervention
if (process.env.DEBUG_MODE) {
	await page.pause();
}
```

## Accessibility Testing

- DO NOT use integration tests for A11Y. They should be covered by unit tests.

## Links to Other Instructions

- [Unit Testing](./unit-testing.md)
- [Feature Gates & Experiments](./feature-gates-experiments.md)
