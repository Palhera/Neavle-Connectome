import { ConnectomeData, ConnectomeLink, ConnectomeNode, Dimensionality } from './types';

const hasNumber = (value: unknown): value is number =>
  typeof value === 'number' && !Number.isNaN(value);
const hasString = (value: unknown): value is string => typeof value === 'string';
const hasId = (value: unknown): value is string | number => hasString(value) || hasNumber(value);

export function isDimensionality(value: unknown): value is Dimensionality {
  return value === 2 || value === 3;
}

export function isConnectomeNode(value: unknown): value is ConnectomeNode {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const node = value as Record<string, unknown>;
  return (
    hasId(node['id']) &&
    hasNumber(node['x']) &&
    hasNumber(node['y']) &&
    (node['z'] === undefined || hasNumber(node['z'])) &&
    (node['size'] === undefined || hasNumber(node['size'])) &&
    (node['color'] === undefined || hasNumber(node['color']))
  );
}

export function isConnectomeLink(value: unknown): value is ConnectomeLink {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const link = value as Record<string, unknown>;
  return (
    hasId(link['source']) &&
    hasId(link['target']) &&
    (link['id'] === undefined || hasId(link['id'])) &&
    (link['weight'] === undefined || hasNumber(link['weight'])) &&
    (link['color'] === undefined || hasNumber(link['color']))
  );
}

export function isConnectomeData(value: unknown): value is ConnectomeData {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const data = value as Record<string, unknown>;
  if (!Array.isArray(data['nodes']) || !data['nodes'].every(isConnectomeNode)) {
    return false;
  }
  if (data['links'] !== undefined) {
    if (!Array.isArray(data['links']) || !data['links'].every(isConnectomeLink)) {
      return false;
    }
  }
  if (data['dimensionality'] !== undefined && !isDimensionality(data['dimensionality'])) {
    return false;
  }
  return true;
}
