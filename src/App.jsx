import React, { useState, useRef, useCallback, useEffect } from 'react'
import { countWords, formatWordCount } from './utils/wordCount'
import { signIn, signUp, signOut, getUser, dbSelect, dbInsert, dbUpdate, dbDelete, dbUpsert } from './lib/supabase'
import { continueWriting, summarizeChapter, rephraseText, suggestNext, analyzeRelationships } from './lib/ai'

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

// Each key maps to a column on the `chapters` table so this info syncs to
// Supabase (it used to live only in localStorage on a single device).
const CHAPTER_META_FIELDS = [
  { key: 'summary',              label: 'Summary',              type: 'textarea',   rows: 4, placeholder: 'What happens in this chapter?' },
  { key: 'characters_appearing', label: 'Characters appearing', type: 'characters', rows: 2, placeholder: 'Who appears in this chapter?' },
  { key: 'pov',                  label: 'POV',                  type: 'input',               placeholder: 'Whose perspective is the chapter told from?' },
  { key: 'todo',                 label: 'TODO / notes',         type: 'textarea',   rows: 3, placeholder: 'Things to research, fact-check, or come back to' },
]

const EXAMPLE_NOVELS = [
  {
    title: 'Ember & Steel',
    genre: 'Fantasy, Young Adult, Adventure',
    status: 'Drafting',
    pin: true,
    chapters: [
      {
        title: 'Chapter 1: The Forge',
        content: `<p>The hammer fell, and with each strike, sparks danced into the night air. Kira had always known the forge would be her inheritance — she had not known it would also be her prison.</p><p>Her father slept in the back room now, more often than he worked. The cough had taken the strength from his arms first, then the steadiness from his hands, until one morning he had simply set the hammer in her palm and folded her fingers around it without a word. That had been three months ago. She had not put it down since.</p><p>Tonight the blade on the anvil was wrong. She could feel it the way she always could — a sour note under the iron, a place where the metal wanted to be something other than what the mould intended. Kira pressed her bare thumb to the glowing edge. It should have burned her. Instead the steel softened like wax, flowing to meet the shape in her mind, and the sour note went quiet.</p><p>She snatched her hand back as though stung. From the doorway, no one had seen. There was never anyone to see. That was the only mercy of it.</p>`,
        summary: `Kira works the forge alone at night while her father, Master Doran, lies ill in the back room. We learn she inherited the forge three months ago when his hands failed. Working a flawed blade, her hidden gift surfaces: she can soften and reshape living metal with a touch. She hides it, terrified of being seen.`,
        characters_appearing: 'Kira Vane, Master Doran Vane',
        pov: 'Kira Vane (first-person past)',
        todo: `Decide how openly Doran knows about her gift — does he suspect? Plant a small detail here that pays off in Ch.3 (the oath). Check period-accurate smithing terms.`,
      },
      {
        title: "Chapter 2: A Stranger's Coin",
        content: `<p>The stranger came at midday, when the forge was honest and ordinary and full of the smell of coal. He was travel-worn but not poor; his boots were good, and he watched her hands rather than her face.</p><p>"A blade," he said. "Single edge, long as your arm. I'm told the Vane forge is the only one worth the asking this side of the river."</p><p>Kira named a price meant to send him away. He set a coin on the anvil instead — old, heavier than it had any right to be, stamped with a sigil she did not know and yet, somehow, did. The sour note she heard in bad iron rang out of it like a struck bell. She had to stop herself from reaching for it.</p><p>"My name is Sael," the stranger said, and smiled as if they shared a secret. "I think you'll find you can make this blade better than most. I think you already know that."</p><p>Behind him, nailed fresh to the market post, a notice bore the magistrate's seal. Tomas had read it to her that morning, stumbling over the long words: an inquiry into the licensing of the Vane forge. Kira had pretended not to care. She curled her hand around Sael's coin and found that she did.</p>`,
        summary: `A stranger named Sael commissions a sword and pays with an ancient coin that "rings" with the same wrongness Kira hears in flawed metal. He hints he knows about her gift. Meanwhile, a notice from Magistrate Ferrow appears, opening an inquiry into the forge's license — the first move against the family.`,
        characters_appearing: 'Kira Vane, Sael, Tomas',
        pov: 'Kira Vane (first-person past)',
        todo: `Don't reveal Sael's true allegiance yet — keep it ambiguous whether he's an ally. Establish the coin's sigil so readers recognise it later. Mention Tomas briefly so his bigger Ch.4 role doesn't feel sudden.`,
      },
      {
        title: 'Chapter 3: The Oath in the Iron',
        content: `<p>Doran found her with the coin. He did not shout. That was how she knew it was serious.</p><p>"Your grandmother's grandmother built this forge around a promise," he said, lowering himself onto the cold edge of the slack-tub. "Not a contract. An oath, the old kind, the kind that's bound into the iron itself. We don't keep the fire lit to make horseshoes, Kira. We keep it lit so the thing underneath stays asleep."</p><p>She wanted to laugh. She did not, because his hands were shaking, and not from the cough.</p><p>"The coin you're holding belongs to the people who want it woken," he went on. "And the magistrate's inquiry isn't about a licence. Ferrow knows what we are. He always has. He's just found a lawful way to take the forge apart, brick by brick, until there's nothing left to hold the oath."</p><p>Kira looked at her own hands — the hands that made bad iron go quiet — and understood, for the first time, that the gift she had been hiding was not a flaw. It was the whole point of her.</p>`,
        summary: `Doran catches Kira with Sael's coin and finally tells the truth: the forge was built around an ancient oath binding "something underneath," and keeping the fire lit keeps it asleep. The coin belongs to those who want it woken, and Ferrow's inquiry is a lawful scheme to dismantle the forge and break the oath. Kira realises her gift is the family's purpose, not a defect.`,
        characters_appearing: 'Kira Vane, Master Doran Vane',
        pov: 'Master Doran Vane (shifts to his POV for the reveal)',
        todo: `This is the act-one turn — make sure the stakes land. Consider whether to show "the thing underneath" or keep it implied. Foreshadow that Sael and Ferrow may want the same thing for different reasons.`,
      },
    ],
    characters: [
      { name: 'Kira Vane', description: 'Eighteen-year-old blacksmith\'s daughter and the protagonist. Headstrong, fiercely loyal, and quietly afraid of the gift she hides: she can shape living metal with her hands. Inherited the forge after her father fell ill and resents being tied to it.' },
      { name: 'Master Doran Vane', description: 'Kira\'s father and mentor, a gruff master smith going grey at the temples. Taught Kira everything she knows but has kept one secret from her — the forge was built to contain an old oath, and the family is bound to keep it.' },
      { name: 'Sael', description: 'A charming, travel-worn stranger who pays for a blade with an ancient coin no one recognizes. Knows far more about Kira\'s gift than he admits. Recruits her toward a cause that may not be his own — ally and risk in equal measure.' },
      { name: 'Magistrate Ferrow', description: 'The cold, ambitious town magistrate who wants the Vane forge seized for the crown. The story\'s primary antagonist. Polished, patient, and willing to ruin the family slowly rather than openly.' },
      { name: 'Tomas', description: 'Kira\'s childhood friend and the forge\'s clumsy apprentice. Comic relief and steadfast heart — the one person Kira trusts without question. Secretly sweet on her.' },
    ],
  },
  {
    title: 'The Lighthouse Keeper',
    genre: 'Mystery, Literary Fiction',
    status: 'Outlining',
    pin: false,
    chapters: [
      {
        title: 'Chapter 1: Tides',
        content: `<p>The light had not failed in forty-three years. On the morning of the forty-fourth, it did.</p><p>Mara found the lamp cold when she climbed the tower at dawn — not broken, not burned out, simply extinguished, as though a hand had cupped the flame in the night and held it until it gave up. The mechanism was sound. The oil was full. By every rule of the trade she had spent six months learning, the light should have burned until she came to tend it.</p><p>She wrote the failure in the logbook, as she had been taught, and that was when she noticed the older hand beneath her own neat entries. The previous keeper's writing, forty-three years gone. His last line was dated the night he disappeared. It read, in a steady careful script: <em>The light goes out tonight. I am the one who lets it.</em></p>`,
        summary: `Mara, the new keeper, climbs the tower to find the lamp mysteriously extinguished despite being mechanically sound and full of oil. Recording the failure in the logbook, she discovers the previous keeper's final entry from 43 years ago — the night he vanished — claiming he himself would put the light out. The central mystery opens.`,
        characters_appearing: 'Mara Quint, Edwin Hale',
        pov: 'Mara Quint (third-person limited)',
        todo: `Keep the supernatural vs. rational explanation balanced — reader shouldn't be sure yet. Research lighthouse lamp mechanisms of the period. Decide the real reason the light failed (tie to Edwin's fate).`,
      },
    ],
    characters: [
      { name: 'Mara Quint', description: 'The new lighthouse keeper, a careful woman in her forties escaping a city life she won\'t discuss. Drawn into investigating why the light failed — and what happened to the keeper before her.' },
      { name: 'Edwin Hale', description: 'The previous keeper, who vanished without trace forty-three years ago. A presence felt through the logbooks and objects he left behind. The central mystery of the novel.' },
      { name: 'Constable Reed', description: 'The mainland constable, skeptical and territorial, who would rather the past stay buried. Alternately helps and obstructs Mara\'s questions.' },
    ],
  },
  {
    title: 'Letters to Tomorrow',
    genre: 'Memoir',
    status: 'Idea',
    pin: false,
    chapters: [
      {
        title: 'Prologue',
        content: `<p>I have been writing letters to a person who does not exist yet: myself, some years from now, old enough to forgive the parts I'm about to set down.</p><p>My grandmother kept everything — bus tickets, the foil from chocolate bars, the last word in every argument. When she died we found a drawer of letters she had never sent. This book is my drawer. I am sending them anyway.</p>`,
        summary: `Framing prologue. The narrator explains the book's conceit: a memoir written as letters to their future self. Introduces Grandmother Iris through the image of a drawer of unsent letters found after her death — the emotional seed of the whole project.`,
        characters_appearing: 'The Narrator, Grandmother Iris',
        pov: 'The Narrator (first-person, present-day reflective)',
        todo: `Set the tone — warm but unsentimental. Decide whether each chapter opens as an actual "letter." Confirm timeline details about Iris with family before publishing anything verifiable.`,
      },
    ],
    characters: [
      { name: 'The Narrator', description: 'The author\'s present-day self, writing letters back through time to make sense of a childhood spent between two houses and two languages.' },
      { name: 'Grandmother Iris', description: 'The fierce, funny matriarch at the memoir\'s heart, whose kitchen and stories anchored the narrator\'s summers.' },
    ],
  },
]
const THEMES = [
  { key: 'light', label: '◑ Midnight' },
  { key: 'dark',  label: '⬤ Obsidian' },
  { key: 'warm',  label: '🔥 Ember' },
  { key: 'slate', label: '☀ Daylight' },
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

// Usernames are mapped to a private internal email so we can use Supabase
// email auth without ever asking the user for a real email address.
function usernameToEmail(username) {
  const clean = username.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '')
  return `${clean}@storyforge.app`
}

