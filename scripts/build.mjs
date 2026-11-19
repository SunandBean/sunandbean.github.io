// Builds _site/ from projects.json + src/template.html + public/.
// Usage: node scripts/build.mjs [--no-stats]
// Set GITHUB_TOKEN to avoid GitHub API rate limits (the workflow does this).
import { readFileSync, writeFileSync, rmSync, mkdirSync, cpSync } from "node:fs";

const root = new URL("..", import.meta.url).pathname;
const out = root + "_site";
const data = JSON.parse(readFileSync(root + "projects.json", "utf8"));
const template = readFileSync(root + "src/template.html", "utf8");
const withStats = !process.argv.includes("--no-stats");

const esc = (s) => String(s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

const fmtDate = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York" });

async function getJson(url, headers = {}) {
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
    if (!res.ok) { console.warn(`stats: ${res.status} ${url}`); return null; }
    return await res.json();
  } catch (e) {
    console.warn(`stats: ${e.message} ${url}`);
    return null;
  }
}

async function statsFor(p) {
  if (!withStats || !p.stats) return null;
  const gh = { "accept": "application/vnd.github+json", "user-agent": "sunandbean-hub" };
  if (process.env.GITHUB_TOKEN) gh.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  let stars = 0, downloads = 0, latest = null, seen = 0;
  for (const repo of p.stats.github || []) {
    const j = await getJson(`https://api.github.com/repos/${repo}`, gh);
    if (!j) continue;
    seen++;
    stars += j.stargazers_count || 0;
    const t = new Date(j.pushed_at);
    if (!latest || t > latest) latest = t;
  }
  for (const model of p.stats.huggingface || []) {
    const j = await getJson(`https://huggingface.co/api/models/${model}`);
    if (!j) continue;
    seen++;
    downloads += j.downloads || 0;
    const t = new Date(j.lastModified);
    if (!latest || t > latest) latest = t;
  }
  return seen ? { stars, downloads, latest } : null;
}

function metaLine(s) {
  if (!s) return "";
  const parts = [];
  if (s.stars > 0) parts.push(`★ ${s.stars.toLocaleString("en-US")}`);
  if (s.downloads > 0) parts.push(`${s.downloads.toLocaleString("en-US")} downloads last month`);
  if (s.latest) parts.push(`Updated ${fmtDate(s.latest)}`);
  return parts.length ? `        <p class="meta">${esc(parts.join(" · "))}</p>\n` : "";
}

function card(p, s) {
  const img = p.image || {};
  const shotClass = img.position === "top" ? "shot top" : "shot";
  const imgTag = img.src
    ? `<img src="${esc(img.src)}" alt="${esc(img.alt || "")}" loading="lazy">`
    : `<div class="placeholder">Screenshot to come</div>`;
  const shot = img.href
    ? `      <a class="${shotClass}" href="${esc(img.href)}">${imgTag}</a>`
    : `      <div class="${shotClass}">${imgTag}</div>`;
  const facts = (p.facts || []).map((f) => `          <li>${esc(f)}</li>`).join("\n");
  const links = (p.links || []).map((l) =>
    `          <a class="chip${l.primary ? " primary" : ""}" href="${esc(l.url)}">${esc(l.label)}</a>`).join("\n");
  const linkBlock = links
    ? `        <div class="links">\n${links}\n        </div>`
    : `        <div class="links"><span class="note">${esc(p.note || "")}</span></div>`;
  return `    <article class="card" id="${esc(p.id)}">
${shot}
      <div class="body">
        <span class="kicker">${esc(p.kicker)}</span>
        <h2>${esc(p.title)}</h2>
        <p class="desc">${esc(p.description)}</p>
        <ul class="facts">
${facts}
        </ul>
${metaLine(s)}${linkBlock}
      </div>
    </article>`;
}

const cards = [];
for (const p of data.projects) {
  const s = await statsFor(p);
  cards.push(card(p, s));
}

const token = data.site?.analyticsToken;
const analytics = token
  ? `<!-- Cloudflare Web Analytics --><script type="module" src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "${esc(token)}"}'></script><!-- End Cloudflare Web Analytics -->`
  : "";

const now = new Date();
const html = template
  .replace("{{CARDS}}", cards.join("\n\n"))
  .replace("{{ANALYTICS}}", analytics)
  .replace("{{YEAR}}", String(now.getFullYear()))
  .replace("{{BUILT}}", fmtDate(now));

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(root + "public", out, { recursive: true });
writeFileSync(out + "/index.html", html);
console.log(`built ${data.projects.length} cards into _site/`);
