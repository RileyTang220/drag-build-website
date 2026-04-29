// Toolbar widget: list of online collaborators (you + peers).
'use client'

import type { CollabUser } from '@/lib/collab/user'
import type { PeerState } from '@/lib/collab/session'

interface CollabAvatarsProps {
  self: CollabUser
  peers: PeerState[]
}

export function CollabAvatars({ self, peers }: CollabAvatarsProps) {
  // Cap visible avatars; show "+N" badge for the rest.
  const VISIBLE_PEERS = 4
  const shown = peers.slice(0, VISIBLE_PEERS)
  const hidden = peers.length - shown.length

  return (
    <div className="flex items-center gap-1">
      <Avatar user={self} title={`${self.name} (you)`} ringClass="ring-1 ring-white/40" />
      {shown.map((peer) => (
        <Avatar key={peer.clientId} user={peer.user} title={peer.user.name} />
      ))}
      {hidden > 0 && (
        <div
          title={`${hidden} more collaborator${hidden > 1 ? 's' : ''}`}
          className="w-7 h-7 rounded-full bg-[#3c3c3c] text-[#cccccc] flex items-center justify-center text-[11px] font-semibold border-2 border-[#252526]"
        >
          +{hidden}
        </div>
      )}
    </div>
  )
}

interface AvatarProps {
  user: CollabUser
  title: string
  ringClass?: string
}

function Avatar({ user, title, ringClass }: AvatarProps) {
  const initial = user.name.charAt(0).toUpperCase() || '?'
  return (
    <div
      title={title}
      className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold text-white border-2 border-[#252526] ${ringClass ?? ''}`}
      style={{ backgroundColor: user.color }}
    >
      {initial}
    </div>
  )
}
