// Image component for rendering images
interface ImageComponentProps {
  src?: string
  alt?: string
}

export function ImageComponent({ src, alt }: ImageComponentProps) {
  return (
    <img
      src={src || 'https://via.placeholder.com/300'}
      alt={alt || 'Image'}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
      }}
    />
  )
}
