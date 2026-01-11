<!-- meta:
  mode: expert
  topic: error-handling
  audience: ai-agent
  model: sonnet-4
  token_budget: medium
  priority: critical
  read_when: implementing error handling or debugging components
  depends_on: []
  last_review: 2025-09-10
-->

<Core-Packages>
- Package: `@atlassian/jira-error-boundary`
  - Purpose: Error boundary component for logging and fallback rendering
  - Key features:
    - Component-level error isolation
    - Automatic error logging via `log.safeErrorWithoutCustomerData`
    - Configurable error boundaries
  - Usage: When you need error logging without analytics or fallback UI
  - Location: `/jira/src/packages/platform/ui/error-boundary/`

- Package: `@atlassian/jira-errors-handling`
  - Purpose: Analytics reporting for error events and operational monitoring
  - Key features:
    - Error analytics middleware
    - SignalFX integration for monitoring
    - Non-boundary error reporting
  - Usage: When you want error events in analytics/monitoring systems
  - Location: `/jira/src/packages/platform/errors-handling/`

- Package: `@atlassian/jira-error-boundaries`
  - Purpose: Combined error boundary with analytics, logging, and fallback UI
  - Key features:
    - Complete error handling solution
    - Default fallback render component
    - Integrated analytics and logging
  - Usage: When you need comprehensive error handling with user feedback

- Package: `@atlassian/jira-common-util-logging`
  - Purpose: Privacy-safe logging utilities for Jira frontend applications
  - Key features:
    - `safeErrorWithoutCustomerData` - Rate-limited error logging without customer data
    - `safeInfoWithoutCustomerData` - Safe info logging
    - `safeWarnWithoutCustomerData` - Safe warning logging
  - Usage: Direct logging in services, rate-limited via feature flag
  - Location: `/jira/src/packages/platform/logging/src/log.tsx`
  - Import: `import log from '@atlassian/jira-common-util-logging/src/log.tsx';` </Core-Packages>

# Handling Errors in Jira Frontend

<Self-Reflection>
- Assume prior engineers built robust error handling patterns; understand existing boundaries before adding new ones
- Focus on following established error reporting patterns rather than inventing custom solutions
- Respect the separation between expected vs unexpected errors in the codebase
</Self-Reflection>

<Quick-Reference>
- Use `JSErrorBoundary` for comprehensive error handling (analytics + logging + fallback UI)
- Use `ReportErrors` for analytics-only error reporting (no UI fallback)
- Use `ErrorBoundary` for logging-only error handling (no analytics or UI)
- Use `fireErrorAnalytics` for expected errors

</Quick-Reference>

<Implementation-Patterns>
  <Error-Boundary-Components>
    <Requirements>
      When implementing error handling, consider these requirements:

      1. #REQ-1: Do you want to fire analytics events when a failure occurs? (if you want your events in SignalFX, the answer is yes)
      2. #REC-2: Do you want to `log.safeErrorWithoutCustomerData` your error?
      3. #REC-3: Do you want a default render fallback if an error occurs?

      The 3 majorly used components to handle these situations are:
      - `<ErrorBoundary>`
      - `<ReportErrors>`
      - `<JSErrorBoundary>` (`<ReportErrors>` component wrapped in a `<ErrorBoundary>`)
    </Requirements>

    <ErrorBoundary-Component>
      Package: `@atlassian/jira-error-boundary`
      When to use: #REC-2 (logging only)

      ```tsx
      import ErrorBoundary from '@atlassian/jira-error-boundary/src/ErrorBoundary.tsx';

      <ErrorBoundary id="theIDOfYourComponent" packageName="jiraYourPackageName" teamName="teamName">
        {/* your code goes here */}
      </ErrorBoundary>;
      ```
    </ErrorBoundary-Component>

    <ReportErrors-Component>
      Package: `@atlassian/jira-errors-handling`
      When to use: #REC-1 (analytics only)

      This element is not a boundary, but a middleware that simply catches the exception, fires an operational analytic event based on the location of the failure and throws the error again.

      ```tsx
      import ReportErrors from '@atlassian/jira-errors-handling/src/utils/reporting-error-boundary.tsx';

      <ReportErrors id="theIDOfYourComponent" packageName="jiraYourPackageName" teamName="teamName" attributes={{}}>
        {/* your code goes here */}
      </ReportErrors>;
      ```
    </ReportErrors-Component>

    <JSErrorBoundary-Component>
      Package: `@atlassian/jira-error-boundaries`
      Fits requirements: #REC-1, #REC-2 and #REC-3 (complete solution)

      It provides a default render fallback if an exception is thrown. In other words, this is a shorthand for logging, firing analytics and providing a default feedback message to the user.

      ```tsx
      import { JSErrorBoundary } from '@atlassian/jira-error-boundaries/src/ui/js-error-boundary/JSErrorBoundary.tsx';

      <JSErrorBoundary id="theIDOfYourComponent" packageName="jiraYourPackageName" teamName="teamName">
        {/* your code goes here */}
      </JSErrorBoundary>;
      ```
    </JSErrorBoundary-Component>

  </Error-Boundary-Components>

  <Expected-Failure-Handling>
    <fireErrorAnalytics>
      Use when: An error is expected

      Important: Do not send error stack trace in attributes, those attributes are for analytics-related values. Use the "error" explicit attribute only. Sending huge payloads like error stacktrace to analytics pipeline might result in blocking your event completely from the platform side.

      ```tsx
      import fireErrorAnalytics from '@atlassian/jira-errors-handling/src/utils/fire-error-analytics.tsx';
      import { isBackendAPIError, performGetRequest } from '@atlassian/jira-fetch/src/index.tsx';

      const fetchData = useCallback(async () => {
        try {
          return performGetRequest<ReturnType[]>(
            `/endpoint`,
          );
        } catch (e: unknown) {
          const errorFormatted = e instanceof Error ? e : new Error(String(e));
          fireErrorAnalytics({
            meta: {
              id: 'SERVICES_ERROR_ID',
              packageName: 'jiraYourPackageName',
              teamName: 'yourTeamName',
            },
            attributes: {
              serviceName: 'fetchData',
              skipSentry: isBackendAPIError(e), // if it's a backend error it should be monitored there
            },
            error: errorFormatted,
          });
          setError("A user friendly error");
          return [];
        } finally {
          setIsLoading(false);
        }
      }, []);
      ```
    </fireErrorAnalytics>

  </Expected-Failure-Handling>
</Implementation-Patterns>

<Navigation-For-LLM-Agents>
Prerequisites (read BEFORE starting):
- [State Management](./state-management.md) - for error state handling and data flow decisions
- [Component Design](../implementation/component-design.md) - for error boundary placement strategies

Workflow Dependencies (consult DURING implementation):

- [Unit Testing](../implementation/unit-testing.md) - for error scenario testing and mocking
- [Feature Gates](../implementation/feature-gates.md) - when gating error handling changes
- [Forms](../implementation/forms.md) - when handling form validation errors

Validation Checkpoints (verify AFTER implementation):

- Error boundaries catch and log appropriately without exposing sensitive data
- No PII leakage in error logs (sanitized messages only)
- User-facing error messages are actionable and generic
- Analytics events fire correctly for expected errors
- Test coverage includes error scenarios and boundary behavior

Conditional Navigation:

- IF implementing new error boundaries → [Component Design](../implementation/component-design.md)
- IF handling form errors → [Forms](../implementation/forms.md)
- IF adding error analytics → verify with team's analytics requirements
- IF testing error flows → [Unit Testing](../implementation/unit-testing.md)
  </Navigation-For-LLM-Agents>
