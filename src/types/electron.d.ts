export interface ElectronAPI {
  getAppInfo: () => Promise<any>;
  convertPDF: (options: {
    inputPath: string;
    outputPath: string;
    type: string;
    options?: any;
  }) => Promise<{
    success: boolean;
    error?: string;
    outputPath?: string;
    pageCount?: number;
    conversionTime?: number;
    fileSize?: number;
  }>;
  convertPDFBatch: (options: any) => Promise<any>;
  convertPDFBatchToOFD: (options: any) => Promise<any>;
  detectInvoice: (options: {
    pdfPath: string;
  }) => Promise<{
    success: boolean;
    isInvoice: boolean;
    error?: string;
  }>;
  compressImage: (options: any) => Promise<any>;
  processImage: (options: any) => Promise<any>;
  generateQR: (options: any) => Promise<any>;
  saveQR: (options: any) => Promise<any>;
  saveBatchQR: (options: any) => Promise<any>;
  selectSavePath: (options: {
    defaultName: string;
  }) => Promise<{
    success: boolean;
    filePath?: string;
    error?: string;
  }>;
  uploadImage: (options: any) => Promise<any>;
  saveBatchImages: (options: any) => Promise<any>;
  checkJavaEnvironment: () => Promise<any>;
  deleteFile: (filePath: string) => Promise<any>;
  onMenuAction?: (callback: (action: string | {action: string, [key: string]: any}) => void) => (() => void);
  onFileOpened?: (callback: (fileInfo: {path: string}) => void) => (() => void);
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {}; 