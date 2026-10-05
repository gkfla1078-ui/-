import JSZip from 'jszip';
import saveAs from 'file-saver';
import { PlateItem } from '../types';

/**
 * Exports all cropped plates as a ZIP archive
 */
export async function exportCroppedPlatesZip(plates: PlateItem[]): Promise<void> {
  const validPlates = plates.filter((p) => p.croppedImage);
  if (validPlates.length === 0) {
    throw new Error('다운로드할 크롭된 배지 이미지가 없습니다.');
  }

  const zip = new JSZip();
  const folder = zip.folder('cropped_plates') || zip;

  let csvContent = '\uFEFFNo,Crop_ID,손글씨/인식번호,구역/라벨명,시험항목,배지/키트종류,카운트/균수,채취일자,비고,파일명\n';

  validPlates.forEach((plate, index) => {
    const num = String(index + 1).padStart(2, '0');
    const cropId = plate.cropId || `crop_${num}`;
    
    // Resolve filename according to instructions: kit_51.jpg or crop_01.jpg
    let fileName = plate.customFileName;
    if (!fileName) {
      if (plate.recognizedNumber) {
        fileName = `kit_${plate.recognizedNumber}.jpg`;
      } else {
        fileName = `crop_${num}.jpg`;
      }
    }

    if (plate.croppedImage) {
      const base64Data = plate.croppedImage.split(',')[1];
      folder.file(fileName, base64Data, { base64: true });
    }

    csvContent += `"${index + 1}","${cropId}","${plate.recognizedNumber || '-'}","${plate.zone}","${plate.testType}","${plate.mediaType}","${plate.colonyCount}","${plate.samplingDate}","${(plate.remarks || '').replace(/"/g, '""')}","${fileName}"\n`;
  });

  zip.file('EM_Plate_List.csv', csvContent);

  const content = await zip.generateAsync({ type: 'blob' });
  const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
  saveAs(content, `EM_Cropped_Plates_${dateStr}.zip`);
}

/**
 * Exports table data as CSV file
 */
export function exportPlatesCSV(plates: PlateItem[]): void {
  let csvContent = '\uFEFFNo,구역명,시험항목,배지종류,균수(CFU),채취일자,라벨인식결과,비고\n';

  plates.forEach((plate, index) => {
    csvContent += `"${index + 1}","${plate.zone}","${plate.testType}","${plate.mediaType}","${plate.colonyCount}","${plate.samplingDate}","${(plate.rawLabel || '').replace(/"/g, '""')}","${(plate.remarks || '').replace(/"/g, '""')}"\n`;
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
  saveAs(blob, `EM_Plate_Data_${dateStr}.csv`);
}
