import * as THREE from "./node_modules/three/build/three.module.js";

const scene = new THREE.Scene();
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
    update(dt * playspeed * 0.001);
    renderer.render( scene, camera );
}

const gravity = 9.8;
const Y = new THREE.Vector3(0,1,0);    
const sphere_geom = new THREE.IcosahedronGeometry(1,1);

class Particle {
    constructor(start_t,end_t,start_v,start_p,size,color,drag) {
	this.start_t = start_t;
	this.end_t = end_t;
	this.start_v = start_v;
	this.start_p = start_p;
	this.size = size;
	this.drag = drag;

	this.vs_gss = new THREE.Vector3();
	this.vs_gss.copy(this.start_v);
	this.vs_gss.multiplyScalar(1.0/this.drag);
	this.vs_gss.addScaledVector(Y,gravity/(this.drag * this.drag));

	this.gs = gravity/this.drag;
	    
	let material = new THREE.MeshBasicMaterial( { color: color } );
	this.object3d = new THREE.Mesh(sphere_geom, material);
	this.object3d.scale.setScalar(this.size);

	timeline.push(
	    {action: 1, time: this.start_t, particle: this},
	    {action: -1, time: this.end_t, particle: this},
	);
    }

    velocity(t) {
	let dt = t - this.start_t;
	let esdt = Math.exp(-this.drag*dt);
	let v = new THREE.Vector3();
	v.copy(this.start_v);
	v.multiplyScalar(esdt);
	v.addScaledVector(Y,(esdt-1.0)*this.gs);
	return v;
    }
	
    position(t) {
	let dt = t - this.start_t;
	let esdt = 1.0 - Math.exp(-this.drag*dt);
	return new THREE.Vector3(
	    esdt*this.vs_gss.x + this.start_p.x,
	    esdt*this.vs_gss.y + this.start_p.y - dt*this.gs,
	    esdt*this.vs_gss.z + this.start_p.z		
	);
    }

    update(t) {
	this.object3d.position.copy(this.position(t));
    }
}

const slider = document.getElementById("slider");
const sliderlabel = document.getElementById("sliderlabel");

slider.addEventListener('input', slide);    

function slide() {
    jump(slider.value);
}
    
document.getElementById("play_button").addEventListener('click', play);

function play() {
    t = performance.now();
    playspeed = 1.0;
}
    
document.getElementById("pause_button").addEventListener('click', pause);

function pause() {
    t = performance.now();
    playspeed = 0;
}
    
document.getElementById("rewind_button").addEventListener('click', rewind);

function rewind() {
    t = performance.now();
    playspeed = -1.0;
}
    
// set of current particles
const activeparticles = new Set();
// timeline with start/end events
const timeline = [];
let timelineindex = 0;
let T = 0;
let playspeed = 0;
    
function update(dt) {
    let dir = Math.sign(dt)
    T += dt;
    if (T < 0) { T = 0 }
    if (dir != 0) {
	let i;
	for (i = Math.floor(timelineindex + 0.5 * dir);
	     i >= 0 && i < timeline.length && (Math.sign(timeline[i].time - T) * dir <= 0);
	     i += dir) {
	    if (timeline[i].action * dir > 0) {
		console.log("add at " + timeline[i].time);
		activeparticles.add(timeline[i].particle);
		scene.add(timeline[i].particle.object3d);
	    }
	    else {
		console.log("remove at " + timeline[i].time);
		activeparticles.delete(timeline[i].particle);
		scene.remove(timeline[i].particle.object3d);
	    }
	}

	timelineindex = Math.ceil(i - 0.5*dir);
	if (timelineindex <= 0 || timelineindex >= timeline.length) {
	    playspeed = 0;
	}

	for (const p of activeparticles) {
	    p.update(T);
	}

	slider.value = T;
	sliderlabel.innerHTML = Math.floor(T / 60) + ":" + String(Math.floor(T % 60)).padStart(2,'0');
    }
}

function jump(t) {
    update(t - T);
}

document.getElementById("compile_button").addEventListener('click', recompile);

function recompile() {
    activeparticles.clear();
    timeline.length = 0;

    fw_eval(JSON.parse(document.getElementById("fw_textarea").value));
    
    timeline.sort(comparetime);
    slider.max = timeline[timeline.length - 1].time;

    T = 0;
    timelineindex = 0;
    playspeed = 0;
}

function comparetime(a, b) {
    return a.time - b.time;
}

function fw_eval(userdata) {
    /*
[
{"start_t": 0, "end_t": 2, "start_v": [0,0,0], "start_p": [0,0,0], "color": "white", "size": 1, "drag": 0.1},
{"start_t": 1, "end_t": 3, "start_v": [0,1,0], "start_p": [1,0,0], "color": "pink", "size": 1, "drag": 0.1}
]    */

    for (const item of userdata) {
	new Particle(
	    item.start_t,
	    item.end_t,
	    new THREE.Vector3(item.start_v[0],item.start_v[1],item.start_v[2]),
	    new THREE.Vector3(item.start_p[0],item.start_p[1],item.start_p[2]),
	    item.size,
	    item.color,
	    item.drag
	);
    }
}

