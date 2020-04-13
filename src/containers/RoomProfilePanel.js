'use strict'

import React, { useCallback, useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { useObserver } from 'mobx-react'
import PropTypes from 'prop-types'
import Countries from '../config/countries.json'

import RootContext from '../context/RootContext'
import getMousePosition from '../utils/mouse-position'

import '../styles/RoomProfilePanel.scss'

function RoomProfilePanel({ channel }) {
  const { networkStore, uiStore } = useContext(RootContext)
  const [t] = useTranslation()

  function onMessageUserClick(evt, profile, identity) {
    evt.persist()
    evt.stopPropagation()
    uiStore.openUserProfilePanel({ identity, profile }, getMousePosition(evt))
  }

  const handleClose = useCallback(
    e => {
      setTimeout(() => {
        const className = document.activeElement.className;
         if (className == "ChannelStatusUsers") {
           setTimeout(() => {uiStore.closeRoomProfilePanel(e) }, 100)  
         }  else if (className != "MessageUserProfilePanel") {
          uiStore.closeRoomProfilePanel(e)
        }
      }, 10)

    },
    [uiStore.closeRoomProfilePanel]
  )

  return useObserver(() =>
    uiStore.roomProfilePanelIsOpen ? (
      <div
        id="ChannelRoomProfilePanelContainer" 
        onBlur={handleClose}
        className="ChannelStatus ChannelRoomProfilePanelContainer" 
        tabIndex="1"
      >
      {returnListOfRoomUsers(channel.channelName, onMessageUserClick, networkStore)}
    </div>
    ) : null
  )
}


function returnListOfRoomUsers(channelName, onClick, networkStore) {
  if (!networkStore.channels[channelName] || !networkStore.channels[channelName].uniqueUsers) return null;

  let roomUsers = [],
    peers = networkStore.channels[channelName].uniqueUsers;
    
  for (let i = 0; i < peers.length; i++) {
    roomUsers.push(
      <div
        key={'RoomUser' + i}
        onClick={evt => {
        if (typeof onClick === 'function') onClick(evt, peers[i].userProfile, peers[i].userIdentity)
      }}
        className="ChannelRoomProfilePanelUser">
        {peers[i].userProfile.name}
        </div>
    )
  }
  return (
    <div>
      {roomUsers}
    </div>
  )
}



RoomProfilePanel.propTypes = {
  channel: PropTypes.object
}

export default RoomProfilePanel
