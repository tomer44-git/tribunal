// The seven prompts live one to a file in prompts/, where a change to one agent is
// its own diff. A function cannot reliably read those files at run time once it is
// bundled, so they are turned into a module at build time instead. The markdown
// stays the only place a prompt is written; this file is generated and never
// edited, and it is not committed.
//
// Everything above the first --- in a prompt file is a note about where the file is
// sent. Only what follows is sent to a model.

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const DIR = "prompts";
const body = (text) => {
  const marker = text.indexOf("\n---\n");
  if (marker === -1) throw new Error("a prompt file must separate its note from its text with ---");
  return text.slice(marker + 5).trim();
};

const files = readdirSync(DIR)
  .filter((name) => name.endsWith(".md") && name !== "README.md")
  .sort();

const entries = files.map((name) => {
  const key = name.replace(/\.md$/, "");
  return `  ${JSON.stringify(key)}: ${JSON.stringify(body(readFileSync(join(DIR, name), "utf8")))},`;
});

writeFileSync(
  "src/prompts.generated.ts",
  `// Generated from prompts/ by scripts/build-prompts.mjs. Do not edit.\n` +
    `export const PROMPTS: Record<string, string> = {\n${entries.join("\n")}\n};\n`,
);

console.log(`prompts: ${files.length} files`);
