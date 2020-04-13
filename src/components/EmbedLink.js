'use strict'

import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import PropTypes from 'prop-types'
import makeAsyncScriptLoader from "react-async-script";
import { getFileExtension } from '../utils/file-helpers'

import PQueue from 'p-queue'

const embedlyQueue = new PQueue({ concurrency: 1 });
// Keep a running total of renderedID's for the embedlyQueue
let renderedIDList = [],
  // Keep track if chat screen is at bottom before ID is loaded 
  bottomIDs = {};

embedly('on', 'card.rendered', (iframe) => {
  // Check that the channel hasn't been switched within the last 5 sec to prevent loading screwing up the scrollbar
  if ((Date.now() - window.lastChannelSwitchTime) > 5000) {
    document.getElementById(iframe.parentElement.parentElement.parentElement.id).children[0].style.display = "block";
    // iframe is the card iframe that we used to render the event.
    renderedIDList.push(iframe.parentElement.parentElement.parentElement.id.slice(0, -8));
  } 
});


// fileURL, onLoad, ...rest
function EmbedLink({ fileURL, hash, parentElement, channelName, messageTimestamp, determineBoundaries, forceScrollToBottom,  ...rest }) {
  const [atBottom, setAtBottom] = useState(true);

  useEffect(() => {
    async function addEmbedlyURL() {
      return new Promise((resolve, reject) => {
        let hasResolved = false;
        let checkExist = setInterval(() => {
          if (renderedIDList.indexOf(hash) > -1) {
            hasResolved = true;

            // This is the height the iframe should be 
            const iframeHeight = document.getElementById(hash + "-embedly").children[0].children[0].children[0].height
            if (iframeHeight == document.getElementById(hash + "-embedly").offsetHeight) {
              clearInterval(checkExist);
              if (bottomIDs[hash]) {
                setTimeout(() => {
                  forceScrollToBottom();
                }, 250)
              }
              resolve();
            };
          };
        }, 100);

        setTimeout(() => {
          if (!hasResolved) {
            clearInterval(checkExist);
            resolve();
          };
        }, 5000);
      })
    }

    // If it's a temporary message then don't embed the URL
    // Also don't embed if message is older than 5 sec
    if ((hash.slice(0, 12) != "tempHashDate") && (Date.now() - messageTimestamp) < 5000) {
      embedlyQueue.add(async () => {
        if (determineBoundaries()) {
          bottomIDs[hash] = true;
        }
        // Check if at bottom here and if so then move to bottom on load 
        embedly('card', `.${hash}`);
        await addEmbedlyURL()
      }, { timeout: 5000 })
    }
  }, [fileURL])


  return (
    <div id={hash + "-embedly"}>
      <a className={hash} href={fileURL} data-card-width="300px" data-card-theme="dark" data-card-controls="0" data-card-align="left"></a>
    </div>
  )

}

EmbedLink.propTypes = {
  fileURL: PropTypes.string.isRequired,
  channelName: PropTypes.string.isRequired,
  parentElement: PropTypes.instanceOf(Element),
    determineBoundaries: PropTypes.func.isRequired,
  forceScrollToBottom: PropTypes.func.isRequired
  // onLoad: PropTypes.func.isRequired
}

export default EmbedLink
