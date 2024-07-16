import { scene, slider, sliderlabel } from "./globals.js";

export const timeline = {
    // set of current particles
    particles: new Set(),
    // timeline with start/end events
    events: [],
    index: 0,
    T: 0,
    speed: 0,
};

export function update(dt) {
    let dir = Math.sign(dt)
    timeline.T += dt;
    if (timeline.T < 0) { timeline.T = 0 }
    if (dir != 0) {
	let i;
	for (i = Math.floor(timeline.index + 0.5 * dir);
	     i >= 0 && i < timeline.events.length && (Math.sign(timeline.events[i].time - timeline.T) * dir <= 0);
	     i += dir) {
	    if (timeline.events[i].action * dir > 0) {
		console.log("add at " + timeline.events[i].time);
		timeline.particles.add(timeline.events[i].particle);
		scene.add(timeline.events[i].particle.object3d);
	    }
	    else {
		console.log("remove at " + timeline.events[i].time);
		timeline.particles.delete(timeline.events[i].particle);
		scene.remove(timeline.events[i].particle.object3d);
	    }
	}

	timeline.index = Math.ceil(i - 0.5*dir);
	if (timeline.index <= 0 || timeline.index >= timeline.events.length) {
	    timeline.speed = 0;
	}

	for (const p of timeline.particles) {
	    p.update(timeline.T);
	}

	slider.value = timeline.T;
	sliderlabel.innerHTML = Math.floor(timeline.T / 60) + ":" + String(Math.floor(timeline.T % 60)).padStart(2,'0');
    }
}

export function jump(t) {
    update(t - timeline.T);
}
