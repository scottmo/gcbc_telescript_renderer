import { reactive, watch, $ } from './rxdom.js';

const isDesktop = document.body.offsetWidth > 768;

const converter = new showdown.Converter();

const store = reactive({
    toolbarClass: "hidden",
    zoomLevel: 1,
    scrollStep: 100,
    syncScroll: false,
    src: "",
    sub: [],
});

const COMMENT_BRACKETS = {
    "(": ")",
    "（": "）",
    "【": "】",
    "[": "]"
};
const PP_TAGNAMES = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'];

function renderTelescript() {
    if (!store.src || !store.sub) return;

    let srcText = store.src;
    const substitutes = store.sub || [];

    if (srcText.startsWith("<html>")) {
        // decode html
        const srcDoc = (new DOMParser()).parseFromString(srcText, "text/html").documentElement;
        srcText = srcDoc.outerHTML;
    } else {
        // make sure single line comments start at new line
        srcText = srcText.replace(/\n([（(【\[])/g, "<br><br>$1");
        srcText = srcText.replace(/([）)】\]])\n/g, "$1<br><br>");
    }

    substitutes.forEach(({key, value}) => {
        srcText = srcText.replace(key, key + "\n\n" + value.trim().split("\n").map(s => {
            if (s.trim() === "") {
                return "> --"; // separate verse
            }
            return "> " + s;
        }).join("\n\n") + "\n\n");
    });

    // mark comment start/end for processing later
    srcText = srcText.replace(/([（(【\[])/g, "<span class='comment'>$1");
    srcText = srcText.replace(/([）)】\]])/g, "$1</span>");

    // make scene title really stands out
    srcText = srcText.replace(/\n(第.+幕[：:].+)/g, "\n<h2>$1</h2>");

    // make character name stands out in beginning of dialogs
    srcText = srcText.replace(/\n\s*(.+?)[：:]/g, "\n\n<strong>$1</strong>：");

    const telescript = converter.makeHtml(srcText);
    outputEl.innerHTML(telescript);
    // force reflow
    console.log(output.offsetHeight);

    // in case comment is nested in some isolated span, try to check the parent text as well
    const openBrackets = Object.keys(COMMENT_BRACKETS);
    const closeBrackets = Object.values(COMMENT_BRACKETS);
    document.querySelectorAll(".comment").forEach(el => {
        let parent = el.parentElement;
        while (parent && !PP_TAGNAMES.includes(parent.tagName)) {
            parent = parent.parentElement;
        }
        if (parent) {
            const parentText = parent.textContent;
            if (openBrackets.includes(parentText[0]) && closeBrackets.includes(parentText[parentText.length - 1])) {
                parent.classList.add('comment');
            }
        }
    });
}
watch(store, "src", renderTelescript);
watch(store, "sub", renderTelescript);

const outputEl = $("#output");
if (isDesktop) {
    outputEl.attr("style", () => "zoom: " + store.zoomLevel)
        .text("\n\nInstructions: convert telescript to text then upload here.");
}

function loadFromEmbeddedPayload() {
    const payload = $("#payload");
    if (payload.text()) {
        const { src, sub } = JSON.parse(payload.text());
        store.src = src;
        store.sub = sub;
        payload.text("done");
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

loadFromEmbeddedPayload();

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
        const comments = document.querySelectorAll(".comment");
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


$("#src")
    .on("change", function uploadFile(e) {
        e.preventDefault();
        const reader = new FileReader();
        reader.onload = (e) => {
            store.src = e.target.result;
        };
        reader.readAsText(e.target.files[0]);
    });
$("#sub")
    .on("change", function uploadFile(e) {
        e.preventDefault();
        const reader = new FileReader();
        reader.onload = (e) => {
            store.sub = e.target.result;
        };
        reader.readAsText(e.target.files[0]);
    });

$("#invert")
    .on("click", function invert() {
        document.body.classList.toggle("invert");
    });
