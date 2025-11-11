export const nodesFragmentShader = `#version 300 es
precision highp float;

in vec2 v_corner;
in vec4 v_color;

out vec4 outColor;

void main() {
  float dist = length(v_corner);
  float sdf = clamp(0.5 - dist, 0.0, 1.0);
  float alpha = v_color.a * sdf;
  if (alpha <= 0.0) {
    discard;
  }
  outColor = vec4(v_color.rgb, alpha);
}
`;
