'use strict'

import { format } from 'date-fns'

import locales from '../locales'



export function getFormattedTimestamp (timestamp) {
  return format(new Date(timestamp), 'hh:mm a');
}


export function getFormattedDateString (date, localeKey = 'en') {
  return format(date, 'PPPP', { locale: locales[localeKey].dateLocale });
}
