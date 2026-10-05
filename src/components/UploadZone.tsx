import React, { useRef, useState } from 'react';
import { UploadCloud, Camera, Sparkles, Image as ImageIcon, ClipboardPaste, Keyboard } from 'lucide-react';

interface UploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  isAnalyzing: boolean;
  onPasteFromClipboard?: () => void;
}

export const UploadZone: React.FC<UploadZoneProps> = ({
  onFilesSelected,
  isAnalyzing,
  onPasteFromClipboard,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const fileList: File[] = Array.from(e.dataTransfer.files);
      const validFiles = fileList.filter((file) => file.type.startsWith('image/'));
      if (validFiles.length > 0) {
        onFilesSelected(validFiles);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const fileList: File[] = Array.from(e.target.files);
      const validFiles = fileList.filter((file) => file.type.startsWith('image/'));
      if (validFiles.length > 0) {
        onFilesSelected(validFiles);
      }
      e.target.value = '';
    }
  };

  const handleManualClipboardRead = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.read) {
        const items = await navigator.clipboard.read();
        const pastedFiles: File[] = [];
        for (const item of items) {
          const imageType = item.types.find((t) => t.startsWith('image/'));
          if (imageType) {
            const blob = await item.getType(imageType);
            const file = new File(
              [blob],
              `clipboard_capture_${Date.now()}.${imageType.split('/')[1] || 'png'}`,
              { type: imageType }
            );
            pastedFiles.push(file);
          }
        }
        if (pastedFiles.length > 0) {
          onFilesSelected(pastedFiles);
          return;
        }
      }
    } catch (err) {
      console.warn('Direct clipboard read failed or permission denied, using event paste:', err);
    }
    // Call fallback if provided
    if (onPasteFromClipboard) {
      onPasteFromClipboard();
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative border-2 border-dashed rounded-2xl p-6 sm:p-8 transition-all text-center ${
        isDragOver
          ? 'border-blue-500 bg-blue-50/70 scale-[0.998]'
          : 'border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50/50 shadow-xs'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="flex flex-col items-center justify-center max-w-xl mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-blue-100/80 text-blue-600 flex items-center justify-center mb-3 shadow-inner">
          <UploadCloud className="w-7 h-7" />
        </div>

        <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-1">
          배지 사진 파일 업로드 및 화면 캡쳐본(클립보드) 추가
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 mb-4 leading-relaxed">
          사진 파일(JPG/PNG/WEBP)을 드래그하거나 선택하세요. <strong>어디서든 Ctrl+V</strong>를 누르면 캡쳐본이 즉시 추가됩니다.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isAnalyzing}
            className="inline-flex items-center space-x-2 px-4 py-2 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-xs transition-all disabled:opacity-50"
          >
            <ImageIcon className="w-4 h-4" />
            <span>사진 파일 선택</span>
          </button>

          <button
            type="button"
            onClick={handleManualClipboardRead}
            disabled={isAnalyzing}
            className="inline-flex items-center space-x-2 px-4 py-2 text-sm font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-all disabled:opacity-50"
            title="클립보드에 복사된 캡쳐 이미지를 붙여넣습니다"
          >
            <ClipboardPaste className="w-4 h-4 text-blue-300" />
            <span>클립보드 붙여넣기</span>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-slate-700 text-slate-200 rounded">
              Ctrl+V
            </kbd>
          </button>

          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            disabled={isAnalyzing}
            className="inline-flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all disabled:opacity-50"
          >
            <Camera className="w-4 h-4 text-slate-500" />
            <span>카메라 촬영</span>
          </button>
        </div>

        {/* Pro Tip Info Banner */}
        <div className="mt-4 p-3 bg-blue-50/70 border border-blue-200/70 rounded-xl w-full text-xs text-blue-900 flex items-start space-x-2 text-left">
          <Keyboard className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <strong>💡 캡쳐본 입력 팁:</strong> <kbd className="font-mono font-semibold bg-white px-1.5 py-0.5 rounded border border-blue-200 text-[11px]">Win + Shift + S</kbd> 로 배지 화면을 캡쳐한 후 브라우저 어디서나 <kbd className="font-mono font-semibold bg-white px-1.5 py-0.5 rounded border border-blue-200 text-[11px]">Ctrl + V</kbd>를 누르면 AI가 즉시 분석 및 자동 크롭합니다.
          </div>
        </div>

        <div className="mt-3 pt-2 border-t border-slate-100 w-full flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-slate-400">
          <span className="flex items-center space-x-1">
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            <span>라벨 구역명 / 시험항목(부유·낙하·표면) 자동 감지</span>
          </span>
          <span>•</span>
          <span>배지 중심 Bounding Box 자동 Crop</span>
          <span>•</span>
          <span>워드 부록(.docx) 다운로드</span>
        </div>
      </div>
    </div>
  );
};

