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
  Square,
  Zap,
  HardDrive,
  Image as ImageIcon,
  Plus,
  Trash2,
  RotateCw,
  ArrowLeft,
  ArrowRight,
  Layers,
  Settings2
} from 'lucide-react';
import {
  ScannerOptions,
  DEFAULT_OPTIONS,
  PRESETS,
  QUALITY_PRESETS,
  QualityPreset,
  PageFormat,
  ImageItem,
  applyScannerEffects,
  renderPdfPageToCanvas,
  renderImageItemToCanvas,
  processFileToScannedPdf,
  processImagesToPdf,
} from './lib/scannerEngine';

export default function App() {
  const [activeTab, setActiveTab] = useState<'pdf' | 'images'>('pdf');
  const [file, setFile] = useState<File | null>(null);
  const [imageItems, setImageItems] = useState<ImageItem[]>([]);
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

  // Handle file select (PDF or Images)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesSelected(Array.from(e.target.files));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelected(Array.from(e.dataTransfer.files));
    }
  };

  const handleFilesSelected = async (files: File[]) => {
    setSuccessInfo(null);
    setCurrentPage(1);

    const firstPdf = files.find((f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
    const images = files.filter((f) => f.type.startsWith('image/') || /\.(jpe?g|png|webp|bmp|heic|heif)$/i.test(f.name));

    if (firstPdf && images.length === 0) {
      // PDF Mode
      setActiveTab('pdf');
      setFile(firstPdf);
      setImageItems([]);
      try {
        const buffer = await firstPdf.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
        const doc = await loadingTask.promise;
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
      } catch (err) {
        console.error('Error al cargar PDF:', err);
      }
    } else if (images.length > 0) {
      // Images Mode
      setActiveTab('images');
      setFile(null);
      setPdfDoc(null);

      const newItems: ImageItem[] = images.map((img, idx) => ({
        id: `img_${Date.now()}_${idx}_${Math.random()}`,
        file: img,
        previewUrl: URL.createObjectURL(img),
        rotation: 0,
        name: img.name,
        size: img.size,
      }));

      setImageItems((prev) => [...prev, ...newItems]);
      setTotalPages((prev) => (imageItems.length === 0 ? newItems.length : prev + newItems.length));
    }
  };

  // Add more images
  const handleAddMoreImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const moreImages = Array.from(e.target.files).filter(
        (f) => f.type.startsWith('image/') || /\.(jpe?g|png|webp|bmp|heic|heif)$/i.test(f.name)
      );
      const newItems: ImageItem[] = moreImages.map((img, idx) => ({
        id: `img_${Date.now()}_${idx}_${Math.random()}`,
        file: img,
        previewUrl: URL.createObjectURL(img),
        rotation: 0,
        name: img.name,
        size: img.size,
      }));
      setImageItems((prev) => [...prev, ...newItems]);
    }
  };

  // Image actions: Rotate 90deg, Delete, Move
  const handleRotateImage = (index: number) => {
    setImageItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, rotation: (item.rotation + 90) % 360 } : item))
    );
  };

  const handleDeleteImage = (index: number) => {
    setImageItems((prev) => {
      const itemToDelete = prev[index];
      if (itemToDelete) URL.revokeObjectURL(itemToDelete.previewUrl);
      const next = prev.filter((_, idx) => idx !== index);
      if (currentPage > next.length && next.length > 0) {
        setCurrentPage(next.length);
      }
      return next;
    });
  };

  const handleMoveImage = (index: number, direction: 'left' | 'right') => {
    setImageItems((prev) => {
      const targetIndex = direction === 'left' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  // Keep totalPages updated in images mode
  useEffect(() => {
    if (activeTab === 'images') {
      setTotalPages(Math.max(1, imageItems.length));
    }
  }, [imageItems, activeTab]);

  // Render preview canvas whenever options, file/images, or page changes
  useEffect(() => {
    let isCancelled = false;

    async function updatePreview() {
      let srcCanvas: HTMLCanvasElement | null = null;

      if (activeTab === 'pdf' && pdfDoc) {
        try {
          const { canvas } = await renderPdfPageToCanvas(pdfDoc, currentPage, options.resolutionScale);
          if (isCancelled) return;
          srcCanvas = canvas;
        } catch (err) {
          console.error('Error rendering preview PDF page:', err);
          return;
        }
      } else if (activeTab === 'images' && imageItems.length > 0) {
        const item = imageItems[currentPage - 1] || imageItems[0];
        if (item) {
          try {
            srcCanvas = await renderImageItemToCanvas(item, 1200);
            if (isCancelled) return;
          } catch (err) {
            console.error('Error rendering preview image:', err);
            return;
          }
        }
      }

      if (!srcCanvas) return;

      originalCanvasRef.current = srcCanvas;

      let processedCanvas: HTMLCanvasElement;
      if (activeTab === 'images' && !options.applyEffectsToImages) {
        processedCanvas = srcCanvas;
      } else {
        processedCanvas = applyScannerEffects(srcCanvas, options, 42);
      }
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
  }, [file, pdfDoc, imageItems, currentPage, options, previewMode, activeTab]);

  // Execute full scan and download
  const handleProcessAndDownload = async () => {
    setIsProcessing(true);
    setSuccessInfo(null);

    try {
      let result;
      let downloadName = 'documento_scanned.pdf';

      if (activeTab === 'pdf' && file) {
        result = await processFileToScannedPdf(file, options, (current, total, msg) => {
          setProgress({ current, total, msg });
        });
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        downloadName = `${baseName}_scanned.pdf`;
      } else if (activeTab === 'images' && imageItems.length > 0) {
        result = await processImagesToPdf(imageItems, options, (current, total, msg) => {
          setProgress({ current, total, msg });
        });
        const firstImgName = imageItems[0].name.replace(/\.[^/.]+$/, '');
        downloadName = imageItems.length === 1 ? `${firstImgName}.pdf` : `Fotos_Convertidas_${imageItems.length}_pags.pdf`;
      } else {
        return;
      }

      const url = URL.createObjectURL(result.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = downloadName;
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

  const hasContent = (activeTab === 'pdf' && file) || (activeTab === 'images' && imageItems.length > 0);

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
                <span className="bg-indigo-50 text-indigo-700 text-xs px-2 py-0.5 rounded-full font-semibold border border-indigo-100">
                  PDF & Fotos
                </span>
              </div>
              <p className="text-xs text-slate-500">Convierte PDFs e Imágenes (Fotos/Capturas) en documentos escaneados</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex items-center text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
              <ShieldCheck className="w-4 h-4 mr-1.5 text-emerald-600" />
              100% En tu navegador (Sin subir a internet)
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
        {/* Navigation Tabs: PDF vs Fotos/Imágenes */}
        <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-200/80">
          <div className="flex items-center space-x-2 bg-slate-200/70 p-1.5 rounded-2xl">
            <button
              onClick={() => setActiveTab('pdf')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'pdf'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Escanear Documento PDF</span>
              {file && <span className="w-2 h-2 rounded-full bg-emerald-500 ml-1"></span>}
            </button>

            <button
              onClick={() => setActiveTab('images')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'images'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              <span>Fotos y Capturas a PDF</span>
              {imageItems.length > 0 && (
                <span className="bg-indigo-100 text-indigo-700 text-[10px] px-1.5 py-0.2 rounded-full ml-1">
                  {imageItems.length}
                </span>
              )}
            </button>
          </div>

          <span className="hidden sm:inline-text text-xs text-slate-500">
            {activeTab === 'pdf' ? 'Convierte y rota PDFs existentes' : 'Empaqueta 1 o varias fotos en un solo PDF'}
          </span>
        </div>

        {!hasContent ? (
          /* Empty / Upload State */
          <div className="max-w-3xl mx-auto mt-4">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-3xl p-12 text-center bg-white shadow-sm hover:shadow-md transition-all cursor-pointer group"
              onClick={() => document.getElementById('main-file-input')?.click()}
            >
              <input
                id="main-file-input"
                type="file"
                multiple
                accept=".pdf,image/png,image/jpeg,image/webp,image/bmp"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="w-20 h-20 mx-auto rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-5 group-hover:scale-105 group-hover:bg-indigo-100 transition-all">
                {activeTab === 'pdf' ? <Upload className="w-10 h-10" /> : <ImageIcon className="w-10 h-10" />}
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">
                {activeTab === 'pdf'
                  ? 'Arrastra tu PDF aquí'
                  : 'Arrastra tus fotos, capturas o imágenes aquí'}
              </h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
                {activeTab === 'pdf'
                  ? 'Añade inclinación, bordes reales de hoja y optimización de peso.'
                  : 'Puedes seleccionar una o múltiples imágenes (JPG, PNG, WebP) para unirlas en un solo PDF.'}
              </p>
              <button
                type="button"
                className="inline-flex items-center px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md shadow-indigo-100 transition"
              >
                <Plus className="w-4 h-4 mr-2" />
                {activeTab === 'pdf' ? 'Seleccionar archivo PDF' : 'Seleccionar Fotos o Imágenes (1 o varias)'}
              </button>
            </div>

            {/* Feature Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-10">
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">Fotos a PDF Unificado</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Toma fotos de contratos o recibos con tu celular y conviértelos en un PDF ordenado con tamaño estándar A4.
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                  <HardDrive className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">Control de Peso</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Evita archivos gigantes. Reduce fotos de 5 MB a PDFs ligeros de ~150-250 KB por página.
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                  <Square className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">Bordes Realistas</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Al inclinar se proyecta la sombra natural de la hoja y el contorno físico del papel escaneado.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Workspace with Controls & Live Preview */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Controls & Presets (5 cols) */}
            <div className="lg:col-span-5 space-y-5">
              {/* Active File / Images Strip */}
              {activeTab === 'pdf' && file && (
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
              )}

              {activeTab === 'images' && (
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <ImageIcon className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs font-bold text-slate-900">
                        Fotos seleccionadas ({imageItems.length} {imageItems.length === 1 ? 'página' : 'páginas'})
                      </span>
                    </div>

                    <label className="cursor-pointer text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition inline-flex items-center">
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Añadir más fotos
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={handleAddMoreImages}
                      />
                    </label>
                  </div>

                  {/* Thumbnail gallery of images */}
                  <div className="flex space-x-2 overflow-x-auto pb-2 pt-1 scrollbar-thin">
                    {imageItems.map((item, idx) => (
                      <div
                        key={item.id}
                        onClick={() => setCurrentPage(idx + 1)}
                        className={`shrink-0 w-24 p-1.5 rounded-xl border transition-all cursor-pointer relative group ${
                          currentPage === idx + 1
                            ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-500/20'
                            : 'border-slate-200 hover:border-slate-300 bg-slate-50'
                        }`}
                      >
                        <div className="w-full h-24 rounded-lg bg-white overflow-hidden flex items-center justify-center border border-slate-200/60 relative">
                          <img
                            src={item.previewUrl}
                            alt={item.name}
                            style={{ transform: `rotate(${item.rotation}deg)` }}
                            className="max-h-full max-w-full object-contain transition-transform"
                          />
                          <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1 rounded font-bold">
                            #{idx + 1}
                          </span>
                        </div>

                        {/* Quick action icons for this image */}
                        <div className="flex items-center justify-between mt-1 px-0.5 text-slate-500">
                          <button
                            title="Girar 90°"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRotateImage(idx);
                            }}
                            className="p-1 hover:text-indigo-600 hover:bg-slate-200 rounded"
                          >
                            <RotateCw className="w-3 h-3" />
                          </button>
                          <div className="flex space-x-0.5">
                            {idx > 0 && (
                              <button
                                title="Mover a la izquierda"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveImage(idx, 'left');
                                }}
                                className="p-0.5 hover:text-indigo-600"
                              >
                                <ArrowLeft className="w-3 h-3" />
                              </button>
                            )}
                            {idx < imageItems.length - 1 && (
                              <button
                                title="Mover a la derecha"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveImage(idx, 'right');
                                }}
                                className="p-0.5 hover:text-indigo-600"
                              >
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          <button
                            title="Eliminar"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteImage(idx);
                            }}
                            className="p-1 hover:text-rose-600 hover:bg-rose-50 rounded"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Options specific to Image-to-PDF */}
                  <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="text-slate-600 font-medium">Formato de hoja:</span>
                      <select
                        value={options.pageFormat}
                        onChange={(e) => setOptions({ ...options, pageFormat: e.target.value as PageFormat })}
                        className="bg-slate-100 border border-slate-200 rounded-lg px-2 py-1 font-semibold text-slate-800"
                      >
                        <option value="a4">A4 (Estándar de oficina)</option>
                        <option value="letter">Carta (Letter)</option>
                        <option value="fit">Ajustar al tamaño de la foto</option>
                      </select>
                    </div>

                    <label className="flex items-center space-x-1.5 cursor-pointer font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={options.applyEffectsToImages}
                        onChange={(e) => setOptions({ ...options, applyEffectsToImages: e.target.checked })}
                        className="rounded text-indigo-600"
                      />
                      <span>Aplicar efecto escáner a fotos</span>
                    </label>
                  </div>
                </div>
              )}

              {/* SECTION: PESO Y TAMAÑO DE ARCHIVO */}
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
                    60-70% mantiene el archivo entre 120-250 KB por página.
                  </p>
                </div>
              </div>

              {/* SECTION: BORDES AL INCLINAR (Only if effects enabled) */}
              {(activeTab === 'pdf' || options.applyEffectsToImages) && (
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
              )}

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
                    <span>
                      Descargar PDF {activeTab === 'images' ? 'desde Fotos' : 'Escaneado'} ({totalPages}{' '}
                      {totalPages === 1 ? 'pág' : 'págs'})
                    </span>
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
                  <span className="font-bold text-slate-900 text-sm">
                    Vista Previa {activeTab === 'images' ? `(Foto #${currentPage})` : `(Página #${currentPage})`}
                  </span>
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
                    Resultado
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