function AuthScreen({ onAuth, onGuest }) {
  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    const uname = username.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '')
    if (uname.length < 3) { setMsg('Username must be at least 3 characters (letters, numbers, _ . -).'); return }
    if (password.length < 6) { setMsg('Password must be at least 6 characters.'); return }
    setMsg(''); setLoading(true)
    const email = usernameToEmail(uname)
    try {
      if (mode === 'signup') {
        const data = await signUp(email, password)
        if (data.error_code === 'user_already_exists' || data.msg?.includes('already registered')) {
          setMsg('That username is taken. Try another, or sign in.')
        } else if (data.error || data.msg) {
          setMsg(data.error?.message || data.msg || 'Could not create account.')
        } else if (data.access_token) {
          onAuth(data.user)                        // confirmation off → logged in instantly
        } else {
          // Account created but no session: confirmation is still on in Supabase.
          const signin = await signIn(email, password)
          if (signin.access_token) onAuth(signin.user)
          else setMsg('Account created, but logins are blocked by email confirmation. Turn off "Confirm email" in Supabase.')
        }
      } else {
        const data = await signIn(email, password)
        if (data.access_token) onAuth(data.user)
        else if (data.error_description?.toLowerCase().includes('not confirmed')) {
          setMsg('Email confirmation is still on in Supabase — turn it off so logins work.')
        } else setMsg('Wrong username or password.')
      }
    } catch (err) {
      setMsg('Could not reach the server. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-screen">
      <p className="welcome__logo">StoryForge</p>
      <h1 className="auth-screen__title">{mode === 'login' ? 'Welcome back' : 'Create account'}</h1>
      <form className="auth-form" onSubmit={handleSubmit}>
        <input className="auth-input" type="text" placeholder="Username" autoComplete="username"
          value={username} onChange={e => setUsername(e.target.value)} required />
        <input className="auth-input" type="password" placeholder="Password"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          value={password} onChange={e => setPassword(e.target.value)} required />
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

function ChapterInfoModal({ chapter, characters, onClose, onUpdate }) {
  const [summarizing, setSummarizing] = useState(false)
  const [summaryError, setSummaryError] = useState('')

  // Writes go straight to the chapter row (debounced auto-save in updateChapter).
  function update(key, value) { onUpdate(chapter.id, key, value) }

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
                  value={chapter[f.key] || ''}
                  onChange={e => update(f.key, e.target.value)}
                />
              ) : f.type === 'characters' ? (
                <CharactersAutocompleteField
                  value={chapter[f.key] || ''}
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
                  value={chapter[f.key] || ''}
                  onChange={e => update(f.key, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>
        <div className="ch-info-modal__foot">
          <span className="ch-info-modal__hint">Saved automatically · synced to your account</span>
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

const AI_ACTIONS = [
  { key: 'continue', label: '✨ Continue writing', hint: 'Adds 2–3 new paragraphs to the end of the chapter.' },
  { key: 'rephrase', label: '✦ Rephrase selection', hint: 'Select text in the chapter first, then rewrite it for flow & clarity.' },
  { key: 'suggest',  label: '➔ Suggest what happens next', hint: 'Get 3 ideas for where the story could go from here.' },
]

function AIAssistantPanel({ open, onClose, chapter, genre, getSelectedText, onAppend, onReplaceSelection }) {
  const [mode, setMode] = useState(null)        // which action is running / produced the result
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState('')
  const [sourceText, setSourceText] = useState('') // selection captured for rephrase

  // Reset transient state when the panel closes or the chapter changes.
  useEffect(() => {
    if (!open) { setMode(null); setResult(''); setError(''); setLoading(false); setSourceText('') }
  }, [open, chapter?.id])

  async function run(action) {
    setError('')
    setResult('')
    setMode(action)
    let selected = ''
    if (action === 'rephrase') {
      selected = (getSelectedText() || '').trim()
      if (!selected) {
        setError('Select some text in the chapter first, then click Rephrase.')
        setMode(null)
        return
      }
      setSourceText(selected)
    }
    setLoading(true)
    try {
      let out
      if (action === 'continue') out = await continueWriting(chapter.content, genre)
      else if (action === 'rephrase') out = await rephraseText(selected, genre)
      else out = await suggestNext(chapter.content, genre)
      setResult((out || '').trim())
    } catch (err) {
      setError(err.message || 'AI request failed. Is the server running?')
    }
    setLoading(false)
  }

  function applyContinue() {
    onAppend(result)
    setResult(''); setMode(null)
  }
  function applyRephrase() {
    const ok = onReplaceSelection(result)
    if (!ok) { setError('Could not find the original selection to replace. Re-select the text and try again.'); return }
    setResult(''); setMode(null); setSourceText('')
  }
  function copyResult() { navigator.clipboard?.writeText(result) }

  return (
    <div className={`ai-panel ${open ? 'ai-panel--open' : ''}`} aria-hidden={!open}>
      <div className="ai-panel__head">
        <span className="ai-panel__title">✨ AI Assistant</span>
        <button className="ai-panel__close" onClick={onClose} title="Close">×</button>
      </div>

      <div className="ai-panel__actions">
        {AI_ACTIONS.map(a => (
          <button
            key={a.key}
            className={`ai-panel__action ${mode === a.key ? 'active' : ''}`}
            onClick={() => run(a.key)}
            disabled={loading}
            title={a.hint}
          >
            <span className="ai-panel__action-label">{a.label}</span>
            <span className="ai-panel__action-hint">{a.hint}</span>
          </button>
        ))}
      </div>

      <div className="ai-panel__body">
        {loading && <div className="ai-panel__loading">Thinking…</div>}
        {error && <div className="ai-error-bar ai-error-bar--inline">{error}</div>}

        {!loading && result && mode === 'rephrase' && sourceText && (
          <div className="ai-panel__source">
            <span className="ai-panel__source-label">Original</span>
            <p>{sourceText}</p>
          </div>
        )}

        {!loading && result && (
          <div className="ai-panel__result">
            {mode === 'suggest'
              ? <div className="ai-panel__result-text">{result}</div>
              : <p className="ai-panel__result-text">{result}</p>}

            <div className="ai-panel__result-actions">
              {mode === 'continue' && (
                <button className="ai-panel__apply" onClick={applyContinue}>Insert at end</button>
              )}
              {mode === 'rephrase' && (
                <button className="ai-panel__apply" onClick={applyRephrase}>Replace selection</button>
              )}
              <button className="ai-panel__secondary" onClick={copyResult}>Copy</button>
              <button className="ai-panel__secondary" onClick={() => run(mode)} disabled={loading}>Regenerate</button>
              <button className="ai-panel__secondary" onClick={() => { setResult(''); setMode(null) }}>Dismiss</button>
            </div>
          </div>
        )}

        {!loading && !result && !error && (
          <p className="ai-panel__placeholder">Pick an action above. AI output appears here for you to review before it touches your chapter.</p>
        )}
      </div>
    </div>
  )
}

function ChapterEditor({ chapter, chapters, projectName, onUpdate, focusMode, onToggleFocus, totalWords, wordGoal, genre }) {
  const editorRef = useRef(null)
  const savedRangeRef = useRef(null)
  const [aiPanelOpen, setAiPanelOpen] = useState(false)
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

  // Append AI-generated prose as new paragraphs at the end of the chapter.
  function appendContinuation(text) {
    const appended = (chapter.content || '').trimEnd() + '\n' +
      text.split('\n').map(p => p.trim() ? `<p>${p}</p>` : '').join('')
    onUpdate(chapter.id, 'content', appended)
    if (editorRef.current) editorRef.current.innerHTML = appended
  }

  // Plain text of the last selection made inside the editor (for Rephrase).
  function getSelectedText() {
    return savedRangeRef.current ? savedRangeRef.current.toString() : ''
  }

  // Replace that selection with the rewritten text. Returns false if the
  // saved range is gone/collapsed so the panel can prompt a re-select.
  function replaceSelection(text) {
    const range = savedRangeRef.current
    const editor = editorRef.current
    if (!range || !editor || range.collapsed || !editor.contains(range.commonAncestorContainer)) return false
    range.deleteContents()
    range.insertNode(document.createTextNode(text))
    onUpdate(chapter.id, 'content', editor.innerHTML)
    savedRangeRef.current = null
    return true
  }

  return (
    <div className="editor-area">
      <div className="editor-topbar">
        <span className="editor-topbar__title">{chapter.title}</span>
        <Toolbar onFormat={handleFormat} />
        <span className="editor-topbar__meta">{formatWordCount(wordCount)} · {estimateRT(wordCount)}</span>
        <button
          className={`toolbar__btn ai-continue-btn${aiPanelOpen ? ' active' : ''}`}
          title="Open the AI writing assistant"
          onClick={() => setAiPanelOpen(o => !o)}
        >
          ✨ AI
        </button>
        <ExportMenu chapter={chapter} chapters={chapters} projectName={projectName} />
        <button className={`focus-btn ${focusMode ? 'active' : ''}`} onClick={onToggleFocus} title={focusMode ? 'Exit focus mode' : 'Focus mode'}>
          {focusMode ? '⊠' : '⊞'}
        </button>
      </div>
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
      <AIAssistantPanel
        open={aiPanelOpen}
        onClose={() => setAiPanelOpen(false)}
        chapter={chapter}
        genre={genre}
        getSelectedText={getSelectedText}
        onAppend={appendContinuation}
        onReplaceSelection={replaceSelection}
      />
    </div>
  )
}

function RelationshipsModal({ characters, genre, onClose }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pairs, setPairs] = useState([])

  useEffect(() => {
    let alive = true
    setLoading(true); setError(''); setPairs([])
    analyzeRelationships(characters, genre)
      .then(rows => { if (alive) setPairs(rows) })
      .catch(err => { if (alive) setError(err.message || 'AI request failed. Is the server running?') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [characters, genre])

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
            <span className="ch-info-modal__eyebrow">AI insight</span>
            <h3 className="ch-info-modal__title">Character relationships</h3>
          </div>
          <button className="ch-info-modal__close" onClick={onClose} title="Close (Esc)">×</button>
        </div>
        <div className="ch-info-modal__body">
          {loading && <div className="rel-status">Analyzing your cast…</div>}
          {!loading && error && <div className="ai-error-bar ai-error-bar--inline">{error}</div>}
          {!loading && !error && pairs.length === 0 && (
            <div className="rel-status">No clear relationships found. Try adding more detail to your character descriptions.</div>
          )}
          {!loading && !error && pairs.map((p, i) => (
            <div key={i} className="rel-card">
              {p.a ? (
                <>
                  <div className="rel-card__pair">
                    <span className="rel-card__name">{p.a}</span>
                    <span className="rel-card__link">⇄</span>
                    <span className="rel-card__name">{p.b}</span>
                    {p.type && <span className="rel-card__type">{p.type}</span>}
                  </div>
                  {p.reason && <div className="rel-card__reason">{p.reason}</div>}
                </>
              ) : (
                <div className="rel-card__reason">{p.reason}</div>
              )}
            </div>
          ))}
        </div>
        <div className="ch-info-modal__foot">
          <span className="ch-info-modal__hint">AI-inferred from your character descriptions · not saved</span>
          <button className="ch-info-modal__done" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  )
}

function CharacterEditor({ character, onUpdate, characters, onAnalyze }) {
  const canAnalyze = (characters?.length || 0) >= 2
  return (
    <div className="char-editor">
      <div className="char-editor__topbar">
        <span className="char-editor__title">Character Profile</span>
        <button className="rel-analyze-btn" onClick={onAnalyze} disabled={!canAnalyze}
          title={canAnalyze ? 'Use AI to map relationships across all characters' : 'Add at least two characters first'}>
          ✦ Analyze relationships
        </button>
      </div>
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
  const [relOpen, setRelOpen] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [mobileRightOpen, setMobileRightOpen] = useState(false)
  const saveTimers = useRef({})
  const guestChaptersByNovel = useRef({})
  const guestCharsByNovel = useRef({})
  // Becomes true once settings have been loaded from the DB, so the persist
  // effect below doesn't overwrite saved settings with initial defaults.
  const settingsLoadedRef = useRef(false)

  useEffect(() => { localStorage.setItem('sf_theme', theme) }, [theme])
  useEffect(() => { localStorage.setItem('sf_wordGoal', wordGoal) }, [wordGoal])
  useEffect(() => {
    if (pinnedNovelId) localStorage.setItem('sf_pinned_novel', pinnedNovelId)
    else localStorage.removeItem('sf_pinned_novel')
  }, [pinnedNovelId])

  // Sync per-user settings to Supabase so theme / word goal / pinned novel
  // follow the user across devices. Guests stay local-only.
  useEffect(() => {
    if (!user || user.isGuest || !settingsLoadedRef.current) return
    clearTimeout(saveTimers.current['settings'])
    saveTimers.current['settings'] = setTimeout(() => {
      dbUpsert('user_settings', {
        user_id: user.id,
        theme,
        word_goal: wordGoal,
        pinned_novel_id: pinnedNovelId || null,
        updated_at: new Date().toISOString(),
      })
    }, 800)
  }, [theme, wordGoal, pinnedNovelId, user])
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
    const seededCharsByNovel = {}
    EXAMPLE_NOVELS.forEach((ex, i) => {
      const novelId = `guest-novel-${i}`
      seededChaptersByNovel[novelId] = ex.chapters.map((ch, j) => ({
        id: `guest-ch-${i}-${j}`,
        novel_id: novelId,
        title: ch.title,
        content: ch.content,
        status: 'Draft',
        position: j,
        summary: ch.summary || '',
        characters_appearing: ch.characters_appearing || '',
        pov: ch.pov || '',
        todo: ch.todo || '',
      }))
      seededCharsByNovel[novelId] = (ex.characters || []).map((c, j) => ({
        id: `guest-char-${i}-${j}`,
        novel_id: novelId,
        name: c.name,
        description: c.description,
      }))
    })
    setNovels(seededNovels)
    guestChaptersByNovel.current = seededChaptersByNovel
    guestCharsByNovel.current = seededCharsByNovel
    const pinIdx = EXAMPLE_NOVELS.findIndex(n => n.pin)
    const openIdx = pinIdx >= 0 ? pinIdx : 0
    const opener = seededNovels[openIdx]
    setPinnedNovelId(opener.id)
    setProjectName(opener.title)
    setActiveNovelId(opener.id)
    setChapters(seededChaptersByNovel[opener.id])
    setActiveChapterId(seededChaptersByNovel[opener.id][0]?.id || null)
    setCharacters(seededCharsByNovel[opener.id] || [])
    setNotes([])
    setActiveNoteId(null)
  }

  async function loadNovels(currentUser) {
    setDataLoading(true)
    const { data } = await dbSelect('novels', 'order=created_at.asc')

    // Load synced settings first so the pinned novel below reflects the
    // account-level choice rather than whatever is cached on this device.
    let pinnedId = pinnedNovelId
    const { data: settingsRows } = await dbSelect('user_settings', `user_id=eq.${currentUser.id}`)
    const s = settingsRows?.[0]
    if (s) {
      if (s.theme) setTheme(s.theme)
      setWordGoal(s.word_goal || 0)
      pinnedId = s.pinned_novel_id || null
      setPinnedNovelId(pinnedId)
    } else {
      await dbInsert('user_settings', { user_id: currentUser.id, theme, word_goal: wordGoal, pinned_novel_id: null })
    }
    settingsLoadedRef.current = true

    if (data && data.length > 0) {
      const pinned = pinnedId && data.find(n => n.id === pinnedId)
      const opener = pinned || data[0]
      setNovels(data)
      setProjectName(opener.title)
      setActiveNovelId(opener.id)
      await loadNovelData(opener.id)
    } else {
      const createdNovels = []
      const chaptersByNovel = {}
      const charsByNovel = {}
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
            summary: ch.summary || '', characters_appearing: ch.characters_appearing || '',
            pov: ch.pov || '', todo: ch.todo || '',
          })
          const chapter = Array.isArray(chData) ? chData[0] : chData
          if (chapter) chaptersByNovel[novel.id].push(chapter)
        }
        charsByNovel[novel.id] = []
        for (const c of (ex.characters || [])) {
          const { data: charData } = await dbInsert('characters', {
            novel_id: novel.id, user_id: currentUser.id, name: c.name, description: c.description,
          })
          const character = Array.isArray(charData) ? charData[0] : charData
          if (character) charsByNovel[novel.id].push(character)
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
      setCharacters(charsByNovel[opener.id] || [])
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
    migrateLocalChapterMeta(chaptersRes.data || [])
  }

  // One-time move of chapter info (summary / POV / characters / TODO) from the
  // old per-device localStorage store into the chapters table. Runs quietly the
  // first time a chapter with legacy data is opened, then clears localStorage.
  async function migrateLocalChapterMeta(chapterRows) {
    const map = { summary: 'summary', pov: 'pov', todo: 'todo', characters: 'characters_appearing' }
    for (const ch of chapterRows) {
      const raw = localStorage.getItem('sf_ch_meta_' + ch.id)
      if (!raw) continue
      let meta
      try { meta = JSON.parse(raw) } catch { localStorage.removeItem('sf_ch_meta_' + ch.id); continue }
      const patch = {}
      for (const [oldKey, col] of Object.entries(map)) {
        if (meta?.[oldKey] && !ch[col]) patch[col] = meta[oldKey]
      }
      if (Object.keys(patch).length) {
        const { error } = await dbUpdate('chapters', `id=eq.${ch.id}`, patch)
        if (error) continue   // keep localStorage if the write failed, retry next load
        setChapters(p => p.map(c => c.id === ch.id ? { ...c, ...patch } : c))
      }
      localStorage.removeItem('sf_ch_meta_' + ch.id)
    }
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
    if (user?.isGuest) { delete guestChaptersByNovel.current[id]; delete guestCharsByNovel.current[id] }
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
        setCharacters(guestCharsByNovel.current[next.id] || [])
        setActiveCharId(null)
        setNotes([])
        setActiveNoteId(null)
      }
    }
  }

  async function addNovel() {
    if (user.isGuest) {
      if (activeNovelId) {
        guestChaptersByNovel.current[activeNovelId] = chapters
        guestCharsByNovel.current[activeNovelId] = characters
      }
      const n = { id: 'novel-' + Date.now(), title: 'New Novel', genre: '', status: 'Idea' }
      guestChaptersByNovel.current[n.id] = []
      guestCharsByNovel.current[n.id] = []
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
      if (activeNovelId) {
        guestChaptersByNovel.current[activeNovelId] = chapters
        guestCharsByNovel.current[activeNovelId] = characters
      }
      const nextChapters = guestChaptersByNovel.current[id] || []
      setChapters(nextChapters)
      setActiveChapterId(nextChapters[0]?.id || null)
      setCharacters(guestCharsByNovel.current[id] || [])
      setActiveCharId(null)
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
    settingsLoadedRef.current = false
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
        ? <CharacterEditor character={activeChar} onUpdate={updateChar}
            characters={characters} onAnalyze={() => setRelOpen(true)} />
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
        <ChapterInfoModal chapter={chapterInfoChapter} characters={characters} onUpdate={updateChapter} onClose={() => setChapterInfoOpenId(null)} />
      )}
      {relOpen && (
        <RelationshipsModal characters={characters} genre={novels.find(n => n.id === activeNovelId)?.genre} onClose={() => setRelOpen(false)} />
      )}
    </div>
  )
}
