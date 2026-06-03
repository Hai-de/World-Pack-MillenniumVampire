<template>
  <div class="vampire-character-creation">
    <!-- 进度条 -->
    <div class="vampire-character-creation__progress">
      <div
        class="vampire-character-creation__progress-bar"
        :style="{ width: `${((currentStep + 1) / totalSteps) * 100}%` }"
      />
    </div>

    <!-- 步骤信息 -->
    <div class="vampire-character-creation__step-info">
      <span class="vampire-character-creation__step-count">
        {{ currentStep + 1 }}/{{ totalSteps }}
      </span>
      <h2 class="vampire-character-creation__step-title">
        {{ steps[currentStep].title }}
      </h2>
    </div>

    <!-- 步骤内容 -->
    <div class="vampire-character-creation__content">
      <div class="vampire-character-creation__prompt">
        {{ steps[currentStep].prompt }}
      </div>

      <!-- ─── textarea 步骤 ─── -->
      <div v-if="steps[currentStep].inputType === 'textarea'" class="vampire-character-creation__input-area">
        <textarea
          v-model="formData[steps[currentStep].field]"
          class="vampire-character-creation__textarea"
          :placeholder="steps[currentStep].placeholder"
          rows="6"
        />
      </div>

      <!-- ─── 名字 + 外观列表 ─── -->
      <div v-else-if="steps[currentStep].inputType === 'name-appearance'" class="vampire-character-creation__input-area">
        <label class="vampire-character-creation__field-label">名字</label>
        <input
          v-model="formData.mortalName"
          type="text"
          class="vampire-character-creation__input"
          placeholder="输入吸血鬼的名字"
        />

        <label class="vampire-character-creation__field-label">外观描述</label>
        <div class="vampire-character-creation__appearance-list">
          <div
            v-for="(_, idx) in formData.appearance"
            :key="idx"
            class="vampire-character-creation__appearance-row"
          >
            <input
              v-model="formData.appearance[idx]"
              type="text"
              class="vampire-character-creation__input"
              placeholder="例：苍白如纸的皮肤"
              @keydown.enter.prevent="addAppearanceItem"
            />
            <button
              v-if="formData.appearance.length > 1"
              type="button"
              class="vampire-character-creation__remove-btn"
              aria-label="移除此特征"
              @click="removeAppearanceItem(idx)"
            >
              ✕
            </button>
          </div>
        </div>
        <button
          type="button"
          class="vampire-character-creation__add-btn"
          @click="addAppearanceItem"
        >
          + 添加特征
        </button>
      </div>

      <!-- ─── 三组名字+描述 ─── -->
      <div v-else-if="steps[currentStep].inputType === 'triple-pairs'" class="vampire-character-creation__input-area">
        <div
          v-for="(_, idx) in (formData[steps[currentStep].field] as Array<{ name: string; description: string }>)"
          :key="idx"
          class="vampire-character-creation__pair-group"
        >
          <label class="vampire-character-creation__field-label">
            {{ steps[currentStep].nameLabel }} {{ idx + 1 }}
          </label>
          <input
            v-model="(formData[steps[currentStep].field] as Array<{ name: string; description: string }>)[idx].name"
            type="text"
            class="vampire-character-creation__input"
            :placeholder="steps[currentStep].namePlaceholder"
          />
          <input
            v-model="(formData[steps[currentStep].field] as Array<{ name: string; description: string }>)[idx].description"
            type="text"
            class="vampire-character-creation__input"
            :placeholder="steps[currentStep].descPlaceholder"
          />
        </div>
      </div>

      <!-- ─── 三个独立输入框 ─── -->
      <div v-else-if="steps[currentStep].inputType === 'triple-inputs'" class="vampire-character-creation__input-area">
        <div
          v-for="(_, idx) in formData[steps[currentStep].field]"
          :key="idx"
          class="vampire-character-creation__numbered-row"
        >
          <label class="vampire-character-creation__field-label">{{ idx + 1 }}</label>
          <input
            v-model="formData[steps[currentStep].field][idx]"
            type="text"
            class="vampire-character-creation__input"
            :placeholder="steps[currentStep].placeholder"
          />
        </div>
      </div>

      <!-- ─── 三个独立文本域 ─── -->
      <div v-else-if="steps[currentStep].inputType === 'triple-textareas'" class="vampire-character-creation__input-area">
        <div
          v-for="(_, idx) in formData[steps[currentStep].field]"
          :key="idx"
          class="vampire-character-creation__numbered-block"
        >
          <label class="vampire-character-creation__field-label">经历 {{ idx + 1 }}</label>
          <textarea
            v-model="formData[steps[currentStep].field][idx]"
            class="vampire-character-creation__textarea"
            :placeholder="steps[currentStep].placeholder"
            rows="4"
          />
        </div>
      </div>

      <!-- ─── 名字 + 介绍 ─── -->
      <div v-else-if="steps[currentStep].inputType === 'name-description'" class="vampire-character-creation__input-area">
        <label class="vampire-character-creation__field-label">名字</label>
        <input
          v-model="formData.immortalName"
          type="text"
          class="vampire-character-creation__input"
          :placeholder="steps[currentStep].namePlaceholder"
        />
        <label class="vampire-character-creation__field-label">介绍</label>
        <textarea
          v-model="formData.immortalDescription"
          class="vampire-character-creation__textarea"
          :placeholder="steps[currentStep].descPlaceholder"
          rows="4"
        />
      </div>

      <!-- 示例参考 -->
      <div v-if="steps[currentStep].example" class="vampire-character-creation__example">
        <h4 class="vampire-character-creation__example-title">示例参考</h4>
        <p class="vampire-character-creation__example-text">
          {{ steps[currentStep].example }}
        </p>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="vampire-character-creation__actions">
      <button
        type="button"
        class="vampire-character-creation__btn vampire-character-creation__btn--back"
        :disabled="currentStep === 0"
        @click="prevStep"
      >
        ← 上一步
      </button>

      <button
        type="button"
        class="vampire-character-creation__btn vampire-character-creation__btn--next"
        :disabled="isNextDisabled || isSubmitting"
        @click="nextStep"
      >
        {{ isSubmitting ? '提交中…' : (isLastStep ? '完成创建' : '下一步 →') }}
      </button>
    </div>

    <div class="vampire-character-creation__secondary-actions">
      <button
        type="button"
        class="vampire-character-creation__btn vampire-character-creation__btn--seed"
        @click="fillSeedData"
      >
        注入种子数据
      </button>

      <button
        type="button"
        class="vampire-character-creation__btn vampire-character-creation__btn--skip"
        @click="skipStep"
      >
        跳过
      </button>
    </div>

    <!-- 提交错误提示 -->
    <div v-if="submitError" class="vampire-character-creation__error">
      {{ submitError }}
    </div>

    <!-- 断点续填提示 -->
    <div v-if="hasDraft" class="vampire-character-creation__draft-notice">
      <p>检测到未完成的车卡记录（第 {{ draftStep + 1 }} 步）</p>
      <div class="vampire-character-creation__draft-actions">
        <button type="button" @click="resumeDraft">继续</button>
        <button type="button" @click="clearDraft">重新开始</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useShellAuth } from '../../composables/useShellAuth'
