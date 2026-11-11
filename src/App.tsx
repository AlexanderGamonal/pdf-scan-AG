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
  ArrowUpDown,
  CreditCard,
  Focus
} from 'lucide-react';
import {
  ScannerOptions,
  DEFAULT_OPTIONS,
  PRESETS,
  QUALITY_PRESETS,
  QualityPreset,
  PageFormat,
  ImageItem,
  DniOptions,
  DEFAULT_DNI_OPTIONS,
  applyScannerEffects,
  renderPdfPageToCanvas,
  renderImageItemToCanvas,
  renderDniToA4Canvas,
  processFileToScannedPdf,
  processImagesToPdf,
  processDniToPdf,
} from './lib/scannerEngine';

export default function App() {
  // Primary default tab is 'pdf'
  const [activeTab, setActiveTab] = useState<'pdf' | 'dni' | 'images'>('pdf');
  const [file, setFile] = useState<File | null>(null);
  const [imageItems, setImageItems] = useState<ImageItem[]>([]);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedPreset, setSelectedPreset] = useState<string>('office');
  const [options, setOptions] = useState<ScannerOptions>(DEFAULT_OPTIONS);
  const [dniOptions, setDniOptions] = useState<DniOptions>(DEFAULT_DNI_OPTIONS);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressMsg, setProgressMsg] = useState<string>('');
  const [previewMode, setPreviewMode] = useState<'scanned' | 'original'>('scanned');
  const [isVercelModalOpen, setIsVercelModalOpen] = useState<boolean>(false);
  const [successInfo, setSuccessInfo] = useState<{ originalSize: string; newSize: string; reduction: string } | null>(null);

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const dniCanvasRef = useRef<HTMLCanvasElement | null>(null);

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
        sharpness: q.sharpness,
      }));
    }
  };

  // Handle standard file select (PDF or Images)
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

    if (firstPdf) {
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
      if (activeTab === 'dni') {
        if (images.length >= 2) {
          setDniOptions((prev) => ({
            ...prev,
            frontImage: images[0],
            frontPreviewUrl: URL.createObjectURL(images[0]),
            backImage: images[1],
            backPreviewUrl: URL.createObjectURL(images[1]),
          }));
        } else if (!dniOptions.frontImage) {
          setDniOptions((prev) => ({
            ...prev,
            frontImage: images[0],
            frontPreviewUrl: URL.createObjectURL(images[0]),
          }));
        } else {
          setDniOptions((prev) => ({
            ...prev,
            backImage: images[0],
            backPreviewUrl: URL.createObjectURL(images[0]),
          }));
        }
      } else {
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
    }
  };

  // DNI Specific Handlers
  const handleDniFrontUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setDniOptions((prev) => ({
        ...prev,
        frontImage: f,
        frontPreviewUrl: URL.createObjectURL(f),
      }));
    }
  };

  const handleDniBackUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setDniOptions((prev) => ({
        ...prev,
        backImage: f,
        backPreviewUrl: URL.createObjectURL(f),
      }));
    }
  };

  const handleSwapDni = () => {
    setDniOptions((prev) => ({
      ...prev,
      frontImage: prev.backImage,
      frontPreviewUrl: prev.backPreviewUrl,
      frontRotation: prev.backRotation,
      backImage: prev.frontImage,
      backPreviewUrl: prev.frontPreviewUrl,
      backRotation: prev.frontRotation,
    }));
  };

  // Add more images in images tab
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

  // Render DNI preview whenever DNI options change
  useEffect(() => {
    let isCancelled = false;

    async function updateDniPreview() {
      if (activeTab !== 'dni') return;
      try {
        const canvas = await renderDniToA4Canvas(dniOptions, 0.7);
        if (isCancelled) return;
        const display = dniCanvasRef.current;
        if (display) {
          display.width = canvas.width;
          display.height = canvas.height;
          const ctx = display.getContext('2d');
          if (ctx) ctx.drawImage(canvas, 0, 0);
        }
      } catch (err) {
        console.error('Error rendering DNI preview:', err);
      }
    }

    updateDniPreview();

    return () => {
      isCancelled = true;
    };
  }, [dniOptions, activeTab]);

  // Render preview canvas for PDF & Images with sharpness
  useEffect(() => {
    let isCancelled = false;

    async function updatePreview() {
      if (activeTab === 'dni') return;

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
            srcCanvas = await renderImageItemToCanvas(item, 1400);
            if (isCancelled) return;
          } catch (err) {
            console.error('Error rendering preview image:', err);
            return;
          }
        }
      }

      if (!srcCanvas) return;

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

      if (activeTab === 'dni') {
        result = await processDniToPdf(dniOptions, (msg) => setProgressMsg(msg));
        downloadName = 'DNI_Ambas_Caras_A4.pdf';
      } else if (activeTab === 'pdf' && file) {
        result = await processFileToScannedPdf(file, options, (current, total, msg) => {
          setProgressMsg(msg);
        });
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        downloadName = `${baseName}_scanned.pdf`;
      } else if (activeTab === 'images' && imageItems.length > 0) {
        result = await processImagesToPdf(imageItems, options, (current, total, msg) => {
          setProgressMsg(msg);
        });
        downloadName = `Fotos_Convertidas_${imageItems.length}_pags.pdf`;
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

  const hasStandardContent = (activeTab === 'pdf' && file) || (activeTab === 'images' && imageItems.length > 0);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-black text-sm tracking-tighter shadow-md shadow-indigo-100">
              AG
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-slate-900 text-lg tracking-tight">AG Scan PDF</span>
                <span className="bg-emerald-50 text-emerald-700 text-xs px-2 py-0.5 rounded-full font-semibold border border-emerald-100">
                  Alta Nitidez
                </span>
              </div>
              <p className="text-xs text-slate-500">Escáner PDF con nitidez cristalina, bordes reales y copia DNI</p>
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
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-2 border-b border-slate-200/80">
          <div className="flex items-center space-x-2 bg-slate-200/70 p-1.5 rounded-2xl">
            {/* TAB PDF (PRIMARY) */}
            <button
              onClick={() => setActiveTab('pdf')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'pdf'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>Escanear Documento PDF</span>
              {file && <span className="w-2 h-2 rounded-full bg-emerald-500 ml-1"></span>}
            </button>

            {/* TAB DNI */}
            <button
              onClick={() => setActiveTab('dni')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'dni'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CreditCard className="w-4 h-4 text-indigo-600" />
              <span>Copia DNI (Ambas Caras en 1 Hoja)</span>
              {(dniOptions.frontImage || dniOptions.backImage) && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 ml-1"></span>
              )}
            </button>

            {/* TAB FOTOS */}
            <button
              onClick={() => setActiveTab('images')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'images'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              <span>Fotos a PDF</span>
              {imageItems.length > 0 && (
                <span className="bg-indigo-100 text-indigo-700 text-[10px] px-1.5 py-0.2 rounded-full ml-1">
                  {imageItems.length}
                </span>
              )}
            </button>
          </div>

          <span className="text-xs text-slate-500 hidden md:inline">
            {activeTab === 'pdf'
              ? 'Digitaliza PDFs con inclinación, bordes reales y alta nitidez'
              : activeTab === 'dni'
              ? 'Une anverso y reverso de DNI en una hoja A4'
              : 'Empaqueta varias imágenes en un PDF ordenado'}
          </span>
        </div>

        {/* -------------------- TAB 1: PDF SCANNER & IMAGES -------------------- */}
        {activeTab !== 'dni' && (
          !hasStandardContent ? (
            /* Upload State */
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
                  multiple={activeTab === 'images'}
                  accept={activeTab === 'pdf' ? '.pdf' : 'image/*'}
                  className="hidden"
                  onChange={handleFileChange}
                />
                <div className="w-20 h-20 mx-auto rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-5 group-hover:scale-105 group-hover:bg-indigo-100 transition-all">
                  {activeTab === 'pdf' ? <Upload className="w-10 h-10" /> : <ImageIcon className="w-10 h-10" />}
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">
                  {activeTab === 'pdf'
                    ? 'Arrastra tu archivo PDF aquí'
                    : 'Arrastra tus fotos, capturas o imágenes aquí'}
                </h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
                  {activeTab === 'pdf'
                    ? 'Efecto escáner auténtico: inclinación, bordes reales de papel y letras nítidas.'
                    : 'Selecciona una o múltiples imágenes para convertirlas en un solo PDF.'}
                </p>
                <button
                  type="button"
                  className="inline-flex items-center px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md shadow-indigo-100 transition"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {activeTab === 'pdf' ? 'Seleccionar archivo PDF' : 'Seleccionar Fotos o Imágenes'}
                </button>
              </div>

              {/* Feature Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-10">
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                    <Focus className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm mb-1">Máxima Nitidez</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Filtro unsharp mask y renderizado a alta resolución para que el texto, sellos y firmas no queden borrosos.
                  </p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                    <Square className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm mb-1">Bordes Reales al Inclinar</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Contorno físico de papel y sombra natural para que se distinga la hoja al girarse.
                  </p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                    <HardDrive className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm mb-1">Control de Peso</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Compresión inteligente DCT para que los documentos no se inflen a varios megabytes.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Active PDF / Images Workspace */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column (5 cols): All Scanner Controls */}
              <div className="lg:col-span-5 space-y-5">
                {/* File info card */}
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
                          Fotos ({imageItems.length} {imageItems.length === 1 ? 'pág' : 'págs'})
                        </span>
                      </div>

                      <label className="cursor-pointer text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition inline-flex items-center">
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        Añadir fotos
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          className="hidden"
                          onChange={handleAddMoreImages}
                        />
                      </label>
                    </div>

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

                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="text-slate-600 font-medium">Formato:</span>
                        <select
                          value={options.pageFormat}
                          onChange={(e) => setOptions({ ...options, pageFormat: e.target.value as PageFormat })}
                          className="bg-slate-100 border border-slate-200 rounded-lg px-2 py-1 font-semibold text-slate-800"
                        >
                          <option value="a4">A4 (Estándar)</option>
                          <option value="letter">Carta (Letter)</option>
                          <option value="fit">Ajustar a foto</option>
                        </select>
                      </div>

                      <label className="flex items-center space-x-1.5 cursor-pointer font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={options.applyEffectsToImages}
                          onChange={(e) => setOptions({ ...options, applyEffectsToImages: e.target.checked })}
                          className="rounded text-indigo-600"
                        />
                        <span>Efecto escáner en fotos</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* CONTROL 1: PRESETS RÁPIDOS */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center mb-3">
                    <Sparkles className="w-4 h-4 mr-2 text-indigo-600" />
                    Modos Rápidos (Presets)
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

                {/* CONTROL 2: NITIDEZ Y CONTROL DE PESO */}
                <div className="bg-white rounded-2xl p-5 border border-indigo-200/80 shadow-xs space-y-4 bg-gradient-to-b from-indigo-50/30 to-white">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center">
                      <Focus className="w-4 h-4 mr-2 text-indigo-600" />
                      Nitidez y Control de Peso
                    </h3>
                    <span className="text-[11px] font-bold text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded-md">
                      {QUALITY_PRESETS[options.qualityPreset].sizeEstimate}
                    </span>
                  </div>

                  {/* Preset buttons */}
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
                            {qKey === 'light' ? '⚡ Ligero' : qKey === 'balanced' ? '⚖️ Equilibrado' : '🖨️ Ultra HD'}
                          </div>
                          <div className={`text-[10px] mt-0.5 ${isActive ? 'text-indigo-100' : 'text-slate-500'}`}>
                            {q.sizeEstimate}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Slider de Nitidez (Sharpness) */}
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-slate-700 flex items-center">
                        <Focus className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                        Filtro de Nitidez (Letras y Firmas)
                      </span>
                      <span className="font-semibold text-indigo-600">{options.sharpness.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min="1.0"
                      max="2.2"
                      step="0.05"
                      value={options.sharpness}
                      onChange={(e) =>
                        setOptions({
                          ...options,
                          sharpness: parseFloat(e.target.value),
                        })
                      }
                      className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>1.0x (Normal)</span>
                      <span>1.35x (Recomendado)</span>
                      <span>2.2x (Máximo realce)</span>
                    </div>
                  </div>

                  {/* Slider de Calidad JPEG */}
                  <div className="space-y-1 pt-2 border-t border-slate-100">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-slate-700">Calidad de Compresión JPEG</span>
                      <span className="font-semibold text-indigo-600">{options.quality}%</span>
                    </div>
                    <input
                      type="range"
                      min="40"
                      max="92"
                      step="2"
                      value={options.quality}
                      onChange={(e) =>
                        setOptions({
                          ...options,
                          quality: parseInt(e.target.value),
                        })
                      }
                      className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                    />
                  </div>
                </div>

                {/* CONTROL 3: BORDES AL INCLINAR */}
                {(activeTab === 'pdf' || options.applyEffectsToImages) && (
                  <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center justify-between">
                      <span className="flex items-center">
                        <Square className="w-4 h-4 mr-2 text-slate-700" />
                        Bordes y Contorno de Inclinación
                      </span>
                    </h3>

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

                    {options.borderStyle !== 'none' && (
                      <div className="space-y-1 pt-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium text-slate-700">Intensidad de Bordes</span>
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

                {/* CONTROL 4: EFECTOS ÓPTICOS DETALLADOS */}
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

                  {/* Tapa abierta / Blur variation */}
                  <div className="pt-2 border-t border-slate-100">
                    <label className="flex items-center justify-between text-xs font-medium text-slate-700 cursor-pointer">
                      <span className="flex items-center">
                        <input
                          type="checkbox"
                          checked={options.blurVariation}
                          onChange={(e) => setOptions({ ...options, blurVariation: e.target.checked })}
                          className="rounded text-indigo-600 mr-2"
                        />
                        Tapa abierta / Enfoque desigual
                      </span>
                      <span className="text-[11px] text-slate-400">Gradiente óptico</span>
                    </label>
                  </div>

                  {/* Contrast */}
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

                  {/* Grano de Papel */}
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
                </div>

                {/* BOTÓN DE DESCARGA */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
                  {isProcessing ? (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-slate-700 text-center">{progressMsg || 'Procesando en alta nitidez...'}</p>
                      <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                        <div className="bg-indigo-600 h-full w-2/3 animate-pulse rounded-full" />
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

              {/* Right Column (7 cols): Live Interactive Preview */}
              <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200 shadow-2xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center space-x-2">
                    <Eye className="w-4 h-4 text-indigo-600" />
                    <span className="font-bold text-slate-900 text-sm">
                      Vista Previa {activeTab === 'images' ? `(Foto #${currentPage})` : `(Página #${currentPage})`}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                    <button
                      onClick={() => setPreviewMode('scanned')}
                      className={`px-3 py-1 rounded-lg transition ${
                        previewMode === 'scanned'
                          ? 'bg-white text-indigo-700 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Escaneado
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

                <div className="bg-slate-200/60 rounded-2xl p-6 flex items-center justify-center min-h-[480px] overflow-hidden border border-slate-300/40">
                  <canvas
                    ref={previewCanvasRef}
                    className="max-h-[580px] w-auto max-w-full shadow-xl rounded-xs bg-white"
                  />
                </div>

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
          )
        )}

        {/* -------------------- TAB 2: DNI WORKSPACE -------------------- */}
        {activeTab === 'dni' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-5 space-y-5">
              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center">
                    <CreditCard className="w-4 h-4 mr-2 text-indigo-600" />
                    Fotos del DNI (Ambos Lados)
                  </h3>
                  {(dniOptions.frontImage || dniOptions.backImage) && (
                    <button
                      onClick={handleSwapDni}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center bg-indigo-50 px-2 py-1 rounded-lg transition"
                    >
                      <ArrowUpDown className="w-3.5 h-3.5 mr-1" />
                      Invertir Caras
                    </button>
                  )}
                </div>

                {/* Box 1: Anverso (Front) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span>1. Anverso (Parte Delantera / Foto)</span>
                    {dniOptions.frontImage && (
                      <span className="text-emerald-600 text-[11px] font-bold">✓ Cargado</span>
                    )}
                  </div>

                  {!dniOptions.frontPreviewUrl ? (
                    <label className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-2xl p-4 flex flex-col items-center justify-center bg-slate-50 hover:bg-indigo-50/40 cursor-pointer transition group">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleDniFrontUpload}
                      />
                      <Upload className="w-6 h-6 text-slate-400 group-hover:text-indigo-600 mb-1" />
                      <span className="text-xs font-semibold text-slate-700">
                        Subir foto del Anverso
                      </span>
                      <span className="text-[11px] text-slate-400 mt-0.5">JPG, PNG, foto de celular</span>
                    </label>
                  ) : (
                    <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-2xl border border-slate-200">
                      <div className="flex items-center space-x-3 overflow-hidden">
                        <div className="w-16 h-12 bg-white rounded-lg border border-slate-300 overflow-hidden flex items-center justify-center shrink-0">
                          <img
                            src={dniOptions.frontPreviewUrl}
                            alt="Anverso"
                            style={{ transform: `rotate(${dniOptions.frontRotation}deg)` }}
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-bold text-slate-800 truncate">
                            {dniOptions.frontImage?.name || 'Anverso_DNI.jpg'}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Rotación: {dniOptions.frontRotation}°
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1 shrink-0">
                        <button
                          title="Girar 90°"
                          onClick={() =>
                            setDniOptions((prev) => ({
                              ...prev,
                              frontRotation: (prev.frontRotation + 90) % 360,
                            }))
                          }
                          className="p-1.5 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                        >
                          <RotateCw className="w-4 h-4" />
                        </button>
                        <button
                          title="Quitar"
                          onClick={() =>
                            setDniOptions((prev) => ({
                              ...prev,
                              frontImage: null,
                              frontPreviewUrl: null,
                              frontRotation: 0,
                            }))
                          }
                          className="p-1.5 hover:bg-rose-100 text-rose-600 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Box 2: Reverso (Back) */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span>2. Reverso (Parte Posterior / Huella)</span>
                    {dniOptions.backImage && (
                      <span className="text-emerald-600 text-[11px] font-bold">✓ Cargado</span>
                    )}
                  </div>

                  {!dniOptions.backPreviewUrl ? (
                    <label className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-2xl p-4 flex flex-col items-center justify-center bg-slate-50 hover:bg-indigo-50/40 cursor-pointer transition group">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleDniBackUpload}
                      />
                      <Upload className="w-6 h-6 text-slate-400 group-hover:text-indigo-600 mb-1" />
                      <span className="text-xs font-semibold text-slate-700">
                        Subir foto del Reverso
                      </span>
                      <span className="text-[11px] text-slate-400 mt-0.5">JPG, PNG, foto de celular</span>
                    </label>
                  ) : (
                    <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-2xl border border-slate-200">
                      <div className="flex items-center space-x-3 overflow-hidden">
                        <div className="w-16 h-12 bg-white rounded-lg border border-slate-300 overflow-hidden flex items-center justify-center shrink-0">
                          <img
                            src={dniOptions.backPreviewUrl}
                            alt="Reverso"
                            style={{ transform: `rotate(${dniOptions.backRotation}deg)` }}
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-bold text-slate-800 truncate">
                            {dniOptions.backImage?.name || 'Reverso_DNI.jpg'}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Rotación: {dniOptions.backRotation}°
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1 shrink-0">
                        <button
                          title="Girar 90°"
                          onClick={() =>
                            setDniOptions((prev) => ({
                              ...prev,
                              backRotation: (prev.backRotation + 90) % 360,
                            }))
                          }
                          className="p-1.5 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                        >
                          <RotateCw className="w-4 h-4" />
                        </button>
                        <button
                          title="Quitar"
                          onClick={() =>
                            setDniOptions((prev) => ({
                              ...prev,
                              backImage: null,
                              backPreviewUrl: null,
                              backRotation: 0,
                            }))
                          }
                          className="p-1.5 hover:bg-rose-100 text-rose-600 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* DNI Format Options */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center">
                  <Sliders className="w-4 h-4 mr-2 text-slate-700" />
                  Ajustes de la Hoja A4
                </h3>

                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-slate-700">Modo de Color</span>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <button
                      onClick={() => setDniOptions({ ...dniOptions, colorMode: 'color' })}
                      className={`p-2 rounded-xl border text-center transition ${
                        dniOptions.colorMode === 'color'
                          ? 'border-indigo-600 bg-indigo-50 font-bold text-indigo-900 ring-1 ring-indigo-500'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      🎨 Color Original
                    </button>
                    <button
                      onClick={() => setDniOptions({ ...dniOptions, colorMode: 'bw' })}
                      className={`p-2 rounded-xl border text-center transition ${
                        dniOptions.colorMode === 'bw'
                          ? 'border-indigo-600 bg-indigo-50 font-bold text-indigo-900 ring-1 ring-indigo-500'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      📄 Fotocopia B&N
                    </button>
                    <button
                      onClick={() => setDniOptions({ ...dniOptions, colorMode: 'grayscale' })}
                      className={`p-2 rounded-xl border text-center transition ${
                        dniOptions.colorMode === 'grayscale'
                          ? 'border-indigo-600 bg-indigo-50 font-bold text-indigo-900 ring-1 ring-indigo-500'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      🔘 Escala Grises
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-700">Tamaño del DNI en la hoja</span>
                    <span className="font-semibold text-indigo-600">{Math.round(dniOptions.cardScale * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.65"
                    max="0.88"
                    step="0.01"
                    value={dniOptions.cardScale}
                    onChange={(e) =>
                      setDniOptions({
                        ...dniOptions,
                        cardScale: parseFloat(e.target.value),
                      })
                    }
                    className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                  />
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-700">Separación entre caras</span>
                    <span className="font-semibold text-slate-600">{dniOptions.verticalGap}px</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="75"
                    step="5"
                    value={dniOptions.verticalGap}
                    onChange={(e) =>
                      setDniOptions({
                        ...dniOptions,
                        verticalGap: parseInt(e.target.value),
                      })
                    }
                    className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                  />
                </div>
              </div>

              {/* DNI Process Button */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500 pb-1">
                  <span>Peso estimado:</span>
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    ~120 - 220 KB (1 Hoja A4 Nítida)
                  </span>
                </div>

                {isProcessing ? (
                  <div className="space-y-2 py-2">
                    <p className="text-xs font-semibold text-slate-700 text-center">
                      {progressMsg || 'Generando copia de DNI en A4...'}
                    </p>
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                      <div className="bg-indigo-600 h-full w-2/3 animate-pulse rounded-full" />
                    </div>
                  </div>
                ) : (
                  <button
                    disabled={!dniOptions.frontPreviewUrl && !dniOptions.backPreviewUrl}
                    onClick={handleProcessAndDownload}
                    className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-md shadow-indigo-100 flex items-center justify-center space-x-2 transition cursor-pointer"
                  >
                    <Download className="w-5 h-5" />
                    <span>Descargar PDF DNI (1 Hoja A4)</span>
                  </button>
                )}

                {successInfo && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-3 text-xs text-emerald-800">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-semibold">¡PDF de DNI generado con éxito!</p>
                      <p className="text-emerald-700 mt-0.5">
                        Fotos originales: {successInfo.originalSize} &rarr; PDF final: <strong>{successInfo.newSize}</strong> ({successInfo.reduction})
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Live DNI A4 Preview */}
            <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <Eye className="w-4 h-4 text-indigo-600" />
                  <span className="font-bold text-slate-900 text-sm">
                    Vista Previa de la Hoja A4 (Ambas Caras)
                  </span>
                </div>
                <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg font-semibold">
                  A4 Vertical (595 × 842 pt)
                </span>
              </div>

              <div className="bg-slate-200/70 rounded-2xl p-6 flex items-center justify-center min-h-[520px] overflow-hidden border border-slate-300/40">
                <canvas
                  ref={dniCanvasRef}
                  className="max-h-[620px] w-auto max-w-full shadow-2xl rounded-xs bg-white border border-slate-300"
                />
              </div>

              <p className="text-xs text-slate-500 text-center">
                El documento se genera en formato oficial A4 con ambas caras centradas vertical y horizontalmente.
              </p>
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
                  Abre PowerShell en esta carpeta y ejecuta:
                </p>
                <code className="block bg-slate-900 text-slate-100 p-2.5 rounded-xl font-mono text-xs">
                  vercel
                </code>
                <p className="text-[11px] text-slate-500">
                  Presiona Enter a cada pregunta y tendrás tu URL pública en 30 segundos.
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
                  Tu proyecto ya está sincronizado en tu cuenta de GitHub:
                </p>
                <p className="font-mono text-indigo-700 bg-indigo-50 p-2 rounded-lg text-[11px]">
                  https://github.com/AlexanderGamonal/pdf-scan-AG
                </p>
                <p className="text-slate-600">
                  Solo entra a <a href="https://vercel.com/new" target="_blank" rel="noreferrer" className="text-indigo-600 underline font-semibold">vercel.com/new</a> y haz clic en <strong>Deploy</strong>.
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
