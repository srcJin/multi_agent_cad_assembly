# PRD：AssemblyCAD AI

## Agent-Controlled 2D Mechanical CAD & Simulation Workspace

**版本：** v0.3
**阶段：** Hackathon MVP / Product Prototype
**核心示例：** 2D 参数化齿轮盒 Cube Gearbox
**产品方向：** AI-native Lightweight CAD + Simulation Workspace
**核心关键词：** Director Agent、Part Agent、2D CAD、Parametric Gear、Simulation View、Assembly State、Tool Orchestration、Collision Check、Repair Loop、W&B Weave Tracing、Weave Evaluation、Weave Monitor

---

# 0. 技术决策锁定 (v0.4)

本节记录已确认的技术选型，覆盖后文中“推荐/可选”的措辞。

| 决策项 | 选定方案 | 说明 |
|---|---|---|
| Agent 驱动 | 脚本化确定性流程 | 固定 agent graph，确定性 TS 代码跑通；demo 100% 可复现 |
| Backend | Node / TypeScript | 与前端同语言、共享 Assembly State 类型包，无需 Pydantic 代码生成 |
| Frontend | 精简栈 (Vite + React) | 去掉 Next.js SSR 复杂度；React + Zustand + React Flow + Planck.js + SVG |
| 齿轮几何 | JSCAD（仅后端） | `@jscad/modeling` 在 Node 后端生成 2D 齿轮轮廓点，写入 Assembly State，前端只做 SVG 渲染 |
| 可观测/评估 | **W&B Weave（强制）** | Tracing = P0，Evaluation = P1，Monitor = P2；详见 §13.5 |

> Hackathon 强制要求使用 W&B Weave。由于 agent 编排是确定性 TypeScript 流程，我们利用 `weave.op()` 可追踪任意函数（不限 LLM）的能力，把每个 agent 与每个 tool 包成 op，得到整条流水线的服务端 trace 树。

---

# 1. 产品概述

AssemblyCAD AI 是一个由 AI agent 控制的轻量化机械 CAD 与仿真工作空间。用户输入一个机械设计需求后，系统首先由 Director Agent 理解需求，生成设计计划、零件分解、装配计划和工具调用计划。随后系统创建或激活对应的零件建模 agent，由这些 agent 调用二维绘制、参数化建模、装配、仿真和碰撞检测工具，逐步生成一个可视化、可验证、可修复的机械装配设计。

MVP 阶段不直接做复杂 3D CAD，而是先聚焦二维机械装配：

> 一个二维立方体齿轮盒：盒体内部有两个参数化齿轮，齿轮安装在轴上，可以通过抽象运动模型验证啮合关系、轴心约束、间隙与碰撞。

本产品的核心不是“AI 直接生成一个 CAD 文件”，而是：

> AI agent 通过工具调用控制一个机械设计环境，在绘制视图和仿真视图之间维护一致的装配状态。

---

# 2. 一句话定义

AssemblyCAD AI 是一个 AI-controlled 2D mechanical CAD & simulation workspace，通过 Director Agent 编排多个零件 agent，让它们调用绘制、装配、仿真和碰撞检测工具，共同生成并修复机械装配设计。

---

# 3. 产品核心判断

## 3.1 为什么不是 Gradio

如果产品只是：

> Prompt → Agent Log → CAD 文件预览

Gradio 足够。

但当前目标已经变成：

> 一个 AI agent 可以操作的 2D mechanical design workspace。

它需要：

* 实时二维绘制画布；
* 参数化齿轮轮廓；
* 盒体、轴、孔位、尺寸标注；
* 仿真视图；
* 运动播放；
* 约束和碰撞高亮；
* agent graph；
* tool call timeline；
* drawing view 与 simulation view 同步；
* shared assembly state；
* 前端复杂状态管理。

因此，MVP 应该使用更接近真实产品的前端架构，而不是 Gradio。

MVP 技术方向（已锁定，见 §0）：

* Vite + React 作为主界面（精简栈，无 Next.js SSR）；
* JSCAD（`@jscad/modeling`，仅后端）生成真实 2D 齿轮轮廓点；
* Planck.js / Box2D 做二维运动仿真和约束关系；
* React Flow 展示 agent orchestration；
* Node / TypeScript backend 负责确定性 agent orchestration、状态持久化和高层 planning；
* W&B Weave 作为可观测与评估层（agent / tool 均包成 `weave.op`）。

---

# 4. 产品愿景

AssemblyCAD AI 的长期愿景是成为一个 AI-native lightweight CAD system。

用户不需要直接操作复杂 CAD 命令，而是通过自然语言提出设计目标。AI agent 不只是回答建议，而是实际操作设计环境：

* 创建零件；
* 定义参数；
* 生成草图；
* 生成齿轮；
* 添加轴和孔；
* 建立装配关系；
* 运行仿真；
* 检查碰撞；
* 修复设计；
* 导出图纸或模型。

MVP 先在二维中验证工作流，之后可扩展到：

* 2D sketch → 3D extrusion；
* 3D CAD generation；
* STEP/STL export；
* 真实 B-rep geometry；
* 机械装配约束求解；
* 与现有 CAD 平台集成。

---

# 5. 核心问题

## 5.1 当前 AI CAD 工具的问题

很多 AI 工具可以生成：

* 图片；
* 3D mesh；
* 单个模型；
* CAD 脚本；
* 概念图。

但真实机械设计不是一个单体对象，而是一个装配系统：

