let lastGets = []; // record gets from proxy
let recordGets = false; // whether to record gets
const globalWatchers = new Map(); // watchers for proxy

function reactive(obj) {
    const proxy = new Proxy(obj, { 
        get(target, key) {
            if (recordGets) {
                lastGets.push({ proxy, key });
            }
            return target[key];
        },
        set(target, key, value) {
            target[key] = value;
            if (globalWatchers.has(proxy)) {
                const watchers = globalWatchers.get(proxy);
                (watchers[key] || []).forEach(watcher => watcher(value));
            }
            return true;
        }
    });
    return proxy;
}
function observeGets(fn) {
    recordGets = true;
    const value = fn();
    recordGets = false;
    const gets = lastGets;
    lastGets = [];
    return { value, gets };
}

function watch(proxy, key, fn) {
    if (arguments.length === 2
            && typeof proxy === "function"
            && typeof key === "function") {
        watchFn(proxy, key);
        return;
    }

    if (typeof key !== "string" || typeof fn !== "function") return;

    // init watchers map
    if (!globalWatchers.has(proxy)) {
        globalWatchers.set(proxy, {});
    }
    const watchers = globalWatchers.get(proxy);

    if (!watchers[key]) watchers[key] = [];
    watchers[key].push(fn);

    fn(proxy[key]);
}

function watchFn(valueFn, fn) {
    const { value, gets } = observeGets(valueFn);
    gets.forEach(({ proxy, key }) => {
        watch(proxy, key, function() {
            fn(valueFn());
        });
    });
    fn(value);
}

function $(sel) {
    const el = (typeof sel === "string") ? document.querySelector(sel) : sel;

    return {
        element: el,
        on: function(...args) {
            el.addEventListener.apply(el, args);
            return this;
        },
        text: function(value) {
            if (typeof value === "string") {
                el.textContent = value;
                return this;
            } else {
                return el.textContent;
            }
        },
        value: function(value) {
            el.value = value;
            return this;
        },
        innerHTML: function(html) {
            el.innerHTML = html;
            return this;
        },
        outerHTML: function(html) {
            el.outerHTML = html;
            return this;
        },
        attr: function(key, value) {
            // get
            if (arguments.length === 1) {
                return el.getAttribute(key);
            }
            // set
            if (typeof value === "function") {
                watch(value, function(computed) {
                    if (computed) {
                        el.setAttribute(key, computed);
                    } else {
                        el.removeAttribute(key);
                    }
                });
            } else {
                if (value) {
                    el.setAttribute(key, value);
                } else {
                    el.removeAttribute(key);
                }
            }
            return this;
        }
    };
}

export {
    $,
    watch,
    reactive
};
