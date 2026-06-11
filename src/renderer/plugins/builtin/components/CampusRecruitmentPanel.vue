<script setup lang="ts">
import { computed } from 'vue'
import {
  Building2,
  Briefcase,
  CalendarClock,
  BellRing,
  BadgeCheck,
  MapPin,
  ArrowUpRight,
  Sparkles
} from 'lucide-vue-next'

type CampusSection = 'all' | 'overview' | 'companies' | 'jobs' | 'timeline' | 'tracking'

const props = withDefaults(defineProps<{
  activeSection?: CampusSection
}>(), {
  activeSection: 'all'
})

const activeSection = computed(() => props.activeSection || 'all')

const showSection = (section: Exclude<CampusSection, 'all'>) => {
  return activeSection.value === 'all' || activeSection.value === section
}

const stats = [
  { label: '本周新增企业', value: '12', tone: 'text-sky-300' },
  { label: '正在进行批次', value: '37', tone: 'text-emerald-300' },
  { label: '7天内将截止', value: '9', tone: 'text-amber-300' },
  { label: '已关注岗位', value: '18', tone: 'text-fuchsia-300' }
]

const featuredCompanies = [
  {
    name: '字节跳动',
    track: '技术 / 产品 / 设计',
    deadline: '08-25',
    highlight: '提前批进行中，后端与算法岗需求高'
  },
  {
    name: '阿里巴巴',
    track: '研发 / 运营 / 数据',
    deadline: '08-28',
    highlight: '国际电商与云计算方向岗位同步开放'
  },
  {
    name: '腾讯',
    track: '开发 / 测试 / 游戏策划',
    deadline: '08-31',
    highlight: '校招主批开启，广深岗位占比高'
  }
]

const hotJobs = [
  {
    title: '后端开发工程师',
    company: '美团',
    city: '北京',
    batch: '2027 届秋招',
    tags: ['Java', '分布式', '提前批'],
    deadline: '08-20'
  },
  {
    title: '数据分析师',
    company: '小红书',
    city: '上海',
    batch: '2027 届秋招',
    tags: ['SQL', 'Python', '商业分析'],
    deadline: '08-22'
  },
  {
    title: '客户端开发工程师',
    company: '快手',
    city: '北京',
    batch: '2027 届秋招',
    tags: ['iOS', 'Android', '基础架构'],
    deadline: '08-26'
  }
]

const timelineItems = [
  { date: '08-18', title: '网易雷火笔试', note: '晚上 19:00，算法 + 系统设计混合卷' },
  { date: '08-20', title: '美团后端网申截止', note: '关注基础架构与到家事业群' },
  { date: '08-23', title: '腾讯产品群面周', note: '已投同学建议提前准备案例表达' },
  { date: '08-25', title: '字节研发一面集中开始', note: '预计投递后 3-5 天进入面试' }
]

const trackingItems = [
  { company: '腾讯', role: '后台开发', status: '笔试完成', note: '等一面通知，预计本周出结果' },
  { company: '阿里云', role: 'Java 开发', status: '已投递', note: '简历刚完成筛选，注意查短信' },
  { company: '小米', role: '数据研发', status: '准备投递', note: '还差项目描述优化和内推码' }
]

const tips = [
  '把“网申截止前 3 天”单独标成高优先级，比只看发布时间更有用。',
  '企业详情页建议长期保留“投递要求、流程节点、内推入口、笔面经链接”四类固定信息。',
  '我的关注最好允许自己打状态，不然专区会沦为只读公告栏。'
]
</script>

