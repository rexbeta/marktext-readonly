import { MarkdownToHtml, type IMuyaOptions } from '@muyajs/core'

const markdownToHtml = async(
  markdown: string,
  options: Partial<IMuyaOptions> = {}
): Promise<string> => {
  // `MarkdownToHtml#renderHtml` already wraps the output in
  // `<article class="markdown-body">…</article>`, so we return it as-is.
  return new MarkdownToHtml(markdown, undefined, options).renderHtml()
}

export default markdownToHtml
