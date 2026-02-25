import React, { useState, useEffect } from 'react';
import { AppState, ProjectMetadata, PackagingComponent, BatchSimulationItem, BoxLabelSimulationData, LabelPositioningData, SavedRequest, WarehouseItem } from './types';
import ComponentUploader from './components/ComponentUploader';
import BatchSimulator from './components/BatchSimulator';
import LabelPositioner from './components/LabelPositioner';
import FinalProductUploader from './components/FinalProductUploader';
import DocumentPreview from './components/DocumentPreview';
import WarehouseGallery from './components/WarehouseGallery';
import { Printer, Layout, CheckCircle, ChevronRight, PenTool, AlertCircle, Save, FolderOpen, Trash2, X, Images, FilePlus, FileText } from 'lucide-react';

const INITIAL_METADATA: ProjectMetadata = {
  clientName: '',
  productName: '',
  orderNumber: '',
  batchCode: '',
  productionDate: new Date().toISOString().split('T')[0],
  preparedBy: '',
  observations: ''
};

const INITIAL_BATCH_SIMULATION: BatchSimulationItem = {
  id: '1',
  name: 'Vista Principal',
  baseImageUrl: null,
  batchCode: '', 
  legalText: '',
  positionX: 50,
  positionY: 50,
  fontSize: 5, 
  rotation: 0,
  textColor: '#000000',
  isLaser: false,
  aspectRatio: 4/3
};

const INITIAL_BOX_SIMULATION: BoxLabelSimulationData = {
  boxImageUrl: null,
  labelConfig: {
      widthMm: 100,
      heightMm: 100, // Updated to 100
      elements: []
  },
  positionX: 50,
  positionY: 50,
  scale: 100, 
  rotation: 0
};

const INITIAL_LABEL_POSITIONING: LabelPositioningData = {
    imageUrl: null,
    guideY: 85,
    instruction: 'Altura etiqueta',
    measurement: '12mm +-1 desde la base',
    showGuide: true
};

