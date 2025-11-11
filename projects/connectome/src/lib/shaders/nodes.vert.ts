export const nodesVertexShader = `#version 300 es
precision highp float;

layout(location = 0) in vec2 a_corner;
layout(location = 1) in vec3 a_position;
layout(location = 2) in float a_size;
layout(location = 3) in uint a_color;

uniform mat4 u_view;
uniform mat4 u_proj;

out vec2 v_corner;
out vec4 v_color;

vec4 decodeColor(uint packed) {
  float r = float(packed & 0xFFu) / 255.0;
  float g = float((packed >> 8) & 0xFFu) / 255.0;
  float b = float((packed >> 16) & 0xFFu) / 255.0;
  float a = float((packed >> 24) & 0xFFu) / 255.0;
  return vec4(r, g, b, a);
}

void main() {
  vec4 world = vec4(a_position, 1.0);
  vec4 viewPos = u_view * world;
  vec3 expanded = vec3(a_corner * a_size, 0.0);
  vec4 positioned = viewPos + vec4(expanded, 0.0);
  gl_Position = u_proj * positioned;
  v_corner = a_corner;
  v_color = decodeColor(a_color);
}
`;
