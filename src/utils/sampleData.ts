import { PlateItem } from '../types';
import { cropImageWithBox } from './imageCropper';

/**
 * Generate simulated Environmental Monitoring agar plate images with labels for testing
 */
// Draw an individual plate on any canvas context
function drawPlateOnCtx(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  zone: string,
  testType: string,
  mediaType: string,
  colonyCount: number,
  agarColor: string,
  plateStyle: 'round' | 'rodac' = 'round',
  plateIdLabel: string = ''
) {
  // Drop shadow for dish
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetX = 10;
  ctx.shadowOffsetY = 15;

  // Dish base outer rim (Petri dish plastic glass)
  ctx.fillStyle = '#E2E8F0';
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Outer plastic ridge
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 8, 0, Math.PI * 2);
  ctx.stroke();

  // Agar culture medium
  const agarGrad = ctx.createRadialGradient(cx - 35, cy - 35, 30, cx, cy, radius);
  if (agarColor === 'amber') {
    agarGrad.addColorStop(0, '#FEF08A');
    agarGrad.addColorStop(0.7, '#EAB308');
    agarGrad.addColorStop(1, '#CA8A04');
  } else if (agarColor === 'light') {
    agarGrad.addColorStop(0, '#FEF9C3');
    agarGrad.addColorStop(0.8, '#FDE047');
    agarGrad.addColorStop(1, '#EAB308');
  } else {
    agarGrad.addColorStop(0, '#FED7AA');
    agarGrad.addColorStop(1, '#F97316');
  }
  ctx.fillStyle = agarGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  // Glass shine
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(cx - 20, cy - 20, radius - 15, 0, Math.PI * 0.75);
  ctx.stroke();

  // Rodac grid if rodac plate
  if (plateStyle === 'rodac') {
    ctx.strokeStyle = 'rgba(180, 100, 20, 0.25)';
    ctx.lineWidth = 1.5;
    const gridStep = 32;
    for (let x = cx - radius + 25; x <= cx + radius - 25; x += gridStep) {
      ctx.beginPath();
      ctx.moveTo(x, cy - radius + 30);
      ctx.lineTo(x, cy + radius - 30);
      ctx.stroke();
    }
    for (let y = cy - radius + 25; y <= cy + radius - 25; y += gridStep) {
      ctx.beginPath();
      ctx.moveTo(cx - radius + 30, y);
      ctx.lineTo(cx + radius - 30, y);
      ctx.stroke();
    }
  }

  // Draw colonies (CFU) if any
  if (colonyCount > 0) {
    const colonyPositions = [
      { x: cx - 40, y: cy + 30, r: 8 },
      { x: cx + 50, y: cy - 45, r: 6 },
      { x: cx + 20, y: cy + 60, r: 7 },
    ];
    for (let i = 0; i < Math.min(colonyCount, colonyPositions.length); i++) {
      const pos = colonyPositions[i];
      const cGrad = ctx.createRadialGradient(pos.x - 1.5, pos.y - 1.5, 1, pos.x, pos.y, pos.r);
      cGrad.addColorStop(0, '#FFFFFF');
      cGrad.addColorStop(0.7, '#FEF08A');
      cGrad.addColorStop(1, '#E2E8F0');
      ctx.fillStyle = cGrad;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, pos.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  // Label sticker on the plate lid or bottom
  ctx.save();
  ctx.translate(cx, cy + radius * 0.42);
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowBlur = 6;
  ctx.fillRect(-110, -28, 220, 56);
  ctx.strokeStyle = '#94A3B8';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(-110, -28, 220, 56);

  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(plateIdLabel ? `[${plateIdLabel}] ${zone}` : `구역: ${zone}`, -100, -10);

  ctx.fillStyle = '#2563EB';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText(`항목: [${testType}] | ${mediaType}`, -100, 8);

  ctx.fillStyle = '#64748B';
  ctx.font = '10px sans-serif';
  ctx.fillText(`채취: ${new Date().toISOString().split('T')[0]}`, -100, 21);
  ctx.restore();
}

/**
 * Generate simulated Environmental Monitoring agar plate images with labels for testing
 */
function createSamplePlateCanvas(
  zone: string,
  testType: string,
  mediaType: string,
  colonyCount: number,
  agarColor: string,
  plateStyle: 'round' | 'rodac' = 'round'
): string {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 800;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background
  const bgGrad = ctx.createLinearGradient(0, 0, 800, 800);
  bgGrad.addColorStop(0, '#CBD5E1');
  bgGrad.addColorStop(0.5, '#94A3B8');
  bgGrad.addColorStop(1, '#64748B');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 800, 800);

  // Bench grid lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 2;
  for (let i = 100; i < 800; i += 150) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 800);
    ctx.stroke();
  }

  const cx = 400;
  const cy = 400;
  const radius = plateStyle === 'round' ? 260 : 220;

  drawPlateOnCtx(ctx, cx, cy, radius, zone, testType, mediaType, colonyCount, agarColor, plateStyle);

  return canvas.toDataURL('image/jpeg', 0.9);
}

/**
 * Generate a multi-plate wide image containing 2 plates side-by-side on a lab tray
 */
