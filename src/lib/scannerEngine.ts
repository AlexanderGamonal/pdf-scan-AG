import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

export type BorderStyle = 'paper_shadow' | 'scanner_bed' | 'thin_line' | 'none';
export type QualityPreset = 'light' | 'balanced' | 'high';
export type PageFormat = 'a4' | 'letter' | 'fit';

export interface ImageItem {
  id: string;
  file: File;
  previewUrl: string;
  rotation: number; // 0, 90, 180, 270
  name: string;
  size: number;
}

export interface DniOptions {
  frontImage: File | null;
  frontRotation: number;
  frontPreviewUrl: string | null;
  backImage: File | null;
  backRotation: number;
  backPreviewUrl: string | null;
  cardScale: number; // 0.65 to 0.90 (default 0.78)
  verticalGap: number; // 20 to 80 (default 45)
  colorMode: 'color' | 'bw' | 'grayscale'; // default 'color'
  applyScannerEffect: boolean;
  sharpness: number; // default 1.3
  quality: number; // default 74
}

export const DEFAULT_DNI_OPTIONS: DniOptions = {
  frontImage: null,
  frontRotation: 0,
  frontPreviewUrl: null,
  backImage: null,
  backRotation: 0,
  backPreviewUrl: null,
  cardScale: 0.78,
  verticalGap: 45,
  colorMode: 'color',
  applyScannerEffect: true,
  sharpness: 1.3,
  quality: 74,
};

export interface ScannerOptions {
  quality: number; // 35 to 95 (default 74)
  qualityPreset: QualityPreset;
  resolutionScale: number; // default 1.65 for razor sharp text
  sharpness: number; // 1.0 to 2.5 (default 1.35)
  askew: boolean; // default true
  askewAngle: number; // max angle in degrees (default 0.75)
  borderStyle: BorderStyle; // 'paper_shadow' | 'scanner_bed' | 'thin_line' | 'none'
  borderIntensity: number; // 10 to 100 (default 70)
  scannerBedColor: 'light_gray' | 'dark_photocopy' | 'white';
  blackAndWhite: boolean; // photocopy effect (default false)
  blur: boolean; // default false
  blurRadius: number; // default 0.8
  blurVariation: boolean; // depth of field uneven focus (default false)
  noise: number; // 0 to 50 (default 5)
  contrast: number; // 0.5 to 2.0 (default 1.08)
  brightness: number; // 0.5 to 1.5 (default 1.01)
  applyEffectsToImages: boolean; // default true
  pageFormat: PageFormat; // default 'a4'
}

export const DEFAULT_OPTIONS: ScannerOptions = {
  quality: 74,
  qualityPreset: 'balanced',
  resolutionScale: 1.65,
  sharpness: 1.35,
  askew: true,
  askewAngle: 0.75,
  borderStyle: 'paper_shadow',
  borderIntensity: 70,
  scannerBedColor: 'light_gray',
  blackAndWhite: false,
  blur: false,
  blurRadius: 0.8,
  blurVariation: false,
  noise: 5,
  contrast: 1.08,
  brightness: 1.01,
  applyEffectsToImages: true,
  pageFormat: 'a4',
};

export const QUALITY_PRESETS: Record<
  QualityPreset,
  { name: string; desc: string; sizeEstimate: string; scale: number; quality: number; sharpness: number }
> = {
  light: {
    name: 'Ligero (Ideal Correo / Web)',
    desc: 'Archivos muy livianos (~80-140 KB/pág). Excelente para enviar por email con límites estrictos de peso.',
    sizeEstimate: '~80 - 140 KB / pág',
    scale: 1.4,
    quality: 62,
    sharpness: 1.4,
  },
  balanced: {
    name: 'Equilibrado (Alta Nitidez)',
    desc: 'El balance ideal (~180-280 KB/pág). Textos, firmas y sellos completamente definidos y nítidos.',
    sizeEstimate: '~180 - 280 KB / pág',
    scale: 1.65,
    quality: 74,
    sharpness: 1.35,
  },
  high: {
    name: 'Máxima Definición (Ultra HD)',
    desc: 'Máxima resolución (~380-650 KB/pág). Para documentos con letras muy pequeñas o sellos de gran detalle.',
    sizeEstimate: '~380 - 650 KB / pág',
    scale: 2.0,
    quality: 84,
    sharpness: 1.45,
  },
};

