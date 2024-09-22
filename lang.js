import * as THREE from "./node_modules/three/build/three.module.js";
import { Particle } from "./particle.js";

const vector_const = {
    ZERO: new THREE.Vector3(0,0,0),
    X: new THREE.Vector3(1,0,0),
    Y: new THREE.Vector3(0,1,0),
    Z: new THREE.Vector3(0,0,1),
};

export function fw_eval(userdata) {
    eval_inst(userdata, { _T: 0, _P: vector_const.ZERO, _PARENT_PARTICLE: null });
}

function child_env(env) {
    return { _PARENT_ENV: env };
}

function eval_inst(expr, env) {
    if (Array.isArray(expr)) {
	env = child_env(env);
	for (const subexpr of expr) {
	    eval_inst(subexpr, env);
	}
    }
    else if (expr._HEAD == "at_time") {
	// { _HEAD: "at_time", time: number, body: INST }
	let T = eval_number(expr.time, env);
	// error if T < 0
	env = child_env(env);
	env._T = T;
	eval_inst(expr.body, env);
    }
    else if (expr._HEAD == "at_point") {
	// { _HEAD: "at_point", point: vector, body: INST }
	let P = eval_vector(expr.point, env);
	env = child_env(env);
	env._P = P;
	eval_inst(expr.body, env);
    }
    else if (expr._HEAD == "let") {
	// { _HEAD: "let", name: string, type: string, value: EXPR }
	// error if expr.name starts with _
	// error if expr.name in env
	// error if invalid type
	let value = null;
	if (expr.type == "number") {
	    value = eval_number(expr.value, env);
	}
	else if (expr.type == "vector") {
	    value = eval_vector(expr.value, env);
	}
	else if (expr.type == "color") {
	    value = eval_color(expr.value, env);
	}
	env[expr.name] = { type: expr.type, value: value };
    }
    else if (expr._HEAD == "define") {
	// { _HEAD: "define", name: string, body: INST }
	// error if expr.name starts with _
	// error if expr.name in env
	env[expr.name] = { type: "function", value: expr.body };
    }
    else if (expr._HEAD == "call") {
	// { _HEAD: "call", name: string, parameters: [ "let" INST* ] }
	let body = eval_lookup_var(expr.name, env, "function");
	env = child_env(env);
	if (expr.parameters) {
	    for (let inst of expr.parameters) {
		if (inst._HEAD == "let") {
		    eval_inst(inst, env);
		}
		else {
		    // error if inst._HEAD != "let"
		}
	    }
	}
	eval_inst(body, env);
    }
    else if (expr._HEAD == "for") {
	// { _HEAD: "for", name: string, start: number?, step: number?, stop: number, body: INST }
	let start = expr.start ? eval_number(expr.start, env) : 0;
	let step = expr.step ? eval_number(expr.step, env) : 1;
	let stop = eval_number(expr.stop);
	// error if step <= 0
	// error if name starts with _
	for (let i = start; i < stop; i += step) {
	    let c_env = child_env(env);
	    c_env[expr.name] = { type: "number", value: i };
	    eval_inst(expr.body, c_env);
	}
    }
    else if (expr._HEAD == "ring" || expr._HEAD == "sphere") {
	// { _HEAD: "ring", name: string, axis: vector, count: number, body: INST }
	// { _HEAD: "sphere", name: string, axis: vector, count: number, body: INST }
	let axis = expr.axis ? eval_vector(expr.axis, env) : vector_const.Y;
	let count = eval_number(expr.count, env);
	// error if name starts with _
	for (let i = 0; i < count; i += 1) {
	    let c_env = child_env(env);
	    let vector = group_vector(expr._HEAD, axis, count, i);
	    c_env[expr.name] = { type: "vector", value: vector};
	    eval_inst(expr.body, c_env);
	}
    }
    else if (expr._HEAD == "particle") {
	eval_particle(expr, env);
    }
    else {
	console.log("Syntax error: expected instruction");
    }
}

