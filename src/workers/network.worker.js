/* eslint-env worker */
'use strict'

import '@babel/polyfill'

import IPFS from 'ipfs'
import Orbit from 'orbit_'

import promiseQueue from '../utils/promise-queue'
import { concatUint8Arrays } from '../utils/file-helpers'

import pull from 'pull-stream'
import defaultSettingsOptions from '../config/ui.default.json'

import swarmKey from '../config/swarm.key'

import protector from 'libp2p-pnet';

import imageConversion from "image-conversion"

import PQueue from 'p-queue'


const ORBIT_EVENTS = ['connected', 'disconnected', 'joined', 'left', 'peers']
const CHANNEL_FEED_EVENTS = ['write', 'load.progress', 'replicate.progress', 'ready', 'replicated']

const messageQueue = new PQueue({ concurrency: 1 });

async function onMessage({ data }) {

  if (!data.action || typeof data.action !== 'string') return

  let response

  switch (data.action) {
    case 'network:start':
      response = await handleStart.call(this, data)
      break
    case 'network:stop':
      response = await handleStop.call(this, data)
      break
    case 'orbit:join-channel':
      response = await handleJoinChannel.call(this, data)
      break
    case 'orbit:leave-channel':
      response = await handleLeaveChannel.call(this, data)
      break
    case 'channel:send-text-message':
      response = await handleSendTextMessage.call(this, data)
      break
    case 'channel:send-file-message':
      response = await handleSendFileMessage.call(this, data)
      break
    case 'ipfs:get-file':
      response = await handleIpfsGetFile.call(this, data)
      break
    default:
      console.warn('Unknown action', data.action)
      break
  }

  if (!response) response = [{}]
  if (data.asyncKey) response[0].asyncKey = data.asyncKey
  this.postMessage(...response)
}

function orbitEvent(eventName, ...args) {
  if (typeof eventName !== 'string') return


  if (['joined', 'left'].indexOf(eventName) !== -1) {
    args = [args[0]]
  } else {
    args = []
  }

  this.postMessage({ action: 'orbit-event', name: eventName, args })
}

async function channelEvent(eventName, channelName, ...args) {
  if (typeof eventName !== 'string') return
  if (typeof channelName !== 'string') return


  const channel = this.orbit.channels[channelName]

  const meta = {
    channelName: channelName,
    replicationStatus: channel.replicationStatus
  }

  if (eventName === 'peer.update') {
    meta.peers = await channel.peers
  }

  this.postMessage({
    action: 'channel-event',
    name: eventName,
    meta,
    args
  })
}

async function pubsubEvent(eventMessage, channelName) {
  try {
    eventMessage = JSON.parse(eventMessage.data.toString());
    this.postMessage({
      action: 'pubsub-event',
      name: eventMessage.name,
      args: eventMessage.args,
      meta: { channelName }
    })
  } catch (err) {
    console.error(err);
  }
}

async function handleStart({ options }) {
  await startIPFS.call(this, options)
  await startOrbit.call(this, options)

  this.ipfs.version((err, { version }) => {
    if (err) {
      console.info('Unable to get js-ipfs version')
    }
    console.info(`Running js-ipfs version ${version}`)
  })
}

async function handleStop() {
  await this.orbit.disconnect()
  await this.ipfs.stop()
  delete this.orbit
  delete this.ipfs
}

async function generateUserProfile(channels) {
  return {
    peerID: (await this.ipfs.id()).id,
    userProfile: this.orbit.userProfile,
    userIdentity: {
      id: this.orbit.identity.id,
      type: this.orbit.identity.type,
      publicKey: this.orbit.identity.publicKey,
      signatures: this.orbit.identity.signatures
    },
    channels: channels
  }
}



// Tell bootstrap node you just joined a specific channel
async function bootstrapJoinedChannel({ channelName }) {
  for (let i = 0; i < defaultSettingsOptions.bootstrapNodes.length; i++) {
    try {
      this.ipfs.libp2p.dialProtocol(defaultSettingsOptions.bootstrapNodes[i], '/rawchat/bootstrap/channel/peer/join', async (err, connection) => {
        pull(pull.values([JSON.stringify(await generateUserProfile.call(this, [channelName]))]), connection)
      })
    } catch (err) {
      console.log(err);
    }
  }
}