import { useCharacterStore } from '../../stores/characterStore'
import { useGameStore } from '../../stores/gameStore'

const router = useRouter()
const { httpClient, shellContext } = useShellAuth()
const gameStore = useGameStore()
const characterStore = useCharacterStore()

// ─── 步骤输入类型 ───

type StepInputType = 'textarea' | 'name-appearance' | 'triple-pairs' | 'triple-inputs' | 'triple-textareas' | 'name-description'

interface CreationStep {
  title: string
  prompt: string
  inputType: StepInputType
  field: string
  placeholder?: string
  example?: string
  // name-appearance / name-description
  nameField?: string
  namePlaceholder?: string
  descPlaceholder?: string
  // triple-pairs
  nameLabel?: string
  descLabel?: string
}

const steps: CreationStep[] = [
  {
    title: '设定你的吸血鬼的名字',
    prompt: '为你的吸血鬼设定一个名字以及外观描述。',
    inputType: 'name-appearance',
    field: 'mortalName'
  },
  {
    title: '成为吸血鬼前的经历',
    prompt: '叙述主角在成为吸血鬼之前的人生。是什么样的人？从事什么职业？',
    inputType: 'textarea',
    field: 'preVampireExperience',
    placeholder: '例：在十五世纪的佛罗伦萨，我是一名医生...'
  },
  {
    title: '创建三个凡人角色',
    prompt: '创建三个与吸血鬼有关的凡人角色——变成吸血鬼之前认识的人。',
    inputType: 'triple-pairs',
    field: 'mortalCharacters',
    nameLabel: '角色',
    descLabel: '概括',
    namePlaceholder: '名字',
    descPlaceholder: '简短概括这个角色',
    example: '伊丽莎白 — 我在佛罗伦萨行医时的助手，知道我所有秘密却从不畏惧\n马可 — 与我一起在码头长大的童年挚友，后来成为城邦议员\n老安东尼奥 — 教会我医术的导师，在我"死去"后再未提及我的名字'
  },
  {
    title: '创建三个技艺',
    prompt: '创建三个符合角色的技艺（能力和特质）。',
    inputType: 'triple-pairs',
    field: 'skills',
    nameLabel: '技艺',
    descLabel: '描述',
    namePlaceholder: '技艺名称',
    descPlaceholder: '简短描述这个技艺',
    example: '炼金术与草药知识 — 掌握早期化学和药理学，能够调配治疗药剂和有毒的混合物\n古典拉丁语与希腊语 — 流利阅读古代文献，能够解读失传的咒语和炼金术手稿\n长剑格斗 — 在成为医生之前曾在佣兵团服役，精通文艺复兴时期的剑术'
  },
  {
    title: '创建三个资源',
    prompt: '创建三个符合角色的资源（资产、组织或珍视之物）。',
    inputType: 'triple-pairs',
    field: 'resources',
    nameLabel: '资源',
    descLabel: '描述',
    namePlaceholder: '资源名称',
    descPlaceholder: '简短描述这个资源',
    example: '一本记载禁术的古老手稿 — 包含了从活人身上汲取生命力的禁忌仪式\n家族遗留的佛罗伦萨郊外庄园 — 庇护所和藏身之处，地窖中藏有秘密实验室\n一名世代侍奉格雷家族的忠诚仆人 — 马丁，知道主人的真实身份，从不对外透露'
  },
  {
    title: '创建三段经历',
    prompt: '录入主角在变成吸血鬼之前的三段人生经历。',
    inputType: 'triple-textareas',
    field: 'experiences',
    placeholder: '描述这段经历...',
    example: '在佛罗伦萨瘟疫中日夜救治病人，目睹半座城的人口消失\n在威尼斯港口的酒馆里，第一次听说"食人者"的传说\n某年冬日，一位不速之客带着奇怪的礼物敲开了我的门'
  },
  {
    title: '创建一个不朽者角色',
    prompt: '创建一个与吸血鬼相仿的不朽生物角色。',
    inputType: 'name-description',
    field: 'immortalName',
    namePlaceholder: '不朽者的名字',
    descPlaceholder: '描述这个不朽者...'
  },
  {
    title: '创建一个印记',
    prompt: '创建一个代表吸血鬼非人特征的印记。',
    inputType: 'textarea',
    field: 'mark',
    placeholder: '例：苍白的皮肤、永恒的饥饿、不会眨眼'
  },
  {
    title: '变为吸血鬼的经历',
    prompt: '描述主角是如何变成吸血鬼的。',
    inputType: 'textarea',
    field: 'turningExperience',
    placeholder: '例：在一个暴风雨的夜晚，我被一个古老的吸血鬼袭击...'
  }
]

