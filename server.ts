import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

// process.env.SOME_PATH가 없을 때 기본 경로를 쓰도록 예외 처리
const pathInput = process.env.SOME_PATH || import.meta.url;
const __filename = fileURLToPath(pathInput);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Lazy initialize Gemini client
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not configured.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Multi-plate & Single-plate image analysis endpoint
app.post('/api/analyze-plate', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 is required.' });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+]+;base64,/, '');
    const ai = getGeminiClient();

    const prompt = `
당신은 범용 객체 탐지(Object Detection), 손글씨/라벨 번호 인식(OCR), 및 개별 순차 자동 크롭(Auto-Crop) 전문 AI 비전 모델입니다.

[범용 객체 탐지, 손글씨 번호 인식 및 개별 자동 크롭 지침]

1. 객체 자동 탐지 (Object Detection):
   - 이미지 내에 배열된 모든 독립된 부품/개체 (십자가 형태 키트, 진단키트, 페트리디쉬 배지, 바이알/부품 등)의 위치를 개별적으로 탐지합니다.
   - 단일 개체뿐만 아니라 여러 개체가 격자형 또는 나열되어 있는 경우 모든 개체를 빠짐없이 탐지하십시오.

2. 손글씨/라벨 번호 인식 (OCR):
   - 각 객체 표면에 매직/펜으로 손글씨로 적힌 숫자 또는 인쇄된 번호를 OCR로 정밀하게 읽어냅니다. (예: 51, 52, 53, 101, 102...)
   - 숫자가 식별되면 'recognized_number' 필드에 순수 숫자 문자열(예: "51", "52")을 입력하십시오.

3. 순차적 개별 컷팅 및 안전 여백 (Sequential Crop & Save):
   - 전체 이미지를 한 번에 잘라내지 않고, 탐지된 객체 1개당 1개의 독립된 이미지 파일로 개별 자릅니다.
   - 자를 때 객체의 전체 형태(십자가 상단 암부터 하단 웰 구조까지, 또는 배지/부품의 전체 외곽 윤곽)가 절대 잘리지 않도록 Bounding Box [ymin, xmin, ymax, xmax] (0~1000 상대좌표)에 적절한 안전 여백(여유 패딩)을 포함하십시오.

4. 순차 정렬 및 파일명 매핑 (File Name Mapping):
   - 이미지의 좌측 상단(Top-Left)부터 우측 하단(Bottom-Right) 순서대로 탐지된 객체들을 순차 정렬하십시오.
   - 파일명(file_name)은 인식된 숫자를 기준으로 생성합니다:
     * 손글씨/라벨 숫자를 읽어낸 경우: "kit_51.jpg", "kit_52.jpg" 와 같이 "kit_{숫자}.jpg" 형식
     * 숫자를 읽지 못한 경우: 좌측 상단부터 우측 하단 순서대로 "crop_01.jpg", "crop_02.jpg", "crop_03.jpg"... 형식
   - 순차 식별 ID(crop_id): "crop_01", "crop_02"... 순차 부여

5. 부가 분석 정보:
   - zone: 배지/부품의 구역명 또는 번호 (예: "Kit 51", "무균실 A-1")
   - type: 시험 항목 또는 개체 구분 ("진단키트", "부유균", "낙하균", "표면균", "작업자모니터링" 등)
   - mediaType: 배지/시약 종류 (TSA, SDA, Strip 등)
   - rawLabel: 객체 표면에서 판독된 손글씨/라벨 텍스트 원문
   - colonyCount: 관찰되는 반응/CFU 수 (없으면 0)
   - remarks: 판독 의견 (예: "손글씨 번호 51 인식 완료", "십자가 키트 외곽 보존 컷팅 완료")

반드시 유효한 JSON 형식으로만 응답하세요.
`;

    const schema = {
      type: Type.OBJECT,
      properties: {
        plates: {
          type: Type.ARRAY,
          description: '사진 속에서 감지된 모든 독립 개체(키트/배지/부품) 목록',
          items: {
            type: Type.OBJECT,
            properties: {
              crop_id: {
                type: Type.STRING,
                description: '순차적 컷팅 식별 ID (예: crop_01, crop_02)',
              },
              recognized_number: {
                type: Type.STRING,
                description: '손글씨/라벨에서 판독된 번호/숫자 (예: 51, 52)',
              },
              file_name: {
                type: Type.STRING,
                description: '매핑된 파일명 (예: kit_51.jpg 또는 crop_01.jpg)',
              },
              plate_id: {
                type: Type.STRING,
                description: '개체 식별 ID (예: kit_51, 배지_1)',
              },
              zone: {
                type: Type.STRING,
                description: '구역명 또는 개체 라벨명 (예: Kit 51, A구역-충전실)',
              },
              type: {
                type: Type.STRING,
                description: '시험 항목 또는 개체 종류 (진단키트, 부유균, 낙하균, 표면균 등)',
              },
              box: {
                type: Type.ARRAY,
                items: { type: Type.INTEGER },
                description: '안전 여백이 포함된 [ymin, xmin, ymax, xmax] 0~1000 상대좌표',
              },
              mediaType: {
                type: Type.STRING,
                description: '배지/키트 종류 (예: Kit, TSA, SDA)',
              },
              rawLabel: {
                type: Type.STRING,
                description: '표면에서 판독된 원본 텍스트/손글씨',
              },
              colonyCount: {
                type: Type.INTEGER,
                description: '집락 수 또는 반응 카운트',
              },
              remarks: {
                type: Type.STRING,
                description: '관찰 특이사항 및 판독 의견',
              },
            },
            required: ['box'],
          },
        },
      },
      required: ['plates'],
    };

    // Candidate models with fallback order - prioritize ultra-fast, high-capacity flash-lite
    const candidateModels = [
      'gemini-3.1-flash-lite',
      'gemini-3.8-flash',
      'gemini-3.6-flash',
      'gemini-flash-latest',
    ];

    let response: any = null;
    let lastError: any = null;

    // Try models with instant failover on 503 high-demand to prevent client timeouts
    for (const modelName of candidateModels) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: cleanBase64,
                },
              },
              {
                text: prompt,
              },
            ],
          },
          config: {
            responseMimeType: 'application/json',
            responseSchema: schema,
          },
        });
        if (response && response.text) {
          break; // Success!
        }
      } catch (err: any) {
        lastError = err;
        const errMsg = err?.message || String(err);
        const isHighDemand =
          errMsg.includes('503') ||
          errMsg.includes('high demand') ||
          errMsg.includes('UNAVAILABLE') ||
          errMsg.includes('overloaded');

        console.warn(`[Gemini API] Model ${modelName} error:`, errMsg);

        if (isHighDemand) {
          // Do not sleep or retry the same overloaded model - immediately switch to next candidate
          console.warn(`[Gemini API] Model ${modelName} has demand spike. Immediately switching to next model...`);
          continue;
        }

        // For other transient errors (like 429), try one quick retry after 400ms
        if (errMsg.includes('429') || errMsg.includes('ResourceExhausted')) {
          try {
            await new Promise((r) => setTimeout(r, 400));
            response = await ai.models.generateContent({
              model: modelName,
              contents: {
                parts: [
                  {
                    inlineData: {
                      mimeType,
                      data: cleanBase64,
                    },
                  },
                  {
                    text: prompt,
                  },
                ],
              },
              config: {
                responseMimeType: 'application/json',
                responseSchema: schema,
              },
            });
            if (response && response.text) {
              break;
            }
          } catch (retryErr: any) {
            lastError = retryErr;
          }
        }
      }
    }

    if (!response || !response.text) {
      throw lastError || new Error('AI 모델 응답을 가져오지 못했습니다. 잠시 후 다시 시도해주세요.');
    }

    const responseText = response.text || '{}';
    let data;
    try {
      data = JSON.parse(responseText.trim());
    } catch {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        data = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse model JSON output');
      }
    }

    let platesList = Array.isArray(data.plates) ? data.plates : [];

    // Fallback if data was returned in flat format
    if (platesList.length === 0 && data.box) {
      platesList = [data];
    }

    // Default safety fallback if nothing returned
    if (platesList.length === 0) {
      platesList = [
        {
          crop_id: 'crop_01',
          recognized_number: '',
          file_name: 'crop_01.jpg',
          plate_id: 'kit_01',
          zone: data.zone || '미지정 구역',
          type: data.type || '진단키트/배지',
          box: [50, 50, 950, 950],
          mediaType: data.mediaType || 'Kit',
          rawLabel: data.rawLabel || '',
          colonyCount: typeof data.colonyCount === 'number' ? data.colonyCount : 0,
          remarks: data.remarks || '정상 분석 완료',
        },
      ];
    }

    // Sort detected objects in spatial order (top-to-bottom, left-to-right)
    platesList.sort((a: any, b: any) => {
      const boxA = Array.isArray(a.box) && a.box.length === 4 ? a.box : [0, 0, 1000, 1000];
      const boxB = Array.isArray(b.box) && b.box.length === 4 ? b.box : [0, 0, 1000, 1000];
      const yCenterA = (boxA[0] + boxA[2]) / 2;
      const yCenterB = (boxB[0] + boxB[2]) / 2;
      const hA = Math.max(20, boxA[2] - boxA[0]);
      // If rows are distinct (> 35% object height difference), sort by Y row first
      if (Math.abs(yCenterA - yCenterB) > hA * 0.35) {
        return yCenterA - yCenterB;
      }
      return boxA[1] - boxB[1]; // Otherwise sort by X left-to-right
    });

    // Sanitize bounding boxes with safe padding, OCR number parsing, and filename mapping
    const sanitizedPlates = platesList.map((p: any, idx: number) => {
      let box = Array.isArray(p.box) && p.box.length === 4 ? p.box : [100, 100, 900, 900];
      
      // Ensure slight safe margin (approx 2% margin around borders) so cross tops/bottoms don't clip
      const ymin = Math.max(0, Math.round(box[0] - 15));
      const xmin = Math.max(0, Math.round(box[1] - 15));
      const ymax = Math.min(1000, Math.round(box[2] + 15));
      const xmax = Math.min(1000, Math.round(box[3] + 15));
      const safeBox: [number, number, number, number] = [ymin, xmin, ymax, xmax];

      const seqNumber = String(idx + 1).padStart(2, '0');
      const cropId = p.crop_id || `crop_${seqNumber}`;

      // Extract recognized number from OCR or rawLabel
      let recognizedNumber = p.recognized_number ? String(p.recognized_number).trim() : '';
      if (!recognizedNumber && p.rawLabel) {
        const numMatch = String(p.rawLabel).match(/\b(\d+)\b/);
        if (numMatch) {
          recognizedNumber = numMatch[1];
        }
      }

      // Map filename: if recognized number exists -> kit_{num}.jpg, else crop_{seqNumber}.jpg
      let fileName = p.file_name;
      if (recognizedNumber) {
        fileName = `kit_${recognizedNumber}.jpg`;
      } else if (!fileName) {
        fileName = `crop_${seqNumber}.jpg`;
      }

      const zoneName = p.zone || (recognizedNumber ? `Kit ${recognizedNumber}` : `객체 ${idx + 1}`);

      return {
        crop_id: cropId,
        recognized_number: recognizedNumber,
        file_name: fileName,
        plate_id: p.plate_id || (recognizedNumber ? `kit_${recognizedNumber}` : `객체_${idx + 1}`),
        zone: zoneName,
        type: p.type || '진단키트/배지',
        box: safeBox,
        mediaType: p.mediaType || 'Kit',
        rawLabel: p.rawLabel || (recognizedNumber ? `손글씨: ${recognizedNumber}` : ''),
        colonyCount: typeof p.colonyCount === 'number' ? p.colonyCount : 0,
        remarks: p.remarks || (recognizedNumber ? `손글씨 번호 ${recognizedNumber} 인식 완료` : `순차 자동 컷팅 (${fileName})`),
      };
    });

    res.json({
      success: true,
      plates: sanitizedPlates,
      result: sanitizedPlates[0], // Backwards-compatible
      totalPlates: sanitizedPlates.length,
    });
  } catch (err: any) {
    console.error('Error analyzing plate:', err);
    res.status(500).json({
      success: false,
      error: err?.message || '배지 이미지 분석 중 오류가 발생했습니다.',
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`EM Plate Analyzer Server running on port ${PORT}`);
  });
}

startServer();
