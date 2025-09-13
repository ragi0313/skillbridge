"use client"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Paperclip } from "lucide-react"

interface FileUploadProps {
  onFileSelect?: (file: File) => void
  disabled?: boolean
  className?: string
  accept?: string
}

export function FileUpload({ 
  onFileSelect, 
  disabled = false, 
  className,
  accept = "image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
}: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileClick = () => {
    if (disabled) return
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && onFileSelect) {
      onFileSelect(file)
      // Reset the input so the same file can be selected again
      e.target.value = ""
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={className}
        onClick={handleFileClick}
        disabled={disabled}
      >
        <Paperclip className="h-4 w-4" />
      </Button>
      
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileChange}
        className="hidden"
        accept={accept}
        disabled={disabled}
      />
    </>
  )
}