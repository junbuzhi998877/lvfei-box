import * as java from 'java';
import * as path from 'path';
import * as fs from 'fs/promises';

// 配置Java类路径
java.classpath.push(path.join(__dirname, '../lib/ofdrw-converter-2.1.0.jar'));

export class PdfToOfdConverter {
  private static instance: PdfToOfdConverter;
  private converter: any;

  private constructor() {
    // 初始化Java转换器
    this.converter = java.newInstanceSync('org.ofdrw.converter.PdfToOfdConverter');
  }

  public static getInstance(): PdfToOfdConverter {
    if (!PdfToOfdConverter.instance) {
      PdfToOfdConverter.instance = new PdfToOfdConverter();
    }
    return PdfToOfdConverter.instance;
  }

  /**
   * 将PDF文件转换为OFD
   * @param pdfPath PDF文件路径
   * @param ofdPath 输出OFD文件路径
   */
  public async convert(pdfPath: string, ofdPath: string): Promise<void> {
    try {
      // 检查文件是否存在
      await fs.access(pdfPath);
      
      // 创建输出目录
      await fs.mkdir(path.dirname(ofdPath), { recursive: true });

      // 执行转换
      await new Promise((resolve, reject) => {
        this.converter.convert(pdfPath, ofdPath, (err: Error) => {
          if (err) {
            reject(err);
          } else {
            resolve(true);
          }
        });
      });
    } catch (error) {
      throw new Error(`转换失败: ${error.message}`);
    }
  }

  /**
   * 检测PDF是否为发票
   * @param pdfPath PDF文件路径
   */
  public async isInvoice(pdfPath: string): Promise<boolean> {
    try {
      // 读取PDF文件
      const pdfContent = await fs.readFile(pdfPath, 'utf-8');
      
      // 发票关键词
      const keywords = ['发票代码', '发票号码', '税率', '价税合计'];
      
      // 检查是否包含发票关键词
      return keywords.some(keyword => pdfContent.includes(keyword));
    } catch (error) {
      throw new Error(`检测失败: ${error.message}`);
    }
  }
} 