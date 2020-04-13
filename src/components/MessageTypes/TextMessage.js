'use strict'

import React from 'react'
import PropTypes from 'prop-types'

import textProcessor from '../textProcessor'
import EmbedLink from '../EmbedLink'

import '../../styles/TextMessage.scss'

// Blacklisted URL's for embedded links
const blacklistedURLs = ["reddit.com", "www.reddit.com", "old.reddit.com", "i.imgur.com"];

function TextMessage({ text, emojiSet, highlightWords, useEmojis, isCommand, parentElement, hash }) {
  text = isCommand ? text.substring(4, text.length) : text

  let tokenized = textProcessor.tokenize(text),
    embedLink,
    returnedElements;

  tokenized = textProcessor.ipfsfy(tokenized, { useAutolink: true })
  tokenized = textProcessor.autolink(tokenized)
  tokenized = textProcessor.channelfy(tokenized)
  tokenized = textProcessor.highlight(tokenized, { className: 'highlight', highlightWords })
  tokenized = useEmojis ? textProcessor.emojify(tokenized, { set: emojiSet }) : tokenized

  const content = textProcessor.render(tokenized);



  return <div className='TextMessage'>{content}</div>
}



TextMessage.propTypes = {
  text: PropTypes.string.isRequired,
  emojiSet: PropTypes.string.isRequired,
  highlightWords: PropTypes.array,
  useEmojis: PropTypes.bool,
  isCommand: PropTypes.bool,
  hash: PropTypes.string,
  parentElement: PropTypes.instanceOf(Element)
}

TextMessage.defaultProps = {
  highlightWords: [],
  useEmojis: true,
  isCommand: false
}

export default TextMessage
