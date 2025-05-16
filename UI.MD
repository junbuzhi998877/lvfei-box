
# 苹果风格工具箱应用完整UI设计

以下是将所有页面汇总到一个视图中的完整设计原型:

```svg
<svg width="800" height="3400" xmlns="http://www.w3.org/2000/svg">
  <!-- 背景 -->
  <rect width="800" height="3400" fill="#ffffff"/>
  
  <!-- ================ 主页面 ================ -->
  <text x="400" y="50" font-family="SF Pro Display, Helvetica, Arial" font-size="24" font-weight="600" fill="#1d1d1f" text-anchor="middle">主页面</text>
  <rect x="50" y="60" width="700" height="2" fill="#dddddd"/>
  
  <!-- 顶部导航栏 -->
  <rect x="0" y="80" width="800" height="60" fill="#ffffff" filter="url(#shadow1)"/>
  
  <!-- 导航阴影 -->
  <defs>
    <filter id="shadow1" x="0" y="0" width="800" height="60">
      <feDropShadow dx="0" dy="1" stdDeviation="1" flood-opacity="0.1"/>
    </filter>
  </defs>
  
  <!-- 导航菜单 -->
  <text x="50" y="117" font-family="SF Pro Display, Helvetica, Arial" font-size="20" font-weight="500" fill="#000000">工具箱</text>
  <text x="200" y="117" font-family="SF Pro Text, Helvetica, Arial" font-size="14" fill="#555555">PDF工具</text>
  <text x="300" y="117" font-family="SF Pro Text, Helvetica, Arial" font-size="14" fill="#555555">图片工具</text>
  <text x="400" y="117" font-family="SF Pro Text, Helvetica, Arial" font-size="14" fill="#555555">二维码</text>
  <text x="480" y="117" font-family="SF Pro Text, Helvetica, Arial" font-size="14" fill="#555555">支持</text>
  
  <!-- 搜索图标 -->
  <circle cx="730" cy="110" r="10" fill="none" stroke="#555555" stroke-width="1.5"/>
  <line x1="737" y1="117" x2="745" y2="125" stroke="#555555" stroke-width="1.5"/>
  
  <!-- 主标题区域 -->
  <text x="400" y="230" font-family="SF Pro Display, Helvetica, Arial" font-size="56" font-weight="700" fill="#1d1d1f" text-anchor="middle">多功能工具箱</text>
  <text x="400" y="280" font-family="SF Pro Display, Helvetica, Arial" font-size="24" fill="#666666" text-anchor="middle">简单高效的桌面实用工具集</text>
  
  <!-- PDF工具部分 -->
  <circle cx="400" y="380" r="60" fill="#f5f5f7"/>
  <text x="400" y="395" font-family="SF Pro Display, Helvetica, Arial" font-size="32" font-weight="600" fill="#fa3c52" text-anchor="middle">PDF</text>
  
  <text x="400" y="500" font-family="SF Pro Display, Helvetica, Arial" font-size="32" font-weight="600" fill="#1d1d1f" text-anchor="middle">PDF格式转换</text>
  <text x="400" y="540" font-family="SF Pro Text, Helvetica, Arial" font-size="17" fill="#666666" text-anchor="middle" width="500">轻松转换PDF至Word、Excel、PPT等格式，或将其他格式转为PDF。</text>
  
  <rect x="350" y="570" width="100" height="36" rx="18" fill="#0071e3"/>
  <text x="400" y="593" font-family="SF Pro Text, Helvetica, Arial" font-size="14" fill="#ffffff" text-anchor="middle">开始使用</text>
  
  <!-- 图片工具部分 -->
  <rect x="0" y="630" width="800" height="330" fill="#f5f5f7"/>
  
  <circle cx="400" y="710" r="60" fill="#ffffff"/>
  <text x="400" y="725" font-family="SF Pro Display, Helvetica, Arial" font-size="32" font-weight="600" fill="#38b6ff" text-anchor="middle">IMG</text>
  
  <text x="400" y="830" font-family="SF Pro Display, Helvetica, Arial" font-size="32" font-weight="600" fill="#1d1d1f" text-anchor="middle">图片压缩工具</text>
  <text x="400" y="870" font-family="SF Pro Text, Helvetica, Arial" font-size="17" fill="#666666" text-anchor="middle" width="500">高质量图片压缩，减小文件体积但保持视觉效果。批量处理更高效。</text>
  
  <rect x="350" y="900" width="100" height="36" rx="18" fill="#0071e3"/>
  <text x="400" y="923" font-family="SF Pro Text, Helvetica, Arial" font-size="14" fill="#ffffff" text-anchor="middle">开始使用</text>
  
  <!-- 分隔线 -->
  <rect x="50" y="990" width="700" height="2" fill="#dddddd"/>
  
  <!-- ================ PDF格式转换页面 ================ -->
  <text x="400" y="1030" font-family="SF Pro Display, Helvetica, Arial" font-size="24" font-weight="600" fill="#1d1d1f" text-anchor="middle">PDF格式转换页面</text>
  <rect x="50" y="1040" width="700" height="2" fill="#dddddd"/>
  
  <!-- 顶部导航栏 -->
  <rect x="0" y="1060" width="800" height="60" fill="#ffffff" filter="url(#shadow2)"/>
  
  <!-- 导航阴影 -->
  <defs>
    <filter id="shadow2" x="0" y="0" width="800" height="60">
      <feDropShadow dx="0" dy="1" stdDeviation="1" flood-opacity="0.1"/>
    </filter>
  </defs>
  
  <!-- 导航菜单 -->
  <text x="50" y="1097" font-family="SF Pro Display, Helvetica, Arial" font-size="20" font-weight="500" fill="#000000">工具箱</text>
  <text x="200" y="1097" font-family="SF Pro Text, Helvetica, Arial" font-size="14" fill="#0071e3">PDF工具</text>
  <text x="300" y="1097" font-family="SF Pro Text, Helvetica, Arial" font-size="14" fill="#555555">图片工具</text>
  <text x="400" y="1097" font-family="SF Pro Text, Helvetica, Arial" font-size="14" fill="#555555">二维码</text>
  <text x="480" y="1097" font-family="SF Pro Text, Helvetica, Arial" font-size="14" fill="#555555">支持</text>
  
  <!-- 搜索图标 -->
  <circle cx="730" cy="1090" r="10" fill="none" stroke="#555555" stroke-width="1.5"/>
  <line x1="737" y1="1097" x2="745" y2="1105" stroke="#555555" stroke-width="1.5"/>
  
  <!-- 返回按钮 -->
  <text x="50" y="1155" font-family="SF Pro Text, Helvetica, Arial" font-size="14" fill="#0071e3">< 返回</text>
  
  <!-- 页面标题 -->
  <text x="400" y="1190" font-family="SF Pro Display, Helvetica, Arial" font-size="40" font-weight="600" fill="#1d1d1f" text-anchor="middle">PDF格式转换</text>
  
  <!-- 转换选项 -->
  <text x="200" y="1260" font-family="SF Pro Display, Helvetica, Arial" font-size="20" font-weight="500" fill="#1d1d1f">选择转换方式</text>
  
  <!-- 转换选项卡片 - PDF到其他格式 -->
  <rect x="200" y="1290" width="180" height="80" rx="10" fill="#f5f5f7"/>
  <text x="290" y="1325" font-family="SF Pro Text, Helvetica, Arial" font-size="16" font-weight="500" fill="#1d1d1f" text-anchor="middle">PDF转Word</text>
  <text x="290" y="1350" font-family="SF Pro Text, Helvetica, Arial" font-size="12" fill="#666666" text-anchor="middle">.pdf → .docx</text>
  
  <rect x="400" y="1290" width="180" height="80" rx="10" fill="#f5f5f7"/>
  <text x="490" y="1325" font-family="SF Pro Text, Helvetica, Arial" font-size="16" font-weight="500" fill="#1d1d1f" text-anchor="middle">PDF转Excel</text>
  <text x="490" y="1350" font-family="SF Pro Text, Helvetica, Arial" font-size="12" fill="#666666" text-anchor="middle">.pdf → .xlsx</text>
  
  <rect x="200" y="1390" width="180" height="80" rx="10" fill="#f5f5f7"/>
  <text x="290" y="1425" font-family="SF Pro Text, Helvetica, Arial" font-size="16" font-weight="500" fill="#1d1d1f" text-anchor="middle">PDF转PPT</text>
  <text x="290" y="1450" font-family="SF Pro Text, Helvetica, Arial" font-size="12" fill="#666666" text-anchor="middle">.pdf → .pptx</text>
  
  <rect x="400" y="1390" width="180" height="80" rx="10" fill="#f5f5f7"/>
  <text x="490" y="1425" font-family="SF Pro Text, Helvetica, Arial" font-size="16" font-weight="500" fill="#1d1d1f" text-anchor="middle">PDF转图片</text>
  <text x="490" y="1450" font-family="SF Pro Text, Helvetica, Arial" font-size="12" fill="#666666" text-anchor="middle">.pdf → .jpg/.png</text>
  
  <!-- 上传区域 -->
  <rect x="200" y="1510" width="400" height="200" rx="10" fill="#f5f5f7" stroke="#dddddd" stroke-width="1" stroke-dasharray="5,5"/>
  <text x="400" y="1575" font-family="SF Pro Display, Helvetica, Arial" font-size="20" font-weight="500" fill="#1d1d1f" text-anchor="middle">拖放文件到这里</text>
  <text x="400" y="1605" font-family="SF Pro Text, Helvetica, Arial" font-size="14" fill="#666666" text-anchor="middle">或</text>
  
  <!-- 选择文件按钮 -->
  <rect x="325" y="1630" width="150" height="36" rx="18" fill="#0071e3"/>
  <text x="400" y="1653" font-family="SF Pro Text, Helvetica, Arial" font-size="14" fill="#ffffff" text-anchor="middle">选择文件</text>
  
  <!-- 文件格式支持说明 -->
  <text x="400" y="1740" font-family="SF Pro Text, Helvetica, Arial" font-size="12" fill="#666666" text-anchor="middle">支持的文件格式: PDF, DOCX, XLSX, PPTX, JPG, PNG</text>
  <text x="400" y="1760" font-family="SF Pro Text, Helvetica, Arial" font-size="12" fill="#666666" text-anchor="middle">单个文件最大支持20MB</text>
  
  <!-- 分隔线 -->
  <rect x="50" y="1790" width="700" height="2" fill="#dddddd"/>
  
  <!-- ================ 图片压缩工具页面 ================ -->
  <text x="400" y="1830" font-family="SF Pro Display, Helvetica, Arial" font-size="24" font-weight="600" fill="#1d1d1f" text-anchor="middle">图片压缩工具页面</text>
  <rect x="50" y="1840" width="700" height="2" fill="#dddddd"/>
  
  <!-- 顶部导航栏 -->
  <rect x="0" y="1860" width="800" height="60" fill="#ffffff" filter="url(#shadow3)"/>
  
  <!-- 导航阴影 -->
  <defs>
    <filter id="shadow3" x="0" y="0" width="800" height="60">
      <feDropShadow dx="0" dy="1" stdDeviation="1" flood-opacity="0.1"/>
    </filter>
  </defs>
  
  <!-- 导航菜单 -->
  <text x="50" y="1897" font-family="SF Pro Display, Helvetica, Arial" font-size="20" font-weight="500" fill="#000000">工具箱</text>
  <text x="200" y="1897" font-family="SF Pro Text, Helvetica, Arial" font-size="14" fill="#555555">PDF工具</text>
  <text x="300" y="1897" font-family="SF Pro Text, Helvetica, Arial" font-size="14" fill="#0071e3">图片工具</text>
  <text x="400" y="1897" font-family="SF Pro Text, Helvetica, Arial" font-size="14" fill="#555555">二维码</text>
  <text x="480" y="1897" font-family="SF Pro Text, Helvetica, Arial" font-size="14" fill="#555555">支持</text>
  
  <!-- 搜索图标 -->
  <circle cx="730" cy="1890" r="10" fill="none" stroke="#555555" stroke-width="1.5"/>
  <line x1="737" y1="1897" x2="745" y2="1905" stroke="#555555" stroke-width="1.5"/>
  
  <!-- 返回按钮 -->
  <text x="50" y="1955" font-family="SF Pro Text, Helvetica, Arial" font-size="14" fill="#0071e3">< 返回</text>
  
  <!-- 页面标题 -->
  <text x="400" y="1990" font-family="SF Pro Display, Helvetica, Arial" font-size="40" font-weight="600" fill="#1d1d1f" text-anchor="middle">图片压缩工具</text>
  
  <!-- 文件上传区域 -->
  <rect x="100" y="2040" width="600" height="240" rx="10" fill="#f5f5f7" stroke="#dddddd" stroke-width="1" stroke-dasharray="5,5"/>
  <text x="400" y="2130" font-family="SF Pro Display, Helvetica, Arial" font-size="20" font-weight="500" fill="#1d1d1f" text-anchor="middle">拖放图片到这里</text>
  <text x="400" y="2160" font-family="SF Pro Text, Helvetica, Arial" font-size="14" fill="#666666" text-anchor="middle">支持批量上传多个图片</text>
  <text x="400" y="2190" font-family="SF Pro Text, Helvetica, Arial" font-size="14" fill="#666666" text-anchor="middle">或</text>
  
  <!-- 选择文件按钮 -->
  <rect x="325" y="2210" width="150" height="36" rx="18" fill="#0071e3"/>
  <text x="400" y="2233" font-family="SF Pro Text, Helvetica, Arial" font-size="14" fill="#ffffff" text-anchor="middle">选择图片</text>
  
  <!-- 压缩设置 -->
  <text x="100" y="2330" font-family="SF Pro Display, Helvetica, Arial" font-size="20" font-weight="500" fill="#1d1d1f">压缩设置</text>
  
  <!-- 质量设置 -->
  <text x="100" y="2370" font-family="SF Pro Text, Helvetica, Arial" font-size="16" fill="#1d1d1f">质量</text>
  <rect x="100" y="2385" width="600" height="10" rx="5" fill="#e0e0e0"/>
  <rect x="100" y="2385" width="400" height="10" rx="5" fill="#0071e3"/>
  <circle cx="500" cy="2390" r="12" fill="#ffffff" stroke="#0071e3" stroke-width="2"/>
  <text x="710" y="2390" font-family="SF Pro Text, Helvetica, Arial" font-size="14" fill="#1d1d1f">80%</text>
  
  <!-- 输出格式 -->
  <text x="100" y="2440" font-family="SF Pro Text, Helvetica, Arial" font-size="16" fill="#1d1d1f">输出格式</text>
  <rect x="100" y="2455" width="140" height="36" rx="18" fill="#0071e3"/>
  <text x="170" y="2478" font-family="SF Pro Text, Helvetica, Arial" font-size="14" fill="#ffffff" text-anchor="middle">JPG</text>
  
  <rect x="260" y="2455" width="140" height="36" rx="18" fill="#f5f5f7"/>
  <text x="330" y="2478" font-family="SF Pro Text, Helvetica, Arial" font-size="14" fill="#1d1d1f" text-anchor="middle">PNG</text>
  
  <rect x="420" y="2455" width="140" height="36" rx="18" fill="#f5f5f7"/>
  <text x="490" y="2478" font-family="SF Pro Text, Helvetica, Arial" font-size="14" fill="#1d1d1f" text-anchor="middle">WebP</text>
  
  <!-- 保持原始尺寸选项 -->
  <rect x="100" y="2510" width="20" height="20" rx="4" fill="#ffffff" stroke="#0071e3" stroke-width="2"/>
  <rect x="105" y="2515" width="10" height="10" fill="#0071e3"/>
  <text x="130" y="2525" font-family="SF Pro Text, Helvetica, Arial" font-size="16" fill="#1d1d1f">保持原始尺寸</text>
  
  <!-- 压缩按钮 -->
  <rect x="100" y="2560" width="600" height="50" rx="10" fill="#0071e3"/>
  <text x="400" y="2593" font-family="SF Pro Display, Helvetica, Arial" font-size="18" font-weight="500" fill="#ffffff" text-anchor="middle">开始压缩</text>
  
  <!-- 分隔线 -->
  <rect x="50" y="2640" width="700" height="2" fill="#dddddd"/>
  
  <!-- ================ 二维码生成页面 ================ -->
  <text x="400" y="2680" font-family="SF Pro Display, Helvetica, Arial" font-size="24" font-weight="600" fill="#1d1d1f" text-anchor="middle">二维码生成页面</text>
  <rect x="50" y="2690" width="700" height="2" fill="#dddddd"/>
  
  <!-- 顶部导航栏 -->
  <rect x="0" y="2710" width="800" height="60" fill="#ffffff" filter="url(#shadow4)"/>
  
  <!-- 导航阴影 -->
  <defs>
    <filter id="shadow4" x="0" y="0" width="800" height="60">
      <feDropShadow dx="0" dy="1" stdDeviation="1" flood-opacity="0.1"/>
    </filter>
  </defs>
  
  <!-- 导航菜单 -->
  <text x="50" y="2747" font-family="SF Pro Display, Helvetica, Arial" font-size="20" font-weight="500" fill="#000000">工具箱</text>
  <text x="200" y="2747" font-family="SF Pro Text, Helvetica, Arial" font-size="14" fill="#555555">PDF工具</text>
  <text x="300" y="2747" font-family="SF Pro Text, Helvetica, Arial" font-size="14" fill="#555555">图片工具</text>
  <text x="400" y="2747" font-family="SF Pro Text, Helvetica, Arial" font-size="14" fill="#0071e3">二维码</text>
  <text x="480" y="2747" font-family="SF Pro Text, Helvetica, Arial" font-size="14" fill="#555555">支持</text>
  
  <!-- 搜索图标 -->
  <circle cx="730" cy="2740" r="10" fill="none" stroke="#555555" stroke-width="1.5"/>
  <line x1="737" y1="2747" x2="745" y2="2755" stroke="#555555" stroke-width="1.5"/>
  
  <!-- 返回按钮 -->
  <text x="50" y="2805" font-family="SF Pro Text, Helvetica, Arial" font-size="14" fill="#0071e3">< 返回</text>
  
  <!-- 页面标题 -->
  <text x="400" y="2840" font-family="SF Pro Display, Helvetica, Arial" font-size="40" font-weight="600" fill="#1d1d1f" text-anchor="middle">二维码生成</text>
  
  <!-- 左侧设置区域 -->
  <rect x="50" y="2890" width="350" height="480" rx="10" fill="#f5f5f7"/>
  
  <!-- 内容输入 -->
  <text x="80" y="2930" font-family="SF Pro Display, Helvetica, Arial" font-size="18" font-weight="500" fill="#1d1d1f">内容</text>
  <rect x="80" y="2945" width="290" height="100" rx="6" fill="#ffffff" stroke="#dddddd" stroke-width="1"/>
  <text x="100" y="2980" font-family="SF Pro Text, Helvetica, Arial" font-size="14" fill="#666666">https://www.example.com</text>
  
  <!-- 内容类型选择器 -->
  <text x="80" y="3080" font-family="SF Pro Display, Helvetica, Arial" font-size="18" font-weight="500" fill="#1d1d1f">内容类型</text>
  
  <rect x="80" y="3095" width="80" height="36" rx="18" fill="#0071e3"/>
  <text x="120" y="3118" font-family="SF Pro Text, Helvetica, Arial" font-size="14" fill="#ffffff" text-anchor="middle">URL</text>
  
  <rect x="170" y="3095" width="80" height="36" rx="18" fill="#f5f5f7"/>
  <text x="210" y="3118" font-family="SF Pro Text, Helvetica, Arial" font-size="14" fill="#1d1d1f" text-anchor="middle">文本</text>
  
  <rect x="260" y="3095" width="110" height="36" rx="18" fill="#f5f5f7"/>
  <text x="315" y="3118" font-family="SF Pro Text, Helvetica, Arial" font-size="14" fill="#1d1d1f" text-anchor="middle">vCard</text>
  
  <!-- 二维码设置 -->
  <text x="80" y="3170" font-family="SF Pro Display, Helvetica, Arial" font-size="18" font-weight="500" fill="#1d1d1f">设置</text>
  
  <!-- 二维码大小 -->
  <text x="80" y="3200" font-family="SF Pro Text, Helvetica, Arial" font-size="14" fill="#1d1d1f">大小</text>
  <rect x="80" y="3215" width="290" height="10" rx="5" fill="#e0e0e0"/>
  <rect x="80" y="3215" width="220" height="10" rx="5" fill="#0071e3"/>
  <circle cx="300" cy="3220" r="10" fill="#ffffff" stroke="#0071e3" stroke-width="2"/>
  <text x="330" y="3223" font-family="SF Pro Text, Helvetica, Arial" font-size="12" fill="#1d1d1f">500px</text>
  
  <!-- 误差修正级别 -->
  <text x="80" y="3255" font-family="SF Pro Text, Helvetica, Arial" font-size="14" fill="#1d1d1f">误差修正级别</text>
  <rect x="80" y="3270" width="65" height="30" rx="15" fill="#0071e3"/>
  <text x="112" y="3290" font-family="SF Pro Text, Helvetica, Arial" font-size="14" fill="#ffffff" text-anchor="middle">M</text>
  
  <rect x="155" y="3270" width="65" height="30" rx="15" fill="#f5f5f7"/>
  <text x="187" y="3290" font-family="SF Pro Text, Helvetica, Arial" font-size="14" fill="#1d1d1f" text-anchor="middle">L</text>
  
  <rect x="230" y="3270" width="65" height="30" rx="15" fill="#f5f5f7"/>
  <text x="262" y="3290" font-family="SF Pro Text, Helvetica, Arial" font-size="14" fill="#1d1d1f" text-anchor="middle">H</text>
  
  <!-- 颜色选择 -->
  <text x="80" y="3320" font-family="SF Pro Text, Helvetica, Arial" font-size="14" fill="#1d1d1f">前景色</text>
  <rect x="80" y="3335" width="30" height="30" rx="15" fill="#000000" stroke="#0071e3" stroke-width="2"/>
  <rect x="120" y="3335" width="30" height="30" rx="15" fill="#0071e3"/>
  <rect x="160" y="3335" width="30" height="30" rx="15" fill="#fa3c52"/>
  <rect x="200" y="3335" width="30" height="30" rx="15" fill="#38b6ff"/>
  <rect x="240" y="3335" width="30" height="30" rx="15" fill="#6a0dad"/>
  
  <!-- 生成按钮 -->
  <rect x="80" y="3385" width="290" height="40" rx="20" fill="#0071e3"/>
  <text x="225" y="3410" font-family="SF Pro Text, Helvetica, Arial" font-size="16" fill="#ffffff" text-anchor="middle">生成二维码</text>
  
  <!-- 右侧预览区域 -->
  <rect x="430" y="2890" width="320" height="320" rx="10" fill="#f5f5f7"/>
  
  <!-- 示例二维码 -->
  <rect x="490" y="2950" width="200" height="200" fill="#ffffff"/>
  <!-- 简化的QR码图案 -->
  <rect x="510" y="2970" width="160" height="160" fill="#000000"/>
  <rect x="530" y="2990" width="120" height="120" fill="#ffffff"/>
  <rect x="550" y="3010" width="80" height="80" fill="#000000"/>
  <rect x="570" y="3030" width="40" height="40" fill="#ffffff"/>
  
  <!-- 下载选项 -->
  <text x="590" y="3250" font-family="SF Pro Display, Helvetica, Arial" font-size="18" font-weight="500" fill="#1d1d1f" text-anchor="middle">下载选项</text>
  
  <rect x="430" y="3270" width="150" height="40" rx="20" fill="#f5f5f7"/>
  <text x="505" y="3295" font-family="SF Pro Text, Helvetica, Arial" font-size="16" fill="#1d1d1f" text-anchor="middle">PNG</text>
  
  <rect x="600" y="3270" width="150" height="40" rx="20" fill="#f5f5f7"/>
  <text x="675" y="3295" font-family="SF Pro Text, Helvetica, Arial" font-size="16" fill="#1d1d1f" text-anchor="middle">SVG</text>
  
  <rect x="430" y="3330" width="320" height="40" rx="20" fill="#0071e3"/>
  <text x="590" y="3355" font-family="SF Pro Text, Helvetica, Arial" font-size="16" fill="#ffffff" text-anchor="middle">下载二维码</text>
</svg>
```

## 设计说明

我已将所有四个页面（主页、PDF转换、图片压缩和二维码生成）整合到一个完整的视图中，便于您全面了解整个应用的设计。

这个综合设计具有以下特点：

1. 页面分区明确：
   - 每个功能页面都有清晰的标题和分隔线
   - 按照逻辑顺序排列从主页到各个功能页面

2. 统一的设计语言：
   - 所有页面保持一致的苹果设计风格
   - 字体、颜色和交互元素在整个应用中保持一致

3. 完整的用户流程：
   - 从主页到各个功能页面的流畅过渡
   - 每个功能页面都包含完整的操作流程和所有必要元素

4. 苹果风格的设计元素：
   - 极简美学和大量留白
   - 圆角按钮和优雅的表单控件
   - 精细的阴影和微妙的色彩过渡

这个设计提供了一个全面的视图，展示了整个应用的界面和交互方式，符合您要求的苹果官网风格，并完整呈现了所有功能页面和其交互元素。

您可以使用这个设计作为开发工具箱应用程序的详细视觉参考，确保最终产品具有专业的外观和出色的用户体验。