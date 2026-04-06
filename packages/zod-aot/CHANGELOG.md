# Changelog

## [0.18.1](https://github.com/wakita181009/zod-aot/compare/v0.18.0...v0.18.1) (2026-04-06)


### Bug Fixes

* replace .every() closures with preamble for-loop helpers in Fast Path codegen ([#122](https://github.com/wakita181009/zod-aot/issues/122)) ([ac56fdf](https://github.com/wakita181009/zod-aot/commit/ac56fdf8ca8230f7615d0dc4d99fba086baa1b1c))

## [0.18.0](https://github.com/wakita181009/zod-aot/compare/v0.17.3...v0.18.0) (2026-04-06)


### Features

* expand Fast Path eligibility to date, set, map, and refine_effect ([#120](https://github.com/wakita181009/zod-aot/issues/120)) ([dc14190](https://github.com/wakita181009/zod-aot/commit/dc14190698a1a2da7a10d994a4beff5aafdb077f))

## [0.17.3](https://github.com/wakita181009/zod-aot/compare/v0.17.2...v0.17.3) (2026-04-06)


### Bug Fixes

* deduplicate regex preambles and skip redundant NaN/isFinite guards for integer formats ([#115](https://github.com/wakita181009/zod-aot/issues/115)) ([c4cb9c2](https://github.com/wakita181009/zod-aot/commit/c4cb9c239d859ccacb58ec2e46771cb59b830c45))

## [0.17.2](https://github.com/wakita181009/zod-aot/compare/v0.17.1...v0.17.2) (2026-04-03)


### Bug Fixes

* improve V8 JIT performance for generated validators ([#112](https://github.com/wakita181009/zod-aot/issues/112)) ([fdb3b71](https://github.com/wakita181009/zod-aot/commit/fdb3b71e8802d639aca602f15d6196ec7b6ed726))

## [0.17.1](https://github.com/wakita181009/zod-aot/compare/v0.17.0...v0.17.1) (2026-04-02)


### Bug Fixes

* add try/catch to coerce codegen for number, string, and date ([#110](https://github.com/wakita181009/zod-aot/issues/110)) ([61ab4af](https://github.com/wakita181009/zod-aot/commit/61ab4af49d6f26b5134818a9a1d4ca7b591c7aca))

## [0.17.0](https://github.com/wakita181009/zod-aot/compare/v0.16.3...v0.17.0) (2026-04-02)


### ⚠ BREAKING CHANGES

* `JSON.stringify(result.error)` output changes because ZodError marks `issues` as non-enumerable. Use `error.issues` directly instead of serializing the error object. This matches Zod's own behavior.

### Features

* return real ZodError from generated validators ([#108](https://github.com/wakita181009/zod-aot/issues/108)) ([f1eb4bf](https://github.com/wakita181009/zod-aot/commit/f1eb4bf14b7c411e559d1d27e1545a1f2a79d79c))

## [0.16.3](https://github.com/wakita181009/zod-aot/compare/v0.16.2...v0.16.3) (2026-04-02)


### Bug Fixes

* deduplicate unplugin transform for webpack multi-layer builds ([#105](https://github.com/wakita181009/zod-aot/issues/105)) ([9e4f295](https://github.com/wakita181009/zod-aot/commit/9e4f2958fd8ed75bde7f540362581e9ef793759f))

## [0.16.2](https://github.com/wakita181009/zod-aot/compare/v0.16.1...v0.16.2) (2026-04-02)


### Bug Fixes

* add try/finally to dispatch() visiting cleanup and remove hardcoded registry count ([7046fb1](https://github.com/wakita181009/zod-aot/commit/7046fb1d64c80afa0d342d05c0bb56e92b08b199))

## [0.16.1](https://github.com/wakita181009/zod-aot/compare/v0.16.0...v0.16.1) (2026-04-02)


### Bug Fixes

* add missing fallback case to hasMutation() check ([#102](https://github.com/wakita181009/zod-aot/issues/102)) ([69eefab](https://github.com/wakita181009/zod-aot/commit/69eefab7bcc7ca666461f8f3d56fc341230cee6d))

## [0.16.0](https://github.com/wakita181009/zod-aot/compare/v0.15.2...v0.16.0) (2026-04-02)


### Features

* compile zero-capture refine/transform effects and separate input/output in codegen ([#95](https://github.com/wakita181009/zod-aot/issues/95)) ([b202c98](https://github.com/wakita181009/zod-aot/commit/b202c98bc62d5cb553830d787c659f655dc3328c))

## [0.15.2](https://github.com/wakita181009/zod-aot/compare/v0.15.1...v0.15.2) (2026-04-02)


### Bug Fixes

* use glob matching for unplugin include/exclude options ([ac25982](https://github.com/wakita181009/zod-aot/commit/ac25982ead021ae71a85c519bc265a58642b12ef))

## [0.15.1](https://github.com/wakita181009/zod-aot/compare/v0.15.0...v0.15.1) (2026-04-01)


### Bug Fixes

* prevent input mutation in generated validators with coerce/default/catch ([2f0dd30](https://github.com/wakita181009/zod-aot/commit/2f0dd30ce00fe0d65606a71101028df250154414))

## [0.15.0](https://github.com/wakita181009/zod-aot/compare/v0.14.1...v0.15.0) (2026-03-30)


### Features

* support tsconfig path aliases and JSX in loader ([#91](https://github.com/wakita181009/zod-aot/issues/91)) ([3ecbc77](https://github.com/wakita181009/zod-aot/commit/3ecbc778e475c19b36b739db494e83c9ea65c0aa))

## [0.14.1](https://github.com/wakita181009/zod-aot/compare/v0.14.0...v0.14.1) (2026-03-29)


### Bug Fixes

* gracefully skip unloadable files in autoDiscover mode ([ac3861f](https://github.com/wakita181009/zod-aot/commit/ac3861fb38665b3b9d878a5821ef706426a67ade))

## [0.14.0](https://github.com/wakita181009/zod-aot/compare/v0.13.0...v0.14.0) (2026-03-29)


### Features

* add autoDiscover mode for zero-config Zod schema optimization ([#85](https://github.com/wakita181009/zod-aot/issues/85)) ([feab439](https://github.com/wakita181009/zod-aot/commit/feab439da6e7c517521a93764d92d5833edc2348))

## [0.13.0](https://github.com/wakita181009/zod-aot/compare/v0.12.0...v0.13.0) (2026-03-29)


### Features

* **check:** diagnostic tree view with coverage gates and JSON output ([#82](https://github.com/wakita181009/zod-aot/issues/82)) ([2acad95](https://github.com/wakita181009/zod-aot/commit/2acad9547d6aa67d5401aeb4a71da809e2909ee7))

## [0.12.0](https://github.com/wakita181009/zod-aot/compare/v0.11.0...v0.12.0) (2026-03-28)


### Features

* add two-phase validation with Fast Path boolean expression chain ([#79](https://github.com/wakita181009/zod-aot/issues/79)) ([f20c1dc](https://github.com/wakita181009/zod-aot/commit/f20c1dcc880b1e76092d03a22e3950c1f3a2b722))

## [0.11.0](https://github.com/wakita181009/zod-aot/compare/v0.10.0...v0.11.0) (2026-03-28)


### Features

* add template literal, catch, and coerce schema compilation ([#76](https://github.com/wakita181009/zod-aot/issues/76)) ([d9b0b4b](https://github.com/wakita181009/zod-aot/commit/d9b0b4bfbf47d42e13e7ace5a84b6bfab37b39e5))

## [0.10.0](https://github.com/wakita181009/zod-aot/compare/v0.9.2...v0.10.0) (2026-03-28)


### Features

* add int32, uint32, float32, float64 number format validation ([#74](https://github.com/wakita181009/zod-aot/issues/74)) ([45a4d72](https://github.com/wakita181009/zod-aot/commit/45a4d72dbb5621d4fd8b52201df24ab5460c8103))

## [0.9.2](https://github.com/wakita181009/zod-aot/compare/v0.9.1...v0.9.2) (2026-03-28)


### Bug Fixes

* replace tsx with jiti for reliable TypeScript loading on Node 24 ([#72](https://github.com/wakita181009/zod-aot/issues/72)) ([191f782](https://github.com/wakita181009/zod-aot/commit/191f78287e8a5cea31b6cfde7951b15baaa98533))

## [0.9.1](https://github.com/wakita181009/zod-aot/compare/v0.9.0...v0.9.1) (2026-03-27)


### Bug Fixes

* resolve #src/* type declarations to dist/ instead of unpublished src/ ([0d92d81](https://github.com/wakita181009/zod-aot/commit/0d92d81f3d19c0533e6872bd167f85bf856cbb0c)), closes [#68](https://github.com/wakita181009/zod-aot/issues/68)

## [0.9.0](https://github.com/wakita181009/zod-aot/compare/v0.8.0...v0.9.0) (2026-03-24)


### Features

* add support for symbol, void, nan, and never types ([#65](https://github.com/wakita181009/zod-aot/issues/65)) ([c803f88](https://github.com/wakita181009/zod-aot/commit/c803f8857fb24ef57a9af89152eaed4fdda7693e))

## [0.8.0](https://github.com/wakita181009/zod-aot/compare/v0.7.3...v0.8.0) (2026-03-24)


### Features

* add rspack support via unplugin ([#63](https://github.com/wakita181009/zod-aot/issues/63)) ([cbc2273](https://github.com/wakita181009/zod-aot/commit/cbc22738beaf94637faa08a1cc5d90f81a23840e))

## [0.7.3](https://github.com/wakita181009/zod-aot/compare/v0.7.2...v0.7.3) (2026-03-23)


### Bug Fixes

* use native type stripping on Node.js 22+ instead of tsx ([#58](https://github.com/wakita181009/zod-aot/issues/58)) ([5fbb87d](https://github.com/wakita181009/zod-aot/commit/5fbb87df74c9585c9f031d3aa322d170a27431ff)), closes [#54](https://github.com/wakita181009/zod-aot/issues/54)

## [0.7.2](https://github.com/wakita181009/zod-aot/compare/v0.7.1...v0.7.2) (2026-03-23)


### Bug Fixes

* wrap record key errors in invalid_key issue to match Zod behavior ([#55](https://github.com/wakita181009/zod-aot/issues/55)) ([ba8e9e6](https://github.com/wakita181009/zod-aot/commit/ba8e9e603b6d45f764236f3db85e75ae9add4c79))

## [0.7.1](https://github.com/wakita181009/zod-aot/compare/v0.7.0...v0.7.1) (2026-03-22)


### Chore

* update docs to remove 'is()' method references ([d14af20](https://github.com/wakita181009/zod-aot/commit/d14af2077b31779fcf865fa5589f6a667f6b3bcf))

## [0.7.0](https://github.com/wakita181009/zod-aot/compare/v0.6.0...v0.7.0) (2026-03-22)


### ⚠ BREAKING CHANGES

* `CompiledSchema.is()` has been removed. Use the underlying Zod schema's `is()` method instead.

### Features

* remove `is()` method from CompiledSchema ([#51](https://github.com/wakita181009/zod-aot/issues/51)) ([898ee5a](https://github.com/wakita181009/zod-aot/commit/898ee5a0cc5a5ba205ed4cd05ab44ed57462afc4))

## [0.6.0](https://github.com/wakita181009/zod-aot/compare/v0.5.1...v0.6.0) (2026-03-19)


### Features

* add Bun build plugin support (zod-aot/bun) ([#22](https://github.com/wakita181009/zod-aot/issues/22)) ([aa6b3e0](https://github.com/wakita181009/zod-aot/commit/aa6b3e0463d29bc938f1eb458c96afcd6fe80cdc))
* add Next.js 16 + webpack demo app and fix ESM/CJS interop in discovery ([e1839a1](https://github.com/wakita181009/zod-aot/commit/e1839a1ff827a14d4c993c069390687c7843c5af))
* add partial support for z.lazy() schemas with cycle detection ([e361eea](https://github.com/wakita181009/zod-aot/commit/e361eeae5a374f7e9d25d78bb443d3256adfb3c8))
* add Rolldown unplugin support  ([#26](https://github.com/wakita181009/zod-aot/issues/26)) ([48a3060](https://github.com/wakita181009/zod-aot/commit/48a30605c63ca431aa2e02511be5058b9fd204c7))
* align error output with Zod v4 using localeError for message generation ([7c00a46](https://github.com/wakita181009/zod-aot/commit/7c00a46a98bbbb1d65ea43f1132da7f450cbeabc))
* inject __msg (localeError) in CLI emitter, unplugin, and benchmark ([7c0036f](https://github.com/wakita181009/zod-aot/commit/7c0036f0b93eac8db7685e2b87b74c3605c21a69))
* optimize recursive schema validation with self-recursive codegen ([#40](https://github.com/wakita181009/zod-aot/issues/40)) ([ca006cc](https://github.com/wakita181009/zod-aot/commit/ca006cccc3cfbc45b47e9d78111413a585e7f8b2))
* remove internals subpath export and update docs for v0.5.x ([#46](https://github.com/wakita181009/zod-aot/issues/46)) ([253b496](https://github.com/wakita181009/zod-aot/commit/253b49603a77d9a9160bc9ce25741d24ad7a65e6))
* support includes/startsWith/endsWith string checks ([#35](https://github.com/wakita181009/zod-aot/issues/35)) ([84b98d7](https://github.com/wakita181009/zod-aot/commit/84b98d7c2463d54149a5325f0056dfabf763526b))
* Zod-compatible CompiledSchema with improved compile() type ([#28](https://github.com/wakita181009/zod-aot/issues/28)) ([bc92a01](https://github.com/wakita181009/zod-aot/commit/bc92a017f4f48cf41f05c72a6da6a1b9f89f1d3d))


### Bug Fixes

* add Zod v3 to benchmarks for 5-way comparison ([#42](https://github.com/wakita181009/zod-aot/issues/42)) ([220f906](https://github.com/wakita181009/zod-aot/commit/220f906fafd09fec1551be37d202641c75781420))
* improve Zod v4.0-4.3 cross-version compat in error tests ([ce8bd3d](https://github.com/wakita181009/zod-aot/commit/ce8bd3d125c22e97024d83289b1b09bf5ba4e0bb))
* move trailing \n outside emit() in nullable generator ([#14](https://github.com/wakita181009/zod-aot/issues/14)) ([020f62c](https://github.com/wakita181009/zod-aot/commit/020f62cfd8bcefba4bdd88eec2557a1b16ddd148))
* remove unplugin re-export from main entry point ([#31](https://github.com/wakita181009/zod-aot/issues/31)) ([634108b](https://github.com/wakita181009/zod-aot/commit/634108b7ea3bd16465cf023d758220df8d9f47c0))
* restructure benchmarks with 4-way comparison ([#37](https://github.com/wakita181009/zod-aot/issues/37)) ([e31017f](https://github.com/wakita181009/zod-aot/commit/e31017fe70c730a7a6b523ff71802b32318edd02))
* strip trailing comma from inline compile() argument in unplugin transform ([#33](https://github.com/wakita181009/zod-aot/issues/33)) ([a16017f](https://github.com/wakita181009/zod-aot/commit/a16017f4df14c0f3d22ee1e861de0b5b2f2f28f5))
* update compat.mjs for internals subpath and __msg injection ([a21b28b](https://github.com/wakita181009/zod-aot/commit/a21b28b072c35fb50e80d83b67fb331437c98c91))

## [0.5.1](https://github.com/wakita181009/zod-aot/compare/v0.5.0...v0.5.1) (2026-03-19)


### Bug Fixes

* add Zod v3 to benchmarks for 5-way comparison ([#42](https://github.com/wakita181009/zod-aot/issues/42)) ([220f906](https://github.com/wakita181009/zod-aot/commit/220f906fafd09fec1551be37d202641c75781420))

## [0.5.0](https://github.com/wakita181009/zod-aot/compare/v0.4.1...v0.5.0) (2026-03-19)


### Features

* optimize recursive schema validation with self-recursive codegen ([#40](https://github.com/wakita181009/zod-aot/issues/40)) ([ca006cc](https://github.com/wakita181009/zod-aot/commit/ca006cccc3cfbc45b47e9d78111413a585e7f8b2))

## [0.4.1](https://github.com/wakita181009/zod-aot/compare/v0.4.0...v0.4.1) (2026-03-19)


### Bug Fixes

* restructure benchmarks with 4-way comparison ([#37](https://github.com/wakita181009/zod-aot/issues/37)) ([e31017f](https://github.com/wakita181009/zod-aot/commit/e31017fe70c730a7a6b523ff71802b32318edd02))

## [0.4.0](https://github.com/wakita181009/zod-aot/compare/v0.3.2...v0.4.0) (2026-03-17)


### Features

* support includes/startsWith/endsWith string checks ([#35](https://github.com/wakita181009/zod-aot/issues/35)) ([84b98d7](https://github.com/wakita181009/zod-aot/commit/84b98d7c2463d54149a5325f0056dfabf763526b))

## [0.3.2](https://github.com/wakita181009/zod-aot/compare/v0.3.1...v0.3.2) (2026-03-17)


### Bug Fixes

* strip trailing comma from inline compile() argument in unplugin transform ([#33](https://github.com/wakita181009/zod-aot/issues/33)) ([a16017f](https://github.com/wakita181009/zod-aot/commit/a16017f4df14c0f3d22ee1e861de0b5b2f2f28f5))

## [0.3.1](https://github.com/wakita181009/zod-aot/compare/v0.3.0...v0.3.1) (2026-03-17)


### Bug Fixes

* remove unplugin re-export from main entry point ([#31](https://github.com/wakita181009/zod-aot/issues/31)) ([634108b](https://github.com/wakita181009/zod-aot/commit/634108b7ea3bd16465cf023d758220df8d9f47c0))

## [0.3.0](https://github.com/wakita181009/zod-aot/compare/v0.2.0...v0.3.0) (2026-03-17)


### Features

* Zod-compatible CompiledSchema with improved compile() type ([#28](https://github.com/wakita181009/zod-aot/issues/28)) ([bc92a01](https://github.com/wakita181009/zod-aot/commit/bc92a017f4f48cf41f05c72a6da6a1b9f89f1d3d))

## [0.2.0](https://github.com/wakita181009/zod-aot/compare/v0.1.0...v0.2.0) (2026-03-16)


### Features

* add Rolldown unplugin support  ([#26](https://github.com/wakita181009/zod-aot/issues/26)) ([48a3060](https://github.com/wakita181009/zod-aot/commit/48a30605c63ca431aa2e02511be5058b9fd204c7))

## [0.1.0](https://github.com/wakita181009/zod-aot/compare/v0.0.19...v0.1.0) (2026-03-16)


### Features

* add Bun build plugin support (zod-aot/bun) ([#22](https://github.com/wakita181009/zod-aot/issues/22)) ([aa6b3e0](https://github.com/wakita181009/zod-aot/commit/aa6b3e0463d29bc938f1eb458c96afcd6fe80cdc))

## [0.0.19](https://github.com/wakita181009/zod-aot/compare/zod-aot-v0.0.18...zod-aot-v0.0.19) (2026-03-16)


### Features

* add Next.js 16 + webpack demo app and fix ESM/CJS interop in discovery ([e1839a1](https://github.com/wakita181009/zod-aot/commit/e1839a1ff827a14d4c993c069390687c7843c5af))
* add partial support for z.lazy() schemas with cycle detection ([e361eea](https://github.com/wakita181009/zod-aot/commit/e361eeae5a374f7e9d25d78bb443d3256adfb3c8))
* align error output with Zod v4 using localeError for message generation ([7c00a46](https://github.com/wakita181009/zod-aot/commit/7c00a46a98bbbb1d65ea43f1132da7f450cbeabc))
* inject __msg (localeError) in CLI emitter, unplugin, and benchmark ([7c0036f](https://github.com/wakita181009/zod-aot/commit/7c0036f0b93eac8db7685e2b87b74c3605c21a69))


### Bug Fixes

* improve Zod v4.0-4.3 cross-version compat in error tests ([ce8bd3d](https://github.com/wakita181009/zod-aot/commit/ce8bd3d125c22e97024d83289b1b09bf5ba4e0bb))
* move trailing \n outside emit() in nullable generator ([#14](https://github.com/wakita181009/zod-aot/issues/14)) ([020f62c](https://github.com/wakita181009/zod-aot/commit/020f62cfd8bcefba4bdd88eec2557a1b16ddd148))
* update compat.mjs for internals subpath and __msg injection ([a21b28b](https://github.com/wakita181009/zod-aot/commit/a21b28b072c35fb50e80d83b67fb331437c98c91))
