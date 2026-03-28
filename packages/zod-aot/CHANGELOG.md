# Changelog

## [0.11.1](https://github.com/wakita181009/zod-aot/compare/v0.11.0...v0.11.1) (2026-03-28)


### Bug Fixes

* **test:** use assertSameResult for date range issue tests ([19e6e11](https://github.com/wakita181009/zod-aot/commit/19e6e115f07d2b7cb16b6b8443f41f8d595a08f7))

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
