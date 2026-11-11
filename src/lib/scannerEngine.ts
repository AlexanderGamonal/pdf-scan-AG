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

export interface ScannerOptions {
  quality: number; // 30 to 95 (default 68)
  qualityPreset: QualityPreset;
  resolutionScale: number; // 1.15 to 2.0 (default 1.35)
  askew: boolean; // default true
  askewAngle: number; // max angle in degrees (default 0.75)
  borderStyle: BorderStyle; // 'paper_shadow' | 'scanner_bed' | 'thin_line' | 'none'
  borderIntensity: number; // 10 to 100 (default 70)
  scannerBedColor: 'light_gray' | 'dark_photocopy' | 'white';
  blackAndWhite: boolean; // photocopy effect (default false)
  blur: boolean; // default false
  blurRadius: number; // default 0.8
  blurVariation: boolean; // depth of field uneven focus (default false)
  noise: number; // 0 to 50 (default 6)
  contrast: number; // 0.5 to 2.0 (default 1.05)
  brightness: number; // 0.5 to 1.5 (default 1.01)
  applyEffectsToImages: boolean; // default true
  pageFormat: PageFormat; // default 'a4'
}

export const DEFAULT_OPTIONS: ScannerOptions = {
  quality: 68,
  qualityPreset: 'balanced',
  resolutionScale: 1.35,
  askew: true,
  askewAngle: 0.8,
  borderStyle: 'paper_shadow',
  borderIntensity: 70,
  scannerBedColor: 'light_gray',
  blackAndWhite: false,
  blur: false,
  blurRadius: 0.8,
  blurVariation: false,
  noise: 6,
  contrast: 1.05,
  brightness: 1.01,
  applyEffectsToImages: true,
  pageFormat: 'a4',
};

export const QUALITY_PRESETS: Record<
  QualityPreset,
  { name: string; desc: string; sizeEstimate: string; scale: number; quality: number }
> = {
  light: {
    name: 'Ligero (Ideal Correo / Web)',
    desc: 'Archivos muy livianos (~50-100 KB/pág). Excelente para enviar por email o subir a plataformas con límites estrictos.',
    sizeEstimate: '~50 - 100 KB / pág',
    scale: 1.15,
    quality: 55,
  },
  balanced: {
    name: 'Equilibrado (Recomendado)',
    desc: 'El balance perfecto (~120-220 KB/pág). Textos y firmas completamente nítidos con compresión óptima de escáner real.',
    sizeEstimate: '~120 - 220 KB / pág',
    scale: 1.35,
    quality: 68,
  },
  high: {
    name: 'Alta Definición (HD)',
    desc: 'Mayor resolución (~350-600 KB/pág). Para documentos con letras muy pequeñas o sellos de detalle.',
    sizeEstimate: '~350 - 600 KB / pág',
    scale: 1.8,
    quality: 80,
  },
};

export const PRESETS: Record<
  string,
  { name: string; icon: string; description: string; options: Partial<ScannerOptions> }
> = {
  office: {
    name: 'Escáner de Oficina (Color)',
    icon: '🏢',
    description: 'Bordes de hoja física con sombra, ligera inclinación y peso optimizado.',
    options: {
      quality: 68,
      qualityPreset: 'balanced',
      resolutionScale: 1.35,
      askew: true,
      askewAngle: 0.75,
      borderStyle: 'paper_shadow',
      borderIntensity: 70,
      scannerBedColor: 'light_gray',
      blackAndWhite: false,
      blur: false,
      blurVariation: false,
      noise: 6,
      contrast: 1.06,
      brightness: 1.01,
      applyEffectsToImages: true,
    },
  },
  photocopy: {
    name: 'Fotocopia Blanco y Negro',
    icon: '📄',
    description: 'Bordes oscuros de cristal de fotocopiadora, alto contraste y grano de tóner.',
    options: {
      quality: 65,
      qualityPreset: 'balanced',
      resolutionScale: 1.35,
      askew: true,
      askewAngle: 0.9,
      borderStyle: 'scanner_bed',
      borderIntensity: 85,
      scannerBedColor: 'dark_photocopy',
      blackAndWhite: true,
      blur: true,
      blurRadius: 0.7,
      blurVariation: false,
      noise: 10,
      contrast: 1.35,
      brightness: 1.02,
      applyEffectsToImages: true,
    },
  },
  vintage: {
    name: 'Escáner Antiguo con Marco',
    icon: '📜',
    description: 'Inclinación marcada, bordes oscuros en esquinas y grano pronunciado.',
    options: {
      quality: 60,
      qualityPreset: 'balanced',
      resolutionScale: 1.35,
      askew: true,
      askewAngle: 1.3,
      borderStyle: 'scanner_bed',
      borderIntensity: 90,
      scannerBedColor: 'dark_photocopy',
      blackAndWhite: false,
      blur: true,
      blurRadius: 1.0,
      blurVariation: true,
      noise: 14,
      contrast: 1.15,
      brightness: 0.98,
      applyEffectsToImages: true,
    },
  },
  clean_image: {
    name: 'Foto Limpia a PDF',
    icon: '📸',
    description: 'Convierte imágenes a PDF nítido y liviano sin inclinar ni añadir ruido.',
    options: {
      quality: 75,
      qualityPreset: 'balanced',
      resolutionScale: 1.3,
      askew: false,
      borderStyle: 'none',
      blackAndWhite: false,
      blur: false,
      blurVariation: false,
      noise: 0,
      contrast: 1.0,
      brightness: 1.0,
      applyEffectsToImages: false,
    },
  },
  subtle: {
    name: 'Escáner Limpio / Sutil',
    icon: '⚡',
    description: 'Borde fino y discreto, inclinación mínima y archivo ultra optimizado.',
    options: {
      quality: 70,
      qualityPreset: 'balanced',
      resolutionScale: 1.3,
      askew: true,
      askewAngle: 0.4,
      borderStyle: 'thin_line',
      borderIntensity: 50,
      scannerBedColor: 'white',
      blackAndWhite: false,
      blur: false,
      blurVariation: false,
      noise: 3,
      contrast: 1.02,
      brightness: 1.0,
      applyEffectsToImages: true,
    },
  },
};

