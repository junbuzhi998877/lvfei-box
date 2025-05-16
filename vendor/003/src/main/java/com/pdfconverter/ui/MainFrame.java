package com.pdfconverter.ui;

import com.pdfconverter.service.ConversionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.swing.*;
import javax.swing.border.EmptyBorder;
import javax.swing.border.LineBorder;
import javax.swing.filechooser.FileNameExtensionFilter;
import java.awt.*;
import java.awt.datatransfer.DataFlavor;
import java.awt.dnd.*;
import java.awt.event.WindowAdapter;
import java.awt.event.WindowEvent;
import java.io.File;
import java.util.ArrayList;
import java.util.List;
import java.util.TooManyListenersException;

public class MainFrame extends JFrame {
    private static final Logger logger = LoggerFactory.getLogger(MainFrame.class);
    private final ConversionService conversionService = new ConversionService();
    private final JProgressBar progressBar = new JProgressBar(0, 100);
    private final JTextArea logArea = new JTextArea();
    private final DefaultListModel<String> fileListModel = new DefaultListModel<>();
    private final JList<String> fileList = new JList<>(fileListModel);
    private final JButton convertButton = new JButton("开始转换");
    private final JButton clearButton = new JButton("清空列表");
    private final JComboBox<String> formatComboBox = new JComboBox<>(new String[]{"OFD格式", "Word格式"});
    private JPanel dropPanel;
    
    public MainFrame() {
        try {
            initializeUI();
        } catch (Exception e) {
            logger.error("初始化界面时发生错误", e);
            JOptionPane.showMessageDialog(null, "初始化界面时发生错误: " + e.getMessage(),
                "错误", JOptionPane.ERROR_MESSAGE);
            System.exit(1);
        }
    }
    
    private void initializeUI() {
        setTitle("PDF文件转换器");
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        setSize(1000, 700);
        setLocationRelativeTo(null);
        
        // 创建主面板
        JPanel mainPanel = new JPanel(new BorderLayout(10, 10));
        mainPanel.setBorder(new EmptyBorder(10, 10, 10, 10));
        
        // 创建顶部工具栏
        JPanel toolBar = new JPanel(new FlowLayout(FlowLayout.LEFT, 10, 5));
        JButton addButton = new JButton("添加文件");
        
        // 美化按钮
        styleButton(addButton, new Color(64, 158, 255));
        styleButton(convertButton, new Color(103, 194, 58));
        styleButton(clearButton, new Color(230, 162, 60));
        
        toolBar.add(addButton);
        toolBar.add(convertButton);
        toolBar.add(clearButton);
        toolBar.add(new JLabel("转换格式："));
        toolBar.add(formatComboBox);
        
        // 创建拖拽面板
        createDropPanel();
        
        // 配置文件列表
        fileList.setSelectionMode(ListSelectionModel.MULTIPLE_INTERVAL_SELECTION);
        fileList.setCellRenderer(new FileListCellRenderer());
        JScrollPane fileListScroll = new JScrollPane(fileList);
        fileListScroll.setBorder(BorderFactory.createTitledBorder("待转换文件"));
        
        // 配置进度条
        progressBar.setStringPainted(true);
        progressBar.setPreferredSize(new Dimension(progressBar.getPreferredSize().width, 25));
        progressBar.setFont(new Font(progressBar.getFont().getName(), Font.PLAIN, 14));
        
        // 配置日志区域
        logArea.setEditable(false);
        logArea.setFont(new Font("Microsoft YaHei", Font.PLAIN, 12));
        JScrollPane logScroll = new JScrollPane(logArea);
        logScroll.setBorder(BorderFactory.createTitledBorder("转换日志"));
        
        // 创建左侧面板（拖拽区域和文件列表）
        JPanel leftPanel = new JPanel(new BorderLayout(5, 5));
        leftPanel.add(dropPanel, BorderLayout.NORTH);
        leftPanel.add(fileListScroll, BorderLayout.CENTER);
        
        // 创建分割面板
        JSplitPane splitPane = new JSplitPane(JSplitPane.HORIZONTAL_SPLIT,
            leftPanel, logScroll);
        splitPane.setResizeWeight(0.5);
        
        // 添加组件到主面板
        mainPanel.add(toolBar, BorderLayout.NORTH);
        mainPanel.add(splitPane, BorderLayout.CENTER);
        mainPanel.add(progressBar, BorderLayout.SOUTH);
        
        // 添加主面板到窗口
        add(mainPanel);
        
        // 添加事件监听器
        addButton.addActionListener(e -> selectFiles());
        convertButton.addActionListener(e -> startConversion());
        clearButton.addActionListener(e -> clearFileList());
        
        // 添加窗口关闭事件
        addWindowListener(new WindowAdapter() {
            @Override
            public void windowClosing(WindowEvent e) {
                conversionService.shutdown();
            }
        });
    }
    
