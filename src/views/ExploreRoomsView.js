'use strict'

import React, { lazy, Suspense } from 'react'
import PropTypes from 'prop-types'
import { hot } from 'react-hot-loader'
import { useLocation, Redirect } from 'react-router-dom'
import { useObserver } from 'mobx-react'
import * as randomWords from 'random-words'
import defaultSettingsOptions from '../config/ui.default.json'

import { useTranslation } from 'react-i18next'

import { version } from '../../package.json'

import Logger from '../utils/logger'

import RootContext from '../context/RootContext'

import { BigSpinner } from '../components/Spinner'

import '../styles/LoginView.scss'
import '../styles/ExploreRoomsView.scss'

const LoginForm = lazy(() => import( /* webpackChunkName: "LoginForm" */ '../components/LoginForm'))

const logger = new Logger()

const moderatorURL = defaultSettingsOptions.bootstrapNodes[0].split("/")[2];


function ExploreRoomsView() {

  const location = useLocation()
  const { uiStore, sessionStore, networkStore } = React.useContext(RootContext)
  const [t] = useTranslation()
  const [next, setNext] = React.useState('')
  const [defaultChannels, setDefaultChannels] = React.useState([])

  function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }
  const firstWord = capitalizeFirstLetter(randomWords()),
    secondWord = capitalizeFirstLetter(randomWords()),
    username = firstWord + secondWord;


  React.useEffect(() => {

  }, [])

  React.useEffect(() => {

    // Fixes explore login bug
    if (window.savedNext) {
      setNext(window.savedNext);
      window.savedNext = null;
    }

    function setSavedDefaultChannels() {
      let tempDefaultChannels = [];
      for (let i = 0; i < defaultSettingsOptions.defaultChannels.length; i++) {
        tempDefaultChannels.push([defaultSettingsOptions.defaultChannels[i],
          []
        ])
      }
      setDefaultChannels(tempDefaultChannels)
    };

    const { from } = location.state || { from: { pathname: '/' } }
    const splitPathName = from.pathname.split("/");


    uiStore.setTitle('Explore | Raw.chat')
    uiStore.closeControlPanel()

    fetch(`https://${moderatorURL}/v0/channels/default/100`)
      .then((response) => {
        return response.json();
      })
      .then((channels) => {
        setDefaultChannels(channels);
        for (let i = 0; i < channels.length; i++) {
          window.prefilledChannelPeers[channels[i][0]] = channels[i][1];
        }

      }).catch((error) => {
        console.error(error);
        setSavedDefaultChannels();
      });

    // Setup orbit/IPFS node immediately
    if (!sessionStore.isAuthenticated) {
      sessionStore.setUser({ username }).then(() => {}).catch(e => {
        logger.error(e)
      })
    }

  }, [location.state])



  const handleSubmit = React.useCallback((event, roomName) => {
    event.preventDefault()
    networkStore.defaultChannels[0] = roomName;
    if (!sessionStore.isAuthenticated) {

      sessionStore.login({ username }).then(() => {
        window.savedNext = `/channel/${roomName}`
      }).catch(e => {
        logger.error(e)
      });
    } else {
      setNext(`/channel/${roomName}`);
    }
  }, [])

  return useObserver(() =>
    next == '' ? (
      <div className='LoginView ExploreRoomsView'>
        <h1 className='loginHeaderAnimation'>
          <div>Explore Rooms</div> 
        </h1>

        <h2 className='exploreMainSubHeader loginHeaderAnimation loginMainSubHeader fadeInAnimation'> 
        Trending rooms show up below
        </h2>
          
         <div className="parentRoomContainer">

         {defaultChannels.length > 0 ? (defaultChannels.map((c, index) => (
          <SingleLoginRoom
            roomName={c[0]}
            peers={c[1]}
            username={username}
            capitalizeFirstLetter={capitalizeFirstLetter}
            key={c[0]}
            handleSubmit={handleSubmit}
          />
        ))) : <BigSpinner />}
           
          </div>
        
      </div>
    ) : (
      <Redirect to={next} />
    )
  )
}

function SingleLoginRoom({
  roomName,
  peers,
  username,
  handleSubmit,
  capitalizeFirstLetter
}) {
  const { uiStore, sessionStore, networkStore } = React.useContext(RootContext)

  return useObserver(() => {
    const userCount = (networkStore.channels[roomName] && networkStore.channels[roomName].userCount > 0) ? networkStore.channels[roomName].userCount : peers.length;
    return (
      <div className="embedly-card-hug roomContainer">
          <div className="roomTitleContainer">
          <h2 className="loginHeaderAnimation roomTitle">Room </h2>
        </div>

        <div className="loginHeaderAnimation roomNameContainer">{capitalizeFirstLetter(roomName)}</div>

        <div className="loginHeaderAnimation roomPopulationContainer">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-users">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          <span className="roomPopulation">{userCount}</span></div>
          <div className="loginHeaderAnimation roomJoinButton" onClick={(e) => {
           handleSubmit(e, roomName)
          }}>Join</div>
        </div>
    )
  })
}


SingleLoginRoom.propTypes = {
  roomName: PropTypes.string.isRequired,
  peers: PropTypes.array.isRequired,
  username: PropTypes.string.isRequired,
  handleSubmit: PropTypes.func.isRequired,
  capitalizeFirstLetter: PropTypes.func.isRequired
}


export default hot(module)(ExploreRoomsView)
