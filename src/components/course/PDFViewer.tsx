import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

interface PDFViewerProps {
  url: string;
  onClose: () => void;
}

export default function PDFViewer({ url, onClose }: PDFViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.5);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);

  useEffect(() => {
    loadPDF();
  }, [url]);

  useEffect(() => {
    if (pdfDoc) {
      renderPage();
    }
  }, [pageNum, scale, pdfDoc]);

  const loadPDF = async () => {
    try {
      setLoading(true);
      const loadingTask = pdfjsLib.getDocument({
        url: url + '?t=' + new Date().getTime(),
        cMapUrl: '/cmaps/',
        cMapPacked: true,
      });
      const pdf = await loadingTask.promise;
      setPdfDoc(pdf);
      setNumPages(pdf.numPages);
      setLoading(false);
    } catch (error) {
      console.error('Error loading PDF:', error);
      alert('Failed to load PDF. Please try downloading the file instead.');
      setLoading(false);
      onClose();
    }
  };

  const renderPage = async () => {
    if (!pdfDoc || !canvasRef.current) return;

    try {
      const page = await pdfDoc.getPage(pageNum);
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (!context) return;

      const viewport = page.getViewport({ scale });
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({
        canvasContext: context,
        viewport,
      }).promise;
    } catch (error) {
      console.error('Error rendering page:', error);
    }
  };

  const nextPage = () => {
    if (pageNum < numPages) {
      setPageNum(pageNum + 1);
    }
  };

  const prevPage = () => {
    if (pageNum > 1) {
      setPageNum(pageNum - 1);
    }
  };

  const zoomIn = () => setScale(prev => Math.min(prev + 0.25, 3));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={prevPage}
              disabled={pageNum <= 1}
              className="p-2 hover:bg-gray-100 rounded-full disabled:opacity-50"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm">
              Page {pageNum} of {numPages}
            </span>
            <button
              onClick={nextPage}
              disabled={pageNum >= numPages}
              className="p-2 hover:bg-gray-100 rounded-full disabled:opacity-50"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="border-l pl-4 space-x-2">
              <button
                onClick={zoomOut}
                className="px-3 py-1 border rounded hover:bg-gray-50"
              >
                -
              </button>
              <span className="text-sm">{Math.round(scale * 100)}%</span>
              <button
                onClick={zoomIn}
                className="px-3 py-1 border rounded hover:bg-gray-50"
              >
                +
              </button>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
          ) : (
            <div className="flex justify-center">
              <canvas ref={canvasRef} className="shadow-lg" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}