import React, { useRef, useState, useEffect } from 'react';
import { LabelPositioningData } from '../types';
import { Upload, MoveVertical, Ruler, Trash2 } from 'lucide-react';

interface LabelPositionerProps {
  data: LabelPositioningData;
  setData: React.Dispatch<React.SetStateAction<LabelPositioningData>>;
}

const LabelPositioner: React.FC<LabelPositionerProps> = ({ data, setData }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setData(prev => ({ 
        ...prev, 
        imageUrl: URL.createObjectURL(file),
        guideY: 85 
      }));
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    if (naturalWidth && naturalHeight) {
      const newRatio = naturalWidth / naturalHeight;
      if (!data.aspectRatio || Math.abs(data.aspectRatio - newRatio) > 0.01) {
          setData(prev => ({ ...prev, aspectRatio: newRatio }));
      }
    }
  };

  const removeImage = () => {
    setData(prev => ({ ...prev, imageUrl: null }));
  };

  const handleDragStart = () => setIsDragging(true);
  const handleDragEnd = () => setIsDragging(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const yPercent = Math.max(0, Math.min(100, (y / rect.height) * 100));
    setData(prev => ({ ...prev, guideY: yPercent }));
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mouseup', handleDragEnd);
    } else {
      window.removeEventListener('mouseup', handleDragEnd);
    }
    return () => window.removeEventListener('mouseup', handleDragEnd);
  }, [isDragging]);

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h2 className="text-xl font-bold text-slate-800">3. Posicionamiento de Etiqueta en Frasco</h2>
        <p className="text-sm text-slate-500">
          Defina la altura y posición exacta de la etiqueta sobre el envase.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="w-full lg:w-1/3 space-y-4">
          <div className="p-4 bg-white border rounded-xl shadow-sm space-y-4">
            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
              <Ruler size={18} />
              Datos de Ajuste
            </h3>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Instrucción / Referencia</label>
              <input 
                type="text"
                placeholder="Ej: Altura etiqueta"
                value={data.instruction}
                onChange={(e) => setData({...data, instruction: e.target.value})}
                className="w-full px-3 py-2 border rounded-md text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Medida / Tolerancia</label>
              <input 
                type="text"
                placeholder="Ej: 12mm +-1 desde la base"
                value={data.measurement}
                onChange={(e) => setData({...data, measurement: e.target.value})}
                className="w-full px-3 py-2 border rounded-md text-sm"
              />
            </div>

            <div className="pt-2">
               <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer p-2 border rounded hover:bg-slate-50">
                  <input 
                      type="checkbox"
                      checked={data.showGuide}
                      onChange={(e) => setData({...data, showGuide: e.target.checked})}
                      className="w-4 h-4 text-brand-600 rounded"
                  />
                  <span>Mostrar línea guía visual</span>
               </label>
            </div>

            {!data.imageUrl ? (
               <button
               onClick={() => fileInputRef.current?.click()}
               className="w-full py-2 bg-brand-100 text-brand-700 rounded-md hover:bg-brand-200 transition-colors flex items-center justify-center gap-2 mt-4"
               >
               <Upload size={18} />
               Subir Imagen Frasco
               </button>
            ) : (
               <button
               onClick={removeImage}
               className="w-full py-2 border border-red-200 text-red-600 rounded-md hover:bg-red-50 transition-colors flex items-center justify-center gap-2 mt-4"
               >
               <Trash2 size={18} />
               Eliminar Imagen
               </button>
            )}
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleUpload} />
          </div>
          
          <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded border">
             <p className="font-bold mb-1">Instrucciones:</p>
             1. Suba una foto frontal del frasco/envase.<br/>
             2. Arrastre la línea roja sobre la imagen para indicar el punto de medición.<br/>
             3. Complete los campos de texto para que aparezcan al pie de la foto.
          </div>
        </div>

        <div className="w-full lg:w-2/3 flex flex-col items-center">
           <div 
             className="w-full max-w-[500px] bg-slate-200 rounded-xl border-2 border-slate-300 overflow-hidden shadow-inner relative group select-none"
             ref={containerRef}
             onMouseMove={handleMouseMove}
             style={{
                aspectRatio: data.aspectRatio ? `${data.aspectRatio}` : '3/4',
                cursor: isDragging ? 'ns-resize' : 'default'
             }}
           >
              {data.imageUrl ? (
                <>
                    <img 
                        src={data.imageUrl} 
                        alt="Product Positioning" 
                        onLoad={handleImageLoad}
                        className="w-full h-full object-contain pointer-events-none"
                    />
                    
                    {data.showGuide && (
                        <div 
                            className="absolute left-0 w-full flex items-center group/guide cursor-ns-resize"
                            style={{ top: `${data.guideY}%`, transform: 'translateY(-50%)' }}
                            onMouseDown={handleDragStart}
                        >
                            <div className="w-full h-0.5 bg-red-500 shadow-sm relative">
                                <div className="absolute left-0 -top-1 w-2 h-2 bg-red-500 rotate-45 transform origin-center"></div>
                                <div className="absolute right-0 -top-1 w-2 h-2 bg-red-500 rotate-45 transform origin-center"></div>
                            </div>
                            <div className="absolute right-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded shadow-sm opacity-50 group-hover/guide:opacity-100 transition-opacity flex items-center gap-1">
                                <MoveVertical size={10} />
                                {Math.round(data.guideY)}%
                            </div>
                        </div>
                    )}
                </>
              ) : (
                <div 
                    className="w-full h-full flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:bg-slate-100 transition-colors absolute inset-0"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <Upload size={48} className="mb-4 opacity-50" />
                    <p className="font-medium">Subir Imagen</p>
                </div>
              )}
           </div>

           {data.imageUrl && (
               <div className="mt-4 text-center">
                   <p className="text-lg text-slate-800">
                       <span className="font-medium">{data.instruction}: </span>
                       <span>{data.measurement}</span>
                   </p>
               </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default LabelPositioner;