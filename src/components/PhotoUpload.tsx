'use client'

import { useState, useRef, useCallback } from 'react'
import { Camera, X, Upload, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface PhotoUploadProps {
  houseId: string
  userId: string
  onUploadComplete: (photoUrl: string) => void
  onError?: (error: string) => void
  disabled?: boolean
}

interface UploadState {
  status: 'idle' | 'preview' | 'uploading' | 'complete' | 'error'
  progress: number
  error?: string
  previewUrl?: string
  file?: File
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/jpg']

export function PhotoUpload({ 
  houseId, 
  userId, 
  onUploadComplete, 
  onError,
  disabled = false 
}: PhotoUploadProps) {
  const [state, setState] = useState<UploadState>({ status: 'idle', progress: 0 })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Please upload a JPG or PNG image'
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File must be smaller than 5MB'
    }
    return null
  }

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const error = validateFile(file)
    if (error) {
      setState({ status: 'error', progress: 0, error })
      onError?.(error)
      return
    }

    const previewUrl = URL.createObjectURL(file)
    setState({ status: 'preview', progress: 0, previewUrl, file })
  }, [onError])

  const handleCameraClick = () => {
    fileInputRef.current?.click()
  }

  const clearPreview = () => {
    if (state.previewUrl) {
      URL.revokeObjectURL(state.previewUrl)
    }
    setState({ status: 'idle', progress: 0 })
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const uploadPhoto = async () => {
    if (!state.file) return

    setState(prev => ({ ...prev, status: 'uploading', progress: 10 }))

    try {
      const timestamp = Date.now()
      const extension = state.file.name.split('.').pop() || 'jpg'
      const filePath = `${houseId}/${userId}/${timestamp}.${extension}`

      // Update progress
      setState(prev => ({ ...prev, progress: 30 }))

      // Upload to Supabase Storage
      const { error: uploadError, data } = await supabase.storage
        .from('chore-photos')
        .upload(filePath, state.file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        throw new Error(uploadError.message)
      }

      setState(prev => ({ ...prev, progress: 70 }))

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('chore-photos')
        .getPublicUrl(filePath)

      setState(prev => ({ ...prev, progress: 90 }))

      const photoUrl = urlData.publicUrl

      setState(prev => ({ ...prev, status: 'complete', progress: 100 }))
      onUploadComplete(photoUrl)

      // Clean up preview after a moment
      setTimeout(() => {
        if (state.previewUrl) {
          URL.revokeObjectURL(state.previewUrl)
        }
      }, 1000)

    } catch (error: any) {
      const errorMsg = error.message || 'Failed to upload photo'
      setState({ status: 'error', progress: 0, error: errorMsg })
      onError?.(errorMsg)
    }
  }

  const renderContent = () => {
    switch (state.status) {
      case 'idle':
        return (
          <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 hover:bg-gray-100 transition cursor-pointer"
               onClick={handleCameraClick}>
            <Camera size={32} className="text-gray-400 mb-2" />
            <p className="text-sm text-gray-600 font-medium">Take photo or choose file</p>
            <p className="text-xs text-gray-400 mt-1">JPG/PNG up to 5MB</p>
          </div>
        )

      case 'preview':
        return (
          <div className="relative">
            <img 
              src={state.previewUrl} 
              alt="Preview" 
              className="w-full h-48 object-cover rounded-xl"
            />
            <button
              onClick={clearPreview}
              className="absolute top-2 right-2 w-8 h-8 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition"
            >
              <X size={16} />
            </button>
            <button
              onClick={uploadPhoto}
              className="absolute bottom-2 right-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition"
            >
              <Upload size={16} />
              Upload
            </button>
          </div>
        )

      case 'uploading':
        return (
          <div className="p-6 border-2 border-blue-200 rounded-xl bg-blue-50">
            <div className="flex items-center justify-center mb-4">
              <Loader2 size={32} className="text-blue-600 animate-spin" />
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${state.progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 text-center">Uploading... {state.progress}%</p>
          </div>
        )

      case 'complete':
        return (
          <div className="p-6 border-2 border-green-200 rounded-xl bg-green-50">
            <div className="flex items-center justify-center mb-2">
              <CheckCircle size={32} className="text-green-600" />
            </div>
            <p className="text-sm text-green-700 text-center font-medium">Photo uploaded!</p>
          </div>
        )

      case 'error':
        return (
          <div className="p-6 border-2 border-red-200 rounded-xl bg-red-50">
            <div className="flex items-center justify-center mb-2">
              <AlertCircle size={32} className="text-red-600" />
            </div>
            <p className="text-sm text-red-700 text-center font-medium">{state.error}</p>
            <button
              onClick={clearPreview}
              className="mt-3 w-full text-sm text-red-600 hover:text-red-700 underline"
            >
              Try again
            </button>
          </div>
        )
    }
  }

  return (
    <div className={`${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/jpg"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />
      {renderContent()}
    </div>
  )
}

export default PhotoUpload