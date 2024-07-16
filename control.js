import { slider } from"./globals.js";
import { timeline, jump } from "./timeline.js";
import { fw_eval } from "./lang.js";

slider.addEventListener('input', slide);    

function slide() {
    jump(slider.value);
}
    
document.getElementById("play_button").addEventListener('click', play);

function play() {
    timeline.speed = 1.0;
}
    
document.getElementById("pause_button").addEventListener('click', pause);

function pause() {
    timeline.speed = 0;
}
    
document.getElementById("rewind_button").addEventListener('click', rewind);

function rewind() {
    timeline.speed = -1.0;
}

document.getElementById("compile_button").addEventListener('click', recompile);

function recompile() {
    timeline.particles.clear();
    timeline.events.length = 0;

    fw_eval(JSON.parse(document.getElementById("fw_textarea").value));
    
    timeline.events.sort(comparetime);
    slider.max = timeline.events[timeline.events.length - 1].time;

    timeline.T = 0;
    timeline.index = 0;
    timeline.speed = 0;
}

function comparetime(a, b) {
    return a.time - b.time;
}
