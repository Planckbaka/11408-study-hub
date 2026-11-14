import type { Question } from '@/types/study';

export const DS_03_QUESTIONS: Question[] = [
  {
    id: 'DS-03-Q01',
    subject: 'DS',
    chapterId: 'DS-03',
    kpId: 'DS-03-KP1',
    kpTitle: '卡特兰数与合法出栈序列规律',
    sourceTag: '真题同源',
    difficulty: '基础',
    type: 'single_choice',
    stem: '将元素 `a, b, c, d, e` 依次压入一个初始为空的顺序栈，在入栈过程中允许随时出栈。在所有合法的出栈序列中，以元素 `d` 作为第一个出栈元素的序列共有（ ）种。',
    options: [
      { key: 'A', text: '1' },
      { key: 'B', text: '2' },
      { key: 'C', text: '4' },
      { key: 'D', text: '6' },
    ],
    answer: 'C',
    analysis:
      '由于入栈顺序严格为 `a, b, c, d, e`，而 `d` 是第一个出栈的元素，说明在 `d` 出栈时，`a, b, c` 必然已全部在栈中且尚未出栈（栈底到栈顶依次为 `a, b, c`），同时 `e` 尚未入栈（若 `e` 先入栈，则它必定压在 `d` 之上，`d` 不可能第一个出栈）。此后栈内残留的 `c, b, a` 只能严格按照 `c -> b -> a` 的相对顺序依次出栈，而 `e` 可在 `c` 之前、`c` 与 `b` 之间、`b` 与 `a` 之间或 `a` 之后入栈并立即出栈，共有 4 个可选插入位置（即 `d e c b a`、`d c e b a`、`d c b e a`、`d c b a e`）。',
    keyTakeaway:
      '栈的首出元素一旦确定，其前面所有元素在后续出栈序列中的相对逆序即被唯一锁定，其余未入栈元素只能在这些固定元素的间隔中灵活插入。',
  },
  {
    id: 'DS-03-Q02',
    subject: 'DS',
    chapterId: 'DS-03',
    kpId: 'DS-03-KP1',
    kpTitle: '卡特兰数与合法出栈序列规律',
    sourceTag: '王道课后改编',
    difficulty: '进阶',
    type: 'single_choice',
    stem: '设元素 `a, b, c, d, e, f, g` 依次进入一个初始为空的栈 $S$，每当有元素从栈 $S$ 弹出时立即进入一个初始为空的队列 $Q$。若最终从队列 $Q$ 出队的序列为 `b, d, c, f, e, a, g`，则栈 $S$ 的容量至少应为（ ）。',
    options: [
      { key: 'A', text: '2' },
      { key: 'B', text: '3' },
      { key: 'C', text: '4' },
      { key: 'D', text: '5' },
    ],
    answer: 'B',
    analysis:
      '队列具有先进先出（FIFO）特性，因此元素离开队列 $Q$ 的序列就等于它们离开栈 $S$ 的出栈序列 `b, d, c, f, e, a, g`。按“能出尽出”原则模拟栈 $S$ 的最小瞬时深度：入 `a`(1)、入 `b`(2) $\\to$ 出 `b`(1)；入 `c`(2)、入 `d`(3) $\\to$ 出 `d`(2)、出 `c`(1)；入 `e`(2)、入 `f`(3) $\\to$ 出 `f`(2)、出 `e`(1)、出 `a`(0)；入 `g`(1) $\\to$ 出 `g`(0)。全过程中栈内最多同时存放 3 个元素（如 `[a, c, d]` 和 `[a, e, f]` 时刻），故栈 $S$ 的最小容量为 3。',
    keyTakeaway:
      '队列不改变元素相对次序，求最小栈容量只需按目标出栈序列模拟“压到目标栈顶即立刻弹出”的紧致过程并统计峰值元素个数。',
  },
  {
    id: 'DS-03-Q03',
    subject: 'DS',
    chapterId: 'DS-03',
    kpId: 'DS-03-KP1',
    kpTitle: '卡特兰数与合法出栈序列规律',
    sourceTag: '真题同源',
    difficulty: '进阶',
    type: 'single_choice',
    stem: '一个输出受限的双端队列（允许从左、右两端入队，仅允许从左端出队），若输入序列为 `1, 2, 3, 4, 5`，则以下输出序列中 **不可能** 得到的是（ ）。',
    options: [
      { key: 'A', text: '5, 4, 3, 2, 1' },
      { key: 'B', text: '4, 2, 1, 3, 5' },
      { key: 'C', text: '4, 1, 3, 2, 5' },
      { key: 'D', text: '3, 1, 2, 4, 5' },
    ],
    answer: 'C',
    analysis:
      '逐项构造验证：A 可将 `1~5` 全部左端入队得 `[5,4,3,2,1]` 再依次左端出队；B 可按“左入1、左入2、右入3、左入4”得 `[4,2,1,3]`，左出 4 次后再左入左出 `5`；D 可按“左入1、右入2、左入3”得 `[3,1,2]`，左出 3 次后再依次左入左出 `4, 5`。对于 C，若 `4` 第一个出队且 `1` 第二个出队，则当 `4` 入队前，`1, 2, 3` 均已在队列中，且 `1` 必须紧邻左端口（即 `2` 与 `3` 均须从右端插入到 `1` 的右侧）；由于 `2` 先于 `3` 到达，队列右侧只能形成 `1, 2, 3` 的相对位置（若 `3` 从左端插入就会挡在 `1` 前面）。`4` 和 `1` 左出后仅剩 `[2, 3]`，此时只能先出 `2` 后出 `3`，绝不可能得到 `3, 2`。',
    keyTakeaway:
      '输出受限双端队列中，后续从左端连续入队的元素会形成逆序块，从右端连续入队的元素会形成正序块；反推出队前队列的物理排布即可快速证伪非法序列。',
  },
  {
    id: 'DS-03-Q04',
    subject: 'DS',
    chapterId: 'DS-03',
    kpId: 'DS-03-KP1',
    kpTitle: '卡特兰数与合法出栈序列规律',
    sourceTag: '王道课后改编',
    difficulty: '进阶',
    type: 'single_choice',
    stem: '将中缀表达式 `a / b + (c * d - e * f) / g` 转换为等价的后缀表达式时，借助一个运算符栈。当扫描并输出操作数 `f` 之后（尚未读入其后的右括号 `)`），运算符栈中从 **栈底到栈顶** 依次存放的运算符是（ ）。',
    options: [
      { key: 'A', text: '`+ ( * - *`' },
      { key: 'B', text: '`+ ( - *`' },
      { key: 'C', text: '`/ + ( - *`' },
      { key: 'D', text: '`+ - *`' },
    ],
    answer: 'B',
    analysis:
      '按中缀转后缀规则逐步跟踪运算符栈状态：读 `/` 入栈得 `[/]`；读 `+` 时因优先级低于 `/` 而先弹出 `/` 再压入 `+`，栈为 `[+]`；读 `(` 直接入栈得 `[+, (]`；读 `*` 高于 `(` 入栈得 `[+, (, *]`；读 `-` 时因不高于栈顶 `*`，先弹出 `*` 直至遇到 `(` 停止，再将 `-` 压栈，栈变为 `[+, (, -]`；接着读第二个 `*` 时优先级高于 `-`，压入栈顶得 `[+, (, -, *]`。随后输出操作数 `f` 不改变运算符栈，故此时栈底到栈顶为 `+ ( - *`。',
    keyTakeaway:
      '中缀转后缀遇到同级或更低优先级运算符时，必须连续弹出栈顶直至栈空、遇到 ( 或严格更低优先级运算符为止；( 本身也会保存在栈中充当界限标记。',
  },
  {
    id: 'DS-03-Q05',
    subject: 'DS',
    chapterId: 'DS-03',
    kpId: 'DS-03-KP2',
    kpTitle: '循环队列状态判定与矩阵压缩映射',
    sourceTag: '真题同源',
    difficulty: '基础',
    type: 'single_choice',
    stem: '现用数组 `A[0..n-1]` 实现循环队列，约定 `front` 指向当前队头元素，`rear` 指向当前队尾元素，向队列插入第一个元素时需先执行 `rear = (rear + 1) % n` 再存入 `A[rear]`，且第一个元素存放在 `A[0]`。若采用“牺牲一个存储单元”（最多存放 $n-1$ 个元素）来区分队空与队满，则初始化设置与 **队满判定条件** 分别为（ ）。',
    options: [
      { key: 'A', text: '`front = 0, rear = 0`；`(rear + 1) % n == front`' },
      { key: 'B', text: '`front = 0, rear = n - 1`；`(rear + 1) % n == front`' },
      { key: 'C', text: '`front = 0, rear = n - 1`；`(rear + 2) % n == front`' },
      { key: 'D', text: '`front = 0, rear = 0`；`(rear + 2) % n == front`' },
    ],
    answer: 'C',
    analysis:
      '由于第一个元素入队时先将 `rear` 加 1 取模再放入 `A[0]`，且 `front` 直接指向队头元素，故初始空队必须满足 `front = 0` 且 `(rear + 1) % n = 0`，即 `rear = n - 1`。此时队空特征就是 `(rear + 1) % n == front`！因此为了不与队空条件混淆，牺牲一个单元（即最多存入 $n-1$ 个元素，如 `front = 0` 时存入 `A[0..n-2]`）后，`rear` 停在 `n - 2`，此时的队满判定条件必须是 `(rear + 2) % n == front`。',
    keyTakeaway:
      '不要死记硬背 (rear + 1) % M == front 为队满！当 rear 指向队尾元素本身而非队尾下一空位时，(rear + 1) % n == front 反而是队空状态，牺牲一格后的队满条件会顺延为 (rear + 2) % n == front。',
  },
  {
    id: 'DS-03-Q06',
    subject: 'DS',
    chapterId: 'DS-03',
    kpId: 'DS-03-KP2',
    kpTitle: '循环队列状态判定与矩阵压缩映射',
    sourceTag: '真题同源',
    difficulty: '基础',
    type: 'single_choice',
    stem: '设循环队列存放在一维数组 `Q[0..20]` 中，约定 `front` 指向队头元素的 **前一个位置**，`rear` 指向 **当前队尾元素** 所在位置。某时刻 `front = 8`、`rear = 3`，连续执行 2 次出队和 3 次入队操作后，`front`、`rear` 的值以及队列中元素个数分别为（ ）。',
    options: [
      { key: 'A', text: '`front = 10, rear = 6`，元素个数为 16' },
      { key: 'B', text: '`front = 10, rear = 6`，元素个数为 17' },
      { key: 'C', text: '`front = 6, rear = 10`，元素个数为 4' },
      { key: 'D', text: '`front = 10, rear = 6`，元素个数为 18' },
    ],
    answer: 'B',
    analysis:
      '首先注意数组总长度 $M = 20 - 0 + 1 = 21$（切忌误算作 20）。按照指针约定，`Q[front]` 为空位，`Q[(front + 1) % 21 .. rear]` 均为有效元素，故初始元素个数为 $(3 - 8 + 21) \\bmod 21 = 16$（最多可存 $21 - 1 = 20$ 个元素）。执行 2 次出队后 `front = (8 + 2) % 21 = 10`；执行 3 次入队后 `rear = (3 + 3) % 21 = 6`。最终元素个数为 $(6 - 10 + 21) \\bmod 21 = 17$（或直接计算 $16 - 2 + 3 = 17$）。',
    keyTakeaway:
      '下标范围 0..k 对应的循环模数是 k + 1 而非 k；且无论哪组指针约定，只要出队不空、入队不满，每次出队 front 均加 1 取模、每次入队 rear 均加 1 取模。',
  },
  {
    id: 'DS-03-Q07',
    subject: 'DS',
    chapterId: 'DS-03',
    kpId: 'DS-03-KP2',
    kpTitle: '循环队列状态判定与矩阵压缩映射',
    sourceTag: '王道课后改编',
    difficulty: '基础',
    type: 'single_choice',
    stem: '在带头结点的链队列 `Q` 中（`Q.front` 指向头结点，`Q.rear` 指向队尾结点），下列关于队列操作与状态判定的叙述中 **错误** 的是（ ）。',
    options: [
      { key: 'A', text: '判空条件为 `Q.front == Q.rear`（等价于 `Q.front->next == NULL`）' },
      { key: 'B', text: '若原队列中仅有一个元素，出队释放首元结点后仅需执行 `Q.front->next = NULL`，无需修改 `Q.rear`' },
      { key: 'C', text: '无论队列原先是否为空，入队新结点都可以统一通过修改 `Q.rear->next` 与移动 `Q.rear` 完成' },
      { key: 'D', text: '当原队列中至少有两个元素时，出队操作不会改变 `Q.rear` 的指向' },
    ],
    answer: 'B',
    analysis:
      '当带头结点的链队列中只有一个元素时，首元结点 `p = Q.front->next` 同时也是尾结点（即 `Q.rear == p`）。若出队仅修改 `Q.front->next = p->next` 并 `free(p)` 而不更新 `Q.rear`，会导致 `Q.rear` 成为指向已释放内存的悬空指针，且下次入队时会发生非法访问、判空也会出错。正确做法是在释放 `p` 前判断 `if (Q.rear == p) Q.rear = Q.front;`。其余三项均正确。',
    keyTakeaway:
      '带头结点链队列的“唯一易错边界”不在入队，而在最后一个元素出队时必须把 Q.rear 拉回 Q.front。',
  },
  {
    id: 'DS-03-Q08',
    subject: 'DS',
    chapterId: 'DS-03',
    kpId: 'DS-03-KP2',
    kpTitle: '循环队列状态判定与矩阵压缩映射',
    sourceTag: '真题同源',
    difficulty: '进阶',
    type: 'single_choice',
    stem: '已知 12 阶对称矩阵 $M$（行、列下标均从 $1$ 开始）采用压缩存储，将其上三角区域（含主对角线，即满足 $1 \\le i \\le j \\le 12$ 的元素 $m_{i,j}$）按 **列优先** 顺序依次存入一维数组 `N[0..77]` 中，则元素 $m_{9,4}$ 在数组 `N` 中的下标为（ ）。',
    options: [
      { key: 'A', text: '14' },
      { key: 'B', text: '38' },
      { key: 'C', text: '39' },
      { key: 'D', text: '40' },
    ],
    answer: 'C',
    analysis:
      '目标元素 $m_{9,4}$ 位于下三角（$i = 9 > j = 4$），利用对称矩阵性质 $m_{9,4} = m_{4,9}$ 映射到上三角区域内的存储位置 $(i\\prime = 4, j\\prime = 9)$。上三角按 **列优先** 存入 0 起始一维数组：第 1 列有 1 个元素，第 2 列有 2 个……第 8 列有 8 个，前 8 列合计共有 $1 + 2 + \\dots + 8 = \\frac{8 \\times 9}{2} = 36$ 个元素；第 9 列内从上到下依次为 $m_{1,9}, m_{2,9}, m_{3,9}, m_{4,9}, \\dots$，$m_{4,9}$ 前面还有 3 个同列元素，因此其在 `N` 中的 0 基下标为 $k = 36 + (4 - 1) = 39$。',
    keyTakeaway:
      '矩阵压缩两步走：先判断是否处于实际存储区（对称矩阵越界先对调行列下标），再严格数清目标元素之前有多少整行/整列以及本行/本列内的偏移量（注意 0 基 vs 1 基）。',
  },
  {
    id: 'DS-03-Q09',
    subject: 'DS',
    chapterId: 'DS-03',
    kpId: 'DS-03-KP2',
    kpTitle: '循环队列状态判定与矩阵压缩映射',
    sourceTag: '真题同源',
    difficulty: '进阶',
    type: 'single_choice',
    stem: '设 100 阶三对角矩阵 $M$（行、列下标均从 $1$ 开始）的所有带状非零元素（满足 $|i - j| \\le 1$）按 **行优先** 顺序压缩存入一维数组 `B[0..297]` 中，则元素 $m_{45,44}$ 在数组 `B` 中的下标为（ ）。',
    options: [
      { key: 'A', text: '130' },
      { key: 'B', text: '131' },
      { key: 'C', text: '132' },
      { key: 'D', text: '133' },
    ],
    answer: 'B',
    analysis:
      '三对角矩阵第 1 行与第 $n$ 行各存 2 个元素，第 $2 \\sim n-1$ 行每行各存 3 个元素。要定位第 45 行第 44 列元素 $m_{45,44}$，先统计前 44 行共有 $2 + (44 - 1) \\times 3 = 2 + 129 = 131$ 个非零元素（占用下标 `0..130`）；在第 45 行中，非零元素依次为 $m_{45,44}, m_{45,45}, m_{45,46}$，可见 $m_{45,44}$ 恰好是第 45 行的首个元素，故其 0 基下标为 131（套用公式 $k = 2i + j - 3 = 2 \\times 45 + 44 - 3 = 131$ 结果一致）。',
    keyTakeaway:
      '三对角矩阵行优先 0 基下标公式为 k = 2i + j - 3，考场上用“第 1 行 2 个 + 中间每行 3 个 + 本行偏移 (j - i + 1)”即可瞬间验算无误。',
  },
  {
    id: 'DS-03-Q10',
    subject: 'DS',
    chapterId: 'DS-03',
    kpId: 'DS-03-KP2',
    kpTitle: '循环队列状态判定与矩阵压缩映射',
    sourceTag: '易错变式',
    difficulty: '基础',
    type: 'single_choice',
    stem: '二维数组 `A[0..5][0..7]` 按 **列优先** 顺序存放在内存中，已知每个数组元素占用 4 个字节，且 `A[0][0]` 的起始地址为 1000，则元素 `A[4][3]` 的起始地址为（ ）。',
    options: [
      { key: 'A', text: '1076' },
      { key: 'B', text: '1088' },
      { key: 'C', text: '1112' },
      { key: 'D', text: '1140' },
    ],
    answer: 'B',
    analysis:
      '数组 `A` 共有 $6$ 行（`0..5`）和 $8$ 列（`0..7`）。按 **列优先** 存储时，排在 `A[4][3]` 之前的元素包括完整的第 0、1、2 共 3 列（每列有 6 个元素，计 $3 \\times 6 = 18$ 个），以及第 3 列中位于第 4 行之前的第 0、1、2、3 共 4 个元素，合计 $18 + 4 = 22$ 个元素。每个元素占 4 字节，故 `A[4][3]` 的地址为 $1000 + 22 \\times 4 = 1088$。（常见陷阱 A 误把行数当 5，D 误按行优先算出 $1000 + (4 \\times 8 + 3) \\times 4 = 1140$。）',
    keyTakeaway:
      '二维数组按列优先寻址的乘数是总行数 M（每列元素个数），按行优先寻址的乘数才是总列数 N；务必同时检查下标是否从 0 开始。',
  },
  {
    id: 'DS-03-C01',
    subject: 'DS',
    chapterId: 'DS-03',
    kpId: 'DS-03-KP1',
    kpTitle: '卡特兰数与合法出栈序列规律',
    sourceTag: '真题同源',
    difficulty: '压轴',
    type: 'comprehensive',
    title: '双栈模拟队列算法设计与满栈边界处理（408 算法设计规范）',
    totalPoints: 12,
    stem:
      '【408 真题同源算法设计】已知栈结构 `SqStack` 已实现下列 4 个基本操作（每个栈容量均为固定值 `MaxSize`）：\n' +
      '- `int Push(SqStack &S, ElemType x)`：入栈成功返回 1，失败返回 0；\n' +
      '- `int Pop(SqStack &S, ElemType &x)`：出栈成功返回 1，失败返回 0；\n' +
      '- `int StackEmpty(SqStack S)`：栈空返回 1，否则返回 0；\n' +
      '- `int StackOverflow(SqStack S)`：栈满返回 1，否则返回 0。\n\n' +
      '现要求利用两个同型号顺序栈 `S1` 和 `S2` 共同模拟一个先进先出队列 `Q`，请设计实现以下 3 个队列运算的算法：\n' +
      '（1）给出双栈模拟队列的 **算法基本设计思想**（重点说明如何保证 FIFO 次序以及 `S1` 满时的处理边界）；\n' +
      '（2）采用 C/C++ 描述 `EnQueue(SqStack &S1, SqStack &S2, ElemType e)`、`DeQueue(SqStack &S1, SqStack &S2, ElemType &e)` 和 `QueueEmpty(SqStack S1, SqStack S2)` 三个函数；\n' +
      '（3）分析 `EnQueue` 与 `DeQueue` 的最坏时间复杂度和均摊时间复杂度，并说明该队列最多能容纳多少个元素。',
    hints: [
      '把 `S1` 专门作为入队缓冲栈，`S2` 专门作为出队逆序栈：元素从 `S1` 全部倒入 `S2` 后，栈顶恰好是最早进入 `S1` 的队头元素。',
      '思考“倒栈（`S1 -> S2`）”必须满足的前提条件：若 `S2` 尚有旧元素未出队就往里倒 `S1` 的新元素，旧元素会被压在新元素下面破坏 FIFO！',
      '当 `S1` 已满且 `S2` 也非空时，队列是否还能再安全接收新元素？',
    ],
    subQuestions: [
      {
        label: '(1)',
        prompt: '阐述双栈模拟队列的基本设计思想，特别说明 `EnQueue` 遭遇 `S1` 满时如何正确处理。',
        maxPoints: 4,
        answerKey:
          '将 `S1` 作为入队栈，`S2` 作为出队栈。入队时通常直接压入 `S1`；只有当 `S1` 满时，若 `S2` 为空，可将 `S1` 中全部元素依次弹出并压入 `S2`（实现首尾反转且清空 `S1`），随后再将新元素压入 `S1`；若 `S1` 满且 `S2` 非空，则禁止倒栈（否则新元素会掩盖 `S2` 中的旧队头元素），此时队列真满、入队失败。出队时若 `S2` 非空则直接弹出 `S2` 栈顶；若 `S2` 为空则先检查 `S1` 是否也空，非空时将 `S1` 全部元素倒入 `S2` 再弹出 `S2` 栈顶。当且仅当 `S1` 与 `S2` 同时为空时队列为空。',
        scoringRubric:
          '明确分工 S1 入队/S2 出队得 1 分；说清 S1 满且 S2 空时整栈倾倒得 1 分；点明 S1 满且 S2 非空时直接判队满不得倾倒得 1 分；说清 DeQueue 与 QueueEmpty 逻辑得 1 分。',
      },
      {
        label: '(2)',
        prompt: '写出 `EnQueue`、`DeQueue` 与 `QueueEmpty` 的 C/C++ 核心代码（仅可调用题目给定的 4 个栈基本操作）。',
        maxPoints: 6,
        answerKey:
          '```cpp\nint EnQueue(SqStack &S1, SqStack &S2, ElemType e) {\n  ElemType x;\n  if (!StackOverflow(S1)) {\n    Push(S1, e);\n    return 1;\n  }\n  if (StackOverflow(S1) && !StackEmpty(S2)) {\n    return 0;  // 队列已满，不能破坏 S2 中旧元素的出队顺序\n  }\n  // 此时 S1 满且 S2 空，将 S1 全部倒入 S2 后再入队\n  while (!StackEmpty(S1)) {\n    Pop(S1, x);\n    Push(S2, x);\n  }\n  Push(S1, e);\n  return 1;\n}\n\nint DeQueue(SqStack &S1, SqStack &S2, ElemType &e) {\n  ElemType x;\n  if (!StackEmpty(S2)) {\n    Pop(S2, e);\n    return 1;\n  }\n  if (StackEmpty(S1)) {\n    return 0;  // S1 与 S2 均空，队空\n  }\n  while (!StackEmpty(S1)) {\n    Pop(S1, x);\n    Push(S2, x);\n  }\n  Pop(S2, e);\n  return 1;\n}\n\nint QueueEmpty(SqStack S1, SqStack S2) {\n  return StackEmpty(S1) && StackEmpty(S2);\n}\n```',
        scoringRubric:
          'EnQueue 正确判断 S1 满与 S2 空/非空分支并整栈倒出得 3 分（漏判 S2 非空扣 1 分，未倒全部元素直接扣 2 分）；DeQueue 正确处理 S2 非空、两栈皆空与倒栈后出栈得 2 分；QueueEmpty 正确返回 StackEmpty(S1) && StackEmpty(S2) 得 1 分。',
      },
      {
        label: '(3)',
        prompt: '分析最坏与均摊时间复杂度，并给出队列在两个容量为 `MaxSize` 的栈下可容纳的最大元素数。',
        maxPoints: 2,
        answerKey:
          '单次 `EnQueue` 与 `DeQueue` 在触发倒栈时最坏时间复杂度为 $O(\\text{MaxSize})$（即 $O(n)$），未触发时为 $O(1)$；由于每个元素在其生命周期内至多经历 `Push(S1)`、`Pop(S1)`、`Push(S2)`、`Pop(S2)` 共 4 次常数操作，故均摊时间复杂度为 $O(1)$。若两个栈容量均为 `MaxSize`，当 `S2` 存满 `MaxSize` 个待出元素、`S1` 又存满 `MaxSize` 个新入元素时，该队列最多可容纳 $2 \\times \\text{MaxSize}$ 个元素（但某些出队未清空 `S2` 的中间状态下可能仅在 `MaxSize + 1` 个元素时就拒绝入队）。',
        scoringRubric:
          '答出最坏 O(n)（或 O(MaxSize)）与均摊 O(1) 得 1 分；正确指出理论最大容量 2 * MaxSize（并意识到因不破坏顺序的约束，实际可触发满队的下界为 MaxSize + 1）得 1 分。',
      },
    ],
    fullSolution:
      '### 1. 算法基本设计思想\n' +
      '- 用 `S1` 专职接收新入队元素（越晚入队越靠近 `S1` 栈顶）；用 `S2` 专职输出队头元素（把 `S1` 的元素整批倾倒到 `S2` 后，最早入队的元素恰好位于 `S2` 栈顶）。\n' +
      '- **关键不变量**：任意时刻 `S2` 中的所有元素均严格早于 `S1` 中的所有元素，且在各自栈中满足“先入靠近 `S2` 栈顶、后入靠近 `S1` 栈顶”的单调队列序。为维持这一不变量，**当且仅当 `S2` 完全为空时**，才允许将 `S1` 的元素一次性全部倒入 `S2`。\n\n' +
      '### 2. C/C++ 核心代码\n' +
      '```cpp\n' +
      'int EnQueue(SqStack &S1, SqStack &S2, ElemType e) {\n' +
      '  ElemType x;\n' +
      '  if (!StackOverflow(S1)) {\n' +
      '    Push(S1, e);\n' +
      '    return 1;\n' +
      '  }\n' +
      '  if (!StackEmpty(S2)) {\n' +
      '    return 0;  // 不可覆盖 S2 中的旧元素，只能判定队满\n' +
      '  }\n' +
      '  while (!StackEmpty(S1)) {\n' +
      '    Pop(S1, x);\n' +
      '    Push(S2, x);\n' +
      '  }\n' +
      '  Push(S1, e);\n' +
      '  return 1;\n' +
      '}\n\n' +
      'int DeQueue(SqStack &S1, SqStack &S2, ElemType &e) {\n' +
      '  ElemType x;\n' +
      '  if (!StackEmpty(S2)) {\n' +
      '    Pop(S2, e);\n' +
      '    return 1;\n' +
      '  }\n' +
      '  if (StackEmpty(S1)) {\n' +
      '    return 0;\n' +
      '  }\n' +
      '  while (!StackEmpty(S1)) {\n' +
      '    Pop(S1, x);\n' +
      '    Push(S2, x);\n' +
      '  }\n' +
      '  Pop(S2, e);\n' +
      '  return 1;\n' +
      '}\n\n' +
      'int QueueEmpty(SqStack S1, SqStack S2) {\n' +
      '  return StackEmpty(S1) && StackEmpty(S2);\n' +
      '}\n' +
      '```\n\n' +
      '### 3. 复杂度与容量边界\n' +
      '- 单次操作最坏时间复杂度 $O(\\text{MaxSize})$，均摊时间复杂度 $O(1)$；算法仅使用常数个临时变量，辅助空间复杂度 $O(1)$。\n' +
      '- 注意最大可存储容量可达 $2 \\times \\text{MaxSize}$（先把 `MaxSize` 个元素倒入 `S2`，再往 `S1` 压满 `MaxSize` 个），但如果 `S2` 中尚有 1 个未出元素而 `S1` 已满 `MaxSize` 个元素，继续调用 `EnQueue` 仍会返回 0。',
    pitfalls: [
      '最常见失分点：在 `EnQueue` 中遇到 `StackOverflow(S1)` 时只倒入几个元素到 `S2`，或不管 `S2` 是否为空就直接往 `S2` 倒元素——两种做法都会立刻破坏队列的先进先出次序！',
      '判断 `QueueEmpty` 时容易只判断 `StackEmpty(S1)` 或只判断 `StackEmpty(S2)`，忘记必须两栈同时为空。',
      '题目限制了只允许调用给定 4 个栈操作，代码中禁止直接操作内部数组 `S1.data` 或 `S1.top`。',
    ],
  },
  {
    id: 'DS-03-C02',
    subject: 'DS',
    chapterId: 'DS-03',
    kpId: 'DS-03-KP2',
    kpTitle: '循环队列状态判定与矩阵压缩映射',
    sourceTag: '王道课后改编',
    difficulty: '进阶',
    type: 'comprehensive',
    title: '中缀表达式转后缀全过程追踪与上三角矩阵压缩映射推导',
    totalPoints: 10,
    stem:
      '综合应用题（共 10 分）：\n' +
      '（1）给定中缀表达式 `a + b * (c - d / e) - f * g`，请将其转换为等价后缀表达式，并回答在扫描处理到 `/`（即 `d / e` 中的除号）刚入栈时，运算符栈中从栈底到栈顶的内容以及全过程中栈所达到的最大深度；\n' +
      '（2）已知 $n$ 阶上三角矩阵 $A = (a_{i,j})_{n \\times n}$（行、列下标均从 $1$ 开始，满足当 $i > j$ 时 $a_{i,j}$ 均为同一常量 $c$），现按 **列优先** 方式将上三角区域及常量 $c$ 压缩存入一维数组 `B[0 .. n(n+1)/2]` 中（常量 $c$ 存于数组最后一个单元）。请推导任意元素 $a_{i,j}$ 到数组下标 $k$ 的分段映射公式，并据此计算当 $n = 10$ 时 $a_{3,8}$ 与 $a_{8,3}$ 在数组 `B` 中的下标。',
    hints: [
      '注意括号内的运算符只在遇到右括号 `)` 时成批弹出，括号本身在出栈后直接丢弃。',
      '当遇到减号 `-`（位于 `)` 之后）时，由于其优先级不高于 `*` 和 `+`，需要将此前压在栈底的 `*` 与 `+` 全部弹出！',
      '上三角按列优先存储时，第 1 列有 1 个有效元素，第 2 列有 2 个……第 $j-1$ 列有 $j-1$ 个。',
    ],
    subQuestions: [
      {
        label: '(1)',
        prompt: '给出等价后缀表达式，以及处理完 `d / e` 中 `/` 入栈瞬间的栈内容与全过程最大栈深度。',
        maxPoints: 4,
        answerKey:
          '等价后缀表达式为 `a b c d e / - * + f g * -`。当 `d / e` 中的 `/` 刚入栈时，运算符栈从栈底到栈顶依次为 `+ * ( - /`；这也是整个转换过程中运算符栈达到的最大深度，最大深度为 5。',
        scoringRubric:
          '完整后缀表达式完全正确得 2 分（符号错位每处扣 1 分）；栈底到栈顶 + * ( - / 正确得 1 分；最大深度 5 正确得 1 分。',
      },
      {
        label: '(2)',
        prompt: '推导 $n$ 阶上三角矩阵按列优先压缩进 0 起始数组 `B[0 .. n(n+1)/2]` 的下标公式，并计算 $n=10$ 时 $a_{3,8}$ 和 $a_{8,3}$ 的下标。',
        maxPoints: 6,
        answerKey:
          '分两种情况讨论：\n' +
          '① 当 $1 \\le i \\le j \\le n$（上三角区及主对角线）时，前 $j - 1$ 列共有 $1 + 2 + \\dots + (j - 1) = \\frac{j(j - 1)}{2}$ 个元素；第 $j$ 列中从第 1 行到第 $i$ 行，$a_{i,j}$ 前面共有 $i - 1$ 个元素，故其 0 基下标为 $k = \\frac{j(j - 1)}{2} + i - 1$。\n' +
          '② 当 $i > j$（下三角常量区）时，直接映射到数组最后一个位置 $k = \\frac{n(n + 1)}{2}$。\n' +
          '当 $n = 10$ 时：$a_{3,8}$ 满足 $3 \\le 8$，代入公式得 $k = \\frac{8 \\times 7}{2} + 3 - 1 = 28 + 2 = 30$；$a_{8,3}$ 满足 $8 > 3$，落在常量区，其下标为 $k = \\frac{10 \\times 11}{2} = 55$。',
        scoringRubric:
          '正确推导 i <= j 分支公式 k = j(j - 1)/2 + i - 1 得 3 分；正确写出 i > j 常量区下标 k = n(n + 1)/2 得 1 分；算对 a(3,8) -> 30 得 1 分；算对 a(8,3) -> 55 得 1 分。',
      },
    ],
    fullSolution:
      '### （1）中缀转后缀全步骤追踪\n' +
      '| 扫描字符 | 运算符栈（栈底$\\to$栈顶） | 后缀表达式输出 |\n' +
      '| --- | --- | --- |\n' +
      '| `a` | 空 | `a` |\n' +
      '| `+` | `+` | `a` |\n' +
      '| `b` | `+` | `a b` |\n' +
      '| `*` | `+ *` | `a b` |\n' +
      '| `(` | `+ * (` | `a b` |\n' +
      '| `c` | `+ * (` | `a b c` |\n' +
      '| `-` | `+ * ( -` | `a b c` |\n' +
      '| `d` | `+ * ( -` | `a b c d` |\n' +
      '| `/` | `+ * ( - /` | `a b c d` |\n' +
      '| `e` | `+ * ( - /` | `a b c d e` |\n' +
      '| `)` | `+ *` | `a b c d e / -` |\n' +
      '| `-` | `-` | `a b c d e / - * +` |\n' +
      '| `f` | `-` | `a b c d e / - * + f` |\n' +
      '| `*` | `- *` | `a b c d e / - * + f` |\n' +
      '| `g` | `- *` | `a b c d e / - * + f g` |\n' +
      '| 结束 | 空 | `a b c d e / - * + f g * -` |\n\n' +
      '可见 `/` 刚入栈时栈内容为 `+ * ( - /`，全过程最大栈深度为 **5**。\n\n' +
      '### （2）上三角矩阵列优先压缩下标推导\n' +
      '1. 当 $1 \\le i \\le j \\le n$ 时，上三角矩阵按 **列优先** 存储的列长分别为 $1, 2, \\dots, n$。目标元素 $a_{i,j}$ 位于第 $j$ 列第 $i$ 个位置（1 基列内次序）：\n' +
      '   - 前 $j - 1$ 列元素总数为 $\\sum_{t=1}^{j-1} t = \\frac{j(j-1)}{2}$；\n' +
      '   - 第 $j$ 列内 $a_{i,j}$ 前方还有 $a_{1,j}, \\dots, a_{i-1,j}$ 共 $i - 1$ 个元素；\n' +
      '   - 故 0 起始数组下标 $k = \\frac{j(j-1)}{2} + i - 1$。\n' +
      '2. 当 $i > j$ 时，$a_{i,j} = c$，存于数组最后一个位置 $B\\left[\\frac{n(n+1)}{2}\\right]$。\n' +
      '3. 代入 $n = 10$：\n' +
      '   - $a_{3,8}$（$i=3 \\le j=8$）：$k = \\frac{8 \\times 7}{2} + 3 - 1 = 30$；\n' +
      '   - $a_{8,3}$（$i=8 > j=3$）：$k = \\frac{10 \\times 11}{2} = 55$。',
    pitfalls: [
      '易错 1：误认为“上三角矩阵与对称矩阵公式相同”——遇到下三角元素 $a_{8,3}$ 绝不可对调成 $a_{3,8}$ 来算，上三角矩阵只有对角线下方全为常数 $c$ 才适用常量单元 $n(n+1)/2$！',
      '易错 2：扫描第二个 `-` 时若未把 `+` 也从栈顶弹出，就会误得出错误后缀 `a b c d e / - * f g * - +`。',
    ],
  },
];
