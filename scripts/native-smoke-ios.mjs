import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { appendFileSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

// Never use a developer's local devices. This script is only for the disposable
// GitHub-hosted macOS runner, and every device command uses a private device set.
if (process.platform !== 'darwin' || process.env.GITHUB_ACTIONS !== 'true' || process.env.RUNNER_ENVIRONMENT !== 'github-hosted') {
  throw new Error('The iOS smoke test requires a disposable GitHub-hosted macOS runner.');
}

const appPath = resolve(process.argv[2] ?? 'build-ios/Build/Products/Debug-iphonesimulator/App.app');
const output = resolve(process.argv[3] ?? 'test-results/native-ios-smoke');
mkdirSync(output, { recursive: true });
const deviceSet = mkdtempSync(join(tmpdir(), 'agilitymanager-ios-smoke-'));
const commandsLog = join(output, 'commands.log');
const requestedRuntimeVersion = process.env.AGILITY_IOS_SIMULATOR_VERSION;
const requestedDeviceName = process.env.AGILITY_IOS_SIMULATOR_DEVICE;
const summary = {
  status: 'failed', commit: process.env.GITHUB_SHA ?? null, appPath,
  deviceSet, deviceId: null, runtime: null, deviceType: null,
  requestedSimulator: { version: requestedRuntimeVersion ?? null, device: requestedDeviceName ?? null },
  iosRuntimes: [],
  bundleId: null, version: null, build: null, processId: null,
  processAliveAfterLaunch: false, nativeCrashReports: [], screenshot: null, failedCommand: null,
  uiVerified: false,
  scope: 'First launch and survival of the native app process; screenshot needs visual inspection. No UI flow or physical-device verification.',
  warnings: [],
};
let deviceId;
let bundleId;
let executable;
let launchTime;
let booted = false;
let cleaned = false;
let failure;

function run(command, args, timeout = 15_000, optional = false) {
  const invocation = JSON.stringify([command, ...args]);
  const startedAt = Date.now();
  const start = `${new Date(startedAt).toISOString()} ${invocation} (timeout ${timeout} ms)`;
  console.log(`[iOS smoke] ${start}`);
  appendFileSync(commandsLog, `\n${start}\n`);
  const result = spawnSync(command, args, { encoding: 'utf8', timeout, killSignal: 'SIGKILL', maxBuffer: 8 * 1024 * 1024 });
  const elapsedMs = Date.now() - startedAt;
  const finished = `Finished after ${elapsedMs} ms; status=${result.status}, signal=${result.signal ?? 'none'}`;
  appendFileSync(commandsLog, `${result.stdout ?? ''}\n${result.stderr ?? ''}`);
  appendFileSync(commandsLog, `\n${finished}\n`);
  console.log(`[iOS smoke] ${finished}`);
  // Keep complete output in commands.log and bounded excerpts in the job log,
  // including partial boot progress when a command reaches its timeout.
  if (result.stdout) console.log(result.stdout.slice(-4_000));
  if (result.stderr) console.error(result.stderr.slice(-4_000));
  if (result.error || result.status !== 0) {
    const reason = result.error?.message ?? `exit ${result.status ?? result.signal}`;
    const error = new Error(`${invocation} failed after ${elapsedMs} ms (timeout ${timeout} ms): ${reason}`, { cause: result.error });
    appendFileSync(commandsLog, `\n${error.message}\n`);
    if (optional) {
      summary.warnings.push(error.message);
      return null;
    }
    summary.failedCommand = { command, args, timeoutMs: timeout, elapsedMs, status: result.status, signal: result.signal, errorCode: result.error?.code ?? null };
    throw error;
  }
  return result.stdout;
}

const simctl = (args, timeout, optional) => run('xcrun', ['simctl', '--set', deviceSet, ...args], timeout, optional);
const plist = (key) => run('/usr/libexec/PlistBuddy', ['-c', `Print :${key}`, join(appPath, 'Info.plist')]).trim();
const versionParts = (value) => String(value).split('.').map(Number);
function compareVersions(a, b) {
  const left = versionParts(a);
  const right = versionParts(b);
  for (let index = 0; index < Math.max(left.length, right.length); index++) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference) return difference;
  }
  return 0;
}

