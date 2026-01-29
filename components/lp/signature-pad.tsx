import React, { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Eraser, Check } from "lucide-react";

interface SignaturePadProps {
  onSignatureChange: (signatureData: string | null) => void;
  width?: number;
  height?: number;
}

export function SignaturePad({ onSignatureChange, width = 400, height = 150 }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#1f2937";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ("touches" in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    if (isDrawing && hasSignature) {
      const canvas = canvasRef.current;
      if (canvas) {
        const signatureData = canvas.toDataURL("image/png");
        onSignatureChange(signatureData);
      }
    }
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;

    ctx.fillStyle = "#1f2937";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    onSignatureChange(null);
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="w-full border border-gray-600 rounded-lg cursor-crosshair touch-none"
          style={{ maxWidth: `${width}px`, touchAction: 'none' }}
          role="img"
          aria-label="Signature drawing area. Use mouse or touch to draw your signature."
          tabIndex={0}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        <div className="absolute bottom-2 left-2 right-2 border-b border-dashed border-gray-500" />
        {!hasSignature && (
          <p className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none">
            Sign here
          </p>
        )}
      </div>
      <div className="flex justify-between items-center">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={clearSignature}
          className="text-gray-400 hover:text-white"
          aria-label="Clear signature"
        >
          <Eraser className="h-4 w-4 mr-2" aria-hidden="true" />
          Clear
        </Button>
        {hasSignature && (
          <div className="flex items-center text-emerald-400 text-sm">
            <Check className="h-4 w-4 mr-1" />
            Signature captured
          </div>
        )}
      </div>
    </div>
  );
}
