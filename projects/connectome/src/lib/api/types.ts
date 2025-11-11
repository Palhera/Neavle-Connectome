export interface ConnectomeNode {
  id: string | number;
  x: number;
  y: number;
  z?: number;
  size?: number;
  color?: number;
  data?: unknown;
}

export interface ConnectomeLink {
  id?: string | number;
  source: string | number;
  target: string | number;
  weight?: number;
  color?: number;
  data?: unknown;
}

export interface ConnectomeData {
  nodes: ConnectomeNode[];
  links?: ConnectomeLink[];
  dimensionality?: Dimensionality;
}

export type Dimensionality = 2 | 3;
