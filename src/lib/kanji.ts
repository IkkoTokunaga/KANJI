// 漢字書き取りゲームの問題データ。
// 対象はすべて小学1年生で習う配当漢字。読みと例文の文脈から
// 書くべき漢字が一意に定まるようにしている（対象以外の語はひらがな表記）。

export type KanjiQuestion = {
  /** 書かせたい対象漢字（1文字） */
  kanji: string;
  /** 対象漢字の読み（ひらがな） */
  reading: string;
  /** 元の例文。対象漢字をそのまま含む完全な文（音声読み上げに使う） */
  sentence: string;
};

export const questions: KanjiQuestion[] = [
  { kanji: "山", reading: "やま", sentence: "たかい 山に のぼる。" },
  { kanji: "川", reading: "かわ", sentence: "ふかい 川が ながれる。" },
  { kanji: "木", reading: "き", sentence: "おおきな 木が ある。" },
  { kanji: "火", reading: "ひ", sentence: "火が あかく もえる。" },
  { kanji: "水", reading: "みず", sentence: "つめたい 水を のむ。" },
  { kanji: "月", reading: "つき", sentence: "よるに 月が でる。" },
  { kanji: "花", reading: "はな", sentence: "あかい 花が さく。" },
  { kanji: "犬", reading: "いぬ", sentence: "しろい 犬が はしる。" },
  { kanji: "人", reading: "ひと", sentence: "やさしい 人に あう。" },
  { kanji: "手", reading: "て", sentence: "手を きれいに あらう。" },
  { kanji: "口", reading: "くち", sentence: "おおきな 口を あける。" },
  { kanji: "目", reading: "め", sentence: "目を とじて ねむる。" },
];

const BLANK = "□";

/** 例文中の対象漢字をすべて □ に置換した虫食い文を返す。 */
export function toClozeSentence(q: KanjiQuestion): string {
  return q.sentence.replaceAll(q.kanji, BLANK);
}

// 開発時の簡易バリデーション: 例文に対象漢字が含まれていること。
if (process.env.NODE_ENV !== "production") {
  for (const q of questions) {
    if (!q.sentence.includes(q.kanji)) {
      console.warn(`[kanji] 例文に対象漢字 "${q.kanji}" が含まれていません: ${q.sentence}`);
    }
  }
}
