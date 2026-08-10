<template>
  <div
    ref="scrollContainer"
    class="readonly-reader"
    :dir="textDirection"
    @click="handleClick"
    @dragover.prevent
    @drop.prevent
  >
    <div
      v-if="showSearch"
      class="readonly-search"
      @click.stop
    >
      <input
        ref="searchInput"
        v-model="query"
        type="search"
        :placeholder="t('search.searchPlaceholder')"
        @keydown.enter.prevent="find($event.shiftKey ? -1 : 1)"
        @keydown.esc.prevent="closeSearch"
      >
      <span>{{ activeMatch < 0 ? 0 : activeMatch + 1 }} / {{ matches.length }}</span>
      <button
        type="button"
        :title="t('menu.edit.findPrevious')"
        @click="find(-1)"
      >
        ↑
      </button>
      <button
        type="button"
        :title="t('menu.edit.findNext')"
        @click="find(1)"
      >
        ↓
      </button>
      <button
        type="button"
        aria-label="Close"
        @click="closeSearch"
      >
        ×
      </button>
    </div>
    <div
      ref="content"
      class="readonly-content"
      :style="contentStyle"
      v-html="html"
    />
  </div>
</template>

<script setup lang="ts">
import githubMarkdownDarkCss from 'github-markdown-css/github-markdown-dark.css?inline'
import githubMarkdownLightCss from 'github-markdown-css/github-markdown-light.css?inline'
import katexCss from 'katex/dist/katex.css?inline'
import prismCss from 'prismjs/themes/prism.css?inline'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { isDarkThemeId } from 'common/theme'
import bus from '@/bus'
import { DEFAULT_EDITOR_FONT_FAMILY } from '@/config'
import { useEditorStore } from '@/store/editor'
import { usePreferencesStore } from '@/store/preferences'
import markdownToHtml from '@/util/markdownToHtml'
import { resolveLocalImageSrc } from '@/util/resolveImageSrc'

const props = defineProps<{
  markdown: string
  textDirection: string
}>()

const { t } = useI18n()
const editorStore = useEditorStore()
const preferencesStore = usePreferencesStore()
const {
  editorFontFamily,
  fontSize,
  lineHeight,
  superSubScript,
  footnote,
  isHtmlEnabled,
  isGitlabCompatibilityEnabled,
  sequenceTheme,
  plantumlServer,
  theme
} = storeToRefs(preferencesStore)
const scrollContainer = ref<HTMLElement | null>(null)
const content = ref<HTMLElement | null>(null)
const searchInput = ref<HTMLInputElement | null>(null)
const html = ref('')
const showSearch = ref(false)
const query = ref('')
const matches = ref<HTMLElement[]>([])
const activeMatch = ref(-1)
let renderVersion = 0
let scrollHandler: (() => void) | null = null
let readerStyleElement: HTMLStyleElement | null = null
let scrollRestoreObserver: ResizeObserver | null = null
let scrollRestoreTimer: number | null = null
let scrollRestoreFrame: number | null = null

const isDarkTheme = computed(() => isDarkThemeId(theme.value))
const contentStyle = computed(() => ({
  '--readonly-font-family': editorFontFamily.value
    ? `${editorFontFamily.value}, ${DEFAULT_EDITOR_FONT_FAMILY}`
    : DEFAULT_EDITOR_FONT_FAMILY,
  '--readonly-font-size': `${fontSize.value}px`,
  '--readonly-line-height': String(lineHeight.value)
}))
const renderOptions = computed(() => ({
  superSubScript: superSubScript.value,
  footnote: footnote.value,
  disableHtml: !isHtmlEnabled.value,
  isGitlabCompatibilityEnabled: isGitlabCompatibilityEnabled.value,
  sequenceTheme: sequenceTheme.value === 'simple' ? ('simple' as const) : ('hand' as const),
  plantumlServer: plantumlServer.value,
  mermaidTheme: isDarkTheme.value ? 'dark' : 'default',
  vegaTheme: isDarkTheme.value ? 'dark' : 'latimes'
}))

const updateReaderStyles = () => {
  if (!readerStyleElement) return
  readerStyleElement.textContent = [
    isDarkTheme.value ? githubMarkdownDarkCss : githubMarkdownLightCss,
    katexCss,
    prismCss
  ].join('\n')
}

const persistScrollPosition = () => {
  const tab = editorStore.currentFile
  const container = scrollContainer.value
  if (tab?.id && container) {
    editorStore.updateScrollPosition(tab.id, container.scrollTop)
  }
}