async function handleJoinChannel({ options: { channelName } }) {


  const channel = await this.orbit.join(channelName)
  await this.ipfs.pubsub.subscribe(channelName, (async (message) => await pubsubEvent.call(this, message, channelName)))

  // Tell bootstrap nodes that you have joined a channel and send them your identity
  await bootstrapJoinedChannel.call(this, { channelName })

  await notifyJoinedChannel.call(this, channelName)

  channel.load(100)

  // Bind all relevant events
  CHANNEL_FEED_EVENTS.forEach(eventName => {
    channel.feed.events.on(eventName, channelEvent.bind(this, eventName, channelName))
  })
}





function handleLeaveChannel({ options }) {
  for (let i = 0; i < defaultSettingsOptions.bootstrapNodes.length; i++) {
    try {
      this.ipfs.libp2p.dialProtocol(defaultSettingsOptions.bootstrapNodes[i], '/rawchat/bootstrap/channel/peer/leave', async (err, connection) => {
        pull(pull.values([JSON.stringify(await generateUserProfile.call(this, [options.channelName]))]), connection)
      })
    } catch (err) {
      console.log(err);
    }
  }

  this.orbit.leave(options.channelName)
}

async function handleSendTextMessage({ options }) {
  const channel = this.orbit.channels[options.channelName];
  const tempHashDate = "tempHashDate" + String(Date.now());
  const tempChanMessage = {
    hash: tempHashDate,
    key: this.orbit.identity.publicKey,
    identity: JSON.parse(JSON.stringify(this.orbit.identity)),
    payload: {
      op: "ADD",
      value: {
        content: options.message,
        meta: {
          ts: Date.now(),
          from: JSON.parse(JSON.stringify(this.orbit._userProfile)),
          type: "tempText"
        }
      }
    }
  };

  // Submit temporary channel message while orbitdb is committing changes
  this.postMessage({
    action: 'channel-event',
    name: 'tempWrite',
    meta: { channelName: options.channelName },
    args: tempChanMessage
  });

  messageQueue.add(async () => {
    try {
      await this.orbit.send(channel.channelName, options.message);
    } catch (err) {
      console.log(err);
    }

    // Delete temporary channel since orbitdb commit is finished
    this.postMessage({
      action: 'channel-event',
      name: 'tempDelete',
      meta: { channelName: options.channelName },
      args: tempChanMessage
    });

  }, {})
};


function handleSendFileMessage({ options }) {
  const channel = this.orbit.channels[options.channelName],
    tempHashDate = "tempHashDate" + String(Date.now());

  const tempChanMessage = {
    hash: tempHashDate,
    key: this.orbit.identity.publicKey,
    identity: JSON.parse(JSON.stringify(this.orbit.identity)),
    payload: {
      op: "ADD",
      value: {
        content: options.file.filename,
        meta: {
          ts: Date.now(),
          from: JSON.parse(JSON.stringify(this.orbit._userProfile)),
          type: "tempText"
        }
      }
    }
  };

  // Submit temporary channel message while orbitdb is committing changes
  this.postMessage({
    action: 'channel-event',
    name: 'tempWrite',
    meta: { channelName: options.channelName },
    args: tempChanMessage
  });



  messageQueue.add(async () => {
    const messageHash = await this.orbit.addFile(channel.channelName, options.file)
    // Delete temporary channel since orbitdb commit is finished
    this.postMessage({
      action: 'channel-event',
      name: 'tempDelete',
      meta: { channelName: options.channelName },
      args: tempChanMessage
    });
  }, {})
}

