<script setup lang="ts">
import { reactive, watch } from 'vue'
import type { TaskParam } from '@/types/checkin'

const props = defineProps<{
  params: TaskParam[]
  modelValue?: Record<string, unknown>
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: Record<string, unknown>): void
}>()

const localParams = reactive<Record<string, unknown>>({})

// 初始化默认值
function initDefaults() {
  props.params.forEach(param => {
    localParams[param.key] = props.modelValue?.[param.key] ?? param.default
  })
}

initDefaults()

// 监听外部变化
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    Object.assign(localParams, newValue)
  }
}, { deep: true })

// 监听 params 变化重新初始化
watch(() => props.params, () => {
  initDefaults()
}, { deep: true })

function updateParam(key: string, value: unknown) {
  localParams[key] = value
  emit('update:modelValue', { ...localParams })
}
</script>

<template>
  <div class="task-param-form space-y-4">
    <div
      v-for="param in params"
      :key="param.key"
      class="param-item"
    >
      <label class="block text-sm font-medium text-vscode-text-secondary mb-1">
        {{ param.name }}
      </label>
      
      <!-- 数字输入 -->
      <input
        v-if="param.type === 'number'"
        type="number"
        :value="localParams[param.key]"
        :min="param.min"
        :max="param.max"
        :placeholder="param.placeholder"
        class="w-full px-3 py-2 rounded-lg bg-vscode-bg border border-vscode-border text-vscode-text focus:outline-none focus:border-vscode-active"
        @input="updateParam(param.key, Number(($event.target as HTMLInputElement).value))"
      />
      
      <!-- 文本输入 -->
      <input
        v-else-if="param.type === 'string'"
        type="text"
        :value="localParams[param.key]"
        :placeholder="param.placeholder"
        class="w-full px-3 py-2 rounded-lg bg-vscode-bg border border-vscode-border text-vscode-text focus:outline-none focus:border-vscode-active"
        @input="updateParam(param.key, ($event.target as HTMLInputElement).value)"
      />
      
      <!-- 下拉选择 -->
      <select
        v-else-if="param.type === 'select'"
        :value="localParams[param.key]"
        class="w-full px-3 py-2 rounded-lg bg-vscode-bg border border-vscode-border text-vscode-text focus:outline-none focus:border-vscode-active"
        @change="updateParam(param.key, ($event.target as HTMLSelectElement).value)"
      >
        <option
          v-for="option in param.options"
          :key="String(option.value)"
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </select>
      
      <!-- 布尔开关 -->
      <label
        v-else-if="param.type === 'boolean'"
        class="flex items-center space-x-3 cursor-pointer"
      >
        <input
          type="checkbox"
          :checked="localParams[param.key] === true"
          class="w-4 h-4 rounded text-vscode-active"
          @change="updateParam(param.key, ($event.target as HTMLInputElement).checked)"
        />
        <span class="text-sm text-vscode-text">启用</span>
      </label>
    </div>
    
    <div v-if="params.length === 0" class="text-sm text-vscode-text-secondary text-center py-4">
      该任务没有可配置的参数
    </div>
  </div>
</template>
