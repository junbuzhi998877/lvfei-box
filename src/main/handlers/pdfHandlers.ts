import { ipcMain } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';
import { OfdConverter } from '../../services/OfdConverter';

const ofdConverter = new OfdConverter();

export function setupPdfHandlers() {
  // 检测PDF是否为发票
  ipcMain.handle('detect-invoice', async (event, { pdfPath }) => {
    try {
      const pdfBuffer = await fs.readFile(pdfPath);
      const isInvoice = await ofdConverter.detectInvoice(pdfBuffer);
      return { success: true, isInvoice };
    } catch (error: any) {
      console.error('发票检测失败:', error);
      return { success: false, error: error.message };
    }
  });

  // PDF转OFD
  ipcMain.handle('convert-pdf', async (event, {
    inputPath,
    outputPath,
    type,
    options = {}
  }) => {
    try {
      // 只处理OFD转换
      if (type !== 'ofd') {
        throw new Error('不支持的转换类型');
      }

      // 读取PDF文件
      const pdfBuffer = await fs.readFile(inputPath);
      
      // 转换为OFD
      const ofdBuffer = await ofdConverter.convertToOFD(pdfBuffer, {
        isInvoice: options.isInvoice,
        preserveSignatures: options.preserveSignatures,
        conformance: options.conformance
      });

      // 确保输出目录存在
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      
      // 保存OFD文件
      await fs.writeFile(outputPath, ofdBuffer);

      return {
        success: true,
        outputPath,
        pageCount: 1, // TODO: 获取实际页数
        conversionTime: 0, // TODO: 计算实际转换时间
        fileSize: ofdBuffer.length
      };
    } catch (error: any) {
      console.error('PDF转换失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 批量转换
  ipcMain.handle('convert-pdf-batch', async (event, { files }) => {
    const results = [];
    let totalTime = 0;
    let successCount = 0;
    let failedCount = 0;

    for (const file of files) {
      try {
        const startTime = Date.now();
        
        // 读取PDF文件
        const pdfBuffer = await fs.readFile(file.inputPath);
        
        // 转换为OFD
        const ofdBuffer = await ofdConverter.convertToOFD(pdfBuffer, file.options);
        
        // 确保输出目录存在
        await fs.mkdir(path.dirname(file.outputPath), { recursive: true });
        
        // 保存OFD文件
        await fs.writeFile(file.outputPath, ofdBuffer);

        const conversionTime = Date.now() - startTime;
        totalTime += conversionTime;
        successCount++;

        results.push({
          inputPath: file.inputPath,
          outputPath: file.outputPath,
          success: true
        });
      } catch (error: any) {
        failedCount++;
        results.push({
          inputPath: file.inputPath,
          outputPath: file.outputPath,
          success: false,
          error: error.message
        });
      }
    }

    return {
      success: true,
      results,
      totalTime,
      successCount,
      failedCount
    };
  });
} 