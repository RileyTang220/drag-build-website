// Real-time collaboration session built on Yjs + y-webrtc.
//
// === Why y-webrtc for the MVP ===
// Vercel can't host long-lived WebSockets, so y-websocket would need a
// separate server (Hocuspocus on Render / Fly / PartyKit). y-webrtc syncs
// peers directly via WebRTC and only needs a tiny *signaling* server to
// help peers find each other — `signaling.yjs.dev` is the public default.
// In production we'd run our own signaling + TURN server, but for an MVP
// demo (two browser windows on the same page) this works zero-config.
//
// === Data model ===
// One `Y.Map` ("app") holds the whole `PageSchema` under the "schema"
// key. When user A changes anything, we push the new schema; Yjs sends
// the smallest possible diff to peer B. This is "last-write-wins per
// schema replace" — coarser than per-node CRDT, but plenty for awareness
// + live updates in an MVP. Promoting nodes to `Y.Array<Y.Map>` later is
// a self-contained refactor.
//
// === Loop guard ===
// Yjs marks transactions with `transaction.local` based on origin. Our
// store→Yjs sync runs `transact(...)` (local=true). The remote callback
// fires only when local=false, so applying a remote schema doesn't
// echo back as a local edit — no infinite ping-pong.
import * as Y from 'yjs'
import { WebrtcProvider } from 'y-webrtc'
import type { Awareness } from 'y-protocols/awareness'
import type { PageSchema } from '@/types/schema'
import type { CollabUser } from './user'

export interface PeerState {
  clientId: number
  user: CollabUser
  cursor?: { x: number; y: number } | null
  selectedNodeId?: string | null
}

export interface CollabSessionOptions {
  pageId: string
  user: CollabUser
  /** Schema we just loaded from the API. Used as the seed if we're alone. */
  initialSchema: PageSchema
  /** Fired when peers update the schema. The receiver should bypass undo. */
  onRemoteSchema: (schema: PageSchema) => void
  /** Fired when any peer's awareness changes (cursor / selection / join / leave). */
  onPeers: (peers: PeerState[]) => void
}

const SEED_TIMEOUT_MS = 800

export class CollabSession {
  readonly ydoc: Y.Doc
  readonly provider: WebrtcProvider
  readonly awareness: Awareness
  private readonly mainMap: Y.Map<unknown>
  private destroyed = false

  constructor(opts: CollabSessionOptions) {
    this.ydoc = new Y.Doc()
    this.provider = new WebrtcProvider(roomFor(opts.pageId), this.ydoc, {
      // Public signaling; the heroku ones in the package default were
      // shut down in 2022, so we narrow to the one that still works.
      signaling: ['wss://signaling.yjs.dev'],
    })
    this.awareness = this.provider.awareness
    this.mainMap = this.ydoc.getMap('app')
    this.awareness.setLocalStateField('user', opts.user)

    // Seed the room with our initial schema if no one beats us to it.
    // Yjs CRDT then merges any later "set" operations from peers.
    const seedTimer = setTimeout(() => {
      if (this.destroyed) return
      if (!this.mainMap.has('schema')) {
        this.ydoc.transact(() => {
          this.mainMap.set('schema', opts.initialSchema)
        })
      }
    }, SEED_TIMEOUT_MS)

    this.provider.on('synced', ({ synced }: { synced: boolean }) => {
      if (synced) clearTimeout(seedTimer)
    })

    // Remote schema → notify caller. Skip our own local writes.
    this.mainMap.observe((_event, transaction) => {
      if (transaction.local) return
      const remote = this.mainMap.get('schema') as PageSchema | undefined
      if (remote) opts.onRemoteSchema(remote)
    })

    // Awareness — re-emit a filtered list (self excluded) on every change.
    const emitPeers = () => {
      const peers: PeerState[] = []
      const states = this.awareness.getStates()
      states.forEach((state, clientId) => {
        if (clientId === this.awareness.clientID) return
        const user = state.user as CollabUser | undefined
        if (!user) return
        peers.push({
          clientId,
          user,
          cursor: state.cursor as { x: number; y: number } | null | undefined,
          selectedNodeId: state.selectedNodeId as string | null | undefined,
        })
      })
      opts.onPeers(peers)
    }
    this.awareness.on('change', emitPeers)
    // Emit once initially so UI starts in a known state.
    emitPeers()
  }

  /**
   * Push a new schema into the shared doc. Skipped if identical to the
   * current value to avoid generating empty Yjs operations on no-op
   * subscribes (React StrictMode etc.).
   */
  setSchema(schema: PageSchema): void {
    if (this.destroyed) return
    if (this.mainMap.get('schema') === schema) return
    this.ydoc.transact(() => {
      this.mainMap.set('schema', schema)
    })
  }

  setCursor(cursor: { x: number; y: number } | null): void {
    if (this.destroyed) return
    this.awareness.setLocalStateField('cursor', cursor)
  }

  setSelectedNodeId(nodeId: string | null): void {
    if (this.destroyed) return
    this.awareness.setLocalStateField('selectedNodeId', nodeId)
  }

  destroy(): void {
    if (this.destroyed) return
    this.destroyed = true
    this.awareness.setLocalState(null) // explicit "I'm leaving" so peers drop us
    this.provider.destroy()
    this.ydoc.destroy()
  }
}

function roomFor(pageId: string): string {
  // Namespacing the room avoids collisions with any other Yjs apps that
  // might pick the same generic id on signaling.yjs.dev.
  return `drag-website--${pageId}`
}
