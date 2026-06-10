"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import HandwritingCanvas, {
  type HandwritingCanvasHandle,
} from "@/components/HandwritingCanvas";
import { questions, toClozeSentence } from "@/lib/kanji";
import { computeSimilarity, scoreToPoints } from "@/lib/scoring";
import { isSpeechSupported, speak } from "@/lib/speech";

type Phase = "writing" | "scored" | "finished";

export default function KanjiGame() {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("writing");
  const [totalPoints, setTotalPoints] = useState(0);
  const [similarity, setSimilarity] = useState(0);
  const [gained, setGained] = useState(0);

  const canvasRef = useRef<HandwritingCanvasHandle>(null);

  // 音声対応はクライアントでのみ判定する（SSR では false 扱いにして
  // ハイドレーションの不一致を避ける）。
  const speechOk = useSyncExternalStore(
    () => () => {},
    () => isSpeechSupported(),
    () => false,
  );

  const current = questions[index];

  function handleScore() {
    const img = canvasRef.current!.getImageData();
    const sim = computeSimilarity(img, current.kanji);
    const points = scoreToPoints(sim);
    setSimilarity(sim);
    setGained(points);
    setTotalPoints((p) => p + points);
    setPhase("scored");
  }

  function handleNext() {
    canvasRef.current?.clear();
    if (index + 1 >= questions.length) {
      setPhase("finished");
      return;
    }
    setIndex((i) => i + 1);
    setPhase("writing");
  }

  function handleRestart() {
    canvasRef.current?.clear();
    setIndex(0);
    setTotalPoints(0);
    setPhase("writing");
  }

  if (phase === "finished") {
    return (
      <div className="flex flex-col items-center gap-6 text-center">
        <h1 className="text-3xl font-bold text-zinc-800">よくできました！</h1>
        <p className="text-xl text-zinc-600">
          ぜんぶで{" "}
          <span className="text-4xl font-bold text-emerald-600">{totalPoints}</span>{" "}
          ポイント
        </p>
        <button
          onClick={handleRestart}
          className="rounded-full bg-emerald-600 px-8 py-3 text-lg font-bold text-white hover:bg-emerald-700"
        >
          もういちど
        </button>
      </div>
    );
  }

  const scored = phase === "scored";

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-5">
      {/* ヘッダー: 進行と累計ポイント */}
      <div className="flex w-full items-center justify-between text-sm text-zinc-500">
        <span>
          もんだい {index + 1} / {questions.length}
        </span>
        <span>
          ポイント:{" "}
          <span className="text-lg font-bold text-emerald-600">{totalPoints}</span>
        </span>
      </div>

      {/* 読みの提示 */}
      <div className="text-center">
        <p className="text-sm text-zinc-500">よみ</p>
        <p className="text-2xl font-bold text-zinc-800">{current.reading}</p>
      </div>

      {/* 例文（虫食い / 採点後は正解表示） */}
      <div className="flex items-center gap-3 rounded-2xl bg-zinc-100 px-5 py-4">
        <p className="text-xl leading-relaxed text-zinc-800">
          {scored ? (
            <Sentence text={current.sentence} highlight={current.kanji} />
          ) : (
            toClozeSentence(current)
          )}
        </p>
        <button
          onClick={() => speak(current.sentence)}
          disabled={!speechOk}
          aria-label="れいぶんを よみあげる"
          title={speechOk ? "よみあげる" : "このブラウザは音声に対応していません"}
          className="shrink-0 rounded-full bg-sky-500 p-3 text-white hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          🔊
        </button>
      </div>

      {/* 手書きキャンバス（採点後はお手本を重ねる） */}
      <HandwritingCanvas
        ref={canvasRef}
        overlayKanji={scored ? current.kanji : undefined}
      />

      {/* 採点結果 */}
      {scored && (
        <div className="text-center">
          <p className="text-lg text-zinc-700">
            にているど:{" "}
            <span className="font-bold text-emerald-600">{similarity}%</span>
          </p>
          <p className="text-sm text-zinc-500">+{gained} ポイント</p>
        </div>
      )}

      {/* 操作ボタン */}
      <div className="flex gap-3">
        {scored ? (
          <button
            onClick={handleNext}
            className="rounded-full bg-emerald-600 px-8 py-3 text-lg font-bold text-white hover:bg-emerald-700"
          >
            つぎへ
          </button>
        ) : (
          <>
            <button
              onClick={() => canvasRef.current?.clear()}
              className="rounded-full bg-zinc-200 px-6 py-3 text-lg font-bold text-zinc-700 hover:bg-zinc-300"
            >
              けす
            </button>
            <button
              onClick={handleScore}
              className="rounded-full bg-emerald-600 px-8 py-3 text-lg font-bold text-white hover:bg-emerald-700"
            >
              さいてん
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/** 例文中の対象漢字を緑で強調して表示する。 */
function Sentence({ text, highlight }: { text: string; highlight: string }) {
  const parts = text.split(highlight);
  return (
    <>
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 && (
            <span className="font-bold text-emerald-600">{highlight}</span>
          )}
        </span>
      ))}
    </>
  );
}
