<!-- meta:
  mode: pair
  topic: forms
  audience: ai-agent
  model: sonnet-4
  token_budget: medium
  priority: critical
  read_when: building forms
  depends_on: []
  last_review: 2025-09-02
-->

<Core-Packages>
- Package: `@atlaskit/form`
  - Purpose: Provides the canonical form state management, validation, and submission patterns for
    Jira frontend
  - Key features:
    - Declarative form state and validation
    - Accessibility compliance by default
    - Integration with Atlaskit UI primitives
    - Powered by `final-form` under the hood
  - Location: `/jira/src/packages/platform/atlaskit/form/`
  - Usage: All new and existing forms in Jira frontend
</Core-Packages>

<Quick-Reference>
- **Import all form components from `@atlaskit/form`** – single entry point for form state,
  validation, and submission
- **Always use provided Field, Form, and Section components** – never roll your own form primitives
- **Handle form submission via the `onSubmit` prop**
- **Use `useFormState` for advanced state tracking**
- **Validate fields with the `validate` prop** – support for async validation
- **Ensure accessibility by default** – do not override built-in a11y patterns
</Quick-Reference>

# Rules for Building Forms

- Use Atlaskit Forms library imported from `@atlaskit/form` which defines patterns for state
  management, form submission and Validation.
- `@atlaskit/form` implementation is powered by `final-form`, some API maybe surfaced in
  `@atlaskit/form`. For example `FormState` structure.
- Form layout and structure should be composed by provided components from the `@atlaskit/form`
  package.
- Always be compliant with Accessibility Standards achieved by usage of Atlaskit Forms.
- Form submission must be handled in the `onSubmit` prop of the component.
  `import Form from '@atlaskit/form'`.

Here is an example of a basic Form build with Atlaskit Forms.

```jsx
import React from 'react';
import ButtonGroup from '@atlaskit/button/button-group';
import Button from '@atlaskit/button/new';
import { Checkbox } from '@atlaskit/checkbox';
import Form, {
	CheckboxField,
	ErrorMessage,
	Field,
	FormFooter,
	FormHeader,
	FormSection,
	HelperMessage,
	MessageWrapper,
	RequiredAsterisk,
	ValidMessage,
} from '@atlaskit/form';
import TextField from '@atlaskit/textfield';

export const AtlaskitFormExample = () => (
	<Box>
		<Form<{ username: string; password: string; remember: boolean }>
			onSubmit={(data) => {
				doSubmit(data);
			}}
		>
			{({ formProps, submitting }) => (
				<form {...formProps}>
					<FormHeader title="Sign in">
						<p aria-hidden="true">
							Required fields are marked with an asterisk <RequiredAsterisk />
						</p>
					</FormHeader>
					<FormSection>
						<Field
							name="username"
							label="Username"
							isRequired
							defaultValue="dst12"
						>
							{({ fieldProps, error }) => (
								<>
									<TextField autoComplete="off" {...fieldProps} />
									<MessageWrapper>
										{!error && (
											<HelperMessage>You can use letters, numbers, and periods</HelperMessage>
										)}
										{error && (
											<ErrorMessage>This username is already in use, try another one</ErrorMessage>
										)}
									</MessageWrapper>
								</>
							)}
						</Field>
						<Field
							name="password"
							label="Password"
							defaultValue=""
							isRequired
							validate={(value) => (value && value.length < 8 ? 'TOO_SHORT' : undefined)}
						>
							{({ fieldProps, error, valid, meta }) => {
								return (
									<>
										<TextField type="password" {...fieldProps} />
										<MessageWrapper>
											{error && !valid && (
												<HelperMessage>
													Use 8 or more characters with a mix of letters, numbers, and symbols
												</HelperMessage>
											)}
											{error && (
												<ErrorMessage>Password needs to be more than 8 characters</ErrorMessage>
											)}
											{valid && meta.dirty ? <ValidMessage>Awesome password!</ValidMessage> : null}
										</MessageWrapper>
									</>
								);
							}}
						</Field>
						<CheckboxField name="remember" defaultIsChecked>
							{({ fieldProps }) => (
								<Checkbox {...fieldProps} label="Always sign in on this device" />
							)}
						</CheckboxField>
					</FormSection>

					<FormFooter>
						<ButtonGroup label="Form submit options">
							<Button appearance="subtle">Cancel</Button>
							<Button type="submit" appearance="primary" isLoading={submitting}>
								Sign up
							</Button>
						</ButtonGroup>
					</FormFooter>
				</form>
			)}
		</Form>
	</Box>
);
```

