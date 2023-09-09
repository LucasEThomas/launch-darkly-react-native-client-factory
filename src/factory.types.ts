// using js contructors as the type enum so that we can use ReturnType<T> on them and make the feature flags strongly typed
type PrimitiveConstructor =
  | BooleanConstructor
  | NumberConstructor
  | StringConstructor
  | ObjectConstructor;

type FeatureFlag<T extends PrimitiveConstructor> = {
  type: T;
  defaultVal: ReturnType<T>;
};

type AnyFeatureFlag =
  | FeatureFlag<BooleanConstructor>
  | FeatureFlag<NumberConstructor>
  | FeatureFlag<StringConstructor>
  | FeatureFlag<ObjectConstructor>;

export type NamedFlags = Record<string, AnyFeatureFlag>;
