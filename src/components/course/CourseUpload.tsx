import React, { useState } from 'react';
import { Upload, File, X, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface CourseUploadProps {
  courseId: string;
  onUploadComplete: () => void;
}

export default function CourseUpload({ courseId, onUploadComplete }: CourseUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ [key: string]: number }>({});

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const uploadFile = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${courseId}/${fileName}`;

    const { data, error } = await supabase.storage
      .from('course-materials')
      .upload(filePath, file, {
        onUploadProgress: (progress) => {
          setProgress(prev => ({
            ...prev,
            [file.name]: Math.round((progress.loaded / progress.total) * 100)
          }));
        }
      });

    if (error) throw error;

    // Create material record in database
    await supabase.from('course_materials').insert({
      course_id: courseId,
      title: file.name,
      content_type: 'file',
      file_url: data.path,
      file_type: file.type
    });

    return data.path;
  };

  const handleUpload = async () => {
    try {
      setUploading(true);
      await Promise.all(files.map(uploadFile));
      setFiles([]);
      onUploadComplete();
    } catch (error) {
      console.error('Error uploading files:', error);
      // TODO: Show error message
    } finally {
      setUploading(false);
      setProgress({});
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm">
      <div className="mb-6">
        <label
          htmlFor="file-upload"
          className="flex justify-center w-full h-32 px-4 transition bg-white border-2 border-gray-300 border-dashed rounded-md appearance-none cursor-pointer hover:border-indigo-500 focus:outline-none"
        >
          <span className="flex items-center space-x-2">
            <Upload className="w-6 h-6 text-gray-600" />
            <span className="font-medium text-gray-600">
              Drop files to upload or click here
            </span>
          </span>
          <input
            id="file-upload"
            type="file"
            className="hidden"
            multiple
            onChange={handleFileSelect}
            accept=".pdf,.doc,.docx,.ppt,.pptx"
          />
        </label>
      </div>

      {files.length > 0 && (
        <div className="space-y-4">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center space-x-4">
                <File className="w-6 h-6 text-gray-500" />
                <span className="font-medium">{file.name}</span>
              </div>
              <div className="flex items-center space-x-4">
                {uploading ? (
                  <div className="text-sm text-gray-600">
                    {progress[file.name] || 0}%
                  </div>
                ) : (
                  <button
                    onClick={() => removeFile(index)}
                    className="text-gray-500 hover:text-red-500"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          ))}

          <div className="flex justify-end mt-4">
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700
                disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  <span>Upload Files</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}