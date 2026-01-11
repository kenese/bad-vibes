<!-- meta:
  mode: default
  topic: unused-message-key-cleanup
  audience: ai-agent
  model: sonnet-4
  token_budget: medium
  priority: medium
  read_when: cleaning up unused message keys from messages.tsx files
  depends_on: [unit-testing.md]
  last_review: 2025-10-02
-->

<Self-Reflection>
- Message keys exist for internationalization - removing unused ones reduces bundle size
- ALWAYS verify usage before removal - keys might be used dynamically or in tests
- TypeScript errors after removal indicate the key is actually in use
- Safe removal requires checking all importing files for references
- Reverting changes is better than breaking functionality
</Self-Reflection>

<Quick-Decision-Framework>

**Found a messages.tsx file with potentially unused keys?**

1. **FIRST**: Check all files that import this messages file for actual usage
2. **VERIFY**: Search for dynamic usage patterns (e.g., `messages[keyName]`)
3. **REMOVE**: Only keys that are genuinely unused
4. **TEST**: Run TypeScript checking after removal
5. **REVERT**: If any errors occur, restore the removed keys

**Key is referenced in code?**

- SKIP removal - key is in use
- Priority: Do not remove

**Key not found in any imports?**

- SAFE to remove - but verify with TypeScript check
- Priority: Safe removal candidate

</Quick-Decision-Framework>

# Unused Message Key Cleanup

> Strategic guidance for systematically removing unused internationalization message keys from
> messages.tsx files. Focus on safe removal with comprehensive usage verification to prevent
> breaking changes while reducing bundle size.

<Design-Philosophy-Rationale>

Unused message keys contribute to bundle bloat and maintenance overhead:

- **Bundle Size**: Each unused key adds unnecessary bytes to the final bundle
- **Maintainability**: Fewer keys mean easier maintenance and fewer translation costs
- **Code Clarity**: Removing dead code improves codebase understanding
- **Safety First**: Never remove a key that might be used, even if usage isn't obvious

The goal is to safely identify and remove genuinely unused message keys while preserving all keys
that serve a purpose in the application.

</Design-Philosophy-Rationale>

<Where-To-Find-It>

- **Message files**: `**/messages.tsx` → Internationalization message definitions
- **Component files**: Look for `FormattedMessage`, `formatMessage`, or direct message imports
- **Dynamic usage**: Search for bracket notation access like `messages[keyName]`
- **Test files**: `*.test.tsx`, `*.spec.tsx` → May reference messages for testing
- **Story files**: `*.stories.tsx` → Storybook examples might use messages

</Where-To-Find-It>

<Core-Concepts>

### Message Key Usage Patterns

1. **Direct Import Usage**

   ```tsx
   import messages from './messages';
   <FormattedMessage {...messages.keyName} />;
   ```

2. **Dynamic Access**

   ```tsx
   const messageKey = condition ? 'keyA' : 'keyB';
   formatMessage(messages[messageKey]);
   ```

3. **Destructured Usage**

   ```tsx
   const { keyName, anotherKey } = messages;
   ```

4. **Test References**

   ```tsx
   expect(screen.getByText(messages.keyName.defaultMessage)).toBeInTheDocument();
   ```

### Verification Strategy

1. **Static Analysis** - Search for direct key references
2. **Import Checking** - Find all files importing the messages file
3. **Dynamic Pattern Detection** - Look for computed property access
4. **TypeScript Validation** - Use compiler to catch missed references

</Core-Concepts>

<Step-By-Step-Process>

## 1. Identify Target Messages File

```bash
# Find messages.tsx files in target directory
find /path/to/directory -name "messages.tsx" -type f
```

## 2. Analyze Message Keys

**Read the messages file and identify all exported keys:**

```tsx
// Example messages.tsx structure
export default defineMessages({
	keyOne: { id: '...', defaultMessage: '...', description: '...' },
	keyTwo: { id: '...', defaultMessage: '...', description: '...' },
	// ... more keys
});
```

## 3. Check for Usage in Importing Files

**Find all files that import this messages file:**

```bash
# Search for imports of the messages file
grep -r "from.*messages" /path/to/directory
grep -r "import.*messages" /path/to/directory
```

**For each importing file, verify key usage:**

```bash
# Check for specific key usage
grep -n "keyName\|\.keyName" /path/to/importing/file.tsx
```

## 4. Verify Dynamic Usage Patterns

**Check for computed property access:**

```bash
# Look for bracket notation access
grep -n "messages\[" /path/to/directory
grep -n "\.messages\[" /path/to/directory
```

