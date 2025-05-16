import { OfdConverter } from '../services/OfdConverter';
import * as fs from 'fs/promises';
import * as path from 'path';

async function main() {
  if (process.argv.length < 3) {
    console.log('用法: node pdf2ofd.js <PDF文件路径> [输出目录]');
    process.exit(1);
  }

  const inputPath = process.argv[2];
  const outputDir = process.argv[3] || path.dirname(inputPath);
  const outputPath = path.join(outputDir, path.basename(inputPath, '.pdf') + '.ofd');

  try {
    console.log('正在读取PDF文件...');
    const pdfBuffer = await fs.readFile(inputPath);

    console.log('初始化转换器...');
    const converter = new OfdConverter();

    console.log('检测是否为发票...');
    const isInvoice = await converter.detectInvoice(pdfBuffer);
    console.log(isInvoice ? '检测到发票格式' : '普通PDF文档');

    console.log('开始转换...');
    const startTime = Date.now();
    const ofdBuffer = await converter.convertToOFD(pdfBuffer, { isInvoice });
    const endTime = Date.now();

    console.log('保存OFD文件...');
    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(outputPath, ofdBuffer);

    console.log('转换完成！');
    console.log(`输出文件: ${outputPath}`);
    console.log(`转换用时: ${(endTime - startTime) / 1000} 秒`);
    console.log(`文件大小: ${(ofdBuffer.length / 1024).toFixed(2)} KB`);
  } catch (error) {
    console.error('转换失败:', error);
    process.exit(1);
  }
}

main(); 