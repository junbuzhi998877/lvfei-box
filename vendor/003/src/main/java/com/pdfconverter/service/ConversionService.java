package com.pdfconverter.service;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.poi.xwpf.usermodel.*;
import org.apache.poi.util.Units;
import org.ofdrw.converter.ofdconverter.PDFConverter;
import org.ofdrw.converter.ConvertHelper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;

public class ConversionService {
    private static final Logger logger = LoggerFactory.getLogger(ConversionService.class);
    private final ExecutorService executorService;

    public ConversionService() {
        // 创建线程池，核心线程数为可用处理器数量
        this.executorService = Executors.newFixedThreadPool(
            Runtime.getRuntime().availableProcessors()
        );
    }

    public interface ConversionProgressListener {
        void onProgress(int progress);
        void onComplete(String message);
        void onError(String error);
        void onBatchProgress(int fileIndex, int totalFiles, String currentFile);
    }

    public void convertPDFToImages(File pdfFile, String outputDir, String format, ConversionProgressListener listener) {
        try {
            PDDocument document = PDDocument.load(pdfFile);
            PDFRenderer renderer = new PDFRenderer(document);
            int pageCount = document.getNumberOfPages();
            
            new File(outputDir).mkdirs();
            
            for (int i = 0; i < pageCount; i++) {
                BufferedImage image = renderer.renderImageWithDPI(i, 300);
                File outputFile = new File(outputDir, String.format("page_%d.%s", i + 1, format.toLowerCase()));
                ImageIO.write(image, format, outputFile);
                
                int progress = (i + 1) * 100 / pageCount;
                listener.onProgress(progress);
            }
            
            document.close();
            listener.onComplete("转换完成");
            
        } catch (Exception e) {
            logger.error("PDF转图片失败", e);
            listener.onError("转换失败: " + e.getMessage());
        }
    }

    public void convertPDFToWord(File pdfFile, File outputFile, ConversionProgressListener listener) {
        try (PDDocument document = PDDocument.load(pdfFile)) {
            XWPFDocument docx = new XWPFDocument();
            PDFRenderer pdfRenderer = new PDFRenderer(document);
            int numberOfPages = document.getNumberOfPages();
            
            for (int page = 0; page < numberOfPages; page++) {
                BufferedImage bim = pdfRenderer.renderImageWithDPI(page, 300);
                
                // 创建临时图片文件
                File tempFile = File.createTempFile("page_" + page + "_", ".png");
                ImageIO.write(bim, "png", tempFile);
                
                // 添加图片到Word文档
                XWPFParagraph paragraph = docx.createParagraph();
                paragraph.setAlignment(ParagraphAlignment.CENTER);
                paragraph.setSpacingBefore(0);
                paragraph.setSpacingAfter(0);
                
                XWPFRun run = paragraph.createRun();
                
                // 使用FileInputStream读取图片
                try (FileInputStream fis = new FileInputStream(tempFile)) {
                    run.addPicture(
                        fis,
                        XWPFDocument.PICTURE_TYPE_PNG,
                        tempFile.getName(),
                        Units.toEMU(bim.getWidth()),
                        Units.toEMU(bim.getHeight())
                    );
                }
                
                // 删除临时文件
                tempFile.delete();
                
                // 更新进度
                int progress = (int) ((page + 1) / (double) numberOfPages * 100);
                listener.onProgress(progress);
            }
            
            // 保存Word文档
            try (FileOutputStream out = new FileOutputStream(outputFile)) {
                docx.write(out);
            }
            
            listener.onComplete("转换完成");
        } catch (Exception e) {
            logger.error("PDF转Word时发生错误", e);
            listener.onError(e.getMessage());
        }
    }

    public void convertPDFToOFD(File pdfFile, File outputFile, ConversionProgressListener listener) {
        try {
            // 确保输出目录存在
            outputFile.getParentFile().mkdirs();
            
            // 使用PDFConverter进行转换
            Path pdfPath = pdfFile.toPath();
            Path ofdPath = outputFile.toPath();
            
            try (PDFConverter converter = new PDFConverter(ofdPath)) {
                converter.convert(pdfPath);
                listener.onProgress(100);
                listener.onComplete("转换完成");
            }
        } catch (Exception e) {
            logger.error("PDF转OFD时发生错误", e);
            listener.onError(e.getMessage());
        }
    }