* 零件之间有位置关系；
* 零件之间有运动关系；
* 齿轮需要啮合；
* 轴需要同心；
* 孔需要对齐；
* 盒体需要留出 clearance；
* 零件之间不能碰撞；
* 修改一个零件会影响其他零件；
* 绘制模型和仿真模型需要保持一致。

单个 AI 一次性生成模型，很难持续维护这些关系。

## 5.2 为什么需要 Director Agent

系统不能一开始就 hardcode CAD。

合理流程应是：

1. Director Agent 理解用户需求；
2. 生成设计计划；
3. 生成零件分解；
4. 生成装配计划；
5. 生成初始二维预览；
6. 创建或激活零件 agent；
7. 各 agent 调用工具建模；
8. 仿真 agent 运行检测；
9. Director Agent 根据结果派发修复任务。

Director Agent 是整个系统的大脑。

它不是建模者，而是设计指挥者。

## 5.3 为什么需要双视图

机械设计同时存在两个世界：

### Drawing View：真实绘制世界

用于表达：

* 齿轮真实轮廓；
* 齿数；
* 模数；
* 压力角；
* 轴孔；
* 盒体边界；
* 尺寸标注；
* 工程图导出。

### Simulation View：抽象仿真世界

用于表达：

* 刚体；
* 关节；
* 轴心；
* gear relation；
* 碰撞体；
* 运动路径；
* 接触和碰撞事件。

两个视图不应该混为一谈。
它们应该共享同一个 Assembly State，但由不同 agent 和不同工具负责。

---

# 6. MVP 范围

## 6.1 MVP 固定案例：2D Cube Gearbox

用户输入：

> Create a 2D cube gearbox with two meshing gears inside a box. The gears should rotate around fixed shafts and should not collide with the box.

系统输出：

1. Director Agent 的设计计划；
2. 二维 Layout Preview；
3. 参数化齿轮 Drawing View；
4. 抽象运动 Simulation View；
5. Agent Orchestration View；
6. Tool Call Timeline；
7. Assembly State；
8. Validation Report；
9. Repair Loop；
10. 最终通过检查的 2D 机械装配设计。

## 6.2 MVP 零件

MVP 包含以下零件：

1. Box Frame
   二维盒体边界，包含内部 cavity、壁厚和 lid 区域。

2. Gear A
   参数化齿轮，包含齿数、模数、压力角、pitch circle、root circle、outer circle、中心孔。

3. Gear B
   参数化齿轮，与 Gear A 啮合。

4. Shaft A
   Gear A 的固定旋转轴。

5. Shaft B
   Gear B 的固定旋转轴。

6. Lid / Top Cover
   简化为盒体顶部盖板或装配边界。

## 6.3 MVP 视图

MVP 至少包含四个核心视图：

1. Drawing View
   显示真实二维机械绘制结果。

2. Simulation View
   显示抽象刚体、关节、运动和碰撞。

3. Orchestration View
   显示 Director Agent、Part Agents、Simulation Agent、Validation Agent、Repair Coordinator 的关系和状态。

4. Timeline / Tool Calls View
   显示每个 agent 调用了什么工具、产生了什么结果、是否失败、是否触发修复。

---

# 7. 非目标

MVP 阶段明确不做：

1. 不做完整 SolidWorks；
2. 不做完整 3D CAD；
3. 不做真实工业级齿轮啮合仿真；
4. 不做复杂接触动力学；
5. 不做有限元分析；
6. 不做用户可拖拽编辑 agent graph；
7. 不做完整 CAD constraint solver；
8. 不做云端团队协作；
9. 不做复杂文件管理系统；
10. 不做真实制造报价；
11. 不做任意机械产品生成。

MVP 目标只验证：

> Director Agent 能否编排多个零件 agent，调用二维绘制和仿真工具，生成、验证并修复一个参数化齿轮盒装配设计。

---

# 8. 核心用户

## 8.1 Hackathon 评委和观众

他们需要看到：

* 这不是普通 text-to-3D；
* AI agent 正在操作一个设计工具；
* 有真实绘制视图；
* 有仿真视图；
* 有 agent orchestration；
* 有碰撞或约束检测；
* 有修复 loop。

## 8.2 Maker / 硬件原型用户

他们关心：

* 能否快速生成机械草图；
* 能否看到齿轮、轴、孔位；
* 能否避免明显碰撞；
* 能否导出 SVG/DXF 或后续 3D 文件。

## 8.3 机械设计与工业设计学生

他们关心：

* 设计如何从需求变成零件；
* 零件如何被装配；
* 齿轮参数如何影响布局；
* 绘图模型和仿真模型如何对应；
* AI 如何辅助设计流程，而不是只给文字建议。

## 8.4 长期潜在用户

未来可能包括：

* 教育机构；
* maker space；
* 硬件创业团队；
* 机器人团队；
* 机械设计初学者；
* 产品原型设计师；
* AI CAD 工具开发者。

---

# 9. 核心产品原则

## 9.1 Agent 不直接生成最终模型，而是调用工具

Agent 的职责不是一次性吐出 CAD 文件。
Agent 应该通过工具调用逐步操作设计环境。

例如：

* 创建齿轮；
* 设置齿数；
* 设置模数；
* 设置中心位置；
* 添加 shaft；
* 创建 gear relation；
* 运行 collision check；
* 修改参数；
* 重新绘制；
* 重新仿真。

## 9.2 Director Agent 先规划，再执行

建模之前必须有 plan。

Director Agent 需要先输出：

