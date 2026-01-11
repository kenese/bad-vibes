---
title: 'Project Conventions'
description: 'Relay vs Standard React component patterns and project architecture'
related:
  - coding-standards.md
  - testing-conventions.md
  - directory-structure.md
  - ../../common/entry-points.md
  - ../../common/state-management.md
tags: [project-conventions, relay, react, architecture, field-scheme]
---

# Base project conventions

Follow [Base Project Standards](../../docs/llm/agent-instructions/common.md) for foundation-level
project conventions.

# Relay Components

Contains a Relay fragment or query

Use when component has domain-specific logic, e.g. given a JiraField, render a list item containing
the field name and avatar

Placed in the main src/ directory

## Example

```typescript
/**
 * Pass fragment reference to component
 **/
// MyComponent.tsx
const MyComponent = ({ jiraIssueFieldConfig }) => {
    const fieldConfig = useFragment(
        graphql`
            fragment MyComponent on JiraIssueFieldConfig {
				name
			}
        `,
        jiraIssueFieldConfig
    )
    return <>{fieldConfig.name}</>;
}

// TriggerComponent.tsx
const MyTriggerComponent = ({ jiraIssueFieldConfig }) => {
	const fieldConfigData = useFragment(
		graphql`
			fragment MyTriggerComponent on JiraIssueFieldConfig {
				...MyComponent # Data required by MyComponent is hidden from trigger by data masking
			}
		`,
		jiraIssueFieldConfig,
	);
    return (
      <MyComponent jiraIssueFieldConfig={fieldConfigData} />
    );
}
```

# Standard React Components

Standard prop-based API with no Relay fragments/queries

Use when a component has no domain-specific logic, e.g. a component that renders a list of items in
a container with infinite scroll

Placed in the main src/ directory

Note: We often have similar design patterns that apply to different types, in this case it can be
valuable to extract a standard react component from your Relay component to re-use. e.g. extracting
a standard React component to show an infinite-scrollable list in a sidebar and wrapping it to show
lists of different entities in different sidebars.

## Example

```typescript
/**
 * Standard React component wrapped with Relay component
 **/
// MyComponent.tsx (Standard React component)
const MyComponent = ({ fieldName }) => {
    return <>{fieldName}</>;
}

// MyRelayComponent.tsx (Relay wrapper)
const MyRelayComponent = ({ jiraIssueFieldConfig }) => {
	const fieldConfig = useFragment(
		graphql`
			fragment MyRelayComponent on JiraIssueFieldConfig {
				name
			}
		`,
		jiraIssueFieldConfig,
	);
    return <MyComponent fieldName={fieldConfig.name} />;
}
```

## Entry Points

Entry points are used for modals, sidebars, and other overlay components that need to be loaded on
demand.

By default, a component inside of an entrypoint boundary should query its own data using a preloaded
query.

Avoid lazy load queries for performance reasons.

Alternatively, if we want to pass data directly to the entrypoint component instead of triggering a
new query, prefer to pass a fragment reference over raw values.

This can be achieved by passing the fragment as a prop via entryPointParams.

## Example

```typescript
/**
 * Preloaded query responsible for fetching data
 **/
// myEntryPoint.tsx
export const myEntryPoint = createEntryPoint({
	root: JSResourceForInteraction(() =>
		import(
			/* webpackChunkName: "async-my-component" */ './MyComponent.tsx'
		).then((module) => module.MyComponent),
	),
	getPreloadProps: ({ schemeId }: EntryPointParams) => ({
		queries: {
			jiraFieldData: {
				options: {
					fetchPolicy: 'network-only' as const,
				},
				parameters: myComponentQuery,
				variables: {
					fieldConfigId,
				},
			},
		},
	}),
});

// MyComponent.tsx
const MyComponent = () => {
    const queryData = usePreloadedQuery(
        graphql`
            query MyComponent(fieldConfigId: ID!) {
                fieldConfig: node(id: fieldConfigId) {
                    ... on JiraIssueFieldConfig {
                        name
                    }
                }
            }
        `
    )
    return <>{queryData.fieldConfig.name}</>;
}

// TriggerComponent.tsx
const MyTriggerComponent = ({ jiraIssueFieldConfig }) => {
	const fieldConfig = useFragment(
		graphql`
			fragment MyTriggeerComponent on JiraIssueFieldConfig {
				id
			}
		`,
		jiraIssueFieldConfig,
	);
    return (
      <Trigger
         entryPointParams={{ fieldConfigId: fieldConfig.id }}
        ...
      >
    );
}
```

## Agreed Project Patterns

For our domain specific components we will almost always fetch data using Relay patterns via
fragments or queries as appropriate

For simple UI reusable components we will prefer React prop passing and keep in a /common/ui
directory (not the main src/ui directory of the current package)

Entrypoints such as sidebars and modals will use a preloaded query pattern

In some cases where the schema has a type that does not implements Node we may pass a fragment
reference through an entrypoint in order to retrieve the single node's data. In this case we will
not use a preloaded query as we are relying on the page level query via for our parent fragment
reference.

We use the default Relay fetch policy "store-or-network", and explicitly specify "network-only" only
when requiring the data be known to be fresh

Use descriptive field aliases in GraphQL queries for better code readability and maintainability.
Instead of using generic field names like `node`, use descriptive aliases that reflect the domain
entity being queried.

Use descriptive variable names when destructuring Relay query results. Instead of generic names like
`data`, use meaningful names that reflect the content being queried (e.g., `fieldConfig`,
`schemeData`, `queryData`).

## See Also

- [Coding Standards](./coding-standards.md) - General coding best practices
- [Testing Conventions](./testing-conventions.md) - Testing patterns and conventions
- [Directory Structure](./directory-structure.md) - Project organization
- [Entry Points](../../common/entry-points.md) - Modal, popup, and dropdown patterns
- [State Management](../../common/state-management.md) - Relay patterns and data management
