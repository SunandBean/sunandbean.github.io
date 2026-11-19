// Checks every link and image in projects.json, plus the top nav links.
// Writes broken-links.md and exits 1 when anything is broken.
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const root = new URL("..", import.meta.url).pathname;
const data = JSON.parse(readFileSync(root + "projects.json", "utf8"));

const targets = new Map();
const add = (url, where) => { if (url) targets.set(url, [...(targets.get(url) || []), where]); };
for (const p of data.projects) {
  for (const l of p.links || []) add(l.url, `${p.id}: ${l.label}`);
  if (p.image?.href) add(p.image.href, `${p.id}: image link`);
  if (p.image?.src && !existsSync(root + "public/" + p.image.src)) add("missing-file:" + p.image.src, `${p.id}: image file`);
}
for (const m of readFileSync(root + "src/template.html", "utf8").matchAll(/href="(https?:[^"]+)"/g)) add(m[1], "template");

async function check(url) {
  if (url.startsWith("missing-file:")) return "file not found in public/";
  for (const method of ["HEAD", "GET"]) {
    try {
      const res = await fetch(url, { method, redirect: "follow", signal: AbortSignal.timeout(20000),
        headers: { "user-agent": "Mozilla/5.0 (link check for sunandbean.com)" } });
      if (res.ok) return null;
      // Some sites reject HEAD or bots; retry with GET before calling it broken.
      if (method === "GET") return `HTTP ${res.status}`;
    } catch (e) {
      if (method === "GET") return e.name === "TimeoutError" ? "timeout" : e.message;
    }
  }
  return "unknown";
}

const broken = [];
for (const [url, where] of targets) {
  const err = await check(url);
  console.log(`${err ? "BROKEN" : "ok    "} ${url}${err ? "  (" + err + ")" : ""}`);
  if (err) broken.push({ url, err, where });
}

if (broken.length) {
  const md = ["Weekly link check found broken links on sunandbean.com:", "",
    ...broken.map((b) => `- ${b.url}: ${b.err} (used in ${b.where.join(", ")})`),
    "", "Fix the URL in `projects.json` (or the template), push, and close this issue."].join("\n");
  writeFileSync(root + "broken-links.md", md);
  process.exit(1);
}
console.log(`all ${targets.size} links ok`);
