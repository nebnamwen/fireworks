import * as THREE from "./node_modules/three/build/three.module.js";
import { Particle } from "./particle.js";

export function fw_eval(userdata) {
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

