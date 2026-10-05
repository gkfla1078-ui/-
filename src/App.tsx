import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { UploadZone } from './components/UploadZone';
import { PlateCard } from './components/PlateCard';
import { CropEditorModal } from './components/CropEditorModal';
import { ExportBar } from './components/ExportBar';
import { PrintReportModal } from './components/PrintReportModal';
import { GmpStandardTableView } from './components/GmpStandardTableView';
import { PlateItem, GmpReportConfig } from './types';
import { readFileAsDataURL, cropImageWithBox, getImageDimensions, optimizeImageForAnalysis } from './utils/imageCropper';
import { createSamplePlates } from './utils/sampleData';
import { DEFAULT_GMP_CONFIG, groupPlatesToGmpRows } from './utils/gmpMatcher';
import { generateWordAppendix } from './utils/docxGenerator';
import {
  Microscope,
  FileCheck,
  Crop,
  Layers,
  Sparkles,
  Filter,
  ClipboardPaste,
  CheckCircle2,
  Table,
  SlidersHorizontal,
} from 'lucide-react';

export default function App() {
  const [plates, setPlates] = useState<PlateItem[]>([]);
  const [isAnalyzingBatch, setIsAnalyzingBatch] = useState(false);
  const [editingCropPlate, setEditingCropPlate] = useState<PlateItem | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [reportDate, setReportDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [departmentName, setDepartmentName] = useState('QC 미생물시험실');
  const [filterType, setFilterType] = useState<string>('all');
  const [pasteToast, setPasteToast] = useState<string | null>(null);
  const [gmpConfig, setGmpConfig] = useState<GmpReportConfig>(DEFAULT_GMP_CONFIG);
  const [activeViewMode, setActiveViewMode] = useState<'gmp-standard' | 'individual'>('gmp-standard');
  const [isExportingDocx, setIsExportingDocx] = useState(false);

  // Analyze single or multi plate image via backend Gemini API
  const analyzePlate = useCallback(async (plateId: string, currentPlates?: PlateItem[]) => {
    const list = currentPlates || plates;
    const target = list.find((p) => p.id === plateId);
    if (!target) return;

    setPlates((prev) =>
      prev.map((p) => (p.id === plateId ? { ...p, status: 'analyzing', error: undefined } : p))
    );

    try {
      const optimizedImage = await optimizeImageForAnalysis(target.originalImage, 1600);
      const response = await fetch('/api/analyze-plate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: optimizedImage,
          mimeType: 'image/jpeg',
        }),
      });

      let resData: any = {};
      try {
        resData = await response.json();
      } catch {
        resData = { success: false, error: `서버 응답 오류 (${response.status} ${response.statusText})` };
      }

      if (!response.ok || !resData.success) {
        throw new Error(resData.error || `AI 분석 실패 (${response.status})`);
      }

      const detectedPlates: any[] =
        Array.isArray(resData.plates) && resData.plates.length > 0
          ? resData.plates
          : [resData.result || {}];

      if (detectedPlates.length > 1) {
        // Multi-object detected in single image: sequential auto-crop for each detected object
        const createdPlates: PlateItem[] = [];

        for (let i = 0; i < detectedPlates.length; i++) {
          const pData = detectedPlates[i];
          const pBox = (pData.box || [100, 100, 900, 900]) as [number, number, number, number];
          const { croppedUrl } = await cropImageWithBox(target.originalImage, pBox);
          const seqNum = String(i + 1).padStart(2, '0');
          const cropId = pData.crop_id || `crop_${seqNum}`;
          const recognizedNumber = pData.recognized_number || '';
          const customFileName = pData.file_name || (recognizedNumber ? `kit_${recognizedNumber}.jpg` : `crop_${seqNum}.jpg`);

          createdPlates.push({
            id: i === 0 ? target.id : `plate-multi-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`,
            filename: target.filename,
            originalImage: target.originalImage,
            width: target.width,
            height: target.height,
            croppedImage: croppedUrl,
            status: 'done',
            cropId,
            recognizedNumber,
            customFileName,
            plateId: pData.plate_id || (recognizedNumber ? `kit_${recognizedNumber}` : `객체_${i + 1}`),
            zone: pData.zone || (recognizedNumber ? `Kit ${recognizedNumber}` : `구역 ${i + 1}`),
            testType: pData.type || target.testType || '진단키트/배지',
            box: pBox,
            mediaType: pData.mediaType || target.mediaType || 'Kit',
            rawLabel: pData.rawLabel || (recognizedNumber ? `손글씨: ${recognizedNumber}` : ''),
            colonyCount: typeof pData.colonyCount === 'number' ? pData.colonyCount : 0,
            samplingDate: target.samplingDate || reportDate,
            remarks: pData.remarks || `순차 자동 컷팅 (${customFileName}, ${i + 1}/${detectedPlates.length})`,
            selected: true,
            multiPlateInfo: {
              index: i + 1,
              total: detectedPlates.length,
              sourceFilename: target.filename,
            },
          });
        }

        setPlates((prev) => {
          const index = prev.findIndex((p) => p.id === plateId);
          if (index === -1) return [...prev, ...createdPlates];
          const next = [...prev];
          next.splice(index, 1, ...createdPlates);
          return next;
        });

        const numFound = createdPlates.filter(p => p.recognizedNumber).length;
        setPasteToast(`📷 ${detectedPlates.length}개 객체 탐지 완료 (손글씨 번호 ${numFound}건 인식) : 개별 순차 자동 크롭이 완료되었습니다.`);
        setTimeout(() => setPasteToast(null), 3500);
      } else {
        // Single object in image
        const result = detectedPlates[0] || resData.result;
        const box = (result.box || [100, 100, 900, 900]) as [number, number, number, number];
        const recognizedNumber = result.recognized_number || '';
        const customFileName = result.file_name || (recognizedNumber ? `kit_${recognizedNumber}.jpg` : 'crop_01.jpg');

        // Perform crop with coordinates
        const { croppedUrl } = await cropImageWithBox(target.originalImage, box);

        setPlates((prev) =>
          prev.map((p) =>
            p.id === plateId
              ? {
                  ...p,
                  status: 'done',
                  cropId: result.crop_id || 'crop_01',
                  recognizedNumber,
                  customFileName,
                  plateId: result.plate_id || (recognizedNumber ? `kit_${recognizedNumber}` : '객체_1'),
                  zone: result.zone || p.zone || (recognizedNumber ? `Kit ${recognizedNumber}` : '미지정 구역'),
                  testType: result.type || p.testType || '진단키트/배지',
                  box,
                  mediaType: result.mediaType || p.mediaType || 'Kit',
                  rawLabel: result.rawLabel || (recognizedNumber ? `손글씨: ${recognizedNumber}` : ''),
                  colonyCount: typeof result.colonyCount === 'number' ? result.colonyCount : 0,
                  remarks: result.remarks || (recognizedNumber ? `손글씨 번호 ${recognizedNumber} 인식 완료` : '분석 완료'),
                  croppedImage: croppedUrl,
                }
              : p
          )
        );
      }
    } catch (err: any) {
      console.error(`Error analyzing plate ${plateId}:`, err);
      // Fallback: keep center crop and set error message
      const defaultBox: [number, number, number, number] = target.box || [150, 150, 850, 850];
      const { croppedUrl } = await cropImageWithBox(target.originalImage, defaultBox);

      const errorMessage =
        err?.message === 'Failed to fetch'
          ? '서버 통신 지연 또는 일시적 연결 오류입니다. [재시도]를 클릭해주세요.'
          : err?.message || '분석 오류';

      setPlates((prev) =>
        prev.map((p) =>
          p.id === plateId
            ? {
                ...p,
                status: 'error',
                error: errorMessage,
                box: defaultBox,
                croppedImage: croppedUrl,
              }
            : p
        )
      );
    }
  }, [plates, reportDate]);

  // Handle file uploads
  const handleFilesSelected = useCallback(async (files: File[], sourceLabel: string = '사진') => {
    const newItems: PlateItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const originalImage = await readFileAsDataURL(file);
        const { width, height } = await getImageDimensions(originalImage);
        const defaultBox: [number, number, number, number] = [150, 150, 850, 850];
        const { croppedUrl } = await cropImageWithBox(originalImage, defaultBox);

        const item: PlateItem = {
          id: `plate-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          filename: file.name,
          originalImage,
          width,
          height,
          croppedImage: croppedUrl,
          status: 'idle',
          zone: `구역 ${plates.length + i + 1}`,
          testType: '표면균',
          box: defaultBox,
          mediaType: 'TSA',
          rawLabel: '',
          colonyCount: 0,
          samplingDate: reportDate,
          remarks: '대기 중',
          selected: true,
        };

        newItems.push(item);
      } catch (err) {
        console.error('File read error:', err);
      }
    }

    if (newItems.length === 0) return;

    setPlates((prev) => [...prev, ...newItems]);
    setPasteToast(`${sourceLabel} ${newItems.length}개가 추가되었습니다. AI 분석을 시작합니다.`);
    setTimeout(() => setPasteToast(null), 3500);

    // Automatically analyze the uploaded plates sequentially
    setIsAnalyzingBatch(true);
    for (const item of newItems) {
      await analyzePlate(item.id, [...plates, ...newItems]);
    }
    setIsAnalyzingBatch(false);
  }, [plates, reportDate, analyzePlate]);

  // Global Clipboard Paste Listener (Ctrl+V / Command+V for Win+Shift+S captures)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const pastedImageFiles: File[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const blob = item.getAsFile();
          if (blob) {
            const file = new File(
              [blob],
              `capture_${new Date().toISOString().replace(/[:.]/g, '-')}.png`,
              { type: blob.type }
            );
            pastedImageFiles.push(file);
          }
        }
      }

      if (pastedImageFiles.length > 0) {
        e.preventDefault();
        handleFilesSelected(pastedImageFiles, '클립보드 캡쳐본');
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [handleFilesSelected]);

  // Analyze all idle/error items
  const handleAnalyzeAll = async () => {
    const pending = plates.filter((p) => p.status === 'idle' || p.status === 'error');
    if (pending.length === 0) return;

    setIsAnalyzingBatch(true);
    for (const plate of pending) {
      await analyzePlate(plate.id);
    }
    setIsAnalyzingBatch(false);
  };

  // Load sample dataset
  const handleLoadSamples = async () => {
    try {
      const samplePlates = await createSamplePlates();
      setPlates(samplePlates);
    } catch (err) {
      console.error('Error loading samples:', err);
    }
  };

  const handleUpdatePlate = (id: string, updates: Partial<PlateItem>) => {
    setPlates((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  const handleDeletePlate = (id: string) => {
    setPlates((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSaveCrop = (
    id: string,
    box: [number, number, number, number],
    croppedUrl: string
  ) => {
    setPlates((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              box,
              croppedImage: croppedUrl,
            }
          : p
      )
    );
  };

  const handleClearAll = () => {
    if (window.confirm('등록된 모든 배지 사진을 삭제하시겠습니까?')) {
      setPlates([]);
    }
  };

  // Filter plates by testType
  const filteredPlates = plates.filter((p) => {
    if (filterType === 'all') return true;
    return p.testType === filterType;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900 pb-24">
      {/* Top Navbar */}
      <Navbar
        plates={plates}
        isAnalyzingBatch={isAnalyzingBatch}
        onLoadSamples={handleLoadSamples}
        onAnalyzeAll={handleAnalyzeAll}
        onClearAll={handleClearAll}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Floating Clipboard Toast */}
        {pasteToast && (
          <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center space-x-2.5 animate-bounce text-xs sm:text-sm font-medium">
            <ClipboardPaste className="w-4 h-4 text-blue-400 shrink-0" />
            <span>{pasteToast}</span>
          </div>
        )}

        {/* Page Title & Subtitle banner */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <span>🔬 범용 객체 탐지 · 손글씨 번호 인식 & 개별 자동 크롭 시스템</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            사진 파일 업로드 또는 클립보드 캡쳐본(Ctrl+V)을 지원하며, 십자가 키트/배지/부품을 자동 탐지하고 손글씨 번호 인식(kit_51.jpg 등) 및 1객체 1파일 개별 컷팅을 수행합니다.
          </p>
        </div>

        {plates.length === 0 ? (
          /* Empty / Welcome State */
          <div className="space-y-8">
            <UploadZone
              onFilesSelected={(files) => handleFilesSelected(files, '사진 파일')}
              isAnalyzing={isAnalyzingBatch}
            />

            {/* Quick Demo CTA Banner */}
            <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-900 rounded-2xl p-6 sm:p-8 text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-6 border border-slate-800">
              <div className="space-y-2 text-center sm:text-left">
                <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-400/30">
                  <Sparkles className="w-3.5 h-3.5 text-blue-300" />
                  <span>테스트용 프리셋 제공</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                  사진이 없으신가요? 샘플 키트 및 배지로 1초 만에 테스트해보세요
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
                  손글씨 번호(#51, #52)가 부여된 다중 키트 및 모니터링 배지 5종을 즉시 불러와 개별 컷팅(kit_51.jpg, kit_52.jpg)과 Word 보고서 생성을 체험할 수 있습니다.
                </p>
              </div>

              <button
                type="button"
                onClick={handleLoadSamples}
                className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-md transition-all shrink-0 hover:scale-105"
              >
                <Microscope className="w-5 h-5" />
                <span>샘플 데이터 5종 불러오기</span>
              </button>
            </div>

            {/* Feature Highlights Bento */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Layers className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">
                  1. 객체 자동 탐지 & 손글씨 OCR
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  배열된 십자가 키트, 배지, 부품의 위치를 개별 탐지하고, 표면에 적힌 손글씨 번호(51, 52 등)와 라벨 텍스트를 정확하게 읽어냅니다.
                </p>
              </div>

              <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Crop className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">
                  2. 순차 개별 컷팅 & 여백 보존
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  십자가 상단부터 하단 웰 구조까지 잘리지 않도록 안전 여백을 확보하며, 1객체당 1개의 독립 이미지 파일로 순차 분할합니다.
                </p>
              </div>

              <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <FileCheck className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">
                  3. 파일명 매핑 (kit_51.jpg) & 보고서
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  인식된 숫자로 kit_51.jpg(미인식 시 crop_01.jpg) 자동 매핑 및 개별 다운로드, 일괄 ZIP 및 Word Appendix (.docx)를 출력합니다.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Active Plate View State */
          <div className="space-y-6">
            {/* View Mode Switcher Tab Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center space-x-1.5 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setActiveViewMode('gmp-standard')}
                  className={`inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                    activeViewMode === 'gmp-standard'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Table className="w-4 h-4 text-blue-600" />
                  <span>표준 양식 3열 매칭 뷰 (BQ-064-002-02)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveViewMode('individual')}
                  className={`inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                    activeViewMode === 'individual'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <SlidersHorizontal className="w-4 h-4 text-slate-500" />
                  <span>개별 배지 편집 ({plates.length})</span>
                </button>
              </div>

              {/* Add more plates & clipboard paste */}
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      if (navigator.clipboard && navigator.clipboard.read) {
                        const items = await navigator.clipboard.read();
                        const pastedFiles: File[] = [];
                        for (const item of items) {
                          const imgType = item.types.find((t) => t.startsWith('image/'));
                          if (imgType) {
                            const blob = await item.getType(imgType);
                            pastedFiles.push(
                              new File([blob], `clipboard_${Date.now()}.${imgType.split('/')[1] || 'png'}`, {
                                type: imgType,
                              })
                            );
                          }
                        }
                        if (pastedFiles.length > 0) {
                          handleFilesSelected(pastedFiles, '클립보드 캡쳐본');
                          return;
                        }
                      }
                      setPasteToast('클립보드 이미지가 없습니다. Ctrl+V 키를 직접 눌러주세요.');
                      setTimeout(() => setPasteToast(null), 3000);
                    } catch (e) {
                      setPasteToast('화면 캡쳐 후 Ctrl+V 키를 누르시면 자동 추가됩니다.');
                      setTimeout(() => setPasteToast(null), 3000);
                    }
                  }}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition-colors"
                >
                  <ClipboardPaste className="w-3.5 h-3.5 text-blue-300" />
                  <span>붙여넣기</span>
                  <kbd className="hidden sm:inline-block px-1 py-0.2 text-[9px] bg-slate-700 rounded text-slate-300">
                    Ctrl+V
                  </kbd>
                </button>

                <label className="cursor-pointer inline-flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors border border-blue-200">
                  <span>+ 사진 추가</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files) {
                        handleFilesSelected(Array.from(e.target.files), '사진 파일');
                        e.target.value = '';
                      }
                    }}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* View Mode Content */}
            {activeViewMode === 'gmp-standard' ? (
              <GmpStandardTableView
                plates={plates}
                config={gmpConfig}
                onUpdateConfig={(updates) => setGmpConfig((prev) => ({ ...prev, ...updates }))}
                onUpdatePlate={handleUpdatePlate}
                onOpenCropEditor={(p) => setEditingCropPlate(p)}
                onExportDocx={async () => {
                  try {
                    setIsExportingDocx(true);
                    await generateWordAppendix(plates, gmpConfig);
                  } catch (err: any) {
                    alert(`Word 문서 생성 중 오류: ${err?.message || err}`);
                  } finally {
                    setIsExportingDocx(false);
                  }
                }}
                onPrint={() => setShowPrintModal(true)}
                isExportingDocx={isExportingDocx}
              />
            ) : (
              /* Individual Plate Cards List */
              <div className="space-y-4">
                {/* Filter bar for individual list */}
                <div className="flex flex-wrap items-center gap-2 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-xs font-semibold text-slate-500 flex items-center space-x-1 mr-1">
                    <Filter className="w-3.5 h-3.5" />
                    <span>필터:</span>
                  </span>
                  {['all', '부유균', '낙하균', '표면균', '작업자모니터링'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFilterType(type)}
                      className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                        filterType === type
                          ? 'bg-slate-900 text-white font-bold'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {type === 'all' ? `전체 (${plates.length})` : type}
                    </button>
                  ))}
                </div>

                <div className="space-y-4">
                  {filteredPlates.map((plate, index) => (
                    <PlateCard
                      key={plate.id}
                      plate={plate}
                      index={index}
                      onUpdate={handleUpdatePlate}
                      onDelete={handleDeletePlate}
                      onOpenCropEditor={(p) => setEditingCropPlate(p)}
                      onReanalyze={(id) => analyzePlate(id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Sticky Bottom Export Action Bar */}
      <ExportBar
        plates={plates}
        onOpenPreview={() => setShowPrintModal(true)}
        gmpConfig={gmpConfig}
        setGmpConfig={setGmpConfig}
      />

      {/* Interactive Crop Editor Modal */}
      <CropEditorModal
        plate={editingCropPlate}
        isOpen={Boolean(editingCropPlate)}
        onClose={() => setEditingCropPlate(null)}
        onSave={handleSaveCrop}
        onReanalyze={(id) => analyzePlate(id)}
      />

      {/* Print / Inspector Report Modal */}
      <PrintReportModal
        plates={plates}
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        config={gmpConfig}
        onUpdateConfig={setGmpConfig}
      />
    </div>
  );
}