const cancelScrollRestore = () => {
  scrollRestoreObserver?.disconnect()
  scrollRestoreObserver = null
  if (scrollRestoreTimer !== null) window.clearTimeout(scrollRestoreTimer)
  scrollRestoreTimer = null
  if (scrollRestoreFrame !== null) cancelAnimationFrame(scrollRestoreFrame)
  scrollRestoreFrame = null
}

const restoreScrollPosition = () => {
  const scrollTop = editorStore.currentFile?.scrollTop
  const article = content.value
  if (typeof scrollTop !== 'number' || !article) return

  cancelScrollRestore()
  const apply = () => {
    scrollRestoreFrame = null
    const container = scrollContainer.value
    if (!container) return
    container.scrollTop = scrollTop
    if (Math.abs(container.scrollTop - scrollTop) < 1) cancelScrollRestore()
  }
  const schedule = () => {
    if (scrollRestoreFrame === null) scrollRestoreFrame = requestAnimationFrame(apply)
  }

  // Images and async diagrams can increase the document height after the first
  // frame. Retry whenever the rendered content resizes so an early clamp does
  // not silently move the reader upward.
  scrollRestoreObserver = new ResizeObserver(schedule)
  scrollRestoreObserver.observe(article)
  scrollRestoreTimer = window.setTimeout(cancelScrollRestore, 5000)
  schedule()
}

const clearHighlights = () => {
  if (!content.value) return
  for (const mark of content.value.querySelectorAll('mark[data-readonly-search]')) {
    mark.replaceWith(document.createTextNode(mark.textContent ?? ''))
  }
  content.value.normalize()
  matches.value = []
  activeMatch.value = -1
}

const highlightMatches = () => {
  clearHighlights()
  const root = content.value
  const needle = query.value
  if (!root || !needle) return

  const textNodes: Text[] = []
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode (node) {
      const parent = node.parentElement
      if (!node.textContent || !parent || parent.closest('script, style, textarea, svg')) {
        return NodeFilter.FILTER_REJECT
      }
      return NodeFilter.FILTER_ACCEPT
    }
  })
  while (walker.nextNode()) textNodes.push(walker.currentNode as Text)

  const lowerNeedle = needle.toLocaleLowerCase()
  for (const textNode of textNodes) {
    const text = textNode.data
    const lowerText = text.toLocaleLowerCase()
    const offsets: number[] = []
    let start = 0
    while (start <= lowerText.length - lowerNeedle.length) {
      const index = lowerText.indexOf(lowerNeedle, start)
      if (index < 0) break
      offsets.push(index)
      start = index + Math.max(lowerNeedle.length, 1)
    }

    let current: Text = textNode
    for (const offset of offsets) {
      const localOffset = offset - (text.length - current.data.length)
      const after = current.splitText(localOffset)
      const tail = after.splitText(needle.length)
      const mark = document.createElement('mark')
      mark.dataset.readonlySearch = 'true'
      after.replaceWith(mark)
      mark.append(after)
      matches.value.push(mark)
      current = tail
    }
  }
  if (matches.value.length) {
    activeMatch.value = 0
    revealActiveMatch()
  }
}

const revealActiveMatch = () => {
  matches.value.forEach((match, index) => {
    match.classList.toggle('active', index === activeMatch.value)
  })
  matches.value[activeMatch.value]?.scrollIntoView({ block: 'center' })
}

const find = (direction: number) => {
  if (!showSearch.value) openSearch()
  if (!matches.value.length) return
  activeMatch.value =
    (activeMatch.value + direction + matches.value.length) % matches.value.length
  revealActiveMatch()
}

const openSearch = () => {
  showSearch.value = true
  nextTick(() => {
    searchInput.value?.focus()
    searchInput.value?.select()
  })
}

const closeSearch = () => {
  showSearch.value = false
  query.value = ''
  clearHighlights()
}

const handleClick = (event: MouseEvent) => {
  const anchor = (event.target as Element | null)?.closest('a')
  if (!anchor || !content.value?.contains(anchor)) return
  event.preventDefault()
  const href = anchor.getAttribute('href')
  if (!href) return
  if (href.startsWith('#')) {
    const target = content.value.querySelector(`#${CSS.escape(decodeURIComponent(href.slice(1)))}`)
    target?.scrollIntoView({ block: 'start' })
    return
  }
  editorStore.FORMAT_LINK_CLICK({ data: { href }, dirname: window.DIRNAME })
}

