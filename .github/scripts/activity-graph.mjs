// Gera dist/github-activity-graph.svg com as contribuições dos últimos 31 dias.
import { mkdir, writeFile } from "node:fs/promises";

const LOGIN = process.env.GITHUB_USER || "FireC4io";
const TOKEN = process.env.GITHUB_TOKEN;
const OUT = "dist/github-activity-graph.svg";
const DAYS = 31;

const query = `query($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar {
        weeks { contributionDays { date contributionCount } }
      }
    }
  }
}`;

const res = await fetch("https://api.github.com/graphql", {
  method: "POST",
  headers: { Authorization: `bearer ${TOKEN}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query, variables: { login: LOGIN } }),
});
const json = await res.json();
if (!res.ok || json.errors) throw new Error(JSON.stringify(json.errors || json));

const days = json.data.user.contributionsCollection.contributionCalendar.weeks
  .flatMap((w) => w.contributionDays)
  .slice(-DAYS);
const counts = days.map((d) => d.contributionCount);
const total = counts.reduce((a, b) => a + b, 0);

const W = 1000, H = 340;
const L = 56, R = 28, T = 76, B = 52;
const step = Math.max(1, Math.ceil(Math.max(...counts, 4) / 4));
const top = step * 4;
const x = (i) => L + (i * (W - L - R)) / (days.length - 1);
const y = (v) => T + (H - T - B) * (1 - v / top);

const pts = counts.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
const line = `M${pts.join(" L")}`;
const area = `${line} L${x(days.length - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z`;

const grid = [0, 1, 2, 3, 4].map((k) => {
  const v = k * step, yy = y(v).toFixed(1);
  return `<line x1="${L}" x2="${W - R}" y1="${yy}" y2="${yy}" stroke="#1f232c"/>` +
    `<text x="${L - 12}" y="${yy}" dy="4" text-anchor="end" class="axis">${v}</text>`;
}).join("");

const labels = days.map((d, i) => (i % 3 === 0 || i === days.length - 1)
  ? `<text x="${x(i).toFixed(1)}" y="${H - B + 24}" text-anchor="middle" class="axis">${d.date.slice(8)}/${d.date.slice(5, 7)}</text>`
  : "").join("");

const dots = counts.map((v, i) =>
  `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="3.5" fill="#0f1116" stroke="#4ade80" stroke-width="2"><title>${days[i].date}: ${v}</title></circle>`
).join("");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfico de atividade de ${LOGIN}">
<style>
  text { font-family: "Segoe UI", Ubuntu, "Helvetica Neue", sans-serif; }
  .title { fill: #f2f4f7; font-size: 20px; font-weight: 700; }
  .sub { fill: #8a919e; font-size: 13px; }
  .axis { fill: #5d6370; font-size: 11px; }
</style>
<defs>
  <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#4ade80" stop-opacity="0.35"/>
    <stop offset="1" stop-color="#4ade80" stop-opacity="0"/>
  </linearGradient>
</defs>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="12" fill="#0f1116" stroke="#1f232c"/>
<text x="${L - 28}" y="38" class="title">Caio's Contribution Graph</text>
<text x="${L - 28}" y="58" class="sub">${total} contribuições nos últimos ${DAYS} dias</text>
${grid}
<path d="${area}" fill="url(#fill)"/>
<path d="${line}" fill="none" stroke="#4ade80" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
${dots}
${labels}
</svg>
`;

await mkdir("dist", { recursive: true });
await writeFile(OUT, svg);
console.log(`${OUT}: ${total} contribuições em ${days.length} dias`);
