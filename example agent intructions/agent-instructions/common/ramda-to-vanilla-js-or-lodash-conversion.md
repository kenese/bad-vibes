<!-- meta:
  mode: expert
  topic: ramda-to-vanilla-js-or-lodash-conversion
  audience: ai-agent
  model: sonnet-4
  token_budget: medium
  priority: high
  read_when: converting Ramda methods to vanilla Javascript or Lodash
  depends_on: [common.md, feature-gates-experiments.md]
  last_review: 2025-09-17
-->

<Self-Reflection>
- Ramda methods are being phased out in favor of vanilla Javascript
- Vanilla JavaScript is the preferred replacement; Lodash is acceptable only for complex or verbose cases.
- Refactored code must be functionally equivalent to the original Ramda implementation.
- ALL Ramda methods conversions MUST be wrapped behind a feature gate (provided by the engineer) - no exceptions
- Nested Ramda usages must be refactored as a whole expression, not method by method.
- Each pull request must only address the Ramda methods explicitly listed by the engineer (plus any nested ones encountered).
- Unit tests for refactored functions must be verified; new tests must be added if no tests exist.
- Code readability and safety are non-negotiable requirements in the conversion.
</Self-Reflection>

<Quick-Reference>
**CRITICAL: Read these BEFORE converting:**
- [Common Patterns](./common.md) - REQUIRED for Jira-specific patterns and conventions
- [Feature Gates](./feature-gates-experiments.md) - REQUIRED for ALL Ramda methods conversions

**All Ramda methods conversions MUST be feature gated:**

- Small / medium changes: Use `fg('gate-name')` inline
- Extensive changes: `functionWithCondition` pattern

**Conversion patterns:**

- Array transformations → Replace `R.map`, `R.filter`, `R.reduce`, `R.find` with native array
  methods (`.map`, `.filter`, `.reduce`, `.find`).
- Property access → Replace `R.prop` or `R.path` with direct property access `(obj.key)` or optional
  chaining `(obj?.a?.b)`.
- Object manipulation → Replace `R.pick`, `R.omit`, `R.merge` with spread operators `({ ...obj })`
  or Lodash utilities if multiple keys are involved.
- Default values → Replace `R.defaultTo` with nullish coalescing (`val ?? defaultVal`).
- Nil checks → Replace `R.isNil` with `val == null`.
- Flattening & uniqueness → Replace `R.flatten` and `R.uniq` with `arr.flat()` or
  `[...new Set(arr)]`; use Lodash if nested/complex.
- Function composition → Replace `R.compose` and `R.pipe` with inline arrow functions
  `(x => f(g(x)))` or simple helper functions.
- Replace `R.equals` with `isEqual` from `loadash/isEqual` package.
- Replace `R.evolve` with JavaScript object spreading.
- Replace `R.dissoc` with JavaScript native `Object.fromEntries` and other needed methods.
- Nested usages → When encountering multiple Ramda calls inside one another, refactor the entire
  expression into a single vanilla/Lodash expression instead of method-by-method substitution.
- Immutability preservation → Ensure refactored code uses spread operators or non-mutating patterns
  to preserve Ramda’s immutability guarantees.
- Readability over cleverness → Prefer clear, idiomatic JavaScript even if slightly longer than the
  Ramda equivalent.

</Quick-Reference>

# Ramda methods to vanilla Javascript (or Lodash) conversion

<Feature-Gating-Required>

**ALL Ramda methods conversions MUST be feature gated. Choose based on scope:**

**Option 1: Inline gating for small/medium changes**

```tsx
import { fg } from '@atlassian/jira-feature-gating';

// Gate between old Ramda method and new implementation
{
	const ids = fg('ramda_refactor_gate')
		? items.map((item) => item.id) // Refactored version
		: R.map(R.prop('id'), items); // Original Ramda version
}
```

**Option 2: Condition function gating for extensive changes**

```tsx
import { fg } from '@atlassian/jira-feature-gating';
import { functionWithCondition } from '@atlassian/jira-feature-flagging-utils';

// functionWithCondition takes a condition function and two implementations, returning a hook that calls the first implementation if the condition is true, otherwise the second
const getSuggestedComments = functionWithCondition(
	() => fg('ramda_refactor_gate'),
	getSuggestedCommentsNew, // Refactored function without Ramda methods
	getSuggestedCommentsOld, // Original function with Ramda methods
);
```

See [Feature Gates Guide](./feature-gates-experiments.md) for implementation details.

</Feature-Gating-Required>

<Core-Patterns>

- **Refactor whole expressions, not piece by piece**: Rewrite the full Ramda chain into one
  vanilla/Lodash expression.

```tsx
// Original
const ids = R.map(R.prop('id'), items);

// Good
const ids = items.map((item) => item.id);

// Bad (piecemeal refactor)
const ids = R.map((item) => item.id, items);
```

- **Readability over brevity**: Prefer clear, idiomatic JS instead of dense or “clever” one-liners.

```tsx
// Good
const activeUsers = users.filter((u) => u.active).map((u) => u.name);

// Bad
const activeUsers = users.reduce((a, u) => (u.active ? [...a, u.name] : a), []);
```

- **Handle edge cases safely**: Use optional chaining and nullish coalescing when replacing Ramda’s
  safe utilities.

```tsx
// Original
const names = R.map(R.prop('name'), users);

// Good
const names = users?.map((u) => u.name) ?? [];

// Bad
const names = users.map((u) => u.name); // may throw if users is null
```

- **Currying and partial application**: Ramda auto-curries; vanilla JS does not. Rewrite explicitly
  if code depends on currying.

```tsx
// Original
const getIds = R.map(R.prop('id'));

// Good
const getIds = (arr) => arr.map((item) => item.id);
const ids = getIds(items);

// Bad
const getIds = R.map((item) => item.id, items); // loses currying
```

