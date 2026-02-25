import React from 'react';
import { AppState, LabelElement } from '../types';
import { RealBarcode } from './ZebraLabelEditor';

interface DocumentPreviewProps {
  state: AppState;
}

const DocumentPreview: React.FC<DocumentPreviewProps> = ({ state }) => {
  const { metadata, components, batchSimulations, labelPositioning, boxLabelSimulation, finalProductImages } = state;
  const batchCode = metadata.batchCode;

  const PIXELS_PER_MM = 4;

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

  const getTransformStyle = (el: LabelElement) => {
    let translateStyle = '';
    if (el.textAlign === 'center') translateStyle = 'translateX(-50%)';
    else if (el.textAlign === 'right') translateStyle = 'translateX(-100%)';
    return `rotate(${el.rotation || 0}deg) ${translateStyle}`;
  };

  return (
    <div className="document-preview-container bg-white shadow-2xl mx-auto max-w-[210mm] min-h-[297mm] p-[10mm] text-slate-900">
      
      {/* Header */}
      <div className="border-b-2 border-slate-800 pb-4 mb-8 flex justify-between items-end">
        <div>
            <h1 className="text-3xl font-bold uppercase tracking-wide">Solicitud de Envasado</h1>
            <p className="text-slate-500 mt-1">Autorización de Producción</p>
        </div>
        <div className="text-right text-sm">
            <p><strong>Fecha:</strong> {metadata.productionDate}</p>
            <p><strong>Ref. Pedido:</strong> {metadata.orderNumber}</p>
        </div>
      </div>

      {/* Metadata Table */}
      <div className="mb-4">
        <table className="w-full border-collapse border border-slate-300 text-sm">
            <tbody>
                <tr className="bg-slate-50">
                    <td className="border border-slate-300 p-2 font-bold w-1/4">Cliente</td>
                    <td className="border border-slate-300 p-2 w-1/4">{metadata.clientName}</td>
                    <td className="border border-slate-300 p-2 font-bold w-1/4">Producto</td>
                    <td className="border border-slate-300 p-2 w-1/4">{metadata.productName}</td>
                </tr>
                <tr>
                    <td className="border border-slate-300 p-2 font-bold">Lote Producción</td>
                    <td className="border border-slate-300 p-2 text-lg font-mono font-bold">{batchCode || '-'}</td>
                    <td className="border border-slate-300 p-2 font-bold">Preparado por</td>
                    <td className="border border-slate-300 p-2">{metadata.preparedBy}</td>
                </tr>
            </tbody>
        </table>
      </div>

      {/* Observations */}
      {metadata.observations && (
        <div className="mb-8 p-3 bg-slate-50 border border-slate-200 rounded text-sm">
            <p className="font-bold text-slate-700 mb-1">Observaciones:</p>
            <p className="whitespace-pre-wrap text-slate-600">{metadata.observations}</p>
        </div>
      )}

      {/* Section 1: Component Index */}
      <div className="mb-8 avoid-break">
        <h2 className="text-lg font-bold uppercase border-b border-slate-300 mb-4 pb-1">1. Listado de Referencias</h2>
        <table className="w-full text-sm border-collapse border border-slate-300">
            <thead className="bg-slate-100">
                <tr>
                    <th className="border border-slate-300 p-2 text-center w-12">#</th>
                    <th className="border border-slate-300 p-2 text-left">Referencia</th>
                    <th className="border border-slate-300 p-2 text-left">Descripción / Componente</th>
                </tr>
            </thead>
            <tbody>
                {components.map((comp, index) => (
                    <tr key={comp.id}>
                        <td className="border border-slate-300 p-2 text-center text-slate-500">{index + 1}</td>
                        <td className="border border-slate-300 p-2 font-mono font-bold text-slate-700">{comp.reference}</td>
                        <td className="border border-slate-300 p-2">{comp.name}</td>
                    </tr>
                ))}
                {components.length === 0 && (
                    <tr>
                        <td colSpan={3} className="border border-slate-300 p-4 text-center text-slate-400 italic">
                            No hay componentes registrados en la lista.
                        </td>
                    </tr>
                )}
            </tbody>
        </table>
      </div>

      {/* Section 2: Components Visuals */}
      <div className="mb-8 avoid-break">
        <h2 className="text-lg font-bold uppercase border-b border-slate-300 mb-4 pb-1">2. Detalle Visual de Componentes</h2>
        <div className="grid grid-cols-3 gap-6">
            {components.map((comp) => (
                <div key={comp.id} className="flex flex-col items-center">
                    <div className="h-40 w-full flex items-center justify-center bg-slate-50 border border-slate-200 mb-2 overflow-hidden rounded-sm">
                        {comp.imageUrl ? (
                            <img src={comp.imageUrl} alt={comp.name} className="max-h-full max-w-full object-contain" />
                        ) : (
                            <span className="text-slate-300 text-xs">Sin Imagen</span>
                        )}
                    </div>
                    <div className="text-center">
                        <p className="font-bold text-sm text-slate-800">Ref. {comp.reference}</p>
                        <p className="text-xs text-slate-600">{comp.name}</p>
                    </div>
                </div>
            ))}
             {components.length === 0 && (
                <div className="col-span-3 py-8 text-center text-slate-400 text-sm italic border border-dashed border-slate-200 rounded">
                    Sin imágenes de componentes.
                </div>
            )}
        </div>
      </div>

      <div className="print:page-break"></div>

      {/* Section 3: Label Positioning (NEW) */}
      {labelPositioning.imageUrl && (
        <div className="mb-8 mt-8 avoid-break">
            <h2 className="text-lg font-bold uppercase border-b border-slate-300 mb-4 pb-1">3. Posicionamiento de Etiqueta</h2>
            <div className="flex flex-col items-center">
                <div 
                    className="w-full max-w-[400px] border border-slate-200 overflow-hidden bg-slate-50 relative"
                    style={{
                        aspectRatio: labelPositioning.aspectRatio ? `${labelPositioning.aspectRatio}` : '3/4',
                    }}
                >
                    <img 
                        src={labelPositioning.imageUrl} 
                        alt="Posicionamiento" 
                        className="w-full h-full object-contain"
                    />
                    {labelPositioning.showGuide && (
                        <div 
                            className="absolute left-0 w-full flex items-center"
                            style={{ top: `${labelPositioning.guideY}%`, transform: 'translateY(-50%)' }}
                        >
                            <div className="w-full h-0.5 bg-red-500 shadow-sm relative">
                                <div className="absolute left-0 -top-1 w-2 h-2 bg-red-500 rotate-45 transform origin-center"></div>
                                <div className="absolute right-0 -top-1 w-2 h-2 bg-red-500 rotate-45 transform origin-center"></div>
                            </div>
                        </div>
                    )}
                </div>
                <div className="mt-2 text-center text-slate-900">
                    <span className="font-medium text-lg">{labelPositioning.instruction}: </span>
                    <span className="text-lg">{labelPositioning.measurement}</span>
                </div>
            </div>
        </div>
      )}

      {/* Section 4: Batch Simulation (Renumbered) */}
      <div className="mb-8 mt-8 avoid-break">
         <h2 className="text-lg font-bold uppercase border-b border-slate-300 mb-4 pb-1">4. Marcado de Lote y Textos</h2>
         
         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             {batchSimulations.map((sim) => (
                <div key={sim.id} className="flex flex-col items-center break-inside-avoid">
                    <p className="self-start text-xs font-bold text-slate-500 uppercase mb-2 ml-1">{sim.name}</p>
                    <div 
                        className="img-container relative w-full border border-slate-200 overflow-hidden bg-slate-50"
                        style={{
                            aspectRatio: sim.aspectRatio ? `${sim.aspectRatio}` : '4/3',
                        }}
                    >
                        {sim.baseImageUrl ? (
                            <>
                                <img 
                                    src={sim.baseImageUrl} 
                                    alt={sim.name}
                                    className="w-full h-full object-cover"
                                />
                                <div
                                    className="absolute text-center font-mono font-bold leading-tight"
                                    style={{
                                        left: `${sim.positionX}%`,
                                        top: `${sim.positionY}%`,
                                        transform: `translate(-50%, -50%) rotate(${sim.rotation}deg)`,
                                        fontSize: `${sim.fontSize}cqw`, 
                                        color: sim.isLaser ? 'rgba(255,255,255,0.85)' : (sim.textColor || '#000000'),
                                        textShadow: sim.isLaser ? '0 0 2px rgba(255,255,255,0.6), 1px 1px 0 rgba(0,0,0,0.2)' : 'none',
                                    }}
                                >
                                    <div>{sim.batchCode}</div>
                                    {sim.legalText && <div className="text-[0.8em] font-normal">{sim.legalText}</div>}
                                </div>
                            </>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs italic absolute inset-0">
                                Sin imagen
                            </div>
                        )}
                    </div>
                </div>
             ))}
         </div>
      </div>

      <div className="print:page-break"></div>

      {/* Section 5: Final Product (Renumbered) */}
      <div className="mb-8 avoid-break">
         <h2 className="text-lg font-bold uppercase border-b border-slate-300 mb-4 pb-1">5. Estándar de Producto Terminado</h2>
         
         {/* 5.1 Box Label Simulation */}
         {boxLabelSimulation.boxImageUrl && (
            <div className="mb-8 avoid-break">
                <h3 className="text-sm font-bold text-slate-700 mb-4 pb-1 border-b border-dashed">5.1 Diseño y Ubicación de Etiqueta</h3>
                
                <div className="flex flex-col gap-8">
                    {/* A. Flat Label Design View */}
                    <div className="flex flex-col items-center">
                        <span className="text-xs font-semibold text-slate-500 uppercase mb-2">A. Diseño de Etiqueta</span>
                        <div 
                            className="bg-white border border-black shadow-sm relative overflow-hidden"
                            style={{
                                width: `${boxLabelSimulation.labelConfig.widthMm * PIXELS_PER_MM}px`,
                                height: `${boxLabelSimulation.labelConfig.heightMm * PIXELS_PER_MM}px`,
                                maxWidth: '100%' 
                            }}
                        >
                             {boxLabelSimulation.labelConfig.elements.map(el => (
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

                    {/* B. Box Simulation View */}
                    <div className="flex flex-col items-center">
                        <span className="text-xs font-semibold text-slate-500 uppercase mb-2">B. Simulación en Caja</span>
                        <div 
                            className="w-2/3 relative border border-slate-200 bg-slate-50 overflow-hidden"
                            style={{
                                aspectRatio: boxLabelSimulation.aspectRatio ? `${boxLabelSimulation.aspectRatio}` : '4/3',
                            }}
                        >
                            <img 
                                src={boxLabelSimulation.boxImageUrl} 
                                className="w-full h-full object-cover" 
                                alt="Box"
                            />
                            
                            {/* Render Label Overlay */}
                            <div
                                className="absolute bg-white overflow-hidden shadow-sm border border-slate-200"
                                style={{
                                    left: `${boxLabelSimulation.positionX}%`,
                                    top: `${boxLabelSimulation.positionY}%`,
                                    width: `${boxLabelSimulation.labelConfig.widthMm * 4}px`, 
                                    height: `${boxLabelSimulation.labelConfig.heightMm * 4}px`, 
                                    transform: `translate(-50%, -50%) rotate(${boxLabelSimulation.rotation}deg) scale(${boxLabelSimulation.scale / 100})`,
                                    transformOrigin: 'center center'
                                }}
                            >
                                {boxLabelSimulation.labelConfig.elements.map(el => (
                                    <div
                                        key={el.id}
                                        className="absolute whitespace-nowrap"
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
                    </div>
                </div>
            </div>
         )}

         {/* 5.2 Gallery */}
         <h3 className="text-sm font-bold text-slate-700 mb-2 border-t border-dashed pt-4">5.2 Evidencias del Producto</h3>
         <div className="grid grid-cols-2 gap-6">
            {finalProductImages.map((img, idx) => (
                <div key={idx} className="flex flex-col items-center">
                    <div className="w-full aspect-[3/4] bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden">
                        <img src={img} alt="Final Product" className="max-h-full max-w-full object-contain" />
                    </div>
                </div>
            ))}
             {finalProductImages.length === 0 && (
                <div className="col-span-2 py-8 text-center text-slate-400 text-sm italic border border-dashed border-slate-200 rounded">
                    Sin imágenes adicionales de producto terminado.
                </div>
            )}
         </div>
         <p className="mt-4 text-center font-medium text-sm text-slate-500">
             Verificar alineación de etiqueta y limpieza general del envase.
         </p>
      </div>

      {/* Signature Section */}
      <div className="mt-16 pt-8 border-t-2 border-slate-300 break-inside-avoid">
        <div className="flex justify-between gap-12">
            <div className="w-1/2">
                <p className="font-bold text-sm mb-12">Solicitado por: CENTRAL DE ENVASADOS</p>
                <div className="border-t border-slate-400 w-full"></div>
            </div>
            <div className="w-1/2">
                <p className="font-bold text-sm mb-12">Aprobado por (Cliente):</p>
                <div className="border-t border-slate-400 w-full"></div>
                <p className="text-xs mt-1 text-slate-500">Firma y fecha de aprobación</p>
            </div>
        </div>
      </div>

    </div>
  );
};

export default DocumentPreview;