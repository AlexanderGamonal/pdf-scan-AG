import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  FileText,
  Upload,
  Download,
  Sliders,
  ShieldCheck,
  Globe,
  RefreshCw,
  Eye,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Laptop,
  Square,
  Zap,
  HardDrive
} from 'lucide-react';
import {
  ScannerOptions,
  DEFAULT_OPTIONS,
  PRESETS,
  QUALITY_PRESETS,
  QualityPreset,
  BorderStyle,
  applyScannerEffects,
  renderPdfPageToCanvas,
  processFileToScannedPdf,
} from './lib/scannerEngine';

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedPreset, setSelectedPreset] = useState<string>('office');
  const [options, setOptions] = useState<ScannerOptions>(DEFAULT_OPTIONS);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<{ current: number; total: number; msg: string }>({
    current: 0,
    total: 0,
    msg: '',
  });
  const [previewMode, setPreviewMode] = useState<'scanned' | 'original'>('scanned');
  const [isVercelModalOpen, setIsVercelModalOpen] = useState<boolean>(false);
  const [successInfo, setSuccessInfo] = useState<{ originalSize: string; newSize: string; reduction: string } | null>(null);

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const originalCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Apply preset
  const handleSelectPreset = (key: string) => {
    setSelectedPreset(key);
    const preset = PRESETS[key];
    if (preset) {
      setOptions((prev) => ({
        ...prev,
        ...preset.options,
      }));
    }
  };

  // Change Quality / Size Preset
  const handleQualityPresetChange = (qKey: QualityPreset) => {
    const q = QUALITY_PRESETS[qKey];
    if (q) {
      setOptions((prev) => ({
        ...prev,
        qualityPreset: qKey,
        quality: q.quality,
        resolutionScale: q.scale,
      }));
    }
  };

  // Handle file select
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      loadFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      loadFile(e.dataTransfer.files[0]);
    }
  };

  const loadFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setCurrentPage(1);
    setSuccessInfo(null);

    if (selectedFile.type === 'application/pdf' || selectedFile.name.toLowerCase().endsWith('.pdf')) {
      try {
        const buffer = await selectedFile.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
        const doc = await loadingTask.promise;
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
      } catch (err) {
        console.error('Error al cargar PDF:', err);
      }
    } else {
      setPdfDoc(null);
      setTotalPages(1);
    }
  };

  // Render preview canvas whenever options, file, or page changes
  useEffect(() => {
    let isCancelled = false;

    async function updatePreview() {
      if (!file) return;

      let srcCanvas: HTMLCanvasElement;

      if (pdfDoc) {
        try {
          const { canvas } = await renderPdfPageToCanvas(pdfDoc, currentPage, options.resolutionScale);
          if (isCancelled) return;
          srcCanvas = canvas;
        } catch (err) {
          console.error('Error rendering preview page:', err);
          return;
        }
      } else {
        // Image preview
        const img = new Image();
        const url = URL.createObjectURL(file);
        await new Promise((res) => {
          img.onload = res;
          img.src = url;
        });
        if (isCancelled) return;
        srcCanvas = document.createElement('canvas');
        srcCanvas.width = img.naturalWidth;
        srcCanvas.height = img.naturalHeight;
        const ctx = srcCanvas.getContext('2d');
        if (ctx) ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
      }

      originalCanvasRef.current = srcCanvas;

      // Apply effects with deterministic seed for stable preview
      const processedCanvas = applyScannerEffects(srcCanvas, options, 42);
      if (isCancelled) return;

      const displayCanvas = previewCanvasRef.current;
      if (displayCanvas) {
        displayCanvas.width = processedCanvas.width;
        displayCanvas.height = processedCanvas.height;
        const ctx = displayCanvas.getContext('2d');
        if (ctx) {
          if (previewMode === 'original') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, displayCanvas.width, displayCanvas.height);
            const xOff = (displayCanvas.width - srcCanvas.width) / 2;
            const yOff = (displayCanvas.height - srcCanvas.height) / 2;
            ctx.drawImage(srcCanvas, xOff, yOff);
          } else {
            ctx.drawImage(processedCanvas, 0, 0);
          }
        }
      }
    }

    updatePreview();

    return () => {
      isCancelled = true;
    };
  }, [file, pdfDoc, currentPage, options, previewMode]);

  // Execute full scan and download
  const handleProcessAndDownload = async () => {
    if (!file) return;
    setIsProcessing(true);
    setSuccessInfo(null);

    try {
      const result = await processFileToScannedPdf(file, options, (current, total, msg) => {
        setProgress({ current, total, msg });
      });

      const url = URL.createObjectURL(result.blob);
      const a = document.createElement('a');
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      a.href = url;
      a.download = `${baseName}_scanned.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const fmt = (bytes: number) => {
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
      };

      const diff = result.newSize - result.originalSize;
      const pct = Math.abs(Math.round((diff / (result.originalSize || 1)) * 100));

      setSuccessInfo({
        originalSize: fmt(result.originalSize),
        newSize: fmt(result.newSize),
        reduction: diff < 0 ? `-${pct}% más liviano` : `Optimizado`,
      });
    } catch (err) {
      alert(`Error procesando documento: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-100">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-slate-900 text-lg tracking-tight">Look Like Scanned</span>
                <span className="bg-emerald-50 text-emerald-700 text-xs px-2 py-0.5 rounded-full font-semibold border border-emerald-100">
                  Optimizador v2.0
                </span>
              </div>
              <p className="text-xs text-slate-500">Con bordes realistas de hoja y control estricto de peso</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex items-center text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
              <ShieldCheck className="w-4 h-4 mr-1.5 text-emerald-600" />
              100% En tu navegador (Sin subir a la nube)
            </div>

            <button
              onClick={() => setIsVercelModalOpen(true)}
              className="inline-flex items-center text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg px-3 py-2 transition"
            >
              <Globe className="w-4 h-4 mr-1.5 text-slate-600" />
              Subir a Vercel
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Banner de Optimización y Bordes */}
        <div className="mb-6 bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border border-emerald-200 rounded-2xl p-4 flex items-start sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start sm:items-center space-x-3">
            <div className="p-2 bg-emerald-600 text-white rounded-xl mt-0.5 sm:mt-0 shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-emerald-950">
                Mejoras aplicadas: Bordes reales de inclinación y compresión de peso inteligente
              </h2>
              <p className="text-xs text-emerald-800 mt-0.5">
                Ahora al inclinar la hoja se dibuja el <strong>contorno y sombra física de la hoja</strong> (o el cristal de fotocopiadora), y la compresión JPEG optimizada <strong>evita que el archivo pase de 400 KB a 1.4 MB</strong>.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsVercelModalOpen(true)}
            className="shrink-0 text-xs font-bold text-emerald-800 hover:text-emerald-950 bg-white border border-emerald-200 px-3 py-1.5 rounded-lg shadow-2xs hover:shadow-xs transition"
          >
            Acceso Web &rarr;
          </button>
        </div>

        {!file ? (
          /* Empty / Upload State */
          <div className="max-w-3xl mx-auto mt-6">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-3xl p-12 text-center bg-white shadow-sm hover:shadow-md transition-all cursor-pointer group"
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <input
                id="file-input"
                type="file"
                accept=".pdf,image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="w-20 h-20 mx-auto rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-5 group-hover:scale-105 group-hover:bg-indigo-100 transition-all">
                <Upload className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">
                Arrastra tu PDF o imagen aquí
              </h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
                Soporta archivos <strong>PDF multipágina</strong> e imágenes. Ahora con <strong>bordes visibles de escáner</strong> y <strong>tamaño de salida optimizado</strong>.
              </p>
              <button
                type="button"
                className="inline-flex items-center px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md shadow-indigo-100 transition"
              >
                <Upload className="w-4 h-4 mr-2" />
                Seleccionar archivo desde tu equipo
              </button>
            </div>

            {/* Feature Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-12">
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                  <Square className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">Bordes Reales al Inclinar</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Delimita el perímetro de la hoja con sombra natural de papel o esquinas oscuras de cama plana de escáner.
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                  <HardDrive className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">Control Estricto de Peso</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Grano suave y compresión DCT optimizada para que tus PDFs queden livianos (~100-250 KB) y no se inflen a 1.4 MB.
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                  <Globe className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">Fácil de usar en la empresa</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Listo para desplegar en Vercel gratis. Úsalo desde tu laptop del trabajo sin instalar nada.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* File Loaded: Workspace with Controls & Live Preview */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Controls & Presets (5 cols) */}
            <div className="lg:col-span-5 space-y-5">
              {/* File details card */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex items-center justify-between">
                <div className="flex items-center space-x-3 truncate">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="truncate">
                    <h4 className="text-sm font-bold text-slate-900 truncate" title={file.name}>
                      {file.name}
                    </h4>
                    <p className="text-xs text-slate-500">
                      {(file.size / 1024).toFixed(0)} KB • {totalPages} {totalPages === 1 ? 'página' : 'páginas'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setFile(null);
                    setPdfDoc(null);
                  }}
                  className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg font-medium transition"
                >
                  Cambiar
                </button>
              </div>

              {/* SECTION: PESO Y TAMAÑO DE ARCHIVO (PRIORITARIO) */}
              <div className="bg-white rounded-2xl p-5 border border-indigo-200/80 shadow-xs space-y-3 bg-gradient-to-b from-indigo-50/30 to-white">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center">
                    <HardDrive className="w-4 h-4 mr-2 text-indigo-600" />
                    Optimización de Peso (PDF Liviano)
                  </h3>
                  <span className="text-[11px] font-bold text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded-md">
                    {QUALITY_PRESETS[options.qualityPreset].sizeEstimate}
                  </span>
                </div>

                {/* Quality / Size Buttons */}
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(QUALITY_PRESETS) as QualityPreset[]).map((qKey) => {
                    const q = QUALITY_PRESETS[qKey];
                    const isActive = options.qualityPreset === qKey;
                    return (
                      <button
                        key={qKey}
                        onClick={() => handleQualityPresetChange(qKey)}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          isActive
                            ? 'border-indigo-600 bg-indigo-600 text-white shadow-2xs font-semibold'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="text-xs font-bold leading-tight">
                          {qKey === 'light' ? '⚡ Ligero' : qKey === 'balanced' ? '⚖️ Equilibrado' : '🖨️ HD'}
                        </div>
                        <div className={`text-[10px] mt-0.5 ${isActive ? 'text-indigo-100' : 'text-slate-500'}`}>
                          {q.sizeEstimate}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Quality Slider */}
                <div className="pt-2 border-t border-slate-100 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-700">Calidad de Compresión JPEG</span>
                    <span className="font-semibold text-indigo-600">{options.quality}%</span>
                  </div>
                  <input
                    type="range"
                    min="35"
                    max="90"
                    step="5"
                    value={options.quality}
                    onChange={(e) =>
                      setOptions({
                        ...options,
                        quality: parseInt(e.target.value),
                      })
                    }
                    className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                  />
                  <p className="text-[11px] text-slate-500">
                    60-70% ofrece la textura clásica de escáner y mantiene el archivo entre 120-250 KB.
                  </p>
                </div>
              </div>

              {/* SECTION: BORDES AL INCLINAR */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center justify-between">
                  <span className="flex items-center">
                    <Square className="w-4 h-4 mr-2 text-slate-700" />
                    Bordes y Contorno de Inclinación
                  </span>
                </h3>

                {/* Border Style Selector */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    onClick={() => setOptions({ ...options, borderStyle: 'paper_shadow', scannerBedColor: 'light_gray' })}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      options.borderStyle === 'paper_shadow'
                        ? 'border-indigo-600 bg-indigo-50 font-bold text-indigo-900 ring-1 ring-indigo-500'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div>📄 Hoja + Sombra</div>
                    <div className="text-[10px] text-slate-500 font-normal mt-0.5">Contorno y sombra física</div>
                  </button>

                  <button
                    onClick={() => setOptions({ ...options, borderStyle: 'scanner_bed', scannerBedColor: 'dark_photocopy' })}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      options.borderStyle === 'scanner_bed'
                        ? 'border-indigo-600 bg-indigo-50 font-bold text-indigo-900 ring-1 ring-indigo-500'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div>🖨️ Esquinas de Escáner</div>
                    <div className="text-[10px] text-slate-500 font-normal mt-0.5">Cristal oscuro en esquinas</div>
                  </button>

                  <button
                    onClick={() => setOptions({ ...options, borderStyle: 'thin_line', scannerBedColor: 'white' })}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      options.borderStyle === 'thin_line'
                        ? 'border-indigo-600 bg-indigo-50 font-bold text-indigo-900 ring-1 ring-indigo-500'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div>⚪ Borde Fino</div>
                    <div className="text-[10px] text-slate-500 font-normal mt-0.5">Línea delgada perimetral</div>
                  </button>

                  <button
                    onClick={() => setOptions({ ...options, borderStyle: 'none' })}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      options.borderStyle === 'none'
                        ? 'border-indigo-600 bg-indigo-50 font-bold text-indigo-900 ring-1 ring-indigo-500'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div>🚫 Sin Bordes</div>
                    <div className="text-[10px] text-slate-500 font-normal mt-0.5">Fondo blanco uniforme</div>
                  </button>
                </div>

                {/* Border Intensity Slider */}
                {options.borderStyle !== 'none' && (
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-slate-700">Intensidad / Visibilidad de Bordes</span>
                      <span className="text-slate-500">{options.borderIntensity}%</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="100"
                      step="5"
                      value={options.borderIntensity}
                      onChange={(e) => setOptions({ ...options, borderIntensity: parseInt(e.target.value) })}
                      className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                    />
                  </div>
                )}

                {/* Inclinación (Askew) */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-medium text-slate-700 flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={options.askew}
                        onChange={(e) => setOptions({ ...options, askew: e.target.checked })}
                        className="rounded text-indigo-600 mr-2"
                      />
                      Inclinación aleatoria (Askew)
                    </label>
                    <span className="text-slate-500">±{options.askewAngle}°</span>
                  </div>
                  {options.askew && (
                    <input
                      type="range"
                      min="0.2"
                      max="2.5"
                      step="0.1"
                      value={options.askewAngle}
                      onChange={(e) => setOptions({ ...options, askewAngle: parseFloat(e.target.value) })}
                      className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                    />
                  )}
                </div>
              </div>

              {/* Presets Rápidos */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
                <h3 className="text-sm font-bold text-slate-900 flex items-center mb-3">
                  <Sparkles className="w-4 h-4 mr-2 text-indigo-600" />
                  Presets de Estilo
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(PRESETS).map(([key, preset]) => (
                    <button
                      key={key}
                      onClick={() => handleSelectPreset(key)}
                      className={`text-left p-2.5 rounded-xl border transition-all ${
                        selectedPreset === key
                          ? 'border-indigo-600 bg-indigo-50/70 shadow-2xs ring-1 ring-indigo-500'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="text-base mb-0.5">{preset.icon}</div>
                      <div className="font-semibold text-xs text-slate-900">{preset.name}</div>
                      <div className="text-[10px] text-slate-500 line-clamp-2 mt-0.5 leading-tight">
                        {preset.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Ajustes Avanzados */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center justify-between">
                  <span className="flex items-center">
                    <Sliders className="w-4 h-4 mr-2 text-slate-700" />
                    Efectos Ópticos
                  </span>
                  <button
                    onClick={() => handleSelectPreset('office')}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Restablecer
                  </button>
                </h3>

                {/* Photocopy Black and White */}
                <div className="pt-2 border-t border-slate-100">
                  <label className="flex items-center justify-between text-xs font-medium text-slate-700 cursor-pointer">
                    <span className="flex items-center">
                      <input
                        type="checkbox"
                        checked={options.blackAndWhite}
                        onChange={(e) => setOptions({ ...options, blackAndWhite: e.target.checked })}
                        className="rounded text-indigo-600 mr-2"
                      />
                      Modo Fotocopia Blanco y Negro
                    </span>
                    <span className="text-[11px] text-slate-400">Tóner contrastado</span>
                  </label>
                </div>

                {/* Noise (Grano Suave Optimizado) */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">Grano de Papel (Optimizado)</span>
                    <span className="text-slate-500">{options.noise}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="25"
                    step="1"
                    value={options.noise}
                    onChange={(e) => setOptions({ ...options, noise: parseInt(e.target.value) })}
                    className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                  />
                </div>

                {/* Blur */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-medium text-slate-700 flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={options.blur}
                        onChange={(e) => setOptions({ ...options, blur: e.target.checked })}
                        className="rounded text-indigo-600 mr-2"
                      />
                      Desenfoque de lente
                    </label>
                    <span className="text-slate-500">{options.blurRadius}px</span>
                  </div>
                  {options.blur && (
                    <input
                      type="range"
                      min="0.3"
                      max="2.0"
                      step="0.1"
                      value={options.blurRadius}
                      onChange={(e) => setOptions({ ...options, blurRadius: parseFloat(e.target.value) })}
                      className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                    />
                  )}
                </div>

                {/* Contraste */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">Contraste</span>
                    <span className="text-slate-500">{options.contrast.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.8"
                    max="1.5"
                    step="0.05"
                    value={options.contrast}
                    onChange={(e) => setOptions({ ...options, contrast: parseFloat(e.target.value) })}
                    className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                  />
                </div>
              </div>

              {/* Action Button & Progress */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
                {isProcessing ? (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold text-slate-700">
                      <span>{progress.msg || 'Procesando...'}</span>
                      <span>
                        {progress.total > 0
                          ? `${Math.round((progress.current / progress.total) * 100)}%`
                          : ''}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-indigo-600 h-full transition-all duration-300 rounded-full"
                        style={{
                          width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 15}%`,
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleProcessAndDownload}
                    className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-100 flex items-center justify-center space-x-2 transition cursor-pointer"
                  >
                    <Download className="w-5 h-5" />
                    <span>Descargar PDF Escaneado ({totalPages} {totalPages === 1 ? 'pág' : 'págs'})</span>
                  </button>
                )}

                {successInfo && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-3 text-xs text-emerald-800">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-semibold">¡PDF generado con éxito!</p>
                      <p className="text-emerald-700 mt-0.5">
                        Original: {successInfo.originalSize} &rarr; Escaneado: <strong>{successInfo.newSize}</strong> ({successInfo.reduction})
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Live Interactive Preview (7 cols) */}
            <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200 shadow-2xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <Eye className="w-4 h-4 text-indigo-600" />
                  <span className="font-bold text-slate-900 text-sm">Vista Previa con Bordes de Escaneo</span>
                </div>

                {/* Original vs Scanned Toggle */}
                <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                  <button
                    onClick={() => setPreviewMode('scanned')}
                    className={`px-3 py-1 rounded-lg transition ${
                      previewMode === 'scanned'
                        ? 'bg-white text-indigo-700 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Escaneado con Bordes
                  </button>
                  <button
                    onClick={() => setPreviewMode('original')}
                    className={`px-3 py-1 rounded-lg transition ${
                      previewMode === 'original'
                        ? 'bg-white text-indigo-700 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Original
                  </button>
                </div>
              </div>

              {/* Canvas Preview Container */}
              <div className="bg-slate-200/60 rounded-2xl p-6 flex items-center justify-center min-h-[480px] overflow-hidden border border-slate-300/40">
                <canvas
                  ref={previewCanvasRef}
                  className="max-h-[580px] w-auto max-w-full shadow-xl rounded-xs bg-white"
                />
              </div>

              {/* Page Navigator */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <button
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="inline-flex items-center px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Anterior
                  </button>

                  <span className="text-xs font-semibold text-slate-600">
                    Página {currentPage} de {totalPages}
                  </span>

                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="inline-flex items-center px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    Siguiente
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Modal: Cómo desplegar en Vercel */}
      {isVercelModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-6 relative border border-slate-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center font-bold">
                  ▲
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Desplegar en Vercel Gratis
                  </h3>
                  <p className="text-xs text-slate-500">
                    Accede a tu escáner desde cualquier laptop corporativa o celular
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsVercelModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-600">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="font-bold text-slate-900 flex items-center text-sm">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs mr-2">
                    1
                  </span>
                  Opción Rápida: Desde tu terminal con Vercel CLI
                </div>
                <p className="text-slate-600">
                  Ya tienes Vercel CLI instalado en esta máquina. Abre PowerShell en esta carpeta y ejecuta:
                </p>
                <code className="block bg-slate-900 text-slate-100 p-2.5 rounded-xl font-mono text-xs">
                  vercel
                </code>
                <p className="text-[11px] text-slate-500">
                  Sigue las 3 preguntas en pantalla (Enter, Enter) y tendrás tu URL pública (ejemplo: <code>https://look-like-scanned.vercel.app</code>) en 30 segundos.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="font-bold text-slate-900 flex items-center text-sm">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs mr-2">
                    2
                  </span>
                  Opción GitHub: Despliegue automático
                </div>
                <p className="text-slate-600">
                  Si prefieres vincularlo a tu cuenta de GitHub:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-slate-600 pl-1">
                  <li>Sube este proyecto a tu repositorio de GitHub.</li>
                  <li>Entra a <a href="https://vercel.com/new" target="_blank" rel="noreferrer" className="text-indigo-600 underline font-semibold">vercel.com/new</a>.</li>
                  <li>Importa el repositorio y haz clic en <strong>Deploy</strong>.</li>
                </ol>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800">
                <strong>¿Por qué es perfecto para laptops corporativas?</strong>
                <p className="mt-0.5">
                  Todo el procesamiento de PDF se realiza dentro de la memoria del navegador. No se instalan ejecutables ni se envían datos confidenciales a ningún servidor.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setIsVercelModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