export const PRESETS: Record<
  string,
  { name: string; icon: string; description: string; options: Partial<ScannerOptions> }
> = {
  office: {
    name: 'Escáner de Oficina (Color)',
    icon: '🏢',
    description: 'Bordes de hoja física con sombra, ligera inclinación, alta nitidez y peso optimizado.',
    options: {
      quality: 74,
      qualityPreset: 'balanced',
      resolutionScale: 1.65,
      sharpness: 1.35,
      askew: true,
      askewAngle: 0.75,
      borderStyle: 'paper_shadow',
      borderIntensity: 70,
      scannerBedColor: 'light_gray',
      blackAndWhite: false,
      blur: false,
      blurVariation: false,
      noise: 5,
      contrast: 1.08,
      brightness: 1.01,
      applyEffectsToImages: true,
    },
  },
  photocopy: {
    name: 'Fotocopia Blanco y Negro',
    icon: '📄',
    description: 'Bordes oscuros de fotocopiadora, alto contraste y letras súper marcadas.',
    options: {
      quality: 72,
      qualityPreset: 'balanced',
      resolutionScale: 1.65,
      sharpness: 1.45,
      askew: true,
      askewAngle: 0.85,
      borderStyle: 'scanner_bed',
      borderIntensity: 85,
      scannerBedColor: 'dark_photocopy',
      blackAndWhite: true,
      blur: false,
      blurVariation: false,
      noise: 8,
      contrast: 1.35,
      brightness: 1.02,
      applyEffectsToImages: true,
    },
  },
  vintage: {
    name: 'Escáner Antiguo con Marco',
    icon: '📜',
    description: 'Inclinación marcada, esquinas oscuras de cristal y grano pronunciado.',
    options: {
      quality: 68,
      qualityPreset: 'balanced',
      resolutionScale: 1.5,
      sharpness: 1.25,
      askew: true,
      askewAngle: 1.3,
      borderStyle: 'scanner_bed',
      borderIntensity: 90,
      scannerBedColor: 'dark_photocopy',
      blackAndWhite: false,
      blur: true,
      blurRadius: 0.7,
      blurVariation: true,
      noise: 14,
      contrast: 1.15,
      brightness: 0.98,
      applyEffectsToImages: true,
    },
  },
  clean_image: {
    name: 'Documento Limpio / HD',
    icon: '⚡',
    description: 'Sin inclinación ni ruido. Máxima nitidez en textos y firmas.',
    options: {
      quality: 80,
      qualityPreset: 'balanced',
      resolutionScale: 1.75,
      sharpness: 1.4,
      askew: false,
      borderStyle: 'none',
      blackAndWhite: false,
      blur: false,
      blurVariation: false,
      noise: 0,
      contrast: 1.04,
      brightness: 1.0,
      applyEffectsToImages: false,
    },
  },
  subtle: {
    name: 'Escáner Sutil',
    icon: '✨',
    description: 'Borde fino y discreto, inclinación mínima y archivo equilibrado.',
    options: {
      quality: 75,
      qualityPreset: 'balanced',
      resolutionScale: 1.6,
      sharpness: 1.3,
      askew: true,
      askewAngle: 0.35,
      borderStyle: 'thin_line',
      borderIntensity: 50,
      scannerBedColor: 'white',
      blackAndWhite: false,
      blur: false,
      blurVariation: false,
      noise: 3,
      contrast: 1.05,
      brightness: 1.0,
      applyEffectsToImages: true,
    },
  },
};

/**
 * Apply 3x3 unsharp mask / Laplacian edge sharpening directly on canvas pixels
 */
