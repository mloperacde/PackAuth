import React, { useState, useRef, useEffect, useMemo } from 'react';
import { WarehouseItem } from '../types';
import { Camera, Search, X, Plus, Image as ImageIcon, Trash2, Save, Aperture, Upload, Pencil, CameraOff, AlertCircle, Folder, ChevronRight, CornerUpLeft, ArrowLeft } from 'lucide-react';

interface WarehouseGalleryProps {
  items: WarehouseItem[];
  setItems: React.Dispatch<React.SetStateAction<WarehouseItem[]>>;
}

type ViewMode = 'clients' | 'products' | 'items';

const WarehouseGallery: React.FC<WarehouseGalleryProps> = ({ items, setItems }) => {
  // Navigation State
  const [viewMode, setViewMode] = useState<ViewMode>('clients');
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // New Entry / Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newClient, setNewClient] = useState('');
  const [newProduct, setNewProduct] = useState(''); // Added Product
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Autocomplete data derived from existing items
  const uniqueClients = useMemo(() => Array.from(new Set(items.map(i => i.client))).sort(), [items]);
  const uniqueProducts = useMemo(() => Array.from(new Set(items.map(i => i.product || 'General'))).sort(), [items]);

  // Auto-select client if only one exists (UX Optimization)
  useEffect(() => {
    if (uniqueClients.length === 1 && !selectedClient) {
        setSelectedClient(uniqueClients[0]);
        setViewMode('products');
    }
  }, [uniqueClients, selectedClient]);

  // --- Folder Logic ---
  const currentItems = useMemo(() => {
    let filtered = items;
    if (selectedClient) {
        filtered = filtered.filter(i => i.client === selectedClient);
    }
    if (selectedProduct) {
        filtered = filtered.filter(i => (i.product || 'General') === selectedProduct);
    }
    return filtered;
  }, [items, selectedClient, selectedProduct]);

  // Clients for Root View
  const clientsWithCount = useMemo(() => {
    const map = new Map<string, number>();
    items.forEach(i => {
        map.set(i.client, (map.get(i.client) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [items]);

  // Products for Client View
  const productsWithCount = useMemo(() => {
    if (!selectedClient) return [];
    const map = new Map<string, number>();
    items
        .filter(i => i.client === selectedClient)
        .forEach(i => {
            const prod = i.product || 'General';
            map.set(prod, (map.get(prod) || 0) + 1);
        });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [items, selectedClient]);


  const startCamera = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError("El navegador no soporta acceso a la cámara. Asegúrese de estar usando HTTPS o localhost.");
        return;
    }

    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
            facingMode: 'environment', // Prefer back camera
            width: { ideal: 1920 },
            height: { ideal: 1080 }
        } 
      });
      streamRef.current = stream;
      setIsCameraActive(true);
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setCameraError("Permiso denegado. Por favor permita el acceso a la cámara en su navegador.");
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setCameraError("No se encontró ninguna cámara en el dispositivo.");
      } else {
          setCameraError("No se pudo acceder a la cámara. Verifique que no esté siendo usada por otra aplicación.");
      }
    }
  };

  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch(e => console.error("Error playing video:", e));
    }
  }, [isCameraActive]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const processImage = (source: HTMLVideoElement | HTMLImageElement): string => {
      const MAX_WIDTH = 1024;
      let w = source instanceof HTMLVideoElement ? source.videoWidth : source.width;
      let h = source instanceof HTMLVideoElement ? source.videoHeight : source.height;
      
      if (w > MAX_WIDTH) {
          h = Math.round((h * MAX_WIDTH) / w);
          w = MAX_WIDTH;
      }
      
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(source, 0, 0, w, h);
        return canvas.toDataURL('image/jpeg', 0.7);
      }
      return '';
  };

  const captureImage = () => {
    if (videoRef.current) {
      const imageUrl = processImage(videoRef.current);
      if (imageUrl) {
        setCapturedImages(prev => [...prev, imageUrl]);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
            const img = new Image();
            img.onload = () => {
                const resized = processImage(img);
                if (resized) setCapturedImages(prev => [...prev, resized]);
            };
            img.src = ev.target.result as string;
        }
      };
      reader.readAsDataURL(file);
    });
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveEntry = () => {
    if (!newClient || !newProduct || !newCode || !newName) {
      alert("Por favor complete todos los campos de texto.");
      return;
    }

    // Duplicate Validation
    if (!editingId) {
        const suffixes = capturedImages.length > 1 
            ? capturedImages.map((_, i) => `-${i + 1}`) 
            : [''];
        
        const codesToCheck = suffixes.map(s => `${newCode}${s}`);

        // Check if entry exists with same Client + Product + Code
        const duplicate = items.find(i => 
            i.client.trim().toLowerCase() === newClient.trim().toLowerCase() &&
            (i.product || '').trim().toLowerCase() === newProduct.trim().toLowerCase() &&
            codesToCheck.includes(i.code)
        );

        if (duplicate) {
             alert(`Error: Ya existe un registro para ${newClient} / ${newProduct} con el código ${duplicate.code}. Por favor use un código diferente.`);
             return;
        }
    }

    if (editingId) {
        setItems(prev => prev.map(item => {
            if (item.id === editingId) {
                const finalImage = capturedImages.length > 0 ? capturedImages[0] : item.imageUrl;
                return {
                    ...item,
                    client: newClient,
                    product: newProduct,
                    code: newCode,
                    name: newName,
                    imageUrl: finalImage,
                    timestamp: new Date().toLocaleString() // Update timestamp on edit
                };
            }
            return item;
        }));
    } else {
        if (capturedImages.length === 0) {
            alert("Capture al menos una imagen para una nueva entrada.");
            return;
        }

        const newItems: WarehouseItem[] = capturedImages.map((img, index) => {
            const suffix = capturedImages.length > 1 ? `-${index + 1}` : '';
            return {
                id: Math.random().toString(36).substr(2, 9) + Date.now().toString(36),
                client: newClient,
                product: newProduct,
                code: `${newCode}${suffix}`,
                name: `${newName}${suffix ? ` (${index + 1})` : ''}`,
                imageUrl: img,
                timestamp: new Date().toLocaleString()
            };
        });
        setItems(prev => [...newItems, ...prev]);
    }

    closeModal();
  };

  const openNewEntryModal = () => {
    setEditingId(null);
    setNewClient(selectedClient || '');
    setNewProduct(selectedProduct || '');
    setNewCode('');
    setNewName('');
    setCapturedImages([]);
    setIsModalOpen(true);
  };

  const openEditModal = (item: WarehouseItem) => {
      setEditingId(item.id);
      setNewClient(item.client);
      setNewProduct(item.product || 'General');
      setNewCode(item.code);
      setNewName(item.name);
      setCapturedImages([]); 
      setIsModalOpen(true);
  };

  const closeModal = () => {
    stopCamera();
    setIsModalOpen(false);
    setEditingId(null);
    setNewClient('');
    setNewProduct('');
    setNewCode('');
    setNewName('');
    setCapturedImages([]);
    setCameraError(null);
  };

  const removeCapturedImage = (index: number) => {
    setCapturedImages(prev => prev.filter((_, i) => i !== index));
  };

  const deleteItem = (id: string) => {
      if(window.confirm('¿Eliminar esta imagen del archivo?')) {
          setItems(prev => prev.filter(i => i.id !== id));
      }
  };

  // --- Navigation Handlers ---
  const handleClientClick = (client: string) => {
      setSelectedClient(client);
      setViewMode('products');
  };

  const handleProductClick = (product: string) => {
      setSelectedProduct(product);
      setViewMode('items');
  };

  const goBack = () => {
      if (viewMode === 'items') {
          setViewMode('products');
          setSelectedProduct(null);
      } else if (viewMode === 'products') {
          setViewMode('clients');
          setSelectedClient(null);
      }
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  return (
    <div className="space-y-6">
      
      {/* Header & Controls */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <ImageIcon className="text-brand-600" />
                    Archivo Fotográfico
                </h2>
                <p className="text-sm text-slate-500">Registro organizado por Cliente y Producto.</p>
            </div>

            <button 
                onClick={openNewEntryModal}
                className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg shadow-sm flex items-center justify-center gap-2 transition-colors"
            >
                <Plus size={18} />
                <span>Nuevo Registro</span>
            </button>
        </div>

        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200">
            <button 
                onClick={() => { setViewMode('clients'); setSelectedClient(null); setSelectedProduct(null); }}
                className={`hover:text-brand-600 flex items-center gap-1 ${viewMode === 'clients' ? 'font-bold text-slate-800' : ''}`}
            >
                <Folder size={14} /> Inicio
            </button>
            
            {selectedClient && (
                <>
                    <ChevronRight size={14} className="text-slate-400"/>
                    <button 
                         onClick={() => { setViewMode('products'); setSelectedProduct(null); }}
                         className={`hover:text-brand-600 ${viewMode === 'products' ? 'font-bold text-slate-800' : ''}`}
                    >
                        {selectedClient}
                    </button>
                </>
            )}

            {selectedProduct && (
                <>
                    <ChevronRight size={14} className="text-slate-400"/>
                    <span className="font-bold text-slate-800">{selectedProduct}</span>
                </>
            )}
            
            {viewMode !== 'clients' && (
                 <button onClick={goBack} className="ml-auto text-xs flex items-center gap-1 bg-white border border-slate-200 px-3 py-1.5 rounded shadow-sm hover:bg-slate-50 text-slate-700 font-medium transition-colors">
                    <ArrowLeft size={14}/> Volver Atrás
                 </button>
            )}
        </div>
      </div>

      {/* --- LEVEL 1: CLIENTS --- */}
      {viewMode === 'clients' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {clientsWithCount.map(([client, count]) => (
                  <div 
                    key={client} 
                    onClick={() => handleClientClick(client)}
                    className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-brand-300 cursor-pointer transition-all group"
                  >
                      <div className="flex items-center justify-between mb-2">
                          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-100 transition-colors">
                              <Folder size={24} />
                          </div>
                          <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{count}</span>
                      </div>
                      <h3 className="font-bold text-slate-800 truncate" title={client}>{client}</h3>
                      <p className="text-xs text-slate-500">Carpeta Cliente</p>
                  </div>
              ))}
               {clientsWithCount.length === 0 && (
                  <div className="col-span-full py-12 text-center text-slate-400 italic">
                      No hay clientes registrados. Cree un nuevo registro para comenzar.
                  </div>
              )}
          </div>
      )}

      {/* --- LEVEL 2: PRODUCTS --- */}
      {viewMode === 'products' && (
           <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {productsWithCount.map(([product, count]) => (
                <div 
                  key={product} 
                  onClick={() => handleProductClick(product)}
                  className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-brand-300 cursor-pointer transition-all group"
                >
                    <div className="flex items-center justify-between mb-2">
                        <div className="p-2 bg-amber-50 text-amber-600 rounded-lg group-hover:bg-amber-100 transition-colors">
                            <Folder size={24} />
                        </div>
                        <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{count}</span>
                    </div>
                    <h3 className="font-bold text-slate-800 truncate" title={product}>{product}</h3>
                    <p className="text-xs text-slate-500">Carpeta Producto</p>
                </div>
            ))}
             {productsWithCount.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-400 italic">
                    No hay productos para este cliente.
                </div>
            )}
        </div>
      )}

      {/* --- LEVEL 3: ITEMS --- */}
      {viewMode === 'items' && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {currentItems.map(item => (
                  <div key={item.id} className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow group relative">
                      <div className="aspect-square bg-slate-100 relative">
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                             <button onClick={() => openEditModal(item)} className="bg-white p-2 rounded-full text-brand-600 hover:bg-brand-50" title="Editar"><Pencil size={18}/></button>
                             <button onClick={() => deleteItem(item.id)} className="bg-white p-2 rounded-full text-red-500 hover:bg-red-50" title="Eliminar"><Trash2 size={18}/></button>
                          </div>
                      </div>
                      <div className="p-3">
                          <p className="font-bold text-slate-800 truncate" title={item.code}>{item.code}</p>
                          <p className="text-xs text-slate-500 truncate mb-2">{item.name}</p>
                          <p className="text-[10px] text-slate-400 border-t pt-2">{item.timestamp}</p>
                      </div>
                  </div>
              ))}
               {currentItems.length === 0 && (
                  <div className="col-span-full py-12 text-center text-slate-400 italic">
                      Carpeta vacía.
                  </div>
              )}
          </div>
      )}

      {/* Capture/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
                <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        {editingId ? <Pencil size={20}/> : <Camera size={20} />}
                        {editingId ? 'Editar Entrada' : 'Nueva Entrada'}
                    </h3>
                    <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 p-1"><X size={24}/></button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Form Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cliente</label>
                            <input 
                                type="text" 
                                list="gallery-client-list"
                                value={newClient}
                                onChange={(e) => setNewClient(e.target.value)}
                                className="w-full border rounded px-3 py-2 text-sm" 
                                placeholder="Ej: Laboratorios X"
                            />
                            <datalist id="gallery-client-list">
                                {uniqueClients.map(c => <option key={c} value={c} />)}
                            </datalist>
                        </div>
                        <div>
                             <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Producto / Familia</label>
                             <input 
                                type="text" 
                                list="gallery-product-list"
                                value={newProduct}
                                onChange={(e) => setNewProduct(e.target.value)}
                                className="w-full border rounded px-3 py-2 text-sm" 
                                placeholder="Ej: Jarabe Infantil"
                            />
                             <datalist id="gallery-product-list">
                                {uniqueProducts.map(p => <option key={p} value={p} />)}
                            </datalist>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Código Artículo</label>
                            <input 
                                type="text" 
                                value={newCode}
                                onChange={(e) => setNewCode(e.target.value)}
                                className="w-full border rounded px-3 py-2 text-sm font-mono" 
                                placeholder="Ej: REF-2024"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre Artículo</label>
                            <input 
                                type="text" 
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                className="w-full border rounded px-3 py-2 text-sm" 
                                placeholder="Ej: Tapa Blanca"
                            />
                        </div>
                    </div>

                    {/* Camera Area */}
                    <div className="bg-slate-900 rounded-lg overflow-hidden relative aspect-video flex items-center justify-center">
                        {!isCameraActive ? (
                            <div className="text-center flex flex-col items-center p-6 w-full">
                                {cameraError ? (
                                    <div className="bg-red-500/10 border border-red-500/30 text-red-200 p-4 rounded-lg mb-6 max-w-md">
                                        <div className="flex items-center justify-center gap-2 mb-2 text-red-400">
                                            <AlertCircle size={20} />
                                            <span className="font-bold">Error de Acceso</span>
                                        </div>
                                        <p className="text-sm mb-2">{cameraError}</p>
                                        <p className="text-xs text-red-300/70">Asegúrese de usar HTTPS y dar permisos.</p>
                                    </div>
                                ) : (
                                    <div className="mb-6 flex flex-col items-center">
                                        <div className="bg-slate-800 p-4 rounded-full mb-4">
                                            <CameraOff size={32} className="text-slate-500" />
                                        </div>
                                        <p className="text-slate-300 font-medium mb-1">Cámara Desactivada</p>
                                        <p className="text-slate-500 text-sm max-w-xs">
                                            {editingId 
                                                ? "Para reemplazar la imagen, inicie la cámara o suba un archivo." 
                                                : "Pulse el botón para activar la cámara y tomar fotos."}
                                        </p>
                                    </div>
                                )}
                                
                                <div className="flex flex-wrap justify-center gap-3">
                                  <button 
                                      onClick={startCamera} 
                                      className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-full flex items-center gap-2 font-medium transition-all shadow-lg hover:shadow-brand-500/25"
                                  >
                                      <Camera size={18}/> 
                                      {cameraError ? 'Reintentar Cámara' : 'Iniciar Cámara'}
                                  </button>
                                  <button 
                                      onClick={() => fileInputRef.current?.click()}
                                      className="bg-slate-700 hover:bg-slate-600 text-white px-5 py-2.5 rounded-full flex items-center gap-2 font-medium transition-all"
                                  >
                                      <Upload size={18}/> Subir Archivo
                                  </button>
                                  <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    accept="image/*" 
                                    multiple 
                                    onChange={handleFileUpload} 
                                  />
                                </div>
                            </div>
                        ) : (
                            <>
                                <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted></video>
                                <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                                    <button 
                                        onClick={captureImage}
                                        className="bg-white/20 hover:bg-white/40 p-1 rounded-full backdrop-blur-sm transition-all transform active:scale-95"
                                    >
                                        <div className="bg-white w-14 h-14 rounded-full border-4 border-slate-900/50 flex items-center justify-center">
                                            <Aperture className="text-slate-900" size={24}/>
                                        </div>
                                    </button>
                                </div>
                            </>
                        )}
                        <canvas ref={canvasRef} className="hidden"></canvas>
                    </div>

                    {/* Thumbnails */}
                    {capturedImages.length > 0 && (
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase mb-2">Capturas Nuevas ({capturedImages.length})</p>
                            <div className="flex gap-2 overflow-x-auto pb-2">
                                {capturedImages.map((img, idx) => (
                                    <div key={idx} className="relative shrink-0 w-20 h-20 rounded border border-slate-200 overflow-hidden group">
                                        <img src={img} className="w-full h-full object-cover" />
                                        <button 
                                            onClick={() => removeCapturedImage(idx)}
                                            className="absolute top-0 right-0 bg-red-500 text-white p-0.5 opacity-0 group-hover:opacity-100"
                                        >
                                            <X size={12}/>
                                        </button>
                                        <div className="absolute bottom-0 left-0 bg-black/60 text-white text-[10px] px-1">{idx + 1}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t bg-slate-50 flex justify-end gap-3">
                    <button onClick={closeModal} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded text-sm">Cancelar</button>
                    <button 
                        onClick={handleSaveEntry}
                        disabled={!editingId && capturedImages.length === 0}
                        className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded shadow-sm text-sm font-medium flex items-center gap-2"
                    >
                        <Save size={18} />
                        {editingId ? 'Actualizar Registro' : 'Guardar Registro'}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default WarehouseGallery;