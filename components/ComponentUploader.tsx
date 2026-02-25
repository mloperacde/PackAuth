import React, { useState, useEffect, useRef } from 'react';
import { PackagingComponent, WarehouseItem } from '../types';
import { Trash2, Plus, Images, Info, Search, X, ScanBarcode } from 'lucide-react';

// Declare html5-qrcode types for TS since we are using CDN
declare const Html5QrcodeScanner: any;

interface ComponentUploaderProps {
  components: PackagingComponent[];
  setComponents: React.Dispatch<React.SetStateAction<PackagingComponent[]>>;
  warehouseItems: WarehouseItem[];
}

const ComponentUploader: React.FC<ComponentUploaderProps> = ({ components, setComponents, warehouseItems }) => {
  const [showGallery, setShowGallery] = useState(false);
  const [activeComponentId, setActiveComponentId] = useState<string | null>(null);
  const [filterText, setFilterText] = useState('');
  
  // Scanner State
  const [showScanner, setShowScanner] = useState(false);
  const [scannerComponentId, setScannerComponentId] = useState<string | null>(null);
  const scannerRef = useRef<any>(null);

  const addComponent = () => {
    const newComponent: PackagingComponent = {
      id: Math.random().toString(36).substr(2, 9),
      reference: '',
      name: '',
      imageUrl: null,
    };
    setComponents([...components, newComponent]);
  };

  const removeComponent = (id: string) => {
    setComponents(components.filter((c) => c.id !== id));
  };

  const updateComponent = (id: string, field: keyof PackagingComponent, value: string) => {
    setComponents(
      components.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const openGalleryForComponent = (id: string) => {
    setActiveComponentId(id);
    setFilterText('');
    setShowGallery(true);
  };

  const selectImageFromGallery = (item: WarehouseItem) => {
    if (activeComponentId) {
      setComponents(
        components.map((c) => 
          c.id === activeComponentId 
            ? { ...c, imageUrl: item.imageUrl, reference: item.code, name: item.name } 
            : c
        )
      );
    }
    setShowGallery(false);
    setActiveComponentId(null);
  };

  const openScanner = (id: string) => {
    setScannerComponentId(id);
    setShowScanner(true);
  };

  const closeScanner = () => {
    if (scannerRef.current) {
        scannerRef.current.clear().catch((err: any) => console.error(err));
        scannerRef.current = null;
    }
    setShowScanner(false);
    setScannerComponentId(null);
  };

  useEffect(() => {
    if (showScanner && scannerComponentId) {
        // Allow DOM to update
        setTimeout(() => {
            const onScanSuccess = (decodedText: string, decodedResult: any) => {
                updateComponent(scannerComponentId, 'reference', decodedText);
                closeScanner();
            };
      
            const onScanFailure = (error: any) => {
                // handle scan failure, usually better to ignore and keep scanning.
                // console.warn(`Code scan error = ${error}`);
            };
      
            const html5QrcodeScanner = new Html5QrcodeScanner(
                "reader",
                { fps: 10, qrbox: { width: 250, height: 250 } },
                /* verbose= */ false
            );
            scannerRef.current = html5QrcodeScanner;
            html5QrcodeScanner.render(onScanSuccess, onScanFailure);
        }, 100);
    }
    
    return () => {
        if(scannerRef.current) {
             scannerRef.current.clear().catch((err: any) => console.error("Failed to clear scanner", err));
        }
    };
  }, [showScanner]);

  const filteredGalleryItems = warehouseItems.filter(item => 
    item.name.toLowerCase().includes(filterText.toLowerCase()) ||
    item.code.toLowerCase().includes(filterText.toLowerCase()) ||
    item.client.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">1. Componentes de Envasado</h2>
          <p className="text-sm text-slate-500">
            Listar todas las referencias (frascos, tapas, etiquetas) a verificar.
          </p>
        </div>
        <button
          onClick={addComponent}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-md transition-colors shadow-sm"
        >
          <Plus size={18} />
          <span>Agregar Componente</span>
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-3 text-sm text-blue-800">
        <Info className="shrink-0 w-5 h-5 mt-0.5" />
        <div>
            <p className="font-semibold">Instrucciones:</p>
            <ul className="list-disc list-inside mt-1 space-y-1 text-blue-700">
                <li>Agregue los componentes necesarios para la autorización.</li>
                <li>Las imágenes <strong>deben seleccionarse de la Galería de Almacén</strong>.</li>
                <li>Puede usar la cámara para escanear el código de barras de la referencia.</li>
            </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {components.map((comp) => (
          <div
            key={comp.id}
            className="group relative bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all overflow-hidden"
          >
            <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => removeComponent(comp.id)}
                className="p-1.5 bg-white text-red-500 rounded-full shadow hover:bg-red-50"
                title="Eliminar"
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div
              className="relative w-full h-48 bg-slate-100 flex items-center justify-center cursor-pointer overflow-hidden group/image"
              onClick={() => openGalleryForComponent(comp.id)}
            >
              {comp.imageUrl ? (
                <>
                    <img
                    src={comp.imageUrl}
                    alt="Preview"
                    className="w-full h-full object-contain p-2"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/image:opacity-100 transition-opacity">
                        <span className="text-white font-medium flex items-center gap-2"><Images size={16}/> Cambiar Imagen</span>
                    </div>
                </>
              ) : (
                <div className="flex flex-col items-center text-slate-400 hover:text-brand-600 transition-colors">
                  <Images size={32} className="mb-2" />
                  <span className="text-xs font-medium">Seleccionar de Galería</span>
                </div>
              )}
            </div>

            <div className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Referencia
                </label>
                <div className="flex gap-2">
                    <input
                    type="text"
                    placeholder="Ej: 0015164706"
                    value={comp.reference}
                    onChange={(e) => updateComponent(comp.id, 'reference', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm font-mono"
                    />
                    <button 
                        onClick={() => openScanner(comp.id)}
                        className="p-2 bg-slate-100 text-slate-600 hover:bg-brand-50 hover:text-brand-600 border border-slate-300 rounded-md transition-colors"
                        title="Escanear Código de Barras"
                    >
                        <ScanBarcode size={18} />
                    </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Nombre / Descripción
                </label>
                <input
                  type="text"
                  placeholder="Ej: Tapa plateada redonda"
                  value={comp.name}
                  onChange={(e) => updateComponent(comp.id, 'name', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm"
                />
              </div>
            </div>
          </div>
        ))}

        {components.length === 0 && (
          <div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            <Images size={48} className="mb-4 opacity-50" />
            <p className="text-lg">No hay componentes agregados.</p>
            <button onClick={addComponent} className="mt-2 text-brand-600 hover:underline">
              Agregar el primer componente
            </button>
          </div>
        )}
      </div>

      {/* Gallery Selector Modal */}
      {showGallery && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden">
                <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        <Images size={20} />
                        Seleccionar de Galería
                    </h3>
                    <button onClick={() => setShowGallery(false)} className="text-slate-400 hover:text-slate-600 p-1"><X size={24}/></button>
                </div>

                <div className="p-4 border-b bg-white">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            value={filterText}
                            onChange={(e) => setFilterText(e.target.value)}
                            placeholder="Buscar por código, nombre o cliente..." 
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500"
                            autoFocus
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
                    {warehouseItems.length === 0 ? (
                        <div className="text-center py-20 text-slate-400">
                            <p>La galería está vacía.</p>
                            <p className="text-sm">Vaya a "Galería Almacén" para registrar entradas.</p>
                        </div>
                    ) : filteredGalleryItems.length === 0 ? (
                         <div className="text-center py-20 text-slate-400">
                            <p>No se encontraron resultados para "{filterText}".</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {filteredGalleryItems.map(item => (
                                <div 
                                    key={item.id} 
                                    onClick={() => selectImageFromGallery(item)}
                                    className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md hover:border-brand-500 hover:ring-2 hover:ring-brand-500/20 cursor-pointer transition-all group"
                                >
                                    <div className="aspect-square bg-slate-100 relative">
                                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-brand-500/0 group-hover:bg-brand-500/10 transition-colors"></div>
                                    </div>
                                    <div className="p-2">
                                        <p className="text-[10px] font-bold text-brand-600 uppercase tracking-wide truncate">{item.client}</p>
                                        <p className="font-bold text-xs text-slate-800 truncate" title={item.code}>{item.code}</p>
                                        <p className="text-[10px] text-slate-500 truncate">{item.name}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* Barcode Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 bg-black/90 z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden">
                <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                     <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        <ScanBarcode size={20} />
                        Escanear Código
                    </h3>
                    <button onClick={closeScanner} className="text-slate-400 hover:text-slate-600 p-1"><X size={24}/></button>
                </div>
                <div className="p-4 bg-black">
                    <div id="reader" className="w-full h-64 bg-slate-800 rounded-lg overflow-hidden"></div>
                </div>
                <div className="p-4 bg-white text-center text-sm text-slate-500">
                    Apunte la cámara hacia el código de barras del componente.
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default ComponentUploader;