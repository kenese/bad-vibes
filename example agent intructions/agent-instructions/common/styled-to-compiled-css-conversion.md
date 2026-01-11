<!-- meta:
  mode: default
  topic: styled-to-compiled-css-conversion
  audience: ai-agent
  model: sonnet-4
  token_budget: medium
  priority: high
  read_when: converting styled components to compiled css
  depends_on: [common.md, feature-gates-experiments.md]
  last_review: 2025-09-10
-->

<Self-Reflection>
- Styled components are being phased out in favor of compiled CSS patterns
- ALL style conversions MUST be feature gated - no exceptions
- Use cssMap() from @atlaskit/css for consistent styling approach
- Always use design tokens instead of hardcoded values
- Follow established xcss patterns with cx() for primitives
</Self-Reflection>

<Quick-Reference>
**CRITICAL: Read these BEFORE converting:**
- [Common Patterns](./common.md) - REQUIRED for Jira-specific patterns and conventions
- [Feature Gates](./feature-gates-experiments.md) - REQUIRED for ALL style conversions

**All style conversions MUST be feature gated:**

- Small changes: Use `fg('gate-name')` inline
- Component-wide changes: Use `componentWithFG`

**Conversion patterns:**

- **Primitives first**: Use `@atlaskit/primitives/compiled` components directly
- **Custom styles**: Use `cssMap()` from `@atlaskit/css`
- **Conditional styles**: Use `xcss={cx(...)}` pattern
- **Always use tokens**: `token('space.100')` not hardcoded values
- **JSX pragma**: Add when using cssMap with jsx prop </Quick-Reference>

# Styled Components to Compiled CSS Conversion

<Feature-Gating-Required>

**ALL style conversions MUST be feature gated. Choose based on scope:**

**Option 1: Inline gating for small changes**

```tsx
import { fg } from '@atlassian/jira-feature-gating';

// Gate between old styled component and new primitive
{
	fg('style-conversion-gate') ? (
		<Box xcss={cx(styles.container)}>Content</Box>
	) : (
		<StyledContainer>Content</StyledContainer>
	);
}

// Gate between styled and native HTML with css
{
	fg('style-conversion-gate') ? (
		<div css={styles.wrapper}>Content</div>
	) : (
		<StyledWrapper>Content</StyledWrapper>
	);
}
```

**Option 2: Component-level gating for extensive changes**

```tsx
import { componentWithFG } from '@atlassian/jira-feature-gate-component';

// See Feature Gates guide for full pattern
export const MyComponent = componentWithFG(
	'style-conversion-gate',
	ModernCSSComponent,
	StyledComponent,
);
```

See [Feature Gates Guide](./feature-gates-experiments.md) for implementation details.

</Feature-Gating-Required>

<Core-Patterns>

**1. Basic Conversion (Primitives First)**

```tsx
// Before: styled component
const Label = styled.label`
	margin-bottom: ${token('space.100')};
`;

// After: Use primitive directly
import { Text } from '@atlaskit/primitives/compiled';
<Text as="label">Content</Text>;
```

**2. Custom Styling with cssMap**

```tsx
/**
 * @jsxRuntime classic
 * @jsx jsx
 */
import { cssMap, cx, jsx } from '@atlaskit/css';
import { Box, Text } from '@atlaskit/primitives/compiled';
import { token } from '@atlaskit/tokens';

const styles = cssMap({
	container: {
		padding: token('space.100'),
		backgroundColor: token('color.background.neutral.subtle'),
	},
	compact: {
		padding: token('space.050'),
	},
	highlighted: {
		backgroundColor: token('color.background.accent.yellow.subtlest'),
		border: `1px solid ${token('color.border.accent.yellow')}`,
	},
});

// Usage with feature gating
<Box
	xcss={cx(
		styles.container,
		fg('style-gate') && styles.compact,
		isHighlighted && styles.highlighted,
	)}
>
	<Text>Content</Text>
</Box>;
```

**3. Converting Props-Based Styled Components**

```tsx
// Before: styled with props
const Container = styled.div`
	padding: ${(props) => (props.compact ? '4px' : '8px')};
	background: ${(props) => (props.primary ? '#e3f2ff' : 'transparent')};
`;

// After: cssMap with conditions
const containerStyles = cssMap({
	base: {
		padding: token('space.100'),
		background: 'transparent',
	},
	compact: {
		padding: token('space.050'),
	},
	primary: {
		background: token('color.background.accent.blue.subtlest'),
	},
});

const Container = ({ compact, variant, children }) => (
	<Box
		xcss={cx(
			containerStyles.base,
			compact && containerStyles.compact,
			variant === 'primary' && containerStyles.primary,
		)}
	>
		{children}
	</Box>
);
```

</Core-Patterns>

<Common-Conversions>

**Layout Components → Primitives**

```tsx
// Use these primitives instead of styled divs:
import { Box, Flex, Stack, Grid } from '@atlaskit/primitives/compiled';

<Flex justifyContent="space-between" alignItems="center">
<Stack space="space.100">
<Box padding="space.200">
```

**Text Styling**

```tsx
const textStyles = cssMap({
	heading: {
		fontSize: token('font.size.large'),
		fontWeight: token('font.weight.semibold'),
		color: token('color.text'),
	},
	subtitle: {
		fontSize: token('font.size.small'),
		color: token('color.text.subtlest'),
	},
});

<Text as="h2" xcss={cx(textStyles.heading)}>
	Title
</Text>;
```

**Interactive Elements**

```tsx
const buttonStyles = cssMap({
	base: {
		padding: token('space.075'),
		borderRadius: token('radius.small'),
		cursor: 'pointer',
		'&:hover': {
			backgroundColor: token('color.background.neutral.hovered'),
		},
	},
	disabled: {
		opacity: 0.6,
		cursor: 'not-allowed',
	},
});
```

</Common-Conversions>

<Implementation-Checklist>

1. **Choose feature gating approach:**
   - Small changes: `fg('gate-name')` inline
   - Large changes: `componentWithFG` pattern

2. **Import structure:**

   ```tsx
   // For native HTML with css prop (requires JSX pragma)
   /**
    * @jsxRuntime classic
    * @jsx jsx
    */
   import { cssMap, jsx } from '@atlaskit/css';

   // For primitives with xcss prop (no JSX pragma needed)
   import { cssMap, cx } from '@atlaskit/css';
   import { Box, Text } from '@atlaskit/primitives/compiled';
   import { token } from '@atlaskit/tokens';
   ```

3. **Conversion priority:**
   - Try primitives first (Box, Text, Flex, Stack)
   - Use cssMap for custom styles
   - Always use design tokens
   - Apply feature gates to all changes

4. **Testing:**
   - Test both gated versions

</Implementation-Checklist>

<Validation-Checklist>

Before marking complete:

- [ ] Feature gate implemented (fg() or componentWithFG)
- [ ] All hardcoded values replaced with tokens
- [ ] Primitives used where possible
- [ ] cssMap used for custom styles
- [ ] JSX pragma added if using jsx prop
- [ ] Both feature gate paths tested
- [ ] No styled-components remain in converted code

</Validation-Checklist>

<Navigation-For-LLM-Agents>

**MUST READ before starting:**

- [Common Patterns](./common.md) - REQUIRED for Jira patterns and architecture
- [Feature Gates](./feature-gates-experiments.md) - Required for ALL conversions

**When implementing:**

- Start with primitives from `@atlaskit/primitives/compiled`
- Use cssMap from `@atlaskit/css` for custom styles
- Reference token values from `@atlaskit/tokens`

</Navigation-For-LLM-Agents>
