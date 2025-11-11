export function encodeIdToRGBA(id: number, out: Uint8Array): Uint8Array {
  out[0] = id & 0xff;
  out[1] = (id >> 8) & 0xff;
  out[2] = (id >> 16) & 0xff;
  out[3] = 255;
  return out;
}

export function decodeRGBAtoId(r: number, g: number, b: number): number {
  return (r & 0xff) | ((g & 0xff) << 8) | ((b & 0xff) << 16);
}
