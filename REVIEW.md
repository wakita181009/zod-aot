# Code Review: packages/zod-aot

**Date:** 2026-03-03
**Scope:** packages/zod-aot/src/ 全ファイル
**Tests:** 451 tests passing (33 test files)

---

## 総評

全体的に高品質なコードベースです。アーキテクチャが明確に分離されており（core / cli / unplugin）、モジュール間の依存ルールも守られています。SchemaIR による中間表現を経由するコンパイルパイプラインは堅実な設計です。

以下、優先度別に発見事項を報告します。

---

## Critical（修正推奨）

### C1. `findMatchingParen()` が文字列リテラル・コメントを考慮していない

**File:** `src/unplugin/transform.ts:104-114`

```typescript
function findMatchingParen(code: string, openIndex: number): number {
  let depth = 1;
  for (let i = openIndex + 1; i < code.length; i++) {
    if (code[i] === "(") depth++;
    else if (code[i] === ")") { depth--; if (depth === 0) return i; }
  }
  return -1;
}
```

**問題:** 文字列リテラル内の `()` もカウントしてしまう。

```typescript
// この場合、"balance: (100)" 内の括弧で誤マッチする
export const v = compile(z.object({
  message: z.string().default("balance: (100)"),
}));
```

**修正案:** 文字列リテラル（`"`, `'`, `` ` ``）、コメント（`//`, `/* */`）の中はスキップする状態管理を追加する。

### C2. `rewriteSource()` の `string.replace()` が最初の1つしか置換しない

**File:** `src/unplugin/transform.ts:141`

```typescript
result = result.replace(fullMatch, replacement);
```

**問題:** `String.prototype.replace()` は第1引数が文字列の場合、最初のマッチのみ置換する。同じ `fullMatch` が2箇所あると2つ目が残る。また、`replace()` の第1引数は正規表現特殊文字としても解釈されないため一応安全だが、置換後に `result` のインデックスがずれる問題もある。

**修正案:** `match.index` を使ってスライスで直接置換する。複数スキーマがある場合は逆順（末尾から）で処理してインデックスのずれを防ぐ。

```typescript
const startIdx = match.index;
const endIdx = closeParenIndex + 1;
result = result.slice(0, startIdx) + replacement + result.slice(endIdx);
```

---

## High（バグまたは実動作に影響する問題）

### H1. URL バリデーション生成時のデッドコード

**File:** `src/core/codegen/generators/string.ts:36-38`

```typescript
} else if (check.format === "url") {
  regexVar = `__re_url_${ctx.counter++}`;
  ctx.preamble.push(`var ${regexVar};try{${regexVar}=true;}catch(e){${regexVar}=false;}`);
  code += `if(!(function(s){try{new URL(s);return true;}catch(e){return false;}})(${inputExpr})){...}`;
  continue;
}
```

**問題:** preamble で `regexVar` を宣言するが、try-catch は例外が発生し得ないコードで無意味。かつ `continue` で後続の `regexVar.test()` をスキップするため、この preamble 変数は一切使われない。

**修正案:** preamble の行を削除し、`regexVar` の宣言も不要にする。`ctx.counter++` の副作用だけ残すか不要なら削除。

### H2. Date チェック値の NaN 未検証

**File:** `src/core/extractor.ts:272-273, 281-282`

```typescript
const v = checkDef.value as unknown as string;
const ts = new Date(v).getTime();
```

**問題:** `checkDef.value` が有効な日付文字列でない場合、`ts` が `NaN` になる。生成コードで `if(input.getTime() < NaN)` は常に `false` となり、チェックが無効化される。

**修正案:**
```typescript
const ts = new Date(v).getTime();
if (Number.isNaN(ts)) {
  // skip this check or throw
  continue;
}
```

### H3. Tuple の最小要素数チェックが欠落

**File:** `src/core/codegen/generators/tuple.ts:16-18`

```typescript
if (ir.rest === null) {
  code += `if(${inputExpr}.length>${len}){...}`;  // 最大のみ
}
```

**問題:** `[z.string(), z.number()]` に対して `["hello"]` を渡した場合、要素数が足りないことを検出しない。各要素は `inputExpr[1]` = `undefined` としてアクセスされるため型チェック（Expected number）でキャッチされるが、エラーメッセージが「Expected number, received undefined」となり「要素が足りない」という本質が伝わらない。

**修正案:** 最小長チェックを追加:
```typescript
code += `if(${inputExpr}.length<${len}){${issuesVar}.push({code:"too_small",minimum:${len},...});}`;
```

### H4. `removeCompileImport()` が複数行importに対応していない

**File:** `src/unplugin/transform.ts:154`

```typescript
const importPattern = /import\s*\{([^}]*)\}\s*from\s*["']zod-aot["'];?/g;
```

**問題:** `[^}]*` はデフォルトで改行にマッチしない。複数行 import 文:
```typescript
import {
  compile,
  createFallback
} from "zod-aot";
```
が処理されない。

**修正案:** `s`（dotAll）フラグを追加するか、`[\s\S]*?` に変更:
```typescript
const importPattern = /import\s*\{([^}]*)\}\s*from\s*["']zod-aot["'];?/gs;
```

### H5. Emitter の `__fb` インジェクションが正規表現ベースで脆弱

**File:** `src/cli/emitter.ts:67-70`

```typescript
const injected = fnDef.replace(
  /^(function\s+\w+\(input\)\{)\n/,
  `$1\nvar __fb=__fb_${schema.exportName};\n`,
);
```

