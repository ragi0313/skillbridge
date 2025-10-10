import Link from "next/link"
import Image from "next/image"

type LogoProps = {
  textColor?: string
  imageWidth?: number
  imageHeight?: number
  fontSize?: string
}

const Logo = ({
  textColor = "text-gray-900",
  imageWidth = 36,
  imageHeight = 36,
  fontSize = "text-xl",
}: LogoProps) => {
  return (
    <div className="flex items-center">
      <Link href="/" className="flex items-center space-x-2">
        <div
          className="relative"
          style={{ width: `${imageWidth}px`, height: `${imageHeight}px` }}
        >
          <Image
            src="/logo.png"
            alt="BridgeMentor Logo"
            className="object-contain rounded"
            fill
            priority
          />
        </div>
        <span className={`font-bold tracking-wide ${fontSize} ${textColor}`}>
          BridgeMentor
        </span>
      </Link>
    </div>
  )
}

export default Logo
