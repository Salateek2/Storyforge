import React from 'react'

function ChapterList({ onSelect, activeChapter }) {
  const chapters = [
    { id: 1, title: 'Chapter 1: The Beginning' },
    { id: 2, title: 'Chapter 2: Rising Action' },
    { id: 3, title: 'Chapter 3: The Climax' },
  ]
  return (
    <aside className="chapter-list">
      <h2>Chapters</h2>
      <ul>
        {chapters.map((ch) => (
          <li key={ch.id} className={activeChapter?.id === ch.id ? 'active' : ''} onClick={() => onSelect(ch)}>
            {ch.title}
          </li>
        ))}
      </ul>
    </aside>
  )
}
export default ChapterList
