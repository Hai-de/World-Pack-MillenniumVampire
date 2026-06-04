// ── 提示池生命周期管理 ──

// prompt-pool.ts is the canonical home for replacement prompts and generateReplacementPrompt.
import { getHost, loadVampireState, defaultVampireState, saveVampireState } from './state';
import { shuffle } from './dice';

// ── 替换提示生成（静态循环，不依赖 AI） ──

const replacementPrompts = [
  '一群猎魔人追踪到了你的踪迹。你如何甩掉他们？检验一项技艺，失去一种资源。',
  '你在一个陌生的城市醒来，发现自己被埋在地下已有一个月。谁把你挖出来的？创建一个角色。',
  '月光洒在你的脸上，你感到一阵久违的平静。记录下这一刻的思绪。获得一段经历。',
  '一位陌生的访客送来了一份礼物——一瓶古老的血液。谁送的？你喝下后发生了什么？获得一项技艺。',
  '你的旧友从远方归来，但他已经不再是人类。你们之间发生了什么？创建一个不朽角色。',
  '一场大火烧毁了你的藏身之所，你失去了多年收集的宝物。失去两项资源，创建一个提供帮助的角色。',
  '你遇到了一个知道你所有秘密的凡人。她威胁要揭露你，但提出了一个交易。创建一个角色，失去一种资源。',
  '街头的流言说有一个更古老的吸血鬼来到了这座城市。你决定去拜访他。创造一个不朽角色，检验一项技艺。',
  '一个孩子在你的门前留下了一束花。这个孩子的家族曾经侍奉过你。创建一个角色，获得一种资源。',
  '你的身体突然开始衰老——只是暂时的，但足够让你恐惧。这期间发生了什么？划掉一段回忆。',
  '一只黑猫每天都来你的窗前。它似乎是某个已故老友的灵魂。记录这段奇怪的经历。获得一项技艺。',
  '你救下了一个即将被处决的女巫。她用什么报答你？创建一个角色，获得一种资源。',
  '暴风雨之夜，一个陌生人敲响了你的门。他浑身是血，声称是你杀了他。但他还活着——或者说，某种意义上的活着。创建一个角色。',
  '你在古董市场发现了一件属于你三百年前的物品。它怎么会在这里？获得一种资源。',
  '一个被遗忘的印记突然发作，让你几乎失去了控制。这个印记是什么？你如何重新掌控自己？检验一项技艺。',
];

let replacementIndex = 0;

export function generateReplacementPrompt(_consumedContent: string): string {
  const prompt = replacementPrompts[replacementIndex % replacementPrompts.length];
  replacementIndex++;
  return prompt;
}

// ── LoopHook: 提示池补充 ──

export async function replenishPromptPool(_ctx: Record<string, unknown>): Promise<void> {
  const host = getHost();
  if (!host) return;

  const state = await loadVampireState(host);

  // 每 8 次骰子检查一次是否需要刷新（与 reshuffle 同步）
  if (state.dice_roll_count === 0 || state.dice_roll_count % 8 !== 0) return;
  // 只在 8 的倍数 + 4 时执行，避免与 reshuffle 冲突
  if (state.dice_roll_count % 16 !== 8) return;

  const records = await host.listPackCollectionRecords('prompt_pool');
  const consumedPositions = records
    .filter((r: any) => r.consumed)
    .map((r: any) => r.position as number);

  // 如果超过 40% 已被消费过，刷新部分陈旧提示
  const consumedRatio = consumedPositions.length / records.length;
  if (consumedRatio < 0.4) return;

  // 选取 5 个最旧的未消费提示，用新鲜内容替换
  const unconsumedRecords = records.filter((r: any) => !r.consumed);
  const toRefresh = unconsumedRecords.slice(0, Math.min(5, unconsumedRecords.length));

  for (const r of toRefresh) {
    const freshContent = generateReplacementPrompt(r.content);
    await host.upsertPackCollectionRecord('prompt_pool', {
      position: r.position,
      content: freshContent,
      consumed: false
    });
  }

  // 重新打乱
  if (toRefresh.length > 0) {
    state.prompt_order = shuffle(state.prompt_order);
    state.prompt_cursor = Math.floor(state.prompt_order.length / 2);
    await saveVampireState(host, state);
  }
}

// ── DataCleaner: 回忆衰减 ──

export async function memoryDecay(input: {
  text: string;
  options?: Record<string, unknown>;
}): Promise<{ cleaned: string; metadata: Record<string, unknown> }> {
  return {
    cleaned: input.text,
    metadata: { memory_decay_applied: false }
  };
}

// ── 懒初始化：任意 handler 检测到空池时自动补种 ──
let seedingLock = false;

