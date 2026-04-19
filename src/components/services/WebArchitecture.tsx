'use client';
import { useRef, useEffect, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import Link from 'next/link';

function NativeFluidCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animationId: number;
    let cleanupWebGL: () => void = () => {};

    // THE FIX: Wrap the entire WebGL initialization in a 150ms delay
    const initTimer = setTimeout(() => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;

      const config = {
        TEXTURE_DOWNSAMPLE: 1,
        DENSITY_DISSIPATION: 0.965,
        VELOCITY_DISSIPATION: 0.98,
        PRESSURE_DISSIPATION: 0.8,
        PRESSURE_ITERATIONS: 20,
        CURL: 18, 
        SPLAT_RADIUS: 0.004, 
      };

      class Pointer {
        id: number = -1;
        x: number = 0;
        y: number = 0;
        dx: number = 0;
        dy: number = 0;
        down: boolean = false;
        color: number[] = [0, 0, 0];
        queue: any[] = [];
      }

      const pointers: Pointer[] = [new Pointer()];
      const splatStack: number[] = [];

      const ctx = getWebGLContext(canvas);
      if (!ctx) return;
      const { gl, ext } = ctx;

      function getWebGLContext(canvas: HTMLCanvasElement): any {
        const params = { alpha: false, depth: false, stencil: false, antialias: false };
        let gl = canvas.getContext('webgl2', params) as any;
        const isWebGL2 = !!gl;
        if (!isWebGL2) {
          gl = canvas.getContext('webgl', params) || canvas.getContext('experimental-webgl', params);
        }
        if (!gl) return null;

        let halfFloat;
        let supportLinearFiltering;
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
        program: any;
        uniforms: any = {};
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
      `);

      const clearShader = compileShader(gl.FRAGMENT_SHADER, `
        precision highp float;
        precision mediump sampler2D;
        varying vec2 vUv;
        uniform sampler2D uTexture;
        uniform float value;
        void main () {
            gl_FragColor = value * texture2D(uTexture, vUv);
        }
      `);

      const displayShader = compileShader(gl.FRAGMENT_SHADER, `
        precision highp float;
        precision mediump sampler2D;
        varying vec2 vUv;
        uniform sampler2D uTexture;
        void main () {
            gl_FragColor = texture2D(uTexture, vUv);
        }
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

      const advectionManualFilteringShader = compileShader(gl.FRAGMENT_SHADER, `
        precision highp float;
        precision mediump sampler2D;
        varying vec2 vUv;
        uniform sampler2D uVelocity;
        uniform sampler2D uSource;
        uniform vec2 texelSize;
        uniform float dt;
        uniform float dissipation;
        vec4 bilerp (in sampler2D sam, in vec2 p) {
            vec4 st;
            st.xy = floor(p - 0.5) + 0.5;
            st.zw = st.xy + 1.0;
            vec4 uv = st * texelSize.xyxy;
            vec4 a = texture2D(sam, uv.xy);
            vec4 b = texture2D(sam, uv.zy);
            vec4 c = texture2D(sam, uv.xw);
            vec4 d = texture2D(sam, uv.zw);
            vec2 f = p - st.xy;
            return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }
        void main () {
            vec2 coord = gl_FragCoord.xy - dt * texture2D(uVelocity, vUv).xy;
            gl_FragColor = dissipation * bilerp(uSource, coord);
            gl_FragColor.a = 1.0;
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
        precision highp float;
        precision mediump sampler2D;
        varying vec2 vUv;
        varying vec2 vL;
        varying vec2 vR;
        varying vec2 vT;
        varying vec2 vB;
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
            float L = sampleVelocity(vL).x;
            float R = sampleVelocity(vR).x;
            float T = sampleVelocity(vT).y;
            float B = sampleVelocity(vB).y;
            float div = 0.5 * (R - L + T - B);
            gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
        }
      `);

      const curlShader = compileShader(gl.FRAGMENT_SHADER, `
        precision highp float;
        precision mediump sampler2D;
        varying vec2 vUv;
        varying vec2 vL;
        varying vec2 vR;
        varying vec2 vT;
        varying vec2 vB;
        uniform sampler2D uVelocity;
        void main () {
            float L = texture2D(uVelocity, vL).y;
            float R = texture2D(uVelocity, vR).y;
            float T = texture2D(uVelocity, vT).x;
            float B = texture2D(uVelocity, vB).x;
            float vorticity = R - L - T + B;
            gl_FragColor = vec4(vorticity, 0.0, 0.0, 1.0);
        }
      `);

      const vorticityShader = compileShader(gl.FRAGMENT_SHADER, `
        precision highp float;
        precision mediump sampler2D;
        varying vec2 vUv;
        varying vec2 vT;
        varying vec2 vB;
        uniform sampler2D uVelocity;
        uniform sampler2D uCurl;
        uniform float curl;
        uniform float dt;
        void main () {
            float T = texture2D(uCurl, vT).x;
            float B = texture2D(uCurl, vB).x;
            float C = texture2D(uCurl, vUv).x;
            vec2 force = vec2(abs(T) - abs(B), 0.0);
            force *= 1.0 / length(force + 0.00001) * curl * C;
            vec2 vel = texture2D(uVelocity, vUv).xy;
            gl_FragColor = vec4(vel + force * dt, 0.0, 1.0);
        }
      `);

      const pressureShader = compileShader(gl.FRAGMENT_SHADER, `
        precision highp float;
        precision mediump sampler2D;
        varying vec2 vUv;
        varying vec2 vL;
        varying vec2 vR;
        varying vec2 vT;
        varying vec2 vB;
        uniform sampler2D uPressure;
        uniform sampler2D uDivergence;
        vec2 boundary (in vec2 uv) {
            uv = min(max(uv, 0.0), 1.0);
            return uv;
        }
        void main () {
            float L = texture2D(uPressure, boundary(vL)).x;
            float R = texture2D(uPressure, boundary(vR)).x;
            float T = texture2D(uPressure, boundary(vT)).x;
            float B = texture2D(uPressure, boundary(vB)).x;
            float C = texture2D(uPressure, vUv).x;
            float divergence = texture2D(uDivergence, vUv).x;
            float pressure = (L + R + B + T - divergence) * 0.25;
            gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
        }
      `);

      const gradientSubtractShader = compileShader(gl.FRAGMENT_SHADER, `
        precision highp float;
        precision mediump sampler2D;
        varying vec2 vUv;
        varying vec2 vL;
        varying vec2 vR;
        varying vec2 vT;
        varying vec2 vB;
        uniform sampler2D uPressure;
        uniform sampler2D uVelocity;
        vec2 boundary (in vec2 uv) {
            uv = min(max(uv, 0.0), 1.0);
            return uv;
        }
        void main () {
            float L = texture2D(uPressure, boundary(vL)).x;
            float R = texture2D(uPressure, boundary(vR)).x;
            float T = texture2D(uPressure, boundary(vT)).x;
            float B = texture2D(uPressure, boundary(vB)).x;
            vec2 velocity = texture2D(uVelocity, vUv).xy;
            velocity.xy -= vec2(R - L, T - B);
            gl_FragColor = vec4(velocity, 0.0, 1.0);
        }
      `);

      let textureWidth: number;
      let textureHeight: number;
      let density: any;
      let velocity: any;
      let divergence: any;
      let curl: any;
      let pressure: any;

      initFramebuffers();

      const clearProgram = new GLProgram(baseVertexShader, clearShader);
      const displayProgram = new GLProgram(baseVertexShader, displayShader);
      const splatProgram = new GLProgram(baseVertexShader, splatShader);
      const advectionProgram = new GLProgram(baseVertexShader, ext.supportLinearFiltering ? advectionShader : advectionManualFilteringShader);
      const divergenceProgram = new GLProgram(baseVertexShader, divergenceShader);
      const curlProgram = new GLProgram(baseVertexShader, curlShader);
      const vorticityProgram = new GLProgram(baseVertexShader, vorticityShader);
      const pressureProgram = new GLProgram(baseVertexShader, pressureShader);
      const gradienSubtractProgram = new GLProgram(baseVertexShader, gradientSubtractShader);

      function initFramebuffers() {
        textureWidth = gl.drawingBufferWidth >> config.TEXTURE_DOWNSAMPLE;
        textureHeight = gl.drawingBufferHeight >> config.TEXTURE_DOWNSAMPLE;

        const texType = ext.halfFloatTexType;
        const rgba = ext.formatRGBA;
        const rg = ext.formatRG;
        const r = ext.formatR;

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
          get read() { return fbo1; },
          get write() { return fbo2; },
          swap() {
            const temp = fbo1;
            fbo1 = fbo2;
            fbo2 = temp;
          }
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
        i = Math.floor(h * 6);
        f = h * 6 - i;
        p = v * (1 - s);
        q = v * (1 - f * s);
        t = v * (1 - (1 - f) * s);
        switch (i % 6) {
          case 0: r = v, g = t, b = p; break;
          case 1: r = q, g = v, b = p; break;
          case 2: r = p, g = v, b = t; break;
          case 3: r = p, g = q, b = v; break;
          case 4: r = t, g = p, b = v; break;
          case 5: r = v, g = p, b = q; break;
        }
        return [r, g, b];
      }

      let lastTime = Date.now();
      multipleSplats(3);

      function update() {
        resizeCanvas();
        
        const now = Date.now();
        let rawDt = (now - lastTime) / 1000;
        let dt = Math.min(rawDt, 0.016666);
        lastTime = now;

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
        blit(velocity.write[1]);
        velocity.swap();

        gl.uniform1i(advectionProgram.uniforms.uVelocity, velocity.read[2]);
        gl.uniform1i(advectionProgram.uniforms.uSource, density.read[2]);
        gl.uniform1f(advectionProgram.uniforms.dissipation, denDissipation);
        blit(density.write[1]);
        density.swap();

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
        blit(velocity.write[1]);
        velocity.swap();

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
        blit(pressure.write[1]);
        pressure.swap();

        pressureProgram.bind();
        gl.uniform2f(pressureProgram.uniforms.texelSize, 1.0 / textureWidth, 1.0 / textureHeight);
        gl.uniform1i(pressureProgram.uniforms.uDivergence, divergence[2]);
        pressureTexId = pressure.read[2];
        gl.uniform1i(pressureProgram.uniforms.uPressure, pressureTexId);
        gl.activeTexture(gl.TEXTURE0 + pressureTexId);
        for (let i = 0; i < config.PRESSURE_ITERATIONS; i++) {
          gl.bindTexture(gl.TEXTURE_2D, pressure.read[0]);
          blit(pressure.write[1]);
          pressure.swap();
        }

        gradienSubtractProgram.bind();
        gl.uniform2f(gradienSubtractProgram.uniforms.texelSize, 1.0 / textureWidth, 1.0 / textureHeight);
        gl.uniform1i(gradienSubtractProgram.uniforms.uPressure, pressure.read[2]);
        gl.uniform1i(gradienSubtractProgram.uniforms.uVelocity, velocity.read[2]);
        blit(velocity.write[1]);
        velocity.swap();

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
        blit(velocity.write[1]);
        velocity.swap();

        gl.uniform1i(splatProgram.uniforms.uTarget, density.read[2]);
        gl.uniform3f(splatProgram.uniforms.color, color[0] * 0.08, color[1] * 0.08, color[2] * 0.08);
        blit(density.write[1]);
        density.swap();
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
          pointer.x = e.offsetX;
          pointer.y = e.offsetY;
          return;
        }

        const dx = e.offsetX - pointer.x;
        const dy = e.offsetY - pointer.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const steps = Math.min(50, Math.max(1, Math.floor(dist / 10)));

        for (let i = 1; i <= steps; i++) {
          pointer.queue.push({
            x: pointer.x + dx * (i / steps),
            y: pointer.y + dy * (i / steps),
            dx: dx * 10.0, 
            dy: dy * 10.0,
            color: pointer.color
          });
        }

        pointer.x = e.offsetX;
        pointer.y = e.offsetY;
        pointer.dx = dx * 12.0; 
        pointer.dy = dy * 12.0;
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
            const steps = Math.min(50, Math.max(1, Math.floor(dist / 10)));

            for (let step = 1; step <= steps; step++) {
              pointer.queue.push({
                x: pointer.x + dx * (step / steps),
                y: pointer.y + dy * (step / steps),
                dx: dx * 10.0, 
                dy: dy * 10.0,
                color: HSVtoRGB((hue + (i * 0.2)) % 1, 1.0, 1.0)
              });
            }

            pointer.x = touches[i].clientX;
            pointer.y = touches[i].clientY;
            pointer.dx = dx * 12.0;
            pointer.dy = dy * 12.0;
            pointer.down = true;
          }
        }
      };

      const handleTouchStart = (e: TouchEvent) => {
        const touches = e.targetTouches;
        const hue = (Date.now() % 5000) / 5000;

        for (let i = 0; i < touches.length; i++) {
          if (i >= pointers.length) pointers.push(new Pointer());
          pointers[i].id = touches[i].identifier;
          pointers[i].down = true;
          pointers[i].x = touches[i].clientX;
          pointers[i].y = touches[i].clientY;
          pointers[i].color = HSVtoRGB((hue + (i * 0.2)) % 1, 1.0, 1.0);
        }
      };

      const handleMouseLeave = () => { 
        pointers[0].down = false; 
        pointers[0].x = 0;
        pointers[0].y = 0;
      };
      
      const handleTouchEnd = (e: TouchEvent) => {
        const touches = e.changedTouches;
        for (let i = 0; i < touches.length; i++) {
          for (let j = 0; j < pointers.length; j++) {
            if (touches[i].identifier === pointers[j].id) {
              pointers[j].down = false;
              pointers[j].x = 0;
              pointers[j].y = 0;
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

      // Ensure proper event listener cleanup tied to the local instances
      cleanupWebGL = () => {
        cancelAnimationFrame(animationId);
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('touchmove', handleTouchMove);
        canvas.removeEventListener('touchstart', handleTouchStart);
        window.removeEventListener('mouseleave', handleMouseLeave);
        window.removeEventListener('touchend', handleTouchEnd);
      };

    }, 150);

    return () => {
      clearTimeout(initTimer);
      cleanupWebGL();
    };
  }, []);

  return <canvas ref={canvasRef} className="w-full h-full block" />;
}

