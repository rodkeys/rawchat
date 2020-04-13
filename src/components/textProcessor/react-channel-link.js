'use strict'

import React from 'react'
import { NavLink } from 'react-router-dom'


// Returns a React element or a string
function reactChannelLink (word, options, wordIndex) {


 return (word && word.slice(0, 1) == "#") ? (
 	<NavLink
      to={`/channel/${word.trim().toLowerCase().slice(1, 25)}`}
      key={word + String(Date.now())}
      >
 	{word}
 	</NavLink>
 	): word
}

export default reactChannelLink