    public void shutdown() {
        executorService.shutdown();
        try {
            if (!executorService.awaitTermination(60, TimeUnit.SECONDS)) {
                executorService.shutdownNow();
            }
        } catch (InterruptedException e) {
            executorService.shutdownNow();
            Thread.currentThread().interrupt();
        }
    }

    public void batchConvertPDFToOFD(List<File> pdfFiles, String outputDir, ConversionProgressListener listener) {
        int totalFiles = pdfFiles.size();
        CountDownLatch latch = new CountDownLatch(totalFiles);
        
        for (int i = 0; i < totalFiles; i++) {
            final int fileIndex = i + 1;
            final File pdfFile = pdfFiles.get(i);
            
            executorService.submit(() -> {
                try {
                    listener.onBatchProgress(fileIndex, totalFiles, pdfFile.getName());
                    
                    File outputFile = new File(outputDir, 
                        pdfFile.getName().replaceFirst("(?i)\\.pdf$", ".ofd"));
                    
                    // 确保输出目录存在
                    outputFile.getParentFile().mkdirs();
                    
                    // 使用PDFConverter进行转换
                    Path pdfPath = pdfFile.toPath();
                    Path ofdPath = outputFile.toPath();
                    
                    try (PDFConverter converter = new PDFConverter(ofdPath)) {
                        converter.convert(pdfPath);
                    }
                    
                    listener.onProgress((int) ((fileIndex / (double) totalFiles) * 100));
                    listener.onComplete("文件 " + pdfFile.getName() + " 转换完成");
                } catch (Exception e) {
                    logger.error("转换文件 {} 时发生错误", pdfFile.getName(), e);
                    listener.onError("转换文件 " + pdfFile.getName() + " 时发生错误: " + e.getMessage());
                } finally {
                    latch.countDown();
                }
            });
        }
        
        try {
            latch.await();
            listener.onComplete("所有文件转换完成");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            listener.onError("批量转换被中断");
        }
    }

    public void batchConvertPDFToWord(List<File> pdfFiles, String outputDir, ConversionProgressListener listener) {
        int totalFiles = pdfFiles.size();
        CountDownLatch latch = new CountDownLatch(totalFiles);
        
        for (int i = 0; i < totalFiles; i++) {
            final int fileIndex = i + 1;
            final File pdfFile = pdfFiles.get(i);
            
            executorService.submit(() -> {
                try {
                    listener.onBatchProgress(fileIndex, totalFiles, pdfFile.getName());
                    
                    File outputFile = new File(outputDir, 
                        pdfFile.getName().replaceFirst("(?i)\\.pdf$", ".docx"));
                    
                    convertPDFToWord(pdfFile, outputFile, new ConversionProgressListener() {
                        @Override
                        public void onProgress(int progress) {
                            int overallProgress = (int) ((fileIndex - 1 + progress / 100.0) / totalFiles * 100);
                            listener.onProgress(overallProgress);
                        }
                        
                        @Override
                        public void onComplete(String message) {
                            listener.onComplete("文件 " + pdfFile.getName() + " 转换完成");
                        }
                        
                        @Override
                        public void onError(String error) {
                            listener.onError("转换文件 " + pdfFile.getName() + " 时发生错误: " + error);
                        }
                        
                        @Override
                        public void onBatchProgress(int index, int total, String file) {
                            // 不需要实现，因为这是单个文件的转换
                        }
                    });
                } catch (Exception e) {
                    logger.error("转换文件 {} 时发生错误", pdfFile.getName(), e);
                    listener.onError("转换文件 " + pdfFile.getName() + " 时发生错误: " + e.getMessage());
                } finally {
                    latch.countDown();
                }
            });
        }
        
        try {
            latch.await();
            listener.onComplete("所有文件转换完成");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            listener.onError("批量转换被中断");
        }
    }
} 