<!-- meta:
  topic: feature-reliability-analytics
  audience: ai-agent
  model: sonnet-4
  token_budget: long
  priority: high
  read_when: implementing analytics for new features
  depends_on: [entry-points.md, handling-errors.md]
  last_review: 2025-01-15
-->

# Feature Reliability Analytics Implementation Guide

> Agent guide for implementing comprehensive analytics events to monitor the reliability of new Jira
> Cloud features during rollout

<Self-Reflection>
- Assume prior engineers designed analytics patterns thoughtfully; understand context before proposing changes
- Analytics architecture represents years of reliability monitoring experience
- Follow established patterns to ensure consistent metric collection across features
- Reference foundation packages only; avoid copying random usage patterns
</Self-Reflection>

<Where-To-Find-It>
**Foundation Packages:**
- `@atlassian/jira-product-analytics-bridge` → `/jira/src/packages/platform/product-analytics-bridge/`
- `@jira/admin-pages__analytics-hooks` → `/jira/src/packages/admin-pages/analytics-hooks/`
- `@atlassian/jira-error-boundaries` → `/jira/src/packages/platform/error-boundaries/`
- `@atlassian/jira-entry-point-container` → `/jira/src/packages/platform/entry-point-container/`
- `@atlassian/entry-point-modal-trigger` → `/jira/src/packages/platform/entry-point-modal-trigger/`

**Reference Examples:**

- Onboarding Hub packages: `/jira/src/packages/admin-pages/onboarding-hub*/`
- Software Onboarding: `/jira/src/packages/software-onboarding/quickstart/` </Where-To-Find-It>

<Core-Packages>
**Analytics Packages (location-dependent):**

For packages in `src/packages/admin-pages/`:

- Package: `@jira/admin-pages__analytics-hooks`
- Purpose: Simplified hooks for admin-pages features (`useFireUIEvent`, `useFireTrackEvent`,
  `useFireOperationalEvent`)
- Key features: Consistent event firing patterns, automatic context handling

For all other packages:

- Package: `@atlassian/jira-product-analytics-bridge`
- Purpose: Core analytics bridge for product events
- Key features: `useAnalyticsEvents`, `fireUIAnalytics`, `fireTrackAnalytics`,
  `fireOperationalAnalytics`, screen analytics

**Error Handling:**

- Package: `@atlassian/jira-error-boundaries`
- Purpose: Automatic failure tracking via `JSErrorBoundary`
- Key features: Contextual error reporting, operational event firing

**Entry Point Patterns:**

- Package: `@atlassian/jira-entry-point-container`
- Purpose: Non-modal entry points with analytics context
- Key features: Provides `ContextualAnalyticsData` automatically

- Package: `@atlassian/entry-point-modal-trigger`
- Purpose: Modal entry points (requires explicit analytics context)
- Key features: Lazy loading, does NOT provide `ContextualAnalyticsData` </Core-Packages>

This guide explains how to implement comprehensive analytics events to monitor the reliability of
new Jira Cloud features during rollout. The patterns are based on the implementation in the
onboarding hub packages (`@jira/admin-pages__onboarding-hub`,
`@jira/admin-pages__onboarding-hub-profile-menu-item`, and
`@jira/admin-pages__onboarding-hub-wizard`).

<Overview>

To effectively monitor feature reliability, you need to track three key aspects:

1. **Page Loading Reliability** - Track successful and failed page loads
2. **Component Reliability (without route entries)** - Track successful and failed loads of
   components that don't have their own routes
3. **User Interaction Reliability** - Track successful and failed user actions

</Overview>

<Required-Analytics-Imports>

The analytics package to use depends on where your component is located:

### For packages in `src/packages/admin-pages/`

Use the admin-pages analytics hooks:

```tsx
import { useFireUIEvent } from '@jira/admin-pages__analytics-hooks/src/useFireUIEvent.tsx';
import { useFireTrackEvent } from '@jira/admin-pages__analytics-hooks/src/useFireTrackEvent.tsx';
import { useFireOperationalEvent } from '@jira/admin-pages__analytics-hooks/src/useFireOperationalEvent.tsx';
```

### For packages outside `src/packages/admin-pages/`

Use the product analytics bridge directly:

```tsx
import {
	useAnalyticsEvents,
	fireUIAnalytics,
	fireTrackAnalytics,
	fireOperationalAnalytics,
} from '@atlassian/jira-product-analytics-bridge';
```

### For all packages (screen analytics)

Screen analytics use the same pattern regardless of package location:

