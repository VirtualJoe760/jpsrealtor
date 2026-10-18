export function speakerTestWave(): Blob {
  const rate = 16000, count = rate / 2;
  const buffer = new ArrayBuffer(44 + count * 2), view = new DataView(buffer);
  const text = (offset: number, value: string) => [...value].forEach((character, index) => view.setUint8(offset + index, character.charCodeAt(0)));
  text(0, 'RIFF'); view.setUint32(4, buffer.byteLength - 8, true); text(8, 'WAVE');
  text(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, 1, true); view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true); text(36, 'data'); view.setUint32(40, count * 2, true);
  for (let index = 0; index < count; index++) {
    const envelope = Math.min(1, index / 400, (count - index) / 400);
    view.setInt16(44 + index * 2, Math.sin(2 * Math.PI * 440 * index / rate) * envelope * 2500, true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

/** Local diagnostics only. No recorder, upload, provider or call connection. */
export class BrowserAudioCheck {
  private generation = 0;
  private stream?: MediaStream;
  private context?: AudioContext;
  private source?: MediaStreamAudioSourceNode;
  private audio?: HTMLAudioElement;
  private url?: string;
  private interval?: ReturnType<typeof setInterval>;
  private timeout?: ReturnType<typeof setTimeout>;

  stop() {
    this.generation++;
    clearInterval(this.interval); clearTimeout(this.timeout);
    this.stream?.getTracks().forEach(track => track.stop()); this.stream = undefined;
    this.source?.disconnect(); this.source = undefined;
    void this.context?.close().catch(() => {}); this.context = undefined;
    this.audio?.pause(); this.audio = undefined;
    if (this.url) URL.revokeObjectURL(this.url);
    this.url = undefined;
  }

  async microphone(deviceId: string, onLevel: (level: number) => void, onEnd: () => void) {
    this.stop(); const generation = this.generation;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: deviceId ? { deviceId: { exact: deviceId } } : true, video: false });
    // A permission prompt can resolve after navigation or switching to phone mode.
    if (generation !== this.generation) { stream.getTracks().forEach(track => track.stop()); return; }
    this.stream = stream;
    try {
      this.context = new AudioContext();
      await this.context.resume();
      if (generation !== this.generation) return;
      const analyser = this.context.createAnalyser(); analyser.fftSize = 256;
      this.source = this.context.createMediaStreamSource(stream); this.source.connect(analyser);
      const samples = new Uint8Array(analyser.fftSize);
      this.interval = setInterval(() => {
        analyser.getByteTimeDomainData(samples);
        const rms = Math.sqrt(samples.reduce((sum, value) => sum + ((value - 128) / 128) ** 2, 0) / samples.length);
        onLevel(Math.min(100, Math.round(rms * 350)));
      }, 80);
      // Never connect the microphone to speakers; this avoids feedback.
      this.timeout = setTimeout(() => { this.stop(); onEnd(); }, 10_000);
    } catch (error) { if (generation === this.generation) this.stop(); throw error; }
  }

  async speaker(deviceId: string, onEnd: () => void) {
    this.stop(); const generation = this.generation;
    const audio = new Audio(); this.audio = audio;
    try {
      if (deviceId && typeof audio.setSinkId !== 'function') throw new Error('Choose the speaker in your system audio settings.');
      if (typeof audio.setSinkId === 'function') await audio.setSinkId(deviceId);
      if (generation !== this.generation) return;
      this.url = URL.createObjectURL(speakerTestWave()); audio.src = this.url;
      audio.onended = () => { if (generation === this.generation) { this.stop(); onEnd(); } };
      await audio.play();
      if (generation !== this.generation) return;
      this.timeout = setTimeout(() => { this.stop(); onEnd(); }, 2000);
    } catch (error) { if (generation === this.generation) this.stop(); throw error; }
  }
}