    private void createDropPanel() {
        dropPanel = new JPanel(new BorderLayout());
        dropPanel.setPreferredSize(new Dimension(0, 100));
        dropPanel.setBorder(BorderFactory.createDashedBorder(Color.GRAY, 2, 5, 3, true));
        
        JLabel dropLabel = new JLabel("拖拽PDF文件到这里", SwingConstants.CENTER);
        dropLabel.setFont(new Font("Microsoft YaHei", Font.PLAIN, 16));
        dropLabel.setForeground(Color.GRAY);
        dropPanel.add(dropLabel, BorderLayout.CENTER);
        
        // 添加拖拽支持
        DropTarget dropTarget = new DropTarget();
        try {
            dropTarget.addDropTargetListener(new DropTargetListener() {
                @Override
                public void dragEnter(DropTargetDragEvent dtde) {
                    if (isDragAcceptable(dtde)) {
                        dtde.acceptDrag(DnDConstants.ACTION_COPY);
                        dropPanel.setBorder(BorderFactory.createDashedBorder(new Color(103, 194, 58), 2, 5, 3, true));
                    } else {
                        dtde.rejectDrag();
                    }
                }
                
                @Override
                public void dragOver(DropTargetDragEvent dtde) {
                    // 不需要实现
                }
                
                @Override
                public void dropActionChanged(DropTargetDragEvent dtde) {
                    // 不需要实现
                }
                
                @Override
                public void dragExit(DropTargetEvent dte) {
                    dropPanel.setBorder(BorderFactory.createDashedBorder(Color.GRAY, 2, 5, 3, true));
                }
                
                @Override
                public void drop(DropTargetDropEvent dtde) {
                    try {
                        dtde.acceptDrop(DnDConstants.ACTION_COPY);
                        List<File> files = (List<File>) dtde.getTransferable().getTransferData(DataFlavor.javaFileListFlavor);
                        addFiles(files);
                        dtde.dropComplete(true);
                    } catch (Exception ex) {
                        logger.error("处理拖拽文件时发生错误", ex);
                        dtde.rejectDrop();
                    } finally {
                        dropPanel.setBorder(BorderFactory.createDashedBorder(Color.GRAY, 2, 5, 3, true));
                    }
                }
            });
        } catch (TooManyListenersException e) {
            logger.error("添加拖拽监听器时发生错误", e);
        }
        
        dropPanel.setDropTarget(dropTarget);
    }
    
    private boolean isDragAcceptable(DropTargetDragEvent dtde) {
        return dtde.isDataFlavorSupported(DataFlavor.javaFileListFlavor);
    }
    
    private void addFiles(List<File> files) {
        for (File file : files) {
            if (file.getName().toLowerCase().endsWith(".pdf")) {
                if (!fileListModel.contains(file.getAbsolutePath())) {
                    fileListModel.addElement(file.getAbsolutePath());
                }
            }
        }
    }
    
    private void styleButton(JButton button, Color color) {
        button.setBackground(color);
        button.setForeground(Color.WHITE);
        button.setFocusPainted(false);
        button.setBorderPainted(false);
        button.setFont(new Font("Microsoft YaHei", Font.PLAIN, 14));
        button.setPreferredSize(new Dimension(100, 30));
        
        // 添加鼠标悬停效果
        button.addMouseListener(new java.awt.event.MouseAdapter() {
            public void mouseEntered(java.awt.event.MouseEvent evt) {
                button.setBackground(color.brighter());
            }
            
            public void mouseExited(java.awt.event.MouseEvent evt) {
                button.setBackground(color);
            }
        });
    }
    
