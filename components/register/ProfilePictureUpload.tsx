"use client"

import React, { useState, useCallback, useRef, useEffect } from "react"
import Image from "next/image"
import Cropper, { Area } from "react-easy-crop"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Upload, Trash, User } from "lucide-react"
import getCroppedImg from "@/lib/cropImage"

interface Props {
  value: string | null
  onChange: (url: string | null) => void
}

export default function ProfilePictureUpload({ value, onChange }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(value)
  const [publicId, setPublicId] = useState<string | null>(null)
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!["image/jpeg", "image/png"].includes(file.type)) {
      alert("Only JPG and PNG files are allowed.")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be under 5MB.")
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setImageSrc(reader.result as string)
      setCropModalOpen(true)
    }
    reader.readAsDataURL(file)
  }

  const onCropComplete = useCallback((_: any, croppedArea: Area) => {
    setCroppedAreaPixels(croppedArea)
  }, [])

  

  const handleCropSave = async () => {
    if (!imageSrc || !croppedAreaPixels || isUploading) return

    try {
      setIsUploading(true)
      const { file } = await getCroppedImg(imageSrc, croppedAreaPixels)

      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch("/api/picture/upload", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()

      if (data.secure_url) {
        setPreviewUrl(data.secure_url)
        setPublicId(data.public_id)
        onChange(data.secure_url)
        setCropModalOpen(false)
      } else {
        alert("Upload failed")
      }
    } catch (err) {
      console.error("Crop or upload error", err)
      alert("Something went wrong.")
      } finally {
        setIsUploading(false)
      }
  }

  const handleRemove = async () => {
    if (!publicId) {
      setPreviewUrl(null)
      setPublicId(null)
      onChange(null)
      return
    }

    setIsRemoving(true)
    try {
      await fetch("/api/picture/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ publicId }),
      })
      setPreviewUrl(null)
      setPublicId(null)
      onChange(null)
      inputRef.current?.value && (inputRef.current.value = "")
    } catch (err) {
      console.error("Failed to delete image from Cloudinary", err)
      alert("Failed to delete image. Please try again.")
    } finally {
      setIsRemoving(false)
    }
  }


  return (
    <div>
      <Label className="mb-2">Profile Picture</Label>
      <div className="flex items-center space-x-4">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
          {previewUrl ? (
            <Image
              src={previewUrl}
              alt="Preview"
              width={80}
              height={80}
              className="object-cover w-full h-full"
            />
          ) : (
            <User className="w-8 h-8 text-gray-400" />
          )}
        </div>
        <div>
          <input
            type="file"
            accept="image/*"
            ref={inputRef}
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => inputRef.current?.click()}
              className="flex items-center space-x-2"
            >
              <Upload className="w-4 h-4" />
              <span>{previewUrl ? "Change Photo" : "Upload Photo"}</span>
            </Button>
            {previewUrl && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleRemove}
                disabled={isRemoving}
                className="flex items-center space-x-2"
              >
                <Trash className="w-4 h-4" />
                <span>{isRemoving ? "Removing..." : "Remove"}</span>
              </Button>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">JPG, PNG up to 5MB</p>
        </div>
      </div>

      <Dialog open={cropModalOpen} onOpenChange={setCropModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Crop Your Profile Picture</DialogTitle>
          </DialogHeader>
          <div className="relative w-full h-[300px] bg-black rounded-md overflow-hidden">
            {imageSrc && (
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            )}
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              disabled={isUploading}
              onClick={() => setCropModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCropSave}
              disabled={isUploading}
            >
              {isUploading ? "Uploading..." : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
