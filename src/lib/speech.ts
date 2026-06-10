// 例文の音声読み上げ。ブラウザ内蔵の Web Speech API（SpeechSynthesis）を使う。
// 未対応ブラウザでは何もしない（呼び出し側はボタンを無効化する）。

/** ブラウザが音声合成に対応しているか。 */
export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/**
 * 例文を日本語(ja-JP)で読み上げる。
 * 読み上げ中に再度呼ばれた場合は中断して最初から読み直す（何度でも再生可）。
 */
export function speak(text: string): void {
  if (!isSpeechSupported()) return;
  const synth = window.speechSynthesis;
  synth.cancel(); // 進行中の読み上げを止めてから再生し直す
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ja-JP";
  utterance.rate = 0.9; // 子ども向けに少しゆっくり
  synth.speak(utterance);
}
