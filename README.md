# Product Starter

一个轻量的产品原型全栈骨架，包含：

- 前端：原生 HTML/CSS/JavaScript 单页界面
- 后端：Node.js 内置 HTTP API
- 数据库：Node.js 内置 SQLite 驱动

这个版本不需要安装第三方依赖，适合作为产品想法、需求管理、MVP 后台的第一版基础。

## 快速开始

```bash
npm run db:seed
npm run dev
```

打开：

```text
http://127.0.0.1:3000
```

## 项目结构

```text
src/
  backend/
    config.js      # 环境变量和路径配置
    db.js          # SQLite 连接、建表、数据访问
    http.js        # HTTP 工具函数
    seed.js        # 示例数据
    server.js      # API 路由和静态资源服务
  frontend/
    app.js         # 前端交互逻辑
    index.html     # 页面结构
    styles.css     # 界面样式
data/
  .gitkeep         # 数据目录占位
```

## API

- `GET /api/health`：服务健康状态
- `GET /api/features`：获取功能列表
- `POST /api/features`：新增功能
- `PATCH /api/features/:id/status`：更新功能状态
- `GET /api/feedback`：获取反馈列表
- `POST /api/feedback`：新增反馈

## 下一步建议

1. 根据你的产品方向定义真实数据模型。
2. 接入登录和权限。
3. 把前端替换为 React/Vue，或继续保持轻量原生实现。
4. 增加自动化测试和部署配置。
