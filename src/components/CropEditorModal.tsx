import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Check, Crop, RotateCcw, Sparkles } from 'lucide-react';
import { PlateItem } from '../types';
import { cropImageWithBox } from '../utils/imageCropper';

interface CropEditorModalProps {
  plate: PlateItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, box: [number, number, number, number], croppedUrl: string) => void;
  onReanalyze: (id: string) => void;
}

export const CropEditorModal: React.FC<CropEditorModalProps> = ({
  plate,
  isOpen,
  onClose,
  onSave,
  onReanalyze,
}) => {
  const [box, setBox] = useState<[number, number, number, number]>([100, 100, 900, 900]);
  const [liveCroppedUrl, setLiveCroppedUrl] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; box: [number, number, number, number] }>({
    x: 0,
    y: 0,
    box: [100, 100, 900, 900],
  });

  useEffect(() => {
    if (plate) {
      setBox(plate.box || [100, 100, 900, 900]);
    }
  }, [plate]);

  // Update live crop preview whenever box changes
  useEffect(() => {
    if (!plate?.originalImage) return;
    let isCurrent = true;
    cropImageWithBox(plate.originalImage, box)
      .then(({ croppedUrl }) => {
        if (isCurrent) setLiveCroppedUrl(croppedUrl);
      })
      .catch((err) => console.error('Live crop error:', err));

    return () => {
      isCurrent = false;
    };
  }, [plate?.originalImage, box]);

  const handlePointerDown = (handle: string, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setIsDragging(handle);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      box: [...box],
    });
  };

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const deltaXPercent = ((e.clientX - dragStart.x) / rect.width) * 1000;
      const deltaYPercent = ((e.clientY - dragStart.y) / rect.height) * 1000;

      const [initYmin, initXmin, initYmax, initXmax] = dragStart.box;
      let [ymin, xmin, ymax, xmax] = [initYmin, initXmin, initYmax, initXmax];

      if (isDragging === 'move') {
        const width = initXmax - initXmin;
        const height = initYmax - initYmin;
        let newXmin = Math.max(0, Math.min(1000 - width, initXmin + deltaXPercent));
        let newYmin = Math.max(0, Math.min(1000 - height, initYmin + deltaYPercent));
        xmin = Math.round(newXmin);
        ymin = Math.round(newYmin);
        xmax = Math.round(newXmin + width);
        ymax = Math.round(newYmin + height);
      } else {
        if (isDragging.includes('top')) {
          ymin = Math.max(0, Math.min(ymax - 50, Math.round(initYmin + deltaYPercent)));
        }
        if (isDragging.includes('bottom')) {
          ymax = Math.max(ymin + 50, Math.min(1000, Math.round(initYmax + deltaYPercent)));
        }
        if (isDragging.includes('left')) {
          xmin = Math.max(0, Math.min(xmax - 50, Math.round(initXmin + deltaXPercent)));
        }
        if (isDragging.includes('right')) {
          xmax = Math.max(xmin + 50, Math.min(1000, Math.round(initXmax + deltaXPercent)));
        }
      }

      setBox([ymin, xmin, ymax, xmax]);
    },
    [isDragging, dragStart]
  );

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      try {
        (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      } catch {}
      setIsDragging(null);
    }
  };

  const setPreset = (type: 'center80' | 'center60' | 'full' | 'square') => {
    if (type === 'full') setBox([0, 0, 1000, 1000]);
    if (type === 'center80') setBox([100, 100, 900, 900]);
    if (type === 'center60') setBox([200, 200, 800, 800]);
    if (type === 'square') {
      const [ymin, xmin, ymax, xmax] = box;
      const size = Math.max(ymax - ymin, xmax - xmin);
      const cx = (xmin + xmax) / 2;
      const cy = (ymin + ymax) / 2;
      const half = Math.min(size / 2, Math.min(cx, cy, 1000 - cx, 1000 - cy));
      setBox([
        Math.max(0, Math.round(cy - half)),
        Math.max(0, Math.round(cx - half)),
        Math.min(1000, Math.round(cy + half)),
        Math.min(1000, Math.round(cx + half)),
      ]);
    }
  };

  const handleSave = async () => {
    if (!plate) return;
    try {
      const { croppedUrl } = await cropImageWithBox(plate.originalImage, box);
      onSave(plate.id, box, croppedUrl);
      onClose();
    } catch (err) {
      console.error('Error saving cropped image:', err);
    }
  };

  if (!isOpen || !plate) return null;

  const [ymin, xmin, ymax, xmax] = box;
  const boxTop = `${ymin / 10}%`;
  const boxLeft = `${xmin / 10}%`;
  const boxWidth = `${(xmax - xmin) / 10}%`;
  const boxHeight = `${(ymax - ymin) / 10}%`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
              <Crop className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                배지 Bounding Box 크롭 영역 편집
              </h3>
              <p className="text-xs text-slate-500">
                {plate.zone || '미지정 구역'} • {plate.testType} ({plate.filename})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Main interactive image canvas */}
          <div className="md:col-span-8 flex flex-col items-center">
            <div
              ref={containerRef}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className="relative select-none max-w-full max-h-[52vh] sm:max-h-[58vh] aspect-square rounded-xl overflow-hidden shadow-inner bg-slate-900 border border-slate-300 flex items-center justify-center cursor-crosshair touch-none"
            >
              <img
                src={plate.originalImage}
                alt="Original Plate"
                className="w-full h-full object-contain pointer-events-none"
                draggable={false}
              />

              {/* Dark overlay outside box */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.4) 100%)`,
                }}
              />

              {/* Bounding Box Overlay */}
              <div
                onPointerDown={(e) => handlePointerDown('move', e)}
                style={{
                  top: boxTop,
                  left: boxLeft,
                  width: boxWidth,
                  height: boxHeight,
                }}
                className="absolute border-2 border-blue-500 bg-blue-500/15 cursor-move shadow-md ring-1 ring-white/80"
              >
                {/* Center crosshair */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                  <div className="w-4 h-0.5 bg-white" />
                  <div className="h-4 w-0.5 bg-white absolute" />
                </div>

                {/* Handles */}
                {/* Top-Left */}
                <div
                  onPointerDown={(e) => handlePointerDown('top-left', e)}
                  className="absolute -top-2 -left-2 w-4 h-4 bg-white border-2 border-blue-600 rounded-full cursor-nwse-resize shadow-sm hover:scale-125 transition-transform"
                />
                {/* Top-Right */}
                <div
                  onPointerDown={(e) => handlePointerDown('top-right', e)}
                  className="absolute -top-2 -right-2 w-4 h-4 bg-white border-2 border-blue-600 rounded-full cursor-nesw-resize shadow-sm hover:scale-125 transition-transform"
                />
                {/* Bottom-Left */}
                <div
                  onPointerDown={(e) => handlePointerDown('bottom-left', e)}
                  className="absolute -bottom-2 -left-2 w-4 h-4 bg-white border-2 border-blue-600 rounded-full cursor-nesw-resize shadow-sm hover:scale-125 transition-transform"
                />
                {/* Bottom-Right */}
                <div
                  onPointerDown={(e) => handlePointerDown('bottom-right', e)}
                  className="absolute -bottom-2 -right-2 w-4 h-4 bg-white border-2 border-blue-600 rounded-full cursor-nwse-resize shadow-sm hover:scale-125 transition-transform"
                />
                {/* Top Edge */}
                <div
                  onPointerDown={(e) => handlePointerDown('top', e)}
                  className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-2 bg-white border border-blue-600 rounded-full cursor-ns-resize"
                />
                {/* Bottom Edge */}
                <div
                  onPointerDown={(e) => handlePointerDown('bottom', e)}
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-6 h-2 bg-white border border-blue-600 rounded-full cursor-ns-resize"
                />
                {/* Left Edge */}
                <div
                  onPointerDown={(e) => handlePointerDown('left', e)}
                  className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 h-6 w-2 bg-white border border-blue-600 rounded-full cursor-ew-resize"
                />
                {/* Right Edge */}
                <div
                  onPointerDown={(e) => handlePointerDown('right', e)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 h-6 w-2 bg-white border border-blue-600 rounded-full cursor-ew-resize"
                />

                {/* Box coordinate tag */}
                <div className="absolute bottom-1 right-1 bg-slate-900/80 text-white text-[10px] px-1.5 py-0.5 rounded font-mono pointer-events-none">
                  {xmax - xmin} × {ymax - ymin}
                </div>
              </div>
            </div>

            {/* Presets & Helper Buttons */}
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <span className="text-xs text-slate-500 font-medium mr-1">크롭 프리셋:</span>
              <button
                type="button"
                onClick={() => setPreset('center80')}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                중앙 80%
              </button>
              <button
                type="button"
                onClick={() => setPreset('center60')}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                중앙 60%
              </button>
              <button
                type="button"
                onClick={() => setPreset('square')}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                정방형 1:1
              </button>
              <button
                type="button"
                onClick={() => setPreset('full')}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                전체 (100%)
              </button>
              <button
                type="button"
                onClick={() => {
                  if (plate) onReanalyze(plate.id);
                }}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 flex items-center space-x-1"
              >
                <Sparkles className="w-3 h-3" />
                <span>AI 재탐색</span>
              </button>
            </div>
          </div>

          {/* Right side: Live Cropped Result & Coordinate Inspector */}
          <div className="md:col-span-4 flex flex-col items-center justify-center bg-slate-50 p-4 rounded-xl border border-slate-200 h-full">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 self-start">
              실시간 크롭 결과 (Live Preview)
            </h4>
            <div className="w-44 h-44 sm:w-48 sm:h-48 rounded-xl overflow-hidden bg-slate-900 border-2 border-slate-300 shadow-md flex items-center justify-center mb-3">
              {liveCroppedUrl ? (
                <img
                  src={liveCroppedUrl}
                  alt="Cropped Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xs text-slate-400">생성 중...</span>
              )}
            </div>

            {/* Coordinate Details */}
            <div className="w-full bg-white p-3 rounded-lg border border-slate-200 text-xs font-mono space-y-1 text-slate-600 mb-2">
              <div className="flex justify-between">
                <span>ymin:</span> <strong className="text-slate-900">{ymin}</strong>
              </div>
              <div className="flex justify-between">
                <span>xmin:</span> <strong className="text-slate-900">{xmin}</strong>
              </div>
              <div className="flex justify-between">
                <span>ymax:</span> <strong className="text-slate-900">{ymax}</strong>
              </div>
              <div className="flex justify-between">
                <span>xmax:</span> <strong className="text-slate-900">{xmax}</strong>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 text-center leading-relaxed">
              모서리 핸들을 드래그하거나 내부를 잡고 이동하여 배지 본체가 꽉 차도록 조절하세요.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-xl text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition-colors"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-colors"
          >
            <Check className="w-4 h-4" />
            <span>크롭 영역 적용 및 저장</span>
          </button>
        </div>
      </div>
    </div>
  );
};
