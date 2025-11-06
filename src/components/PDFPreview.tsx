import { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF.js worker for Vite + React
// Use the worker version that matches react-pdf's bundled pdfjs-dist
// This ensures API and Worker versions are compatible
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

interface PDFPreviewProps {
  pdfUrl: string;
}

export default function PDFPreview({ pdfUrl }: PDFPreviewProps) {
  const [numPages, setNumPages] = useState<number>();
  const [pageNumber, setPageNumber] = useState(1);
  const [error, setError] = useState<string>();

  // Keyboard navigation for PDF pages
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!numPages) return;
      
      switch (event.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          event.preventDefault();
          setPageNumber(page => Math.max(1, page - 1));
          break;
        case 'ArrowRight':
        case 'ArrowDown':
          event.preventDefault();
          setPageNumber(page => Math.min(numPages, page + 1));
          break;
        case 'Home':
          event.preventDefault();
          setPageNumber(1);
          break;
        case 'End':
          event.preventDefault();
          setPageNumber(numPages);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [numPages]);

  // Properly encode URL with Cyrillic characters
  const encodedPdfUrl = encodeURI(pdfUrl);
  
  // Log version info for debugging
  console.log('PDF.js version:', pdfjs.version);
  console.log('Worker source:', pdfjs.GlobalWorkerOptions.workerSrc);
  console.log('Original PDF URL:', pdfUrl);
  console.log('Encoded PDF URL:', encodedPdfUrl);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setError(undefined);
  }

  async function onDocumentLoadError(err: Error) {
    setError('Error loading PDF. Please try downloading instead.');
    console.error('PDF load error:', err);
    console.error('Original PDF URL:', pdfUrl);
    console.error('Encoded PDF URL:', encodedPdfUrl);
    console.error('Worker src:', pdfjs.GlobalWorkerOptions.workerSrc);
    console.error('PDF.js version:', pdfjs.version);
    
    // Check for version mismatch
    if (err.message.includes('API version') && err.message.includes('Worker version')) {
      console.error('Version mismatch detected - this indicates worker and API version incompatibility');
    }

    // Fetch the URL to see what we're actually getting
    try {
      console.log('Fetching URL to check response...');
      const response = await fetch(encodedPdfUrl);
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      const contentType = response.headers.get('content-type');
      console.log('Content-Type:', contentType);
      
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

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4" role="region" aria-labelledby="story-preview-heading">
      <div className="flex justify-between items-center">
        <h2 id="story-preview-heading" className="text-xl font-semibold">Your Generated Story</h2>
        <a
          href={encodedPdfUrl}
          download
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-300"
          aria-label="Download your story as a PDF file"
        >
          Download PDF
        </a>
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
            <Document
              file={encodedPdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={
                <div className="flex justify-center items-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                  <span className="ml-2">Loading PDF...</span>
                </div>
              }
              error={
                <div className="flex justify-center p-8 text-red-600">
                  <div className="text-center">
                    <p>Failed to load PDF preview.</p>
                    <p className="text-sm mt-2">Please use the download button above.</p>
                  </div>
                </div>
              }
            >
              <Page
                pageNumber={pageNumber}
                width={window.innerWidth > 768 ? 600 : undefined}
                className="mx-auto"
              />
            </Document>
          </div>

          {numPages && (
            <nav className="flex justify-center items-center space-x-4" aria-label="PDF page navigation">
              <button
                onClick={() => setPageNumber(page => Math.max(1, page - 1))}
                disabled={pageNumber <= 1}
                className="px-3 py-1 bg-gray-100 rounded-md disabled:opacity-50 focus:ring-2 focus:ring-blue-300"
                aria-label="Go to previous page"
              >
                Previous
              </button>
              <span className="text-sm" role="status" aria-live="polite">
                Page {pageNumber} of {numPages}
              </span>
              <button
                onClick={() => setPageNumber(page => Math.min(numPages, page + 1))}
                disabled={pageNumber >= numPages}
                className="px-3 py-1 bg-gray-100 rounded-md disabled:opacity-50 focus:ring-2 focus:ring-blue-300"
                aria-label="Go to next page"
              >
                Next
              </button>
            </nav>
          )}
          
          {/* Keyboard shortcuts help */}
          <div className="text-center mt-4">
            <details className="inline-block">
              <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                📚 Keyboard Shortcuts
              </summary>
              <div className="mt-2 text-xs text-gray-600 bg-gray-50 rounded-lg p-3">
                <div className="grid grid-cols-2 gap-2 text-left">
                  <div><kbd className="bg-white px-1 rounded border">←→</kbd> Previous/Next page</div>
                  <div><kbd className="bg-white px-1 rounded border">↑↓</kbd> Previous/Next page</div>
                  <div><kbd className="bg-white px-1 rounded border">Home</kbd> First page</div>
                  <div><kbd className="bg-white px-1 rounded border">End</kbd> Last page</div>
                </div>
              </div>
            </details>
          </div>
        </div>
      )}
    </div>
  );
}