# EntryPoints Usage Guide (react-relay entrypoint)

<Default-Mode>Expert</Default-Mode>

## EntryPoints for User Interactions

**CRITICAL RULE**: Modals and popups MUST use Entrypoints. Dropdown Menus and other content that
loads from user interaction should use Entrypoints if the content is significantly large.

Entrypoints and internal implementation of `@atlassian/react-entrypoint` are React-relay
entrypoints.

## Core packages

### `@atlassian/react-entrypoint`

The foundational package for creating EntryPoints. Provides `createEntryPoint()` function and
`EntryPointProps` types.

### `@atlassian/entry-point-modal-trigger`

Provides modal trigger components for opening EntryPoints as modals:

- `ModalButtonTrigger` - Button that opens a modal
- `ModalDropdownItemTrigger` - Dropdown item that opens a modal
- `ModalTrigger` - Custom trigger component for modals

### `@atlassian/entry-point-modal-context`

Provides `ModalContextProvider` that must be added to your app root to enable modal EntryPoints.

### `@atlassian/entry-point-popup`

Provides `PopupTrigger` component for opening EntryPoints as popups/tooltips with positioning.

### `@atlassian/entry-point-dropdown`

Provides `DropdownTrigger` component for opening EntryPoints as dropdown menu content.

### `@atlassian/entry-point-panel`

Provides panel components for opening EntryPoints as side panels:

- `usePanel` - Hook for managing panel state
- `Trigger` - Component for triggering panel open
- `PreloadedPanel` - Component for pre-loaded panels

### `@atlassian/entry-point-types`

Provides TypeScript types and interfaces for EntryPoint system components and configurations.

### `@atlassian/entry-point-use-trigger`

Provides hooks and utilities for managing EntryPoint trigger state and interactions.

```tsx
import { useTrigger } from '@atlassian/entry-point-use-trigger';

const { triggerRef, isOpen, open, close } = useTrigger();
```

### `@atlassian/entrypoint-flyout`

- `FlyoutTrigger` - Provides flyout components for opening EntryPoints as flyout panels with
  advanced positioning and behavior.

## Good practices

- Use meaningful file names for UFO tracking (not `index.tsx`)
- Always implement `getPreloadProps` for data preloading
- Provide error fallbacks and loading states
- Modals require ModalContextProvider at app root
- Use appropriate trigger components for each EntryPoint type

## Creating EntryPoints

### 1. EntryPoint Definition

```tsx
// entrypoint.tsx
import { JSResourceForInteraction } from '@atlassian/react-async';
import { createEntryPoint } from '@atlassian/react-entrypoint';
import type { EntryPointRouteParams } from '@jira/platform__entry-points-plugin-types/src/types.tsx';

export const myModalEntryPoint = createEntryPoint({
	root: JSResourceForInteraction(() => import(/* webpackChunkName: "my-modal" */ './src/MyModal')),
	getPreloadProps: ({
		tenantContext: { cloudId, isAdmin },
		context: { query },
	}: EntryPointRouteParams) => {
		return {
			queries: {
				myQuery: {
					options: {},
					parameters,
					// Example of passing variables through to the application
					variables: { isAdmin, cloudId },
				},
			},
			extraProps: { initialTab, isAdmin },
		};
	},
});
```

### 2. Component Implementation

```tsx
// ./src/MyModal/index.tsx
import React from 'react';
import type { EntryPointProps } from '@atlassian/react-entrypoint';
import { ModalBody } from '@atlaskit/modal-dialog';
type RuntimeProps = { onClose: () => void };

export default function MyModal({
	queries,
	runtimeProps: { onClose },
}: EntryPointProps<any, {}, any, RuntimeProps>) {
	return (
		<ModalBody>
			<h1>Modal Content</h1>
		</ModalBody>
	);
}
```

## Modals

**MANDATORY RULE**: ALL modals MUST use EntryPoint Modal components.

### Setup Requirements

Ensure your app has ModalContextProvider at root:

```tsx
import { ModalContextProvider } from '@atlassian/entry-point-modal-context/ModalContextProvider';

export const MyAppRoot = () => (
	<ModalContextProvider>
		<YourAppContent />
	</ModalContextProvider>
);
```

### Modal Component

```tsx
import React from 'react';
import { ModalBody, ModalHeader, ModalTitle } from '@atlaskit/modal-dialog';
import type { EntryPointProps } from '@atlassian/react-entrypoint';

type RuntimeProps = { onClose: () => void };

export default function MyModal({
	runtimeProps: { onClose },
}: EntryPointProps<any, {}, any, RuntimeProps>) {
	return (
		<>
			<ModalHeader hasCloseButton>
				<ModalTitle>My Modal</ModalTitle>
			</ModalHeader>
			<ModalBody>Modal content here</ModalBody>
		</>
	);
}
```