## Form State Management

- Form values and state management must be handled using.
  `import { useFormState } from '@atlaskit/form';`. This state is updated via the `Field` components
  , `fieldProps.onChange`.
- Any intercepting or custom handling of `onChange` must ensure that `Field` components are notified
  of the changes by calling `fieldProps.onChange`. Create a custom handler using `useCallback` and
  pass it through the props to avoid newly created functions every render.

For example

```jsx
<Field<Value<Option>>
	name="color"
	label="Select color"
	defaultValue={{ label: 'Blue', value: 'blue' }}
>
	{({ fieldProps: { onChange, ...rest }, error }) => (
		<Select<Option>
			{...rest}
			onChange={(...args: Parameters<typeof onChange>) => {
				fireUIAnalytics(createAnalyticsEvent({ action: 'changed', actionSubject: 'color' }));
				onChange?.(...args);
			}}
		/>
	)}
</Field>
```

- `useFormState` can be configured to derive information from the form.

```jsx
const formState = useFormState({
	pristine: true,
	dirty: true,
	dirtyFields: true,
	values: true,
	error: true,
	errors: true,
	validating: true,
	valid: true,
	invalid: true,
	touched: true,
	visited: true,
	initialValues: true,
});
```

- Enabling the corresponding options will reveal more information in the `formState` such as
  `dirtyFields: true` will enable `formState.dirtyFields` with a list of fields that are dirty.

## Validation

- Field level validation is handled by the `validate` prop in the `Field` component.
- The `validate` can be asynchronous.
- Returning undefined or not returning denotes the field value is valid.

For example,

```jsx
const validateUserName = useCallback(async ({ value }) => {
	if (!value) return REQUIRED_ERROR_CODE;
	if (value === NOT_ALLOWED_VALUE) return NOT_ALLOWED_ERROR_CODE;
	const isAvailable = await checkUserNameAvailable(value);
	if (isAvailable) return UNAVAILABLE_ERROR_CODE;
}, []);

<Field name="username" label="username" isRequired validate={validateUserName}>
	{({ fieldProps: { id, ...rest }, error }) => {
		return (
			<Fragment>
				<TextField
					{...rest}
					aria-describedby={fieldHasError ? `${id}${messageId}` : undefined}
					isInvalid={fieldHasError}
					onBlur={handleBlurEvent}
				/>
				<MessageWrapper>
					{!fieldHasError && error === NOT_ALLOWED_ERROR_CODE && (
						<ValidMessage>{formatMessage(messages.valueIsNotAllowed)}</ValidMessage>
					)}
					{fieldHasError && error === REQUIRED_ERROR_CODE && (
						<ErrorMessage>{formatMessage(messages.required)}}</ErrorMessage>
					)}
				</MessageWrapper>
			</Fragment>
		);
	}}
</Field>;
```

- For submission errors, the `onSubmit` handler should return an object. For example, if there's a
  problem with the password field, the object should contain the key and the error as the value. If
  the submission succeeds, the `onSubmit` handler should return undefined. The `onSubmit` handler
  can return synchronously or return a promise that resolves to the result. Note that the promise
  should resolve with the error, rather than reject with the error.

Example,

```jsx
// Mock creating user method for example purposes
const createUser = async (data: { username: string, email: string }) => {
  await sleep(500);

  const errors = {
    username: EXISTING_USERNAMES.includes(data.username)
      ? "This username is already taken, try entering a different username"
      : undefined,
    email: !data.email.includes("@")
      ? "Enter your email in a valid format, like: name@example.com"
      : undefined,
  };

  return errors;
};

const ExampleSubmissionError = () => {
  const handleSubmit = useCallback((data) => createUser(data), []);

  return (
    <Form onSubmit={this.handleSubmit}>
      {({ formProps, submitting }) => (
        <form noValidate {...formProps}>
          <Field
            name="username"
            label="Username"
            defaultValue=""
            isRequired
          >
            {({ fieldProps, error }) => (
              <Fragment>
                <TextField {...fieldProps} />
                <MessageWrapper>
                  {error && (
                    <ErrorMessage testId="userSubmissionError">
                      {error}
                    </ErrorMessage>
                  )}
                </MessageWrapper>
              </Fragment>
            )}
          </Field>
          <FormFooter>
            <Button appearance="primary" type="submit" isLoading={submitting}>
              Create account
            </Button>
          </FormFooter>
        </form>
      )}
    </Form>
  );
};

```
