// Embedded Google Map.
//
// Uses `maps.google.com/maps?output=embed` which works without an API key.
// We URL-encode the address and route through `https://www.google.com/maps?...`
// — both the host and protocol are hard-coded, so a malicious `address` value
// cannot redirect the iframe elsewhere.
//
// The iframe is sandboxed: only allow-scripts + allow-same-origin (Google
// Maps needs both to render). No allow-top-navigation, no allow-forms.
import React from 'react'

interface MapProps {
  address?: string
  borderRadius?: number
}

const MAX_ADDRESS_LEN = 256

export function MapComponent({ address = '', borderRadius }: MapProps) {
  const safeAddress = String(address).slice(0, MAX_ADDRESS_LEN)
  const src = safeAddress
    ? `https://www.google.com/maps?q=${encodeURIComponent(safeAddress)}&output=embed`
    : ''

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        borderRadius: borderRadius ? `${borderRadius}px` : undefined,
        backgroundColor: '#e5e7eb',
      }}
    >
      {src ? (
        <iframe
          title={safeAddress || 'Map'}
          src={src}
          width="100%"
          height="100%"
          style={{ border: 0, display: 'block' }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          sandbox="allow-scripts allow-same-origin allow-popups"
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#6b7280',
            fontSize: 13,
          }}
        >
          Enter an address in the property panel
        </div>
      )}
    </div>
  )
}
