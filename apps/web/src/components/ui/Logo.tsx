import Image from 'next/image'

// Aspect ratio of logo.png: 2994 × 498 (≈ 6.012 : 1)
const ASPECT = 2994 / 498

interface LogoProps {
  /** Rendered pixel width. Height is derived automatically. */
  width?: number
  className?: string
}

export default function Logo({ width = 220, className = '' }: LogoProps) {
  const height = Math.round(width / ASPECT)
  return (
    <Image
      src="/logo.png"
      alt="LensLinkUp"
      width={width}
      height={height}
      priority
      className={className}
    />
  )
}
