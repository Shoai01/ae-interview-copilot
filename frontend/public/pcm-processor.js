/* global AudioWorkletProcessor, sampleRate, registerProcessor */

// Resamples mic audio to 16kHz mono Int16 (linear16) for Deepgram's raw PCM streaming mode.
// We resample manually instead of requesting a 16kHz AudioContext because browsers don't
// reliably honor an arbitrary requested sample rate.
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.targetRate = 16000;
    this.ratio = sampleRate / this.targetRate;
    this.inputPos = 0; // fractional read position, carried over between process() calls
    this.frameSamples = 320; // 20ms @ 16kHz
    this.outBuf = new Int16Array(this.frameSamples);
    this.outIdx = 0;
  }

  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (!channel || channel.length === 0) return true;

    let pos = this.inputPos;
    while (pos < channel.length) {
      const i0 = Math.floor(pos);
      const i1 = Math.min(i0 + 1, channel.length - 1);
      const frac = pos - i0;
      const sample = channel[i0] + (channel[i1] - channel[i0]) * frac;
      const clamped = Math.max(-1, Math.min(1, sample));
      this.outBuf[this.outIdx++] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;

      if (this.outIdx >= this.frameSamples) {
        this.port.postMessage(this.outBuf.buffer, [this.outBuf.buffer]);
        this.outBuf = new Int16Array(this.frameSamples);
        this.outIdx = 0;
      }

      pos += this.ratio;
    }
    this.inputPos = pos - channel.length;
    return true;
  }
}

registerProcessor('pcm-processor', PCMProcessor);
