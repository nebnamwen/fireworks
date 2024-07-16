import * as THREE from "./node_modules/three/build/three.module.js";
import { scene } from "./globals.js";
import { update, timeline } from "./timeline.js";

const canvas = document.getElementById("fw_canvas");
const camera = new THREE.PerspectiveCamera( 75, canvas.width / canvas.height, 0.1, 1000 );
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer({ canvas: canvas });
renderer.setSize(canvas.width, canvas.height);

renderer.setAnimationLoop( animate );

let t = performance.now();

function animate() {
    let dt = performance.now() - t;
    t += dt;
    update(dt * timeline.speed * 0.001);
    renderer.render( scene, camera );
}