```tsx
import {
	ContextualAnalyticsData,
	FireScreenAnalytics,
	SCREEN,
} from '@atlassian/jira-product-analytics-bridge';
```

### For error boundaries (all packages)

Error boundary analytics use the same pattern regardless of package location:

```tsx
import { JSErrorBoundary } from '@atlassian/jira-error-boundaries/src/ui/js-error-boundary/JSErrorBoundary.tsx';
```

### For entry point containers and modal triggers

Different patterns for different types of entry points:

```tsx
// For non-modal entry points (provides ContextualAnalyticsData)
import { JiraEntryPointContainer } from '@atlassian/jira-entry-point-container';

// For modal entry points (does NOT provide ContextualAnalyticsData)
import { ModalTrigger } from '@atlassian/entry-point-modal-trigger';
```

### For packages that already use other analytics wrappers

If your component is already using some other wrapper around
`@atlassian/jira-product-analytics-bridge`, continue using that wrapper for consistency.

</Required-Analytics-Imports>

<Page-Loading-Reliability>

### Route Entry Configuration

In your route entry files (e.g., `productsMyFeatureRouteEntry.tsx`), ensure proper configuration:

```tsx
export const productsMyFeatureRouteEntry = createEntry(productsMyFeatureRoute, () => ({
	group: 'global-settings', // or appropriate group

	// UFO name for performance tracking
	ufoName: 'global-admin.products.my-feature',

	// Reporting metadata for operational events
	meta: {
		reporting: {
			id: 'products-my-feature',
			teamName: 'your-team-name',
			packageName: 'jira-router-routes-admin-pages-my-feature-entries',
		},
	},

	entryPoint() {
		return fg('my-feature-gate') ? productsMyFeatureEntryPoint : undefined;
	},

	// ... other configuration
}));
```

### Screen Events for Successful Loads

**For all packages (same pattern regardless of location):**

Wrap your main page component with `ContextualAnalyticsData` and include `FireScreenAnalytics`:

```tsx
import {
	ContextualAnalyticsData,
	FireScreenAnalytics,
	SCREEN,
} from '@atlassian/jira-product-analytics-bridge';

export const MyFeaturePageComponent = () => {
	const { formatMessage } = useIntl();

	return (
		<ContextualAnalyticsData sourceName="myFeature" sourceType={SCREEN}>
			<DocumentTitle title={formatMessage(messages.pageTitle)} />
			<FireScreenAnalytics />
			<PageLayout>{/* Your page content */}</PageLayout>
		</ContextualAnalyticsData>
	);
};
```

**Key points:**

- `sourceName` should be a descriptive name for your feature (e.g., "onboardingHub", "myFeature")
- `sourceType={SCREEN}` indicates this is a screen/page view
- `FireScreenAnalytics` fires the actual screen viewed event when the component mounts
- This pattern is the same for all packages, regardless of location

### Operational Events for Failed Loads

Failed page loads are automatically tracked through the route entry's `meta.reporting`
configuration. The operational event will be named: `{packageName}.{id} failed`

Example: `jira-router-routes-admin-pages-my-feature-entries.products-my-feature failed`

</Page-Loading-Reliability>

<Component-Reliability>

For components that are rendered within other components but don't have their own route entries
(e.g., menu items, embedded widgets, panels), you need to track both successful renders and
failures.

### Success Events

#### Using admin-pages hooks (in `src/packages/admin-pages/`)

```tsx
export const MyFeatureMenuItem = () => {
	const fireMenuItemViewedEvent = useFireUIEvent('menuItem viewed openMyFeatureModal');

	useEffect(() => {
		// Fire event when component successfully mounts and has data
		if (shouldShowMenuItem) {
			fireMenuItemViewedEvent();
		}
	}, [fireMenuItemViewedEvent, shouldShowMenuItem]);

	// ... rest of component
};
```

#### Using product analytics bridge directly (outside `src/packages/admin-pages/`)

```tsx
export const MyFeatureMenuItem = () => {
	const { createAnalyticsEvent } = useAnalyticsEvents();

	useEffect(() => {
		// Fire event when component successfully mounts and has data
		if (shouldShowMenuItem) {
			const analyticsEvent = createAnalyticsEvent({});
			fireUIAnalytics(analyticsEvent, 'menuItem viewed', 'openMyFeatureModal');
		}
	}, [createAnalyticsEvent, shouldShowMenuItem]);

	// ... rest of component
};
```

### Failure Events Pattern Selection

Choose the appropriate pattern based on how your component is rendered:

#### Pattern 1: Non-Modal Entry Points (JiraEntryPointContainer provides analytics context)

