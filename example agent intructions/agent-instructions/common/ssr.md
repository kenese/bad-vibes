<!-- meta:
  mode: expert
  topic: ssr
  audience: ai-agent
  model: sonnet-4
  token_budget: medium
  priority: critical
  read_when: implementing SSR or server-side rendering
  depends_on: []
  last_review: 2025-09-02
-->

<Core-Packages>
- Package: `@atlassian/jira-ssr-toolkit`

- Purpose: Utilities and helpers for safe and efficient server-side rendering in Jira frontend
- Key features:
  - `RenderOnClient` for client-only rendering
  - SSR-safe patterns and hydration helpers
- Location: `/jira/src/packages/platform/ssr-toolkit/`
- Usage: SSR entrypoints, React components with SSR requirements

- Package: `@atlassian/react-async`
  - Purpose: Asynchronous resource loading and SSR bundle control
  - Key features:
    - `JSResourceForInteraction` and `JSResourceForUserVisible` for SSR-aware code splitting
  - Usage: Route entrypoints, lazy loading in SSR

- Package: `@atlassian/react-entrypoint`
  - Purpose: Entrypoint creation and resource management for SSR
  - Key features:
    - `createEntryPoint` for SSR-aware entrypoint definition
  - Usage: SPA and fragment entrypoints

- Package: `@atlassian/react-loosely-lazy`
  - Purpose: Legacy SSR-compatible lazy loading
  - Key features:
    - SSR-aware lazy loading for legacy code
  - Usage: Legacy codebases, non-entrypoint SSR </Core-Packages>

<Quick-Reference>
- **Use `RenderOnClient` for client-only rendering in SSR** (`@atlassian/jira-ssr-toolkit`). Never
  overuse or introduce "flicker"
- **Never use browser APIs directly in SSR code** – always guard within `useEffect` or
  `RenderOnClient`
- **Use `@atlassian/react-async` + `JSResourceForUserVisible` for new pages**. Requires connection a
  route entryPoint.
- **Use `@atlassian/react-async` + `JSResourceForInteraction` for new experiences** hidden behind
  interactions.
- **Use `@atlassian/react-loosely-lazy`** for other cases including legacy code (ie when entrypoint
  is not connected to the route)
- **Test SSR output with `renderWithHydration` from `@atlassian/jira-testing-library`**
</Quick-Reference>

# SSR (Server-Side Rendering) Guidelines for Jira Frontend

## Core Constraints

**Tesseract/V8 Snapshot Limitations:**

- Feature gates unavailable during capture phase → use `componentWithFG()` at component level
- Browser APIs crash server → wrap in `useEffect` or `RenderOnClient`
- Module-level initialization captured forever → defer to request-time

## Required Patterns

### Client-Only Rendering

```tsx
import { RenderOnClient } from '@atlassian/jira-ssr-toolkit/src/render-on-client.tsx';
// RenderOnClient prevents hydration mismatch
// __SERVER__ removes code from the server bundle
<RenderOnClient>{!__SERVER__ && <Component />}</RenderOnClient>;
```

### Lazy Loading Control

Controlling SSR bundle size is even more important than load-time bundle size. Use lazy loading for
heavy components that are not immediately needed.

```tsx
import { JSResourceForInteraction, JSResourceForUserVisible } from '@atlassian/react-async';
import { createEntryPoint } from '@atlassian/react-entrypoint';

export const entryPoint = createEntryPoint({
	// JSResourceForInteraction excludes component from SSR
	// JSResourceForUserVisible includes
	root: JSResourceForInteraction(() => import('./src')),
});
```

- for routes with entrypoints(new, recommended) use `@atlassian/react-async`
- for legacy code stick to `@atlassian/react-loosely-lazy`

## Critical Anti-Patterns

**❌ Direct usage of browser APIs:** `const x = window.location;`; not available on server **❌
Module-level initialization:** `const initialState = fg('moon-phase') ? Date.now();`; captured at
snapshot time **❌ Direct DOM access in render:** `document.getElementById('x')`; causes hydration
mismatch **❌ Overuse of `__SERVER__` conditions:** `const Component=__SERVER__ ? A : B;`; prevents
testing

## Decision Guidelines

- Not rendering some elements on Server → `RenderOnClient`
- Heavy dialogs/charts → `JSResourceForInteraction`, or `lazy` + `{ ssr: false }`
- Feature-gated components → `componentWithFG()`

## Testing

- `renderWithHydration` from `@atlassian/jira-testing-library`
- test name is expected to be 'should render on the server'
