'use strict'

import React from 'react'
import PropTypes from 'prop-types'
import rawchatLogo from '../images/logo.png'

import '../styles/Disclaimer.scss'

function Disclaimer ({ text }) {
  return (
    <div className='Disclaimer'>
      <div className='content'>
      <img className="disclaimerLogo" src={rawchatLogo} />
      <span>Raw</span>
      <span className='secondDisclaimerTitlePart'>.chat</span>
      </div>
    </div>
  )
}

Disclaimer.propTypes = {
  text: PropTypes.string.isRequired
}

export default Disclaimer