* design intent；
* part list；
* drawing plan；
* simulation plan；
* assembly constraints；
* required agents；
* tool execution sequence；
* validation criteria。

## 9.3 先 2D，后 3D

二维阶段更适合 MVP，因为：

* 视图更清晰；
* 参数化齿轮更容易展示；
* 运动仿真更容易；
* 碰撞检测更容易；
* agent tool 调用更可控；
* 可以作为后续 3D extrusion 的 sketch 基础。

## 9.4 Drawing View 和 Simulation View 分离但同步

Drawing View 负责真实机械轮廓。
Simulation View 负责抽象运动关系。

两者必须来自同一个 Assembly State。

## 9.5 每个零件有 owner agent

每个零件由固定 agent 持续负责：

* 生成；
* 修改；
* 响应 validation；
* 修复；
* 更新对应 drawing representation；
* 更新对应 simulation representation。

---

# 10. Agent 设计

## 10.1 Director Agent

### 职责

Director Agent 是最高层指挥 agent。

负责：

* 理解用户需求；
* 生成设计计划；
* 生成零件列表；
* 决定需要哪些 agent；
* 生成初始 layout；
* 生成工具调用计划；
* 决定 drawing view 和 simulation view 的同步方式；
* 接收 validation report；
* 判断问题责任；
* 派发 repair task；
* 控制整体 workflow；
* 维护设计目标不跑偏。

### 输入

* 用户 prompt；
* 用户参数；
* 当前 Assembly State；
* 当前 agent states；
* validation report；
* tool call history。

### 输出

* design plan；
* part decomposition；
* layout plan；
* tool plan；
* repair decision；
* next action。

## 10.2 Layout Preview Agent

### 职责

在正式建模前生成二维布局预览。

负责：

* 确定盒体边界；
* 确定齿轮中心位置；
* 确定齿轮中心距；
* 确定 shaft 位置；
* 确定 lid 位置；
* 确定 clearance 区域；
* 为后续 part agents 提供初始参考。

### 价值

没有 layout preview，零件 agent 容易各自建模，无法形成一致装配。

## 10.3 Part Drawing Agents

每个零件有对应 drawing agent。

### BoxDrawingAgent

负责：

* 绘制盒体边界；
* 定义 inner cavity；
* 定义壁厚；
* 定义 shaft hole 位置；
* 定义 lid 接口区域；
* 维护 box 与内部零件的 clearance。

### GearADrawingAgent

负责：

* 生成 Gear A 的参数化齿轮轮廓；
* 维护齿数、模数、压力角；
* 生成中心孔；
* 维护 pitch radius、outer radius、root radius；
* 响应与 Gear B、Shaft A、Box 的冲突。

### GearBDrawingAgent

职责与 GearADrawingAgent 类似，但负责 Gear B。

### ShaftADrawingAgent

负责：

* 绘制 Shaft A；
* 维护 shaft center；
* 维护 shaft diameter；
* 与 Gear A 中心孔对齐；
* 与 Box shaft hole 对齐。

### ShaftBDrawingAgent

职责与 ShaftADrawingAgent 类似，但负责 Shaft B。

### LidDrawingAgent

负责：

* 绘制 lid；
* 维护 lid 与 box 的配合；
* 检查是否与内部齿轮或轴冲突。

## 10.4 Simulation Agent

### 职责

负责把 Assembly State 转换为抽象仿真模型。

它不负责真实齿轮轮廓。
它负责：

* 创建 rigid bodies；
* 创建 revolute joints；
* 创建 gear relation；
* 设置 gear ratio；
* 运行 motion simulation；
* 检查碰撞；
* 检查运动过程是否有干涉；
* 输出 simulation report。

### Drawing vs Simulation 的区别

Gear 在 Drawing View 中是参数化齿轮轮廓。
Gear 在 Simulation View 中可以是简化圆形刚体 + gear joint。

这是合理的，因为仿真模型是设计模型的抽象表示。

## 10.5 Validation Agent

### 职责

负责综合检查 Drawing View 和 Simulation View 的一致性。

检查：

* 齿轮中心距是否合理；
* 齿轮参数是否匹配；
* shaft 是否与 gear center 同心；
* shaft 是否与 box hole 对齐；
* gear 是否与 box 内壁碰撞；
* lid 是否与内部零件冲突；
* drawing 参数和 simulation 参数是否一致；
* 运动仿真中是否出现碰撞；
* 是否存在缺失零件或缺失约束。

## 10.6 Repair Coordinator Agent

### 职责

负责把问题分派回对应 agent。

例如：

* 齿轮太大 → GearDrawingAgent；
* 中心距错误 → LayoutPreviewAgent 或 Gear Agents；
* 轴孔错位 → BoxDrawingAgent 或 ShaftDrawingAgent；
* 仿真约束错误 → SimulationAgent；
* 设计目标冲突 → Director Agent 重新规划。

Repair Coordinator 可以由 Director Agent 兼任，但 MVP 中可以作为独立 agent 展示，增强 orchestration 可视化。

---

# 11. Tool 设计

## 11.1 Tool 类型

系统应提供以下工具类别：

1. Planning Tools
   用于解析需求、生成计划、生成零件列表和装配计划。

2. Drawing Tools
   用于创建二维机械绘图元素。

3. Gear Tools
   用于生成参数化齿轮轮廓。

4. Assembly Tools
   用于定义装配关系。

5. Simulation Tools
   用于创建抽象物理模型和运行运动仿真。

6. Validation Tools
   用于检查约束、碰撞和一致性。

