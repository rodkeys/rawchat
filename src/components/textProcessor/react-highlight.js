'use strict'

import React from 'react'

// Returns a React element or a string
function reactHighlight (word, options, wordIndex) {
  const { highlightWords, ...props } = options
  const match = ("@" + highlightWords[0].toLowerCase()) == word.toLowerCase()
  props.key = `${word}-${wordIndex}`

  return match ? React.createElement('span', props, word) : word
}

export default reactHighlight
