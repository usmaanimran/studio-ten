'use client';
import { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Lenis from 'lenis';

// --- DYNAMIC CONFIGURATION ---
const CONFIG = {
  itemCount: 20,
  zGap: 800,
  camSpeed: 2.5,
  colors: ['#ff003c', '#00f3ff', '#ccff00', '#ffffff'],
};

const START_DELAY_Z = 1500;
const MAX_DEPTH = (CONFIG.itemCount - 1) * CONFIG.zGap + START_DELAY_Z;
const TOTAL_SCROLL_PX = MAX_DEPTH / CONFIG.camSpeed;

const TEXTS = ["IMPACT", "VELOCITY", "BRUTAL", "SYSTEM", "FUTURE", "DESIGN", "PIXEL", "HYPER", "NEON", "VOID"];

// ============================================================================
// NATIVE FLUID CANVAS (THE NEON FOG - FULLY RESTORED)
// ============================================================================
function NativeFluidCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animationId: number;
    let cleanupWebGL: () => void = () => {};

    const initTimer = setTimeout(() => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;

      const isMobile = window.innerWidth < 768;
      
      const config = {
        TEXTURE_DOWNSAMPLE: isMobile ? 2 : 1, 
        DENSITY_DISSIPATION: 0.97,
        VELOCITY_DISSIPATION: 0.98,
        PRESSURE_DISSIPATION: 0.8,
        PRESSURE_ITERATIONS: isMobile ? 5 : 20,
        CURL: isMobile ? 12 : 18, 
        SPLAT_RADIUS: 0.004, 
      };

      class Pointer {
        id: number = -1; x: number = 0; y: number = 0; dx: number = 0; dy: number = 0;
        down: boolean = false; color: number[] = [0, 0, 0]; queue: any[] = [];
      }

      const pointers: Pointer[] = [new Pointer()];
      const splatStack: number[] = [];

      const ctx = getWebGLContext(canvas);
      if (!ctx) return;
      const { gl, ext } = ctx;

      function getWebGLContext(canvas: HTMLCanvasElement): any {
        const params = { alpha: false, depth: false, stencil: false, antialias: false, preserveDrawingBuffer: false };
        let gl = canvas.getContext('webgl2', params) as any;
        const isWebGL2 = !!gl;
        if (!isWebGL2) gl = canvas.getContext('webgl', params) || canvas.getContext('experimental-webgl', params);
        if (!gl) return null;

        let halfFloat, supportLinearFiltering;
        if (isWebGL2) {
          gl.getExtension('EXT_color_buffer_float');
          supportLinearFiltering = gl.getExtension('OES_texture_float_linear');
        } else {
          halfFloat = gl.getExtension('OES_texture_half_float');
          supportLinearFiltering = gl.getExtension('OES_texture_half_float_linear');
        }

        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        const halfFloatTexType = isWebGL2 ? gl.HALF_FLOAT : halfFloat.HALF_FLOAT_OES;
        let formatRGBA, formatRG, formatR;

        if (isWebGL2) {
          formatRGBA = getSupportedFormat(gl, gl.RGBA16F, gl.RGBA, halfFloatTexType);
          formatRG = getSupportedFormat(gl, gl.RG16F, gl.RG, halfFloatTexType);
          formatR = getSupportedFormat(gl, gl.R16F, gl.RED, halfFloatTexType);
        } else {
          formatRGBA = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
          formatRG = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
          formatR = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
        }

        return { gl, ext: { formatRGBA, formatRG, formatR, halfFloatTexType, supportLinearFiltering } };
      }

      function getSupportedFormat(gl: any, internalFormat: any, format: any, type: any): any {
        if (!supportRenderTextureFormat(gl, internalFormat, format, type)) {
          switch (internalFormat) {
            case gl.R16F: return getSupportedFormat(gl, gl.RG16F, gl.RG, type);
            case gl.RG16F: return getSupportedFormat(gl, gl.RGBA16F, gl.RGBA, type);
            default: return null;
          }
        }
        return { internalFormat, format };
      }

      function supportRenderTextureFormat(gl: any, internalFormat: any, format: any, type: any) {
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null);
        const fbo = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        return status === gl.FRAMEBUFFER_COMPLETE;
      }

      class GLProgram {
        program: any; uniforms: any = {};
        constructor(vertexShader: any, fragmentShader: any) {
          this.program = gl.createProgram();
          gl.attachShader(this.program, vertexShader);
          gl.attachShader(this.program, fragmentShader);
          gl.linkProgram(this.program);
          if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) throw gl.getProgramInfoLog(this.program);
          const uniformCount = gl.getProgramParameter(this.program, gl.ACTIVE_UNIFORMS);
          for (let i = 0; i < uniformCount; i++) {
            const uniformName = gl.getActiveUniform(this.program, i).name;
            this.uniforms[uniformName] = gl.getUniformLocation(this.program, uniformName);
          }
        }
        bind() { gl.useProgram(this.program); }
      }

      function compileShader(type: any, source: string) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw gl.getShaderInfoLog(shader);
        return shader;
      }

      const baseVertexShader = compileShader(gl.VERTEX_SHADER, `
        precision highp float;
        precision mediump sampler2D;
        attribute vec2 aPosition;
        varying vec2 vUv;
        varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB;
        uniform vec2 texelSize;
        void main () {
            vUv = aPosition * 0.5 + 0.5;
            vL = vUv - vec2(texelSize.x, 0.0);
            vR = vUv + vec2(texelSize.x, 0.0);
            vT = vUv + vec2(0.0, texelSize.y);
            vB = vUv - vec2(0.0, texelSize.y);
            gl_Position = vec4(aPosition, 0.0, 1.0);
        }
      `);

      const clearShader = compileShader(gl.FRAGMENT_SHADER, `
        precision mediump float;
        precision mediump sampler2D;
        varying vec2 vUv;
        uniform sampler2D uTexture;
        uniform float value;
        void main () { gl_FragColor = value * texture2D(uTexture, vUv); }
      `);

      const displayShader = compileShader(gl.FRAGMENT_SHADER, `
        precision highp float;
        precision mediump sampler2D;
        varying vec2 vUv;
        uniform sampler2D uTexture;
        void main () { gl_FragColor = texture2D(uTexture, vUv); }
      `);

      const splatShader = compileShader(gl.FRAGMENT_SHADER, `
        precision highp float;
        precision mediump sampler2D;
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
      `);

      const advectionShader = compileShader(gl.FRAGMENT_SHADER, `
        precision highp float;
        precision mediump sampler2D;
        varying vec2 vUv;
        uniform sampler2D uVelocity;
        uniform sampler2D uSource;
        uniform vec2 texelSize;
        uniform float dt;
        uniform float dissipation;
        void main () {
            vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
            gl_FragColor = dissipation * texture2D(uSource, coord);
            gl_FragColor.a = 1.0;
        }
      `);

      const divergenceShader = compileShader(gl.FRAGMENT_SHADER, `
        precision mediump float;
        precision mediump sampler2D;
        varying vec2 vUv; varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB;
        uniform sampler2D uVelocity;
        vec2 sampleVelocity (in vec2 uv) {
            vec2 multiplier = vec2(1.0, 1.0);
            if (uv.x < 0.0) { uv.x = 0.0; multiplier.x = -1.0; }
            if (uv.x > 1.0) { uv.x = 1.0; multiplier.x = -1.0; }
            if (uv.y < 0.0) { uv.y = 0.0; multiplier.y = -1.0; }
            if (uv.y > 1.0) { uv.y = 1.0; multiplier.y = -1.0; }
            return multiplier * texture2D(uVelocity, uv).xy;
        }
        void main () {
            float L = sampleVelocity(vL).x; float R = sampleVelocity(vR).x;
            float T = sampleVelocity(vT).y; float B = sampleVelocity(vB).y;
            float div = 0.5 * (R - L + T - B);
            gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
        }
      `);

      const curlShader = compileShader(gl.FRAGMENT_SHADER, `
        precision mediump float;
        precision mediump sampler2D;
        varying vec2 vUv; varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB;
        uniform sampler2D uVelocity;
        void main () {
            float L = texture2D(uVelocity, vL).y; float R = texture2D(uVelocity, vR).y;
            float T = texture2D(uVelocity, vT).x; float B = texture2D(uVelocity, vB).x;
            float vorticity = R - L - T + B;
            gl_FragColor = vec4(vorticity, 0.0, 0.0, 1.0);
        }
      `);

      const vorticityShader = compileShader(gl.FRAGMENT_SHADER, `
        precision highp float;
        precision mediump sampler2D;
        varying vec2 vUv; varying vec2 vT; varying vec2 vB;
        uniform sampler2D uVelocity; uniform sampler2D uCurl;
        uniform float curl; uniform float dt;
        void main () {
            float T = texture2D(uCurl, vT).x; float B = texture2D(uCurl, vB).x; float C = texture2D(uCurl, vUv).x;
            vec2 force = vec2(abs(T) - abs(B), 0.0);
            force *= 1.0 / length(force + 0.00001) * curl * C;
            vec2 vel = texture2D(uVelocity, vUv).xy;
            gl_FragColor = vec4(vel + force * dt, 0.0, 1.0);
        }
      `);

      const pressureShader = compileShader(gl.FRAGMENT_SHADER, `
        precision mediump float;
        precision mediump sampler2D;
        varying vec2 vUv; varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB;
        uniform sampler2D uPressure; uniform sampler2D uDivergence;
        vec2 boundary (in vec2 uv) { return min(max(uv, 0.0), 1.0); }
        void main () {
            float L = texture2D(uPressure, boundary(vL)).x; float R = texture2D(uPressure, boundary(vR)).x;
            float T = texture2D(uPressure, boundary(vT)).x; float B = texture2D(uPressure, boundary(vB)).x;
            float C = texture2D(uPressure, vUv).x; float divergence = texture2D(uDivergence, vUv).x;
            float pressure = (L + R + B + T - divergence) * 0.25;
            gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
        }
      `);

      const gradientSubtractShader = compileShader(gl.FRAGMENT_SHADER, `
        precision mediump float;
        precision mediump sampler2D;
        varying vec2 vUv; varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB;
        uniform sampler2D uVelocity; uniform sampler2D uPressure;
        vec2 boundary (in vec2 uv) { return min(max(uv, 0.0), 1.0); }
        void main () {
            float L = texture2D(uPressure, boundary(vL)).x; float R = texture2D(uPressure, boundary(vR)).x;
            float T = texture2D(uPressure, boundary(vT)).x; float B = texture2D(uPressure, boundary(vB)).x;
            vec2 velocity = texture2D(uVelocity, vUv).xy;
            velocity.xy -= vec2(R - L, T - B);
            gl_FragColor = vec4(velocity, 0.0, 1.0);
        }
      `);

      let textureWidth: number; let textureHeight: number;
      let density: any; let velocity: any; let divergence: any; let curl: any; let pressure: any;

      initFramebuffers();

      const clearProgram = new GLProgram(baseVertexShader, clearShader);
      const displayProgram = new GLProgram(baseVertexShader, displayShader);
      const splatProgram = new GLProgram(baseVertexShader, splatShader);
      const advectionProgram = new GLProgram(baseVertexShader, advectionShader);
      const divergenceProgram = new GLProgram(baseVertexShader, divergenceShader);
      const curlProgram = new GLProgram(baseVertexShader, curlShader);
      const vorticityProgram = new GLProgram(baseVertexShader, vorticityShader);
      const pressureProgram = new GLProgram(baseVertexShader, pressureShader);
      const gradienSubtractProgram = new GLProgram(baseVertexShader, gradientSubtractShader);

      function initFramebuffers() {
        textureWidth = gl.drawingBufferWidth >> config.TEXTURE_DOWNSAMPLE;
        textureHeight = gl.drawingBufferHeight >> config.TEXTURE_DOWNSAMPLE;
        const texType = ext.halfFloatTexType;
        const rgba = ext.formatRGBA; const rg = ext.formatRG; const r = ext.formatR;
        density = createDoubleFBO(2, textureWidth, textureHeight, rgba.internalFormat, rgba.format, texType, ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST);
        velocity = createDoubleFBO(0, textureWidth, textureHeight, rg.internalFormat, rg.format, texType, ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST);
        divergence = createFBO(4, textureWidth, textureHeight, r.internalFormat, r.format, texType, gl.NEAREST);
        curl = createFBO(5, textureWidth, textureHeight, r.internalFormat, r.format, texType, gl.NEAREST);
        pressure = createDoubleFBO(6, textureWidth, textureHeight, r.internalFormat, r.format, texType, gl.NEAREST);
      }

      function createFBO(texId: number, w: number, h: number, internalFormat: any, format: any, type: any, param: any) {
        gl.activeTexture(gl.TEXTURE0 + texId);
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);
        const fbo = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        gl.viewport(0, 0, w, h);
        gl.clear(gl.COLOR_BUFFER_BIT);
        return [texture, fbo, texId];
      }

      function createDoubleFBO(texId: number, w: number, h: number, internalFormat: any, format: any, type: any, param: any) {
        let fbo1 = createFBO(texId, w, h, internalFormat, format, type, param);
        let fbo2 = createFBO(texId + 1, w, h, internalFormat, format, type, param);
        return {
          get read() { return fbo1; }, get write() { return fbo2; },
          swap() { const temp = fbo1; fbo1 = fbo2; fbo2 = temp; }
        };
      }

      const blit = (() => {
        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(0);
        return (destination: any) => {
          gl.bindFramebuffer(gl.FRAMEBUFFER, destination);
          gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
        };
      })();

      function HSVtoRGB(h: number, s: number, v: number) {
        let r = 0, g = 0, b = 0, i, f, p, q, t;
        i = Math.floor(h * 6); f = h * 6 - i; p = v * (1 - s); q = v * (1 - f * s); t = v * (1 - (1 - f) * s);
        switch (i % 6) {
          case 0: r = v, g = t, b = p; break; case 1: r = q, g = v, b = p; break;
          case 2: r = p, g = v, b = t; break; case 3: r = p, g = q, b = v; break;
          case 4: r = t, g = p, b = v; break; case 5: r = v, g = p, b = q; break;
        }
        return [r, g, b];
      }

      let lastTime = Date.now();
      multipleSplats(isMobile ? 1 : 3);

      function update() {
        resizeCanvas();
        const now = Date.now(); let rawDt = (now - lastTime) / 1000; let dt = Math.min(rawDt, 0.016666); lastTime = now;
        const frameRatio = dt * 60.0;
        const velDissipation = Math.pow(config.VELOCITY_DISSIPATION, frameRatio);
        const denDissipation = Math.pow(config.DENSITY_DISSIPATION, frameRatio);
        const preDissipation = Math.pow(config.PRESSURE_DISSIPATION, frameRatio);

        gl.viewport(0, 0, textureWidth, textureHeight);

        if (splatStack.length > 0) multipleSplats(splatStack.pop() as number);

        for (let i = 0; i < pointers.length; i++) {
          const pointer = pointers[i];
          while (pointer.queue.length > 0) {
            const p = pointer.queue.shift();
            splat(p.x, p.y, p.dx, p.dy, p.color);
          }
        }

        advectionProgram.bind();
        gl.uniform2f(advectionProgram.uniforms.texelSize, 1.0 / textureWidth, 1.0 / textureHeight);
        gl.uniform1i(advectionProgram.uniforms.uVelocity, velocity.read[2]);
        gl.uniform1i(advectionProgram.uniforms.uSource, velocity.read[2]);
        gl.uniform1f(advectionProgram.uniforms.dt, dt);
        gl.uniform1f(advectionProgram.uniforms.dissipation, velDissipation); 
        blit(velocity.write[1]); velocity.swap();

        gl.uniform1i(advectionProgram.uniforms.uVelocity, velocity.read[2]);
        gl.uniform1i(advectionProgram.uniforms.uSource, density.read[2]);
        gl.uniform1f(advectionProgram.uniforms.dissipation, denDissipation);
        blit(density.write[1]); density.swap();

        curlProgram.bind();
        gl.uniform2f(curlProgram.uniforms.texelSize, 1.0 / textureWidth, 1.0 / textureHeight);
        gl.uniform1i(curlProgram.uniforms.uVelocity, velocity.read[2]);
        blit(curl[1]);

        vorticityProgram.bind();
        gl.uniform2f(vorticityProgram.uniforms.texelSize, 1.0 / textureWidth, 1.0 / textureHeight);
        gl.uniform1i(vorticityProgram.uniforms.uVelocity, velocity.read[2]);
        gl.uniform1i(vorticityProgram.uniforms.uCurl, curl[2]);
        gl.uniform1f(vorticityProgram.uniforms.curl, config.CURL);
        gl.uniform1f(vorticityProgram.uniforms.dt, dt);
        blit(velocity.write[1]); velocity.swap();

        divergenceProgram.bind();
        gl.uniform2f(divergenceProgram.uniforms.texelSize, 1.0 / textureWidth, 1.0 / textureHeight);
        gl.uniform1i(divergenceProgram.uniforms.uVelocity, velocity.read[2]);
        blit(divergence[1]);

        clearProgram.bind();
        let pressureTexId = pressure.read[2];
        gl.activeTexture(gl.TEXTURE0 + pressureTexId);
        gl.bindTexture(gl.TEXTURE_2D, pressure.read[0]);
        gl.uniform1i(clearProgram.uniforms.uTexture, pressureTexId);
        gl.uniform1f(clearProgram.uniforms.value, preDissipation);
        blit(pressure.write[1]); pressure.swap();

        pressureProgram.bind();
        gl.uniform2f(pressureProgram.uniforms.texelSize, 1.0 / textureWidth, 1.0 / textureHeight);
        gl.uniform1i(pressureProgram.uniforms.uDivergence, divergence[2]);
        pressureTexId = pressure.read[2];
        gl.uniform1i(pressureProgram.uniforms.uPressure, pressureTexId);
        gl.activeTexture(gl.TEXTURE0 + pressureTexId);
        for (let i = 0; i < config.PRESSURE_ITERATIONS; i++) {
          gl.bindTexture(gl.TEXTURE_2D, pressure.read[0]);
          blit(pressure.write[1]); pressure.swap();
        }

        gradienSubtractProgram.bind();
        gl.uniform2f(gradienSubtractProgram.uniforms.texelSize, 1.0 / textureWidth, 1.0 / textureHeight);
        gl.uniform1i(gradienSubtractProgram.uniforms.uPressure, pressure.read[2]);
        gl.uniform1i(gradienSubtractProgram.uniforms.uVelocity, velocity.read[2]);
        blit(velocity.write[1]); velocity.swap();

        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        displayProgram.bind();
        gl.uniform1i(displayProgram.uniforms.uTexture, density.read[2]);
        blit(null);

        animationId = requestAnimationFrame(update);
      }

      function splat(x: number, y: number, dx: number, dy: number, color: number[]) {
        splatProgram.bind();
        gl.uniform1i(splatProgram.uniforms.uTarget, velocity.read[2]);
        gl.uniform1f(splatProgram.uniforms.aspectRatio, canvas!.width / canvas!.height);
        gl.uniform2f(splatProgram.uniforms.point, x / canvas!.width, 1.0 - y / canvas!.height);
        gl.uniform3f(splatProgram.uniforms.color, dx, -dy, 1.0);
        gl.uniform1f(splatProgram.uniforms.radius, config.SPLAT_RADIUS);
        blit(velocity.write[1]); velocity.swap();

        gl.uniform1i(splatProgram.uniforms.uTarget, density.read[2]);
        gl.uniform3f(splatProgram.uniforms.color, color[0] * 0.08, color[1] * 0.08, color[2] * 0.08);
        blit(density.write[1]); density.swap();
      }

      function multipleSplats(amount: number) {
        for (let i = 0; i < amount; i++) {
          const color = HSVtoRGB(Math.random(), 1.0, 1.0);
          const x = canvas!.width * Math.random();
          const y = canvas!.height * Math.random();
          const dx = 1000 * (Math.random() - 0.5);
          const dy = 1000 * (Math.random() - 0.5);
          splat(x, y, dx, dy, color);
        }
      }

      function resizeCanvas() {
        if (canvas!.width !== canvas!.clientWidth || canvas!.height !== canvas!.clientHeight) {
          canvas!.width = canvas!.clientWidth;
          canvas!.height = canvas!.clientHeight;
          initFramebuffers();
        }
      }

      const handleMouseMove = (e: MouseEvent) => {
        const pointer = pointers[0];
        const hue = (Date.now() % 5000) / 5000;
        pointer.color = HSVtoRGB(hue, 1.0, 1.0);

        if (pointer.x === 0 && pointer.y === 0) {
          pointer.x = e.offsetX; pointer.y = e.offsetY; return;
        }

        const dx = e.offsetX - pointer.x; const dy = e.offsetY - pointer.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const steps = Math.min(20, Math.max(1, Math.floor(dist / 20))); 

        for (let i = 1; i <= steps; i++) {
          pointer.queue.push({
            x: pointer.x + dx * (i / steps), y: pointer.y + dy * (i / steps),
            dx: dx * 10.0, dy: dy * 10.0, color: pointer.color
          });
        }
        pointer.x = e.offsetX; pointer.y = e.offsetY;
        pointer.dx = dx * 12.0; pointer.dy = dy * 12.0;
        pointer.down = true; 
      };

      const handleTouchMove = (e: TouchEvent) => {
        const touches = e.targetTouches;
        const hue = (Date.now() % 5000) / 5000;

        for (let i = 0; i < touches.length; i++) {
          const pointer = pointers[i];
          if(pointer) {
            const dx = touches[i].clientX - pointer.x;
            const dy = touches[i].clientY - pointer.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const steps = Math.min(20, Math.max(1, Math.floor(dist / 20)));

            for (let step = 1; step <= steps; step++) {
              pointer.queue.push({
                x: pointer.x + dx * (step / steps), y: pointer.y + dy * (step / steps),
                dx: dx * 10.0, dy: dy * 10.0, color: HSVtoRGB((hue + (i * 0.2)) % 1, 1.0, 1.0)
              });
            }
            pointer.x = touches[i].clientX; pointer.y = touches[i].clientY;
            pointer.dx = dx * 12.0; pointer.dy = dy * 12.0; pointer.down = true;
          }
        }
      };

      const handleTouchStart = (e: TouchEvent) => {
        const touches = e.targetTouches;
        const hue = (Date.now() % 5000) / 5000;
        for (let i = 0; i < touches.length; i++) {
          if (i >= pointers.length) pointers.push(new Pointer());
          pointers[i].id = touches[i].identifier; pointers[i].down = true;
          pointers[i].x = touches[i].clientX; pointers[i].y = touches[i].clientY;
          pointers[i].color = HSVtoRGB((hue + (i * 0.2)) % 1, 1.0, 1.0);
        }
      };

      const handleMouseLeave = () => { pointers[0].down = false; pointers[0].x = 0; pointers[0].y = 0; };
      
      const handleTouchEnd = (e: TouchEvent) => {
        const touches = e.changedTouches;
        for (let i = 0; i < touches.length; i++) {
          for (let j = 0; j < pointers.length; j++) {
            if (touches[i].identifier === pointers[j].id) {
              pointers[j].down = false; pointers[j].x = 0; pointers[j].y = 0;
            }
          }
        }
      };

      canvas.addEventListener('mousemove', handleMouseMove);
      canvas.addEventListener('touchmove', handleTouchMove, { passive: true });
      canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
      window.addEventListener('mouseleave', handleMouseLeave);
      window.addEventListener('touchend', handleTouchEnd);

      update();

      cleanupWebGL = () => {
        cancelAnimationFrame(animationId);
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('touchmove', handleTouchMove);
        canvas.removeEventListener('touchstart', handleTouchStart);
        window.removeEventListener('mouseleave', handleMouseLeave);
        window.removeEventListener('touchend', handleTouchEnd);
      };

    }, 100);

    return () => { clearTimeout(initTimer); cleanupWebGL(); };
  }, []);

  return <canvas ref={canvasRef} className="w-full h-full block" />;
}

