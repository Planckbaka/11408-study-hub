<div align="center">

# 11408 Study Hub · 408 考研备考知识库与交互式刷题工作台

**面向考研 11408（计算机学科专业基础综合）的纯前端交互式复习空间**

[![GitHub Pages Deploy](https://github.com/Planckbaka/11408-study-hub/actions/workflows/deploy.yml/badge.svg)](https://github.com/Planckbaka/11408-study-hub/actions/workflows/deploy.yml)
[![Live Preview](https://img.shields.io/badge/Live%20Preview-GitHub%20Pages-0ea5e9?logo=githubpages&logoColor=white)](https://planckbaka.github.io/11408-study-hub/)
[![React](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=111)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646cff?logo=vite&logoColor=white)](https://vite.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3.4-06b6d4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

在线预览：**[https://planckbaka.github.io/11408-study-hub/](https://planckbaka.github.io/11408-study-hub/)**

</div>

---

## 项目亮点与四大核心模块

本项目围绕 11408 四科（数据结构 DS、计算机组成原理 CO、操作系统 OS、计算机网络 CN）构建纯静态单页学习工作台，所有进度与错题记录均持久化在浏览器 `localStorage` 中，开箱即用且支持 JSON 导入导出备份：

1. **考纲看板（`/`）**
   - 覆盖 DS（8 章）/ CO（7 章）/ OS（5 章）/ CN（6 章）共 **26 章** 考纲全景矩阵，按 S / A / B 级重点与跨科综合链路（`TLB-页表-Cache`、栈帧对齐、异常中断上下文切换、DMA 与磁盘调度等）组织。
   - 支持章节完成状态与原子核心考点打卡，支持跨科目/级别/关键词实时检索与 `⌘K / Ctrl+K` 全局快捷跳转。
2. **CO 计组全章精讲（`/notes/CO/CO-01` ~ `CO-07`）**
   - 计算机组成原理 7 章全稿精讲贯通，内置 **KaTeX** 数学公式渲染、**Mermaid** 硬件数据通路与时序图、高频考点/易错陷阱/解题口诀提示块，以及右侧 `IntersectionObserver` 滚动高亮目录大纲（TOC）。
   - DS / OS / CN 已预置全部 19 章考纲骨架、高频对比提示与扩展入口，便于后续增量扩充精讲正文。
3. **交互式学习 + 模考题库（`/practice`）**
   - 收录 CO 计组 7 章共 **84 道** 原创/同源改编题目（**70 道单选题 + 14 道分步评分综合大题**）。
   - 支持 **学习模式**（即时解析与核心结论）、**错题重练模式**（`/practice?mode=wrong-retry`）与 **仿真计时模考模式**（自动交卷判分 + 综合题自评 + 模考历史归档）。
4. **localStorage 错题本与 JSON 备份（`/wrong-book`）**
   - 自动收录答错选择题与自评未达标综合大题，记录累计错题次数与重练连续答对次数（连续答对 $\ge 2$ 次自动标记“已掌握”）。
   - 支持按章节 / 错因标签（`概念辨析` / `方法不会` / `审题失误` / `计算失误` / `跨科盲区`）/ 掌握度筛选，支持行内个人错题批注自动保存，并提供一键导出 `11408-study-backup-YYYY-MM-DD.json` 文件备份（含剪贴板兜底）及文件导入 / 粘贴 JSON 恢复。

---

## CO 2009–2026 真题统计说明（`/stats`）

- 统计页面基于 **2009–2026 共 18 年** 408 统考计算机组成原理真题汇总数据集构建，包含：
  - **31 个官方计组核心考点统计**（`CO_EXAM_KP_STATS`）：支持按章节过滤与按累计分值、出现次数、大题次数、覆盖年份数排序（例如最高分值考点 **Cache 映射方式** 18 年间覆盖 17 年、出现 25 次、累计 149 分）。
  - **235 条逐题分布明细**（`CO_EXAM_DETAIL_ROWS`）：提供 **18 年 × 7 章得分热力矩阵**，点击任意年份或章节单元格即可联动查看当年的题号、题型、分值与对应考点。

---

## 技术栈

| 类别 | 选型 |
| :--- | :--- |
| 前端框架 | React 18 + TypeScript 5.6 + Vite 6 |
| 路由方案 | `react-router-dom` v6 (`HashRouter`，适配 GitHub Pages 子路径刷新) |
| 样式与组件 | Tailwind CSS 3.4 + `@tailwindcss/typography` + shadcn/ui (Radix Primitives + Lucide Icons) |
| 内容与公式渲染 | `react-markdown` + `remark-gfm` + `remark-math` + `rehype-katex` (KaTeX) + `rehype-highlight` (highlight.js) + `mermaid` |
| 本地状态存储 | React Context + `localStorage` (`11408-hub-progress-v1` / `11408-hub-theme`) |

---

## 本地开发与构建

环境要求：Node.js `>= 20`（CI 使用 Node `22`）与 `npm`。

```bash
# 1. 安装依赖
npm install

# 2. 启动本地开发服务器
npm run dev

# 3. 类型检查与生产构建（输出至 dist/）
npm run typecheck
npm run build

# 4. 本地预览构建产物
npm run preview
```

---

## GitHub Pages 自动部署

仓库已配置 [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)：

1. 当代码推送至 `main` 分支或手动触发 `workflow_dispatch` 时自动运行；
2. 使用 Node 22 执行 `npm ci` 与 `npm run build` 生成静态产物 `dist/`；
3. 通过 `actions/upload-pages-artifact@v3` 与 `actions/deploy-pages@v4` 发布到 `github-pages` 环境；
4. 配合 [`vite.config.ts`](vite.config.ts) 中的 `base: '/11408-study-hub/'`、`HashRouter` 与 [`public/.nojekyll`](public/.nojekyll)，确保所有子路由、样式与静态资源在 GitHub Pages 上正常运行。

> 若你 Fork 本仓库到其他仓库名，请同步修改 [`vite.config.ts`](vite.config.ts) 中的 `base` 路径，并在仓库 `Settings -> Pages -> Build and deployment -> Source` 中选择 **GitHub Actions**。

---

## 版权与数据合规声明

- 本项目**不包含任何受版权保护的教材 PDF、机构内部讲义扫描件或商业出版题库原文**。
- 精讲笔记与图表均为对照公开考研考纲梳理编写的**原创蒸馏整理内容**；交互题库均为结合常见考点自编或独立重写的**改编训练题**；真题统计模块仅保留客观考点分类、题号、题型与分值分布元数据，用于备考优先级规划。

---

## 扩展 DS / OS / CN 贡献指南

欢迎通过 Pull Request 为数据结构（`DS`）、操作系统（`OS`）与计算机网络（`CN`）补充完整章节精讲笔记与配套习题，目录结构清晰、零后端依赖：

1. **新增章节精讲笔记（`src/data/notes/`）**
   - 参考 `src/data/notes/co-01.ts` 与 `src/types/study.ts` 中的 `StudyNote` 类型，新建如 `src/data/notes/ds-01.ts`；
   - 在 `src/data/notes/index.ts` 的 `STUDY_NOTES_BY_CHAPTER` 中注册对应章节 ID（例如 `'DS-01': DS_01_NOTE`）；
   - 将 `src/data/syllabus.ts` 中对应章节的 `hasFullNotes` 更新为 `true`。
2. **新增章节习题（`src/data/questions/`）**
   - 参考 `src/data/questions/co-01.ts` 与 `src/types/study.ts` 中的 `Question`（`ChoiceQuestion` / `ComprehensiveQuestion`）类型，新建如 `src/data/questions/ds-01.ts`；
   - 保持 `id` 唯一（建议格式 `<CHAPTER_ID>-Q01` / `<CHAPTER_ID>-C01`），`kpId` 与 `src/data/syllabus.ts` 中的考点对齐；
   - 在 `src/data/questions/index.ts` 的 `ALL_QUESTIONS` 数组中导出并合并即可生效（题库筛选、全局 `⌘K` 搜索与错题本会自动识别）。
3. **提交前校验**
   - 运行 `npm run typecheck && npm run build`，确认 TypeScript 严格模式与生产构建零报错。
