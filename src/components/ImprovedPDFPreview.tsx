import { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { ChevronLeftIcon, ChevronRightIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

interface PDFPreviewProps {
  pdfUrl: string;
}

interface ViewportSize {
  width: number;
  isMobile: boolean;
  isTablet: boolean;
}

function useViewportSize(): ViewportSize {
  const [size, setSize] = useState<ViewportSize>({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    isMobile: false,
    isTablet: false,
  });

  useEffect(() => {
    function updateSize() {
      const width = window.innerWidth;
      setSize({
        width,
        isMobile: width < 640,
        isTablet: width >= 640 && width < 1024,
      });
    }

    window.addEventListener('resize', updateSize);
    updateSize();

    return () => window.removeEventListener('resize', updateSize);
  }, []);

  return size;
}

export default function ImprovedPDFPreview({ pdfUrl }: PDFPreviewProps) {
  const [numPages, setNumPages] = useState<number>();
  const [pageNumber, setPageNumber] = useState(1);
  const [error, setError] = useState<string>();
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const viewport = useViewportSize();
  const encodedPdfUrl = encodeURI(pdfUrl);

  // Calculate optimal PDF width based on viewport
  const getPDFWidth = () => {
    if (viewport.isMobile) return Math.min(viewport.width - 32, 350); // Account for padding
    if (viewport.isTablet) return Math.min(viewport.width - 64, 500);
    return isFullscreen ? Math.min(viewport.width - 64, 800) : 600;
  };

  console.log('PDF.js version:', pdfjs.version);
  console.log('Original PDF URL:', pdfUrl);
  console.log('Encoded PDF URL:', encodedPdfUrl);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setError(undefined);
  }

  async function onDocumentLoadError(err: Error) {
    setError('Unable to load PDF preview. You can still download the file.');
    console.error('PDF load error:', err);
    console.error('Encoded PDF URL:', encodedPdfUrl);
    
    // Enhanced diagnostics
    try {
      const response = await fetch(encodedPdfUrl);
      const contentType = response.headers.get('content-type');
      
      if (!contentType?.includes('application/pdf')) {
        console.error('❌ Wrong content type! Expected application/pdf, got:', contentType);
        const text = await response.text();
        console.error('Response body (first 500 chars):', text.substring(0, 500));
      } else {
        console.log('✅ Content-Type is correct: application/pdf');
      }
    } catch (fetchError) {
      console.error('Failed to fetch URL for diagnostics:', fetchError);
    }
  }

  const goToPage = (page: number) => {
    setPageNumber(Math.max(1, Math.min(numPages || 1, page)));
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header with controls */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">
              🌟 Your Magical Story
            </h2>
            <p className="text-sm text-gray-600">
              Your personalized storybook is ready to read and share!
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              aria-label={isFullscreen ? 'Exit fullscreen view' : 'Enter fullscreen view'}
            >
              <span className="text-sm font-medium">
                {isFullscreen ? '📖 Normal View' : '🔍 Larger View'}
              </span>
            </button>
            
            <a
              href={encodedPdfUrl}
              download
              className="flex items-center justify-center px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-colors focus:ring-4 focus:ring-purple-300"
              aria-label="Download PDF story"
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">Download Story</span>
            </a>
          </div>
        </div>
      </div>

      {error ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
          <div className="text-yellow-800 mb-4">
            <div className="text-2xl mb-2">📱</div>
            <h3 className="font-semibold mb-2">Preview Not Available</h3>
            <p className="text-sm">{error}</p>
          </div>
          <a
            href={encodedPdfUrl}
            download
            className="inline-flex items-center px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
          >
            <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
            Download Your Story Instead
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {/* PDF Viewer */}
          <div className={`bg-white rounded-xl shadow-lg overflow-hidden ${
            isFullscreen ? 'fixed inset-4 z-50 flex flex-col' : ''
          }`}>
            {isFullscreen && (
              <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
                <h3 className="font-semibold">Story Preview</h3>
                <button
                  onClick={() => setIsFullscreen(false)}
                  className="p-2 hover:bg-gray-200 rounded-lg"
                  aria-label="Exit fullscreen"
                >
                  ✕
                </button>
              </div>
            )}
            
            <div className={`flex justify-center items-center ${
              isFullscreen ? 'flex-1 overflow-auto' : 'p-4 md:p-8'
            }`}>
              <Document
                file={encodedPdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={
                  <div className="flex flex-col items-center justify-center p-12 text-gray-500">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent mb-4" />
                    <p className="text-lg font-medium mb-2">Loading your story...</p>
                    <p className="text-sm">This may take a few moments</p>
                  </div>
                }
                error={
                  <div className="flex flex-col items-center justify-center p-12 text-red-600">
                    <div className="text-4xl mb-4">📚</div>
                    <h3 className="font-semibold mb-2">Oops! Preview Error</h3>
                    <p className="text-sm text-center mb-4">
                      We can't show the preview right now, but your story is ready to download!
                    </p>
                  </div>
                }
              >
                <Page
                  pageNumber={pageNumber}
                  width={getPDFWidth()}
                  className="shadow-lg rounded-lg"
                  renderTextLayer={!viewport.isMobile} // Improve mobile performance
                  renderAnnotationLayer={false} // Improve mobile performance
                />
              </Document>
            </div>
          </div>

          {/* Page Navigation */}
          {numPages && numPages > 1 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => goToPage(pageNumber - 1)}
                  disabled={pageNumber <= 1}
                  className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 transition-colors"
                  aria-label="Go to previous page"
                >
                  <ChevronLeftIcon className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Previous</span>
                </button>

                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium text-gray-700">
                    Page {pageNumber} of {numPages}
                  </span>
                  
                  {/* Quick page jumper for longer stories */}
                  {numPages > 2 && (
                    <select
                      value={pageNumber}
                      onChange={(e) => goToPage(parseInt(e.target.value))}
                      className="text-sm border border-gray-300 rounded px-2 py-1"
                      aria-label="Jump to page"
                    >
                      {Array.from({ length: numPages }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          Page {i + 1}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <button
                  onClick={() => goToPage(pageNumber + 1)}
                  disabled={pageNumber >= numPages}
                  className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 transition-colors"
                  aria-label="Go to next page"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRightIcon className="h-4 w-4 ml-1" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}