// ============================================================================
// MAIN PAGE COMPONENT: INTEGRATED SEQUENCE
// ============================================================================
export default function WebArchitecturePage() {
  const [mountCanvas, setMountCanvas] = useState(false);
  const [itemsData, setItemsData] = useState<any[]>([]);

  const worldRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  
  const fpsRef = useRef<HTMLElement>(null);
  const velRef = useRef<HTMLElement>(null);
  const coordRef = useRef<HTMLElement>(null);

  const stateRef = useRef({
    mouseX: 0,
    mouseY: 0,
    visualVelocity: 0 
  });

  useEffect(() => {
    const timer = setTimeout(() => setMountCanvas(true), 100); 
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const isMobile = w < 768;
    const activeStarCount = isMobile ? 30 : 100; 
    const newItems = [];

    newItems.push({ id: 'hero-title', type: 'title', x: 0, y: 0, rot: 0, baseZ: 400 });

    for (let i = 0; i < CONFIG.itemCount; i++) {
      const zPos = -START_DELAY_Z - (i * CONFIG.zGap);
      const isHeading = i % 4 === 0;
      
      if (isHeading) {
        newItems.push({
          id: `item-${i}`, type: 'text', text: TEXTS[i % TEXTS.length],
          x: 0, y: 0, rot: 0, baseZ: zPos
        });
      } else {
        const angle = (i / CONFIG.itemCount) * Math.PI * 6;
        
        // --- MOBILE ALIGNMENT FIX ---
        const radiusX = isMobile ? w * 0.05 : w * 0.3; 
        const radiusY = isMobile ? h * 0.25 : h * 0.3;
        
        const x = Math.cos(angle) * radiusX;
        const y = Math.sin(angle) * radiusY;
        const rot = (Math.random() - 0.5) * 30;
        
        newItems.push({
          id: `item-${i}`, type: 'card', text: TEXTS[i % TEXTS.length],
          randId: Math.floor(Math.random() * 9999), gridX: Math.floor(Math.random() * 10), gridY: Math.floor(Math.random() * 10),
          dataSize: (Math.random() * 100).toFixed(1), x, y, rot, baseZ: zPos
        });
      }
    }
    
    for (let i = 0; i < activeStarCount; i++) {
      newItems.push({
        id: `star-${i}`, type: 'star',
        x: (Math.random() - 0.5) * (isMobile ? 1500 : 3000),
        y: (Math.random() - 0.5) * (isMobile ? 1500 : 3000),
        baseZ: -Math.random() * MAX_DEPTH
      });
    }
    setItemsData(newItems);
  }, []);

  // --- OPTIMIZED LENIS INTEGRATION FOR MOBILE ---
  useEffect(() => {
    if (itemsData.length === 0) return;

    const lenis = new Lenis({
      lerp: 0.1, 
      wheelMultiplier: 1,
      smoothWheel: true,
      syncTouch: true, 
      touchMultiplier: 1.2, // --- TOUCH MULTIPLIER TIGHTENED ---
    });

    const handleMouseMove = (e: MouseEvent) => {
      stateRef.current.mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      stateRef.current.mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    let rafId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      lenis.raf(time);

      const s = stateRef.current;
      const rawDelta = time - lastTime;
      lastTime = time;
      
      if (time % 100 < 16 && fpsRef.current) {
        fpsRef.current.innerText = Math.round(1000 / rawDelta).toString(); 
      }

      const currentScroll = lenis.scroll;
      
      const safeVelocity = Math.max(-50, Math.min(50, lenis.velocity));
      s.visualVelocity += (safeVelocity * 1.5 - s.visualVelocity) * 0.1;

      if (velRef.current) velRef.current.innerText = Math.abs(s.visualVelocity).toFixed(2);
      if (coordRef.current) coordRef.current.innerText = currentScroll.toFixed(0);

      const isMobile = window.innerWidth < 768;
      const tiltMult = isMobile ? 2 : 5;
      const tiltX = s.mouseY * tiltMult - s.visualVelocity * 0.3;
      const tiltY = s.mouseX * tiltMult;

      if (worldRef.current) {
        worldRef.current.style.transform = `rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
      }

      const baseFov = 1000;
      const maxFovDrop = isMobile ? 200 : 600; 
      const fovWarp = isMobile ? 4 : 10;
      
      const fov = baseFov - Math.min(Math.abs(s.visualVelocity) * fovWarp, maxFovDrop);
      if (viewportRef.current) {
        viewportRef.current.style.perspective = `${fov}px`;
      }

      const cameraZ = currentScroll * CONFIG.camSpeed;

      // --- NEW: Calculate the active card closest to the camera focus ---
      let activeCardIdx = -1;
      let minZDist = Infinity;
      const TARGET_Z = 200; // The Z-depth focal point right before fade-out

      itemsData.forEach((item, i) => {
        if (item.type === 'card') {
          let vizZ = item.baseZ + cameraZ;
          let dist = Math.abs(vizZ - TARGET_Z);
          if (dist < minZDist && vizZ > -200 && vizZ < 600) {
            minZDist = dist;
            activeCardIdx = i;
          }
        }
      });

      itemsData.forEach((item, i) => {
        const el = itemRefs.current[i];
        if (!el) return;

        let vizZ = item.baseZ + cameraZ;
        let alpha = 1;
        
        if (vizZ < -3000) alpha = 0; 
        else if (vizZ < -2000) alpha = (vizZ + 3000) / 1000; 
        
        if (vizZ > 400 && item.type !== 'star') {
          alpha = 1 - ((vizZ - 400) / 400); 
        }
        if (alpha < 0) alpha = 0;

        if (alpha <= 0.01) {
          if (el.style.visibility !== 'hidden') {
            el.style.visibility = 'hidden';
            el.style.opacity = '0';
          }
          return; 
        } else {
          if (el.style.visibility !== 'visible') {
            el.style.visibility = 'visible';
          }
        }

        el.style.opacity = alpha.toString();
        let trans = `translate3d(${item.x}px, ${item.y}px, ${vizZ}px)`;
        
        if (item.type === 'star') {
          const stretch = Math.max(1, Math.min(1 + Math.abs(s.visualVelocity) * 0.1, 10));
          trans += ` scale3d(1, 1, ${stretch})`;
       } else if (item.type === 'text' || item.type === 'title') {
          trans += ` rotateZ(${item.rot}deg)`;
          
          if (Math.abs(s.visualVelocity) > 1 && item.type !== 'title') {
            const maxSplit = 6; 
            const offset = Math.min(Math.max(s.visualVelocity * 1.5, -maxSplit), maxSplit);
            el.style.textShadow = `${offset}px 0 var(--accent), ${-offset}px 0 var(--accent-2)`;
          } else if (item.type !== 'title') {
            el.style.textShadow = '0 0 30px rgba(255, 255, 255, 0.1)';
          }
        } else {
          const t = time * 0.001;
          const float = Math.sin(t + item.x) * 10;
          trans += ` rotateZ(${item.rot}deg) rotateY(${float}deg)`;
        }
        
        el.style.transform = trans;

        // --- NEW: Apply the active state directly to the DOM element ---
        if (item.type === 'card') {
          if (i === activeCardIdx) {
            el.classList.add('is-active');
          } else {
            el.classList.remove('is-active');
          }
        }
      });

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);

    return () => {
      lenis.destroy();
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(rafId);
    };
  }, [itemsData]);

  return (
    <>
      <style>{`
        :root {
          --card-bg: rgba(10, 10, 10, 0.4);
          --accent: #ff003c;
          --accent-2: #00f3ff;
          --border: rgba(255, 255, 255, 0.1);
        }
        
        .title-text-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-family: var(--font-geist-sans, sans-serif);
          font-weight: 900;
          text-transform: uppercase;
          line-height: 0.85;
          transform: translate(-50%, -50%);
          pointer-events: none;
        }
        
        .strobing-line {
          font-size: 15vw;
          color: transparent;
          -webkit-text-stroke: 2px rgba(255, 255, 255, 0.15);
          position: relative;
          white-space: nowrap;
          letter-spacing: -0.05em;
        }

        @media (max-width: 768px) {
          .strobing-line { font-size: 22vw; -webkit-text-stroke: 1px rgba(255, 255, 255, 0.15); }
        }

        .strobing-line::after {
          content: attr(data-text);
          position: absolute;
          left: 0; top: 0; width: 100%; height: 100%;
          background: linear-gradient(90deg, #ff0080, #ffffff, #00d2ff, #ff0080);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          -webkit-text-stroke: 0px;
          animation: strobeGradient 3s linear infinite, strobeFlicker 0.15s infinite alternate;
          opacity: 0.85;
        }

        @keyframes strobeGradient {
          to { background-position: 200% center; }
        }
        @keyframes strobeFlicker {
          0% { opacity: 0.6; filter: brightness(0.8); }
          100% { opacity: 1; filter: brightness(1.2) drop-shadow(0 0 20px rgba(0, 210, 255, 0.3)); }
        }

        .scanlines {
          position: fixed; inset: 0;
          background: linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0) 50%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.2));
          background-size: 100% 4px; z-index: 10; pointer-events: none;
        }
        .vignette {
          position: fixed; inset: 0;
          background: radial-gradient(circle, transparent 40%, #000 120%);
          z-index: 11; pointer-events: none;
        }
        .noise {
          position: fixed; inset: 0; z-index: 12; opacity: 0.05; pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
        }
        
        .hyper-hud {
          position: fixed; inset: 1rem; z-index: 20; pointer-events: none;
          display: flex; flex-direction: column; justify-content: space-between;
          font-family: var(--font-geist-mono, monospace); font-size: 10px;
          color: rgba(255, 255, 255, 0.5); text-transform: uppercase;
        }
        @media (min-width: 768px) {
          .hyper-hud { inset: 2rem; }
        }
        .hud-line {
          flex: 1; height: 1px; background: rgba(255, 255, 255, 0.2);
          margin: 0 1rem; position: relative;
        }
        .hud-line::after {
          content: ''; position: absolute; right: 0; top: -2px;
          width: 5px; height: 5px; background: var(--accent);
        }

        .viewport {
          position: fixed; inset: 0; perspective: 1000px;
          overflow: hidden; z-index: 5; pointer-events: none;
        }
        .world {
          position: absolute; top: 50%; left: 50%;
          transform-style: preserve-3d; will-change: transform;
        }
        
        .hyper-item {
          position: absolute; left: 0; top: 0;
          backface-visibility: hidden; transform-origin: center center;
          display: flex; align-items: center; justify-content: center;
          will-change: transform, opacity;
        }
        
        .hyper-star {
          position: absolute; width: 2px; height: 2px;
          background: white; transform: translate(-50%, -50%);
        }
        
        /* --- MOBILE CARD SIZING CSS FIX --- */
        /* --- MOBILE CARD SIZING CSS FIX --- */
        .hyper-card {
          width: 250px; height: 380px; background: var(--card-bg);
          border: 1px solid var(--border); position: relative; padding: 1.5rem;
          display: flex; flex-direction: column; justify-content: space-between;
          backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
          box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.5), 0 20px 50px rgba(0, 0, 0, 0.5);
          transition: border-color 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
          transform: translate(-50%, -50%); pointer-events: auto;
        }
        @media (min-width: 768px) {
          .hyper-card { width: 320px; height: 460px; padding: 2rem; }
        }

        /* --- ACTIVE & HOVER STATES (Combined) --- */
        .hyper-item.is-active .hyper-card,
        @media (hover: hover) {
          .hyper-card:hover {
            border-color: var(--accent); box-shadow: 0 0 30px rgba(255, 0, 60, 0.2);
            background: rgba(20, 20, 20, 0.8); z-index: 100;
          }
        }
        .hyper-item.is-active .hyper-card {
           border-color: var(--accent); box-shadow: 0 0 30px rgba(255, 0, 60, 0.2);
           background: rgba(20, 20, 20, 0.8); z-index: 100;
        }

        .hyper-card::before, .hyper-card::after {
          content: ''; position: absolute; width: 10px; height: 10px;
          border: 1px solid transparent; transition: 0.3s;
        }
        .hyper-card::before { top: -1px; left: -1px; border-top-color: #fff; border-left-color: #fff; }
        .hyper-card::after { bottom: -1px; right: -1px; border-bottom-color: #fff; border-right-color: #fff; }
        
        .hyper-item.is-active .hyper-card::before,
        .hyper-item.is-active .hyper-card::after,
        .hyper-card:hover::before, 
        .hyper-card:hover::after {
          width: 100%; height: 100%; border-color: var(--accent);
        }

        .big-text {
          font-family: var(--font-geist-sans, sans-serif); font-size: 15vw; font-weight: 900;
          color: rgba(255, 255, 255, 0.03); 
          -webkit-text-stroke: 2px rgba(255, 255, 255, 0.25); 
          text-transform: uppercase; white-space: nowrap; transform: translate(-50%, -50%);
          pointer-events: none; letter-spacing: -0.5rem; 
        }
        .big-text {
          font-family: var(--font-geist-sans, sans-serif); font-size: 15vw; font-weight: 900;
          color: rgba(255, 255, 255, 0.03); 
          -webkit-text-stroke: 2px rgba(255, 255, 255, 0.25); 
          text-transform: uppercase; white-space: nowrap; transform: translate(-50%, -50%);
          pointer-events: none; letter-spacing: -0.5rem; 
        }
      `}</style>

      <div className="absolute top-0 w-full z-[-1]" style={{ height: `calc(${TOTAL_SCROLL_PX}px + 100vh)` }} />

      <div className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden flex items-center justify-center">
        <motion.div
          initial={{ scale: 1.5, opacity: 1 }}
          animate={{ scale: 10, opacity: 0 }}
          transition={{ duration: 1.2, ease: [0.76, 0, 0.24, 1], delay: 0.1 }}
          className="absolute w-[150vw] h-[150vh] bg-[#020202] rounded-[100%]"
          style={{ willChange: "transform, opacity" }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.8, ease: "easeOut" }}
        className="fixed top-6 left-6 sm:top-10 sm:left-10 z-[100]"
      >
        <Link href="/" className="text-[10px] uppercase tracking-widest text-neutral-500 hover:text-white transition-colors mix-blend-difference font-mono">
          &lt;&lt; SYS_RETURN
        </Link>
      </motion.div>

      <div className="fixed inset-0 z-0 bg-black pointer-events-auto touch-pan-y">
        {mountCanvas && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.5, ease: "easeInOut" }} className="absolute inset-0 w-full h-full">
            <NativeFluidCanvas />
          </motion.div>
        )}
      </div>

      <div className="scanlines"></div>
      <div className="vignette"></div>
      <div className="noise"></div>

      <div className="hyper-hud mix-blend-difference">
        <div className="flex justify-between items-center">
          <span>SYS.READY</span>
          <div className="hud-line"></div>
          <span>FPS: <strong className="text-[#00f3ff]" ref={fpsRef}>60</strong></span>
        </div>
        <div style={{ alignSelf: 'flex-start', marginTop: 'auto', marginBottom: 'auto', writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
          SCROLL VELOCITY // <strong className="text-[#00f3ff]" ref={velRef}>0.00</strong>
        </div>
        <div className="flex justify-between items-center">
          <span>COORD: <strong className="text-[#00f3ff]" ref={coordRef}>000</strong></span>
          <div className="hud-line"></div>
          <span>VER 2.1 [OPT]</span>
        </div>
      </div>

      <div className="viewport" ref={viewportRef}>
        <div className="world" ref={worldRef}>
          {itemsData.map((item, i) => {
            if (item.type === 'title') {
              return (
                <div key={item.id} className="hyper-item" ref={(el) => { itemRefs.current[i] = el; }}>
                  <div className="title-text-container">
                     <div className="strobing-line" data-text="WEB">WEB</div>
                     <div className="strobing-line" data-text="DEV">DEV</div>
                  </div>
                </div>
              );
            } else if (item.type === 'text') {
              return (
                <div key={item.id} className="hyper-item" ref={(el) => { itemRefs.current[i] = el; }}>
                  <div className="big-text">{item.text}</div>
                </div>
              );
            } else if (item.type === 'card') {
              return (
                <div key={item.id} className="hyper-item" ref={(el) => { itemRefs.current[i] = el; }}>
                  <div className="hyper-card font-mono text-white">
                    <div className="border-b border-[rgba(255,255,255,0.1)] pb-2 sm:pb-4 mb-2 sm:mb-4 flex justify-between items-center">
                      <span className="text-[#ff003c] text-xs">ID-{item.randId}</span>
                      <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-[#ff003c]"></div>
                    </div>
                    <h2 className="text-3xl sm:text-4xl leading-[0.9] m-0 uppercase font-bold mix-blend-hard-light">{item.text}</h2>
                    <div className="mt-auto text-[10px] text-[rgba(255,255,255,0.4)] flex justify-between">
                      <span>GRID: {item.gridX}x{item.gridY}</span>
                      <span>DATA_SIZE: {item.dataSize}MB</span>
                    </div>
                    <div className="absolute bottom-4 right-4 sm:bottom-8 sm:right-8 text-5xl sm:text-6xl opacity-10 font-black">
                      {i < 10 ? `0${i}` : i}
                    </div>
                  </div>
                </div>
              );
            } else {
              return (
                <div key={item.id} className="hyper-star" ref={(el) => { itemRefs.current[i] = el; }} />
              );
            }
          })}
        </div>
      </div>
    </>
  );
}
