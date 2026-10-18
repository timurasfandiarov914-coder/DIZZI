import fs from "node:fs";

const html = fs.readFileSync("index.html", "utf8");
const errors = [];
const scriptBlocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];

if (!html.toLowerCase().includes("<!doctype html>")) errors.push("Missing HTML doctype.");
if (scriptBlocks.length !== 1) errors.push("Expected exactly one inline JavaScript block.");

const inlineJs = scriptBlocks[0]?.[1] ?? "";
try {
  new Function(inlineJs);
} catch (error) {
  errors.push("JavaScript syntax: " + error.message);
}

const staticHtml = scriptBlocks.length ? html.slice(0, scriptBlocks[0].index) : html;
const ids = [...staticHtml.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
const seen = new Set();
for (const id of ids) {
  if (seen.has(id)) errors.push("Duplicate HTML id: " + id);
  seen.add(id);
}

for (const [, id] of inlineJs.matchAll(/\$\("([^"]+)"\)/g)) {
  if (!seen.has(id)) errors.push('JavaScript references missing element: "' + id + '".');
}

for (const feature of [
  "INVIDIOUS_INSTANCES",
  "searchAll",
  "new YT.Player",
  "data-filter",
  "dizzi-playlists-v1",
  "dizzi-history-v1",
  'data-action="add-playlist"',
]) {
  if (!html.includes(feature)) errors.push("Expected feature marker missing: " + feature);
}

if (errors.length) {
  console.error("DIZZI validation failed:");
  for (const error of errors) console.error(" - " + error);
  process.exit(1);
}
console.log("DIZZI validation passed: JavaScript syntax, static IDs, DOM references, and feature markers.");
