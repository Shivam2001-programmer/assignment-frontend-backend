import { useEffect, useState } from 'react'
import { Link, Outlet } from 'react-router'
import { setActor } from '../api/client'
import styles from './AppLayout.module.css'

const ACTOR_KEY = 'lead-intake:actor'

function readActor() {
  try {
    return localStorage.getItem(ACTOR_KEY) ?? ''
  } catch {
    return ''
  }
}

export function AppLayout() {
  const [actor, setActorState] = useState(readActor)

  useEffect(() => {
    setActor(actor)
    try {
      localStorage.setItem(ACTOR_KEY, actor)
    } catch {
    }
  }, [actor])

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link to="/leads" className={styles.brand}>
          <span className={styles.logo} aria-hidden="true">
            LI
          </span>
          Lead Intake
        </Link>
        <label className={styles.actor}>
          <span className="muted">Acting as</span>
          <input
            value={actor}
            onChange={(e) => setActorState(e.target.value)}
            placeholder="Your name"
            maxLength={100}
            aria-describedby="actor-hint"
          />
          <span id="actor-hint" className="visually-hidden">
            Recorded on status changes in the activity timeline
          </span>
        </label>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}