7. Repair Tools
   用于修改参数、重新生成、重新验证。

8. Visualization Tools
   用于渲染 Drawing View、Simulation View、Orchestration View 和 Timeline。

## 11.2 Drawing Tools

Drawing Tools 应支持：

* 创建矩形；
* 创建圆；
* 创建孔；
* 创建线段；
* 创建中心线；
* 创建尺寸标注；
* 创建参数化齿轮；
* 更新零件参数；
* 生成 SVG；
* 生成 DXF；
* 高亮特定零件；
* 高亮 clearance zone；
* 高亮冲突区域。

## 11.3 Parametric Gear Tools

齿轮工具是 MVP 的关键。

应支持：

* 设置齿数；
* 设置模数；
* 设置压力角；
* 设置中心位置；
* 设置中心孔直径；
* 设置齿轮厚度参数；
* 计算 pitch radius；
* 计算 outer radius；
* 计算 root radius；
* 生成二维齿轮轮廓；
* 输出 drawing geometry；
* 输出 simulation parameters。

MVP 可以先生成近似或标准 involute gear 轮廓，但必须支持参数变化后重新生成。

## 11.4 Simulation Tools

Simulation Tools 应支持：

* 创建 box boundary；
* 创建 gear rigid body；
* 创建 shaft fixed point；
* 创建 revolute joint；
* 创建 gear relation；
* 设置 gear ratio；
* 运行 simulation；
* 播放 / 暂停 / step；
* 输出碰撞事件；
* 输出运动检查结果。

## 11.5 Validation Tools

Validation Tools 应支持：

* 检查 gear center distance；
* 检查 gear pair ratio；
* 检查 gear 与 box clearance；
* 检查 shaft alignment；
* 检查 hole alignment；
* 检查 lid interference；
* 检查 drawing/simulation state 是否一致；
* 检查 missing constraints；
* 生成 validation report。

## 11.6 Repair Tools

Repair Tools 应支持：

* 修改 gear radius / module / teeth；
* 修改 gear center；
* 修改 box size；
* 修改 shaft diameter；
* 修改 shaft center；
* 修改 lid position；
* 重新生成 drawing；
* 重新生成 simulation model；
* 重新运行 validation。

---

# 12. 双视图设计

## 12.1 Drawing View

Drawing View 是“真实绘图视图”。

显示内容：

* 盒体外边界；
* 内腔；
* 两个参数化齿轮；
* pitch circle；
* shaft hole；
* shaft center；
* lid；
* 尺寸标注；
* clearance zone；
* 选中零件高亮；
* 冲突高亮。

Drawing View 主要回答：

> 这个机械零件看起来如何？它的轮廓、尺寸、孔位和齿形是否正确？

## 12.2 Simulation View

Simulation View 是“抽象仿真视图”。

显示内容：

* 简化刚体；
* 节点；
* 约束边；
* revolute joints；
* gear relation；
* 运动播放；
* collision overlay；
* contact events；
* simulation status。

Simulation View 主要回答：

> 这个装配关系能否运行？运动过程中是否碰撞？约束是否成立？

## 12.3 二者的对应关系

Drawing View 和 Simulation View 都读取同一个 Assembly State。

例如 Gear A：

Drawing representation：

* 真实齿轮轮廓；
* teeth；
* module；
* pressure angle；
* center hole；
* pitch circle。

Simulation representation：

* rigid body；
* center；
* approximate radius；
* revolute joint；
* gear ratio relation。

两个 representation 必须共享：

* part id；
* center；
* radius / pitch radius；
* shaft id；
* gear relation；
* owner agent；
* validation status。

---

# 13. Orchestration View 设计

## 13.1 目标

Orchestration View 用于展示：

* 当前有哪些 agent；
* 每个 agent 负责什么；
* agent 之间如何协作；
* 当前 workflow 执行到哪一步；
* 哪些工具被调用；
* 哪些 agent 失败或修复；
* 问题如何被路由。

这是产品差异化关键。

没有 Orchestration View，系统看起来只是普通 CAD demo。

## 13.2 Agent Graph

MVP 中 agent graph 可以是固定结构：

* User Request
* Director Agent
* Layout Preview Agent
* BoxDrawingAgent
* GearADrawingAgent
* GearBDrawingAgent
* ShaftADrawingAgent
* ShaftBDrawingAgent
* LidDrawingAgent
* Simulation Agent
* Validation Agent
* Repair Coordinator
* Final Assembly

Graph 中应显示：

* agent 节点；
* 状态颜色；
* 当前运行节点；
* repair routing edge；
* tool call edge；
* part ownership。

## 13.3 Agent 状态

每个 agent 状态包括：

* idle；
* planning；
* running；
* waiting；
* completed；
* failed；
* repaired；
* skipped。

## 13.4 Timeline View

Timeline 显示所有执行步骤：

1. User request received；
2. Director Agent generated design plan；
3. Layout Preview Agent generated layout；
4. GearADrawingAgent generated gear A；
5. GearBDrawingAgent generated gear B；
6. BoxDrawingAgent generated box frame；
7. Simulation Agent created simulation model；
8. Validation Agent detected issue；
9. Repair Coordinator routed issue；
10. GearADrawingAgent updated gear parameter；
11. Simulation Agent reran simulation；
12. Validation passed。

每条 timeline event 应显示：

* step；
* agent；
* action；
* tool；
* input summary；
* output summary；
* status；
* affected parts。

## 13.5 W&B Weave 可观测与评估层

