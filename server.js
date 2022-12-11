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
    const targetUrl = decodeURIComponent(req.query.src);
    if (telescriptCache[targetUrl]) return telescriptCache[targetUrl];

    const { data } = await axios.get(targetUrl);

    telescriptCache[targetUrl] = data;
    res.send(data);
});

server.listen(port);
