import React, {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import LDClient, {
  LDConfig,
  LDContext,
} from "launchdarkly-react-native-client-sdk";
import { NamedFlags } from "./factory.types";

type Props = {
  children: ReactNode;
  context?: LDContext;
  config?: LDConfig;
};

/**
 * Create a file called `launchDarkly.ts` and put this in it
 *
 * ```ts
 * // launchDarkly.ts
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
  type FlagType<K extends FlagKey> = ReturnType<T[K]["type"]>;
  type FlagKey = keyof T;

  // the private singleton where we keep the launch darkly client
  let globalLdClient: LDClient | undefined;

  // a private singleton reference to a function that uses the launch darkly client
  let globalGetFeatureFlag = <K extends FlagKey>(
    key: K,
    defaultVal?: FlagType<K>
  ): Promise<FlagType<K>> =>
    Promise.resolve(
      (defaultVal ?? featureFlags[key]?.defaultVal) as FlagType<K>
    );

  /**
   * gets the global launch darkly client singleton
   */
  function getGlobalLdClient() {
    return globalLdClient;
  }

  /**
   * sets the global launch darkly client singleton
   */
  function setGlobalLdClient(ldClient: LDClient) {
    globalLdClient = ldClient;
    globalGetFeatureFlag = getGetFeatureFlag(globalLdClient);
  }

  // this function creates the getFeatureFlag() function
  const getGetFeatureFlag = (ldClient: LDClient) => async <K extends FlagKey>(
    key: K,
    defaultVal?: FlagType<K>
  ): Promise<FlagType<K>> => {
    const type = featureFlags[key]?.type as FlagType<K>;
    const defaultVal2 = defaultVal ?? featureFlags[key]?.defaultVal;
    return type === Boolean
      ? await ldClient.boolVariation(
          key as string,
          (defaultVal2 as unknown) as boolean
        )
      : type === Number
      ? await ldClient.numberVariation(
          key as string,
          (defaultVal2 as unknown) as number
        )
      : type === String
      ? await ldClient.stringVariation(
          key as string,
          (defaultVal2 as unknown) as string
        )
      : type === Object
      ? JSON.parse(await ldClient.jsonVariation(key as string, defaultVal2))
      : undefined;
  };

  /**
   * This is an escape hatch function in case you need to get feature flags outside of the React context.
   * Keep in mind, a well architected React app should not need to use this function very often.
   * If you find yourself using this a lot, consider your app's architecture. Perhaps it needs a refactor?
   * @returns a promise containing the flag value
   */
  function getFeatureFlag<K extends FlagKey>(
    key: K,
    defaultVal?: FlagType<K>
  ): Promise<FlagType<typeof key>> {
    return globalGetFeatureFlag(key, defaultVal);
  }

  const LaunchDarklyContext = createContext<{
    client: LDClient | undefined;
    flags: T | undefined;
  }>({ client: undefined, flags: undefined });

  function LaunchDarklyProvider({ children, context, config }: Props) {
    const [client, setClient] = useState<LDClient>();
    const [flags, setFlags] = useState<typeof featureFlags>();

    useEffect(() => {
      (async () => {
        if (!context || !config) return;

        const newClient = new LDClient();
        newClient.identify(context);
        newClient.configure(config, context);
        setClient(newClient);
        setGlobalLdClient(newClient);

        const destructors = Object.keys(featureFlags).map((key) => {
          const listener = async (updatedKey: string) => {
            const newFlag = await getFeatureFlag(updatedKey as FlagKey);
            setFlags(
              (oldFlags) =>
                ({
                  ...oldFlags,
                  [updatedKey]: newFlag,
                } as typeof featureFlags)
            );
          };
          // call the listener at the beginning because the launch darkly listener doesn't do this for us
          listener(key);
          // register the launch darkly flag listener
          newClient?.registerFeatureFlagListener(key, listener);
          // return the destructor
          return () => newClient?.unregisterFeatureFlagListener(key, listener);
        });

        // clean up by calling each unregister listener function created above
        return () => destructors.forEach((d) => d());
      })();
    }, [context, config]);

    return (
      <LaunchDarklyContext.Provider value={{ client, flags }}>
        {children}
      </LaunchDarklyContext.Provider>
    );
  }

  /**
   * @param key: the name of the feature flag
   * @param defaultVal: optional defaultValue override
   */
  const useFeatureFlag = <T extends FlagKey>(
    key: T,
    defaultVal?: FlagType<T>
  ) => {
    const { flags } = useContext(LaunchDarklyContext);

    return (flags?.[key] ??
      defaultVal ??
      featureFlags[key].defaultVal) as FlagType<typeof key>;
  };

  /**
   * This hook returns an object containing all of the feature flags
   */
  const useAllFeatureFlags = (): Record<
    string,
    boolean | number | string | object
  > => {
    const [flags, setFlags] = useState({});
    const { client } = useContext(LaunchDarklyContext);

    useEffect(() => {
      if (!client) return;
      const listener = async (updatedKeys: string[]) => {
        updatedKeys.forEach(async (updatedKey) => {
          const flagVal = await getFeatureFlag(updatedKey as FlagKey);
          setFlags((oldFlags) => ({
            ...oldFlags,
            [updatedKey]: flagVal,
          }));
        });
      };
      // register the launch darkly all flags listener
      client.registerAllFlagsListener("herpnerp", listener);
      // we have to make the initial call to bring in the flag values because LD doesn't do that for us.
      listener(Object.keys(featureFlags));
      return () => client?.unregisterAllFlagsListener("herpnerp");
    }, [client]);
    return flags;
  };

  return {
    LaunchDarklyProvider,
    useFeatureFlag,
    useAllFeatureFlags,
    getGlobalLdClient,
    getFeatureFlag,
  };
}
