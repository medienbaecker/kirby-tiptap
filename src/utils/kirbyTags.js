/**
 * Parse a Kirby‐tag string like "(tag: value attr1: value1 attr2: value2)"
 * into an object { type, value, attr1, attr2, ... }
 * @param {string} tagString - The kirbytag string to parse
 * @returns {Object} Parsed tag attributes
 */
export const parseKirbyTag = (tagString) => {
  // Get tag type
  const typeMatch = tagString.match(/^\((\w+):/)
  const tagType = typeMatch ? typeMatch[1] : ""
  const result = {
    // Store the tag type in a property that won't be used as an attribute
    _type: tagType,
  }

  // Create a regex for finding field markers
  const fieldPattern = /\s+(\w+):\s+/g

  // Find all field positions
  const matches = [...tagString.matchAll(fieldPattern)]

  // Handle the main tag value
  const firstFieldPos =
    matches.length > 0 ? matches[0].index : tagString.length - 1
  const typeColonPos = tagString.indexOf(":")
  const mainValue = tagString.substring(typeColonPos + 1, firstFieldPos).trim()

  // Store the main value with an appropriate key based on tag type
  if (tagType === "link" || tagType === "email" || tagType === "tel") {
    result.href = mainValue
  } else if (tagType === "image") {
    result.uuid = mainValue
  } else {
    result.value = mainValue // Generic fallback
  }

  // Process each field
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i]
    const fieldName = match[1]
    const startPos = match.index + match[0].length
    const endPos =
      i < matches.length - 1 ? matches[i + 1].index : tagString.length - 1

    // Skip the field if it's the same as the tag type
    if (fieldName === tagType) continue

    result[fieldName] = tagString.substring(startPos, endPos).trim()
  }

  return result
}

/**
 * Generates a Kirby tag string from an object of attributes
 * @param {string} type - The tag type (link, image, etc.)
 * @param {string} mainValue - The main value for the tag
 * @param {Object} attrs - Additional attributes
 * @returns {string} Formatted kirbytag
 */
export const generateKirbyTag = (type, mainValue, attrs = {}) => {
  // Start with the basic tag
  let tag = `(${type}: ${mainValue}`

  // Add extra attributes, filtering out empty values
  Object.entries(attrs)
    .filter(([, v]) => {
      if (v === "" || v === false || v == null) return false
      if (Array.isArray(v) && v.length === 0) return false
      return true
    })
    .forEach(([k, v]) => {
      tag += ` ${k}: ${Array.isArray(v) ? v.join(" ") : v}`
    })

  // Close the tag
  tag += ")"

  return tag
}

/**
 * Traverses up the DOM tree to find an element with the specified class
 * @param {Node} node - Starting DOM node
 * @param {string} className - Class name to search for
 * @returns {Element|null} Found element or null
 */
export const findParentWithClass = (node, className) => {
  let cur = node.nodeType === 3 ? node.parentNode : node
  while (cur) {
    if (cur.classList?.contains(className)) return cur
    cur = cur.parentNode
  }
  return null
}
