import { Filter, GlProgram, UniformGroup } from 'pixi.js';
import { LIGHTING } from '../../config/lightingConstants';
import { type LightingManager, lightingManager } from './LightingManager';

const VERTEX = `
precision highp float;
in vec2 aPosition;
out vec2 vTextureCoord;

uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;

vec4 filterVertexPosition(void)
{
    vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
    position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
    position.y = position.y * (2.0 * uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
    return vec4(position, 0.0, 1.0);
}

vec2 filterTextureCoord(void)
{
    return aPosition * (uOutputFrame.zw * uInputSize.zw);
}

void main(void)
{
    gl_Position = filterVertexPosition();
    vTextureCoord = filterTextureCoord();
}
`;

/**
 * Pseudo-3D bevel lighting without hand-authored normal maps: the surface slope is estimated from
 * the sprite itself (its silhouette plus brightness edges), so every tower type and upgrade level
 * is shaded automatically. Edges facing the light brighten, edges facing away darken, and flat
 * areas keep their original colour (shade == 1 when the normal faces the viewer).
 */
const FRAGMENT = `
precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform vec4 uInputSize;
uniform vec3 uLightDir;
uniform float uIntensity;
uniform float uEdge;
uniform float uDetail;

float heightAt(vec2 uv)
{
    vec4 c = texture(uTexture, uv);
    float luma = dot(c.rgb, vec3(0.299, 0.587, 0.114));
    return c.a + uDetail * luma;
}

void main(void)
{
    vec4 c = texture(uTexture, vTextureCoord);
    if (c.a < 0.01)
    {
        finalColor = c;
        return;
    }

    vec2 px = uEdge * uInputSize.zw;
    float hl = heightAt(vTextureCoord - vec2(px.x, 0.0));
    float hr = heightAt(vTextureCoord + vec2(px.x, 0.0));
    float hu = heightAt(vTextureCoord - vec2(0.0, px.y));
    float hd = heightAt(vTextureCoord + vec2(0.0, px.y));

    // Slope points toward higher "height" (inward at a silhouette edge); the surface normal leans
    // the other way. A small z keeps rims strongly tilted while flat areas stay at (0, 0, 1).
    vec2 slope = vec2(hr - hl, hd - hu);
    vec3 n = normalize(vec3(-slope, 0.45));

    vec3 l = normalize(uLightDir);
    float diffuse = max(dot(n, l), 0.0);
    float flatLevel = l.z;

    float shade = clamp(1.0 + (diffuse - flatLevel) * uIntensity, 0.55, 1.35);
    vec3 lit = min(c.rgb * shade, vec3(c.a));

    finalColor = vec4(lit, c.a);
}
`;

/**
 * Pixi compiles filter shaders lazily at first render, and a failure there leaves the filtered
 * sprites invisible. So link the exact program once in a throwaway WebGL2 context first; if that
 * fails (or WebGL2 is missing) shading is simply skipped.
 */
let shaderSupport: boolean | null = null;

export function isTowerLightingSupported(): boolean {
  if (shaderSupport !== null) {
    return shaderSupport;
  }
  shaderSupport = false;
  try {
    if (typeof document === 'undefined') {
      return false;
    }
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) {
      return false;
    }

    const compile = (type: number, body: string): WebGLShader | null => {
      const shader = gl.createShader(type);
      if (!shader) {
        return null;
      }
      gl.shaderSource(shader, `#version 300 es\n${body}`);
      gl.compileShader(shader);
      return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
    };

    const vs = compile(gl.VERTEX_SHADER, VERTEX);
    const fs = compile(gl.FRAGMENT_SHADER, FRAGMENT);
    const program = gl.createProgram();
    if (vs && fs && program) {
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      shaderSupport = gl.getProgramParameter(program, gl.LINK_STATUS) === true;
    }
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    shaderSupport = false;
  }
  return shaderSupport;
}

/** Shared across all towers; uniforms follow the LightingManager. */
let shared: Filter | null = null;
let unsubscribe: (() => void) | null = null;

function lightUniformValues(lighting: LightingManager) {
  const v = lighting.getLightVector();
  return [v.x, v.y, v.z];
}

/**
 * The tower surface-shading filter, or null when disabled or when it cannot be created
 * (no WebGL, shader/API problem). Callers simply skip shading on null, so lighting can never
 * break gameplay.
 */
export function getTowerLightingFilter(lighting: LightingManager = lightingManager): Filter | null {
  if (!lighting.isSurfaceShadingEnabled() || !isTowerLightingSupported()) {
    return null;
  }
  if (shared) {
    return shared;
  }

  try {
    const uniforms = new UniformGroup({
      uLightDir: { value: lightUniformValues(lighting), type: 'vec3<f32>' },
      uIntensity: { value: LIGHTING.SURFACE.INTENSITY, type: 'f32' },
      uEdge: { value: LIGHTING.SURFACE.EDGE_SAMPLE_PX, type: 'f32' },
      uDetail: { value: LIGHTING.SURFACE.DETAIL, type: 'f32' },
    });

    const filter = new Filter({
      glProgram: GlProgram.from({ vertex: VERTEX, fragment: FRAGMENT, name: 'tower-lighting' }),
      resources: { lightUniforms: uniforms },
      // Room for the edge samples just outside the sprite
      padding: 2,
    });

    unsubscribe = lighting.subscribe(() => {
      uniforms.uniforms.uLightDir = lightUniformValues(lighting);
    });
    shared = filter;
    return filter;
  } catch (error) {
    console.warn('Tower surface lighting unavailable:', error);
    lighting.setSurfaceShadingEnabled(false);
    return null;
  }
}

/** Test/teardown helper: drop the shared filter and its subscription. */
export function resetTowerLightingFilter(): void {
  shaderSupport = null;
  unsubscribe?.();
  unsubscribe = null;
  shared = null;
}
