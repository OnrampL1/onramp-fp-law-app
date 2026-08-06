const { cpSync, existsSync, statSync } = require("node:fs");
const path = require("node:path");

const src = path.join(__dirname, "..", "ai", "prompts");
const dest = path.join(__dirname, "..", "dist", "ai", "prompts");

if (existsSync(src)) {
  cpSync(src, dest, {
    recursive: true,
    filter: (source) =>
      statSync(source).isDirectory() || source.endsWith(".md"),
  });
}
