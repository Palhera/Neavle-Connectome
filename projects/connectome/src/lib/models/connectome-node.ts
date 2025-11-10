export interface ConnectomeNode {
  id: string;
  label?: string;
  x?: number;
  y?: number;
  r?: number;
  color?: string;
  data?: Record<string, unknown>;
}