const currentStep = ref(0)
const totalSteps = steps.length

// ─── 表单数据 ───

interface MortalCharacter {
  name: string
  description: string
}

const formData = ref<Record<string, unknown>>({
  mortalName: '',
  appearance: [''],
  preVampireExperience: '',
  mortalCharacters: [
    { name: '', description: '' },
    { name: '', description: '' },
    { name: '', description: '' }
  ] as MortalCharacter[],
  skills: [
    { name: '', description: '' },
    { name: '', description: '' },
    { name: '', description: '' }
  ],
  resources: [
    { name: '', description: '' },
    { name: '', description: '' },
    { name: '', description: '' }
  ],
  experiences: ['', '', ''],
  immortalName: '',
  immortalDescription: '',
  mark: '',
  turningExperience: ''
})

const hasDraft = ref(false)
const draftStep = ref(0)
const draftVersion = '0.2.0'

// ─── 外观列表操作 ───

function addAppearanceItem() {
  const appearance = formData.value.appearance as string[]
  appearance.push('')
  nextTick(() => {
    const rows = document.querySelectorAll('.vampire-character-creation__appearance-row')
    const lastInput = rows[rows.length - 1]?.querySelector('input') as HTMLInputElement | null
    lastInput?.focus()
  })
}

function removeAppearanceItem(idx: number) {
  const appearance = formData.value.appearance as string[]
  if (appearance.length <= 1) return
  appearance.splice(idx, 1)
}

