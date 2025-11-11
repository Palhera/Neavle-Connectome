export function check(gl: WebGL2RenderingContext, obj: WebGLShader | WebGLProgram): void {
  if (gl.isShader(obj as WebGLShader)) {
    const compiled = Boolean(gl.getShaderParameter(obj as WebGLShader, gl.COMPILE_STATUS));
    if (!compiled) {
      const info = gl.getShaderInfoLog(obj as WebGLShader) ?? 'Unknown shader compilation error';
      throw new Error(info);
    }
    return;
  }

  if (gl.isProgram(obj as WebGLProgram)) {
    const linked = Boolean(gl.getProgramParameter(obj as WebGLProgram, gl.LINK_STATUS));
    if (!linked) {
      const info = gl.getProgramInfoLog(obj as WebGLProgram) ?? 'Unknown program link error';
      throw new Error(info);
    }
    return;
  }

  throw new Error('Unknown WebGL object');
}

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
  check(gl, program);

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
  check(gl, shader);
  return shader;
}
