'use strict'

import { action, configure, observable, computed, runInAction } from 'mobx'

import Logger from '../utils/logger'
import * as cookies from '../utils/cookies'
import * as randomWords from 'random-words'

configure({ enforceActions: 'observed' })

const logger = new Logger()

const cookieKey = 'orbit-chat-username'
const loggedInKey = 'orbit-chat-logged-in'

export default class SessionStore {
  constructor(rootStore) {
    this.rootStore = rootStore

    this.login = this.login.bind(this)
    this.logout = this.logout.bind(this)
  }

  // Private instance variables
  @observable
  _user = null

  @observable
  _loggedIn = false

  // Public instance variable getters
  @computed
  get username() {
    if (!this._user || !this._user.username) return null
    return this._user.username
  }


  @computed
  get isAuthenticated() {
    return !!(this._user && this._user.username && this._loggedIn)
  }

  // Private instance actions

  // Async so the API is consistend if async is needed in the future
  @action.bound
  async _setUser(user, loggedIn) {
    if (user && !user.username) throw new Error('"user.username" is not defined')
    runInAction(() => {
      this._user = user
      if (loggedIn !== null) {
        this._loggedIn = loggedIn;
      }
    })
    this._cacheInfo(user, loggedIn)
  }

  // Private instance methods
  _readUserFromCache() {
    const username = cookies.getCookie(cookieKey)
    return username ? { username } : null
  }

  _readLoggedInFromCache() {
    const loggedIn = cookies.getCookie(loggedInKey)
    return loggedIn
  }

  _cacheInfo(user, loggedIn) {
    if (user) {
      cookies.setCookie(cookieKey, user.username, 1)
    } else {
      cookies.expireCookie(cookieKey)
    }

    if (loggedIn) {
      cookies.setCookie(loggedInKey, loggedIn, 1)
    } else {
      cookies.expireCookie(loggedInKey)
    }
  }

  _generateUser() {
    function capitalizeFirstLetter(string) {
      return string.charAt(0).toUpperCase() + string.slice(1);
    }

    const firstWord = capitalizeFirstLetter(randomWords()),
      secondWord = capitalizeFirstLetter(randomWords()),
      username = firstWord + secondWord;

    return { username };
  }

  // Public instance methods
  loadFromCache() {
    const cachedUser = this._readUserFromCache(),
      loggedIn = this._readLoggedInFromCache();

    if (cachedUser) {
      this._setUser(cachedUser, Boolean(loggedIn))
    } else {
      this._setUser(this._generateUser(), Boolean(loggedIn))
    }
  }

  deleteDatabases() {
    if (window.indexedDB.databases) {
      window.indexedDB.databases().then((r) => {
        for (var i = 0; i < r.length; i++) window.indexedDB.deleteDatabase(r[i].name);
      }).then(() => {
        window.location.reload();
      }).catch((err) => {
        console.log(err);
        window.location.reload();
      });
    } else {
      window.location.reload();
    }
  }

  login(user) {
    logger.info('User login')
    return this._setUser(this._user, true)
  }

  setUser(user) {
    logger.info('Set User')
    return this._setUser(this._user, false)
  }

  logout() {
    logger.info('User logout')
    return this._setUser(this._generateUser(), false)
  }
}
