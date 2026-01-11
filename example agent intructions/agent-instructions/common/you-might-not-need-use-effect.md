<!-- meta:
  mode: expert
  topic: you-might-not-need-use-effect
  audience: ai-agent
  model: sonnet-4
  token_budget: medium
  priority: high
  read_when: addressing exhaustive-deps or you-might-not-need-an-effect warnings; refactoring effects
  depends_on: [state-management.md, performance.md]
  last_review: 2025-10-15
-->

# You Might Not Need useEffect

> Expert agent workflow to detect and remove unnecessary React effects in Jira frontend code while
> preserving behavior and performance.

<Self-Reflection>
- Assume past engineers made deliberate choices; prefer incremental refactoring over wholesale rewrites.
- Do not assume you understand the code. Consider it's a mess with unknown side effects. Prove and verify. 
- Not every effect is bad. Keep effects for: subscriptions, data fetching, imperative DOM APIs, external library integration, and logging.
- Any behavioral change must be feature flagged - even "obvious" fixes can have unexpected interactions.
- Prioritize safety over optimization; prefer keeping working code over risky refactors.
</Self-Reflection>

<Core-Packages>
- Package: react (built-in hooks)
  - Key hooks: useState, useEffect, useMemo, useCallback, useRef, useSyncExternalStore
  - Authority: https://react.dev/learn/you-might-not-need-an-effect
  - Extra documentation:
	https://react.dev/reference/react/useEffect
	https://react.dev/learn/synchronizing-with-effects
	https://react.dev/learn/separating-events-from-effects
	https://react.dev/learn/lifecycle-of-reactive-effects
- Tooling: ESLint plugin eslint-plugin-react-you-might-not-need-an-effect
- Testing: docs/llm/agent-instructions/common/unit-testing.md
- Feature Flagging: docs/llm/agent-instructions/common/feature-gates-experiments.md
</Core-Packages>

