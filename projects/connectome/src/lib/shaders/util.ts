export function compileProgram(
  gl: WebGL2RenderingContext,
  vsSource: string,
  fsSource: string,
): WebGLProgram {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vsSource);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fsSource);
  const program = gl.createProgram();
  if (!program) {
    throw new Error('Unable to create WebGL program');
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  ensureProgramLinked(gl, program);

  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  return program;
}

function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error('Unable to create shader');
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  ensureShaderCompiled(gl, shader);
  return shader;
}

function ensureShaderCompiled(gl: WebGL2RenderingContext, shader: WebGLShader): void {
  const compiled = Boolean(gl.getShaderParameter(shader, gl.COMPILE_STATUS));
  if (!compiled) {
    const info = gl.getShaderInfoLog(shader) ?? 'Unknown shader compilation error';
    throw new Error(info);
  }
}

function ensureProgramLinked(gl: WebGL2RenderingContext, program: WebGLProgram): void {
  const linked = Boolean(gl.getProgramParameter(program, gl.LINK_STATUS));
  if (!linked) {
    const info = gl.getProgramInfoLog(program) ?? 'Unknown program link error';
    throw new Error(info);
  }
}
