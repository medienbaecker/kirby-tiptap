import { Extension } from "@tiptap/core"
import { Plugin, PluginKey } from "@tiptap/pm/state"
import { Decoration, DecorationSet } from "@tiptap/pm/view"

export const Highlights = Extension.create({
  name: "highlights",

  addOptions() {
    return {
      highlights: [], // Array of highlight patterns with their classes
    }
  },

  addProseMirrorPlugins() {
    const { highlights } = this.options

    // Regex to identify the start of a Kirbytag
    // Matches: opening parenthesis + lowercase letters + colon
    // Example: (image:, (link:, (video:
    const kirbytagStartRegex = /\(([a-z]+):/

    return [
      new Plugin({
        key: new PluginKey("highlights"),
        props: {
          decorations: (state) => {
            const decorations = []

            // Process each text node in the document
            state.doc.descendants((node, pos) => {
              if (!node.isText) return

              // Step 1: Find and mark all Kirbytags in the text
              const kirbytagRanges = [] // Will store [start, end] positions of all Kirbytags
              let index = 0

              while (index < node.text.length) {
                // Look for potential Kirbytag start (opening parenthesis)
                if (node.text[index] === "(") {
                  const remainingText = node.text.slice(index)
                  const kirbytagMatch = remainingText.match(kirbytagStartRegex)

                  // If we found a valid Kirbytag start pattern
                  if (kirbytagMatch) {
                    // Track nested parentheses to find the proper closing parenthesis
                    let nestingLevel = 1
                    let endIndex = index + 1

                    // Continue until we find the matching closing parenthesis
                    while (endIndex < node.text.length && nestingLevel > 0) {
                      if (node.text[endIndex] === "(") {
                        nestingLevel++ // Increase nesting level for nested opening parenthesis
                      } else if (node.text[endIndex] === ")") {
                        nestingLevel-- // Decrease nesting level for closing parenthesis
                      }
                      endIndex++
                    }

                    // If we found a properly closed Kirbytag
                    if (nestingLevel === 0) {
                      // Store the range of this Kirbytag
                      kirbytagRanges.push([index, endIndex])

                      // Add decoration to highlight the entire Kirbytag
                      decorations.push(
                        Decoration.inline(pos + index, pos + endIndex, {
                          class: "kirbytag",
                        })
                      )

                      // Skip to the end of this tag for next iteration
                      index = endIndex
                      continue
                    }
                  }
                }

                // Move to next character if no Kirbytag was found
                index++
              }

              // Step 2: Apply highlight patterns only to text outside of Kirbytags
              if (highlights.length > 0) {
                // Create segments of text that are not inside any Kirbytag
                const nonTagSegments = []
                let lastEnd = 0

                // For each Kirbytag range, add the text before it as a non-tag segment
                for (const [start, end] of kirbytagRanges) {
                  if (start > lastEnd) {
                    nonTagSegments.push({
                      text: node.text.slice(lastEnd, start),
                      offset: lastEnd, // Remember the original position in the text
                    })
                  }
                  lastEnd = end
                }

                // Add any remaining text after the last Kirbytag
                if (lastEnd < node.text.length) {
                  nonTagSegments.push({
                    text: node.text.slice(lastEnd),
                    offset: lastEnd,
                  })
                }

                // Apply highlight patterns only to non-Kirbytag segments
                for (const segment of nonTagSegments) {
                  highlights.forEach(({ pattern, class: className, title }) => {
                    // Create regex from the highlight pattern
                    const regex =
                      typeof pattern === "string"
                        ? new RegExp(pattern, "g")
                        : new RegExp(pattern.source, pattern.flags + "g")

                    // Find all matches of the highlight pattern in this segment
                    let highlightMatch
                    while ((highlightMatch = regex.exec(segment.text))) {
                      // Add decoration for each highlight match
                      const decoration = Decoration.inline(
                        pos + segment.offset + highlightMatch.index,
                        pos +
                          segment.offset +
                          highlightMatch.index +
                          highlightMatch[0].length,
                        { class: className, ...(title && { title }) }
                      )
                      decorations.push(decoration)
                    }
                  })
                }
              }
            })

            return DecorationSet.create(state.doc, decorations)
          },
        },
      }),
    ]
  },
})
