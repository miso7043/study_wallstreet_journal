export class Player {
  constructor(synth, createUtterance, changed) {
    this.synth = synth; this.createUtterance = createUtterance; this.changed = changed;
    this.sentences = []; this.index = 0; this.mode = 'all'; this.state = 'stopped'; this.rate = 1; this.token = 0;
  }
  emit(message) { this.changed(this, message); }
  cancel() { this.token++; this.synth?.cancel(); }
  load(sentences) { this.stop(); this.sentences = sentences; this.emit('재생할 문장을 선택하거나 재생 버튼을 누르세요.'); }
  setMode(mode) { this.mode = this.mode === mode ? 'none' : mode; this.emit(this.mode === 'all' ? '전체 반복 켜짐' : this.mode === 'one' ? '한 문장 반복 켜짐' : '반복 꺼짐 · 순차 재생'); }
  stop() { this.cancel(); this.index = 0; this.state = 'stopped'; this.emit('정지 · 첫 문장으로 돌아왔습니다.'); }
  click(index) { if (!this.sentences[index]) return; this.mode = 'none'; this.cancel(); this.index = index; this.speak(); }
  toggle() {
    if (this.state === 'playing') { this.synth.pause(); this.state = 'paused'; this.emit('일시정지'); }
    else if (this.state === 'paused') { this.synth.resume(); this.state = 'playing'; this.emit('이어 읽는 중'); }
    else this.speak();
  }
  speak() {
    if (!this.sentences.length) return;
    const voices = this.synth?.getVoices().filter(v => /^en(?:[-_]|$)/i.test(v.lang)) ?? [];
    if (!voices.length) { this.state = 'stopped'; this.emit('영어 음성이 없습니다. 기기의 영어 음성을 설치한 뒤 다시 시도하세요.'); return; }
    const token = ++this.token;
    const u = this.createUtterance(this.sentences[this.index].en);
    const voice = voices[Math.floor(Math.random() * voices.length)];
    u.voice = voice; u.lang = voice.lang; u.rate = this.rate;
    u.onend = () => {
      if (token !== this.token) return;
      if (this.mode !== 'one') {
        if (this.index + 1 < this.sentences.length) this.index++;
        else if (this.mode === 'all') this.index = 0;
        else { this.index = 0; this.state = 'stopped'; this.emit('전체 재생 완료'); return; }
      }
      this.speak();
    };
    u.onerror = () => { if (token !== this.token) return; this.state = 'stopped'; this.emit('음성 재생에 실패했습니다. 재생 버튼으로 다시 시도하세요.'); };
    this.state = 'playing'; this.emit(`${this.index + 1} / ${this.sentences.length} 문장 읽는 중`);
    if (this.synth.paused) this.synth.resume();
    this.synth.speak(u);
  }
}
