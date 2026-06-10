// 手書き画像とお手本漢字画像を「画像類似度」で比較し、類似率（0〜100%）を算出する。
// 手書きはキャンバス内で位置・大きさがばらつくため、バウンディングボックスで
// 切り出してから粗い密度マップ（どこに線が集中しているか）に正規化する。
// 密度マップ同士を ZNCC（ゼロ平均正規化相互相関）で比較し、わずかな位置ズレは
// 数ピクセルのシフト探索で吸収する。これにより、線の量だけが多い別字や
// 枠を塗りつぶしただけの落書きを高得点にせず、字の構造の一致を評価できる。

/** 密度マップの解像度（MxM）。細かすぎると手書きの揺れに弱く、粗すぎると別字を見分けられない。 */
const M = 16;
/** インクとみなす不透明度のしきい値（0〜1） */
const INK_THRESHOLD = 0.15;
/** 位置ズレ吸収のためのシフト探索範囲（密度マップのセル単位） */
const SHIFT = 2;
/**
 * 類似率のゲイン。体感に合うよう少し持ち上げる（チューニング対象 / tasks 3.6）。
 */
const SIMILARITY_GAIN = 1.15;
/** 1問の満点 */
const MAX_POINTS = 100;

type Mask = { data: Float32Array; width: number; height: number };

/** ImageData のアルファ値をインク強度(0〜1)として取り出す。 */
function toInkMask(img: ImageData): Mask {
  const { data, width, height } = img;
  const out = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    out[i] = data[i * 4 + 3] / 255; // alpha
  }
  return { data: out, width, height };
}

/** インクのあるバウンディングボックスを求める。インクが無ければ null。 */
function inkBounds(mask: Mask): { x0: number; y0: number; x1: number; y1: number } | null {
  const { data, width, height } = mask;
  let x0 = width, y0 = height, x1 = -1, y1 = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[y * width + x] > INK_THRESHOLD) {
        if (x < x0) x0 = x;
        if (y < y0) y0 = y;
        if (x > x1) x1 = x;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return null;
  return { x0, y0, x1, y1 };
}

/**
 * バウンディングボックスを MxM の密度マップに平均プーリングする。
 * 各セルはその領域のインク量（0〜1）。インクが無ければ null。
 */
function densityMap(mask: Mask): Float32Array | null {
  const bounds = inkBounds(mask);
  if (!bounds) return null;
  const { x0, y0, x1, y1 } = bounds;
  const bw = x1 - x0 + 1;
  const bh = y1 - y0 + 1;
  const out = new Float32Array(M * M);
  for (let ty = 0; ty < M; ty++) {
    for (let tx = 0; tx < M; tx++) {
      const sx0 = x0 + Math.floor((tx * bw) / M);
      const sx1 = x0 + Math.max(Math.floor(((tx + 1) * bw) / M), Math.floor((tx * bw) / M) + 1);
      const sy0 = y0 + Math.floor((ty * bh) / M);
      const sy1 = y0 + Math.max(Math.floor(((ty + 1) * bh) / M), Math.floor((ty * bh) / M) + 1);
      let s = 0;
      let c = 0;
      for (let sy = sy0; sy < sy1; sy++) {
        for (let sx = sx0; sx < sx1; sx++) {
          s += mask.data[sy * mask.width + sx];
          c++;
        }
      }
      out[ty * M + tx] = c > 0 ? s / c : 0;
    }
  }
  return out;
}

/** 密度マップを (dx, dy) だけずらす（はみ出しは 0）。 */
function shiftMap(d: Float32Array, dx: number, dy: number): Float32Array {
  const out = new Float32Array(M * M);
  for (let y = 0; y < M; y++) {
    for (let x = 0; x < M; x++) {
      const nx = x - dx;
      const ny = y - dy;
      if (nx >= 0 && nx < M && ny >= 0 && ny < M) {
        out[y * M + x] = d[ny * M + nx];
      }
    }
  }
  return out;
}

/** ゼロ平均正規化相互相関(-1〜1)。分布の形が似ているほど高い。 */
function zncc(a: Float32Array, b: Float32Array): number {
  const n = a.length;
  let ma = 0;
  let mb = 0;
  for (let i = 0; i < n; i++) {
    ma += a[i];
    mb += b[i];
  }
  ma /= n;
  mb /= n;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i++) {
    const x = a[i] - ma;
    const y = b[i] - mb;
    num += x * y;
    da += x * x;
    db += y * y;
  }
  return da > 0 && db > 0 ? num / Math.sqrt(da * db) : 0;
}

/** 対象漢字を標準フォントで描画したお手本画像を生成する。 */
function renderReferenceGlyph(kanji: string, size = 256): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = "#000";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `${Math.floor(size * 0.78)}px serif`;
  ctx.fillText(kanji, size / 2, size / 2 + size * 0.02);
  return ctx.getImageData(0, 0, size, size);
}

/**
 * 手書き画像とお手本漢字の類似率(0〜100%)を算出する。
 * 手書きにインクが無い場合は 0 を返す（未記入＝0%）。
 */
export function computeSimilarity(handwriting: ImageData, kanji: string): number {
  const hand = densityMap(toInkMask(handwriting));
  if (!hand) return 0; // 未記入
  const ref = densityMap(toInkMask(renderReferenceGlyph(kanji)));
  if (!ref) return 0;

  // わずかな位置ズレを許容するため、小さくシフトしながら最良の相関を採用する。
  let best = -1;
  for (let dy = -SHIFT; dy <= SHIFT; dy++) {
    for (let dx = -SHIFT; dx <= SHIFT; dx++) {
      const z = zncc(shiftMap(hand, dx, dy), ref);
      if (z > best) best = z;
    }
  }

  return Math.max(0, Math.min(100, Math.round(best * 100 * SIMILARITY_GAIN)));
}

/** 類似率に応じた獲得ポイント（類似率0%は0点、単調増加）。 */
export function scoreToPoints(similarity: number): number {
  return Math.round((similarity / 100) * MAX_POINTS);
}