function assertAlive() {
  process.kill(summary.processId, 0);
  const command = run('/bin/ps', ['-p', String(summary.processId), '-o', 'comm=']).trim();
  if (basename(command) !== executable) throw new Error('The launched app process is no longer running.');
}

function screenshot() {
  const path = join(output, 'first-launch.png');
  simctl(['io', deviceId, 'screenshot', '--type=png', path], 20_000);
  if (!existsSync(path) || statSync(path).size === 0) throw new Error('The simulator produced no screenshot.');
  summary.screenshot = 'first-launch.png';
}

function deviceLogs(optional = false) {
  const predicate = summary.processId ? `processID == ${summary.processId}` : `process == ${JSON.stringify(executable ?? 'App')}`;
  const logs = simctl(['spawn', deviceId, 'log', 'show', '--last', '2m', '--style', 'compact', '--predicate', predicate], 20_000, optional);
  if (logs !== null) writeFileSync(join(output, 'native-app.log'), logs);
}

function collectCrashes() {
  if (!launchTime || !summary.processId) return;
  const roots = [
    join(deviceSet, deviceId, 'data/Library/Logs/CrashReporter'),
    join(homedir(), 'Library/Logs/DiagnosticReports'),
  ];
  const ownPid = new RegExp(`(?:"pid"\\s*:\\s*${summary.processId}(?=[,}\\s])|^Process:.*\\[${summary.processId}\\])`, 'm');
  for (const [index, root] of roots.entries()) {
    if (!existsSync(root)) continue;
    for (const file of readdirSync(root, { withFileTypes: true })) {
      if (!file.isFile() || !/\.(ips|crash)$/.test(file.name)) continue;
      const path = join(root, file.name);
      if (statSync(path).mtimeMs < launchTime) continue;
      const text = readFileSync(path, 'utf8');
      if (!ownPid.test(text) || !text.includes(bundleId)) continue;
      const name = `${index}-${file.name}`;
      mkdirSync(join(output, 'crashes'), { recursive: true });
      copyFileSync(path, join(output, 'crashes', name));
      if (!summary.nativeCrashReports.includes(name)) summary.nativeCrashReports.push(name);
    }
  }
}

function cleanup() {
  if (cleaned || !deviceId) return;
  cleaned = true;
  // Only the UUID returned by this run's create command is ever terminated,
  // shut down or deleted. No "booted", "all" or pre-existing device is used.
  if (bundleId && summary.processId) simctl(['terminate', deviceId, bundleId], 10_000, true);
  simctl(['shutdown', deviceId], 30_000, true);
  simctl(['delete', deviceId], 15_000, true);
}
process.once('SIGINT', () => { cleanup(); process.exit(130); });
process.once('SIGTERM', () => { cleanup(); process.exit(143); });
process.once('exit', cleanup);

