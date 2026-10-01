import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

// The emulator action owns lifecycle on a disposable runner. This script never
// selects a default device and refuses local or self-hosted machines.
if (process.platform !== 'linux' || process.env.GITHUB_ACTIONS !== 'true' || process.env.RUNNER_ENVIRONMENT !== 'github-hosted') {
  throw new Error('The Android smoke test requires a disposable GitHub-hosted Linux runner.');
}
const avdName = process.env.AGILITY_CI_AVD;
const port = process.env.EMULATOR_PORT;
if (!/^agilitymanager-ci-\d+-\d+$/.test(avdName ?? '') || !/^\d+$/.test(port ?? '')) {
  throw new Error('The Android smoke test requires its unique CI AVD name and emulator port.');
}
const serial = `emulator-${port}`;
if (process.env.ANDROID_SERIAL !== serial) throw new Error('Unexpected emulator serial.');

const packageId = 'se.agilitymanager.app';
const input = resolve(process.argv[2] ?? 'android-smoke-package');
const output = resolve(process.argv[3] ?? 'test-results/native-android-smoke');
mkdirSync(output, { recursive: true });
const commandsLog = join(output, 'commands.log');
const summary = {
  status: 'failed', commit: process.env.GITHUB_SHA ?? null,
  packageId, avdName, serial, apiLevel: null, apk: null, apkSha256: null,
  version: null, build: null, processId: null,
  processAliveAfterLaunch: false, nativeCrashDetected: false, anrDetected: false,
  screenshot: null, uiVerified: false,
  scope: 'First launch and survival of the native app process; screenshot needs visual inspection. No UI flow or physical-device verification.',
  warnings: [],
};
let ownsEmulator = false;
let installed = false;
let logsCleared = false;
let cleaned = false;
let failure;

function adb(args, { timeout = 15_000, optional = false, binary = false } = {}) {
  const command = ['-s', serial, ...args];
  appendFileSync(commandsLog, `\n${new Date().toISOString()} ${JSON.stringify(['adb', ...command])}\n`);
  const result = spawnSync('adb', command, {
    encoding: binary ? undefined : 'utf8', timeout, killSignal: 'SIGKILL', maxBuffer: 16 * 1024 * 1024,
  });
  appendFileSync(commandsLog, `${binary ? `[binary output: ${result.stdout?.length ?? 0} bytes]` : result.stdout ?? ''}\n${result.stderr ?? ''}`);
  if (result.error || result.status !== 0) {
    const error = result.error ?? new Error(`adb exited with ${result.status ?? result.signal}`);
    appendFileSync(commandsLog, `\n${error.message}\n`);
    if (optional) { summary.warnings.push(error.message); return null; }
    throw error;
  }
  return result.stdout;
}

function findApks(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return findApks(path);
    return entry.isFile() && entry.name.endsWith('.apk') ? [path] : [];
  });
}

function assertAlive() {
  const pid = adb(['shell', 'pidof', '-s', packageId]).trim();
  if (pid !== String(summary.processId)) throw new Error('The launched native app process exited or restarted.');
}

function screenshot() {
  const bytes = adb(['exec-out', 'screencap', '-p'], { timeout: 20_000, binary: true });
  if (!Buffer.isBuffer(bytes) || !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    throw new Error('The emulator produced no PNG screenshot.');
  }
  writeFileSync(join(output, 'first-launch.png'), bytes);
  summary.screenshot = 'first-launch.png';
}

function deviceLogs(optional = false) {
  const logs = adb(['logcat', '-d', '-v', 'threadtime'], { timeout: 20_000, optional });
  if (logs !== null) {
    writeFileSync(join(output, 'device.log'), logs);
    summary.anrDetected ||= /ANR in se\.agilitymanager\.app(?:\s|:|$)/m.test(logs);
  }
  const crashes = adb(['logcat', '-b', 'crash', '-d', '-v', 'threadtime'], { timeout: 20_000, optional });
  if (crashes !== null) {
    writeFileSync(join(output, 'native-crash.log'), crashes);
    summary.nativeCrashDetected ||= /\bse\.agilitymanager\.app\b/.test(crashes);
  }
  if (summary.processId) {
    const appLogs = adb(['logcat', `--pid=${summary.processId}`, '-d', '-v', 'threadtime'], { timeout: 20_000, optional });
    if (appLogs !== null) writeFileSync(join(output, 'native-app.log'), appLogs);
  }
}