    // 自定义文件列表单元格渲染器
    private class FileListCellRenderer extends DefaultListCellRenderer {
        @Override
        public Component getListCellRendererComponent(JList<?> list, Object value, 
                int index, boolean isSelected, boolean cellHasFocus) {
            JLabel label = (JLabel) super.getListCellRendererComponent(
                list, value, index, isSelected, cellHasFocus);
            
            File file = new File(value.toString());
            label.setText(file.getName());
            label.setIcon(UIManager.getIcon("FileView.fileIcon"));
            label.setFont(new Font("Microsoft YaHei", Font.PLAIN, 12));
            
            return label;
        }
    }
    
    private void selectFiles() {
        JFileChooser fileChooser = new JFileChooser();
        fileChooser.setMultiSelectionEnabled(true);
        fileChooser.setFileFilter(new FileNameExtensionFilter("PDF文件", "pdf"));
        
        if (fileChooser.showOpenDialog(this) == JFileChooser.APPROVE_OPTION) {
            File[] files = fileChooser.getSelectedFiles();
            addFiles(List.of(files));
        }
    }
    
    private void clearFileList() {
        fileListModel.clear();
        logArea.setText("");
        progressBar.setValue(0);
    }
    
    private void startConversion() {
        if (fileListModel.isEmpty()) {
            JOptionPane.showMessageDialog(this, "请先添加要转换的PDF文件！");
            return;
        }
        
        // 禁用按钮
        convertButton.setEnabled(false);
        clearButton.setEnabled(false);
        
        // 获取所有文件
        List<File> files = new ArrayList<>();
        for (int i = 0; i < fileListModel.size(); i++) {
            files.add(new File(fileListModel.get(i)));
        }
        
        // 选择输出目录
        JFileChooser dirChooser = new JFileChooser();
        dirChooser.setFileSelectionMode(JFileChooser.DIRECTORIES_ONLY);
        if (dirChooser.showSaveDialog(this) != JFileChooser.APPROVE_OPTION) {
            convertButton.setEnabled(true);
            clearButton.setEnabled(true);
            return;
        }
        
        String outputDir = dirChooser.getSelectedFile().getAbsolutePath();
        
        // 创建进度监听器
        ConversionService.ConversionProgressListener listener = new ConversionService.ConversionProgressListener() {
            @Override
            public void onProgress(int progress) {
                SwingUtilities.invokeLater(() -> progressBar.setValue(progress));
            }
            
            @Override
            public void onComplete(String message) {
                SwingUtilities.invokeLater(() -> {
                    logArea.append(message + "\n");
                    convertButton.setEnabled(true);
                    clearButton.setEnabled(true);
                });
            }
            
            @Override
            public void onError(String error) {
                SwingUtilities.invokeLater(() -> {
                    logArea.append("错误: " + error + "\n");
                    convertButton.setEnabled(true);
                    clearButton.setEnabled(true);
                });
            }
            
            @Override
            public void onBatchProgress(int fileIndex, int totalFiles, String currentFile) {
                SwingUtilities.invokeLater(() -> {
                    logArea.append(String.format("正在处理第 %d/%d 个文件: %s\n", 
                        fileIndex, totalFiles, currentFile));
                });
            }
        };
        
        // 开始转换
        new Thread(() -> {
            try {
                if (formatComboBox.getSelectedIndex() == 0) {
                    conversionService.batchConvertPDFToOFD(files, outputDir, listener);
                } else {
                    conversionService.batchConvertPDFToWord(files, outputDir, listener);
                }
            } catch (Exception e) {
                listener.onError("转换过程中发生错误: " + e.getMessage());
            }
        }).start();
    }
    
    public static void main(String[] args) {
        try {
            // 设置本地系统外观
            UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName());
            
            // 设置一些UI默认值
            UIManager.put("Button.arc", 10);
            UIManager.put("Component.arc", 10);
            UIManager.put("ProgressBar.arc", 10);
            UIManager.put("TextComponent.arc", 10);
        } catch (Exception e) {
            e.printStackTrace();
        }
        
        SwingUtilities.invokeLater(() -> {
            MainFrame frame = new MainFrame();
            frame.setVisible(true);
        });
    }
} 