# Token Quota Monitor

一个 macOS 菜单栏常驻桌面应用，用于查询并显示 `https://used.8s.hk` / `https://8s.hk` token 额度。

## 功能

- 常驻 macOS 状态栏。
- 鼠标悬停状态栏图标时显示额度摘要。
- 点击状态栏图标打开小弹窗，查看完整额度、最近调用、刷新状态和 token 设置。
- 单 token 管理。
- token 使用 Electron `safeStorage` 加密保存到本机用户数据目录。
- 查询失败时继续显示最近一次成功缓存，并标记为缓存数据。

## 快速开始

```bash
npm install
npm run dev:desktop
```

## 打包 macOS 应用

```bash
npm run build:mac
```

生成的 `.app` 位于 `dist/` 目录。

## 项目结构

```text
src/
  desktop/
    main.cjs              # Electron 主进程、Tray、窗口和 IPC
    preload.cjs           # 安全 IPC 桥接
    quota-service.cjs     # 额度查询和数据格式化
    storage.cjs           # safeStorage 加密存储
    renderer/             # 菜单栏弹窗 UI
  backend/
    ...                   # 旧 Web 原型服务，保留但不是桌面端主入口
```

## 查询接口

应用直接请求：

- `GET https://8s.hk/api/usage/token/`
- `GET https://8s.hk/api/log/token`

请求头：

```text
Authorization: Bearer <token>
```

额度换算：

```text
$1 = 500000 quota
```
