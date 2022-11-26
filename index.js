function $(sel) {
    return document.querySelector(sel);
}
function $$(sel) {
    return document.querySelectorAll(sel);
}

const converter = new showdown.Converter();
const output = $("#output");

let zoomLevel = 2;
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

$("#input").addEventListener("change",  async (e) => {
    e.preventDefault();
    const reader = new FileReader();
    reader.onload = async (e) => { 
        let text = (e.target.result);

        // make comments color fade
        text = text.replaceAll("（", "_（");
        text = text.replaceAll("）", "）_");
        text = text.replaceAll("【", "_【");
        text = text.replaceAll("】", "】_");

        // make character name stands out in beginning of dialogs
        text = text.replace(/\n\s*(.+?)：/g, "\n\n__$1__：");

        inserts.forEach(({key, value}) => {
            text = text.replace(key, key + "\n\n" + value.trim().split("\n").map(s => {
                if (s.trim() === "") {
                    return "> --"; // separate verse
                }
                return "> " + s;
            }).join("\n\n"));
        });

        output.innerHTML = converter.makeHtml(text);
    };
    reader.readAsText(e.target.files[0])
});
