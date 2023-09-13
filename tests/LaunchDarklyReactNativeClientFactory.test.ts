// todo, this isn't actually any kind of test, and it should be
import { LaunchDarklyReactNativeClientFactory } from '../index'

export const {
  LaunchDarklyProvider,
  useFeatureFlag,
  useAllFeatureFlags,
  getGlobalLdClient,
  getFeatureFlag,
} = LaunchDarklyReactNativeClientFactory({
  // ***************************************************************
  // ! any feature flags that your app uses, must be declared here !
  // ***************************************************************
  'example-boolean-feature-flag': { type: Boolean, defaultVal: false },
  'example-number-feature-flag': { type: Number, defaultVal: 123 },
  'example-string-feature-flag': { type: String, defaultVal: 'asdf' },
  'example-json-feature-flag': { type: Object, defaultVal: {} },
})
