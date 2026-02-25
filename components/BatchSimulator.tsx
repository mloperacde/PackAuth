import React, { useState, useRef, useEffect } from 'react';
import { BatchSimulationItem } from '../types';
import { Upload, Move, Type, Plus, Trash2, Layers, Info, Zap, RotateCw, RotateCcw } from 'lucide-react';

interface BatchSimulatorProps {
  simulations: BatchSimulationItem[];
  setSimulations: React.Dispatch<React.SetStateAction<BatchSimulationItem[]>>;
}

const BatchSimulator: React.FC<BatchSimulatorProps> = ({ simulations, setSimulations }) => {
  const [activeId, setActiveId] = useState<string>(simulations[0].id);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeSimulation = simulations.find(s => s.id === activeId) || simulations[0];

  const updateActiveSimulation = (changes: Partial<BatchSimulationItem>) => {
    setSimulations(prev => 
      prev.map(sim => sim.id === activeId ? { ...sim, ...changes } : sim)
    );
  };

  const addSimulation = () => {
    if (simulations.length >= 3) return;
    const newSim: BatchSimulationItem = {
        id: Math.random().toString(36).substr(2, 9),
        name: `Vista ${simulations.length + 1}`,
        baseImageUrl: null,
        batchCode: 'LOTE 12345',
        legalText: '',
        positionX: 50,
        positionY: 50,
        fontSize: 5, 
        rotation: 0,
        textColor: '#000000',
        isLaser: false,
        aspectRatio: 4/3 
    };
    setSimulations([...simulations, newSim]);
    setActiveId(newSim.id);
  };

  const removeSimulation = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (simulations.length <= 1) return;
      const newSims = simulations.filter(s => s.id !== id);
      setSimulations(newSims);
      if (activeId === id) {
          setActiveId(newSims[0].id);
      }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      updateActiveSimulation({ baseImageUrl: url });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Safe Aspect Ratio Detection
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    if (naturalWidth && naturalHeight) {
        const newRatio = naturalWidth / naturalHeight;
        if (!activeSimulation.aspectRatio || Math.abs(activeSimulation.aspectRatio - newRatio) > 0.01) {
            updateActiveSimulation({ aspectRatio: newRatio });
        }
    }
  };

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const xPercent = Math.max(0, Math.min(100, (x / rect.width) * 100));
    const yPercent = Math.max(0, Math.min(100, (y / rect.height) * 100));

    updateActiveSimulation({ positionX: xPercent, positionY: yPercent });
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mouseup', handleDragEnd);
    } else {
      window.removeEventListener('mouseup', handleDragEnd);
    }
    return () => window.removeEventListener('mouseup', handleDragEnd);
  }, [isDragging]);

  // Rotation Helpers
  const rotateLeft = () => updateActiveSimulation({ rotation: activeSimulation.rotation - 90 });
  const rotateRight = () => updateActiveSimulation({ rotation: activeSimulation.rotation + 90 });

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h2 className="text-xl font-bold text-slate-800">2. Simulación de Lote y Textos</h2>
        <p className="text-sm text-slate-500">
          Define hasta 3 vistas (ej: Base, Lateral) para indicar donde imprimir el lote.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-3 text-sm text-blue-800">
        <Info className="shrink-0 w-5 h-5 mt-0.5" />
        <div>
            <p className="font-semibold">Recomendaciones para las fotos de base/lateral:</p>
            <ul className="list-disc list-inside mt-1 space-y-1 text-blue-700">
                <li>Asegúrese de que la superficie donde irá el lote esté limpia y visible.</li>
                <li>Tome la foto perpendicular a la superficie para evitar distorsiones.</li>
            </ul>
        </div>
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        {simulations.map((sim) => (
            <div 
                key={sim.id}
                onClick={() => setActiveId(sim.id)}
                className={`group px-4 py-2 text-sm font-medium rounded-t-lg cursor-pointer flex items-center gap-2 border-t border-x ${
                    activeId === sim.id 
                    ? 'bg-white border-slate-200 text-brand-600 -mb-px' 
                    : 'bg-slate-50 border-transparent text-slate-500 hover:bg-slate-100'
                }`}
            >
                <Layers size={14} />
                {sim.name}
                {simulations.length > 1 && (
                    <button 
                        onClick={(e) => removeSimulation(e, sim.id)}
                        className="ml-1 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity"
                    >
                        <Trash2 size={12} />
                    </button>
                )}
            </div>
        ))}
        {simulations.length < 3 && (
            <button 
                onClick={addSimulation}
                className="px-3 py-2 text-sm text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-t-lg flex items-center gap-1 transition-colors"
            >
                <Plus size={14} /> Vista
            </button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-8 pt-4">
        <div className="w-full lg:w-1/3 space-y-4">
          <div className="p-4 bg-white border rounded-xl shadow-sm space-y-4">
            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
              <Type size={18} />
              Configuración: {activeSimulation.name}
            </h3>

             <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre de la Vista</label>
              <input
                type="text"
                value={activeSimulation.name}
                onChange={(e) => updateActiveSimulation({ name: e.target.value })}
                className="w-full px-3 py-2 border rounded-md text-sm"
              />
            </div>

            <div className="border-t pt-3 mt-3">
                <label className="block text-sm font-medium text-slate-700 mb-1">Código de Lote</label>
                <input
                    type="text"
                    value={activeSimulation.batchCode}
                    onChange={(e) => updateActiveSimulation({ batchCode: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md font-mono"
                    placeholder="Ej: LOTE 12345"
                />
            </div>

             <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Texto Adicional (Opcional)</label>
              <input
                type="text"
                value={activeSimulation.legalText}
                onChange={(e) => updateActiveSimulation({ legalText: e.target.value })}
                className="w-full px-3 py-2 border rounded-md text-sm"
                placeholder="Ej: MADE IN SPAIN"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div>
                <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1">
                    <RotateCw size={12}/> Rotación
                </label>
                <div className="flex items-center gap-2">
                    <button onClick={rotateLeft} className="p-1.5 bg-slate-100 rounded hover:bg-slate-200 text-slate-600" title="-90°"><RotateCcw size={14}/></button>
                    <input
                        type="range"
                        min="-180"
                        max="180"
                        value={activeSimulation.rotation}
                        onChange={(e) => updateActiveSimulation({ rotation: Number(e.target.value) })}
                        className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <button onClick={rotateRight} className="p-1.5 bg-slate-100 rounded hover:bg-slate-200 text-slate-600" title="+90°"><RotateCw size={14}/></button>
                </div>
                <div className="text-center text-xs font-mono text-slate-500 mt-1">{activeSimulation.rotation}°</div>
              </div>

               <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Tamaño (CQW)</label>
                <input
                    type="range"
                    min="1"
                    max="15"
                    step="0.5"
                    value={activeSimulation.fontSize}
                    onChange={(e) => updateActiveSimulation({ fontSize: Number(e.target.value) })}
                    className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="text-right text-xs text-slate-500 mt-1">{activeSimulation.fontSize}cqw</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 items-end">
                <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Color Texto</label>
                    <div className="flex items-center gap-2">
                        <input
                            type="color"
                            value={activeSimulation.textColor || '#000000'}
                            onChange={(e) => updateActiveSimulation({ textColor: e.target.value, isLaser: false })}
                            disabled={activeSimulation.isLaser}
                            className={`w-full h-9 rounded cursor-pointer ${activeSimulation.isLaser ? 'opacity-50' : ''}`}
                        />
                    </div>
                </div>
                 <div className="pb-1">
                     <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer p-2 border rounded hover:bg-slate-50">
                        <input 
                            type="checkbox"
                            checked={activeSimulation.isLaser || false}
                            onChange={(e) => updateActiveSimulation({ isLaser: e.target.checked })}
                            className="w-4 h-4 text-brand-600 rounded"
                        />
                        <span className="flex items-center gap-1 text-xs font-bold">
                            <Zap size={14} className="text-yellow-500"/>
                            Láser (Cristal)
                        </span>
                     </label>
                </div>
            </div>

            {!activeSimulation.baseImageUrl && (
                <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2 bg-brand-100 text-brand-700 rounded-md hover:bg-brand-200 transition-colors flex items-center justify-center gap-2 mt-2"
                >
                <Upload size={18} />
                Subir Imagen Base
                </button>
            )}
            
            {activeSimulation.baseImageUrl && (
                 <button
                 onClick={() => fileInputRef.current?.click()}
                 className="w-full text-xs text-slate-500 hover:underline mt-2"
                 >
                 Cambiar imagen base
                 </button>
            )}

            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleImageUpload}
            />
          </div>
        </div>

        {/* Canvas Area */}
        <div className="w-full lg:w-2/3 flex justify-center bg-slate-200 p-4 rounded-xl border-2 border-slate-300 shadow-inner overflow-auto">
          {/* Using dynamic aspect ratio container to ensure 1:1 match with print preview */}
          <div
            ref={containerRef}
            className="img-container relative group/canvas bg-white shadow-sm"
            onMouseMove={handleMouseMove}
            style={{
                cursor: isDragging ? 'grabbing' : 'default',
                aspectRatio: activeSimulation.aspectRatio ? `${activeSimulation.aspectRatio}` : '4/3',
                width: '100%',
                maxWidth: '600px',
                height: 'auto',
                containerType: 'inline-size' // Explicit container type for cqw
            }}
          >
            {activeSimulation.baseImageUrl ? (
              <>
                <img
                  src={activeSimulation.baseImageUrl}
                  alt="Base"
                  onLoad={handleImageLoad}
                  className="w-full h-full object-cover pointer-events-none select-none"
                />
                
                {/* Draggable Overlay */}
                <div
                  className="absolute cursor-grab active:cursor-grabbing p-1 border border-dashed border-green-500 bg-white/30 hover:bg-white/60 backdrop-blur-sm rounded transition-colors select-none group"
                  style={{
                    left: `${activeSimulation.positionX}%`,
                    top: `${activeSimulation.positionY}%`,
                    transform: `translate(-50%, -50%) rotate(${activeSimulation.rotation}deg)`,
                  }}
                  onMouseDown={handleDragStart}
                >
                   <div 
                        className="text-center font-mono font-bold leading-tight" 
                        style={{ 
                            fontSize: `${activeSimulation.fontSize}cqw`,
                            color: activeSimulation.isLaser ? 'rgba(255,255,255,0.85)' : (activeSimulation.textColor || '#000000'),
                            textShadow: activeSimulation.isLaser ? '0 0 2px rgba(255,255,255,0.6), 1px 1px 0 rgba(0,0,0,0.2)' : 'none',
                        }}
                   >
                       <div>{activeSimulation.batchCode}</div>
                       {activeSimulation.legalText && <div className="text-[0.8em] font-normal">{activeSimulation.legalText}</div>}
                   </div>
                   
                   {/* Handle visual */}
                   <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-white bg-green-500 rounded-full p-1 opacity-0 group-hover:opacity-100 shadow-sm">
                        <Move size={12} />
                   </div>
                </div>
              </>
            ) : (
              <div 
                className="w-full h-full flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:bg-slate-100 transition-colors absolute inset-0"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={48} className="mb-4 opacity-50" />
                <p className="font-medium">Haz click para subir imagen del producto</p>
                <p className="text-sm">Vista: {activeSimulation.name}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatchSimulator;