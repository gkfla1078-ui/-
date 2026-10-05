import React, { useState } from 'react';
import { FileText, Download, FileSpreadsheet, Eye, Loader2, Settings, Check } from 'lucide-react';
import { PlateItem, GmpReportConfig, GmpMonitoringType } from '../types';
import { generateWordAppendix } from '../utils/docxGenerator';
import { exportCroppedPlatesZip, exportPlatesCSV } from '../utils/zipExporter';
import { DEFAULT_GMP_CONFIG, groupPlatesToGmpRows, getMonitoringTitles } from '../utils/gmpMatcher';

interface ExportBarProps {
  plates: PlateItem[];
  onOpenPreview: () => void;
  gmpConfig: GmpReportConfig;
  setGmpConfig: (config: GmpReportConfig) => void;
}

export const ExportBar: React.FC<ExportBarProps> = ({
  plates,
  onOpenPreview,
  gmpConfig,
  setGmpConfig,
}) => {
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const validPlates = plates.filter((p) => p.croppedImage || p.originalImage);
  const hasPlates = validPlates.length > 0;
  const matchedRows = groupPlatesToGmpRows(plates);

  const monitoringTypes: GmpMonitoringType[] = ['낙하균', '부유균', '표면균'];

  const handleSelectMonitoring = (type: GmpMonitoringType) => {
    const titles = getMonitoringTitles(type);
    setGmpConfig({
      ...gmpConfig,
      monitoringType: type,
      journalTitle: titles.journalTitle,
      testItem: titles.testItem,
    });
  };

  const handleExportDocx = async () => {
    if (!hasPlates) return;
    try {
      setIsExportingDocx(true);
      await generateWordAppendix(plates, gmpConfig);
    } catch (err: any) {
      alert(`Word 문서 생성 중 오류: ${err?.message || err}`);
    } finally {
      setIsExportingDocx(false);
    }
  };

  const handleExportZip = async () => {
    if (!hasPlates) return;
    try {
      setIsExportingZip(true);
      await exportCroppedPlatesZip(plates);
    } catch (err: any) {
      alert(`ZIP 생성 중 오류: ${err?.message || err}`);
    } finally {
      setIsExportingZip(false);
    }
  };

  const handleExportCSV = () => {
    if (!hasPlates) return;
    try {
      exportPlatesCSV(plates);
    } catch (err: any) {
      alert(`CSV 생성 중 오류: ${err?.message || err}`);
    }
  };

  if (plates.length === 0) return null;

  return (
    <div className="sticky bottom-4 z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
      <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left: summary info */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-sm font-bold">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-sm sm:text-base">
                GMP 환경모니터링 보고서 출력
              </span>
              <span className="bg-amber-400/20 text-amber-300 font-mono text-xs px-2 py-0.5 rounded-full font-bold border border-amber-400/30">
                {gmpConfig.formNumber}
              </span>
              <span className="bg-blue-500/20 text-blue-300 text-xs px-2 py-0.5 rounded-full font-medium">
                {matchedRows.length}개 위치 매칭
              </span>
            </div>

            {/* Quick Type Selection */}
            <div className="flex items-center space-x-1.5 mt-1.5">
              <span className="text-xs text-slate-400">모니터링:</span>
              {monitoringTypes.map((type) => {
                const isActive = gmpConfig.monitoringType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleSelectMonitoring(type)}
                    className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                    }`}
                  >
                    {isActive && <Check className="w-2.5 h-2.5" />}
                    <span>{type}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Export buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          {/* Settings button */}
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className="p-2.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
            title="기본정보 및 양식 설정"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Preview Modal button */}
          <button
            type="button"
            onClick={onOpenPreview}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700"
          >
            <Eye className="w-4 h-4 text-slate-400" />
            <span>표준 양식 인쇄 & 미리보기</span>
          </button>

          {/* CSV export */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>CSV</span>
          </button>

          {/* ZIP export */}
          <button
            type="button"
            onClick={handleExportZip}
            disabled={isExportingZip}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors disabled:opacity-50"
          >
            {isExportingZip ? (
              <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
            ) : (
              <Download className="w-4 h-4 text-blue-400" />
            )}
            <span>ZIP 다운로드</span>
          </button>

          {/* Word (.docx) Primary Export Button */}
          <button
            type="button"
            onClick={handleExportDocx}
            disabled={isExportingDocx}
            className="inline-flex items-center space-x-2 px-5 py-2 text-xs sm:text-sm font-bold rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white shadow-md shadow-blue-900/30 transition-all disabled:opacity-50 shrink-0"
          >
            {isExportingDocx ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Word 생성중...</span>
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                <span>Word 보고서 (.docx) 생성</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Settings Dropdown Accordion */}
      {showSettings && (
        <div className="mt-2 bg-slate-800 border border-slate-700 rounded-xl p-4 text-xs text-slate-300 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 shadow-lg">
          <div>
            <label className="block text-slate-400 mb-1">시험 항목</label>
            <input
              type="text"
              value={gmpConfig.testItem}
              onChange={(e) => setGmpConfig({ ...gmpConfig, testItem: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1">시험 장소</label>
            <input
              type="text"
              value={gmpConfig.testLocation}
              onChange={(e) => setGmpConfig({ ...gmpConfig, testLocation: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1">측정 일자/확인일자</label>
            <input
              type="text"
              value={gmpConfig.measurementPeriod}
              onChange={(e) => setGmpConfig({ ...gmpConfig, measurementPeriod: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1">측정 상태</label>
            <input
              type="text"
              value={gmpConfig.measurementStatus}
              onChange={(e) => setGmpConfig({ ...gmpConfig, measurementStatus: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
            />
          </div>
        </div>
      )}
    </div>
  );
};
