import { r, t } from 'https://cdn.skypack.dev/@arrow-js/core';
import inserts from "./inserts.mjs";

const converter = new showdown.Converter();

const store = r({
    toolbarClass: "",
    zoomLevel: 5,
    scrollStep: 100,
    syncScroll: true,
    telescript: "\n\nInstructions: convert telescript to text then upload here.",
});

// handlers
function toggleToolbar() {
    store.toolbarClass = store.toolbarClass ? "" : "hidden";
}
function zoomIn() {
    store.zoomLevel++;
}
function zoomOut() {
    store.zoomLevel--;
}
function setOutput(html) {
    window.requestAnimationFrame(() => {
        document.querySelector("#output").innerHTML = html;
    });
}
function uploadFile(e) {
    e.preventDefault();
    const reader = new FileReader();
    reader.onload = async (e) => {
        setOutput(processTelescriptToHTML(e.target.result));
    };
    reader.readAsText(e.target.files[0]);
}
async function hideComments(e) {
    const shouldHide = e.target.checked;
    const comments = document.querySelectorAll("em");
    if (shouldHide) {
        comments.forEach(elm => elm.classList.add("hidden"));
    } else {
        comments.forEach(elm => elm.classList.remove("hidden"));
    }
}
function setBackgroundColor(e) {
    document.body.style.backgroundColor = e.target.value;
}
function setForegroundColor(e) {
    document.body.style.color = e.target.value;
}
function setCommentsColor(e) {
    document.querySelectorAll("em").forEach(elm => elm.style.color = e.target.value);
}
function setScrollStep(e) {
    store.scrollStep = e.target.value;
}

// helpers
function processTelescriptToHTML(text) {
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

    inserts.forEach(({key, value}) => {
        text = text.replace(key, key + "\n\n" + value.trim().split("\n").map(s => {
            if (s.trim() === "") {
                return "> --"; // separate verse
            }
            return "> " + s;
        }).join("\n\n") + "\n\n");
    });

    return converter.makeHtml(text);
}

async function loadTelescriptFromQueryParam() {
    // load from server directly if a raw text src is supplied
    const queryParams = new URLSearchParams(location.search);
    const src = queryParams.get("src");
    if (src) {
        try {
            new URL(src);
            const res = await fetch("/telescript?src=" + encodeURIComponent(src));
            const { status, data } = await res.json();
            if (status === "OK") {
                setOutput(processTelescriptToHTML(e.target.result));
            } else {
                console.error("Failed to load " + src, data);
            }
        } catch (e) {
            console.log("invalid src url");
        }
    }
}




const socket = io();

document.body.classList.add("unscrollable");

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


// render
const render = t`
<div id="container" class="fill">
    <div id="output" style="${() => "zoom: " + store.zoomLevel}"></div>
</div>
<div id="scrollListener" class="${() => "fill" + (store.syncScroll ? "" : " hidden")}" @wheel="${triggerScrollWithWheel}">
</div>

<div id="controls">
    <button @click="${toggleToolbar}">T</button>
    <button class="${() => (store.syncScroll ? "" : "button-off")}" @click="${toggleSync}">S</button>
</div>
<div id="toolbar" class="${() => store.toolbarClass}">
    <input id="input" type="file" @change="${uploadFile}" />
    &nbsp;|&nbsp;
    <b>Zoom</b>
    <button id="zoomin" @click="${zoomIn}">+</button>
    <button id="zoomout" @click="${zoomOut}">-</button>
    &nbsp;|&nbsp;
    <label for="hideComments">Hide Comments</label>
    <input id="hideComments" type="checkbox" @change="${hideComments}"/>
    &nbsp;|&nbsp;
    <label for="scrollStep">Scroll Step</label>
    <input id="scrollStep" type="number" step="10" value="${store.scrollStep}" @change="${setScrollStep}">
    <br />
    <label for="backgroundColor">background</label>
    <input type="color" id='backgroundColor' value="#111" @change="${setBackgroundColor}" />
    <label for="foregroundColor">foreground</label>
    <input type="color" id='foregroundColor' value="#ccb781" @change="${setForegroundColor}" />
    <label for="commentsColor">comments</label>
    <input type="color" id='commentsColor' value="#AAA" @change="${setCommentsColor}" />
    <hr />
</div>
`;
render(document.body);
// after render
loadTelescriptFromQueryParam();