Hackathon 强制使用 W&B Weave。MVP 的 agent 编排是确定性 TypeScript 流程（非 LLM 驱动），因此利用 Weave 核心能力：`weave.op()` 可追踪任意函数，而不仅是 LLM 调用。

### 13.5.1 初始化

后端 Node/TS 启动时：

```ts
import * as weave from 'weave';
await weave.init('<team>/assemblycad-ai');
```

### 13.5.2 Tracing（P0）

* 把每个 agent 的 run 包成 op：DirectorAgent、LayoutPreviewAgent、各 Part Agent、SimulationAgent、ValidationAgent、RepairCoordinator；
* 把顶层 `runWorkflow` 包成 op → 产生一棵根 trace，整条 Director → Part → Simulation → Validation → Repair 流水线成为嵌套调用树。这棵树是 Orchestration View / Timeline 的服务端真实镜像；
* 把每个 tool（create_gear、create_box、run_validation、repair…）也包成 op → tool call 成为叶子 span，直接实现 §11 / §13.4 的 tool call timeline；
* op 自动捕获输入 / 输出，记录每步 Assembly State 切片，可回放；
* `runWorkflow` 返回 Weave trace URL，前端展示 “View in Weave” 链接（强 demo 信号）。

```ts
const runDirector = weave.op(directorRun, { name: 'DirectorAgent' });
const runWorkflow = weave.op(async (req) => { /* pipeline */ }, { name: 'runWorkflow' });
```

### 13.5.3 Evaluation（P1）

* `weave.Dataset`：一组齿轮盒设计用例（不同 module / teeth、不同 seeded failure）；
* model = 包成 op 的 `runWorkflowThenRepair`；
* scorers（各为 op）：validationPass、repairRounds、centerDistanceError、crossViewConsistency、clearance；
* `new weave.Evaluation({ id, dataset, scorers })` → `evaluate({ model })`；
* 用途：调整 layout / repair 启发式后重跑 eval，在 Weave 中对比 pass-rate，自动 hill-climb 多 agent 系统（官方教程主张）。

```ts
const dataset = new weave.Dataset({ id: 'gearbox-cases', rows: [/* {module, teeth_a, teeth_b, seed_failure, ...} */] });
const validationPass = weave.op(({ modelOutput }) => modelOutput.validation.passed, { name: 'validationPass' });
const evaluation = new weave.Evaluation({ id: 'gearbox-eval', dataset, scorers: [validationPass /* ...*/] });
await evaluation.evaluate({ model });
```

### 13.5.4 Monitor / 线上评估（P2）

通过 W&B UI 对线上 trace 做在线打分；MVP 不做，列入 roadmap。

### 13.5.5 开发期辅助

开发时可把 Claude Code 接入 W&B MCP server（`https://mcp.withwandb.com/mcp`，bearer 为 W&B API key）查询 trace 与 eval，加速调试。属开发流程，非产品功能。

### 13.5.6 降级策略

无网络 / 无 W&B key 时，通过开关禁用 `weave.init` 与 op 包装（op 透明透传），保证离线 demo 可跑。

---

# 14. Assembly State 设计

Assembly State 是系统核心中间层。

所有视图、agent、tools 都围绕 Assembly State 工作。

## 14.1 Assembly State 包含

1. Project Metadata
   项目名称、用户 prompt、当前版本、当前状态。

2. Global Design Intent
   用户需求、设计目标、制造假设、约束条件。

3. Layout Plan
   盒体尺寸、齿轮中心、轴位置、lid 位置。

4. Parts
   所有零件及其参数。

5. Drawing Representations
   每个零件的二维绘图数据。

6. Simulation Representations
   每个零件的简化仿真数据。

7. Assembly Constraints
   零件之间的关系、齿轮啮合、轴心约束、clearance。

8. Validation Reports
   检查结果、错误、警告、通过项。

9. Repair History
   修复任务、修复前后参数、责任 agent。

10. Agent States
    所有 agent 当前状态。

11. Tool Call Timeline
    每次工具调用的记录。

## 14.2 Part State

每个零件需要包含：

* part id；
* part type；
* owner agent；
* drawing parameters；
* simulation parameters；
* related constraints；
* current status；
* validation status；
* last modified by；
* repair history。

## 14.3 Constraint State

每条约束需要包含：

* constraint id；
* constraint type；
* involved parts；
* source representation；
* target representation；
* validation rule；
* responsible agent；
* tolerance；
* current status。

常见 constraint type：

* gear mesh；
* coaxial；
* fixed axis；
* clearance；
* containment；
* lid mate；
* no collision；
* parameter equality；
* drawing-simulation consistency。

---

# 15. 功能需求

## 15.1 P0：MVP 必须实现

### Product Flow

* 用户可以使用默认 prompt 启动系统；
* Director Agent 可以生成 design plan；
* 系统可以生成 part list；
* 系统可以生成 layout preview；
* 系统可以创建固定 agent graph；
* Part Agents 可以生成对应零件；
* 系统可以生成 Drawing View；
* 系统可以生成 Simulation View；
* 系统可以运行 validation；
* 系统可以发现至少一个错误；
* Repair Coordinator 可以将错误路由给对应 agent；
* 对应 agent 可以修改参数并重新生成；
* 系统可以重新验证并显示结果。

### Drawing

* 支持二维盒体；
* 支持参数化齿轮；
* 支持轴心和轴孔；
* 支持 lid；
* 支持零件高亮；
* 支持基础尺寸显示；
* 支持 SVG 或等价绘图输出。

