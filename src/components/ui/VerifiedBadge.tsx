import Image from 'next/image'

interface Props {
  size?: number
}

export default function VerifiedBadge({ size = 20 }: Props) {
  return (
    <Image
      src="/verified-badge.jpg"
      alt="Verified"
      width={size}
      height={size}
      style={{ display: 'inline-block', flexShrink: 0 }}
      title="Verified alumni"
    />
  )
}
