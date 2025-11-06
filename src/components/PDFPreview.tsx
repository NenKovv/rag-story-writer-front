import { useState } from 'react';
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
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Your Generated Story</h2>
        <a
          href={encodedPdfUrl}
          download
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
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
            <div className="flex justify-center items-center space-x-4">
              <button
                onClick={() => setPageNumber(page => Math.max(1, page - 1))}
                disabled={pageNumber <= 1}
                className="px-3 py-1 bg-gray-100 rounded-md disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm">
                Page {pageNumber} of {numPages}
              </span>
              <button
                onClick={() => setPageNumber(page => Math.min(numPages, page + 1))}
                disabled={pageNumber >= numPages}
                className="px-3 py-1 bg-gray-100 rounded-md disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}