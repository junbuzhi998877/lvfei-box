import type { RcFile } from 'antd/es/upload/interface';

export interface PdfFile extends Omit<RcFile, 'path'> {
  path?: string;
  originFileObj?: {
    path: string;
  } & File;
}

export interface ConversionOptions {
  conformance: 'basic' | 'standard' | 'enhanced';
  preserveSignatures: boolean;
  isInvoice: boolean;
}

export interface ConversionResult {
  success: boolean;
  outputPath?: string;
  pageCount?: number;
  conversionTime?: number;
  fileSize?: number;
  error?: string;
} 