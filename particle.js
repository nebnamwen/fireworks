import * as THREE from "./node_modules/three/build/three.module.js";
import { timeline } from "./timeline.js";

const gravity = 9.8;
const Y = new THREE.Vector3(0,1,0);    
const sphere_geom = new THREE.IcosahedronGeometry(1,1);

export class Particle {
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

	timeline.events.push(
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
