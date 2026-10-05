import React from 'react';
import { Microscope, Sparkles, RefreshCw, Trash2, FolderOpen } from 'lucide-react';
import { PlateItem } from '../types';

interface NavbarProps {
  plates: PlateItem[];
  isAnalyzingBatch: boolean;
  onLoadSamples: () => void;
  onAnalyzeAll: () => void;
  onClearAll: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  plates,
  isAnalyzingBatch,
  onLoadSamples,
  onAnalyzeAll,
  onClearAll,
}) => {
  const totalCount = plates.length;
  const doneCount = plates.filter((p) => p.status === 'done').length;
  const pendingCount = plates.filter((p) => p.status === 'idle' || p.status === 'error').length;
  const cfuDetectedCount = plates.filter((p) => p.status === 'done' && p.colonyCount > 0).length;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-200">
              <Microscope className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                  제약·바이오 EM 배지 자동 크롭 & 보고서 생성기
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  Gemini 3.7 AI
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                화면 캡쳐본(Ctrl+V) & 사진 지원 • 구역/시험항목 자동 감지 • Word Appendix (.docx) 생성
              </p>
            </div>
          </div>

          {/* Statistics summary */}
          {totalCount > 0 && (
            <div className="hidden md:flex items-center space-x-2 text-xs bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              <span className="text-slate-600">
                총 배지: <strong className="text-slate-900">{totalCount}</strong>건
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-emerald-600">
                완료: <strong>{doneCount}</strong>건
              </span>
              {pendingCount > 0 && (
                <>
                  <span className="text-slate-300">|</span>
                  <span className="text-amber-600">
                    대기: <strong>{pendingCount}</strong>건
                  </span>
                </>
              )}
              {cfuDetectedCount > 0 && (
                <>
                  <span className="text-slate-300">|</span>
                  <span className="text-rose-600 font-medium">
                    집락 검출: <strong>{cfuDetectedCount}</strong>건
                  </span>
                </>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onLoadSamples}
              disabled={isAnalyzingBatch}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 transition-colors disabled:opacity-50"
              title="테스트용 샘플 배지 3종을 즉시 로드합니다"
            >
              <FolderOpen className="w-3.5 h-3.5 text-slate-500" />
              <span>샘플 불러오기</span>
            </button>

            {pendingCount > 0 && (
              <button
                type="button"
                onClick={onAnalyzeAll}
                disabled={isAnalyzingBatch}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-xs transition-colors disabled:opacity-50"
              >
                {isAnalyzingBatch ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>AI 분석중...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>전체 분석 ({pendingCount})</span>
                  </>
                )}
              </button>
            )}

            {totalCount > 0 && (
              <button
                type="button"
                onClick={onClearAll}
                disabled={isAnalyzingBatch}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
                title="목록 비우기"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
