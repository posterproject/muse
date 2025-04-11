'use strict';

// Adapted from https://raw.githubusercontent.com/PavelDoGreat/WebGL-Fluid-Simulation/refs/heads/master/script.js
// Original MIT License preserved.

/*
MIT License

Copyright (c) 2017 Pavel Dobryakov

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

import { FluidOSCController } from './src/fluid-osc-controller';

const canvas = document.getElementsByTagName('canvas')![0];
resizeCanvas();

let config = {
    SIM_RESOLUTION: 128,
    DYE_RESOLUTION: 1024,
    CAPTURE_RESOLUTION: 512,
    DENSITY_DISSIPATION: 1,
    VELOCITY_DISSIPATION: 0.2,
    PRESSURE: 0.8,
    PRESSURE_ITERATIONS: 20,
    CURL: 30,
    SPLAT_RADIUS: 0.25,
    SPLAT_FORCE: 6000,
    SHADING: true,
    COLORFUL: true,
    COLOR_UPDATE_SPEED: 10,
    PAUSED: false,
    BACK_COLOR: { r: 0, g: 0, b: 0 },
    TRANSPARENT: false,
    BLOOM: true,
    BLOOM_ITERATIONS: 8,
    BLOOM_RESOLUTION: 256,
    BLOOM_INTENSITY: 0.8,
    BLOOM_THRESHOLD: 0.6,
    BLOOM_SOFT_KNEE: 0.7,
    SUNRAYS: true,
    SUNRAYS_RESOLUTION: 196,
    SUNRAYS_WEIGHT: 1.0,
    // EEG wave parameters
    EEG_ALPHA: 0.5,    // Normalized value between 0-1
    EEG_BETA: 0.5,     // Normalized value between 0-1
    EEG_THETA: 0.5,    // Normalized value between 0-1
    EEG_GAMMA: 0.5,    // Normalized value between 0-1
    EEG_DELTA: 0.5,    // Normalized value between 0-1
};

interface Pointer {
    id: number;
    texcoordX: number;
    texcoordY: number;
    prevTexcoordX: number;
    prevTexcoordY: number;
    deltaX: number;
    deltaY: number;
    down: boolean;
    moved: boolean;
    color: RGBColor;
}

function pointerPrototype(): Pointer {
    return {
        id: -1,
        texcoordX: 0,
        texcoordY: 0,
        prevTexcoordX: 0,
        prevTexcoordY: 0,
        deltaX: 0,
        deltaY: 0,
        down: false,
        moved: false,
        color: { r: 30, g: 0, b: 300 },
    };
}

let pointers: Pointer[] = [];
let splatStack: number[] = [];
pointers.push(pointerPrototype());

const { gl, ext } = getWebGLContext(canvas);

// Simplified mobile check (always false for this adaptation)
const isMobile = () => false;

if (isMobile()) {
    config.DYE_RESOLUTION = 512;
}
if (!ext.supportLinearFiltering) {
    config.DYE_RESOLUTION = 512;
    config.SHADING = false;
    config.BLOOM = false;
    config.SUNRAYS = false;
}

// Removed GUI setup

interface WebGLExtensions {
    formatRGBA: { internalFormat: number, format: number } | null;
    formatRG: { internalFormat: number, format: number } | null;
    formatR: { internalFormat: number, format: number } | null;
    halfFloatTexType: number;
    supportLinearFiltering: boolean;
}

interface WebGLContext {
    gl: WebGL2RenderingContext;
    ext: WebGLExtensions;
}

function getWebGLContext(canvas: HTMLCanvasElement): WebGLContext {
    const params = { alpha: true, depth: false, stencil: false, antialias: false, preserveDrawingBuffer: false };

    let gl = canvas.getContext('webgl2', params) as WebGL2RenderingContext;
    const isWebGL2 = !!gl;
    if (!isWebGL2) {
        throw new Error('WebGL 2 is not available');
    }

    gl.getExtension('EXT_color_buffer_float');
    const supportLinearFiltering = !!gl.getExtension('OES_texture_float_linear');

    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    const halfFloatTexType = gl.HALF_FLOAT;

    let formatRGBA = getSupportedFormat(gl, gl.RGBA16F, gl.RGBA, halfFloatTexType);
    let formatRG = getSupportedFormat(gl, gl.RG16F, gl.RG, halfFloatTexType);
    let formatR = getSupportedFormat(gl, gl.R16F, gl.RED, halfFloatTexType);

    if (!formatRGBA || !formatRG || !formatR) {
        console.warn('Floating point texture support is limited or missing. Simulation might not work correctly.')
    }

    return {
        gl,
        ext: {
            formatRGBA,
            formatRG,
            formatR,
            halfFloatTexType,
            supportLinearFiltering
        }
    };
}

function getSupportedFormat(gl: WebGL2RenderingContext, internalFormat: number, format: number, type: number): { internalFormat: number, format: number } | null {
    if (!supportRenderTextureFormat(gl, internalFormat, format, type)) {
        switch (internalFormat) {
            case gl.R16F:
                return getSupportedFormat(gl, gl.RG16F, gl.RG, type);
            case gl.RG16F:
                return getSupportedFormat(gl, gl.RGBA16F, gl.RGBA, type);
            default:
                return null;
        }
    }

    return {
        internalFormat,
        format
    }
}

function supportRenderTextureFormat(gl: WebGL2RenderingContext, internalFormat: number, format: number, type: number): boolean {
    let texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null);

    let fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    // Cleanup
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.deleteFramebuffer(fbo);
    gl.deleteTexture(texture);

    return status == gl.FRAMEBUFFER_COMPLETE;
}


class GLProgram {
    uniforms: { [key: string]: WebGLUniformLocation };
    program: WebGLProgram;
    gl: WebGL2RenderingContext;

    constructor(gl: WebGL2RenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader) {
        this.gl = gl;
        this.program = gl.createProgram()!;

        gl.attachShader(this.program, vertexShader);
        gl.attachShader(this.program, fragmentShader);
        gl.linkProgram(this.program);

        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            throw gl.getProgramInfoLog(this.program);
        }

        this.uniforms = {};
        const uniformCount = gl.getProgramParameter(this.program, gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < uniformCount; i++) {
            const uniformInfo = gl.getActiveUniform(this.program, i);
            if (uniformInfo) {
                this.uniforms[uniformInfo.name] = gl.getUniformLocation(this.program, uniformInfo.name)!;
            }
        }
    }

    bind() {
        this.gl.useProgram(this.program);
    }
}

function compileShader(gl: WebGL2RenderingContext, type: number, source: string, keywords: string[] | null): WebGLShader {
    source = addKeywords(source, keywords);

    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw gl.getShaderInfoLog(shader);
    }

    return shader;
};

function addKeywords(source: string, keywords: string[] | null): string {
    if (keywords == null) return source;
    let keywordsString = '';
    keywords.forEach(keyword => {
        keywordsString += '#define ' + keyword + '\n';
    });
    return keywordsString + source;
}

// --- Shader Sources ---

const baseVertexShaderSource = `
    precision highp float;
    attribute vec2 aPosition; // Ensure this matches the attribute binding
    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform vec2 texelSize;
    void main () {
        vUv = aPosition * 0.5 + 0.5;
        vL = vUv - vec2(texelSize.x, 0.0);
        vR = vUv + vec2(texelSize.x, 0.0);
        vT = vUv + vec2(0.0, texelSize.y);
        vB = vUv - vec2(0.0, texelSize.y);
        gl_Position = vec4(aPosition, 0.0, 1.0);
    }
`;

const blurVertexShaderSource = `
    precision highp float;
    attribute vec2 aPosition; // Ensure this matches the attribute binding
    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    uniform vec2 texelSize;
    void main () {
        vUv = aPosition * 0.5 + 0.5;
        float offset = 1.33333333;
        vL = vUv - texelSize * offset;
        vR = vUv + texelSize * offset;
        gl_Position = vec4(aPosition, 0.0, 1.0);
    }
`;

const blurShaderSource = `
    precision mediump float;
    precision mediump sampler2D;
    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    uniform sampler2D uTexture;
    void main () {
        vec4 sum = texture2D(uTexture, vUv) * 0.29411764;
        sum += texture2D(uTexture, vL) * 0.35294117;
        sum += texture2D(uTexture, vR) * 0.35294117;
        gl_FragColor = sum;
    }
`;

const copyShaderSource = `
    precision mediump float;
    precision mediump sampler2D;
    varying highp vec2 vUv;
    uniform sampler2D uTexture;
    void main () {
        gl_FragColor = texture2D(uTexture, vUv);
    }
`;

const clearShaderSource = `
    precision mediump float;
    precision mediump sampler2D;
    varying highp vec2 vUv;
    uniform sampler2D uTexture;
    uniform float value;
    void main () {
        gl_FragColor = value * texture2D(uTexture, vUv);
    }
`;

const colorShaderSource = `
    precision mediump float;
    uniform vec4 color;
    void main () {
        gl_FragColor = color;
    }
`;

const checkerboardShaderSource = `
    precision highp float;
    precision highp sampler2D;
    varying vec2 vUv;
    uniform sampler2D uTexture;
    uniform float aspectRatio;
    #define SCALE 25.0
    void main () {
        vec2 uv = floor(vUv * SCALE * vec2(aspectRatio, 1.0));
        float v = mod(uv.x + uv.y, 2.0);
        v = v * 0.1 + 0.8;
        gl_FragColor = vec4(vec3(v), 1.0);
    }
`;

const displayShaderSource = `
    precision highp float;
    precision highp sampler2D;
    varying vec2 vUv;
    uniform sampler2D uTexture;
    uniform sampler2D uBloom;
    uniform sampler2D uSunrays;
    uniform sampler2D uDithering;
    uniform vec2 ditherScale;
    uniform vec2 texelSize;
    vec3 linearToGamma (vec3 color) {
        color = max(color, vec3(0.0));
        return pow(color, vec3(1.0 / 2.2));
    }
    float internalLuminance(vec3 color) {
      // Already linear, no need to convert back from gamma
      return dot(color.rgb, vec3(0.2126, 0.7152, 0.0722)); // Linear luminance coefficients
    }
    void main () {
        vec3 c = texture2D(uTexture, vUv).rgb;
        #ifdef SHADING
            vec3 lc = vec3(internalLuminance(c));
            // Adjust shading - maybe less aggressive?
            vec3 shade = mix(vec3(1.0), vec3(0.5), lc); // Less dark shading
            c *= shade;
        #endif
        #ifdef BLOOM
            vec3 bloom = texture2D(uBloom, vUv).rgb;
            c += bloom;
        #endif
        #ifdef SUNRAYS
            float sunrays = texture2D(uSunrays, vUv).r;
            c *= sunrays;
        #endif
        // Dithering (Optional - check if texture loads)
        // vec4 dither = texture2D(uDithering, vUv / ditherScale);
        // c += dither.rgb / 255.0 * 0.1; // Reduce dither strength

        c = linearToGamma(c);
        gl_FragColor = vec4(c, 1.0);
    }
`;

const bloomPrefilterShaderSource = `
    precision mediump float;
    precision mediump sampler2D;
    varying vec2 vUv;
    uniform sampler2D uTexture;
    uniform vec3 curve;
    uniform float threshold;
    void main () {
        vec3 c = texture2D(uTexture, vUv).rgb;
        float br = max(c.r, max(c.g, c.b));
        float rq = clamp(br - curve.x, 0.0, curve.y);
        rq = curve.z * rq * rq;
        c *= max(rq, br - threshold) / max(br, 0.0001);
        gl_FragColor = vec4(c, 0.0); // Alpha should be 0 for prefilter?
    }
`;

const bloomBlurShaderSource = `
    precision mediump float;
    precision mediump sampler2D;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform sampler2D uTexture;
    void main () {
        vec4 sum = vec4(0.0);
        sum += texture2D(uTexture, vL);
        sum += texture2D(uTexture, vR);
        sum += texture2D(uTexture, vT);
        sum += texture2D(uTexture, vB);
        sum *= 0.25;
        gl_FragColor = sum;
    }
`;

const bloomFinalShaderSource = `
    precision mediump float;
    precision mediump sampler2D;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform sampler2D uTexture;
    uniform float intensity;
    void main () {
        vec4 sum = vec4(0.0);
        sum += texture2D(uTexture, vL);
        sum += texture2D(uTexture, vR);
        sum += texture2D(uTexture, vT);
        sum += texture2D(uTexture, vB);
        sum *= 0.25;
        gl_FragColor = sum * intensity;
    }
`;

const sunraysMaskShaderSource = `
    precision highp float;
    precision highp sampler2D;
    varying vec2 vUv;
    uniform sampler2D uTexture;
    void main () {
        vec4 c = texture2D(uTexture, vUv);
        float br = max(c.r, max(c.g, c.b));
        // Ensure alpha is calculated correctly
        c.a = clamp(1.0 - br * 5.0, 0.0, 1.0); // Adjusted alpha calculation
        gl_FragColor = c;
    }
`;

const sunraysShaderSource = `
    precision highp float;
    precision highp sampler2D;
    varying vec2 vUv;
    uniform sampler2D uTexture; // This should be the mask
    uniform float weight;
    #define ITERATIONS 16
    void main () {
        float Density = 0.3;
        float Decay = 0.95;
        float Exposure = 0.7;
        vec2 coord = vUv;
        vec2 screen = vec2(0.5, 0.5); // Assuming sun/light source is center
        vec2 delta = coord - screen;
        delta *= 1.0 / float(ITERATIONS) * Density;
        float illuminationDecay = 1.0;
        float color = texture2D(uTexture, coord).a; // Read alpha from mask
        for (int i = 0; i < ITERATIONS; i++) {
            coord -= delta;
            float sample = texture2D(uTexture, coord).a; // Read alpha from mask
            sample *= illuminationDecay * weight;
            color += sample;
            illuminationDecay *= Decay;
        }
        // Output the accumulated light as red component (as in original)
        gl_FragColor = vec4(color * Exposure, 0.0, 0.0, 1.0);
    }
`;

const splatShaderSource = `
    precision highp float;
    precision highp sampler2D;
    varying vec2 vUv;
    uniform sampler2D uTarget;
    uniform float aspectRatio;
    uniform vec3 color;
    uniform vec2 point;
    uniform float radius;
    void main () {
        vec2 p = vUv - point.xy;
        p.x *= aspectRatio;
        vec3 splat = exp(-dot(p, p) / radius) * color;
        vec3 base = texture2D(uTarget, vUv).xyz;
        gl_FragColor = vec4(base + splat, 1.0);
    }
`;

const advectionShaderSource = `
    precision highp float;
    precision highp sampler2D;
    varying vec2 vUv;
    uniform sampler2D uVelocity;
    uniform sampler2D uSource;
    uniform vec2 texelSize;
    uniform vec2 dyeTexelSize; // Only used for manual filtering
    uniform float dt;
    uniform float dissipation;
    // Bilinear interpolation function (only needed for manual filtering)
    vec4 bilerp (sampler2D sampler, vec2 uv, vec2 tsize) {
        vec2 st = uv / tsize - 0.5;
        vec2 iuv = floor(st);
        vec2 fuv = fract(st);
        vec4 a = texture2D(sampler, (iuv + vec2(0.5, 0.5)) * tsize);
        vec4 b = texture2D(sampler, (iuv + vec2(1.5, 0.5)) * tsize);
        vec4 c = texture2D(sampler, (iuv + vec2(0.5, 1.5)) * tsize);
        vec4 d = texture2D(sampler, (iuv + vec2(1.5, 1.5)) * tsize);
        return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
    }
    void main () {
        vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
        #ifdef MANUAL_FILTERING
            vec4 result = bilerp(uSource, coord, dyeTexelSize);
        #else
            vec4 result = texture2D(uSource, coord);
        #endif
        float decay = 1.0 + dissipation * dt;
        gl_FragColor = result / decay;
    }
`;

const divergenceShaderSource = `
    precision mediump float;
    precision mediump sampler2D;
    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uVelocity;
    void main () {
        float L = texture2D(uVelocity, vL).x;
        float R = texture2D(uVelocity, vR).x;
        float T = texture2D(uVelocity, vT).y;
        float B = texture2D(uVelocity, vB).y;
        // Boundary conditions (clamp to edge basically)
        // vec2 C = texture2D(uVelocity, vUv).xy;
        // if (vL.x < 0.0) { L = -C.x; }
        // if (vR.x > 1.0) { R = -C.x; }
        // if (vT.y > 1.0) { T = -C.y; }
        // if (vB.y < 0.0) { B = -C.y; }
        float div = 0.5 * (R - L + T - B);
        gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
    }
`;

const curlShaderSource = `
    precision mediump float;
    precision mediump sampler2D;
    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uVelocity;
    void main () {
        float L = texture2D(uVelocity, vL).y;
        float R = texture2D(uVelocity, vR).y;
        float T = texture2D(uVelocity, vT).x;
        float B = texture2D(uVelocity, vB).x;
        float vorticity = R - L - T + B;
        gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
    }
`;

const vorticityShaderSource = `
    precision highp float;
    precision highp sampler2D;
    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform sampler2D uVelocity;
    uniform sampler2D uCurl;
    uniform float curl;
    uniform float dt;
    void main () {
        float L = texture2D(uCurl, vL).x;
        float R = texture2D(uCurl, vR).x;
        float T = texture2D(uCurl, vT).x;
        float B = texture2D(uCurl, vB).x;
        float C = texture2D(uCurl, vUv).x;
        vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
        force /= length(force) + 0.0001; // Normalize (safe)
        force *= curl * C;
        force.y *= -1.0; // Might need adjustment depending on coord system
        vec2 vel = texture2D(uVelocity, vUv).xy;
        gl_FragColor = vec4(vel + force * dt, 0.0, 1.0);
    }
`;

const pressureShaderSource = `
    precision mediump float;
    precision mediump sampler2D;
    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uPressure;
    uniform sampler2D uDivergence;
    vec2 texelSize; // Needs to be passed if boundary conditions used below
    void main () {
        float L = texture2D(uPressure, vL).x;
        float R = texture2D(uPressure, vR).x;
        float T = texture2D(uPressure, vT).x;
        float B = texture2D(uPressure, vB).x;
        float C = texture2D(uPressure, vUv).x;
        // Boundary conditions (Neumann boundary for pressure)
        // if (vL.x < 0.0) { L = R; }
        // if (vR.x > 1.0) { R = L; }
        // if (vT.y > 1.0) { T = B; }
        // if (vB.y < 0.0) { B = T; }
        float divergence = texture2D(uDivergence, vUv).x;
        float pressure = (L + R + B + T - divergence) * 0.25;
        gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
    }
`;

const gradientSubtractShaderSource = `
    precision mediump float;
    precision mediump sampler2D;
    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uPressure;
    uniform sampler2D uVelocity;
    void main () {
        float L = texture2D(uPressure, vL).x;
        float R = texture2D(uPressure, vR).x;
        float T = texture2D(uPressure, vT).x;
        float B = texture2D(uPressure, vB).x;
        vec2 velocity = texture2D(uVelocity, vUv).xy;
        // Boundary conditions for pressure gradient (match pressure Neumann boundary)
        // if (vL.x < 0.0) { L = R; }
        // if (vR.x > 1.0) { R = L; }
        // if (vT.y > 1.0) { T = B; }
        // if (vB.y < 0.0) { B = T; }
        velocity.xy -= 0.5 * vec2(R - L, T - B);
        gl_FragColor = vec4(velocity, 0.0, 1.0);
    }
`;

// --- Simulation Setup ---

const baseVertexShader = compileShader(gl, gl.VERTEX_SHADER, baseVertexShaderSource, null);
const blurVertexShader = compileShader(gl, gl.VERTEX_SHADER, blurVertexShaderSource, null);
const blurShader = compileShader(gl, gl.FRAGMENT_SHADER, blurShaderSource, null);
const copyShader = compileShader(gl, gl.FRAGMENT_SHADER, copyShaderSource, null);
const clearShader = compileShader(gl, gl.FRAGMENT_SHADER, clearShaderSource, null);
const colorShader = compileShader(gl, gl.FRAGMENT_SHADER, colorShaderSource, null);
const checkerboardShader = compileShader(gl, gl.FRAGMENT_SHADER, checkerboardShaderSource, null);
const displayShader = compileShader(gl, gl.FRAGMENT_SHADER, displayShaderSource, null); // Will be recompiled later
const bloomPrefilterShader = compileShader(gl, gl.FRAGMENT_SHADER, bloomPrefilterShaderSource, null);
const bloomBlurShader = compileShader(gl, gl.FRAGMENT_SHADER, bloomBlurShaderSource, null);
const bloomFinalShader = compileShader(gl, gl.FRAGMENT_SHADER, bloomFinalShaderSource, null);
const sunraysMaskShader = compileShader(gl, gl.FRAGMENT_SHADER, sunraysMaskShaderSource, null);
const sunraysShader = compileShader(gl, gl.FRAGMENT_SHADER, sunraysShaderSource, null);
const splatShader = compileShader(gl, gl.FRAGMENT_SHADER, splatShaderSource, null);
const advectionShader = compileShader(gl, gl.FRAGMENT_SHADER, advectionShaderSource, ext.supportLinearFiltering ? null : ['MANUAL_FILTERING']);
const divergenceShader = compileShader(gl, gl.FRAGMENT_SHADER, divergenceShaderSource, null);
const curlShader = compileShader(gl, gl.FRAGMENT_SHADER, curlShaderSource, null);
const vorticityShader = compileShader(gl, gl.FRAGMENT_SHADER, vorticityShaderSource, null);
const pressureShader = compileShader(gl, gl.FRAGMENT_SHADER, pressureShaderSource, null);
const gradientSubtractShader = compileShader(gl, gl.FRAGMENT_SHADER, gradientSubtractShaderSource, null);


const blit = (() => {
    const quadVertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); // Bind vertex attrib 0
    gl.enableVertexAttribArray(0);

    const quadIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, quadIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);

    return (target: FBO | null, clear: boolean = false) => {
        if (target == null) {
            gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        } else {
            gl.viewport(0, 0, target.width, target.height);
            gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
        }
        if (clear) {
            gl.clearColor(0.0, 0.0, 0.0, 1.0);
            gl.clear(gl.COLOR_BUFFER_BIT);
        }
        // Don't need to rebind buffers/attribs if they don't change
        gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    }
})();


interface FBO {
    texture: WebGLTexture;
    fbo: WebGLFramebuffer;
    width: number;
    height: number;
    texelSizeX: number;
    texelSizeY: number;
    attach (id: number): number;
}

function createFBO (w: number, h: number, internalFormat: number, format: number, type: number, param: number): FBO {
    gl.activeTexture(gl.TEXTURE0);
    let texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);

    let fbo = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.viewport(0, 0, w, h);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Check FBO status
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status != gl.FRAMEBUFFER_COMPLETE) {
        console.error(`FBO creation failed: ${status.toString(16)}`);
    }

    let texelSizeX = 1.0 / w;
    let texelSizeY = 1.0 / h;

    return {
        texture,
        fbo,
        width: w,
        height: h,
        texelSizeX,
        texelSizeY,
        attach (id: number) {
            gl.activeTexture(gl.TEXTURE0 + id);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            return id;
        }
    };
}

interface DoubleFBO {
    width: number;
    height: number;
    texelSizeX: number;
    texelSizeY: number;
    read: FBO;
    write: FBO;
    swap (): void;
}

function createDoubleFBO (w: number, h: number, internalFormat: number, format: number, type: number, param: number): DoubleFBO {
    let fbo1 = createFBO(w, h, internalFormat, format, type, param);
    let fbo2 = createFBO(w, h, internalFormat, format, type, param);

    return {
        width: w,
        height: h,
        texelSizeX: fbo1.texelSizeX,
        texelSizeY: fbo1.texelSizeY,
        get read () {
            return fbo1;
        },
        set read (value) {
            fbo1 = value;
        },
        get write () {
            return fbo2;
        },
        set write (value) {
            fbo2 = value;
        },
        swap () {
            let temp = fbo1;
            fbo1 = fbo2;
            fbo2 = temp;
        }
    }
}

// --- Create Programs ---
const copyProgram = new GLProgram(gl, baseVertexShader, copyShader);
const clearProgram = new GLProgram(gl, baseVertexShader, clearShader);
const colorProgram = new GLProgram(gl, baseVertexShader, colorShader);
const checkerboardProgram = new GLProgram(gl, baseVertexShader, checkerboardShader);
let displayProgram: GLProgram; // Declared here, created in updateKeywords
const bloomPrefilterProgram = new GLProgram(gl, baseVertexShader, bloomPrefilterShader);
const bloomBlurProgram = new GLProgram(gl, baseVertexShader, bloomBlurShader);
const bloomFinalProgram = new GLProgram(gl, baseVertexShader, bloomFinalShader);
const sunraysMaskProgram = new GLProgram(gl, baseVertexShader, sunraysMaskShader);
const sunraysProgram = new GLProgram(gl, baseVertexShader, sunraysShader);
const splatProgram = new GLProgram(gl, baseVertexShader, splatShader);
const advectionProgram = new GLProgram(gl, baseVertexShader, advectionShader);
const divergenceProgram = new GLProgram(gl, baseVertexShader, divergenceShader);
const curlProgram = new GLProgram(gl, baseVertexShader, curlShader);
const vorticityProgram = new GLProgram(gl, baseVertexShader, vorticityShader);
const pressureProgram = new GLProgram(gl, baseVertexShader, pressureShader);
const gradienSubtractProgram = new GLProgram(gl, baseVertexShader, gradientSubtractShader);
const blurProgram = new GLProgram(gl, blurVertexShader, blurShader);

// --- Texture & FBO Initialization ---
let dye: DoubleFBO;
let velocity: DoubleFBO;
let divergence: FBO;
let curl: FBO;
let pressure: DoubleFBO;
let bloom: FBO;
let bloomFramebuffers: FBO[] = [];
let sunrays: FBO;
let sunraysTemp: FBO;

// Dithering texture setup (simplified - uses placeholder)
// let ditheringTexture = createTextureAsync('LDR_LLL1_0.png'); // Assuming this path exists or replace
let ditheringTexture = gl.createTexture(); // Placeholder
gl.bindTexture(gl.TEXTURE_2D, ditheringTexture);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array([128, 128, 128]));

function initFramebuffers () {
    let simRes = getResolution(config.SIM_RESOLUTION);
    let dyeRes = getResolution(config.DYE_RESOLUTION);

    const texType = ext.halfFloatTexType;
    // Ensure formats are not null before using them
    const rgba = ext.formatRGBA ?? { internalFormat: gl.RGBA, format: gl.RGBA }; // Fallback
    const rg = ext.formatRG ?? { internalFormat: gl.RG, format: gl.RG }; // Fallback
    const r = ext.formatR ?? { internalFormat: gl.RED, format: gl.RED }; // Fallback
    const filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

    gl.disable(gl.BLEND);

    if (dye == null) {
        dye = createDoubleFBO(dyeRes.width, dyeRes.height, rgba.internalFormat, rgba.format, texType, filtering);
    } else {
        dye = resizeDoubleFBO(dye, dyeRes.width, dyeRes.height, rgba.internalFormat, rgba.format, texType, filtering);
    }

    if (velocity == null) {
        velocity = createDoubleFBO(simRes.width, simRes.height, rg.internalFormat, rg.format, texType, filtering);
    } else {
        velocity = resizeDoubleFBO(velocity, simRes.width, simRes.height, rg.internalFormat, rg.format, texType, filtering);
    }

    if (divergence == null) {
        divergence = createFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
    } else {
        divergence = resizeFBO(divergence, simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
    }

    if (curl == null) {
        curl = createFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
    } else {
        curl = resizeFBO(curl, simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
    }

    if (pressure == null) {
        pressure = createDoubleFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
    } else {
        pressure = resizeDoubleFBO(pressure, simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
    }

    initBloomFramebuffers();
    initSunraysFramebuffers();
}

function initBloomFramebuffers () {
    let res = getResolution(config.BLOOM_RESOLUTION);

    const texType = ext.halfFloatTexType;
    const rgba = ext.formatRGBA ?? { internalFormat: gl.RGBA, format: gl.RGBA }; // Fallback
    const filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

    if (bloom == null) {
        bloom = createFBO(res.width, res.height, rgba.internalFormat, rgba.format, texType, filtering);
    } else {
        bloom = resizeFBO(bloom, res.width, res.height, rgba.internalFormat, rgba.format, texType, filtering);
    }

    bloomFramebuffers.length = 0;
    for (let i = 0; i < config.BLOOM_ITERATIONS; i++) {
        let width = res.width >> (i + 1);
        let height = res.height >> (i + 1);

        if (width < 2 || height < 2) break;

        let fbo = createFBO(width, height, rgba.internalFormat, rgba.format, texType, filtering);
        bloomFramebuffers.push(fbo);
    }
}

function initSunraysFramebuffers () {
    let res = getResolution(config.SUNRAYS_RESOLUTION);

    const texType = ext.halfFloatTexType;
    const r = ext.formatR ?? { internalFormat: gl.RED, format: gl.RED }; // Fallback
    const filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

    if (sunrays == null) {
        sunrays = createFBO(res.width, res.height, r.internalFormat, r.format, texType, filtering);
    } else {
        sunrays = resizeFBO(sunrays, res.width, res.height, r.internalFormat, r.format, texType, filtering);
    }

    if (sunraysTemp == null) {
        sunraysTemp = createFBO(res.width, res.height, r.internalFormat, r.format, texType, filtering);
    } else {
        sunraysTemp = resizeFBO(sunraysTemp, res.width, res.height, r.internalFormat, r.format, texType, filtering);
    }
}

// Simplified texture loading - uses placeholder
// function createTextureAsync (url: string): WebGLTexture { ... }

function updateKeywords () {
    let displayKeywords = [];
    if (config.SHADING) displayKeywords.push('SHADING');
    if (config.BLOOM) displayKeywords.push('BLOOM');
    if (config.SUNRAYS) displayKeywords.push('SUNRAYS');

    // Recreate the display program with the correct keywords
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, displayShaderSource, displayKeywords);
    displayProgram = new GLProgram(gl, baseVertexShader, fragmentShader);
}
updateKeywords();
initFramebuffers();
multipleSplats(Math.floor(Math.random() * 20 + 5));

let lastUpdateTime = Date.now();
let colorUpdateTimer = 0.0;

function update () {
    const now = Date.now();
    let dt = (now - lastUpdateTime) / 1000.0;
    dt = Math.min(dt, 0.016666);
    lastUpdateTime = now;

    if (resizeCanvas()) {
        initFramebuffers();
    }

    if (!config.PAUSED) {
        applyInputs();
        step(dt);
    }
    render(null);
    requestAnimationFrame(update);
}

function applyInputs () {
    if (splatStack.length > 0)
        multipleSplats(splatStack.pop()!); // Assert non-null with !

    pointers.forEach(p => {
        if (p.moved) {
            p.moved = false;
            splatPointer(p);
        }
    });
}

function step (dt: number) {
    gl.disable(gl.BLEND);
    gl.viewport(0, 0, velocity.width, velocity.height);

    // Curl calculation
    curlProgram.bind();
    gl.uniform2f(curlProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(curlProgram.uniforms.uVelocity, velocity.read.attach(0));
    blit(curl);

    // Vorticity confinement
    vorticityProgram.bind();
    gl.uniform2f(vorticityProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(vorticityProgram.uniforms.uVelocity, velocity.read.attach(0));
    gl.uniform1i(vorticityProgram.uniforms.uCurl, curl.attach(1));
    gl.uniform1f(vorticityProgram.uniforms.curl, config.CURL);
    gl.uniform1f(vorticityProgram.uniforms.dt, dt);
    blit(velocity.write);
    velocity.swap();

    // Divergence calculation
    divergenceProgram.bind();
    gl.uniform2f(divergenceProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(divergenceProgram.uniforms.uVelocity, velocity.read.attach(0));
    blit(divergence);

    // Pressure solver setup
    clearProgram.bind();
    gl.uniform1i(clearProgram.uniforms.uTexture, pressure.read.attach(0));
    gl.uniform1f(clearProgram.uniforms.value, config.PRESSURE); // Use pressure value for clearing?
    blit(pressure.write);
    pressure.swap();

    // Pressure solver iteration (Jacobi)
    pressureProgram.bind();
    gl.uniform2f(pressureProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(pressureProgram.uniforms.uDivergence, divergence.attach(0));
    for (let i = 0; i < config.PRESSURE_ITERATIONS; i++) {
        gl.uniform1i(pressureProgram.uniforms.uPressure, pressure.read.attach(1));
        blit(pressure.write);
        pressure.swap();
    }

    // Gradient subtraction (apply pressure correction)
    gradienSubtractProgram.bind();
    gl.uniform2f(gradienSubtractProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(gradienSubtractProgram.uniforms.uPressure, pressure.read.attach(0));
    gl.uniform1i(gradienSubtractProgram.uniforms.uVelocity, velocity.read.attach(1));
    blit(velocity.write);
    velocity.swap();

    // Velocity advection
    advectionProgram.bind();
    gl.uniform2f(advectionProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    if (!ext.supportLinearFiltering) // Pass dye texel size if manual filtering
        gl.uniform2f(advectionProgram.uniforms.dyeTexelSize, velocity.texelSizeX, velocity.texelSizeY); // Use velocity texel size for velocity advection
    gl.uniform1i(advectionProgram.uniforms.uVelocity, velocity.read.attach(0));
    gl.uniform1i(advectionProgram.uniforms.uSource, velocity.read.attach(0)); // Advect velocity itself
    gl.uniform1f(advectionProgram.uniforms.dt, dt);
    gl.uniform1f(advectionProgram.uniforms.dissipation, config.VELOCITY_DISSIPATION);
    blit(velocity.write);
    velocity.swap();

    // Dye advection
    gl.viewport(0, 0, dye.width, dye.height);
    if (!ext.supportLinearFiltering) // Pass dye texel size if manual filtering
        gl.uniform2f(advectionProgram.uniforms.dyeTexelSize, dye.texelSizeX, dye.texelSizeY);
    gl.uniform1i(advectionProgram.uniforms.uVelocity, velocity.read.attach(0)); // Use velocity texture
    gl.uniform1i(advectionProgram.uniforms.uSource, dye.read.attach(1)); // Use dye texture as source
    gl.uniform1f(advectionProgram.uniforms.dissipation, config.DENSITY_DISSIPATION);
    blit(dye.write);
    dye.swap();
}

function render (target: FBO | null) {
    // Bind the default framebuffer (or the provided target)
    if (target == null) {
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    } else {
        gl.viewport(0, 0, target.width, target.height);
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
    }

    // Set clear color
    if (config.TRANSPARENT) {
        gl.clearColor(0, 0, 0, 0);
    } else {
        gl.clearColor(config.BACK_COLOR.r / 255, config.BACK_COLOR.g / 255, config.BACK_COLOR.b / 255, 1.0);
    }
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Optional checkerboard background if transparent
    // if (config.TRANSPARENT) { ... }

    // Apply post-processing effects
    if (config.BLOOM) {
        applyBloom(dye.read, bloom);
    }
    if (config.SUNRAYS) {
        applySunrays(dye.read, sunraysTemp, sunrays);
    }

    // Final display pass
    displayProgram.bind();
    gl.uniform2f(displayProgram.uniforms.texelSize, 1.0 / gl.drawingBufferWidth, 1.0 / gl.drawingBufferHeight);
    gl.uniform1i(displayProgram.uniforms.uTexture, dye.read.attach(0));
    if (config.BLOOM) {
        gl.uniform1i(displayProgram.uniforms.uBloom, bloom.attach(1));
    }
    if (config.SUNRAYS) {
        gl.uniform1i(displayProgram.uniforms.uSunrays, sunrays.attach(2));
    }
    // Dithering uniforms (using placeholder texture)
    // const ditherScale = { x: gl.drawingBufferWidth / 1, y: gl.drawingBufferHeight / 1 }; // Placeholder scale
    // gl.uniform2f(displayProgram.uniforms.ditherScale, ditherScale.x, ditherScale.y);
    // gl.uniform1i(displayProgram.uniforms.uDithering, gl.bindTexture(gl.TEXTURE_2D, ditheringTexture)); // Attach placeholder

    blit(target, false); // Draw to the final target (screen or FBO)
}

function applyBloom (source: FBO, destination: FBO) {
    if (bloomFramebuffers.length < 2) return;

    let last = destination;

    gl.disable(gl.BLEND);
    // Prefilter pass
    bloomPrefilterProgram.bind();
    let knee = config.BLOOM_THRESHOLD * config.BLOOM_SOFT_KNEE + 0.0001;
    let curve0 = config.BLOOM_THRESHOLD - knee;
    let curve1 = knee * 2.0;
    let curve2 = 0.25 / knee;
    gl.uniform3f(bloomPrefilterProgram.uniforms.curve, curve0, curve1, curve2);
    gl.uniform1f(bloomPrefilterProgram.uniforms.threshold, config.BLOOM_THRESHOLD);
    gl.uniform1i(bloomPrefilterProgram.uniforms.uTexture, source.attach(0));
    gl.viewport(0, 0, last.width, last.height);
    blit(last);

    // Blur passes (downsampling)
    bloomBlurProgram.bind();
    for (let i = 0; i < bloomFramebuffers.length; i++) {
        let dest = bloomFramebuffers[i];
        gl.uniform2f(bloomBlurProgram.uniforms.texelSize, last.texelSizeX, last.texelSizeY);
        gl.uniform1i(bloomBlurProgram.uniforms.uTexture, last.attach(0));
        gl.viewport(0, 0, dest.width, dest.height);
        blit(dest);
        last = dest;
    }

    // Blend passes (upsampling)
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE); // Additive blending
    gl.blendEquation(gl.FUNC_ADD);

    for (let i = bloomFramebuffers.length - 2; i >= 0; i--) {
        let baseTex = bloomFramebuffers[i];
        gl.uniform2f(bloomBlurProgram.uniforms.texelSize, last.texelSizeX, last.texelSizeY);
        gl.uniform1i(bloomBlurProgram.uniforms.uTexture, last.attach(0));
        gl.viewport(0, 0, baseTex.width, baseTex.height);
        blit(baseTex);
        last = baseTex;
    }

    gl.disable(gl.BLEND);

    // Final bloom pass (apply intensity)
    bloomFinalProgram.bind();
    gl.uniform2f(bloomFinalProgram.uniforms.texelSize, last.texelSizeX, last.texelSizeY);
    gl.uniform1i(bloomFinalProgram.uniforms.uTexture, last.attach(0));
    gl.uniform1f(bloomFinalProgram.uniforms.intensity, config.BLOOM_INTENSITY);
    gl.viewport(0, 0, destination.width, destination.height);
    blit(destination);
}

function applySunrays (source: FBO, mask: FBO, destination: FBO) {
    gl.disable(gl.BLEND);
    // Create sunrays mask
    sunraysMaskProgram.bind();
    gl.uniform1i(sunraysMaskProgram.uniforms.uTexture, source.attach(0));
    gl.viewport(0, 0, mask.width, mask.height); // Use mask dimensions
    blit(mask);

    // Apply sunrays using the mask
    sunraysProgram.bind();
    gl.uniform1f(sunraysProgram.uniforms.weight, config.SUNRAYS_WEIGHT);
    gl.uniform1i(sunraysProgram.uniforms.uTexture, mask.attach(0));
    gl.viewport(0, 0, destination.width, destination.height); // Use destination dimensions
    blit(destination);
}

function blur (target: FBO, temp: FBO, iterations: number) {
    blurProgram.bind();
    for (let i = 0; i < iterations; i++) {
        // Horizontal blur
        gl.uniform2f(blurProgram.uniforms.texelSize, target.texelSizeX, 0.0);
        gl.uniform1i(blurProgram.uniforms.uTexture, target.attach(0));
        blit(temp);

        // Vertical blur
        gl.uniform2f(blurProgram.uniforms.texelSize, 0.0, target.texelSizeY);
        gl.uniform1i(blurProgram.uniforms.uTexture, temp.attach(0));
        blit(target);
    }
}

function splatPointer (pointer: Pointer) {
    let dx = pointer.deltaX * config.SPLAT_FORCE;
    let dy = pointer.deltaY * config.SPLAT_FORCE;
    splat(pointer.texcoordX, pointer.texcoordY, dx, dy, pointer.color);
}

function multipleSplats (amount: number) {
    for (let i = 0; i < amount; i++) {
        const color = generateColor();
        color.r *= 10.0;
        color.g *= 10.0;
        color.b *= 10.0;
        const x = Math.random();
        const y = Math.random();
        const dx = 1000 * (Math.random() - 0.5);
        const dy = 1000 * (Math.random() - 0.5);
        splat(x, y, dx, dy, color);
    }
}

interface RGBColor { r: number, g: number, b: number }

function splat (x: number, y: number, dx: number, dy: number, color: RGBColor) {
    // Splat velocity
    gl.viewport(0, 0, velocity.width, velocity.height);
    splatProgram.bind();
    gl.uniform1i(splatProgram.uniforms.uTarget, velocity.read.attach(0));
    gl.uniform1f(splatProgram.uniforms.aspectRatio, canvas.width / canvas.height);
    gl.uniform2f(splatProgram.uniforms.point, x, y);
    gl.uniform3f(splatProgram.uniforms.color, dx, dy, 0.0);
    gl.uniform1f(splatProgram.uniforms.radius, correctRadius(config.SPLAT_RADIUS / 100.0));
    blit(velocity.write);
    velocity.swap();

    // Splat dye
    gl.viewport(0, 0, dye.width, dye.height);
    gl.uniform1i(splatProgram.uniforms.uTarget, dye.read.attach(0));
    gl.uniform3f(splatProgram.uniforms.color, color.r, color.g, color.b);
    blit(dye.write);
    dye.swap();
}

function correctRadius (radius: number): number {
    let aspectRatio = canvas.width / canvas.height;
    if (aspectRatio > 1)
        radius *= aspectRatio;
    return radius;
}

// --- Event Listeners ---
canvas.addEventListener('mousedown', e => {
    let posX = scaleByPixelRatio(e.offsetX);
    let posY = scaleByPixelRatio(e.offsetY);
    let pointer = pointers.find(p => p.id == -1);
    if (pointer == null) {
       // If no inactive pointer, potentially reuse the primary one (index 0) or create a new one if needed.
       // For simplicity, let's just reuse the primary one for mouse clicks.
       pointer = pointers[0];
    }
    updatePointerDownData(pointer, -1, posX, posY);
});

canvas.addEventListener('mousemove', e => {
    let pointer = pointers[0]; // Always use the first pointer for mouse move
    if (!pointer.down) return;
    let posX = scaleByPixelRatio(e.offsetX);
    let posY = scaleByPixelRatio(e.offsetY);
    updatePointerMoveData(pointer, posX, posY);
});

window.addEventListener('mouseup', () => {
    updatePointerUpData(pointers[0]); // Always use the first pointer for mouse up
});

canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    const touches = e.targetTouches;
    // Ensure enough pointer objects exist
    while (touches.length >= pointers.length)
        pointers.push(pointerPrototype());
    // Assign touches to pointers (starting from index 1)
    for (let i = 0; i < touches.length; i++) {
        let posX = scaleByPixelRatio(touches[i].pageX);
        let posY = scaleByPixelRatio(touches[i].pageY);
        // Find an inactive pointer (id == -1) starting from index 1
        let pointer = pointers.slice(1).find(p => p.id == -1);
        if (!pointer) pointer = pointerPrototype(); // Create if needed (shouldn't happen with the while loop above)
        updatePointerDownData(pointer, touches[i].identifier, posX, posY);
    }
});

canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    const touches = e.targetTouches;
    for (let i = 0; i < touches.length; i++) {
        // Find the pointer associated with this touch
        let pointer = pointers.find(p => p.id == touches[i].identifier);
        if (!pointer || !pointer.down) continue; // Ignore if pointer not found or not down
        let posX = scaleByPixelRatio(touches[i].pageX);
        let posY = scaleByPixelRatio(touches[i].pageY);
        updatePointerMoveData(pointer, posX, posY);
    }
}, false);

window.addEventListener('touchend', e => {
    const touches = e.changedTouches;
    for (let i = 0; i < touches.length; i++) {
        let pointer = pointers.find(p => p.id == touches[i].identifier);
        if (pointer == null) continue;
        updatePointerUpData(pointer);
    }
});

window.addEventListener('keydown', e => {
    if (e.code === 'KeyP')
        config.PAUSED = !config.PAUSED;
    if (e.key === ' ')
        splatStack.push(Math.floor(Math.random() * 20 + 5));
});

function updatePointerDownData (pointer: Pointer, id: number, posX: number, posY: number) {
    pointer.id = id;
    pointer.down = true;
    pointer.moved = false;
    pointer.texcoordX = posX / canvas.width;
    pointer.texcoordY = 1.0 - posY / canvas.height;
    pointer.prevTexcoordX = pointer.texcoordX;
    pointer.prevTexcoordY = pointer.texcoordY;
    pointer.deltaX = 0;
    pointer.deltaY = 0;
    pointer.color = generateColor();
}

function updatePointerMoveData (pointer: Pointer, posX: number, posY: number) {
    pointer.prevTexcoordX = pointer.texcoordX;
    pointer.prevTexcoordY = pointer.texcoordY;
    pointer.texcoordX = posX / canvas.width;
    pointer.texcoordY = 1.0 - posY / canvas.height;
    pointer.deltaX = correctDeltaX(pointer.texcoordX - pointer.prevTexcoordX);
    pointer.deltaY = correctDeltaY(pointer.texcoordY - pointer.prevTexcoordY);
    pointer.moved = Math.abs(pointer.deltaX) > 0 || Math.abs(pointer.deltaY) > 0;
}

function updatePointerUpData (pointer: Pointer) {
    pointer.down = false;
    // Mark the pointer as inactive by resetting its ID
    pointer.id = -1;
}

function correctDeltaX (delta: number): number {
    let aspectRatio = canvas.width / canvas.height;
    if (aspectRatio < 1)
        delta *= aspectRatio;
    return delta;
}

function correctDeltaY (delta: number): number {
    let aspectRatio = canvas.width / canvas.height;
    if (aspectRatio > 1)
        delta /= aspectRatio;
    return delta;
}

function generateColor (): RGBColor {
    let c = HSVtoRGB(Math.random(), 1.0, 1.0);
    c.r *= 0.15;
    c.g *= 0.15;
    c.b *= 0.15;
    return c;
}

function HSVtoRGB (h: number, s: number, v: number): RGBColor {
    let r, g, b, i, f, p, q, t;
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v; g = t; b = p; break;
        case 1: r = q; g = v; b = p; break;
        case 2: r = p; g = v; b = t; break;
        case 3: r = p; g = q; b = v; break;
        case 4: r = t; g = p; b = v; break;
        case 5: r = v; g = p; b = q; break;
        default: r = 0; g = 0; b = 0; // Should not happen
    }
    return { r, g, b };
}

function normalizeColor (input: RGBColor): RGBColor {
    return {
        r: input.r / 255,
        g: input.g / 255,
        b: input.b / 255
    };
}

function wrap (value: number, min: number, max: number): number {
    let range = max - min;
    if (range == 0) return min;
    return (value - min) % range + min;
}

function getResolution (resolution: number): { width: number, height: number } {
    let aspectRatio = gl.drawingBufferWidth / gl.drawingBufferHeight;
    if (aspectRatio < 1)
        aspectRatio = 1.0 / aspectRatio;

    let min = Math.round(resolution);
    let max = Math.round(resolution * aspectRatio);

    if (gl.drawingBufferWidth > gl.drawingBufferHeight)
        return { width: max, height: min };
    else
        return { width: min, height: max };
}

function getTextureScale (texture: {width: number, height: number}, width: number, height: number): { x: number, y: number } {
    return {
        x: width / texture.width,
        y: height / texture.height
    };
}

function scaleByPixelRatio (input: number): number {
    let pixelRatio = window.devicePixelRatio || 1;
    return Math.floor(input * pixelRatio);
}

function resizeCanvas () {
    let width = scaleByPixelRatio(canvas.clientWidth);
    let height = scaleByPixelRatio(canvas.clientHeight);
    if (canvas.width != width || canvas.height != height) {
        canvas.width = width;
        canvas.height = height;
        return true;
    }
    return false;
}

function resizeFBO (target: FBO, w: number, h: number, internalFormat: number, format: number, type: number, param: number): FBO {
    let newFBO = createFBO(w, h, internalFormat, format, type, param);
    copyProgram.bind();
    gl.uniform1i(copyProgram.uniforms.uTexture, target.attach(0));
    blit(newFBO);
    // Cleanup old FBO resources
    gl.deleteFramebuffer(target.fbo);
    gl.deleteTexture(target.texture);
    return newFBO;
}

function resizeDoubleFBO (target: DoubleFBO, w: number, h: number, internalFormat: number, format: number, type: number, param: number): DoubleFBO {
    // Cleanup write FBO before resizing read FBO
    gl.deleteFramebuffer(target.write.fbo);
    gl.deleteTexture(target.write.texture);

    target.read = resizeFBO(target.read, w, h, internalFormat, format, type, param);
    target.write = createFBO(w, h, internalFormat, format, type, param); // Create a fresh write FBO
    target.width = w;
    target.height = h;
    target.texelSizeX = 1.0 / w;
    target.texelSizeY = 1.0 / h;
    return target;
}

// EEG wave mapping functions
function updateEEGParameters(alpha: number, beta: number, theta: number, gamma: number, delta: number) {
    // Alpha waves (8-13 Hz) - Velocity dissipation
    config.VELOCITY_DISSIPATION = 0.2 + (1 - alpha) * 0.3; // Range: 0.2-0.5
    
    // Beta waves (13-30 Hz) - Curl/vorticity
    config.CURL = 30 + beta * 70; // Range: 30-100
    
    // Theta waves (4-8 Hz) - Bloom intensity
    config.BLOOM_INTENSITY = 0.8 + theta * 0.4; // Range: 0.8-1.2
    
    // Gamma waves (30-100 Hz) - Splat force
    config.SPLAT_FORCE = 6000 + gamma * 4000; // Range: 6000-10000
    
    // Delta waves (0.5-4 Hz) - Density dissipation
    config.DENSITY_DISSIPATION = 1.0 + delta * 0.5; // Range: 1.0-1.5
}

// Example OSC message handler
function handleOSCMessage(address: string, args: any[]) {
    if (address === '/muse/elements/alpha_relative') {
        config.EEG_ALPHA = args[0];
    } else if (address === '/muse/elements/beta_relative') {
        config.EEG_BETA = args[0];
    } else if (address === '/muse/elements/theta_relative') {
        config.EEG_THETA = args[0];
    } else if (address === '/muse/elements/gamma_relative') {
        config.EEG_GAMMA = args[0];
    } else if (address === '/muse/elements/delta_relative') {
        config.EEG_DELTA = args[0];
    }
    
    // Update all EEG parameters
    updateEEGParameters(
        config.EEG_ALPHA,
        config.EEG_BETA,
        config.EEG_THETA,
        config.EEG_GAMMA,
        config.EEG_DELTA
    );
}

// Initialize OSC controller
const oscController = new FluidOSCController();

// Start the OSC controller when the page loads
window.addEventListener('load', async () => {
    const started = await oscController.start();
    if (started) {
        console.log('OSC controller started successfully');
    } else {
        console.error('Failed to start OSC controller');
    }
});

// Stop the OSC controller when the page unloads
window.addEventListener('unload', async () => {
    await oscController.stop();
});

// Start the simulation loop
update();