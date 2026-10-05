import React from 'react';
import {
  Crop,
  Sparkles,
  Trash2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Eye,
  Tag,
  Calendar,
  Download,
  FileText,
  MapPin,
} from 'lucide-react';
import saveAs from 'file-saver';
import { PlateItem, TestType } from '../types';
import { parseLocationAndMedia } from '../utils/gmpMatcher';

interface PlateCardProps {
  plate: PlateItem;
  index: number;
  onUpdate: (id: string, updates: Partial<PlateItem>) => void;
  onDelete: (id: string) => void;
  onOpenCropEditor: (plate: PlateItem) => void;
  onReanalyze: (id: string) => void;
}

const TEST_TYPE_OPTIONS: { label: string; value: TestType; colorClass: string }[] = [
  { label: '부유균', value: '부유균', colorClass: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' },
  { label: '낙하균', value: '낙하균', colorClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' },
  { label: '표면균', value: '표면균', colorClass: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' },
  { label: '작업자', value: '작업자모니터링', colorClass: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100' },
];

export const PlateCard: React.FC<PlateCardProps> = ({
  plate,
  index,
  onUpdate,
  onDelete,
  onOpenCropEditor,
  onReanalyze,
}) => {
  const isAnalyzing = plate.status === 'analyzing';
  const isError = plate.status === 'error';
  const isDone = plate.status === 'done';

  const [ymin, xmin, ymax, xmax] = plate.box || [100, 100, 900, 900];
  const boxTop = `${ymin / 10}%`;
  const boxLeft = `${xmin / 10}%`;
  const boxWidth = `${(xmax - xmin) / 10}%`;
  const boxHeight = `${(ymax - ymin) / 10}%`;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow overflow-hidden flex flex-col md:flex-row">
      {/* Visual Section: Original + Cropped comparison */}
      <div className="p-4 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200 flex flex-row sm:flex-col items-center justify-center gap-3 w-full md:w-64 shrink-0">
        <div className="flex flex-col items-center w-1/2 sm:w-full">
          <span className="text-[11px] font-semibold text-slate-500 mb-1 flex items-center space-x-1">
            <Eye className="w-3 h-3" />
            <span>원본 및 인식 영역</span>
          </span>
          <div
            onClick={() => onOpenCropEditor(plate)}
            className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-xl overflow-hidden bg-slate-900 border border-slate-300 cursor-pointer group shadow-inner"
            title="클릭하여 크롭 영역 편집"
          >
            <img
              src={plate.originalImage}
              alt={plate.filename}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
            {/* Box highlight */}
            <div
              style={{
                top: boxTop,
                left: boxLeft,
                width: boxWidth,
                height: boxHeight,
              }}
              className="absolute border-2 border-blue-400 bg-blue-500/20 shadow-xs pointer-events-none ring-1 ring-white/50"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-semibold space-x-1">
              <Crop className="w-4 h-4" />
              <span>영역 수정</span>
            </div>
          </div>
        </div>

        {/* Cropped Output Preview */}
        <div className="flex flex-col items-center w-1/2 sm:w-full">
          <span className="text-[11px] font-semibold text-blue-700 mb-1 flex items-center space-x-1">
            <Crop className="w-3 h-3" />
            <span>크롭 배지 (Appendix용)</span>
          </span>
          <div
            onClick={() => onOpenCropEditor(plate)}
            className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-xl overflow-hidden bg-slate-900 border-2 border-blue-500 cursor-pointer shadow-sm group"
            title="클릭하여 크롭 영역 수정"
          >
            {plate.croppedImage ? (
              <img
                src={plate.croppedImage}
                alt="Cropped"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                미생성
              </div>
            )}
            <div className="absolute bottom-1 right-1 bg-slate-900/80 text-white text-[9px] px-1.5 py-0.5 rounded font-medium">
              Cropped
            </div>
          </div>
        </div>
      </div>

      {/* Details & Form Section */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          {/* Top row: Index, CropID, Mapped Filename, Recognized Number Badge, Status Badge, Delete */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center shrink-0">
                {index + 1}
              </span>
              {plate.cropId && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-slate-900 text-amber-300 border border-slate-700 shadow-2xs">
                  {plate.cropId}
                </span>
              )}
              {plate.customFileName && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-blue-50 text-blue-800 border border-blue-200">
                  <FileText className="w-3 h-3 mr-1 text-blue-600" />
                  {plate.customFileName}
                </span>
              )}
              {plate.recognizedNumber && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                  손글씨 #{plate.recognizedNumber}
                </span>
              )}
              <span className="text-xs font-medium text-slate-500 truncate max-w-[120px] sm:max-w-[160px]" title={plate.filename}>
                원본: {plate.filename}
              </span>
              {plate.multiPlateInfo && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  다중 객체 #{plate.multiPlateInfo.index}/{plate.multiPlateInfo.total}
                </span>
              )}
            </div>

            {/* Status indicator */}
            <div className="flex items-center space-x-2">
              {isAnalyzing && (
                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>AI 분석중</span>
                </span>
              )}
              {isDone && (
                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>분석 완료</span>
                </span>
              )}
              {isError && (
                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                  <AlertCircle className="w-3 h-3" />
                  <span>오류 발생</span>
                </span>
              )}

              <button
                type="button"
                onClick={() => onDelete(plate.id)}
                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                title="삭제"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Error Notice Banner if analysis failed */}
          {isError && (
            <div className="mb-3 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center space-x-2 text-rose-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>
                  {plate.error?.includes('503') || plate.error?.includes('high demand')
                    ? 'AI 서버 트래픽 급증으로 분석이 지연되었습니다. [AI 재분석]을 눌러 다시 시도하세요.'
                    : plate.error || 'AI 분석 중 일시적 오류가 발생했습니다.'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onReanalyze(plate.id)}
                disabled={isAnalyzing}
                className="shrink-0 px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg shadow-2xs transition-colors flex items-center space-x-1"
              >
                <RefreshCw className={`w-3 h-3 ${isAnalyzing ? 'animate-spin' : ''}`} />
                <span>재시도</span>
              </button>
            </div>
          )}

          {/* Form fields: Zone, Location Code, Category, Media, CFU */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            {/* Zone Name (구역명 / 라벨) */}
            <div className="sm:col-span-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center space-x-1">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                <span>라벨 / 원본 구역</span>
              </label>
              <input
                type="text"
                value={plate.zone}
                onChange={(e) => onUpdate(plate.id, { zone: e.target.value })}
                placeholder="예: M3E09-1 (TSA)"
                className="w-full px-3 py-1.5 text-sm font-medium text-slate-900 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden transition-all"
              />
            </div>

            {/* Location Code (측정위치 - GMP 표준 1열 매칭 키) */}
            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center space-x-1">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                <span>측정위치 (1열)</span>
              </label>
              <input
                type="text"
                value={plate.locationCode || parseLocationAndMedia(plate).locationCode}
                onChange={(e) => onUpdate(plate.id, { locationCode: e.target.value })}
                placeholder="예: 3E07-1, 3E09-1"
                className="w-full px-3 py-1.5 text-sm font-bold text-blue-900 bg-blue-50/50 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>

            {/* GMP Media Category (세균 2열 vs 진균 3열) */}
            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                표준 양식 구분
              </label>
              <div className="flex rounded-lg border border-slate-300 p-0.5 bg-slate-100">
                <button
                  type="button"
                  onClick={() =>
                    onUpdate(plate.id, { gmpCategory: 'bacteria', mediaType: plate.mediaType || 'TSA' })
                  }
                  className={`flex-1 py-1 text-xs font-bold rounded-md transition-all ${
                    (plate.gmpCategory || parseLocationAndMedia(plate).category) === 'bacteria'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  세균 (TSA)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onUpdate(plate.id, { gmpCategory: 'fungi', mediaType: plate.mediaType || 'SDA' })
                  }
                  className={`flex-1 py-1 text-xs font-bold rounded-md transition-all ${
                    (plate.gmpCategory || parseLocationAndMedia(plate).category) === 'fungi'
                      ? 'bg-purple-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  진균 (SDA)
                </button>
              </div>
            </div>

            {/* Colony Count (검출 균수) */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span>균수</span>
                {plate.colonyCount === 0 ? (
                  <span className="text-[10px] text-emerald-600 font-bold">적합</span>
                ) : (
                  <span className="text-[10px] text-rose-600 font-bold">검출</span>
                )}
              </label>
              <div className="flex items-center space-x-1">
                <input
                  type="number"
                  min="0"
                  value={plate.colonyCount}
                  onChange={(e) =>
                    onUpdate(plate.id, { colonyCount: Math.max(0, parseInt(e.target.value) || 0) })
                  }
                  className={`w-full px-2 py-1.5 text-sm font-bold rounded-xl border focus:ring-2 outline-hidden text-center ${
                    plate.colonyCount > 0
                      ? 'border-rose-300 bg-rose-50 text-rose-800 focus:ring-rose-400'
                      : 'border-slate-300 bg-white text-slate-900 focus:ring-blue-500'
                  }`}
                />
                <span className="text-[10px] text-slate-500 font-semibold shrink-0">CFU</span>
              </div>
            </div>

            {/* Test Type Pills (시험항목) */}
            <div className="sm:col-span-12">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                시험 항목 선택
              </label>
              <div className="flex flex-wrap items-center gap-1.5">
                {TEST_TYPE_OPTIONS.map((opt) => {
                  const isSelected = plate.testType === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => onUpdate(plate.id, { testType: opt.value })}
                      className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all ${
                        isSelected
                          ? opt.value === '부유균'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : opt.value === '낙하균'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : opt.value === '표면균'
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                            : 'bg-purple-600 text-white border-purple-600 shadow-xs'
                          : opt.colorClass
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Remarks / Raw Label Detected */}
            <div className="sm:col-span-12">
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span>관찰 특이사항 및 AI 판독 결과</span>
                {plate.rawLabel && (
                  <span className="text-[10px] text-slate-400 font-mono truncate max-w-xs" title={plate.rawLabel}>
                    라벨: {plate.rawLabel}
                  </span>
                )}
              </label>
              <input
                type="text"
                value={plate.remarks}
                onChange={(e) => onUpdate(plate.id, { remarks: e.target.value })}
                placeholder="특이사항 (예: 0 CFU 적합 판정, 배지 정상 배양)"
                className="w-full px-3 py-1.5 text-xs text-slate-700 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-1.5 text-xs text-slate-400">
            <Calendar className="w-3.5 h-3.5" />
            <span>채취일: {plate.samplingDate || '2026-08-30'}</span>
          </div>

          <div className="flex items-center space-x-2">
            {plate.croppedImage && (
              <button
                type="button"
                onClick={() => {
                  const fileName = plate.customFileName || (plate.recognizedNumber ? `kit_${plate.recognizedNumber}.jpg` : `${plate.cropId || 'crop'}.jpg`);
                  saveAs(plate.croppedImage!, fileName);
                }}
                className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors"
                title="크롭 이미지 개별 다운로드"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{plate.customFileName || '다운로드'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onOpenCropEditor(plate)}
              className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              <Crop className="w-3.5 h-3.5 text-slate-500" />
              <span>크롭 영역 편집</span>
            </button>

            <button
              type="button"
              onClick={() => onReanalyze(plate.id)}
              disabled={isAnalyzing}
              className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI 재분석</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
