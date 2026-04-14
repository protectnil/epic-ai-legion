/**
 * Ambient module shim for @xenova/transformers.
 *
 * @xenova/transformers is declared as an OPTIONAL peer dependency in
 * package.json. Consumers who want semantic-fallback domain classification
 * install it explicitly; consumers who only need keyword routing do not.
 *
 * This shim provides the minimal type surface that DomainClassifier.ts
 * uses via `await import('@xenova/transformers')`. It lets `tsc --noEmit`
 * resolve the dynamic import without requiring the package to be installed
 * during type-checking or CI.
 *
 * Precedence: when the real `@xenova/transformers` package IS installed,
 * TypeScript's standard module resolution picks up the real types from
 * node_modules and ignores this ambient declaration.
 *
 * The surface declared here is intentionally minimal — only the
 * `pipeline('feature-extraction', model)` call and the returned extractor's
 * `(text, options) => { data: Float32Array }` shape. If DomainClassifier
 * starts using additional symbols from the package, add them here.
 */

declare module '@xenova/transformers' {
  export interface FeatureExtractionOutput {
    data: Float32Array;
  }

  export interface FeatureExtractionOptions {
    pooling?: 'mean' | 'cls' | 'none';
    normalize?: boolean;
  }

  export type FeatureExtractor = (
    text: string,
    options?: FeatureExtractionOptions,
  ) => Promise<FeatureExtractionOutput>;

  export function pipeline(
    task: 'feature-extraction',
    model: string,
  ): Promise<FeatureExtractor>;
}
