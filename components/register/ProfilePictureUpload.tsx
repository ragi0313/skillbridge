"use client"

import type React from "react"
import { useState, useCallback, useRef, useEffect } from "react"
import Image from "next/image"
import Cropper, { type Area } from "react-easy-crop"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Upload, Trash, User } from "lucide-react"
import getCroppedImg from "@/lib/cropImage"
import { toast } from "sonner"

interface Props {
  initialImageUrl: string | null
  onUploadSuccess: (url: string, publicId: string) => void
  onDeleteSuccess: () => void
  showRemoveButton?: boolean 
}

export default function ProfilePictureUpload({ initialImageUrl, onUploadSuccess, onDeleteSuccess, showRemoveButton = true }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialImageUrl)
  const [publicId, setPublicId] = useState<string | null>(null) // This needs to be managed if initialImageUrl comes with publicId
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)

  // Update previewUrl when initialImageUrl prop changes
  useEffect(() => {
    setPreviewUrl(initialImageUrl)
    if (initialImageUrl && initialImageUrl.includes("res.cloudinary.com")) {
      const parts = initialImageUrl.split("/")
      const folderAndId = parts
        .slice(parts.indexOf("upload") + 2)
        .join("/")
        .split(".")[0]
      setPublicId(folderAndId)
    } else {
      setPublicId(null)
    }
  }, [initialImageUrl])

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
      toast.error("Only JPG and PNG files are allowed.")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be under 5MB.")
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
        onUploadSuccess(data.secure_url, data.public_id)
        setCropModalOpen(false)
        toast.success("Profile picture uploaded successfully!")
      } else {
        toast.error("Upload failed. Please try again.")
      }
    } catch (err) {
      console.error("Crop or upload error", err)
      toast.error("Something went wrong. Please try again.")
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemove = async () => {
    if (!publicId) {
      setPreviewUrl(null)
      onDeleteSuccess()
      inputRef.current && (inputRef.current.value = "") // Clear file input
      return
    }

    setIsRemoving(true)
    try {
      const res = await fetch("/api/picture/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ publicId }),
      })

      if (res.ok) {
        setPreviewUrl(null)
        setPublicId(null)
        onDeleteSuccess()
        inputRef.current && (inputRef.current.value = "") // Clear file input
        toast.success("Profile picture removed successfully!")
      } else {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to delete image from Cloudinary")
      }
    } catch (err) {
      console.error("Failed to delete image from Cloudinary", err)
      toast.error("Failed to delete image. Please try again.")
    } finally {
      setIsRemoving(false)
    }
  }

  return (
    <div>
      <Label className="mb-2">Profile Picture*</Label>
      <div className="flex items-center space-x-4">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
          {previewUrl ? (
            <Image
              src={previewUrl || "/placeholder.svg"}
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
          <input type="file" accept="image/*" ref={inputRef} onChange={handleFileChange} className="hidden" />
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
            {previewUrl && showRemoveButton && (
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
            <Button variant="outline" disabled={isUploading} onClick={() => setCropModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCropSave} disabled={isUploading}>
              {isUploading ? "Uploading..." : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
