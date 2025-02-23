import React from 'react';
import { File, Download, Clock, Brain, FileText, Eye } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import PDFViewer from './PDFViewer';

interface MaterialListProps {
  courseId: string;
}

interface Material {
  id: string;
  title: string;
  file_type: string;
  created_at: string;
  aiSummary?: string;
  file_url: string;
}

export default function MaterialList({ courseId }: MaterialListProps) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPDF, setSelectedPDF] = useState<string | null>(null);

  useEffect(() => {
    fetchMaterials();
  }, [courseId]);

  const fetchMaterials = async () => {
    try {
      const { data, error } = await supabase
        .from('course_materials')
        .select('*')
        .eq('course_id', courseId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMaterials(data || []);
    } catch (error) {
      console.error('Error fetching materials:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) {
      return <FileText className="w-6 h-6 text-red-500" />;
    }
    return <File className="w-6 h-6 text-gray-500" />;
  };

  const handleDownload = async (fileUrl: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('course-materials')
        .download(fileUrl);
      
      if (error) throw error;

      // Create a download link
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (materials.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl shadow-sm">
        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Materials Yet</h3>
        <p className="text-gray-500">Upload course materials to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {materials.map((material) => (
        <div
          key={material.id}
          className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200"
        >
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  {getFileIcon(material.file_type)}
                  <h3 className="text-lg font-semibold text-gray-900">
                    {material.title}
                  </h3>
                </div>
                
                <div className="mt-2 flex items-center space-x-6 text-sm text-gray-500">
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    Uploaded {new Date(material.created_at).toLocaleDateString()}
                  </div>
                </div>

                {material.aiSummary && (
                  <div className="mt-4 p-4 bg-purple-50 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Brain className="w-5 h-5 text-purple-600" />
                      <span className="font-medium text-purple-900">AI Summary</span>
                    </div>
                    <p className="text-sm text-purple-900">{material.aiSummary}</p>
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                {material.file_type.includes('pdf') && (
                  <button
                    onClick={() => {
                      const { data: { publicUrl } } = supabase.storage
                        .from('course-materials')
                        .getPublicUrl(material.file_url);
                      setSelectedPDF(publicUrl);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    title="View PDF"
                  >
                    <Eye className="w-5 h-5 text-gray-600" />
                  </button>
                )}
                <button
                  onClick={() => handleDownload(material.file_url, material.title)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  title="Download"
                >
                  <Download className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
      
      {selectedPDF && (
        <PDFViewer
          url={selectedPDF}
          onClose={() => setSelectedPDF(null)}
        />
      )}
    </div>
  );
}