export function applySharpnessFilter(ctx: CanvasRenderingContext2D, width: number, height: number, factor: number) {
  if (factor <= 1.01) return;
  const imgData = ctx.getImageData(0, 0, width, height);
  const src = new Uint8ClampedArray(imgData.data);
  const dst = imgData.data;
  const strength = Math.min(1.5, (factor - 1.0) * 0.85);

  for (let y = 1; y < height - 1; y++) {
    const yOffset = y * width;
    for (let x = 1; x < width - 1; x++) {
      const idx = (yOffset + x) * 4;
      for (let c = 0; c < 3; c++) {
        const val = src[idx + c];
        const top = src[((y - 1) * width + x) * 4 + c];
        const bottom = src[((y + 1) * width + x) * 4 + c];
        const left = src[(yOffset + (x - 1)) * 4 + c];
        const right = src[(yOffset + (x + 1)) * 4 + c];

        // Laplacian high-pass edge crisping
        const sharpVal = val * (1 + 4 * strength) - (top + bottom + left + right) * strength;
        dst[idx + c] = sharpVal < 0 ? 0 : sharpVal > 255 ? 255 : sharpVal;
      }
    }
  }
  ctx.putImageData(imgData, 0, 0);
}

/**
 * Apply scanner effects on a canvas and return a new canvas with realistic borders & high sharpness
 */
