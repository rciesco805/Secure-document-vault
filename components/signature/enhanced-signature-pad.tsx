import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { 
  Eraser, 
  Check, 
  Download, 
  Palette, 
  Type, 
  PenTool,
  Settings2,
  Undo2,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useSignatureTheme } from "@/lib/signature/theme/context";
import { 
  penColorOptions, 
  penWidthOptions, 
  signatureFontOptions,
  SignatureTheme,
} from "@/lib/signature/theme/types";

export interface SignaturePadHandle {
  clear: () => void;
  getSignatureDataUrl: (format?: 'png' | 'jpeg') => string | null;
  getSignatureSvg: () => string | null;
  isEmpty: () => boolean;
}

interface EnhancedSignaturePadProps {
  onSignatureChange: (signatureData: string | null) => void;
  width?: number;
  height?: number;
  showControls?: boolean;
  mode?: 'draw' | 'type';
  initialName?: string;
  themeOverride?: Partial<SignatureTheme>;
  className?: string;
}

interface StrokePoint {
  x: number;
  y: number;
}

interface Stroke {
  points: StrokePoint[];
  color: string;
  width: number;
}

export const EnhancedSignaturePad = forwardRef<SignaturePadHandle, EnhancedSignaturePadProps>(
  function EnhancedSignaturePad(
    {
      onSignatureChange,
      width = 400,
      height = 150,
      showControls = true,
      mode: initialMode = 'draw',
      initialName = '',
      themeOverride,
      className,
    },
    ref
  ) {
    const { theme: contextTheme } = useSignatureTheme();
    const theme = { ...contextTheme, ...themeOverride };
    
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasSignature, setHasSignature] = useState(false);
    const [strokes, setStrokes] = useState<Stroke[]>([]);
    const [currentStroke, setCurrentStroke] = useState<StrokePoint[]>([]);
    
    // Pen customization state
    const [penColor, setPenColor] = useState(theme.penColor);
    const [penWidth, setPenWidth] = useState(theme.penWidth);
    
    // Mode state
    const [mode, setMode] = useState<'draw' | 'type'>(initialMode);
    const [typedName, setTypedName] = useState(initialName);
    const [selectedFont, setSelectedFont] = useState(signatureFontOptions[0].font);

    // Redraw canvas when strokes change
    useEffect(() => {
      redrawCanvas();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [strokes, theme.canvasBackground]);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      clear: clearSignature,
      getSignatureDataUrl: (format = 'png') => {
        const canvas = canvasRef.current;
        if (!canvas || !hasSignature) return null;
        return canvas.toDataURL(`image/${format}`);
      },
      getSignatureSvg: () => getSvgData(),
      isEmpty: () => !hasSignature,
    }));

    const redrawCanvas = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!ctx || !canvas) return;

      // Clear and set background
      ctx.fillStyle = theme.canvasBackground;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Redraw all strokes
      strokes.forEach((stroke) => {
        if (stroke.points.length < 2) return;
        
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
      });

      // Draw signature line
      ctx.strokeStyle = theme.canvasBorder;
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(20, canvas.height - 20);
      ctx.lineTo(canvas.width - 20, canvas.height - 20);
      ctx.stroke();
      ctx.setLineDash([]);
    };

    const getCoordinates = (e: React.MouseEvent | React.TouchEvent | React.PointerEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      if ("touches" in e && e.touches.length > 0) {
        return {
          x: (e.touches[0].clientX - rect.left) * scaleX,
          y: (e.touches[0].clientY - rect.top) * scaleY,
        };
      }
      if ("clientX" in e) {
        return {
          x: (e.clientX - rect.left) * scaleX,
          y: (e.clientY - rect.top) * scaleY,
        };
      }
      return { x: 0, y: 0 };
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent | React.PointerEvent) => {
      e.preventDefault();
      if ('pointerId' in e && canvasRef.current) {
        (canvasRef.current as HTMLCanvasElement).setPointerCapture(e.pointerId);
      }
      setIsDrawing(true);
      const { x, y } = getCoordinates(e);
      setCurrentStroke([{ x, y }]);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent | React.PointerEvent) => {
      if (!isDrawing) return;
      e.preventDefault();

      const { x, y } = getCoordinates(e);
      const newStroke = [...currentStroke, { x, y }];
      setCurrentStroke(newStroke);

      // Draw current stroke
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!ctx) return;

      ctx.strokeStyle = penColor;
      ctx.lineWidth = penWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      
      if (newStroke.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(newStroke[newStroke.length - 2].x, newStroke[newStroke.length - 2].y);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
      
      setHasSignature(true);
    };

    const stopDrawing = (e?: React.MouseEvent | React.TouchEvent | React.PointerEvent) => {
      if (e && 'pointerId' in e && canvasRef.current) {
        try {
          (canvasRef.current as HTMLCanvasElement).releasePointerCapture(e.pointerId);
        } catch {
          // Pointer capture may have been released already
        }
      }
      if (isDrawing && currentStroke.length > 0) {
        const newStrokes = [...strokes, { points: currentStroke, color: penColor, width: penWidth }];
        setStrokes(newStrokes);
        setCurrentStroke([]);
        
        // Emit change
        setTimeout(() => {
          const canvas = canvasRef.current;
          if (canvas) {
            const signatureData = canvas.toDataURL("image/png");
            onSignatureChange(signatureData);
          }
        }, 10);
      }
      setIsDrawing(false);
    };

    const clearSignature = () => {
      setStrokes([]);
      setCurrentStroke([]);
      setHasSignature(false);
      setTypedName('');
      onSignatureChange(null);
      
      // Redraw empty canvas
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!ctx || !canvas) return;
      
      ctx.fillStyle = theme.canvasBackground;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      redrawCanvas();
    };

    const undoLastStroke = () => {
      if (strokes.length === 0) return;
      const newStrokes = strokes.slice(0, -1);
      setStrokes(newStrokes);
      
      if (newStrokes.length === 0) {
        setHasSignature(false);
        onSignatureChange(null);
      } else {
        setTimeout(() => {
          const canvas = canvasRef.current;
          if (canvas) {
            const signatureData = canvas.toDataURL("image/png");
            onSignatureChange(signatureData);
          }
        }, 10);
      }
    };

    // Generate typed signature on canvas
    const updateTypedSignature = (name: string, font: string) => {
      setTypedName(name);
      setSelectedFont(font);
      
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!ctx || !canvas) return;

      // Clear canvas
      ctx.fillStyle = theme.canvasBackground;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (name.trim()) {
        // Draw typed signature
        ctx.font = `${theme.signatureFontSize}px ${font}`;
        ctx.fillStyle = penColor;
        ctx.textBaseline = 'middle';
        
        // Center the text
        const textWidth = ctx.measureText(name).width;
        const x = (canvas.width - textWidth) / 2;
        const y = canvas.height / 2;
        
        ctx.fillText(name, x, y);
        setHasSignature(true);
        
        const signatureData = canvas.toDataURL("image/png");
        onSignatureChange(signatureData);
      } else {
        setHasSignature(false);
        onSignatureChange(null);
      }

      // Draw signature line
      ctx.strokeStyle = theme.canvasBorder;
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(20, canvas.height - 20);
      ctx.lineTo(canvas.width - 20, canvas.height - 20);
      ctx.stroke();
      ctx.setLineDash([]);
    };

    // Escape special characters for SVG text content
    const escapeXml = (text: string): string => {
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    };

    // Generate SVG from strokes
    const getSvgData = (): string | null => {
      if (!hasSignature || mode === 'type') {
        // For typed signatures, create SVG text
        if (mode === 'type' && typedName) {
          const sanitizedName = escapeXml(typedName);
          return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
            <rect fill="${theme.canvasBackground}" width="100%" height="100%"/>
            <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" 
                  font-family="${selectedFont}" font-size="${theme.signatureFontSize}" fill="${penColor}">
              ${sanitizedName}
            </text>
          </svg>`;
        }
        return null;
      }

      // Generate path from strokes
      const paths = strokes.map((stroke) => {
        if (stroke.points.length < 2) return '';
        
        const pathData = stroke.points
          .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
          .join(' ');
        
        return `<path d="${pathData}" stroke="${stroke.color}" stroke-width="${stroke.width}" 
                      fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
      }).join('\n');

      return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <rect fill="${theme.canvasBackground}" width="100%" height="100%"/>
        ${paths}
      </svg>`;
    };

    const downloadSignature = (format: 'png' | 'svg') => {
      if (!hasSignature) return;

      let data: string;
      let filename: string;
      let mimeType: string;

      if (format === 'svg') {
        const svg = getSvgData();
        if (!svg) return;
        data = 'data:image/svg+xml;base64,' + btoa(svg);
        filename = 'signature.svg';
        mimeType = 'image/svg+xml';
      } else {
        const canvas = canvasRef.current;
        if (!canvas) return;
        data = canvas.toDataURL('image/png');
        filename = 'signature.png';
        mimeType = 'image/png';
      }

      const link = document.createElement('a');
      link.download = filename;
      link.href = data;
      link.click();
    };

    return (
      <div className={cn("space-y-3", className)}>
        {showControls && (
          <div className="flex items-center justify-between">
            <Tabs value={mode} onValueChange={(v) => setMode(v as 'draw' | 'type')} className="w-auto">
              <TabsList className="grid w-full grid-cols-2 bg-gray-800">
                <TabsTrigger value="draw" className="data-[state=active]:bg-gray-700">
                  <PenTool className="h-4 w-4 mr-2" />
                  Draw
                </TabsTrigger>
                <TabsTrigger value="type" className="data-[state=active]:bg-gray-700">
                  <Type className="h-4 w-4 mr-2" />
                  Type
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-2">
              {mode === 'draw' && (
                <>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                        <Palette className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 bg-gray-900 border-gray-700">
                      <div className="space-y-3">
                        <Label className="text-white text-sm">Pen Color</Label>
                        <div className="flex gap-2 flex-wrap">
                          {penColorOptions.map((option) => (
                            <button
                              key={option.id}
                              onClick={() => setPenColor(option.color)}
                              className={cn(
                                "w-8 h-8 rounded-full border-2 transition-all",
                                penColor === option.color ? "border-blue-500 scale-110" : "border-gray-600"
                              )}
                              style={{ backgroundColor: option.color }}
                              title={option.label}
                            />
                          ))}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                        <Settings2 className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 bg-gray-900 border-gray-700">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-white text-sm">Pen Thickness: {penWidth}px</Label>
                          <Slider
                            value={[penWidth]}
                            onValueChange={(values: number[]) => setPenWidth(values[0])}
                            min={1}
                            max={6}
                            step={0.5}
                            className="w-full"
                          />
                        </div>
                        <div className="flex gap-2">
                          {penWidthOptions.map((option) => (
                            <Button
                              key={option.id}
                              variant={penWidth === option.width ? "secondary" : "ghost"}
                              size="sm"
                              onClick={() => setPenWidth(option.width)}
                              className="text-xs"
                            >
                              {option.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={undoLastStroke}
                    disabled={strokes.length === 0}
                    className="text-gray-400 hover:text-white disabled:opacity-30"
                  >
                    <Undo2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        )}

        {mode === 'type' && (
          <div className="space-y-3">
            <Input
              value={typedName}
              onChange={(e) => updateTypedSignature(e.target.value, selectedFont)}
              placeholder="Type your name..."
              className="bg-gray-800 border-gray-600 text-white"
            />
            <div className="flex gap-2 flex-wrap">
              {signatureFontOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => updateTypedSignature(typedName, option.font)}
                  className={cn(
                    "px-3 py-2 rounded text-sm transition-all",
                    selectedFont === option.font 
                      ? "bg-blue-600 text-white" 
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  )}
                  style={{ fontFamily: option.font }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="relative">
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            className="w-full rounded-lg cursor-crosshair touch-none select-none"
            style={{ 
              maxWidth: `${width}px`,
              backgroundColor: theme.canvasBackground,
              border: `1px solid ${theme.canvasBorder}`,
              touchAction: 'none',
              WebkitTouchCallout: 'none',
              WebkitUserSelect: 'none',
            }}
            onPointerDown={mode === 'draw' ? startDrawing : undefined}
            onPointerMove={mode === 'draw' ? draw : undefined}
            onPointerUp={mode === 'draw' ? stopDrawing : undefined}
            onPointerLeave={mode === 'draw' ? () => stopDrawing() : undefined}
            onPointerCancel={mode === 'draw' ? () => stopDrawing() : undefined}
            onTouchStart={mode === 'draw' ? startDrawing : undefined}
            onTouchMove={mode === 'draw' ? draw : undefined}
            onTouchEnd={mode === 'draw' ? stopDrawing : undefined}
          />
          {!hasSignature && (
            <p 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-sm pointer-events-none"
              style={{ color: theme.mutedTextColor }}
            >
              {mode === 'draw' ? 'Sign here' : 'Type your name above'}
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
          >
            <Eraser className="h-4 w-4 mr-2" />
            Clear
          </Button>

          <div className="flex items-center gap-2">
            {hasSignature && showControls && (
              <>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-32 bg-gray-900 border-gray-700 p-2">
                    <div className="space-y-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => downloadSignature('png')}
                        className="w-full justify-start text-white hover:bg-gray-800"
                      >
                        PNG
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => downloadSignature('svg')}
                        className="w-full justify-start text-white hover:bg-gray-800"
                      >
                        SVG
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>

                <div className="flex items-center text-emerald-400 text-sm">
                  <Check className="h-4 w-4 mr-1" />
                  Captured
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }
);
