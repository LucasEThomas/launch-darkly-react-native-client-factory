# Launch Darkly React Native Client Factory

This is an ergonomic wrapper around the `launchdarkly-react-native-client` sdk package.

It makes using launch darkly feature flags in your React Native components this easy:

```tsx
const MyComponent = () => {
  const myFF = useFeatureFlag('my-feature-flag')
  //...
}
```

The feature flags returned by this hook are strongly typed (if you're using typescript), and update and rerender your component dynamically.

# installation

This package assumes that it will be used in a **React Native** application.

If you don't already have it, you will need the the launchdarkly-react-native-client sdk

```sh
npm i launchdarkly-react-native-client
```

and, of course

```sh
npm i launch-darkly-react-native-client-factory
```

# usage

This factory will create a context provider, hooks and some escape hatch functions that you will need to re-export for use in your application.

Create a file called `LaunchDarkly.ts` and put this in it

```ts
// LaunchDarkly.ts
import { LaunchDarklyReactNativeFactory } from 'launch-darly-react-native-client-factory'

export const {
  LaunchDarklyProvider,
  useFeatureFlag,
  useAllFeatureFlags,
  getGlobalLdClient,
  getFeatureFlag,
} = LaunchDarklyReactNativeClientFactory({
  // **************************************************************
  // ! any feature flags that your app uses must be declared here !
  // ***************************************************************
  'example-boolean-feature-flag': { type: Boolean, defaultVal: false },
  'example-number-feature-flag': { type: Number, defaultVal: 123 },
  'example-string-feature-flag': { type: String, defaultVal: 'asdf' },
  'example-json-feature-flag': { type: Object, defaultVal: {} },
})

// Note: You may also define context and config asynchronously via hooks with their initial value as undefined.
// If you do this then the launch darkly client won't be initialized until context and config are.
// Your app will render with all feature flags set to their defaults until everything is ready to go.
export const context = {
  // learn how to create your launch darkly context and config here
  // https://docs.launchdarkly.com/sdk/client-side/react/react-native
}
export const config = {
  // learn how to create your launch darkly context and config here
  // https://docs.launchdarkly.com/sdk/client-side/react/react-native
}
```

You will need to add the provider to your app.tsx like this:

```tsx
// App.tsx
import React from 'react';
import { LaunchDarklyProvider, context, config } from './LaunchDarkly';

export const app () => {
  return (
    <LaunchDarklyProvider context={context} config={config}>
      <TheRestOfYourAppGoesHere />
    </LaunchDarklyProvider>
  );
}
```

now, in your react native component, use it like this:

```tsx
// ExampleComponent.tsx
import React from 'react'
import { useFeatureFlag } from './LaunchDarkly'
import { Text } from 'react-native'

export const ExampleComponent = () => {
  const darklyText = useFeatureFlag('example-string-feature-flag')
  const enableFancyFeature = useFeatureFlag('example-boolean-feature-flag')
  return (
    <>
      <Text>Example component</Text>
      <Text>{DarklyText}</Text>
      {enableFancyFeature && <Text>Fancy Feature Enabled!</Text>}
    </>
  )
}
```

This library has a few other features (such as overriding a flag's default value). You will find it (mostly) documented in the jsdocs comments in the codebase.