/**
 * Apply scanner effects on a canvas and return a new canvas with realistic borders & optimized weight
 */
export function applyScannerEffects(
  srcCanvas: HTMLCanvasElement,
  options: ScannerOptions,
  deterministicSeed?: number
): HTMLCanvasElement {
  const width = srcCanvas.width;
  const height = srcCanvas.height;

  // Pseudo-random helper
  let seed = deterministicSeed ?? Math.random() * 10000;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  // 1. Calculate rotation angle
  let angle = 0;
  if (options.askew) {
    const maxA = options.askewAngle || 0.8;
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

  // 2. Fill the scanner bed background
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

  // 3. Draw the paper sheet with shadow and border
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

  // 4. Draw paper edges
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

  // 5. Pixel adjustments: Contrast, Brightness, B&W, Smooth Grain
  const imgData = ctx.getImageData(0, 0, rotWidth, rotHeight);
  const data = imgData.data;

  const jitter = 1.0 + rand() * 0.012;
  const finalBrightness = options.brightness * jitter;
  const contrastFactor = options.contrast;

  const cVal = (contrastFactor - 1.0) * 128;
  const cFactor = (259 * (cVal + 255)) / (255 * (259 - cVal));

  const noiseAmp = options.noise * 0.65;

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
 * Render a single PDF page into an HTMLCanvasElement
 */
export async function renderPdfPageToCanvas(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  scale: number = 1.35
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
  maxDimension: number = 1600
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

  // Scale down if oversized (e.g. 48MP phone photos) to save RAM and optimize file size
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
      Math.max(0.2, Math.min(0.95, quality / 100))
    );
  });
}

/**
 * Process multiple images (photos, screenshots) into a single compiled PDF
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
    const canvas = await renderImageItemToCanvas(item, 1600);

    let processedCanvas: HTMLCanvasElement;
    if (options.applyEffectsToImages) {
      onProgress?.(pageNum, totalPages, `Aplicando efectos y bordes a foto ${pageNum}...`);
      processedCanvas = applyScannerEffects(canvas, options);
    } else {
      processedCanvas = canvas;
    }

    onProgress?.(pageNum, totalPages, `Comprimiendo imagen ${pageNum}...`);
    const jpegBlob = await canvasToJpegBlob(processedCanvas, options.quality);
    const jpegBytes = await jpegBlob.arrayBuffer();
    const embeddedImg = await outPdf.embedJpg(jpegBytes);

    // Determine PDF page dimensions: Standard A4 (595x842 pt) or Fit to image
    let pageWidth: number;
    let pageHeight: number;

    if (options.pageFormat === 'a4') {
      // Standard A4 portrait (595.28 x 841.89 pt) or landscape if image is wider
      const isLandscape = embeddedImg.width > embeddedImg.height;
      pageWidth = isLandscape ? 842 : 595;
      pageHeight = isLandscape ? 595 : 842;
    } else if (options.pageFormat === 'letter') {
      const isLandscape = embeddedImg.width > embeddedImg.height;
      pageWidth = isLandscape ? 792 : 612;
      pageHeight = isLandscape ? 612 : 792;
    } else {
      // Fit: natural points (72 DPI)
      pageWidth = (embeddedImg.width * 72) / 96;
      pageHeight = (embeddedImg.height * 72) / 96;
    }

    const page = outPdf.addPage([pageWidth, pageHeight]);

    // Fit image inside the page with proper margins
    const margin = options.pageFormat === 'fit' ? 0 : 20; // 20pt clean margin on standard sheets
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
 * Process a PDF file to scanned PDF with optimized size
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
      onProgress?.(i, pageCount, `Renderizando página ${i} de ${pageCount}...`);
      const { canvas, originalWidth, originalHeight } = await renderPdfPageToCanvas(
        pdfDoc,
        i,
        options.resolutionScale
      );

      onProgress?.(i, pageCount, `Aplicando efectos y bordes de escaneo (página ${i})...`);
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
    // Single image file wrapped as ImageItem
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

  onProgress?.(pageCount, pageCount, 'Compilando documento PDF final ultra optimizado...');
  const finalPdfBytes = await outPdf.save();
  const finalBlob = new Blob([finalPdfBytes], { type: 'application/pdf' });

  return {
    blob: finalBlob,
    pageCount,
    originalSize: file.size,
    newSize: finalBlob.size,
  };
}
