// Collects newly published documents from official feeds into data/candidates.json.
// Nothing here is published: candidates stay unreviewed until a person promotes them to data/records.json.
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export const SOURCES = [
  { authority: 'RBI', category: 'Banking', url: 'https://rbi.org.in/notifications_rss.xml', enabled: true },
  // Add more feeds after checking the feed URL and the site's terms of use.
  { authority: 'SEBI', category: 'Securities', url: '', enabled: false },
];

const decode = (s) => s.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, '’').trim();
const tag = (x, t) => { const m = x.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`, 'i')); return m ? decode(m[1]) : ''; };

export function parseRss(xml) {
  return [...xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi)].map((m) => {
    const x = m[0], d = new Date(tag(x, 'pubDate'));
    return { title: tag(x, 'title'), url: tag(x, 'link'), published: isNaN(d) ? null : d.toISOString().slice(0, 10) };
  }).filter((i) => i.title && /^https?:\/\//.test(i.url));
}

const readJson = async (p) => JSON.parse(await readFile(p, 'utf8'));

async function main() {
  const records = await readJson('data/records.json');
  const cands = await readJson('data/candidates.json');
  const seen = new Set([...records, ...cands].flatMap((r) => [r.u, r.x, r.l, r.url]).filter(Boolean));
  const today = new Date().toISOString().slice(0, 10);
  let added = 0, ok = 0, tried = 0;
  for (const s of SOURCES.filter((s) => s.enabled && s.url)) {
    tried++;
    try {
      const res = await fetch(s.url, { headers: { 'User-Agent': 'ReguLedgerBot/0.1 (document index)' }, signal: AbortSignal.timeout(20000) });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const items = parseRss(await res.text()); ok++;
      for (const i of items) {
        if (seen.has(i.url)) continue;
        seen.add(i.url);
        cands.push({ authority: s.authority, category: s.category, title: i.title, url: i.url, published: i.published, discovered: today, status: 'unreviewed' });
        added++;
      }
      console.log(`${s.authority}: ${items.length} items, ${added} new so far`);
    } catch (e) { console.warn(`${s.authority}: failed (${e.message})`); }
  }
  await writeFile('data/candidates.json', JSON.stringify(cands, null, 1) + '\n');
  console.log(`Done. Added ${added}.`);
  if (tried && !ok) process.exit(1); // every source failed: make the run show red
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
