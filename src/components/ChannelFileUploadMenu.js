'use strict'

import React, { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import '../styles/ChannelFileUploadMenu.scss'
import { getHumanReadableSize } from '../utils/file-helpers'
import defaultSettingsOptions from '../config/ui.default.json'

const moderatorURL = defaultSettingsOptions.bootstrapNodes[0].split("/")[2];

function ChannelFileUploadMenu({ channel, setFileList, fileList }) {

  if (!channel || (fileList.length == 0)) return null;

  useEffect(() => {
    const blackListedExtensions = ["exe", "dll", "com", "pif", "msi", "jar", "js", "bat"],
      fileExtension = fileList[0].name.split('.').pop();

    // Do not upload file if it's greater than 20mb 
    if (fileList[0].size > 20971520) {
      setFileList([])
      alert("Error: Cannot upload file, max file size is 20mb")
    } else if (blackListedExtensions.indexOf(fileExtension) > -1) {
      setFileList([])
      alert("Error: Cannot upload dangerous file type")
    }
  }, [])

  const fileMessageInputRef = React.useRef()
  const [fileState, setFileState] = useState({ uploadProgress: {}, uploading: true })
  const [fileUploadState, setFileUploadState] = useState({ state: "", percentage: 0 })


  function triggerLightbox(e) {
    setFileList([])
  }

  // Upload to moderator account here
  // Update loading bar 
  // On finish, submit channel message with everything completed
  function uploadFile() {
    const req = new XMLHttpRequest();

    setFileUploadState({
      state: "pending",
      percentage: 0
    });

    req.upload.addEventListener("progress", event => {
      if (event.lengthComputable) {
        setFileUploadState({
          state: "pending",
          percentage: (event.loaded / event.total) * 100
        });
      }
    });

    req.onreadystatechange = () => {
      // On file upload finished, send file message to the channel
      if (req.readyState == XMLHttpRequest.DONE) {
        const response = JSON.parse(req.responseText);
        if (req.status == 400) {
          setFileUploadState({ state: "error", percentage: 0, errorMessage: response.message });
        } else {
          channel.sendMessage(`${fileMessageInputRef.current.value} ${response.fileName}`)
          // Wait 500 ms for the loading animation to finish
          setTimeout(() => {
            setFileState({ uploadProgress: {}, uploading: true });
            setFileUploadState({ state: "", percentage: 0 });
            setFileList([])
          }, 500)
        }

      }
    }

    req.upload.addEventListener("load", event => {
      setFileUploadState({ state: "done", percentage: 100 });
    });

    req.upload.addEventListener("error", event => {
      setFileUploadState({ state: "error", percentage: 0, errorMessage: "Error: Could not upload " });
    });

    const formData = new FormData();
    formData.append("file", fileList[0], fileList[0].name);

    req.open("POST", `https://${moderatorURL}/v0/channel/${channel.channelName}/file/upload`);
    req.send(formData);

  }



  return fileList.length > 0 ? (
    <div className='fileUploadDialogBoxOverlayContainer'>

    <div className="fileUploadDialogBoxOverlayLightboxTrigger" onClick={triggerLightbox}> </div>
       <div className="fileUploadDialogBoxContainer">
        <div className="fileUploadHeader"> 
            <span className="fileUploadHeaderText">Upload a file </span>
            <span className="fileUploadHeaderExitIcon"> 
            <svg xmlns="http://www.w3.org/2000/svg" onClick={triggerLightbox} width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" 
            strokeLinecap="round" strokeLinejoin="round" className="feather feather-x"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
            </svg> 
            </span>
        </div>
        <div className="fileUploadInputTextContainer"> 
        <textarea 
        className="fileUploadInputTextarea" 
        disabled={fileUploadState.state}
        placeholder='Add a message about the file...' 
        ref={fileMessageInputRef}
        />
        </div>

        <div className="fileUploadFileNameContainer">
            <span className="fileUploadFileNameIcon"> 
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-file">
                    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                    <polyline points="13 2 13 9 20 9"></polyline>
                </svg>

             </span>
            <span className="fileUploadFileNameText"> {fileList[0].name} - {getHumanReadableSize(fileList[0].size)} </span>        
        </div>

        {fileUploadState.state == "error" ? (
          <div className='fileUploadErrorMessageContainer'> {fileUploadState.errorMessage} </div>
        ) : null 
        }

        {fileUploadState.state && fileUploadState.state != "error" ? (
            <div className='fileUploadBarContainer'>
                <div className='fileUploadBar' style={{ width: fileUploadState.percentage + "%" }}> </div>
            </div>
            ) : null
        }

        <div className="fileUploadButton" onClick={uploadFile}>
        Upload
        </div>
    </div>
    </div>
  ) : null
}

ChannelFileUploadMenu.propTypes = {
  channel: PropTypes.object
}

export default ChannelFileUploadMenu
