import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface Skill {
  id: string
  name: string
  tested: boolean
  linkedMemoryId?: string
}

export interface Resource {
  id: string
  name: string
  description: string
  lost: boolean
  kind: 'generic' | 'diary'
}

export interface Mark {
  id: string
  name: string
  description: string
}

export interface Memory {
  id: string
  name: string
  experiences: Experience[]
  archivedToDiary: boolean
}

export interface Experience {
  id: string
  content: string
  createdAt: string
}

export interface Character {
  id: string
  name: string
  description: string
  type: 'mortal' | 'immortal'
  alive: boolean
}

export interface DiaryState {
  id: string
  holder: string
  memoryIds: string[]
  maxCapacity: number
  lost: boolean
  entryCount: number
}

export const useCharacterStore = defineStore('character', () => {
  // ─── 身份信息 ───
  const mortalName = ref<string | null>(null)
  const bornEra = ref<string | null>(null)
  const turnedEra = ref<string | null>(null)
  const currentAlias = ref<string | null>(null)

  // ─── 五种资源 ───
  const skills = ref<Skill[]>([])
  const resources = ref<Resource[]>([])
  const marks = ref<Mark[]>([])
  const memories = ref<Memory[]>([])
  const characters = ref<Character[]>([])

  // ─── 日记状态 ───
  const diaryState = ref<DiaryState>({
    id: 'artifact_diary',
    holder: 'actor_vampire',
    memoryIds: [],
    maxCapacity: 4,
    lost: false,
    entryCount: 0
  })

  // ─── 计算属性 ───
  const activeMemories = computed(() => 
    memories.value.filter((m: Memory) => !m.archivedToDiary)
  )
  
  const archivedMemories = computed(() => 
    memories.value.filter((m: Memory) => m.archivedToDiary)
  )

  const mortalCharacters = computed(() => 
    characters.value.filter((c: Character) => c.type === 'mortal')
  )

  const immortalCharacters = computed(() => 
    characters.value.filter((c: Character) => c.type === 'immortal')
  )

  const availableResources = computed(() => 
    resources.value.filter((r: Resource) => !r.lost)
  )

  const testedSkills = computed(() => 
    skills.value.filter((s: Skill) => s.tested)
  )

  const untestedSkills = computed(() => 
    skills.value.filter((s: Skill) => !s.tested)
  )

  const isDiaryFull = computed(() => 
    diaryState.value.memoryIds.length >= diaryState.value.maxCapacity
  )

  const hasDiary = computed(() => 
    resources.value.some((r: Resource) => r.kind === 'diary' && !r.lost)
  )

  const isMemoryFull = computed(() => 
    activeMemories.value.length >= 5
  )

  const isBothDepleted = computed(() => 
    skills.value.length === 0 && availableResources.value.length === 0
  )

  // ─── 操作 ───
  function addSkill(skill: Skill) {
    skills.value.push(skill)
  }

  function testSkill(skillId: string) {
    const skill = skills.value.find((s: Skill) => s.id === skillId)
    if (skill) skill.tested = true
  }

  function removeSkill(skillId: string) {
    skills.value = skills.value.filter(s => s.id !== skillId)
  }

  function addResource(resource: Resource) {
    resources.value.push(resource)
  }

  /**
   * 创建日记：将日记注册为特殊资源（kind: 'diary'），
   * 同时在 diaryState 中记录，使其进入可用状态。
   */
  function createDiary() {
    const diaryResource: Resource = {
      id: 'artifact_diary',
      name: '吸血鬼日记',
      description: '一本陈旧的日记，能够封存回忆。但它本身也可能失落于岁月之中。',
      lost: false,
      kind: 'diary',
    }
    addResource(diaryResource)
  }

  function loseResource(resourceId: string) {
    const resource = resources.value.find(r => r.id === resourceId)
    if (resource) resource.lost = true
  }

  function addMark(mark: Mark) {
    marks.value.push(mark)
  }

  function removeMark(markId: string) {
    marks.value = marks.value.filter(m => m.id !== markId)
  }

  function addMemory(memory: Memory) {
    memories.value.push(memory)
  }

  function addExperience(memoryId: string, experience: Experience) {
    const memory = memories.value.find(m => m.id === memoryId)
    if (memory) {
      memory.experiences.push(experience)
    }
  }

  function renameMemory(memoryId: string, newName: string) {
    const memory = memories.value.find(m => m.id === memoryId)
    if (memory) {
      memory.name = newName
    }
  }

  function archiveMemory(memoryId: string) {
    const memory = memories.value.find(m => m.id === memoryId)
    if (memory) {
      memory.archivedToDiary = true
      diaryState.value.memoryIds.push(memoryId)
      diaryState.value.entryCount++
    }
  }

  function removeMemory(memoryId: string) {
    memories.value = memories.value.filter(m => m.id !== memoryId)
    // 同时从日记中移除
    diaryState.value.memoryIds = diaryState.value.memoryIds.filter(id => id !== memoryId)
  }

  function addCharacter(character: Character) {
    characters.value.push(character)
  }

  function updateCharacter(characterId: string, patch: Partial<Pick<Character, 'name' | 'description'>>) {
    const character = characters.value.find(c => c.id === characterId)
    if (character) {
      if (patch.name !== undefined) character.name = patch.name
      if (patch.description !== undefined) character.description = patch.description
    }
  }

  function killCharacter(characterId: string) {
    const character = characters.value.find(c => c.id === characterId)
    if (character) character.alive = false
  }

  function loadFromState(raw: Record<string, unknown>) {
    // Unwrap nested data envelopes (httpClient.getCharacterState may return
    // { capability_key, data: { success, data: { ... } } } or { data: { ... } }).
    let state: Record<string, unknown> = raw
    if (state.data && typeof state.data === 'object' && !Array.isArray(state.data)) {
      const inner = state.data as Record<string, unknown>
      if (inner.data && typeof inner.data === 'object' && !Array.isArray(inner.data)) {
        state = inner.data as Record<string, unknown>
      } else {
        state = inner
      }
    }

    if (state.mortal_name !== undefined) {
      mortalName.value = state.mortal_name as string | null
    }
    if (state.born_era !== undefined) {
      bornEra.value = state.born_era as string | null
    }
    if (state.turned_era !== undefined) {
      turnedEra.value = state.turned_era as string | null
    }
    if (state.current_alias !== undefined) {
      currentAlias.value = state.current_alias as string | null
    }

    if (Array.isArray(state.skills)) {
      skills.value = state.skills as Skill[]
    }
    if (Array.isArray(state.resources)) {
      resources.value = state.resources as Resource[]
    }
    if (Array.isArray(state.marks)) {
      marks.value = state.marks as Mark[]
    }
    if (Array.isArray(state.memories)) {
      memories.value = (state.memories as Array<Record<string, unknown>>).map((m) => ({
        id: m.id as string,
        name: m.name as string,
        experiences: (Array.isArray(m.experiences)
          ? (m.experiences as Array<Record<string, unknown>>).map((e) => ({
              id: e.id as string,
              content: e.content as string,
              createdAt: e.createdAt as string
            }))
          : []),
        archivedToDiary: (m.archived_to_diary as boolean) ?? false
      }))
    }
    if (Array.isArray(state.characters)) {
      // 仅加载 state.character_ids 中的角色，过滤残留数据
      const characterIds: string[] = Array.isArray(state.character_ids) ? state.character_ids as string[] : []
      const filtered = characterIds.length > 0
        ? (state.characters as Array<Record<string, unknown>>).filter((c) => characterIds.includes(c.id as string))
        : (state.characters as Array<Record<string, unknown>>)
      characters.value = filtered.map((c) => ({
        id: c.id as string,
        name: c.name as string,
        description: (c.description as string) ?? '',
        type: (c.type as 'mortal' | 'immortal') ?? 'mortal',
        alive: (c.alive as boolean) ?? true
      }))
    }

    const diary = state.diary as Record<string, unknown> | undefined
    if (diary) {
      diaryState.value = {
        id: (diary.id as string) ?? diaryState.value.id,
        holder: (diary.holder as string) ?? diaryState.value.holder,
        memoryIds: Array.isArray(diary.memory_ids) ? (diary.memory_ids as string[]) : [],
        maxCapacity: (diary.max_capacity as number) ?? diaryState.value.maxCapacity,
        lost: (diary.lost as boolean) ?? false,
        entryCount: (diary.entry_count as number) ?? 0
      }
    }
  }

  function resetCharacter() {
    mortalName.value = null
    bornEra.value = null
    turnedEra.value = null
    currentAlias.value = null
    skills.value = []
    resources.value = []
    marks.value = []
    memories.value = []
    characters.value = []
    diaryState.value = {
      id: 'artifact_diary',
      holder: 'actor_vampire',
      memoryIds: [],
      maxCapacity: 4,
      lost: false,
      entryCount: 0
    }
  }

  return {
    // 身份
    mortalName,
    bornEra,
    turnedEra,
    currentAlias,
    // 五种资源
    skills,
    resources,
    marks,
    memories,
    characters,
    // 日记
    diaryState,
    // 计算属性
    activeMemories,
    archivedMemories,
    mortalCharacters,
    immortalCharacters,
    availableResources,
    testedSkills,
    untestedSkills,
    isDiaryFull,
    hasDiary,
    isMemoryFull,
    isBothDepleted,
    // 操作
    addSkill,
    testSkill,
    removeSkill,
    addResource,
    createDiary,
    loseResource,
    addMark,
    removeMark,
    addMemory,
    addExperience,
    renameMemory,
    archiveMemory,
    removeMemory,
    addCharacter,
    updateCharacter,
    killCharacter,
    loadFromState,
    resetCharacter
  }
})
