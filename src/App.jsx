import React, { useState, useRef, useEffect } from 'react'
import { countWords, formatWordCount } from './utils/wordCount'

const INITIAL_CHAPTERS = [
  { id: 1, title: 'Chapter 1', content: '' },
]

function WelcomeScreen({ onStart }) {
  return (
    <div className="welcome">
      <p className="welcome__logo">StoryForge</p>
      <h1 className="welcome__title">Welcome to<br />StoryForge</h1>
      <p className="welcome__subtitle">A quiet place to write your story.</p>
      <button className="welcome__btn" onClick={onStart}>
        Start New Project
      </button>
    </div>
  )
}

function Sidebar({ chapters, activeId, onSelect, onAdd }) {
  return (
    <aside className="sidebar">
      <div className="sidebar__header">
        <p className="sidebar__brand">StoryForge</p>
        <p className="sidebar__project">My Novel</p>
      </div>
      <p className="sidebar__section">Chapters</p>
      <div className="chapter-list">
        {chapters.map((ch, i) => (
          <div
            key={ch.id}
            className={`chapter-item ${activeId === ch.id ? 'active' : ''}`}
            onClick={() => onSelect(ch.id)}
          >
            <span className="chapter-item__num">{i + 1}</span>
            <span>{ch.title}</span>
          </div>
        ))}
      </div>
      <button className="sidebar__add-btn" onClick={onAdd}>
        + New Chapter
      </button>
    </aside>
  )
}

function EditorArea({ chapter, onUpdate }) {
  const textareaRef = useRef(null)
  const wordCount = countWords(chapter?.content || '')

  useEffect(() => {
    if (textareaRef.current) textareaRef.current.focus()
  }, [chapter?.id])

  if (!chapter) {
    return (
      <div className="editor-area">
        <div className="editor-empty">
          <span>Select a chapter to begin writing</span>
        </div>
      </div>
    )
  }

  return (
    <div className="editor-area">
      <div className="editor-topbar">
        <span className="editor-topbar__title">{chapter.title}</span>
        <span className="editor-topbar__meta">{formatWordCount(wordCount)}</span>
      </div>
      <div className="editor-scroll">
        <div className="editor-page">
          <div
            className="editor-page__chapter-title"
            contentEditable
            suppressContentEditableWarning
            onBlur={e => onUpdate(chapter.id, 'title', e.target.innerText.trim() || 'Untitled')}
          >
            {chapter.title}
          </div>
          <textarea
            ref={textareaRef}
            className="editor-page__body"
            placeholder="Begin your story..."
            value={chapter.content}
            onChange={e => onUpdate(chapter.id, 'content', e.target.value)}
          />
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [screen, setScreen] = useState('welcome')
  const [chapters, setChapters] = useState(INITIAL_CHAPTERS)
  const [activeId, setActiveId] = useState(null)

  const activeChapter = chapters.find(c => c.id === activeId) || null

  function handleStart() {
    setActiveId(1)
    setScreen('app')
  }

  function handleAdd() {
    const newId = Date.now()
    const newChapter = { id: newId, title: `Chapter ${chapters.length + 1}`, content: '' }
    setChapters(prev => [...prev, newChapter])
    setActiveId(newId)
  }

  function handleUpdate(id, field, value) {
    setChapters(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c))
  }

  if (screen === 'welcome') return <WelcomeScreen onStart={handleStart} />

  return (
    <div className="app">
      <Sidebar
        chapters={chapters}
        activeId={activeId}
        onSelect={setActiveId}
        onAdd={handleAdd}
      />
      <EditorArea chapter={activeChapter} onUpdate={handleUpdate} />
    </div>
  )
}