<template>
  <div class="h-full overflow-auto p-4 text-sm text-vscode-text">
    <div class="mx-auto max-w-6xl space-y-4">
      <section class="rounded-2xl border border-vscode-border bg-vscode-active/50 p-5">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="space-y-2">
            <div class="inline-flex items-center gap-2 rounded-full border border-vscode-border px-3 py-1 text-xs text-vscode-text-secondary">
              <Sparkles class="h-3.5 w-3.5" />
              企业校招工作台
            </div>
            <h2 class="text-xl font-semibold text-vscode-text">校招专区</h2>
            <p class="max-w-2xl text-vscode-text-secondary">
              把企业、岗位、截止时间、流程节点和自己的投递进度放到同一块区域里，避免信息散落在帖子和聊天里。
            </p>
          </div>
          <div class="rounded-2xl border border-vscode-border bg-vscode-bg px-4 py-3 text-xs text-vscode-text-secondary">
            <p class="font-medium text-vscode-text">当前骨架版已包含</p>
            <p class="mt-2">总览、企业列表、岗位列表、时间线、我的关注</p>
          </div>
        </div>
      </section>

      <section v-if="showSection('overview')" class="space-y-4">
        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div
            v-for="item in stats"
            :key="item.label"
            class="rounded-2xl border border-vscode-border bg-vscode-panel p-4"
          >
            <p class="text-xs uppercase tracking-wide text-vscode-text-secondary">{{ item.label }}</p>
            <p class="mt-2 text-2xl font-semibold" :class="item.tone">{{ item.value }}</p>
          </div>
        </div>

        <div class="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
          <div class="rounded-2xl border border-vscode-border bg-vscode-panel p-4">
            <div class="mb-3 flex items-center gap-2">
              <Building2 class="h-4 w-4 text-vscode-icon" />
              <h3 class="font-medium text-vscode-text">本周重点企业</h3>
            </div>
            <div class="space-y-3">
              <div
                v-for="company in featuredCompanies"
                :key="company.name"
                class="rounded-xl border border-vscode-border bg-vscode-active/40 p-3"
              >
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p class="font-medium text-vscode-text">{{ company.name }}</p>
                    <p class="text-xs text-vscode-text-secondary">{{ company.track }}</p>
                  </div>
                  <span class="rounded-full bg-amber-500/15 px-2 py-1 text-xs text-amber-300">
                    截止 {{ company.deadline }}
                  </span>
                </div>
                <p class="mt-2 text-sm text-vscode-text-secondary">{{ company.highlight }}</p>
              </div>
            </div>
          </div>

          <div class="rounded-2xl border border-vscode-border bg-vscode-panel p-4">
            <div class="mb-3 flex items-center gap-2">
              <BellRing class="h-4 w-4 text-vscode-icon" />
              <h3 class="font-medium text-vscode-text">设计建议</h3>
            </div>
            <div class="space-y-3">
              <div
                v-for="tip in tips"
                :key="tip"
                class="rounded-xl border border-vscode-border bg-vscode-active/30 p-3 text-sm text-vscode-text-secondary"
              >
                {{ tip }}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section v-if="showSection('companies')" class="rounded-2xl border border-vscode-border bg-vscode-panel p-4">
        <div class="mb-4 flex items-center gap-2">
          <Building2 class="h-4 w-4 text-vscode-icon" />
          <h3 class="font-medium text-vscode-text">企业列表</h3>
        </div>
        <div class="grid gap-3 lg:grid-cols-2">
          <div
            v-for="company in featuredCompanies"
            :key="`${company.name}-card`"
            class="rounded-xl border border-vscode-border bg-vscode-active/35 p-4"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-base font-medium text-vscode-text">{{ company.name }}</p>
                <p class="mt-1 text-sm text-vscode-text-secondary">{{ company.track }}</p>
              </div>
              <button class="inline-flex items-center gap-1 rounded-lg border border-vscode-border px-2 py-1 text-xs text-vscode-text-secondary">
                查看详情
                <ArrowUpRight class="h-3.5 w-3.5" />
              </button>
            </div>
            <p class="mt-3 text-sm text-vscode-text-secondary">{{ company.highlight }}</p>
          </div>
        </div>
      </section>

      <section v-if="showSection('jobs')" class="rounded-2xl border border-vscode-border bg-vscode-panel p-4">
        <div class="mb-4 flex items-center gap-2">
          <Briefcase class="h-4 w-4 text-vscode-icon" />
          <h3 class="font-medium text-vscode-text">岗位列表</h3>
        </div>
        <div class="space-y-3">
          <div
            v-for="job in hotJobs"
            :key="`${job.company}-${job.title}`"
            class="rounded-xl border border-vscode-border bg-vscode-active/35 p-4"
          >
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p class="text-base font-medium text-vscode-text">{{ job.title }}</p>
                <p class="mt-1 text-sm text-vscode-text-secondary">{{ job.company }} · {{ job.batch }}</p>
              </div>
              <span class="rounded-full bg-rose-500/15 px-2 py-1 text-xs text-rose-300">
                截止 {{ job.deadline }}
              </span>
            </div>
            <div class="mt-3 flex flex-wrap items-center gap-2 text-xs text-vscode-text-secondary">
              <span class="inline-flex items-center gap-1 rounded-full border border-vscode-border px-2 py-1">
                <MapPin class="h-3.5 w-3.5" />
                {{ job.city }}
              </span>
              <span
                v-for="tag in job.tags"
                :key="tag"
                class="rounded-full bg-vscode-bg px-2 py-1"
              >
                {{ tag }}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section v-if="showSection('timeline')" class="rounded-2xl border border-vscode-border bg-vscode-panel p-4">
        <div class="mb-4 flex items-center gap-2">
          <CalendarClock class="h-4 w-4 text-vscode-icon" />
          <h3 class="font-medium text-vscode-text">流程时间线</h3>
        </div>
        <div class="space-y-3">
          <div
            v-for="item in timelineItems"
            :key="`${item.date}-${item.title}`"
            class="grid gap-2 rounded-xl border border-vscode-border bg-vscode-active/35 p-4 md:grid-cols-[88px_minmax(0,1fr)]"
          >
            <div class="text-sm font-medium text-sky-300">{{ item.date }}</div>
            <div>
              <p class="font-medium text-vscode-text">{{ item.title }}</p>
              <p class="mt-1 text-sm text-vscode-text-secondary">{{ item.note }}</p>
            </div>
          </div>
        </div>
      </section>

      <section v-if="showSection('tracking')" class="rounded-2xl border border-vscode-border bg-vscode-panel p-4">
        <div class="mb-4 flex items-center gap-2">
          <BadgeCheck class="h-4 w-4 text-vscode-icon" />
          <h3 class="font-medium text-vscode-text">我的关注</h3>
        </div>
        <div class="space-y-3">
          <div
            v-for="item in trackingItems"
            :key="`${item.company}-${item.role}`"
            class="rounded-xl border border-vscode-border bg-vscode-active/35 p-4"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p class="font-medium text-vscode-text">{{ item.company }} · {{ item.role }}</p>
                <p class="mt-1 text-sm text-vscode-text-secondary">{{ item.note }}</p>
              </div>
              <span class="rounded-full bg-emerald-500/15 px-2 py-1 text-xs text-emerald-300">
                {{ item.status }}
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