- **Composition vs inline nesting**: Replace `R.pipe` / `R.compose` with inline arrow functions or
  small helper functions for clarity.

```tsx
// Original
const fullNames = R.pipe(R.map(R.prop('first')), R.map(R.toUpper));

// Good
const fullNames = (users) => users.map((u) => u.first.toUpperCase());

// Bad
const fullNames = (users) => users.map(R.toUpper(R.prop('first', users))); // awkward
```

- **Lodash vs Vanilla JavaScript: Preferred Conversion Cases**: Use Lodash when vanilla JS is
  verbose, complex, or error-prone.

Example 1 — Merging objects deeply

```tsx
// Original
// Using Ramda for merging objects
const merged = R.mergeDeepRight(obj1, obj2);

// Good
// Use Lodash for deep merge safely
const merged = _.merge({}, obj1, obj2);

// Bad
// Vanilla JS shallow merge only; does not handle nested objects
const merged = { ...obj1, ...obj2 };
```

Example 2 — Unique array of objects by key

```tsx
// Original
// Using Ramda to get unique users by id
const uniqueUsers = R.uniqBy(R.prop('id'), users);

// Good
// Lodash handles uniqueness by key clearly
const uniqueUsers = _.uniqBy(users, 'id');

// Bad
// Vanilla JS requires verbose manual implementation
const uniqueUsers = Array.from(new Map(users.map((u) => [u.id, u])).values());
```

Example 3 — Deep Cloning Objects

```tsx
// Original
// Using Ramda to clone an object
const cloned = R.clone(obj);

// Good
// Use Lodash for deep cloning safely
const cloned = _.cloneDeep(obj);

// Bad
// Vanilla JS shallow or error-prone deep clone
const cloned = JSON.parse(JSON.stringify(obj)); // ❌ fails for functions, Dates, undefined
```

</Core-Patterns>

<Implementation-Checklist>

1. **Identify Ramda usage:**
   - Scan the code for all instances of the provided list of Ramda methods.
   - Include nested calls in the same function.

2. **Determine replacement strategy**
   - Prefer vanilla JS for simple cases.
   - Use Lodash only for complex or verbose operations (deep cloning, nested picks, uniqueness by
     key, merges).

3. **Refactor code**
   - Replace Ramda calls with the chosen vanilla JS or Lodash equivalent.
   - Refactor entire expressions for nested Ramda calls.
   - Preserve immutability and functional behavior.

4. **Wrap with feature gate**
   - Use the provided `fg` feature gate.
   - Use inline `fg('gate-name')` gating for small / medium changes and function condition
     `functionWithCondition` gating for extensive changes.
   - Maintain the original Ramda implementation in the fallback path.

5. **Verify unit tests**
   - Check sibling `*.test.tsx` files for coverage of the refactored function.
   - Run existing tests to confirm correctness.
   - Add new tests if coverage is missing.

6. **Code readability & quality**
   - Ensure code is idiomatic, clean, and understandable.
   - Add inline comments where the conversion is non-trivial.

7. **Limit PR scope**
   - Only include the Ramda methods provided for this PR (plus nested ones encountered).
   - Avoid unrelated refactors to reduce risk.

8. **Final review**
   - Confirm feature-gated path behaves identically to original when disabled.
   - Double-check immutability, edge-case handling, and null safety.

</Implementation-Checklist>

<Validation-Checklist>

Before marking complete:

- [ ] All Ramda methods listed for this PR have been refactored
- [ ] Nested Ramda calls refactored as whole expressions
- [ ] Vanilla JS or Lodash replacements applied correctly
- [ ] Feature gate implemented (`fg()` or `functionWithCondition`)
- [ ] Original Ramda code preserved in the fallback path
- [ ] Unit tests for refactored functions verified or added if missing
- [ ] Code maintains immutability and functional behavior
- [ ] Null/undefined safety handled appropriately
- [ ] Code is readable, idiomatic, and commented where non-trivial
- [ ] PR scope limited to assigned methods only (plus nested ones encountered)
- [ ] All tests pass successfully

</Validation-Checklist>

<Navigation-For-LLM-Agents>

**MUST READ before starting:**

- [Common Patterns](./common.md) - REQUIRED for Jira patterns and architecture
- [Feature Gates](./feature-gates-experiments.md) - Required for ALL conversions

**When implementing:**

- **Start with Self-Reflection**: Read the `<Self-Reflection>` section first to understand the
  rationale, goals, and non-negotiable rules before making changes.
- **Use Core Patterns as Principles**: Refer to `<Core-Patterns>` for high-level guidelines on
  immutability, readability, edge-case handling, and nested calls.
- **Apply Conversion Patterns**: Use `<Quick-Reference>` for concrete examples of how to replace
  specific Ramda functions or patterns with vanilla JS or Lodash.
- **Follow Implementation Checklist**: Follow the numbered `<Implementation-Checklist>` to ensure
  all steps are completed in order and correctly.
- **Validate with Tests and Feature Gates**: Check `<Validation-Checklist>` to confirm all feature
  gates, tests, and safety measures are correctly applied.
- **Fallback Safety**: Always preserve the original Ramda code behind the `fg` feature gate so
  behavior can be safely toggled.
- **Consistency Across Refactors**
  - Maintain argument order, currying behavior, and function purity where Ramda originally provided
    it.
  - Refactor nested Ramda expressions entirely rather than partially.
- **Error Handling and Edge Cases**: Ensure null, undefined, empty arrays, and nested object access
  are handled safely.
- **Refer to Examples**: Use the “Original / Good / Bad” examples in Core Patterns and Lodash
  preferred cases to guide the structure of refactored code.

</Navigation-For-LLM-Agents>