try {
  if (!existsSync(join(appPath, 'Info.plist'))) throw new Error(`No simulator app at ${appPath}`);
  bundleId = plist('CFBundleIdentifier');
  executable = plist('CFBundleExecutable');
  const packaged = JSON.parse(readFileSync(join(appPath, 'capacitor.config.json'), 'utf8'));
  if (bundleId !== 'se.agilitymanager.app' || packaged.appId !== bundleId) throw new Error('Unexpected app identifier.');
  summary.bundleId = bundleId;
  summary.version = plist('CFBundleShortVersionString');
  summary.build = plist('CFBundleVersion');
  const expected = JSON.parse(readFileSync('mobile.version.json', 'utf8'));
  if (summary.version !== expected.version || summary.build !== String(expected.build)) throw new Error('The simulator app does not match mobile.version.json.');

  const { runtimes } = JSON.parse(simctl(['list', 'runtimes', '--json']));
  const iosRuntimes = runtimes.filter(item => item.identifier.startsWith('com.apple.CoreSimulator.SimRuntime.iOS-'));
  summary.iosRuntimes = iosRuntimes.map(item => ({
    name: item.name, version: item.version, identifier: item.identifier,
    isAvailable: item.isAvailable, availabilityError: item.availabilityError ?? null,
  }));
  console.log(`[iOS smoke] iOS runtime inventory: ${JSON.stringify(summary.iosRuntimes)}`);
  if (!requestedRuntimeVersion || !requestedDeviceName) {
    throw new Error('AGILITY_IOS_SIMULATOR_VERSION and AGILITY_IOS_SIMULATOR_DEVICE must explicitly select an installed simulator.');
  }
  const runtime = iosRuntimes.find(item => item.isAvailable && item.version === requestedRuntimeVersion);
  if (!runtime) throw new Error(`Requested iOS ${requestedRuntimeVersion} is not available on this runner.`);
  const { devicetypes } = JSON.parse(simctl(['list', 'devicetypes', '--json']));
  const deviceType = devicetypes.find(item => item.name === requestedDeviceName
    && (item.productFamily === 'iPhone' || item.name.startsWith('iPhone')));
  if (!deviceType) throw new Error(`Requested iPhone device type ${requestedDeviceName} is not installed on this runner.`);
  const inVersionRange = (!deviceType.minRuntimeVersionString || compareVersions(runtime.version, deviceType.minRuntimeVersionString) >= 0)
    && (!deviceType.maxRuntimeVersionString || compareVersions(runtime.version, deviceType.maxRuntimeVersionString) <= 0);
  const runtimeSupportsDevice = Array.isArray(runtime.supportedDeviceTypes)
    && runtime.supportedDeviceTypes.some(item => item.identifier === deviceType.identifier);
  if (!inVersionRange || !runtimeSupportsDevice) {
    throw new Error(`Requested ${requestedDeviceName} is not supported by installed iOS ${runtime.version}.`);
  }
  summary.runtime = { name: runtime.name, version: runtime.version, identifier: runtime.identifier };
  summary.deviceType = { name: deviceType.name, identifier: deviceType.identifier };
  console.log(`[iOS smoke] Selected ${runtime.name} (${runtime.version}), ${deviceType.name}; private device set ${deviceSet}`);
  const name = `AgilityManager-CI-${process.env.GITHUB_RUN_ID}-${randomUUID().slice(0, 8)}`;
  deviceId = simctl(['create', name, deviceType.identifier, runtime.identifier]).trim();
  if (!/^[0-9a-f-]{36}$/i.test(deviceId)) { deviceId = undefined; throw new Error('Create returned an invalid simulator UUID.'); }
  summary.deviceId = deviceId;
  simctl(['boot', deviceId]);
  // The first boot of a fresh private device set can include runtime setup.
  simctl(['bootstatus', deviceId, '-b'], 300_000);
  booted = true;
  simctl(['install', deviceId, appPath], 30_000);
  launchTime = Date.now();
  const launch = simctl(['launch', deviceId, bundleId], 20_000);
  const pid = launch.match(/:\s*(\d+)\s*$/)?.[1];
  if (!pid || Number(pid) <= 1) throw new Error('Launch returned no native app PID.');
  summary.processId = Number(pid);
  // Short survival window catches immediate native startup crashes. It does
  // not assert that the WebView rendered correctly or that controls work.
  for (let attempt = 0; attempt < 4; attempt++) { await delay(3_000); assertAlive(); }
  summary.processAliveAfterLaunch = true;
  screenshot();
  deviceLogs();
  collectCrashes();
  assertAlive();
  if (summary.nativeCrashReports.length) throw new Error('A native crash report was generated for the launched app.');
  summary.status = 'passed-native-first-launch-smoke';
} catch (error) {
  failure = error;
  summary.error = error.message;
} finally {
  try {
    if (deviceId && booted) {
      if (!summary.screenshot) { try { screenshot(); } catch (error) { summary.warnings.push(error.message); } }
      if (!existsSync(join(output, 'native-app.log'))) deviceLogs(true);
      try { collectCrashes(); } catch (error) { summary.warnings.push(error.message); }
      if (summary.nativeCrashReports.length && !failure) {
        failure = new Error('A native crash report was generated for the launched app.');
        summary.status = 'failed';
        summary.error = failure.message;
      }
    }
  } finally {
    cleanup();
    writeFileSync(join(output, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  }
}
if (failure) { console.error(`iOS first-launch smoke failed: ${failure.message}`); process.exitCode = 1; }
else console.log('Native first-launch smoke passed. Inspect first-launch.png; UI flows are not verified by this test.');
