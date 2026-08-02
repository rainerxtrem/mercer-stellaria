"use client";

import { PointerEvent, useRef } from "react";

type SignaturePadProps = {
  onSignatureChange: (dataUrl: string | null) => void;
};

export function SignaturePad({ onSignatureChange }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);

  function getContext() {
    const canvas = canvasRef.current;
    if (!canvas) {
      return null;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return null;
    }

    context.lineWidth = 2;
    context.lineJoin = "round";
    context.lineCap = "round";
    context.strokeStyle = "#0F2043";
    return context;
  }

  function pointerPosition(event: PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function startDrawing(event: PointerEvent<HTMLCanvasElement>) {
    const context = getContext();
    if (!context) {
      return;
    }

    const { x, y } = pointerPosition(event);
    drawingRef.current = true;
    context.beginPath();
    context.moveTo(x, y);
  }

  function draw(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) {
      return;
    }

    const context = getContext();
    if (!context) {
      return;
    }

    const { x, y } = pointerPosition(event);
    context.lineTo(x, y);
    context.stroke();
  }

  function stopDrawing() {
    if (!drawingRef.current) {
      return;
    }

    drawingRef.current = false;
    onSignatureChange(canvasRef.current?.toDataURL("image/png") ?? null);
  }

  function clear() {
    const canvas = canvasRef.current;
    const context = getContext();
    if (!canvas || !context) {
      return;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    onSignatureChange(null);
  }

  return (
    <div className="grid gap-2">
      <canvas
        ref={canvasRef}
        width={420}
        height={140}
        className="w-full rounded-xl border border-ms-navy/20 bg-white"
        onPointerDown={startDrawing}
        onPointerMove={draw}
        onPointerUp={stopDrawing}
        onPointerLeave={stopDrawing}
      />
      <button type="button" className="w-fit rounded-lg border border-ms-navy/20 px-3 py-1.5 text-xs font-semibold text-ms-navy" onClick={clear}>
        Effacer
      </button>
    </div>
  );
}