### Simulation

* 支持简化 gear rigid body；
* 支持 fixed shaft / revolute joint；
* 支持 gear relation；
* 支持基础运动播放；
* 支持碰撞或 clearance 检测；
* 支持错误高亮。

### Orchestration

* 支持 agent graph；
* 支持 agent status；
* 支持 tool call timeline；
* 支持 repair routing 展示；
* 支持当前步骤高亮。

### Observability（W&B Weave，P0）

* 后端启动调用 `weave.init`；
* 每个 agent run 包成 `weave.op`；
* 每个 tool 包成 `weave.op`；
* 顶层 `runWorkflow` 包成 op，产生完整嵌套 trace 树；
* 运行后可在 Weave UI 看到 Director → Part → Simulation → Validation → Repair 调用树；
* 无网络 / 无 key 时可关闭 Weave，流程仍可跑（降级）。

## 15.2 P1：时间允许实现

* 参数面板实时编辑；
* Gear teeth/module/pressure angle 可调；
* Drawing View 与 Simulation View 实时同步；
* DXF 导出；
* 更复杂的 validation report；
* 更清晰的 collision overlay；
* LLM 参与 Director Agent planning；
* LLM 解释 validation 和 repair；
* 保存 project state；
* undo / redo 简化版本；
* W&B Weave Evaluation：dataset（多齿轮盒用例）+ scorers（validationPass / repairRounds / centerDistanceError / crossViewConsistency / clearance）+ `evaluation.evaluate`；
* 前端展示 “View in Weave” trace 链接；
* 用 Weave eval 对比不同 layout / repair 启发式的 pass-rate。

## 15.3 P2：后续版本

* 真实 CAD constraint solver；
* sketch under-constrained / over-constrained 检查；
* 多种机械模板；
* 2D sketch extrude 到 3D；
* 3D STEP/STL export；
* 真实 3D collision；
* motion simulation；
* 自定义 agent graph；
* CAD 插件；
* 多用户协作。

---

# 16. Validation 设计

## 16.1 Drawing Validation

检查：

* 齿轮是否成功生成；
* 齿轮参数是否有效；
* 中心孔是否存在；
* 轴心是否在齿轮中心；
* 齿轮是否位于盒体内部；
* 盒体是否有足够 clearance；
* lid 是否与内部零件冲突；
* 尺寸是否超出全局边界。

## 16.2 Simulation Validation

检查：

* simulation body 是否存在；
* gear body 是否与 drawing gear 对应；
* revolute joint 是否连接到正确 shaft；
* gear relation 是否存在；
* gear ratio 是否合理；
* 运动过程中是否碰撞；
* gear 是否离开轴心；
* box boundary 是否固定。

## 16.3 Cross-View Consistency Validation

检查 Drawing View 和 Simulation View 是否一致：

* drawing gear center = simulation gear center；
* drawing pitch radius = simulation gear radius reference；
* drawing shaft center = simulation joint anchor；
* drawing gear relation = simulation gear relation；
* drawing box boundary = simulation boundary；
* drawing part id = simulation body id。

这是产品关键点。

---

# 17. Repair 设计

## 17.1 Repair 类型

### 参数修复

例如：

* 缩小 gear module；
* 减少 gear teeth；
* 移动 gear center；
* 增大 box size；
* 增大 shaft hole；
* 增加 clearance。

### 关系修复

例如：

* 重新建立 gear relation；
* 修复 revolute joint；
* 修复 drawing/simulation mapping；
* 重新绑定 part id。

### 布局修复

例如：

* 重新安排齿轮位置；
* 移动 shaft；
* 改变 lid 位置；
* 扩大 box。

## 17.2 Repair Routing

Validation Agent 输出错误后，Repair Coordinator 决定责任方：

* 齿轮参数错误 → GearDrawingAgent；
* 齿轮中心距错误 → LayoutPreviewAgent 或 Gear Agents；
* 轴心错位 → ShaftDrawingAgent；
* 仿真关节缺失 → SimulationAgent；
* drawing/simulation 不一致 → SimulationAgent 或对应 DrawingAgent；
* 全局空间不足 → Director Agent 重新规划。

## 17.3 Repair Loop 限制

MVP 最多自动 repair 1 到 2 轮。

如果失败，系统显示：

* 当前失败原因；
* 建议手动修改参数；
* 哪个 agent 无法解决；
* 哪个约束无法满足。

---

# 18. 系统架构

## 18.1 Frontend

技术栈（已锁定）：

* Vite + React + TypeScript；
* SVG Drawing View（消费后端生成的轮廓点）；
* Planck.js Simulation View；
* React Flow for orchestration；
* Zustand for client-side state；
* Timeline component；
* Parameter panel；
* Validation panel。

> 几何生成不在前端：齿轮轮廓由后端 JSCAD 生成并写入 Assembly State，前端只渲染。

Frontend 负责：

* 用户交互；
* 2D 绘制；
* 2D 仿真；
* 可视化；
* agent graph；
* timeline；
* 参数编辑；
* 与 backend 同步 Assembly State。

## 18.2 Backend

技术栈（已锁定）：

* Node / TypeScript API（如 Fastify / Express）；
* 确定性 agent orchestration service；
* Director Agent service（脚本化，可后接 LLM）；
* JSCAD 几何服务（`@jscad/modeling` 生成 2D 齿轮轮廓）；
* validation summary service；
* W&B Weave 初始化与 op 追踪；
* state persistence；
* project export。

