import * as THREE from "./node_modules/three/build/three.module.js";
import { timeline } from "./timeline.js";

const gravity = 9.8;
const Y = new THREE.Vector3(0,1,0);    
const sphere_geom = new THREE.IcosahedronGeometry(1,1);

export class Particle {
    constructor(start_t,duration,start_v,start_p,size,color,coast,grow,fade) {
	this.start_t = start_t;
	this.end_t = this.start_t + duration;
	this.start_v = start_v;
	this.start_p = start_p;
	this.size = size;
	this.coast = coast;
	this.grow = grow;
	this.fade = fade;

	this.vs_gss = new THREE.Vector3();
	this.vs_gss.copy(this.start_v);
	this.vs_gss.multiplyScalar(this.coast);
	this.vs_gss.addScaledVector(Y,gravity*(this.coast**2));

	this.gs = gravity*this.coast;
	    
	let material = new THREE.MeshBasicMaterial( { color: color, alphaHash: true, opacity: 1.0 } );
	this.object3d = new THREE.Mesh(sphere_geom, material);

	timeline.events.push(
	    {action: 1, time: this.start_t, particle: this},
	    {action: -1, time: this.end_t, particle: this},
	);
    }

    start() { return this.start_t; }

    end() { return this.end_t; }

    velocity(t) {
	let dt = t - this.start_t;
	let esdt = Math.exp(-dt/this.coast);
	let v = new THREE.Vector3();
	v.copy(this.start_v);
	v.multiplyScalar(esdt);
	v.addScaledVector(Y,(esdt-1.0)*this.gs);
	return v;
    }
	
    position(t) {
	let dt = t - this.start_t;
	let esdt = 1.0 - Math.exp(-dt/this.coast);
	return new THREE.Vector3(
	    esdt*this.vs_gss.x + this.start_p.x,
	    esdt*this.vs_gss.y + this.start_p.y - dt*this.gs,
	    esdt*this.vs_gss.z + this.start_p.z		
	);
    }
    
    update(t) {
	this.object3d.position.copy(this.position(t));

	let scale = 1.0;
	if (t - this.start_t < this.grow) {
	    scale = 1.0 - (1.0 - (t - this.start_t) / this.grow)**2;
	}
	this.object3d.scale.setScalar(this.size * scale);

	let opacity = 1.0;
	if (this.end_t - t < this.fade) {
	    opacity = 1.0 - (1.0 - (this.end_t - t) / this.fade)**2;
	}
	this.object3d.material.opacity = opacity;
    }
}
