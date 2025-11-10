export interface ConnectomeEdge {
  id?: string;
  source: string;
  target: string;
  directed?: boolean;
  label?: string;
  data?: Record<string, unknown>;
}