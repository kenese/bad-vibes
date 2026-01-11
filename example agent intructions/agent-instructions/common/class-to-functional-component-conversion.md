<!-- meta:
  mode: expert
  topic: class-to-functional-component-conversion
  audience: ai-agent
  model: sonnet-4
  token_budget: medium
  priority: high
  read_when: converting class components to functional components
  depends_on: [common.md, unit-testing.md, feature-gates-experiments.md, styled-to-compiled-css-conversion.md]
  last_review: 2025-09-10
-->

<Self-Reflection>
- Assume prior engineers were smart; understand why class components exist before converting
- Some class components serve legitimate purposes and should NOT be converted
- ALL conversions must be feature-gated using patterns from feature-gates-experiments.md
- Tests must follow unit-testing.md patterns for both class and functional versions
</Self-Reflection>

<Quick-Reference>
**CRITICAL: Read these BEFORE converting:**
- [Common Patterns](./common.md) - REQUIRED for Jira-specific patterns and conventions
- [Feature Gates](./feature-gates-experiments.md) - REQUIRED for ALL conversions
- [Unit Testing](./unit-testing.md) - REQUIRED for test conversions
- [Styled to CSS](./styled-to-compiled-css-conversion.md) - for styled component conversions

**Conversion checklist:**

- Use `componentWithFG` from feature gates guide for ALL conversions
- File naming: `ComponentClass.tsx` / `ComponentFunction.tsx` for complex components
- Import Props type from functional component into class component
- Convert HOCs to hooks: `injectIntl` → `useIntl`, remove HOC props
- Preserve exact constructor timing with `useState(() => {})` initializer
- Update imports: no v2 paths for jira-intl
- Convert styled components using CSS conversion guide </Quick-Reference>

# Class to Functional Component Conversion

<Critical-Dependencies>

**MUST READ before implementing ANY conversion:**

1. **[Common Patterns](./common.md)** - Jira-specific patterns, architecture, and conventions
2. **[Feature Gates Guide](./feature-gates-experiments.md)** - Every conversion MUST use
   `componentWithFG`
3. **[Unit Testing Guide](./unit-testing.md)** - Test patterns for both versions
4. **[Styled CSS Guide](./styled-to-compiled-css-conversion.md)** - For styled component conversions

The agent MUST read these dependencies. Common failures occur when agents skip these guides and
implement incorrect patterns.

</Critical-Dependencies>

<Feature-Gate-Pattern>

**ALL conversions require feature gating:**

```tsx
// my-component.tsx - Entry point
import { componentWithFG } from '@atlassian/jira-feature-gate-component';
import FunctionalComponent from './my-component-functional';
import ClassComponent from './my-component-class';

export const MyComponent = componentWithFG(
	'my-component-conversion-gate',
	FunctionalComponent,
	ClassComponent,
);
```

See [Feature Gates Guide](./feature-gates-experiments.md) for complete patterns.

</Feature-Gate-Pattern>

<File-Organization>

**Option A: Separate Files (for complex components)**

```
my-component/
├── MyComponent.tsx              # Entry with componentWithFG
├── MyComponentClass.tsx         # Original class (exact copy)
├── MyComponentFunction.tsx      # New functional version
├── test.tsx                     # Original tests
└── functional.test.tsx          # Functional tests
```

**Option B: Single File (for simple components)**

```tsx
// Both versions in same file for easier review
const FunctionalComponent = (props: Props) => {
	/* ... */
};
class ClassComponent extends Component<Props> {
	/* ... */
}
export const MyComponent = componentWithFG('gate', FunctionalComponent, ClassComponent);
```

</File-Organization>

<Jira-Specific-Patterns>

**Constructor with Store Initialization (PRESERVE EXACT TIMING):**

```tsx
// Class version:
constructor(props) {
	super(props);
	this.store = createStore(rootEpic);
	this.store.dispatch(setContext(props.context));
	this.store.dispatch(initializeData(props.data));
}

// Functional version - MUST preserve synchronous behavior:
const [store] = useState(() => {
	const st = createStore(rootEpic);
	st.dispatch(setContext(props.context));
	st.dispatch(initializeData(props.data));
	return st;
});
```

