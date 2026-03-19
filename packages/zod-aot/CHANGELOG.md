# Changelog

## [0.5.0](https://github.com/wakita181009/zod-aot/compare/v0.4.1...v0.5.0) (2026-03-19)


### Features

* optimize recursive schema validation with self-recursive codegen ([23e9176](https://github.com/wakita181009/zod-aot/commit/23e9176cd70ef2cce6ea9c3f2fc0d59a75cba2cb))

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
