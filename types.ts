

export interface PackagingComponent {
  id: string;
  reference: string;
  name: string;
  description?: string;
  imageUrl: string | null;
}

export interface BatchSimulationItem {
  id: string;
  name: string;
  baseImageUrl: string | null;
  aspectRatio?: number; // Image width/height ratio
  batchCode: string;
  legalText: string;
  positionX: number; // Percentage 0-100
  positionY: number; // Percentage 0-100
  fontSize: number; // Represents percentage of container width (cqw)
  rotation: number;
  textColor?: string; 
  isLaser?: boolean; 
}

// --- Label Positioning Data ---
export interface LabelPositioningData {
  imageUrl: string | null;
  aspectRatio?: number;
  guideY: number; // Percentage 0-100 from top
  instruction: string; // e.g. "Altura etiqueta"
  measurement: string; // e.g. "12mm +-1 desde la base"
  showGuide: boolean;
}

// --- Zebra Label Editor Types ---

export type LabelElementType = 'text' | 'field' | 'barcode' | 'box';

export interface LabelElement {
  id: string;
  type: LabelElementType;
  text: string; 
  value?: string; 
  x: number; 
  y: number; 
  width?: number; 
  height?: number; 
  fontSize: number;
  isBold: boolean;
  borderThickness?: number; 
  rotation?: number; 
  // New properties for professional barcode configuration
  barcodeFormat?: 'CODE128' | 'CODE39' | 'EAN13' | 'UPC';
  showText?: boolean;
  textAlign?: 'left' | 'center' | 'right';
}

export interface LabelConfig {
  widthMm: number;
  heightMm: number;
  elements: LabelElement[];
}

export interface BoxLabelSimulationData {
  boxImageUrl: string | null;
  aspectRatio?: number; 
  labelConfig: LabelConfig; 
  positionX: number;
  positionY: number;
  scale: number; 
  rotation: number;
}

export interface ProjectMetadata {
  clientName: string;
  productName: string;
  orderNumber: string;
  batchCode: string; 
  productionDate: string;
  preparedBy: string;
  observations?: string;
}

export interface AppState {
  step: number;
  metadata: ProjectMetadata;
  components: PackagingComponent[];
  batchSimulations: BatchSimulationItem[];
  labelPositioning: LabelPositioningData;
  boxLabelSimulation: BoxLabelSimulationData;
  finalProductImages: string[];
}

// --- Warehouse Gallery Types ---
export interface WarehouseItem {
  id: string;
  client: string;
  product: string; // Added product field for subfolder structure
  code: string;
  name: string;
  imageUrl: string;
  timestamp: string;
}

// --- Persistence Types ---
export interface SavedRequest {
  id: string;
  name: string;
  date: string;
  state: AppState;
}