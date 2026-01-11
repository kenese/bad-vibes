# Jira Frontend Development Guide

IMPORTANT: When implementing or answering questions, READ ALL RELEVANT DOCUMENTATION OR INSTRUCTIONS
BEFORE PROCEEDING. That means, if you are asked about the topic of "unit testing", then read this
file, find unit test instructions, and read those!

Steps:

1. Extract topics from user prompt, such as "Unit testing", "Integration Testing", "performance",
   etc
2. Search for relevant documentation or instructions in this file
3. If none are found, inform the user that you are not using instructions, and using your best
   judgement.
4. For cases in which guessing seems risky, stop work and ask the user for clarification

## About This Codebase

This is the Jira frontend codebase - a React-based monorepo serving the modern Jira web experience
as fragments with SSR support.

<Basics>

- This is a `yarn` monorepo; However use `afm`, which is a thin and fast wrapper around `yarn`
  - use `afm install jira` to install dependencies
  - use `afm` instead of `yarn` for all other commands
- To run unit tests: `afm test unit {filename}` (supports glob patterns and directory paths)
- To run integration tests: `afm test:playwright {filename}`
  - Use `afm test:playwright {filename} -- --ui` to open the test runner UI
  - Integration tests require a running Storybook instance: `afm storybook {fileName}` (supports
    glob patterns and directory paths)
- To run linting: `afm lint {filename}` (supports directory paths and glob patterns), or
  `afm dev lint:js --changed-since HEAD` for changed files.
- Jira provides many specialized "dev" commands available as `afm dev:{command}` - refer to
  [Jira Dev CLI](../../../dev-tooling/cli/README.md) for complete reference

</Basics>

<Architecture-Overview>

**Monorepo Structure**: This is a yarn workspaces monorepo with multiple layers:

- `src/packages/` - Feature packages organized by domain (issue, business, navigation, etc.)
- `src/packages/platform` - jira shared components and utilities
- `src/entry/` - SPA entry points and fragments
- `src/entry-fs/` and `src/entry-ssr` - Jira SSR related code
- `platform/packages/` - Shared platform components and utilities
- `services/` - Backend services including legacy SSR (`jira-ssr/`)
- `dev-tooling/` - Build tools, CLI utilities, and development infrastructure

**Fragment-Based Architecture**: The frontend is delivered as "fragments" - modular pieces that can
be loaded independently. Key fragments include `jira-spa`, `business`, `software`, `servicedesk`.

</Architecture-Overview>

<Development-Workflow>

<Package-Development>
- Use **Storybook first** for component development: `yarn storybook src/packages/issue`
- Each package should have `examples.tsx` files for Storybook stories
- Test in isolation before full Jira integration
</Package-Development>

<Code-reuse>
- Prefer reusing code from the same package
- Prefer functionality provided and used within same domain, never use code from other domains unless it is explicitly shared
- Prefer jira specific packages from `src/packages/platform` vs `platform/packages` (example `@atlassian/jira-feature-gating` vs `@atlaskit/platform-feature-flags`)
- Prefer packages in the platform over third-party libraries (example - `@atlassian/react-loosely-lazy` vs `react-loosely-lazy`)
- Limit third-party dependencies to already used ones (check `jira/package.json` file)
- New dependencies must follow approval process, delegate this process to the operator
</Code-reuse>

</Development-Workflow>

<Key-Technologies-Patterns>

**Frontend Stack**:

- React 18 with TypeScript
- Relay for GraphQL (use `yarn relay` to regenerate)
- Compiled CSS-in-JS for new components
- React Magnetic DI for dependency injection

**Testing**:

- Jest for unit tests ([unit testing instructions](./common/unit-testing.md))
- Storybook for component testing
- Playwright for integration tests
  ([integration testing instructions](./common/integration-testing.md))
- Cypress (deprecated - do not use for new tests)
- Visual Regression using @atlassian/jira-vr-testing (Gemini VR)

<Unit-Testing>
- Use the [unit testing instructions](./common/unit-testing.md) for all unit test guidance.
</Unit-Testing>

<State-Management>
- Use the [state management instructions](./common/state-management.md) for all state management patterns.
</State-Management>

<Integration-Testing>
- Use the [integration testing instructions](./common/integration-testing.md) for all Playwright-based Storybook integration test guidance.
- **Key difference**: Unit tests = Jest/RTL for component logic + SSR hydration; Integration tests = Playwright over Storybook
</Integration-Testing>

</Key-Technologies-Patterns>

<Code-Organization-Patterns>

<Package-Structure>

```
src/packages/<domain>/<feature>/
├── src/                  # Source code
├── examples/            # Storybook examples
├── __tests__/           # Unit tests
├── vr-tests/           # Visual regression tests
└── package.json        # Package config
```

