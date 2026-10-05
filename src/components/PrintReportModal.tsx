import React, { useState } from 'react';
import { X, Printer, FileText, Download, Edit3, Check } from 'lucide-react';
import { PlateItem, GmpReportConfig, GmpMonitoringType } from '../types';
import { groupPlatesToGmpRows, DEFAULT_GMP_CONFIG, getMonitoringTitles } from '../utils/gmpMatcher';
import { generateWordAppendix } from '../utils/docxGenerator';

interface PrintReportModalProps {
  plates: PlateItem[];
  isOpen: boolean;
  onClose: () => void;
  reportDate?: string;
  departmentName?: string;
  config?: GmpReportConfig;
  onUpdateConfig?: (config: GmpReportConfig) => void;
  initialConfig?: Partial<GmpReportConfig>;
}

export const PrintReportModal: React.FC<PrintReportModalProps> = ({
  plates,
  isOpen,
  onClose,
  reportDate,
  departmentName,
  config: externalConfig,
  onUpdateConfig,
  initialConfig,
}) => {
  const [internalConfig, setInternalConfig] = useState<GmpReportConfig>(
    externalConfig || {
      ...DEFAULT_GMP_CONFIG,
      testLocation: initialConfig?.testLocation || departmentName || DEFAULT_GMP_CONFIG.testLocation,
      measurementPeriod: initialConfig?.measurementPeriod || (reportDate ? `1차 ${reportDate}/2026-05-03~2026-05-05` : DEFAULT_GMP_CONFIG.measurementPeriod),
      ...initialConfig,
    }
  );

  const config = externalConfig || internalConfig;
  const setConfig = (newCfg: GmpReportConfig) => {
    setInternalConfig(newCfg);
    if (onUpdateConfig) {
      onUpdateConfig(newCfg);
    }
  };

  const handleSelectMonitoring = (type: GmpMonitoringType) => {
    const titles = getMonitoringTitles(type);
    setConfig({
      ...config,
      monitoringType: type,
      journalTitle: titles.journalTitle,
      testItem: titles.testItem,
    });
  };

  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [isGeneratingDocx, setIsGeneratingDocx] = useState(false);

  if (!isOpen) return null;

  const matchedRows = groupPlatesToGmpRows(plates);

  const handlePrint = () => {
    window.print();
  };

  const handleExportDocx = async () => {
    try {
      setIsGeneratingDocx(true);
      await generateWordAppendix(plates, config);
    } catch (err: any) {
      alert(`Word 보고서 생성 실패: ${err?.message || err}`);
    } finally {
      setIsGeneratingDocx(false);
    }
  };

  const monitoringTypes: GmpMonitoringType[] = ['낙하균', '부유균', '표면균'];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[96vh] print:max-h-none print:shadow-none print:border-none print:rounded-none">
        {/* Top Control Bar (Hidden on Print) */}
        <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50 print:hidden shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-slate-900 text-white shadow-xs">
                <FileText className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-bold text-slate-900 text-base">
                    GMP 환경모니터링 시험 결과 보고서
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-200 text-slate-800 border border-slate-300">
                    {config.formNumber}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {config.journalTitle} (동일 측정위치별 세균 TSA / 진균 SDA 3열 매칭 표준 양식)
                </p>
              </div>
            </div>

            {/* Dynamic Type Selector */}
            <div className="flex items-center bg-slate-200/80 p-1 rounded-xl space-x-1 sm:ml-2">
              {monitoringTypes.map((type) => {
                const isActive = config.monitoringType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleSelectMonitoring(type)}
                    className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-700 hover:text-slate-900 hover:bg-slate-300'
                    }`}
                  >
                    {isActive && <Check className="w-3 h-3" />}
                    <span>{type}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setIsEditingHeader(!isEditingHeader)}
              className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold rounded-xl text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition-colors shadow-2xs"
            >
              <Edit3 className="w-3.5 h-3.5 text-slate-500" />
              <span>{isEditingHeader ? '설정 닫기' : '기본정보 편집'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportDocx}
              disabled={isGeneratingDocx}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isGeneratingDocx ? 'Word 생성중...' : 'Word (.docx) 다운로드'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold rounded-xl text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-xs"
            >
              <Printer className="w-3.5 h-3.5 text-slate-300" />
              <span>인쇄 (Print)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Optional Editable Config Drawer (Hidden on Print) */}
        {isEditingHeader && (
          <div className="px-6 py-4 bg-blue-50/70 border-b border-blue-200 text-xs text-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 print:hidden shrink-0">
            <div>
              <label className="block font-semibold text-slate-600 mb-1">시험 항목</label>
              <input
                type="text"
                value={config.testItem}
                onChange={(e) => setConfig({ ...config, testItem: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">시험 장소</label>
              <input
                type="text"
                value={config.testLocation}
                onChange={(e) => setConfig({ ...config, testLocation: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">측정 일자/확인일자</label>
              <input
                type="text"
                value={config.measurementPeriod}
                onChange={(e) => setConfig({ ...config, measurementPeriod: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">측정 상태</label>
              <input
                type="text"
                value={config.measurementStatus}
                onChange={(e) => setConfig({ ...config, measurementStatus: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900"
              />
            </div>
          </div>
        )}

        {/* Printable Standard Document Area */}
        <div className="p-6 sm:p-10 overflow-y-auto flex-1 bg-white text-slate-900 print:p-0 print:overflow-visible">
          <div className="max-w-4xl mx-auto bg-white p-6 sm:p-8 rounded-lg shadow-xs border border-slate-200 print:border-none print:p-0 print:shadow-none print:max-w-none">
            {/* [1. 최상단 머리글] (테이블 외부 좌/우 배치) */}
            <div className="flex items-center justify-between pb-3 border-b-2 border-black mb-3">
              <div className="text-2xl font-black tracking-tight text-black font-sans">
                {config.companyLogo}
              </div>
              <div className="text-xs sm:text-sm font-bold text-black font-sans">
                {config.journalTitle} 1/1
              </div>
            </div>

            {/* [2. 상단 기본정보 테이블 구조] */}
            <div className="mb-4 overflow-x-auto">
              <table className="w-full border-collapse border border-black text-xs sm:text-sm">
                <tbody>
                  <tr className="border-b border-black">
                    <td className="w-1/4 bg-slate-100/90 px-3 py-2.5 font-bold text-center border-r border-black text-black">
                      시험 항목
                    </td>
                    <td className="px-3 py-2 font-semibold text-black">
                      {config.testItem}
                    </td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="w-1/4 bg-slate-100/90 px-3 py-2.5 font-bold text-center border-r border-black text-black">
                      시험 장소
                    </td>
                    <td className="px-3 py-2 font-medium text-black">
                      {config.testLocation}
                    </td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="w-1/4 bg-slate-100/90 px-3 py-2.5 font-bold text-center border-r border-black text-black">
                      측정 일자/확인일자
                    </td>
                    <td className="px-3 py-2 font-medium text-black">
                      {config.measurementPeriod}
                    </td>
                  </tr>
                  <tr>
                    <td className="w-1/4 bg-slate-100/90 px-3 py-2.5 font-bold text-center border-r border-black text-black">
                      측정 상태
                    </td>
                    <td className="px-3 py-2 font-medium text-black">
                      {config.measurementStatus}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* [3. 메인 결과 매칭 테이블 구조 (핵심)] */}
            {/* 1열: 측정위치 | 2열: 세균 (TSA 사진만) | 3열: 진균 (SDA/SDAC 사진만) */}
            {/* 셀 내부에는 불필요한 텍스트 설정을 거치지 않고 깔끔하게 크롭된 배지 사진만 보여주도록 처리 */}
            <div className="overflow-x-auto mb-6">
              <table className="w-full border-collapse border border-black text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-100/90 border-b border-black text-center font-bold text-black">
                    <th className="w-[20%] border-r border-black py-2.5 px-2">
                      측정위치
                    </th>
                    <th className="w-[40%] border-r border-black py-2.5 px-3">
                      <span>세균</span>
                      <span className="text-xs font-normal text-slate-600 ml-1">(TSA)</span>
                    </th>
                    <th className="w-[40%] py-2.5 px-3">
                      <span>진균</span>
                      <span className="text-xs font-normal text-slate-600 ml-1">(SDA/SDAC)</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {matchedRows.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-center py-8 text-slate-400">
                        등록된 배지 사진이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    matchedRows.map((row, idx) => {
                      const bac = row.bacteriaPlate;
                      const fun = row.fungiPlate;

                      return (
                        <tr key={row.locationCode || idx} className="border-b border-black">
                          {/* 1열: 측정위치 (예: 3E07-1, 3E07-2, 3E09-1) */}
                          <td className="border-r border-black p-3 text-center align-middle font-bold text-sm sm:text-base text-black bg-slate-50/40">
                            <span>{row.locationCode}</span>
                          </td>

                          {/* 2열: 세균 (TSA 배지 관찰 사진만 배치) */}
                          <td className="border-r border-black p-3 sm:p-4 text-center align-middle">
                            {bac ? (
                              <div className="flex flex-col items-center justify-center">
                                <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-lg overflow-hidden bg-slate-900 border border-black flex items-center justify-center shadow-xs">
                                  <img
                                    src={bac.croppedImage || bac.originalImage}
                                    alt={`${row.locationCode} TSA`}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="py-12 text-center text-slate-300">
                                <span className="block text-2xl font-light">-</span>
                              </div>
                            )}
                          </td>

                          {/* 3열: 진균 (SDA/SDAC 배지 관찰 사진만 배치) */}
                          <td className="p-3 sm:p-4 text-center align-middle">
                            {fun ? (
                              <div className="flex flex-col items-center justify-center">
                                <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-lg overflow-hidden bg-slate-900 border border-black flex items-center justify-center shadow-xs">
                                  <img
                                    src={fun.croppedImage || fun.originalImage}
                                    alt={`${row.locationCode} SDA`}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="py-12 text-center text-slate-300">
                                <span className="block text-2xl font-light">-</span>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* [4. 최하단 바닥글 필수 규칙] */}
            <div className="pt-3 border-t border-black flex items-center justify-between text-xs text-black font-medium">
              <div className="w-1/3 text-left font-mono font-semibold">
                {config.formNumber}
              </div>
              <div className="w-1/3 text-center">
                {config.revisionText}
              </div>
              <div className="w-1/3 text-right">
                {config.paperSize}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