**Use Case**: Menu items, popup content, navigation items

```tsx
// In the parent component
<JiraEntryPointContainer entryPoint={myFeatureMenuItemEntryPoint}>
	<MyFeatureMenuItem />
</JiraEntryPointContainer>;

// In the entry point component (only needs JSErrorBoundary)
export const MyFeatureMenuItem = () => (
	<JSErrorBoundary
		id="my-feature-menu-item"
		packageName="jira-my-feature-menu-item"
		teamName="your-team-name"
		fallback="unmount"
	>
		<MyFeatureMenuItemInner />
	</JSErrorBoundary>
);
```

#### Pattern 2: Modal Entry Points (ModalTrigger does NOT provide analytics context)

**Use Case**: Modal dialogs triggered by buttons

```tsx
// In the trigger component
<ModalTrigger
  entryPoint={myFeatureModalEntryPoint}
  entryPointProps={modalProps}
>
  <Button>Open Modal</Button>
</ModalTrigger>

// In the modal component (needs explicit ContextualAnalyticsData)
const MyFeatureModalInner = () => (
  <>
    <FireScreenAnalytics />
    <ModalContent />
  <>
);

export const MyFeatureModal = () => (
	<ContextualAnalyticsData sourceName="myFeatureModal" sourceType={SCREEN}>
		<JSErrorBoundary
			id="my-feature-modal"
			packageName="jira-my-feature-modal"
			teamName="your-team-name"
			fallback="unmount"
		>
			<MyFeatureModalInner />
		</JSErrorBoundary>
	</ContextualAnalyticsData>
);
```

#### Pattern 3: Direct Component Rendering (Check inheritance)

**Use Case**: Widgets, panels, embedded components

First, check if your component is rendered within a container that provides
`ContextualAnalyticsData`:

**If inherited (Case A):**

```tsx
export const MyFeatureWidget = () => (
	<JSErrorBoundary
		id="my-feature-widget"
		packageName="jira-my-feature-widget"
		teamName="your-team-name"
		fallback="unmount"
	>
		<MyFeatureWidgetInner />
	</JSErrorBoundary>
);
```

**If NOT inherited (Case B):**

```tsx
const MyFeatureWidgetInner = () => <SomeComplexComponent />;

export const MyFeatureWidget = () => (
	<ContextualAnalyticsData sourceName="myFeatureWidget" sourceType={SCREEN}>
		<JSErrorBoundary
			id="my-feature-widget"
			packageName="jira-my-feature-widget"
			teamName="your-team-name"
			fallback="unmount"
		>
			<MyFeatureWidgetInner />
		</JSErrorBoundary>
	</ContextualAnalyticsData>
);
```

**Key points:**

- `id`: A unique identifier for this component instance
- `packageName`: The name of your package (should match the package.json name)
- `teamName`: Your team's name for error tracking
- `fallback`: What to do when an error occurs ("unmount", or a fallback component)
- The JSErrorBoundary automatically fires operational events when errors occur, but **only if
  ContextualAnalyticsData is present**
- The operational event will be named: `{packageName}.{id} failed`

</Component-Reliability>

<User-Interaction-Reliability>

Track success/failure of user actions that trigger backend operations. The key to user interaction
reliability is the backend request that the user interaction triggers.

### Pattern: Action-Based Analytics

```tsx
import { fireErrorAnalytics } from '@jira/platform__error-reporting/src/fireErrorAnalytics.tsx';

// Example from src/packages/admin-pages/onboarding-hub/src/DeleteConfirmationModal.tsx
const handleDelete = async () => {
	try {
		await deleteMutation({
			variables: { configId },
		});
		// Success case: onSuccess callback fires the track event
		onSuccess();
	} catch (error) {
		// Failure case: fireErrorAnalytics can be used regardless of package location
		fireErrorAnalytics({
			error,
			source: 'deleteOnboardingConfig',
			action: 'delete',
		});
	}
};
```

**Key Points:**

- Track the backend request, not just the UI interaction
- Success analytics often handled through success callbacks (like `onSuccess`)
- Failure analytics use `fireErrorAnalytics` (available across all packages)
- Both success and failure tracking should be tied to the actual request outcome

</User-Interaction-Reliability>

<Context-And-Location-Tracking>

### Always Include Location Context

When firing UI events, always include location context to understand where the interaction occurred:

