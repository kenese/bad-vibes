<!-- meta:
  mode: expert
  topic: state-management
  audience: ai-agent
  model: sonnet-4
  token_budget: medium
  priority: critical
  read_when: making state management decisions
  depends_on: []
  last_review: 2025-09-02
-->

<Core-Packages>
- Package: `react-relay`

- Purpose: Relay runtime for React applications
- Key features:
  - Declarative data fetching
  - Colocation of data and components
  - Efficient caching and updates
- Usage: Remote data fetching, GraphQL integration

- Package: `@atlassian/jira-relay`
  - Purpose: Relay GraphQL integration for Jira frontend, providing data fetching and colocation
  - Key features:
    - Relay environment and fragment support
    - Co-located data dependencies
    - Schema-driven data access
  - Location: `/jira/src/packages/platform/graphql/relay/`
  - Usage: No direct use, this is a location of generated queries and fragments

- Package: `@atlassian/react-resource-router`
  - Purpose: Type-safe, declarative routing and route state management
  - Key features:
    - `useQueryParam`, `usePathParam` hooks
    - Route entrypoint integration
    - URL-driven state
  - Usage: Routing, URL state, navigation

- Package: `@atlassian/react-sweet-state`
  - Purpose: Shared and global state management for React apps
  - Key features:
    - Container-based state scoping
    - Typed selectors
    - Local/global store patterns
  - Usage: Shared state, global state, cross-component state

- Package: `@atlassian/jira-browser-storage-providers`
  - Purpose: GDPR-compliant browser storage utilities for Jira
  - Key features:
    - Typed, scoped storage providers
    - SSR-safe storage access
  - Usage: Local persistence, user preferences, browser state </Core-Packages>

# State management

## Quick decision checklist

- Is the data authoritative on the server and persisted remotely? → Remote state (prefer Relay for
  new work)
- Should the URL represent the state so it's shareable/bookmarkable? → Route state
  (`@atlassian/react-resource-router`)
- Is it short-lived, purely UI state local to a component? → Component state
  (`useState`/`useReducer`)
- Must it be shared across distant components without going through the URL? → Shared/global
  (`@atlassian/react-sweet-state`)
- Must it persist across sessions in the browser? → Strongly avoid; if unavoidable, use
  `@atlassian/jira-browser-storage-providers` with GDPR care
- Feature flags/experiments? → Not app state; always use `fg` or `expVal` directly

<Quick-Reference>
- **Default to Relay for remote state** – use fragments and colocate data with components
- **Use `@atlassian/react-resource-router` for route/URL state**
- **Use `useState`/`useReducer` for local UI state**
- **Use `@atlassian/react-sweet-state` for shared/global state**
- **Avoid browser storage unless absolutely necessary and GDPR-compliant**. Then use
  `@atlassian/jira-browser-storage-providers`
- **Never use Redux or Apollo for new code**
</Quick-Reference>

## Remote state management

Every domain in Jira uses different remote state infrastructure (Relay, legacy Redux, or React Sweet
State with manual fetching). **Always check surrounding code patterns before making changes**.

- **New code**: prefer Relay. You still need a query, fragment, or entrypoint. Check the
  parent/consumer or ask the owning team
- Don't fetch in render paths; don't mirror remote data into local state. Select via Relay fragments
  and derive when needed
- Loading/error: prefer Suspense/Error boundaries where available over ad‑hoc spinners
  - For suspense use `PlaceholderWithNativeSuspense`
  - For error use `JSErrorBoundary`

### Relay

- Main schema: `graphql-schemas/internal.graphql`
- Avoid `useLazyLoadQuery` unless necessary; expected usage is based on relay entrypoints.
- `.graphql` files are generated into `src/packages/platform/graphql/relay/src/__generated__`
  (`@atlassian/jira-relay`)

#### Example (to connect the dots)

- first write query in `useFragment`. Let eslint correct name.
- then run `yarn relay`
- then use generated types to type `fragmentKey` prop and `useFragment`. They would not exists
  before you write a query and compile it.

