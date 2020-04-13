'use strict'

import React, { lazy, useContext, useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { useTranslation } from 'react-i18next'

import RootContext from '../context/RootContext'

import { BigSpinner } from '../components/Spinner'

import '../styles/Channel.scss'

import DropZone from '../components/DropZone'

const ChannelControls = lazy(() =>
  import( /* webpackChunkName: "ChannelControls" */ './ChannelControls')
)
const ChannelMessages = lazy(() =>
  import( /* webpackChunkName: "ChannelMessages" */ './ChannelMessages')
)

const ChannelFileUploadMenu = lazy(() => import( 
  /* webpackChunkName: "LoginForm" */ '../components/ChannelFileUploadMenu')
)

// Do not lazy-load dropzone or else is causes glitches on initialization
// const DropZone = lazy(() => import(/* webpackChunkName: "DropZone" */ '../components/DropZone'))


let lastChannelSwitchTime = Date.now();


function Channel({ channelName }) {
  const [channel, setChannel] = useState(null)
  const [ fileList, setFileList ] = useState([])
  const [dragActive, setDragActive] = useState(false)
  const { networkStore, uiStore } = useContext(RootContext)
  
  // Set last time the channel changed
  const updateLastChannelSwitchTime = () => {
    lastChannelSwitchTime = Date.now();
    window.lastChannelSwitchTime = Date.now();
  }


  if (!channel || (channel.channelName != channelName)) {
    updateLastChannelSwitchTime();
  }



  const [t] = useTranslation()
  const mounted = React.useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  function handleChannelNameChange() {
    setChannel(null)

    uiStore.setTitle(`#${channelName} | Raw.chat`)
    uiStore.setCurrentChannelName(channelName)

    networkStore.joinChannel(channelName, []).then(channel => {
      if (mounted.current) setChannel(channel, [])
    })


    return () => {
      uiStore.setCurrentChannelName(null)
    }
  }

  useEffect(handleChannelNameChange, [channelName])

  const handleDropFiles = React.useCallback(
    event => {
      event.preventDefault()
      setDragActive(false)

      const files = []
      if (event.dataTransfer.items) {
        for (let i = 0; i < event.dataTransfer.items.length; i++) {
          const file = event.dataTransfer.items[i]
          file.kind === 'file' && files.push(file.getAsFile())
        }
      } else {
        for (let i = 0; i < event.dataTransfer.files.length; i++) {
          files.push(event.dataTransfer.files.item(i))
        }
      }


      setFileList(files)
    },
    [channel]
  )


  return (
    <div
      className='Channel'
      onDragOver={event => {
        event.preventDefault()
        !dragActive && setDragActive(true)
      }}
    >
      {dragActive && (
        <DropZone
          label={t('channel.file.dropzone.add', { channel: channelName })}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDropFiles}
        />
      )}


      <ChannelFileUploadMenu channel={channel} setFileList={setFileList} fileList={fileList} />

      <React.Suspense fallback={<BigSpinner />}>
        {channel ? <ChannelMessages 
          channel={channel} 
          updateLastChannelSwitchTime={updateLastChannelSwitchTime}
           /> : <BigSpinner />}
          
      </React.Suspense>

      <ChannelControls channel={channel} disabled={!channel} />
    </div>
  )
}

Channel.propTypes = {
  channelName: PropTypes.string.isRequired
}

export default Channel