**UNSAFE_componentWillMount for SSR (CRITICAL FOR SSR):**

```tsx
// Class version:
UNSAFE_componentWillMount() {
	const { onRuleConfigChange, ruleConfig, onRuleLoaded } = this.props;
	onRuleConfigChange(ruleConfig, !!ruleConfig.value);
	onRuleLoaded();
}

// Functional version - Use useMemo for SSR-safe synchronous execution:
useMemo(() => {
	onRuleConfigChange(ruleConfig, !!ruleConfig.value);
	onRuleLoaded();
}, [onRuleConfigChange, ruleConfig, onRuleLoaded]);
```

**Complex Store Dependencies (EDGE CASE ONLY):**

For SSR hydration issues or React Concurrent Mode problems:

```tsx
import {
	useStableInitialization,
	toBeCalledOnceFor,
} from '@atlassian/redux-stable-store-initializer';
// See issue-view for usage examples
```

**HOC to Hook Conversions:**

```tsx
// Class with HOCs
export default injectIntl(withRouter(connect(mapStateToProps)(MyComponent)));

// Functional - remove HOC props from interface
export type Props = OwnProps; // Remove intl, router props

function MyComponent(props: Props) {
	const { formatMessage } = useIntl();
	const router = useRouter();
	const state = useSelector(selector);
	// ...
}
```

**Props Destructuring (CRITICAL FOR DEPENDENCIES):**

```tsx
// Class version:
class MyComponent extends Component<Props> {
	componentDidMount() {
		this.props.onLoad(this.props.data);
	}

	componentDidUpdate(prevProps) {
		if (prevProps.data !== this.props.data) {
			this.props.onDataChange(this.props.data);
		}
	}
}

// Functional version - ALWAYS destructure props:
function MyComponent(props: Props) {
	// destructure for precise dependencies
	const { onLoad, data, onDataChange } = props;

	useEffect(() => {
		onLoad(data);
	}, [onLoad, data]); // Precise dependencies

	useEffect(() => {
		onDataChange(data);
	}, [onDataChange, data]);
}
```

</Jira-Specific-Patterns>

<Standard-Conversions>

For standard React patterns (state, effects, callbacks), follow React documentation. Key points:

- `this.state` → `useState`
- `componentDidMount/Unmount` → `useEffect(() => {}, [])`
- Instance methods → `useCallback`
- Refs remain mostly unchanged

</Standard-Conversions>

<Testing-Requirements>

**Create separate test files:**

- `test.tsx` - Original class tests (preserve)
- `functional.test.tsx` - New functional tests

**Feature gate testing (from unit-testing.md):**

```tsx
it('should work based on gate', () => {
	render(<Component />);
	if (fg('my-component-conversion-gate')) {
		expect(screen.getByText('New')).toBeVisible();
	} else {
		expect(screen.getByText('Old')).toBeVisible();
	}
});
```

</Testing-Requirements>

<Validation-Checklist>

Before marking complete:

- [ ] Feature gate implemented with `componentWithFG`
- [ ] Dependencies read: feature-gates, unit-testing, styled-css guides
- [ ] Props type imported from functional (not class)
- [ ] **Props destructured at function level for hook dependencies**
- [ ] HOCs converted to hooks, HOC props removed
- [ ] Constructor logic preserves exact timing
- [ ] SSR patterns preserved (useMemo for UNSAFE_componentWillMount)
- [ ] Styled components converted per guide
- [ ] Tests created for functional version
- [ ] Both versions have identical behavior

</Validation-Checklist>

<Navigation-For-LLM-Agents>

**MUST READ before starting:**

- [Common Patterns](./common.md) - REQUIRED for Jira patterns and architecture
- [Feature Gates](./feature-gates-experiments.md) - Required for ALL conversions
- [Unit Testing](./unit-testing.md) - Required for test patterns
- [Styled to CSS](./styled-to-compiled-css-conversion.md) - For styled components

**During implementation:**

- [SSR Guidelines](./ssr.md) - If component has SSR concerns

**After implementation:**

- [Integration Testing](./integration-testing.md) - If has Storybook examples
- Verify feature gate allows switching between versions

</Navigation-For-LLM-Agents>
