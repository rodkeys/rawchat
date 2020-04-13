'use strict'

const IPFS = require('ipfs'),
    fs = require("fs"),
    Orbit = require('orbit_'),
    request = require("request"),
    cluster = require("cluster"),
    bodyParser = require('body-parser'),
    ipfsHandler = require("./ipfsHandler.js"),
    config = require("./config.json"),
    multer = require("multer"),
    sha256 = require("sha256"),
    path = require("path"),
    express = require("express");

// List of default channels
let channelPeerList = {
        "lobby": []
    },
    userBanList = [],
    // ChannelBanList just stops the channel from appearing on the front page
    channelBanList = [];

process.setMaxListeners(10000);


if (cluster.isMaster) {
    // Generate a worker thread to handle IPFS/orbit node
    exports.worker = cluster.fork();

    this.worker.on("message", (message) => {
        if (message.messageType == "channelPeerListUpdate") {
            channelPeerList = message.channelPeerList
        }
    })

    // Initialize ban lists 
    if (fs.existsSync("./banLists/userBanList.json")) {
        userBanList = JSON.parse(fs.readFileSync("./banLists/userBanList.json"));
    } else {
        fs.writeFileSync("./banLists/userBanList.json", "[]");
    }

    // Initialize ban lists 
    if (fs.existsSync("./banLists/channelBanList.json")) {
        channelBanList = JSON.parse(fs.readFileSync("./banLists/channelBanList.json"));
    } else {
        fs.writeFileSync("./banLists/channelBanList.json", "[]");
    }

    let app = express(),
        serverOptions = {
            key: fs.readFileSync(config.sslKey),
            cert: fs.readFileSync(config.sslCert)
        },
        server = require('https').createServer(serverOptions, app);

    app.use(bodyParser.json({ limit: '25mb' }));
    app.use(bodyParser.urlencoded({ extended: true }));

    app.set('views', path.join(__dirname, '/../dist'));
    app.use(express.static(path.join(__dirname, '/../dist'))); // Where the server serves files
    app.set('view engine', 'html');

    // Set cross origin allowance
    app.all('/*', (req, res, next) => {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        next();
    });


    app.get('/v0/channels/default/:roomCount', (req, res) => {
        res.status(200).send(ipfsHandler.compileLargestDefaultRooms(channelPeerList, Number(req.params.roomCount), channelBanList));
    });

    app.get('/v0/channel/random/:currentChannelName', (req, res) => {
        res.status(200).send(ipfsHandler.compileRandomRoom(channelPeerList, req.params.currentChannelName, channelBanList));
    });

    app.get('/v0/channel/:channelName', (req, res) => {
        res.status(200).send(ipfsHandler.compileSingleRoom(req.params.channelName));
    });

    app.get('/v0/channels/allUserBans', (req, res) => {
        res.status(200).send({ userBanList: userBanList });
    });

    app.get('/v0/admin/:adminPassword/ban/user/:userID', (req, res) => {
        if (req.params.adminPassword == config.adminPassword) {
            if (userBanList.indexOf(req.params.userID) == -1) {
                userBanList.push(req.params.userID);
                fs.writeFileSync("./banLists/userBanList.json", JSON.stringify(userBanList));
                this.worker.send({
                    messageType: "banUserID",
                    userID: req.params.userID
                });
            };
            res.status(200).send({ success: true });
        } else {
            res.status(400).send({ success: false });
        }
    });

    app.get('/v0/admin/:adminPassword/unban/user/:userID', (req, res) => {
        if (req.params.adminPassword == config.adminPassword) {
            if (userBanList.indexOf(req.params.userID) > -1) {
                userBanList.splice(userBanList.indexOf(req.params.userID), 1);
                fs.writeFileSync("./banLists/userBanList.json", JSON.stringify(userBanList));
                this.worker.send({
                    messageType: "unbanUserID",
                    userID: req.params.userID
                });
            };
            res.status(200).send({ success: true });
        } else {
            res.status(400).send({ success: false });
        }
    });

    app.get('/v0/admin/:adminPassword/ban/channel/:channelName', (req, res) => {
        if (req.params.adminPassword == config.adminPassword) {
            if (channelBanList.indexOf(req.params.channelName) == -1) {
                channelBanList.push(req.params.channelName);
                fs.writeFileSync("./banLists/channelBanList.json", JSON.stringify(channelBanList));
            };
            res.status(200).send({ success: true });
        } else {
            res.status(400).send({ success: false });
        }
    });


    app.get('/f/:filename', (req, res) => {
        res.status(200).sendFile(path.join(__dirname, "hostedFiles", req.params.filename));
    });

    app.get('/*', function(req, res) {
        res.sendFile(path.normalize(__dirname + '/../dist/index.html'));
    });

    app.post("/v0/channel/:channelName/file/upload", multer().any(), async (req, res) => {
        try {
            if (req.files && req.files.length > 0) {

                const file = req.files[0],
                    hash = sha256(file.buffer),
                    fileExtension = file.originalname.split('.').pop(),
                    newFileName = `${hash.slice(0, 8)}.${fileExtension}`;

                if (file.size < 20971520) {

                    if (config.blackListedExtensions.indexOf(fileExtension) == -1) {
                        fs.writeFileSync(`./hostedFiles/${newFileName}`, file.buffer);
                        res.status(200).send({ fileName: `https://${config.host}/f/${newFileName}` })
                    } else {
                        res.status(400).send({ message: "Error: Cannot upload dangerous file type" });
                    }
                } else {
                    res.status(400).send({ message: "Error: Cannot upload file, max file size is 20mb" });
                }
            } else {
                res.status(400).send({ message: "No files were uploaded" });
            }
        } catch (err) {
            console.log(err);
            res.status(400).send({ message: "Upload file failed" });
        }
    });


    // Start server
    server.listen(443, function() {
        console.log('Server Listening on', 443);
    });

    // This is for redirecting http -> https for use in web server
    let http = require('http');
    http.createServer(function(req, res) {
        res.writeHead(301, { "Location": "https://" + req.headers['host'] + req.url });
        res.end();
    }).listen(80);


    // If you are not already in the channel then join it in orbit to start recording history 
    const receiveJoinedChannelMessage = async (message) => {
        const channelName = message.data.toString();
        this.orbit.join(channelName);
    }

}