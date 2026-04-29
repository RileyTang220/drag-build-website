// Renders other users' live cursors and selection outlines on the canvas.
//
// Mounted *inside* the scaled artboard so the (x, y) coordinates we
// publish in canvas-space line up with the same coordinates we use for
// node positions. The label compensates for zoom via a counter-scale so
// the user's name stays the same on-screen size at any zoom.
'use client'

import type { ComponentNode, PageSchema } from '@/types/schema'
import type { PeerState } from '@/lib/collab/session'

interface CollabCursorsProps {
  peers: PeerState[]
  schema: PageSchema
  zoom: number
}

export function CollabCursors({ peers, schema, zoom }: CollabCursorsProps) {
  if (peers.length === 0) return null

  const counterScale = zoom > 0 ? 1 / zoom : 1
  const nodeById = new Map<string, ComponentNode>(
    schema.nodes.map((n) => [n.id, n]),
  )

  return (
    <div
      className="pointer-events-none"
      style={{ position: 'absolute', inset: 0 }}
      aria-hidden
    >
      {peers.map((peer) => {
        const selectedNode =
          peer.selectedNodeId ? nodeById.get(peer.selectedNodeId) : undefined
        return (
          <div key={peer.clientId}>
            {selectedNode && (
              <div
                style={{
                  position: 'absolute',
                  left: selectedNode.style.left,
                  top: selectedNode.style.top,
                  width: selectedNode.style.width,
                  height: selectedNode.style.height,
                  // Use outline (not border) so it doesn't displace layout.
                  outline: `2px solid ${peer.user.color}`,
                  outlineOffset: 0,
                  pointerEvents: 'none',
                }}
              />
            )}
            {peer.cursor && (
              <PeerCursor
                color={peer.user.color}
                name={peer.user.name}
                x={peer.cursor.x}
                y={peer.cursor.y}
                counterScale={counterScale}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

interface PeerCursorProps {
  color: string
  name: string
  x: number
  y: number
  counterScale: number
}

function PeerCursor({ color, name, x, y, counterScale }: PeerCursorProps) {
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        // Keep arrow + label visually constant across zoom.
        transform: `scale(${counterScale})`,
        transformOrigin: 'top left',
        pointerEvents: 'none',
      }}
    >
      {/* Arrow — small SVG triangle in the user's color. */}
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        style={{ display: 'block', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.25))' }}
      >
        <path
          d="M2 2 L18 10 L10 12 L7 18 Z"
          fill={color}
          stroke="#ffffff"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
      <div
        style={{
          marginTop: 2,
          marginLeft: 14,
          padding: '2px 6px',
          fontSize: 11,
          lineHeight: 1.2,
          fontWeight: 600,
          color: '#ffffff',
          backgroundColor: color,
          borderRadius: 4,
          whiteSpace: 'nowrap',
          boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
        }}
      >
        {name}
      </div>
    </div>
  )
}