```tsx
// Using admin-pages hooks
const fireButtonClickEvent = useFireUIEvent('myButton clicked');

// Using product analytics bridge directly
const { createAnalyticsEvent } = useAnalyticsEvents();

// In different locations
const handleClickFromPanel = () => {
	// Admin-pages hooks
	fireButtonClickEvent({ location: 'ctaPanel' });

	// Product analytics bridge
	const analyticsEvent = createAnalyticsEvent({});
	fireUIAnalytics(analyticsEvent, 'myButton clicked', { location: 'ctaPanel' });
};
```

### Use Referrer for Multi-Context Components

For components that can be rendered in multiple contexts, use a `referrer` prop:

```tsx
interface MyFeatureWizardProps {
	referrer?: string; // 'create' | 'edit' | 'duplicate'
	// ... other props
}

// Using admin-pages hooks
export const MyFeatureWizard = ({ referrer = 'unknown', ...props }) => {
	const fireStepCompletedEvent = useFireTrackEvent('wizardStep completed');

	const handleStepComplete = (stepName: string) => {
		fireStepCompletedEvent({
			referrer,
			stepName,
		});
	};

	// ... rest of component
};

// Using product analytics bridge directly
export const MyFeatureWizard = ({ referrer = 'unknown', ...props }) => {
	const { createAnalyticsEvent } = useAnalyticsEvents();

	const handleStepComplete = (stepName: string) => {
		const analyticsEvent = createAnalyticsEvent({});
		fireTrackAnalytics(analyticsEvent, 'wizardStep completed', {
			referrer,
			stepName,
		});
	};

	// ... rest of component
};
```

</Context-And-Location-Tracking>

<Event-Naming-Conventions>

### UI Events

- Format: `{componentName} {action}` or `{action} {targetName}`
- Examples:
  - `createMyFeatureButton clicked`
  - `editMyFeatureButton clicked`
  - `myFeatureActionsMenuButton clicked`
  - `menuItem viewed openMyFeatureModal`

### Track Events

- Format: `{action} {status}`
- Examples:
  - `submit started`
  - `submit succeeded`
  - `submit failed`
  - `wizardStep completed`

### Operational Events

- Format: `{packageName}.{operationName} {status}`
- Examples:
  - `jira-my-feature.createMyFeatureConfig failed`
  - `jira-my-feature-menu-item.my-feature-menu-item failed`
  - `customMyFeatureWizardVideoFallbackLink rendered`

### Screen Events

- Fired automatically by `FireScreenAnalytics` when wrapped with `ContextualAnalyticsData`
- Uses the `sourceName` provided to `ContextualAnalyticsData`
- Examples: Screen with `sourceName="onboardingHub"` fires a screen viewed event

### Error Boundary Events

- Fired automatically by `JSErrorBoundary` when JavaScript errors occur **and
  ContextualAnalyticsData is present**
- Format: `{packageName}.{id} failed`
- Examples: `jira-onboarding-hub-profile-menu-item.onboarding-hub-profile-menu-item failed`

</Event-Naming-Conventions>

<Implementation-Checklist>

When implementing analytics for a new feature, ensure you have:

### ✅ Page Loading

- [ ] Route entry has `ufoName` configured
- [ ] Route entry has `meta.reporting` configured with correct `id`, `teamName`, and `packageName`
- [ ] Main page component wrapped with `ContextualAnalyticsData` and includes `FireScreenAnalytics`
- [ ] Failed loads automatically tracked via route entry configuration

### ✅ Component Reliability (without route entries)

- [ ] Identified correct entry point pattern (non-modal vs modal vs direct rendering)
- [ ] Components wrapped with `JSErrorBoundary` for automatic failure tracking
- [ ] Success events fired when component successfully loads (`menuItem viewed {action}`)
- [ ] JSErrorBoundary configured with correct `id`, `packageName`, and `teamName`
- [ ] **CRITICAL**: Verified that `ContextualAnalyticsData` is present (inherited or explicit)

### ✅ User Interactions

- [ ] Critical operations fire track events for successful backend requests
- [ ] Critical operations use `fireErrorAnalytics` for failures
- [ ] Multi-context components use referrer prop for context

### ✅ Event Naming

- [ ] UI events follow `{componentName} {action}` pattern
- [ ] Track events follow `{action} {status}` pattern
- [ ] Operational events follow `{packageName}.{operationName} {status}` pattern
- [ ] Screen events use descriptive `sourceName` in `ContextualAnalyticsData`
- [ ] Error boundary events use descriptive `id` in `JSErrorBoundary`

### ✅ Correct Analytics Package Usage

- [ ] Using `@jira/admin-pages__analytics-hooks` for packages in `src/packages/admin-pages/`
- [ ] Using `@atlassian/jira-product-analytics-bridge` directly for packages outside
      `src/packages/admin-pages/`
