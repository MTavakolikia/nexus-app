import { cpSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const standalone = resolve(root, ".next/standalone");

if (!existsSync(standalone)) {
  console.error(
    "Missing .next/standalone \u2014 run the build again before copying assets.",
  );
  process.exit(1);
}

const copies = [
  [resolve(root, ".next/static"), resolve(standalone, ".next/static")],
  [resolve(root, "public"), resolve(standalone, "public")],
];

for (const [from, to] of copies) {
  if (!existsSync(from)) {
    console.warn(`skip: ${from} does not exist`);
    continue;
  }
  cpSync(from, to, { recursive: true, force: true });
  console.log(`copied ${from} -> ${to}`);
}