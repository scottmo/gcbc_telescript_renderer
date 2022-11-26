function $(sel) {
    return document.querySelector(sel);
}

const converter = new showdown.Converter();
const input = $("#input");
const output = $("#output");

let zoomLevel = 2;
output.style.zoom = zoomLevel;
$("#zoomin").addEventListener("click", () => {
    output.style.zoom = ++zoomLevel;
});
$("#zoomout").addEventListener("click", () => {
    output.style.zoom = --zoomLevel;
});

input.addEventListener("change",  async (e) => {
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
