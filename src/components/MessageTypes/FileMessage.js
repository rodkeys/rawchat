'use strict'

import React, { useCallback, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import { useTranslation } from 'react-i18next'

import FilePreview from '../FilePreview'

import { getHumanReadableSize, isAudio, isText, isImage, isVideo } from '../../utils/file-helpers'

import '../../styles/FileMessage.scss'

import { BigSpinner } from '../Spinner'

import FsLightbox from 'fslightbox-react';

function FileMessage({ messageHash, fileHash, meta, ...filePreviewProps }) {
  const { name, size, mimeType, previewFile } = meta
  const [HTMLContent, setHTMLContent] = useState(null)
  const [loadingContent, setLoadingContent] = useState(false)
  const [contentLoaded, setContentLoaded] = useState(false)


  let showPreview, setShowPreview;


  // On initialization check if file should be automatically opened
  if (shouldOpenInClient(name, size)) {
    [showPreview, setShowPreview] = useState(true)
  } else {
    [showPreview, setShowPreview] = useState(false)

  }


  const [t] = useTranslation()
  const element = useRef()



  function handleNameClick() {
    if (shouldOpenInClient(name, size) || isImage(name)) {
      setShowPreview(!showPreview)
    } else {
      // Start iframe loader
      openLinkInNewWindow(ipfsLink);
    }
  }

  // Return whether the file should be opened in the client or outside 
  function shouldOpenInClient(name, size) {
    if (!isImage(name) && !isText(name) && !isAudio(name) && !isVideo(name)) {
      return false;
    } else if (isImage(name) && (size > 1000000)) {
      // If image size is greater than 1mb then open in a new window
      return false;
    } else if (isAudio(name) && (size > 100000)) {
      // If audio size is greater than 100kb then open in a new tab
      return false;
    } else if (isVideo(name) && (size > 100000)) {
      // If video size is greater than 100kb then open in a new tab
      return false;
    } else if (isText(name) && (size > 10000000)) {
      // Do not display text files right now (too easy to spam chat messages)
      return false;
    } else {
      return true;
    }
  }

  async function openLinkInNewWindow(ipfsLink) {
    setLoadingContent(true)
    let buffer, blob, url
    try {

      buffer = await filePreviewProps.loadFile(fileHash)

      blob = new Blob([buffer], { type: mimeType })
      url = window.URL.createObjectURL(blob)
      setHTMLContent(url)

      // Remove iframe loader
      setLoadingContent(false)

      setContentLoaded(!contentLoaded)

    } catch (err) {
      console.log(err);
    }


    return;
  }
  const ipfsLink =
    (window.gatewayAddress ? 'http://' + window.gatewayAddress : 'https://ipfs.io/ipfs/') + fileHash


  return (
    <div ref={element} className='FileMessage'>
      <div>


         <span className='name' onClick={handleNameClick}>
                          {name}
                        </span>


        <span className='size'>{getHumanReadableSize(size)}</span>

        {showPreview && (
          <FilePreview
            hash={fileHash}
            name={name}
            mimeType={mimeType}
            previewFile={previewFile}
            {...filePreviewProps}
          />
        )}


          
          <FsLightbox toggler={ loadingContent } customSources={[ <div className='lightboxPreviewContent'> 
                    <BigSpinner />
                     </div> ]} />

          <FsLightbox toggler={ contentLoaded } customSources={[ <div className='lightboxPreviewContent'> 
                    <iframe 
                    marginwidth="20px"
                    marginheight="20px"
                    className='iframeCustomSource' 
                    src={HTMLContent}
                    frameBorder="0" 
                    allow="autoplay; fullscreen" 
                    allowFullScreen 
                    />
                     </div> ]} />
       
      </div> <
    /div>
  )
}

FileMessage.propTypes = {
  messageHash: PropTypes.string.isRequired,
  fileHash: PropTypes.string.isRequired,
  meta: PropTypes.shape({
    name: PropTypes.string.isRequired,
    size: PropTypes.number.isRequired,
    mimeType: PropTypes.string.isRequired
  }).isRequired
}

FileMessage.defaultProps = {}

export default FileMessage
