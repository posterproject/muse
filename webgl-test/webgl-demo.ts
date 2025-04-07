import * as THREE from 'three';

const width = window.innerWidth, height = window.innerHeight;

// init

// Camera setup - Orthographic for full-screen shader
const camera = new THREE.OrthographicCamera( -1, 1, 1, -1, 0, 1 );

const scene = new THREE.Scene();

// Full-screen quad
const geometry = new THREE.PlaneGeometry( 2, 2 );

// Shader code (Vertex and Fragment)
const vertexShader = `
varying vec2 vUv;

void main() {
    vUv = uv;
    gl_Position = vec4( position, 1.0 ); // Directly use position for ortho camera
}
`;

const fragmentShader = `
// Posted by las
// http://www.pouet.net/topic.php?which=7920&page=29&x=14&y=9
// Forked by Pavlos Mavridis to make it look like the sun

// Sun mod

// 704 is on fire!!!

#ifdef GL_ES
precision mediump float;
#endif

uniform float time;
uniform vec2 mouse;
uniform vec2 resolution;

#define pi 3.14159265
#define R(p, a) p=cos(a)*p+sin(a)*vec2(p.y, -p.x)
#define hsv(h,s,v) mix(vec3(1.), clamp((abs(fract(h+vec3(3., 2., 1.)/3.)*6.-3.)-1.), 0., 1.), s)*v

float pn(vec3 p) {
   vec3 i = floor(p);
   vec4 a = dot(i, vec3(1., 57., 21.)) + vec4(0., 5., 2., 7.);
   vec3 f = cos((p-i)*pi)*(-.5) + .5;
   a = mix(sin(cos(a)*a), sin(cos(1.+a)*(1.+a)), f.x);
   a.xy = mix(a.xz, a.yw, f.y);
   return mix(a.x, a.y, f.z);
}

float fpn(vec3 p) {
   return pn(p*.06125)*.56 + pn(p*.5)*.25 + pn(p*.25)*.125;
}


float sphere(vec3 p) {
  p.y=p.y+5.0;
  float oP=length(p);
  p.x=sin(p.x)+sin(time);
  p.z=sin(p.z)+cos(time);
  return length(p)-1.5-sin(oP-time*4.0);
}

float f(vec3 p) {
   p.z += 6.;
   R(p.xy, 0.005*time);
   R(p.xz, 0.13*time);
   return sphere(p) +  fpn(p*50.+time*15.) * 0.45;
}

vec3 g(vec3 p) {
   vec2 e = vec2(.0001, .0);
   return normalize(vec3(f(p+e.xyy) - f(p-e.xyy),f(p+e.yxy) - f(p-e.yxy),f(p+e.yyx) - f(p-e.yyx)));
}


void main(void)
{
   // Corrected UV for fragment shader, mapping to resolution space
   vec2 uv = gl_FragCoord.xy / resolution.xy;

   // p: position on the ray - derived from camera/view setup (simplified here)
   vec3 ro = vec3(0.1, 0.1, 1.0); // Ray origin
   // d: direction of the ray - calculated from UVs
   vec3 rd = normalize(vec3((uv - 0.5) * vec2(resolution.x/resolution.y, 1.0), -1.0)); // Adjusted ray direction

   // ld, td: local, total density
   // w: weighting factor
   float ld=0.0, td= 0.; // Initialize ld
   float w;

   // total color
   vec3 tc = vec3(0.);

   // r: length of the ray
   // l: distance function
   float r=0.0, l=0.0; // Initialize r and l

   vec3 p = ro; // Current position along the ray

   // rm loop
   for (float i=0.; i<1.; i+=1./64.) { // Use i directly in loop condition
       // evaluate distance function
       l = f(p) * 0.7;

       // check distance threshold for early exit and other break conditions
       if (!((r < 50.) && (td < .95) && (l >= 0.001*r || r == 0.0))) break;

       // check whether we are close enough
       if (l < .01) {
         // compute local density and weighting factor
         ld = 0.01 - l;
         w = (1. - td) * ld;

         // accumulate color and density
         tc += w; //* hsv(w, 1., 1.);
         td += w;
       }
       td += 1./200.;

       // enforce minimum stepsize
       l = max(l, 0.03);

       // step forward
       p += l*rd; // Step along ray direction
       r += l;
   }

   // Adjust final color calculation slightly based on shader logic
   gl_FragColor = vec4(tc.x + td * 0.5, tc.x*0.5 + ld * 1.5, ld*0.5, 1.0); // Modified color output
}
`;

// Uniforms
const uniforms = {
  time: { value: 0.0 },
  resolution: { value: new THREE.Vector2(width, height) },
  mouse: { value: new THREE.Vector2(0.5, 0.5) } // Initialize mouse uniform
};

// Shader Material
const material = new THREE.ShaderMaterial({
  vertexShader: vertexShader,
  fragmentShader: fragmentShader,
  uniforms: uniforms
});

const mesh = new THREE.Mesh( geometry, material );
scene.add( mesh );

const renderer = new THREE.WebGLRenderer( { antialias: true } );
renderer.setSize( width, height );
renderer.setAnimationLoop( animate );
document.body.appendChild( renderer.domElement );

// Mouse move listener
document.addEventListener('mousemove', (event) => {
  uniforms.mouse.value.x = event.clientX / width;
  uniforms.mouse.value.y = 1.0 - (event.clientY / height); // Invert Y for GLSL coords
});

// Resize listener
window.addEventListener('resize', () => {
    const newWidth = window.innerWidth;
    const newHeight = window.innerHeight;

    camera.left = -1;
    camera.right = 1;
    camera.top = 1;
    camera.bottom = -1;
    camera.updateProjectionMatrix();

    renderer.setSize(newWidth, newHeight);
    uniforms.resolution.value.set(newWidth, newHeight);
});

// animation

function animate( time: number ) {

    uniforms.time.value = time / 1000.0; // Pass time in seconds

    renderer.render( scene, camera );

}