<Where-To-Find-It>
- Trigger symptom:
  - ESLint warning: react-you-might-not-need-an-effect/*
</Where-To-Find-It>

<Core-Philosophy>
**The React Mental Model** (from https://react.dev/learn/you-might-not-need-an-effect):

1. **React is declarative** - You describe what the UI should look like for any given state, not how
   to achieve it step by step
2. **Rendering should be pure** - Components should return the same JSX given the same props/state,
   without side effects
3. **Effects are an escape hatch** - Use them to "step outside" React and synchronize with external
   systems
4. **Prefer calculations during render** - If you can calculate something from existing props/state,
   don't store it in state

**When you DON'T need an effect:**

- **Transforming data for rendering** → Calculate during render or use useMemo
- **Handling user events** → Use event handlers
- **Resetting state when props change** → Use key prop or calculate during render
- **Adjusting state when props change** → Calculate during render or use synchronous updates
- **Sharing logic between event handlers** → Extract functions
- **Sending a POST request** → Do it in event handlers
- **Chains of computations** → Calculate during render or use useMemo
- **Initializing the application** → Put logic outside components

**When you DO need an effect:**

- **Connecting to external systems** (APIs, browser APIs, third-party widgets)
- **Data fetching** with proper cleanup
- **Setting up subscriptions** with cleanup
- **Triggering animations** that don't depend on specific user events
- **Cleaning up resources** (timers, subscriptions, event listeners) </Core-Philosophy>

<Performance-Impact-Guide>
**Understanding the cost of unnecessary effects:**

🔴 **High Impact (Fix First - Priority 5):**

- Effects that cause unnecessary re-renders or state updates every render
- Effects that derive simple state that could be calculated inline

🟡 **Medium Impact (Fix Second - Priority 3-4):**

- Effects that chain state updates causing multiple render cycles
- Effects that manage state that could be lifted up or derived

🟢 **Low Impact (Fix Last - Priority 1-2):**

- Effects that are functionally correct but violate patterns
- Empty effects (no performance impact but code clarity)

**Why this matters:**

- Each effect runs after every render where dependencies change
- State updates in effects cause additional render cycles
- Derived state in effects creates unnecessary complexity and potential bugs
- Effects make components harder to test and reason about

</Performance-Impact-Guide>

<Quick-Reference>
**Prefer these patterns over effects when applicable:**
- **Derive state during render** - Calculate values from existing state/props instead of storing derived state
- **useMemo** - For expensive pure computations that depend on props/state
- **useCallback** - For stable callbacks passed to children (only when necessary to prevent re-renders)
- **key prop** - To reset component state when identity changes (triggers remount)
- **useRef** - For mutable values that don't trigger re-renders (DOM refs, timers, previous values)
- **useSyncExternalStore** - For subscribing to external data sources
- **Lift state up** - Move state to common parent instead of using effects to sync between components
- **Event handlers** - Handle user interactions directly instead of reacting to state changes in effects

**Keep effects for legitimate use cases:**

- Data fetching and API calls
- Setting up subscriptions (WebSocket, event listeners)
- Manually changing DOM (focus, scroll, measurements)
- Cleanup (timers, subscriptions, event listeners)
- Logging and analytics </Quick-Reference>

<Workflow>

<Step-1-Detection>
- **Run ESLint EXACTLY as shown - DO NOT modify the command:**
  - `./node_modules/.bin/eslint <file-path> --format=json` 
  - If this fails, try: `yarn eslint <file-path> --format=json`, exactly as shown
  
- **🚨 CRITICAL: ESLint has severe limitations - expect many false positives!**
  - **ESLint only sees surface patterns, not business logic, timing, or state relationships**
  - **Common false positives:** Loading state orchestration, editable state initialization, UI synchronization
  - **Always analyze the FULL context before accepting ANY ESLint suggestion**
  - **Default assumption:** ESLint is probably wrong until proven otherwise through deep analysis
  - **Many flagged effects are actually necessary features, not bugs**
- Look for:
  - ruleId: "react-you-might-not-need-an-effect"
- **If ESLint sees no errors, manually search for known patterns in the file.**
</Step-1-Detection>

<Step-2-Correction>

**Safety Assessment Framework:**

1. **OBVIOUS** - Safe to apply immediately (empty effects ONLY, no other patterns)
2. **MIXED** - Requires careful analysis. **Default approach: Add explanatory comments instead of
   refactoring**
3. **UNSAFE** - High risk of behavioral changes, requires user consultation

**🚨 CRITICAL: Be extremely conservative - most ESLint warnings are false positives!**

**Patterns that are almost always FALSE POSITIVES:**

- **Loading state orchestration** (like `loading || !isInitialised`)
- **Editable state initialization** (setting draft values from server data)
- **UI state synchronization** (keeping checkboxes in sync with selections)
- **State initialization effects** (like `setIsInitialised(true)`)
- **Event-driven notifications** (showing flags based on state transitions)
- **Form field initialization** (setting initial values from props/data)

**Default classification for common patterns:**

- Any effect involving `loading`, `initialized`, `isReady` → **MIXED**
- Any effect setting state from props/external data → **MIXED**
- Any effect responding to job/data changes → **MIXED**
- Effects with conditional logic → **MIXED**
- When in doubt → **MIXED**

**For MIXED cases - ALWAYS prefer comments over refactoring:**

- Add explanatory comments explaining WHY the effect is necessary
- Document timing dependencies, state orchestration, or initialization logic
- Only refactor with feature flags if user specifically requests it and provides compelling evidence

- Do not proceed with MIXED or UNSAFE changes without user approval - display proposed changes first
  and explain the assessment.
- Any non-obvious change must be unit tested to verify no behavioral change, or to showcase such to
  the user.

**General Refactoring Guidelines:**

- **Process rules by priority** - Start with highest impact fixes (Priority 5) and work down
- **One effect at a time** - Fix one useEffect, verify the change, potentially commit, then proceed
  to next
- **Always propose changes** to user if transformation safety is uncertain
- **Test behavioral equivalence** before and after changes
- **Prefer incremental changes** over large refactors
- **Document assumptions** about the original code's intent

**Expert Mode Execution Flow:**

**PHASE 1: UNDERSTAND** 🧠 - **MANDATORY DEEP ANALYSIS**

- **ASSUMPTION:** ESLint is wrong until proven otherwise through thorough analysis
- **MANDATORY:** Load the whole content of the file (expand_chunks) to see the complete picture
- Research the COMPLETE component context and business logic
- Trace state flow: What feeds into the effect? What does the effect output affect?
- Identify ALL usage patterns of the state being set
- Look for timing dependencies, orchestration logic, form patterns, loading patterns
- **Ask critical questions:**
  - Why did the original engineer choose this pattern?
  - What breaks if I remove this effect?
  - Is this state actually editable by users?
  - Does this coordinate timing between multiple systems?
  - Is this UI synchronization or true derived state?
- **Confidence Gate:** Must achieve 🟢 HIGH confidence in understanding WHY the effect exists before
  proceeding

**PHASE 2: PLAN** 📋

- Design refactor approach following priority order (5→1)
- **One effect at a time** - Plan single transformation with verification strategy
- Identify dependencies, test requirements, and rollback strategy
- **Confidence Gate:** Maintain 🟢 HIGH confidence or escalate to Deep Engineer

**PHASE 3: IMPLEMENT** 🔨

- Apply transformation following safety guidelines
- Add feature flag using established patterns
- Create inline validation notes documenting decisions
- **Checkpoint:** Self-review before proceeding

**PHASE 4: VERIFY** ✅

- **Correctness:** Behavioral equivalence verified
- **Pattern Compliance:** Follows React best practices
- **Quality:** Code clarity and maintainability improved
- **Compliance:** Feature flagging and safety requirements met
- **Completeness:** All edge cases considered

**PHASE 5: REFINE** 🔄

- Optimize implementation for clarity
- Remove any temporary scaffolding
- Document final approach and assumptions
- **Target:** 🟢 VERY HIGH confidence

**Quality Gates & Escalation Triggers:**

- **Gate 1 (UNDERSTAND):** Must achieve 🟢 HIGH confidence before planning
- **Gate 2 (PLAN):** Maintain 🟢 HIGH confidence or escalate to Deep Engineer mode
- **Gate 3 (IMPLEMENT):** Self-review checkpoint required before verification
- **Gate 4 (VERIFY):** Multi-pass validation must pass all criteria
- **Gate 5 (REFINE):** Final confidence must reach 🟢 VERY HIGH
- **Escalation:** If confidence remains 🟡 MEDIUM after UNDERSTAND + PLAN → suggest Deep Engineer
- **Safety uncertain:** Consult user before proceeding

**Priority-Based Workflow:**

1. **Priority 5 (🔴 Critical)** - Fix immediately, highest performance impact
2. **Priority 4 (🟡 High)** - Fix next, significant improvement
3. **Priority 3 (🟡 Medium)** - Fix when time allows, moderate improvement
4. **Priority 2 (🟢 Low)** - Fix for code quality, minimal performance impact
5. **Priority 1 (🟢 Cleanup)** - Fix for completeness, no performance impact

**Feature Flagging Guidelines (Jira):**

- **Convention**: `fg('jira_effects_refactor_XYZ')` - name is expected to be provided by the user,
  ask for it
- **Scope**: Flag at the smallest safe surface (component or feature level)
- **Default behavior**: Flag OFF = current behavior, Flag ON = refactored behavior
- **Lifecycle**: Not a part of this task
- **Reference**: docs/llm/agent-instructions/common/feature-gates-experiments.md

**Feature flag implementation pattern:**

```js
// Standard pattern for feature-flagged refactors
if (fg('effects-refactor.no-derived-state')) {
	// NEW: refactored behavior
	return derivedValue;
} else {
	// CURRENT: existing behavior with effect
	return statefulValue;
}
```

## PRIORITY 5 🔴 CRITICAL - Fix These First

### no-derived-state

**Priority: 5/5 🔴 CRITICAL**  
**Expected Improvement:** Eliminates unnecessary re-renders and state updates. Each effect run
triggers additional render cycle.  
**Safety: OBVIOUS** - Safe to apply immediately in most cases.

Disallow storing derived state in an effect. Values that can be calculated from existing state/props
should be derived during render.

**Performance Impact:** Every time dependencies change, the effect runs and causes an additional
state update, triggering another render. This can cause 2x render cycles for simple derivations.

**Incorrect:**

```js
function Form() {
	const [firstName, setFirstName] = useState('Taylor');
	const [lastName, setLastName] = useState('Swift');
	const [fullName, setFullName] = useState('');
	useEffect(() => {
		setFullName(firstName + ' ' + lastName);
	}, [firstName, lastName]);
}
```

**Corrected (derive during render):**

```js
function Form() {
	const [firstName, setFirstName] = useState('Taylor');
	const [lastName, setLastName] = useState('Swift');
	const fullName = `${firstName} ${lastName}`; // or useMemo if expensive computation
}
```

**Corrected (with feature flagging - for complex cases):**

```js
function Form() {
	const [firstName, setFirstName] = useState('Taylor');
	const [lastName, setLastName] = useState('Swift');
	const [fullNameState, setFullName] = useState('');

	useEffect(() => {
		if (!fg('effects-refactor.no-derived-state')) {
			setFullName(firstName + ' ' + lastName);
		}
	}, [firstName, lastName]);

	const fullName = fg('effects-refactor.no-derived-state')
		? `${firstName} ${lastName}`
		: fullNameState;
}
```

### no-chain-state-updates

**Priority: 5/5 🔴 CRITICAL**  
**Expected Improvement:** Prevents cascading re-renders and eliminates unnecessary state
synchronization complexity.  
**Safety: OBVIOUS** - Safe to apply immediately in most cases.

Disallow chaining state updates in an effect. When one state change should trigger another, prefer
deriving the dependent state during render.

**Performance Impact:** Creates cascading renders - first render updates state A, effect runs and
updates state B, causing another render. Can cause infinite loops if dependencies are incorrect.

**Incorrect:**

```js
function Game() {
	const [round, setRound] = useState(1);
	const [isGameOver, setIsGameOver] = useState(false);
	useEffect(() => {
		if (round > 10) {
			setIsGameOver(true);
		}
	}, [round]);
}
```

**Corrected (derive during render):**

```js
function Game() {
	const [round, setRound] = useState(1);
	const isGameOver = round > 10;
}
```

**Corrected (with feature flagging - for complex cases):**

```js
function Game() {
	const [round, setRound] = useState(1);
	const [isGameOverState, setIsGameOver] = useState(false);

	useEffect(() => {
		if (round > 10 && !fg('effects-refactor.no-chain-state-updates')) {
			setIsGameOver(true);
		}
	}, [round]);

	const isGameOver = fg('effects-refactor.no-chain-state-updates') ? round > 10 : isGameOverState;
}
```

## PRIORITY 4 🟡 HIGH - Fix These Next

### no-event-handler

**Priority: 4/5 🟡 HIGH**  
**Expected Improvement:** Eliminates effects that run on every relevant prop/state change, moving
logic to appropriate event timing.  
**Safety: UNSAFE** - High risk of behavioral changes. Always use feature flagging and user
consultation.

Disallow using an effect as an event handler. Effects that respond to prop/state changes should
often be moved to the actual event that caused the change.

**Performance Impact:** Effect runs on every dependency change, not just when the event actually
occurs. Can cause unwanted side effects on unrelated state updates.

**Incorrect:**

```js
function ProductPage({ product, addToCart }) {
	useEffect(() => {
		if (product.isInCart) {
			showNotification(`Added ${product.name} to the shopping cart!`);
		}
	}, [product]);

	return <button onClick={addToCart}>Add</button>;
}
```

**Corrected (move side effect to event handler):**

```js
function ProductPage({ product, addToCart }) {
	const onAddToCart = () => {
		addToCart(product);
		showNotification(`Added ${product.name} to the shopping cart!`);
	};

	return <button onClick={onAddToCart}>Add</button>;
}
```

**Corrected (with feature flagging):**

```js
function ProductPage({ product, addToCart }) {
	useEffect(() => {
		if (fg('effects-refactor.no-event-handler')) return; // Skip effect when flag is ON
		if (product.isInCart) {
			showNotification(`Added ${product.name} to the shopping cart!`);
		}
	}, [product]);

	const onAddToCart = () => {
		addToCart(product);
		if (fg('effects-refactor.no-event-handler')) {
			showNotification(`Added ${product.name} to the shopping cart!`);
		}
	};

	const handleClick = fg('effects-refactor.no-event-handler') ? onAddToCart : addToCart;
	return <button onClick={handleClick}>Add</button>;
}
```

### no-adjust-state-on-prop-change

**Priority: 3/5 🟡 MEDIUM**  
**Expected Improvement:** Reduces unnecessary effect runs and state updates when props change.
Simplifies state management logic.  
**Safety: MIXED** - Behavior may change subtly. Use feature flagging and careful testing.

Disallow adjusting state in an effect when a prop changes. Often better to derive state or use a key
prop to reset component state.

**Performance Impact:** Effect runs every time props change, causing additional renders. Derived
approach eliminates these extra renders.

**Incorrect:**

```js
function List({ items }) {
	const [isReverse, setIsReverse] = useState(false);
	const [selection, setSelection] = useState(null);
	useEffect(() => {
		setSelection(null);
	}, [items]);
}
```

**Corrected (derive selection by id - safer approach):**

```js
function List({ items }) {
	const [selectedId, setSelectedId] = useState(null);
	const selection = items.find((it) => it.id === selectedId) ?? null;
	// Selection naturally becomes null if the item disappears from items
}
```

**Corrected (with feature flagging):**

```js
function List({ items }) {
	const [selectedId, setSelectedId] = useState(null);
	const [selectionState, setSelection] = useState(null);

	useEffect(() => {
		if (!fg('effects-refactor.no-adjust-state-on-prop-change')) {
			setSelection(null);
		}
	}, [items]);

	const selection = fg('effects-refactor.no-adjust-state-on-prop-change')
		? (items.find((it) => it.id === selectedId) ?? null)
		: selectionState;
}
```

**Note:** This transformation changes when selection becomes null - in the original version it
happens on every `items` change, in the refactored version only when the selected item is removed.

## PRIORITY 3 🟡 MEDIUM - Fix When Time Allows

### no-reset-all-state-on-prop-change

**Priority: 3/5 🟡 MEDIUM**  
**Expected Improvement:** Eliminates effects that run on prop changes, reducing render cycles.
Better state management patterns.  
**Safety: UNSAFE** - High risk of behavioral changes. Requires careful analysis and user
consultation.

Disallow resetting all state in an effect when a prop changes. Two main approaches: remounting
(dangerous) or synchronous state updates during render.

**Performance Impact:** Effect runs every time props change, causing additional renders. Synchronous
updates during render eliminate extra render cycles.

**Incorrect:**

```js
function List({ items }) {
	const [selection, setSelection] = useState(null);
	useEffect(() => {
		setSelection(null);
	}, [items]);
}
```

**Corrected (Option 1: key prop to trigger remount - DANGEROUS):**

```js
function ListWrapper({ items, listKey }) {
	// Changing listKey intentionally resets List's internal state via remount
	return <List key={listKey} items={items} />;
}
```

**⚠️ WARNING:** This approach causes complete component remount, losing all state, refs, and focus.
Only use if remounting is acceptable.

**Corrected (Option 2: synchronous state update during render - safer):**

```js
function List({ items }) {
	const [selection, setSelection] = useState(null);
	const [prevItems, setPrevItems] = useState(items);

	// Synchronous state update during render
	if (items !== prevItems) {
		setPrevItems(items);
		setSelection(null);
	}
}
```

**Corrected (with feature flagging):**

```js
function List({ items }) {
	const [selection, setSelection] = useState(null);
	const [prevItems, setPrevItems] = useState(items);

	// Legacy effect-based approach
	useEffect(() => {
		if (!fg('effects-refactor.no-reset-all-state-on-prop-change')) {
			setSelection(null);
		}
	}, [items]);

	// New synchronous approach
	if (fg('effects-refactor.no-reset-all-state-on-prop-change') && items !== prevItems) {
		setPrevItems(items);
		setSelection(null);
	}
}
```

### no-pass-live-state-to-parent

**Priority: 2/5 🟢 LOW**  
**Expected Improvement:** Reduces effects that synchronize state with parent. Better component
communication patterns.  
**Safety: MIXED** - If parent relies on effect timing, migration may be UNSAFE.

Incorrect:

```js
function Child({ onTextChanged }) {
	const [text, setText] = useState('');
	useEffect(() => {
		onTextChanged(text);
	}, [onTextChanged, text]);
}
```

Corrected (notify in event handler):

```js
function Child({ onTextChanged }) {
	const [text, setText] = useState('');
	const onChange = (e) => {
		const next = e.target.value;
		setText(next);
		onTextChanged(next);
	};
	return <input value={text} onChange={onChange} />;
}
```

Corrected (with feature flagging. Incorrect implementation):

```js
function Child({ onTextChanged }) {
	const [text, setText] = useState('');
	if (!fg('effects-refactor.no-pass-live-state-to-parent')) {
		useEffect(() => {
			onTextChanged(text);
		}, [onTextChanged, text]);
		return <input value={text} onChange={(e) => setText(e.target.value)} />;
	}
	const onChange = (e) => {
		const next = e.target.value;
		setText(next);
		onTextChanged(next);
	};
	return <input value={text} onChange={onChange} />;
}
```

Corrected (with feature flagging. Correct implementation):

```js
function Child({ onTextChanged }) {
	const [text, setTextState] = useState('');
	useEffect(() => {
		if (fg('effects-refactor.no-pass-live-state-to-parent')) return;
		onTextChanged(text);
	}, [onTextChanged, text]);
	const onSetText = (next) => {
		setTextState(next);
		onTextChanged(next);
	};
	const setText = fg('effects-refactor.no-pass-live-state-to-parent') ? onSetText : setTextState;
}
```

## PRIORITY 2 🟢 LOW - Fix for Code Quality

### no-pass-data-to-parent

**Priority: 2/5 🟢 LOW**  
**Expected Improvement:** Better data flow patterns, reduces parent-child effect coupling. Moderate
complexity reduction.  
**Safety: MIXED** - If parent expects notification semantics, migration may be UNSAFE → use a
feature flag.

Incorrect:

```js
function Child({ onDataFetched }) {
	const { data } = useQuery('/data');
	useEffect(() => {
		onDataFetched(data);
	}, [data, onDataFetched]);
}
```

Corrected (lift data or use callback at fetch site):

```js
function Parent() {
	const { data } = useQuery('/data');
	return <Child data={data} />;
}
function Child({ data }) {
	// Use data directly; no effect
	return <View data={data} />;
}
```

Corrected (with feature flagging, incorrect implementation as complexity skyrockets):

```js
function Parent() {
	const { data } = useQuery('/data');
	if (!fg('effects-refactor.no-pass-data-to-parent')) {
		return <Child onDataFetched={(d) => console.log('fetched', d)} dataFromParent={data} />; // current API
	}
	// refactored: parent owns data and passes it down
	return <Child data={data} />;
}
function Child(props) {
	if (!fg('effects-refactor.no-pass-data-to-parent')) {
		const { dataFromParent, onDataFetched } = props;
		useEffect(() => {
			onDataFetched(dataFromParent);
		}, [dataFromParent, onDataFetched]);
		return <View data={dataFromParent} />;
	}
	const { data } = props;
	return <View data={data} />;
}
```

Delegate solution to the user. It could be better to rewrite whole components and feature flag them
entirely (componentWithFG).

### no-initialize-state

**Priority: 2/5 🟢 LOW**  
**Expected Improvement:** Eliminates unnecessary effect and extra render cycle during component
initialization.  
**Safety: MIXED** - Often involves timing orchestration with loading states or async operations.

**⚠️ CRITICAL: This pattern is often necessary for timing control!**

**Common legitimate use case:**

```js
function useDataLoader() {
	const [isInitialised, setIsInitialised] = useState(false);
	const { loading, data, loadFirstPage } = useLazyQuery();

	useEffect(() => {
		loadFirstPage(); // triggers loading = true
		setIsInitialised(true); // CRITICAL: ensures loading is controlled by query, not initialization
	}, []);

	return {
		loading: loading || !isInitialised, // Without setIsInitialised, this would always be true!
		data,
	};
}
```

**Why this effect is necessary:**

- `loading` starts as `false` before query is triggered
- `!isInitialised` provides loading state until query takes over
- Without `setIsInitialised(true)`, loading would remain `true` forever
- This is timing orchestration, not simple initialization

**Default approach: Add explanatory comment**

```js
useEffect(() => {
	loadFirstPage(); // fetch issues once on mount
	// CRITICAL: Set initialized to true so loading state is controlled by query, not mount status
	// Without this, loading || !isInitialised would keep loading=true forever
	setIsInitialised(true);
}, []);
```

**Only refactor if user specifically requests it and provides feature flag name.**

Be careful with changes like this. Analyse how `state` is used. It might be a feature to have
"undefined" state. For example it could be related to SSR, where effects don't run.

### no-manage-parent

**Priority: 2/5 🟢 LOW**  
**Expected Improvement:** Removes effects that manage parent state, simplifies component
communication patterns.  
**Safety: MIXED** - If parent depends on effect-driven contract, migration may be UNSAFE.

Incorrect:

```js
function Child({ isOpen, onClose }) {
	useEffect(() => {
		if (!isOpen) {
			onClose();
		}
	}, [isOpen, onClose]);
}
```

Corrected (let parent control open; child emits user events only):

```js
function Child({ isOpen /*onClose*/ }) {
	// No effect; only user events should call onClose
	// Parent does everything
}
```

Corrected (with feature flagging): not directly applicable as requires changes to the "parent"

## PRIORITY 1 🟢 CLEANUP - Fix for Completeness

### no-empty-effect

**Priority: 1/5 🟢 CLEANUP**  
**Expected Improvement:** Code cleanup only, no performance impact. Removes dead code and improves
maintainability.  
**Safety: OBVIOUS** - Safe to apply immediately without feature flagging.

Disallow empty effects. These serve no purpose and should be removed entirely.

**Incorrect:**

```js
function Component() {
	useEffect(() => {}, []);
	// or
	useEffect(() => {
		// TODO: implement later
	}, []);
}
```

**Corrected:**

```js
function Component() {
	// Remove the effect entirely - no side effects to run
	// Move any TODO comments to component-level or issue tracking
}
```

**Note:** Empty effects are often leftover from development or incomplete implementations. Always
check git history to understand original intent before removing. </Step-2-Correction>

<AI-Staging-Area>
- For complex refactors, stage diffs in .ai-cache/you-might-not-need-effect/<short-branch-or-task-id>
- Validate against this instruction before committing
</AI-Staging-Area>
