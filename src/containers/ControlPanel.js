'use strict'

import React from 'react'
import { hot, setConfig } from 'react-hot-loader'
import { Redirect, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useObserver } from 'mobx-react'
import classNames from 'classnames'

import RootContext from '../context/RootContext'

import JoinChannel from '../components/JoinChannel'
import Spinner from '../components/Spinner'

import ChannelLink from './ChannelLink'

import defaultUiSettings from '../config/ui.default.json'

import '../styles/ControlPanel.scss'

setConfig({
  pureSFC: true,
  pureRender: true
})

function ControlPanel () {
  const location = useLocation()
  const { networkStore, uiStore, sessionStore } = React.useContext(RootContext)
  const [t] = useTranslation()
  const [redirect, setRedirect] = React.useState('')
  const [isCloseable, setIsCloseable] = React.useState(false)

  const inputRef = React.useRef()

  const focusInput = React.useCallback(() => {
    // if (inputRef.current) inputRef.current.focus()
  }, [])

  const handleClosePanel = React.useCallback(
    force => {
      if (force || isCloseable) uiStore.closeControlPanel()
    },
    [isCloseable]
  )

  const handleChannelLinkClick = React.useCallback((e, channel) => {
    e.preventDefault()
    setRedirect(`/channel/${channel.channelName}`)
  }, [])

  const handleJoinChannel = React.useCallback(e => {
    let channelName = inputRef.current.value;
    channelName = channelName.trim().toLowerCase().slice(0, 25);
    channelName = channelName.split(" ").join("-");
    if (!inputRef.current) return
    setRedirect(`/channel/${channelName}`)
  }, [])

  const handleCloseChannel = React.useCallback(
    channelName => {
      networkStore.leaveChannel(channelName).then(() => {
        if (uiStore.currentChannelName === channelName) { 
          // If you are apart of another channel then join it
          if (networkStore.channelsAsArray.length > 0) {
            setRedirect(`/channel/${networkStore.channelsAsArray[0].channelName}`)
          } else {
          // If there are no other channels then join a default channel
          setRedirect(`/channel/${defaultUiSettings.defaultChannels[0]}`);
          }
        }
      })
    },
    [uiStore.currentChannelName]
  )

  React.useEffect(() => {
    setIsCloseable(location.pathname !== '/')
  }, [location])

  React.useLayoutEffect(() => {
    if (uiStore.isControlPanelOpen) focusInput()
  }, [focusInput, uiStore.isControlPanelOpen])

  React.useEffect(() => {
    if (redirect) {
      handleClosePanel(redirect !== '/')
      setRedirect('')
    }
  }, [handleClosePanel, redirect])

  function renderJoinChannelInput () {
    return networkStore.isOnline ? (
      <div className='joinChannelInput fadeInAnimation' style={{ animationDuration: '.5s' }}>
        <JoinChannel
          onSubmit={handleJoinChannel}
          theme={{ ...uiStore.theme }}
          inputRef={inputRef}
        />
      </div>
    ) : !networkStore.starting ? (
      <button
        className='startIpfsButton submitButton'
        style={{ ...uiStore.theme }}
        onClick={() => networkStore.start()}
      >
        {t('controlPanel.startJsIpfs')}
      </button>
    ) : (
      <div style={{ position: 'relative' }}>
        <Spinner />
      </div>
    )
  }

  function renderChannelsList () {
    return (
      <>
        <div
          className={classNames({
            panelHeader: networkStore.channelsAsArray.length > 0,
            hidden: networkStore.channelsAsArray.length === 0
          })}
        >
          {t('controlPanel.channels')}
        </div>

        <div className='openChannels fadeInAnimation' style={{ animationDuration: '.5s' }}>
          <div className='channelsList'>
            {networkStore.channelsAsArray.map(c => (
              <div
                className={classNames('row', {
                  active: uiStore.currentChannelName === c.channelName
                })}
                key={c.channelName}
                onClick={e => {
                    e.preventDefault()
                  if (e.target && e.target.className != 'closeChannelButton'){            
                  handleChannelLinkClick(e, c)}
                  }
                }
              >

                <ChannelLink
                  channel={c}
                  theme={{ ...uiStore.theme }}
                />
                <span
                  tabIndex="1"
                  className='closeChannelButton'
                  onClick={(e) => {
                      e.preventDefault()
                    handleCloseChannel(c.channelName)
                  }}
                >
                  {t('controlPanel.closeChannel')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </>
    )
  }

  function renderBottomRow () {
    return (
      <div className='bottomRow' tabIndex="1" onClick={() => setRedirect('/settings')}>
        <div
          className='settingsRow icon flaticon-gear94'
          style={{ ...uiStore.theme, marginLeft: "auto", marginRight: "auto", marginBottom: "7px" }}
          key='settingsIcon'
        ><span style={{marginLeft: "10px", letterSpacing: "2px"}}>Settings </span> 
        </div>

      </div>
    )
  }

  return useObserver(() =>
    uiStore.isControlPanelOpen && sessionStore.isAuthenticated ? (
      <>
        <div
          className={classNames('ControlPanel slideInAnimation', uiStore.sidePanelPosition, {
            'no-close': !isCloseable
          })}
        >
        <div className='controlPanelHeaderContainer'>

          <div
            className={classNames('header bounceInAnimation', uiStore.sidePanelPosition)}
            onClick={handleClosePanel}
          >
            <div className='logo'>Raw</div>
          </div>

          <div className='networkName fadeInAnimation' style={{ animationDuration: '1s' }}>
            {networkStore.networkName}
          </div>

          <div className='exploreRoomsButton' onClick={() => setRedirect('/explore')}>Explore Rooms</div>

          {renderJoinChannelInput()}
          </div>
          {renderChannelsList()}
          {renderBottomRow()}
        </div>
        <div
          className={classNames('darkener fadeInAnimation', { 'no-close': !isCloseable })}
          style={{ animationDuration: '1s' }}
          onClick={handleClosePanel}
        />
        {redirect ? <Redirect to={redirect} /> : null}
      </>
    ) : null
  )
}

export default hot(module)(ControlPanel)