async function handlePublishAfterSendFile(sendFunc, file) {

  const ipfsFile = await this.ipfs.add(Buffer.from(file.buffer))
  const res = await this.ipfs.name.publish("/ipfs/" + ipfsFile[0].hash)

  // Do not publish channel to pubsub channel until you know you have at least one peer
  let checkExist = setInterval(async () => {
    let peerList = await this.ipfs.pubsub.peers("file-rawchat");

    if (peerList.length > 0) {
      clearInterval(checkExist)
      await this.ipfs.pubsub.publish("file-rawchat", ipfsFile[0].hash);
    }
  }, 100)


  const sendFuncResults = sendFunc();
  return sendFuncResults
}

// Queue the calls to a promise queue
function queueCall(func) {
  // Get a reference to the buffer used by current promise queue
  this._callBuffer = this._callBuffer || []
  // Push to the buffer used by current promise queue
  this._callBuffer.push(func)

  // Either let the current queue run until it is done
  // or create a new queue
  this._promiseQueue =
    this._promiseQueue ||
    promiseQueue(this._callBuffer, () => {
      // Remove the current queue when done
      this._promiseQueue = null
    })
}

const sleep = m => new Promise(r => setTimeout(r, m))


async function startIPFS(options) {
  // IPFS await, waits for IPFS to be ready before continuing
  let ipfsOptions = {
    "preload": { "enabled": false },
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
        "connProtector": new protector(swarmKey)
      }
    },
    "config": {
      "Addresses": {
        "Swarm": [
          "/dns4/raw.chat/tcp/4000/wss/p2p-websocket-star"
        ]
      },
    }
  }

  try {
    if (options.ipfs.newRepo) {
      ipfsOptions.repo = String(Date.now());
    };

    this.ipfs = await IPFS.create(ipfsOptions);
    await setupIPFSBootstrapConnections.call(this);
    await setupIPFSListeners.call(this);
    await setupIPFSSubscriptions.call(this)

  } catch (err) {
    console.log(err);
    if (err.code == "ERR_DB_WRITE_FAILED") {
      this.postMessage({
        action: 'storageError'
      })
    }
  }

}

async function setupIPFSBootstrapConnections() {
  for (let i = 0; i < defaultSettingsOptions.bootstrapNodes.length; i++) {
    try {
      connectToPeer.call(this, defaultSettingsOptions.bootstrapNodes[i], true).then(() => {})
    } catch (err) {
      console.log(err);
    }
  }
}



async function userIDBanEvent(eventMessage) {
  try {

    // First check that the message is from a moderator
    for (let i = 0; i < defaultSettingsOptions.bootstrapNodes.length; i++) {
      const bootstrapPeerID = defaultSettingsOptions.bootstrapNodes[i].split("/").slice(-1)[0];
      if (eventMessage.from == bootstrapPeerID) {
        eventMessage = JSON.parse(eventMessage.data.toString());
        this.postMessage({
          action: 'userIDBan',
          name: eventMessage.name,
          args: eventMessage.args,
        });
        break;
      }
    };
  } catch (err) {
    console.error(err);
  }
}


// Join these channels, even though you aren't listening, because it improves channel peer discovery for pubsub 
// Temporary section, should delete
async function setupIPFSSubscriptions() {
  await this.ipfs.pubsub.subscribe("joined-rawchat-channel", (() => {}));
  await this.ipfs.pubsub.subscribe("file-rawchat", (() => {}));
  await this.ipfs.pubsub.subscribe("userIDBan", (async (message) => await userIDBanEvent.call(this, message)))
}

async function setupIPFSListeners() {
  this.ipfs.libp2p.on('peer:disconnect', (peerInfo, reason) => {
    let bootStrapPeerIDs = [];

    for (let i = 0; i < defaultSettingsOptions.bootstrapNodes.length; i++) {
      bootStrapPeerIDs.push(defaultSettingsOptions.bootstrapNodes[i].split("/").slice(-1)[0]);
    };

    const indexCheck = bootStrapPeerIDs.indexOf(peerInfo.id.toB58String());
    if (indexCheck > -1) {
      connectToPeer.call(this, defaultSettingsOptions.bootstrapNodes[indexCheck], false);
    }
    console.log(`Disconnected from ${peerInfo.id.toB58String()}`)
  })

  // Listen for messages from bootstrap peers
  this.ipfs.libp2p.handle('/rawchat/bootstrap/channel', (protocolName, connection) => {
    pull(connection, pull.collect((err, data) => {
      console.log("received:", data.toString())
    }))
  })

  // Get all peers in a single channel
  this.ipfs.libp2p.handle('/rawchat/bootstrap/channel/peers', (protocolName, connection) => {

    pull(connection, pull.collect((err, data) => {
      const channelData = JSON.parse(data.toString());
      if (channelData && channelData.peers) {
        this.postMessage({
          action: 'pubsub-event',
          name: "updateRoomPeers",
          args: channelData.peers,
          meta: { channelName: channelData.channel }
        })
      }
    }))
  })

}


