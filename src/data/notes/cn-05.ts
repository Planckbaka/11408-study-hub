import type { StudyNote } from '@/types/study';

export const CN_05_NOTE: StudyNote = {
  chapterId: 'CN-05',
  subject: 'CN',
  title: '第 5 章 传输层',
  subtitle: 'UDP 伪首部检验和 · TCP 三握四挥与 seq/ack 追踪 · 零窗口探测 · 慢开始与 Reno 快恢复轨迹',
  estimatedMinutes: 75,
  updatedAt: '2026-11-14',
  examWeightSummary: '2009–2026 年共 28 次命题（77 分：25 道选择 + 3 道综合大题，含 2026 回忆版口径），大题几乎围绕“TCP 连接 seq/ack 追踪”与“cwnd 拥塞窗口多轮演进轨迹”两大核心展开。',
  coreTakeaways: [
    'TCP 面向字节流：`seq` 指本段首字节编号，`ack` 指期望对方下次发来的首个字节编号；`SYN` 与 `FIN` 各消耗 1 个序号，纯 `ACK` 不消耗序号。',
    '三次握手防止已失效旧连接请求误建连；四次挥手主动方进 `TIME_WAIT` 等 `2MSL`，保尾包重传并让旧残留报文消亡。',
    '真实发送窗口上限 $= \\min(\\text{rwnd}, \\text{cwnd})$；收到零窗口时启动持续计时器，超时发探测破死锁。',
    '超时 RTO：$\\text{ssthresh}=\\lfloor\\text{cwnd}/2\\rfloor,\\ \\text{cwnd}=1$（慢开始）；3-DupACK（TCP Reno）：$\\text{ssthresh}=\\lfloor\\text{cwnd}/2\\rfloor,\\ \\text{cwnd}=\\text{ssthresh}$（快恢复进拥塞避免）。',
  ],
  markdown: `## 一、传输层寻址与 UDP 校验和

### 1.1 端口复用分用与 UDP 特点

传输层提供**端到端（进程到进程）**的逻辑通信，靠套接字区分应用进程（熟知端口 \`0~1023\`）：**UDP 凭二元组 \`(目的IP, 目的端口)\` 分用**（无连接，多个客户报文可由服务器同一套接字接收），而 **TCP 凭四元组 \`(源IP, 源端口, 目的IP, 目的端口)\` 唯一标识连接**（故 \`accept()\` 出的多个连接套接字共享同一本地端口如 \`80\`）。**UDP** 具有三大特征：
1. **无连接、无拥塞控制、无流量控制**，实时性好（DNS、DHCP、RIP、语音/视频）；
2. **面向报文**：对应用层交下的报文既不合并也不拆分，直接加 **8 B 固定首部**（\`源端口 2B | 目的端口 2B | 长度 2B | 检验和 2B\`）后发给网络层；
3. **支持一对一、一对多、多对多**通信，首部开销小（仅 $8\\text{ B}$ vs TCP 最少 $20\\text{ B}$）。

### 1.2 UDP 12B 伪首部检验和铁律

- **伪首部（12 B）构成**：\`源IP(4B) | 目的IP(4B) | 全0(1B) | 协议号17(1B) | UDP总长度(2B)\`。
- **只参与计算，绝不随网络传输！** 若 UDP 数据长度为奇数字节，计算时末尾临时补 1 字节 \`0\` 凑偶数（同样不发送）。
- 对所有 16 位字执行**二进制反码求和再按位取反**（若算得全 \`0\` 则强制填 \`FFFF\`，以便与“不开启校验和”的全 \`0\` 区分）；接收端全部相加取反为 \`0\` 即无误。

---

## 二、TCP 报文段、三次握手与四次挥手

### 2.1 TCP 字节流编号与序号消耗规则

TCP 是面向连接、可靠、全双工、**面向字节流**的协议（固定首部 **$20\\text{ B}$**；最大报文段长度 **MSS 默认 $536\\text{ B}$**，旨在令 \`536 + 20(TCP) + 20(IP) = 576\\text{ B}\` 避免 IP 分片）：
- **序号 \`seq\`**：本报文段所携带数据部分的**第一个字节**在发送字节流中的编号。
- **确认号 \`ack\`**：**期望收到对方下一个报文段的第一个字节序号**（即 \`<= ack - 1\` 的字节已全部按序收妥）。
- **三大消耗规则（408 大题绝不可算错！）**：
  1. \`SYN = 1\` 报文段虽不带应用数据，但**消耗 1 个序号**（服务器维护**半连接队列**存放未收第 3 次握手的连接，故大量伪造 \`SYN\` 易引发 **SYN 洪泛攻击**）；
  2. \`FIN = 1\` 报文段**消耗 1 个序号**（若被动关闭方已无数据要发，可将对 \`FIN\` 的确认与己方 \`FIN\` 合并为 **\`FIN+ACK\`** 一次发出，使挥手缩减为 3 个报文、被动方仅需 **$1.5\\text{ RTT}$** 释放）；
  3. **纯 \`ACK\` 报文段（无 \`SYN/FIN\` 且载荷 0 B）不消耗任何序号**（若后续继续发纯 ACK，\`seq\` 保持不变）。

### 2.2 三次握手与四次挥手全状态时序图

\`\`\`mermaid
sequenceDiagram
  participant C as "客户端 (Client)"
  participant S as "服务端 (Server)"
  Note over C,S: --- 三次握手建立连接 (防失效连接请求误建连) ---
  C->>S: SYN=1, seq=x  [C进 SYN_SENT]
  S->>C: SYN=1, ACK=1, seq=y, ack=x+1  [S进 SYN_RCVD]
  C->>S: ACK=1, seq=x+1, ack=y+1  [双方进 ESTABLISHED]
  Note over C,S: --- 四次挥手释放连接 (全双工各关各的写方向) ---
  C->>S: FIN=1, ACK=1, seq=u, ack=v  [C进 FIN_WAIT_1]
  S->>C: ACK=1, seq=v, ack=u+1  [C进 FIN_WAIT_2, S进 CLOSE_WAIT 半关闭]
  Note over S: S 发完剩余数据后也发起关闭
  S->>C: FIN=1, ACK=1, seq=w, ack=u+1  [S进 LAST_ACK]
  C->>S: ACK=1, seq=u+1, ack=w+1  [C进 TIME_WAIT 等 2MSL 后 CLOSED]
\`\`\`

> [!IMPORTANT]
> **两大经典简答必背原理**：
> 1. **为何不能用两次握手建连？** 防止客户端发出的“已滞留过期的旧 \`SYN\` 请求”突然迟到服务器时，服务器误以为新连接直接分配资源并进入等待，导致资源永久挂死浪费。
> 2. **为何主动关闭方必须在 \`TIME_WAIT\` 状态等待 \`2MSL\`（最长报文段寿命的 2 倍）？**
>    - **第一**：保证客户端发出的最后一个 \`ACK\` 万一在途中丢失时，服务器超时重传 \`FIN\` 后客户端仍活着并能重发 \`ACK\`；
>    - **第二**：使本次连接周期内产生的所有旧报文段在网络中经历 \`2MSL\` 自然消亡，绝不混淆下一条复用相同四元组的新连接！

---

## 三、TCP 流量控制（滑动窗口与零窗口破锁）

- **流量控制目的**：匹配**接收方的缓存处理能力**（端到端）。接收端在首部 \`rwnd\`（窗口字段）中通告自己当前剩余接收缓冲区字节数。
- **零窗口死锁破除**：当接收方发回 \`rwnd = 0\` 让发送方停发后，若后续腾出空间的非零窗口更新报文丢失，双方会互相死等。为此发送方收到 \`rwnd = 0\` 后立即启动**持续计时器（Persist Timer）**：一旦超时就发 **1 字节零窗口探测报文段**，接收方收到哪怕仍无空位也必须回应当前 \`rwnd\` 值，打破死锁！
- **发送方综合上限**：$\\text{swnd} = \\min(\\text{rwnd},\\ \\text{cwnd})$。

---

## 四、TCP 四大拥塞控制算法与精确轨迹演进

### 4.1 四算法状态转换全景图

\`\`\`mermaid
stateDiagram-v2
  [*] --> SlowStart: 初始 cwnd = 1 MSS, ssthresh = 初始门限
  SlowStart --> SlowStart: 每收 1 新 ACK 则 cwnd += 1 MSS (每 RTT 翻倍)
  SlowStart --> CongAvoid: cwnd 到达 ssthresh (注意截断勿越界)
  CongAvoid --> CongAvoid: 每经过 1 完整 RTT 则 cwnd += 1 MSS (加法增大)
  SlowStart --> SlowStart: 超时 RTO -> ssthresh = max(cwnd/2, 2), cwnd = 1
  CongAvoid --> SlowStart: 超时 RTO -> ssthresh = max(cwnd/2, 2), cwnd = 1
  CongAvoid --> FastRecovery: 收 3 个冗余 ACK (快重传) -> ssthresh = max(cwnd/2, 2), cwnd = ssthresh
  FastRecovery --> CongAvoid: TCP Reno 快恢复直接执行加法增大 (+1 MSS/RTT)
\`\`\`

### 4.2 轨迹追踪四大核心细节（408 高频陷阱）

| 阶段 / 触发事件 | \`ssthresh\` 门限更新 | \`cwnd\` 拥塞窗口演进规律 | 易错避坑说明 |
| :--- | :---: | :--- | :--- |
| **慢开始 (Slow Start)** | 保持不变 | **每收到 1 个新 ACK，\`cwnd += 1 MSS\`**（每整轮 RTT 翻倍） | 若 $2\\times\\text{cwnd} > \\text{ssthresh}$，**下一轮停在 \`ssthresh\`**（如 8 $\\to$ 12 而非 16！） |
| **拥塞避免 (CA)** | 保持不变 | **每完整经过 1 个 RTT，\`cwnd += 1 MSS\`**（线性 +1） | \`cwnd == ssthresh\` 后统考按常规直接进入拥塞避免 |
| **超时重传 (RTO)** | $\\max(\\lfloor\\text{cwnd}/2\\rfloor,\\ 2)$ | **立即归位 \`cwnd = 1 MSS\`**，重入慢开始 | **乘法减小**：严重拥塞信号，清零加速期 |
| **3-DupACK（快重传+快恢复）** | $\\max(\\lfloor\\text{cwnd}/2\\rfloor,\\ 2)$ | **TCP Reno**：**\`cwnd = 新 ssthresh\`**，直接进拥塞避免 | **TCP Tahoe 对比**：Tahoe 遇 3-DupACK 也把 \`cwnd\` 打回 \`1\`；**默认未说明时按 Reno 算**！ |

> [!WARNING]
> **区分“收部分新 ACK 瞬间变化”与“完整一轮 RTT 变化”**：
> 若发送方在慢开始阶段（\`cwnd = 4 MSS\`）一次发了 4 个段，当它陆续收到前 **3 个**新确认时，\`cwnd\` 就已经瞬间涨到了 $4 + 3 = \\mathbf{7\\text{ MSS}}$！而在拥塞避免阶段只有集齐本轮全部确认才完整加 1 MSS。
`,
};
