<!-- meta:
  topic: data resource hooks
  audience: ai-agent
  model: sonnet-4
  token_budget: medium
  priority: critical
  read_when: creating data resource hooks
  depends_on: []
-->

<Core-Packages>
- Package: `react`
	- Purpose: React is a library for building user interfaces.
	- Key features:
		- `useState`: React Hook for managing state.
		- `useEffect`: React Hook for managing side effects.
		- `useRef`: React Hook for managing references.
		- `useCallback`: React Hook for managing callbacks.
		- `useMemo`: React Hook for managing memoized values.
	- Usage: All new react hooks creation for Jira frontend applications.

- Package: `@atlassian/jira-fetch`
  - Purpose: Jira Fetch is a library for making HTTP requests to the Jira API.
  - Location: `src/packages/platform/fetch/`
  - Key features:
    - `performGetRequest`: A global function for making HTTP requests.
    - `performPostRequest`: A global function for making HTTP requests.
    - `performPutRequest`: A global function for making HTTP requests.
    - `performDeleteRequest`: A global function for making HTTP requests.
    - `performPatchRequest`: A global function for making HTTP requests.
    - `fetchJson`: A global function for making HTTP requests. Fetches from the given URL, returning
      the json response. If there are any HTTP errors the promise is rejected with a FetchError.
  - Usage: For making HTTP requests in Jira frontend.

- Package: `@atlassian/jira-errors-handling/src/utils/fire-error-analytics.tsx`
  - Purpose: Jira Errors Handling is a library for handling errors in Jira frontend applications.
  - Location: `src/packages/platform/utils/errors-handling/src/utils/fire-error-analytics.tsx`
  - Key features:
    - `fireErrorAnalytics`: A global function for firing error analytics.
  - Usage: For firing error analytics in Jira frontend.

<Quick-Reference>

# Data hooks rules

- Hooks should use async await when making HTTP requests instead of promise notation
- Execution of code should live inside of try catch blocks
- Hooks should manage and return the 3 states and a function to execute the request:
  - Data state - response data from the HTTP request
  - Error state - error caught in the catch block
  - Loading state - boolean value set to true when the HTTP request promise has not yet resolved,
    and false when the HTTP request has not yet been made, or when the HTTP request promise has been
    resolved, or when the HTTP request promise has rejected with an error.
  - Request - async function where the try catch will live.
    - This async function may or may not take a payload to pass through to the request body and
      headers.
    - This async function should be wrapped in a useCallback, and will initially set loading state
      to true when called, and set the error to undefined.
    - This async request function will try to await the HTTP request using the relevant
      `@atlassian/jira-fetch` function, and upon successfully resolving, it will set the resolved
      data to the data state, as well as returning the data.
    - When an error is caught, the caught error should be set to state, and the loading state will
      be set to false. Error analytics should be fired using fireErrorAnalytics by passing in an
      object with `meta` and `error` properties.
- Write a unit test to cover all code paths of the hook using instructions outlined in the
  unit-testing.md, and create the unit tests in a test.tsx file in the same directory as the hook.
  (see [unit testing instructions](../../../common/unit-testing.md))

```tsx
import { useState } from 'react';
import { performPostRequest } from '@atlassian/jira-fetch/src/utils/requests.tsx';
import { APP_NAME, PACKAGE_NAME, TEAM_NAME } from '../common/constants.tsx';

type DataShape = {
	// Expected data shape
};

type Payload = {
	// Expected payload shape
};

type Response = {
	// Expected response shape
};

export const post = (payload: Payload): Promise<Response> => {
	const url = ''; // Request URL goes here
	const options = {
		body: JSON.stringify(payload),
	};
	return performPostRequest(url, options);
};

export const useResource = () => {
	const [data, setData] = useState<DataShape>();
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<Error | undefined>();

	const request = useCallback(async (payload: Payload) => {
		setLoading(true);
		try {
			const result = await post(payload);
			setLoading(false);
			setData(result);
			return result;
		} catch (error) {
			setLoading(false);
			if (error instanceof Error) {
				setError(error);
				fireErrorAnalytics({
					meta: {
						id: `${APP_NAME}.${USE_RESOURCE_NAME}.error`,
						packageName: PACKAGE_NAME,
						teamName: TEAM_NAME,
					},
					error,
				});
			}
		}
	}, []); // Add to dependency array as needed

	return {
		request,
		data,
		error,
		loading,
	};
};
```