// ─── 导航 ───

const isLastStep = computed(() => currentStep.value === totalSteps - 1)

const isNextDisabled = computed(() => {
  const step = steps[currentStep.value]
  switch (step.inputType) {
    case 'textarea':
      return !(formData.value[step.field] as string)?.trim()
    case 'name-appearance':
      return !(formData.value.mortalName as string)?.trim()
    case 'triple-inputs':
      return !(formData.value[step.field] as string[]).some((s: string) => s.trim())
    case 'triple-textareas':
      return !(formData.value[step.field] as string[]).some((s: string) => s.trim())
    case 'triple-pairs':
      return !(formData.value[step.field] as Array<{ name: string; description: string }>).some(
        (item) => item.name.trim() || item.description.trim()
      )
    case 'name-description':
      return !(formData.value.immortalName as string)?.trim()
    default:
      return true
  }
})

function prevStep() {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

function nextStep() {
  if (isLastStep.value) {
    submitCreation()
  } else {
    currentStep.value++
  }
}

function skipStep() {
  const step = steps[currentStep.value]
  switch (step.inputType) {
    case 'textarea':
      formData.value[step.field] = ''
      break
    case 'name-appearance':
      formData.value.mortalName = ''
      formData.value.appearance = ['']
      break
    case 'triple-inputs':
    case 'triple-textareas':
      formData.value[step.field] = ['', '', '']
      break
    case 'triple-pairs': {
      const emptyPairs = [
        { name: '', description: '' },
        { name: '', description: '' },
        { name: '', description: '' }
      ]
      formData.value[step.field] = emptyPairs
      break
    }
    case 'name-description':
      formData.value.immortalName = ''
      formData.value.immortalDescription = ''
      break
  }
  nextStep()
}

// ─── 草稿 ───

function saveDraft() {
  try {
    const draftData = {
      packVersion: draftVersion,
      currentStep: currentStep.value,
      formData: formData.value
    }
    localStorage.setItem(`vampire_cc_draft_${shellContext.pack_id}`, JSON.stringify(draftData))
  } catch (e) {
    console.warn('Failed to save draft:', e)
  }
}

watch(formData, () => {
  saveDraft()
}, { deep: true })

function loadDraft() {
  try {
    const saved = localStorage.getItem(`vampire_cc_draft_${shellContext.pack_id}`)
    if (!saved) return
    const draft = JSON.parse(saved)
    if (draft.packVersion !== draftVersion) {
      localStorage.removeItem(`vampire_cc_draft_${shellContext.pack_id}`)
      return
    }
    hasDraft.value = true
    draftStep.value = draft.currentStep
    // 按现有结构深度合并，跳过类型不匹配的字段
    for (const key of Object.keys(draft.formData)) {
      const current = formData.value[key]
      const loaded = draft.formData[key]
      if (current === undefined) continue
      // 类型一致才覆盖
      if (Array.isArray(current) && Array.isArray(loaded)) {
        formData.value[key] = loaded
      } else if (typeof current === typeof loaded && !Array.isArray(current)) {
        formData.value[key] = loaded
      }
      // 类型不匹配 → 保留默认值
    }
  } catch (e) {
    console.warn('Failed to load draft:', e)
  }
}

function resumeDraft() {
  currentStep.value = draftStep.value
  hasDraft.value = false
}

function clearDraft() {
  localStorage.removeItem(`vampire_cc_draft_${shellContext.pack_id}`)
  hasDraft.value = false
  currentStep.value = 0
  formData.value = {
    mortalName: '',
    appearance: [''],
    preVampireExperience: '',
    mortalCharacters: [
      { name: '', description: '' },
      { name: '', description: '' },
      { name: '', description: '' }
    ],
    skills: [
      { name: '', description: '' },
      { name: '', description: '' },
      { name: '', description: '' }
    ],
    resources: [
      { name: '', description: '' },
      { name: '', description: '' },
      { name: '', description: '' }
    ],
    experiences: ['', '', ''],
    immortalName: '',
    immortalDescription: '',
    mark: '',
    turningExperience: ''
  }
}

// ─── 种子数据（开发测试用） ───

function fillSeedData() {
  formData.value = {
    mortalName: '埃德蒙·格雷',
    appearance: [
      '苍白如大理石的皮肤，在月光下泛着微弱的冷光',
      '深陷的眼窝中是一双银灰色的眼睛，瞳孔在愤怒时会短暂泛红',
      '修长的手指末端是乌黑的指甲，永不磨损',
      '左颈侧有一道早已愈合的咬痕，皮肤下隐约可见暗紫色的血管纹路'
    ],
    preVampireExperience:
      '埃德蒙·格雷生于十五世纪的佛罗伦萨，是一位备受尊敬的医生和炼金术士。他在瘟疫横行的年头日夜奔走于病人的床榻之间，试图用草药和早期化学知识对抗黑死病。然而，当他最爱的妻子也染病倒下时，他发现自己毕生所学毫无用处。在绝望中，他开始翻找禁书，寻找传说中能战胜死亡的方法。',
    mortalCharacters: [
      { name: '伊莎贝拉·格雷', description: '埃德蒙的妻子，温柔而坚韧，死于瘟疫。她的死是埃德蒙走向黑暗的起点' },
      { name: '马可·韦斯普奇', description: '童年挚友，后来成为城邦议员。在埃德蒙"死去"后再未提起他的名字' },
      { name: '老安东尼奥', description: '教会埃德蒙医术的导师，一位沉默寡言但洞察一切的老人' }
    ],
    skills: [
      { name: '炼金术与草药知识', description: '掌握早期化学和药理学，能够调配治疗药剂和有毒的混合物' },
      { name: '古典拉丁语与希腊语', description: '流利阅读古代文献，能够解读失传的咒语和炼金术手稿' },
      { name: '长剑格斗', description: '在成为医生之前曾在佣兵团服役，精通文艺复兴时期的剑术' }
    ],
    resources: [
      { name: '一本记载禁术的古老手稿', description: '包含了从活人身上汲取生命力的禁忌仪式' },
      { name: '家族遗留的佛罗伦萨郊外庄园', description: '庇护所和藏身之处，地窖中藏有秘密实验室' },
      { name: '一名世代侍奉格雷家族的忠诚仆人', description: '马丁，知道主人的真实身份，从不对外透露' }
    ],
    experiences: [
      '1348年，佛罗伦萨爆发黑死病。埃德蒙日夜救治病人，目睹半座城市的人口在三个月内消失。他在日记中写道："上帝已抛弃了这座城。"',
      '1351年，在威尼斯港口的酒馆里，一位水手醉醺醺地讲述了一个关于"食人者"的传说——据说在东方的深山里住着不死的生物，以人血为生。埃德蒙记下了每一个细节。',
      '1352年深冬的午夜，一位自称来自瓦拉几亚的陌生人敲开了埃德蒙的门。他带来了一个提议：用灵魂换取超越死亡的力量。'
    ],
    immortalName: '弗拉德·德拉库尔',
    immortalDescription:
      '一位来自东欧的古老吸血鬼，外表约四十岁，举止优雅但眼神中藏着千年的倦怠。他将埃德蒙转化为吸血鬼，成为了埃德蒙的导师——也是一个永远无法摆脱的阴影。',
    mark: '永恒的饥饿——无论饮下多少鲜血，喉咙深处始终燃烧着无法被扑灭的干渴。这种饥饿永远不会杀死他，但永远不会让他安宁。',
    turningExperience:
      '1353年，一个暴风雨肆虐的夜晚，弗拉德·德拉库尔如约而至。在埃德蒙的地下实验室里，弗拉德割开自己的手腕，让埃德蒙饮下那冰冷而灼热的血液。随后他将埃德蒙勒死，任其在死亡的幻象中挣扎三日。当埃德蒙在第四天午夜从自己的棺材中爬出时，他已经不再属于活人的世界。'
  }

  // 清除草稿以便种子数据覆盖旧的 localStorage 缓存
  localStorage.removeItem(`vampire_cc_draft_${shellContext.pack_id}`)

  // 跳到最后一步（变为吸血鬼的经历）
  currentStep.value = totalSteps - 1
}

// ─── 提交 ───

function cleanFormData(): Record<string, unknown> {
  const data = { ...formData.value }
  // 过滤外观列表中的空字符串
  if (Array.isArray(data.appearance)) {
    data.appearance = data.appearance.filter((s: string) => s.trim())
  }
  return data
}

const submitError = ref<string | null>(null)
const isSubmitting = ref(false)

async function submitCreation() {
  if (isSubmitting.value) return
  isSubmitting.value = true
  submitError.value = null

  try {
    await httpClient.characterCreation({ formData: cleanFormData() })
    localStorage.removeItem(`vampire_cc_draft_${shellContext.pack_id}`)
    await syncCharacterStateAfterCreation()
    gameStore.setGamePhase('playing')
    router.push('/')
  } catch (err) {
    const message = err instanceof Error ? err.message : '角色创建失败'
    submitError.value = message
    console.error('Failed to submit character creation:', err)
  } finally {
    isSubmitting.value = false
  }
}

async function syncCharacterStateAfterCreation(maxRetries = 20, delayMs = 300) {
  for (let i = 0; i < maxRetries; i++) {
    await new Promise((resolve) => setTimeout(resolve, delayMs))
    try {
      const state = await httpClient.getCharacterState()
      characterStore.loadFromState(state as Record<string, unknown>)
      if (characterStore.mortalName) {
        return
      }
    } catch {
      // Plugin may not have processed the intent yet — continue polling
    }
  }
  try {
    const state = await httpClient.getCharacterState()
    characterStore.loadFromState(state as Record<string, unknown>)
  } catch {
    console.warn('Failed to sync character state after creation')
  }
}

onMounted(() => {
  loadDraft()
})
</script>

<style scoped>
.vampire-character-creation {
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
  padding: 24px;
  background-color: var(--vampire-bg-elevated);
  border: 1px solid var(--vampire-border-muted);
  border-radius: var(--vampire-radius-lg);
  box-shadow: var(--vampire-shadow-card);
}

/* ─── 进度条 ─── */
.vampire-character-creation__progress {
  height: 4px;
  background-color: var(--vampire-bg-deep);
  border-radius: 2px;
  margin-bottom: 24px;
  overflow: hidden;
}

.vampire-character-creation__progress-bar {
  height: 100%;
  background-color: var(--vampire-gold);
  transition: width var(--vampire-transition-normal);
}

/* ─── 步骤信息 ─── */
.vampire-character-creation__step-info {
  margin-bottom: 24px;
}

.vampire-character-creation__step-count {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--vampire-text-muted);
}

