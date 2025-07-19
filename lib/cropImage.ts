// lib/getCroppedImg.ts

import { Area } from "react-easy-crop"
import { createImage } from "./imageUtils"

export default async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area
): Promise<{ file: File; url: string }> {
  const image = await createImage(imageSrc)

  const canvas = document.createElement("canvas")
  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height

  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Failed to get canvas context")

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject("Failed to create blob")

      const file = new File([blob], "cropped.jpg", { type: "image/jpeg" })
      const url = URL.createObjectURL(blob)
      resolve({ file, url })
    }, "image/jpeg")
  })
}