async function startOrbit(options) {
  this.orbit = await Orbit.create(this.ipfs, options.orbit)


  this.postMessage({
    action: 'set-orbit-id',
    name: "setOrbitID",
    id: this.orbit.identity.id,
  });
  // Bind all relevant events
  ORBIT_EVENTS.forEach(eventName => {
    this.orbit.events.on(eventName, orbitEvent.bind(this, eventName))
  })

  // Fake the 'connected' event since we can not hear it with the async create API
  this.orbit.events.emit('connected', this.orbit.user)
}


async function connectToPeer(peerLink, firstTime) {
  return new Promise(async (resolve, reject) => {

    try {
      if (this.ipfs) {
        await this.ipfs.swarm.connect(peerLink);
        if (!firstTime) {
          for (let channelName in this.orbit.channels) {
            // On reconnect message bootstrap nodes that you have joined the channel
            await bootstrapJoinedChannel.call(this, { channelName })
            await notifyJoinedChannel.call(this, channelName);
          }
        }
      }
      resolve();
    } catch (err) {
      await sleep(1000);
      await connectToPeer.call(this, peerLink, firstTime);
    }
  })
}

// Publish message that you have joined a channel
async function notifyJoinedChannel(channelName) {
  // Do not publish channel to pubsub channel until you know you have at least one peer
  let checkExist = setInterval(async () => {
    let peerList = await this.ipfs.pubsub.peers("joined-rawchat-channel");

    if (peerList.length > 0) {
      clearInterval(checkExist)
      await this.ipfs.pubsub.publish("joined-rawchat-channel", channelName);
    }
  }, 100)
};

function refreshChannelPeers() {
  if (this.orbit && this.orbit.channels) {
    Object.keys(this.orbit.channels).forEach(channelName => {

      channelEvent.call(this, 'peer.update', channelName)
    })
  }
}

async function handleIpfsGetFile({ options }) {
  try {
    const array = await getFile(this.orbit, options.hash, this.postMessage, options)
    return [{ data: array },
      [array.buffer]
    ]
  } catch (error) {
    return [{ data: null, errorMsg: error.message }]
  }
}

function getFile(orbit, hash, postMessage, options = {}) {
  return new Promise((resolve, reject) => {
    const timeoutError = new Error('Timeout while fetching file')
    const timeout = options.timeout || 5 * 1000
    let timeoutTimer = setTimeout(() => {
      reject(timeoutError)
    }, timeout)
    const stream = orbit.getFile(hash)
    let array = new Uint8Array(0)
    stream.on('error', error => {
      clearTimeout(timeoutTimer)
      postMessage({ streamEvent: 'error', hash, error })
      reject(error)
    })
    stream.on('data', chunk => {
      clearTimeout(timeoutTimer)
      array = concatUint8Arrays(array, chunk)
      postMessage({ streamEvent: 'data', hash, chunk }, [chunk.buffer])
      timeoutTimer = setTimeout(() => {
        reject(timeoutError)
      }, timeout)
    })
    stream.on('end', () => {
      clearTimeout(timeoutTimer)
      postMessage({ streamEvent: 'end', hash })
      resolve(array)
    })
  })
}

// Get a reference just so we can bind onmessage and use 'call' on setinterval
const worker = self || {}
worker.writableStream = ''
onmessage = onMessage.bind(worker)

// setInterval(() => {
//   refreshChannelPeers.call(worker)
// }, 1000)
