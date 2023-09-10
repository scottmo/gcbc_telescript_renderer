const axios = require('axios');

const express = require('express');
const { engine } = require('express-handlebars');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const port = process.env.PORT || 3000;

app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.set('views', './views');

app.use(express.static(__dirname + '/public'));

const fetchCache = {};
async function fetch(url) {
    if (!url) {
        return null;
    }
    if (!fetchCache[url]) {
        const { data } = await axios.get(url);
        fetchCache[url] = data;
    }
    return fetchCache[url];
}

function getGDriveLink(id) {
    if (!id) return null;

    return `https://drive.google.com/uc?export=download&id=${id}`;
}

app.get('/', async (req, res) => {
    let { src, sub, provider } = req.query;
    if (src) {
        if (provider === 'gdrive') {
            src = getGDriveLink(src);
            sub = getGDriveLink(sub);
        }
        try {
            const payload = {};
            payload.src = await fetch(src);
            payload.sub = await fetch(sub);
            res.render('home', { payload: JSON.stringify(payload) });
        } catch (e) {
            console.log(`Unable to load src (${src}) or sub (${sub})`, e);
        }
    } else {
        res.render('home');
    }
});

io.on('connection', (socket) => {
    socket.on('scroll', (data) => {
        socket.broadcast.emit('scroll', data);
    });
});

server.listen(port);
