'use strict'

import React, { useContext } from 'react'
import { Emoji } from 'emoji-mart'
import RootContext from '../context/RootContext'

import 'emoji-mart/css/emoji-mart.css'

import fuse from 'fuse.js'
import '../styles/PeerPicker.scss'

function PeerPicker({ onChange, channelName, inputRefValue, maxPeers, ...rest }, ref) {
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const listRef = React.useRef()
  const { networkStore } = useContext(RootContext)

  let peers = [],
    peerNames = [];

  if (networkStore.channels[channelName]) {
    let messages = networkStore.channels[channelName].visibleEntries;

    for (let i = 0; i < messages.length; i++) {
      const peerName = messages[i].payload.value.meta.from.name;
      if (peerNames.indexOf(peerName) == -1) {
        peers.push({ peerID: messages[i].identity.id, userProfile: { name: peerName } })
        peerNames.push(peerName)
      }
    }

    const peerList = networkStore.channels[channelName].peers;

    for (let i = 0; i < peerList.length; i++) {
      const peerName = peerList[i].userProfile.name;
      if (peerNames.indexOf(peerName) == -1) {
        peers.push(peerList[i])
        peerNames.push(peerName)
      }
    }
  }

  const options = {

    keys: [{
      name: 'userProfile.name',
      weight: 0.5
    }]
  };

  const fuseSetup = new fuse(peers, options),
    searchTerm = inputRefValue.slice(inputRefValue.lastIndexOf("@")).split(" ")[0].slice(1),
    searchResults = fuseSetup.search(searchTerm)

  if (searchTerm && searchResults.length > 0) {
    peers = searchResults;
  } else if (searchTerm && searchResults.length == 0) {
    peers = [];
  }

  peers = peers.slice(0, maxPeers)

  const handleChange = React.useCallback(
    done => {
      try {
        const peer = peers[selectedIndex]
        return onChange(peer, done)
      } catch (e) {
        return onChange(null, done)
      }
    },
    [selectedIndex, peers, onChange]
  )

  const handleClick = React.useCallback(
    index => {
      setSelectedIndex(index)
      return onChange(peers[index], true)
    },
    [handleChange]
  )

  const handleKeyDown = React.useCallback(
    e => {
      if (selectedIndex > peers.length) setSelectedIndex(0)

      let handled = true
      switch (e.key) {
        case 'ArrowDown':
          setSelectedIndex(calculateUpDownIndex(true))
          break
        case 'ArrowUp':
          setSelectedIndex(calculateUpDownIndex(false))
          break
        case 'Tab':
          handleChange(true)
          break
        case 'Enter':
          handleChange(true)
          break
        default:
          handled = false
          break
      }

      if (handled) e.preventDefault()
    },
    [selectedIndex, peers.length, handleChange]
  )

  // Allow parent component to call 'handleKeyDown'
  React.useImperativeHandle(ref, () => ({ handleKeyDown }), [handleKeyDown])

  const calculateUpDownIndex = React.useCallback(
    down =>
    down ?
    (selectedIndex + 1) % peers.length :
    selectedIndex > 0 ?
    selectedIndex - 1 :
    peers.length - 1,
    [selectedIndex, peers.length]
  )



  return (
    <ul ref={listRef} className='PeerPickerContainer PeerPicker fadeUpAnimation' {...rest}>
      {peers.map((peer, idx) => {

        return peer ? (
          <li
            key={peer.peerID + idx}
            className={selectedIndex === idx ? 'selected SinglePeerPickerName' : 'SinglePeerPickerName'}
            onClick={() => handleClick(idx)}
          >

          {peer.userProfile.name}


          </li>
        ) : null
      })}
    </ul>
  )
}

export default React.forwardRef(PeerPicker)
