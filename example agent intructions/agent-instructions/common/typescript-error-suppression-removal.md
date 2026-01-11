# TypeScript Error Suppression Removal

<!-- meta:
  mode: expert
  topic: typescript-typing
  audience: ai-agent
  model: sonnet-4
  token_budget: medium
  priority: high
  read_when: removing @ts-expect-error, @ts-ignore, as any, or : any
  depends_on: [unit-testing.md, integration-testing.md]
  last_review: 2025-09-16
-->

> Strategic guidance for systematically removing TypeScript error suppressions and replacing them
> with comprehensive, correct typing. Focus on maintainability, type safety, and preventing future
> type errors. Do not transition or change the status of any Jira tickets.

<Self-Reflection>
- Type suppressions exist for a reason - understand the underlying issue before removing
- Proper typing improves developer experience and prevents runtime errors
- Each suppression removal should make the codebase more maintainable
- Type safety is a feature that benefits the entire development team
</Self-Reflection>

<Where-To-Find-It>

- **Type definitions**: `src/types/` → Global type definitions and interfaces
- **Component typing**: Look for `Props` interfaces and component generics
- **API types**: GraphQL schema types, REST API interfaces
- **Utility types**: TypeScript utility types (`Partial`, `Pick`, `Omit`, etc.)
- **Third-party types**: `@types/*` packages and their documentation

</Where-To-Find-It>

<Design-Philosophy-Rationale>

TypeScript error suppressions are technical debt that compromise type safety:

- **Type Safety is Progressive**: Each suppression removal makes the entire codebase safer
- **Developer Experience**: Proper typing enables better IDE support and catches errors early
- **Maintainability**: Well-typed code is easier to refactor and understand
- **Runtime Safety**: Types prevent entire classes of runtime errors

The goal is not just to remove suppressions, but to create comprehensive, accurate types that
improve the development experience.

</Design-Philosophy-Rationale>

<Core-Concepts>

### Error Suppression Hierarchy (Most to Least Problematic)

1. **`as any`** - Completely bypasses TypeScript, highest risk
2. **`: any`** - Explicit any typing, still bypasses safety
3. **`@ts-ignore`** - Silences all errors on next line
4. **`@ts-expect-error`** - Documents expected errors, safest suppression

### Typing Strategy Priority

1. **Exact Types** - Create precise interfaces and types
2. **Generic Constraints** - Use generics with proper bounds
3. **Union Types** - Combine multiple valid types
4. **Utility Types** - Leverage TypeScript's built-in utilities

</Core-Concepts>

<Quick-Decision-Framework>

**Found `as any` or `: any`?**

- ALWAYS replace - these completely bypass type checking
- Priority: High - fix immediately

**Found `@ts-ignore`?**

- Understand the error being suppressed
- Replace with proper typing or `@ts-expect-error` with explanation
- Priority: High - no documentation of what's being ignored

**Found `@ts-expect-error`?**

- Check if the expected error still exists
- If error is gone, remove the suppression
- If error remains, consider if proper typing can fix it
- Priority: Medium - at least documented

**Complex typing needed?**

- Break down into smaller, focused types
- Use utility types (`Pick`, `Omit`, `Partial`)
- Consider generic constraints
- Document complex types with JSDoc comments

## Implementation Patterns

### Removing `as any` Suppressions

**Pattern**: Replace `as any` with proper type assertions or typing

```typescript
// AVOID: Complete type bypass
const userData = response.data as any;
const userId = userData.id; // No type safety

// BETTER: Define proper interface
interface UserResponse {
	data: {
		id: string;
		name: string;
		email: string;
	};
}

const userData = response as UserResponse;
const userId = userData.data.id; // Type safe

// BEST: Use type guards for runtime safety
const isUserResponse = (obj: unknown): obj is UserResponse => {
	return (
		typeof obj === 'object' &&
		obj !== null &&
		'data' in obj &&
		typeof (obj as any).data?.id === 'string'
	);
};

if (isUserResponse(response)) {
	const userId = response.data.id; // Fully type safe
}
```

### Removing `: any` Type Annotations

**Pattern**: Replace explicit `any` with proper types

```typescript
// AVOID: Explicit any typing
const handleEvent = (event: any) => {
	console.log(event.target.value);
};

// BETTER: Use proper event types
const handleEvent = (event: React.ChangeEvent<HTMLInputElement>) => {
	console.log(event.target.value); // Type safe
};

// BEST: Generic for reusability
const handleEvent = <T extends HTMLElement>(event: React.ChangeEvent<T>) => {
	console.log(event.target.value);
};
```

### Replacing `@ts-ignore` with Proper Typing

**Pattern**: Understand and fix the underlying type issue

