'use strict'

const IPFS = require('ipfs'),
    fs = require("fs"),
    Orbit = require('orbit_'),
    request = require("request"),
    protector = require('libp2p-pnet'),
    swarmKeyPath = './swarm.key',
    cluster = require("cluster"),
    bodyParser = require('body-parser'),
    express = require("express"),
    config = require("./config.json"),
    websocketServer = `/dns4/${config.host}/tcp/4000/wss`,
    pull = require('pull-stream');

// List of default channels
let channelPeerList = {
    "lobby": []
};

const getUniqueUsers = (peers) => {
    let uniqueUserList = [],
        uniqueNameList = [];
    for (let i = 0; i < peers.length; i++) {
        if (uniqueNameList.indexOf(peers[i].userProfile.name) == -1) {
            uniqueUserList.push(peers[i]);
            uniqueNameList.push(peers[i].userProfile.name);
        }
    }
    return uniqueUserList
}


// Return list of top default rooms
exports.compileLargestDefaultRooms = (channelPeerList, numberOfRooms, channelBanList) => {
    // Compile channelPeerList in to an array
    let peerList = Object.entries(channelPeerList);

    // Sort by largest peer lists
    peerList = peerList.sort(function(a, b) { return a[1].length < b[1].length; });

    for (let i = 0; i < peerList.length; i++) {
        peerList[i][1] = getUniqueUsers(peerList[i][1]);
        if (peerList[i][0] != "lobby" && peerList[i][1].length == 0) {
            peerList.splice(i, 1);
            i--;
        } else if (channelBanList.indexOf(peerList[i][0]) > -1) {
            peerList.splice(i, 1);
            i--;
        }
    }

    peerList = peerList.slice(0, numberOfRooms);

    return peerList;
}

exports.compileSingleRoom = (channelName) => {
    let roomData = [channelName]
    if (channelPeerList[channelName]) {
        roomData[1] = getUniqueUsers(channelPeerList[channelName]);
    } else {
        roomData[1] = []
    }
    return roomData;
}

// Get a random room from all rooms with at least one person in it
exports.compileRandomRoom = (channelPeerList, currentChannelName, channelBanList) => {
    let roomList = this.compileLargestDefaultRooms(channelPeerList, 1000, channelBanList);

    for (let i = 0; i < roomList.length; i++) {
        if (roomList[i][0] == currentChannelName) {
            roomList.splice(i, 1);
        }
    };

    let randomRoomArr = [];
    if (roomList.length > 0) {
        // Get a single room from array
        randomRoomArr = roomList[Math.floor(Math.random() * roomList.length)];
    } else {
        // If no other rooms are available then just return the lobby 
        randomRoomArr = ["lobby", []];
    }

    return { channelName: randomRoomArr[0] }
}


