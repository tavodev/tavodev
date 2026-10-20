// Generates the stats cards in assets/ (light and dark) from the GitHub API.
// Needs a token from the profile owner in GH_TOKEN so private work counts too.
// Only totals are published: no names of private repositories.
//
//   GH_TOKEN=... node scripts/stats.mjs

import { mkdir, writeFile } from 'node:fs/promises';

const USER = 'tavodev';
const OUT = new URL('../assets/', import.meta.url);
const TOKEN = process.env.GH_TOKEN;
if (!TOKEN) throw new Error('GH_TOKEN is missing');

// Markup, notebooks and build files inflate the numbers without saying much about the work.
const SKIP_LANGS = new Set(['HTML', 'CSS', 'SCSS', 'Jupyter Notebook', 'Shell', 'Makefile', 'Dockerfile', 'Procfile', 'Batchfile']);
const TOP_LANGS = 8;

async function gql(query, variables = {}) {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data;
}

async function calendarDays(createdAt) {
  const days = [];
  const now = new Date();
  for (let year = new Date(createdAt).getUTCFullYear(); year <= now.getUTCFullYear(); year++) {
    const from = `${year}-01-01T00:00:00Z`;
    const to = year === now.getUTCFullYear() ? now.toISOString() : `${year}-12-31T23:59:59Z`;
    const data = await gql(
      `query($login:String!,$from:DateTime!,$to:DateTime!){user(login:$login){contributionsCollection(from:$from,to:$to){
        contributionCalendar{weeks{contributionDays{date contributionCount}}}}}}`,
      { login: USER, from, to },
    );
    for (const week of data.user.contributionsCollection.contributionCalendar.weeks) {
      days.push(...week.contributionDays);
    }
  }
  return days.sort((a, b) => a.date.localeCompare(b.date));
}

function streaks(days) {
  let longest = 0;
  let run = 0;
  for (const d of days) {
    run = d.contributionCount > 0 ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  // Today doesn't break the current streak until it's over.
  let i = days.length - 1;
  if (days[i]?.contributionCount === 0) i--;
  let current = 0;
  while (i >= 0 && days[i].contributionCount > 0) {
    current++;
    i--;
  }
  return { current, longest };
}

async function languages() {
  const totals = new Map();
  let repos = 0;
  let cursor = null;
  do {
    const data = await gql(
      `query($login:String!,$cursor:String){user(login:$login){repositories(ownerAffiliations:OWNER,isFork:false,first:100,after:$cursor){
        pageInfo{hasNextPage endCursor}
        nodes{languages(first:20,orderBy:{field:SIZE,direction:DESC}){edges{size node{name color}}}}}}}`,
      { login: USER, cursor },
    );
    const page = data.user.repositories;
    repos += page.nodes.length;
    for (const repo of page.nodes) {
      for (const { size, node } of repo.languages.edges) {
        if (SKIP_LANGS.has(node.name)) continue;
        // Square root per repo, so one repo with vendored bundles doesn't outweigh years of work.
        const prev = totals.get(node.name) ?? { size: 0, color: node.color };
        prev.size += Math.sqrt(size);
        totals.set(node.name, prev);
      }
    }
    cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (cursor);

  const all = [...totals].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.size - a.size);
  const sum = all.reduce((n, l) => n + l.size, 0);
  return { repos, langs: all.slice(0, TOP_LANGS).map((l) => ({ ...l, pct: (l.size / sum) * 100 })) };
}

// Same palette as tavo.dev (src/styles/global.css).
const THEMES = {
  light: { bg: '#FBFBFA', ink: '#161616', weak: '#555552', line: '#D6D6D2', fill: '#ECECE9' },
  dark: { bg: '#161616', ink: '#EDEDEA', weak: '#A8A8A3', line: '#3A3A38', fill: '#242423' },
};
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
const W = 420;
const H = 220;
const CUT = 14;

// Some language colors (Lua's navy, for example) disappear on the dark background.
function swatch(color, t) {
  if (!color) return t.weak;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16) / 255);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  if (t !== THEMES.dark || lum > 0.25) return color;
  const mix = (c) => Math.round((c + (1 - c) * 0.45) * 255).toString(16).padStart(2, '0');
  return `#${mix(r)}${mix(g)}${mix(b)}`;
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const num = (n) => n.toLocaleString('en-US');

