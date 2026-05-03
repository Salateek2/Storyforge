import React, { useState, useRef, useCallback } from 'react'
import { countWords, formatWordCount } from './utils/wordCount'

const INITIAL_CHAPTERS = [{ id: 1, title: 'Chapter 1', content: '' }]
const INITIAL_CHARACTERS = [{ id: 1, name: 'Character 1', description: '' }]
const DEMO_NOVELS = [
  { id: 1, title: 'My Novel', genre: 'Fiction', chapters: 1, status: 'In Progress' },
  { id: 2, title: 'The Lost City', genre: 'Adventure', chapters: 5, status: 'Draft' },
  { id: 3, title: 'Echoes of Time', genre: 'Sci-Fi', chapters: 12, status: 'Completed' },
]
const THEMES = [
  { key: 'light', label: '☀ Beige' },
  { key: 'dark',  label: '☽ Dark' },
  { key: 'warm',  label: '🔥 Warm' },
  { key: 'slate', label: '◈ Slate' },
]
const FONTS = [
  { key: 'Georgia, serif',           label: 'Georgia' },
  { key: "'Times New Roman', serif", label: 'Times New Roman' },
  { key: 'Palatino, serif',          label: 'Palatino' },
  { key: "'Courier New', monospace", label: 'Courier New' },
]

function estimateRT(wc) {
  if (wc <= 0) return '0 min read'
  const m = Math.ceil(wc / 200)
  return m === 1 ? '1 min read' : m + ' min read'
}

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

function ProjectName({ value, onChange }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const ref = useRef(null)
  function startEdit() { setDraft(value); setEditing(true); setTimeout(() => ref.current?.select(), 0) }
  function commit() { onChange(draft.trim() || 'My Novel'); setEditing(false) }
  function onKey(e) { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }
  if (editing) return <input ref={ref} className="project-name-input" value={draft} onChange={e => setDraft(e.target.value)} onBlur={commit} onKeyDown={onKey} />
  return <span className="project-name-display" onClick={startEdit} title="Click to rename">{value}</span>
}

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
      {tab === 'Chapters' && <>
        <div className="item-list">
          {chapters.map((ch, i) => (
            <div key={ch.id} className={`item-entry ${activeChapterId === ch.id ? 'active' : ''}`} onClick={() => onSelectChapter(ch.id)}>
              <span className="item-entry__num">{i + 1}</span><span>{ch.title}</span>
            </div>
          ))}
        </div>
        <button className="sidebar__add-btn" onClick={onAddChapter}>+ New Chapter</button>
      </>}
      {tab === 'Characters' && <>
        <div className="item-list">
          {characters.map((ch, i) => (
            <div key={ch.id} className={`item-entry ${activeCharId === ch.id ? 'active' : ''}`} onClick={() => onSelectChar(ch.id)}>
              <span className="item-entry__num">{i + 1}</span><span>{ch.name}</span>
            </div>
          ))}
        </div>
        <button className="sidebar__add-btn" onClick={onAddChar}>+ New Character</button>
      </>}
      {tab === 'Notes' && (
        <div className="notes-area">
          <span className="notes-label">Project notes</span>
          <textarea placeholder="Jot down plot ideas, world-building details, reminders..." value={notes} onChange={e => onNotes(e.target.value)} />
        </div>
      )}
    </aside>
  )
}

function Toolbar({ onFormat }) {
  return (
    <div className="toolbar">
      <button className="toolbar__btn" title="Bold" onClick={() => onFormat('bold')}><b>B</b></button>
      <button className="toolbar__btn" title="Italic" onClick={() => onFormat('italic')}><i>I</i></button>
      <button className="toolbar__btn" title="Underline" onClick={() => onFormat('underline')}><u>U</u></button>
      <div className="toolbar__sep"/>
      <button className="toolbar__btn" title="Heading" onClick={() => onFormat('heading')}>H</button>
      <button className="toolbar__btn" title="Quote" onClick={() => onFormat('quote')}>"</button>
    </div>
  )
}

