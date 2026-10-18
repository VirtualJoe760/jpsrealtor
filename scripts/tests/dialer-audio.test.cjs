const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const root = 'F:/web-clients/joseph-sardella/jpsrealtor';
let tracksStopped = 0, closed = 0, disconnected = 0, paused = 0, played = 0, revoked = 0, constraints, pending;
let timers = new Map(), nextTimer = 1, sinkFailure = false;
const stream = () => ({ getTracks: () => [{ stop: () => tracksStopped++ }] });
class Context {
  resume = async () => {};
  close = async () => { closed++; };
  createAnalyser = () => ({ fftSize: 256, getByteTimeDomainData: array => array.fill(140) });
  createMediaStreamSource = () => ({ connect: () => {}, disconnect: () => disconnected++ });
}
class Audio {
  setSinkId = async id => { this.sinkId = id; if (sinkFailure) throw Error('No speaker permission'); };
  play = async () => { played++; };
  pause = () => paused++;
}
const moduleFixture = { exports: {} };
const code = ts.transpileModule(fs.readFileSync(root + '/src/lib/dialer/browser-audio.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
vm.runInNewContext(code, { module: moduleFixture, exports: moduleFixture.exports, Blob, AudioContext: Context, Audio,
  navigator: { mediaDevices: { getUserMedia: async input => { constraints = input; return pending ? pending : stream(); } } },
  URL: { createObjectURL: () => 'blob:fixture', revokeObjectURL: () => revoked++ },
  setInterval: fn => { const id = nextTimer++; timers.set(id, fn); return id; },
  setTimeout: fn => { const id = nextTimer++; timers.set(id, fn); return id; },
  clearInterval: id => timers.delete(id), clearTimeout: id => timers.delete(id),
});
const { BrowserAudioCheck, speakerTestWave } = moduleFixture.exports;
(async () => {
  const wave = speakerTestWave();
  const bytes = Buffer.from(await wave.arrayBuffer());
  assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
  assert.equal(bytes.length, 16044);
  const audio = new BrowserAudioCheck(); let level = 0, ended = 0;
  await audio.microphone('usb-mic', value => { level = value; }, () => ended++);
  assert.equal(constraints.audio.deviceId.exact, 'usb-mic'); assert.equal(constraints.video, false);
  const callbacks = [...timers.values()]; callbacks[0](); assert.ok(level > 0 && level <= 100);
  callbacks[1](); assert.equal(ended, 1); assert.equal(tracksStopped, 1); assert.equal(closed, 1);
  assert.equal(disconnected, 1); assert.equal(timers.size, 0);
  let grant; pending = new Promise(resolve => { grant = resolve; });
  const late = audio.microphone('', () => assert.fail('stale level'), () => assert.fail('stale completion'));
  audio.stop(); grant(stream()); await late; pending = null;
  assert.equal(tracksStopped, 2, 'late permission grant must immediately stop its tracks');
  await audio.speaker('usb-speaker', () => ended++);
  assert.equal(played, 1);
  [...timers.values()][0](); assert.equal(ended, 2); assert.equal(revoked, 1); assert.ok(paused > 0);
  sinkFailure = true;
  await assert.rejects(audio.speaker('removed-speaker', () => {}));
  assert.equal(played, 1, 'failed output selection must not silently play on another speaker');
  assert.equal(timers.size, 0);
  audio.stop(); audio.stop();
  console.log('PASS: local audio waveform, selected input, bounded meter, track/context cleanup, late permission cancellation and output failure. No hardware/provider access.');
})().catch(error => { console.error(error); process.exitCode = 1; });
