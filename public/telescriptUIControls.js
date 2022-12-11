function $(sel) {
    return document.querySelector(sel);
}
function $$(sel) {
    return document.querySelectorAll(sel);
}

const converter = new showdown.Converter();
const output = $("#output");

let hidden = false;
$("#toolbarToggle").addEventListener("click", () => {
    if (hidden) {
        $("#toolbar").classList.remove("hidden");
    } else {
        $("#toolbar").classList.add("hidden");
    }
    hidden = !hidden;
});

let zoomLevel = 5;
output.style.zoom = zoomLevel;
$("#zoomin").addEventListener("click", () => {
    output.style.zoom = ++zoomLevel;
});
$("#zoomout").addEventListener("click", () => {
    output.style.zoom = --zoomLevel;
});

$("#hideComments").addEventListener("change", async (e) => {
    const shouldHide = e.target.checked;
    const comments = $$("em");
    if (shouldHide) {
        comments.forEach(elm => elm.classList.add("hidden"));
    } else {
        comments.forEach(elm => elm.classList.remove("hidden"));
    }
});

$("#backgroundColor").addEventListener("change", (e) => {
    $("body").style.backgroundColor = e.target.value;
});
$("#foregroundColor").addEventListener("change", (e) => {
    $("body").style.color = e.target.value;
});
$("#commentsColor").addEventListener("change", (e) => {
    $$("em").forEach(elm => elm.style.color = e.target.value);
});

function loadTelescript(text) {
    // make sure single line comments start at new line
    text = text.replace(/\n([（【])/g, "\n\n$1");
    text = text.replace(/([）】])\n/g, "$1\n\n");
    // make comments color fade
    text = text.replace(/([（【])/g, "_$1");
    text = text.replace(/([）】])/g, "$1_");

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

    output.innerHTML = converter.makeHtml(text);
}

$("#input").addEventListener("change",  async (e) => {
    e.preventDefault();
    const reader = new FileReader();
    reader.onload = async (e) => {
        loadTelescript(e.target.result);
    };
    reader.readAsText(e.target.files[0])
});

(async function() {
    // load from server directly if a raw text src is supplied
    const queryParams = new URLSearchParams(location.search);
    const src = queryParams.get("src");
    if (src) {
        try {
            new URL(src);
            const res = await fetch("/telescript?src=" + src);
            const data = await res.text();
            loadTelescript(data);
        } catch (e) {
            console.log("invalid src url");
        }
    }
})();