function ChapterEditor({ chapter, onUpdate, font, fontSize }) {
  const textareaRef = useRef(null)
  const wordCount = countWords(chapter.content)

  function handleFormat(type) {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const selected = chapter.content.slice(start, end)
    const before = chapter.content.slice(0, start)
    const after = chapter.content.slice(end)
    let replacement = selected
    if (type === 'bold') replacement = `**${selected}**`
    if (type === 'italic') replacement = `_${selected}_`
    if (type === 'underline') replacement = `__${selected}__`
    if (type === 'heading') replacement = `\n## ${selected}`
    if (type === 'quote') replacement = `\n> ${selected}`
    const newContent = before + replacement + after
    onUpdate(chapter.id, 'content', newContent)
    setTimeout(() => {
      ta.focus()
      ta.setSelectionRange(start + replacement.length, start + replacement.length)
    }, 0)
  }

  return (
    <div className="editor-area">
      <div className="editor-topbar">
        <span className="editor-topbar__title">{chapter.title}</span>
        <Toolbar onFormat={handleFormat} />
        <span className="editor-topbar__meta">{formatWordCount(wordCount)} · {estimateRT(wordCount)}</span>
      </div>
      <div className="editor-scroll">
        <div className="editor-page">
          <input
            className="editor-page__chapter-title-input"
            value={chapter.title}
            placeholder="Chapter title..."
            onChange={e => onUpdate(chapter.id, 'title', e.target.value)}
          />
          <textarea
            ref={textareaRef}
            className="editor-content-textarea"
            placeholder="Begin your story..."
            value={chapter.content}
            onChange={e => onUpdate(chapter.id, 'content', e.target.value)}
            style={{ fontFamily: font, fontSize: fontSize + 'px' }}
            dir="ltr"
            spellCheck={true}
          />
        </div>
      </div>
    </div>
  )
}

function CharacterEditor({ character, onUpdate }) {
  return (
    <div className="char-editor">
      <div className="char-editor__topbar"><span className="char-editor__title">Character Profile</span></div>
      <div className="char-editor__scroll">
        <div className="char-editor__page">
          <input className="char-name-input" value={character.name} placeholder="Character name..."
            onChange={e => onUpdate(character.id, 'name', e.target.value)} />
          <textarea className="char-desc-area"
            placeholder="Describe this character — appearance, personality, backstory, motivations..."
            value={character.description} onChange={e => onUpdate(character.id, 'description', e.target.value)}
            dir="ltr" />
        </div>
      </div>
    </div>
  )
}

