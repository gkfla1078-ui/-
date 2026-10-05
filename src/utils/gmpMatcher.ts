import { PlateItem, GmpMatchedRow, GmpReportConfig, GmpMediaCategory, GmpMonitoringType } from '../types';

export function getMonitoringTitles(type: GmpMonitoringType): {
  journalTitle: string;
  testItem: string;
} {
  return {
    journalTitle: `${type} 사진 일지`,
    testItem: `미생물 모니터링 결과 - ${type} 사진`,
  };
}

export const DEFAULT_GMP_CONFIG: GmpReportConfig = {
  formNumber: 'BQ-064-002-02',
  revisionText: 'Revision : 1(2025-10-01)',
  paperSize: 'A4(210X297)',
  companyLogo: 'BiONEER',
  monitoringType: '낙하균',
  journalTitle: '낙하균 사진 일지',
  testItem: '미생물 모니터링 결과 - 낙하균 사진',
  testLocation: 'Accuprep 분주실',
  measurementPeriod: '1차 2026-04-28/2026-05-03~2026-05-05',
  measurementStatus: 'In operation',
  imageWidthInches: 2.1,
};

/**
 * Parses and extracts:
 * 1. Normalized Location Code (e.g. M3E09-1 (TSA) -> "3E09-1", 3E07-1 -> "3E07-1")
 * 2. Medium category: 'bacteria' (세균 - TSA) vs 'fungi' (진균 - SDA / SDAC)
 */
export function parseLocationAndMedia(plate: PlateItem): {
  locationCode: string;
  category: GmpMediaCategory;
  rawMedia: string;
} {
  // If user explicitly overrode in plate item
  if (plate.locationCode && plate.gmpCategory) {
    return {
      locationCode: plate.locationCode,
      category: plate.gmpCategory,
      rawMedia: plate.mediaType || (plate.gmpCategory === 'bacteria' ? 'TSA' : 'SDA'),
    };
  }

  const textToScan = `${plate.zone || ''} ${plate.rawLabel || ''} ${plate.filename || ''} ${plate.mediaType || ''} ${plate.remarks || ''}`;

  // 1. Determine category: 'bacteria' (세균 - TSA) vs 'fungi' (진균 - SDA / SDAC)
  let category: GmpMediaCategory = 'bacteria';
  const isFungi = /SDA|SDAC|진균|Fungi|곰팡이/i.test(textToScan);
  const isBacteria = /TSA|세균|Bacteria/i.test(textToScan);

  if (isFungi && !isBacteria) {
    category = 'fungi';
  } else if (isBacteria && !isFungi) {
    category = 'bacteria';
  } else if (isFungi && isBacteria) {
    // Discriminate based on mediaType first
    if (/SDA|SDAC|진균/i.test(plate.mediaType || '')) {
      category = 'fungi';
    } else {
      category = 'bacteria';
    }
  } else {
    // Default fallback
    if (/SDA|SDAC/i.test(plate.mediaType || '')) {
      category = 'fungi';
    } else {
      category = 'bacteria';
    }
  }

  // 2. Extract and Normalize Location Code
  let rawLoc = (plate.locationCode || plate.zone || plate.plateId || plate.filename || '위치')
    .replace(/\(.*?\)/g, '') // remove (TSA), (SDA), (SDAC)
    .replace(/\[.*?\]/g, '') // remove [TSA], [SDA]
    .replace(/TSA|SDA|SDAC|세균|진균/gi, '') // remove media keywords
    .replace(/[\-_]?(tsa|sda|sdac)$/i, '')
    .trim();

  // Strip leading 'M' if followed by alphanumeric code like M3E09-1 -> 3E09-1
  // As specified: "M3E09-1 (TSA) -> 1열 측정위치: 3E09-1"
  const mMatch = rawLoc.match(/^M([0-9][A-Z0-9\-_.]*)$/i);
  if (mMatch) {
    rawLoc = mMatch[1];
  }

  if (!rawLoc) {
    rawLoc = plate.zone || '3E01-1';
  }

  const rawMedia = plate.mediaType || (category === 'bacteria' ? 'TSA' : 'SDA');

  return {
    locationCode: rawLoc,
    category,
    rawMedia,
  };
}

/**
 * Groups a flat list of plates into paired 3-column rows:
 * 1열: 측정위치 (Location Code)
 * 2열: 세균 (TSA 배지 사진 및 결과)
 * 3열: 진균 (SDA/SDAC 배지 사진 및 결과)
 */
export function groupPlatesToGmpRows(plates: PlateItem[]): GmpMatchedRow[] {
  const rowMap = new Map<string, GmpMatchedRow>();

  // Only consider active plates
  const targetPlates = plates.filter((p) => p.croppedImage || p.originalImage);

  for (const plate of targetPlates) {
    const { locationCode, category } = parseLocationAndMedia(plate);

    let row = rowMap.get(locationCode);
    if (!row) {
      row = {
        locationCode,
      };
      rowMap.set(locationCode, row);
    }

    if (category === 'bacteria') {
      if (!row.bacteriaPlate) {
        row.bacteriaPlate = plate;
      } else {
        // If multiple bacteria plates exist for the same code, append with suffix
        const altKey = `${locationCode} (#2)`;
        let altRow = rowMap.get(altKey);
        if (!altRow) {
          altRow = { locationCode: altKey };
          rowMap.set(altKey, altRow);
        }
        altRow.bacteriaPlate = plate;
      }
    } else {
      if (!row.fungiPlate) {
        row.fungiPlate = plate;
      } else {
        const altKey = `${locationCode} (#2)`;
        let altRow = rowMap.get(altKey);
        if (!altRow) {
          altRow = { locationCode: altKey };
          rowMap.set(altKey, altRow);
        }
        altRow.fungiPlate = plate;
      }
    }
  }

  // Sort rows naturally (e.g. 3E07-1, 3E07-2, 3E09-1...)
  return Array.from(rowMap.values()).sort((a, b) =>
    a.locationCode.localeCompare(b.locationCode, undefined, { numeric: true, sensitivity: 'base' })
  );
}
