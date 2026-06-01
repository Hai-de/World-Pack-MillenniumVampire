# 千年吸血鬼 (Millennium Vampire)

单人日记式吸血鬼角色扮演世界包。一名吸血鬼在千年历史中用第一人称记录自己的经历。核心模拟对象是吸血鬼主体、记忆、时间流逝。

> 在这里的吸血鬼并非世俗意义上的传统吸血鬼——食用人类某个部位的生物都可以被认为是吸血鬼，也就是食人的怪物。

## 状态

**v0.1.0** — 前端与后端基础设施均已实现。

## 世界观概要

- **主题**：千年吸血鬼单人日记式角色扮演
- **循环**：骰子滑动 → 提示触发 → 吸血鬼回应 → 产生经历 → 结合回忆 → 骰子再次滑动
- **结束条件**：技艺与资源双双枯竭时描述自己的消亡（无胜利条件）
- **时间**：不稳定步进区间（1–120 tick），一次步进可跨越数日到数十年

## 核心机制

### 骰子系统
- **1d10 − 1d6**：结果为正向前滑动，为负向后滑动
- 骰子结果决定吸血鬼在提示池中的滑动方向和距离

### 五种资源
| 资源 | 说明 |
|------|------|
| **技艺 (Skills)** | 能力和特质，分已检验/未检验 |
| **资源 (Resources)** | 资产、组织或珍视之物 |
| **角色 (Characters)** | 凡俗生物（会死）/ 不朽生物 |
| **印记 (Marks)** | 非人特征，陪伴吸血鬼一生 |
| **回忆 (Memories)** | 3 段经历 → 1 段回忆，最多 5 段 |

### 替代规则
- 无对应技艺 → 失去一种资源
- 无可用资源 → 检验一项技艺
- 两者皆无 → 描述自己的消亡

### 日记系统
- 特殊资源，最多容纳 4 段回忆
- 放入日记的回忆从头脑中消失
- 丢失日记 = 丢失其中所有回忆

## 架构

```
vampire_millennium/
├── pack.yaml                    # 世界包元数据 + frontend 配置
├── config/
│   ├── ai.yaml                  # AI 推理配置
│   ├── authorities.yaml         # 权限授予（日记权限）
│   ├── behavior_trees.yaml      # 行为树（消亡判定 + 叙事回应）
│   ├── bootstrap.yaml           # 初始状态 + origin_story 事件
│   ├── capabilities.yaml        # 11 个 capability 声明
│   ├── entities.yaml            # 实体（吸血鬼、日记、中介、机构）
│   ├── identities.yaml          # 身份定义
│   ├── prompts.yaml             # 世界级 prompt 模板
│   ├── rules.yaml               # 替代规则（3 条）
│   ├── simulation_time.yaml     # 时间步进配置
│   ├── storage.yaml             # 7 张 pack-local 表
│   ├── time_systems.yaml        # 叙事时钟
│   └── variables.yaml           # 容量配置变量
├── plugins/
│   ├── vampire-core/            # 核心逻辑插件（1097 行）
│   │   ├── plugin.manifest.yaml
│   │   └── src/server.ts
│   └── mortality/               # 凡俗生物死亡判定插件
│       ├── plugin.manifest.yaml
│       └── src/mortality_contributor.ts
└── frontend/                    # 独立 Vue 3 前端子应用
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    └── src/
        ├── main.ts              # mount/unmount 入口
        ├── App.vue              # 根组件
        ├── router.ts            # Hash 路由（8 条）
        ├── design/              # 哥特式设计系统
        ├── stores/              # 4 个 Pinia Store
        ├── composables/         # 通用 composables
        ├── lib/                 # HTTP 客户端 + 骰子逻辑
        ├── components/          # 15 个组件
        └── pages/               # 8 个页面
```

## Capability 清单

### perceive — 同步查询
| Key | 说明 |
|-----|------|
| `perceive.current_prompt` | 获取提示池当前位置的提示 |
| `perceive.character_state` | 五种资源 + 身份状态聚合 |
| `perceive.diary_entries` | 日记条目列表 |
| `perceive.chronicle` | 已消费提示历史（编年史） |
| `perceive.full_state_snapshot` | 完整状态快照（重连同步） |
| `perceive.recorded_memory` | 日记中已记录的记忆 |