export function applyScannerEffects(
  srcCanvas: HTMLCanvasElement,
  options: ScannerOptions,
  deterministicSeed?: number
): HTMLCanvasElement {
  const width = srcCanvas.width;
  const height = srcCanvas.height;

  let seed = deterministicSeed ?? Math.random() * 10000;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  let angle = 0;
  if (options.askew) {
    const maxA = options.askewAngle || 0.75;
    const sign = rand() > 0.5 ? 1 : -1;
    const mag = 0.35 * maxA + rand() * (0.65 * maxA);
    angle = sign * mag;
  }

  const rad = (angle * Math.PI) / 180;
  const absCos = Math.abs(Math.cos(rad));
  const absSin = Math.abs(Math.sin(rad));

  const pad = options.borderStyle !== 'none' && options.askew ? Math.round(Math.max(16, width * 0.015)) : 0;

  const rotWidth = Math.ceil(width * absCos + height * absSin) + pad * 2;
  const rotHeight = Math.ceil(width * absSin + height * absCos) + pad * 2;

  const outCanvas = document.createElement('canvas');
  outCanvas.width = rotWidth;
  outCanvas.height = rotHeight;
  const ctx = outCanvas.getContext('2d');
  if (!ctx) return srcCanvas;

  const intensity = (options.borderIntensity || 70) / 100;
  if (options.borderStyle === 'scanner_bed') {
    if (options.scannerBedColor === 'dark_photocopy') {
      ctx.fillStyle = `rgb(${Math.round(40 * (1 - intensity * 0.5))}, ${Math.round(40 * (1 - intensity * 0.5))}, ${Math.round(45 * (1 - intensity * 0.5))})`;
    } else {
      ctx.fillStyle = `rgb(${Math.round(210 - intensity * 60)}, ${Math.round(212 - intensity * 60)}, ${Math.round(215 - intensity * 60)})`;
    }
  } else if (options.borderStyle === 'paper_shadow') {
    const bedVal = Math.round(248 - intensity * 20);
    ctx.fillStyle = `rgb(${bedVal}, ${bedVal}, ${bedVal + 2})`;
  } else {
    ctx.fillStyle = '#ffffff';
  }
  ctx.fillRect(0, 0, rotWidth, rotHeight);

  ctx.save();
  ctx.translate(rotWidth / 2, rotHeight / 2);
  ctx.rotate(rad);

  if (options.borderStyle === 'paper_shadow') {
    const shadowAlpha = 0.15 + intensity * 0.25;
    ctx.shadowColor = `rgba(0, 0, 0, ${shadowAlpha})`;
    ctx.shadowBlur = Math.round(6 * intensity + 3);
    ctx.shadowOffsetX = Math.round(2 * intensity + 1);
    ctx.shadowOffsetY = Math.round(3 * intensity + 1);
  } else if (options.borderStyle === 'scanner_bed') {
    const shadowAlpha = 0.35 + intensity * 0.35;
    ctx.shadowColor = `rgba(0, 0, 0, ${shadowAlpha})`;
    ctx.shadowBlur = Math.round(8 * intensity + 4);
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 1;
  }

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-width / 2, -height / 2, width, height);
  ctx.shadowColor = 'transparent';

  if (options.blur) {
    const blurPx = options.blurRadius || 0.8;
    ctx.filter = `blur(${blurPx}px)`;
  }

  ctx.drawImage(srcCanvas, -width / 2, -height / 2);
  ctx.filter = 'none';

  if (options.borderStyle === 'paper_shadow') {
    const lineAlpha = 0.18 + intensity * 0.32;
    ctx.strokeStyle = `rgba(30, 30, 35, ${lineAlpha})`;
    ctx.lineWidth = 1.2;
    ctx.strokeRect(-width / 2, -height / 2, width, height);
  } else if (options.borderStyle === 'scanner_bed') {
    const lineAlpha = 0.35 + intensity * 0.45;
    ctx.strokeStyle = `rgba(15, 15, 20, ${lineAlpha})`;
    ctx.lineWidth = 1.8;
    ctx.strokeRect(-width / 2, -height / 2, width, height);
  } else if (options.borderStyle === 'thin_line') {
    const lineAlpha = 0.15 + intensity * 0.25;
    ctx.strokeStyle = `rgba(60, 60, 70, ${lineAlpha})`;
    ctx.lineWidth = 1.0;
    ctx.strokeRect(-width / 2, -height / 2, width, height);
  }

  ctx.restore();

  // 1. Pixel adjustments: Contrast, Brightness, B&W, Smooth Grain
  const imgData = ctx.getImageData(0, 0, rotWidth, rotHeight);
  const data = imgData.data;

  const jitter = 1.0 + rand() * 0.012;
  const finalBrightness = options.brightness * jitter;
  const contrastFactor = options.contrast;

  const cVal = (contrastFactor - 1.0) * 128;
  const cFactor = (259 * (cVal + 255)) / (255 * (259 - cVal));

  const noiseAmp = options.noise * 0.6;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    if (options.blackAndWhite) {
      let gray = 0.299 * r + 0.587 * g + 0.114 * b;
      gray = cFactor * (gray - 128) + 128;
      if (gray > 218) gray = 255;
      else if (gray < 45) gray = 0;
      r = g = b = gray;
    } else {
      if (contrastFactor !== 1.0) {
        r = cFactor * (r - 128) + 128;
        g = cFactor * (g - 128) + 128;
        b = cFactor * (b - 128) + 128;
      }
    }

    if (finalBrightness !== 1.0) {
      r *= finalBrightness;
      g *= finalBrightness;
      b *= finalBrightness;
    }

    if (noiseAmp > 0 && (i % 8 === 0)) {
      const grain = (rand() - 0.5) * noiseAmp * 2;
      r += grain;
      g += grain;
      b += grain;
    }

    data[i] = Math.min(255, Math.max(0, r));
    data[i + 1] = Math.min(255, Math.max(0, g));
    data[i + 2] = Math.min(255, Math.max(0, b));
  }

  ctx.putImageData(imgData, 0, 0);

  // 2. Apply Sharpness Edge Filter for crisp text!
  if (options.sharpness && options.sharpness > 1.0) {
    applySharpnessFilter(ctx, rotWidth, rotHeight, options.sharpness);
  }

  // 3. Uneven focus lid if enabled
  if (options.blurVariation) {
    const blurredCanvas = document.createElement('canvas');
    blurredCanvas.width = rotWidth;
    blurredCanvas.height = rotHeight;
    const bCtx = blurredCanvas.getContext('2d');
    if (bCtx) {
      bCtx.filter = 'blur(3.5px)';
      bCtx.drawImage(outCanvas, 0, 0);

      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = rotWidth;
      maskCanvas.height = rotHeight;
      const mCtx = maskCanvas.getContext('2d');
      if (mCtx) {
        const grad = mCtx.createLinearGradient(0, 0, rotWidth, 0);
        grad.addColorStop(0, 'rgba(0,0,0,0.6)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        mCtx.fillStyle = grad;
        mCtx.fillRect(0, 0, rotWidth, rotHeight);

        bCtx.globalCompositeOperation = 'destination-in';
        bCtx.drawImage(maskCanvas, 0, 0);

        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(blurredCanvas, 0, 0);
      }
    }
  }

  return outCanvas;
}

/**
 * Render a single PDF page into an HTMLCanvasElement with high sharpness resolution
 */
export async function renderPdfPageToCanvas(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  scale: number = 1.65
): Promise<{ canvas: HTMLCanvasElement; originalWidth: number; originalHeight: number }> {
  const page = await pdfDoc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error('Could not get canvas context');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({
    canvasContext: ctx,
    viewport: viewport,
  }).promise;

  const baseViewport = page.getViewport({ scale: 1.0 });

  return {
    canvas,
    originalWidth: baseViewport.width,
    originalHeight: baseViewport.height,
  };
}