Backend 负责：

* prompt parsing；
* planning；
* agent reasoning；
* repair decision；
* project state save/load；
* tool call logging；
* 长期可接 3D CAD 后端。

## 18.3 Tool Runtime

工具可以分布在前端和后端：

### 前端 tools

* render drawing；
* generate gear preview；
* run simulation；
* play/pause motion；
* collision visualization；
* graph visualization。

### 后端 tools

* high-level planning；
* structured validation summary；
* repair reasoning；
* file export；
* future 3D generation。

## 18.4 Data Flow

整体数据流：

1. User submits request；
2. Backend Director Agent creates design plan；
3. Frontend receives Assembly State；
4. Drawing Agents generate drawing representation；
5. Simulation Agent generates simulation representation；
6. Frontend renders both views；
7. Validation Tools run checks；
8. Validation Report returned to Director / Repair Coordinator；
9. Repair task modifies Assembly State；
10. Drawing and Simulation Views update；
11. Final state can be exported。

---

# 19. UI 设计

## 19.1 主布局

建议布局：

左侧：Prompt + 参数 + 操作按钮
中间：Drawing / Simulation 主工作区
右侧：Agent Orchestration + Timeline + Validation
底部：State / Export / Logs

## 19.2 核心 Tabs

### Tab 1：Drawing View

显示真实二维机械绘制。

### Tab 2：Simulation View

显示抽象运动仿真。

### Tab 3：Orchestration View

显示 agent graph 和状态。

### Tab 4：Timeline

显示 tool calls。

### Tab 5：Validation

显示检查报告和修复建议。

### Tab 6：State / Export

显示 Assembly State，支持导出 SVG/DXF/JSON。

## 19.3 用户操作按钮

* Generate Plan；
* Generate Drawing；
* Build Simulation；
* Run Simulation；
* Validate；
* Repair Once；
* Reset；
* Export。

MVP 可简化为：

* Run Full Workflow；
* Repair Once；
* Reset。

---

# 20. 推荐技术路线

## 20.1 MVP 技术栈

Frontend：

* Vite；
* React + TypeScript；
* SVG（渲染后端生成的轮廓点）；
* Planck.js；
* React Flow；
* Zustand；

Backend：

* Node / TypeScript（Fastify / Express）；
* `@jscad/modeling`（2D 齿轮几何）；
* `weave`（W&B Weave SDK，tracing + eval）；
* 共享 TypeScript 类型包（Assembly State）；
* structured JSON state；
* optional persistence。

## 20.2 为什么使用 JSCAD / 参数化绘图层

MVP 需要参数化齿轮，而不是简单圆形。

参数化齿轮至少需要：

* teeth；
* module；
* pressure angle；
* center；
* pitch radius；
* outer radius；
* root radius；
* bore diameter。

JSCAD 或类似参数化 CAD 绘制层更适合实现 Drawing View。

## 20.3 为什么使用 Planck.js

Planck.js / Box2D 更适合二维机构仿真：

* rigid body；
* revolute joint；
* gear relation；
* collision；
* step simulation。

它不负责真实齿轮轮廓，只负责运动抽象。

## 20.4 为什么需要 Shared Assembly State

如果 Drawing View 和 Simulation View 各自维护状态，会很快失控。

必须使用统一 Assembly State，让两个 view 都从同一个 source of truth 派生。

---

# 21. MVP Demo Script

## 21.1 开场

今天我们展示一个 AI-controlled mechanical CAD workspace。
它不是直接生成一个 3D 模型，而是由 AI agent 操作绘制、装配、仿真和检测工具。

## 21.2 输入

用户输入：

> Create a 2D cube gearbox with two meshing gears inside a box.

## 21.3 Director Agent 规划

Director Agent 生成：

* 设计意图；
* 零件列表；
* layout plan；
* drawing plan；
* simulation plan；
* validation criteria；
* agent 分工。

## 21.4 生成 Drawing View

Gear agents 生成两个参数化齿轮。
Box agent 生成盒体。
Shaft agents 生成轴心和孔位。
系统显示真实二维机械绘制图。

## 21.5 生成 Simulation View

Simulation Agent 将零件转换为刚体、关节和 gear relation。
系统播放齿轮运动。

## 21.6 检查错误

Validation Agent 发现：

* 齿轮中心距错误；
* 或齿轮与盒体 clearance 不足；
* 或 drawing 和 simulation 的齿轮中心不一致。

## 21.7 路由修复

Repair Coordinator 将问题派给对应 agent。

例如：

> GearADrawingAgent should reduce module or update center position.

## 21.8 修复并重新验证

对应 agent 修改参数。
Drawing View 更新。
Simulation View 更新。
Validation 通过。

## 21.9 结尾

核心价值：

> AI agent 不只是生成模型，而是编排 CAD tools、维护装配状态、调用仿真检查并修复机械设计。

---

# 22. 成功指标

## 22.1 Demo 成功指标

MVP 成功需要满足：

1. 用户能看到 Director Agent 先生成 plan；
2. 用户能看到多个 Part Agents 被创建或激活；
3. 用户能看到真实参数化齿轮 Drawing View；
4. 用户能看到 Simulation View；
5. 用户能看到 agent graph；
6. 用户能看到 tool call timeline；
7. 用户能看到 validation failed；
8. 用户能看到 repair routing；
9. 用户能看到修复后 Drawing 和 Simulation 同步更新；
10. 用户能理解这是 agent-controlled CAD workflow，不是普通生成器；
11. 用户能在 W&B Weave 中看到整条流水线的 trace 树（agent + tool 调用）。