</Package-Structure>

<GraphQL-Relay-Patterns>

- Use fragments for data dependencies: `graphql\`fragment ComponentName_data on Type { ... }\``
- Co-locate fragments with components
- Run `yarn relay` after schema changes

</GraphQL-Relay-Patterns>

<EntryPoints>

## When to Use EntryPoints

- All SPA routes
- Modals that open on button click
- Popups that appear on hover
- Panels that slide in from the side
- Any components with significant amounts of code that is not part of initial page render, such as
  Dropdown Menus
- Use rules and code patterns from [EntryPoints Overview](./common/entry-points.md) when
  implementing entrypoints

</EntryPoints>

<Clean-up-Feature-Gates>

## This section are instructions for `cleaning up` feature gates.

"Clean up" feature gates refer to removing code when `fg()` function always evaluates to a certain
state lets call this `#{CLEANUP_STATE}` and remove code paths that are unreachable as a result of
the cleanup. `#{CLEANUP_STATE}` can be any value or a boolean e.g `true`. When not explicitly stated
Assume `#{CLEANUP_STATE}` evaluates to `true`.

- Follow these [feature gate cleanup instructions](./common/clean-up-feature-gates.md)

</Clean-up-Feature-Gates>

<Feature-Gates>

## Implementing Feature gates and experiments

- `#{GATEXP}` = "feature gate" OR "experiment".

- Every new change MUST be behind a feature gate, unless explicitly disabled by user
- Before implementing changes:
  1.  Use chat memory to track `#{GATEXP}` names within conversation sessions. Everything is managed
      through conversation memory
  2.  Check if user specified a `#{GATEXP}` name → Remember and use it
  3.  Check if `#{GATEXP}` name already established in conversation → Reuse it
  4.  Only ask if unclear: "Is this change behind an experiement or a feature gate"
  5.  If user doesn't need a `#{GATEXP}, don't ask again & proceed with the changes
  6.  Run quick component usage check with `grep` or `codebase_search`
- If the operator is instructing to `clean up` or `remove` a gate, Follow the rules
  [feature gate cleanup instructions](./common/clean-up-feature-gates.md) else follow
  [core implementation instructions](./common/feature-gates-experiments.md)
- After core implementation, suggest:
  1.  Add examples: update `examples.tsx` for Storybook
  2.  Add tests: add feature gate tests if needed: use
      [core implementation instructions](./common/feature-gates-experiments.md) and
      [unit testing instructions](./common/unit-testing.md)

</Feature-Gates>

</Code-Organization-Patterns>

<SSR-Considerations>
- Follow [SSR guidelines](./common/ssr.md) for patterns and examples.
</SSR-Considerations>

<Common-Gotchas>

1. **Styled Components**: Locked to v3.x - use Compiled for new components
2. **Import Paths**: Prefer workspace aliases over long relative paths (e.g., `@atlassian/jira-*`
   instead of `../../../foldername/filename`)
3. **Feature Gates**: Every new change should be behind a feature gate
4. **Relay**: Generate types with `yarn relay` after GraphQL changes

</Common-Gotchas>

<Navigation-Routing>

- Modern routing uses React Resource Router
- Fragment-based routing defined in `src/packages/router-routes/`
- Use `useSafeRoute()` for type-safe navigation

</Navigation-Routing>

<Error-Handling>
- Follow the [Jira error handling guidelines](./handling-errors.md)
</Error-Handling>

<React-Component-Styling>

- Prefer Atlaskit components, these are components imported from `@atlaskit/*` packages.
- Always use Atlaskit Compiled Primitives over native HTML elements, these are components imported
  from `@atlaskit/primitives/compiled'`. Where existing, the "as" prop can be used to override the
  base html element. For example: unordered list `<ul>` in raw HTML should be written using Stack
  from Atlaskit primitives: `<Stack as="ul">`.
- Use `import { cssMap } from '@atlaskit/css';` over styled-components and xcss unless if the file
  already contains existing libraries which should be followed.
- Never under any circumstances override components internal styling via deep selectors.
- Styles should not be exported, and be co-located with its usage, defined above the components.
- Always use design tokens for colors and values for styling properties
  `import { token } from '@atlaskit/tokens';`
- Style changes should be feature gated example
  `<Inline xcss{fg("gate") ? styles.newStyle : styles.oldStyle}>`.
- Dynamic styling properties should be combined using `import { cx } from '@compiled/react';`
  examples: `cx(styles.rowStyles, isOddRow && styles.rowBackground);`.
- Prefer dynamic sized elements over fixed widths, e.g use percentages and `rem` to optimize for
  better responsiveness. Prefer flex and grid layouts.
- When importing a button from @atlaskit, use import Button from '@atlaskit/button/new' don't use
  '@atlaskit/button'

