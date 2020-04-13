'use strict'

import React from 'react'
import PropTypes from 'prop-types'

function FileUploadButton({ setFileList, theme, disabled }) {

  const fileInput = React.createRef()

  return (
    <div className='FileUploadButton'>
      <input
        type='file'
        id='file'
        multiple
        ref={fileInput}
        style={{ display: 'none' }}
        onChange={(event)=> { 
          setFileList(fileInput.current.files);
          fileInput.current.files = null;
        }}

      />
      <div className='icon flaticon-tool490' onClick={(event)=> {
        event.preventDefault();
        fileInput.current.click()
      }} />
    </div>
  )
}

FileUploadButton.propTypes = {
  setFileList: PropTypes.func.isRequired,
  theme: PropTypes.object.isRequired,
  disabled: PropTypes.bool
}

export default FileUploadButton
