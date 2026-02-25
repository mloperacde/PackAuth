

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { LabelConfig, LabelElement, LabelElementType, ProjectMetadata } from '../types';
import { Type, Plus, Trash2, Bold, Barcode, ScanLine, Square, RotateCw, Undo, Redo, LayoutTemplate, AlignLeft, AlignCenter, AlignRight, AlignVerticalJustifyCenter, AlignStartVertical, AlignEndVertical, Scaling, Eye, EyeOff, Settings, Wand2, X, Check } from 'lucide-react';

// Declare JsBarcode for TS
declare const JsBarcode: any;

interface ZebraLabelEditorProps {
  labelConfig: LabelConfig;
  setLabelConfig: React.Dispatch<React.SetStateAction<LabelConfig>>;
  metadata: ProjectMetadata;
  batchCode: string;
}

// Helper to render real barcode - Exported for use in other components
export const RealBarcode: React.FC<{ 
    value: string; 
    width?: number; 
    height?: number; 
    showText?: boolean;
    format?: string;
    fontSize?: number;
}> = ({ 
    value, 
    width, 
    height, 
    showText = true, 
    format = 'CODE128',
    fontSize = 14
}) => {
    const svgRef = useRef<SVGSVGElement>(null);
    // Unique ID for this barcode instance to prevent DOM conflicts if needed
    const barcodeId = useRef(`bc-${Math.random().toString(36).substr(2, 9)}`);

    useEffect(() => {
        if (svgRef.current && typeof JsBarcode !== 'undefined') {
            const render = (fmt: string) => {
                 // Reset viewBox to allow recalculation
                 svgRef.current?.removeAttribute('viewBox');
                 
                 JsBarcode(svgRef.current, value || '12345', {
                    format: fmt,
                    width: 1, // Base unit width. We rely on SVG scaling to stretch this to the container width.
                    height: 100, // High internal resolution for height. We rely on CSS to squash/stretch this.
                    displayValue: showText,
                    margin: 0, // No margin, we want to fill the user's box exactly
                    background: "transparent",
                    fontSize: fontSize, 
                    textMargin: 0,
                    fontOptions: "bold",
                    flat: false 
                });

                const svg = svgRef.current;
                
                // JsBarcode sets explicit width/height attributes based on the generated bars.
                // We must capture these to set the viewBox, then remove them to allow
                // the SVG to scale responsively to the parent container's size.
                const gW = svg?.getAttribute('width');
                const gH = svg?.getAttribute('height');

                if (svg && gW && gH) {
                    svg.setAttribute('viewBox', `0 0 ${gW} ${gH}`);
                    svg.style.width = '100%';
                    svg.style.height = '100%';
                    svg.removeAttribute('width');
                    svg.removeAttribute('height');
                }
            };

            try {
                render(format);
            } catch (e) {
                // Fallback mechanism for format errors (e.g. chars in numeric-only formats)
                if (format !== 'CODE128') {
                    try {
                         render('CODE128');
                    } catch (e2) {
                        console.error("Barcode fallback rendering failed", e2);
                    }
                } else {
                    console.error("Barcode rendering failed", e);
                }
            }
        }
    }, [value, showText, format, fontSize, width, height]);

    return (
        <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
            <svg 
                id={barcodeId.current}
                ref={svgRef} 
                style={{ 
                    width: '100%', 
                    height: '100%', 
                    display: 'block',
                }} 
                // preserveAspectRatio="none" forces the barcode (viewBox) to stretch 
                // to exactly match the width and height of this container.
                preserveAspectRatio="none" 
            ></svg>
        </div>
    );
};

