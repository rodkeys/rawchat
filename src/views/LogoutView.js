'use strict'

import React from 'react'
import { hot } from 'react-hot-loader'
import { Redirect } from 'react-router-dom'

import RootContext from '../context/RootContext'

function LogoutView () {
  const { sessionStore, networkStore } = React.useContext(RootContext)

  React.useEffect(() => {
  	networkStore.stop()
    sessionStore.logout()
    window.location.href = "/";
  }, [])

  return <Redirect to='/' />
}

export default hot(module)(LogoutView)
