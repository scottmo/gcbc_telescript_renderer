const axios = require('axios');

const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const port = process.env.PORT || 3000;

app.use(express.static(__dirname + '/public'));

io.on('connection', (socket) => {
    socket.on('scroll', (data) => {
        socket.broadcast.emit('scroll', data);
    });
});

const telescriptCache = {};
app.get('/telescript', async (req, res) => {
    try {
        const targetUrl = decodeURIComponent(req.query.src);
        if (!telescriptCache[targetUrl]) {
            const { data } = await axios.get(targetUrl);
            telescriptCache[targetUrl] = data;
        }
        res.send({ status: "OK", data: telescriptCache[targetUrl]});
    } catch(e) {
        res.send({ status: "ERROR", data: "Unable to fetch " + req.query.src + ".\n" + e.message });
    }
});

server.listen(port);