const render = async () => {
  const version = ++renderVersion
  cancelScrollRestore()
  const rendered = await markdownToHtml(props.markdown, renderOptions.value)
  if (version !== renderVersion) return
  html.value = rendered
  await nextTick()
  if (version !== renderVersion || !content.value) return
  content.value.querySelectorAll('img').forEach((image) => {
    image.src = resolveLocalImageSrc(image.getAttribute('src') ?? '')
    image.draggable = false
  })
  content.value.querySelectorAll('input, textarea, select, button').forEach((control) => {
    ;(control as HTMLInputElement).disabled = true
  })
  // `[TOC]` is a MarkText directive, not document content. The static reader
  // must never leak it as raw Markdown when no generated TOC is available.
  content.value.querySelectorAll('p').forEach((paragraph) => {
    if (paragraph.textContent?.trim().toUpperCase() === '[TOC]') paragraph.remove()
  })
  restoreScrollPosition()
  if (query.value) highlightMatches()
}

watch([() => props.markdown, renderOptions], render, { immediate: true, deep: true })
watch(query, highlightMatches)
watch(isDarkTheme, updateReaderStyles)

onMounted(() => {
  readerStyleElement = document.createElement('style')
  readerStyleElement.dataset.marktextReadonlyStyles = 'true'
  updateReaderStyles()
  scrollContainer.value?.prepend(readerStyleElement)
  scrollHandler = persistScrollPosition
  scrollContainer.value?.addEventListener('scroll', scrollHandler, { passive: true })
  bus.on('find', openSearch)
  bus.on('findNext', () => find(1))
  bus.on('findPrev', () => find(-1))
  // Replace is intentionally downgraded to find in the read-only viewer.
  bus.on('replace', openSearch)
})

onBeforeUnmount(() => {
  // Capture the latest position synchronously before Vue removes the reader;
  // the editor mounted in the same mode switch restores this exact value.
  persistScrollPosition()
  cancelScrollRestore()
  if (scrollHandler) {
    scrollContainer.value?.removeEventListener('scroll', scrollHandler)
    scrollHandler = null
  }
  renderVersion++
  readerStyleElement?.remove()
  readerStyleElement = null
  bus.off('find', openSearch)
  bus.off('findNext')
  bus.off('findPrev')
  bus.off('replace', openSearch)
})
</script>

<style scoped>
.readonly-reader {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: auto;
  color: var(--editorColor);
  background: var(--editorBgColor);
  user-select: text;
  cursor: auto;
}

.readonly-content {
  min-height: 100%;
}

.readonly-content :deep(.markdown-body) {
  box-sizing: border-box;
  width: min(var(--editorAreaWidth, 750px), calc(100% - 48px));
  max-width: none;
  min-height: 100%;
  margin: 0 auto;
  padding: 60px 0 100px;
  color: var(--editorColor);
  background: transparent;
  font-family: var(--readonly-font-family);
  font-size: var(--readonly-font-size);
  line-height: var(--readonly-line-height);
}

.readonly-content :deep(.markdown-body img),
.readonly-content :deep(.markdown-body svg) {
  max-width: 100%;
}

.readonly-content :deep(.markdown-body a) {
  cursor: pointer;
}

.readonly-content :deep(mark[data-readonly-search]) {
  color: inherit;
  background: #ffe58f;
}

.readonly-content :deep(mark[data-readonly-search].active) {
  color: #111;
  background: #ffb020;
  outline: 1px solid #d67b00;
}

.readonly-search {
  position: sticky;
  z-index: 20;
  top: 8px;
  float: right;
  display: flex;
  gap: 6px;
  align-items: center;
  margin-right: 20px;
  padding: 6px;
  border: 1px solid var(--editorColor10);
  border-radius: 5px;
  color: var(--editorColor);
  background: var(--floatBgColor);
  box-shadow: var(--floatShadow);
}

.readonly-search input {
  width: 220px;
  border: 1px solid var(--editorColor30);
  border-radius: 3px;
  padding: 4px 7px;
  color: var(--editorColor);
  background: var(--editorBgColor);
  outline: none;
}

.readonly-search button {
  border: 0;
  padding: 3px 6px;
  color: inherit;
  background: transparent;
  cursor: pointer;
}

.readonly-search button:hover {
  background: var(--editorColor10);
}
</style>
