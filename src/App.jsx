import React, { useState, useRef, useCallback } from 'react'
import { countWords, formatWordCount } from './utils/wordCount'

const INITIAL_CHAPTERS = [{ id: 1, title: 'Chapter 1', content: '' }]
const INITIAL_CHARACTERS = [{ id: 1, name: 'Character 1', description: '' }]

/* ── Welcome ── */
function WelcomeScreen({ onStart }) {
  return (
    <div className="welcome">
      <p className="welcome__logo">StoryForge</p>
      <h1 className="welcome__title">Welcome to<br />StoryForge</h1>
      <p className="welcome__subtitle">A quiet place to write your story.</p>
      <button className="welcome__btn" onClick={onStart}>Start New Project</button>
    </div>
  )
}

/* ── Editable project name ── */
function ProjectName({ value, onChange }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef(null)

  function startEdit() { setDraft(value); setEditing(true); setTimeout(() => inputRef.current?.select(), 0) }
  function commit() { onChange(draft.trim() || 'My Novel'); setEditing(false) }
  function onKey(e) { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }

  if (editing) return (
    <input ref={inputRef} className="project-name-input" value={draft}
      onChange={e => setDraft(e.target.value)} onBlur={commit} onKeyDown={onKey} />
  )
  return <span className="project-name-display" onClick={startEdit} title="Click to rename">{value}</span>
}

/* ── Sidebar ── */
function Sidebar({ tab, onTab, projectName, onRename, chapters, activeChapterId, onSelectChapter, onAddChapter, characters, activeCharId, onSelectChar, onAddChar, notes, onNotes }) {
  return (
    <aside className="sidebar">
      <div className="sidebar__header">
        <p className="sidebar__brand">StoryForge</p>
        <ProjectName value={projectName} onChange={onRename} />
      </div>

      <div className="sidebar__tabs">
        {['Chapters','Characters','Notes'].map(t => (
          <button key={t} className={`sidebar__tab ${tab === t ? 'active' : ''}`} onClick={() => onTab(t)}>{t}</button>
        ))}
      </div>

      {tab === 'Chapters' && (
        <>
          <div className="item-list">
            {chapters.map((ch, i) => (
              <div key={ch.id} className={`item-entry ${activeChapterId === ch.id ? 'active' : ''}`} onClick={() => onSelectChapter(ch.id)}>
                <span className="item-entry__num">{i + 1}</span>
                <span>{ch.title}</span>
              </div>
            ))}
          </div>
          <button className="sidebar__add-btn" onClick={onAddChapter}>+ New Chapter</button>
        </>
      )}

      {tab === 'Characters' && (
        <>
          <div className="item-list">
            {characters.map((ch, i) => (
              <div key={ch.id} className={`item-entry ${activeCharId === ch.id ? 'active' : ''}`} onClick={() => onSelectChar(ch.id)}>
                <span className="item-entry__num">{i + 1}</span>
                <span>{ch.name}</span>
              </div>
            ))}
          </div>
          <button className="sidebar__add-btn" onClick={onAddChar}>+ New Character</button>
        </>
      )}

      {tab === 'Notes' && (
        <div className="notes-area">
          <span className="notes-label">Project notes</span>
          <textarea placeholder="Jot down plot ideas, world-building details, reminders..." value={notes} onChange={e => onNotes(e.target.value)} />
        </div>
      )}
    </aside>
  )
}

/* ── Formatting toolbar ── */
function Toolbar() {
  const exec = (cmd, val) => { document.execCommand(cmd, false, val); }
  return (
    <div className="toolbar">
      <button className="toolbar__btn" title="Bold" onMouseDown={e => { e.preventDefault(); exec('bold') }}><b>B</b></button>
      <button className="toolbar__btn" title="Italic" onMouseDown={e => { e.preventDefault(); exec('italic') }}><i>I</i></button>
      <button className="toolbar__btn" title="Underline" onMouseDown={e => { e.preventDefault(); exec('underline') }}><u>U</u></button>
      <div className="toolbar__sep" />
      <button className="toolbar__btn" title="Heading" onMouseDown={e => { e.preventDefault(); exec('formatBlock', 'h2') }}>H</button>
      <button className="toolbar__btn" title="Blockquote" onMouseDown={e => { e.preventDefault(); exec('formatBlock', 'blockquote') }}>"</button>
      <button className="toolbar__btn" title="Normal text" onMouseDown={e => { e.preventDefault(); exec('formatBlock', 'p') }}>¶</button>
      <div className="toolbar__sep" />
      <button className="toolbar__btn" title="Align left" onMouseDown={e => { e.preventDefault(); exec('justifyLeft') }}>≡</button>
      <button className="toolbar__btn" title="Align centre" onMouseDown={e => { e.preventDefault(); exec('justifyCenter') }}>≡</button>
    </div>
  )
}

