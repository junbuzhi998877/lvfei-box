const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { PDFDocument } = require('pdf-lib');
const PDFParser = require('pdf2json');

/**
 * PDF转OFD桥接模块
 * 负责Electron应用与Java转换服务的交互
 */
class PDFToOFDConverter {
  constructor() {
    // Java程序路径配置
    this.javaPath = 'java'; // 使用系统环境变量中的Java
    this.jarPath = path.join(__dirname, 'vendor', '003', 'target', 'pdf-to-ofd-converter-1.0-SNAPSHOT-jar-with-dependencies.jar');
    
    // 确保lib目录存在
    this.ensureLibDirExists();
  }
  
  /**
   * 确保lib目录存在
   */
  ensureLibDirExists() {
    const libDir = path.join(__dirname, 'lib');
    if (!fs.existsSync(libDir)) {
      fs.mkdirSync(libDir, { recursive: true });
    }
  }
  
  /**
   * 检查Java环境
   * @returns {Promise<boolean>} 是否可用
   */
  async checkJavaEnvironment() {
    try {
      const result = await new Promise((resolve, reject) => {
        const java = spawn(this.javaPath, ['-version']);
        let output = '';
        let error = '';

        java.stdout.on('data', (data) => {
          output += data.toString();
        });

        java.stderr.on('data', (data) => {
          // Java -version 通常输出到 stderr
          error += data.toString();
        });

        java.on('error', (err) => {
          console.error('Java环境检查失败：', err.message);
          reject(err);
        });

        java.on('close', (code) => {
          if (code === 0) {
            // Java版本信息通常在error中（这是正常的）
            const versionInfo = error || output;
            console.log('Java版本信息：', versionInfo);
            resolve(true);
          } else {
            console.error(`Java命令返回错误代码：${code}`);
            resolve(false);
          }
        });
      });

      return result;
    } catch (err) {
      console.error('检查Java环境时发生错误：', err);
      return false;
    }
  }
  
  /**
   * 检查JAR文件是否存在
   * @returns {boolean} 是否存在
   */
  checkJarFileExists() {
    if (!fs.existsSync(this.jarPath)) {
      console.log(`JAR文件不存在: ${this.jarPath}`);
      
      // 尝试备选路径
      const alternativePaths = [
        path.join(__dirname, 'vendor', '003', 'target', 'pdf-to-ofd-converter-1.0-SNAPSHOT-jar-with-dependencies.jar'),
        path.join(process.resourcesPath || __dirname, 'vendor', '003', 'target', 'pdf-to-ofd-converter-1.0-SNAPSHOT-jar-with-dependencies.jar'),
        path.join(process.resourcesPath || __dirname, 'app.asar.unpacked', 'vendor', '003', 'target', 'pdf-to-ofd-converter-1.0-SNAPSHOT-jar-with-dependencies.jar')
      ];
      
      for (const altPath of alternativePaths) {
        console.log(`检查备选JAR路径: ${altPath}`);
        if (fs.existsSync(altPath)) {
          console.log(`找到备选JAR路径: ${altPath}`);
          this.jarPath = altPath; // 更新路径
          return true;
        }
      }
      
      return false;
    }
    return true;
  }
  