- [ ] Using `@atlassian/jira-product-analytics-bridge` for screen analytics (all packages)
- [ ] Using `@atlassian/jira-error-boundaries` for error boundary analytics (all packages)
- [ ] Consistent with existing analytics wrapper if component already uses one

### ✅ Entry Point Pattern Selection

- [ ] **Non-modal entry points**: Using `JiraEntryPointContainer` (provides ContextualAnalyticsData)
- [ ] **Modal entry points**: Using `ModalTrigger` + explicit `ContextualAnalyticsData`
- [ ] **Direct rendering**: Verified ContextualAnalyticsData inheritance or added explicit wrapper

</Implementation-Checklist>

<Examples-From-Real-Packages>

### Pattern 1: Non-Modal Entry Point (JiraEntryPointContainer)

**`OnboardingHubProfileMenuItem`** from profile menu:

- **Entry Point Container**: `JiraEntryPointContainer` in `Nav4AccountMenu.tsx`
- **Analytics Context**: Provided by `JiraEntryPointContainer`
- **Error Boundary**: Only needs `JSErrorBoundary`
- **Use Case**: Menu items, popup content, navigation items

### Pattern 2: Modal Entry Point (ModalTrigger)

**`PreviewModal`** from onboarding hub wizard:

- **Modal Trigger**: `ModalTrigger` in `WizardStepper.tsx`
- **Analytics Context**: Needs explicit `ContextualAnalyticsData` wrapper
- **Error Boundary**: Needs `JSErrorBoundary` + `ContextualAnalyticsData`
- **Use Case**: Modal dialogs triggered by buttons

### Admin Pages (using hooks)

The onboarding hub packages provide excellent examples of using the admin-pages analytics hooks:

- **Page Loading**: `OnboardingHubPageComponent.tsx` with `ContextualAnalyticsData` and
  `FireScreenAnalytics`
- **Route Entry**: `productsOnboardingHubRouteEntry.tsx` with UFO name
  `global-admin.products.onboarding-hub`
- **Component Reliability**: Both patterns demonstrated
- **Success Events**: `ProfileMenuItem.tsx` with
  `fireUIAnalytics(createAnalyticsEvent({}), 'menuItem viewed', 'openOnboardingHubWelcomeModal')`
- **UI Events**: `CtaPanel.tsx` with `createOnboardingButton clicked` and location context
- **Track Events**: `OnboardingWizardInner.tsx` with `submit started/succeeded/failed`
- **Operational Events**: `FallbackMediaLink.tsx` with
  `customOnboardingWizardVideoFallbackLink rendered`
- **Error Handling**: `DeleteConfirmationModal.tsx` with both operational events and
  `fireErrorAnalytics`

### Software Packages (using product analytics bridge directly)

The software onboarding quickstart packages show direct usage of the product analytics bridge:

- **UI Events**: `OpenMenuItem.tsx` with
  `fireUIAnalytics(analyticEvent, 'button clicked', 'openQuickstart', {...})`
- **Analytics Event Creation**: Using `const { createAnalyticsEvent } = useAnalyticsEvents()` and
  `const analyticEvent = createAnalyticsEvent({})`

By following these patterns, you ensure comprehensive monitoring of your feature's reliability
during rollout while using the correct entry point pattern and analytics configuration for your
specific use case.

</Examples-From-Real-Packages>

<Navigation-For-LLM-Agents>

**Prerequisites** (read BEFORE starting):

- [Entry Points](./entry-points.md) - Understanding entry point patterns and analytics context
- [Handling Errors](./handling-errors.md) - Error boundary setup and failure tracking

**Workflow Dependencies** (consult DURING implementation):

- [Entry Points](./entry-points.md) - When choosing between JiraEntryPointContainer vs ModalTrigger
- [Feature Gates](./feature-gates-experiments.md) - If feature is gated, ensure analytics includes
  gate context

**Validation Checkpoints** (verify AFTER implementation):

- Verify `ContextualAnalyticsData` exists for all `JSErrorBoundary` components
- Test failure scenarios trigger operational events correctly
- Confirm event names follow naming conventions
- Validate `meta.reporting` configuration in route entries

**Conditional Navigation:**

- IF implementing modals → [Entry Points](./entry-points.md) for ModalTrigger patterns
- IF implementing menu items → [Entry Points](./entry-points.md) for JiraEntryPointContainer
  patterns
- IF tracking errors → [Handling Errors](./handling-errors.md) for fireErrorAnalytics usage

</Navigation-For-LLM-Agents>