function eval_particle(expr, env) {
    // { _HEAD: "particle", duration: number, velocity: vector, size: number, color: color,
    //                      coast: number?, grow: number?, fade: number? }

    let start = lookup_in_env("_T", env);
    let duration = eval_number(expr.duration, env);
    let velocity = eval_vector(expr.velocity, env);
    let size = ("size" in expr) ? eval_number(expr.size, env) : 0;
    let color = eval_color(expr.color, env);
    let coast = ("coast" in expr) ? eval_number(expr.coast, env) : duration * 99;
    let grow = ("grow" in expr) ? eval_number(expr.grow, env) : 0;
    let fade = ("fade" in expr) ? eval_number(expr.fade, env) : 0;

    // TODO validate values and throw exception if invalid

    let parent = lookup_in_env("_PARENT_PARTICLE", env);
    let position = lookup_in_env("_P", env);
    if (parent) {
	position = parent.position(start);
    }

    let velocity_adj = new THREE.Vector3();
    velocity_adj.add(velocity);
    if (parent) {
	velocity_adj.add(parent.velocity(start));
    }

    let particle = new Particle(
	start,
	duration,
	velocity,
	position,
	size,
	color,
	coast,
	grow,
	fade
    );

    if ("children" in expr) {
	env = child_env(env);
	env._PARENT_PARTICLE = particle;

	eval_clause(expr.children, env);
    }
}

function eval_clause(expr, env) {
    if (Array.isArray(expr)) {
	env = child_env(env);
	for (const subexpr of expr) {
	    eval_clause(subexpr, env);
	}
    }
    else if (expr._HEAD == "every") {
	// { _HEAD: "every", interval: number, body: INST }
	let interval = eval_number(expr.interval, env);
	let parent = lookup_in_env("_PARENT_PARTICLE", env);
	env = child_env(env);
	for (let T = parent.start(); T < parent.end(); T += interval) {
	    env._T = T;
	    eval_inst(expr.body, env);
	}
    }
    else if (expr._HEAD == "finally") {
	// { _HEAD: "finally", body: INST }
	let parent = lookup_in_env("_PARENT_PARTICLE", env);
	env = child_env(env);
	env._T = parent.end();
	eval_inst(expr.body, env);
    }
    else {
	console.log("Syntax error: expected clause");
    }
}

function eval_number(expr, env) {
    if (expr._HEAD == "number") {
	// { _HEAD: "number", value: number (literal) }
	return expr.value;
    }
    else if (expr._HEAD == "sum") {
	// { _HEAD: "sum", a: number, b:number }
	let a = eval_number(expr.a, env);
	let b = eval_number(expr.b, env);
	return a + b;
    }
    else if (expr._HEAD == "product") {
	// { _HEAD: "product", a: number, b:number }
	let a = eval_number(expr.a, env);
	let b = eval_number(expr.b, env);
	return a * b;
    }
    else if (expr._HEAD == "random") {
	// { _HEAD: "random", range: number? }
	let range = expr.range ? eval_number(expr.range, env) : 1;
	return Math.random() * range;
    }
    else if (expr._HEAD == "time") {
	// { _HEAD: "time" }
	return lookup_in_env("_T", env);
    }
    else if (expr._HEAD == "int") {
	// { _HEAD: "int", value: number }
	return Math.floor(eval_number(expr.value, env));
    }
    else if (expr._HEAD == "lookup_var") {
	// { _HEAD: "lookup_var", name: string }
	return eval_lookup_var(expr, env, "number");
    }
    else {
	console.log("Syntax error: expected number");
    }
}

function eval_vector(expr, env) {
    if (expr._HEAD == "vector") {
	if ("constant" in expr) {
	    // { _HEAD: "vector", constant: string }
	    if (expr.constant in vector_const) {
		return vector_const[expr.constant];
	    }
	    else {
		// error if unknown constant name
	    }
	}
	else {
	    // { _HEAD: "vector", x: number (lit), y: number (lit), z: number (lit) }
	    return new THREE.Vector3(expr.x, expr.y, expr.z);
	}
    }
    else if (expr._HEAD == "sum") {
	// { _HEAD: "sum", a: vector, b:vector }
	let result = new THREE.Vector3();
	result.add(eval_vector(expr.a, env));
	result.add(eval_vector(expr.b, env));
	return result;
    }
    else if (expr._HEAD == "product") {
	// { _HEAD: "product", s: number, v: vector }
	let result = new THREE.Vector3();
	result.addScaledVector(eval_vector(expr.v, env), eval_number(expr.s, env));
	return result;
    }
    else if (expr._HEAD == "ring" || expr._HEAD == "sphere") {
	// { _HEAD: "ring", axis: vector, count: number, index: number }
	// { _HEAD: "sphere", axis: vector, count: number, index: number }
	let axis = expr.axis ? eval_vector(expr.axis, env) : vector_const.Y;
	let count = eval_number(expr.count, env);
	let index = eval_number(expr.index, env);
	return group_vector(expr._HEAD, axis, count, index);
    }
    else if (expr._HEAD == "velocity") {
	// { _HEAD: "velocity" }
	let parent = lookup_in_env("_PARENT_PARTICLE", env);
	let T = lookup_in_env("_T", env);
	let velocity = new THREE.Vector3();
	if (parent) {
	    velocity.add(parent.velocity(T));
	}
    }
    else if (expr._HEAD == "norm") {
	let value = new THREE.Vector3();
	value.copy(eval_vector(expr.vector, env));
	value.normalize();
	return value;
    }
    else if (expr._HEAD == "lookup_var") {
	// { _HEAD: "lookup_var", name: string }
	return eval_lookup_var(expr, env, "vector");
    }
    else {
	console.log("Syntax error: expected vector");
    }
}

