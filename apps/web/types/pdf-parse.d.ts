declare module 'pdf-parse/lib/pdf-parse.js' {
  import { Buffer } from 'node:buffer';

  interface PdfParseOptions {
    max?: number;
    pagerender?(pageData: { pageNumber: number; textContent: { items: Array<{ str: string }> } }): string;
    version?: string;
  }

  interface PdfParseResult {
    numpages: number;
    numrender: number;
    info: Record<string, unknown>;
    metadata: Record<string, unknown>;
    text: string;
  }

  export default function pdfParse(
    buffer: Buffer,
    options?: PdfParseOptions
  ): Promise<PdfParseResult>;
}
