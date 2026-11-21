#version 300 es
// CRT post-process. The warp and scanline maths are ported from
// ~/.config/ghostty/shaders/bettercrt.glsl (shadertoy.com/view/WsVSzV),
// with bloom, aberration, vignette, flicker, grain and a power-on sweep added.
// All the lowercase uniforms are the knobs in config.ts.
precision highp float;

uniform sampler2D uTex; // the painted DOM, with mipmaps
uniform vec2 uRes;      // drawing buffer size in device pixels
uniform float uDpr;
uniform float uTime;    // seconds
uniform float uPower;   // 0 = off, 1 = fully on

uniform float warp;
uniform float scan;
uniform float scanSize;
uniform float glow;
uniform float aberration;
uniform float vignette;
uniform float flicker;
uniform float noise;
uniform float roll;
uniform float corner;
uniform vec3 bezel;

out vec4 fragColor;

const float PI = 3.14159265;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

void main() {
  vec2 fragCoord = gl_FragCoord.xy;

  // --- bettercrt: squared distance from centre, then warp ---
  vec2 uv = fragCoord / uRes;
  vec2 dc = abs(0.5 - uv);
  dc *= dc;
  uv.x -= 0.5; uv.x *= 1.0 + (dc.y * (0.3 * warp)); uv.x += 0.5;
  uv.y -= 0.5; uv.y *= 1.0 + (dc.x * (0.4 * warp)); uv.y += 0.5;

  // --- glass shape: rounded rectangle in warped space ---
  float r = corner * uDpr;
  vec2 q = abs(uv - 0.5) * uRes - uRes * 0.5 + r;
  float dist = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  float glass = 1.0 - smoothstep(-1.5 * uDpr, 0.0, dist);

  // --- power-on: a dot widens into a line, the line opens into the picture ---
  float p = clamp(uPower, 0.0, 1.0);
  float sx = smoothstep(0.0, 0.3, p);
  float sy = mix(0.004, 1.0, smoothstep(0.25, 1.0, p) * smoothstep(0.25, 1.0, p));
  vec2 beam = (uv - 0.5) / vec2(max(sx, 1e-4), sy) + 0.5;
  float lit = step(0.0, beam.x) * step(beam.x, 1.0) * step(0.0, beam.y) * step(beam.y, 1.0);
  lit *= step(1e-4, p);

  // --- picture, with red and blue pulled apart towards the edges ---
  vec2 off = (beam - 0.5) * aberration * 0.01;
  vec3 color = vec3(
    textureLod(uTex, beam + off, 0.0).r,
    textureLod(uTex, beam, 0.0).g,
    textureLod(uTex, beam - off, 0.0).b
  );

  // --- bloom from the blurred mip levels ---
  vec3 bloom =
    textureLod(uTex, beam, 2.0).rgb * 0.3 +
    textureLod(uTex, beam, 3.5).rgb * 0.4 +
    textureLod(uTex, beam, 5.0).rgb * 0.3;
  color += bloom * glow;

  // --- bettercrt: scanlines (measured in CSS pixels, following the curve) ---
  float line = sin(uv.y * uRes.y / uDpr * PI / scanSize);
  float apply = abs(line * 0.25 * scan);
  color = mix(color, vec3(0.0), apply);

  // --- slow rolling band, flicker, grain ---
  float band = fract(uv.y + uTime * 0.07) - 0.5;
  color *= 1.0 + roll * exp(-band * band * 140.0);
  color *= 1.0 - flicker * hash(vec2(floor(uTime * 60.0), 1.0));
  color += (hash(fragCoord + fract(uTime) * 100.0) - 0.5) * noise;

  // --- vignette ---
  float v = 16.0 * uv.x * uv.y * (1.0 - uv.x) * (1.0 - uv.y);
  color *= mix(1.0, pow(clamp(v, 0.0, 1.0), 0.35), vignette);

  // the squashed beam burns white-hot until the picture has opened
  float hot = 1.0 - smoothstep(0.3, 0.6, p);
  color = mix(color, vec3(0.85, 0.9, 0.85), hot * 0.7) * (1.0 + hot);
  color *= lit;

  fragColor = vec4(mix(bezel, color, glass), 1.0);
}
