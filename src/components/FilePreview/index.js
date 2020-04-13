'use strict'

import React, { useCallback, useState, useEffect, useRef } from 'react'
import PropTypes from 'prop-types'
import { useTranslation } from 'react-i18next'

import PreviewTextFile from './PreviewTextFile'

import CustomSuspense from '../Suspense'

import Logger from '../../utils/logger'

import { renderToString } from 'react-dom/server'

import { isAudio, isImage, isVideo } from '../../utils/file-helpers'

import FsLightbox from 'fslightbox-react';


const logger = new Logger()

async function loadPreviewContent(loadFunc, hash, name, mimeType, parentElement, botMargin) {
  const fileIsAudio = isAudio(name)
  const fileIsImage = isImage(name)
  const fileIsVideo = isVideo(name)
  let buffer, blob, url
  try {
    buffer = await loadFunc(hash)
    blob = new Blob([buffer], { type: mimeType })
    url = window.URL.createObjectURL(blob)
  } catch (err) {
    console.log(err);
    return;
  }

  let botVisible;
  if (parentElement) {
    botVisible = parentElement.scrollTop + parentElement.clientHeight >= parentElement.scrollHeight - botMargin
  } else {
    botVisible = false;
  }

  // // Determines whether scrollbar should stay at the bottom;
  const handleScrollHeight = ((event) => {
    // Do not scroll down if lightbox is active
    let lightboxContainer = document.getElementsByClassName("fslightbox-container")[0];

    if (!parentElement || !event.target || lightboxContainer) return
    if (botVisible) parentElement.scrollTop = parentElement.scrollHeight
  })

  if (fileIsAudio) {
    return (
      <audio src={url} controls id={hash} onLoad={handleScrollHeight.bind(this)} />
    )
  } else if (fileIsImage) {
    return (
      <img src={url}  id={hash} onLoad={handleScrollHeight.bind(this)} />
    )
  } else if (fileIsVideo) {
    return <video src={url} controls autoPlay id={hash}  onLoad={handleScrollHeight.bind(this)} />
  } else {
    return <PreviewTextFile blob={blob} id={hash} filename={name} onLoad={handleScrollHeight.bind(this)} />
  }
}

function FilePreview({ parentElement, botMargin, hash, loadFile, name, mimeType, onSizeUpdate, onFilePreviewLoaded }) {
  const [t] = useTranslation()
  const [previewContent, setPreviewContent] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(true)
  const [toggler, setToggler] = useState(false);
  const [HTMLContent, setHTMLContent] = useState(null)
  const isMounted = useRef() // track whether component is mounted

  function triggerLightbox(e) {
    setToggler(!toggler)
  }


  useEffect(
    () => {
      isMounted.current = true
      setPreviewLoading(true)

      loadPreviewContent(loadFile, hash, name, mimeType, parentElement, botMargin)
        .then(html => {

          if (isMounted.current) {
            setHTMLContent(html.props.src);
            setPreviewContent(html)
            setPreviewLoading(false)
          }
        })
        .catch(e => {
          logger.error(e)
          if (isMounted.current) {
            setPreviewLoading(false)
            _onSizeUpdate()
          }
        })

      return () => {
        // clean up, called when react dismounts this component
        isMounted.current = false
      }
    },
    [hash] // Only run effect if 'hash' changes
  )

  const loadingElement = () => {
    let el, botVisible;

    if (parentElement) {
      el = parentElement
      botVisible = (el.scrollTop + el.clientHeight) >= el.scrollHeight - botMargin
    }

    return (
      <span className='previewStatus smallText'>{t('channel.file.previewLoading')}</span>
    )


  }

  const errorElement = (
    <span className='previewStatus smallText'>{t('channel.file.unableToDisplay')}</span>
  )

  const previewElement = (
    <div className='FilePreview' >
      <span className='preview smallText' onClick={triggerLightbox}>{previewContent} </span>
      
      <FsLightbox toggler={ toggler } customSources={[ <div className='lightboxPreviewContent'> {previewContent} </div> ]} />

    </div>
  )

  return (
    <CustomSuspense
      fallback={loadingElement()}
      delay={250}
      loading={previewLoading}
    >
      {previewContent ? previewElement : errorElement}
    </CustomSuspense>
  )
}

FilePreview.propTypes = {
  parentElement: PropTypes.instanceOf(Element),
  botMargin: PropTypes.number.isRequired,
  hash: PropTypes.string.isRequired,
  loadFile: PropTypes.func.isRequired,
  name: PropTypes.string.isRequired,
  mimeType: PropTypes.string.isRequired,
  onSizeUpdate: PropTypes.func
}

export default FilePreview