### Modal Usage Patterns

#### Basic Modal Button

```tsx
import { ModalButtonTrigger } from '@atlassian/entry-point-modal-trigger/ModalButtonTrigger';

<ModalButtonTrigger
	entryPoint={myModalEntryPoint}
	entryPointParams={{ itemId: 'item-123' }}
	appearance="primary"
>
	Open Modal
</ModalButtonTrigger>;
```

#### Modal from Dropdown

```tsx
import { ModalDropdownItemTrigger } from '@atlassian/entry-point-modal-trigger/ModalDropdownItemTrigger';

<DropdownMenu trigger="Actions">
	<DropdownItemGroup>
		<ModalDropdownItemTrigger
			entryPoint={editModalEntryPoint}
			entryPointParams={{ itemId: 'item-123' }}
		>
			Edit Item
		</ModalDropdownItemTrigger>
	</DropdownItemGroup>
</DropdownMenu>;
```

#### Custom Modal Trigger

```tsx
import { ModalTrigger } from '@atlassian/entry-point-modal-trigger/ModalTrigger';

<ModalTrigger entryPoint={myModalEntryPoint} entryPointParams={{ itemId: 'item-123' }}>
	{(triggerProps) => <CustomComponent {...triggerProps}>Open Modal</CustomComponent>}
</ModalTrigger>;
```

## Popups

**MANDATORY RULE**: ALL popups MUST use EntryPoint Popup components.

### Popup Component

```tsx
// ./src/MyPopup/index.tsx
import React from 'react';
import { Box } from '@atlaskit/primitives/compiled';
import type { EntryPointProps } from '@atlassian/react-entrypoint';

type RuntimeProps = { onClose: () => void };

export default function MyPopup({
	runtimeProps: { onClose },
}: EntryPointProps<any, {}, any, RuntimeProps>) {
	return (
		<Box padding="space.200" backgroundColor="elevation.surface.overlay">
			<h3>Popup Content</h3>
			<p>This loads asynchronously.</p>
			<button onClick={onClose}>Close</button>
		</Box>
	);
}
```

### Popup Usage Patterns

#### Basic Popup

```tsx
import { PopupTrigger } from '@atlassian/entry-point-popup';
import Button from '@atlaskit/button/new';

<PopupTrigger
	entryPoint={myPopupEntryPoint}
	entryPointParams={{ itemId: 'item-123' }}
	trigger={(triggerProps) => <Button {...triggerProps}>Show Popup</Button>}
	placement="bottom-start"
/>;
```

#### Info Popup with Icon

```tsx
import InfoIcon from '@atlaskit/icon/core/status-information';

<PopupTrigger
	entryPoint={infoPopupEntryPoint}
	entryPointParams={{ helpTopicId: 'help-123' }}
	trigger={(triggerProps) => (
		<Button {...triggerProps} iconBefore={InfoIcon} appearance="subtle" spacing="compact" />
	)}
	placement="top"
/>;
```

#### Custom Trigger Element

```tsx
<PopupTrigger
	entryPoint={myPopupEntryPoint}
	entryPointParams={{ itemId: 'item-123' }}
	trigger={(triggerProps) => (
		<div {...triggerProps} style={{ padding: '8px', cursor: 'pointer' }}>
			Hover for popup
		</div>
	)}
/>
```

## Dropdowns

### Dropdown Content Component

```tsx
// ./src/MyDropdownContent/index.tsx
import React from 'react';
import { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';
import type { EntryPointProps } from '@atlassian/react-entrypoint';

type RuntimeProps = { onItemSelect: (itemId: string) => void };

export default function MyDropdownContent({
	runtimeProps: { onItemSelect },
}: EntryPointProps<any, {}, any, RuntimeProps>) {
	return (
		<DropdownItemGroup>
			<DropdownItem onClick={() => onItemSelect('edit')}>Edit Item</DropdownItem>
			<DropdownItem onClick={() => onItemSelect('duplicate')}>Duplicate</DropdownItem>
			<DropdownItem onClick={() => onItemSelect('delete')}>Delete Item</DropdownItem>
		</DropdownItemGroup>
	);
}
```

### Dropdown Usage Patterns

#### Basic Dropdown

```tsx
import { DropdownTrigger } from '@atlassian/entry-point-dropdown';

<DropdownTrigger
	entryPoint={myDropdownEntryPoint}
	entryPointParams={{ contextId: 'context-123' }}
	entryPointProps={{
		onItemSelect: (itemId: string) => {
			console.log('Selected:', itemId);
		},
	}}
	trigger="Actions"
/>;
```