export async function ensurePromptPoolSeeded(host: any): Promise<void> {
  const records = await host.listPackCollectionRecords('prompt_pool');
  if (records.length > 0) return;
  if (seedingLock) return; // 防止并发重复播种
  seedingLock = true;
  try {
    await seedPromptPool(host);
  } finally {
    seedingLock = false;
  }
}

// ── 种子提示池 ──

export async function seedPromptPool(host: any): Promise<void> {
  const records = await host.listPackCollectionRecords('prompt_pool');
  if (records.length > 0) return;

  const seedPrompts = [
    // ── 第1组：基础引导 (0-9) ──
    '新的法律和社会习俗让你更难藏身于人群之中。你几乎被捕，险些丧命的过程是怎么样的？检验一项技艺，创造一项技艺，创造一个为你提供帮助的罪犯凡俗生物。',
    '当太阳升起时，你被困在外面，躲在一个你未曾预料的地方。一个孩子发现了你并与你成为朋友。创建一个凡人儿童角色并记录一次人性化的经历。',
    '因为对鲜血的渴望，你杀死了身边的某个人。杀死一个凡俗生物，如果没有可用角色，那就创造一个凡俗生物再杀死。获得技艺：嗜血。',
    '某个凡俗生物开始侍奉你。那是怎么样的人？为何被你吸引？创造一个新的凡俗生物。',
    '某个值得信赖的凡俗生物以令人震惊的方式背叛了你。失去一种资源，这个人为什么要这么做？你为什么选择宽恕？',
    '某个凡俗生物为了救你牺牲了自己。检验一项技艺，获得一项与爱或信任相关的技艺。',
    '同一个家族的几代人为你服务。这条血脉从任何活着的凡人角色开始，或者从死去的凡人角色的后代开始。她们为自己的服务指定了哪些奇怪的仪式？失去一项资源并创建一个仆从家族资源。',
    '你被某个与你相仿的生物认了出来。创造一个不朽生物，失去一种资源，并获得一项技艺。你会为此失去什么？',
    '夜晚的星辰如风车轮转，季节的变换如白驹过隙，一个世纪过去了。划掉一段回忆，划掉所有凡俗生物。',
    '岁月侵蚀了你的日记。从日记中最早的回忆开始，遗忘其中三个名词。',
    // ── 第2组：城市与隐匿 (10-19) ──
    '你的藏身之处被发现了，一群陌生人正在靠近。你必须立即逃离。失去了什么？获得了什么新的庇护？失去一种资源，获得一种新资源。',
    '你在一座废弃的建筑里发现了一件看起来很古老的物品。它散发出微弱的血腥气息。获得一种新资源。',
    '一个猎人正在城市中寻找超自然存在。他有什么特别的装备？你如何避免被发现？检验一项技艺。',
    '城市中爆发了疾病，医院人满为患。你看到凡人在痛苦中挣扎。创建一个在这场危机中与你产生交集的凡人角色。',
    '有人发现你不需要睡觉。你必须解释这个异常现象。检验一项技艺，失去一种资源。',
    '在一场社交聚会上，你感觉到了另一个非人类的存在。她正在观察你。创造一个不朽角色。',
    '你的旧住所被查封了。你被迫在雨夜中寻找新的住处。失去一种资源，获得一种新资源。',
    '一个孩子注意到你的皮肤在月光下会微微发光。你如何处理这个观察者？创建一个凡人角色。',
    '一封没有署名的信件被送到你手中，里面写着一些只有你才知道的历史细节。获得一项技艺。',
    '你在地下室中意外地沉睡了很久。醒来时，外面已经是另一个季节。创建一个凡人角色。',
    // ── 第3组：际遇与羁绊 (20-29) ──
    '一个凡人向你伸出了手，她的目光里没有恐惧，只有好奇。她正在邀请你做某件事。创建一个凡人角色，获得一项与情感相关的技艺。',
    '一个陌生人用熟悉的眼神看着你，仿佛认识你很久。她称呼你一个旧日的名字。创建一个角色，检验一项技艺。',
    '有人将一封信放在你的门前，信中详细描述了你过去的行为，字里行间充满了愤怒。创建一个敌对凡人角色，失去一种资源。',
    '两个长相相似的女子出现在你面前，一个温柔，一个警惕。其中一个正在打量你的反应。创建一个角色，杀死一个角色。',
    '一个孤儿站在你的门前，手里拿着一个破旧的玩偶。她抬头看着你，眼中没有恐惧。创建一个角色，检验一项技艺。',
    '另一个不朽存在站在你面前，沉默了很久。她的眼神平静而坚决，然后说出了一个决定。杀死一个不朽角色，划掉一段回忆。',
    '一位老妇人临终前交给你一个盒子，里面装着记录你某些行踪的纸页。失去一种资源，创建一个角色。',
    '你在街上看到一个女子，她的容貌与你回忆中的某人完全一致。她正在与别人交谈。创建一个角色，检验一项技艺。',
    '一封古老的信件被一个陌生人交到你手中，信封已经发黄，但字迹依然清晰。创建一个角色。',
    '你在月光下演奏乐器，旋律中包含了只有你才懂的回忆片段。获得一项技艺，记录一段经历。',
    // ── 第4组：冲突与战争 (30-39) ──
    '远处传来战斗的声音，人们正在为某种目标而战。你看到一个受伤的士兵在废墟中爬行。创建一个凡人角色。',
    '有人闯入了你的住所，他们穿着制服，手持武器。杀死一个凡人角色，获得一种新资源。',
    '你在街上遇到了另一个明显不是人类的存在。他正在喝一个容器中的液体。创造一个不朽角色，检验一项技艺。',
    '你回到你的住所，发现它已经被摧毁。废墟中散落着各种物品。失去两项资源，创建一个新的凡人角色。',
    '一个陌生人突然出现在你的面前，他浑身是伤，眼神中充满了恐惧。创建一个角色，获得一项技艺。',
    '有人邀请你加入一个由各种存在组成的团体。他们的目的是什么？检验一项技艺，创建一个不朽角色。',
    '你在人群中看到一个你似乎曾经见过的面孔。他正在庆祝什么，但注意到你后表情凝固了。创建一个角色。',
    '一个孩子独自站在街上，眼中充满了迷茫。他身上有贵族的徽记。创建一个角色，获得一种资源。',
    '阳光突然照进你的藏身之处。你的皮肤开始发热。失去一种资源。',
    '你决定整理你的回忆，将某些过去封存起来。划掉一段回忆，获得一种资源。',
    // ── 第5组：探索与发现 (40-49) ──
    '你进入了一个从未去过的区域。这里有什么吸引你的东西？检验一项技艺，创建一个角色。',
    '你在冰天雪地中发现了一个奇怪的建筑。它看起来不属于这个时代。创建一个不朽角色，获得一项技艺。',
    '你遇到了一个教你特殊技巧的老师。这个技巧能帮助你控制自己。获得一项技艺，失去一种资源。',
    '你在水中发现了一本古老的书。书页虽然湿透，但字迹依然可读。创建一个角色，检验一项技艺。',
    '你尝试了一种不同来源的液体。它的味道与你习惯的不同。获得一项技艺，失去一种资源。',
    '你在沙漠中遇到了一个自称很古老的居民。他知道很多关于这片土地的故事。创建一个不朽角色。',
    '你发现了一个通往另一个地方的入口。入口那边隐约可以看到不同的景象。检验一项技艺，创造一项技艺。',
    '你得到了一张详细的地图，上面标记着多个地点。获得一种资源，创建一个角色。',
    '一种新发明的设备出现在你面前。它对你的存在有反应。失去一种资源，获得一项技艺。',
    '你在旅途中遇到了其他长寿的存在。他们分享了一些经历。创建一个角色，获得一项技艺。',
    // ── 第6组：权力与阴谋 (50-59) ──
    '有人邀请你参加一个秘密聚会。聚会上都是与你类似的存在。创建一个不朽角色，获得一种资源。',
    '你发现一群人正在秘密策划改变现状。他们希望你能加入。检验一项技艺，创建一个角色。',
    '一个古老的文本被交到你手中，其中描述了关于你的内容。创建一个角色，获得一项技艺。',
    '一个年长的存在要求你服从他的命令。他看起来很有权威。检验一项技艺。',
    '一个为你做事的凡人在一场权力斗争中消失了。杀死一个凡人角色，失去一种资源，获得一项技艺。',
    '你看到了一个改变权力结构的机会。你采取了行动。创建一个角色，获得一种资源。',
    '一个凡人组织开始系统地调查超自然存在。他们的首领是谁？创建一个角色，检验一项技艺。',
    '你与另一个存在达成了一项协议。协议的条件是什么？创建一个不朽角色，获得一种资源。',
    '你被要求证明自己的实力。你的对手是谁？检验一项技艺，如果失败则失去一种资源。',
    '一群人将你视为他们信仰的中心。他们向你献上供品。创建一个角色，获得一种资源。'
  ];

  for (let i = 0; i < seedPrompts.length; i++) {
    await host.upsertPackCollectionRecord('prompt_pool', {
      position: i,
      content: seedPrompts[i],
      consumed: false
    });
  }

  // 打乱提示顺序，光标置于中间
  const order = shuffle(Array.from({ length: seedPrompts.length }, (_, i) => i));
  const state = defaultVampireState();
  state.prompt_order = order;
  state.prompt_cursor = Math.floor(order.length / 2);
  state.game_phase = 'uninitialized';
  await saveVampireState(host, state);
}