function createMultiPlateSampleCanvas(
  left: { zone: string; testType: string; mediaType: string; colonyCount: number; agarColor: string },
  right: { zone: string; testType: string; mediaType: string; colonyCount: number; agarColor: string }
): string {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 700;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Stainless steel tray background
  const bgGrad = ctx.createLinearGradient(0, 0, 1200, 700);
  bgGrad.addColorStop(0, '#94A3B8');
  bgGrad.addColorStop(0.5, '#64748B');
  bgGrad.addColorStop(1, '#475569');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1200, 700);

  // Tray rim
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 6;
  ctx.strokeRect(20, 20, 1160, 660);

  // Left Plate
  drawPlateOnCtx(ctx, 330, 350, 220, left.zone, left.testType, left.mediaType, left.colonyCount, left.agarColor, 'round', '배지_1');

  // Right Plate
  drawPlateOnCtx(ctx, 870, 350, 220, right.zone, right.testType, right.mediaType, right.colonyCount, right.agarColor, 'round', '배지_2');

  return canvas.toDataURL('image/jpeg', 0.9);
}

export async function createSamplePlates(): Promise<PlateItem[]> {
  const sampleConfigs = [
    // 3E07-1 Location Pair
    {
      filename: 'EM_M3E07-1_TSA.jpg',
      zone: 'M3E07-1 (TSA)',
      locationCode: '3E07-1',
      gmpCategory: 'bacteria' as const,
      testType: '낙하균',
      mediaType: 'TSA',
      colonyCount: 0,
      agarColor: 'amber',
      plateStyle: 'round' as const,
      box: [120, 120, 880, 880] as [number, number, number, number],
      remarks: '라벨 판독 정상. 집락 미검출 (0 CFU - 적합)',
      rawLabel: 'M3E07-1 (TSA) / 낙하균 / 2026-04-28',
    },
    {
      filename: 'EM_M3E07-1_SDA.jpg',
      zone: 'M3E07-1 (SDA)',
      locationCode: '3E07-1',
      gmpCategory: 'fungi' as const,
      testType: '낙하균',
      mediaType: 'SDA',
      colonyCount: 0,
      agarColor: 'light',
      plateStyle: 'round' as const,
      box: [120, 120, 880, 880] as [number, number, number, number],
      remarks: '진균/곰팡이 미검출 (0 CFU - 적합)',
      rawLabel: 'M3E07-1 (SDA) / 낙하균 / 2026-04-28',
    },
    // 3E07-2 Location Pair (with 1 CFU detected in SDA)
    {
      filename: 'EM_M3E07-2_TSA.jpg',
      zone: 'M3E07-2 (TSA)',
      locationCode: '3E07-2',
      gmpCategory: 'bacteria' as const,
      testType: '낙하균',
      mediaType: 'TSA',
      colonyCount: 0,
      agarColor: 'amber',
      plateStyle: 'round' as const,
      box: [120, 120, 880, 880] as [number, number, number, number],
      remarks: '라벨 판독 정상. 세균 미검출 (0 CFU - 적합)',
      rawLabel: 'M3E07-2 (TSA) / 낙하균 / 2026-04-28',
    },
    {
      filename: 'EM_M3E07-2_SDA.jpg',
      zone: 'M3E07-2 (SDA)',
      locationCode: '3E07-2',
      gmpCategory: 'fungi' as const,
      testType: '낙하균',
      mediaType: 'SDA',
      colonyCount: 1,
      agarColor: 'light',
      plateStyle: 'round' as const,
      box: [120, 120, 880, 880] as [number, number, number, number],
      remarks: '배지 우측 상단 미세 진균 콜로니 1개 관찰 (1 CFU 검출)',
      rawLabel: 'M3E07-2 (SDA) / 낙하균 / 2026-04-28',
    },
    // 3E09-1 Location Pair
    {
      filename: 'EM_M3E09-1_TSA.jpg',
      zone: 'M3E09-1 (TSA)',
      locationCode: '3E09-1',
      gmpCategory: 'bacteria' as const,
      testType: '낙하균',
      mediaType: 'TSA',
      colonyCount: 0,
      agarColor: 'amber',
      plateStyle: 'round' as const,
      box: [120, 120, 880, 880] as [number, number, number, number],
      remarks: '라벨 판독 정상. 집락 미검출 (0 CFU - 적합)',
      rawLabel: 'M3E09-1 (TSA) / 낙하균 / 2026-04-28',
    },
    {
      filename: 'EM_M3E09-1_SDA.jpg',
      zone: 'M3E09-1 (SDA)',
      locationCode: '3E09-1',
      gmpCategory: 'fungi' as const,
      testType: '낙하균',
      mediaType: 'SDA',
      colonyCount: 0,
      agarColor: 'light',
      plateStyle: 'round' as const,
      box: [120, 120, 880, 880] as [number, number, number, number],
      remarks: '진균 미검출 (0 CFU - 적합)',
      rawLabel: 'M3E09-1 (SDA) / 낙하균 / 2026-04-28',
    },
  ];

  const items: PlateItem[] = [];

  for (let i = 0; i < sampleConfigs.length; i++) {
    const config = sampleConfigs[i];
    const originalImage = createSamplePlateCanvas(
      config.zone,
      config.testType,
      config.mediaType,
      config.colonyCount,
      config.agarColor,
      config.plateStyle
    );

    const { croppedUrl } = await cropImageWithBox(originalImage, config.box);
    const cropId = `crop_${String(i + 1).padStart(2, '0')}`;
    const customFileName = `${cropId}.jpg`;

    items.push({
      id: `sample-${i + 1}-${Date.now()}`,
      filename: config.filename,
      originalImage,
      width: 800,
      height: 800,
      croppedImage: croppedUrl,
      status: 'done',
      cropId,
      customFileName,
      plateId: `배지_${i + 1}`,
      zone: config.zone,
      locationCode: config.locationCode,
      gmpCategory: config.gmpCategory,
      testType: config.testType,
      box: config.box,
      mediaType: config.mediaType,
      rawLabel: config.rawLabel,
      colonyCount: config.colonyCount,
      samplingDate: '2026-04-28',
      remarks: config.remarks,
      selected: true,
    });
  }

  return items;
}
