"use client";

import { useEffect, useRef, type ReactNode } from "react";

const VERTEX = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() { v_uv = a_position * 0.5 + 0.5; gl_Position = vec4(a_position, 0.0, 1.0); }
`;
const FRAGMENT = `
precision mediump float;
uniform sampler2D u_image;
uniform sampler2D u_pixels;
uniform vec2 u_pixelCover;
uniform float u_reveal;
uniform vec2 u_mouse;
uniform vec2 u_velocity;
uniform vec2 u_trail;
uniform vec2 u_blur;
uniform vec2 u_cover;
uniform float u_aspect;
uniform float u_energy;
uniform float u_time;
varying vec2 v_uv;
void main() {
  vec2 delta = v_uv - u_mouse;
  delta.x *= u_aspect;
  float distance = length(delta);
  float falloff = exp(-dot(delta, delta) * 24.0);
  vec2 direction = delta / max(distance, 0.001);
  direction.x /= u_aspect;
  float ripple = sin(distance * 25.0 - u_time * 8.0) * 0.0121;
  vec2 flow = -u_velocity * falloff * 0.374;
  vec2 displacement = flow + direction * ripple * falloff * u_energy;
  vec2 uv = v_uv + displacement;
  vec2 imageUV = (uv - 0.5) * u_cover + 0.5;
  vec2 pixelUV = (v_uv + displacement * 1.15 - 0.5) * u_pixelCover + 0.5;
  vec2 mouseUV = (u_mouse - 0.5) * u_pixelCover + 0.5;
  // Match the original pixel file's 45px blocks and six-pixel grid inset.
  vec2 block = floor((pixelUV * 960.0 - 6.0) / 45.0);
  vec2 center = floor((mouseUV * 960.0 - 6.0) / 45.0);
  vec2 gap = abs(block - center);
  float edge = max(gap.x, gap.y);
  float window = edge < 2.5 ? 1.0 : (edge < 3.5 ? 0.38 : 0.0);
  vec4 original = texture2D(u_image, clamp(imageUV, 0.001, 0.999));
  vec4 pixels = texture2D(u_pixels, clamp(pixelUV, 0.001, 0.999));
  vec2 trailDelta = (v_uv - u_trail) * vec2(u_aspect, 1.0);
  float trailFalloff = exp(-dot(trailDelta, trailDelta) * 20.0);
  vec2 blur = u_blur * trailFalloff;
  // Sample backward through the cursor's recent motion for a soft trailing smear.
  vec4 originalTrail = vec4(0.0);
  vec4 pixelTrail = vec4(0.0);
  for (int i = 0; i < 7; i++) {
    vec2 offset = blur * (float(i) / 6.0);
    originalTrail += texture2D(u_image, clamp(imageUV - offset * u_cover, 0.001, 0.999)) / 7.0;
    pixelTrail += texture2D(u_pixels, clamp(pixelUV - offset * u_pixelCover * 1.15, 0.001, 0.999)) / 7.0;
  }
  original = mix(original, originalTrail, 0.75);
  pixels = mix(pixels, pixelTrail, 0.75);
  gl_FragColor = mix(original, pixels, window * u_reveal);
}
`;

/** Cursor-driven liquid displacement, with the original image as a fallback. */
export function PortraitReveal({ className, children }: { className?: string; children: ReactNode }) {
  const frame = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const element = frame.current;
    const surface = canvas.current;
    if (!element || !surface) return;
    const motion = window.matchMedia("(hover: hover) and (prefers-reduced-motion: no-preference)");
    if (!motion.matches) return;
    const [source, pixelSource] = Array.from(element.querySelectorAll<HTMLImageElement>("img"));
    const gl = surface.getContext("webgl", { alpha: false, antialias: false, depth: false });
    if (!source || !pixelSource || !gl) return;
    const shaders: WebGLShader[] = [];
    const compile = (type: number, text: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      shaders.push(shader);
      gl.shaderSource(shader, text);
      gl.compileShader(shader);
      return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
    };
    const program = gl.createProgram();
    const vertex = compile(gl.VERTEX_SHADER, VERTEX);
    const fragment = compile(gl.FRAGMENT_SHADER, FRAGMENT);
    if (!program || !vertex || !fragment) {
      shaders.forEach(shader => gl.deleteShader(shader));
      if (program) gl.deleteProgram(program);
      return;
    }
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      shaders.forEach(shader => gl.deleteShader(shader));
      return;
    }
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const textures = [gl.createTexture(), gl.createTexture()];
    textures.forEach((texture, index) => {
      gl.activeTexture(gl.TEXTURE0 + index);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    });
    gl.uniform1i(gl.getUniformLocation(program, "u_image"), 0);
    gl.uniform1i(gl.getUniformLocation(program, "u_pixels"), 1);
    const uniforms = Object.fromEntries(["mouse", "velocity", "trail", "blur", "cover", "pixelCover", "reveal", "aspect", "energy", "time"].map(name => [name, gl.getUniformLocation(program, `u_${name}`)]));
    let loaded = false, disposed = false, raf = 0, energy = 0, lastTime = 0;
    let reveal = 0, hover = 0;
    let trailX = 0.5, trailY = 0.5, trailVX = 0, trailVY = 0, holdUntil = 0;
    let leaveTimer: number | undefined;
    let x = 0.5, y = 0.5, targetX = 0.5, targetY = 0.5, vx = 0, vy = 0;
    const draw = (time: number) => {
      raf = 0;
      if (!loaded || disposed) return;
      const dt = lastTime ? Math.min((time - lastTime) / 16.67, 3) : 1;
      lastTime = time;
      const follow = 1 - Math.pow(0.8, dt);
      vx = (targetX - x) * follow;
      vy = (targetY - y) * follow;
      x += vx; y += vy;
      energy = Math.max(energy * Math.pow(0.95, dt), Math.min(1, Math.hypot(vx, vy) * 22));
      trailX += (x - trailX) * (1 - Math.pow(0.92, dt));
      trailY += (y - trailY) * (1 - Math.pow(0.92, dt));
      if (Math.hypot(vx, vy) > 0.0008) {
        trailVX += (vx * 5 - trailVX) * 0.25;
        trailVY += (vy * 5 - trailVY) * 0.25;
        holdUntil = time + 120;
      } else if (time > holdUntil) {
        trailVX *= Math.pow(0.93, dt);
        trailVY *= Math.pow(0.93, dt);
      }
      reveal += (hover - reveal) * (1 - Math.pow(hover ? 0.82 : 0.92, dt));
      gl.uniform2f(uniforms.trail, trailX, trailY);
      const blurLength = Math.hypot(trailVX, trailVY);
      const blurScale = blurLength ? Math.min(0.035, blurLength * 0.3) / blurLength : 0;
      gl.uniform2f(uniforms.blur, trailVX * blurScale, trailVY * blurScale);
      gl.uniform1f(uniforms.reveal, reveal);
      gl.uniform2f(uniforms.mouse, x, y);
      gl.uniform2f(uniforms.velocity, vx * 5, vy * 5);
      gl.uniform1f(uniforms.energy, energy);
      gl.uniform1f(uniforms.time, time / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      if (Math.hypot(trailVX, trailVY) > 0.001 || Math.abs(hover - reveal) > 0.002 || energy > 0.002 || Math.hypot(targetX - x, targetY - y) > 0.001) raf = requestAnimationFrame(draw);
    };
    const wake = () => { if (!raf) { lastTime = 0; raf = requestAnimationFrame(draw); } };
    const resize = () => {
      const box = element.getBoundingClientRect();
      if (!box.width || !box.height) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      surface.width = Math.round(box.width * dpr);
      surface.height = Math.round(box.height * dpr);
      gl.viewport(0, 0, surface.width, surface.height);
      const aspect = box.width / box.height;
      const imageAspect = source.naturalWidth / source.naturalHeight || 1;
      gl.uniform1f(uniforms.aspect, aspect);
      gl.uniform2f(uniforms.cover, imageAspect > aspect ? aspect / imageAspect : 1, imageAspect > aspect ? 1 : imageAspect / aspect);
      const pixelAspect = pixelSource.naturalWidth / pixelSource.naturalHeight || 1;
      gl.uniform2f(uniforms.pixelCover, pixelAspect > aspect ? aspect / pixelAspect : 1, pixelAspect > aspect ? 1 : pixelAspect / aspect);
      wake();
    };
    const load = () => {
      if (disposed || !source.naturalWidth || !pixelSource.naturalWidth) return;
      try {
        [source, pixelSource].forEach((image, index) => {
          gl.activeTexture(gl.TEXTURE0 + index);
          gl.bindTexture(gl.TEXTURE_2D, textures[index]);
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        });
        loaded = true;
        resize();
        element.setAttribute("data-warp-ready", "");
      } catch { element.removeAttribute("data-warp-ready"); }
    };
    const move = (event: PointerEvent) => {
      if (!motion.matches) return;
      const box = element.getBoundingClientRect();
      targetX = Math.max(0, Math.min(1, (event.clientX - box.left) / box.width));
      targetY = 1 - Math.max(0, Math.min(1, (event.clientY - box.top) / box.height));
      wake();
    };
    const enter = (event: PointerEvent) => { window.clearTimeout(leaveTimer); hover = 1; move(event); x = targetX; y = targetY; trailX = x; trailY = y; energy = 0.35; wake(); };
    const leave = () => { leaveTimer = window.setTimeout(() => { hover = 0; wake(); }, 180); };
    const preference = () => { surface.style.visibility = motion.matches ? "" : "hidden"; };
    const lost = (event: Event) => { event.preventDefault(); element.removeAttribute("data-warp-ready"); loaded = false; if (raf) cancelAnimationFrame(raf); raf = 0; };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    source.addEventListener("load", load);
    pixelSource.addEventListener("load", load);
    if (source.complete && pixelSource.complete) load();
    element.addEventListener("pointerenter", enter);
    element.addEventListener("pointermove", move);
    element.addEventListener("pointerleave", leave);
    surface.addEventListener("webglcontextlost", lost);
    motion.addEventListener("change", preference);
    return () => {
      disposed = true;
      window.clearTimeout(leaveTimer);
      if (raf) cancelAnimationFrame(raf);
      observer.disconnect();
      source.removeEventListener("load", load);
      pixelSource.removeEventListener("load", load);
      element.removeEventListener("pointerenter", enter);
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerleave", leave);
      surface.removeEventListener("webglcontextlost", lost);
      motion.removeEventListener("change", preference);
      element.removeAttribute("data-warp-ready");
      textures.forEach(texture => gl.deleteTexture(texture)); gl.deleteBuffer(buffer); gl.deleteProgram(program);
      shaders.forEach(shader => gl.deleteShader(shader));
    };
  }, []);
  return <div ref={frame} className={className}>{children}<canvas ref={canvas} aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", opacity: 0 }} data-portrait-warp="" /></div>;
}