#### Custom Button Trigger

```tsx
import Button from '@atlaskit/button/new';
import ChevronDownIcon from '@atlaskit/icon/core/chevron-down';

<DropdownTrigger
	entryPoint={myDropdownEntryPoint}
	entryPointParams={{ contextId: 'context-123' }}
	trigger={(triggerProps) => (
		<Button {...triggerProps} iconAfter={ChevronDownIcon} appearance="subtle">
			More Actions
		</Button>
	)}
/>;
```

#### Icon Dropdown

```tsx
import MoreIcon from '@atlaskit/icon/core/show-more-horizontal';

<DropdownTrigger
	entryPoint={actionsDropdownEntryPoint}
	entryPointParams={{ itemId: 'item-123' }}
	trigger={(triggerProps) => (
		<Button {...triggerProps} iconBefore={MoreIcon} appearance="subtle" spacing="compact" />
	)}
	placement="bottom-end"
/>;
```

## Panels

### Panel Component

```tsx
// ./src/MyPanel/index.tsx
import React from 'react';
import { Box, Stack } from '@atlaskit/primitives/compiled';
import Button from '@atlaskit/button/new';
import type { EntryPointProps } from '@atlassian/react-entrypoint';

type RuntimeProps = {
	onClose: () => void;
	onAction: (action: string) => void;
};

export default function MyPanel({
	runtimeProps: { onClose, onAction },
}: EntryPointProps<any, {}, any, RuntimeProps>) {
	return (
		<Box
			padding="space.300"
			backgroundColor="elevation.surface.overlay"
			style={{ width: '400px', height: '100vh' }}
		>
			<Stack space="space.200">
				<Button appearance="subtle" onClick={onClose}>
					← Close Panel
				</Button>
				<h2>Panel Title</h2>
				<p>Panel content here</p>
				<Button onClick={() => onAction('primary')}>Primary Action</Button>
			</Stack>
		</Box>
	);
}
```

### Panel Usage Patterns

#### Basic Panel with usePanel Hook

```tsx
import { Trigger, usePanel } from '@atlassian/entry-point-panel';
import Button from '@atlaskit/button/new';

export const MyComponent = () => {
	const { Panel, trigger } = usePanel();

	return (
		<>
			<Trigger
				trigger={trigger}
				entryPoint={myPanelEntryPoint}
				entryPointParams={{ panelId: 'panel-123' }}
				entryPointProps={{
					onAction: (action: string) => {
						console.log('Panel action:', action);
					},
				}}
			>
				{({ ref }) => <Button ref={ref}>Open Panel</Button>}
			</Trigger>
			<Panel />
		</>
	);
};
```

#### Preloaded Panel for Critical Workflows

```tsx
import { PreloadedPanel } from '@atlassian/entry-point-panel';

export const MyPage = () => {
	const { Panel, trigger } = usePanel(
		<PreloadedPanel
			entryPoint={panelEntryPoint}
			preloadedEntryPointReference={entryPointReference} // entryPointReference pre-loaded by Router or other EntryPoint
		/>,
	);

	return (
		<>
			<Trigger trigger={trigger} entryPoint={panelEntryPoint}>
				{({ ref }) => <Button ref={ref as Ref<HTMLButtonElement>}>Open panel</Button>}
			</Trigger>
			<Panel />
		</>
	);
};
```

#### Panel with external state

```tsx
export const FormPanel = () => {
	const { Panel, trigger } = usePanel();
	// External state handled outside of the panel, example formData
	const [formData, setFormData] = useState({});

	return (
		<>
			<Trigger
				trigger={trigger}
				entryPoint={formPanelEntryPoint}
				entryPointParams={{ formType: 'create' }}
				entryPointProps={{
					initialFormData: formData,
					onFormChange: setFormData,
					onSubmit: (data) => submitForm(data),
				}}
			>
				{({ ref }) => <Button ref={ref}>Create New Item</Button>}
			</Trigger>
			<Panel />
		</>
	);
};
```

### @atlassian/entrypoint-flyout

```tsx
import { FlyoutTrigger } from '@atlassian/entrypoint-flyout';

<FlyoutTrigger
	entryPoint={myFlyoutEntryPoint}
	entryPointParams={{ itemId: 'item-123' }}
	trigger={(triggerProps) => <Button {...triggerProps}>Show Flyout</Button>}
	placement="right-start"
	offset={[0, 8]}
/>;
```

## Troubleshooting Common Issues

### TypeScript Errors

#### TS2345: Argument type is not assignable to parameter of type 'never'

**Error:**

