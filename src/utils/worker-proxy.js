import uuid from './uuid'

import NetworkWorker from '../workers/network.worker.js'

import imageConversion from 'image-conversion';
import { isAudio, isImage, isVideo } from './file-helpers'


function WorkerProxy(store, worker) {
  this.store = store
  this.worker = worker || new NetworkWorker()

  this.worker.addEventListener('message', this.onMessage.bind(this))
  this.worker.addEventListener('error', this.onError.bind(this))


  this.worker.postMessage('') // Init the worker
}


function asyncListenerFactory(promise, worker, asyncKey) {
  return function({ data: response }) {
    if (!response.asyncKey || response.asyncKey !== asyncKey) return
    worker.removeEventListener('message', this)
    delete response.asyncKey
    if (response.errorMsg) promise.reject(response.errorMsg)
    else promise.resolve(response)
  }
}

function fileStreamListenerFactory(worker, hash, callback) {
  return function({ data }) {
    if (!data.streamEvent || data.hash !== hash) return
    if (data.streamEvent === 'end' || data.streamEvent === 'error') {
      worker.removeEventListener('message', this)
    }
    delete data.hash
    callback(data)
  }
}

/**
 * Async wrapper for worker.postMessage
 */
WorkerProxy.prototype.postMessage = function(data) {
  return new Promise((resolve, reject) => {
    const key = uuid()
    data.asyncKey = key
    this.worker.addEventListener(
      'message',
      asyncListenerFactory({ resolve, reject }, this.worker, key)
    )
    this.worker.postMessage(data)
  })
}

WorkerProxy.prototype.startNetwork = function({ ipfs, orbit }) {
  return this.postMessage({
    action: 'network:start',
    options: { ipfs, orbit }
  })
}

WorkerProxy.prototype.stopNetwork = function() {
  return this.postMessage({
    action: 'network:stop'
  })
}

WorkerProxy.prototype.joinChannel = function(channelName) {
  return this.postMessage({
    action: 'orbit:join-channel',
    options: { channelName }
  })
}


WorkerProxy.prototype.leaveChannel = function(channelName) {
  return this.postMessage({
    action: 'orbit:leave-channel',
    options: { channelName }
  })
}

WorkerProxy.prototype.sendTextMessage = function(channelName, message) {
  return this.postMessage({
    action: 'channel:send-text-message',
    options: { channelName, message }
  })
}

WorkerProxy.prototype.joinDefaultChannels = function() {
  return this.postMessage({
    action: 'channel:join-default-channels',
    options: {}
  })
}


// This is hit on attaching an image
WorkerProxy.prototype.sendFileMessage = async function(channelName, file, buffer) {

  // If file size is greater than 5mb then do not send it and alert the user
  if (file.size < 5242880) {
    let fileBuffer, fileSize;
    // If the fileType is an image and the fileSize is over 1mb then compress it
    if (isImage(file.name) && (file.type != "image/gif") && (file.size > 1000000)) {
      const options = {
          type: "image/jpeg",
          scale: 0.28,
          size: 1000
        },
        compressedFile = await imageConversion.compressAccurately(file, options);

      // This file will be filled with preview data for the image
      fileBuffer = await getArrayBuffer(compressedFile);
      fileSize = 1000000;
    } else {
      fileBuffer = buffer;
      fileSize = file.size;
    };

    return this.postMessage({
      action: 'channel:send-file-message',
      options: {
        channelName,
        file: {
          filename: file.name,
          buffer: fileBuffer,
          meta: { mimeType: file.type, size: fileSize }
        }
      }
    })
  } else {
    alert("Cannot send file. Max shareable file size is 5mb.")
  }
}

const getArrayBuffer = async (file) => {
  return new Promise((resolve, reject) => {
    try {
      var arrayBuffer;
      var reader = new FileReader();
      reader.readAsArrayBuffer(file);
      reader.onloadend = function() {
        arrayBuffer = reader.result;
        resolve(arrayBuffer)
      }
    } catch (err) {
      reject(err);
    }
  })
}

WorkerProxy.prototype.getFile = function(options, onStreamEvent) {
  if (typeof onStreamEvent === 'function') {
    this.worker.addEventListener(
      'message',
      fileStreamListenerFactory(this.worker, options.hash, onStreamEvent)
    )
  }
  return this.postMessage({
    action: 'ipfs:get-file',
    options
  })
}

WorkerProxy.prototype.onMessage = function({ data }) {
  if (data.action && (data.action == "storageError")) {
    this.store.sessionStore.deleteDatabases();
    return;
  } else if (data.action && (data.action == "userIDBan")) {
    // Only add blocked Identity ID from moderator if option is checked
    if (this.store.rootStore.uiStore.useSuggestedModeration) {
      this.store.settingsStore._addBlockedIdentityID(data.args)
    }
    return
  }


  if (data.asyncKey || data.stream) return // They are handled separately
  if (typeof data.action !== 'string') return
  if (typeof data.name !== 'string') return

  if (data.action == "set-orbit-id") {
    window.orbitID = data.id;
  } else {
    const channel = data.meta ? this.store.channels[data.meta.channelName] : null
    switch (data.action) {

      case 'orbit-event':
        switch (data.name) {
          case 'connected':
            this.store._onOrbitConnected()
            break
          case 'disconnected':
            this.store._onOrbitDisconnected()
            break
          case 'joined':
            this.store._onJoinedChannel(...data.args, [])
            break
          case 'left':
            this.store._onLeftChannel(...data.args)
            break
          case 'peers':
            this.store._onSwarmPeerUpdate(...data.args)
            break
          default:
            break
        }
        break
      case 'channel-event':
        if (!channel) return
        switch (data.name) {
          case 'error':
            channel._onError(...data.args)
            break
          case 'peer.update':
            channel._onPeerUpdate(data.meta.peers)
            break
          case 'load.progress':
            // args: [address, hash, entry, progress, total]
            // _onLoadProgress is what's filling up chat box on initial entry
            channel._onLoadProgress(data.args[2], data.meta.replicationStatus)
            break
          case 'replicate.progress':
            // args: [address, hash, entry, progress, have]
            // _onReplicatate necessary for receiving messages
            channel._onReplicateProgress(data.args[2], data.meta.replicationStatus)
            break
          case 'ready': // load.done
            channel._onLoaded()
            break
          case 'replicated': // replicate.done
            channel._onReplicated()
            break
          case 'write':
            // args: [dbname, hash, entry]
            // _onWrite used to place your own sent message in your own chatbox
            channel._onWrite(data.args[2][0])
            break
          case 'tempWrite':
            channel._onTempWrite(data.args)
            break
          case 'tempDelete':
            channel._onTempDelete(data.args)
            break
          default:
            break
        }
        break
      case 'pubsub-event':
        if (!channel) return
        switch (data.name) {
          case 'updateRoomPeers':
            channel._onPeerUpdate(data.args)
            break;
          case 'addRoomPeers':
            channel._onPeersAdd(data.args)
            break;
          case 'removeRoomPeers':
            channel._onPeersRemove(data.args)
            break;
        }
        break;
      default:
        break
    }
  }
}

WorkerProxy.prototype.onError = function(error) {
  console.error(error.message);
  console.log(error);
  if (error.message == "Expected identifier, string or number") {
    window.clearBackground();
  } else {
    alert(error.message);
    location.reload();
  }
}

export default WorkerProxy
