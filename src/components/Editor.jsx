import React from 'react'

function Editor({ chapter }) {
  if (!chapter) return <div className="editor editor--empty">Select a chapter to start writing.</div>
  return (
    <div className="editor">
      <h2>{chapter.title}</h2>
      <textarea className="editor__textarea" placeholder="Start writing..." rows={20} />
    </div>
  )
}
export default Editor
