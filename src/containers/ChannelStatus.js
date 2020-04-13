'use strict'

import React, { lazy, useContext } from 'react'
import PropTypes from 'prop-types'
import { useTranslation } from 'react-i18next'
import { useObserver } from 'mobx-react'
import RootContext from '../context/RootContext'

const RoomProfilePanel = lazy(() =>
  import( /* webpackChunkName: "RoomProfilePanel" */ './RoomProfilePanel')
)

function ChannelStatus({ channel, theme }) {
  const [t] = useTranslation()
  const { uiStore } = useContext(RootContext)

  function onMessageUserClick(evt, profile, identity) {
    evt.persist()
    evt.stopPropagation()
    uiStore.openRoomProfilePanel()
    setTimeout(() => {
      if (document.getElementById("ChannelRoomProfilePanelContainer")) {
        document.getElementById("ChannelRoomProfilePanelContainer").focus();
      }
    }, 25)
  }

  return useObserver(() => {
    const userCount = channel ? channel.userCount : 0
    return (
      <div className='ChannelStatus' onClick={onMessageUserClick}>
      <span style={{ ...theme }} className="ChannelStatusUsers" tabIndex="1">
        {userCount} {t('channel.status.users', { count: userCount })}
        </span>
         {(channel && channel.channelName)
        ? <RoomProfilePanel channel={channel} />
        : null
      }
        
      </div>
    )
  })
}

ChannelStatus.propTypes = {
  channel: PropTypes.object,
  theme: PropTypes.object.isRequired
}

export default ChannelStatus
