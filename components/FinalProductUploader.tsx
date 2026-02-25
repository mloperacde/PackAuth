

import React, { useRef, useState, useEffect } from 'react';
import { BoxLabelSimulationData, LabelElement, LabelElementType, ProjectMetadata } from '../types';
import { Upload, X, PackageCheck, Package, Move, Info, PenTool, Check, RotateCw, RotateCcw, GripVertical, Image as ImageIcon, Eye, Layout } from 'lucide-react';
import ZebraLabelEditor, { RealBarcode } from './ZebraLabelEditor';

interface FinalProductUploaderProps {
  images: string[];
  setImages: React.Dispatch<React.SetStateAction<string[]>>;
  boxSimulation: BoxLabelSimulationData;
  setBoxSimulation: React.Dispatch<React.SetStateAction<BoxLabelSimulationData>>;
  metadata: ProjectMetadata;
  batchCode: string;
}

const FinalProductUploader: React.FC<FinalProductUploaderProps> = ({ 
  images, 
  setImages,
  boxSimulation,
  setBoxSimulation,
  metadata,
  batchCode
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const boxContainerRef = useRef<HTMLDivElement>(null);
  const boxInputRef = useRef<HTMLInputElement>(null);

  // Drag Offset state to prevent jumping on click
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Drag and Drop State
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  
  const PIXELS_PER_MM = 4;

  // Validation Check
  const checkImageResolution = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            if (img.width >= 1024 && img.height >= 768) {
                resolve(url);
            } else {
                URL.revokeObjectURL(url);
                reject(new Error(`Resolución insuficiente: ${file.name} (${img.width}x${img.height}). Mínimo 1024x768.`));
            }
        };
        img.onerror = () => {
             URL.revokeObjectURL(url);
             reject(new Error(`Error al leer: ${file.name}`));
        };
        img.src = url;
    });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    const files: File[] = fileList ? Array.from(fileList) : [];
    
    if (files.length === 0) return;

    // Async validation
    interface ValidationResult {
        status: 'fulfilled' | 'rejected';
        url?: string;
        reason?: string;
    }

    const promises = files.map((file): Promise<ValidationResult> => 
        checkImageResolution(file)
            .then(url => ({ status: 'fulfilled' as const, url }))
            .catch(err => ({ status: 'rejected' as const, reason: err.message }))
    );
    
    const results = await Promise.all(promises);
    const validUrls: string[] = [];
    const errors: string[] = [];

    results.forEach((res) => {
        if (res.status === 'fulfilled' && res.url) validUrls.push(res.url);
        else if (res.reason) errors.push(res.reason);
    });

    if (errors.length > 0) {
        alert("Algunas imágenes no se cargaron por errores de validación:\n" + errors.join("\n"));
    }

    if (validUrls.length > 0) {
        setImages(prev => [...prev, ...validUrls]);
    }

    if (e.target) e.target.value = '';
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleBoxUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setBoxSimulation({ ...boxSimulation, boxImageUrl: URL.createObjectURL(file) });
  };

  const handleBoxImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    if (naturalWidth && naturalHeight) {
        const newRatio = naturalWidth / naturalHeight;
        if (!boxSimulation.aspectRatio || Math.abs(boxSimulation.aspectRatio - newRatio) > 0.01) {
            setBoxSimulation(prev => ({ ...prev, aspectRatio: newRatio }));
        }
    }
  };

  const handleDragStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (boxContainerRef.current) {
        const rect = boxContainerRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Current Label position in pixels relative to container
        const currentLabelX = (boxSimulation.positionX / 100) * rect.width;
        const currentLabelY = (boxSimulation.positionY / 100) * rect.height;

        setDragOffset({
            x: mouseX - currentLabelX,
            y: mouseY - currentLabelY
        });
        setIsDragging(true);
    }
  };

  const handleDragEnd = () => setIsDragging(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !boxContainerRef.current) return;
    const rect = boxContainerRef.current.getBoundingClientRect();
    
    // Mouse position relative to container
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Apply offset to maintain relative click position
    const newX = mouseX - dragOffset.x;
    const newY = mouseY - dragOffset.y;

    // Convert to percentage
    // Extended range (-50 to 150) to allow dragging partially off-box
    const percentX = (newX / rect.width) * 100;
    const percentY = (newY / rect.height) * 100;

    setBoxSimulation({
      ...boxSimulation,
      positionX: Math.max(-50, Math.min(150, percentX)),
      positionY: Math.max(-50, Math.min(150, percentY))
    });
  };

  useEffect(() => {
    if (isDragging) {
        window.addEventListener('mouseup', handleDragEnd);
    } else {
        window.removeEventListener('mouseup', handleDragEnd);
    }
    return () => window.removeEventListener('mouseup', handleDragEnd);
  }, [isDragging]);

  // Drag and Drop Handlers for Images
  const onDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.dataTransfer.effectAllowed = "move";
    setDraggedIndex(index);
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;
    const newImages = [...images];
    const item = newImages[draggedIndex];
    newImages.splice(draggedIndex, 1);
    newImages.splice(dropIndex, 0, item);
    setImages(newImages);
    setDraggedIndex(null);
  };

  const resolveValue = (element: LabelElement) => {
      if (element.type === 'field') {
          let val = '';
          switch(element.text) {
              case 'Cliente': val = metadata.clientName; break;
              case 'Producto': val = metadata.productName; break;
              case 'Pedido': val = metadata.orderNumber; break;
              default: val = element.text;
          }
          return val && val.trim() !== '' ? val : `[${element.text}]`;
      }
      return element.text;
  };

  const rotateLeft = () => setBoxSimulation(prev => ({ ...prev, rotation: prev.rotation - 90 }));
  const rotateRight = () => setBoxSimulation(prev => ({ ...prev, rotation: prev.rotation + 90 }));

  const getTransformStyle = (el: LabelElement) => {
    let translateStyle = '';
    if (el.textAlign === 'center') translateStyle = 'translateX(-50%)';
    else if (el.textAlign === 'right') translateStyle = 'translateX(-100%)';
    return `rotate(${el.rotation || 0}deg) ${translateStyle}`;
  };

  return (
    <div className="space-y-8">
      {/* Hidden input for Box Image - always accessible */}
      <input type="file" ref={boxInputRef} className="hidden" accept="image/*" onChange={handleBoxUpload} />

      <div className="space-y-4">
        <div className="border-b pb-4">
            <h2 className="text-xl font-bold text-slate-800">3. Producto Terminado y Evidencias</h2>
            <p className="text-sm text-slate-500">
            Sube imágenes del producto final ensamblado.
            </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-3 text-sm text-blue-800">
            <Info className="shrink-0 w-5 h-5 mt-0.5" />
            <div>
                <p className="font-semibold">Requisitos:</p>
                <ul className="list-disc list-inside mt-1 space-y-1 text-blue-700">
                    <li>La imagen debe tener una resolución mínima de <strong>1024x768 píxeles</strong>.</li>
                    <li>Muestre el producto completo, limpio y bien iluminado.</li>
                    <li>Puede reordenar las imágenes arrastrándolas.</li>
                </ul>
            </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {images.map((url, idx) => (
            <div 
                key={idx} 
                className={`relative group aspect-square bg-white border rounded-lg overflow-hidden shadow-sm transition-all ${draggedIndex === idx ? 'opacity-50 border-brand-500 scale-95' : 'hover:shadow-md'}`}
                draggable
                onDragStart={(e) => onDragStart(e, idx)}
                onDragOver={(e) => onDragOver(e, idx)}
                onDrop={(e) => onDrop(e, idx)}
            >
                <img src={url} alt={`Final ${idx}`} className="w-full h-full object-cover pointer-events-none" />
                
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center pointer-events-none">
                    <GripVertical className="text-white opacity-0 group-hover:opacity-100 drop-shadow-md" />
                </div>

                <button
                onClick={() => removeImage(idx)}
                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-red-600"
                >
                <X size={14} />
                </button>
            </div>
            ))}

            <label className="cursor-pointer border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center aspect-square hover:bg-slate-50 hover:border-brand-400 transition-colors text-slate-400 hover:text-brand-500">
                <PackageCheck size={32} className="mb-2" />
                <span className="text-sm font-medium">Agregar Foto</span>
                <span className="text-xs mt-1 text-slate-400 text-center px-2">Min: 1024x768</span>
                <input type="file" multiple className="hidden" accept="image/*" onChange={handleUpload} />
            </label>
        </div>

        {/* Box Image Upload Section */}
        <div className="mt-6 border-t pt-6">
            <h3 className="font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <Package size={18} />
                Foto de Caja para Simulación
            </h3>
            <p className="text-sm text-slate-500 mb-4">
                Sube la imagen de la caja (frontal o lateral) donde se ubicará la etiqueta simulada en la siguiente sección.
            </p>
            
            <div className="flex items-start gap-4 flex-wrap sm:flex-nowrap">
                <div className="relative w-48 aspect-video bg-slate-100 border-2 border-slate-200 border-dashed rounded-lg overflow-hidden flex items-center justify-center group hover:border-brand-300 transition-colors">
                    {boxSimulation.boxImageUrl ? (
                        <>
                            <img 
                                src={boxSimulation.boxImageUrl} 
                                alt="Box Preview" 
                                onLoad={handleBoxImageLoad}
                                className="w-full h-full object-contain"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button 
                                    onClick={() => boxInputRef.current?.click()}
                                    className="text-white flex flex-col items-center p-2 rounded hover:bg-white/20"
                                >
                                    <Upload size={24} />
                                    <span className="text-xs font-medium mt-1">Cambiar</span>
                                </button>
                            </div>
                        </>
                    ) : (
                        <button 
                            onClick={() => boxInputRef.current?.click()}
                            className="flex flex-col items-center text-slate-400 hover:text-brand-600 transition-colors w-full h-full justify-center"
                        >
                            <ImageIcon size={32} className="mb-2 opacity-50" />
                            <span className="text-sm font-medium">Subir Imagen Caja</span>
                        </button>
                    )}
                </div>
                
                {boxSimulation.boxImageUrl && (
                    <div className="flex-1 text-sm text-slate-600 space-y-2">
                        <div className="flex items-center gap-2 text-green-600 font-medium">
                            <Check size={16} /> Imagen cargada correctamente
                        </div>
                        <p><strong>Dimensiones (Ratio):</strong> {boxSimulation.aspectRatio ? `${boxSimulation.aspectRatio.toFixed(2)}` : 'Calculando...'}</p>
                        <p className="text-xs text-slate-500">Esta imagen base se utilizará en el simulador inferior para superponer la etiqueta Zebra.</p>
                        <button 
                            onClick={() => setBoxSimulation({...boxSimulation, boxImageUrl: null})} 
                            className="text-red-500 hover:text-red-700 hover:underline text-xs flex items-center gap-1 mt-2"
                        >
                            <X size={12}/> Eliminar imagen actual
                        </button>
                    </div>
                )}
            </div>
        </div>
      </div>

      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
         <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg text-slate-700 flex items-center gap-2">
                <PenTool size={20} />
                4. Simulador de Etiqueta Industrial
            </h3>
            
            {/* Mode Toggle */}
            <div className="bg-white p-1 rounded-lg border border-slate-200 flex items-center shadow-sm">
                <button
                    onClick={() => setIsEditingLabel(true)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        isEditingLabel ? 'bg-brand-100 text-brand-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                    }`}
                >
                    <PenTool size={16} />
                    Editar
                </button>
                <div className="w-px h-4 bg-slate-200 mx-1"></div>
                <button
                    onClick={() => setIsEditingLabel(false)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        !isEditingLabel ? 'bg-brand-100 text-brand-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                    }`}
                >
                    <Eye size={16} />
                    Visualizar
                </button>
            </div>
         </div>
         
         {isEditingLabel ? (
             <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                 <ZebraLabelEditor 
                    labelConfig={boxSimulation.labelConfig}
                    setLabelConfig={(newConfig) => setBoxSimulation(prev => ({ ...prev, labelConfig: typeof newConfig === 'function' ? newConfig(prev.labelConfig) : newConfig }))}
                    metadata={metadata}
                    batchCode={batchCode}
                 />
             </div>
         ) : (
            <div className="flex flex-col gap-6 animate-in fade-in duration-300">
                {/* Visualizer Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    
                    {/* A. Flat Label Preview */}
                    <div className="flex flex-col items-center">
                         <div className="w-full flex justify-between items-center mb-2 px-1">
                             <span className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1"><Layout size={14}/> A. Diseño Plano</span>
                             <span className="text-xs font-mono text-slate-400">{boxSimulation.labelConfig.widthMm}mm x {boxSimulation.labelConfig.heightMm}mm</span>
                         </div>
                         <div className="bg-white p-4 border rounded-lg shadow-sm w-full flex items-center justify-center min-h-[200px] bg-[url('https://www.transparenttextures.com/patterns/grid-me.png')]">
                             <div 
                                className="bg-white border border-slate-900 shadow-lg relative overflow-hidden"
                                style={{
                                    width: `${boxSimulation.labelConfig.widthMm * PIXELS_PER_MM}px`,
                                    height: `${boxSimulation.labelConfig.heightMm * PIXELS_PER_MM}px`,
                                    transform: 'scale(0.8)', // Slight scale down to fit nicely
                                    transformOrigin: 'center center'
                                }}
                            >
                                {boxSimulation.labelConfig.elements.map(el => (
                                    <div
                                        key={el.id}
                                        className="absolute whitespace-nowrap"
                                        style={{
                                            left: `${el.x * PIXELS_PER_MM}px`,
                                            top: `${el.y * PIXELS_PER_MM}px`,
                                            transform: getTransformStyle(el),
                                            transformOrigin: 'center center',
                                            textAlign: el.textAlign || 'left'
                                        }}
                                    >
                                        {el.type === 'barcode' ? (
                                            <div style={{ width: `${(el.width || 40) * PIXELS_PER_MM}px`, height: `${(el.height || 15) * PIXELS_PER_MM}px` }}>
                                                <RealBarcode 
                                                    value={el.text} 
                                                    width={(el.width || 40)} 
                                                    height={(el.height || 15)} 
                                                    showText={el.showText !== false}
                                                    format={el.barcodeFormat}
                                                    fontSize={el.fontSize}
                                                />
                                            </div>
                                        ) : el.type === 'box' ? (
                                            <div 
                                                style={{
                                                    width: `${(el.width || 50) * PIXELS_PER_MM}px`,
                                                    height: `${(el.height || 20) * PIXELS_PER_MM}px`,
                                                    border: `${el.borderThickness || 1}px solid black`
                                                }}
                                            ></div>
                                        ) : (
                                            <div style={{
                                                    fontSize: `${el.fontSize}px`, 
                                                    fontWeight: el.isBold ? 'bold' : 'normal',
                                                    fontFamily: 'monospace'
                                                }}
                                            >
                                                {resolveValue(el)}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                         </div>
                    </div>

                    {/* B. Box Simulation */}
                    <div className="flex flex-col items-center">
                        <div className="w-full flex justify-between items-center mb-2 px-1">
                             <span className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1"><Package size={14}/> B. Simulación en Caja</span>
                        </div>
                        <div 
                            ref={boxContainerRef}
                            onMouseMove={handleMouseMove}
                            className="w-full relative border border-slate-200 bg-slate-50 overflow-hidden rounded-lg shadow-sm group/canvas"
                            style={{
                                aspectRatio: boxSimulation.aspectRatio ? `${boxSimulation.aspectRatio}` : '4/3',
                            }}
                        >
                            <div className="absolute top-2 right-2 z-20 flex flex-col gap-2 opacity-0 group-hover/canvas:opacity-100 transition-opacity">
                                <button onClick={() => setBoxSimulation({...boxSimulation, scale: Math.min(150, boxSimulation.scale + 5)})} className="bg-white p-1 rounded shadow text-slate-600 hover:text-brand-600" title="Aumentar Escala">+</button>
                                <button onClick={() => setBoxSimulation({...boxSimulation, scale: Math.max(10, boxSimulation.scale - 5)})} className="bg-white p-1 rounded shadow text-slate-600 hover:text-brand-600" title="Disminuir Escala">-</button>
                            </div>
                            
                            {boxSimulation.boxImageUrl ? (
                                <img 
                                    src={boxSimulation.boxImageUrl} 
                                    className="w-full h-full object-cover pointer-events-none select-none" 
                                    alt="Box"
                                />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                                    <Package size={48} className="mb-2 opacity-50"/>
                                    <span className="text-sm">Sin imagen de caja</span>
                                </div>
                            )}
                            
                            {/* Render Label Overlay */}
                             <div
                                className="absolute bg-white overflow-hidden shadow-sm border border-slate-200 cursor-grab active:cursor-grabbing"
                                onMouseDown={handleDragStart}
                                style={{
                                    left: `${boxSimulation.positionX}%`,
                                    top: `${boxSimulation.positionY}%`,
                                    width: `${boxSimulation.labelConfig.widthMm * 4}px`, 
                                    height: `${boxSimulation.labelConfig.heightMm * 4}px`, 
                                    transform: `translate(-50%, -50%) rotate(${boxSimulation.rotation}deg) scale(${boxSimulation.scale / 100})`,
                                    transformOrigin: 'center center'
                                }}
                            >
                                {boxSimulation.labelConfig.elements.map(el => (
                                    <div
                                        key={el.id}
                                        className="absolute whitespace-nowrap pointer-events-none"
                                        style={{
                                            left: `${el.x * 4}px`,
                                            top: `${el.y * 4}px`,
                                            transform: getTransformStyle(el),
                                            transformOrigin: 'center center',
                                            textAlign: el.textAlign || 'left'
                                        }}
                                    >
                                        {el.type === 'barcode' ? (
                                            <div style={{ width: `${(el.width || 40) * 4}px`, height: `${(el.height || 15) * 4}px` }}>
                                                <RealBarcode 
                                                    value={el.text} 
                                                    width={(el.width || 40)} 
                                                    height={(el.height || 15)} 
                                                    showText={el.showText !== false}
                                                    format={el.barcodeFormat}
                                                    fontSize={el.fontSize}
                                                />
                                            </div>
                                        ) : el.type === 'box' ? (
                                            <div 
                                                style={{
                                                    width: `${(el.width || 50) * 4}px`,
                                                    height: `${(el.height || 20) * 4}px`,
                                                    border: `${el.borderThickness || 1}px solid black`
                                                }}
                                            ></div>
                                        ) : (
                                            <div style={{
                                                    fontSize: `${el.fontSize}px`, 
                                                    fontWeight: el.isBold ? 'bold' : 'normal',
                                                    fontFamily: 'monospace'
                                                }}
                                            >
                                                {resolveValue(el)}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="w-full mt-4 p-4 bg-white border rounded-lg">
                             <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Controles Rápidos</h4>
                             <div className="flex items-center gap-4">
                                <div className="flex-1">
                                    <label className="block text-xs text-slate-400 mb-1">Rotación ({boxSimulation.rotation}°)</label>
                                    <input
                                        type="range"
                                        min="-180"
                                        max="180"
                                        value={boxSimulation.rotation}
                                        onChange={(e) => setBoxSimulation({...boxSimulation, rotation: Number(e.target.value)})}
                                        className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs text-slate-400 mb-1">Escala ({boxSimulation.scale}%)</label>
                                    <input
                                        type="range"
                                        min="10"
                                        max="150"
                                        value={boxSimulation.scale}
                                        onChange={(e) => setBoxSimulation({...boxSimulation, scale: Number(e.target.value)})}
                                        className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                                    />
                                </div>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
         )}
      </div>

    </div>
  );
};

export default FinalProductUploader;