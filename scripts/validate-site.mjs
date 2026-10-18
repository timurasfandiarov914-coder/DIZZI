import fs from "node:fs";

const html = fs.readFileSync("index.html", "utf8");
const sw = fs.readFileSync("sw.js", "utf8");
const errors = [];
try { JSON.parse(fs.readFileSync("manifest.webmanifest", "utf8")); } catch (error) { errors.push("Web app manifest JSON: " + error.message); }
try { new Function(sw); } catch (error) { errors.push("Service worker syntax: " + error.message); }
if (!html.includes('rel="manifest"') || !html.includes('navigator.serviceWorker.register("./sw.js")')) errors.push("PWA manifest/service worker is not wired into the page.");
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
  "navigator.serviceWorker.register",
  "dizzi-shell-v1",
  'data-action="add-playlist"',
]) {
  if (!(html + "\n" + sw).includes(feature)) errors.push("Expected feature marker missing: " + feature);
}

if (errors.length) {
  console.error("DIZZI validation failed:");
  for (const error of errors) console.error(" - " + error);
  process.exit(1);
}
console.log("DIZZI validation passed: JavaScript, service worker, manifest, static IDs, DOM references, and feature markers.");
