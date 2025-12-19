import type { Marked } from 'marked'
import 'highlight.js/styles/atom-one-dark.css'

let savedMarked: undefined | Marked

const seenLang = new Set<string>()

const LANG_MAP: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  '': 'plaintext',
  txt: 'plaintext',
  typescript: 'typescript',
  js: 'javascript',
  md: 'markdown',
}

/**
 * Renders markdown content to HTML
 */
export async function renderMarkdown(content: string): Promise<string> {
  if (!savedMarked) {
    const [
      { Marked, Renderer },
      { markedHighlight },
      { default: hljs },
      { default: plaintextLang },
    ] = await Promise.all([
      import('marked'),
      import('marked-highlight'),
      import('highlight.js/lib/common'),
      import('highlight.js/lib/languages/plaintext'),
    ])

    // always add plaintext
    seenLang.add('plaintext')
    hljs.registerLanguage('plaintext', plaintextLang)

    const renderer = new Renderer()

    savedMarked = new Marked(
      {
        renderer: {
          table(...args) {
            return `<div class="overflow-x-auto">${renderer.table.apply(this, args)}</div>`
          },
        },
      },
      markedHighlight({
        emptyLangClass: 'hljs',
        langPrefix: 'hljs language-',
        async: true,
        async highlight(code, lang) {
          let mappedLang = LANG_MAP[lang]
          if (!mappedLang) {
            console.error('uknown lang: ' + lang)
            mappedLang = lang
          }
          if (!seenLang.has(mappedLang)) {
            seenLang.add(mappedLang)
            try {
              const { default: handler } = await import(
                `../../node_modules/highlight.js/es/languages/${mappedLang}.js`
              )
              hljs.registerLanguage(mappedLang, handler)
            } catch (e) {
              console.error(e)
            }
          }
          const language = hljs.getLanguage(mappedLang) ? mappedLang : 'plaintext'
          return hljs.highlight(code, { language }).value
        },
      }),
    )
  }
  const result = savedMarked.parse(content)
  return await result
}
