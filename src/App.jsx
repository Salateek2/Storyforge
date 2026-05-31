import React, { useState, useRef, useCallback, useEffect } from 'react'
import { countWords, formatWordCount } from './utils/wordCount'
import { signIn, signUp, signOut, getUser, dbSelect, dbInsert, dbUpdate, dbDelete } from './lib/supabase'
import { continueWriting, summarizeChapter } from './lib/ai'

const STATUS_CYCLE = ['Draft', 'In Progress', 'Done']
const STATUS_COLOR = { Draft: '#9ca3af', 'In Progress': '#f59e0b', Done: '#22c55e' }

const NOVEL_STATUSES = [
  { key: 'Idea',       color: '#a78bfa' },
  { key: 'Outlining',  color: '#60a5fa' },
  { key: 'Drafting',   color: '#f59e0b' },
  { key: 'Revising',   color: '#fb923c' },
  { key: 'Finished',   color: '#22c55e' },
  { key: 'Published',  color: '#0ea5e9' },
  { key: 'Shelved',    color: '#6b7280' },
]
const NOVEL_STATUS_COLOR = NOVEL_STATUSES.reduce((m, s) => (m[s.key] = s.color, m), { Draft: '#9ca3af' })

const GENRES = [
  'Fantasy', 'Science Fiction', 'Mystery', 'Thriller', 'Horror',
  'Romance', 'Historical Fiction', 'Literary Fiction', 'Young Adult',
  'Middle Grade', "Children's", 'Memoir', 'Biography', 'Poetry',
  'Short Stories', 'Drama', 'Crime', 'Adventure', 'Dystopian',
  'Magical Realism', 'Contemporary', 'Nonfiction', 'Essay Collection',
]
const MAX_GENRES = 3

function parseGenres(g) {
  if (!g) return []
  return g.split(',').map(s => s.trim()).filter(Boolean)
}
function joinGenres(arr) { return arr.join(', ') }

const CHAPTER_META_FIELDS = [
  { key: 'summary',    label: 'Summary',              type: 'textarea',   rows: 4, placeholder: 'What happens in this chapter?' },
  { key: 'characters', label: 'Characters appearing', type: 'characters', rows: 2, placeholder: 'Who appears in this chapter?' },
  { key: 'pov',        label: 'POV',                  type: 'input',               placeholder: 'Whose perspective is the chapter told from?' },
  { key: 'todo',       label: 'TODO / notes',         type: 'textarea',   rows: 3, placeholder: 'Things to research, fact-check, or come back to' },
]
function getChapterMeta(chapterId) {
  if (!chapterId) return {}
  try { return JSON.parse(localStorage.getItem('sf_ch_meta_' + chapterId)) || {} }
  catch { return {} }
}
function setChapterMeta(chapterId, meta) {
  if (!chapterId) return
  localStorage.setItem('sf_ch_meta_' + chapterId, JSON.stringify(meta))
}
function deleteChapterMeta(chapterId) {
  if (!chapterId) return
  localStorage.removeItem('sf_ch_meta_' + chapterId)
}

const EXAMPLE_NOVELS = [
  {
    title: 'Ember & Steel',
    genre: 'Fantasy, Young Adult, Adventure',
    status: 'Drafting',
    pin: true,
    chapters: [
      { title: 'Chapter 1: The Forge', content: '<p>The hammer fell, and with each strike, sparks danced into the night air. Kira had always known the forge would be her inheritance — she had not known it would also be her prison.</p>' },
      { title: 'Chapter 2: A Strangers Coin', content: '' },
    ],
  },
  {
    title: 'The Lighthouse Keeper',
    genre: 'Mystery, Literary Fiction',
    status: 'Outlining',
    pin: false,
    chapters: [
      { title: 'Chapter 1: Tides', content: '<p>The light had not failed in forty-three years. On the morning of the forty-fourth, it did.</p>' },
    ],
  },
  {
    title: 'Letters to Tomorrow',
    genre: 'Memoir',
    status: 'Idea',
    pin: false,
    chapters: [
      { title: 'Prologue', content: '' },
    ],
  },
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
  { key: 'Arial, sans-serif',        label: 'Arial' },
  { key: 'Verdana, sans-serif',      label: 'Verdana' },
]
const SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 40]

function htmlToPlain(html) {
  const div = document.createElement('div')
  div.innerHTML = html
  return (div.innerText || div.textContent || '').trim()
}

function exportTxt(chapters, projectName, chapterId) {
  const list = chapterId ? chapters.filter(c => c.id === chapterId) : chapters
  const lines = [projectName, '='.repeat(projectName.length), '']
  for (const ch of list) {
    lines.push(ch.title, '-'.repeat(ch.title.length), '', htmlToPlain(ch.content), '', '')
  }
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })),
    download: (chapterId ? list[0]?.title : projectName) + '.txt',
  })
  a.click(); URL.revokeObjectURL(a.href)
}

