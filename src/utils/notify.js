import debounce from 'lodash.debounce'

import orbitLogo from '../images/orbit_logo_v2_32x32.png'

export function askPermission() {
  if (Modernizr.notification) {
    Notification.requestPermission()
  }
}

const notify = (title, body, tag) => {
  const options = {
    body,
    tag,
    icon: orbitLogo
  }
  if (Modernizr.notification) {
    if ('Notification' in window && Notification.permission === 'granted') {
      // eslint-disable-next-line no-new
      new Notification(title, options)
    }
  }
}

export default debounce(notify, 2000)
