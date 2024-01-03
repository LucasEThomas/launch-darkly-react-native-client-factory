import React, {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react'

import LDClient, {
  LDConfig,
  LDContext,
} from 'launchdarkly-react-native-client-sdk'
import { NamedFlags } from './factory.types'

type Props = {
  children: ReactNode
  context?: LDContext
  config?: LDConfig
}

/**
 * Create a file called `LaunchDarkly.ts` and put this in it
 *
 * ```ts
 * // LaunchDarkly.ts
 * import { LaunchDarklyReactNativeFactory } from "launch-darly-react-native-client-factory";
 *
 * export const {
 *   LaunchDarklyProvider,
 *   useFeatureFlag,
 *   useAllFeatureFlags,
 *   getGlobalLdClient,
 *   getFeatureFlag,
 * } = LaunchDarklyReactNativeFactory({
 *   // ***************************************************************
 *   // ! any feature flags that your app uses, must be declared here !
 *   // ***************************************************************
 *   "example-boolean-feature-flag": { type: Boolean, defaultVal: false },
 *   "example-number-feature-flag": { type: Number, defaultVal: 123 },
 *   "example-string-feature-flag": { type: String, defaultVal: "asdf" },
 *   "example-json-feature-flag": { type: Object, defaultVal: {} },
 * });
 * ```
 */
export function LaunchDarklyReactNativeClientFactory<T extends NamedFlags>(
  featureFlags: T
) {
  // dynamic types
  type FlagType<K extends FlagKey> = ReturnType<T[K]['type']>
  type FlagKey = keyof T

  let globalLdClient: LDClient | undefined
  /**
   * get the global launch darkly client singleton
   */
  const getGlobalLdClient = () => globalLdClient
  /**
   * set the global launch darkly client singleton
   */
  const setGlobalLdClient = (ldClient: LDClient) => (globalLdClient = ldClient)

  /**
   * This is an escape hatch function in case you need to get feature flags outside of the React context.
   * Keep in mind, a well architected React app should not need to use this function very often.
   * If you find yourself using this a lot, consider your app's architecture. Perhaps it needs a refactor?
   * @returns a promise containing the flag value
   */
  const getFeatureFlagAsync = async <K extends FlagKey>(
    key: K,
    defaultVal?: FlagType<K>
  ): Promise<FlagType<typeof key>> => {
    if (typeof key !== 'string') throw 'non string key passed to getFeatureFlag'
    if (!featureFlags[key]) throw 'unregistered key passed to getFeatureFlag'

    const ldClient = getGlobalLdClient()
    if (!ldClient) {
      console.log('getFeatureFlag called before ldClient initialized')
      return defaultVal ?? featureFlags[key]?.defaultVal
    }

    const type = featureFlags[key].type as FlagType<K>
    const _defaultVal = defaultVal ?? featureFlags[key].defaultVal
    if (type === Boolean) {
      return (await ldClient.boolVariation(key, _defaultVal)) as FlagType<K>
    } else if (type === Number) {
      return (await ldClient.numberVariation(key, _defaultVal)) as FlagType<K>
    } else if (type === String) {
      return (await ldClient.stringVariation(key, _defaultVal)) as FlagType<K>
    } else if (type === Object) {
      return (await ldClient.jsonVariation(key, _defaultVal)) as FlagType<K>
    } else {
      throw 'invalid type passed to getFeatureFlag: ' + type
    }
  }

  const LaunchDarklyContext = createContext<{
    client: LDClient | 'loading...' | undefined
    flags: T | undefined
  }>({ client: undefined, flags: undefined })

  let escapeHatchFlags: T | undefined
  const getFeatureFlagEscapeHatch = <K extends FlagKey>(
    key: K,
    defaultVal?: FlagType<K>
  ): FlagType<typeof key> => {
    return escapeHatchFlags?.[key] || defaultVal || featureFlags[key].defaultVal
  }

  const LaunchDarklyProvider = ({ children, context, config }: Props) => {
    const [client, setClient] = useState<LDClient | 'loading...'>()
    const [flags, setFlags] = useState<T>()

    useEffect(() => {
      if (!context || !config) return
      // todo: only the first context and config passed in (that are not undefined) will create a new LDClient.
      // todo: This may confuse devs who might expect the LDClient to get destroyed and recreated whenever context is changed.
      if (getGlobalLdClient() || client) return
      setClient('loading...')
      ;(async () => {
        const newClient = new LDClient()
        await newClient.identify(context)
        await newClient.configure(config, context)
        setClient(newClient)
        setGlobalLdClient(newClient)
      })()
    }, [context, config])

    useEffect(() => {
      escapeHatchFlags = flags
    }, [flags])

    useEffect(() => {
      if (!client || client === 'loading...') return

      const destructors = Object.keys(featureFlags).map((key) => {
        const listener = async (updatedKey: string) => {
          const newFlag = await getFeatureFlagAsync(updatedKey as FlagKey)
          setFlags(
            (oldFlags) =>
              ({
                ...oldFlags,
                [updatedKey]: newFlag,
              } as T)
          )
        }
        // call the listener at the beginning because the launch darkly listener doesn't do this for us
        listener(key)
        // register the launch darkly flag listener
        client.registerFeatureFlagListener(key, listener)
        // return the destructor
        return () => client.unregisterFeatureFlagListener(key, listener)
      })

      // clean up by calling each unregister listener function created above
      return () => destructors.forEach((d) => d())
    }, [client])

    return (
      <LaunchDarklyContext.Provider value={{ client, flags }}>
        {children}
      </LaunchDarklyContext.Provider>
    )
  }

  /**
   * @param key: the name of the feature flag
   * @param defaultVal: optional defaultValue override
   */
  const useFeatureFlag = <T extends FlagKey>(
    key: T,
    defaultVal?: FlagType<T>
  ) => {
    const { flags } = useContext(LaunchDarklyContext)

    return (flags?.[key] ??
      defaultVal ??
      featureFlags[key].defaultVal) as FlagType<typeof key>
  }

  /**
   * This hook returns an object containing all of the feature flags
   */
  const useAllFeatureFlags = (): Record<
    string,
    boolean | number | string | object
  > => {
    const [flags, setFlags] = useState({})
    const { client } = useContext(LaunchDarklyContext)

    useEffect(() => {
      if (!client || client === 'loading...') return
      const listener = (updatedKeys: string[]) => {
        updatedKeys.forEach(async (updatedKey) => {
          const flagVal = await getFeatureFlagAsync(updatedKey as FlagKey)
          setFlags((oldFlags) => ({
            ...oldFlags,
            [updatedKey]: flagVal,
          }))
        })
      }
      // register the launch darkly all flags listener
      const uniqueId = Date.now().toString()
      client.registerAllFlagsListener(uniqueId, listener)
      // we have to make the initial call to bring in the flag values because LD doesn't do that for us.
      listener(Object.keys(featureFlags))
      return () => client.unregisterAllFlagsListener(uniqueId)
    }, [client])
    return flags
  }

  return {
    LaunchDarklyContext,
    LaunchDarklyProvider,
    useFeatureFlag,
    useAllFeatureFlags,
    getGlobalLdClient,
    getFeatureFlagAsync,
    getFeatureFlag: getFeatureFlagEscapeHatch,
  }
}
