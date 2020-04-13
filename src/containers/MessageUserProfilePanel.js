'use strict'

import React, { useCallback, useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { useObserver } from 'mobx-react'

import Countries from '../config/countries.json'

import RootContext from '../context/RootContext'
import { useLocation, useParams } from 'react-router-dom'

import BackgroundAnimation from '../components/BackgroundAnimation'

import '../styles/MessageUserProfilePanel.scss'
import earthImg from '../images/earth.png'

function MessageUserProfilePanel() {
  const { uiStore, settingsStore } = useContext(RootContext)
  const [t] = useTranslation()
  const location = useLocation()
  const { channel } = useParams()

  const handleClose = useCallback(
    e => {
      setTimeout(() => {
        if (document.getElementById("ChannelRoomProfilePanelContainer")) {
          document.getElementById("ChannelRoomProfilePanelContainer").focus();
        }
      }, 25)
      uiStore.closeUserProfilePanel(e)
    },
    [uiStore.closeUserProfilePanel]
  )


  return useObserver(() =>
    uiStore.userProfilePanelIsOpen ? (
      <div
        tabIndex="1"
        id={uiStore.userProfilePanelUser.identity.publicKey}
        className='MessageUserProfilePanel'
        style={calculatePanelStyle(uiStore.userProfilePanelPosition, uiStore.windowDimensions)}
        onBlur={handleClose}
      >

        <span className='close' onClick={handleClose} children='X' />
        {renderUserCard(t, uiStore.userProfilePanelUser, location, channel, settingsStore)}
      </div>
    ) : null
  )
}

function calculatePanelStyle(panelPosition, windowDimensions) {
  const { x: left, y: top } = panelPosition
  const translateHorizontal = left > windowDimensions.width / 2 ? '-100%' : '0'
  const translateVertical = top > windowDimensions.height / 2 ? '-100%' : '0'
  return {
    left,
    top,
    transform: `translate(${translateHorizontal}, ${translateVertical})`
  }
}

function renderUserCard(t, user, location, channel, settingsStore) {
  let currentChannel = channel ? `#${channel}` : overrideName;
  currentChannel = currentChannel.slice(1);
  setTimeout(() => {
    if (user && user.identity && document.getElementById(user.identity.publicKey)) {
      document.getElementById(user.identity.publicKey).focus();
    }
  }, 25)
  const country = Countries[user.profile.location]


  function IDIsBlocked(identityID) {
    return (settingsStore._returnBlockedIdentityIDs.indexOf(identityID) > -1);
  }

  function handleBlock(e, identityID) {
    e.preventDefault();
    if (IDIsBlocked(identityID)) {
      settingsStore._removeBlockedIdentityID([identityID]);
    } else {
      settingsStore._addBlockedIdentityID([identityID]);
    }

  }

  return ( <
      >
      <
      div className = 'name' > { user.profile.name } < /div>   <
      div className = 'profileDataContainer' >
      <dt className='profileDataItem'>{ t('userProfile.identityId') }: < /dt> 
    <dd className='code profileDataItem'>{ user.identity.id } < /dd>   
    <div className="blockUserButton" onClick={(e) => {
      handleBlock(e, user.identity.id)
    }}>

    {IDIsBlocked(user.identity.id) ? 'Unblock' : 'Block'}
    </div>
    </div> <
    />
  )
}

MessageUserProfilePanel.propTypes = {}

export default MessageUserProfilePanel