/**
 * Render an ImageItem to an HTMLCanvasElement with custom rotation and size constraints
 */
export async function renderImageItemToCanvas(
  item: ImageItem,
  maxDimension: number = 1800
): Promise<HTMLCanvasElement> {
  const img = new Image();
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = item.previewUrl;
  });

  const naturalW = img.naturalWidth;
  const naturalH = img.naturalHeight;
  const rot = ((item.rotation % 360) + 360) % 360;
  const isSwap = rot === 90 || rot === 270;

  let scale = 1.0;
  const maxSide = Math.max(naturalW, naturalH);
  if (maxSide > maxDimension) {
    scale = maxDimension / maxSide;
  }

  const baseW = Math.round(naturalW * scale);
  const baseH = Math.round(naturalH * scale);
  const targetW = isSwap ? baseH : baseW;
  const targetH = isSwap ? baseW : baseH;

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context failed');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, targetW, targetH);

  ctx.save();
  ctx.translate(targetW / 2, targetH / 2);
  ctx.rotate((rot * Math.PI) / 180);
  ctx.drawImage(img, -baseW / 2, -baseH / 2, baseW, baseH);
  ctx.restore();

  return canvas;
}

/**
 * Convert canvas to JPEG blob with given quality
 */
export function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob conversion failed'));
      },
      'image/jpeg',
      Math.max(0.3, Math.min(0.96, quality / 100))
    );
  });
}

/**
 * Render helper for an individual DNI side
 */
async function loadAndPrepareCardCanvas(
  imgUrl: string,
  rotation: number,
  maxSide: number = 1600
): Promise<HTMLCanvasElement> {
  const img = new Image();
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = imgUrl;
  });

  const rot = ((rotation % 360) + 360) % 360;
  const isSwap = rot === 90 || rot === 270;

  let scale = 1.0;
  const largest = Math.max(img.naturalWidth, img.naturalHeight);
  if (largest > maxSide) {
    scale = maxSide / largest;
  }

  const baseW = Math.round(img.naturalWidth * scale);
  const baseH = Math.round(img.naturalHeight * scale);
  const cardW = isSwap ? baseH : baseW;
  const cardH = isSwap ? baseW : baseH;

  const canvas = document.createElement('canvas');
  canvas.width = cardW;
  canvas.height = cardH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Card canvas failed');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, cardW, cardH);

  ctx.save();
  ctx.translate(cardW / 2, cardH / 2);
  ctx.rotate((rot * Math.PI) / 180);
  ctx.drawImage(img, -baseW / 2, -baseH / 2, baseW, baseH);
  ctx.restore();

  return canvas;
}

/**
 * Render both DNI sides onto a standard A4 sheet canvas with high sharpness
 */
