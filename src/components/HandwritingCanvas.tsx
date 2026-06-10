"use client";

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  type PointerEvent as ReactPointerEvent,
} from "react";

export type HandwritingCanvasHandle = {
  /** 現在の筆跡を採点用の ImageData として取り出す。 */
  getImageData: () => ImageData;
  /** 描画内容をすべて消す。 */
  clear: () => void;
};

type Props = {
  /** 1辺のピクセルサイズ（正方形） */
  size?: number;
  /**
   * 採点後にお手本漢字を重ねて表示する。指定すると手書きの上に
   * 半透明の赤でお手本を表示し、自分の字との違いを見比べられる。
   */
  overlayKanji?: string;
};

/**
 * 手書き用の描画キャンバス。タッチ／ペン入力を主対象とし、
 * PC のマウスでも同じ Pointer Events で描画できる。
 */
const HandwritingCanvas = forwardRef<HandwritingCanvasHandle, Props>(
  function HandwritingCanvas({ size = 280, overlayKanji }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const drawing = useRef(false);
    const last = useRef<{ x: number; y: number } | null>(null);

    useImperativeHandle(ref, () => ({
      getImageData: () => {
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext("2d")!;
        return ctx.getImageData(0, 0, canvas.width, canvas.height);
      },
      clear: () => {
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext("2d")!;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      },
    }));

    function pointFromEvent(e: ReactPointerEvent<HTMLCanvasElement>) {
      const rect = canvasRef.current!.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    function handlePointerDown(e: ReactPointerEvent<HTMLCanvasElement>) {
      if (overlayKanji) return; // 採点後は描けない
      e.preventDefault();
      canvasRef.current!.setPointerCapture(e.pointerId);
      drawing.current = true;
      last.current = pointFromEvent(e);
    }

    function handlePointerMove(e: ReactPointerEvent<HTMLCanvasElement>) {
      if (!drawing.current) return;
      e.preventDefault();
      const ctx = canvasRef.current!.getContext("2d")!;
      const p = pointFromEvent(e);
      const prev = last.current!;
      ctx.strokeStyle = "#111827";
      ctx.lineWidth = 14;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      last.current = p;
    }

    function handlePointerUp(e: ReactPointerEvent<HTMLCanvasElement>) {
      if (!drawing.current) return;
      e.preventDefault();
      drawing.current = false;
      last.current = null;
    }

    return (
      <div
        className="relative rounded-2xl border-4 border-dashed border-zinc-300 bg-white"
        style={{ width: size, height: size }}
      >
        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          className="touch-none rounded-xl"
          style={{ width: size, height: size }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
        {overlayKanji && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 flex items-center justify-center font-serif text-red-500/40"
            style={{ fontSize: size * 0.78, lineHeight: 1 }}
          >
            {overlayKanji}
          </div>
        )}
      </div>
    );
  },
);

export default HandwritingCanvas;