if (!cluster.isMaster) {
    process.on('message', (data) => {
        if ((data.messageType == "banUserID") && this.node) {
            this.node.pubsub.publish("userIDBan", JSON.stringify({
                action: "pubsub-event",
                name: "userIDBan",
                args: [data.userID]
            }));
        }
    })

    // If you are not already in the channel then join it in orbit to start recording history 
    const receiveJoinedChannelMessage = async (message) => {
        const channelName = message.data.toString();
        this.orbit.join(channelName);
    }

    let options = {
        "EXPERIMENTAL": {
            "pubsub": true
        },
        "libp2p": {
            "config": {
                "peerDiscovery": {
                    "autoDial": true,
                },
            },
            "modules": {
                "connProtector": new protector(fs.readFileSync(swarmKeyPath))
            }
        },
        "config": {
            "Addresses": {
                "Swarm": [
                    `${websocketServer}/p2p-websocket-star`,
                    "/ip4/0.0.0.0/tcp/4002",
                    "/ip4/0.0.0.0/tcp/4003/ws"
                ]
            },
            "Swarm": {
                "ConnMgr": {
                    "LowWater": 10000,
                    "HighWater": 15000
                }
            },
            "Bootstrap": [

            ]
        }
    };


    (async () => {
        this.node = await IPFS.create(options)

        const announcePeerRemoval = async (channelName, peerID) => {
            this.node.pubsub.publish(channelName, JSON.stringify({
                action: "pubsub-event",
                name: "removeRoomPeers",
                args: [peerID]
            }));
            process.send({ messageType: "channelPeerListUpdate", channelPeerList });
        };

        const announcePeerAddition = async (channelName, userOne) => {
            this.node.pubsub.publish(channelName, JSON.stringify({
                action: "pubsub-event",
                name: "addRoomPeers",
                args: [userOne]
            }));
            process.send({ messageType: "channelPeerListUpdate", channelPeerList });
        };

        const addUserToChannel = async (userInfo, channelName) => {
            if (channelPeerList[channelName]) {
                for (let i = 0; i < channelPeerList[channelName].length; i++) {
                    // If peer already exists in channel then return and do not add them again
                    if (channelPeerList[channelName][i].peerID == userInfo.peerID) {
                        return;
                    }
                };
                channelPeerList[channelName].push(userInfo);
            } else {
                channelPeerList[channelName] = [userInfo];
            }
            announcePeerAddition(channelName, userInfo);
            return channelPeerList[channelName];
        }

        const removeUserFromChannels = async (peerID) => {
            for (let key in channelPeerList) {
                for (let i = 0; i < channelPeerList[key].length; i++) {
                    if (channelPeerList[key][i].peerID == peerID) {
                        channelPeerList[key].splice(i, 1);
                        i--;
                        announcePeerRemoval(key, peerID);
                    }
                }
            }
        }

        const removeUserFromSingleChannel = async (userInfo, channelName) => {
            for (let i = 0; i < channelPeerList[channelName].length; i++) {
                if (channelPeerList[channelName][i].peerID == userInfo.peerID) {
                    channelPeerList[channelName].splice(i, 1);
                    i--;
                    announcePeerRemoval(channelName, userInfo.peerID);
                }
            }
        }

        // start the API gateway
        this.orbit = new Orbit(this.node)

        const username = 'Archive bot'
        const channel = 'rawchat'

        // This handle is triggered when a user joins a new channel and wants to be added to the peerList
        this.node.libp2p.handle('/rawchat/bootstrap/channel/peer/join', (protocolName, origConnection) => {
            pull(origConnection, pull.collect(async (err, data) => {
                try {
                    const userData = JSON.parse(data.toString());
                    for (let i = 0; i < userData.channels.length; i++) {
                        const peerList = await addUserToChannel({ userProfile: userData.userProfile, peerID: userData.peerID, userIdentity: userData.userIdentity }, userData.channels[i]);
                        this.node.libp2p.dialProtocol((`${websocketServer}/ipfs/${userData.peerID}`), '/rawchat/bootstrap/channel/peers', (err, connection) => {
                            pull(pull.values([JSON.stringify({ channel: userData.channels[i], peers: peerList })]), connection)
                        })
                    }
                } catch (err) {
                    // console.log(err);
                }
            }));
        });

        // Remove user from a channel
        this.node.libp2p.handle('/rawchat/bootstrap/channel/peer/leave', (protocolName, connection) => {
            pull(connection, pull.collect((err, data) => {
                try {
                    const userData = JSON.parse(data.toString());
                    for (let i = 0; i < userData.channels.length; i++) {
                        removeUserFromSingleChannel({ userProfile: userData.userProfile, peerID: userData.peerID }, userData.channels[i]);
                    }
                } catch (err) {
                    console.log(err);
                }
            }));
        });

        // On peer disconnect remove them from userList
        this.node.libp2p.on('peer:disconnect', (peerInfo) => {
            removeUserFromChannels(peerInfo.id.toB58String())
        })

        // Listen for new messages
        this.orbit.events.on('entry', (entry, channelName) => {
            const post = entry.payload.value
        })

        this.orbit.connect(username).catch(e => console.error(e))

        // Listen for channel additions to make sure you are bootstrapping all orbit channels
        await this.node.pubsub.subscribe("joined-rawchat-channel", receiveJoinedChannelMessage);
    })();
} else {

}