```tsx
// this is `src/packages/issue/fields/issue-view-layout/rich-text-field/src/ui/index.tsx`
import { useFragment, graphql } from 'react-relay';
// note import from `@atlassian/jira-relay` matching the file name, this is controlled by eslint
import type { ui_issueViewLayoutRichTextField_IssueViewRichTextField_fragmentKey$key } from '@atlassian/jira-relay/src/__generated__/ui_issueViewLayoutRichTextField_IssueViewRichTextField_fragmentKey.graphql';

const IssueViewRichTextField = ({
	fragmentKey,
}: {
	fragmentKey: ui_issueViewLayoutRichTextField_IssueViewRichTextField_fragmentKey$key;
}) => {
	const data = useFragment<ui_issueViewLayoutRichTextField_IssueViewRichTextField_fragmentKey$key>(
		graphql`
		    // note how fragment name matches file and componentName, enforced by eslint 
			fragment ui_issueViewLayoutRichTextField_IssueViewRichTextField_fragmentKey on JiraRichTextField {				
			}
		`,
		fragmentKey,
	);
};
```

#### Keeping GraphQL schemas and assets up-to-date

To update GraphQL schemas and affected generated code run:

- `yarn dev graphql:fetch` to fetch the latest schemas
- `yarn dev graphql:generate` to generate types/code from the pulled in schemas.
- `yarn relay` to compile relay only

#### See also

There is an old graphql solution known as `GIRA`, used mostly to "construct" requests using
`gqlTagGira`. It is fully deprecated, but you may encounter it in legacy code. Do not use it for new
code.

## Route state management

Use `@atlassian/react-resource-router` hooks to access and update route state.

- Use `useQueryParam` or `usePathParam` to get URL state
- For route entrypoints: `getPreloadedProps` is the best option to wire up URL state
- **Never** read `window.location`/`history` directly; go through the router APIs

## Browser state (local persistence)

- **Prohibited**: Do not introduce new cookies. Treat cookies as prohibited for app state
- Due to GDPR constraints, avoid any browser storage unless absolutely necessary and approved
  - If you must: use `@atlassian/jira-browser-storage-providers` to create a typed, scoped store
  - Don't read storage in render on the server/hydration path; gate behind `useEffect`
  - User-bound variables can be stored in UserPreferences and fetched via Relay or
    `useUserPreferencesValue`

## Component state

- Use `useState` for local UI state. If tests need to drive it, extract to a named hook
- Prefer `useReducer` over multiple `useState` for related transitions
- Avoid using `useRef` as a render optimization unless you've measured a need
- Prefer passing state down via props
- **Context is discouraged** for mutable state. If you need shared state, use
  `@atlassian/react-sweet-state`.
- Context is acceptable and preferred for static data (theming, i18n, wiring subscriptions)

## Shared and global state

The only approved solution for both shared and global state is `@atlassian/react-sweet-state` (RSS).

- Use RSS containers to scope state to a branch of the component tree
- Avoid truly global stores unless that's the intent; scope narrowly by default
- When multiple small stores live under one UI region, prefer `containedBy` option to scope them to
  a single container
- Expose small, typed selectors instead of subscribing to whole stores

## Performance and correctness

- **Single source of truth**: don't duplicate remote state into component or global stores
- Memoize all derivations (via `useMemo`) as missed instability can cause an avalanche
- Concurrency: use `useTransition` for UX pending states when appropriate; avoid `useLayoutEffect`
  for data

## Legacy alignment

The codebase is old; you'll find multiple Redux flavors and Apollo. Do not introduce new
Redux/Apollo usage. When touching legacy areas, align with the surrounding code and plan migrations
separately.

## LLM Agent Decision Matrix

When encountering state management decisions, follow this priority order:

1. **Apply decision checklist**: Use the quick checklist above as primary filter
2. **Default to Relay**: For any server data in new components - look for existing `*.graphql` files
3. **Scope appropriately**: Prefer narrow scope over global - check component tree depth
4. **Use deep imports**: Follow import paths shown in examples exactly
5. **Feature flag new patterns**: Wrap experimental state patterns behind `fg('my-flag')` checks, as
   any other code
6. **Check domain ownership**: Different Jira domains (Issues, Projects, Admin) may have established
   patterns - respect them