.vampire-character-creation__step-title {
  font-family: var(--vampire-font-heading);
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--vampire-gold);
  margin-top: 8px;
}

/* ─── 内容区 ─── */
.vampire-character-creation__content {
  margin-bottom: 32px;
}

.vampire-character-creation__prompt {
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--vampire-text-secondary);
  margin-bottom: 20px;
}

.vampire-character-creation__input-area {
  margin-bottom: 16px;
}

/* ─── 共享输入框样式 ─── */
.vampire-character-creation__input {
  width: 100%;
  padding: 10px 12px;
  font-family: var(--vampire-font-body);
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--vampire-text-primary);
  background-color: var(--vampire-bg-deep);
  border: 1px solid var(--vampire-border-muted);
  border-radius: var(--vampire-radius-md);
  transition: border-color var(--vampire-transition-fast);
}

.vampire-character-creation__input:focus {
  outline: none;
  border-color: var(--vampire-gold);
}

.vampire-character-creation__input::placeholder {
  color: var(--vampire-text-muted);
}

.vampire-character-creation__textarea {
  width: 100%;
  min-height: 120px;
  padding: 12px;
  font-family: var(--vampire-font-body);
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--vampire-text-primary);
  background-color: var(--vampire-bg-deep);
  border: 1px solid var(--vampire-border-muted);
  border-radius: var(--vampire-radius-md);
  resize: vertical;
  transition: border-color var(--vampire-transition-fast);
}

