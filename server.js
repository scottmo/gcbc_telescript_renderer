const axios = require('axios');
const unzipper = require('unzipper');

const path = require('path');
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

let fetchCache = {};
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

async function fetchZipAndLoadFile(url, targetFileName) {
    const response = await axios({
        method: 'get',
        url,
        responseType: 'stream' // Important: Treat as stream
    });

    const directory = response.data.pipe(unzipper.Parse({ forceStream: true }));

    for await (const entry of directory) {
        const fileName = entry.path;
        console.log(`Found file: ${fileName}`);

        if (entry.type === 'File' && (!targetFileName || path.basename(fileName) === targetFileName)) {
            const content = await entry.buffer();
            return content.toString(); // Return content as a string
        } else {
            entry.autodrain(); // Skip unnecessary files
        }
    }

    console.log('No file found in the ZIP.');
    return null;
}

function getGDriveLink(id) {
    if (!id) return null;

    return `https://drive.google.com/uc?export=download&id=${id}`;
}

function getGDocLink(id, tab, format) {
    if (!id) return null;

    return `https://docs.google.com/document/export?format=${format || 'txt'}&id=${id}&tab=${tab || 't.0'}`;
}

app.get('/', async (req, res) => {
    let { src, sub, tab, provider, format, bustCache } = req.query;
    if (bustCache) {
        fetchCache = {};
    }
    if (src) {
        if (provider === 'gdrive') {
            switch(format) {
                case 'html':
                    format = 'zip';
                    break;
                case 'md':
                    break;
                default:
                    format = 'txt'
            }
            src = getGDocLink(src, tab, format);
            sub = getGDriveLink(sub);
        }
        try {
            const payload = {};
            switch(format) {
                case 'zip':
                    payload.src = await fetchZipAndLoadFile(src);
                    break;
                case 'md':
                default:
                    payload.src = await fetch(src);
            }
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
