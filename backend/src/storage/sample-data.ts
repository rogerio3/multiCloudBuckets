/**
 * Generates realistic sample log files for the mock storage provider so the
 * app can be developed and evaluated without cloud credentials.
 */

interface SampleFile {
  key: string;
  content: string;
}

const APP_MESSAGES = [
  'INFO  request handled method=GET path=/api/orders status=200 duration_ms=42',
  'INFO  request handled method=POST path=/api/orders status=201 duration_ms=87',
  'DEBUG cache hit key=product:42 ttl=300',
  'INFO  job completed name=email-dispatch processed=134 failed=0',
  'WARN  slow query detected query="SELECT * FROM orders" duration_ms=812',
  'INFO  request handled method=GET path=/api/users status=200 duration_ms=31',
  'DEBUG connection pool size=10 idle=6 active=4',
  'INFO  scheduled task started name=report-generation',
  'WARN  retrying upstream call attempt=2 url=https://payments.internal/charge',
  'INFO  request handled method=DELETE path=/api/sessions status=204 duration_ms=18',
];

const AUTH_MESSAGES = [
  'INFO  login success user=admin ip=10.0.4.17',
  'INFO  login success user=viewer ip=10.0.4.23',
  'WARN  login failure user=admin reason=invalid-password ip=203.0.113.9',
  'WARN  login failure user=root reason=unknown-user ip=198.51.100.77',
  'INFO  token issued user=viewer expires_in=28800',
  'WARN  brute-force lockout ip=203.0.113.9 threshold=5 window=60s',
  'INFO  password changed user=admin',
  'INFO  logout user=viewer',
];

const SYSTEM_MESSAGES = [
  'INFO  cpu usage=23% load_avg=0.81,0.67,0.55',
  'INFO  memory usage=61% used_mb=3920 total_mb=6436',
  'INFO  disk usage=44% mount=/var/log free_gb=112',
  'WARN  memory usage=89% used_mb=5730 total_mb=6436',
  'INFO  process restarted name=log-worker pid=42117',
  'ERROR out-of-memory killer invoked process=legacy-importer pid=31771',
  'INFO  network interface eth0 rx_mb=1420 tx_mb=380',
];

const ERROR_MESSAGES = [
  'ERROR unhandled exception: TypeError: Cannot read properties of undefined (reading "id")\n    at OrderService.getOrder (/app/src/services/order.js:42:11)\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)',
  'ERROR database connection lost: ECONNRESET — retrying in 5s (attempt 1/5)',
  'ERROR upstream timeout url=https://inventory.internal/api stock-check timeout_ms=3000',
  'ERROR payment declined order_id=9f3a2 reason=insufficient_funds',
  'ERROR failed to write audit event: ENOSPC: no space left on device',
  'ERROR uncaught promise rejection: Error: socket hang up',
];

const NGINX_MESSAGES = [
  '203.0.113.42 - - [{ts}] "GET / HTTP/1.1" 200 612 "-" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"',
  '10.0.4.17 - - [{ts}] "POST /api/auth/login HTTP/1.1" 200 238 "https://logs.example.com/login" "Mozilla/5.0"',
  '10.0.4.23 - - [{ts}] "GET /api/logs HTTP/1.1" 200 4213 "https://logs.example.com/logs" "Mozilla/5.0"',
  '198.51.100.77 - - [{ts}] "GET /api/logs/2024-01-15-app.log/download HTTP/1.1" 401 54 "-" "curl/8.4.0"',
  '10.0.4.23 - - [{ts}] "GET /health HTTP/1.1" 200 15 "-" "kube-probe/1.29"',
  '203.0.113.9 - - [{ts}] "GET /admin HTTP/1.1" 404 153 "-" "sqlmap/1.7"',
];

const LOG_KINDS: Array<{ label: string; messages: string[]; isoTimestamps: boolean }> = [
  { label: 'app', messages: APP_MESSAGES, isoTimestamps: true },
  { label: 'auth', messages: AUTH_MESSAGES, isoTimestamps: true },
  { label: 'system', messages: SYSTEM_MESSAGES, isoTimestamps: true },
  { label: 'error', messages: ERROR_MESSAGES, isoTimestamps: true },
  { label: 'nginx-access', messages: NGINX_MESSAGES, isoTimestamps: false },
];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Builds the content of one log file: lines spread across the given date. */
function buildContent(date: string, kind: (typeof LOG_KINDS)[number], seed: number): string {
  const lines: string[] = [];
  const lineCount = 60 + ((seed * 13) % 90); // 60–149 lines, deterministic per file
  const base = new Date(`${date}T00:00:00.000Z`).getTime();

  for (let i = 0; i < lineCount; i++) {
    const ts = new Date(base + i * 600_000 + ((seed * 7 + i * 31) % 45) * 1000);
    const stamp = kind.isoTimestamps
      ? ts.toISOString()
      : `${pad(ts.getUTCDate())}/${ts.toUTCString().slice(5, 11)}/${ts.getUTCFullYear()}:${pad(ts.getUTCHours())}:${pad(ts.getUTCMinutes())}:${pad(ts.getUTCSeconds())} +0000`;
    const message = kind.messages[(seed + i * 3) % kind.messages.length].replace('{ts}', stamp);
    if (kind.label === 'nginx-access') {
      lines.push(message.replace('{ts}', stamp));
    } else {
      const level = message.slice(0, 5).trim();
      const rest = message.slice(5).trim();
      lines.push(`${stamp} ${level.padEnd(5)} [pid=${1000 + seed}] ${rest}`);
    }
  }
  return lines.join('\n') + '\n';
}

/** Returns the full set of sample files seeded by the mock provider. */
export function generateSampleFiles(now: Date = new Date()): SampleFile[] {
  const files: SampleFile[] = [];
  const dates: string[] = [];

  for (let daysAgo = 4; daysAgo >= 0; daysAgo--) {
    const d = new Date(now.getTime() - daysAgo * 86_400_000);
    dates.push(
      `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`,
    );
  }

  dates.forEach((date, dateIdx) => {
    LOG_KINDS.forEach((kind, kindIdx) => {
      files.push({
        key: `${date}-${kind.label}.log`,
        content: buildContent(date, kind, dateIdx * 10 + kindIdx),
      });
    });
  });

  // A couple of nested keys to demonstrate prefix filtering with slashes.
  files.push({
    key: `archive/${dates[0]}-app.log`,
    content: buildContent(dates[0], LOG_KINDS[0], 99),
  });
  files.push({
    key: `archive/${dates[1]}-error.log`,
    content: buildContent(dates[1], LOG_KINDS[3], 77),
  });

  return files;
}