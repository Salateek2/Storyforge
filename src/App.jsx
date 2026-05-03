import React, { useState } from 'react'
import ChapterList from './components/ChapterList.jsx'
import Editor from './components/Editor.jsx'

function App() {
  const [activeChapter, setActiveChapter] = useState(null)
  return (
    <div className="app">
      <header className="app-header"><h1>StoryForge</h1></header>
      <main className="app-body">
        <ChapterList onSelect={setActiveChapter} activeChapter={activeChapter} />
        <Editor chapter={activeChapter} />
      </main>
    </div>
  )
}
export default App