**問題:** codegen の出力フォーマットが変わると `replace` が何も置換せず、`__fb` バインディングがなくなりランタイムエラーになる。置換失敗の検出がない。

**修正案:** 置換後に `injected === fnDef` の場合はエラーを throw する。

---

## Medium（改善推奨）

### M1. Union バリデーションで unionErrors が空配列固定

**File:** `src/core/codegen/generators/union.ts:22`

```typescript
unionErrors:[]
```

**問題:** Zod は各ブランチの失敗理由を `unionErrors` に格納するが、AOT 版は常に空。デバッグ時にどのブランチが失敗したか不明。

**影響:** 機能的には正しく動作するが、エラー診断の UX が低下する。

### M2. Record のキーと値でエラーパスが同一

**File:** `src/core/codegen/generators/record.ts:22-26`

```typescript
const keyPath = `${pathExpr}.concat(${keyVar})`;
code += generateFn(ir.keyType, keyVar, keyPath, issuesVar, ctx);
code += generateFn(ir.valueType, valExpr, keyPath, issuesVar, ctx);
```

**問題:** キーのバリデーションエラーと値のバリデーションエラーが同一パスになる。Zod の実装では区別がある可能性。

**影響:** エラーメッセージでキー制約エラーと値制約エラーを区別しにくい。

### M3. `isWatchTarget()` の node_modules 判定が広すぎる

**File:** `src/cli/commands/watch.ts:21`

```typescript
if (filePath.includes("node_modules")) return false;
```

**問題:** `/home/node_modules_backup/schema.ts` のようなパスも誤って除外される。

**修正案:** `filePath.split(path.sep).includes("node_modules")` とする。

### M4. DiscriminatedUnion で非リテラルの discriminator が無視される

**File:** `src/core/extractor.ts:221-229`

```typescript
if (discrimField?._zod?.def?.type === "literal") {
  // ... mapping に追加
}
```

**問題:** discriminator フィールドが `z.literal()` でないオプションは `mapping` から除外されるが、ログ/警告がない。生成コードの `default` ケースで対処されるが、意図的な挙動か不明確。

### M5. Default 値の `JSON.stringify` によるデータロス

**File:** `src/core/codegen/generators/default.ts:12`

```typescript
const defaultValueStr = JSON.stringify(ir.defaultValue);
```

**問題:** `Date` オブジェクトは文字列に、`undefined` は消失する。ただし extractor 側で `JSON.stringify` の成功をチェックしているため、非シリアライズ可能な値は fallback される。Date の場合は `JSON.stringify(new Date())` が成功するため通過してしまう。

---

## Low（スタイル・改善余地）

### L1. 生成コードの変数名が統一されていない

- `__fb_r`, `__fb_i`, `__fb_j` (fallback)
- `__u_`, `__ui_` (union)
- `__o_` (object)
- `__rk_`, `__ri_`, `__rkey_` (record)
- `__ti_` (tuple)

一貫した命名規則を設ければ、生成コードのデバッグが容易になる。

### L2. Extractor 内の ZodSchema 型が `as` キャスト依存

**File:** `src/core/extractor.ts:137`

```typescript
const schema = zodSchema as ZodSchema;
```

ランタイムガードなしの `as` キャスト。`zodSchema` が Zod スキーマでない場合に `_zod.def` アクセスで即 crash する。API 境界で最低限のチェック（例: `typeof schema._zod === "object"`）があると安全。

### L3. エラーメッセージが汎用的

`"Invalid input"`, `"Invalid literal value"` など。期待値/実値をメッセージに含めるとデバッグしやすくなる。ただしこれは Zod の `message` フィールドとの互換性次第。

### L4. CLI の `rest[i]` 型安全性

**File:** `src/cli/index.ts:75`

`rest[i]` が `string | undefined` だが、直後の `if (!val)` ガードで実用上問題なし。TypeScript strict mode での型推論の問題のみ。

---

## テストカバレッジの改善提案

現在451テスト合格で網羅的ですが、以下のエッジケースのテスト追加を推奨:

1. **unplugin/transform**: 文字列リテラル内に括弧を含むスキーマ（C1 の再現テスト）
2. **unplugin/transform**: 複数行 import 文（H4 の再現テスト）
3. **tuple**: 要素数不足の入力（H3 の動作確認テスト）
4. **date**: 無効な日付値チェック（H2 の再現テスト）
5. **discriminatedUnion**: 非リテラル discriminator 混在パターン

---

## アーキテクチャ所見

### 良い点

- **明確なモジュール分離**: core / cli / unplugin が独立し、Biome の `noRestrictedImports` で強制
- **SchemaIR 中間表現**: extractor と codegen の関心分離が適切
- **Partial fallback**: transform/refine を含むスキーマでも最適化可能な部分は AOT 化する戦略は優秀
- **マルチランタイム対応**: Node.js / Bun / Deno のローダー分岐が整理されている
- **テスト品質**: 各ジェネレーターに個別テスト＋インテグレーションテストで高カバレッジ
- **Watch mode**: debounce + AbortController + graceful shutdown が丁寧

### 改善余地

- **unplugin transform のテキスト処理**: AST ベースでなく正規表現/文字列操作ベースのため、エッジケースに弱い。将来的に MagicString + simple parser の導入を検討
- **エラー情報量**: union の unionErrors や discriminatedUnion の fallback warning など、ユーザー体験を改善できる箇所がある
- **Source map**: unplugin が `map: null` を返しており、変換後のデバッグが困難
