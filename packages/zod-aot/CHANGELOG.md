# Changelog

## [0.4.0](https://github.com/wakita181009/zod-aot/compare/v0.3.0...v0.4.0) (2026-03-17)


### Features

* add Bun build plugin support (zod-aot/bun) ([#22](https://github.com/wakita181009/zod-aot/issues/22)) ([aa6b3e0](https://github.com/wakita181009/zod-aot/commit/aa6b3e0463d29bc938f1eb458c96afcd6fe80cdc))
* add Next.js 16 + webpack demo app and fix ESM/CJS interop in discovery ([e1839a1](https://github.com/wakita181009/zod-aot/commit/e1839a1ff827a14d4c993c069390687c7843c5af))
* add partial support for z.lazy() schemas with cycle detection ([e361eea](https://github.com/wakita181009/zod-aot/commit/e361eeae5a374f7e9d25d78bb443d3256adfb3c8))
* add Rolldown unplugin support  ([#26](https://github.com/wakita181009/zod-aot/issues/26)) ([48a3060](https://github.com/wakita181009/zod-aot/commit/48a30605c63ca431aa2e02511be5058b9fd204c7))
* align error output with Zod v4 using localeError for message generation ([7c00a46](https://github.com/wakita181009/zod-aot/commit/7c00a46a98bbbb1d65ea43f1132da7f450cbeabc))
* inject __msg (localeError) in CLI emitter, unplugin, and benchmark ([7c0036f](https://github.com/wakita181009/zod-aot/commit/7c0036f0b93eac8db7685e2b87b74c3605c21a69))
* Zod-compatible CompiledSchema with improved compile() type ([#28](https://github.com/wakita181009/zod-aot/issues/28)) ([bc92a01](https://github.com/wakita181009/zod-aot/commit/bc92a017f4f48cf41f05c72a6da6a1b9f89f1d3d))


### Bug Fixes

* improve Zod v4.0-4.3 cross-version compat in error tests ([ce8bd3d](https://github.com/wakita181009/zod-aot/commit/ce8bd3d125c22e97024d83289b1b09bf5ba4e0bb))
* move trailing \n outside emit() in nullable generator ([#14](https://github.com/wakita181009/zod-aot/issues/14)) ([020f62c](https://github.com/wakita181009/zod-aot/commit/020f62cfd8bcefba4bdd88eec2557a1b16ddd148))
* update compat.mjs for internals subpath and __msg injection ([a21b28b](https://github.com/wakita181009/zod-aot/commit/a21b28b072c35fb50e80d83b67fb331437c98c91))

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
