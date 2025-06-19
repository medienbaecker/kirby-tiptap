/**
 * Event handlers for Tiptap editor
 * Handles paste, drop, and other user interactions
 */

/**
 * Handles paste events in the editor
 * Automatically creates KirbyTags when pasting URLs over selected text
 * @param {Ref} editorRef - The Tiptap editor ref
 * @returns {Function} The paste handler function
 */
export function createPasteHandler(editorRef) {
  return (view, event, slice) => {
    const selection = view.state.selection
    const selectedText = !selection.empty
      ? view.state.doc.textBetween(selection.from, selection.to)
      : ''

    if (selectedText) {
      const pastedText = event.clipboardData.getData('text/plain').trim()
      const urlPattern = /^(https?:\/\/|mailto:|tel:)/i

      if (urlPattern.test(pastedText)) {
        const kirbyTag = `(link: ${pastedText} text: ${selectedText})`

        editorRef.value
          .chain()
          .focus()
          .insertContentAt(selection, kirbyTag)
          .run()

        event.preventDefault()
        return true
      }
    }
    return false
  }
}

/**
 * Handles text drop operations
 * @param {Ref} editorRef - The Tiptap editor ref
 * @param {Object} coordinates - Drop coordinates
 * @param {string} dragData - The dragged text data
 */
export function handleTextDrop(editorRef, coordinates, dragData) {
  const pos = coordinates.pos
  const prevChar = pos > 0 ? editorRef.value.state.doc.textBetween(pos - 1, pos) : ''
  const needsSpace = prevChar && prevChar !== ' '
  const content = needsSpace ? ' ' + dragData : dragData

  editorRef.value
    .chain()
    .focus()
    .insertContentAt(pos, content, {
      parseOptions: { preserveWhitespace: true }
    })
    .unsetAllMarks()
    .run()
}

/**
 * Creates drop handler for the editor
 * Handles drag and drop operations from Kirby panel
 * @param {Ref} editorRef - The Tiptap editor ref
 * @param {Object} panel - Kirby panel instance
 * @param {Object} helper - Kirby helper instance
 * @returns {Function} The drop handler function
 */
export function createDropHandler(editorRef, panel, helper) {
  return (view, event, slice, moved) => {
    if (!moved && panel.drag.data) {
      const coordinates = view.posAtCoords({
        left: event.clientX,
        top: event.clientY
      })

      if (panel.drag.type === "text") {
        handleTextDrop(editorRef, coordinates, panel.drag.data)
      } else if (helper.isUploadEvent(event)) {
        alert('File uploads are not possible yet')
      }

      return true
    }
    return false
  }
}