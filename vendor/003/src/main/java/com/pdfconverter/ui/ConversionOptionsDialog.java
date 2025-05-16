package com.pdfconverter.ui;

import javax.swing.*;
import java.awt.*;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;

public class ConversionOptionsDialog extends JDialog {
    public static final int TYPE_IMAGE = 1;
    public static final int TYPE_WORD = 2;
    public static final int TYPE_OFD = 3;

    private boolean confirmed = false;
    private JComboBox<String> formatComboBox;
    private JSpinner resolutionSpinner;
    private JComboBox<String> colorModeComboBox;

    public ConversionOptionsDialog(Frame owner, int conversionType) {
        super(owner, "转换选项", true);
        initializeUI(conversionType);
    }

    private void initializeUI(int conversionType) {
        setLayout(new BorderLayout());
        
        // 创建选项面板
        JPanel optionsPanel = new JPanel(new GridBagLayout());
        GridBagConstraints gbc = new GridBagConstraints();
        gbc.insets = new Insets(5, 5, 5, 5);
        gbc.anchor = GridBagConstraints.WEST;
        
        int row = 0;
        
        if (conversionType == TYPE_IMAGE) {
            // 图片格式选择
            gbc.gridx = 0;
            gbc.gridy = row;
            optionsPanel.add(new JLabel("输出格式:"), gbc);
            
            formatComboBox = new JComboBox<>(new String[]{"JPEG", "PNG", "TIFF"});
            gbc.gridx = 1;
            optionsPanel.add(formatComboBox, gbc);
            row++;
            
            // 分辨率设置
            gbc.gridx = 0;
            gbc.gridy = row;
            optionsPanel.add(new JLabel("分辨率(DPI):"), gbc);
            
            resolutionSpinner = new JSpinner(new SpinnerNumberModel(300, 72, 600, 1));
            gbc.gridx = 1;
            optionsPanel.add(resolutionSpinner, gbc);
            row++;
            
            // 颜色模式
            gbc.gridx = 0;
            gbc.gridy = row;
            optionsPanel.add(new JLabel("颜色模式:"), gbc);
            
            colorModeComboBox = new JComboBox<>(new String[]{"彩色", "灰度"});
            gbc.gridx = 1;
            optionsPanel.add(colorModeComboBox, gbc);
            row++;
        }
        
        // 按钮面板
        JPanel buttonPanel = new JPanel(new FlowLayout(FlowLayout.RIGHT));
        JButton okButton = new JButton("确定");
        JButton cancelButton = new JButton("取消");
        
        okButton.addActionListener(e -> {
            confirmed = true;
            dispose();
        });
        
        cancelButton.addActionListener(e -> dispose());
        
        buttonPanel.add(okButton);
        buttonPanel.add(cancelButton);
        
        // 添加到主面板
        add(optionsPanel, BorderLayout.CENTER);
        add(buttonPanel, BorderLayout.SOUTH);
        
        // 设置对话框大小和位置
        pack();
        setLocationRelativeTo(getOwner());
    }

    public boolean isConfirmed() {
        return confirmed;
    }

    public String getSelectedFormat() {
        return formatComboBox != null ? (String) formatComboBox.getSelectedItem() : null;
    }

    public int getResolution() {
        return resolutionSpinner != null ? (Integer) resolutionSpinner.getValue() : 300;
    }

    public String getColorMode() {
        return colorModeComboBox != null ? (String) colorModeComboBox.getSelectedItem() : null;
    }
} 