## 22.2 技术成功指标

* Assembly State 结构稳定；
* Drawing View 与 Simulation View 能同步；
* 参数化齿轮能生成；
* 仿真能运行；
* validation 能输出明确错误；
* repair 能修改 state；
* orchestration view 与真实流程一致；
* Weave trace 树与 orchestration view 一致（同一流程的两种视图）；
* （P1）Weave Evaluation 能跑通并产出 pass-rate 等指标。

---

# 23. 风险与应对

## 23.1 风险：参数化齿轮绘制复杂

应对：

* MVP 使用简化 involute 或近似参数化齿轮；
* 保证支持 teeth/module/center/bore；
* 不追求工业级齿形精度；
* 将真实齿形精度作为后续优化。

## 23.2 风险：物理仿真不稳定

应对：

* 不依赖真实齿碰齿碰撞；
* 使用 gear relation / gear ratio；
* 视觉齿轮和仿真齿轮分离；
* 仿真只验证运动关系和碰撞边界。

## 23.3 风险：前端复杂度过高

应对：

* MVP 固定一个案例；
* 固定 agent graph；
* 固定零件类型；
* 固定工具链；
* 不做自由编辑器；
* 不做完整 CAD UI。

## 23.4 风险：多 agent 看起来像表演

应对：

* 每个 agent 必须有明确工具调用；
* 每个 agent 必须修改 Assembly State；
* Timeline 显示 tool call；
* Repair 必须回到责任 agent；
* Drawing/Simulation 更新必须可见。

## 23.5 风险：产品方向过窄

应对：

* MVP 用齿轮盒证明机制；
* Roadmap 明确扩展到其他 2D mechanical assemblies；
* 后续支持 3D extrusion；
* 长期定位 AI-native CAD workflow。

---

# 24. Roadmap

## Phase 0：Hackathon MVP

目标：

跑通二维齿轮盒完整 workflow。

功能：

* Next.js frontend；
* Director Agent plan；
* fixed agent graph；
* parameterized gear drawing；
* Drawing View；
* Simulation View；
* Validation；
* Repair once；
* Orchestration View；
* Timeline；
* JSON/SVG export。

## Phase 1：2D Mechanical Design Sandbox

新增：

* 更多零件类型；
* 参数编辑；
* DXF export；
* 更强 validation；
* 用户可修改 layout；
* more templates；
* improved agent tool abstraction。

## Phase 2：2D CAD Constraint Layer

新增：

* sketch constraint solver；
* under/over constrained detection；
* dimension constraint；
* tangent / concentric / parallel constraints；
* more CAD-like editing。

## Phase 3：2D to 3D

新增：

* extrude drawing into 3D；
* generate 3D gear box；
* STL/STEP export；
* 3D viewer；
* basic 3D collision check。

## Phase 4：AI-native Lightweight CAD Platform

新增：

* custom agent graph；
* plugin tools；
* professional CAD export；
* component library；
* assembly templates；
* user accounts；
* team projects；
* CAD platform integrations。

---

# 25. 产品命名候选

当前名称：

* AssemblyCAD AI

其他候选：

* AgentCAD
* MechanismForge
* GearForge AI
* PartPilot
* AssemblyPilot
* CADOrchestrator
* SketchMechanic
* MechAgents

MVP 推荐继续使用：

> AssemblyCAD AI

因为它直接表达“装配 + CAD + AI”。

---

# 26. 核心 Pitch

## 中文 Pitch

AssemblyCAD AI 是一个由 AI agent 控制的轻量化机械 CAD 与仿真工作空间。用户输入机械设计需求后，Director Agent 会先理解需求并生成设计计划，再创建多个零件 agent。每个零件 agent 负责自己的机械零件，并调用二维绘制工具生成真实参数化图形，例如齿轮、轴、盒体和孔位。Simulation Agent 会将这些零件转换为抽象运动模型，检查齿轮关系、轴心约束和碰撞。系统通过 Orchestration View 展示 agent 分工、工具调用和修复流程。我们的 MVP 以一个二维齿轮盒为例，展示从自然语言到绘制、仿真、验证和修复的完整 agent-controlled CAD workflow。

## 英文 Pitch

AssemblyCAD AI is an agent-controlled lightweight mechanical CAD and simulation workspace. A Director Agent interprets the user’s design request, creates a design plan, assigns persistent part agents, and orchestrates tool calls for 2D drawing, assembly, simulation, validation, and repair. Our MVP demonstrates this workflow through a 2D cube gearbox with parameterized gears, shafts, a box frame, a drawing view, a simulation view, and an agent orchestration timeline.

---

# 27. 最终产品定义

AssemblyCAD AI 是一个 AI-native 机械设计工作空间。

它的核心不是让 AI 一次性生成模型，而是让 AI agent 控制和编排设计工具。

MVP 使用二维齿轮盒证明以下机制：

* Director Agent 先规划；
* Part Agents 分别负责零件；
* Drawing Agents 生成参数化二维机械绘图；
* Simulation Agent 生成抽象运动模型；
* Validation Agent 检查 drawing/simulation 一致性和碰撞；
* Repair Coordinator 将问题路由回对应 agent；
* Orchestration View 展示整个过程；
* Assembly State 作为所有视图和工具的共享事实源。

长期方向是从 2D mechanical sandbox 发展为 AI-native lightweight CAD assembly platform。
