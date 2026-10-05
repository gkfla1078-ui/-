export type TestType = '부유균' | '낙하균' | '표면균' | '작업자모니터링' | string;

export interface PlateBoundingBox {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
}

export type GmpMediaCategory = 'bacteria' | 'fungi'; // 세균(TSA) | 진균(SDA/SDAC)
export type GmpMonitoringType = '낙하균' | '부유균' | '표면균';

export interface PlateItem {
  id: string;
  filename: string;
  originalImage: string; // Base64 data URL
  width: number;
  height: number;
  croppedImage: string | null; // Base64 data URL
  status: 'idle' | 'analyzing' | 'done' | 'error';
  error?: string;
  cropId?: string; // e.g. crop_01, crop_02
  recognizedNumber?: string; // e.g. 51, 52 (손글씨/라벨 OCR 숫자)
  customFileName?: string; // e.g. kit_51.jpg or crop_01.jpg
  plateId?: string;
  zone: string; // 구역명 또는 원본 라벨 (예: M3E09-1 (TSA) 또는 3E07-1)
  locationCode?: string; // 정규화된 측정위치 (예: 3E09-1, 3E07-1)
  gmpCategory?: GmpMediaCategory; // 'bacteria' (세균) | 'fungi' (진균)
  testType: TestType;
  box: [number, number, number, number]; // [ymin, xmin, ymax, xmax] 0..1000
  mediaType: string; // 'TSA' | 'SDA' | 'SDAC' 등
  rawLabel: string;
  colonyCount: number;
  samplingDate: string;
  remarks: string;
  selected: boolean;
  multiPlateInfo?: {
    index: number;
    total: number;
    sourceFilename: string;
  };
}

/**
 * BQ-064-002-02 표준 양식 설정 정보
 */
export interface GmpReportConfig {
  formNumber: string; // 'BQ-064-002-02'
  revisionText: string; // 'Revision : 1(2025-10-01)'
  paperSize: string; // 'A4(210X297)'
  companyLogo: string; // 'BiONEER'
  monitoringType: GmpMonitoringType; // '낙하균' | '부유균' | '표면균'
  journalTitle: string; // '[모니터링종류] 사진 일지'
  testItem: string; // '미생물 모니터링 결과 - [모니터링종류] 사진'
  testLocation: string; // 'Accuprep 분주실'
  measurementPeriod: string; // '1차 2026-04-28/2026-05-03~2026-05-05'
  measurementStatus: string; // 'In operation'
  imageWidthInches: number; // default 2.0 inches
}

/**
 * 동일 위치 코드(1열)에 대한 세균(2열)과 진균(3열) 매칭 행
 */
export interface GmpMatchedRow {
  locationCode: string;
  bacteriaPlate?: PlateItem; // 세균 (TSA)
  fungiPlate?: PlateItem; // 진균 (SDA/SDAC)
}

export interface DocxExportOptions {
  title: string;
  companyName: string;
  inspectorName: string;
  reportDate: string;
  includeRemarks: boolean;
  includeColonyCount: boolean;
  imageWidthInches: number;
}

