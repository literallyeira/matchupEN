/**
 * MatchUp Stress Test
 *
 * Kullanım:
 *   npm run stress-test              -> matchup.icu canlı
 *   npm run stress-test -- localhost -> localhost:3000
 *   node stress-test.js [base_url]
 *
 * Varsayılan: https://matchup.icu
 *
 * Not: Auth gerektiren endpoint'ler 401 dönecek ama
 * sunucu performansı (response time, throughput) ölçülebilir.
 */

const autocannon = require('autocannon');

const BASE = process.argv[2] || 'https://matchup.icu';

const endpoints = [
  { title: 'Homepage (SSR)', url: '/', duration: 10, connections: 20 },
  { title: 'Spotlight API', url: '/api/spotlight', duration: 10, connections: 30 },
  { title: 'Ads API', url: '/api/ads', duration: 10, connections: 30 },
  { title: 'Possible Matches (no auth)', url: '/api/possible-matches?characterId=1&limit=20', duration: 10, connections: 20 },
];

async function runTest(config) {
  return new Promise((resolve) => {
    const instance = autocannon({
      url: `${BASE}${config.url}`,
      connections: config.connections,
      duration: config.duration,
      pipelining: 1,
      title: config.title,
    }, (err, result) => {
      resolve(result);
    });
    autocannon.track(instance, { renderProgressBar: true });
  });
}

async function main() {
  console.log(`\n=== MatchUp Stress Test ===`);
  console.log(`Target: ${BASE}\n`);

  const results = [];

  for (const ep of endpoints) {
    console.log(`\n--- ${ep.title} ---`);
    const result = await runTest(ep);
    results.push({
      title: ep.title,
      url: ep.url,
      requests: result.requests.total,
      throughput: `${(result.throughput.total / 1024 / 1024).toFixed(2)} MB`,
      latency_avg: `${result.latency.average.toFixed(1)}ms`,
      latency_p99: `${result.latency.p99.toFixed(1)}ms`,
      errors: result.errors,
      timeouts: result.timeouts,
      non2xx: result.non2xx,
    });
  }

  console.log('\n\n=== SONUCLAR ===\n');
  console.table(results);

  const hasIssues = results.some(r => r.latency_p99 > 2000 || r.errors > 0 || r.timeouts > 0);
  if (hasIssues) {
    console.log('\n!! Bazi endpoint\'lerde yuksek latency veya hata var. Yukaridaki tabloya bak.');
  } else {
    console.log('\n Tum endpoint\'ler kabul edilebilir performans gosteriyor.');
  }
}

main().catch(console.error);