```typescript
error TS2345: Argument of type '{ root: PreloadableJSResourceReference<typeof import("...")>; getPreloadProps: () => {}; }' is not assignable to parameter of type 'never'.
```

**Cause:** Using named exports instead of default exports for async components.

**Solution:** Always use default exports for EntryPoint components:

```tsx
// ❌ Wrong - Named export
export const MyComponent = ({ props }: EntryPointProps<{}, {}, {}, {}>) => {
	return <div>Hello World!</div>;
};

// ✅ Correct - Default export
export default function MyComponent({ props }: EntryPointProps<{}, {}, {}, {}>) {
	return <div>Hello World!</div>;
}
```

### Performance Issues

#### EntryPoint re-fetching data on mouse hover

**Cause:** Using `fetch-policy: network-only` or `network-and-store` which bypasses cache.

**Solution:** Use `store-or-network` fetch policy:

```tsx
const myEntryPoint = createEntryPoint({
	root: JSResourceForInteraction(() => import('./MyComponent')),
	getPreloadProps: () => ({
		queries: {
			myQuery: {
				'fetch-policy': 'store-or-network', // ✅ Will cache data
				parameters: myQueryGraphQL,
			},
		},
	}),
});
```

#### Poor loading performance

**Symptoms:** Long loading times, multiple spinners, waterfall loading.

**Common causes:**

1. Not using preload-on-intent (missing proper `<Trigger>` usage)
2. Loading EntryPoints with `useEffect` instead of user interactions
3. Not implementing `getPreloadProps` for data preloading

**Solutions:**

- Always use `<Trigger>` components for user interactions
- Implement `getPreloadProps` to preload data alongside JavaScript chunks
- Avoid manual `entryPoint.load()` calls in `useEffect`

```tsx
// ❌ Wrong - Manual loading in useEffect
useEffect(() => {
	entryPointActions.load();
}, [entryPointActions]);

// ✅ Correct - Use Trigger components
<ModalButtonTrigger entryPoint={myEntryPoint}>Open Modal</ModalButtonTrigger>;
```

### Runtime Errors

#### Modal not rendering or appearing behind content

**Cause:** Missing `ModalContextProvider` at app root.

**Solution:** Add `ModalContextProvider` to your app root:

```tsx
import { ModalContextProvider } from '@atlassian/entry-point-modal-context/ModalContextProvider';

function App() {
	return (
		<ModalContextProvider>
			<YourAppContent />
		</ModalContextProvider>
	);
}
```

#### "Cannot read properties of undefined" in EntryPoint component

**Cause:** Incorrect EntryPoint props typing or missing runtime props.

**Solution:** Ensure proper typing and prop passing:

```tsx
// EntryPoint definition
type PreloadProps = { itemId: string };
type RuntimeProps = { onClose: () => void };

export const myEntryPoint = createEntryPoint({
	root: JSResourceForInteraction(() => import('./MyComponent')),
	getPreloadProps: ({ itemId }: PreloadProps) => ({
		queries: {
			/* ... */
		},
	}),
});

// Component implementation
export default function MyComponent({
	preloadedProps,
	runtimeProps: { onClose },
}: EntryPointProps<PreloadProps, any, any, RuntimeProps>) {
	// Component logic
}
```

#### UFO tracking shows "unknown" metric name

**Cause:** Using `index.tsx` as the component filename.

**Solution:** Use meaningful filenames:

```tsx
// ❌ Wrong - Will track as "unknown"
export const asyncModal = createEntryPoint({
	root: JSResourceForInteraction(() => import('./src')), // imports index.tsx
});

// ✅ Correct - Will track as "jira.fe.page-segment.AsyncModal"
export const asyncModal = createEntryPoint({
	root: JSResourceForInteraction(() => import('./src/AsyncModal')),
});
```

### Testing

### `@atlassian/entrypoint-fixtures`

Provides test fixtures and mock utilities for testing EntryPoint components and interactions.

```tsx
import { mockEntryPoint, createTestModal } from '@atlassian/jira-modal-entry-point-fixtures';

// In tests
const testEntryPoint = mockEntryPoint({
	root: () => import('./TestComponent'),
	getPreloadProps: () => ({ queries: {} }),
});
```

#### "RelayEnvironmentProvider not found" error

**Cause:** EntryPoint component mounted outside of Relay environment context.

**Solution:** Ensure your component is wrapped in `MockedProvider` or `RelayEnvironmentProvider`:

```tsx
// In your test or storybook
import { MockedProvider } from '@atlassian/relay-test-utils';

<MockedProvider mocks={mockedQueries}>
	<YourAppContent>
</MockedProvider>
```