```typescript
// AVOID: Silencing without understanding
// @ts-ignore
const result = someFunction(invalidArgument);

// BETTER: Understand the error and fix it
interface ValidArgument {
	id: string;
	value: number;
}

const validArgument: ValidArgument = {
	id: 'example',
	value: 42,
};
const result = someFunction(validArgument);

// ALTERNATIVE: If truly unavoidable, document with @ts-expect-error
// @ts-expect-error - Legacy API expects string but we're migrating to structured data
const result = someFunction(legacyArgument);
```

### Converting `@ts-expect-error` to Proper Types

**Pattern**: Address the root cause of expected errors

```typescript
// CURRENT: Suppressing property access error
// @ts-expect-error - Property might not exist on older API responses
const userName = response.user.name;

// BETTER: Handle optional properties properly
interface ApiResponse {
	user?: {
		name?: string;
	};
}

const response: ApiResponse = await fetchUser();
const userName = response.user?.name ?? 'Unknown';

// BEST: Use type guards for complex cases
const hasUserName = (response: unknown): response is { user: { name: string } } => {
	return (
		typeof response === 'object' &&
		response !== null &&
		'user' in response &&
		typeof (response as any).user?.name === 'string'
	);
};

if (hasUserName(response)) {
	const userName = response.user.name; // Guaranteed to exist
}
```

### Complex Object Typing

**Pattern**: Break down complex objects into manageable types

```typescript
// AVOID: Using any for complex nested objects
const processData = (data: any) => {
	return data.items.map((item: any) => ({
		id: item.id,
		title: item.metadata.title,
		author: item.metadata.author.name,
	}));
};

// BETTER: Define structured types
interface Author {
	name: string;
	id: string;
}

interface ItemMetadata {
	title: string;
	author: Author;
	createdAt: Date;
}

interface DataItem {
	id: string;
	metadata: ItemMetadata;
}

interface ProcessedData {
	items: DataItem[];
}

const processData = (data: ProcessedData) => {
	return data.items.map((item) => ({
		id: item.id,
		title: item.metadata.title,
		author: item.metadata.author.name,
	}));
};

// BEST: Use utility types for transformations
type ProcessedItem = Pick<DataItem, 'id'> & {
	title: string;
	author: string;
};

const processData = (data: ProcessedData): ProcessedItem[] => {
	return data.items.map((item) => ({
		id: item.id,
		title: item.metadata.title,
		author: item.metadata.author.name,
	}));
};
```

### Generic Type Constraints

**Pattern**: Use generics with proper constraints instead of any

```typescript
// AVOID: Generic without constraints
const updateEntity = <T>(entity: T, updates: any): T => {
	return { ...entity, ...updates };
};

// BETTER: Constrained generics
const updateEntity = <T extends Record<string, unknown>>(entity: T, updates: Partial<T>): T => {
	return { ...entity, ...updates };
};

// BEST: Precise generic constraints
interface Identifiable {
	id: string;
}

const updateEntity = <T extends Identifiable>(entity: T, updates: Partial<Omit<T, 'id'>>): T => {
	return { ...entity, ...updates };
};
```

## Advanced Typing Patterns

### Discriminated Unions

**Pattern**: Use discriminated unions instead of any for variant types

```typescript
// AVOID: Using any for different response types
const handleResponse = (response: any) => {
	if (response.success) {
		return response.data;
	} else {
		throw new Error(response.error);
	}
};

// BETTER: Discriminated union
type ApiResponse<T> = { success: true; data: T } | { success: false; error: string };

const handleResponse = <T>(response: ApiResponse<T>): T => {
	if (response.success) {
		return response.data; // TypeScript knows this is T
	} else {
		throw new Error(response.error); // TypeScript knows this is string
	}
};
```

### Conditional Types

**Pattern**: Use conditional types for complex type relationships

```typescript
// AVOID: Any for conditional return types
const getValue = (key: string, isOptional: boolean): any => {
	// Implementation
};

// BETTER: Conditional types
type GetValue<T extends boolean> = T extends true ? string | undefined : string;

const getValue = <T extends boolean>(key: string, isOptional: T): GetValue<T> => {
	// Implementation with proper return type
};
```

### Type Guards and Assertions

**Pattern**: Use type guards for runtime type checking

```typescript
// AVOID: Using any with runtime checks
const processUserData = (data: any) => {
	if (data && data.id) {
		return { userId: data.id, userName: data.name };
	}
	throw new Error('Invalid user data');
};

// BETTER: Type guards
interface User {
	id: string;
	name: string;
}

const isUser = (data: unknown): data is User => {
	return (
		typeof data === 'object' &&
		data !== null &&
		typeof (data as User).id === 'string' &&
		typeof (data as User).name === 'string'
	);
};

const processUserData = (data: unknown) => {
	if (isUser(data)) {
		return { userId: data.id, userName: data.name }; // Type safe
	}
	throw new Error('Invalid user data');
};
```

## Testing Type Safety

### Unit Tests for Types

**Pattern**: Write tests that verify type behavior