.vampire-character-creation__textarea:focus {
  outline: none;
  border-color: var(--vampire-gold);
}

.vampire-character-creation__textarea::placeholder {
  color: var(--vampire-text-muted);
}

/* ─── 字段标签 ─── */
.vampire-character-creation__field-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--vampire-text-muted);
  margin-bottom: 6px;
  margin-top: 16px;
}

.vampire-character-creation__field-label:first-child {
  margin-top: 0;
}

/* ─── 外观列表 ─── */
.vampire-character-creation__appearance-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 8px;
}

.vampire-character-creation__appearance-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.vampire-character-creation__appearance-row .vampire-character-creation__input {
  flex: 1;
}

.vampire-character-creation__remove-btn {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  background: none;
  border: 1px solid var(--vampire-border-subtle);
  border-radius: var(--vampire-radius-sm);
  color: var(--vampire-text-muted);
  cursor: pointer;
  font-size: 0.75rem;
  transition: all var(--vampire-transition-fast);
}

.vampire-character-creation__remove-btn:hover {
  color: var(--vampire-blood);
  border-color: var(--vampire-blood-dim);
  background-color: var(--vampire-blood-glow);
}

.vampire-character-creation__add-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  font-family: var(--vampire-font-body);
  font-size: 0.8125rem;
  color: var(--vampire-text-secondary);
  background: none;
  border: 1px dashed var(--vampire-border-muted);
  border-radius: var(--vampire-radius-md);
  cursor: pointer;
  transition: all var(--vampire-transition-fast);
}