function group_vector(type, axis, count, index) {
    let x, y, z;
    if (type == "ring") {
	let theta = Math.PI * 2 * index / count;
	x = Math.cos(theta);
	y = Math.sin(theta);
	z = 0;
    }
    else if (type == "sphere") {
	let phi = Math.asin(1 - ((2*index + 1) / count));
	let theta = Math.sqrt(3.5*count) * phi;
	x = Math.cos(theta)*Math.cos(phi);
	y = Math.sin(theta)*Math.cos(phi);
	z = Math.sin(phi);
    }

    // set up the transform matrix to align to the given axis
    // it looks like THREE.Matrix3 doesn't provide the right methods
    // to make this a one-step process (or else I didn't find them)
    // so use some Vector3's instead
    let Z = new THREE.Vector3();
    Z.copy(axis);
    if (Z.length() == 0) {
	Z.copy(vector_const.Y);
    }
    Z.normalize();

    let X = new THREE.Vector3();
    X.crossVectors(Z, vector_const.Y);
    if (X.length() == 0) {
	X.copy(vector_const.X);
    }
    X.normalize()

    let Y = new THREE.Vector3();
    Y.crossVectors(Z, X);
    Y.normalize()

    let result = new THREE.Vector3();
    result.addScaledVector(X, x);
    result.addScaledVector(Y, y);
    result.addScaledVector(Z, z);
    return result;
}

function eval_color(expr, env) {
    if (expr._HEAD == "color") {
	// { _HEAD: "color", name: "red" }
	if ("name" in expr) {
	    if (expr.name in THREE.Color.NAMES) {
		return new THREE.Color(expr.name);
	    }
	    else {
		console.log("Value error: unknown color name");
	    }
	}
	// { _HEAD: "color", hex: "#FF0000" }
	else if ("hex" in expr) {
	    let is_hex_triplet = /^#([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$/;
	    if (is_hex_triplet.test(expr.hex)) {
		return new THREE.Color(expr.hex);
	    }
	    else {
		console.log("Value error: not a hex triplet");
	    }
	}
	// { _HEAD: "color", r: 1, g: 0, b: 0 }
	else if ("r" in expr && "g" in expr && "b" in expr) {
	    return new THREE.Color(expr.r, expr.g, expr.b);
	}
	else {
	    console.log("Syntax error: invalid color expression");
	}
    }
    else if (expr._HEAD == "select") {
	// { _HEAD: "select", colors: [color*], index: number }
	const count = expr.colors.length;
	let index = Math.floor(eval_number(expr.index)) % count;
	return eval_color(expr.colors[index], env);
    }
    else if (expr._HEAD == "lookup_var") {
	// { _HEAD: "lookup_var", name: string }
	return eval_lookup_var(expr, env, "color");
    }
    else {
	console.log("Syntax error: expected color");
    }
}

function eval_lookup_var(expr, env, type) {
    const result = lookup_in_env(expr.name, env);
    if (result.type == type) {
	return result.value;
    }
    else {
	console.log("Type error: expected " + type + " but '" + expr.name + "' is a " + result.type);
    }
}

function lookup_in_env(name, env) {
    if (name in env) {
	return env[name];
    }
    else if (env._PARENT_ENV) {
	return lookup_in_env(name, env._PARENT_ENV);
    }
    else {
	console.log("Name error: variable '" + name + "' not defined");
    }
}
