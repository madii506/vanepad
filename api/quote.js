// The ten names a vane can buy, from Yahoo Finance's public chart endpoint: last price, previous close, today's 15-minute closes.
// Yahoo answers Vercel; if it refuses, the response says so and carries the last snapshot we read (2026-09-18 close), stamped — never a made-up number.
const LIST = ['NVDA','AAPL','MSFT','AMZN','GOOGL','AVGO','GOOG','META','MU','TSLA'];
const NAMES = { NVDA:'NVIDIA', AAPL:'Apple', MSFT:'Microsoft', AMZN:'Amazon', GOOGL:'Alphabet A', AVGO:'Broadcom', GOOG:'Alphabet C', META:'Meta Platforms', MU:'Micron', TSLA:'Tesla' };
const SNAP = {
  NVDA:[222.27,219.3,[224.4,228.4,230.4,225.7,223.7,218.4,218.3,211,212.2,213.9,219.3,222.27]],
  AAPL:[336.13,337,[325,328.2,320,316.2,315.3,326.6,332.3,333.1,331.3,332.4,337,336.13]],
  MSFT:[493.78,497.8,[496.8,510.1,499.7,494,491.6,492.4,495.6,505.4,497.1,490.3,497.8,493.78]],
  AMZN:[253.71,251.2,[255,258.9,258.5,257,252.4,251.9,256.8,253.5,248.4,246,251.2,253.71]],
  GOOGL:[349.54,347.3,[337.1,342.5,338.5,338.4,330.6,332.6,338.5,349.4,345,342.9,347.3,349.54]],
  AVGO:[357.61,347.3,[367.2,357.2,357.9,368.6,364.4,360.8,362,344.7,339.3,339.5,347.3,357.61]],
  GOOG:[344.41,343.7,[333.8,339.1,335.3,335.4,328.4,330.4,335.5,345.7,341.4,339.4,343.7,344.41]],
  META:[665.75,682.3,[592.8,610.7,616.8,613.5,653.7,644.4,648,665.6,670.2,673.3,682.3,665.75]],
  MU:[1015.8,977.5,[956.1,958.2,1016.6,1000.3,1027.8,977.4,975.3,924,927.6,926.5,977.5,1015.8]],
  TSLA:[364.27,366.2,[357,376.4,354.1,368.2,367.8,363.6,365.4,359,356.6,358.1,366.2,364.27]],
};
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
async function yahoo(tk) {
  const ac = new AbortController(); const timer = setTimeout(() => ac.abort(), 4000);
  const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${tk}?range=1d&interval=15m`, { headers: { 'user-agent': UA, accept: 'application/json' }, signal: ac.signal }).finally(() => clearTimeout(timer));
  if (!r.ok) throw new Error('yahoo ' + r.status);
  const j = await r.json(); const res = j.chart && j.chart.result && j.chart.result[0];
  if (!res || !res.meta) throw new Error('no result');
  const closes = ((res.indicators && res.indicators.quote && res.indicators.quote[0] && res.indicators.quote[0].close) || []).filter(x => x != null).map(x => +x.toFixed(2));
  return { price: res.meta.regularMarketPrice, prev: res.meta.chartPreviousClose, closes, t: res.meta.regularMarketTime };
}
export default async function handler(req, res) {
  const want = String((req.query && req.query.t) || '').toUpperCase().split(',').filter(t => LIST.includes(t));
  const tks = want.length ? want : LIST;
  const quotes = {}; let live = 0; let latest = 0;
  await Promise.all(tks.map(async tk => {
    try { const q = await yahoo(tk); quotes[tk] = { ...q, name: NAMES[tk], live: true }; live++; latest = Math.max(latest, q.t || 0); }
    catch (e) { const s = SNAP[tk]; quotes[tk] = { price: s[0], prev: s[1], closes: s[2], name: NAMES[tk], live: false, asof: '2026-09-18' }; }
  }));
  const ordered = {}; tks.forEach(t => { ordered[t] = quotes[t]; });
  res.setHeader('cache-control', 'public, s-maxage=60, stale-while-revalidate=300');
  return res.status(200).json({ ok: true, list: LIST, names: NAMES, quotes: ordered, live, of: tks.length, via: live ? 'Yahoo Finance chart API' : 'snapshot 2026-09-18 (Yahoo refused the server read)', t: latest || null });
}
