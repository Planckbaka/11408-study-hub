import type { StudyNote } from '@/types/study';

export const CO_03_NOTE: StudyNote = {
  chapterId: 'CO-03',
  subject: 'CO',
  title: '第 3 章 存储系统',
  subtitle: 'SRAM/DRAM 与主存扩展 · 低位交叉多体 · Cache 全盘解析 · TLB 虚拟存储硬件联动',
  estimatedMinutes: 75,
  updatedAt: '2026-11-13',
  examWeightSummary: '408 计组绝对核心！2009–2026 年共 59 次命题（253 分），仅 Cache 映射一节就占 25 题 149 分、几乎每年必出大题。',
  coreTakeaways: [
    'Cache 主存地址划分永恒三段：[Tag 标记] + [Index 组号 = log2(组数)] + [Offset 块内字节偏移 = log2(块字节数)]。',
    '计算 Cache 总容量时，切勿漏掉每一行伴生的 Valid(1位) + Dirty(回写时1位) + LRU 替换位！',
    'DRAM 电容需定期按行刷新且读后需重写，行列地址复用使地址引脚减半；SRAM 无需刷新常作 Cache。',
    '虚拟内存与 Cache 协同查表只有 5 种合法状态组合：若页表缺失（缺页），则该页必然既不在 TLB 也不在 Cache。',
  ],
  markdown: `## 一、存储层次结构与主存储器芯片（SRAM vs DRAM）

### 1.1 三层金字塔与程序局部性基石

计算机依赖**时间局部性**（刚被访问的数据近期还会被用，如循环变量）与**空间局部性**（相邻地址很快会被依次访问，如数组连续遍历），构建出兼具“高速度、大容量、低单价”的层次结构：

$$\\text{Register} \\longrightarrow \\text{L1/L2/L3 Cache (SRAM)} \\longrightarrow \\text{Main Memory (DRAM)} \\longrightarrow \\text{SSD / HDD}$$

### 1.2 SRAM 与 DRAM 全维度对比（选择题高频对照）

| 对比维度 | SRAM（静态随机存储器） | DRAM（动态随机存储器） |
| :--- | :--- | :--- |
| **基本存储元** | 6 管双稳态触发器（靠电平保持） | 1 管 + 1 个栅极电容（靠电荷保持） |
| **易失性与破坏读** | 断电丢失，**非破坏性读出**（无需重写） | 断电丢失，**破坏性读出**（读完必须写回重写） |
| **是否需要刷新** | **不需要刷新** | **必须定期刷新**（典型周期 $2\\text{ ms}$，按**行**为单位刷新） |
| **地址引脚复用** | **不复用**，一次性送入全部地址引脚 | **行列地址分两次复用**同一组地址引脚（引脚数减半） |
| **典型物理应用** | CPU 内部各级别 **Cache** | 系统 **主存储器（内存条）** |

> [!IMPORTANT]
> **DRAM 存储矩阵行 $r$、列 $c$ 与刷新核心细节**：
> 1. 为使行列复用引脚最少且避免行数过多增加刷新占用率，一般设计尽量接近正方形，且常令行数 $r \\le c$（若 $4096 = 64 \\times 64$ 或 $32 \\times 128$，选最小或题指定布局）。
> 2. **三种刷新策略**：集中刷新（结尾存在“死区”不能响应访存）、**分散刷新**（嵌入每个读写周期后半段，无死区但加倍机器周期）、**异步刷新**（按 $t_{\\text{刷新周期}} / r$ 平均间隔发脉冲，兼具前两者优点，**408 考察最常用**）。
> 3. **刷新仅对主存内部行放大小电容补电，不需要 CPU 参与，也不经过总线读出数据**！

---

## 二、主存容量扩展与多模块交叉存储

### 2.1 主存字位扩展（Word & Bit Expansion）公式

假设目标构建一个字数 $M$、位宽 $N$ 的主存空间，而单片可用存储芯片规格为 $m \\times n$，则：

$$\\text{总芯片数} = \\underbrace{\\frac{M}{m}}_{\\text{字扩展组数 } G} \\times \\underbrace{\\frac{N}{n}}_{\\text{每组位扩展并联片数}}$$

- **位扩展**：所有芯片共用同一套地址线 $A_0\\sim A_k$ 与同一根片选线 $\\overline{\\text{CS}}$，各自连接数据总线的不同比特分段；
- **字扩展**：高位多余地址线经译码器（如 \`3-8\` 译码器、\`2-4\` 译码器）产生各组互斥的片选信号 $\\overline{\\text{CS}}_i$，且译码使能端务必接入总访存控制信号（如 $\\overline{\\text{MREQ}}$）！

> [!WARNING]
> **地址重叠陷阱**：若高位地址线未完全参与片选译码（有地址线悬空），会导致不同逻辑地址选中同一个物理芯片单元，造成地址映射重叠！

### 2.2 高位交叉 vs 低位交叉多体并行存储器

\`\`\`mermaid
flowchart LR
  subgraph HIGH["高位交叉 (顺序编址) -> 主用于扩容量"]
    direction TB
    H_ADDR["高位体号 | 体内低位地址"] --> H_BANK0["体0: 0,1,2,3"]
    H_ADDR --> H_BANK1["体1: 4,5,6,7"]
  end
  subgraph LOW["低位交叉 (模 m 轮转编址) -> 流水提升连续带宽"]
    direction TB
    L_ADDR["体内高位地址 | 低位体号 (A mod m)"] --> L_BANK0["体0: 0, 4, 8, 12"]
    L_ADDR --> L_BANK1["体1: 1, 5, 9, 13"]
    L_ADDR --> L_BANK2["体2: 2, 6, 10, 14"]
    L_ADDR --> L_BANK3["体3: 3, 7, 11, 15"]
  end
\`\`\`

设每个体存取周期为 $T$，总线启动/传送单个字时间为 $\\tau$，采用 $m$ 体**低位交叉**连续读取 $n$ 个字：
- **不发生访问冲突的最佳体数条件**：$m \\ge \\frac{T}{\\tau}$；
- **连续读取 $n$ 个字总耗时**：
  $$t_{\\text{total}} = T + (n - 1)\\tau$$
- 若只开启 1 次存取周期读取一个体，共能并行输出最多 $m$ 个连续字；因此匹配主存块大小 $\\leftrightarrow$ Cache 行大小的经典设计即采用**低位交叉多体结构**配突发总线。

---

## 三、外部存储器：磁盘、RAID 与固态硬盘（SSD）

1. **机械硬盘访问总时间**：
   $$T_{\\text{disk}} = \\underbrace{T_{\\text{seek}}}_{\\text{平均寻道时间}} + \\underbrace{\\frac{1}{2 \\times \\text{RPS}}}_{\\text{平均旋转延迟(半圈)}} + \\underbrace{\\frac{\\text{传输扇区字节数}}{\\text{转速} \\times \\text{每磁道字节数}}}_{\\text{实际数据读出时间}}$$
2. **RAID 0/1/5 关键特征**：
   - \`RAID 0\`（条带化）：吞吐翻倍但**无任何冗余校验**，任意一盘坏则全毁；
   - \`RAID 1\`（镜像）：$50\\%$ 存储利用率，读提速写双份，单盘容错；
   - \`RAID 5\`（分布式奇偶校验）：至少 $3$ 块盘，有效容量为 $(N-1)\\times C$，允许坏 1 盘并通过异或重建；
3. **SSD 闪存核心特性**：随机写极慢的原因在于“**异地更新（写前必须先整块 Block 擦除，而读/写按页 Page 进行）**”，通过 FTL（闪存转换层）实施**磨损均衡（Wear Leveling）**延长擦写寿命。

---

## 四、Cache 高速缓冲存储器（408 计组最高频核心）

### 4.1 三种地址映射格式与全盘推导公式

设主存按字节编址共 $A$ 位地址（主存总容量 $2^A\\text{ B}$），Cache 数据块（行）大小为 $B = 2^b$ 字节，Cache 共分 $C_{\\text{lines}}$ 行，分成 $S = 2^s$ 组，每组 $k$ 路（即 $k = C_{\\text{lines}} / S$）：

| 映射方式 | 组数 $S$ 与路数 $k$ | 地址切分三段结构（从高到低共 $A$ 位） | 替换逻辑与硬件比较器开销 |
| :--- | :---: | :--- | :--- |
| **直接映射 (Direct)** | $k=1,\\ S = C_{\\text{lines}}$ | \`Tag (A - s - b)\` \\| \`Line Index (s)\` \\| \`Offset (b)\` | 冲突率最高，**无需替换算法**，$1$ 个比较器 |
| **全相联 (Fully Assoc)** | $S=1,\\ k = C_{\\text{lines}}$ | \`Tag (A - b)\` \\| \`Offset (b)\` | 空间利用充分但对比所有 $C_{\\text{lines}}$ 行，$C_{\\text{lines}}$ 个比较器（仅适用小表如 TLB） |
| **k 路组相联 ($k$-Way)** | $S = C_{\\text{lines}} / k$ | \`Tag (A - s - b)\` \\| \`Set Index (s)\` \\| \`Offset (b)\` | **现代 L1/L2 主流折中**，需 $k$ 个并发 Tag 比较器与组内替换策略 |

> [!IMPORTANT]
> **Cache 总存储容量（比特数）必考点**：
> 每条 Cache 行除了存放 Data ($8 \\times B$ bit) 之外，必须包含控制元数据：
> $$\\text{单行总位宽} = \\underbrace{1}_{\\text{Valid 位}} + \\underbrace{(0 \\text{ 或 } 1)}_{\\text{Dirty 位(写回法才要)}} + \\underbrace{\\text{LRU 位}}_{\\text{组内 } k \\text{ 路需 } \\lceil\\log_2 k\\rceil \\text{ 或硬件位}} + \\text{Tag 位数} + (8 \\times B)$$
> **注意真题明确条件**：如果题干明确指出“**回写法（Write-Back）**”，一定要加 **1 位 Dirty 修改位**；若明确“**直写法（Write-Through）**”，不需要 Dirty 位！如果题干只问“**Cache 数据区大小**”，则仅计算 $C_{\\text{lines}} \\times B$。

### 4.2 写策略四大组合与一致性逻辑

1. **写命中（Write Hit）时**：
   - **全写法 / 写直达（Write-Through）**：同时写入 Cache 与下级主存（常配写缓冲 Write Buffer），保证主存永远最新，**无需 Dirty 位**；
   - **写回法（Write-Back）**：仅改写 Cache 块并将该行 \`Dirty = 1\`；直到将来该块被淘汰替换时若 \`Dirty == 1\` 才一次性回写主存。大幅节省访存带宽，但多核需监听一致性。
2. **写不命中（Write Miss）时**：
   - **写分配（Write-Allocate）**：先把主存块调入 Cache 再修改 Cache（**通常搭配写回法**，利用后续多次局部写）；
   - **非写分配（No-Write-Allocate）**：直接越过 Cache 写回主存而不调入（**通常搭配全写法**）。

### 4.3 数组遍历局部性实战与平均访存时间（AMAT）

\`\`\`c
// 假设 Cache 块为 64B（16 个 int），数组 int a[1024][1024] 按行存储
// 版本 A（高空间局部性，按行步长 1）：每 16 次读仅 Miss 1 次 -> 命中率 15/16 = 93.75%
for (int i = 0; i < 1024; i++)
  for (int j = 0; j < 1024; j++) sum += a[i][j];

// 版本 B（极差局部性，按列跨步 4KB）：若 Cache 容量 < 4MB，每次访存皆可能触发缺失 -> 命中率低至 0%!
for (int j = 0; j < 1024; j++)
  for (int i = 0; i < 1024; i++) sum += a[i][j];
\`\`\`

- **平均访存时间计算公式**：
  $$\\text{AMAT} = t_{\\text{Cache}} + (1 - h_{\\text{Cache}}) \\times t_{\\text{MissPenalty}}$$
  （也等价于 $h \\cdot t_{\\text{hit}} + (1-h)\\cdot (t_{\\text{hit}} + t_{\\text{miss}})$，看清题目给的是**串行探测**还是**并行探测**主存与 Cache！）

---

## 五、虚拟存储器与 Cache 协同查表全链路（计组+OS 跨科压轴点）

### 5.1 VA $\\rightarrow$ PA $\\rightarrow$ Cache 完整流水路径

\`\`\`mermaid
flowchart TB
  VA["CPU 产生虚拟地址 VA = (VPN | Offset)"] --> TLB{"1. 查快表 TLB (全相联/组相联)"}
  TLB -->|"TLB Hit (直接获 PPN)"| PA["拼合真实物理地址 PA = (PPN | Offset)"]
  TLB -->|"TLB Miss"| PT["2. 查主存慢表 (可能经 Cache 读页表项 PTE!)"]
  PT -->|"PTE Valid == 1"| UPDATE["填入 TLB 并拼合 PA"]
  PT -->|"PTE Valid == 0"| PF["缺页异常 Page Fault! 陷入 OS 内核从磁盘换入并更新页表"]
  UPDATE --> PA
  PA --> CACHE{"3. 用 PA 划分 Tag / Index / Offset 查 Cache"}
  CACHE -->|"Cache Hit"| CPU_OK["极速返回指令/数据字给 CPU"]
  CACHE -->|"Cache Miss"| MEM_READ["访问主存调取整块入 Cache 并返回 CPU"]
\`\`\`

### 5.2 TLB、页表、Cache 命中组合生死判定表（必须 100% 默写）

| 情况编号 | TLB | 页表 (主存中) | Cache | 物理上是否可能同时发生？ | 原理解析 |
| :---: | :---: | :---: | :---: | :---: | :--- |
| 1 | Hit | Hit | Hit | **可能** | 最快理想路径（页在主存且表项在 TLB，数据正好也在 Cache） |
| 2 | Hit | Hit | Miss | **可能** | 物理页在主存并能通过 TLB 转出 PA，但数据尚未进过 Cache 或已被踢出 |
| 3 | Miss | Hit | Hit | **可能** | TLB 容量小刚把映射关系踢掉，但主存页表与 Cache 中的数据字都还在 |
| 4 | Miss | Hit | Miss | **可能** | 页在主存，TLB 与 Cache 中均无缓存，需经历查表+取块 |
| 5 | Miss | **Miss (缺页)** | Miss | **可能** | **唯一合法的缺页组合！**需 OS 缺页处理 |
| **6** | **Hit** | **Miss** | **任意** | **绝不可能!** | **若页不在主存（缺页），TLB 里绝不允许存在其有效映射表项！** |
| **7** | **任意** | **Miss** | **Hit** | **绝不可能!** | **主存都没有物理页，Cache 更不可能缓存着它的物理地址副本！** |

> [!TIP]
> **VIPT（虚索引实标记）高频思考题**：为什么很多现代 L1 Cache 能够**在查 TLB 的同时用页内偏移索引 Cache**？
> 只要满足 $\\text{Cache 单路大小} = \\text{组数} \\times \\text{块大小} \\le \\text{页面大小}$，那么 \`Index + Offset\` 就全部落在“虚拟地址与物理地址完全相同的低位页内偏移 (\`Page Offset\`)”范围内！TLB 负责同时将高位 \`VPN\` 翻译为 \`PPN\` 并在输出段与 Cache 读出的 \`Tag\` 直接比较，彻底把 TLB 和 Cache 索引延迟**并行折叠在一起**！
`,
};
