'use strict'

import React, { useContext, useEffect } from 'react'
import { useLocation, useParams, Redirect } from 'react-router-dom'
import { hot } from 'react-hot-loader'
import { useObserver } from 'mobx-react'
import { useTranslation } from 'react-i18next'
import defaultSettingsOptions from '../config/ui.default.json'

import RootContext from '../context/RootContext'

import '../styles/ChannelHeader.scss'


const moderatorURL = defaultSettingsOptions.bootstrapNodes[0].split("/")[2];

function ChannelHeader() {
  const location = useLocation()
  const { channel } = useParams()
  const { networkStore, uiStore, sessionStore } = useContext(RootContext)
  const [next, setNext] = React.useState('')
  const [t] = useTranslation()


  function handleMenuButtonClick(e) {
    e.stopPropagation()
    uiStore.openControlPanel()
  }

  function changeToRandomRoom(e) {
    if (e) {
      e.preventDefault();
    }
    fetch(`https://${moderatorURL}/v0/channel/random/${channel}`)
      .then((response) => {
        return response.json();
      })
      .then((channelInfo) => {
        setNext(`/channel/${channelInfo.channelName}`);
        setNext('')

      }).catch((error) => {
        console.error(error);
      });
  }

  const overrideName = t(`viewNames.${location.pathname.slice(1)}`)

  return useObserver(() =>
    next === '' ? (

    <div className='Header'>
      <div
        className='open-controlpanel icon flaticon-lines18'
        onClick={handleMenuButtonClick}
        style={{ ...uiStore.theme }}
      >
        {networkStore.unreadEntriesCount > 0 ? (
          <span className='unreadMessages'>{networkStore.unreadEntriesCount}</span>
        ) : null}
      </div>
      <div className='headerUsernameContainer'>{sessionStore.username && channel ? `${sessionStore.username}` : null}</div>
      <div className='headerCurrentChannelContainer'>{channel ? `#${channel}` : overrideName}</div>
      {channel ? <div className='headerRandomRoomButton' onClick={changeToRandomRoom}>Random Room</div> : null}
    </div>

    ) : (
      <Redirect to={next} />
    )

  )
}

export default hot(module)(ChannelHeader)
