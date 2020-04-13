'use strict'

import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { useObserver } from 'mobx-react'

import '../styles/MessageExternalLink.scss'
import '../styles/FileMessage.scss'

import FsLightbox from 'fslightbox-react';
import { isAudio, isImage, isVideo } from '../utils/file-helpers'

// fileURL, onLoad, ...rest
function MessageExternalLink({ url, determineBoundaries, forceScrollToBottom }) {
  const [toggler, setToggler] = useState(false);
  const [linkUrlContent, setLinkUrlContent] = useState(null)


  function triggerLightbox(e) {
    // Check first if func is trying to be triggered when clicking on active lightbox element
    // Or if you click an svg icon, then do nothing too
    if (e.target.className == "MessageExternalLink" && e.target.parentElement.className != "") {
      return;
    } else if (e.target.tagName == "svg" || e.target.tagName == "path") {
      return;
    } else if (e.target.childNodes[0] && e.target.childNodes[0].tagName == "svg") {
      return;
    } else {
      setToggler(!toggler)
    }
  }

  async function loadUrlContent(fileUrl) {
    const fileIsAudio = isAudio(fileUrl)
    const fileIsImage = isImage(fileUrl)
    const fileIsVideo = isVideo(fileUrl)

    if (fileIsAudio) {
      return (
        <audio className='MessageExternalLink' src={fileUrl} controls loading="lazy" />
      )
    } else if (fileIsImage) {
      return (
        <img className='MessageExternalLink' src={fileUrl} loading="lazy"/>
      )
    } else if (fileIsVideo) {
      return <video className='MessageExternalLink' src={fileUrl} controls muted autoPlay loading="lazy"/>
    } else {
      return
    }
  }

  useEffect(
    () => {
      loadUrlContent(url)
        .then(html => {
          // If scrollbar is at bottom before image loads then set it at bottom after it is loaded
          if (determineBoundaries()) {
            setTimeout(() => {
              forceScrollToBottom();
            }, 50);
          }
          setLinkUrlContent(html);
        })
        .catch(e => {
          console.log(e);
        })
    }, [])

  return useObserver(() =>
    <div>
     <div className='MessageExternalLinkParentContainer'>
       <span onClick={triggerLightbox}>
         {linkUrlContent}
       </span>  
     </div>
     <div onClick={triggerLightbox}>
      <FsLightbox toggler={ toggler } customSources={[
        <div className='lightboxPreviewContent' tabIndex="1"> 
          {linkUrlContent} 
        </div>   
       ]} />
       </div>
    </div>

  )
}

MessageExternalLink.propTypes = {
  url: PropTypes.string.isRequired,
}

export default MessageExternalLink