/* ── Chapter editor ── */
function ChapterEditor({ chapter, onUpdate }) {
  const wordCount = countWords(chapter.content)
  const titleRef = useRef(null)
  const bodyRef = useRef(null)

  const onBodyInput = useCallback(() => {
    onUpdate(chapter.id, 'content', bodyRef.current?.innerHTML || '')
  }, [chapter.id, onUpdate])

  return (
    <div className="editor-area">
      <div className="editor-topbar">
        <span className="editor-topbar__title">{chapter.title}</span>
        <Toolbar />
        <span className="editor-topbar__meta">{formatWordCount(wordCount)}</span>
      </div>
      <div className="editor-scroll">
        <div className="editor-page">
          <div
            ref={titleRef}
            className="editor-page__chapter-title"
            contentEditable
            suppressContentEditableWarning
            data-placeholder="Chapter title..."
            onBlur={e => onUpdate(chapter.id, 'title', e.target.innerText.trim() || 'Untitled')}
          >
            {chapter.title}
          </div>
          <div
            ref={bodyRef}
            className="editor-content"
            contentEditable
            suppressContentEditableWarning
            onInput={onBodyInput}
            dangerouslySetInnerHTML={{ __html: chapter.content }}
          />
        </div>
      </div>
    </div>
  )
}

/* ── Character editor ── */
function CharacterEditor({ character, onUpdate }) {
  return (
    <div className="char-editor">
      <div className="char-editor__topbar">
        <span className="char-editor__title">Character Profile</span>
      </div>
      <div className="char-editor__scroll">
        <div className="char-editor__page">
          <input
            className="char-name-input"
            value={character.name}
            placeholder="Character name..."
            onChange={e => onUpdate(character.id, 'name', e.target.value)}
          />
          <textarea
            className="char-desc-area"
            placeholder="Describe this character — appearance, personality, backstory, motivations..."
            value={character.description}
            onChange={e => onUpdate(character.id, 'description', e.target.value)}
          />
        </div>
      </div>
    </div>
  )
}

/* ── Main App ── */
export default function App() {
  const [screen, setScreen] = useState('welcome')
  const [sidebarTab, setSidebarTab] = useState('Chapters')
  const [projectName, setProjectName] = useState('My Novel')
  const [chapters, setChapters] = useState(INITIAL_CHAPTERS)
  const [activeChapterId, setActiveChapterId] = useState(1)
  const [characters, setCharacters] = useState(INITIAL_CHARACTERS)
  const [activeCharId, setActiveCharId] = useState(null)
  const [notes, setNotes] = useState('')

  const activeChapter = chapters.find(c => c.id === activeChapterId) || null
  const activeChar = characters.find(c => c.id === activeCharId) || null

  function handleStart() { setActiveChapterId(1); setScreen('app') }

  function addChapter() {
    const id = Date.now()
    setChapters(p => [...p, { id, title: `Chapter ${p.length + 1}`, content: '' }])
    setActiveChapterId(id)
    setSidebarTab('Chapters')
  }

  function updateChapter(id, field, value) {
    setChapters(p => p.map(c => c.id === id ? { ...c, [field]: value } : c))
  }

  function addChar() {
    const id = Date.now()
    setCharacters(p => [...p, { id, name: `Character ${p.length + 1}`, description: '' }])
    setActiveCharId(id)
  }

  function updateChar(id, field, value) {
    setCharacters(p => p.map(c => c.id === id ? { ...c, [field]: value } : c))
  }

  function handleSelectChar(id) { setActiveCharId(id) }

  function handleTab(t) {
    setSidebarTab(t)
    if (t === 'Characters' && !activeCharId && characters.length > 0) setActiveCharId(characters[0].id)
  }

  if (screen === 'welcome') return <WelcomeScreen onStart={handleStart} />

  const showCharEditor = sidebarTab === 'Characters' && activeChar
  const showChapterEditor = sidebarTab === 'Chapters' && activeChapter

  return (
    <div className="app">
      <Sidebar
        tab={sidebarTab} onTab={handleTab}
        projectName={projectName} onRename={setProjectName}
        chapters={chapters} activeChapterId={activeChapterId}
        onSelectChapter={id => { setActiveChapterId(id); setSidebarTab('Chapters') }}
        onAddChapter={addChapter}
        characters={characters} activeCharId={activeCharId}
        onSelectChar={handleSelectChar} onAddChar={addChar}
        notes={notes} onNotes={setNotes}
      />
      {showCharEditor && <CharacterEditor character={activeChar} onUpdate={updateChar} />}
      {showChapterEditor && <ChapterEditor chapter={activeChapter} onUpdate={updateChapter} />}
      {!showCharEditor && !showChapterEditor && sidebarTab !== 'Notes' && (
        <div className="editor-area"><div className="editor-empty">Select an item from the sidebar</div></div>
      )}
      {sidebarTab === 'Notes' && (
        <div className="editor-area"><div className="editor-empty" style={{fontStyle:'normal', flexDirection:'column', gap:'0.5rem', color:'var(--beige-300)'}}>
          <span style={{fontSize:'1.1rem', fontStyle:'italic'}}>Project notes are in the sidebar panel</span>
        </div></div>
      )}
    </div>
  )
}