function exportPdf(chapters, projectName, chapterId) {
  const list = chapterId ? chapters.filter(c => c.id === chapterId) : chapters
  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${projectName}</title>
<style>body{font-family:Georgia,serif;max-width:680px;margin:60px auto;font-size:13pt;line-height:1.85;color:#222}
h1{font-size:1.9rem;font-weight:normal;border-bottom:1px solid #ccc;padding-bottom:.5rem;margin-bottom:2rem}
h2{font-size:1.3rem;font-weight:normal;margin-top:3rem;color:#444}
blockquote{border-left:3px solid #ccc;padding-left:1rem;color:#666;font-style:italic;margin:1rem 0}
@media print{body{margin:0}}</style></head><body>
<h1>${projectName}</h1>
${list.map(ch => `<h2>${ch.title}</h2><div>${ch.content || ''}</div>`).join('')}
<script>window.onload=()=>{window.print();window.onafterprint=()=>window.close()}<\/script>
</body></html>`)
  win.document.close()
}

function searchChapters(chapters, query) {
  const q = query.toLowerCase()
  if (!q) return []
  const MAX_PER_CHAPTER = 10 // cap so common words don't flood the sidebar
  return chapters.reduce((acc, ch) => {
    const text = ch.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')
    const lower = text.toLowerCase()
    let searchFrom = 0
    let matchIdx = 0
    while (matchIdx < MAX_PER_CHAPTER) {
      const idx = lower.indexOf(q, searchFrom)
      if (idx === -1) break
      const start = Math.max(0, idx - 45)
      const end = Math.min(text.length, idx + q.length + 45)
      acc.push({
        id: ch.id, title: ch.title, matchIdx,
        pre: (start > 0 ? '…' : '') + text.slice(start, idx),
        match: text.slice(idx, idx + q.length),
        post: text.slice(idx + q.length, end) + (end < text.length ? '…' : ''),
      })
      // Advance past this match so the next indexOf finds the next one.
      searchFrom = idx + q.length
      matchIdx++
    }
    return acc
  }, [])
}

function estimateRT(wc) {
  if (wc <= 0) return '0 min read'
  const m = Math.ceil(wc / 200)
  return m === 1 ? '1 min read' : m + ' min read'
}

function AuthScreen({ onAuth, onGuest }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setMsg(''); setLoading(true)
    if (mode === 'signup') {
      const data = await signUp(email, password)
      if (data.error || data.msg) setMsg(data.error?.message || data.msg || 'Error signing up')
      else if (data.access_token) { onAuth(data.user) }
      else setMsg('Account created! Check your email to confirm, then sign in.')
    } else {
      const data = await signIn(email, password)
      if (!data.access_token) setMsg(data.error_description || 'Invalid email or password')
      else onAuth(data.user)
    }
    setLoading(false)
  }

  return (
    <div className="auth-screen">
      <p className="welcome__logo">StoryForge</p>
      <h1 className="auth-screen__title">{mode === 'login' ? 'Welcome back' : 'Create account'}</h1>
      <form className="auth-form" onSubmit={handleSubmit}>
        <input className="auth-input" type="email" placeholder="Email" value={email}
          onChange={e => setEmail(e.target.value)} required />
        <input className="auth-input" type="password" placeholder="Password" value={password}
          onChange={e => setPassword(e.target.value)} required />
        {msg && <p className="auth-msg">{msg}</p>}
        <button className="auth-submit" type="submit" disabled={loading}>
          {loading ? '…' : mode === 'login' ? 'Sign in' : 'Sign up'}
        </button>
      </form>
      <button className="auth-switch" onClick={() => { setMode(m => m === 'login' ? 'signup' : 'login'); setMsg('') }}>
        {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
      </button>
      <button className="guest-btn" onClick={onGuest}>Continue as Guest</button>
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

function StatusDot({ status, onCycle }) {
  return (
    <span
      title={status}
      onClick={e => { e.stopPropagation(); onCycle() }}
      style={{
        display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
        background: STATUS_COLOR[status] || '#9ca3af',
        flexShrink: 0, cursor: 'pointer', marginRight: 6,
      }}
    />
  )
}

function Sidebar({ tab, onTab, projectName, onRename, chapters, activeChapterId, onSelectChapter, onAddChapter, onCycleStatus, onDeleteChapter, onOpenChapterInfo, characters, activeCharId, onSelectChar, onAddChar, notes, activeNoteId, onSelectNote, onAddNote, onUpdateNote, onDeleteNote, mobileOpen, onMobileClose }) {
  const [renamingNoteId, setRenamingNoteId] = useState(null)
  const activeNote = notes.find(n => n.id === activeNoteId)
  const [searchQuery, setSearchQuery] = useState('')
  const showSearch = searchQuery.trim().length > 0
  const searchResults = showSearch ? searchChapters(chapters, searchQuery.trim()) : []

  return (
    <aside className={`sidebar ${mobileOpen ? 'sidebar--mobile-open' : ''}`}>
      <button className="mobile-drawer-close" onClick={onMobileClose} title="Close menu">×</button>
      <div className="sidebar__header">
        <p className="sidebar__brand">StoryForge</p>
        <ProjectName value={projectName} onChange={onRename} />
      </div>
      <div className="sidebar__search-wrap">
        <input
          className="sidebar__search-input"
          placeholder="Search chapters…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        {searchQuery && <button className="sidebar__search-clear" onClick={() => setSearchQuery('')}>×</button>}
      </div>
      {showSearch ? (
        <div className="item-list">
          {searchResults.length === 0
            ? <div className="search-empty">No results</div>
            : searchResults.map(r => (
              <div key={`${r.id}-${r.matchIdx}`} className="search-result" onClick={() => { onSelectChapter(r.id); setSearchQuery('') }}>
                <div className="search-result__title">{r.title}</div>
                <div className="search-result__snippet">
                  {r.pre}<mark className="search-mark">{r.match}</mark>{r.post}
                </div>
              </div>
            ))
          }
        </div>
      ) : <>
        <div className="sidebar__tabs">
          {['Chapters','Characters','Notes'].map(t => (
            <button key={t} className={`sidebar__tab ${tab === t ? 'active' : ''}`} onClick={() => onTab(t)}>{t}</button>
          ))}
        </div>
        {tab === 'Chapters' && <>
          <div className="item-list">
            {chapters.map((ch, i) => (
              <div key={ch.id} className={`item-entry ${activeChapterId === ch.id ? 'active' : ''}`} onClick={() => onSelectChapter(ch.id)}>
                <span className="item-entry__num">{i + 1}</span>
                <StatusDot status={ch.status || 'Draft'} onCycle={() => onCycleStatus(ch.id)} />
                <span className="item-entry__label">{ch.title}</span>
                <button className="item-entry__info" title="Chapter info — summary, POV, characters…"
                  onClick={e => { e.stopPropagation(); onOpenChapterInfo(ch.id) }}>!</button>
                <button className="item-entry__delete" title="Delete chapter"
                  onClick={e => { e.stopPropagation(); onDeleteChapter(ch.id) }}>×</button>
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
            <div className="note-tabs">
              {notes.map(n => (
                <div
                  key={n.id}
                  className={`note-tab ${activeNoteId === n.id ? 'active' : ''}`}
                  onClick={() => onSelectNote(n.id)}
                  onDoubleClick={() => setRenamingNoteId(n.id)}
                  title="Double-click to rename"
                >
                  {renamingNoteId === n.id ? (
                    <input
                      className="note-tab__rename"
                      autoFocus
                      defaultValue={n.title || ''}
                      onClick={e => e.stopPropagation()}
                      onBlur={e => { onUpdateNote(n.id, 'title', e.target.value.trim() || n.title); setRenamingNoteId(null) }}
                      onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') setRenamingNoteId(null) }}
                    />
                  ) : (
                    <span className="note-tab__label">{n.title || 'Untitled'}</span>
                  )}
                </div>
              ))}
              <button className="note-tab__add" onClick={onAddNote} title="New note">+</button>
            </div>
            {activeNote ? (
              <>
                <textarea
                  placeholder="Jot down plot ideas, world-building details, reminders..."
                  value={activeNote.content || ''}
                  onChange={e => onUpdateNote(activeNote.id, 'content', e.target.value)}
                />
                <button className="note-delete-btn" onClick={() => onDeleteNote(activeNote.id)}>Delete this note</button>
              </>
            ) : (
              <p className="notes-empty">No notes yet. Click + to create one.</p>
            )}
          </div>
        )}
      </>}
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
      <select
        className="toolbar__select toolbar__select--font"
        title="Font (applies to selected text)"
        defaultValue=""
        onChange={e => { const v = e.target.value; e.target.value = ''; if (v) onFormat('fontName', v) }}
      >
        <option value="" disabled>Font</option>
        {FONTS.map(f => (
          <option key={f.key} value={f.key} style={{fontFamily: f.key}}>{f.label}</option>
        ))}
      </select>
      <select
        className="toolbar__select toolbar__select--size"
        title="Font size (applies to selected text)"
        defaultValue=""
        onChange={e => { const v = e.target.value; e.target.value = ''; if (v) onFormat('fontSize', v) }}
      >
        <option value="" disabled>Size</option>
        {SIZES.map(s => (
          <option key={s} value={s}>{s}px</option>
        ))}
      </select>
      <div className="toolbar__sep"/>
      <button className="toolbar__btn" title="Heading" onClick={() => onFormat('heading')}>H</button>
      <button className="toolbar__btn" title="Quote" onClick={() => onFormat('quote')}>"</button>
    </div>
  )
}

function CharactersAutocompleteField({ value, onChange, placeholder, rows, characters }) {
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const taRef = useRef(null)

  const segments = (value || '').split(',')
  const currentSegment = segments[segments.length - 1] || ''
  const currentTrimmed = currentSegment.trim()
  const usedLower = new Set(
    segments.slice(0, -1).map(s => s.trim().toLowerCase()).filter(Boolean)
  )

  const suggestions = (characters || [])
    .filter(c => c.name && c.name.trim())
    .filter(c => !usedLower.has(c.name.toLowerCase()))
    .filter(c => currentTrimmed === '' || c.name.toLowerCase().includes(currentTrimmed.toLowerCase()))
    .filter(c => c.name.toLowerCase() !== currentTrimmed.toLowerCase())
    .slice(0, 6)

  const showDropdown = open && suggestions.length > 0

  function pick(name) {
    const before = segments.slice(0, -1).join(',')
    const sep = before.trim() ? ', ' : ''
    const next = (before.trim() ? before.replace(/\s*$/, '') : '') + sep + name + ', '
    onChange(next)
    setHighlight(0)
    setOpen(true)
    setTimeout(() => taRef.current?.focus(), 0)
  }

  function onKeyDown(e) {
    if (!showDropdown) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight(h => (h + 1) % suggestions.length) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight(h => (h - 1 + suggestions.length) % suggestions.length) }
    else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      pick(suggestions[highlight].name)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="ch-info-field__autocomplete-wrap">
      <textarea
        ref={taRef}
        className="ch-info-field__textarea"
        rows={rows || 2}
        placeholder={placeholder}
        value={value || ''}
        onChange={e => { onChange(e.target.value); setOpen(true); setHighlight(0) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={onKeyDown}
      />
      {showDropdown && (
        <div className="ch-info-field__autocomplete">
          {suggestions.map((c, i) => (
            <div
              key={c.id}
              className={`ch-info-field__autocomplete-item ${i === highlight ? 'active' : ''}`}
              onMouseDown={e => { e.preventDefault(); pick(c.name) }}
              onMouseEnter={() => setHighlight(i)}
            >
              {c.name}
            </div>
          ))}
        </div>
      )}
      {(characters || []).length > 0 && (
        <span className="ch-info-field__hint">Suggestions come from your Characters tab — type freely to add a new one.</span>
      )}
    </div>
  )
}

function ChapterInfoModal({ chapter, characters, onClose }) {
  const [meta, setMeta] = useState(() => getChapterMeta(chapter.id))
  const [summarizing, setSummarizing] = useState(false)
  const [summaryError, setSummaryError] = useState('')

  function save(next) {
    setMeta(next)
    setChapterMeta(chapter.id, next)
  }
  function update(key, value) { save({ ...meta, [key]: value }) }

  async function handleAutoSummarize() {
    if (!chapter.content || !chapter.content.trim()) {
      setSummaryError('Chapter has no content to summarize.')
      setTimeout(() => setSummaryError(''), 3000)
      return
    }
    setSummarizing(true)
    setSummaryError('')
    try {
      const summary = await summarizeChapter(chapter.content)
      update('summary', summary)
    } catch (err) {
      setSummaryError(err.message || 'AI request failed. Is the server running?')
      setTimeout(() => setSummaryError(''), 5000)
    }
    setSummarizing(false)
  }

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="ch-info-backdrop" onClick={onClose}>
      <div className="ch-info-modal" onClick={e => e.stopPropagation()}>
        <div className="ch-info-modal__head">
          <div>
            <span className="ch-info-modal__eyebrow">Chapter info</span>
            <h3 className="ch-info-modal__title">{chapter.title || 'Untitled chapter'}</h3>
          </div>
          <button className="ch-info-modal__close" onClick={onClose} title="Close (Esc)">×</button>
        </div>
        <div className="ch-info-modal__body">
          {CHAPTER_META_FIELDS.map(f => (
            <div key={f.key} className="ch-info-field">
              <div className="ch-info-field__label-row">
                <label className="ch-info-field__label">{f.label}</label>
                {f.key === 'summary' && (
                  <button
                    className={`ch-info-field__ai-btn${summarizing ? ' ai-loading' : ''}`}
                    onClick={handleAutoSummarize}
                    disabled={summarizing}
                    title="Auto-fill summary using AI"
                  >
                    {summarizing ? '…' : '✨ Auto-fill'}
                  </button>
                )}
              </div>
              {f.key === 'summary' && summaryError && (
                <div className="ai-error-bar ai-error-bar--inline">{summaryError}</div>
              )}
              {f.type === 'input' ? (
                <input
                  className="ch-info-field__input"
                  placeholder={f.placeholder}
                  value={meta[f.key] || ''}
                  onChange={e => update(f.key, e.target.value)}
                />
              ) : f.type === 'characters' ? (
                <CharactersAutocompleteField
                  value={meta[f.key] || ''}
                  onChange={v => update(f.key, v)}
                  placeholder={f.placeholder}
                  rows={f.rows}
                  characters={characters}
                />
              ) : (
                <textarea
                  className="ch-info-field__textarea"
                  rows={f.rows || 3}
                  placeholder={f.placeholder}
                  value={meta[f.key] || ''}
                  onChange={e => update(f.key, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>
        <div className="ch-info-modal__foot">
          <span className="ch-info-modal__hint">Saved automatically · stored on this device</span>
          <button className="ch-info-modal__done" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  )
}

function ExportMenu({ chapter, chapters, projectName }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])
  return (
    <div className="export-menu" ref={ref}>
      <button className="toolbar__btn export-btn" onClick={() => setOpen(o => !o)}>↓ Export</button>
      {open && (
        <div className="export-dropdown">
          <button onClick={() => { exportTxt(chapters, projectName, chapter.id); setOpen(false) }}>This chapter — .txt</button>
          <button onClick={() => { exportPdf(chapters, projectName, chapter.id); setOpen(false) }}>This chapter — PDF</button>
          <div className="export-dropdown__sep" />
          <button onClick={() => { exportTxt(chapters, projectName, null); setOpen(false) }}>All chapters — .txt</button>
          <button onClick={() => { exportPdf(chapters, projectName, null); setOpen(false) }}>All chapters — PDF</button>
        </div>
      )}
    </div>
  )
}

function ChapterEditor({ chapter, chapters, projectName, onUpdate, focusMode, onToggleFocus, totalWords, wordGoal, genre }) {
  const editorRef = useRef(null)
  const savedRangeRef = useRef(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const wordCount = countWords(chapter.content)
  const goalPct = wordGoal > 0 ? Math.min(100, Math.round((totalWords / wordGoal) * 100)) : 0

  useEffect(() => {
    const el = editorRef.current
    if (el && el.innerHTML !== chapter.content) {
      el.innerHTML = chapter.content || ''
    }
  }, [chapter.id])

  useEffect(() => {
    function onSelChange() {
      const sel = window.getSelection()
      if (!sel || !sel.rangeCount) return
      const range = sel.getRangeAt(0)
      if (editorRef.current && editorRef.current.contains(range.commonAncestorContainer)) {
        savedRangeRef.current = range.cloneRange()
      }
    }
    document.addEventListener('selectionchange', onSelChange)
    return () => document.removeEventListener('selectionchange', onSelChange)
  }, [])

  function handleInput() {
    onUpdate(chapter.id, 'content', editorRef.current.innerHTML)
  }

  function wrapSelection(prop, value) {
    const sel = window.getSelection()
    if (!sel || !sel.rangeCount) return
    const range = sel.getRangeAt(0)
    if (range.collapsed) return
    const span = document.createElement('span')
    span.style[prop] = value
    try {
      range.surroundContents(span)
    } catch (e) {
      span.appendChild(range.extractContents())
      range.insertNode(span)
    }
    const newRange = document.createRange()
    newRange.selectNodeContents(span)
    sel.removeAllRanges()
    sel.addRange(newRange)
    savedRangeRef.current = newRange.cloneRange()
  }

  function handleFormat(type, value) {
    const editor = editorRef.current
    if (!editor) return
    editor.focus()
    if (savedRangeRef.current) {
      const sel = window.getSelection()
      sel.removeAllRanges()
      sel.addRange(savedRangeRef.current)
    }
    if (type === 'bold') document.execCommand('bold', false)
    else if (type === 'italic') document.execCommand('italic', false)
    else if (type === 'underline') document.execCommand('underline', false)
    else if (type === 'heading') document.execCommand('formatBlock', false, 'h2')
    else if (type === 'quote') document.execCommand('formatBlock', false, 'blockquote')
    else if (type === 'fontName') wrapSelection('fontFamily', value)
    else if (type === 'fontSize') wrapSelection('fontSize', value + 'px')
    onUpdate(chapter.id, 'content', editor.innerHTML)
  }

  async function handleContinue() {
    if (!chapter.content.trim()) {
      setAiError('Write something first before asking AI to continue.')
      setTimeout(() => setAiError(''), 3000)
      return
    }
    setAiLoading(true)
    setAiError('')
    try {
      const continuation = await continueWriting(chapter.content, genre)
      // Append the continuation as new paragraphs
      const appended = chapter.content.trimEnd() + '\n' + continuation.split('\n').map(p => p.trim() ? `<p>${p}</p>` : '').join('')
      onUpdate(chapter.id, 'content', appended)
      if (editorRef.current) editorRef.current.innerHTML = appended
    } catch (err) {
      setAiError(err.message || 'AI request failed. Is the server running?')
      setTimeout(() => setAiError(''), 5000)
    }
    setAiLoading(false)
  }

  return (
    <div className="editor-area">
      <div className="editor-topbar">
        <span className="editor-topbar__title">{chapter.title}</span>
        <Toolbar onFormat={handleFormat} />
        <span className="editor-topbar__meta">{formatWordCount(wordCount)} · {estimateRT(wordCount)}</span>
        <button
          className={`toolbar__btn ai-continue-btn${aiLoading ? ' ai-loading' : ''}`}
          title="Ask AI to continue writing"
          onClick={handleContinue}
          disabled={aiLoading}
        >
          {aiLoading ? '…' : '✨ Continue'}
        </button>
        <ExportMenu chapter={chapter} chapters={chapters} projectName={projectName} />
        <button className={`focus-btn ${focusMode ? 'active' : ''}`} onClick={onToggleFocus} title={focusMode ? 'Exit focus mode' : 'Focus mode'}>
          {focusMode ? '⊠' : '⊞'}
        </button>
      </div>
      {aiError && <div className="ai-error-bar">{aiError}</div>}
      {wordGoal > 0 && (
        <div className="word-goal-bar">
          <div className="word-goal-bar__track">
            <div className="word-goal-bar__fill" style={{ width: goalPct + '%' }} />
          </div>
          <span className="word-goal-bar__label">
            {totalWords.toLocaleString()} / {wordGoal.toLocaleString()} words · {goalPct}%
          </span>
        </div>
      )}
      <div className="editor-scroll">
        <div className="editor-page">
          <input
            className="editor-page__chapter-title-input"
            value={chapter.title}
            placeholder="Chapter title..."
            onChange={e => onUpdate(chapter.id, 'title', e.target.value)}
          />
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            className="editor-content-div"
            onInput={handleInput}
            data-placeholder="Begin your story..."
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

function NovelCard({ novel, isActive, isPinned, onSelect, onDelete, onTogglePin, onUpdate }) {
  const [expanded, setExpanded] = useState(false)
  const genres = parseGenres(novel.genre).filter(g => GENRES.includes(g))
  const status = novel.status || 'Idea'
  const statusColor = NOVEL_STATUS_COLOR[status] || NOVEL_STATUS_COLOR.Idea

  function toggleGenre(g) {
    const has = genres.includes(g)
    let next
    if (has) next = genres.filter(x => x !== g)
    else if (genres.length >= MAX_GENRES) return
    else next = [...genres, g]
    onUpdate(novel.id, 'genre', joinGenres(next))
  }

  return (
    <div className={`novel-card ${isActive ? 'active' : ''} ${isPinned ? 'pinned' : ''}`} onClick={() => onSelect(novel.id)}>
      <div className="novel-card__header">
        <button
          className={`novel-card__pin ${isPinned ? 'pinned' : ''}`}
          title={isPinned ? 'Unpin (no longer the default)' : 'Pin as main novel (opens by default)'}
          onClick={e => { e.stopPropagation(); onTogglePin(novel.id) }}
        >{isPinned ? '★' : '☆'}</button>
        <div className="novel-card__title">{novel.title}</div>
        <button className="novel-card__delete" title="Delete novel"
          onClick={e => { e.stopPropagation(); onDelete(novel.id) }}>×</button>
      </div>
      <div className="novel-card__meta">
        {genres.length === 0 ? <span className="novel-card__meta--empty">No genre</span> : genres.join(' · ')}
      </div>
      <div className="novel-card__footer">
        <span className="novel-card__badge" style={{ background: statusColor + '22', color: statusColor, borderColor: statusColor + '66' }}>
          <span className="novel-card__badge-dot" style={{ background: statusColor }} />
          {status}
        </span>
        {isActive && (
          <button
            className={`novel-card__expand ${expanded ? 'open' : ''}`}
            title={expanded ? 'Close editor' : 'Edit status & genre'}
            onClick={e => { e.stopPropagation(); setExpanded(v => !v) }}
          >
            <span className="novel-card__expand-icon">✎</span>
            {expanded ? 'Close' : 'Click to edit'}
          </button>
        )}
      </div>

      {isActive && expanded && (
        <div className="novel-card__edit" onClick={e => e.stopPropagation()}>
          <div className="novel-edit-row">
            <span className="novel-edit-label">Status</span>
            <select
              className="novel-edit-select"
              value={NOVEL_STATUSES.some(s => s.key === status) ? status : 'Idea'}
              onChange={e => onUpdate(novel.id, 'status', e.target.value)}
            >
              {NOVEL_STATUSES.map(s => <option key={s.key} value={s.key}>{s.key}</option>)}
            </select>
          </div>
          <div className="novel-edit-row novel-edit-row--col">
            <span className="novel-edit-label">
              Genre <span className="novel-edit-hint">({genres.length}/{MAX_GENRES})</span>
            </span>
            <div className="genre-chips">
              {GENRES.map(g => {
                const on = genres.includes(g)
                const disabled = !on && genres.length >= MAX_GENRES
                return (
                  <button
                    key={g}
                    className={`genre-chip ${on ? 'on' : ''} ${disabled ? 'disabled' : ''}`}
                    disabled={disabled}
                    onClick={() => toggleGenre(g)}
                  >{g}</button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function RightPanel({ novels, activeNovelId, pinnedNovelId, onSelectNovel, onAddNovel, onDeleteNovel, onUpdateNovel, onTogglePin, theme, onTheme, wordGoal, onWordGoal, onSignOut, mobileOpen, onMobileClose }) {
  const [tab, setTab] = useState('Space')
  const [goalDraft, setGoalDraft] = useState(String(wordGoal || ''))
  const sortedNovels = pinnedNovelId
    ? [...novels].sort((a, b) => (a.id === pinnedNovelId ? -1 : b.id === pinnedNovelId ? 1 : 0))
    : novels
  return (
    <div className={`right-panel ${mobileOpen ? 'right-panel--mobile-open' : ''}`}>
      <button className="mobile-drawer-close" onClick={onMobileClose} title="Close panel">×</button>
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
          {sortedNovels.map(n => (
            <NovelCard
              key={n.id}
              novel={n}
              isActive={n.id === activeNovelId}
              isPinned={n.id === pinnedNovelId}
              onSelect={onSelectNovel}
              onDelete={onDeleteNovel}
              onTogglePin={onTogglePin}
              onUpdate={onUpdateNovel}
            />
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
            <span className="settings-label">Word goal</span>
            <div className="word-goal-input-row">
              <input
                type="number" min="0" placeholder="e.g. 80000"
                className="word-goal-input"
                value={goalDraft}
                onChange={e => setGoalDraft(e.target.value)}
                onBlur={() => onWordGoal(Math.max(0, parseInt(goalDraft) || 0))}
                onKeyDown={e => { if (e.key === 'Enter') { onWordGoal(Math.max(0, parseInt(goalDraft) || 0)); e.target.blur() } }}
              />
              <span className="word-goal-input-unit">words</span>
            </div>
            {wordGoal > 0 && <span className="settings-hint">Set to 0 to hide the bar</span>}
          </div>
          <div className="settings-section">
            <button className="signout-btn" onClick={onSignOut}>Sign out</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [dataLoading, setDataLoading] = useState(false)
  const [sidebarTab, setSidebarTab] = useState('Chapters')
  const [projectName, setProjectName] = useState('My Novel')
  const [chapters, setChapters] = useState([])
  const [activeChapterId, setActiveChapterId] = useState(null)
  const [characters, setCharacters] = useState([])
  const [activeCharId, setActiveCharId] = useState(null)
  const [notes, setNotes] = useState([])
  const [activeNoteId, setActiveNoteId] = useState(null)
  const [novels, setNovels] = useState([])
  const [activeNovelId, setActiveNovelId] = useState(null)
  const [theme, setTheme] = useState(() => localStorage.getItem('sf_theme') || 'light')
  const [wordGoal, setWordGoal] = useState(() => Number(localStorage.getItem('sf_wordGoal')) || 0)
  const [pinnedNovelId, setPinnedNovelId] = useState(() => localStorage.getItem('sf_pinned_novel') || null)
  const [chapterInfoOpenId, setChapterInfoOpenId] = useState(null)
  const [focusMode, setFocusMode] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [mobileRightOpen, setMobileRightOpen] = useState(false)
  const saveTimers = useRef({})
  const guestChaptersByNovel = useRef({})

  useEffect(() => { localStorage.setItem('sf_theme', theme) }, [theme])
  useEffect(() => { localStorage.setItem('sf_wordGoal', wordGoal) }, [wordGoal])
  useEffect(() => {
    if (pinnedNovelId) localStorage.setItem('sf_pinned_novel', pinnedNovelId)
    else localStorage.removeItem('sf_pinned_novel')
  }, [pinnedNovelId])
  useEffect(() => {
    const effective = user ? theme : 'light'
    document.documentElement.setAttribute('data-theme', effective === 'light' ? '' : effective)
  }, [theme, user])

  useEffect(() => {
    getUser().then(u => {
      setUser(u)
      setAuthLoading(false)
      if (u) loadNovels(u)
    })
  }, [])

  function enterGuest() {
    setUser({ isGuest: true })
    const seededNovels = EXAMPLE_NOVELS.map((ex, i) => ({
      id: `guest-novel-${i}`,
      title: ex.title,
      genre: ex.genre,
      status: ex.status,
    }))
    const seededChaptersByNovel = {}
    EXAMPLE_NOVELS.forEach((ex, i) => {
      const novelId = `guest-novel-${i}`
      seededChaptersByNovel[novelId] = ex.chapters.map((ch, j) => ({
        id: `guest-ch-${i}-${j}`,
        novel_id: novelId,
        title: ch.title,
        content: ch.content,
        status: 'Draft',
        position: j,
      }))
    })
    setNovels(seededNovels)
    guestChaptersByNovel.current = seededChaptersByNovel
    const pinIdx = EXAMPLE_NOVELS.findIndex(n => n.pin)
    const openIdx = pinIdx >= 0 ? pinIdx : 0
    const opener = seededNovels[openIdx]
    setPinnedNovelId(opener.id)
    setProjectName(opener.title)
    setActiveNovelId(opener.id)
    setChapters(seededChaptersByNovel[opener.id])
    setActiveChapterId(seededChaptersByNovel[opener.id][0]?.id || null)
    setCharacters([])
    setNotes([])
    setActiveNoteId(null)
  }

  async function loadNovels(currentUser) {
    setDataLoading(true)
    const { data } = await dbSelect('novels', 'order=created_at.asc')
    if (data && data.length > 0) {
      const pinned = pinnedNovelId && data.find(n => n.id === pinnedNovelId)
      const opener = pinned || data[0]
      setNovels(data)
      setProjectName(opener.title)
      setActiveNovelId(opener.id)
      await loadNovelData(opener.id)
    } else {
      const createdNovels = []
      const chaptersByNovel = {}
      for (const ex of EXAMPLE_NOVELS) {
        const { data: novelData } = await dbInsert('novels', {
          user_id: currentUser.id, title: ex.title, genre: ex.genre, status: ex.status,
        })
        const novel = Array.isArray(novelData) ? novelData[0] : novelData
        if (!novel) continue
        createdNovels.push({ ...novel, _pin: ex.pin })
        chaptersByNovel[novel.id] = []
        for (let j = 0; j < ex.chapters.length; j++) {
          const ch = ex.chapters[j]
          const { data: chData } = await dbInsert('chapters', {
            novel_id: novel.id, user_id: currentUser.id,
            title: ch.title, content: ch.content, status: 'Draft', position: j,
          })
          const chapter = Array.isArray(chData) ? chData[0] : chData
          if (chapter) chaptersByNovel[novel.id].push(chapter)
        }
      }
      if (createdNovels.length === 0) { setDataLoading(false); return }
      const pinned = createdNovels.find(n => n._pin) || createdNovels[0]
      setPinnedNovelId(pinned.id)
      const opener = pinned
      setNovels(createdNovels.map(({ _pin, ...n }) => n))
      setProjectName(opener.title)
      setActiveNovelId(opener.id)
      const openerChapters = chaptersByNovel[opener.id] || []
      setChapters(openerChapters)
      setActiveChapterId(openerChapters[0]?.id || null)
      setDataLoading(false)
    }
  }

  async function loadNovelData(novelId) {
    setDataLoading(true)
    const [chaptersRes, charsRes, notesRes] = await Promise.all([
      dbSelect('chapters', `novel_id=eq.${novelId}&order=position.asc`),
      dbSelect('characters', `novel_id=eq.${novelId}`),
      dbSelect('notes', `novel_id=eq.${novelId}`),
    ])
    setChapters(chaptersRes.data || [])
    setCharacters(charsRes.data || [])
    const noteRows = notesRes.data || []
    setNotes(noteRows)
    setActiveNoteId(noteRows[0]?.id || null)
    setActiveChapterId(chaptersRes.data?.[0]?.id || null)
    setActiveCharId(null)
    setDataLoading(false)
  }

  async function addChapter() {
    if (user.isGuest) {
      const ch = { id: 'ch-' + Date.now(), novel_id: activeNovelId, title: `Chapter ${chapters.length + 1}`, content: '', status: 'Draft', position: chapters.length }
      setChapters(p => [...p, ch]); setActiveChapterId(ch.id); setSidebarTab('Chapters')
      return
    }
    const { data } = await dbInsert('chapters', {
      novel_id: activeNovelId, user_id: user.id,
      title: `Chapter ${chapters.length + 1}`, content: '', status: 'Draft', position: chapters.length,
    })
    const ch = Array.isArray(data) ? data[0] : data
    if (ch) { setChapters(p => [...p, ch]); setActiveChapterId(ch.id); setSidebarTab('Chapters') }
  }

  function updateChapter(id, field, value) {
    setChapters(p => p.map(c => c.id === id ? { ...c, [field]: value } : c))
    if (user.isGuest) return
    const key = `ch_${id}_${field}`
    clearTimeout(saveTimers.current[key])
    saveTimers.current[key] = setTimeout(() => dbUpdate('chapters', `id=eq.${id}`, { [field]: value }), 1500)
  }

  function cycleStatus(id) {
    const ch = chapters.find(c => c.id === id)
    if (!ch) return
    const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(ch.status || 'Draft') + 1) % STATUS_CYCLE.length]
    setChapters(p => p.map(c => c.id === id ? { ...c, status: next } : c))
    if (!user.isGuest) dbUpdate('chapters', `id=eq.${id}`, { status: next })
  }

  function deleteChapter(id) {
    if (chapters.length === 1) return
    const remaining = chapters.filter(c => c.id !== id)
    setChapters(remaining)
    if (activeChapterId === id) setActiveChapterId(remaining[0]?.id || null)
    deleteChapterMeta(id)
    if (!user.isGuest) dbDelete('chapters', `id=eq.${id}`)
  }

  async function addChar() {
    if (user.isGuest) {
      const ch = { id: 'char-' + Date.now(), novel_id: activeNovelId, name: `Character ${characters.length + 1}`, description: '' }
      setCharacters(p => [...p, ch]); setActiveCharId(ch.id)
      return
    }
    const { data } = await dbInsert('characters', {
      novel_id: activeNovelId, user_id: user.id,
      name: `Character ${characters.length + 1}`, description: '',
    })
    const ch = Array.isArray(data) ? data[0] : data
    if (ch) { setCharacters(p => [...p, ch]); setActiveCharId(ch.id) }
  }

  function updateChar(id, field, value) {
    setCharacters(p => p.map(c => c.id === id ? { ...c, [field]: value } : c))
    if (user.isGuest) return
    const key = `char_${id}_${field}`
    clearTimeout(saveTimers.current[key])
    saveTimers.current[key] = setTimeout(() => dbUpdate('characters', `id=eq.${id}`, { [field]: value }), 1500)
  }

  async function addNote() {
    const title = `Note ${notes.length + 1}`
    if (user.isGuest) {
      const note = { id: 'note-' + Date.now(), novel_id: activeNovelId, title, content: '' }
      setNotes(p => [...p, note]); setActiveNoteId(note.id)
      return
    }
    const { data } = await dbInsert('notes', { novel_id: activeNovelId, user_id: user.id, title, content: '' })
    const note = Array.isArray(data) ? data[0] : data
    if (note) { setNotes(p => [...p, note]); setActiveNoteId(note.id) }
  }

  function updateNote(id, field, value) {
    setNotes(p => p.map(n => n.id === id ? { ...n, [field]: value } : n))
    if (user.isGuest) return
    const key = `note_${id}_${field}`
    clearTimeout(saveTimers.current[key])
    saveTimers.current[key] = setTimeout(() => dbUpdate('notes', `id=eq.${id}`, { [field]: value }), 1500)
  }

  function deleteNote(id) {
    const remaining = notes.filter(n => n.id !== id)
    setNotes(remaining)
    if (activeNoteId === id) setActiveNoteId(remaining[0]?.id || null)
    if (!user.isGuest) dbDelete('notes', `id=eq.${id}`)
  }

  async function deleteNovel(id) {
    if (novels.length === 1) return
    const remaining = novels.filter(n => n.id !== id)
    setNovels(remaining)
    if (pinnedNovelId === id) setPinnedNovelId(null)
    if (user?.isGuest) delete guestChaptersByNovel.current[id]
    if (!user.isGuest) dbDelete('novels', `id=eq.${id}`)
    if (activeNovelId === id) {
      const next = remaining[0]
      setActiveNovelId(next.id)
      setProjectName(next.title)
      if (!user.isGuest) await loadNovelData(next.id)
      else {
        const nextChapters = guestChaptersByNovel.current[next.id] || []
        setChapters(nextChapters)
        setActiveChapterId(nextChapters[0]?.id || null)
        setCharacters([])
        setNotes([])
        setActiveNoteId(null)
      }
    }
  }

  async function addNovel() {
    if (user.isGuest) {
      if (activeNovelId) guestChaptersByNovel.current[activeNovelId] = chapters
      const n = { id: 'novel-' + Date.now(), title: 'New Novel', genre: '', status: 'Idea' }
      guestChaptersByNovel.current[n.id] = []
      setNovels(p => [...p, n]); setActiveNovelId(n.id); setProjectName(n.title)
      setChapters([]); setCharacters([]); setNotes([]); setActiveNoteId(null)
      return
    }
    const { data } = await dbInsert('novels', { user_id: user.id, title: 'New Novel', genre: '', status: 'Idea' })
    const n = Array.isArray(data) ? data[0] : data
    if (n) {
      setNovels(p => [...p, n])
      setActiveNovelId(n.id)
      setProjectName(n.title)
      await loadNovelData(n.id)
    }
  }

  function updateNovelField(id, field, value) {
    setNovels(p => p.map(n => n.id === id ? { ...n, [field]: value } : n))
    if (user.isGuest) return
    const key = `novel_${id}_${field}`
    clearTimeout(saveTimers.current[key])
    saveTimers.current[key] = setTimeout(() => dbUpdate('novels', `id=eq.${id}`, { [field]: value }), 1000)
  }

  function togglePinnedNovel(id) {
    setPinnedNovelId(prev => prev === id ? null : id)
  }

  async function selectNovel(id) {
    if (id === activeNovelId) return
    const n = novels.find(n => n.id === id)
    if (user?.isGuest) {
      if (activeNovelId) guestChaptersByNovel.current[activeNovelId] = chapters
      const nextChapters = guestChaptersByNovel.current[id] || []
      setChapters(nextChapters)
      setActiveChapterId(nextChapters[0]?.id || null)
      setActiveNovelId(id)
      setProjectName(n?.title || 'Novel')
      return
    }
    setActiveNovelId(id)
    setProjectName(n?.title || 'Novel')
    await loadNovelData(id)
  }

  function renameProject(name) {
    setProjectName(name)
    setNovels(p => p.map(n => n.id === activeNovelId ? { ...n, title: name } : n))
    if (user.isGuest) return
    clearTimeout(saveTimers.current['rename'])
    saveTimers.current['rename'] = setTimeout(() => dbUpdate('novels', `id=eq.${activeNovelId}`, { title: name }), 1000)
  }

  function handleTab(t) {
    setSidebarTab(t)
    if (t === 'Characters' && !activeCharId && characters.length > 0) setActiveCharId(characters[0].id)
  }

  async function handleSignOut() {
    if (!user.isGuest) await signOut()
    setUser(null); setNovels([]); setChapters([]); setCharacters([]); setNotes([]); setActiveNoteId(null); setActiveNovelId(null)
  }

  const totalWords = chapters.reduce((sum, c) => sum + countWords(c.content), 0)
  const activeChapter = chapters.find(c => c.id === activeChapterId) || null
  const activeChar = characters.find(c => c.id === activeCharId) || null

  if (authLoading) return <div className="loading-screen">Loading…</div>
  if (!user) return <AuthScreen onAuth={u => { setUser(u); loadNovels(u) }} onGuest={enterGuest} />
  if (dataLoading) return <div className="loading-screen">Loading your novel…</div>

  const chapterInfoChapter = chapters.find(c => c.id === chapterInfoOpenId) || null
  const closeMobileDrawers = () => { setMobileSidebarOpen(false); setMobileRightOpen(false) }

  return (
    <div className={`app${focusMode ? ' app--focus' : ''}`}>
      <button className="mobile-toggle mobile-toggle--left" onClick={() => setMobileSidebarOpen(true)} title="Open menu">≡</button>
      <button className="mobile-toggle mobile-toggle--right" onClick={() => setMobileRightOpen(true)} title="Open novels & settings">⋯</button>
      {(mobileSidebarOpen || mobileRightOpen) && (
        <div className="mobile-backdrop" onClick={closeMobileDrawers} />
      )}
      <Sidebar tab={sidebarTab} onTab={handleTab} projectName={projectName} onRename={renameProject}
        chapters={chapters} activeChapterId={activeChapterId}
        onSelectChapter={id => { setActiveChapterId(id); setSidebarTab('Chapters'); setMobileSidebarOpen(false) }}
        onAddChapter={addChapter} onCycleStatus={cycleStatus} onDeleteChapter={deleteChapter}
        onOpenChapterInfo={setChapterInfoOpenId}
        characters={characters} activeCharId={activeCharId}
        onSelectChar={id => { setActiveCharId(id); setMobileSidebarOpen(false) }} onAddChar={addChar}
        notes={notes} activeNoteId={activeNoteId} onSelectNote={setActiveNoteId}
        onAddNote={addNote} onUpdateNote={updateNote} onDeleteNote={deleteNote}
        mobileOpen={mobileSidebarOpen} onMobileClose={() => setMobileSidebarOpen(false)} />
      {sidebarTab === 'Characters' && activeChar
        ? <CharacterEditor character={activeChar} onUpdate={updateChar} />
        : sidebarTab === 'Chapters' && activeChapter
          ? <ChapterEditor chapter={activeChapter} chapters={chapters} projectName={projectName}
              onUpdate={updateChapter}
              focusMode={focusMode} onToggleFocus={() => setFocusMode(f => !f)}
              totalWords={totalWords} wordGoal={wordGoal}
              genre={novels.find(n => n.id === activeNovelId)?.genre} />
          : <div className="editor-area"><div className="editor-empty">Select an item from the sidebar</div></div>
      }
      <RightPanel novels={novels} activeNovelId={activeNovelId} pinnedNovelId={pinnedNovelId}
        onSelectNovel={id => { selectNovel(id); setMobileRightOpen(false) }} onAddNovel={addNovel} onDeleteNovel={deleteNovel}
        onUpdateNovel={updateNovelField} onTogglePin={togglePinnedNovel}
        theme={theme} onTheme={setTheme}
        wordGoal={wordGoal} onWordGoal={setWordGoal} onSignOut={handleSignOut}
        mobileOpen={mobileRightOpen} onMobileClose={() => setMobileRightOpen(false)} />
      {chapterInfoChapter && (
        <ChapterInfoModal chapter={chapterInfoChapter} characters={characters} onClose={() => setChapterInfoOpenId(null)} />
      )}
    </div>
  )
}
