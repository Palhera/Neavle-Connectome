export const linksVertexShader = `#version 300 es
precision highp float;

layout(location = 0) in float a_segment;
layout(location = 1) in vec3 a_source;
layout(location = 2) in vec3 a_target;
layout(location = 3) in float a_weight;
layout(location = 4) in uint a_color;

uniform mat4 u_view;
uniform mat4 u_proj;

out vec4 v_color;
out float v_weight;

vec4 decodeColor(uint packed) {
  float r = float(packed & 0xFFu) / 255.0;
  float g = float((packed >> 8) & 0xFFu) / 255.0;
  float b = float((packed >> 16) & 0xFFu) / 255.0;
  float a = float((packed >> 24) & 0xFFu) / 255.0;
  return vec4(r, g, b, a);
}

void main() {
  vec3 position = mix(a_source, a_target, a_segment);
  vec4 world = vec4(position, 1.0);
  vec4 viewPos = u_proj * (u_view * world);
  gl_Position = viewPos;
  v_color = decodeColor(a_color);
  v_weight = a_weight;
}
`;
