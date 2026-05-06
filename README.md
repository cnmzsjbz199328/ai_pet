# Hatch-Pet Factory (Sprite Animator Pro)

一个基于 AI 的专业 character sprite 生产系统，严格遵循 [Hatch-Pet](https://github.com/openai/skills/blob/main/skills/.curated/hatch-pet/SKILL.md) 动画资产标准。

## 🚀 核心功能

- **9 行标准序列生成**：支持 `base`, `idle`, `running`, `waving`, `jumping`, `failed`, `review`, `sleeping` 等全套动作。
- **技术级对齐管控**：通过 1x8 布局引导图（Layout Guide）强制模型在 192x208 像素网格内生成，确保帧间无偏移。
- **自动化图像流水线**：
  - **Chroma-key 抠图**：自动识别并去除纯绿（#00FF00）背景。
  - **帧切割与对齐**：自动将模型生成的 Strip 图条拆分为独立透明 PNG。
  - **大图集拼合**：生成符合标准的 1536x1872 (8列 x 9行) 最终 Spritesheet。
- **身份一致性维护**：支持 Reference Image 机制，锁定 Character Persona，确保不同动作间的角色细节完全一致。
- **一键包导出**：导出合并后的 `.webp` 图集和包含元数据的 `pet.json` 配置文件。

## 🛠 技术栈

- **前端框架**: React 19 + TypeScript
- **构建工具**: Vite 6
- **样式方案**: Tailwind CSS 4 (原生支撑)
- **AI 模型**: 
  - **Gemini 2.5 Flash Image**: 负责 1x8 动作序列帧生成。
  - **Gemini 1.5/2.0**: 负责 Prompt Engineering 优化。
- **动画引擎**: Motion (Framer Motion)
- **图像处理**: HTML5 Canvas API (用于客户端实时切割与像素级抠图)
- **图标库**: Lucide React

## 📐 规格说明 (Hatch-Pet Standard)

| 属性 | 规格 |
| --- | --- |
| 单帧尺寸 | 192 x 208 px |
| 每行帧数 | 8 帧 |
| 总行数 | 9 行 |
| 图集总尺寸 | 1536 x 1872 px |
| 背景 | 透明 PNG / WebP |
| 导出格式 | `spritesheet.webp` + `pet.json` |

## 📂 项目结构

- `src/services/imageProcessor.ts`: 核心图像切割、抠图与组装逻辑。
- `src/services/promptBuilder.ts`: 针对每个动作状态的结构化 Prompt 注入。
- `src/services/layoutGuide.ts`: 动态生成 1x8 参考坐标系辅助图。
- `src/components/PetPreviewPlayer.tsx`: 基于 Canvas 的逐帧预览播放器。

## 📝 开发者指南

1. **配置秘钥**: 在 AI Studio 的 Secrets 面板中设置 `GEMINI_API_KEY`。
2. **生成 Base**: 先生成 "Base Design" 作为角色锚点。
3. **扩展动作**: 选中其他行（如 Walk），AI 将参考 Base 图像生成对应动作。
4. **组装下载**: 点击 "Preview Atlas" 后即可导出完整的 Pet 资产包。

---
Powered by **Sprite Sequence Generator Skill** 