function frame(t, title, body, label) {
  const shape = `M${CUT} 0.5H${W - 0.5}V${H - CUT}L${W - CUT} ${H - 0.5}H0.5V${CUT}Z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}">
<title>${esc(label)}</title>
<path d="${shape}" fill="${t.bg}" stroke="${t.line}"/>
<text x="24" y="40" font-family="${FONT}" font-size="17" font-weight="700" fill="${t.ink}">${esc(title)}</text>
${body}
</svg>
`;
}

function activityCard(t, s) {
  const rows = [
    ['Contributions, last 12 months', num(s.lastYear)],
    ['Commits, last 12 months', num(s.commits)],
    ['Current streak', `${num(s.current)} days`],
    ['Longest streak', `${num(s.longest)} days`],
    ['Repositories', num(s.repos)],
  ];
  const body = rows
    .map(([k, v], i) => {
      const y = 78 + i * 30;
      return `<text x="24" y="${y}" font-family="${FONT}" font-size="14" fill="${t.weak}">${esc(k)}</text>
<text x="${W - 24}" y="${y}" text-anchor="end" font-family="${FONT}" font-size="14" font-weight="700" fill="${t.ink}">${esc(v)}</text>`;
    })
    .join('\n');
  const label = rows.map(([k, v]) => `${k}: ${v}`).join('. ');
  return frame(t, 'Activity on GitHub', body, label);
}

function languagesCard(t, langs) {
  const barW = W - 48;
  let x = 24;
  const bar = langs
    .map((l) => {
      const w = Math.max((l.pct / 100) * barW, 2);
      const r = `<rect x="${x.toFixed(1)}" y="58" width="${w.toFixed(1)}" height="8" fill="${swatch(l.color, t)}"/>`;
      x += w;
      return r;
    })
    .join('\n');
  const legend = langs
    .map((l, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const lx = 24 + col * (barW / 2 + 12);
      const ly = 98 + row * 28;
      return `<rect x="${lx}" y="${ly - 10}" width="10" height="10" fill="${swatch(l.color, t)}"/>
<text x="${lx + 18}" y="${ly}" font-family="${FONT}" font-size="14" fill="${t.ink}">${esc(l.name)}</text>
<text x="${lx + barW / 2 - 12}" y="${ly}" text-anchor="end" font-family="${FONT}" font-size="14" fill="${t.weak}">${l.pct.toFixed(1)}%</text>`;
    })
    .join('\n');
  const label = 'Most used languages: ' + langs.map((l) => `${l.name} ${l.pct.toFixed(1)}%`).join(', ');
  return frame(t, 'Most used languages', `<rect x="24" y="58" width="${barW}" height="8" fill="${t.fill}"/>\n${bar}\n${legend}`, label);
}

const { user } = await gql(
  `query($login:String!){user(login:$login){createdAt contributionsCollection{
    totalCommitContributions contributionCalendar{totalContributions}}}}`,
  { login: USER },
);
const days = await calendarDays(user.createdAt);
const { repos, langs } = await languages();
const stats = {
  lastYear: user.contributionsCollection.contributionCalendar.totalContributions,
  commits: user.contributionsCollection.totalCommitContributions,
  repos,
  ...streaks(days),
};

await mkdir(OUT, { recursive: true });
for (const [name, t] of Object.entries(THEMES)) {
  await writeFile(new URL(`activity-${name}.svg`, OUT), activityCard(t, stats));
  await writeFile(new URL(`languages-${name}.svg`, OUT), languagesCard(t, langs));
}
console.log(stats, langs.map((l) => `${l.name} ${l.pct.toFixed(1)}%`).join(', '));
