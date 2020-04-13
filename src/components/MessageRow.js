'use strict'

import React, { useContext } from 'react'
import PropTypes from 'prop-types'
import classNames from 'classnames'
import RootContext from '../context/RootContext'

import { MessageContent, MessageTimestamp, MessageUser, MessageUserAvatar } from './MessageParts'

import '../styles/MessageRow.scss'

function MessageRow ({
  message,
  colorifyUsernames,
  useLargeMessage,
  highlightWords,
  onMessageUserClick,
  ...messageContentProps
}) {

 const { sessionStore, uiStore } = useContext(RootContext)

  const isCommand = message.content && message.content.startsWith('/me ')

  const messageTimestamp = <MessageTimestamp message={message} />

  const messageUser = (
    <MessageUser
      message={message}
      colorify={colorifyUsernames}
      isCommand={isCommand}
      onClick={onMessageUserClick}
    />
  )

  const messageContent = (
    <MessageContent
      message={message}
      isCommand={isCommand}
      highlightWords={highlightWords}
      {...messageContentProps}
    />
  )

  const content = useLargeMessage ? (
    // Need to wrap elements and change their ordering
    <div className='content-wrapper'>
      <div className='Message__Details'>
        {messageUser}
        {messageTimestamp}
      </div>
      {messageContent}
    </div>
  ) : (
    <>
      {messageTimestamp}
      {messageUser}
      {messageContent}
    </>
  )
  let messageClassName = 'Message';

  if (window.orbitID == message.userIdentity.id) {
    messageClassName = `${messageClassName} YourOwnMessageContainer`
  }

  return (
    <div id={message.hash} className={classNames(messageClassName, { unread: message.unread })}>
      {useLargeMessage ? <MessageUserAvatar message={message} /> : null}
      {content}
    </div>
  )
}

MessageRow.propTypes = {
  message: PropTypes.object.isRequired,
  colorifyUsernames: PropTypes.bool,
  useLargeMessage: PropTypes.bool,
  highlightWords: PropTypes.array,
  onMessageUserClick: PropTypes.func,
  loadFile: PropTypes.func.isRequired,
  parentElement: PropTypes.instanceOf(Element),
  botMargin: PropTypes.number.isRequired
}

MessageRow.defaultProps = {
  colorifyUsernames: true,
  useLargeMessage: false,
  highlightWords: []
}

export default MessageRow
