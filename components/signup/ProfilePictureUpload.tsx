"use client"

import React, { useState, useCallback, useRef } from "react"
import Image from "next/image"
import Cropper from "react-easy-crop"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Upload, Trash, User } from "lucide-react"
import getCroppedImg from "@/lib/cropImage"

interface Props {
  value: File | null
  onChange: (file: File | null) => void
}

export default function ProfilePictureUpload({ value, onChange }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(value ? URL.createObjectURL(value) : null)
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => {
        setImageSrc(reader.result as string)
        setCropModalOpen(true)
      }
      reader.readAsDataURL(file)
    }
  }

  const onCropComplete = useCallback((_: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleCropSave = async () => {
    if (!imageSrc || !croppedAreaPixels) return

    const { file, url } = await getCroppedImg(imageSrc, croppedAreaPixels)
    setPreviewUrl(url)
    onChange(file)
    setCropModalOpen(false)
  }

  const handleRemove = () => {
    setPreviewUrl(null)
    onChange(null)
  }

  return (
    <div>
      <Label className="mb-2">Profile Picture</Label>
      <div className="flex items-center space-x-4">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
          {previewUrl ? (
            <Image src={previewUrl} alt="Preview" width={80} height={80} className="object-cover w-full h-full" />
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
              className="flex items-center space-x-2 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>{previewUrl ? "Change Photo" : "Upload Photo"}</span>
            </Button>
            {previewUrl && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleRemove}
                className="flex items-center space-x-2"
              >
                <Trash className="w-4 h-4" />
                <span className="cursor-pointer">Remove</span>
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
          <div className="relative w-full h-[300px] bg-black">
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
            <Button variant="outline" onClick={() => setCropModalOpen(false)} className="cursor-pointer">
              Cancel
            </Button>
            <Button onClick={handleCropSave} className="cursor-pointer">Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
