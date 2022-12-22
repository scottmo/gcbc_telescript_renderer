import { reactive, $ } from './rxdom.js';
import inserts from "./inserts.mjs";

const converter = new showdown.Converter();

const store = reactive({
    toolbarClass: "",
    zoomLevel: 5,
    scrollStep: 100,
    syncScroll: true,
    telescript: "\n\nInstructions: convert telescript to text then upload here.",
});

const outputEl = $("#output");
outputEl.attr("style", () => "zoom: " + store.zoomLevel);

function setOutput(html) {
    outputEl.innerHTML(html);
    // force reflow
    console.log(output.offsetHeight);
}

// helpers
function processTelescriptToHTML(text, replacements) {
    // make sure single line comments start at new line
    text = text.replace(/\n([（【])/g, "\n\n$1");
    text = text.replace(/([）】])\n/g, "$1\n\n");
    // make comments color fade
    text = text.replace(/([（【])/g, "_$1");
    text = text.replace(/([）】])/g, "$1_");``

    // make scene title really stands out
    text = text.replace(/\n(第.+幕：.+)/g, "\n<h2>$1</h2>");

    // make character name stands out in beginning of dialogs
    text = text.replace(/\n\s*(.+?)：/g, "\n\n__$1__：");

    replacements.forEach(({key, value}) => {
        text = text.replace(key, key + "\n\n" + value.trim().split("\n").map(s => {
            if (s.trim() === "") {
                return "> --"; // separate verse
            }
            return "> " + s;
        }).join("\n\n") + "\n\n");
    });

    return converter.makeHtml(text);
}

function getURLFromQueryParam(urlSearchParams, key) {
    let value = urlSearchParams.get(key);
    if (!value) return null;

    try {
        new URL(value);
        return value;
    } catch (e) {
        console.log("invalid url:", value);
        return null;
    }
}
async function get(url) {
    const res = await fetch(url);
    const { status, data } = await res.json();
    if (status === "OK") {
        return data;
    } else {
        console.error("Failed to load " + src, data);
        return null;
    }
}

async function loadFromQueryParams() {
    // load from server directly if a raw text src is supplied
    const queryParams = new URLSearchParams(location.search);
    const src = getURLFromQueryParam(queryParams, "src");
    const inserts = getURLFromQueryParam(queryParams, "inserts");
    if (src) {
        const telescript = get("/telescript?src=" + encodeURIComponent(src));
        try {
            const res = await fetch("/telescript?src=" + encodeURIComponent(src));
            const { status, data } = await res.json();
            if (status === "OK") {
                setOutput(processTelescriptToHTML(data));
            } else {
                console.error("Failed to load " + src, data);
            }
        } catch (e) {
            console.log("invalid src url");
        }
    }
}




const socket = io();

function toggleSync() {
    store.syncScroll = !store.syncScroll;
}

function scroll(ypos) {
    document.querySelector("#container").scrollTo({
        top: ypos,
        behavior: 'smooth',
    });
}

socket.on("scroll", (ypos) => {
    scroll(ypos);
});

function emitScroll(direction) {
    if (!store.syncScroll) return;

    const newYPos = document.querySelector("#container").scrollTop + (direction * store.scrollStep);
    scroll(newYPos);
    socket.emit("scroll", newYPos);
}

function throttle(fn, delay) {
    // Capture the current time 
    let time = Date.now();

    // Here's our logic 
    return function(...args) {
        if ((time + delay - Date.now()) <= 0) {
            // Run the function we've passed to our throttler, 
            // and reset the `time` variable (so we can check again). 
            fn.apply(this, args);
            time = Date.now();
        }
    }
}

const triggerScrollWithWheel = throttle((e) => {
    const direction = e.deltaY > 0 ? 1 : -1;
    emitScroll(direction);
}, 100);
document.body.addEventListener("keydown", throttle((e) => {
    if (e.target != document.body) return;
    switch (e.keyCode) {
       case 38: // up
          emitScroll(-1);
          break;
       case 40: // down
          emitScroll(1);
          break;
    }
}, 100));

loadFromQueryParams();

$("#scrollListener")
    .attr("class", () => "fill" + (store.syncScroll ? "" : " hidden"))
    .on("wheel", triggerScrollWithWheel);

$("#toolbar").attr("class", () => store.toolbarClass);

$("#toggleToolbar")
    .on("click", function toggleToolbar() {
        store.toolbarClass = store.toolbarClass ? "" : "hidden";
    });
$("#toggleSync")
    .attr("class", () => (store.syncScroll ? "" : "button-off"))
    .on("click", toggleSync);
$("#zoomIn")
    .on("click", function zoomIn() {
        store.zoomLevel++;
    });
$("#zoomOut")
    .on("click", function zoomOut() {
        store.zoomLevel--;
    });
$("#hideComments")
    .on("click", async function hideComments(e) {
        const shouldHide = e.target.checked;
        const comments = document.querySelectorAll("em");
        if (shouldHide) {
            comments.forEach(elm => elm.classList.add("hidden"));
        } else {
            comments.forEach(elm => elm.classList.remove("hidden"));
        }
    });
$("#scrollStep")
    .attr("value", store.scrollStep)
    .on("change", function setScrollStep(e) {
        store.scrollStep = e.target.value;
    });

$("#input")
    .on("change", function uploadFile(e) {
        e.preventDefault();
        const reader = new FileReader();
        reader.onload = async (e) => {
            setOutput(processTelescriptToHTML(e.target.result, inserts));
        };
        reader.readAsText(e.target.files[0]);
    });

$("#backgroundColor")
    .on("change", function setBackgroundColor(e) {
        document.body.style.backgroundColor = e.target.value;
    });
$("#foregroundColor")
    .on("change", function setForegroundColor(e) {
        document.body.style.color = e.target.value;
    });
$("#commentsColor")
    .on("change", function setCommentsColor(e) {
        document.querySelectorAll("em").forEach(elm => elm.style.color = e.target.value);
    });

