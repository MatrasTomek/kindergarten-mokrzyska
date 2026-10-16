import { DOCUMENT } from '@angular/common';
import { inject, Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SpeechService {
  private readonly win = inject(DOCUMENT).defaultView;
  readonly supported = !!this.win && 'speechSynthesis' in this.win && 'SpeechSynthesisUtterance' in this.win;
  readonly speaking = signal(false);
  private current: SpeechSynthesisUtterance | null = null;

  speak(text: string): void {
    if (!this.supported || !text.trim()) return;
    const synth = this.win!.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text.trim());
    u.lang = 'pl-PL';
    const voice = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith('pl'));
    if (voice) u.voice = voice;
    this.current = u;
    u.onend = u.onerror = () => {
      if (this.current === u) this.speaking.set(false);
    };
    this.speaking.set(true);
    synth.speak(u);
  }

  stop(): void {
    if (!this.supported) return;
    this.current = null;
    this.win!.speechSynthesis.cancel();
    this.speaking.set(false);
  }
}
