'use strict'

import React from 'react'
import PropTypes from 'prop-types'
import classNames from 'classnames'
import Autolinker from 'autolinker'
import EmbedLink from '../EmbedLink'
import { FileMessage, TextMessage } from '../MessageTypes'
import MessageExternalLink from "../MessageExternalLink.js"

import { isAudio, isImage, isVideo } from '../../utils/file-helpers'

function MessageContent({ message, isCommand, loadFile, channelName, parentElement, ...rest }) {
  const [externalLink, setExternalLink] = React.useState('')
  const [embedLink, setEmbedLink] = React.useState('')

  function determineBoundaries() {
    if (!parentElement) return
    const el = parentElement
    const botVisible = el.scrollTop + el.clientHeight >= el.scrollHeight - 20
    return botVisible;
  }

  function forceScrollToBottom() {
    if (!parentElement) return
    parentElement.scrollTop = parentElement.scrollHeight
  }


  React.useEffect(() => {
    const autolinker = new Autolinker(),
      urlList = autolinker.parse(message.content)

    let externalUrl = '',
      embedLink = '';
    for (let i = 0; i < urlList.length; i++) {
      let mText;
      if (urlList[i].matchedText) {
        mText = urlList[i].matchedText.split("?")[0];
      };

      if (isAudio(mText) || isImage(mText) || isVideo(mText)) {
        externalUrl = mText;
        // Replace imgur gifv format with mp4
        if (externalUrl.slice(-4) == "gifv") {
          externalUrl = externalUrl.slice(0, -4) + "mp4";
        }

        // If there is no http/https link then insert // for the HTML image URL
        if (externalUrl.slice(0, 8) != "https://" && externalUrl.slice(0, 7) != "http://") {
          externalUrl = `//${externalUrl}`;
        };
      } else {
        embedLink = urlList[i].matchedText;
      }
    };

    setExternalLink(externalUrl);
    setEmbedLink(embedLink)

  }, [])

  let content;
  switch (message.meta.type) {
    case 'text':
      content = (
        <TextMessage key={message.hash} hash={message.hash} text={message.content} isCommand={isCommand} {...rest} />
      )
      break
    case 'tempText':

      // Transition text to background if it's not sent immediately 
      if (document.getElementById(message.hash)) {
        document.getElementById(message.hash).style.opacity = "0.5";
      };
      content = (
        <div className="tempMessage" id={message.hash}>
        <TextMessage key={message.hash} hash={message.hash} text={message.content}  isCommand={isCommand} {...rest} />
       </div>
      )
      break
      // case 'file':
      //   content = (
      //     <FileMessage
      //       key={message.hash}
      //       messageHash={message.hash}
      //       fileHash={message.content}
      //       meta={message.meta}
      //       loadFile={loadFile}
      //       {...rest}
      //     />
      //   )
      //   break
    case 'directory':
      break
    default:
      content = message.content
  }

  return (
    <div>
    <div
      className={classNames('Message__Content', {
        command: isCommand
      })}
    >
      <span className='fadeInAnimation'>{content}</span>
    </div>
      {externalLink ? ( 
         <MessageExternalLink 
         determineBoundaries={determineBoundaries}
         forceScrollToBottom={forceScrollToBottom}
         url={externalLink} 
         />
      ): null }
      {embedLink && !externalLink ? ( 
         <EmbedLink hash={message.hash} 
         messageTimestamp={message.meta.ts} 
         fileURL={embedLink} 
         parentElement={parentElement} 
         channelName={channelName}
         determineBoundaries={determineBoundaries}
         forceScrollToBottom={forceScrollToBottom}
         > </EmbedLink>
      ): null }
         
          </div>
  )
}

MessageContent.propTypes = {
  message: PropTypes.object.isRequired,
  isCommand: PropTypes.bool,
  channelName: PropTypes.string.isRequired,
  parentElement: PropTypes.instanceOf(Element),
  loadFile: PropTypes.func.isRequired
}

MessageContent.defaultProps = {
  isCommand: false
}

export default MessageContent