function App() {
  const [activeTab, setActiveTab] = useState<'edit' | 'preview' | 'gallery' | 'drafts_list'>('edit');
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [savedRequests, setSavedRequests] = useState<SavedRequest[]>([]);
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);
  
  // App State
  const [metadata, setMetadata] = useState<ProjectMetadata>(INITIAL_METADATA);
  const [components, setComponents] = useState<PackagingComponent[]>([]);
  const [batchSimulations, setBatchSimulations] = useState<BatchSimulationItem[]>([INITIAL_BATCH_SIMULATION]);
  const [labelPositioning, setLabelPositioning] = useState<LabelPositioningData>(INITIAL_LABEL_POSITIONING);
  const [boxLabelSimulation, setBoxLabelSimulation] = useState<BoxLabelSimulationData>(INITIAL_BOX_SIMULATION);
  const [finalImages, setFinalImages] = useState<string[]>([]);
  
  // Warehouse Gallery State
  const [warehouseItems, setWarehouseItems] = useState<WarehouseItem[]>([]);

  // Autocomplete Data
  const [uniqueClients, setUniqueClients] = useState<string[]>([]);
  const [uniqueProducts, setUniqueProducts] = useState<string[]>([]);

  // Validation State
  const [errors, setErrors] = useState<Partial<Record<keyof ProjectMetadata, string>>>({});

  // Load saved requests on mount
  useEffect(() => {
    const saved = localStorage.getItem('packaging_requests');
    if (saved) {
      try {
        setSavedRequests(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved requests");
      }
    }

    const savedGallery = localStorage.getItem('warehouse_gallery');
    if (savedGallery) {
        try {
            setWarehouseItems(JSON.parse(savedGallery));
        } catch (e) {
            console.error("Failed to parse warehouse gallery");
        }
    }
  }, []);

  // Compute Autocomplete Lists
  useEffect(() => {
    const clients = new Set<string>();
    const products = new Set<string>();

    savedRequests.forEach(req => {
        if (req.state.metadata.clientName) clients.add(req.state.metadata.clientName);
        if (req.state.metadata.productName) products.add(req.state.metadata.productName);
    });

    setUniqueClients(Array.from(clients).sort());
    setUniqueProducts(Array.from(products).sort());
  }, [savedRequests]);

  // Persist Warehouse Gallery changes
  useEffect(() => {
    try {
      localStorage.setItem('warehouse_gallery', JSON.stringify(warehouseItems));
    } catch (e) {
      console.warn("Storage quota exceeded. Gallery item might not be saved.", e);
      alert("Atención: El almacenamiento local está lleno. Es posible que las últimas imágenes de la galería no se guarden permanentemente.");
    }
  }, [warehouseItems]);

  // Persist Requests
  useEffect(() => {
    try {
      localStorage.setItem('packaging_requests', JSON.stringify(savedRequests));
    } catch (e) {
      console.warn("Storage quota exceeded for requests.", e);
    }
  }, [savedRequests]);

  const handleMetadataChange = (field: keyof ProjectMetadata, value: string) => {
    setMetadata(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ProjectMetadata, string>> = {};
    let isValid = true;

    if (!metadata.clientName.trim()) { newErrors.clientName = 'Requerido'; isValid = false; }
    if (!metadata.productName.trim()) { newErrors.productName = 'Requerido'; isValid = false; }
    if (!metadata.orderNumber.trim()) { newErrors.orderNumber = 'Requerido'; isValid = false; }
    if (!metadata.batchCode.trim()) { newErrors.batchCode = 'Requerido'; isValid = false; }
    if (!metadata.productionDate.trim()) { newErrors.productionDate = 'Requerido'; isValid = false; }
    if (!metadata.preparedBy.trim()) { newErrors.preparedBy = 'Requerido'; isValid = false; }

    setErrors(newErrors);
    return isValid;
  };

  const constructAppState = (): AppState => ({
    step: 0,
    metadata,
    components,
    batchSimulations,
    labelPositioning,
    boxLabelSimulation,
    finalProductImages: finalImages
  });

  const saveToLocalStorage = () => {
    const currentState = constructAppState();
    const now = new Date().toLocaleString();
    
    // Allow saving incomplete drafts. Generate a name if fields are missing.
    const client = metadata.clientName || 'Sin Cliente';
    const product = metadata.productName || 'Sin Producto';
    const draftName = (metadata.clientName && metadata.productName) 
        ? `${client} - ${product}`
        : `Borrador (${now})`;

    if (currentRequestId) {
        // UPDATE EXISTING DRAFT
        const updatedRequests = savedRequests.map(req => {
            if (req.id === currentRequestId) {
                return {
                    ...req,
                    name: draftName,
                    date: now,
                    state: currentState
                };
            }
            return req;
        });
        setSavedRequests(updatedRequests);
        alert("Borrador actualizado correctamente.");
    } else {
        // CREATE NEW DRAFT
        const newId = Math.random().toString(36).substr(2, 9);
        const newSave: SavedRequest = {
            id: newId,
            name: draftName,
            date: now,
            state: currentState
        };

        const updatedSaves = [newSave, ...savedRequests];
        setSavedRequests(updatedSaves);
        setCurrentRequestId(newId);
        alert("Borrador guardado correctamente. Puede recuperarlo desde 'Cargar'.");
    }
  };

  const loadFromLocalStorage = (save: SavedRequest) => {
      const state = save.state;
      // Add fallbacks to prevent crashes with old saves
      setMetadata(state.metadata || INITIAL_METADATA);
      setComponents(state.components || []);
      setBatchSimulations(state.batchSimulations || [INITIAL_BATCH_SIMULATION]);
      setLabelPositioning(state.labelPositioning || INITIAL_LABEL_POSITIONING);
      setBoxLabelSimulation(state.boxLabelSimulation || INITIAL_BOX_SIMULATION);
      setFinalImages(state.finalProductImages || []);
      
      setCurrentRequestId(save.id); // Set the active ID so we can update it later
      setShowLoadModal(false);
      setActiveTab('edit');
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteSavedRequest = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if(window.confirm("¿Está seguro de que desea eliminar este borrador permanentemente?")) {
        const updated = savedRequests.filter(r => r.id !== id);
        setSavedRequests(updated);
        // If we deleted the active draft, clear the current ID
        if (currentRequestId === id) {
            setCurrentRequestId(null);
        }
      }
  };

  const resetProject = () => {
      if(window.confirm("¿Iniciar una nueva solicitud vacía? Los cambios no guardados se perderán.")) {
          setMetadata(INITIAL_METADATA);
          setComponents([]);
          setBatchSimulations([INITIAL_BATCH_SIMULATION]);
          setLabelPositioning(INITIAL_LABEL_POSITIONING);
          setBoxLabelSimulation(INITIAL_BOX_SIMULATION);
          setFinalImages([]);
          setCurrentRequestId(null);
          setActiveTab('edit');
          window.scrollTo({ top: 0, behavior: 'smooth' });
      }
  };

  const handlePreviewRequest = () => {
    if (validateForm()) {
      setActiveTab('preview');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Allow previewing incomplete forms for drafts
      if(confirm("Faltan campos obligatorios. ¿Desea ver la vista previa de todas formas (borrador)?")) {
          setActiveTab('preview');
          window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  // Switch to Draft List View and auto-print
  const handlePrintDraftsList = () => {
    setActiveTab('drafts_list');
    setTimeout(() => {
        window.print();
    }, 500);
  };

  // Native Window Print for Documents
  const handlePrint = () => {
    if (activeTab !== 'preview') {
       setActiveTab('preview');
       setTimeout(() => window.print(), 500);
    } else {
       window.print();
    }
  };

  const appState: AppState = {
    step: 0,
    metadata,
    components,
    batchSimulations,
    labelPositioning,
    boxLabelSimulation,
    finalProductImages: finalImages
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <nav className="bg-slate-900 text-white shadow-lg sticky top-0 z-50 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="bg-brand-500 p-1.5 rounded-lg">
                <PenTool size={20} className="text-white" />
              </div>
              <span className="font-bold text-lg tracking-tight hidden md:inline">Solicitud Autorización Envasado</span>
              <span className="font-bold text-lg tracking-tight md:hidden">SAE Tool</span>
            </div>
            
            <div className="flex items-center gap-2">
               {/* Save / Load Buttons */}
               {activeTab === 'edit' && (
                 <>
                  <button onClick={resetProject} className="flex items-center gap-1 px-3 py-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors text-sm" title="Nuevo Borrador">
                      <FilePlus size={18} /> <span className="hidden sm:inline">Nuevo</span>
                  </button>
                  <button onClick={saveToLocalStorage} className="flex items-center gap-1 px-3 py-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors text-sm" title={currentRequestId ? "Actualizar Borrador" : "Guardar Borrador"}>
                      <Save size={18} /> <span className="hidden sm:inline">{currentRequestId ? 'Actualizar' : 'Guardar'}</span>
                  </button>
                  <button onClick={() => setShowLoadModal(true)} className="flex items-center gap-1 px-3 py-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors text-sm mr-2" title="Cargar Borrador">
                      <FolderOpen size={18} /> <span className="hidden sm:inline">Cargar</span>
                  </button>
                  {/* NEW BUTTON FOR DRAFTS PDF */}
                  <button onClick={handlePrintDraftsList} className="flex items-center gap-1 px-3 py-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors text-sm mr-4" title="PDF Borradores">
                      <FileText size={18} /> <span className="hidden sm:inline">Listado PDF</span>
                  </button>
                 </>
               )}

              <button
                onClick={() => setActiveTab('edit')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'edit' 
                    ? 'bg-slate-700 text-white' 
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Layout size={18} />
                <span className="hidden sm:inline">Editor</span>
              </button>
              
              <button
                onClick={() => setActiveTab('gallery')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'gallery' 
                    ? 'bg-slate-700 text-white' 
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Images size={18} />
                <span className="hidden sm:inline">Galería Almacén</span>
              </button>

              <button
                onClick={handlePreviewRequest}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'preview' 
                    ? 'bg-brand-600 text-white' 
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <CheckCircle size={18} />
                <span className="hidden sm:inline">Vista Previa</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {activeTab === 'edit' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <span className="bg-slate-100 text-slate-500 text-sm px-2 py-1 rounded">Info</span>
                Datos del Proyecto
                {currentRequestId && <span className="text-xs font-normal text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-200">Editando Borrador Guardado</span>}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cliente <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    list="client-list"
                    value={metadata.clientName}
                    onChange={(e) => handleMetadataChange('clientName', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-brand-500 focus:border-brand-500 ${errors.clientName ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300'}`}
                    placeholder="Nombre del Cliente"
                  />
                  <datalist id="client-list">
                      {uniqueClients.map(c => <option key={c} value={c} />)}
                  </datalist>
                  {errors.clientName && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12}/> {errors.clientName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Producto <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    list="product-list"
                    value={metadata.productName}
                    onChange={(e) => handleMetadataChange('productName', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-brand-500 focus:border-brand-500 ${errors.productName ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300'}`}
                    placeholder="Nombre del Producto"
                  />
                   <datalist id="product-list">
                      {uniqueProducts.map(p => <option key={p} value={p} />)}
                  </datalist>
                  {errors.productName && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12}/> {errors.productName}</p>}
                </div>
                 <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nº Pedido / OT <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={metadata.orderNumber}
                    onChange={(e) => handleMetadataChange('orderNumber', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-brand-500 focus:border-brand-500 ${errors.orderNumber ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300'}`}
                    placeholder="Referencia Interna"
                  />
                  {errors.orderNumber && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12}/> {errors.orderNumber}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1 bg-yellow-50 px-1 rounded w-fit">Lote / Batch <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={metadata.batchCode}
                    onChange={(e) => handleMetadataChange('batchCode', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-brand-500 focus:border-brand-500 font-mono ${errors.batchCode ? 'border-red-500 ring-1 ring-red-500' : 'border-yellow-300'}`}
                    placeholder="LOTE12345"
                  />
                  {errors.batchCode && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12}/> {errors.batchCode}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Producción <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    value={metadata.productionDate}
                    onChange={(e) => handleMetadataChange('productionDate', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-brand-500 focus:border-brand-500 ${errors.productionDate ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300'}`}
                  />
                  {errors.productionDate && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12}/> {errors.productionDate}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Preparado por <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={metadata.preparedBy}
                    onChange={(e) => handleMetadataChange('preparedBy', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-brand-500 focus:border-brand-500 ${errors.preparedBy ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300'}`}
                    placeholder="Tu nombre"
                  />
                  {errors.preparedBy && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12}/> {errors.preparedBy}</p>}
                </div>
              </div>
              
              <div className="mt-4">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Observaciones Generales</label>
                  <textarea
                    value={metadata.observations}
                    onChange={(e) => handleMetadataChange('observations', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md focus:ring-brand-500 focus:border-brand-500 h-20 text-sm"
                    placeholder="Notas adicionales..."
                  />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <ComponentUploader 
                  components={components} 
                  setComponents={setComponents} 
                  warehouseItems={warehouseItems} 
                />
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <BatchSimulator 
                  simulations={batchSimulations} 
                  setSimulations={setBatchSimulations} 
                />
            </div>

            {/* NEW SECTION: Label Positioning */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <LabelPositioner 
                  data={labelPositioning} 
                  setData={setLabelPositioning} 
                />
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <FinalProductUploader 
                  images={finalImages} 
                  setImages={setFinalImages}
                  boxSimulation={boxLabelSimulation}
                  setBoxSimulation={setBoxLabelSimulation}
                  metadata={metadata}
                  batchCode={metadata.batchCode}
                />
            </div>

            <div className="flex justify-end pt-4">
                <button
                    onClick={handlePreviewRequest}
                    className="bg-brand-600 text-white px-6 py-3 rounded-full shadow-lg hover:bg-brand-700 transition-all flex items-center gap-2 font-medium"
                >
                    Ver Resultado Final
                    <ChevronRight size={20} />
                </button>
            </div>
          </div>
        )}

        {activeTab === 'gallery' && (
            <div className="animate-in fade-in duration-500">
                <WarehouseGallery items={warehouseItems} setItems={setWarehouseItems} />
            </div>
        )}

        {/* PRINTABLE DRAFTS LIST VIEW */}
        {activeTab === 'drafts_list' && (
            <div className="drafts-list-print-container animate-in fade-in duration-500 bg-white min-h-screen p-8 max-w-5xl mx-auto shadow-xl">
                 <div className="flex justify-between items-center mb-8 border-b-2 border-slate-800 pb-4">
                    <div>
                        <h1 className="text-3xl font-bold uppercase tracking-wide text-slate-900">Listado de Borradores</h1>
                        <p className="text-slate-500 mt-1">Histórico de Solicitudes Guardadas</p>
                    </div>
                    <div className="text-right text-sm text-slate-500">
                        <p><strong>Fecha Reporte:</strong> {new Date().toLocaleDateString()}</p>
                        <p><strong>Total Registros:</strong> {savedRequests.length}</p>
                    </div>
                 </div>

                 {savedRequests.length === 0 ? (
                     <div className="text-center py-20 text-slate-400 italic border-2 border-dashed border-slate-200 rounded-xl">
                         No hay borradores guardados en el sistema.
                     </div>
                 ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-100 border-b-2 border-slate-300">
                                    <th className="p-4 font-bold text-slate-700">Nombre del Proyecto</th>
                                    <th className="p-4 font-bold text-slate-700">Fecha Guardado</th>
                                    <th className="p-4 font-bold text-slate-700">Cliente</th>
                                    <th className="p-4 font-bold text-slate-700">Producto</th>
                                    <th className="p-4 font-bold text-slate-700">Lote</th>
                                </tr>
                            </thead>
                            <tbody>
                                {savedRequests.map((req, idx) => (
                                    <tr key={req.id} className={`border-b border-slate-200 hover:bg-slate-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                                        <td className="p-4 font-medium text-brand-700">{req.name}</td>
                                        <td className="p-4 text-slate-500 text-sm">{req.date}</td>
                                        <td className="p-4 text-slate-700">{req.state.metadata.clientName || '-'}</td>
                                        <td className="p-4 text-slate-700">{req.state.metadata.productName || '-'}</td>
                                        <td className="p-4 font-mono text-sm">{req.state.metadata.batchCode || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                 )}

                 <div className="mt-12 text-center no-print flex justify-center gap-4">
                    <button onClick={() => setActiveTab('edit')} className="px-6 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-medium transition-colors">
                        Volver al Editor
                    </button>
                    <button onClick={() => window.print()} className="px-6 py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-medium shadow-lg flex items-center gap-2 transition-colors">
                        <Printer size={20} />
                        Imprimir Listado
                    </button>
                </div>
            </div>
        )}

        {activeTab === 'preview' && (
          <div className="animate-in slide-in-from-bottom-4 duration-500 pb-12">
            {/* Toolbar */}
            <div className="mb-6 flex justify-between items-center max-w-[210mm] mx-auto no-print">
               <h2 className="text-2xl font-bold text-slate-800">Vista Previa</h2>
               <div className="flex gap-4">
                 <button
                    onClick={() => setActiveTab('edit')}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-md transition-colors"
                 >
                    Seguir Editando
                 </button>
                 <button
                    onClick={handlePrint}
                    className="bg-brand-600 text-white px-4 py-2 rounded-md shadow hover:bg-brand-700 flex items-center gap-2"
                 >
                    <Printer size={18} />
                    Imprimir / Guardar PDF
                 </button>
               </div>
            </div>
            
            <DocumentPreview state={appState} />

            {/* NEW BOTTOM PRINT BUTTON */}
            <div className="mt-8 flex justify-center max-w-[210mm] mx-auto no-print">
                <button
                    onClick={handlePrint}
                    className="bg-slate-900 text-white px-8 py-4 rounded-full shadow-xl hover:bg-slate-800 flex items-center gap-3 font-bold text-lg transition-all hover:-translate-y-1"
                >
                    <Printer size={24} />
                    Imprimir o Guardar como PDF
                </button>
            </div>
          </div>
        )}
      </main>

      {/* Load Modal */}
      {showLoadModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] animate-in fade-in duration-200 p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                  <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                      <h3 className="font-bold text-lg text-slate-700">Cargar Borrador</h3>
                      <button onClick={() => setShowLoadModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                  </div>
                  <div className="p-4 max-h-[60vh] overflow-y-auto">
                      {savedRequests.length === 0 ? (
                          <div className="text-center py-8 text-slate-400 text-sm">No hay borradores guardados.</div>
                      ) : (
                          <div className="space-y-2">
                              {savedRequests.map(save => (
                                  <div key={save.id} className="flex items-center justify-between p-3 border rounded hover:bg-slate-50 transition-colors">
                                      <div className="cursor-pointer flex-1" onClick={() => loadFromLocalStorage(save)}>
                                          <p className="font-bold text-slate-800 text-sm">{save.name}</p>
                                          <p className="text-xs text-slate-500">{save.date}</p>
                                      </div>
                                      <button onClick={(e) => deleteSavedRequest(save.id, e)} className="p-2 text-slate-400 hover:text-red-500"><Trash2 size={16}/></button>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}

export default App;