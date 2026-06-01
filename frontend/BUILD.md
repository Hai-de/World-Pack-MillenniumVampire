# 千年吸血鬼前端构建说明

## 前置条件

- Node.js 18+ 
- pnpm (推荐) 或 npm/yarn

## 安装依赖

```bash
cd data/world_packs/vampire_millennium/frontend
pnpm install
```

## 开发模式

```bash
pnpm dev
```

访问 http://localhost:5173 预览前端（需要配合后端运行）。

## 构建生产版本

```bash
pnpm build
```

构建输出将生成在 `dist/` 目录：
- `dist/index.js` - 主 JavaScript 模块
- `dist/style.css` - 样式文件

## 部署

构建完成后，`dist/` 目录的文件会被 Yidhras 服务器自动服务：

```
POST /api/packs/{packId}/frontend/index.js
POST /api/packs/{packId}/frontend/style.css
```

## 前端架构

### 技术栈
- **Vue 3** - UI 框架
- **Pinia** - 状态管理
- **Vue Router** - Hash 路由
- **Tiptap** - 富文本编辑器

### 核心组件

1. **DiceRoller** - 3D 骰子投掷动画
2. **PromptDisplay** - 提示卡片展示
3. **VampireResponse** - 回应编辑器（玩家手写 / Agent 生成）
4. **CharacterPanel** - 五种资源面板
5. **DiaryReader** - 日记阅读器（仿古书籍风格）
6. **MemoryBrowser** - 回忆浏览器
7. **CharacterCreation** - 9 步车卡向导
8. **Chronicle** - 编年史时间线
9. **Demise** - 消亡终局
10. **EventToastStack** - 事件通知栈

### 设计系统

采用哥特式日记美学：
- **色彩**：深棕/深紫/深蓝 + 血色红/古金色
- **字体**：Playfair Display (标题) + Inter (正文) + Caveat (手写)
- **响应式**：桌面 (≥1024px) / 平板 (768-1023px) / 移动 (<768px)

### 状态管理

4 个 Pinia Store：
- `gameStore` - 游戏核心状态（时代、骰子、阶段）
- `characterStore` - 五种资源 + 日记
- `promptStore` - 提示池 + 编年史
- `uiStore` - 界面状态 + 音效设置

### API 通信

所有游戏操作通过 `POST /api/packs/{packId}/actions` 发送：
- `perceive.*` - 同步查询
- `invoke.*` - 异步入队

## 配置

### 音效设置

音效设置存储在 localStorage，key 格式：`vampire_audio_{packId}`

### 车卡草稿

车卡进度自动保存在 localStorage，key 格式：`vampire_cc_draft_{packId}`

## 故障排除

### 构建失败

1. 确保 Node.js 版本 ≥ 18
2. 删除 `node_modules` 重新安装：`rm -rf node_modules && pnpm install`
3. 检查 TypeScript 错误：`pnpm typecheck`

### 前端无法加载

1. 确保 `dist/` 目录存在且包含 `index.js` 和 `style.css`
2. 检查 `pack.yaml` 中 `frontend.entry` 配置正确
3. 查看浏览器控制台错误信息

### 样式问题

1. 确保 Google Fonts CDN 可访问
2. 检查 CSS 变量是否正确加载
3. 验证浏览器兼容性（现代浏览器）

## 下一步开发

1. **后端集成** - 实现各个 capability 的后端处理器
2. **WebSocket** - 实现实时推送（Agent 结果）
3. **音效系统** - 添加骰子声、翻页声等
4. **测试** - 单元测试 + 集成测试
5. **优化** - 性能优化 + 可访问性改进