**Check for destructuring patterns:**

```bash
# Look for destructuring assignments
grep -n "const.*{.*}.*=.*messages" /path/to/directory
```

## 5. Safe Key Removal

**Only remove keys that are:**

- Not referenced in any importing files
- Not used in dynamic access patterns
- Not referenced in tests or stories
- Not part of destructuring assignments

```tsx
// BEFORE - with unused key
export default defineMessages({
	usedKey: { id: '...', defaultMessage: '...', description: '...' },
	unusedKey: { id: '...', defaultMessage: '...', description: '...' }, // ← Remove this
});

// AFTER - unused key removed
export default defineMessages({
	usedKey: { id: '...', defaultMessage: '...', description: '...' },
});
```

## 6. TypeScript Validation

**After removing keys, run TypeScript checking:**

```bash
# Check for TypeScript errors in the directory
npx tsc --noEmit --project /path/to/tsconfig.json
```

**Or use linting tools:**

```bash
# Run linter on the modified files
npx eslint /path/to/modified/files
```

## 7. Handle TypeScript Errors

**If TypeScript errors occur after removal:**

1. **Identify the error** - which key is still being referenced
2. **Locate the usage** - find where the removed key is used
3. **Revert the removal** - restore the key to the messages file
4. **Document the usage** - understand why the key appeared unused

```bash
# Revert specific file changes
git checkout -- /path/to/messages.tsx
```

</Step-By-Step-Process>

<Common-Patterns>

### Safe Removal Indicators

```tsx
// ✅ SAFE - Key not referenced anywhere
export default defineMessages({
	activeKey: {
		/* used in components */
	},
	orphanedKey: {
		/* never referenced */
	}, // ← Safe to remove
});
```

### Dangerous Removal Patterns

```tsx
// ❌ DANGEROUS - Dynamic usage
const getMessageKey = (type: string) => `${type}Key`;
formatMessage(messages[getMessageKey('error')]); // errorKey used dynamically

// ❌ DANGEROUS - Conditional usage
const key = isError ? 'errorKey' : 'successKey';
return <FormattedMessage {...messages[key]} />;

// ❌ DANGEROUS - Test usage
expect(component).toHaveTextContent(messages.hiddenKey.defaultMessage);
```

### Verification Commands

```bash
# Comprehensive usage search for a specific key
grep -r "keyName" /path/to/directory --include="*.tsx" --include="*.ts"

# Check for bracket notation with the key
grep -r "\['keyName'\]\|\[\"keyName\"\]" /path/to/directory

# Look for template literal usage
grep -r "\`.*keyName.*\`" /path/to/directory
```

</Common-Patterns>

<Troubleshooting>

### "Key appears unused but TypeScript errors occur"

**Possible causes:**

1. **Dynamic key construction** - Key built from variables
2. **Indirect references** - Key passed through props or functions
3. **Test files** - Referenced in test assertions
4. **Type definitions** - Used in TypeScript interfaces

**Solution:** Search more broadly and check test files

### "Removal breaks unrelated components"

**Possible causes:**

1. **Shared message files** - Multiple components use the same messages
2. **Re-exported keys** - Messages re-exported from index files

**Solution:** Check for re-exports and shared usage patterns

### "Can't find where key is used"

**Search strategies:**

```bash
# Search with different quote styles
grep -r "'keyName'\|\"keyName\"\|\`keyName\`" /path/to/directory

# Search for partial matches
grep -r "keyName" /path/to/directory

# Search in all file types
grep -r "keyName" /path/to/directory --include="*"
```

</Troubleshooting>

<Best-Practices>

### Before Starting

1. **Understand the codebase** - Know how messages are typically used
2. **Start small** - Begin with obviously unused keys
3. **Have a backup plan** - Know how to revert changes quickly

### During Cleanup

1. **One file at a time** - Don't modify multiple message files simultaneously
2. **Verify thoroughly** - Multiple search patterns for each key
3. **Test immediately** - Run TypeScript check after each file modification
4. **Document findings** - Keep track of which keys were safely removed

### After Cleanup

1. **Run full test suite** - Ensure no runtime breakages
2. **Check bundle size** - Verify the cleanup achieved its goal
3. **Update documentation** - Note any patterns discovered during cleanup

### Safety Checklist

- [ ] Searched all importing files for key usage
- [ ] Checked for dynamic/computed property access
- [ ] Verified no test file references
- [ ] Ran TypeScript checking after removal
- [ ] No linting errors introduced
- [ ] Ready to revert if issues found

</Best-Practices>