  /**
   * 转换PDF为OFD
   * @param {string} inputPath PDF文件路径
   * @param {string} outputPath OFD输出路径（可选，默认与输入文件同目录同名.ofd）
   * @param {object} options 转换选项
   * @returns {Promise<object>} 转换结果
   */
  async convertPDFToOFD(inputPath, outputPath = null, options = {}) {
    // 记录开始时间
    const startTime = Date.now();
    console.log(`开始转换PDF到OFD: ${inputPath}`);

    try {
      // 检查输入文件
      if (!fs.existsSync(inputPath)) {
        throw new Error(`输入文件不存在: ${inputPath}`);
      }
      
      // 检查文件大小
      const stats = fs.statSync(inputPath);
      const fileSizeMB = stats.size / (1024 * 1024);
      console.log(`PDF文件大小: ${fileSizeMB.toFixed(2)} MB`);
      
      // 检查Java环境
      const javaAvailable = await this.checkJavaEnvironment();
      if (!javaAvailable) {
        throw new Error('Java环境未正确配置，请安装或配置Java 8或更高版本');
      }
      
      // 检查JAR文件
      if (!this.checkJarFileExists()) {
        throw new Error(`转换器JAR文件不存在: ${this.jarPath}`);
      }
      
      // 输出路径未指定时，使用默认路径
      if (!outputPath) {
        outputPath = inputPath.replace(/\.pdf$/i, '.ofd');
      }
      
      // 确保输出目录存在
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
        console.log(`创建输出目录: ${outputDir}`);
      }
      
      // 如果是发票，进行特殊处理
      let isInvoice = options.isInvoice;
      if (!isInvoice) {
        isInvoice = await this.detectInvoice(inputPath);
        if (isInvoice) {
          console.log(`检测到文件可能是发票，将使用发票专用处理模式`);
        }
      }
      
      // 创建转换进程
      const result = await this.runConversionProcess(inputPath, outputPath, { 
        ...options, 
        isInvoice 
      });
      
      // 检查转换结果
      if (!result.success) {
        throw new Error(`转换失败: ${result.error}`);
      }
      
      // 计算耗时
      const endTime = Date.now();
      const timeUsed = (endTime - startTime) / 1000;
      
      console.log(`PDF转OFD成功: ${outputPath}, 耗时${timeUsed.toFixed(2)}秒`);
      
      return {
        success: true,
        outputPath,
        timeUsed,
        isInvoice
      };
    } catch (error) {
      console.error(`PDF转OFD失败: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * 运行转换进程
   * @private
   */
  async runConversionProcess(inputPath, outputPath, options) {
    // 转换参数
    const args = ['-jar', this.jarPath, inputPath];
    
    // 指定输出路径
    if (outputPath !== inputPath.replace(/\.pdf$/i, '.ofd')) {
      args.push('--output', outputPath);
    }
    
    // 附加选项
    if (options.preserveSignatures) {
      args.push('--preserve-signatures');
    }
    
    if (options.conformance) {
      args.push('--conformance', options.conformance);
    }
    
    if (options.isInvoice) {
      args.push('--invoice');
    }
    
    // 创建临时文件存储转换日志
    const tempLogFile = path.join(os.tmpdir(), `pdf-to-ofd-${Date.now()}.log`);
    
    console.log(`执行命令: ${this.javaPath} ${args.join(' ')}`);
    
    // 返回转换Promise
    return new Promise((resolve, reject) => {
      const java = spawn(this.javaPath, args);
      
      // 收集输出
      let stdout = '';
      let stderr = '';
      
      java.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        console.log(`[Java输出] ${output.trim()}`);
      });
      
      java.stderr.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        console.error(`[Java错误] ${output.trim()}`);
      });
      
      // 进程结束
      java.on('close', (code) => {
        if (code === 0) {
          resolve({
            success: true,
            outputPath,
            log: stdout
          });
        } else {
          // 记录详细错误
          fs.writeFileSync(tempLogFile, `STDOUT:\n${stdout}\n\nSTDERR:\n${stderr}`);
          
          const error = {
            success: false,
            code,
            error: stderr || '未知错误',
            log: stdout,
            logFile: tempLogFile
          };
          
          console.error(`转换失败，错误代码: ${code}, 日志文件: ${tempLogFile}`);
          
          // 如果输出文件存在但内容为空或非常小，也认为是失败
          if (fs.existsSync(outputPath)) {
            const outputStats = fs.statSync(outputPath);
            if (outputStats.size < 100) { // 小于100字节可能是空OFD
              console.error(`输出文件过小(${outputStats.size}字节)，可能是空文件`);
              error.error += '. 输出文件异常小，可能是空OFD文件';
            }
          }
          
          reject(error);
        }
      });
      
      // 进程错误
      java.on('error', (err) => {
        console.error(`启动Java进程失败: ${err.message}`);
        reject({
          success: false,
          error: `启动Java进程失败: ${err.message}`
        });
      });
    });
  }
  
  /**
   * 批量转换PDF为OFD
   * @param {Array<object>} files 文件列表，每项包含{inputPath, outputPath, options}
   * @param {number} concurrency 并发数，默认为2
   * @returns {Promise<object>} 批量转换结果
   */
  async batchConvert(files, concurrency = 2) {
    console.log(`批量转换开始，共${files.length}个文件，并发数${concurrency}`);
    
    // 检查Java环境
    const javaAvailable = await this.checkJavaEnvironment();
    if (!javaAvailable) {
      return {
        success: false,
        error: 'Java环境未正确配置，请安装或配置Java 8或更高版本'
      };
    }
    
    // 检查JAR文件
    if (!this.checkJarFileExists()) {
      return {
        success: false,
        error: `转换器JAR文件不存在: ${this.jarPath}`
      };
    }
    
    // 批量处理结果
    const results = {
      success: true,
      totalFiles: files.length,
      successCount: 0,
      failedCount: 0,
      details: [],
      startTime: Date.now()
    };
    
    // 利用Promise.all和数组分块实现并发控制
    for (let i = 0; i < files.length; i += concurrency) {
      const chunk = files.slice(i, i + concurrency);
      console.log(`处理第${i+1}到${Math.min(i+concurrency, files.length)}个文件`);
      
      const promises = chunk.map(file => 
        this.convertPDFToOFD(file.inputPath, file.outputPath, file.options)
          .then(result => {
            results.successCount++;
            results.details.push({
              inputPath: file.inputPath,
              outputPath: result.outputPath,
              success: true,
              timeUsed: result.timeUsed,
              isInvoice: result.isInvoice
            });
            return result;
          })
          .catch(error => {
            results.failedCount++;
            results.success = false;
            results.details.push({
              inputPath: file.inputPath,
              success: false,
              error: error.error || '未知错误'
            });
            return error;
          })
      );
      
      // 等待当前批次完成
      await Promise.all(promises);
    }
    
    // 计算总耗时
    results.endTime = Date.now();
    results.totalTime = results.endTime - results.startTime;
    
    console.log(`批量转换完成，成功${results.successCount}个，失败${results.failedCount}个，总耗时${(results.totalTime/1000).toFixed(2)}秒`);
    
    return results;
  }
  
  /**
   * 检测PDF是否为发票
   * 通过关键词检测，判断PDF是否为发票类型
   * @param {string} pdfPath PDF文件路径
   * @returns {Promise<boolean>} 是否为发票
   */
  async detectInvoice(pdfPath) {
    console.log(`检测PDF是否为发票: ${pdfPath}`);
    
    try {
      // 检查文件名是否包含发票相关关键词
      const filename = path.basename(pdfPath).toLowerCase();
      const filenameMatch = filename.includes('invoice') || 
        filename.includes('发票') || 
        filename.includes('fapiao') ||
        filename.includes('fpdm'); // 发票代码缩写
        
      if (filenameMatch) {
        console.log(`根据文件名判断可能是发票: ${filename}`);
        return true;
      }
      
      // 进一步分析PDF内容
      const isInvoiceContent = await this.analyzeInvoiceContent(pdfPath);
      
      console.log(`PDF内容分析结果: ${isInvoiceContent ? '是发票' : '不是发票'}`);
      return isInvoiceContent;
    } catch (error) {
      console.error(`检测发票时出错: ${error.message}`);
      // 出错时默认返回false，避免错误地使用发票专用处理
      return false;
    }
  }
  
  /**
   * 分析PDF内容判断是否为发票
   * @private
   */
  async analyzeInvoiceContent(pdfPath) {
    return new Promise((resolve, reject) => {
      try {
        const pdfParser = new PDFParser();
        
        pdfParser.on('pdfParser_dataReady', (data) => {
          try {
            // 如果PDF有页面
            if (data.Pages && data.Pages.length > 0) {
              // 发票关键词
              const invoiceKeywords = [
                '发票', '税额', '税率', '价税合计', '购买方', '销售方', 
                '开票日期', '发票代码', '发票号码', '校验码', '机器编号',
                '增值税', '普通发票', '专用发票', '电子发票'
              ];
              
              // 汇总所有页面的文本
              let allText = '';
              data.Pages.forEach(page => {
                if (page.Texts && page.Texts.length > 0) {
                  page.Texts.forEach(textItem => {
                    if (textItem.R && textItem.R.length > 0) {
                      textItem.R.forEach(r => {
                        if (r.T) {
                          try {
                            const decodedText = decodeURIComponent(r.T);
                            allText += decodedText + ' ';
                          } catch (e) {
                            // 忽略解码错误
                          }
                        }
                      });
                    }
                  });
                }
              });
              
              // 检查文本是否包含发票关键词
              const keywordMatches = invoiceKeywords.filter(keyword => 
                allText.includes(keyword)
              );
              
              // 如果匹配到至少3个关键词，判断为发票
              const isInvoice = keywordMatches.length >= 3;
              
              if (isInvoice) {
                console.log(`发票关键词匹配: ${keywordMatches.join(', ')}`);
              }
              
              resolve(isInvoice);
            } else {
              resolve(false);
            }
          } catch (error) {
            console.error(`解析PDF内容时出错: ${error.message}`);
            resolve(false);
          }
        });
        
        pdfParser.on('pdfParser_dataError', (error) => {
          console.error(`PDF解析错误: ${error}`);
          resolve(false);
        });
        
        pdfParser.loadPDF(pdfPath);
      } catch (error) {
        console.error(`PDF解析过程中出错: ${error.message}`);
        resolve(false);
      }
    });
  }
}

module.exports = new PDFToOFDConverter();