function cleanup() {
  if (cleaned || !ownsEmulator || !installed) return;
  cleaned = true;
  // Stop only our package on the exact AVD verified below. Emulator shutdown
  // remains the emulator-runner action's responsibility, including failures.
  adb(['shell', 'am', 'force-stop', packageId], { timeout: 10_000, optional: true });
}
process.once('SIGINT', () => { cleanup(); process.exit(130); });
process.once('SIGTERM', () => { cleanup(); process.exit(143); });
process.once('exit', cleanup);

try {
  const actualName = adb(['emu', 'avd', 'name']).split(/\r?\n/)[0].trim();
  if (actualName !== avdName) throw new Error('The selected emulator is not this run\'s AVD.');
  if (adb(['shell', 'getprop', 'ro.kernel.qemu']).trim() !== '1') throw new Error('The selected device is not an emulator.');
  if (adb(['shell', 'getprop', 'sys.boot_completed']).trim() !== '1') throw new Error('The emulator has not finished booting.');
  summary.apiLevel = adb(['shell', 'getprop', 'ro.build.version.sdk']).trim();
  if (summary.apiLevel !== '36') throw new Error('The smoke test requires the API 36 emulator.');
  ownsEmulator = true;

  const apks = findApks(input);
  if (apks.length !== 1) throw new Error(`Expected exactly one APK from this run, found ${apks.length}.`);
  summary.apk = apks[0];
  summary.apkSha256 = createHash('sha256').update(readFileSync(apks[0])).digest('hex');
  const install = adb(['install', '--no-streaming', '-r', apks[0]], { timeout: 60_000 });
  if (!/\bSuccess\b/.test(install)) throw new Error('APK installation did not report success.');
  installed = true;
  const packageDetails = adb(['shell', 'dumpsys', 'package', packageId]);
  writeFileSync(join(output, 'installed-package.log'), packageDetails);
  summary.version = packageDetails.match(/\bversionName=(\S+)/)?.[1] ?? null;
  summary.build = packageDetails.match(/\bversionCode=(\d+)/)?.[1] ?? null;
  const expected = JSON.parse(readFileSync('mobile.version.json', 'utf8'));
  if (summary.version !== expected.version || summary.build !== String(expected.build)) {
    throw new Error('The installed APK does not match mobile.version.json.');
  }

  // Clear only this new CI AVD's logs so crash evidence belongs to this launch.
  adb(['logcat', '-b', 'all', '-c']);
  logsCleared = true;
  const launch = adb(['shell', 'am', 'start', '-W', '-S', '-n', `${packageId}/.MainActivity`], { timeout: 30_000 });
  if (!/^Status:\s*ok\s*$/m.test(launch) || /^Error:/m.test(launch)) throw new Error('The native activity did not launch successfully.');
  const pid = adb(['shell', 'pidof', '-s', packageId]).trim();
  if (!/^\d+$/.test(pid) || Number(pid) <= 1) throw new Error('Launch returned no native app PID.');
  summary.processId = Number(pid);
  // A stable PID catches immediate native crashes, not WebView rendering bugs.
  for (let attempt = 0; attempt < 4; attempt++) { await delay(3_000); assertAlive(); }
  summary.processAliveAfterLaunch = true;
  screenshot();
  deviceLogs();
  assertAlive();
  if (summary.nativeCrashDetected || summary.anrDetected) throw new Error('A native crash or ANR was logged for the launched app.');
  summary.status = 'passed-native-first-launch-smoke';
} catch (error) {
  failure = error;
  summary.error = error.message;
} finally {
  try {
    if (ownsEmulator) {
      if (!summary.screenshot) { try { screenshot(); } catch (error) { summary.warnings.push(error.message); } }
      if (logsCleared && !existsSync(join(output, 'native-crash.log'))) deviceLogs(true);
      if ((summary.nativeCrashDetected || summary.anrDetected) && !failure) {
        failure = new Error('A native crash or ANR was logged for the launched app.');
        summary.status = 'failed';
        summary.error = failure.message;
      }
    }
  } finally {
    cleanup();
    writeFileSync(join(output, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  }
}
if (failure) { console.error(`Android first-launch smoke failed: ${failure.message}`); process.exitCode = 1; }
else console.log('Native first-launch smoke passed. Inspect first-launch.png; UI flows are not verified by this test.');
