export const linksFragmentShader = `#version 300 es
precision highp float;

in vec4 v_color;
in float v_weight;

out vec4 outColor;

void main() {
  float alpha = clamp(v_color.a * max(v_weight, 0.1), 0.0, 1.0);
  outColor = vec4(v_color.rgb, alpha);
}
`;
