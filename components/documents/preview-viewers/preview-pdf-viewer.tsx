"use client";

import { useState } from "react";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

import { DocumentPreviewData } from "@/lib/types/document-preview";

import { Button } from "@/components/ui/button";
import LoadingSpinner from "@/components/ui/loading-spinner";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PreviewPdfViewerProps {
  documentData: DocumentPreviewData;
  onClose: () => void;
}

export function PreviewPdfViewer({
  documentData,
  onClose,
}: PreviewPdfViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [loading, setLoading] = useState(true);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setLoading(false);
  }

  function onDocumentLoadError(error: Error) {
    console.error("Error loading PDF:", error);
    setLoading(false);
  }

  function goToNextPage() {
    if (pageNumber >= numPages) return;
    setPageNumber((prev) => prev + 1);
  }

  function goToPreviousPage() {
    if (pageNumber <= 1) return;
    setPageNumber((prev) => prev - 1);
  }

  const options = {
    cMapUrl: "cmaps/",
    cMapPacked: true,
    standardFontDataUrl: "standard_fonts/",
  };

  return (
    <div className="flex h-full w-full flex-col">
      {loading && (
        <div className="flex h-full w-full items-center justify-center">
          <div className="text-center">
            <LoadingSpinner className="mx-auto h-8 w-8 text-white" />
            <p className="mt-2 text-sm text-gray-400">Loading PDF...</p>
          </div>
        </div>
      )}

      <div
        className={`flex flex-1 items-center justify-center overflow-hidden ${loading ? "hidden" : ""}`}
      >
        <div className="absolute z-10 flex w-full items-center justify-between px-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={goToPreviousPage}
            disabled={pageNumber <= 1}
            className="h-12 w-12 rounded-full bg-black/20 text-gray-400 hover:bg-black/40 hover:text-white disabled:opacity-30"
          >
            <ChevronLeftIcon className="h-8 w-8" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={goToNextPage}
            disabled={pageNumber >= numPages}
            className="h-12 w-12 rounded-full bg-black/20 text-gray-400 hover:bg-black/40 hover:text-white disabled:opacity-30"
          >
            <ChevronRightIcon className="h-8 w-8" />
          </Button>
        </div>

        <div className="flex h-full items-center justify-center overflow-auto">
          <Document
            file={documentData.file}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            options={options}
            loading={null}
            className="flex items-center justify-center"
          >
            <Page
              key={pageNumber}
              pageNumber={pageNumber}
              renderAnnotationLayer={false}
              renderTextLayer={false}
              className="shadow-lg"
              width={Math.min(window.innerWidth * 0.7, 900)}
            />
          </Document>
        </div>
      </div>

      {!loading && numPages > 0 && (
        <div className="flex items-center justify-center gap-4 bg-gray-800/50 py-3">
          <span className="text-sm text-gray-300">
            Page {pageNumber} of {numPages}
          </span>
        </div>
      )}
    </div>
  );
}