```typescript
// Test type guards
describe('isUser type guard', () => {
	it('should correctly identify valid user objects', () => {
		const validUser = { id: '123', name: 'John' };
		expect(isUser(validUser)).toBe(true);

		// TypeScript compile-time check
		if (isUser(validUser)) {
			// This should compile without errors
			expect(validUser.id).toBe('123');
			expect(validUser.name).toBe('John');
		}
	});

	it('should reject invalid objects', () => {
		expect(isUser(null)).toBe(false);
		expect(isUser({})).toBe(false);
		expect(isUser({ id: '123' })).toBe(false); // Missing name
	});
});
```

## Common Scenarios and Solutions

### Third-Party Library Integration

**Pattern**: Create proper types for untyped libraries

```typescript
// AVOID: Using any for untyped libraries
const libraryResult = (window as any).someLibrary.doSomething();

// BETTER: Declare module types
declare global {
	interface Window {
		someLibrary: {
			doSomething(): { result: string; success: boolean };
		};
	}
}

const libraryResult = window.someLibrary.doSomething();

// BEST: Create comprehensive declarations
// types/some-library.d.ts
declare module 'some-library' {
	interface LibraryOptions {
		apiKey: string;
		timeout?: number;
	}

	interface LibraryResult {
		result: string;
		success: boolean;
	}

	export function doSomething(options: LibraryOptions): Promise<LibraryResult>;
}
```

### Legacy Code Integration

**Pattern**: Gradually improve typing in legacy codebases

```typescript
// AVOID: Keeping any types in legacy interfaces
interface LegacyConfig {
	settings: any;
	options: any;
}

// BETTER: Progressive typing improvement
interface LegacyConfig {
	settings: Record<string, unknown>; // At least constrain to object
	options: {
		// Type known properties
		enabled?: boolean;
		timeout?: number;
		// Keep unknown properties as any temporarily
		[key: string]: unknown;
	};
}

// BEST: Fully typed with backward compatibility
interface ModernConfig {
	settings: {
		theme: 'light' | 'dark';
		language: string;
		notifications: boolean;
	};
	options: {
		enabled: boolean;
		timeout: number;
		retries: number;
	};
}

// Provide migration path
type Config = LegacyConfig | ModernConfig;
```

## Systematic Removal Process

### Step-by-Step Approach

1. **Audit Current Suppressions**

   ```bash
   # Find all suppressions in codebase
   grep -r "@ts-expect-error\|@ts-ignore\|as any\|: any" src/
   ```

2. **Prioritize by Risk**
   - `as any` - Highest priority
   - `: any` - High priority
   - `@ts-ignore` - Medium priority
   - `@ts-expect-error` - Lower priority (documented)

3. **Create Proper Types**
   - Start with interfaces for object shapes
   - Add generics for reusable components
   - Use utility types for transformations
   - Implement type guards for runtime safety

4. **Test Type Safety**
   - Add unit tests for type guards
   - Verify component prop types
   - Test API response handling
   - Validate error scenarios

5. **Update Related Code**
   - Fix any new type errors revealed
   - Update tests to match new types
   - Document complex type decisions
   - Update component documentation

<LLM-Agent-Decision-Matrix>

**When encountering type suppressions**:

1. **Assess the suppression type**:
   - `as any` → Replace immediately with proper typing
   - `: any` → Define specific interface or union type
   - `@ts-ignore` → Understand error and fix root cause
   - `@ts-expect-error` → Check if error still exists

2. **Determine typing strategy**:
   - Simple object → Create interface
   - Multiple variants → Use discriminated union
   - Complex relationships → Use generics with constraints
   - Runtime checks needed → Implement type guards

3. **Implementation approach**:
   - Known shape → Direct interface definition
   - Partial knowledge → Progressive typing with utility types
   - Third-party code → Module declarations
   - Legacy integration → Backward-compatible typing

4. **Validation requirements**:
   - Add type guard tests
   - Verify component integration
   - Test error scenarios
   - Document type decisions

5. **Follow-up actions**:
   - Remove suppression
   - Fix any revealed type errors
   - Update related tests
   - Document complex types

</LLM-Agent-Decision-Matrix>

<Navigation-For-LLM-Agents>

**Prerequisites** (understand BEFORE starting):

- TypeScript fundamentals and utility types
- Component prop typing patterns
- API response structure patterns

**Dependencies** (consult DURING implementation):

- [Unit Testing](./unit-testing.md) - for testing type guards and type safety
- [Integration Testing](./integration-testing.md) - for testing typed API interactions
- Component documentation - for understanding expected prop shapes

**Validation Checkpoints** (verify AFTER implementation):

- All type suppressions removed from target files
- No new TypeScript compilation errors
- Type guards have corresponding tests
- Component props are properly typed
- API responses have complete type coverage

**Conditional Navigation**:

- IF working with GraphQL → Check schema types and generated types
- IF working with React components → Verify prop types and event handlers
- IF working with API responses → Create comprehensive response types
- IF working with third-party libraries → Create or find type declarations

</Navigation-For-LLM-Agents>