export default function WebArchitecturePage() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  const scale = useTransform(scrollYProgress, [0, 1], [80, 1]);
  
  const [mountCanvas, setMountCanvas] = useState(false);

  useEffect(() => {
    // INCREASE THIS DELAY: 
    // The text transition takes 1.9s (1.5s duration + 0.4s delay). 
    // We wait 2100ms so the heavy WebGL compilation doesn't freeze the text animation.
    const timer = setTimeout(() => {
      setMountCanvas(true);
    }, 2100); 
    
    return () => clearTimeout(timer);
  }, []);

  return (
    
    <main ref={containerRef} className="h-[300vh] w-full bg-[#020202] cursor-crosshair">
      <div className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden flex items-center justify-center">
        <svg className="absolute w-0 h-0">
          <defs>
            <filter id="torn-edge-in" x="-20%" y="-20%" width="140%" height="140%">
              <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="2" result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="80" xChannelSelector="R" yChannelSelector="G" />
            </filter>
          </defs>
        </svg>

        <motion.div
          initial={{ x: "-10%", y: "-10%", rotate: -45 }}
          animate={{ x: "-150%", y: "-150%", rotate: -45 }}
          transition={{ duration: 1.2, ease: [0.76, 0, 0.24, 1], delay: 0.1 }}
          className="absolute w-[300vw] h-[300vh] bg-[#020202]"
          style={{ 
            filter: "url(#torn-edge-in)",
            willChange: "transform" 
          }}
        >
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
        </motion.div>
      </div>
      
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.8, ease: "easeOut" }}
        className="fixed top-6 left-6 sm:top-10 sm:left-10 z-[100]"
      >
        <Link 
          href="/"
          className="text-[10px] uppercase tracking-widest text-neutral-500 hover:text-white transition-colors mix-blend-difference"
        >
          &lt;&lt; SYS_RETURN
        </Link>
      </motion.div>

      <div className="fixed inset-0 w-full h-screen overflow-hidden pointer-events-none">
        
        <div className="absolute inset-0 z-0 bg-black pointer-events-auto">
           {mountCanvas && (
             <motion.div 
               initial={{ opacity: 0 }} 
               animate={{ opacity: 1 }} 
               transition={{ duration: 1.5, ease: "easeInOut" }} 
               className="absolute inset-0 w-full h-full"
             >
               <NativeFluidCanvas />
             </motion.div>
           )}
        </div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, delay: 0.4, ease: [0.16, 1, 0.3, 1] }} 
          className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none"
        >
          
          <motion.svg 
            viewBox="0 0 1000 300" 
            style={{ scale, transformOrigin: "50% 50%" }}
            className="hidden md:block w-[90vw] max-w-7xl overflow-visible"
          >
            <defs>
              <linearGradient id="neon-wave" x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox" spreadMethod="repeat">
                <stop offset="0%" stopColor="transparent" />
                <stop offset="15%" stopColor="#ff0080" />
                <stop offset="50%" stopColor="#ffffff" />
                <stop offset="85%" stopColor="#00d2ff" />
                <stop offset="100%" stopColor="transparent" />
                <animateTransform attributeName="gradientTransform" type="translate" from="0 0" to="1 1" dur="6s" repeatCount="indefinite" />
              </linearGradient>

              <mask id="fluid-mask">
                <rect x="-5000%" y="-5000%" width="10000%" height="10000%" fill="white" />
                <text x="50%" y="40%" textAnchor="middle" dominantBaseline="middle" fill="black" className="text-[120px] font-black uppercase tracking-tighter">WEB</text>
                <text x="50%" y="80%" textAnchor="middle" dominantBaseline="middle" fill="black" className="text-[120px] font-black uppercase tracking-tighter">DEVELOPMENT</text>
              </mask>
            </defs>
            
            <rect x="-5000%" y="-5000%" width="10000%" height="10000%" fill="rgba(0, 0, 0, 0.80)" mask="url(#fluid-mask)" />
            
            <text x="50%" y="40%" textAnchor="middle" dominantBaseline="middle" fill="rgba(255, 255, 255, 0.03)" className="text-[120px] font-black uppercase tracking-tighter">WEB</text>
            <text x="50%" y="80%" textAnchor="middle" dominantBaseline="middle" fill="rgba(255, 255, 255, 0.03)" className="text-[120px] font-black uppercase tracking-tighter">DEVELOPMENT</text>
            
            <text vectorEffect="non-scaling-stroke" x="50%" y="40%" textAnchor="middle" dominantBaseline="middle" fill="none" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="2" className="text-[120px] font-black uppercase tracking-tighter">WEB</text>
            <text vectorEffect="non-scaling-stroke" x="50%" y="80%" textAnchor="middle" dominantBaseline="middle" fill="none" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="2" className="text-[120px] font-black uppercase tracking-tighter">DEVELOPMENT</text>

            <text vectorEffect="non-scaling-stroke" x="50%" y="40%" textAnchor="middle" dominantBaseline="middle" fill="none" stroke="url(#neon-wave)" strokeWidth="3" className="text-[120px] font-black uppercase tracking-tighter" style={{ mixBlendMode: 'screen' }}>WEB</text>
            <text vectorEffect="non-scaling-stroke" x="50%" y="80%" textAnchor="middle" dominantBaseline="middle" fill="none" stroke="url(#neon-wave)" strokeWidth="3" className="text-[120px] font-black uppercase tracking-tighter" style={{ mixBlendMode: 'screen' }}>DEVELOPMENT</text>
          </motion.svg>

          <motion.svg 
            viewBox="0 0 1000 800" 
            style={{ scale, transformOrigin: "50% 50%" }}
            className="block md:hidden w-[95vw] overflow-visible"
          >
            <defs>
              <linearGradient id="neon-wave-mobile" x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox" spreadMethod="repeat">
                <stop offset="0%" stopColor="transparent" />
                <stop offset="15%" stopColor="#ff0080" />
                <stop offset="50%" stopColor="#ffffff" />
                <stop offset="85%" stopColor="#00d2ff" />
                <stop offset="100%" stopColor="transparent" />
                <animateTransform attributeName="gradientTransform" type="translate" from="0 0" to="1 1" dur="6s" repeatCount="indefinite" />
              </linearGradient>

              <mask id="fluid-mask-mobile">
                <rect x="-5000%" y="-5000%" width="10000%" height="10000%" fill="white" />
                <text x="50%" y="42%" textAnchor="middle" dominantBaseline="middle" fill="black" className="text-[220px] font-black uppercase tracking-tighter">WEB</text>
                <text x="50%" y="68%" textAnchor="middle" dominantBaseline="middle" fill="black" className="text-[120px] font-black uppercase tracking-tighter">DEVELOPMENT</text>
              </mask>
            </defs>
            
            <rect x="-5000%" y="-5000%" width="10000%" height="10000%" fill="rgba(0, 0, 0, 0.80)" mask="url(#fluid-mask-mobile)" />
            
            <text x="50%" y="42%" textAnchor="middle" dominantBaseline="middle" fill="rgba(255, 255, 255, 0.03)" className="text-[220px] font-black uppercase tracking-tighter">WEB</text>
            <text x="50%" y="68%" textAnchor="middle" dominantBaseline="middle" fill="rgba(255, 255, 255, 0.03)" className="text-[120px] font-black uppercase tracking-tighter">DEVELOPMENT</text>
            
            <text vectorEffect="non-scaling-stroke" x="50%" y="42%" textAnchor="middle" dominantBaseline="middle" fill="none" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="2" className="text-[220px] font-black uppercase tracking-tighter">WEB</text>
            <text vectorEffect="non-scaling-stroke" x="50%" y="68%" textAnchor="middle" dominantBaseline="middle" fill="none" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="2" className="text-[120px] font-black uppercase tracking-tighter">DEVELOPMENT</text>

            <text vectorEffect="non-scaling-stroke" x="50%" y="42%" textAnchor="middle" dominantBaseline="middle" fill="none" stroke="url(#neon-wave-mobile)" strokeWidth="3" className="text-[220px] font-black uppercase tracking-tighter" style={{ mixBlendMode: 'screen' }}>WEB</text>
            <text vectorEffect="non-scaling-stroke" x="50%" y="68%" textAnchor="middle" dominantBaseline="middle" fill="none" stroke="url(#neon-wave-mobile)" strokeWidth="3" className="text-[120px] font-black uppercase tracking-tighter" style={{ mixBlendMode: 'screen' }}>DEVELOPMENT</text>
          </motion.svg>

        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.5 }}
          className="absolute bottom-6 sm:bottom-10 px-4 left-0 w-full flex justify-center z-20 mix-blend-difference"
          style={{ opacity: useTransform(scrollYProgress, [0.8, 1], [0, 1]) }}
        >
          <p className="text-[10px] md:text-xs text-white uppercase tracking-widest text-center">
            Studio Ten // Agentic Framework <br/>
            <span className="text-neutral-500">A new type of digital architecture.</span>
          </p>
        </motion.div>
      </div>
    </main>
  );
}