### invoke — 异步调用
| Key | 说明 |
|-----|------|
| `invoke.roll_dice` | 投掷骰子 + 提示池滑动 |
| `invoke.respond_to_prompt` | 回应提示 + 创建经历 |
| `invoke.character_creation` | 车卡流程（9 步初始化） |
| `invoke.write_diary_entry` | 写日记条目 |
| `invoke.pass_time` | 推进时间 |

## 插件

### vampire-core（核心逻辑）

**职责**：
- 5 个 perceive 查询处理器
- 3 个 invoke 动作处理器
- 行为树 callHandler（`process_turn` / `process_demise`）
- 替代规则评估（RuleContributor）
- 提示池管理（种子 10 条 + AI 补充）
- 记忆衰减（DataCleaner）

**注册的扩展点**：
- `server.pack_storage.access`
- `server.inference.request`
- `server.rule_contributor.register`
- `server.data_cleaner.register`

### mortality（凡俗生物死亡判定）

**职责**：
- StepContributor：每次 sim loop step 2 检查所有 `tags: ["mortal"]` 实体
- Sigmoid 死亡曲线：`P(death) = max_probability / (1 + e^(-steepness * (age - midpoint)))`
- 参数：`max_probability: 0.8`、`midpoint: 60`、`steepness: 0.08`

## 前端

### 技术栈
- Vue 3 + Pinia + Vue Router（Hash 路由）
- Tiptap 富文本编辑器
- 独立 Vite 构建，输出到 `frontend/dist/`

### 设计系统
- **风格**：哥特式日记美学
- **色系**：深棕/深紫/深蓝 + 血色红/古金色
- **字体**：Playfair Display（标题）+ Inter（正文）+ Caveat（手写）
- **响应式**：桌面 ≥1024px / 平板 768–1023px / 移动 <768px

### 核心组件
| 组件 | 路由 | 说明 |
|------|------|------|
| DiceRoller | `#/` | 3D 骰子投掷动画 |
| PromptDisplay | `#/` | 提示卡片（羊皮纸纹理） |
| VampireResponse | `#/` | Tiptap 回应编辑器 |
| CharacterPanel | 侧边栏 | 五种资源面板 |
| CharacterCreation | `#/character-creation` | 9 步车卡向导 |
| DiaryReader | `#/diary` | 仿古书籍翻页阅读器 |
| MemoryBrowser | `#/memories` | 回忆网格浏览器 |
| Chronicle | `#/chronicle` | 垂直时间线编年史 |
| Demise | `#/demise` | 消亡终局 |
| EventToastStack | 全局 | 5 种事件通知 |

### 构建
```bash
cd frontend
pnpm install
pnpm build   # → dist/index.js + dist/style.css
```

## 存储

| 表名 | 主键 | 用途 |
|------|------|------|
| `vampire_state` | id | 吸血鬼全局状态 JSON |
| `vampire_memories` | id | 回忆容器 |
| `vampire_experiences` | id | 经历记录 |
| `vampire_characters` | id | 凡俗/不朽角色 |
| `vampire_aliases` | id | 历史身份/伪装 |
| `era_markers` | id | 时代节点 |
| `prompt_pool` | position | 提示池序列 |

## 时间系统

```yaml
initial_tick: 0
min_tick: 0
step:
  strategy: variable
  range:
    min: 1
    max: 120
```

tick 为叙事间隔单位，不对应具体时间单位。一次步进可跨越数日、数年甚至数十年。

## 车卡流程（§15）

故事开始前的 9 步准备：
1. 设定吸血鬼名字（本名/化名）和外观
2. 创建成为吸血鬼前的经历
3. 创建三个凡人角色
4. 创建三个技艺
5. 创建三个资源
6. 创建三段经历
7. 创建一个不朽者角色
8. 创建一个印记
9. 创建变为吸血鬼的相关经历

车卡进度通过 localStorage 自动暂存，最后一步一次性提交到后端。