.vampire-character-creation__add-btn:hover {
  color: var(--vampire-gold);
  border-color: var(--vampire-gold-dim);
}

/* ─── 三组配对 / 编号行 ─── */
.vampire-character-creation__pair-group {
  margin-bottom: 20px;
  padding: 12px;
  background-color: var(--vampire-bg-base);
  border: 1px solid var(--vampire-border-subtle);
  border-radius: var(--vampire-radius-md);
}

.vampire-character-creation__pair-group:last-child {
  margin-bottom: 0;
}

.vampire-character-creation__pair-group .vampire-character-creation__field-label {
  margin-top: 0;
}

.vampire-character-creation__pair-group .vampire-character-creation__input + .vampire-character-creation__input {
  margin-top: 8px;
}

.vampire-character-creation__numbered-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.vampire-character-creation__numbered-row:last-child {
  margin-bottom: 0;
}

.vampire-character-creation__numbered-row .vampire-character-creation__field-label {
  margin: 0;
  flex-shrink: 0;
  width: 20px;
  text-align: center;
}

.vampire-character-creation__numbered-row .vampire-character-creation__input {
  flex: 1;
}

.vampire-character-creation__numbered-block {
  margin-bottom: 16px;
}

.vampire-character-creation__numbered-block:last-child {
  margin-bottom: 0;
}

.vampire-character-creation__numbered-block .vampire-character-creation__field-label {
  margin-top: 0;
}

.vampire-character-creation__numbered-block .vampire-character-creation__textarea {
  min-height: 80px;
}

/* ─── 示例 ─── */
.vampire-character-creation__example {
  padding: 12px;
  background-color: var(--vampire-parchment-dim);
  border-radius: var(--vampire-radius-md);
  border-left: 3px solid var(--vampire-gold-dim);
}

.vampire-character-creation__example-title {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--vampire-text-muted);
  margin-bottom: 8px;
}

.vampire-character-creation__example-text {
  font-size: 0.8125rem;
  line-height: 1.6;
  color: var(--vampire-text-secondary);
  font-style: italic;
  white-space: pre-line;
}

/* ─── 操作按钮：主操作（导航） ─── */
.vampire-character-creation__actions {
  display: flex;
  gap: 10px;
}