function RightPanel({ novels, activeNovelId, onSelectNovel, onAddNovel, theme, onTheme, font, onFont, fontSize, onFontSize }) {
  const [tab, setTab] = useState('Space')
  return (
    <div className="right-panel">
      <div className="right-panel__tabs">
        {['Space','Settings'].map(t => (
          <button key={t} className={`right-panel__tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>
      {tab === 'Space' && <>
        <div style={{padding:'0.75rem 1.1rem 0.4rem',borderBottom:'1px solid var(--border)'}}>
          <span style={{fontSize:'0.7rem',letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--text-light)'}}>My Novels</span>
        </div>
        <div className="novels-list">
          {novels.map(n => (
            <div key={n.id} className={`novel-card ${n.id === activeNovelId ? 'active' : ''}`} onClick={() => onSelectNovel(n.id)}>
              <div className="novel-card__title">{n.title}</div>
              <div className="novel-card__meta">{n.genre} · {n.chapters} ch.</div>
              <span className="novel-card__badge">{n.status}</span>
            </div>
          ))}
        </div>
        <button className="novels-add-btn" onClick={onAddNovel}>+ New Novel</button>
      </>}
      {tab === 'Settings' && (
        <div className="settings-panel">
          <div className="settings-section">
            <span className="settings-label">Theme</span>
            <div className="theme-grid">
              {THEMES.map(t => (
                <button key={t.key} className={`theme-btn ${theme === t.key ? 'active' : ''}`} onClick={() => onTheme(t.key)}>{t.label}</button>
              ))}
            </div>
          </div>
          <div className="settings-section">
            <span className="settings-label">Editor font</span>
            {FONTS.map(f => (
              <button key={f.key} className={`font-btn ${font === f.key ? 'active' : ''}`}
                style={{fontFamily: f.key}} onClick={() => onFont(f.key)}>{f.label}</button>
            ))}
          </div>
          <div className="settings-section">
            <span className="settings-label">Font size — {fontSize}px</span>
            <div className="font-size-row">
              <span style={{fontSize:'0.75rem',color:'var(--text-light)'}}>A</span>
              <input type="range" min="13" max="22" value={fontSize} onChange={e => onFontSize(+e.target.value)} />
              <span style={{fontSize:'1.1rem',color:'var(--text-light)'}}>A</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function App() {
  const [screen, setScreen] = useState('welcome')
  const [sidebarTab, setSidebarTab] = useState('Chapters')
  const [projectName, setProjectName] = useState('My Novel')
  const [chapters, setChapters] = useState(INITIAL_CHAPTERS)
  const [activeChapterId, setActiveChapterId] = useState(1)
  const [characters, setCharacters] = useState(INITIAL_CHARACTERS)
  const [activeCharId, setActiveCharId] = useState(null)
  const [notes, setNotes] = useState('')
  const [novels, setNovels] = useState(DEMO_NOVELS)
  const [activeNovelId, setActiveNovelId] = useState(1)
  const [theme, setTheme] = useState('light')
  const [font, setFont] = useState('Georgia, serif')
  const [fontSize, setFontSize] = useState(16)

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme === 'light' ? '' : theme)
  }, [theme])

  const activeChapter = chapters.find(c => c.id === activeChapterId) || null
  const activeChar = characters.find(c => c.id === activeCharId) || null

  function handleStart() { setActiveChapterId(1); setScreen('app') }
  function addChapter() { const id = Date.now(); setChapters(p => [...p,{id,title:`Chapter ${p.length+1}`,content:''}]); setActiveChapterId(id); setSidebarTab('Chapters') }
  function updateChapter(id, field, value) { setChapters(p => p.map(c => c.id===id?{...c,[field]:value}:c)) }
  function addChar() { const id = Date.now(); setCharacters(p => [...p,{id,name:`Character ${p.length+1}`,description:''}]); setActiveCharId(id) }
  function updateChar(id, field, value) { setCharacters(p => p.map(c => c.id===id?{...c,[field]:value}:c)) }
  function handleTab(t) { setSidebarTab(t); if(t==='Characters'&&!activeCharId&&characters.length>0) setActiveCharId(characters[0].id) }
  function addNovel() { const id=Date.now(); setNovels(p=>[...p,{id,title:'New Novel',genre:'Fiction',chapters:0,status:'Draft'}]); setActiveNovelId(id) }

  if (screen === 'welcome') return <WelcomeScreen onStart={handleStart} />

  return (
    <div className="app">
      <Sidebar tab={sidebarTab} onTab={handleTab} projectName={projectName} onRename={setProjectName}
        chapters={chapters} activeChapterId={activeChapterId}
        onSelectChapter={id => { setActiveChapterId(id); setSidebarTab('Chapters') }}
        onAddChapter={addChapter} characters={characters} activeCharId={activeCharId}
        onSelectChar={setActiveCharId} onAddChar={addChar} notes={notes} onNotes={setNotes} />
      {sidebarTab === 'Characters' && activeChar
        ? <CharacterEditor character={activeChar} onUpdate={updateChar} />
        : sidebarTab === 'Chapters' && activeChapter
          ? <ChapterEditor chapter={activeChapter} onUpdate={updateChapter} font={font} fontSize={fontSize} />
          : <div className="editor-area"><div className="editor-empty">Select an item from the sidebar</div></div>
      }
      <RightPanel novels={novels} activeNovelId={activeNovelId} onSelectNovel={setActiveNovelId} onAddNovel={addNovel}
        theme={theme} onTheme={setTheme} font={font} onFont={setFont} fontSize={fontSize} onFontSize={setFontSize} />
    </div>
  )
}