const ZebraLabelEditor: React.FC<ZebraLabelEditorProps> = ({ 
  labelConfig, 
  setLabelConfig, 
  metadata,
  batchCode 
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [interactionMode, setInteractionMode] = useState<'none' | 'drag' | 'resize'>('none');
  const editorRef = useRef<HTMLDivElement>(null);
  
  // Wizard State
  const [showWizard, setShowWizard] = useState(false);
  const [wizardData, setWizardData] = useState({
      units: '',
      reference: '',
      article: '',
      batch: '',
      client: 'ANTONIO PUIG S.A.',
      destination: 'BARCELONA',
      ean: ''
  });
  
  // Snapping Lines
  const [snapLines, setSnapLines] = useState<{ x?: number, y?: number }>({});

  const [history, setHistory] = useState<LabelConfig[]>([]);
  const [future, setFuture] = useState<LabelConfig[]>([]);

  const saveToHistory = useCallback(() => {
    setHistory(prev => [...prev, labelConfig]);
    setFuture([]);
  }, [labelConfig]);

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    const newHistory = history.slice(0, -1);
    
    setFuture(prev => [labelConfig, ...prev]);
    setHistory(newHistory);
    setLabelConfig(previous);
  }, [history, labelConfig, setLabelConfig]);

  const handleRedo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    const newFuture = future.slice(1);

    setHistory(prev => [...prev, labelConfig]);
    setFuture(newFuture);
    setLabelConfig(next);
  }, [future, labelConfig, setLabelConfig]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) handleRedo();
        else handleUndo();
        e.preventDefault();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        handleRedo();
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Pre-fill wizard data when opening if empty
  useEffect(() => {
      if (showWizard) {
          setWizardData(prev => ({
              ...prev,
              reference: prev.reference || metadata.orderNumber || '',
              article: prev.article || metadata.productName || '',
              batch: prev.batch || batchCode || '',
              ean: prev.ean || batchCode || '' // Assuming batchCode might be EAN, user can change
          }));
      }
  }, [showWizard, metadata, batchCode]);

  const PIXELS_PER_MM = 4;
  const SNAP_THRESHOLD_PX = 8; // Snap distance in pixels

  const generateLabelFromWizard = () => {
    saveToHistory();

    const width = 100;
    const height = 100; 
    const midY = 50; 
    
    const elements: LabelElement[] = [
        // 1. Frame (Top Half)
        {
            id: 'wiz-frame', type: 'box', text: '', value: '',
            x: 1, y: 1, width: width - 2, height: midY - 2,
            borderThickness: 2, fontSize: 0, isBold: false, rotation: 0
        },
        // 2. Units (Top Left)
        {
            id: 'wiz-units', type: 'text', text: `${wizardData.units || 'XXX'} PZ`, value: '',
            x: 3, y: 4, fontSize: 15, isBold: true, rotation: 0, textAlign: 'left'
        },
        // 3. Reference (Top Right)
        {
            id: 'wiz-ref', type: 'text', text: `REF: ${wizardData.reference}`, value: '',
            x: 97, y: 4, fontSize: 15, isBold: true, rotation: 0, textAlign: 'right'
        },
        // 4. Article (Left Aligned as requested)
        {
            id: 'wiz-art', type: 'text', text: wizardData.article || 'ARTICULO', value: '',
            x: 3, y: 16, fontSize: 15, isBold: true, rotation: 0, textAlign: 'left'
        },
        // 5. Batch (Left Aligned below article)
        {
            id: 'wiz-batch', type: 'text', text: `LOTE: ${wizardData.batch}`, value: '',
            x: 3, y: 24, fontSize: 15, isBold: true, rotation: 0, textAlign: 'left'
        },
        // 6. Client (Bottom Left)
        {
            id: 'wiz-client', type: 'text', text: wizardData.client, value: '',
            x: 3, y: 42, fontSize: 15, isBold: true, rotation: 0, textAlign: 'left'
        },
        // 7. Destination (Bottom Right)
        {
            id: 'wiz-dest', type: 'text', text: wizardData.destination, value: '',
            x: 97, y: 42, fontSize: 15, isBold: true, rotation: 0, textAlign: 'right'
        },
        // 8. Barcode (Bottom Half)
        {
            id: 'wiz-ean', type: 'barcode', text: wizardData.ean || '12345678', value: '',
            x: 10, y: midY + 5, width: 80, height: 40, fontSize: 12, isBold: false, rotation: 0,
            barcodeFormat: 'CODE128', showText: true, textAlign: 'center'
        }
    ];

    setLabelConfig({
        widthMm: width,
        heightMm: height,
        elements: elements
    });
    setShowWizard(false);
  };

  const applyStandardLayout = () => {
    if(!window.confirm("¿Aplicar plantilla estándar? Esto reemplazará el diseño actual.")) return;
    
    saveToHistory();

    const width = 100;
    const height = 100;
    const midY = 50; 
    
    const standardElements: LabelElement[] = [
        // 1. Outer Frame (Top Half)
        {
            id: 'std-frame', type: 'box', text: '', value: '',
            x: 1, y: 1, width: width - 2, height: midY - 2,
            borderThickness: 2, fontSize: 0, isBold: false, rotation: 0
        },
        
        // 2. Units
        {
            id: 'std-units', type: 'text', text: '100 PZA', value: '',
            x: 3, y: 4, fontSize: 15, isBold: true, rotation: 0, textAlign: 'left'
        },

        // 3. Reference
        {
            id: 'std-lbl-ref', type: 'text', text: 'REF: 000000', value: '',
            x: 97, y: 4, fontSize: 15, isBold: true, rotation: 0, textAlign: 'right'
        },

        // 4. Product / Article (Left Aligned)
        {
            id: 'std-field-product', type: 'field', text: 'Producto', value: '',
            x: 3, y: 16, fontSize: 15, isBold: true, rotation: 0, textAlign: 'left'
        },

        // 5. Batch (Left Aligned)
        {
            id: 'std-batch', type: 'text', text: `LOTE: ${batchCode || '00000'}`, value: '',
            x: 3, y: 24, fontSize: 15, isBold: true, rotation: 0, textAlign: 'left'
        },

        // 6. Client
        {
            id: 'std-field-client', type: 'field', text: 'Cliente', value: '',
            x: 3, y: 42, fontSize: 15, isBold: true, rotation: 0, textAlign: 'left'
        },

        // 7. Barcelona
        {
            id: 'std-barcelona', type: 'text', text: 'BARCELONA', value: '',
            x: 97, y: 42, fontSize: 15, isBold: true, rotation: 0, textAlign: 'right'
        },

        // 8. Barcode
        {
            id: 'std-barcode', type: 'barcode', text: batchCode || '12345678', value: '',
            x: 10, y: midY + 5, width: 80, height: 40, fontSize: 12, isBold: false, rotation: 0,
            barcodeFormat: 'CODE128', showText: true, textAlign: 'center'
        }
    ];

    setLabelConfig({
        widthMm: width,
        heightMm: height,
        elements: standardElements
    });
  };

  const addElement = (type: LabelElementType, text: string = 'Texto', value: string = '') => {
    saveToHistory();
    const newElement: LabelElement = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      text,
      value,
      x: 5,
      y: 5,
      fontSize: type === 'barcode' ? 12 : 15, // Default 15 for new text
      isBold: true,
      width: type === 'barcode' ? 80 : (type === 'box' ? 50 : undefined), // Default 80 width for barcode
      height: type === 'barcode' ? 40 : (type === 'box' ? 20 : undefined), // Default 40 height for barcode
      borderThickness: type === 'box' ? 2 : undefined,
      rotation: 0,
      barcodeFormat: 'CODE128',
      showText: true,
      textAlign: 'left'
    };
    setLabelConfig(prev => ({ ...prev, elements: [...prev.elements, newElement] }));
    setSelectedId(newElement.id);
  };

  const removeElement = (id: string) => {
    saveToHistory();
    setLabelConfig(prev => ({ ...prev, elements: prev.elements.filter(e => e.id !== id) }));
    if (selectedId === id) setSelectedId(null);
  };

  const updateElement = (id: string, changes: Partial<LabelElement>) => {
    setLabelConfig(prev => ({
      ...prev,
      elements: prev.elements.map(e => {
          if (e.id !== id) return e;
          
          let updated = { ...e, ...changes };
          
          // Constraint: Barcode dimensions limits
          if (updated.type === 'barcode') {
               if (updated.width) {
                  // STRICT LIMIT: Max 80mm
                  const maxWidth = Math.min(labelConfig.widthMm, 80);
                  if (updated.width > maxWidth) {
                      updated.width = maxWidth;
                  }
               }
               if (updated.height) {
                  // STRICT LIMIT: Max 50mm
                  const maxHeight = Math.min(labelConfig.heightMm, 50);
                  if (updated.height > maxHeight) {
                      updated.height = maxHeight;
                  }
               }
          }

          return updated;
      }),
    }));
  };

  const updateElementWithHistory = (id: string, changes: Partial<LabelElement>) => {
      saveToHistory();
      updateElement(id, changes);
  };

  // Alignment Logic
  const alignElement = (id: string, type: 'left' | 'center-x' | 'right' | 'top' | 'center-y' | 'bottom') => {
      if (!editorRef.current) return;
      saveToHistory();
      
      const elNode = document.getElementById(id);
      if (!elNode) return;

      // We need element dimensions in mm to align correctly
      const elWidthPx = elNode.offsetWidth;
      const elHeightPx = elNode.offsetHeight;
      const elWidthMm = elWidthPx / PIXELS_PER_MM;
      const elHeightMm = elHeightPx / PIXELS_PER_MM;

      const labelW = labelConfig.widthMm;
      const labelH = labelConfig.heightMm;

      let newX;
      let newY;

      switch(type) {
          case 'left': newX = 3; break; // 3mm padding based on design
          case 'center-x': newX = (labelW - elWidthMm) / 2; break;
          case 'right': newX = labelW - elWidthMm - 3; break;
          case 'top': newY = 3; break;
          case 'center-y': newY = (labelH - elHeightMm) / 2; break;
          case 'bottom': newY = labelH - elHeightMm - 3; break;
      }

      if (newX !== undefined) updateElement(id, { x: newX });
      if (newY !== undefined) updateElement(id, { y: newY });
  };

  const handleDragStart = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault(); // Prevent text selection
    saveToHistory();
    setSelectedId(id);
    setInteractionMode('drag');
  };

  const handleResizeStart = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    saveToHistory();
    setSelectedId(id);
    setInteractionMode('resize');
  };

  const handleDragEnd = () => {
      setInteractionMode('none');
      setSnapLines({}); // Clear guides
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (interactionMode === 'none' || !selectedId || !editorRef.current) return;
    
    const rect = editorRef.current.getBoundingClientRect();
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;

    if (interactionMode === 'drag') {
        let finalX = rawX;
        let finalY = rawY;
        let snapX = undefined;
        let snapY = undefined;

        // Snapping Logic
        // 1. Snap to Edges
        if (Math.abs(rawX) < SNAP_THRESHOLD_PX) { finalX = 0; snapX = 0; }
        else if (Math.abs(rawX - rect.width) < SNAP_THRESHOLD_PX) { finalX = rect.width; snapX = rect.width; }
        else if (Math.abs(rawX - rect.width / 2) < SNAP_THRESHOLD_PX) { finalX = rect.width / 2; snapX = rect.width / 2; }
        
        if (Math.abs(rawY) < SNAP_THRESHOLD_PX) { finalY = 0; snapY = 0; }
        else if (Math.abs(rawY - rect.height) < SNAP_THRESHOLD_PX) { finalY = rect.height; snapY = rect.height; }
        else if (Math.abs(rawY - rect.height / 2) < SNAP_THRESHOLD_PX) { finalY = rect.height / 2; snapY = rect.height / 2; }

        // 2. Snap to other elements (Simple center snapping)
        if (snapX === undefined || snapY === undefined) {
             labelConfig.elements.forEach(el => {
                if (el.id === selectedId) return;
                const elX = el.x * PIXELS_PER_MM;
                const elY = el.y * PIXELS_PER_MM;
                
                if (snapX === undefined && Math.abs(rawX - elX) < SNAP_THRESHOLD_PX) {
                    finalX = elX;
                    snapX = elX;
                }
                if (snapY === undefined && Math.abs(rawY - elY) < SNAP_THRESHOLD_PX) {
                    finalY = elY;
                    snapY = elY;
                }
             });
        }

        setSnapLines({ x: snapX, y: snapY });

        const xMm = Math.max(0, finalX / PIXELS_PER_MM);
        const yMm = Math.max(0, finalY / PIXELS_PER_MM);
        updateElement(selectedId, { x: xMm, y: yMm });
    } else if (interactionMode === 'resize') {
        // Resizing Logic
        const element = labelConfig.elements.find(el => el.id === selectedId);
        if (element) {
            const currentXMm = element.x;
            const currentYMm = element.y;
            const currentXPx = currentXMm * PIXELS_PER_MM;
            const currentYPx = currentYMm * PIXELS_PER_MM;

            const newWidthPx = Math.max(20, rawX - currentXPx); // Minimum width 5mm (20px)
            const newHeightPx = Math.max(20, rawY - currentYPx); // Minimum height 5mm (20px)

            let newWidthMm = newWidthPx / PIXELS_PER_MM;
            let newHeightMm = newHeightPx / PIXELS_PER_MM;

            // Apply Max Limits specifically for Barcode
            if (element.type === 'barcode') {
                newWidthMm = Math.min(newWidthMm, 80);
                newHeightMm = Math.min(newHeightMm, 50);
            }

            updateElement(selectedId, { width: newWidthMm, height: newHeightMm });
        }
    }
  };

  useEffect(() => {
    if (interactionMode !== 'none') {
      window.addEventListener('mouseup', handleDragEnd);
    } else {
      window.removeEventListener('mouseup', handleDragEnd);
    }
    return () => window.removeEventListener('mouseup', handleDragEnd);
  }, [interactionMode]);

  const selectedElement = labelConfig.elements.find(e => e.id === selectedId);

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

  return (
    <div className="flex flex-col gap-6">
        <div className="flex flex-wrap gap-4 items-center justify-between bg-slate-100 p-3 rounded-lg border border-slate-200 shadow-inner">
            <div className="flex gap-2">
                <button onClick={() => setShowWizard(true)} className="flex items-center gap-1 px-3 py-1.5 bg-brand-600 text-white border border-brand-700 rounded hover:bg-brand-700 text-sm font-medium shadow-sm"><Wand2 size={16} /> Asistente Caja</button>
                <button onClick={applyStandardLayout} className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 rounded hover:bg-slate-50 text-slate-700 text-sm font-medium shadow-sm"><LayoutTemplate size={16} /> Plantilla Std</button>
                <div className="w-px h-6 bg-slate-300 mx-2"></div>
                
                <button onClick={() => addElement('text', 'Texto Nuevo')} className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 rounded hover:bg-slate-50 text-sm font-medium"><Type size={16} /> Texto</button>
                <div className="relative group">
                    <button className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 rounded hover:bg-slate-50 text-sm font-medium"><ScanLine size={16} /> Campo <Plus size={12}/></button>
                    <div className="absolute top-full left-0 mt-1 w-40 bg-white border border-slate-200 rounded shadow-lg hidden group-hover:block z-20">
                         <button onClick={() => addElement('field', 'Cliente')} className="block w-full text-left px-4 py-2 hover:bg-slate-50 text-sm">Cliente</button>
                         <button onClick={() => addElement('field', 'Producto')} className="block w-full text-left px-4 py-2 hover:bg-slate-50 text-sm">Producto</button>
                         <button onClick={() => addElement('field', 'Pedido')} className="block w-full text-left px-4 py-2 hover:bg-slate-50 text-sm">Pedido</button>
                    </div>
                </div>
                <button onClick={() => addElement('barcode', '1234567890')} className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 rounded hover:bg-slate-50 text-sm font-medium"><Barcode size={16} /> Código de Barras</button>
                <button onClick={() => addElement('box', '', '')} className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 rounded hover:bg-slate-50 text-sm font-medium"><Square size={16} /> Marco</button>
            </div>

            <div className="flex items-center gap-2 border-l pl-4 border-slate-300">
                <button onClick={handleUndo} disabled={history.length === 0} className={`p-1.5 rounded ${history.length === 0 ? 'text-slate-300' : 'text-slate-600 hover:bg-white hover:text-slate-900 shadow-sm'}`} title="Deshacer (Ctrl+Z)"><Undo size={18} /></button>
                <button onClick={handleRedo} disabled={future.length === 0} className={`p-1.5 rounded ${future.length === 0 ? 'text-slate-300' : 'text-slate-600 hover:bg-white hover:text-slate-900 shadow-sm'}`} title="Rehacer (Ctrl+Y)"><Redo size={18} /></button>
            </div>
            
            <div className="flex items-center gap-2 text-sm ml-auto bg-white px-3 py-1.5 rounded border border-slate-200">
                <span className="text-slate-500 font-medium">Medidas (mm):</span>
                <input type="number" value={labelConfig.widthMm} onChange={(e) => setLabelConfig({...labelConfig, widthMm: Number(e.target.value)})} className="w-16 px-2 py-1 border rounded text-center focus:ring-1 focus:ring-brand-500" />
                <span className="text-slate-400">x</span>
                <input type="number" value={labelConfig.heightMm} onChange={(e) => setLabelConfig({...labelConfig, heightMm: Number(e.target.value)})} className="w-16 px-2 py-1 border rounded text-center focus:ring-1 focus:ring-brand-500" />
            </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
            <div className="w-full lg:w-1/3 bg-white border rounded-lg p-4 shadow-sm h-fit">
                <h3 className="font-semibold text-slate-700 mb-4 pb-2 border-b flex items-center gap-2">
                    <Settings size={18}/> Propiedades
                </h3>
                {selectedElement ? (
                    <div className="space-y-4">
                        {/* Alignment Buttons */}
                        <div>
                             <label className="block text-xs font-medium text-slate-500 mb-2">Alineación en Etiqueta</label>
                             <div className="grid grid-cols-6 gap-1 bg-slate-50 p-1.5 rounded border">
                                <button onClick={() => alignElement(selectedElement.id, 'left')} className="p-1.5 hover:bg-white rounded hover:shadow-sm flex justify-center" title="Alinear Izquierda"><AlignLeft size={16}/></button>
                                <button onClick={() => alignElement(selectedElement.id, 'center-x')} className="p-1.5 hover:bg-white rounded hover:shadow-sm flex justify-center" title="Centrar Horizontalmente"><AlignCenter size={16}/></button>
                                <button onClick={() => alignElement(selectedElement.id, 'right')} className="p-1.5 hover:bg-white rounded hover:shadow-sm flex justify-center" title="Alinear Derecha"><AlignRight size={16}/></button>
                                <div className="w-px h-full bg-slate-200 mx-auto"></div>
                                <button onClick={() => alignElement(selectedElement.id, 'top')} className="p-1.5 hover:bg-white rounded hover:shadow-sm flex justify-center" title="Alinear Arriba"><AlignStartVertical size={16}/></button>
                                <button onClick={() => alignElement(selectedElement.id, 'center-y')} className="p-1.5 hover:bg-white rounded hover:shadow-sm flex justify-center" title="Centrar Verticalmente"><AlignVerticalJustifyCenter size={16}/></button>
                                <button onClick={() => alignElement(selectedElement.id, 'bottom')} className="p-1.5 hover:bg-white rounded hover:shadow-sm flex justify-center" title="Alinear Abajo"><AlignEndVertical size={16}/></button>
                             </div>
                        </div>

                        {selectedElement.type === 'text' && (
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Contenido Texto</label>
                                <textarea value={selectedElement.text} onFocus={saveToHistory} onChange={(e) => updateElement(selectedElement.id, { text: e.target.value })} className="w-full px-3 py-2 border rounded text-sm font-mono" rows={2}/>
                            </div>
                        )}
                        {selectedElement.type === 'barcode' && (
                             <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Código (Numérico/Alfa)</label>
                                    <input type="text" value={selectedElement.text} onFocus={saveToHistory} onChange={(e) => updateElement(selectedElement.id, { text: e.target.value })} className="w-full px-3 py-2 border rounded text-sm font-mono"/>
                                    <p className="text-[10px] text-slate-400 mt-1 text-right">{selectedElement.text.length} caracteres</p>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Formato</label>
                                        <select 
                                            value={selectedElement.barcodeFormat || 'CODE128'} 
                                            onChange={(e) => updateElementWithHistory(selectedElement.id, { barcodeFormat: e.target.value as any })}
                                            className="w-full px-2 py-1.5 border rounded text-xs"
                                        >
                                            <option value="CODE128">Code 128 (Auto)</option>
                                            <option value="CODE39">Code 39</option>
                                            <option value="EAN13">EAN-13</option>
                                            <option value="UPC">UPC</option>
                                        </select>
                                    </div>
                                    <div>
                                         <label className="block text-xs font-medium text-slate-500 mb-1">Mostrar Texto</label>
                                         <button 
                                            onClick={() => updateElementWithHistory(selectedElement.id, { showText: !selectedElement.showText })}
                                            className={`w-full py-1.5 border rounded flex items-center justify-center gap-2 text-xs ${selectedElement.showText !== false ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-slate-600'}`}
                                        >
                                            {selectedElement.showText !== false ? <Eye size={14}/> : <EyeOff size={14}/>}
                                            {selectedElement.showText !== false ? 'Visible' : 'Oculto'}
                                        </button>
                                    </div>
                                </div>
                                
                                {/* LIVE PREVIEW */}
                                <div className="mt-3 p-2 bg-white border border-slate-200 rounded flex flex-col items-center">
                                    <span className="text-[10px] text-slate-400 mb-1 uppercase tracking-wider">Vista Previa (Auto-ajuste)</span>
                                    <div style={{ width: '100%', height: '60px', overflow: 'hidden' }}>
                                         <RealBarcode 
                                            value={selectedElement.text} 
                                            width={selectedElement.width || 40} 
                                            height={selectedElement.height || 15} 
                                            showText={selectedElement.showText !== false}
                                            format={selectedElement.barcodeFormat}
                                            fontSize={selectedElement.fontSize}
                                         />
                                    </div>
                                </div>
                            </div>
                        )}
                        {selectedElement.type === 'field' && (
                            <div className="text-sm text-brand-600 bg-brand-50 p-2 rounded">Vinculado a: <strong>{selectedElement.text}</strong></div>
                        )}
                        {selectedElement.type === 'box' && (
                             <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Grosor de Borde (px)</label>
                                <input type="number" min="1" max="10" value={selectedElement.borderThickness || 1} onChange={(e) => updateElementWithHistory(selectedElement.id, { borderThickness: Number(e.target.value) })} className="w-full px-3 py-2 border rounded text-sm"/>
                            </div>
                        )}
                        {(selectedElement.type === 'barcode' || selectedElement.type === 'box') && (
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Ancho (mm) {selectedElement.type === 'barcode' && <span className="text-red-500 text-[10px]">(Max 80)</span>}</label>
                                    <input type="number" value={Math.round((selectedElement.width || 0) * 10) / 10} onChange={(e) => updateElementWithHistory(selectedElement.id, { width: Number(e.target.value) })} className="w-full px-3 py-2 border rounded text-sm"/>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Alto (mm) {selectedElement.type === 'barcode' && <span className="text-red-500 text-[10px]">(Max 50)</span>}</label>
                                    <input type="number" value={Math.round((selectedElement.height || 0) * 10) / 10} onChange={(e) => updateElementWithHistory(selectedElement.id, { height: Number(e.target.value) })} className="w-full px-3 py-2 border rounded text-sm"/>
                                </div>
                            </div>
                        )}
                        {(selectedElement.type === 'text' || selectedElement.type === 'field' || selectedElement.type === 'barcode') && (
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Tamaño Fuente Texto</label>
                                    <input type="number" value={selectedElement.fontSize} onChange={(e) => updateElementWithHistory(selectedElement.id, { fontSize: Number(e.target.value) })} className="w-full px-3 py-2 border rounded text-sm"/>
                                </div>
                                {selectedElement.type !== 'barcode' && (
                                    <div className="flex items-end">
                                        <button onClick={() => updateElementWithHistory(selectedElement.id, { isBold: !selectedElement.isBold })} className={`p-2 border rounded ${selectedElement.isBold ? 'bg-slate-800 text-white' : 'bg-white text-slate-700'}`} title="Negrita"><Bold size={18} /></button>
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="border-t pt-3 mt-1">
                            <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1"><RotateCw size={12}/> Rotación (grados)</label>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-400">-180°</span>
                                <input type="range" min="-180" max="180" step="5" value={selectedElement.rotation || 0} onMouseDown={saveToHistory} onChange={(e) => updateElement(selectedElement.id, { rotation: Number(e.target.value) })} className="w-full h-1 bg-slate-200 rounded appearance-none cursor-pointer"/>
                                <span className="text-xs font-mono w-10 text-right">{selectedElement.rotation || 0}°</span>
                            </div>
                        </div>
                        <button onClick={() => removeElement(selectedElement.id)} className="w-full mt-2 flex items-center justify-center gap-2 text-red-600 hover:bg-red-50 py-2 rounded transition-colors text-sm"><Trash2 size={16} /> Eliminar Elemento</button>
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <ScanLine className="mx-auto text-slate-300 mb-2" size={32}/>
                        <p className="text-sm text-slate-400 italic">Selecciona un elemento en el diseño para ver sus propiedades.</p>
                    </div>
                )}
            </div>

            <div className="w-full lg:w-2/3 bg-slate-200 p-8 rounded-lg overflow-auto flex justify-center items-center">
                 <div 
                    ref={editorRef} 
                    className="bg-white shadow-xl relative overflow-hidden transition-all" 
                    style={{ width: `${labelConfig.widthMm * PIXELS_PER_MM}px`, height: `${labelConfig.heightMm * PIXELS_PER_MM}px` }} 
                    onMouseMove={handleMouseMove}
                 >
                    {/* Snap Guides */}
                    {snapLines.x !== undefined && <div className="absolute top-0 bottom-0 border-l border-red-400 z-50 pointer-events-none" style={{ left: snapLines.x }}></div>}
                    {snapLines.y !== undefined && <div className="absolute left-0 right-0 border-t border-red-400 z-50 pointer-events-none" style={{ top: snapLines.y }}></div>}

                    {labelConfig.elements.map(el => {
                        const isSelected = selectedId === el.id;
                        // Selection Style logic:
                        let borderClass = 'border-transparent hover:border-blue-300 border-dashed border';
                        if (isSelected) {
                            if (interactionMode === 'drag') {
                                borderClass = 'border-blue-400 border-dashed border opacity-70';
                            } else {
                                borderClass = 'ring-2 ring-blue-500 ring-offset-2 z-10 bg-blue-50/10';
                            }
                        }

                        // Determine if resizable
                        const isResizable = isSelected && (el.type === 'barcode' || el.type === 'box');

                        // Centering Logic using Transform
                        let translateStyle = '';
                        if (el.textAlign === 'center') translateStyle = 'translateX(-50%)';
                        else if (el.textAlign === 'right') translateStyle = 'translateX(-100%)';

                        const transformStyle = `rotate(${el.rotation || 0}deg) ${translateStyle}`;

                        return (
                            <div 
                                key={el.id} 
                                id={el.id}
                                onMouseDown={(e) => handleDragStart(e, el.id)} 
                                className={`absolute cursor-move select-none ${borderClass} group/element`} 
                                style={{ 
                                    left: `${el.x * PIXELS_PER_MM}px`, 
                                    top: `${el.y * PIXELS_PER_MM}px`, 
                                    transform: transformStyle,
                                    transformOrigin: 'center center',
                                    textAlign: el.textAlign || 'left'
                                }}
                            >
                                {el.type === 'barcode' ? (
                                    <div className="pointer-events-none" style={{ width: `${(el.width || 40) * PIXELS_PER_MM}px`, height: `${(el.height || 15) * PIXELS_PER_MM}px` }}>
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
                                    <div className="pointer-events-none" style={{ width: `${(el.width || 50) * PIXELS_PER_MM}px`, height: `${(el.height || 20) * PIXELS_PER_MM}px`, border: `${el.borderThickness || 1}px solid black` }}></div>
                                ) : (
                                    <div className="whitespace-nowrap pointer-events-none" style={{ fontSize: `${el.fontSize}px`, fontWeight: el.isBold ? 'bold' : 'normal', fontFamily: 'monospace' }}>{resolveValue(el)}</div>
                                )}

                                {/* Resize Handle */}
                                {isResizable && interactionMode !== 'drag' && (
                                    <div 
                                        className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-blue-600 rounded-sm cursor-se-resize z-20 shadow-sm hover:bg-blue-600 hover:scale-110 transition-transform"
                                        onMouseDown={(e) => handleResizeStart(e, el.id)}
                                        title="Redimensionar"
                                    ></div>
                                )}
                            </div>
                        );
                    })}
                 </div>
            </div>
        </div>

        {/* Wizard Modal */}
        {showWizard && (
             <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden">
                    <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                        <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                            <Wand2 size={20} className="text-brand-600" />
                            Asistente Etiqueta Caja
                        </h3>
                        <button onClick={() => setShowWizard(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                    </div>
                    
                    <div className="p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Unidades</label>
                                <div className="relative">
                                    <input 
                                        type="number" 
                                        value={wizardData.units}
                                        onChange={(e) => setWizardData({...wizardData, units: e.target.value})}
                                        className="w-full pl-3 pr-8 py-2 border rounded-md text-sm"
                                        placeholder="Ej: 100"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">PZ</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Referencia</label>
                                <input 
                                    type="text" 
                                    value={wizardData.reference}
                                    onChange={(e) => setWizardData({...wizardData, reference: e.target.value})}
                                    className="w-full px-3 py-2 border rounded-md text-sm"
                                    placeholder="Ej: 12345"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Artículo</label>
                            <input 
                                type="text" 
                                value={wizardData.article}
                                onChange={(e) => setWizardData({...wizardData, article: e.target.value})}
                                className="w-full px-3 py-2 border rounded-md text-sm"
                                placeholder="Nombre del producto"
                            />
                        </div>

                        {/* NEW BATCH INPUT */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Lote</label>
                            <input 
                                type="text" 
                                value={wizardData.batch}
                                onChange={(e) => setWizardData({...wizardData, batch: e.target.value})}
                                className="w-full px-3 py-2 border rounded-md text-sm font-mono"
                                placeholder="LOTE12345"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cliente</label>
                                <input 
                                    type="text" 
                                    value={wizardData.client}
                                    onChange={(e) => setWizardData({...wizardData, client: e.target.value})}
                                    className="w-full px-3 py-2 border rounded-md text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Destino</label>
                                <input 
                                    type="text" 
                                    value={wizardData.destination}
                                    onChange={(e) => setWizardData({...wizardData, destination: e.target.value})}
                                    className="w-full px-3 py-2 border rounded-md text-sm"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Código EAN (Digitos)</label>
                            <input 
                                type="text" 
                                value={wizardData.ean}
                                onChange={(e) => setWizardData({...wizardData, ean: e.target.value})}
                                className="w-full px-3 py-2 border rounded-md text-sm font-mono"
                                placeholder="1234567890123"
                            />
                        </div>
                    </div>

                    <div className="p-4 border-t bg-slate-50 flex justify-end gap-3">
                        <button onClick={() => setShowWizard(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded text-sm">Cancelar</button>
                        <button onClick={generateLabelFromWizard} className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded shadow-sm text-sm font-medium flex items-center gap-2">
                            <Check size={18} />
                            Generar Etiqueta
                        </button>
                    </div>
                </div>
             </div>
        )}
    </div>
  );
};

export default ZebraLabelEditor;