import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import * as path from 'path';
import * as fs from 'fs/promises';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

interface ConversionOptions {
  isInvoice?: boolean;
  preserveSignatures?: boolean;
  conformance?: 'basic' | 'standard' | 'enhanced';
}

export class OfdConverter {
  private javaPath: string;
  private converterJarPath: string;
  
  constructor() {
    // 设置Java路径和转换器JAR路径
    this.javaPath = 'java';
    this.converterJarPath = path.join(__dirname, '../../vendor/ofdrw/converter.jar');
    
    // 设置PDF.js worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = require('pdfjs-dist/build/pdf.worker.entry');
  }

  /**
   * 检测PDF是否为发票
   * @param pdfBuffer PDF文件的Buffer
   */
  public async detectInvoice(pdfBuffer: Buffer): Promise<boolean> {
    try {
      const pdf = await pdfjsLib.getDocument(pdfBuffer).promise;
      const page = await pdf.getPage(1);
      const textContent = await page.getTextContent();
      const text = textContent.items.map((item: any) => item.str).join(' ');

      // 发票关键词检测
      const keywords = ['发票代码', '发票号码', '税率', '价税合计'];
      const matchCount = keywords.filter(keyword => text.includes(keyword)).length;
      
      // 如果匹配3个以上关键词，认为是发票
      return matchCount >= 3;
    } catch (error) {
      console.error('发票检测失败:', error);
      return false;
    }
  }

  /**
   * 转换PDF到OFD
   * @param pdfBuffer PDF文件的Buffer
   * @param options 转换选项
   */
  public async convertToOFD(
    pdfBuffer: Buffer,
    options: ConversionOptions = {}
  ): Promise<Buffer> {
    try {
      // 1. 创建临时文件
      const tempDir = path.join(__dirname, '../../temp');
      await fs.mkdir(tempDir, { recursive: true });
      
      const tempPdfPath = path.join(tempDir, `temp_${Date.now()}.pdf`);
      const tempOfdPath = path.join(tempDir, `temp_${Date.now()}.ofd`);
      
      // 2. 保存PDF到临时文件
      await fs.writeFile(tempPdfPath, pdfBuffer);

      // 3. 使用Java转换器转换
      const args = [
        '-jar',
        this.converterJarPath,
        'convert',
        '--input', tempPdfPath,
        '--output', tempOfdPath
      ];

      if (options.isInvoice) {
        args.push('--type', 'invoice');
      }

      if (options.conformance) {
        args.push('--conformance', options.conformance);
      }

      // 4. 执行转换
      await execFileAsync(this.javaPath, args);

      // 5. 读取转换后的OFD文件
      const ofdBuffer = await fs.readFile(tempOfdPath);

      // 6. 清理临时文件
      await Promise.all([
        fs.unlink(tempPdfPath),
        fs.unlink(tempOfdPath)
      ]);

      return ofdBuffer;
    } catch (error) {
      console.error('PDF转OFD失败:', error);
      throw new Error(`PDF转OFD失败: ${error}`);
    }
  }

  /**
   * 批量转换PDF到OFD
   * @param files 文件列表
   * @param options 转换选项
   */
  public async batchConvert(
    files: { buffer: Buffer; name: string }[],
    options: ConversionOptions = {}
  ): Promise<{ name: string; buffer: Buffer }[]> {
    const results = [];
    
    for (const file of files) {
      try {
        const ofdBuffer = await this.convertToOFD(file.buffer, options);
        results.push({
          name: file.name.replace(/\.pdf$/i, '.ofd'),
          buffer: ofdBuffer
        });
      } catch (error) {
        console.error(`转换文件 ${file.name} 失败:`, error);
      }
    }
    
    return results;
  }
} 