'use client';

import { useEffect, useRef, useState } from 'react';
import { Headphones, Mic, Smartphone, Volume2, X } from 'lucide-react';
import { BrowserAudioCheck } from '@/lib/dialer/browser-audio';

type AudioMode = 'browser' | 'phone';
const STORAGE = 'dialer-audio-v1';

export default function DialerAudioSettings({ isLight, locked, inline = false }: { isLight: boolean; locked: boolean; inline?: boolean }) {
  const [open, setOpen] = useState(false), [mode, setMode] = useState<AudioMode>('browser');
  const [input, setInput] = useState(''), [output, setOutput] = useState('');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [capable, setCapable] = useState(false), [sink, setSink] = useState(false), [picker, setPicker] = useState(false);
  const [test, setTest] = useState<'microphone' | 'speaker' | null>(null), [level, setLevel] = useState(0);
  const [notice, setNotice] = useState('No microphone access until you choose Test microphone.');
  const check = useRef<BrowserAudioCheck | null>(null), epoch = useRef(0), mounted = useRef(false);
  const field = isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-[#141b29]';
  const muted = isLight ? 'text-slate-500' : 'text-slate-400';
  const action = `min-h-11 rounded-xl border px-3 py-2 text-sm disabled:opacity-40 ${field}`;

  function stop() { epoch.current++; check.current?.stop(); setTest(null); setLevel(0); }
  async function refresh() {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const available = await navigator.mediaDevices.enumerateDevices();
      if (!mounted.current) return;
      setDevices(available.filter(device => device.kind === 'audioinput' || device.kind === 'audiooutput'));
      setInput(value => available.some(device => device.kind === 'audioinput' && device.deviceId === value) ? value : '');
      setOutput(value => available.some(device => device.kind === 'audiooutput' && device.deviceId === value) ? value : '');
    } catch { if (mounted.current) setNotice('Audio devices could not be listed. Check browser permissions and refresh.'); }
  }
  useEffect(() => {
    mounted.current = true; check.current = new BrowserAudioCheck();
    setCapable(window.isSecureContext && !!navigator.mediaDevices?.getUserMedia);
    setSink(typeof HTMLMediaElement.prototype.setSinkId === 'function');
    setPicker(typeof (navigator.mediaDevices as MediaDevices & { selectAudioOutput?: unknown })?.selectAudioOutput === 'function');
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE) || '{}');
      setMode(saved.mode === 'phone' ? 'phone' : 'browser');
      if (typeof saved.input === 'string') setInput(saved.input);
      if (typeof saved.output === 'string') setOutput(saved.output);
    } catch { /* Device preferences are optional in private browsing. */ }
    void refresh();
    navigator.mediaDevices?.addEventListener('devicechange', refresh);
    const hidden = () => { if (document.hidden) { stop(); setNotice('Audio test stopped while the page was hidden.'); } };
    document.addEventListener('visibilitychange', hidden);
    return () => {
      mounted.current = false; epoch.current++; check.current?.stop();
      navigator.mediaDevices?.removeEventListener('devicechange', refresh);
      document.removeEventListener('visibilitychange', hidden);
    };
  }, []);
  // Store only intentional selections, not initial hydration defaults.
  function remember(nextMode: AudioMode, nextInput = input, nextOutput = output) {
    stop(); setMode(nextMode); setInput(nextInput); setOutput(nextOutput);
    try { localStorage.setItem(STORAGE, JSON.stringify({ mode: nextMode, input: nextInput, output: nextOutput })); } catch {}
    setNotice(nextMode === 'phone' ? 'Phone audio is planned. No phone has been connected.' : 'Device preference saved for this browser. Live call audio is not connected yet.');
  }
  useEffect(() => { if (locked) stop(); }, [locked]);

  async function run(kind: 'microphone' | 'speaker') {
    stop(); const request = epoch.current;
    setTest(kind); setNotice(kind === 'microphone' ? 'Allow microphone access, then speak. Test ends after 10 seconds; nothing is recorded or uploaded.' : 'Playing a quiet test tone on the selected speaker.');
    const ended = () => { if (mounted.current && request === epoch.current) { setTest(null); setLevel(0); setNotice('Audio test finished.'); } };
    try {
      if (kind === 'microphone') {
        await check.current?.microphone(input, value => { if (mounted.current && request === epoch.current) setLevel(value); }, ended);
        if (request === epoch.current) await refresh();
      } else await check.current?.speaker(output, ended);
    } catch {
      if (mounted.current && request === epoch.current) { stop(); setNotice('Audio test could not start. Check permissions, device availability and system audio settings.'); }
    }
  }
  async function chooseSpeaker() {
    const media = navigator.mediaDevices as MediaDevices & { selectAudioOutput?: () => Promise<MediaDeviceInfo> };
    if (!media.selectAudioOutput) return;
    stop(); const request = epoch.current;
    try {
      const device = await media.selectAudioOutput();
      if (!mounted.current || request !== epoch.current) return;
      await refresh();
      if (!mounted.current || request !== epoch.current) return;
      remember('browser', input, device.deviceId);
      setDevices(previous => previous.some(item => item.deviceId === device.deviceId && item.kind === 'audiooutput') ? previous : [...previous, device]);
    } catch { if (mounted.current && request === epoch.current) setNotice('Speaker selection was cancelled or is unavailable.'); }
  }

  return <div className="mb-3">
    {!inline && <button type="button" aria-expanded={open} aria-controls="dialer-audio-settings" onClick={() => { if (open) stop(); setOpen(!open); }} className={`${action} inline-flex items-center gap-2`}>
      {mode === 'browser' ? <Headphones size={16} /> : <Smartphone size={16} />} Audio & devices <span className={`text-xs ${muted}`}>{mode === 'browser' ? 'Browser' : 'Phone · planned'}</span>
    </button>}
    {(inline || open) && <section id="dialer-audio-settings" aria-label="Audio and connection settings" className={`mt-2 rounded-2xl border p-4 sm:p-5 ${field}`}>
      <div className="mb-3 flex items-center justify-between gap-3"><h3 className="font-semibold">How do you want to talk?</h3>{!inline && <button aria-label="Close audio settings" className="min-h-11 min-w-11" onClick={() => { stop(); setOpen(false); }}><X size={18} /></button>}</div>
      <fieldset disabled={locked}><legend className="sr-only">Agent audio connection</legend><div className="grid grid-cols-2 gap-2">
        {(['browser', 'phone'] as const).map(value => <button key={value} type="button" aria-pressed={mode === value} onClick={() => remember(value)} className={`${action} text-left ${mode === value ? 'ring-2 ring-emerald-500' : ''}`}><span className="flex items-center gap-2 font-semibold">{value === 'browser' ? <Headphones size={17} /> : <Smartphone size={17} />}{value === 'browser' ? 'This device' : 'My phone'}</span><span className={`mt-1 block text-xs ${muted}`}>{value === 'browser' ? 'Microphone & speakers' : 'Call me or dial in · Planned'}</span></button>)}
      </div></fieldset>
      {locked && <p className={`mt-2 text-xs ${muted}`}>Audio changes are locked during an attempt.</p>}
      {mode === 'browser' ? <>
        <fieldset disabled={locked || !capable} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium">Microphone<select aria-label="Microphone" value={input} onChange={event => remember(mode, event.target.value, output)} className={`${action} mt-2 w-full text-base`}><option value="">System default microphone</option>{devices.filter(device => device.kind === 'audioinput' && device.deviceId && device.deviceId !== 'default').map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `Microphone ${index + 1}`}</option>)}</select></label>
          <label className="text-sm font-medium">Speaker<select aria-label="Speaker" value={output} disabled={!sink} onChange={event => remember(mode, input, event.target.value)} className={`${action} mt-2 w-full text-base`}><option value="">System default speaker</option>{devices.filter(device => device.kind === 'audiooutput' && device.deviceId && device.deviceId !== 'default').map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `Speaker ${index + 1}`}</option>)}</select></label>
        </fieldset>
        <div className="mt-3 flex flex-wrap gap-2"><button disabled={locked || !capable || !!test} className={action} onClick={() => void run('microphone')}><Mic size={14} className="mr-2 inline" />Test microphone</button><button disabled={locked || !capable || !!test} className={action} onClick={() => void run('speaker')}><Volume2 size={14} className="mr-2 inline" />Test speaker</button>{picker && sink && <button disabled={locked || !!test} className={action} onClick={() => void chooseSpeaker()}>Choose another speaker</button>}<button disabled={locked || !capable || !!test} className={action} onClick={() => void refresh()}>Refresh devices</button>{test && <button className={action} onClick={() => { stop(); setNotice('Audio test stopped.'); }}>Stop test</button>}</div>
        {test === 'microphone' && <div role="meter" aria-label="Microphone level" aria-valuemin={0} aria-valuemax={100} aria-valuenow={level} className={`mt-3 h-2 overflow-hidden rounded-full ${isLight ? 'bg-slate-100' : 'bg-slate-800'}`}><div className="h-full bg-emerald-500 transition-[width]" style={{ width: `${level}%` }} /></div>}
        <p className={`mt-3 text-xs ${muted}`}>{!capable ? 'Device tests need HTTPS or localhost and browser microphone support.' : !sink ? 'This browser uses your system audio route. Choose speaker, earpiece or Bluetooth in your phone/device settings.' : 'Microphone permission reveals available device names. Speaker access depends on browser permission.'}</p>
        <p className={`mt-2 text-xs ${muted}`}>On mobile, keep browser calling in the foreground. Phone audio will let the cellular call carry the conversation while you use the contact page.</p>
      </> : <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className={`rounded-xl border p-4 ${field}`}><h4 className="text-sm font-semibold">Call my phone</h4><p className={`mt-2 text-sm ${muted}`}>Answer one agent call on your verified mobile number. Stay connected as the dialer moves through your list.</p><button disabled className={`${action} mt-3`}>Phone bridge coming soon</button></div>
        <div className={`rounded-xl border p-4 ${field}`}><h4 className="text-sm font-semibold">Dial in from my phone</h4><p className={`mt-2 text-sm ${muted}`}>Call the dial-in number and enter a temporary session code. On mobile, a tap will open your phone app.</p><button disabled className={`${action} mt-3`}>Dial-in setup coming soon</button></div>
        <p className={`text-xs sm:col-span-2 ${muted}`}>Phone connection is not live yet. It requires a separate agent call leg and adds provider usage; your public callback number stays separate from the phone you answer on.</p>
      </div>}
      <p role="status" aria-live="polite" className={`mt-3 text-sm ${muted}`}>{notice}</p>
    </section>}
  </div>;
}
