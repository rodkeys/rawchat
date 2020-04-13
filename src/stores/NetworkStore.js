'use strict'

import {
  action,
  computed,
  configure,
  keys,
  observable,
  reaction,
  values,
  toJS,
  runInAction
} from 'mobx'

import ChannelStore from './ChannelStore'

import Logger from '../utils/logger'
import WorkerProxy from '../utils/worker-proxy'
import { createWeeklyChannelName } from '../utils/channels'

configure({ enforceActions: 'observed' })

const logger = new Logger()

export default class NetworkStore {
  worker = null

  constructor(rootStore) {
    this.rootStore = rootStore
    this.sessionStore = rootStore.sessionStore
    this.settingsStore = rootStore.settingsStore

    this.workerProxy = new WorkerProxy(this)


    // Stop if user logs out, start if not already online or not starting
    reaction(
      () => this.sessionStore.username,
      username => {
        // if (!username) this.stop()
        // else 
        if (!(this.isOnline || this.starting)) this.start()
      }
    )
  }

  // Public instance variables
  networkName = window.location.href.match('localhost:') ? 'Decentralized Chat' : 'Decentralized Chat'

  @observable
  starting = false

  @observable
  stopping = false

  @observable
  isOnline = false




  @observable
  channels = {}

  // Keeps track of the channel join promises
  // This helps us to prevent joining same channel multiple times in quick succession
  _joiningChannelPromises = {}

  @observable
  swarmPeers = []

  @observable
  defaultChannels = ["lobby"]
  // defaultChannels = window.location.href.match('localhost:') ? [createWeeklyChannelName('orbit-dev')] : [createWeeklyChannelName('orbit')]

  // Public instance getters

  @computed
  get hasUnreadMessages() {
    return this.channelsAsArray.some(c => c.hasUnreadMessages)
  }



  @computed
  get channelNames() {
    return keys(this.channels).sort((a, b) => a.localeCompare(b))
  }

  @computed
  get channelsAsArray() {
    return values(this.channels).sort(({ channelName: a }, { channelName: b }) =>
      a.localeCompare(b)
    )
  }

  @computed
  get unreadEntriesCount() {
    return values(this.channels)
      .filter(c => !c.active) // Consider only non-active channels
      .reduce((sum, c) => sum + c.unreadEntries.length, 0)
  }

  // Private instance actions

  @action.bound
  _onOrbitConnected() {
    this.isOnline = true
    this.starting = false
    // Join all channnels that are saved in localstorage for current user
    this.settingsStore.networkSettings.channels.forEach((channel) => {
      this.joinChannel(channel, []);
    });

    // Join channels that should be joined by default
    if (
      this.rootStore.isNewAppVersion ||
      this.settingsStore.networkSettings.channels.length === 0
    ) {
      this.defaultChannels.forEach((channel) => {
        this.joinChannel(channel, []);
      });
    }
  }

  @action.bound
  _onOrbitDisconnected() {
    this.isOnline = false
    this.stopping = false
  }

  @action.bound
  _onJoinedChannel(channelName, peers) {
    if (typeof channelName !== 'string') {
      return
    }

    if (this.channelNames.includes(channelName)) {
      if (peers.length > 0) {
        this.channels[channelName].peers = peers;
      }
      return this.channels[channelName]
    }

    this.channels[channelName] = new ChannelStore({
      network: this,
      channelName,
      peers
    })

    // Save the channel to localstorage
    // so user will connect to it automatically next time
    const networkSettings = this.settingsStore.networkSettings
    networkSettings.channels = [
      ...networkSettings.channels.filter(c => c !== channelName),
      channelName
    ]

    return this.channels[channelName]
  }

  @action.bound
  _onLeftChannel(channelName) {
    if (typeof channelName !== 'string') return
    if (!this.channelNames.includes(channelName)) return

    this._removeChannel(channelName)

    // Remove the channel from localstorage
    const networkSettings = this.settingsStore.networkSettings
    networkSettings.channels = networkSettings.channels.filter(c => c !== channelName)
  }

  @action.bound
  _onSwarmPeerUpdate(peers) {
    this.swarmPeers = peers
  }

  @action.bound
  _removeChannel(channelName) {
    if (typeof channelName !== 'string') return
    delete this.channels[channelName]
    delete this._joiningChannelPromises[channelName]
  }

  @action.bound
  _resetSwarmPeers() {
    this.swarmPeers = []
  }


  // Public instance methods
  async joinChannel(channelName, peers) {
    if (typeof channelName !== 'string') return
    if (!this.isOnline) throw new Error('Network is not online')
    if (!(channelName in this._joiningChannelPromises) &&
      !this.channelNames.includes(channelName)) {
      this._joiningChannelPromises[channelName] = this.workerProxy.joinChannel(channelName)
        .then(() => this._onJoinedChannel(channelName, peers))
    }

    return this._joiningChannelPromises[channelName]
  }



  async leaveChannel(channelName) {
    if (typeof channelName !== 'string') return
    if (!this.isOnline) throw new Error('Network is not online')
    if (this.channelNames.includes(channelName)) {
      await this.workerProxy.leaveChannel(channelName)
    }
    return this._onLeftChannel(channelName)
  }

  @action.bound

  async start() {
    if (this.isOnline) return

    runInAction(() => {
      this.starting = true
    })

    logger.info('Starting network')

    const ipfsOptions = toJS(this.settingsStore.networkSettings.ipfs) || {}
    ipfsOptions.repo = `orbit-chat-ipfs-${this.sessionStore.username}`
    ipfsOptions.EXPERIMENTAL = Object.assign({}, ipfsOptions.EXPERIMENTAL, { pubsub: true })

    const orbitOptions = toJS(this.settingsStore.networkSettings.orbit) || {}
    orbitOptions.directory = `orbit-chat-orbitdb-${this.sessionStore.username}`
    orbitOptions.id = this.sessionStore.username

    if (newTab == true) {
      ipfsOptions.newRepo = true;
    } else if (newTab == false || newTab == undefined) {
      ipfsOptions.newRepo = false;
    };


    await this.workerProxy.startNetwork({ ipfs: ipfsOptions, orbit: orbitOptions })

  }

  @action.bound
  async stop() {
    if (!this.isOnline) return
    runInAction(() => {
      this.stopping = true
    })

    logger.info('Stopping network')

    clearInterval(this.channelPeerInterval)
    clearInterval(this.channelProcessInterval)

    await this.workerProxy.stopNetwork()

    this.channelNames.forEach(this._removeChannel)
    this._resetSwarmPeers()
  }
}