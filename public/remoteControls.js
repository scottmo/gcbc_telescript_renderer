(function () {
    const socket = io();

    function scroll(ypos) {
        window.requestAnimationFrame(() => {
            scrollTo(0, ypos);
        });
    }

    document.querySelector("#scrollDown").addEventListener("click", () => {
        socket.emit("scroll", window.scrollY + 100);
        scroll(window.scrollY + 100);
    });

    socket.on("scroll", (ypos) => {
        scroll(ypos);
    });

    // function throttle(fn, delay) {
    //     // Capture the current time 
    //     let time = Date.now();

    //     // Here's our logic 
    //     return () => {
    //         if ((time + delay - Date.now()) <= 0) {
    //             // Run the function we've passed to our throttler, 
    //             // and reset the `time` variable (so we can check again). 
    //             fn();
    //             time = Date.now();
    //         }
    //     }
    // }

    // document.addEventListener('scroll', (e) => {
    //     e.preventDefault();
    // });

    // document.addEventListener('scroll', throttle((e) => {
    //     socket.emit("scroll", window.scrollY);
    // }, 200));
})();