export async function renderDniToA4Canvas(
  options: DniOptions,
  scaleFactor: number = 1.0
): Promise<HTMLCanvasElement> {
  // A4 at 160 DPI: 1320 x 1868 px for crystal clear text
  const a4Width = Math.round(1320 * scaleFactor);
  const a4Height = Math.round(1868 * scaleFactor);

  const a4Canvas = document.createElement('canvas');
  a4Canvas.width = a4Width;
  a4Canvas.height = a4Height;
  const ctx = a4Canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create A4 canvas');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, a4Width, a4Height);

  let frontCanvas: HTMLCanvasElement | null = null;
  let backCanvas: HTMLCanvasElement | null = null;

  if (options.frontPreviewUrl) {
    frontCanvas = await loadAndPrepareCardCanvas(options.frontPreviewUrl, options.frontRotation, 1600);
  }
  if (options.backPreviewUrl) {
    backCanvas = await loadAndPrepareCardCanvas(options.backPreviewUrl, options.backRotation, 1600);
  }

  const targetWidth = Math.round(a4Width * (options.cardScale || 0.78));
  const vGap = Math.round((options.verticalGap || 45) * scaleFactor);

  const drawCard = (cardCanvas: HTMLCanvasElement, yPos: number): number => {
    const cardAspect = cardCanvas.width / cardCanvas.height;
    const drawW = targetWidth;
    const drawH = Math.round(targetWidth / cardAspect);
    const xPos = Math.round((a4Width - drawW) / 2);

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
    ctx.shadowBlur = Math.round(6 * scaleFactor);
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = Math.round(2 * scaleFactor);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(xPos, yPos, drawW, drawH);
    ctx.shadowColor = 'transparent';

    ctx.drawImage(cardCanvas, xPos, yPos, drawW, drawH);

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
    ctx.lineWidth = Math.max(1, Math.round(1 * scaleFactor));
    ctx.strokeRect(xPos, yPos, drawW, drawH);

    ctx.restore();
    return drawH;
  };

  if (frontCanvas && backCanvas) {
    const frontAspect = frontCanvas.width / frontCanvas.height;
    const backAspect = backCanvas.width / backCanvas.height;
    const frontH = Math.round(targetWidth / frontAspect);
    const backH = Math.round(targetWidth / backAspect);

    const totalContentH = frontH + vGap + backH;
    const startY = Math.max(40, Math.round((a4Height - totalContentH) / 2));

    drawCard(frontCanvas, startY);
    drawCard(backCanvas, startY + frontH + vGap);
  } else if (frontCanvas) {
    const frontAspect = frontCanvas.width / frontCanvas.height;
    const frontH = Math.round(targetWidth / frontAspect);
    const startY = Math.round((a4Height / 2 - frontH) / 1.5);
    drawCard(frontCanvas, startY);

    const phH = frontH;
    const phY = startY + frontH + vGap;
    const xPos = Math.round((a4Width - targetWidth) / 2);

    ctx.save();
    ctx.setLineDash([8, 6]);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.strokeRect(xPos, phY, targetWidth, phH);
    ctx.fillStyle = '#64748b';
    ctx.font = `${Math.round(24 * scaleFactor)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('Reverso del DNI (Parte posterior)', a4Width / 2, phY + phH / 2);
    ctx.restore();
  } else if (backCanvas) {
    const backAspect = backCanvas.width / backCanvas.height;
    const backH = Math.round(targetWidth / backAspect);
    const startY = Math.round(a4Height / 2);
    drawCard(backCanvas, startY);

    const phH = backH;
    const phY = startY - phH - vGap;
    const xPos = Math.round((a4Width - targetWidth) / 2);

    ctx.save();
    ctx.setLineDash([8, 6]);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.strokeRect(xPos, phY, targetWidth, phH);
    ctx.fillStyle = '#64748b';
    ctx.font = `${Math.round(24 * scaleFactor)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('Anverso del DNI (Parte delantera)', a4Width / 2, phY + phH / 2);
    ctx.restore();
  } else {
    const h = Math.round(targetWidth / 1.586);
    const totalH = h * 2 + vGap;
    const startY = Math.round((a4Height - totalH) / 2);
    const xPos = Math.round((a4Width - targetWidth) / 2);

    ctx.save();
    ctx.setLineDash([8, 6]);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;

    ctx.strokeRect(xPos, startY, targetWidth, h);
    ctx.fillStyle = '#64748b';
    ctx.font = `${Math.round(24 * scaleFactor)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('1. Sube la foto del Anverso (Frente)', a4Width / 2, startY + h / 2);

    ctx.strokeRect(xPos, startY + h + vGap, targetWidth, h);
    ctx.fillText('2. Sube la foto del Reverso (Atrás)', a4Width / 2, startY + h + vGap + h / 2);
    ctx.restore();
  }

  // Color mode transformations
  if (options.colorMode === 'bw' || options.colorMode === 'grayscale' || options.applyScannerEffect) {
    const imgData = ctx.getImageData(0, 0, a4Width, a4Height);
    const d = imgData.data;

    for (let i = 0; i < d.length; i += 4) {
      let r = d[i];
      let g = d[i + 1];
      let b = d[i + 2];

      if (options.colorMode === 'bw') {
        let gray = 0.299 * r + 0.587 * g + 0.114 * b;
        gray = 1.35 * (gray - 128) + 128;
        if (gray > 220) gray = 255;
        else if (gray < 40) gray = 0;
        r = g = b = gray;
      } else if (options.colorMode === 'grayscale') {
        let gray = 0.299 * r + 0.587 * g + 0.114 * b;
        r = g = b = gray;
      }

      if (options.applyScannerEffect && (i % 8 === 0)) {
        const grain = (Math.random() - 0.5) * 5;
        r += grain;
        g += grain;
        b += grain;
      }

      d[i] = Math.min(255, Math.max(0, r));
      d[i + 1] = Math.min(255, Math.max(0, g));
      d[i + 2] = Math.min(255, Math.max(0, b));
    }
    ctx.putImageData(imgData, 0, 0);
  }

  // Apply sharpness to DNI text & barcode
  if (options.sharpness && options.sharpness > 1.0) {
    applySharpnessFilter(ctx, a4Width, a4Height, options.sharpness);
  }

  return a4Canvas;
}

/**
 * Process DNI front & back into a single lightweight, crystal-sharp A4 PDF
 */
export async function processDniToPdf(
  options: DniOptions,
  onProgress?: (msg: string) => void
): Promise<{ blob: Blob; originalSize: number; newSize: number }> {
  if (!options.frontPreviewUrl && !options.backPreviewUrl) {
    throw new Error('Debes subir al menos una cara del DNI');
  }

  onProgress?.('Renderizando DNI en hoja A4 estándar en alta nitidez...');
  const canvas = await renderDniToA4Canvas(options, 1.0);

  onProgress?.('Comprimiendo y optimizando peso del documento...');
  const jpegBlob = await canvasToJpegBlob(canvas, options.quality || 74);
  const jpegBytes = await jpegBlob.arrayBuffer();

  onProgress?.('Generando archivo PDF...');
  const outPdf = await PDFDocument.create();
  const embeddedImg = await outPdf.embedJpg(jpegBytes);

  const page = outPdf.addPage([595, 842]);
  page.drawImage(embeddedImg, {
    x: 0,
    y: 0,
    width: 595,
    height: 842,
  });

  const finalPdfBytes = await outPdf.save();
  const finalBlob = new Blob([finalPdfBytes], { type: 'application/pdf' });

  let originalBytes = 0;
  if (options.frontImage) originalBytes += options.frontImage.size;
  if (options.backImage) originalBytes += options.backImage.size;

  return {
    blob: finalBlob,
    originalSize: originalBytes,
    newSize: finalBlob.size,
  };
}

/**
 * Process multiple images into a single compiled PDF
 */
export async function processImagesToPdf(
  items: ImageItem[],
  options: ScannerOptions,
  onProgress?: (current: number, total: number, message: string) => void
): Promise<{ blob: Blob; pageCount: number; originalSize: number; newSize: number }> {
  if (items.length === 0) throw new Error('No hay imágenes para convertir');

  const outPdf = await PDFDocument.create();
  let totalOriginalBytes = 0;
  const totalPages = items.length;

  for (let i = 0; i < totalPages; i++) {
    const item = items[i];
    totalOriginalBytes += item.size;
    const pageNum = i + 1;

    onProgress?.(pageNum, totalPages, `Preparando foto/imagen ${pageNum} de ${totalPages}...`);
    const canvas = await renderImageItemToCanvas(item, 1800);

    let processedCanvas: HTMLCanvasElement;
    if (options.applyEffectsToImages) {
      onProgress?.(pageNum, totalPages, `Aplicando efectos y nitidez a foto ${pageNum}...`);
      processedCanvas = applyScannerEffects(canvas, options);
    } else {
      processedCanvas = canvas;
      if (options.sharpness > 1.0) {
        const c = processedCanvas.getContext('2d');
        if (c) applySharpnessFilter(c, processedCanvas.width, processedCanvas.height, options.sharpness);
      }
    }

    onProgress?.(pageNum, totalPages, `Comprimiendo imagen ${pageNum}...`);
    const jpegBlob = await canvasToJpegBlob(processedCanvas, options.quality);
    const jpegBytes = await jpegBlob.arrayBuffer();
    const embeddedImg = await outPdf.embedJpg(jpegBytes);

    let pageWidth: number;
    let pageHeight: number;

    if (options.pageFormat === 'a4') {
      const isLandscape = embeddedImg.width > embeddedImg.height;
      pageWidth = isLandscape ? 842 : 595;
      pageHeight = isLandscape ? 595 : 842;
    } else if (options.pageFormat === 'letter') {
      const isLandscape = embeddedImg.width > embeddedImg.height;
      pageWidth = isLandscape ? 792 : 612;
      pageHeight = isLandscape ? 612 : 792;
    } else {
      pageWidth = (embeddedImg.width * 72) / 96;
      pageHeight = (embeddedImg.height * 72) / 96;
    }

    const page = outPdf.addPage([pageWidth, pageHeight]);
    const margin = options.pageFormat === 'fit' ? 0 : 20;
    const availW = pageWidth - margin * 2;
    const availH = pageHeight - margin * 2;

    const scaleW = availW / embeddedImg.width;
    const scaleH = availH / embeddedImg.height;
    const fitScale = Math.min(scaleW, scaleH);

    const drawW = embeddedImg.width * fitScale;
    const drawH = embeddedImg.height * fitScale;
    const xOff = (pageWidth - drawW) / 2;
    const yOff = (pageHeight - drawH) / 2;

    page.drawImage(embeddedImg, {
      x: xOff,
      y: yOff,
      width: drawW,
      height: drawH,
    });
  }

  onProgress?.(totalPages, totalPages, 'Generando archivo PDF final optimizado...');
  const finalPdfBytes = await outPdf.save();
  const finalBlob = new Blob([finalPdfBytes], { type: 'application/pdf' });

  return {
    blob: finalBlob,
    pageCount: totalPages,
    originalSize: totalOriginalBytes,
    newSize: finalBlob.size,
  };
}

/**
 * Process a PDF file to scanned PDF with razor sharpness and optimized size
 */
export async function processFileToScannedPdf(
  file: File,
  options: ScannerOptions,
  onProgress?: (current: number, total: number, message: string) => void
): Promise<{ blob: Blob; pageCount: number; originalSize: number; newSize: number }> {
  const outPdf = await PDFDocument.create();
  const fileBytes = await file.arrayBuffer();
  let pageCount = 0;

  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(fileBytes) });
    const pdfDoc = await loadingTask.promise;
    pageCount = pdfDoc.numPages;

    for (let i = 1; i <= pageCount; i++) {
      onProgress?.(i, pageCount, `Renderizando página ${i} de ${pageCount} en alta nitidez...`);
      const { canvas, originalWidth, originalHeight } = await renderPdfPageToCanvas(
        pdfDoc,
        i,
        options.resolutionScale
      );

      onProgress?.(i, pageCount, `Aplicando efectos, nitidez y bordes (página ${i})...`);
      const scannedCanvas = applyScannerEffects(canvas, options);

      onProgress?.(i, pageCount, `Comprimiendo imagen optimizada (página ${i})...`);
      const jpegBlob = await canvasToJpegBlob(scannedCanvas, options.quality);
      const jpegBytes = await jpegBlob.arrayBuffer();

      const embeddedImg = await outPdf.embedJpg(jpegBytes);
      const page = outPdf.addPage([originalWidth, originalHeight]);

      const imgWidth = embeddedImg.width;
      const imgHeight = embeddedImg.height;
      const scaleW = originalWidth / imgWidth;
      const scaleH = originalHeight / imgHeight;
      const fitScale = Math.min(scaleW, scaleH);

      const drawW = imgWidth * fitScale;
      const drawH = imgHeight * fitScale;
      const xOffset = (originalWidth - drawW) / 2;
      const yOffset = (originalHeight - drawH) / 2;

      page.drawImage(embeddedImg, {
        x: xOffset,
        y: yOffset,
        width: drawW,
        height: drawH,
      });
    }
  } else {
    const item: ImageItem = {
      id: 'single_img',
      file,
      previewUrl: URL.createObjectURL(file),
      rotation: 0,
      name: file.name,
      size: file.size,
    };
    const res = await processImagesToPdf([item], options, onProgress);
    URL.revokeObjectURL(item.previewUrl);
    return res;
  }

  onProgress?.(pageCount, pageCount, 'Compilando documento PDF final...');
  const finalPdfBytes = await outPdf.save();
  const finalBlob = new Blob([finalPdfBytes], { type: 'application/pdf' });

  return {
    blob: finalBlob,
    pageCount,
    originalSize: file.size,
    newSize: finalBlob.size,
  };
}
