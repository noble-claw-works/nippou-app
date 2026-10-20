/**
 * gen-code-index.mjs
 *
 * Generates docs/CODE_INDEX.md — a symbol index for src/ TypeScript files.
 * Usage:
 *   node scripts/gen-code-index.mjs          # write docs/CODE_INDEX.md
 *   node scripts/gen-code-index.mjs --check  # verify existing file is up-to-date
 *
 * Dependencies: only `typescript` (already in devDependencies).
 * Do NOT edit docs/CODE_INDEX.md by hand — re-run this script instead.
 */

import { createRequire } from "module";
import {
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
  statSync,
} from "fs";
import { join, relative, dirname, sep } from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "..");
const SRC_DIR = join(REPO_ROOT, "src");
const OUTPUT_PATH = join(REPO_ROOT, "docs", "CODE_INDEX.md");

const CHECK_MODE = process.argv.includes("--check");

// ---------------------------------------------------------------------------
// File collection
// ---------------------------------------------------------------------------

/** Recursively collect *.ts / *.tsx files, excluding tests */
function collectFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      if (entry === "__tests__") continue;
      results.push(...collectFiles(fullPath));
    } else if (
      /\.(tsx?|ts)$/.test(entry) &&
      !/\.test\.(tsx?|ts)$/.test(entry)
    ) {
      results.push(fullPath);
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Symbol extraction via TypeScript Compiler API
// ---------------------------------------------------------------------------

/** Count lines in source text */
function countLines(text) {
  let n = 1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "\n") n++;
  }
  return n;
}

/**
 * Return array of exported symbol names from a TS/TSX source file.
 * Handles:
 *  - export function / export const / export class / export enum / export type / export interface
 *  - export default (function/class/expression)
 *  - export { ... } re-exports (named only, not "from" re-exports of other modules)
 */
function extractExports(sourceFile) {
  const names = [];

  function visit(node) {
    // export function foo / export class Foo / export enum Foo
    if (
      (ts.isFunctionDeclaration(node) ||
        ts.isClassDeclaration(node) ||
        ts.isEnumDeclaration(node)) &&
      hasExportModifier(node)
    ) {
      if (node.name) {
        names.push(node.name.text);
      } else if (
        ts.isFunctionDeclaration(node) ||
        ts.isClassDeclaration(node)
      ) {
        names.push("default");
      }
    }

    // export interface Foo / export type Foo
    if (
      (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) &&
      hasExportModifier(node)
    ) {
      names.push(node.name.text);
    }

    // export const foo = ... / export let foo = ...
    if (ts.isVariableStatement(node) && hasExportModifier(node)) {
      for (const decl of node.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) {
          names.push(decl.name.text);
        } else if (ts.isObjectBindingPattern(decl.name)) {
          for (const el of decl.name.elements) {
            if (ts.isIdentifier(el.name)) names.push(el.name.text);
          }
        }
      }
    }

    // export default <expr>
    if (ts.isExportAssignment(node) && !node.isExportEquals) {
      names.push("default");
    }

    // export { foo, bar } — named export clauses (without 'from')
    if (
      ts.isExportDeclaration(node) &&
      node.exportClause &&
      !node.moduleSpecifier
    ) {
      if (ts.isNamedExports(node.exportClause)) {
        for (const spec of node.exportClause.elements) {
          names.push((spec.name ?? spec.propertyName).text);
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  // Deduplicate while preserving order
  return [...new Set(names)];
}

function hasExportModifier(node) {
  if (!node.modifiers) return false;
  return node.modifiers.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
}

// ---------------------------------------------------------------------------
// Grouping
// ---------------------------------------------------------------------------

/** src-relative path → top-level directory (category) */
function categoryOf(relPath) {
  const parts = relPath.split(sep);
  return parts.length === 1 ? "(root)" : parts[0];
}

// ---------------------------------------------------------------------------
// Markdown generation
// ---------------------------------------------------------------------------

function buildMarkdown(fileInfos, generatedAt) {
  const byCategory = new Map();
  for (const info of fileInfos) {
    const cat = categoryOf(info.relPath);
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat).push(info);
  }

  const lines = [];
  lines.push("# CODE_INDEX (自動生成 / 手で編集しない)");
  lines.push("");
  lines.push(
    "> このファイルは `npm run index` で自動生成される。編集は生成元コードを変えてから再生成すること。",
  );
  lines.push(
    "> 用途: AIがwhole-repoを読まずに、機能→ファイルを特定するための索引。",
  );
  lines.push("");
  lines.push(`生成日時: ${generatedAt}`);
  lines.push(`対象ファイル数: ${fileInfos.length}`);
  lines.push("");

  const sortedCats = [...byCategory.keys()].sort();
  for (const cat of sortedCats) {
    lines.push(`## ${cat}/`);
    for (const info of byCategory.get(cat)) {
      const exportsStr =
        info.exports.length === 0 ? "(no exports)" : info.exports.join(", ");
      lines.push(
        `- \`src/${info.relPath}\` (${info.lines}行) — exports: ${exportsStr}`,
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Normalisation for --check comparison (strip the timestamp line)
// ---------------------------------------------------------------------------

const TIMESTAMP_RE = /^生成日時: .+$/m;

function normalize(content) {
  return content.replace(TIMESTAMP_RE, "生成日時: <STRIPPED>").trimEnd();
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const allFiles = collectFiles(SRC_DIR).sort();

const compilerOptions = {
  allowJs: false,
  jsx: ts.JsxEmit.ReactJSX,
  noEmit: true,
};

const fileInfos = allFiles.map((absPath) => {
  const text = readFileSync(absPath, "utf8");
  const relPath = relative(SRC_DIR, absPath);
  const sourceFile = ts.createSourceFile(
    absPath,
    text,
    ts.ScriptTarget.ESNext,
    true,
  );
  const exports = extractExports(sourceFile);
  return {
    relPath,
    lines: countLines(text),
    exports,
  };
});

const generatedAt = new Date().toISOString();
const markdown = buildMarkdown(fileInfos, generatedAt);

if (CHECK_MODE) {
  if (!existsSync(OUTPUT_PATH)) {
    process.stderr.write(
      `ERROR: docs/CODE_INDEX.md not found. Run \`npm run index\` to generate it.\n`,
    );
    process.exit(1);
  }
  const existing = readFileSync(OUTPUT_PATH, "utf8");
  const normalExisting = normalize(existing);
  const normalNew = normalize(markdown);

  if (normalExisting === normalNew) {
    console.log("docs/CODE_INDEX.md is up-to-date. ✓");
    process.exit(0);
  } else {
    process.stderr.write("ERROR: docs/CODE_INDEX.md is out of date.\n");
    // Show diff summary: which lines differ
    const existingLines = normalExisting.split("\n");
    const newLines = normalNew.split("\n");
    const maxLen = Math.max(existingLines.length, newLines.length);
    let diffCount = 0;
    for (let i = 0; i < maxLen; i++) {
      if (existingLines[i] !== newLines[i]) {
        process.stderr.write(
          `  Line ${i + 1}:\n    - ${existingLines[i] ?? "(missing)"}\n    + ${newLines[i] ?? "(missing)"}\n`,
        );
        diffCount++;
        if (diffCount >= 10) {
          process.stderr.write(
            `  ... and more differences. Run \`npm run index\` to update.\n`,
          );
          break;
        }
      }
    }
    process.exit(1);
  }
} else {
  writeFileSync(OUTPUT_PATH, markdown, "utf8");
  console.log(`docs/CODE_INDEX.md written. Files indexed: ${fileInfos.length}`);
}
