# Hawthorn Offer Frontend

基于 Electron + Vue3 的多功能工作台前端应用。

## 技术栈

- **框架**: Vue 3.4+
- **构建工具**: Vite 8.0+
- **桌面框架**: Electron 42.2+
- **状态管理**: Pinia 2.1+
- **路由**: Vue Router 4.2+
- **样式**: Tailwind CSS 3.4+
- **图标**: Lucide Vue Next
- **语言**: TypeScript 5.3+
- **代码规范**: ESLint + Prettier

## 项目结构

```
hawthorn-offer-frontend/
├── src/
│   ├── main/                    # Electron 主进程代码
│   │   ├── index.ts             # 主进程入口
│   │   └── preload.js           # 预加载脚本
│   └── renderer/                # Vue 渲染进程代码
│       ├── components/          # 组件目录
│       │   ├── Editor/          # 编辑器组件
│       │   ├── Sidebar/         # 侧边栏组件
│       │   ├── StatusBar/       # 状态栏组件
│       │   └── Workspace/       # 工作区组件
│       ├── plugins/             # 插件系统
│       │   ├── builtin/         # 内置插件
│       │   └── pluginManager.ts # 插件管理器
│       ├── stores/              # Pinia 状态管理
│       ├── types/               # TypeScript 类型定义
│       ├── App.vue              # 根组件
│       ├── main.ts              # 渲染进程入口
│       └── style.css            # 全局样式
├── index.html                   # HTML 入口
├── package.json                 # 项目配置
├── vite.config.ts               # Vite 配置
├── tailwind.config.js           # Tailwind 配置
└── tsconfig.json                # TypeScript 配置
```

## 安装依赖

```bash
npm install
```

## 开发模式

### 启动 Vite 开发服务器

```bash
npm run dev
```

### 启动 Electron 开发模式

```bash
npm run electron:dev
```

## 构建打包

### 构建生产版本

```bash
npm run build
```

### Electron 打包

```bash
npm run electron:build
```

## 代码规范

### 代码检查

```bash
npm run lint
```

### 代码格式化

```bash
npm run format
```

## 许可证

MIT