.vampire-character-creation__actions .vampire-character-creation__btn--back {
  flex: 0 0 auto;
}

.vampire-character-creation__actions .vampire-character-creation__btn--next {
  flex: 1;
}

/* ─── 操作按钮：辅助操作（种子/跳过） ─── */
.vampire-character-creation__secondary-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.vampire-character-creation__secondary-actions .vampire-character-creation__btn--seed,
.vampire-character-creation__secondary-actions .vampire-character-creation__btn--skip {
  flex: 1;
}

/* ─── 按钮基础 ─── */
.vampire-character-creation__btn {
  padding: 10px 20px;
  font-family: var(--vampire-font-body);
  font-size: 0.8125rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  border: none;
  border-radius: var(--vampire-radius-sm);
  cursor: pointer;
  transition: all var(--vampire-transition-fast);
  white-space: nowrap;
}

.vampire-character-creation__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.vampire-character-creation__btn--back {
  background-color: var(--vampire-bg-deep);
  color: var(--vampire-text-secondary);
  border: 1px solid var(--vampire-border-muted);
}

.vampire-character-creation__btn--back:hover:not(:disabled) {
  background-color: var(--vampire-bg-elevated);
}

.vampire-character-creation__btn--skip {
  background: none;
  color: var(--vampire-text-muted);
  border: 1px solid var(--vampire-border-subtle);
}

.vampire-character-creation__btn--skip:hover {
  color: var(--vampire-text-secondary);
  border-color: var(--vampire-border-muted);
}

.vampire-character-creation__btn--next {
  background-color: var(--vampire-blood);
  color: var(--vampire-parchment);
}

.vampire-character-creation__btn--next:hover:not(:disabled) {
  background-color: #a00000;
}

.vampire-character-creation__btn--seed {
  background: none;
  color: var(--vampire-text-muted);
  border: 1px dashed var(--vampire-border-muted);
  font-size: 0.75rem;
  padding: 10px 12px;
  letter-spacing: 0.04em;
}

.vampire-character-creation__btn--seed:hover {
  color: var(--vampire-gold);
  border-color: var(--vampire-gold-dim);
}

/* ─── 提交错误 ─── */
.vampire-character-creation__error {
  margin-top: 16px;
  padding: 12px 16px;
  background-color: var(--vampire-blood-glow);
  border: 1px solid var(--vampire-blood);
  border-radius: var(--vampire-radius-md);
  color: var(--vampire-blood);
  font-size: 0.8125rem;
  text-align: center;
}

/* ─── 草稿 ─── */
.vampire-character-creation__draft-notice {
  margin-top: 24px;
  padding: 16px;
  background-color: var(--vampire-ink-dim);
  border-radius: var(--vampire-radius-md);
  text-align: center;
}

.vampire-character-creation__draft-notice p {
  font-size: 0.875rem;
  color: var(--vampire-text-secondary);
  margin-bottom: 12px;
}

.vampire-character-creation__draft-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
}

.vampire-character-creation__draft-actions button {
  padding: 8px 16px;
  font-size: 0.8125rem;
  border-radius: var(--vampire-radius-sm);
  cursor: pointer;
  transition: all var(--vampire-transition-fast);
}

.vampire-character-creation__draft-actions button:first-child {
  background-color: var(--vampire-gold);
  color: var(--vampire-bg-deep);
  border: none;
}

.vampire-character-creation__draft-actions button:last-child {
  background: none;
  color: var(--vampire-text-muted);
  border: 1px solid var(--vampire-border-muted);
}

/* ─── 响应式：平板 ─── */
@media (max-width: 1023px) {
  .vampire-character-creation {
    padding: 20px;
  }

  .vampire-character-creation__btn {
    padding: 10px 16px;
    font-size: 0.75rem;
  }
}

/* ─── 响应式：手机 ─── */
@media (max-width: 767px) {
  .vampire-character-creation {
    padding: 16px;
    border-radius: 0;
    border: none;
    box-shadow: none;
    background-color: transparent;
  }

  .vampire-character-creation__btn {
    padding: 10px 14px;
    font-size: 0.6875rem;
    letter-spacing: 0.04em;
  }
}
</style>