Here is a basic example using a combination of Atlaskit components and dynamic styling.

```jsx
/**
 * @jsxRuntime classic
 * @jsx jsx
 */
import { useState } from 'react';
import { cssMap, cx, jsx } from '@atlaskit/css';
import { Box, Inline } from '@atlaskit/primitives/compiled';
import Toggle from '@atlaskit/toggle';
import { token } from '@atlaskit/tokens';

const styles = cssMap({
	base: {
		paddingBlock: token('space.500'),
		width: '100%',
		borderRadius: token('radius.small'),
	},
	enabled: {
		backgroundColor: token('color.background.accent.green.bolder'),
	},
	disabled: {
		backgroundColor: token('color.background.accent.gray.bolder'),
	},
});

export const Example = () => {
	const [isEnabled, setEnabled] = useState(false);

	return (
		<Box testId="example" padding="space.200">
			<Inline alignBlock="center">
				<Toggle onChange={() => setEnabled((current) => !current)} />
			</Inline>
			<Box xcss={cx(styles.base, isEnabled ? styles.enabled : styles.disabled)} />
		</Box>
	);
};
```

</React-Component-Styling>

<Forms>
- Use the [forms instructions](./common/forms.md) for all form construction.
</Forms>

<Key-Files-to-Reference>

- `package.json` - Scripts and workspace configuration
- `tsconfig.base.json` - TypeScript configuration
- `eslint.config.mjs` - Linting rules and patterns
- `src/README.md` - Source code organization
- `services/jira-ssr/README.md` - SSR development guide
- and package specific instructions within `docs/llm/agent-instructions` folder.

</Key-Files-to-Reference>

## Specialized Instruction Files

When working on specific tasks, refer to these specialized instruction files:

### Action-Based Instructions (What to DO)

- **Code Review** → [code-review.md](./common/code-review.md)
- **Unit Testing** → [unit-testing.md](./common/unit-testing.md)
- **Integration Testing** → [integration-testing.md](./common/integration-testing.md)
- **Class to Functional Component Conversion** →
  [class-to-functional-component-conversion.md](./common/class-to-functional-component-conversion.md)
- **Styled Components to Compiled CSS Conversion** →
  [styled-to-compiled-css-conversion.md](./common/styled-to-compiled-css-conversion.md)
- **Ramda to Vanilla JS/Lodash Conversion** →
  [ramda-to-vanilla-js-or-lodash-conversion.md](./common/ramda-to-vanilla-js-or-lodash-conversion.md)
- **Improving useEffects** →
  [you-might-not-need-use-effect.md](./common/you-might-not-need-use-effect.md)
- **Feature Flag Cleanup** → [clean-up-feature-gates.md](./common/clean-up-feature-gates.md)
- **Stale Feature Gates** → [stale-feature-gates.md](./common/stale-feature-gates.md)
- **TypeScript Error Suppression Removal** →
  [typescript-error-suppression-removal.md](./common/typescript-error-suppression-removal.md)
- **Unused i18n Message Key Cleanup** →
  [unused-message-key-cleanup.md](./common/unused-message-key-cleanup.md)

### Domain-Based Instructions (What it's ABOUT)

- **State Management** → [state-management.md](./common/state-management.md)
- **SSR/Hydration** → [ssr.md](./common/ssr.md)
- **Feature Gates & Experiments** →
  [feature-gates-experiments.md](./common/feature-gates-experiments.md)
- **Feature Reliability Analytics** →
  [feature-reliability-analytics.md](./common/feature-reliability-analytics.md)
- **Entry Points (Modals/Popups)** → [entry-points.md](./common/entry-points.md)
- **Forms** → [forms.md](./common/forms.md)
- **Error Handling** → [handling-errors.md](./common/handling-errors.md)
- **Performance** → [performance.md](./common/performance.md)

### Meta-Cognitive Instructions

- **Problem-Solving Framework** →
  [problem-solving-framework.md](./common/problem-solving-framework.md) (use when stalled,
  uncertain, or user challenges approach)
- **Modes & Confidence System** → [modes/confidence-system.md](./modes/confidence-system.md)
- **Mode-Specific Guides** → [modes/](./modes/)

### Team-Specific Instructions

- **Team Patterns** → [teams/\*/](./teams/)

## AI Tool Integration

This guide is used by multiple AI tools. Tool-specific entry points:

- **Cursor** → `.cursor/rules/cursor-instructions.mdc`
- **GitHub Copilot** → `.github/copilot-instructions.md`
- **Codelassian** → `.codelassian/rules/codelassian-instructions.mdc`
- **Rovo Dev** → `.agent.md`

All tool-specific files should defer to this central guide for actual implementation patterns.
