(function() {
  "use strict";
  function OrderedMap(content) {
    this.content = content;
  }
  OrderedMap.prototype = {
    constructor: OrderedMap,
    find: function(key) {
      for (var i2 = 0; i2 < this.content.length; i2 += 2)
        if (this.content[i2] === key) return i2;
      return -1;
    },
    // :: (string) → ?any
    // Retrieve the value stored under `key`, or return undefined when
    // no such key exists.
    get: function(key) {
      var found2 = this.find(key);
      return found2 == -1 ? void 0 : this.content[found2 + 1];
    },
    // :: (string, any, ?string) → OrderedMap
    // Create a new map by replacing the value of `key` with a new
    // value, or adding a binding to the end of the map. If `newKey` is
    // given, the key of the binding will be replaced with that key.
    update: function(key, value, newKey) {
      var self2 = newKey && newKey != key ? this.remove(newKey) : this;
      var found2 = self2.find(key), content = self2.content.slice();
      if (found2 == -1) {
        content.push(newKey || key, value);
      } else {
        content[found2 + 1] = value;
        if (newKey) content[found2] = newKey;
      }
      return new OrderedMap(content);
    },
    // :: (string) → OrderedMap
    // Return a map with the given key removed, if it existed.
    remove: function(key) {
      var found2 = this.find(key);
      if (found2 == -1) return this;
      var content = this.content.slice();
      content.splice(found2, 2);
      return new OrderedMap(content);
    },
    // :: (string, any) → OrderedMap
    // Add a new key to the start of the map.
    addToStart: function(key, value) {
      return new OrderedMap([key, value].concat(this.remove(key).content));
    },
    // :: (string, any) → OrderedMap
    // Add a new key to the end of the map.
    addToEnd: function(key, value) {
      var content = this.remove(key).content.slice();
      content.push(key, value);
      return new OrderedMap(content);
    },
    // :: (string, string, any) → OrderedMap
    // Add a key after the given key. If `place` is not found, the new
    // key is added to the end.
    addBefore: function(place, key, value) {
      var without = this.remove(key), content = without.content.slice();
      var found2 = without.find(place);
      content.splice(found2 == -1 ? content.length : found2, 0, key, value);
      return new OrderedMap(content);
    },
    // :: ((key: string, value: any))
    // Call the given function for each key/value pair in the map, in
    // order.
    forEach: function(f) {
      for (var i2 = 0; i2 < this.content.length; i2 += 2)
        f(this.content[i2], this.content[i2 + 1]);
    },
    // :: (union<Object, OrderedMap>) → OrderedMap
    // Create a new map by prepending the keys in this map that don't
    // appear in `map` before the keys in `map`.
    prepend: function(map) {
      map = OrderedMap.from(map);
      if (!map.size) return this;
      return new OrderedMap(map.content.concat(this.subtract(map).content));
    },
    // :: (union<Object, OrderedMap>) → OrderedMap
    // Create a new map by appending the keys in this map that don't
    // appear in `map` after the keys in `map`.
    append: function(map) {
      map = OrderedMap.from(map);
      if (!map.size) return this;
      return new OrderedMap(this.subtract(map).content.concat(map.content));
    },
    // :: (union<Object, OrderedMap>) → OrderedMap
    // Create a map containing all the keys in this map that don't
    // appear in `map`.
    subtract: function(map) {
      var result = this;
      map = OrderedMap.from(map);
      for (var i2 = 0; i2 < map.content.length; i2 += 2)
        result = result.remove(map.content[i2]);
      return result;
    },
    // :: () → Object
    // Turn ordered map into a plain object.
    toObject: function() {
      var result = {};
      this.forEach(function(key, value) {
        result[key] = value;
      });
      return result;
    },
    // :: number
    // The amount of keys in this map.
    get size() {
      return this.content.length >> 1;
    }
  };
  OrderedMap.from = function(value) {
    if (value instanceof OrderedMap) return value;
    var content = [];
    if (value) for (var prop in value) content.push(prop, value[prop]);
    return new OrderedMap(content);
  };
  function findDiffStart(a2, b2, pos) {
    for (let i2 = 0; ; i2++) {
      if (i2 == a2.childCount || i2 == b2.childCount)
        return a2.childCount == b2.childCount ? null : pos;
      let childA = a2.child(i2), childB = b2.child(i2);
      if (childA == childB) {
        pos += childA.nodeSize;
        continue;
      }
      if (!childA.sameMarkup(childB))
        return pos;
      if (childA.isText && childA.text != childB.text) {
        for (let j = 0; childA.text[j] == childB.text[j]; j++)
          pos++;
        return pos;
      }
      if (childA.content.size || childB.content.size) {
        let inner = findDiffStart(childA.content, childB.content, pos + 1);
        if (inner != null)
          return inner;
      }
      pos += childA.nodeSize;
    }
  }
  function findDiffEnd(a2, b2, posA, posB) {
    for (let iA = a2.childCount, iB = b2.childCount; ; ) {
      if (iA == 0 || iB == 0)
        return iA == iB ? null : { a: posA, b: posB };
      let childA = a2.child(--iA), childB = b2.child(--iB), size = childA.nodeSize;
      if (childA == childB) {
        posA -= size;
        posB -= size;
        continue;
      }
      if (!childA.sameMarkup(childB))
        return { a: posA, b: posB };
      if (childA.isText && childA.text != childB.text) {
        let same = 0, minSize = Math.min(childA.text.length, childB.text.length);
        while (same < minSize && childA.text[childA.text.length - same - 1] == childB.text[childB.text.length - same - 1]) {
          same++;
          posA--;
          posB--;
        }
        return { a: posA, b: posB };
      }
      if (childA.content.size || childB.content.size) {
        let inner = findDiffEnd(childA.content, childB.content, posA - 1, posB - 1);
        if (inner)
          return inner;
      }
      posA -= size;
      posB -= size;
    }
  }
  class Fragment {
    /**
    @internal
    */
    constructor(content, size) {
      this.content = content;
      this.size = size || 0;
      if (size == null)
        for (let i2 = 0; i2 < content.length; i2++)
          this.size += content[i2].nodeSize;
    }
    /**
    Invoke a callback for all descendant nodes between the given two
    positions (relative to start of this fragment). Doesn't descend
    into a node when the callback returns `false`.
    */
    nodesBetween(from, to, f, nodeStart = 0, parent) {
      for (let i2 = 0, pos = 0; pos < to; i2++) {
        let child = this.content[i2], end = pos + child.nodeSize;
        if (end > from && f(child, nodeStart + pos, parent || null, i2) !== false && child.content.size) {
          let start = pos + 1;
          child.nodesBetween(Math.max(0, from - start), Math.min(child.content.size, to - start), f, nodeStart + start);
        }
        pos = end;
      }
    }
    /**
    Call the given callback for every descendant node. `pos` will be
    relative to the start of the fragment. The callback may return
    `false` to prevent traversal of a given node's children.
    */
    descendants(f) {
      this.nodesBetween(0, this.size, f);
    }
    /**
    Extract the text between `from` and `to`. See the same method on
    [`Node`](https://prosemirror.net/docs/ref/#model.Node.textBetween).
    */
    textBetween(from, to, blockSeparator, leafText) {
      let text = "", first2 = true;
      this.nodesBetween(from, to, (node, pos) => {
        let nodeText = node.isText ? node.text.slice(Math.max(from, pos) - pos, to - pos) : !node.isLeaf ? "" : leafText ? typeof leafText === "function" ? leafText(node) : leafText : node.type.spec.leafText ? node.type.spec.leafText(node) : "";
        if (node.isBlock && (node.isLeaf && nodeText || node.isTextblock) && blockSeparator) {
          if (first2)
            first2 = false;
          else
            text += blockSeparator;
        }
        text += nodeText;
      }, 0);
      return text;
    }
    /**
    Create a new fragment containing the combined content of this
    fragment and the other.
    */
    append(other) {
      if (!other.size)
        return this;
      if (!this.size)
        return other;
      let last = this.lastChild, first2 = other.firstChild, content = this.content.slice(), i2 = 0;
      if (last.isText && last.sameMarkup(first2)) {
        content[content.length - 1] = last.withText(last.text + first2.text);
        i2 = 1;
      }
      for (; i2 < other.content.length; i2++)
        content.push(other.content[i2]);
      return new Fragment(content, this.size + other.size);
    }
    /**
    Cut out the sub-fragment between the two given positions.
    */
    cut(from, to = this.size) {
      if (from == 0 && to == this.size)
        return this;
      let result = [], size = 0;
      if (to > from)
        for (let i2 = 0, pos = 0; pos < to; i2++) {
          let child = this.content[i2], end = pos + child.nodeSize;
          if (end > from) {
            if (pos < from || end > to) {
              if (child.isText)
                child = child.cut(Math.max(0, from - pos), Math.min(child.text.length, to - pos));
              else
                child = child.cut(Math.max(0, from - pos - 1), Math.min(child.content.size, to - pos - 1));
            }
            result.push(child);
            size += child.nodeSize;
          }
          pos = end;
        }
      return new Fragment(result, size);
    }
    /**
    @internal
    */
    cutByIndex(from, to) {
      if (from == to)
        return Fragment.empty;
      if (from == 0 && to == this.content.length)
        return this;
      return new Fragment(this.content.slice(from, to));
    }
    /**
    Create a new fragment in which the node at the given index is
    replaced by the given node.
    */
    replaceChild(index, node) {
      let current = this.content[index];
      if (current == node)
        return this;
      let copy2 = this.content.slice();
      let size = this.size + node.nodeSize - current.nodeSize;
      copy2[index] = node;
      return new Fragment(copy2, size);
    }
    /**
    Create a new fragment by prepending the given node to this
    fragment.
    */
    addToStart(node) {
      return new Fragment([node].concat(this.content), this.size + node.nodeSize);
    }
    /**
    Create a new fragment by appending the given node to this
    fragment.
    */
    addToEnd(node) {
      return new Fragment(this.content.concat(node), this.size + node.nodeSize);
    }
    /**
    Compare this fragment to another one.
    */
    eq(other) {
      if (this.content.length != other.content.length)
        return false;
      for (let i2 = 0; i2 < this.content.length; i2++)
        if (!this.content[i2].eq(other.content[i2]))
          return false;
      return true;
    }
    /**
    The first child of the fragment, or `null` if it is empty.
    */
    get firstChild() {
      return this.content.length ? this.content[0] : null;
    }
    /**
    The last child of the fragment, or `null` if it is empty.
    */
    get lastChild() {
      return this.content.length ? this.content[this.content.length - 1] : null;
    }
    /**
    The number of child nodes in this fragment.
    */
    get childCount() {
      return this.content.length;
    }
    /**
    Get the child node at the given index. Raise an error when the
    index is out of range.
    */
    child(index) {
      let found2 = this.content[index];
      if (!found2)
        throw new RangeError("Index " + index + " out of range for " + this);
      return found2;
    }
    /**
    Get the child node at the given index, if it exists.
    */
    maybeChild(index) {
      return this.content[index] || null;
    }
    /**
    Call `f` for every child node, passing the node, its offset
    into this parent node, and its index.
    */
    forEach(f) {
      for (let i2 = 0, p2 = 0; i2 < this.content.length; i2++) {
        let child = this.content[i2];
        f(child, p2, i2);
        p2 += child.nodeSize;
      }
    }
    /**
    Find the first position at which this fragment and another
    fragment differ, or `null` if they are the same.
    */
    findDiffStart(other, pos = 0) {
      return findDiffStart(this, other, pos);
    }
    /**
    Find the first position, searching from the end, at which this
    fragment and the given fragment differ, or `null` if they are
    the same. Since this position will not be the same in both
    nodes, an object with two separate positions is returned.
    */
    findDiffEnd(other, pos = this.size, otherPos = other.size) {
      return findDiffEnd(this, other, pos, otherPos);
    }
    /**
    Find the index and inner offset corresponding to a given relative
    position in this fragment. The result object will be reused
    (overwritten) the next time the function is called. @internal
    */
    findIndex(pos, round = -1) {
      if (pos == 0)
        return retIndex(0, pos);
      if (pos == this.size)
        return retIndex(this.content.length, pos);
      if (pos > this.size || pos < 0)
        throw new RangeError(`Position ${pos} outside of fragment (${this})`);
      for (let i2 = 0, curPos = 0; ; i2++) {
        let cur = this.child(i2), end = curPos + cur.nodeSize;
        if (end >= pos) {
          if (end == pos || round > 0)
            return retIndex(i2 + 1, end);
          return retIndex(i2, curPos);
        }
        curPos = end;
      }
    }
    /**
    Return a debugging string that describes this fragment.
    */
    toString() {
      return "<" + this.toStringInner() + ">";
    }
    /**
    @internal
    */
    toStringInner() {
      return this.content.join(", ");
    }
    /**
    Create a JSON-serializeable representation of this fragment.
    */
    toJSON() {
      return this.content.length ? this.content.map((n) => n.toJSON()) : null;
    }
    /**
    Deserialize a fragment from its JSON representation.
    */
    static fromJSON(schema, value) {
      if (!value)
        return Fragment.empty;
      if (!Array.isArray(value))
        throw new RangeError("Invalid input for Fragment.fromJSON");
      return new Fragment(value.map(schema.nodeFromJSON));
    }
    /**
    Build a fragment from an array of nodes. Ensures that adjacent
    text nodes with the same marks are joined together.
    */
    static fromArray(array2) {
      if (!array2.length)
        return Fragment.empty;
      let joined, size = 0;
      for (let i2 = 0; i2 < array2.length; i2++) {
        let node = array2[i2];
        size += node.nodeSize;
        if (i2 && node.isText && array2[i2 - 1].sameMarkup(node)) {
          if (!joined)
            joined = array2.slice(0, i2);
          joined[joined.length - 1] = node.withText(joined[joined.length - 1].text + node.text);
        } else if (joined) {
          joined.push(node);
        }
      }
      return new Fragment(joined || array2, size);
    }
    /**
    Create a fragment from something that can be interpreted as a
    set of nodes. For `null`, it returns the empty fragment. For a
    fragment, the fragment itself. For a node or array of nodes, a
    fragment containing those nodes.
    */
    static from(nodes) {
      if (!nodes)
        return Fragment.empty;
      if (nodes instanceof Fragment)
        return nodes;
      if (Array.isArray(nodes))
        return this.fromArray(nodes);
      if (nodes.attrs)
        return new Fragment([nodes], nodes.nodeSize);
      throw new RangeError("Can not convert " + nodes + " to a Fragment" + (nodes.nodesBetween ? " (looks like multiple versions of prosemirror-model were loaded)" : ""));
    }
  }
  Fragment.empty = new Fragment([], 0);
  const found = { index: 0, offset: 0 };
  function retIndex(index, offset) {
    found.index = index;
    found.offset = offset;
    return found;
  }
  function compareDeep(a2, b2) {
    if (a2 === b2)
      return true;
    if (!(a2 && typeof a2 == "object") || !(b2 && typeof b2 == "object"))
      return false;
    let array2 = Array.isArray(a2);
    if (Array.isArray(b2) != array2)
      return false;
    if (array2) {
      if (a2.length != b2.length)
        return false;
      for (let i2 = 0; i2 < a2.length; i2++)
        if (!compareDeep(a2[i2], b2[i2]))
          return false;
    } else {
      for (let p2 in a2)
        if (!(p2 in b2) || !compareDeep(a2[p2], b2[p2]))
          return false;
      for (let p2 in b2)
        if (!(p2 in a2))
          return false;
    }
    return true;
  }
  let Mark$1 = class Mark2 {
    /**
    @internal
    */
    constructor(type, attrs) {
      this.type = type;
      this.attrs = attrs;
    }
    /**
    Given a set of marks, create a new set which contains this one as
    well, in the right position. If this mark is already in the set,
    the set itself is returned. If any marks that are set to be
    [exclusive](https://prosemirror.net/docs/ref/#model.MarkSpec.excludes) with this mark are present,
    those are replaced by this one.
    */
    addToSet(set) {
      let copy2, placed = false;
      for (let i2 = 0; i2 < set.length; i2++) {
        let other = set[i2];
        if (this.eq(other))
          return set;
        if (this.type.excludes(other.type)) {
          if (!copy2)
            copy2 = set.slice(0, i2);
        } else if (other.type.excludes(this.type)) {
          return set;
        } else {
          if (!placed && other.type.rank > this.type.rank) {
            if (!copy2)
              copy2 = set.slice(0, i2);
            copy2.push(this);
            placed = true;
          }
          if (copy2)
            copy2.push(other);
        }
      }
      if (!copy2)
        copy2 = set.slice();
      if (!placed)
        copy2.push(this);
      return copy2;
    }
    /**
    Remove this mark from the given set, returning a new set. If this
    mark is not in the set, the set itself is returned.
    */
    removeFromSet(set) {
      for (let i2 = 0; i2 < set.length; i2++)
        if (this.eq(set[i2]))
          return set.slice(0, i2).concat(set.slice(i2 + 1));
      return set;
    }
    /**
    Test whether this mark is in the given set of marks.
    */
    isInSet(set) {
      for (let i2 = 0; i2 < set.length; i2++)
        if (this.eq(set[i2]))
          return true;
      return false;
    }
    /**
    Test whether this mark has the same type and attributes as
    another mark.
    */
    eq(other) {
      return this == other || this.type == other.type && compareDeep(this.attrs, other.attrs);
    }
    /**
    Convert this mark to a JSON-serializeable representation.
    */
    toJSON() {
      let obj = { type: this.type.name };
      for (let _ in this.attrs) {
        obj.attrs = this.attrs;
        break;
      }
      return obj;
    }
    /**
    Deserialize a mark from JSON.
    */
    static fromJSON(schema, json) {
      if (!json)
        throw new RangeError("Invalid input for Mark.fromJSON");
      let type = schema.marks[json.type];
      if (!type)
        throw new RangeError(`There is no mark type ${json.type} in this schema`);
      let mark = type.create(json.attrs);
      type.checkAttrs(mark.attrs);
      return mark;
    }
    /**
    Test whether two sets of marks are identical.
    */
    static sameSet(a2, b2) {
      if (a2 == b2)
        return true;
      if (a2.length != b2.length)
        return false;
      for (let i2 = 0; i2 < a2.length; i2++)
        if (!a2[i2].eq(b2[i2]))
          return false;
      return true;
    }
    /**
    Create a properly sorted mark set from null, a single mark, or an
    unsorted array of marks.
    */
    static setFrom(marks) {
      if (!marks || Array.isArray(marks) && marks.length == 0)
        return Mark2.none;
      if (marks instanceof Mark2)
        return [marks];
      let copy2 = marks.slice();
      copy2.sort((a2, b2) => a2.type.rank - b2.type.rank);
      return copy2;
    }
  };
  Mark$1.none = [];
  class ReplaceError extends Error {
  }
  class Slice {
    /**
    Create a slice. When specifying a non-zero open depth, you must
    make sure that there are nodes of at least that depth at the
    appropriate side of the fragment—i.e. if the fragment is an
    empty paragraph node, `openStart` and `openEnd` can't be greater
    than 1.
    
    It is not necessary for the content of open nodes to conform to
    the schema's content constraints, though it should be a valid
    start/end/middle for such a node, depending on which sides are
    open.
    */
    constructor(content, openStart, openEnd) {
      this.content = content;
      this.openStart = openStart;
      this.openEnd = openEnd;
    }
    /**
    The size this slice would add when inserted into a document.
    */
    get size() {
      return this.content.size - this.openStart - this.openEnd;
    }
    /**
    @internal
    */
    insertAt(pos, fragment) {
      let content = insertInto(this.content, pos + this.openStart, fragment);
      return content && new Slice(content, this.openStart, this.openEnd);
    }
    /**
    @internal
    */
    removeBetween(from, to) {
      return new Slice(removeRange(this.content, from + this.openStart, to + this.openStart), this.openStart, this.openEnd);
    }
    /**
    Tests whether this slice is equal to another slice.
    */
    eq(other) {
      return this.content.eq(other.content) && this.openStart == other.openStart && this.openEnd == other.openEnd;
    }
    /**
    @internal
    */
    toString() {
      return this.content + "(" + this.openStart + "," + this.openEnd + ")";
    }
    /**
    Convert a slice to a JSON-serializable representation.
    */
    toJSON() {
      if (!this.content.size)
        return null;
      let json = { content: this.content.toJSON() };
      if (this.openStart > 0)
        json.openStart = this.openStart;
      if (this.openEnd > 0)
        json.openEnd = this.openEnd;
      return json;
    }
    /**
    Deserialize a slice from its JSON representation.
    */
    static fromJSON(schema, json) {
      if (!json)
        return Slice.empty;
      let openStart = json.openStart || 0, openEnd = json.openEnd || 0;
      if (typeof openStart != "number" || typeof openEnd != "number")
        throw new RangeError("Invalid input for Slice.fromJSON");
      return new Slice(Fragment.fromJSON(schema, json.content), openStart, openEnd);
    }
    /**
    Create a slice from a fragment by taking the maximum possible
    open value on both side of the fragment.
    */
    static maxOpen(fragment, openIsolating = true) {
      let openStart = 0, openEnd = 0;
      for (let n = fragment.firstChild; n && !n.isLeaf && (openIsolating || !n.type.spec.isolating); n = n.firstChild)
        openStart++;
      for (let n = fragment.lastChild; n && !n.isLeaf && (openIsolating || !n.type.spec.isolating); n = n.lastChild)
        openEnd++;
      return new Slice(fragment, openStart, openEnd);
    }
  }
  Slice.empty = new Slice(Fragment.empty, 0, 0);
  function removeRange(content, from, to) {
    let { index, offset } = content.findIndex(from), child = content.maybeChild(index);
    let { index: indexTo, offset: offsetTo } = content.findIndex(to);
    if (offset == from || child.isText) {
      if (offsetTo != to && !content.child(indexTo).isText)
        throw new RangeError("Removing non-flat range");
      return content.cut(0, from).append(content.cut(to));
    }
    if (index != indexTo)
      throw new RangeError("Removing non-flat range");
    return content.replaceChild(index, child.copy(removeRange(child.content, from - offset - 1, to - offset - 1)));
  }
  function insertInto(content, dist2, insert, parent) {
    let { index, offset } = content.findIndex(dist2), child = content.maybeChild(index);
    if (offset == dist2 || child.isText) {
      return content.cut(0, dist2).append(insert).append(content.cut(dist2));
    }
    let inner = insertInto(child.content, dist2 - offset - 1, insert);
    return inner && content.replaceChild(index, child.copy(inner));
  }
  function replace($from, $to, slice) {
    if (slice.openStart > $from.depth)
      throw new ReplaceError("Inserted content deeper than insertion position");
    if ($from.depth - slice.openStart != $to.depth - slice.openEnd)
      throw new ReplaceError("Inconsistent open depths");
    return replaceOuter($from, $to, slice, 0);
  }
  function replaceOuter($from, $to, slice, depth) {
    let index = $from.index(depth), node = $from.node(depth);
    if (index == $to.index(depth) && depth < $from.depth - slice.openStart) {
      let inner = replaceOuter($from, $to, slice, depth + 1);
      return node.copy(node.content.replaceChild(index, inner));
    } else if (!slice.content.size) {
      return close(node, replaceTwoWay($from, $to, depth));
    } else if (!slice.openStart && !slice.openEnd && $from.depth == depth && $to.depth == depth) {
      let parent = $from.parent, content = parent.content;
      return close(parent, content.cut(0, $from.parentOffset).append(slice.content).append(content.cut($to.parentOffset)));
    } else {
      let { start, end } = prepareSliceForReplace(slice, $from);
      return close(node, replaceThreeWay($from, start, end, $to, depth));
    }
  }
  function checkJoin(main, sub) {
    if (!sub.type.compatibleContent(main.type))
      throw new ReplaceError("Cannot join " + sub.type.name + " onto " + main.type.name);
  }
  function joinable$1($before, $after, depth) {
    let node = $before.node(depth);
    checkJoin(node, $after.node(depth));
    return node;
  }
  function addNode(child, target) {
    let last = target.length - 1;
    if (last >= 0 && child.isText && child.sameMarkup(target[last]))
      target[last] = child.withText(target[last].text + child.text);
    else
      target.push(child);
  }
  function addRange($start, $end, depth, target) {
    let node = ($end || $start).node(depth);
    let startIndex = 0, endIndex = $end ? $end.index(depth) : node.childCount;
    if ($start) {
      startIndex = $start.index(depth);
      if ($start.depth > depth) {
        startIndex++;
      } else if ($start.textOffset) {
        addNode($start.nodeAfter, target);
        startIndex++;
      }
    }
    for (let i2 = startIndex; i2 < endIndex; i2++)
      addNode(node.child(i2), target);
    if ($end && $end.depth == depth && $end.textOffset)
      addNode($end.nodeBefore, target);
  }
  function close(node, content) {
    node.type.checkContent(content);
    return node.copy(content);
  }
  function replaceThreeWay($from, $start, $end, $to, depth) {
    let openStart = $from.depth > depth && joinable$1($from, $start, depth + 1);
    let openEnd = $to.depth > depth && joinable$1($end, $to, depth + 1);
    let content = [];
    addRange(null, $from, depth, content);
    if (openStart && openEnd && $start.index(depth) == $end.index(depth)) {
      checkJoin(openStart, openEnd);
      addNode(close(openStart, replaceThreeWay($from, $start, $end, $to, depth + 1)), content);
    } else {
      if (openStart)
        addNode(close(openStart, replaceTwoWay($from, $start, depth + 1)), content);
      addRange($start, $end, depth, content);
      if (openEnd)
        addNode(close(openEnd, replaceTwoWay($end, $to, depth + 1)), content);
    }
    addRange($to, null, depth, content);
    return new Fragment(content);
  }
  function replaceTwoWay($from, $to, depth) {
    let content = [];
    addRange(null, $from, depth, content);
    if ($from.depth > depth) {
      let type = joinable$1($from, $to, depth + 1);
      addNode(close(type, replaceTwoWay($from, $to, depth + 1)), content);
    }
    addRange($to, null, depth, content);
    return new Fragment(content);
  }
  function prepareSliceForReplace(slice, $along) {
    let extra = $along.depth - slice.openStart, parent = $along.node(extra);
    let node = parent.copy(slice.content);
    for (let i2 = extra - 1; i2 >= 0; i2--)
      node = $along.node(i2).copy(Fragment.from(node));
    return {
      start: node.resolveNoCache(slice.openStart + extra),
      end: node.resolveNoCache(node.content.size - slice.openEnd - extra)
    };
  }
  class ResolvedPos {
    /**
    @internal
    */
    constructor(pos, path, parentOffset) {
      this.pos = pos;
      this.path = path;
      this.parentOffset = parentOffset;
      this.depth = path.length / 3 - 1;
    }
    /**
    @internal
    */
    resolveDepth(val) {
      if (val == null)
        return this.depth;
      if (val < 0)
        return this.depth + val;
      return val;
    }
    /**
    The parent node that the position points into. Note that even if
    a position points into a text node, that node is not considered
    the parent—text nodes are ‘flat’ in this model, and have no content.
    */
    get parent() {
      return this.node(this.depth);
    }
    /**
    The root node in which the position was resolved.
    */
    get doc() {
      return this.node(0);
    }
    /**
    The ancestor node at the given level. `p.node(p.depth)` is the
    same as `p.parent`.
    */
    node(depth) {
      return this.path[this.resolveDepth(depth) * 3];
    }
    /**
    The index into the ancestor at the given level. If this points
    at the 3rd node in the 2nd paragraph on the top level, for
    example, `p.index(0)` is 1 and `p.index(1)` is 2.
    */
    index(depth) {
      return this.path[this.resolveDepth(depth) * 3 + 1];
    }
    /**
    The index pointing after this position into the ancestor at the
    given level.
    */
    indexAfter(depth) {
      depth = this.resolveDepth(depth);
      return this.index(depth) + (depth == this.depth && !this.textOffset ? 0 : 1);
    }
    /**
    The (absolute) position at the start of the node at the given
    level.
    */
    start(depth) {
      depth = this.resolveDepth(depth);
      return depth == 0 ? 0 : this.path[depth * 3 - 1] + 1;
    }
    /**
    The (absolute) position at the end of the node at the given
    level.
    */
    end(depth) {
      depth = this.resolveDepth(depth);
      return this.start(depth) + this.node(depth).content.size;
    }
    /**
    The (absolute) position directly before the wrapping node at the
    given level, or, when `depth` is `this.depth + 1`, the original
    position.
    */
    before(depth) {
      depth = this.resolveDepth(depth);
      if (!depth)
        throw new RangeError("There is no position before the top-level node");
      return depth == this.depth + 1 ? this.pos : this.path[depth * 3 - 1];
    }
    /**
    The (absolute) position directly after the wrapping node at the
    given level, or the original position when `depth` is `this.depth + 1`.
    */
    after(depth) {
      depth = this.resolveDepth(depth);
      if (!depth)
        throw new RangeError("There is no position after the top-level node");
      return depth == this.depth + 1 ? this.pos : this.path[depth * 3 - 1] + this.path[depth * 3].nodeSize;
    }
    /**
    When this position points into a text node, this returns the
    distance between the position and the start of the text node.
    Will be zero for positions that point between nodes.
    */
    get textOffset() {
      return this.pos - this.path[this.path.length - 1];
    }
    /**
    Get the node directly after the position, if any. If the position
    points into a text node, only the part of that node after the
    position is returned.
    */
    get nodeAfter() {
      let parent = this.parent, index = this.index(this.depth);
      if (index == parent.childCount)
        return null;
      let dOff = this.pos - this.path[this.path.length - 1], child = parent.child(index);
      return dOff ? parent.child(index).cut(dOff) : child;
    }
    /**
    Get the node directly before the position, if any. If the
    position points into a text node, only the part of that node
    before the position is returned.
    */
    get nodeBefore() {
      let index = this.index(this.depth);
      let dOff = this.pos - this.path[this.path.length - 1];
      if (dOff)
        return this.parent.child(index).cut(0, dOff);
      return index == 0 ? null : this.parent.child(index - 1);
    }
    /**
    Get the position at the given index in the parent node at the
    given depth (which defaults to `this.depth`).
    */
    posAtIndex(index, depth) {
      depth = this.resolveDepth(depth);
      let node = this.path[depth * 3], pos = depth == 0 ? 0 : this.path[depth * 3 - 1] + 1;
      for (let i2 = 0; i2 < index; i2++)
        pos += node.child(i2).nodeSize;
      return pos;
    }
    /**
    Get the marks at this position, factoring in the surrounding
    marks' [`inclusive`](https://prosemirror.net/docs/ref/#model.MarkSpec.inclusive) property. If the
    position is at the start of a non-empty node, the marks of the
    node after it (if any) are returned.
    */
    marks() {
      let parent = this.parent, index = this.index();
      if (parent.content.size == 0)
        return Mark$1.none;
      if (this.textOffset)
        return parent.child(index).marks;
      let main = parent.maybeChild(index - 1), other = parent.maybeChild(index);
      if (!main) {
        let tmp = main;
        main = other;
        other = tmp;
      }
      let marks = main.marks;
      for (var i2 = 0; i2 < marks.length; i2++)
        if (marks[i2].type.spec.inclusive === false && (!other || !marks[i2].isInSet(other.marks)))
          marks = marks[i2--].removeFromSet(marks);
      return marks;
    }
    /**
    Get the marks after the current position, if any, except those
    that are non-inclusive and not present at position `$end`. This
    is mostly useful for getting the set of marks to preserve after a
    deletion. Will return `null` if this position is at the end of
    its parent node or its parent node isn't a textblock (in which
    case no marks should be preserved).
    */
    marksAcross($end) {
      let after = this.parent.maybeChild(this.index());
      if (!after || !after.isInline)
        return null;
      let marks = after.marks, next = $end.parent.maybeChild($end.index());
      for (var i2 = 0; i2 < marks.length; i2++)
        if (marks[i2].type.spec.inclusive === false && (!next || !marks[i2].isInSet(next.marks)))
          marks = marks[i2--].removeFromSet(marks);
      return marks;
    }
    /**
    The depth up to which this position and the given (non-resolved)
    position share the same parent nodes.
    */
    sharedDepth(pos) {
      for (let depth = this.depth; depth > 0; depth--)
        if (this.start(depth) <= pos && this.end(depth) >= pos)
          return depth;
      return 0;
    }
    /**
    Returns a range based on the place where this position and the
    given position diverge around block content. If both point into
    the same textblock, for example, a range around that textblock
    will be returned. If they point into different blocks, the range
    around those blocks in their shared ancestor is returned. You can
    pass in an optional predicate that will be called with a parent
    node to see if a range into that parent is acceptable.
    */
    blockRange(other = this, pred) {
      if (other.pos < this.pos)
        return other.blockRange(this);
      for (let d2 = this.depth - (this.parent.inlineContent || this.pos == other.pos ? 1 : 0); d2 >= 0; d2--)
        if (other.pos <= this.end(d2) && (!pred || pred(this.node(d2))))
          return new NodeRange(this, other, d2);
      return null;
    }
    /**
    Query whether the given position shares the same parent node.
    */
    sameParent(other) {
      return this.pos - this.parentOffset == other.pos - other.parentOffset;
    }
    /**
    Return the greater of this and the given position.
    */
    max(other) {
      return other.pos > this.pos ? other : this;
    }
    /**
    Return the smaller of this and the given position.
    */
    min(other) {
      return other.pos < this.pos ? other : this;
    }
    /**
    @internal
    */
    toString() {
      let str = "";
      for (let i2 = 1; i2 <= this.depth; i2++)
        str += (str ? "/" : "") + this.node(i2).type.name + "_" + this.index(i2 - 1);
      return str + ":" + this.parentOffset;
    }
    /**
    @internal
    */
    static resolve(doc2, pos) {
      if (!(pos >= 0 && pos <= doc2.content.size))
        throw new RangeError("Position " + pos + " out of range");
      let path = [];
      let start = 0, parentOffset = pos;
      for (let node = doc2; ; ) {
        let { index, offset } = node.content.findIndex(parentOffset);
        let rem = parentOffset - offset;
        path.push(node, index, start + offset);
        if (!rem)
          break;
        node = node.child(index);
        if (node.isText)
          break;
        parentOffset = rem - 1;
        start += offset + 1;
      }
      return new ResolvedPos(pos, path, parentOffset);
    }
    /**
    @internal
    */
    static resolveCached(doc2, pos) {
      let cache = resolveCache.get(doc2);
      if (cache) {
        for (let i2 = 0; i2 < cache.elts.length; i2++) {
          let elt = cache.elts[i2];
          if (elt.pos == pos)
            return elt;
        }
      } else {
        resolveCache.set(doc2, cache = new ResolveCache());
      }
      let result = cache.elts[cache.i] = ResolvedPos.resolve(doc2, pos);
      cache.i = (cache.i + 1) % resolveCacheSize;
      return result;
    }
  }
  class ResolveCache {
    constructor() {
      this.elts = [];
      this.i = 0;
    }
  }
  const resolveCacheSize = 12, resolveCache = /* @__PURE__ */ new WeakMap();
  class NodeRange {
    /**
    Construct a node range. `$from` and `$to` should point into the
    same node until at least the given `depth`, since a node range
    denotes an adjacent set of nodes in a single parent node.
    */
    constructor($from, $to, depth) {
      this.$from = $from;
      this.$to = $to;
      this.depth = depth;
    }
    /**
    The position at the start of the range.
    */
    get start() {
      return this.$from.before(this.depth + 1);
    }
    /**
    The position at the end of the range.
    */
    get end() {
      return this.$to.after(this.depth + 1);
    }
    /**
    The parent node that the range points into.
    */
    get parent() {
      return this.$from.node(this.depth);
    }
    /**
    The start index of the range in the parent node.
    */
    get startIndex() {
      return this.$from.index(this.depth);
    }
    /**
    The end index of the range in the parent node.
    */
    get endIndex() {
      return this.$to.indexAfter(this.depth);
    }
  }
  const emptyAttrs = /* @__PURE__ */ Object.create(null);
  let Node$1 = class Node2 {
    /**
    @internal
    */
    constructor(type, attrs, content, marks = Mark$1.none) {
      this.type = type;
      this.attrs = attrs;
      this.marks = marks;
      this.content = content || Fragment.empty;
    }
    /**
    The array of this node's child nodes.
    */
    get children() {
      return this.content.content;
    }
    /**
    The size of this node, as defined by the integer-based [indexing
    scheme](/docs/guide/#doc.indexing). For text nodes, this is the
    amount of characters. For other leaf nodes, it is one. For
    non-leaf nodes, it is the size of the content plus two (the
    start and end token).
    */
    get nodeSize() {
      return this.isLeaf ? 1 : 2 + this.content.size;
    }
    /**
    The number of children that the node has.
    */
    get childCount() {
      return this.content.childCount;
    }
    /**
    Get the child node at the given index. Raises an error when the
    index is out of range.
    */
    child(index) {
      return this.content.child(index);
    }
    /**
    Get the child node at the given index, if it exists.
    */
    maybeChild(index) {
      return this.content.maybeChild(index);
    }
    /**
    Call `f` for every child node, passing the node, its offset
    into this parent node, and its index.
    */
    forEach(f) {
      this.content.forEach(f);
    }
    /**
    Invoke a callback for all descendant nodes recursively between
    the given two positions that are relative to start of this
    node's content. The callback is invoked with the node, its
    position relative to the original node (method receiver),
    its parent node, and its child index. When the callback returns
    false for a given node, that node's children will not be
    recursed over. The last parameter can be used to specify a
    starting position to count from.
    */
    nodesBetween(from, to, f, startPos = 0) {
      this.content.nodesBetween(from, to, f, startPos, this);
    }
    /**
    Call the given callback for every descendant node. Doesn't
    descend into a node when the callback returns `false`.
    */
    descendants(f) {
      this.nodesBetween(0, this.content.size, f);
    }
    /**
    Concatenates all the text nodes found in this fragment and its
    children.
    */
    get textContent() {
      return this.isLeaf && this.type.spec.leafText ? this.type.spec.leafText(this) : this.textBetween(0, this.content.size, "");
    }
    /**
    Get all text between positions `from` and `to`. When
    `blockSeparator` is given, it will be inserted to separate text
    from different block nodes. If `leafText` is given, it'll be
    inserted for every non-text leaf node encountered, otherwise
    [`leafText`](https://prosemirror.net/docs/ref/#model.NodeSpec^leafText) will be used.
    */
    textBetween(from, to, blockSeparator, leafText) {
      return this.content.textBetween(from, to, blockSeparator, leafText);
    }
    /**
    Returns this node's first child, or `null` if there are no
    children.
    */
    get firstChild() {
      return this.content.firstChild;
    }
    /**
    Returns this node's last child, or `null` if there are no
    children.
    */
    get lastChild() {
      return this.content.lastChild;
    }
    /**
    Test whether two nodes represent the same piece of document.
    */
    eq(other) {
      return this == other || this.sameMarkup(other) && this.content.eq(other.content);
    }
    /**
    Compare the markup (type, attributes, and marks) of this node to
    those of another. Returns `true` if both have the same markup.
    */
    sameMarkup(other) {
      return this.hasMarkup(other.type, other.attrs, other.marks);
    }
    /**
    Check whether this node's markup correspond to the given type,
    attributes, and marks.
    */
    hasMarkup(type, attrs, marks) {
      return this.type == type && compareDeep(this.attrs, attrs || type.defaultAttrs || emptyAttrs) && Mark$1.sameSet(this.marks, marks || Mark$1.none);
    }
    /**
    Create a new node with the same markup as this node, containing
    the given content (or empty, if no content is given).
    */
    copy(content = null) {
      if (content == this.content)
        return this;
      return new Node2(this.type, this.attrs, content, this.marks);
    }
    /**
    Create a copy of this node, with the given set of marks instead
    of the node's own marks.
    */
    mark(marks) {
      return marks == this.marks ? this : new Node2(this.type, this.attrs, this.content, marks);
    }
    /**
    Create a copy of this node with only the content between the
    given positions. If `to` is not given, it defaults to the end of
    the node.
    */
    cut(from, to = this.content.size) {
      if (from == 0 && to == this.content.size)
        return this;
      return this.copy(this.content.cut(from, to));
    }
    /**
    Cut out the part of the document between the given positions, and
    return it as a `Slice` object.
    */
    slice(from, to = this.content.size, includeParents = false) {
      if (from == to)
        return Slice.empty;
      let $from = this.resolve(from), $to = this.resolve(to);
      let depth = includeParents ? 0 : $from.sharedDepth(to);
      let start = $from.start(depth), node = $from.node(depth);
      let content = node.content.cut($from.pos - start, $to.pos - start);
      return new Slice(content, $from.depth - depth, $to.depth - depth);
    }
    /**
    Replace the part of the document between the given positions with
    the given slice. The slice must 'fit', meaning its open sides
    must be able to connect to the surrounding content, and its
    content nodes must be valid children for the node they are placed
    into. If any of this is violated, an error of type
    [`ReplaceError`](https://prosemirror.net/docs/ref/#model.ReplaceError) is thrown.
    */
    replace(from, to, slice) {
      return replace(this.resolve(from), this.resolve(to), slice);
    }
    /**
    Find the node directly after the given position.
    */
    nodeAt(pos) {
      for (let node = this; ; ) {
        let { index, offset } = node.content.findIndex(pos);
        node = node.maybeChild(index);
        if (!node)
          return null;
        if (offset == pos || node.isText)
          return node;
        pos -= offset + 1;
      }
    }
    /**
    Find the (direct) child node after the given offset, if any,
    and return it along with its index and offset relative to this
    node.
    */
    childAfter(pos) {
      let { index, offset } = this.content.findIndex(pos);
      return { node: this.content.maybeChild(index), index, offset };
    }
    /**
    Find the (direct) child node before the given offset, if any,
    and return it along with its index and offset relative to this
    node.
    */
    childBefore(pos) {
      if (pos == 0)
        return { node: null, index: 0, offset: 0 };
      let { index, offset } = this.content.findIndex(pos);
      if (offset < pos)
        return { node: this.content.child(index), index, offset };
      let node = this.content.child(index - 1);
      return { node, index: index - 1, offset: offset - node.nodeSize };
    }
    /**
    Resolve the given position in the document, returning an
    [object](https://prosemirror.net/docs/ref/#model.ResolvedPos) with information about its context.
    */
    resolve(pos) {
      return ResolvedPos.resolveCached(this, pos);
    }
    /**
    @internal
    */
    resolveNoCache(pos) {
      return ResolvedPos.resolve(this, pos);
    }
    /**
    Test whether a given mark or mark type occurs in this document
    between the two given positions.
    */
    rangeHasMark(from, to, type) {
      let found2 = false;
      if (to > from)
        this.nodesBetween(from, to, (node) => {
          if (type.isInSet(node.marks))
            found2 = true;
          return !found2;
        });
      return found2;
    }
    /**
    True when this is a block (non-inline node)
    */
    get isBlock() {
      return this.type.isBlock;
    }
    /**
    True when this is a textblock node, a block node with inline
    content.
    */
    get isTextblock() {
      return this.type.isTextblock;
    }
    /**
    True when this node allows inline content.
    */
    get inlineContent() {
      return this.type.inlineContent;
    }
    /**
    True when this is an inline node (a text node or a node that can
    appear among text).
    */
    get isInline() {
      return this.type.isInline;
    }
    /**
    True when this is a text node.
    */
    get isText() {
      return this.type.isText;
    }
    /**
    True when this is a leaf node.
    */
    get isLeaf() {
      return this.type.isLeaf;
    }
    /**
    True when this is an atom, i.e. when it does not have directly
    editable content. This is usually the same as `isLeaf`, but can
    be configured with the [`atom` property](https://prosemirror.net/docs/ref/#model.NodeSpec.atom)
    on a node's spec (typically used when the node is displayed as
    an uneditable [node view](https://prosemirror.net/docs/ref/#view.NodeView)).
    */
    get isAtom() {
      return this.type.isAtom;
    }
    /**
    Return a string representation of this node for debugging
    purposes.
    */
    toString() {
      if (this.type.spec.toDebugString)
        return this.type.spec.toDebugString(this);
      let name = this.type.name;
      if (this.content.size)
        name += "(" + this.content.toStringInner() + ")";
      return wrapMarks(this.marks, name);
    }
    /**
    Get the content match in this node at the given index.
    */
    contentMatchAt(index) {
      let match = this.type.contentMatch.matchFragment(this.content, 0, index);
      if (!match)
        throw new Error("Called contentMatchAt on a node with invalid content");
      return match;
    }
    /**
    Test whether replacing the range between `from` and `to` (by
    child index) with the given replacement fragment (which defaults
    to the empty fragment) would leave the node's content valid. You
    can optionally pass `start` and `end` indices into the
    replacement fragment.
    */
    canReplace(from, to, replacement = Fragment.empty, start = 0, end = replacement.childCount) {
      let one = this.contentMatchAt(from).matchFragment(replacement, start, end);
      let two = one && one.matchFragment(this.content, to);
      if (!two || !two.validEnd)
        return false;
      for (let i2 = start; i2 < end; i2++)
        if (!this.type.allowsMarks(replacement.child(i2).marks))
          return false;
      return true;
    }
    /**
    Test whether replacing the range `from` to `to` (by index) with
    a node of the given type would leave the node's content valid.
    */
    canReplaceWith(from, to, type, marks) {
      if (marks && !this.type.allowsMarks(marks))
        return false;
      let start = this.contentMatchAt(from).matchType(type);
      let end = start && start.matchFragment(this.content, to);
      return end ? end.validEnd : false;
    }
    /**
    Test whether the given node's content could be appended to this
    node. If that node is empty, this will only return true if there
    is at least one node type that can appear in both nodes (to avoid
    merging completely incompatible nodes).
    */
    canAppend(other) {
      if (other.content.size)
        return this.canReplace(this.childCount, this.childCount, other.content);
      else
        return this.type.compatibleContent(other.type);
    }
    /**
    Check whether this node and its descendants conform to the
    schema, and raise an exception when they do not.
    */
    check() {
      this.type.checkContent(this.content);
      this.type.checkAttrs(this.attrs);
      let copy2 = Mark$1.none;
      for (let i2 = 0; i2 < this.marks.length; i2++) {
        let mark = this.marks[i2];
        mark.type.checkAttrs(mark.attrs);
        copy2 = mark.addToSet(copy2);
      }
      if (!Mark$1.sameSet(copy2, this.marks))
        throw new RangeError(`Invalid collection of marks for node ${this.type.name}: ${this.marks.map((m) => m.type.name)}`);
      this.content.forEach((node) => node.check());
    }
    /**
    Return a JSON-serializeable representation of this node.
    */
    toJSON() {
      let obj = { type: this.type.name };
      for (let _ in this.attrs) {
        obj.attrs = this.attrs;
        break;
      }
      if (this.content.size)
        obj.content = this.content.toJSON();
      if (this.marks.length)
        obj.marks = this.marks.map((n) => n.toJSON());
      return obj;
    }
    /**
    Deserialize a node from its JSON representation.
    */
    static fromJSON(schema, json) {
      if (!json)
        throw new RangeError("Invalid input for Node.fromJSON");
      let marks = void 0;
      if (json.marks) {
        if (!Array.isArray(json.marks))
          throw new RangeError("Invalid mark data for Node.fromJSON");
        marks = json.marks.map(schema.markFromJSON);
      }
      if (json.type == "text") {
        if (typeof json.text != "string")
          throw new RangeError("Invalid text node in JSON");
        return schema.text(json.text, marks);
      }
      let content = Fragment.fromJSON(schema, json.content);
      let node = schema.nodeType(json.type).create(json.attrs, content, marks);
      node.type.checkAttrs(node.attrs);
      return node;
    }
  };
  Node$1.prototype.text = void 0;
  class TextNode extends Node$1 {
    /**
    @internal
    */
    constructor(type, attrs, content, marks) {
      super(type, attrs, null, marks);
      if (!content)
        throw new RangeError("Empty text nodes are not allowed");
      this.text = content;
    }
    toString() {
      if (this.type.spec.toDebugString)
        return this.type.spec.toDebugString(this);
      return wrapMarks(this.marks, JSON.stringify(this.text));
    }
    get textContent() {
      return this.text;
    }
    textBetween(from, to) {
      return this.text.slice(from, to);
    }
    get nodeSize() {
      return this.text.length;
    }
    mark(marks) {
      return marks == this.marks ? this : new TextNode(this.type, this.attrs, this.text, marks);
    }
    withText(text) {
      if (text == this.text)
        return this;
      return new TextNode(this.type, this.attrs, text, this.marks);
    }
    cut(from = 0, to = this.text.length) {
      if (from == 0 && to == this.text.length)
        return this;
      return this.withText(this.text.slice(from, to));
    }
    eq(other) {
      return this.sameMarkup(other) && this.text == other.text;
    }
    toJSON() {
      let base2 = super.toJSON();
      base2.text = this.text;
      return base2;
    }
  }
  function wrapMarks(marks, str) {
    for (let i2 = marks.length - 1; i2 >= 0; i2--)
      str = marks[i2].type.name + "(" + str + ")";
    return str;
  }
  class ContentMatch {
    /**
    @internal
    */
    constructor(validEnd) {
      this.validEnd = validEnd;
      this.next = [];
      this.wrapCache = [];
    }
    /**
    @internal
    */
    static parse(string2, nodeTypes) {
      let stream = new TokenStream(string2, nodeTypes);
      if (stream.next == null)
        return ContentMatch.empty;
      let expr = parseExpr(stream);
      if (stream.next)
        stream.err("Unexpected trailing text");
      let match = dfa(nfa(expr));
      checkForDeadEnds(match, stream);
      return match;
    }
    /**
    Match a node type, returning a match after that node if
    successful.
    */
    matchType(type) {
      for (let i2 = 0; i2 < this.next.length; i2++)
        if (this.next[i2].type == type)
          return this.next[i2].next;
      return null;
    }
    /**
    Try to match a fragment. Returns the resulting match when
    successful.
    */
    matchFragment(frag, start = 0, end = frag.childCount) {
      let cur = this;
      for (let i2 = start; cur && i2 < end; i2++)
        cur = cur.matchType(frag.child(i2).type);
      return cur;
    }
    /**
    @internal
    */
    get inlineContent() {
      return this.next.length != 0 && this.next[0].type.isInline;
    }
    /**
    Get the first matching node type at this match position that can
    be generated.
    */
    get defaultType() {
      for (let i2 = 0; i2 < this.next.length; i2++) {
        let { type } = this.next[i2];
        if (!(type.isText || type.hasRequiredAttrs()))
          return type;
      }
      return null;
    }
    /**
    @internal
    */
    compatible(other) {
      for (let i2 = 0; i2 < this.next.length; i2++)
        for (let j = 0; j < other.next.length; j++)
          if (this.next[i2].type == other.next[j].type)
            return true;
      return false;
    }
    /**
    Try to match the given fragment, and if that fails, see if it can
    be made to match by inserting nodes in front of it. When
    successful, return a fragment of inserted nodes (which may be
    empty if nothing had to be inserted). When `toEnd` is true, only
    return a fragment if the resulting match goes to the end of the
    content expression.
    */
    fillBefore(after, toEnd = false, startIndex = 0) {
      let seen = [this];
      function search(match, types) {
        let finished = match.matchFragment(after, startIndex);
        if (finished && (!toEnd || finished.validEnd))
          return Fragment.from(types.map((tp) => tp.createAndFill()));
        for (let i2 = 0; i2 < match.next.length; i2++) {
          let { type, next } = match.next[i2];
          if (!(type.isText || type.hasRequiredAttrs()) && seen.indexOf(next) == -1) {
            seen.push(next);
            let found2 = search(next, types.concat(type));
            if (found2)
              return found2;
          }
        }
        return null;
      }
      return search(this, []);
    }
    /**
    Find a set of wrapping node types that would allow a node of the
    given type to appear at this position. The result may be empty
    (when it fits directly) and will be null when no such wrapping
    exists.
    */
    findWrapping(target) {
      for (let i2 = 0; i2 < this.wrapCache.length; i2 += 2)
        if (this.wrapCache[i2] == target)
          return this.wrapCache[i2 + 1];
      let computed = this.computeWrapping(target);
      this.wrapCache.push(target, computed);
      return computed;
    }
    /**
    @internal
    */
    computeWrapping(target) {
      let seen = /* @__PURE__ */ Object.create(null), active = [{ match: this, type: null, via: null }];
      while (active.length) {
        let current = active.shift(), match = current.match;
        if (match.matchType(target)) {
          let result = [];
          for (let obj = current; obj.type; obj = obj.via)
            result.push(obj.type);
          return result.reverse();
        }
        for (let i2 = 0; i2 < match.next.length; i2++) {
          let { type, next } = match.next[i2];
          if (!type.isLeaf && !type.hasRequiredAttrs() && !(type.name in seen) && (!current.type || next.validEnd)) {
            active.push({ match: type.contentMatch, type, via: current });
            seen[type.name] = true;
          }
        }
      }
      return null;
    }
    /**
    The number of outgoing edges this node has in the finite
    automaton that describes the content expression.
    */
    get edgeCount() {
      return this.next.length;
    }
    /**
    Get the _n_​th outgoing edge from this node in the finite
    automaton that describes the content expression.
    */
    edge(n) {
      if (n >= this.next.length)
        throw new RangeError(`There's no ${n}th edge in this content match`);
      return this.next[n];
    }
    /**
    @internal
    */
    toString() {
      let seen = [];
      function scan(m) {
        seen.push(m);
        for (let i2 = 0; i2 < m.next.length; i2++)
          if (seen.indexOf(m.next[i2].next) == -1)
            scan(m.next[i2].next);
      }
      scan(this);
      return seen.map((m, i2) => {
        let out = i2 + (m.validEnd ? "*" : " ") + " ";
        for (let i3 = 0; i3 < m.next.length; i3++)
          out += (i3 ? ", " : "") + m.next[i3].type.name + "->" + seen.indexOf(m.next[i3].next);
        return out;
      }).join("\n");
    }
  }
  ContentMatch.empty = new ContentMatch(true);
  class TokenStream {
    constructor(string2, nodeTypes) {
      this.string = string2;
      this.nodeTypes = nodeTypes;
      this.inline = null;
      this.pos = 0;
      this.tokens = string2.split(/\s*(?=\b|\W|$)/);
      if (this.tokens[this.tokens.length - 1] == "")
        this.tokens.pop();
      if (this.tokens[0] == "")
        this.tokens.shift();
    }
    get next() {
      return this.tokens[this.pos];
    }
    eat(tok) {
      return this.next == tok && (this.pos++ || true);
    }
    err(str) {
      throw new SyntaxError(str + " (in content expression '" + this.string + "')");
    }
  }
  function parseExpr(stream) {
    let exprs = [];
    do {
      exprs.push(parseExprSeq(stream));
    } while (stream.eat("|"));
    return exprs.length == 1 ? exprs[0] : { type: "choice", exprs };
  }
  function parseExprSeq(stream) {
    let exprs = [];
    do {
      exprs.push(parseExprSubscript(stream));
    } while (stream.next && stream.next != ")" && stream.next != "|");
    return exprs.length == 1 ? exprs[0] : { type: "seq", exprs };
  }
  function parseExprSubscript(stream) {
    let expr = parseExprAtom(stream);
    for (; ; ) {
      if (stream.eat("+"))
        expr = { type: "plus", expr };
      else if (stream.eat("*"))
        expr = { type: "star", expr };
      else if (stream.eat("?"))
        expr = { type: "opt", expr };
      else if (stream.eat("{"))
        expr = parseExprRange(stream, expr);
      else
        break;
    }
    return expr;
  }
  function parseNum(stream) {
    if (/\D/.test(stream.next))
      stream.err("Expected number, got '" + stream.next + "'");
    let result = Number(stream.next);
    stream.pos++;
    return result;
  }
  function parseExprRange(stream, expr) {
    let min = parseNum(stream), max = min;
    if (stream.eat(",")) {
      if (stream.next != "}")
        max = parseNum(stream);
      else
        max = -1;
    }
    if (!stream.eat("}"))
      stream.err("Unclosed braced range");
    return { type: "range", min, max, expr };
  }
  function resolveName(stream, name) {
    let types = stream.nodeTypes, type = types[name];
    if (type)
      return [type];
    let result = [];
    for (let typeName in types) {
      let type2 = types[typeName];
      if (type2.isInGroup(name))
        result.push(type2);
    }
    if (result.length == 0)
      stream.err("No node type or group '" + name + "' found");
    return result;
  }
  function parseExprAtom(stream) {
    if (stream.eat("(")) {
      let expr = parseExpr(stream);
      if (!stream.eat(")"))
        stream.err("Missing closing paren");
      return expr;
    } else if (!/\W/.test(stream.next)) {
      let exprs = resolveName(stream, stream.next).map((type) => {
        if (stream.inline == null)
          stream.inline = type.isInline;
        else if (stream.inline != type.isInline)
          stream.err("Mixing inline and block content");
        return { type: "name", value: type };
      });
      stream.pos++;
      return exprs.length == 1 ? exprs[0] : { type: "choice", exprs };
    } else {
      stream.err("Unexpected token '" + stream.next + "'");
    }
  }
  function nfa(expr) {
    let nfa2 = [[]];
    connect(compile(expr, 0), node());
    return nfa2;
    function node() {
      return nfa2.push([]) - 1;
    }
    function edge(from, to, term) {
      let edge2 = { term, to };
      nfa2[from].push(edge2);
      return edge2;
    }
    function connect(edges, to) {
      edges.forEach((edge2) => edge2.to = to);
    }
    function compile(expr2, from) {
      if (expr2.type == "choice") {
        return expr2.exprs.reduce((out, expr3) => out.concat(compile(expr3, from)), []);
      } else if (expr2.type == "seq") {
        for (let i2 = 0; ; i2++) {
          let next = compile(expr2.exprs[i2], from);
          if (i2 == expr2.exprs.length - 1)
            return next;
          connect(next, from = node());
        }
      } else if (expr2.type == "star") {
        let loop = node();
        edge(from, loop);
        connect(compile(expr2.expr, loop), loop);
        return [edge(loop)];
      } else if (expr2.type == "plus") {
        let loop = node();
        connect(compile(expr2.expr, from), loop);
        connect(compile(expr2.expr, loop), loop);
        return [edge(loop)];
      } else if (expr2.type == "opt") {
        return [edge(from)].concat(compile(expr2.expr, from));
      } else if (expr2.type == "range") {
        let cur = from;
        for (let i2 = 0; i2 < expr2.min; i2++) {
          let next = node();
          connect(compile(expr2.expr, cur), next);
          cur = next;
        }
        if (expr2.max == -1) {
          connect(compile(expr2.expr, cur), cur);
        } else {
          for (let i2 = expr2.min; i2 < expr2.max; i2++) {
            let next = node();
            edge(cur, next);
            connect(compile(expr2.expr, cur), next);
            cur = next;
          }
        }
        return [edge(cur)];
      } else if (expr2.type == "name") {
        return [edge(from, void 0, expr2.value)];
      } else {
        throw new Error("Unknown expr type");
      }
    }
  }
  function cmp(a2, b2) {
    return b2 - a2;
  }
  function nullFrom(nfa2, node) {
    let result = [];
    scan(node);
    return result.sort(cmp);
    function scan(node2) {
      let edges = nfa2[node2];
      if (edges.length == 1 && !edges[0].term)
        return scan(edges[0].to);
      result.push(node2);
      for (let i2 = 0; i2 < edges.length; i2++) {
        let { term, to } = edges[i2];
        if (!term && result.indexOf(to) == -1)
          scan(to);
      }
    }
  }
  function dfa(nfa2) {
    let labeled = /* @__PURE__ */ Object.create(null);
    return explore(nullFrom(nfa2, 0));
    function explore(states) {
      let out = [];
      states.forEach((node) => {
        nfa2[node].forEach(({ term, to }) => {
          if (!term)
            return;
          let set;
          for (let i2 = 0; i2 < out.length; i2++)
            if (out[i2][0] == term)
              set = out[i2][1];
          nullFrom(nfa2, to).forEach((node2) => {
            if (!set)
              out.push([term, set = []]);
            if (set.indexOf(node2) == -1)
              set.push(node2);
          });
        });
      });
      let state = labeled[states.join(",")] = new ContentMatch(states.indexOf(nfa2.length - 1) > -1);
      for (let i2 = 0; i2 < out.length; i2++) {
        let states2 = out[i2][1].sort(cmp);
        state.next.push({ type: out[i2][0], next: labeled[states2.join(",")] || explore(states2) });
      }
      return state;
    }
  }
  function checkForDeadEnds(match, stream) {
    for (let i2 = 0, work = [match]; i2 < work.length; i2++) {
      let state = work[i2], dead = !state.validEnd, nodes = [];
      for (let j = 0; j < state.next.length; j++) {
        let { type, next } = state.next[j];
        nodes.push(type.name);
        if (dead && !(type.isText || type.hasRequiredAttrs()))
          dead = false;
        if (work.indexOf(next) == -1)
          work.push(next);
      }
      if (dead)
        stream.err("Only non-generatable nodes (" + nodes.join(", ") + ") in a required position (see https://prosemirror.net/docs/guide/#generatable)");
    }
  }
  function defaultAttrs(attrs) {
    let defaults2 = /* @__PURE__ */ Object.create(null);
    for (let attrName in attrs) {
      let attr = attrs[attrName];
      if (!attr.hasDefault)
        return null;
      defaults2[attrName] = attr.default;
    }
    return defaults2;
  }
  function computeAttrs(attrs, value) {
    let built = /* @__PURE__ */ Object.create(null);
    for (let name in attrs) {
      let given = value && value[name];
      if (given === void 0) {
        let attr = attrs[name];
        if (attr.hasDefault)
          given = attr.default;
        else
          throw new RangeError("No value supplied for attribute " + name);
      }
      built[name] = given;
    }
    return built;
  }
  function checkAttrs(attrs, values, type, name) {
    for (let name2 in values)
      if (!(name2 in attrs))
        throw new RangeError(`Unsupported attribute ${name2} for ${type} of type ${name2}`);
    for (let name2 in attrs) {
      let attr = attrs[name2];
      if (attr.validate)
        attr.validate(values[name2]);
    }
  }
  function initAttrs(typeName, attrs) {
    let result = /* @__PURE__ */ Object.create(null);
    if (attrs)
      for (let name in attrs)
        result[name] = new Attribute(typeName, name, attrs[name]);
    return result;
  }
  let NodeType$1 = class NodeType2 {
    /**
    @internal
    */
    constructor(name, schema, spec) {
      this.name = name;
      this.schema = schema;
      this.spec = spec;
      this.markSet = null;
      this.groups = spec.group ? spec.group.split(" ") : [];
      this.attrs = initAttrs(name, spec.attrs);
      this.defaultAttrs = defaultAttrs(this.attrs);
      this.contentMatch = null;
      this.inlineContent = null;
      this.isBlock = !(spec.inline || name == "text");
      this.isText = name == "text";
    }
    /**
    True if this is an inline type.
    */
    get isInline() {
      return !this.isBlock;
    }
    /**
    True if this is a textblock type, a block that contains inline
    content.
    */
    get isTextblock() {
      return this.isBlock && this.inlineContent;
    }
    /**
    True for node types that allow no content.
    */
    get isLeaf() {
      return this.contentMatch == ContentMatch.empty;
    }
    /**
    True when this node is an atom, i.e. when it does not have
    directly editable content.
    */
    get isAtom() {
      return this.isLeaf || !!this.spec.atom;
    }
    /**
    Return true when this node type is part of the given
    [group](https://prosemirror.net/docs/ref/#model.NodeSpec.group).
    */
    isInGroup(group) {
      return this.groups.indexOf(group) > -1;
    }
    /**
    The node type's [whitespace](https://prosemirror.net/docs/ref/#model.NodeSpec.whitespace) option.
    */
    get whitespace() {
      return this.spec.whitespace || (this.spec.code ? "pre" : "normal");
    }
    /**
    Tells you whether this node type has any required attributes.
    */
    hasRequiredAttrs() {
      for (let n in this.attrs)
        if (this.attrs[n].isRequired)
          return true;
      return false;
    }
    /**
    Indicates whether this node allows some of the same content as
    the given node type.
    */
    compatibleContent(other) {
      return this == other || this.contentMatch.compatible(other.contentMatch);
    }
    /**
    @internal
    */
    computeAttrs(attrs) {
      if (!attrs && this.defaultAttrs)
        return this.defaultAttrs;
      else
        return computeAttrs(this.attrs, attrs);
    }
    /**
    Create a `Node` of this type. The given attributes are
    checked and defaulted (you can pass `null` to use the type's
    defaults entirely, if no required attributes exist). `content`
    may be a `Fragment`, a node, an array of nodes, or
    `null`. Similarly `marks` may be `null` to default to the empty
    set of marks.
    */
    create(attrs = null, content, marks) {
      if (this.isText)
        throw new Error("NodeType.create can't construct text nodes");
      return new Node$1(this, this.computeAttrs(attrs), Fragment.from(content), Mark$1.setFrom(marks));
    }
    /**
    Like [`create`](https://prosemirror.net/docs/ref/#model.NodeType.create), but check the given content
    against the node type's content restrictions, and throw an error
    if it doesn't match.
    */
    createChecked(attrs = null, content, marks) {
      content = Fragment.from(content);
      this.checkContent(content);
      return new Node$1(this, this.computeAttrs(attrs), content, Mark$1.setFrom(marks));
    }
    /**
    Like [`create`](https://prosemirror.net/docs/ref/#model.NodeType.create), but see if it is
    necessary to add nodes to the start or end of the given fragment
    to make it fit the node. If no fitting wrapping can be found,
    return null. Note that, due to the fact that required nodes can
    always be created, this will always succeed if you pass null or
    `Fragment.empty` as content.
    */
    createAndFill(attrs = null, content, marks) {
      attrs = this.computeAttrs(attrs);
      content = Fragment.from(content);
      if (content.size) {
        let before = this.contentMatch.fillBefore(content);
        if (!before)
          return null;
        content = before.append(content);
      }
      let matched = this.contentMatch.matchFragment(content);
      let after = matched && matched.fillBefore(Fragment.empty, true);
      if (!after)
        return null;
      return new Node$1(this, attrs, content.append(after), Mark$1.setFrom(marks));
    }
    /**
    Returns true if the given fragment is valid content for this node
    type.
    */
    validContent(content) {
      let result = this.contentMatch.matchFragment(content);
      if (!result || !result.validEnd)
        return false;
      for (let i2 = 0; i2 < content.childCount; i2++)
        if (!this.allowsMarks(content.child(i2).marks))
          return false;
      return true;
    }
    /**
    Throws a RangeError if the given fragment is not valid content for this
    node type.
    @internal
    */
    checkContent(content) {
      if (!this.validContent(content))
        throw new RangeError(`Invalid content for node ${this.name}: ${content.toString().slice(0, 50)}`);
    }
    /**
    @internal
    */
    checkAttrs(attrs) {
      checkAttrs(this.attrs, attrs, "node", this.name);
    }
    /**
    Check whether the given mark type is allowed in this node.
    */
    allowsMarkType(markType) {
      return this.markSet == null || this.markSet.indexOf(markType) > -1;
    }
    /**
    Test whether the given set of marks are allowed in this node.
    */
    allowsMarks(marks) {
      if (this.markSet == null)
        return true;
      for (let i2 = 0; i2 < marks.length; i2++)
        if (!this.allowsMarkType(marks[i2].type))
          return false;
      return true;
    }
    /**
    Removes the marks that are not allowed in this node from the given set.
    */
    allowedMarks(marks) {
      if (this.markSet == null)
        return marks;
      let copy2;
      for (let i2 = 0; i2 < marks.length; i2++) {
        if (!this.allowsMarkType(marks[i2].type)) {
          if (!copy2)
            copy2 = marks.slice(0, i2);
        } else if (copy2) {
          copy2.push(marks[i2]);
        }
      }
      return !copy2 ? marks : copy2.length ? copy2 : Mark$1.none;
    }
    /**
    @internal
    */
    static compile(nodes, schema) {
      let result = /* @__PURE__ */ Object.create(null);
      nodes.forEach((name, spec) => result[name] = new NodeType2(name, schema, spec));
      let topType = schema.spec.topNode || "doc";
      if (!result[topType])
        throw new RangeError("Schema is missing its top node type ('" + topType + "')");
      if (!result.text)
        throw new RangeError("Every schema needs a 'text' type");
      for (let _ in result.text.attrs)
        throw new RangeError("The text node type should not have attributes");
      return result;
    }
  };
  function validateType(typeName, attrName, type) {
    let types = type.split("|");
    return (value) => {
      let name = value === null ? "null" : typeof value;
      if (types.indexOf(name) < 0)
        throw new RangeError(`Expected value of type ${types} for attribute ${attrName} on type ${typeName}, got ${name}`);
    };
  }
  class Attribute {
    constructor(typeName, attrName, options) {
      this.hasDefault = Object.prototype.hasOwnProperty.call(options, "default");
      this.default = options.default;
      this.validate = typeof options.validate == "string" ? validateType(typeName, attrName, options.validate) : options.validate;
    }
    get isRequired() {
      return !this.hasDefault;
    }
  }
  class MarkType {
    /**
    @internal
    */
    constructor(name, rank, schema, spec) {
      this.name = name;
      this.rank = rank;
      this.schema = schema;
      this.spec = spec;
      this.attrs = initAttrs(name, spec.attrs);
      this.excluded = null;
      let defaults2 = defaultAttrs(this.attrs);
      this.instance = defaults2 ? new Mark$1(this, defaults2) : null;
    }
    /**
    Create a mark of this type. `attrs` may be `null` or an object
    containing only some of the mark's attributes. The others, if
    they have defaults, will be added.
    */
    create(attrs = null) {
      if (!attrs && this.instance)
        return this.instance;
      return new Mark$1(this, computeAttrs(this.attrs, attrs));
    }
    /**
    @internal
    */
    static compile(marks, schema) {
      let result = /* @__PURE__ */ Object.create(null), rank = 0;
      marks.forEach((name, spec) => result[name] = new MarkType(name, rank++, schema, spec));
      return result;
    }
    /**
    When there is a mark of this type in the given set, a new set
    without it is returned. Otherwise, the input set is returned.
    */
    removeFromSet(set) {
      for (var i2 = 0; i2 < set.length; i2++)
        if (set[i2].type == this) {
          set = set.slice(0, i2).concat(set.slice(i2 + 1));
          i2--;
        }
      return set;
    }
    /**
    Tests whether there is a mark of this type in the given set.
    */
    isInSet(set) {
      for (let i2 = 0; i2 < set.length; i2++)
        if (set[i2].type == this)
          return set[i2];
    }
    /**
    @internal
    */
    checkAttrs(attrs) {
      checkAttrs(this.attrs, attrs, "mark", this.name);
    }
    /**
    Queries whether a given mark type is
    [excluded](https://prosemirror.net/docs/ref/#model.MarkSpec.excludes) by this one.
    */
    excludes(other) {
      return this.excluded.indexOf(other) > -1;
    }
  }
  class Schema {
    /**
    Construct a schema from a schema [specification](https://prosemirror.net/docs/ref/#model.SchemaSpec).
    */
    constructor(spec) {
      this.linebreakReplacement = null;
      this.cached = /* @__PURE__ */ Object.create(null);
      let instanceSpec = this.spec = {};
      for (let prop in spec)
        instanceSpec[prop] = spec[prop];
      instanceSpec.nodes = OrderedMap.from(spec.nodes), instanceSpec.marks = OrderedMap.from(spec.marks || {}), this.nodes = NodeType$1.compile(this.spec.nodes, this);
      this.marks = MarkType.compile(this.spec.marks, this);
      let contentExprCache = /* @__PURE__ */ Object.create(null);
      for (let prop in this.nodes) {
        if (prop in this.marks)
          throw new RangeError(prop + " can not be both a node and a mark");
        let type = this.nodes[prop], contentExpr = type.spec.content || "", markExpr = type.spec.marks;
        type.contentMatch = contentExprCache[contentExpr] || (contentExprCache[contentExpr] = ContentMatch.parse(contentExpr, this.nodes));
        type.inlineContent = type.contentMatch.inlineContent;
        if (type.spec.linebreakReplacement) {
          if (this.linebreakReplacement)
            throw new RangeError("Multiple linebreak nodes defined");
          if (!type.isInline || !type.isLeaf)
            throw new RangeError("Linebreak replacement nodes must be inline leaf nodes");
          this.linebreakReplacement = type;
        }
        type.markSet = markExpr == "_" ? null : markExpr ? gatherMarks(this, markExpr.split(" ")) : markExpr == "" || !type.inlineContent ? [] : null;
      }
      for (let prop in this.marks) {
        let type = this.marks[prop], excl = type.spec.excludes;
        type.excluded = excl == null ? [type] : excl == "" ? [] : gatherMarks(this, excl.split(" "));
      }
      this.nodeFromJSON = this.nodeFromJSON.bind(this);
      this.markFromJSON = this.markFromJSON.bind(this);
      this.topNodeType = this.nodes[this.spec.topNode || "doc"];
      this.cached.wrappings = /* @__PURE__ */ Object.create(null);
    }
    /**
    Create a node in this schema. The `type` may be a string or a
    `NodeType` instance. Attributes will be extended with defaults,
    `content` may be a `Fragment`, `null`, a `Node`, or an array of
    nodes.
    */
    node(type, attrs = null, content, marks) {
      if (typeof type == "string")
        type = this.nodeType(type);
      else if (!(type instanceof NodeType$1))
        throw new RangeError("Invalid node type: " + type);
      else if (type.schema != this)
        throw new RangeError("Node type from different schema used (" + type.name + ")");
      return type.createChecked(attrs, content, marks);
    }
    /**
    Create a text node in the schema. Empty text nodes are not
    allowed.
    */
    text(text, marks) {
      let type = this.nodes.text;
      return new TextNode(type, type.defaultAttrs, text, Mark$1.setFrom(marks));
    }
    /**
    Create a mark with the given type and attributes.
    */
    mark(type, attrs) {
      if (typeof type == "string")
        type = this.marks[type];
      return type.create(attrs);
    }
    /**
    Deserialize a node from its JSON representation. This method is
    bound.
    */
    nodeFromJSON(json) {
      return Node$1.fromJSON(this, json);
    }
    /**
    Deserialize a mark from its JSON representation. This method is
    bound.
    */
    markFromJSON(json) {
      return Mark$1.fromJSON(this, json);
    }
    /**
    @internal
    */
    nodeType(name) {
      let found2 = this.nodes[name];
      if (!found2)
        throw new RangeError("Unknown node type: " + name);
      return found2;
    }
  }
  function gatherMarks(schema, marks) {
    let found2 = [];
    for (let i2 = 0; i2 < marks.length; i2++) {
      let name = marks[i2], mark = schema.marks[name], ok = mark;
      if (mark) {
        found2.push(mark);
      } else {
        for (let prop in schema.marks) {
          let mark2 = schema.marks[prop];
          if (name == "_" || mark2.spec.group && mark2.spec.group.split(" ").indexOf(name) > -1)
            found2.push(ok = mark2);
        }
      }
      if (!ok)
        throw new SyntaxError("Unknown mark type: '" + marks[i2] + "'");
    }
    return found2;
  }
  function isTagRule(rule) {
    return rule.tag != null;
  }
  function isStyleRule(rule) {
    return rule.style != null;
  }
  class DOMParser {
    /**
    Create a parser that targets the given schema, using the given
    parsing rules.
    */
    constructor(schema, rules) {
      this.schema = schema;
      this.rules = rules;
      this.tags = [];
      this.styles = [];
      let matchedStyles = this.matchedStyles = [];
      rules.forEach((rule) => {
        if (isTagRule(rule)) {
          this.tags.push(rule);
        } else if (isStyleRule(rule)) {
          let prop = /[^=]*/.exec(rule.style)[0];
          if (matchedStyles.indexOf(prop) < 0)
            matchedStyles.push(prop);
          this.styles.push(rule);
        }
      });
      this.normalizeLists = !this.tags.some((r) => {
        if (!/^(ul|ol)\b/.test(r.tag) || !r.node)
          return false;
        let node = schema.nodes[r.node];
        return node.contentMatch.matchType(node);
      });
    }
    /**
    Parse a document from the content of a DOM node.
    */
    parse(dom, options = {}) {
      let context = new ParseContext(this, options, false);
      context.addAll(dom, Mark$1.none, options.from, options.to);
      return context.finish();
    }
    /**
    Parses the content of the given DOM node, like
    [`parse`](https://prosemirror.net/docs/ref/#model.DOMParser.parse), and takes the same set of
    options. But unlike that method, which produces a whole node,
    this one returns a slice that is open at the sides, meaning that
    the schema constraints aren't applied to the start of nodes to
    the left of the input and the end of nodes at the end.
    */
    parseSlice(dom, options = {}) {
      let context = new ParseContext(this, options, true);
      context.addAll(dom, Mark$1.none, options.from, options.to);
      return Slice.maxOpen(context.finish());
    }
    /**
    @internal
    */
    matchTag(dom, context, after) {
      for (let i2 = after ? this.tags.indexOf(after) + 1 : 0; i2 < this.tags.length; i2++) {
        let rule = this.tags[i2];
        if (matches(dom, rule.tag) && (rule.namespace === void 0 || dom.namespaceURI == rule.namespace) && (!rule.context || context.matchesContext(rule.context))) {
          if (rule.getAttrs) {
            let result = rule.getAttrs(dom);
            if (result === false)
              continue;
            rule.attrs = result || void 0;
          }
          return rule;
        }
      }
    }
    /**
    @internal
    */
    matchStyle(prop, value, context, after) {
      for (let i2 = after ? this.styles.indexOf(after) + 1 : 0; i2 < this.styles.length; i2++) {
        let rule = this.styles[i2], style2 = rule.style;
        if (style2.indexOf(prop) != 0 || rule.context && !context.matchesContext(rule.context) || // Test that the style string either precisely matches the prop,
        // or has an '=' sign after the prop, followed by the given
        // value.
        style2.length > prop.length && (style2.charCodeAt(prop.length) != 61 || style2.slice(prop.length + 1) != value))
          continue;
        if (rule.getAttrs) {
          let result = rule.getAttrs(value);
          if (result === false)
            continue;
          rule.attrs = result || void 0;
        }
        return rule;
      }
    }
    /**
    @internal
    */
    static schemaRules(schema) {
      let result = [];
      function insert(rule) {
        let priority = rule.priority == null ? 50 : rule.priority, i2 = 0;
        for (; i2 < result.length; i2++) {
          let next = result[i2], nextPriority = next.priority == null ? 50 : next.priority;
          if (nextPriority < priority)
            break;
        }
        result.splice(i2, 0, rule);
      }
      for (let name in schema.marks) {
        let rules = schema.marks[name].spec.parseDOM;
        if (rules)
          rules.forEach((rule) => {
            insert(rule = copy(rule));
            if (!(rule.mark || rule.ignore || rule.clearMark))
              rule.mark = name;
          });
      }
      for (let name in schema.nodes) {
        let rules = schema.nodes[name].spec.parseDOM;
        if (rules)
          rules.forEach((rule) => {
            insert(rule = copy(rule));
            if (!(rule.node || rule.ignore || rule.mark))
              rule.node = name;
          });
      }
      return result;
    }
    /**
    Construct a DOM parser using the parsing rules listed in a
    schema's [node specs](https://prosemirror.net/docs/ref/#model.NodeSpec.parseDOM), reordered by
    [priority](https://prosemirror.net/docs/ref/#model.ParseRule.priority).
    */
    static fromSchema(schema) {
      return schema.cached.domParser || (schema.cached.domParser = new DOMParser(schema, DOMParser.schemaRules(schema)));
    }
  }
  const blockTags = {
    address: true,
    article: true,
    aside: true,
    blockquote: true,
    canvas: true,
    dd: true,
    div: true,
    dl: true,
    fieldset: true,
    figcaption: true,
    figure: true,
    footer: true,
    form: true,
    h1: true,
    h2: true,
    h3: true,
    h4: true,
    h5: true,
    h6: true,
    header: true,
    hgroup: true,
    hr: true,
    li: true,
    noscript: true,
    ol: true,
    output: true,
    p: true,
    pre: true,
    section: true,
    table: true,
    tfoot: true,
    ul: true
  };
  const ignoreTags = {
    head: true,
    noscript: true,
    object: true,
    script: true,
    style: true,
    title: true
  };
  const listTags = { ol: true, ul: true };
  const OPT_PRESERVE_WS = 1, OPT_PRESERVE_WS_FULL = 2, OPT_OPEN_LEFT = 4;
  function wsOptionsFor(type, preserveWhitespace, base2) {
    if (preserveWhitespace != null)
      return (preserveWhitespace ? OPT_PRESERVE_WS : 0) | (preserveWhitespace === "full" ? OPT_PRESERVE_WS_FULL : 0);
    return type && type.whitespace == "pre" ? OPT_PRESERVE_WS | OPT_PRESERVE_WS_FULL : base2 & ~OPT_OPEN_LEFT;
  }
  class NodeContext {
    constructor(type, attrs, marks, solid, match, options) {
      this.type = type;
      this.attrs = attrs;
      this.marks = marks;
      this.solid = solid;
      this.options = options;
      this.content = [];
      this.activeMarks = Mark$1.none;
      this.match = match || (options & OPT_OPEN_LEFT ? null : type.contentMatch);
    }
    findWrapping(node) {
      if (!this.match) {
        if (!this.type)
          return [];
        let fill = this.type.contentMatch.fillBefore(Fragment.from(node));
        if (fill) {
          this.match = this.type.contentMatch.matchFragment(fill);
        } else {
          let start = this.type.contentMatch, wrap2;
          if (wrap2 = start.findWrapping(node.type)) {
            this.match = start;
            return wrap2;
          } else {
            return null;
          }
        }
      }
      return this.match.findWrapping(node.type);
    }
    finish(openEnd) {
      if (!(this.options & OPT_PRESERVE_WS)) {
        let last = this.content[this.content.length - 1], m;
        if (last && last.isText && (m = /[ \t\r\n\u000c]+$/.exec(last.text))) {
          let text = last;
          if (last.text.length == m[0].length)
            this.content.pop();
          else
            this.content[this.content.length - 1] = text.withText(text.text.slice(0, text.text.length - m[0].length));
        }
      }
      let content = Fragment.from(this.content);
      if (!openEnd && this.match)
        content = content.append(this.match.fillBefore(Fragment.empty, true));
      return this.type ? this.type.create(this.attrs, content, this.marks) : content;
    }
    inlineContext(node) {
      if (this.type)
        return this.type.inlineContent;
      if (this.content.length)
        return this.content[0].isInline;
      return node.parentNode && !blockTags.hasOwnProperty(node.parentNode.nodeName.toLowerCase());
    }
  }
  class ParseContext {
    constructor(parser, options, isOpen) {
      this.parser = parser;
      this.options = options;
      this.isOpen = isOpen;
      this.open = 0;
      this.localPreserveWS = false;
      let topNode = options.topNode, topContext;
      let topOptions = wsOptionsFor(null, options.preserveWhitespace, 0) | (isOpen ? OPT_OPEN_LEFT : 0);
      if (topNode)
        topContext = new NodeContext(topNode.type, topNode.attrs, Mark$1.none, true, options.topMatch || topNode.type.contentMatch, topOptions);
      else if (isOpen)
        topContext = new NodeContext(null, null, Mark$1.none, true, null, topOptions);
      else
        topContext = new NodeContext(parser.schema.topNodeType, null, Mark$1.none, true, null, topOptions);
      this.nodes = [topContext];
      this.find = options.findPositions;
      this.needsBlock = false;
    }
    get top() {
      return this.nodes[this.open];
    }
    // Add a DOM node to the content. Text is inserted as text node,
    // otherwise, the node is passed to `addElement` or, if it has a
    // `style` attribute, `addElementWithStyles`.
    addDOM(dom, marks) {
      if (dom.nodeType == 3)
        this.addTextNode(dom, marks);
      else if (dom.nodeType == 1)
        this.addElement(dom, marks);
    }
    addTextNode(dom, marks) {
      let value = dom.nodeValue;
      let top = this.top, preserveWS = top.options & OPT_PRESERVE_WS_FULL ? "full" : this.localPreserveWS || (top.options & OPT_PRESERVE_WS) > 0;
      if (preserveWS === "full" || top.inlineContext(dom) || /[^ \t\r\n\u000c]/.test(value)) {
        if (!preserveWS) {
          value = value.replace(/[ \t\r\n\u000c]+/g, " ");
          if (/^[ \t\r\n\u000c]/.test(value) && this.open == this.nodes.length - 1) {
            let nodeBefore = top.content[top.content.length - 1];
            let domNodeBefore = dom.previousSibling;
            if (!nodeBefore || domNodeBefore && domNodeBefore.nodeName == "BR" || nodeBefore.isText && /[ \t\r\n\u000c]$/.test(nodeBefore.text))
              value = value.slice(1);
          }
        } else if (preserveWS !== "full") {
          value = value.replace(/\r?\n|\r/g, " ");
        } else {
          value = value.replace(/\r\n?/g, "\n");
        }
        if (value)
          this.insertNode(this.parser.schema.text(value), marks);
        this.findInText(dom);
      } else {
        this.findInside(dom);
      }
    }
    // Try to find a handler for the given tag and use that to parse. If
    // none is found, the element's content nodes are added directly.
    addElement(dom, marks, matchAfter) {
      let outerWS = this.localPreserveWS, top = this.top;
      if (dom.tagName == "PRE" || /pre/.test(dom.style && dom.style.whiteSpace))
        this.localPreserveWS = true;
      let name = dom.nodeName.toLowerCase(), ruleID;
      if (listTags.hasOwnProperty(name) && this.parser.normalizeLists)
        normalizeList(dom);
      let rule = this.options.ruleFromNode && this.options.ruleFromNode(dom) || (ruleID = this.parser.matchTag(dom, this, matchAfter));
      out: if (rule ? rule.ignore : ignoreTags.hasOwnProperty(name)) {
        this.findInside(dom);
        this.ignoreFallback(dom, marks);
      } else if (!rule || rule.skip || rule.closeParent) {
        if (rule && rule.closeParent)
          this.open = Math.max(0, this.open - 1);
        else if (rule && rule.skip.nodeType)
          dom = rule.skip;
        let sync, oldNeedsBlock = this.needsBlock;
        if (blockTags.hasOwnProperty(name)) {
          if (top.content.length && top.content[0].isInline && this.open) {
            this.open--;
            top = this.top;
          }
          sync = true;
          if (!top.type)
            this.needsBlock = true;
        } else if (!dom.firstChild) {
          this.leafFallback(dom, marks);
          break out;
        }
        let innerMarks = rule && rule.skip ? marks : this.readStyles(dom, marks);
        if (innerMarks)
          this.addAll(dom, innerMarks);
        if (sync)
          this.sync(top);
        this.needsBlock = oldNeedsBlock;
      } else {
        let innerMarks = this.readStyles(dom, marks);
        if (innerMarks)
          this.addElementByRule(dom, rule, innerMarks, rule.consuming === false ? ruleID : void 0);
      }
      this.localPreserveWS = outerWS;
    }
    // Called for leaf DOM nodes that would otherwise be ignored
    leafFallback(dom, marks) {
      if (dom.nodeName == "BR" && this.top.type && this.top.type.inlineContent)
        this.addTextNode(dom.ownerDocument.createTextNode("\n"), marks);
    }
    // Called for ignored nodes
    ignoreFallback(dom, marks) {
      if (dom.nodeName == "BR" && (!this.top.type || !this.top.type.inlineContent))
        this.findPlace(this.parser.schema.text("-"), marks);
    }
    // Run any style parser associated with the node's styles. Either
    // return an updated array of marks, or null to indicate some of the
    // styles had a rule with `ignore` set.
    readStyles(dom, marks) {
      let styles = dom.style;
      if (styles && styles.length)
        for (let i2 = 0; i2 < this.parser.matchedStyles.length; i2++) {
          let name = this.parser.matchedStyles[i2], value = styles.getPropertyValue(name);
          if (value)
            for (let after = void 0; ; ) {
              let rule = this.parser.matchStyle(name, value, this, after);
              if (!rule)
                break;
              if (rule.ignore)
                return null;
              if (rule.clearMark)
                marks = marks.filter((m) => !rule.clearMark(m));
              else
                marks = marks.concat(this.parser.schema.marks[rule.mark].create(rule.attrs));
              if (rule.consuming === false)
                after = rule;
              else
                break;
            }
        }
      return marks;
    }
    // Look up a handler for the given node. If none are found, return
    // false. Otherwise, apply it, use its return value to drive the way
    // the node's content is wrapped, and return true.
    addElementByRule(dom, rule, marks, continueAfter) {
      let sync, nodeType;
      if (rule.node) {
        nodeType = this.parser.schema.nodes[rule.node];
        if (!nodeType.isLeaf) {
          let inner = this.enter(nodeType, rule.attrs || null, marks, rule.preserveWhitespace);
          if (inner) {
            sync = true;
            marks = inner;
          }
        } else if (!this.insertNode(nodeType.create(rule.attrs), marks)) {
          this.leafFallback(dom, marks);
        }
      } else {
        let markType = this.parser.schema.marks[rule.mark];
        marks = marks.concat(markType.create(rule.attrs));
      }
      let startIn = this.top;
      if (nodeType && nodeType.isLeaf) {
        this.findInside(dom);
      } else if (continueAfter) {
        this.addElement(dom, marks, continueAfter);
      } else if (rule.getContent) {
        this.findInside(dom);
        rule.getContent(dom, this.parser.schema).forEach((node) => this.insertNode(node, marks));
      } else {
        let contentDOM = dom;
        if (typeof rule.contentElement == "string")
          contentDOM = dom.querySelector(rule.contentElement);
        else if (typeof rule.contentElement == "function")
          contentDOM = rule.contentElement(dom);
        else if (rule.contentElement)
          contentDOM = rule.contentElement;
        this.findAround(dom, contentDOM, true);
        this.addAll(contentDOM, marks);
        this.findAround(dom, contentDOM, false);
      }
      if (sync && this.sync(startIn))
        this.open--;
    }
    // Add all child nodes between `startIndex` and `endIndex` (or the
    // whole node, if not given). If `sync` is passed, use it to
    // synchronize after every block element.
    addAll(parent, marks, startIndex, endIndex) {
      let index = startIndex || 0;
      for (let dom = startIndex ? parent.childNodes[startIndex] : parent.firstChild, end = endIndex == null ? null : parent.childNodes[endIndex]; dom != end; dom = dom.nextSibling, ++index) {
        this.findAtPoint(parent, index);
        this.addDOM(dom, marks);
      }
      this.findAtPoint(parent, index);
    }
    // Try to find a way to fit the given node type into the current
    // context. May add intermediate wrappers and/or leave non-solid
    // nodes that we're in.
    findPlace(node, marks) {
      let route, sync;
      for (let depth = this.open; depth >= 0; depth--) {
        let cx = this.nodes[depth];
        let found2 = cx.findWrapping(node);
        if (found2 && (!route || route.length > found2.length)) {
          route = found2;
          sync = cx;
          if (!found2.length)
            break;
        }
        if (cx.solid)
          break;
      }
      if (!route)
        return null;
      this.sync(sync);
      for (let i2 = 0; i2 < route.length; i2++)
        marks = this.enterInner(route[i2], null, marks, false);
      return marks;
    }
    // Try to insert the given node, adjusting the context when needed.
    insertNode(node, marks) {
      if (node.isInline && this.needsBlock && !this.top.type) {
        let block = this.textblockFromContext();
        if (block)
          marks = this.enterInner(block, null, marks);
      }
      let innerMarks = this.findPlace(node, marks);
      if (innerMarks) {
        this.closeExtra();
        let top = this.top;
        if (top.match)
          top.match = top.match.matchType(node.type);
        let nodeMarks = Mark$1.none;
        for (let m of innerMarks.concat(node.marks))
          if (top.type ? top.type.allowsMarkType(m.type) : markMayApply(m.type, node.type))
            nodeMarks = m.addToSet(nodeMarks);
        top.content.push(node.mark(nodeMarks));
        return true;
      }
      return false;
    }
    // Try to start a node of the given type, adjusting the context when
    // necessary.
    enter(type, attrs, marks, preserveWS) {
      let innerMarks = this.findPlace(type.create(attrs), marks);
      if (innerMarks)
        innerMarks = this.enterInner(type, attrs, marks, true, preserveWS);
      return innerMarks;
    }
    // Open a node of the given type
    enterInner(type, attrs, marks, solid = false, preserveWS) {
      this.closeExtra();
      let top = this.top;
      top.match = top.match && top.match.matchType(type);
      let options = wsOptionsFor(type, preserveWS, top.options);
      if (top.options & OPT_OPEN_LEFT && top.content.length == 0)
        options |= OPT_OPEN_LEFT;
      let applyMarks = Mark$1.none;
      marks = marks.filter((m) => {
        if (top.type ? top.type.allowsMarkType(m.type) : markMayApply(m.type, type)) {
          applyMarks = m.addToSet(applyMarks);
          return false;
        }
        return true;
      });
      this.nodes.push(new NodeContext(type, attrs, applyMarks, solid, null, options));
      this.open++;
      return marks;
    }
    // Make sure all nodes above this.open are finished and added to
    // their parents
    closeExtra(openEnd = false) {
      let i2 = this.nodes.length - 1;
      if (i2 > this.open) {
        for (; i2 > this.open; i2--)
          this.nodes[i2 - 1].content.push(this.nodes[i2].finish(openEnd));
        this.nodes.length = this.open + 1;
      }
    }
    finish() {
      this.open = 0;
      this.closeExtra(this.isOpen);
      return this.nodes[0].finish(!!(this.isOpen || this.options.topOpen));
    }
    sync(to) {
      for (let i2 = this.open; i2 >= 0; i2--) {
        if (this.nodes[i2] == to) {
          this.open = i2;
          return true;
        } else if (this.localPreserveWS) {
          this.nodes[i2].options |= OPT_PRESERVE_WS;
        }
      }
      return false;
    }
    get currentPos() {
      this.closeExtra();
      let pos = 0;
      for (let i2 = this.open; i2 >= 0; i2--) {
        let content = this.nodes[i2].content;
        for (let j = content.length - 1; j >= 0; j--)
          pos += content[j].nodeSize;
        if (i2)
          pos++;
      }
      return pos;
    }
    findAtPoint(parent, offset) {
      if (this.find)
        for (let i2 = 0; i2 < this.find.length; i2++) {
          if (this.find[i2].node == parent && this.find[i2].offset == offset)
            this.find[i2].pos = this.currentPos;
        }
    }
    findInside(parent) {
      if (this.find)
        for (let i2 = 0; i2 < this.find.length; i2++) {
          if (this.find[i2].pos == null && parent.nodeType == 1 && parent.contains(this.find[i2].node))
            this.find[i2].pos = this.currentPos;
        }
    }
    findAround(parent, content, before) {
      if (parent != content && this.find)
        for (let i2 = 0; i2 < this.find.length; i2++) {
          if (this.find[i2].pos == null && parent.nodeType == 1 && parent.contains(this.find[i2].node)) {
            let pos = content.compareDocumentPosition(this.find[i2].node);
            if (pos & (before ? 2 : 4))
              this.find[i2].pos = this.currentPos;
          }
        }
    }
    findInText(textNode) {
      if (this.find)
        for (let i2 = 0; i2 < this.find.length; i2++) {
          if (this.find[i2].node == textNode)
            this.find[i2].pos = this.currentPos - (textNode.nodeValue.length - this.find[i2].offset);
        }
    }
    // Determines whether the given context string matches this context.
    matchesContext(context) {
      if (context.indexOf("|") > -1)
        return context.split(/\s*\|\s*/).some(this.matchesContext, this);
      let parts = context.split("/");
      let option = this.options.context;
      let useRoot = !this.isOpen && (!option || option.parent.type == this.nodes[0].type);
      let minDepth = -(option ? option.depth + 1 : 0) + (useRoot ? 0 : 1);
      let match = (i2, depth) => {
        for (; i2 >= 0; i2--) {
          let part = parts[i2];
          if (part == "") {
            if (i2 == parts.length - 1 || i2 == 0)
              continue;
            for (; depth >= minDepth; depth--)
              if (match(i2 - 1, depth))
                return true;
            return false;
          } else {
            let next = depth > 0 || depth == 0 && useRoot ? this.nodes[depth].type : option && depth >= minDepth ? option.node(depth - minDepth).type : null;
            if (!next || next.name != part && !next.isInGroup(part))
              return false;
            depth--;
          }
        }
        return true;
      };
      return match(parts.length - 1, this.open);
    }
    textblockFromContext() {
      let $context = this.options.context;
      if ($context)
        for (let d2 = $context.depth; d2 >= 0; d2--) {
          let deflt = $context.node(d2).contentMatchAt($context.indexAfter(d2)).defaultType;
          if (deflt && deflt.isTextblock && deflt.defaultAttrs)
            return deflt;
        }
      for (let name in this.parser.schema.nodes) {
        let type = this.parser.schema.nodes[name];
        if (type.isTextblock && type.defaultAttrs)
          return type;
      }
    }
  }
  function normalizeList(dom) {
    for (let child = dom.firstChild, prevItem = null; child; child = child.nextSibling) {
      let name = child.nodeType == 1 ? child.nodeName.toLowerCase() : null;
      if (name && listTags.hasOwnProperty(name) && prevItem) {
        prevItem.appendChild(child);
        child = prevItem;
      } else if (name == "li") {
        prevItem = child;
      } else if (name) {
        prevItem = null;
      }
    }
  }
  function matches(dom, selector) {
    return (dom.matches || dom.msMatchesSelector || dom.webkitMatchesSelector || dom.mozMatchesSelector).call(dom, selector);
  }
  function copy(obj) {
    let copy2 = {};
    for (let prop in obj)
      copy2[prop] = obj[prop];
    return copy2;
  }
  function markMayApply(markType, nodeType) {
    let nodes = nodeType.schema.nodes;
    for (let name in nodes) {
      let parent = nodes[name];
      if (!parent.allowsMarkType(markType))
        continue;
      let seen = [], scan = (match) => {
        seen.push(match);
        for (let i2 = 0; i2 < match.edgeCount; i2++) {
          let { type, next } = match.edge(i2);
          if (type == nodeType)
            return true;
          if (seen.indexOf(next) < 0 && scan(next))
            return true;
        }
      };
      if (scan(parent.contentMatch))
        return true;
    }
  }
  class DOMSerializer {
    /**
    Create a serializer. `nodes` should map node names to functions
    that take a node and return a description of the corresponding
    DOM. `marks` does the same for mark names, but also gets an
    argument that tells it whether the mark's content is block or
    inline content (for typical use, it'll always be inline). A mark
    serializer may be `null` to indicate that marks of that type
    should not be serialized.
    */
    constructor(nodes, marks) {
      this.nodes = nodes;
      this.marks = marks;
    }
    /**
    Serialize the content of this fragment to a DOM fragment. When
    not in the browser, the `document` option, containing a DOM
    document, should be passed so that the serializer can create
    nodes.
    */
    serializeFragment(fragment, options = {}, target) {
      if (!target)
        target = doc$1(options).createDocumentFragment();
      let top = target, active = [];
      fragment.forEach((node) => {
        if (active.length || node.marks.length) {
          let keep = 0, rendered = 0;
          while (keep < active.length && rendered < node.marks.length) {
            let next = node.marks[rendered];
            if (!this.marks[next.type.name]) {
              rendered++;
              continue;
            }
            if (!next.eq(active[keep][0]) || next.type.spec.spanning === false)
              break;
            keep++;
            rendered++;
          }
          while (keep < active.length)
            top = active.pop()[1];
          while (rendered < node.marks.length) {
            let add = node.marks[rendered++];
            let markDOM = this.serializeMark(add, node.isInline, options);
            if (markDOM) {
              active.push([add, top]);
              top.appendChild(markDOM.dom);
              top = markDOM.contentDOM || markDOM.dom;
            }
          }
        }
        top.appendChild(this.serializeNodeInner(node, options));
      });
      return target;
    }
    /**
    @internal
    */
    serializeNodeInner(node, options) {
      let { dom, contentDOM } = renderSpec(doc$1(options), this.nodes[node.type.name](node), null, node.attrs);
      if (contentDOM) {
        if (node.isLeaf)
          throw new RangeError("Content hole not allowed in a leaf node spec");
        this.serializeFragment(node.content, options, contentDOM);
      }
      return dom;
    }
    /**
    Serialize this node to a DOM node. This can be useful when you
    need to serialize a part of a document, as opposed to the whole
    document. To serialize a whole document, use
    [`serializeFragment`](https://prosemirror.net/docs/ref/#model.DOMSerializer.serializeFragment) on
    its [content](https://prosemirror.net/docs/ref/#model.Node.content).
    */
    serializeNode(node, options = {}) {
      let dom = this.serializeNodeInner(node, options);
      for (let i2 = node.marks.length - 1; i2 >= 0; i2--) {
        let wrap2 = this.serializeMark(node.marks[i2], node.isInline, options);
        if (wrap2) {
          (wrap2.contentDOM || wrap2.dom).appendChild(dom);
          dom = wrap2.dom;
        }
      }
      return dom;
    }
    /**
    @internal
    */
    serializeMark(mark, inline, options = {}) {
      let toDOM = this.marks[mark.type.name];
      return toDOM && renderSpec(doc$1(options), toDOM(mark, inline), null, mark.attrs);
    }
    static renderSpec(doc2, structure, xmlNS = null, blockArraysIn) {
      return renderSpec(doc2, structure, xmlNS, blockArraysIn);
    }
    /**
    Build a serializer using the [`toDOM`](https://prosemirror.net/docs/ref/#model.NodeSpec.toDOM)
    properties in a schema's node and mark specs.
    */
    static fromSchema(schema) {
      return schema.cached.domSerializer || (schema.cached.domSerializer = new DOMSerializer(this.nodesFromSchema(schema), this.marksFromSchema(schema)));
    }
    /**
    Gather the serializers in a schema's node specs into an object.
    This can be useful as a base to build a custom serializer from.
    */
    static nodesFromSchema(schema) {
      let result = gatherToDOM(schema.nodes);
      if (!result.text)
        result.text = (node) => node.text;
      return result;
    }
    /**
    Gather the serializers in a schema's mark specs into an object.
    */
    static marksFromSchema(schema) {
      return gatherToDOM(schema.marks);
    }
  }
  function gatherToDOM(obj) {
    let result = {};
    for (let name in obj) {
      let toDOM = obj[name].spec.toDOM;
      if (toDOM)
        result[name] = toDOM;
    }
    return result;
  }
  function doc$1(options) {
    return options.document || window.document;
  }
  const suspiciousAttributeCache = /* @__PURE__ */ new WeakMap();
  function suspiciousAttributes(attrs) {
    let value = suspiciousAttributeCache.get(attrs);
    if (value === void 0)
      suspiciousAttributeCache.set(attrs, value = suspiciousAttributesInner(attrs));
    return value;
  }
  function suspiciousAttributesInner(attrs) {
    let result = null;
    function scan(value) {
      if (value && typeof value == "object") {
        if (Array.isArray(value)) {
          if (typeof value[0] == "string") {
            if (!result)
              result = [];
            result.push(value);
          } else {
            for (let i2 = 0; i2 < value.length; i2++)
              scan(value[i2]);
          }
        } else {
          for (let prop in value)
            scan(value[prop]);
        }
      }
    }
    scan(attrs);
    return result;
  }
  function renderSpec(doc2, structure, xmlNS, blockArraysIn) {
    if (typeof structure == "string")
      return { dom: doc2.createTextNode(structure) };
    if (structure.nodeType != null)
      return { dom: structure };
    if (structure.dom && structure.dom.nodeType != null)
      return structure;
    let tagName = structure[0], suspicious;
    if (typeof tagName != "string")
      throw new RangeError("Invalid array passed to renderSpec");
    if (blockArraysIn && (suspicious = suspiciousAttributes(blockArraysIn)) && suspicious.indexOf(structure) > -1)
      throw new RangeError("Using an array from an attribute object as a DOM spec. This may be an attempted cross site scripting attack.");
    let space = tagName.indexOf(" ");
    if (space > 0) {
      xmlNS = tagName.slice(0, space);
      tagName = tagName.slice(space + 1);
    }
    let contentDOM;
    let dom = xmlNS ? doc2.createElementNS(xmlNS, tagName) : doc2.createElement(tagName);
    let attrs = structure[1], start = 1;
    if (attrs && typeof attrs == "object" && attrs.nodeType == null && !Array.isArray(attrs)) {
      start = 2;
      for (let name in attrs)
        if (attrs[name] != null) {
          let space2 = name.indexOf(" ");
          if (space2 > 0)
            dom.setAttributeNS(name.slice(0, space2), name.slice(space2 + 1), attrs[name]);
          else
            dom.setAttribute(name, attrs[name]);
        }
    }
    for (let i2 = start; i2 < structure.length; i2++) {
      let child = structure[i2];
      if (child === 0) {
        if (i2 < structure.length - 1 || i2 > start)
          throw new RangeError("Content hole must be the only child of its parent node");
        return { dom, contentDOM: dom };
      } else {
        let { dom: inner, contentDOM: innerContent } = renderSpec(doc2, child, xmlNS, blockArraysIn);
        dom.appendChild(inner);
        if (innerContent) {
          if (contentDOM)
            throw new RangeError("Multiple content holes");
          contentDOM = innerContent;
        }
      }
    }
    return { dom, contentDOM };
  }
  const lower16 = 65535;
  const factor16 = Math.pow(2, 16);
  function makeRecover(index, offset) {
    return index + offset * factor16;
  }
  function recoverIndex(value) {
    return value & lower16;
  }
  function recoverOffset(value) {
    return (value - (value & lower16)) / factor16;
  }
  const DEL_BEFORE = 1, DEL_AFTER = 2, DEL_ACROSS = 4, DEL_SIDE = 8;
  class MapResult {
    /**
    @internal
    */
    constructor(pos, delInfo, recover) {
      this.pos = pos;
      this.delInfo = delInfo;
      this.recover = recover;
    }
    /**
    Tells you whether the position was deleted, that is, whether the
    step removed the token on the side queried (via the `assoc`)
    argument from the document.
    */
    get deleted() {
      return (this.delInfo & DEL_SIDE) > 0;
    }
    /**
    Tells you whether the token before the mapped position was deleted.
    */
    get deletedBefore() {
      return (this.delInfo & (DEL_BEFORE | DEL_ACROSS)) > 0;
    }
    /**
    True when the token after the mapped position was deleted.
    */
    get deletedAfter() {
      return (this.delInfo & (DEL_AFTER | DEL_ACROSS)) > 0;
    }
    /**
    Tells whether any of the steps mapped through deletes across the
    position (including both the token before and after the
    position).
    */
    get deletedAcross() {
      return (this.delInfo & DEL_ACROSS) > 0;
    }
  }
  class StepMap {
    /**
    Create a position map. The modifications to the document are
    represented as an array of numbers, in which each group of three
    represents a modified chunk as `[start, oldSize, newSize]`.
    */
    constructor(ranges, inverted = false) {
      this.ranges = ranges;
      this.inverted = inverted;
      if (!ranges.length && StepMap.empty)
        return StepMap.empty;
    }
    /**
    @internal
    */
    recover(value) {
      let diff = 0, index = recoverIndex(value);
      if (!this.inverted)
        for (let i2 = 0; i2 < index; i2++)
          diff += this.ranges[i2 * 3 + 2] - this.ranges[i2 * 3 + 1];
      return this.ranges[index * 3] + diff + recoverOffset(value);
    }
    mapResult(pos, assoc = 1) {
      return this._map(pos, assoc, false);
    }
    map(pos, assoc = 1) {
      return this._map(pos, assoc, true);
    }
    /**
    @internal
    */
    _map(pos, assoc, simple) {
      let diff = 0, oldIndex = this.inverted ? 2 : 1, newIndex = this.inverted ? 1 : 2;
      for (let i2 = 0; i2 < this.ranges.length; i2 += 3) {
        let start = this.ranges[i2] - (this.inverted ? diff : 0);
        if (start > pos)
          break;
        let oldSize = this.ranges[i2 + oldIndex], newSize = this.ranges[i2 + newIndex], end = start + oldSize;
        if (pos <= end) {
          let side = !oldSize ? assoc : pos == start ? -1 : pos == end ? 1 : assoc;
          let result = start + diff + (side < 0 ? 0 : newSize);
          if (simple)
            return result;
          let recover = pos == (assoc < 0 ? start : end) ? null : makeRecover(i2 / 3, pos - start);
          let del = pos == start ? DEL_AFTER : pos == end ? DEL_BEFORE : DEL_ACROSS;
          if (assoc < 0 ? pos != start : pos != end)
            del |= DEL_SIDE;
          return new MapResult(result, del, recover);
        }
        diff += newSize - oldSize;
      }
      return simple ? pos + diff : new MapResult(pos + diff, 0, null);
    }
    /**
    @internal
    */
    touches(pos, recover) {
      let diff = 0, index = recoverIndex(recover);
      let oldIndex = this.inverted ? 2 : 1, newIndex = this.inverted ? 1 : 2;
      for (let i2 = 0; i2 < this.ranges.length; i2 += 3) {
        let start = this.ranges[i2] - (this.inverted ? diff : 0);
        if (start > pos)
          break;
        let oldSize = this.ranges[i2 + oldIndex], end = start + oldSize;
        if (pos <= end && i2 == index * 3)
          return true;
        diff += this.ranges[i2 + newIndex] - oldSize;
      }
      return false;
    }
    /**
    Calls the given function on each of the changed ranges included in
    this map.
    */
    forEach(f) {
      let oldIndex = this.inverted ? 2 : 1, newIndex = this.inverted ? 1 : 2;
      for (let i2 = 0, diff = 0; i2 < this.ranges.length; i2 += 3) {
        let start = this.ranges[i2], oldStart = start - (this.inverted ? diff : 0), newStart = start + (this.inverted ? 0 : diff);
        let oldSize = this.ranges[i2 + oldIndex], newSize = this.ranges[i2 + newIndex];
        f(oldStart, oldStart + oldSize, newStart, newStart + newSize);
        diff += newSize - oldSize;
      }
    }
    /**
    Create an inverted version of this map. The result can be used to
    map positions in the post-step document to the pre-step document.
    */
    invert() {
      return new StepMap(this.ranges, !this.inverted);
    }
    /**
    @internal
    */
    toString() {
      return (this.inverted ? "-" : "") + JSON.stringify(this.ranges);
    }
    /**
    Create a map that moves all positions by offset `n` (which may be
    negative). This can be useful when applying steps meant for a
    sub-document to a larger document, or vice-versa.
    */
    static offset(n) {
      return n == 0 ? StepMap.empty : new StepMap(n < 0 ? [0, -n, 0] : [0, 0, n]);
    }
  }
  StepMap.empty = new StepMap([]);
  class Mapping {
    /**
    Create a new mapping with the given position maps.
    */
    constructor(maps = [], mirror, from = 0, to = maps.length) {
      this.maps = maps;
      this.mirror = mirror;
      this.from = from;
      this.to = to;
    }
    /**
    Create a mapping that maps only through a part of this one.
    */
    slice(from = 0, to = this.maps.length) {
      return new Mapping(this.maps, this.mirror, from, to);
    }
    /**
    @internal
    */
    copy() {
      return new Mapping(this.maps.slice(), this.mirror && this.mirror.slice(), this.from, this.to);
    }
    /**
    Add a step map to the end of this mapping. If `mirrors` is
    given, it should be the index of the step map that is the mirror
    image of this one.
    */
    appendMap(map, mirrors) {
      this.to = this.maps.push(map);
      if (mirrors != null)
        this.setMirror(this.maps.length - 1, mirrors);
    }
    /**
    Add all the step maps in a given mapping to this one (preserving
    mirroring information).
    */
    appendMapping(mapping) {
      for (let i2 = 0, startSize = this.maps.length; i2 < mapping.maps.length; i2++) {
        let mirr = mapping.getMirror(i2);
        this.appendMap(mapping.maps[i2], mirr != null && mirr < i2 ? startSize + mirr : void 0);
      }
    }
    /**
    Finds the offset of the step map that mirrors the map at the
    given offset, in this mapping (as per the second argument to
    `appendMap`).
    */
    getMirror(n) {
      if (this.mirror) {
        for (let i2 = 0; i2 < this.mirror.length; i2++)
          if (this.mirror[i2] == n)
            return this.mirror[i2 + (i2 % 2 ? -1 : 1)];
      }
    }
    /**
    @internal
    */
    setMirror(n, m) {
      if (!this.mirror)
        this.mirror = [];
      this.mirror.push(n, m);
    }
    /**
    Append the inverse of the given mapping to this one.
    */
    appendMappingInverted(mapping) {
      for (let i2 = mapping.maps.length - 1, totalSize = this.maps.length + mapping.maps.length; i2 >= 0; i2--) {
        let mirr = mapping.getMirror(i2);
        this.appendMap(mapping.maps[i2].invert(), mirr != null && mirr > i2 ? totalSize - mirr - 1 : void 0);
      }
    }
    /**
    Create an inverted version of this mapping.
    */
    invert() {
      let inverse = new Mapping();
      inverse.appendMappingInverted(this);
      return inverse;
    }
    /**
    Map a position through this mapping.
    */
    map(pos, assoc = 1) {
      if (this.mirror)
        return this._map(pos, assoc, true);
      for (let i2 = this.from; i2 < this.to; i2++)
        pos = this.maps[i2].map(pos, assoc);
      return pos;
    }
    /**
    Map a position through this mapping, returning a mapping
    result.
    */
    mapResult(pos, assoc = 1) {
      return this._map(pos, assoc, false);
    }
    /**
    @internal
    */
    _map(pos, assoc, simple) {
      let delInfo = 0;
      for (let i2 = this.from; i2 < this.to; i2++) {
        let map = this.maps[i2], result = map.mapResult(pos, assoc);
        if (result.recover != null) {
          let corr = this.getMirror(i2);
          if (corr != null && corr > i2 && corr < this.to) {
            i2 = corr;
            pos = this.maps[corr].recover(result.recover);
            continue;
          }
        }
        delInfo |= result.delInfo;
        pos = result.pos;
      }
      return simple ? pos : new MapResult(pos, delInfo, null);
    }
  }
  const stepsByID = /* @__PURE__ */ Object.create(null);
  class Step {
    /**
    Get the step map that represents the changes made by this step,
    and which can be used to transform between positions in the old
    and the new document.
    */
    getMap() {
      return StepMap.empty;
    }
    /**
    Try to merge this step with another one, to be applied directly
    after it. Returns the merged step when possible, null if the
    steps can't be merged.
    */
    merge(other) {
      return null;
    }
    /**
    Deserialize a step from its JSON representation. Will call
    through to the step class' own implementation of this method.
    */
    static fromJSON(schema, json) {
      if (!json || !json.stepType)
        throw new RangeError("Invalid input for Step.fromJSON");
      let type = stepsByID[json.stepType];
      if (!type)
        throw new RangeError(`No step type ${json.stepType} defined`);
      return type.fromJSON(schema, json);
    }
    /**
    To be able to serialize steps to JSON, each step needs a string
    ID to attach to its JSON representation. Use this method to
    register an ID for your step classes. Try to pick something
    that's unlikely to clash with steps from other modules.
    */
    static jsonID(id, stepClass) {
      if (id in stepsByID)
        throw new RangeError("Duplicate use of step JSON ID " + id);
      stepsByID[id] = stepClass;
      stepClass.prototype.jsonID = id;
      return stepClass;
    }
  }
  class StepResult {
    /**
    @internal
    */
    constructor(doc2, failed) {
      this.doc = doc2;
      this.failed = failed;
    }
    /**
    Create a successful step result.
    */
    static ok(doc2) {
      return new StepResult(doc2, null);
    }
    /**
    Create a failed step result.
    */
    static fail(message) {
      return new StepResult(null, message);
    }
    /**
    Call [`Node.replace`](https://prosemirror.net/docs/ref/#model.Node.replace) with the given
    arguments. Create a successful result if it succeeds, and a
    failed one if it throws a `ReplaceError`.
    */
    static fromReplace(doc2, from, to, slice) {
      try {
        return StepResult.ok(doc2.replace(from, to, slice));
      } catch (e) {
        if (e instanceof ReplaceError)
          return StepResult.fail(e.message);
        throw e;
      }
    }
  }
  function mapFragment(fragment, f, parent) {
    let mapped = [];
    for (let i2 = 0; i2 < fragment.childCount; i2++) {
      let child = fragment.child(i2);
      if (child.content.size)
        child = child.copy(mapFragment(child.content, f, child));
      if (child.isInline)
        child = f(child, parent, i2);
      mapped.push(child);
    }
    return Fragment.fromArray(mapped);
  }
  class AddMarkStep extends Step {
    /**
    Create a mark step.
    */
    constructor(from, to, mark) {
      super();
      this.from = from;
      this.to = to;
      this.mark = mark;
    }
    apply(doc2) {
      let oldSlice = doc2.slice(this.from, this.to), $from = doc2.resolve(this.from);
      let parent = $from.node($from.sharedDepth(this.to));
      let slice = new Slice(mapFragment(oldSlice.content, (node, parent2) => {
        if (!node.isAtom || !parent2.type.allowsMarkType(this.mark.type))
          return node;
        return node.mark(this.mark.addToSet(node.marks));
      }, parent), oldSlice.openStart, oldSlice.openEnd);
      return StepResult.fromReplace(doc2, this.from, this.to, slice);
    }
    invert() {
      return new RemoveMarkStep(this.from, this.to, this.mark);
    }
    map(mapping) {
      let from = mapping.mapResult(this.from, 1), to = mapping.mapResult(this.to, -1);
      if (from.deleted && to.deleted || from.pos >= to.pos)
        return null;
      return new AddMarkStep(from.pos, to.pos, this.mark);
    }
    merge(other) {
      if (other instanceof AddMarkStep && other.mark.eq(this.mark) && this.from <= other.to && this.to >= other.from)
        return new AddMarkStep(Math.min(this.from, other.from), Math.max(this.to, other.to), this.mark);
      return null;
    }
    toJSON() {
      return {
        stepType: "addMark",
        mark: this.mark.toJSON(),
        from: this.from,
        to: this.to
      };
    }
    /**
    @internal
    */
    static fromJSON(schema, json) {
      if (typeof json.from != "number" || typeof json.to != "number")
        throw new RangeError("Invalid input for AddMarkStep.fromJSON");
      return new AddMarkStep(json.from, json.to, schema.markFromJSON(json.mark));
    }
  }
  Step.jsonID("addMark", AddMarkStep);
  class RemoveMarkStep extends Step {
    /**
    Create a mark-removing step.
    */
    constructor(from, to, mark) {
      super();
      this.from = from;
      this.to = to;
      this.mark = mark;
    }
    apply(doc2) {
      let oldSlice = doc2.slice(this.from, this.to);
      let slice = new Slice(mapFragment(oldSlice.content, (node) => {
        return node.mark(this.mark.removeFromSet(node.marks));
      }, doc2), oldSlice.openStart, oldSlice.openEnd);
      return StepResult.fromReplace(doc2, this.from, this.to, slice);
    }
    invert() {
      return new AddMarkStep(this.from, this.to, this.mark);
    }
    map(mapping) {
      let from = mapping.mapResult(this.from, 1), to = mapping.mapResult(this.to, -1);
      if (from.deleted && to.deleted || from.pos >= to.pos)
        return null;
      return new RemoveMarkStep(from.pos, to.pos, this.mark);
    }
    merge(other) {
      if (other instanceof RemoveMarkStep && other.mark.eq(this.mark) && this.from <= other.to && this.to >= other.from)
        return new RemoveMarkStep(Math.min(this.from, other.from), Math.max(this.to, other.to), this.mark);
      return null;
    }
    toJSON() {
      return {
        stepType: "removeMark",
        mark: this.mark.toJSON(),
        from: this.from,
        to: this.to
      };
    }
    /**
    @internal
    */
    static fromJSON(schema, json) {
      if (typeof json.from != "number" || typeof json.to != "number")
        throw new RangeError("Invalid input for RemoveMarkStep.fromJSON");
      return new RemoveMarkStep(json.from, json.to, schema.markFromJSON(json.mark));
    }
  }
  Step.jsonID("removeMark", RemoveMarkStep);
  class AddNodeMarkStep extends Step {
    /**
    Create a node mark step.
    */
    constructor(pos, mark) {
      super();
      this.pos = pos;
      this.mark = mark;
    }
    apply(doc2) {
      let node = doc2.nodeAt(this.pos);
      if (!node)
        return StepResult.fail("No node at mark step's position");
      let updated = node.type.create(node.attrs, null, this.mark.addToSet(node.marks));
      return StepResult.fromReplace(doc2, this.pos, this.pos + 1, new Slice(Fragment.from(updated), 0, node.isLeaf ? 0 : 1));
    }
    invert(doc2) {
      let node = doc2.nodeAt(this.pos);
      if (node) {
        let newSet = this.mark.addToSet(node.marks);
        if (newSet.length == node.marks.length) {
          for (let i2 = 0; i2 < node.marks.length; i2++)
            if (!node.marks[i2].isInSet(newSet))
              return new AddNodeMarkStep(this.pos, node.marks[i2]);
          return new AddNodeMarkStep(this.pos, this.mark);
        }
      }
      return new RemoveNodeMarkStep(this.pos, this.mark);
    }
    map(mapping) {
      let pos = mapping.mapResult(this.pos, 1);
      return pos.deletedAfter ? null : new AddNodeMarkStep(pos.pos, this.mark);
    }
    toJSON() {
      return { stepType: "addNodeMark", pos: this.pos, mark: this.mark.toJSON() };
    }
    /**
    @internal
    */
    static fromJSON(schema, json) {
      if (typeof json.pos != "number")
        throw new RangeError("Invalid input for AddNodeMarkStep.fromJSON");
      return new AddNodeMarkStep(json.pos, schema.markFromJSON(json.mark));
    }
  }
  Step.jsonID("addNodeMark", AddNodeMarkStep);
  class RemoveNodeMarkStep extends Step {
    /**
    Create a mark-removing step.
    */
    constructor(pos, mark) {
      super();
      this.pos = pos;
      this.mark = mark;
    }
    apply(doc2) {
      let node = doc2.nodeAt(this.pos);
      if (!node)
        return StepResult.fail("No node at mark step's position");
      let updated = node.type.create(node.attrs, null, this.mark.removeFromSet(node.marks));
      return StepResult.fromReplace(doc2, this.pos, this.pos + 1, new Slice(Fragment.from(updated), 0, node.isLeaf ? 0 : 1));
    }
    invert(doc2) {
      let node = doc2.nodeAt(this.pos);
      if (!node || !this.mark.isInSet(node.marks))
        return this;
      return new AddNodeMarkStep(this.pos, this.mark);
    }
    map(mapping) {
      let pos = mapping.mapResult(this.pos, 1);
      return pos.deletedAfter ? null : new RemoveNodeMarkStep(pos.pos, this.mark);
    }
    toJSON() {
      return { stepType: "removeNodeMark", pos: this.pos, mark: this.mark.toJSON() };
    }
    /**
    @internal
    */
    static fromJSON(schema, json) {
      if (typeof json.pos != "number")
        throw new RangeError("Invalid input for RemoveNodeMarkStep.fromJSON");
      return new RemoveNodeMarkStep(json.pos, schema.markFromJSON(json.mark));
    }
  }
  Step.jsonID("removeNodeMark", RemoveNodeMarkStep);
  class ReplaceStep extends Step {
    /**
    The given `slice` should fit the 'gap' between `from` and
    `to`—the depths must line up, and the surrounding nodes must be
    able to be joined with the open sides of the slice. When
    `structure` is true, the step will fail if the content between
    from and to is not just a sequence of closing and then opening
    tokens (this is to guard against rebased replace steps
    overwriting something they weren't supposed to).
    */
    constructor(from, to, slice, structure = false) {
      super();
      this.from = from;
      this.to = to;
      this.slice = slice;
      this.structure = structure;
    }
    apply(doc2) {
      if (this.structure && contentBetween(doc2, this.from, this.to))
        return StepResult.fail("Structure replace would overwrite content");
      return StepResult.fromReplace(doc2, this.from, this.to, this.slice);
    }
    getMap() {
      return new StepMap([this.from, this.to - this.from, this.slice.size]);
    }
    invert(doc2) {
      return new ReplaceStep(this.from, this.from + this.slice.size, doc2.slice(this.from, this.to));
    }
    map(mapping) {
      let from = mapping.mapResult(this.from, 1), to = mapping.mapResult(this.to, -1);
      if (from.deletedAcross && to.deletedAcross)
        return null;
      return new ReplaceStep(from.pos, Math.max(from.pos, to.pos), this.slice);
    }
    merge(other) {
      if (!(other instanceof ReplaceStep) || other.structure || this.structure)
        return null;
      if (this.from + this.slice.size == other.from && !this.slice.openEnd && !other.slice.openStart) {
        let slice = this.slice.size + other.slice.size == 0 ? Slice.empty : new Slice(this.slice.content.append(other.slice.content), this.slice.openStart, other.slice.openEnd);
        return new ReplaceStep(this.from, this.to + (other.to - other.from), slice, this.structure);
      } else if (other.to == this.from && !this.slice.openStart && !other.slice.openEnd) {
        let slice = this.slice.size + other.slice.size == 0 ? Slice.empty : new Slice(other.slice.content.append(this.slice.content), other.slice.openStart, this.slice.openEnd);
        return new ReplaceStep(other.from, this.to, slice, this.structure);
      } else {
        return null;
      }
    }
    toJSON() {
      let json = { stepType: "replace", from: this.from, to: this.to };
      if (this.slice.size)
        json.slice = this.slice.toJSON();
      if (this.structure)
        json.structure = true;
      return json;
    }
    /**
    @internal
    */
    static fromJSON(schema, json) {
      if (typeof json.from != "number" || typeof json.to != "number")
        throw new RangeError("Invalid input for ReplaceStep.fromJSON");
      return new ReplaceStep(json.from, json.to, Slice.fromJSON(schema, json.slice), !!json.structure);
    }
  }
  Step.jsonID("replace", ReplaceStep);
  class ReplaceAroundStep extends Step {
    /**
    Create a replace-around step with the given range and gap.
    `insert` should be the point in the slice into which the content
    of the gap should be moved. `structure` has the same meaning as
    it has in the [`ReplaceStep`](https://prosemirror.net/docs/ref/#transform.ReplaceStep) class.
    */
    constructor(from, to, gapFrom, gapTo, slice, insert, structure = false) {
      super();
      this.from = from;
      this.to = to;
      this.gapFrom = gapFrom;
      this.gapTo = gapTo;
      this.slice = slice;
      this.insert = insert;
      this.structure = structure;
    }
    apply(doc2) {
      if (this.structure && (contentBetween(doc2, this.from, this.gapFrom) || contentBetween(doc2, this.gapTo, this.to)))
        return StepResult.fail("Structure gap-replace would overwrite content");
      let gap = doc2.slice(this.gapFrom, this.gapTo);
      if (gap.openStart || gap.openEnd)
        return StepResult.fail("Gap is not a flat range");
      let inserted = this.slice.insertAt(this.insert, gap.content);
      if (!inserted)
        return StepResult.fail("Content does not fit in gap");
      return StepResult.fromReplace(doc2, this.from, this.to, inserted);
    }
    getMap() {
      return new StepMap([
        this.from,
        this.gapFrom - this.from,
        this.insert,
        this.gapTo,
        this.to - this.gapTo,
        this.slice.size - this.insert
      ]);
    }
    invert(doc2) {
      let gap = this.gapTo - this.gapFrom;
      return new ReplaceAroundStep(this.from, this.from + this.slice.size + gap, this.from + this.insert, this.from + this.insert + gap, doc2.slice(this.from, this.to).removeBetween(this.gapFrom - this.from, this.gapTo - this.from), this.gapFrom - this.from, this.structure);
    }
    map(mapping) {
      let from = mapping.mapResult(this.from, 1), to = mapping.mapResult(this.to, -1);
      let gapFrom = this.from == this.gapFrom ? from.pos : mapping.map(this.gapFrom, -1);
      let gapTo = this.to == this.gapTo ? to.pos : mapping.map(this.gapTo, 1);
      if (from.deletedAcross && to.deletedAcross || gapFrom < from.pos || gapTo > to.pos)
        return null;
      return new ReplaceAroundStep(from.pos, to.pos, gapFrom, gapTo, this.slice, this.insert, this.structure);
    }
    toJSON() {
      let json = {
        stepType: "replaceAround",
        from: this.from,
        to: this.to,
        gapFrom: this.gapFrom,
        gapTo: this.gapTo,
        insert: this.insert
      };
      if (this.slice.size)
        json.slice = this.slice.toJSON();
      if (this.structure)
        json.structure = true;
      return json;
    }
    /**
    @internal
    */
    static fromJSON(schema, json) {
      if (typeof json.from != "number" || typeof json.to != "number" || typeof json.gapFrom != "number" || typeof json.gapTo != "number" || typeof json.insert != "number")
        throw new RangeError("Invalid input for ReplaceAroundStep.fromJSON");
      return new ReplaceAroundStep(json.from, json.to, json.gapFrom, json.gapTo, Slice.fromJSON(schema, json.slice), json.insert, !!json.structure);
    }
  }
  Step.jsonID("replaceAround", ReplaceAroundStep);
  function contentBetween(doc2, from, to) {
    let $from = doc2.resolve(from), dist2 = to - from, depth = $from.depth;
    while (dist2 > 0 && depth > 0 && $from.indexAfter(depth) == $from.node(depth).childCount) {
      depth--;
      dist2--;
    }
    if (dist2 > 0) {
      let next = $from.node(depth).maybeChild($from.indexAfter(depth));
      while (dist2 > 0) {
        if (!next || next.isLeaf)
          return true;
        next = next.firstChild;
        dist2--;
      }
    }
    return false;
  }
  function addMark(tr2, from, to, mark) {
    let removed = [], added = [];
    let removing, adding;
    tr2.doc.nodesBetween(from, to, (node, pos, parent) => {
      if (!node.isInline)
        return;
      let marks = node.marks;
      if (!mark.isInSet(marks) && parent.type.allowsMarkType(mark.type)) {
        let start = Math.max(pos, from), end = Math.min(pos + node.nodeSize, to);
        let newSet = mark.addToSet(marks);
        for (let i2 = 0; i2 < marks.length; i2++) {
          if (!marks[i2].isInSet(newSet)) {
            if (removing && removing.to == start && removing.mark.eq(marks[i2]))
              removing.to = end;
            else
              removed.push(removing = new RemoveMarkStep(start, end, marks[i2]));
          }
        }
        if (adding && adding.to == start)
          adding.to = end;
        else
          added.push(adding = new AddMarkStep(start, end, mark));
      }
    });
    removed.forEach((s) => tr2.step(s));
    added.forEach((s) => tr2.step(s));
  }
  function removeMark(tr2, from, to, mark) {
    let matched = [], step = 0;
    tr2.doc.nodesBetween(from, to, (node, pos) => {
      if (!node.isInline)
        return;
      step++;
      let toRemove = null;
      if (mark instanceof MarkType) {
        let set = node.marks, found2;
        while (found2 = mark.isInSet(set)) {
          (toRemove || (toRemove = [])).push(found2);
          set = found2.removeFromSet(set);
        }
      } else if (mark) {
        if (mark.isInSet(node.marks))
          toRemove = [mark];
      } else {
        toRemove = node.marks;
      }
      if (toRemove && toRemove.length) {
        let end = Math.min(pos + node.nodeSize, to);
        for (let i2 = 0; i2 < toRemove.length; i2++) {
          let style2 = toRemove[i2], found2;
          for (let j = 0; j < matched.length; j++) {
            let m = matched[j];
            if (m.step == step - 1 && style2.eq(matched[j].style))
              found2 = m;
          }
          if (found2) {
            found2.to = end;
            found2.step = step;
          } else {
            matched.push({ style: style2, from: Math.max(pos, from), to: end, step });
          }
        }
      }
    });
    matched.forEach((m) => tr2.step(new RemoveMarkStep(m.from, m.to, m.style)));
  }
  function clearIncompatible(tr2, pos, parentType, match = parentType.contentMatch, clearNewlines = true) {
    let node = tr2.doc.nodeAt(pos);
    let replSteps = [], cur = pos + 1;
    for (let i2 = 0; i2 < node.childCount; i2++) {
      let child = node.child(i2), end = cur + child.nodeSize;
      let allowed = match.matchType(child.type);
      if (!allowed) {
        replSteps.push(new ReplaceStep(cur, end, Slice.empty));
      } else {
        match = allowed;
        for (let j = 0; j < child.marks.length; j++)
          if (!parentType.allowsMarkType(child.marks[j].type))
            tr2.step(new RemoveMarkStep(cur, end, child.marks[j]));
        if (clearNewlines && child.isText && parentType.whitespace != "pre") {
          let m, newline = /\r?\n|\r/g, slice;
          while (m = newline.exec(child.text)) {
            if (!slice)
              slice = new Slice(Fragment.from(parentType.schema.text(" ", parentType.allowedMarks(child.marks))), 0, 0);
            replSteps.push(new ReplaceStep(cur + m.index, cur + m.index + m[0].length, slice));
          }
        }
      }
      cur = end;
    }
    if (!match.validEnd) {
      let fill = match.fillBefore(Fragment.empty, true);
      tr2.replace(cur, cur, new Slice(fill, 0, 0));
    }
    for (let i2 = replSteps.length - 1; i2 >= 0; i2--)
      tr2.step(replSteps[i2]);
  }
  function canCut(node, start, end) {
    return (start == 0 || node.canReplace(start, node.childCount)) && (end == node.childCount || node.canReplace(0, end));
  }
  function liftTarget(range) {
    let parent = range.parent;
    let content = parent.content.cutByIndex(range.startIndex, range.endIndex);
    for (let depth = range.depth; ; --depth) {
      let node = range.$from.node(depth);
      let index = range.$from.index(depth), endIndex = range.$to.indexAfter(depth);
      if (depth < range.depth && node.canReplace(index, endIndex, content))
        return depth;
      if (depth == 0 || node.type.spec.isolating || !canCut(node, index, endIndex))
        break;
    }
    return null;
  }
  function lift$2(tr2, range, target) {
    let { $from, $to, depth } = range;
    let gapStart = $from.before(depth + 1), gapEnd = $to.after(depth + 1);
    let start = gapStart, end = gapEnd;
    let before = Fragment.empty, openStart = 0;
    for (let d2 = depth, splitting = false; d2 > target; d2--)
      if (splitting || $from.index(d2) > 0) {
        splitting = true;
        before = Fragment.from($from.node(d2).copy(before));
        openStart++;
      } else {
        start--;
      }
    let after = Fragment.empty, openEnd = 0;
    for (let d2 = depth, splitting = false; d2 > target; d2--)
      if (splitting || $to.after(d2 + 1) < $to.end(d2)) {
        splitting = true;
        after = Fragment.from($to.node(d2).copy(after));
        openEnd++;
      } else {
        end++;
      }
    tr2.step(new ReplaceAroundStep(start, end, gapStart, gapEnd, new Slice(before.append(after), openStart, openEnd), before.size - openStart, true));
  }
  function findWrapping(range, nodeType, attrs = null, innerRange = range) {
    let around = findWrappingOutside(range, nodeType);
    let inner = around && findWrappingInside(innerRange, nodeType);
    if (!inner)
      return null;
    return around.map(withAttrs).concat({ type: nodeType, attrs }).concat(inner.map(withAttrs));
  }
  function withAttrs(type) {
    return { type, attrs: null };
  }
  function findWrappingOutside(range, type) {
    let { parent, startIndex, endIndex } = range;
    let around = parent.contentMatchAt(startIndex).findWrapping(type);
    if (!around)
      return null;
    let outer = around.length ? around[0] : type;
    return parent.canReplaceWith(startIndex, endIndex, outer) ? around : null;
  }
  function findWrappingInside(range, type) {
    let { parent, startIndex, endIndex } = range;
    let inner = parent.child(startIndex);
    let inside = type.contentMatch.findWrapping(inner.type);
    if (!inside)
      return null;
    let lastType = inside.length ? inside[inside.length - 1] : type;
    let innerMatch = lastType.contentMatch;
    for (let i2 = startIndex; innerMatch && i2 < endIndex; i2++)
      innerMatch = innerMatch.matchType(parent.child(i2).type);
    if (!innerMatch || !innerMatch.validEnd)
      return null;
    return inside;
  }
  function wrap(tr2, range, wrappers) {
    let content = Fragment.empty;
    for (let i2 = wrappers.length - 1; i2 >= 0; i2--) {
      if (content.size) {
        let match = wrappers[i2].type.contentMatch.matchFragment(content);
        if (!match || !match.validEnd)
          throw new RangeError("Wrapper type given to Transform.wrap does not form valid content of its parent wrapper");
      }
      content = Fragment.from(wrappers[i2].type.create(wrappers[i2].attrs, content));
    }
    let start = range.start, end = range.end;
    tr2.step(new ReplaceAroundStep(start, end, start, end, new Slice(content, 0, 0), wrappers.length, true));
  }
  function setBlockType$1(tr2, from, to, type, attrs) {
    if (!type.isTextblock)
      throw new RangeError("Type given to setBlockType should be a textblock");
    let mapFrom = tr2.steps.length;
    tr2.doc.nodesBetween(from, to, (node, pos) => {
      let attrsHere = typeof attrs == "function" ? attrs(node) : attrs;
      if (node.isTextblock && !node.hasMarkup(type, attrsHere) && canChangeType(tr2.doc, tr2.mapping.slice(mapFrom).map(pos), type)) {
        let convertNewlines = null;
        if (type.schema.linebreakReplacement) {
          let pre = type.whitespace == "pre", supportLinebreak = !!type.contentMatch.matchType(type.schema.linebreakReplacement);
          if (pre && !supportLinebreak)
            convertNewlines = false;
          else if (!pre && supportLinebreak)
            convertNewlines = true;
        }
        if (convertNewlines === false)
          replaceLinebreaks(tr2, node, pos, mapFrom);
        clearIncompatible(tr2, tr2.mapping.slice(mapFrom).map(pos, 1), type, void 0, convertNewlines === null);
        let mapping = tr2.mapping.slice(mapFrom);
        let startM = mapping.map(pos, 1), endM = mapping.map(pos + node.nodeSize, 1);
        tr2.step(new ReplaceAroundStep(startM, endM, startM + 1, endM - 1, new Slice(Fragment.from(type.create(attrsHere, null, node.marks)), 0, 0), 1, true));
        if (convertNewlines === true)
          replaceNewlines(tr2, node, pos, mapFrom);
        return false;
      }
    });
  }
  function replaceNewlines(tr2, node, pos, mapFrom) {
    node.forEach((child, offset) => {
      if (child.isText) {
        let m, newline = /\r?\n|\r/g;
        while (m = newline.exec(child.text)) {
          let start = tr2.mapping.slice(mapFrom).map(pos + 1 + offset + m.index);
          tr2.replaceWith(start, start + 1, node.type.schema.linebreakReplacement.create());
        }
      }
    });
  }
  function replaceLinebreaks(tr2, node, pos, mapFrom) {
    node.forEach((child, offset) => {
      if (child.type == child.type.schema.linebreakReplacement) {
        let start = tr2.mapping.slice(mapFrom).map(pos + 1 + offset);
        tr2.replaceWith(start, start + 1, node.type.schema.text("\n"));
      }
    });
  }
  function canChangeType(doc2, pos, type) {
    let $pos = doc2.resolve(pos), index = $pos.index();
    return $pos.parent.canReplaceWith(index, index + 1, type);
  }
  function setNodeMarkup(tr2, pos, type, attrs, marks) {
    let node = tr2.doc.nodeAt(pos);
    if (!node)
      throw new RangeError("No node at given position");
    if (!type)
      type = node.type;
    let newNode = type.create(attrs, null, marks || node.marks);
    if (node.isLeaf)
      return tr2.replaceWith(pos, pos + node.nodeSize, newNode);
    if (!type.validContent(node.content))
      throw new RangeError("Invalid content for node type " + type.name);
    tr2.step(new ReplaceAroundStep(pos, pos + node.nodeSize, pos + 1, pos + node.nodeSize - 1, new Slice(Fragment.from(newNode), 0, 0), 1, true));
  }
  function canSplit(doc2, pos, depth = 1, typesAfter) {
    let $pos = doc2.resolve(pos), base2 = $pos.depth - depth;
    let innerType = typesAfter && typesAfter[typesAfter.length - 1] || $pos.parent;
    if (base2 < 0 || $pos.parent.type.spec.isolating || !$pos.parent.canReplace($pos.index(), $pos.parent.childCount) || !innerType.type.validContent($pos.parent.content.cutByIndex($pos.index(), $pos.parent.childCount)))
      return false;
    for (let d2 = $pos.depth - 1, i2 = depth - 2; d2 > base2; d2--, i2--) {
      let node = $pos.node(d2), index2 = $pos.index(d2);
      if (node.type.spec.isolating)
        return false;
      let rest = node.content.cutByIndex(index2, node.childCount);
      let overrideChild = typesAfter && typesAfter[i2 + 1];
      if (overrideChild)
        rest = rest.replaceChild(0, overrideChild.type.create(overrideChild.attrs));
      let after = typesAfter && typesAfter[i2] || node;
      if (!node.canReplace(index2 + 1, node.childCount) || !after.type.validContent(rest))
        return false;
    }
    let index = $pos.indexAfter(base2);
    let baseType = typesAfter && typesAfter[0];
    return $pos.node(base2).canReplaceWith(index, index, baseType ? baseType.type : $pos.node(base2 + 1).type);
  }
  function split(tr2, pos, depth = 1, typesAfter) {
    let $pos = tr2.doc.resolve(pos), before = Fragment.empty, after = Fragment.empty;
    for (let d2 = $pos.depth, e = $pos.depth - depth, i2 = depth - 1; d2 > e; d2--, i2--) {
      before = Fragment.from($pos.node(d2).copy(before));
      let typeAfter = typesAfter && typesAfter[i2];
      after = Fragment.from(typeAfter ? typeAfter.type.create(typeAfter.attrs, after) : $pos.node(d2).copy(after));
    }
    tr2.step(new ReplaceStep(pos, pos, new Slice(before.append(after), depth, depth), true));
  }
  function canJoin(doc2, pos) {
    let $pos = doc2.resolve(pos), index = $pos.index();
    return joinable($pos.nodeBefore, $pos.nodeAfter) && $pos.parent.canReplace(index, index + 1);
  }
  function canAppendWithSubstitutedLinebreaks(a2, b2) {
    if (!b2.content.size)
      a2.type.compatibleContent(b2.type);
    let match = a2.contentMatchAt(a2.childCount);
    let { linebreakReplacement } = a2.type.schema;
    for (let i2 = 0; i2 < b2.childCount; i2++) {
      let child = b2.child(i2);
      let type = child.type == linebreakReplacement ? a2.type.schema.nodes.text : child.type;
      match = match.matchType(type);
      if (!match)
        return false;
      if (!a2.type.allowsMarks(child.marks))
        return false;
    }
    return match.validEnd;
  }
  function joinable(a2, b2) {
    return !!(a2 && b2 && !a2.isLeaf && canAppendWithSubstitutedLinebreaks(a2, b2));
  }
  function joinPoint(doc2, pos, dir = -1) {
    let $pos = doc2.resolve(pos);
    for (let d2 = $pos.depth; ; d2--) {
      let before, after, index = $pos.index(d2);
      if (d2 == $pos.depth) {
        before = $pos.nodeBefore;
        after = $pos.nodeAfter;
      } else if (dir > 0) {
        before = $pos.node(d2 + 1);
        index++;
        after = $pos.node(d2).maybeChild(index);
      } else {
        before = $pos.node(d2).maybeChild(index - 1);
        after = $pos.node(d2 + 1);
      }
      if (before && !before.isTextblock && joinable(before, after) && $pos.node(d2).canReplace(index, index + 1))
        return pos;
      if (d2 == 0)
        break;
      pos = dir < 0 ? $pos.before(d2) : $pos.after(d2);
    }
  }
  function join(tr2, pos, depth) {
    let convertNewlines = null;
    let { linebreakReplacement } = tr2.doc.type.schema;
    let $before = tr2.doc.resolve(pos - depth), beforeType = $before.node().type;
    if (linebreakReplacement && beforeType.inlineContent) {
      let pre = beforeType.whitespace == "pre";
      let supportLinebreak = !!beforeType.contentMatch.matchType(linebreakReplacement);
      if (pre && !supportLinebreak)
        convertNewlines = false;
      else if (!pre && supportLinebreak)
        convertNewlines = true;
    }
    let mapFrom = tr2.steps.length;
    if (convertNewlines === false) {
      let $after = tr2.doc.resolve(pos + depth);
      replaceLinebreaks(tr2, $after.node(), $after.before(), mapFrom);
    }
    if (beforeType.inlineContent)
      clearIncompatible(tr2, pos + depth - 1, beforeType, $before.node().contentMatchAt($before.index()), convertNewlines == null);
    let mapping = tr2.mapping.slice(mapFrom), start = mapping.map(pos - depth);
    tr2.step(new ReplaceStep(start, mapping.map(pos + depth, -1), Slice.empty, true));
    if (convertNewlines === true) {
      let $full = tr2.doc.resolve(start);
      replaceNewlines(tr2, $full.node(), $full.before(), tr2.steps.length);
    }
    return tr2;
  }
  function insertPoint(doc2, pos, nodeType) {
    let $pos = doc2.resolve(pos);
    if ($pos.parent.canReplaceWith($pos.index(), $pos.index(), nodeType))
      return pos;
    if ($pos.parentOffset == 0)
      for (let d2 = $pos.depth - 1; d2 >= 0; d2--) {
        let index = $pos.index(d2);
        if ($pos.node(d2).canReplaceWith(index, index, nodeType))
          return $pos.before(d2 + 1);
        if (index > 0)
          return null;
      }
    if ($pos.parentOffset == $pos.parent.content.size)
      for (let d2 = $pos.depth - 1; d2 >= 0; d2--) {
        let index = $pos.indexAfter(d2);
        if ($pos.node(d2).canReplaceWith(index, index, nodeType))
          return $pos.after(d2 + 1);
        if (index < $pos.node(d2).childCount)
          return null;
      }
    return null;
  }
  function dropPoint(doc2, pos, slice) {
    let $pos = doc2.resolve(pos);
    if (!slice.content.size)
      return pos;
    let content = slice.content;
    for (let i2 = 0; i2 < slice.openStart; i2++)
      content = content.firstChild.content;
    for (let pass = 1; pass <= (slice.openStart == 0 && slice.size ? 2 : 1); pass++) {
      for (let d2 = $pos.depth; d2 >= 0; d2--) {
        let bias = d2 == $pos.depth ? 0 : $pos.pos <= ($pos.start(d2 + 1) + $pos.end(d2 + 1)) / 2 ? -1 : 1;
        let insertPos = $pos.index(d2) + (bias > 0 ? 1 : 0);
        let parent = $pos.node(d2), fits = false;
        if (pass == 1) {
          fits = parent.canReplace(insertPos, insertPos, content);
        } else {
          let wrapping = parent.contentMatchAt(insertPos).findWrapping(content.firstChild.type);
          fits = wrapping && parent.canReplaceWith(insertPos, insertPos, wrapping[0]);
        }
        if (fits)
          return bias == 0 ? $pos.pos : bias < 0 ? $pos.before(d2 + 1) : $pos.after(d2 + 1);
      }
    }
    return null;
  }
  function replaceStep(doc2, from, to = from, slice = Slice.empty) {
    if (from == to && !slice.size)
      return null;
    let $from = doc2.resolve(from), $to = doc2.resolve(to);
    if (fitsTrivially($from, $to, slice))
      return new ReplaceStep(from, to, slice);
    return new Fitter($from, $to, slice).fit();
  }
  function fitsTrivially($from, $to, slice) {
    return !slice.openStart && !slice.openEnd && $from.start() == $to.start() && $from.parent.canReplace($from.index(), $to.index(), slice.content);
  }
  class Fitter {
    constructor($from, $to, unplaced) {
      this.$from = $from;
      this.$to = $to;
      this.unplaced = unplaced;
      this.frontier = [];
      this.placed = Fragment.empty;
      for (let i2 = 0; i2 <= $from.depth; i2++) {
        let node = $from.node(i2);
        this.frontier.push({
          type: node.type,
          match: node.contentMatchAt($from.indexAfter(i2))
        });
      }
      for (let i2 = $from.depth; i2 > 0; i2--)
        this.placed = Fragment.from($from.node(i2).copy(this.placed));
    }
    get depth() {
      return this.frontier.length - 1;
    }
    fit() {
      while (this.unplaced.size) {
        let fit = this.findFittable();
        if (fit)
          this.placeNodes(fit);
        else
          this.openMore() || this.dropNode();
      }
      let moveInline = this.mustMoveInline(), placedSize = this.placed.size - this.depth - this.$from.depth;
      let $from = this.$from, $to = this.close(moveInline < 0 ? this.$to : $from.doc.resolve(moveInline));
      if (!$to)
        return null;
      let content = this.placed, openStart = $from.depth, openEnd = $to.depth;
      while (openStart && openEnd && content.childCount == 1) {
        content = content.firstChild.content;
        openStart--;
        openEnd--;
      }
      let slice = new Slice(content, openStart, openEnd);
      if (moveInline > -1)
        return new ReplaceAroundStep($from.pos, moveInline, this.$to.pos, this.$to.end(), slice, placedSize);
      if (slice.size || $from.pos != this.$to.pos)
        return new ReplaceStep($from.pos, $to.pos, slice);
      return null;
    }
    // Find a position on the start spine of `this.unplaced` that has
    // content that can be moved somewhere on the frontier. Returns two
    // depths, one for the slice and one for the frontier.
    findFittable() {
      let startDepth = this.unplaced.openStart;
      for (let cur = this.unplaced.content, d2 = 0, openEnd = this.unplaced.openEnd; d2 < startDepth; d2++) {
        let node = cur.firstChild;
        if (cur.childCount > 1)
          openEnd = 0;
        if (node.type.spec.isolating && openEnd <= d2) {
          startDepth = d2;
          break;
        }
        cur = node.content;
      }
      for (let pass = 1; pass <= 2; pass++) {
        for (let sliceDepth = pass == 1 ? startDepth : this.unplaced.openStart; sliceDepth >= 0; sliceDepth--) {
          let fragment, parent = null;
          if (sliceDepth) {
            parent = contentAt(this.unplaced.content, sliceDepth - 1).firstChild;
            fragment = parent.content;
          } else {
            fragment = this.unplaced.content;
          }
          let first2 = fragment.firstChild;
          for (let frontierDepth = this.depth; frontierDepth >= 0; frontierDepth--) {
            let { type, match } = this.frontier[frontierDepth], wrap2, inject = null;
            if (pass == 1 && (first2 ? match.matchType(first2.type) || (inject = match.fillBefore(Fragment.from(first2), false)) : parent && type.compatibleContent(parent.type)))
              return { sliceDepth, frontierDepth, parent, inject };
            else if (pass == 2 && first2 && (wrap2 = match.findWrapping(first2.type)))
              return { sliceDepth, frontierDepth, parent, wrap: wrap2 };
            if (parent && match.matchType(parent.type))
              break;
          }
        }
      }
    }
    openMore() {
      let { content, openStart, openEnd } = this.unplaced;
      let inner = contentAt(content, openStart);
      if (!inner.childCount || inner.firstChild.isLeaf)
        return false;
      this.unplaced = new Slice(content, openStart + 1, Math.max(openEnd, inner.size + openStart >= content.size - openEnd ? openStart + 1 : 0));
      return true;
    }
    dropNode() {
      let { content, openStart, openEnd } = this.unplaced;
      let inner = contentAt(content, openStart);
      if (inner.childCount <= 1 && openStart > 0) {
        let openAtEnd = content.size - openStart <= openStart + inner.size;
        this.unplaced = new Slice(dropFromFragment(content, openStart - 1, 1), openStart - 1, openAtEnd ? openStart - 1 : openEnd);
      } else {
        this.unplaced = new Slice(dropFromFragment(content, openStart, 1), openStart, openEnd);
      }
    }
    // Move content from the unplaced slice at `sliceDepth` to the
    // frontier node at `frontierDepth`. Close that frontier node when
    // applicable.
    placeNodes({ sliceDepth, frontierDepth, parent, inject, wrap: wrap2 }) {
      while (this.depth > frontierDepth)
        this.closeFrontierNode();
      if (wrap2)
        for (let i2 = 0; i2 < wrap2.length; i2++)
          this.openFrontierNode(wrap2[i2]);
      let slice = this.unplaced, fragment = parent ? parent.content : slice.content;
      let openStart = slice.openStart - sliceDepth;
      let taken = 0, add = [];
      let { match, type } = this.frontier[frontierDepth];
      if (inject) {
        for (let i2 = 0; i2 < inject.childCount; i2++)
          add.push(inject.child(i2));
        match = match.matchFragment(inject);
      }
      let openEndCount = fragment.size + sliceDepth - (slice.content.size - slice.openEnd);
      while (taken < fragment.childCount) {
        let next = fragment.child(taken), matches2 = match.matchType(next.type);
        if (!matches2)
          break;
        taken++;
        if (taken > 1 || openStart == 0 || next.content.size) {
          match = matches2;
          add.push(closeNodeStart(next.mark(type.allowedMarks(next.marks)), taken == 1 ? openStart : 0, taken == fragment.childCount ? openEndCount : -1));
        }
      }
      let toEnd = taken == fragment.childCount;
      if (!toEnd)
        openEndCount = -1;
      this.placed = addToFragment(this.placed, frontierDepth, Fragment.from(add));
      this.frontier[frontierDepth].match = match;
      if (toEnd && openEndCount < 0 && parent && parent.type == this.frontier[this.depth].type && this.frontier.length > 1)
        this.closeFrontierNode();
      for (let i2 = 0, cur = fragment; i2 < openEndCount; i2++) {
        let node = cur.lastChild;
        this.frontier.push({ type: node.type, match: node.contentMatchAt(node.childCount) });
        cur = node.content;
      }
      this.unplaced = !toEnd ? new Slice(dropFromFragment(slice.content, sliceDepth, taken), slice.openStart, slice.openEnd) : sliceDepth == 0 ? Slice.empty : new Slice(dropFromFragment(slice.content, sliceDepth - 1, 1), sliceDepth - 1, openEndCount < 0 ? slice.openEnd : sliceDepth - 1);
    }
    mustMoveInline() {
      if (!this.$to.parent.isTextblock)
        return -1;
      let top = this.frontier[this.depth], level;
      if (!top.type.isTextblock || !contentAfterFits(this.$to, this.$to.depth, top.type, top.match, false) || this.$to.depth == this.depth && (level = this.findCloseLevel(this.$to)) && level.depth == this.depth)
        return -1;
      let { depth } = this.$to, after = this.$to.after(depth);
      while (depth > 1 && after == this.$to.end(--depth))
        ++after;
      return after;
    }
    findCloseLevel($to) {
      scan: for (let i2 = Math.min(this.depth, $to.depth); i2 >= 0; i2--) {
        let { match, type } = this.frontier[i2];
        let dropInner = i2 < $to.depth && $to.end(i2 + 1) == $to.pos + ($to.depth - (i2 + 1));
        let fit = contentAfterFits($to, i2, type, match, dropInner);
        if (!fit)
          continue;
        for (let d2 = i2 - 1; d2 >= 0; d2--) {
          let { match: match2, type: type2 } = this.frontier[d2];
          let matches2 = contentAfterFits($to, d2, type2, match2, true);
          if (!matches2 || matches2.childCount)
            continue scan;
        }
        return { depth: i2, fit, move: dropInner ? $to.doc.resolve($to.after(i2 + 1)) : $to };
      }
    }
    close($to) {
      let close2 = this.findCloseLevel($to);
      if (!close2)
        return null;
      while (this.depth > close2.depth)
        this.closeFrontierNode();
      if (close2.fit.childCount)
        this.placed = addToFragment(this.placed, close2.depth, close2.fit);
      $to = close2.move;
      for (let d2 = close2.depth + 1; d2 <= $to.depth; d2++) {
        let node = $to.node(d2), add = node.type.contentMatch.fillBefore(node.content, true, $to.index(d2));
        this.openFrontierNode(node.type, node.attrs, add);
      }
      return $to;
    }
    openFrontierNode(type, attrs = null, content) {
      let top = this.frontier[this.depth];
      top.match = top.match.matchType(type);
      this.placed = addToFragment(this.placed, this.depth, Fragment.from(type.create(attrs, content)));
      this.frontier.push({ type, match: type.contentMatch });
    }
    closeFrontierNode() {
      let open = this.frontier.pop();
      let add = open.match.fillBefore(Fragment.empty, true);
      if (add.childCount)
        this.placed = addToFragment(this.placed, this.frontier.length, add);
    }
  }
  function dropFromFragment(fragment, depth, count) {
    if (depth == 0)
      return fragment.cutByIndex(count, fragment.childCount);
    return fragment.replaceChild(0, fragment.firstChild.copy(dropFromFragment(fragment.firstChild.content, depth - 1, count)));
  }
  function addToFragment(fragment, depth, content) {
    if (depth == 0)
      return fragment.append(content);
    return fragment.replaceChild(fragment.childCount - 1, fragment.lastChild.copy(addToFragment(fragment.lastChild.content, depth - 1, content)));
  }
  function contentAt(fragment, depth) {
    for (let i2 = 0; i2 < depth; i2++)
      fragment = fragment.firstChild.content;
    return fragment;
  }
  function closeNodeStart(node, openStart, openEnd) {
    if (openStart <= 0)
      return node;
    let frag = node.content;
    if (openStart > 1)
      frag = frag.replaceChild(0, closeNodeStart(frag.firstChild, openStart - 1, frag.childCount == 1 ? openEnd - 1 : 0));
    if (openStart > 0) {
      frag = node.type.contentMatch.fillBefore(frag).append(frag);
      if (openEnd <= 0)
        frag = frag.append(node.type.contentMatch.matchFragment(frag).fillBefore(Fragment.empty, true));
    }
    return node.copy(frag);
  }
  function contentAfterFits($to, depth, type, match, open) {
    let node = $to.node(depth), index = open ? $to.indexAfter(depth) : $to.index(depth);
    if (index == node.childCount && !type.compatibleContent(node.type))
      return null;
    let fit = match.fillBefore(node.content, true, index);
    return fit && !invalidMarks(type, node.content, index) ? fit : null;
  }
  function invalidMarks(type, fragment, start) {
    for (let i2 = start; i2 < fragment.childCount; i2++)
      if (!type.allowsMarks(fragment.child(i2).marks))
        return true;
    return false;
  }
  function definesContent(type) {
    return type.spec.defining || type.spec.definingForContent;
  }
  function replaceRange(tr2, from, to, slice) {
    if (!slice.size)
      return tr2.deleteRange(from, to);
    let $from = tr2.doc.resolve(from), $to = tr2.doc.resolve(to);
    if (fitsTrivially($from, $to, slice))
      return tr2.step(new ReplaceStep(from, to, slice));
    let targetDepths = coveredDepths($from, tr2.doc.resolve(to));
    if (targetDepths[targetDepths.length - 1] == 0)
      targetDepths.pop();
    let preferredTarget = -($from.depth + 1);
    targetDepths.unshift(preferredTarget);
    for (let d2 = $from.depth, pos = $from.pos - 1; d2 > 0; d2--, pos--) {
      let spec = $from.node(d2).type.spec;
      if (spec.defining || spec.definingAsContext || spec.isolating)
        break;
      if (targetDepths.indexOf(d2) > -1)
        preferredTarget = d2;
      else if ($from.before(d2) == pos)
        targetDepths.splice(1, 0, -d2);
    }
    let preferredTargetIndex = targetDepths.indexOf(preferredTarget);
    let leftNodes = [], preferredDepth = slice.openStart;
    for (let content = slice.content, i2 = 0; ; i2++) {
      let node = content.firstChild;
      leftNodes.push(node);
      if (i2 == slice.openStart)
        break;
      content = node.content;
    }
    for (let d2 = preferredDepth - 1; d2 >= 0; d2--) {
      let leftNode = leftNodes[d2], def = definesContent(leftNode.type);
      if (def && !leftNode.sameMarkup($from.node(Math.abs(preferredTarget) - 1)))
        preferredDepth = d2;
      else if (def || !leftNode.type.isTextblock)
        break;
    }
    for (let j = slice.openStart; j >= 0; j--) {
      let openDepth = (j + preferredDepth + 1) % (slice.openStart + 1);
      let insert = leftNodes[openDepth];
      if (!insert)
        continue;
      for (let i2 = 0; i2 < targetDepths.length; i2++) {
        let targetDepth = targetDepths[(i2 + preferredTargetIndex) % targetDepths.length], expand = true;
        if (targetDepth < 0) {
          expand = false;
          targetDepth = -targetDepth;
        }
        let parent = $from.node(targetDepth - 1), index = $from.index(targetDepth - 1);
        if (parent.canReplaceWith(index, index, insert.type, insert.marks))
          return tr2.replace($from.before(targetDepth), expand ? $to.after(targetDepth) : to, new Slice(closeFragment(slice.content, 0, slice.openStart, openDepth), openDepth, slice.openEnd));
      }
    }
    let startSteps = tr2.steps.length;
    for (let i2 = targetDepths.length - 1; i2 >= 0; i2--) {
      tr2.replace(from, to, slice);
      if (tr2.steps.length > startSteps)
        break;
      let depth = targetDepths[i2];
      if (depth < 0)
        continue;
      from = $from.before(depth);
      to = $to.after(depth);
    }
  }
  function closeFragment(fragment, depth, oldOpen, newOpen, parent) {
    if (depth < oldOpen) {
      let first2 = fragment.firstChild;
      fragment = fragment.replaceChild(0, first2.copy(closeFragment(first2.content, depth + 1, oldOpen, newOpen, first2)));
    }
    if (depth > newOpen) {
      let match = parent.contentMatchAt(0);
      let start = match.fillBefore(fragment).append(fragment);
      fragment = start.append(match.matchFragment(start).fillBefore(Fragment.empty, true));
    }
    return fragment;
  }
  function replaceRangeWith(tr2, from, to, node) {
    if (!node.isInline && from == to && tr2.doc.resolve(from).parent.content.size) {
      let point = insertPoint(tr2.doc, from, node.type);
      if (point != null)
        from = to = point;
    }
    tr2.replaceRange(from, to, new Slice(Fragment.from(node), 0, 0));
  }
  function deleteRange$1(tr2, from, to) {
    let $from = tr2.doc.resolve(from), $to = tr2.doc.resolve(to);
    let covered = coveredDepths($from, $to);
    for (let i2 = 0; i2 < covered.length; i2++) {
      let depth = covered[i2], last = i2 == covered.length - 1;
      if (last && depth == 0 || $from.node(depth).type.contentMatch.validEnd)
        return tr2.delete($from.start(depth), $to.end(depth));
      if (depth > 0 && (last || $from.node(depth - 1).canReplace($from.index(depth - 1), $to.indexAfter(depth - 1))))
        return tr2.delete($from.before(depth), $to.after(depth));
    }
    for (let d2 = 1; d2 <= $from.depth && d2 <= $to.depth; d2++) {
      if (from - $from.start(d2) == $from.depth - d2 && to > $from.end(d2) && $to.end(d2) - to != $to.depth - d2 && $from.start(d2 - 1) == $to.start(d2 - 1) && $from.node(d2 - 1).canReplace($from.index(d2 - 1), $to.index(d2 - 1)))
        return tr2.delete($from.before(d2), to);
    }
    tr2.delete(from, to);
  }
  function coveredDepths($from, $to) {
    let result = [], minDepth = Math.min($from.depth, $to.depth);
    for (let d2 = minDepth; d2 >= 0; d2--) {
      let start = $from.start(d2);
      if (start < $from.pos - ($from.depth - d2) || $to.end(d2) > $to.pos + ($to.depth - d2) || $from.node(d2).type.spec.isolating || $to.node(d2).type.spec.isolating)
        break;
      if (start == $to.start(d2) || d2 == $from.depth && d2 == $to.depth && $from.parent.inlineContent && $to.parent.inlineContent && d2 && $to.start(d2 - 1) == start - 1)
        result.push(d2);
    }
    return result;
  }
  class AttrStep extends Step {
    /**
    Construct an attribute step.
    */
    constructor(pos, attr, value) {
      super();
      this.pos = pos;
      this.attr = attr;
      this.value = value;
    }
    apply(doc2) {
      let node = doc2.nodeAt(this.pos);
      if (!node)
        return StepResult.fail("No node at attribute step's position");
      let attrs = /* @__PURE__ */ Object.create(null);
      for (let name in node.attrs)
        attrs[name] = node.attrs[name];
      attrs[this.attr] = this.value;
      let updated = node.type.create(attrs, null, node.marks);
      return StepResult.fromReplace(doc2, this.pos, this.pos + 1, new Slice(Fragment.from(updated), 0, node.isLeaf ? 0 : 1));
    }
    getMap() {
      return StepMap.empty;
    }
    invert(doc2) {
      return new AttrStep(this.pos, this.attr, doc2.nodeAt(this.pos).attrs[this.attr]);
    }
    map(mapping) {
      let pos = mapping.mapResult(this.pos, 1);
      return pos.deletedAfter ? null : new AttrStep(pos.pos, this.attr, this.value);
    }
    toJSON() {
      return { stepType: "attr", pos: this.pos, attr: this.attr, value: this.value };
    }
    static fromJSON(schema, json) {
      if (typeof json.pos != "number" || typeof json.attr != "string")
        throw new RangeError("Invalid input for AttrStep.fromJSON");
      return new AttrStep(json.pos, json.attr, json.value);
    }
  }
  Step.jsonID("attr", AttrStep);
  class DocAttrStep extends Step {
    /**
    Construct an attribute step.
    */
    constructor(attr, value) {
      super();
      this.attr = attr;
      this.value = value;
    }
    apply(doc2) {
      let attrs = /* @__PURE__ */ Object.create(null);
      for (let name in doc2.attrs)
        attrs[name] = doc2.attrs[name];
      attrs[this.attr] = this.value;
      let updated = doc2.type.create(attrs, doc2.content, doc2.marks);
      return StepResult.ok(updated);
    }
    getMap() {
      return StepMap.empty;
    }
    invert(doc2) {
      return new DocAttrStep(this.attr, doc2.attrs[this.attr]);
    }
    map(mapping) {
      return this;
    }
    toJSON() {
      return { stepType: "docAttr", attr: this.attr, value: this.value };
    }
    static fromJSON(schema, json) {
      if (typeof json.attr != "string")
        throw new RangeError("Invalid input for DocAttrStep.fromJSON");
      return new DocAttrStep(json.attr, json.value);
    }
  }
  Step.jsonID("docAttr", DocAttrStep);
  let TransformError = class extends Error {
  };
  TransformError = function TransformError2(message) {
    let err = Error.call(this, message);
    err.__proto__ = TransformError2.prototype;
    return err;
  };
  TransformError.prototype = Object.create(Error.prototype);
  TransformError.prototype.constructor = TransformError;
  TransformError.prototype.name = "TransformError";
  class Transform {
    /**
    Create a transform that starts with the given document.
    */
    constructor(doc2) {
      this.doc = doc2;
      this.steps = [];
      this.docs = [];
      this.mapping = new Mapping();
    }
    /**
    The starting document.
    */
    get before() {
      return this.docs.length ? this.docs[0] : this.doc;
    }
    /**
    Apply a new step in this transform, saving the result. Throws an
    error when the step fails.
    */
    step(step) {
      let result = this.maybeStep(step);
      if (result.failed)
        throw new TransformError(result.failed);
      return this;
    }
    /**
    Try to apply a step in this transformation, ignoring it if it
    fails. Returns the step result.
    */
    maybeStep(step) {
      let result = step.apply(this.doc);
      if (!result.failed)
        this.addStep(step, result.doc);
      return result;
    }
    /**
    True when the document has been changed (when there are any
    steps).
    */
    get docChanged() {
      return this.steps.length > 0;
    }
    /**
    @internal
    */
    addStep(step, doc2) {
      this.docs.push(this.doc);
      this.steps.push(step);
      this.mapping.appendMap(step.getMap());
      this.doc = doc2;
    }
    /**
    Replace the part of the document between `from` and `to` with the
    given `slice`.
    */
    replace(from, to = from, slice = Slice.empty) {
      let step = replaceStep(this.doc, from, to, slice);
      if (step)
        this.step(step);
      return this;
    }
    /**
    Replace the given range with the given content, which may be a
    fragment, node, or array of nodes.
    */
    replaceWith(from, to, content) {
      return this.replace(from, to, new Slice(Fragment.from(content), 0, 0));
    }
    /**
    Delete the content between the given positions.
    */
    delete(from, to) {
      return this.replace(from, to, Slice.empty);
    }
    /**
    Insert the given content at the given position.
    */
    insert(pos, content) {
      return this.replaceWith(pos, pos, content);
    }
    /**
    Replace a range of the document with a given slice, using
    `from`, `to`, and the slice's
    [`openStart`](https://prosemirror.net/docs/ref/#model.Slice.openStart) property as hints, rather
    than fixed start and end points. This method may grow the
    replaced area or close open nodes in the slice in order to get a
    fit that is more in line with WYSIWYG expectations, by dropping
    fully covered parent nodes of the replaced region when they are
    marked [non-defining as
    context](https://prosemirror.net/docs/ref/#model.NodeSpec.definingAsContext), or including an
    open parent node from the slice that _is_ marked as [defining
    its content](https://prosemirror.net/docs/ref/#model.NodeSpec.definingForContent).
    
    This is the method, for example, to handle paste. The similar
    [`replace`](https://prosemirror.net/docs/ref/#transform.Transform.replace) method is a more
    primitive tool which will _not_ move the start and end of its given
    range, and is useful in situations where you need more precise
    control over what happens.
    */
    replaceRange(from, to, slice) {
      replaceRange(this, from, to, slice);
      return this;
    }
    /**
    Replace the given range with a node, but use `from` and `to` as
    hints, rather than precise positions. When from and to are the same
    and are at the start or end of a parent node in which the given
    node doesn't fit, this method may _move_ them out towards a parent
    that does allow the given node to be placed. When the given range
    completely covers a parent node, this method may completely replace
    that parent node.
    */
    replaceRangeWith(from, to, node) {
      replaceRangeWith(this, from, to, node);
      return this;
    }
    /**
    Delete the given range, expanding it to cover fully covered
    parent nodes until a valid replace is found.
    */
    deleteRange(from, to) {
      deleteRange$1(this, from, to);
      return this;
    }
    /**
    Split the content in the given range off from its parent, if there
    is sibling content before or after it, and move it up the tree to
    the depth specified by `target`. You'll probably want to use
    [`liftTarget`](https://prosemirror.net/docs/ref/#transform.liftTarget) to compute `target`, to make
    sure the lift is valid.
    */
    lift(range, target) {
      lift$2(this, range, target);
      return this;
    }
    /**
    Join the blocks around the given position. If depth is 2, their
    last and first siblings are also joined, and so on.
    */
    join(pos, depth = 1) {
      join(this, pos, depth);
      return this;
    }
    /**
    Wrap the given [range](https://prosemirror.net/docs/ref/#model.NodeRange) in the given set of wrappers.
    The wrappers are assumed to be valid in this position, and should
    probably be computed with [`findWrapping`](https://prosemirror.net/docs/ref/#transform.findWrapping).
    */
    wrap(range, wrappers) {
      wrap(this, range, wrappers);
      return this;
    }
    /**
    Set the type of all textblocks (partly) between `from` and `to` to
    the given node type with the given attributes.
    */
    setBlockType(from, to = from, type, attrs = null) {
      setBlockType$1(this, from, to, type, attrs);
      return this;
    }
    /**
    Change the type, attributes, and/or marks of the node at `pos`.
    When `type` isn't given, the existing node type is preserved,
    */
    setNodeMarkup(pos, type, attrs = null, marks) {
      setNodeMarkup(this, pos, type, attrs, marks);
      return this;
    }
    /**
    Set a single attribute on a given node to a new value.
    The `pos` addresses the document content. Use `setDocAttribute`
    to set attributes on the document itself.
    */
    setNodeAttribute(pos, attr, value) {
      this.step(new AttrStep(pos, attr, value));
      return this;
    }
    /**
    Set a single attribute on the document to a new value.
    */
    setDocAttribute(attr, value) {
      this.step(new DocAttrStep(attr, value));
      return this;
    }
    /**
    Add a mark to the node at position `pos`.
    */
    addNodeMark(pos, mark) {
      this.step(new AddNodeMarkStep(pos, mark));
      return this;
    }
    /**
    Remove a mark (or a mark of the given type) from the node at
    position `pos`.
    */
    removeNodeMark(pos, mark) {
      if (!(mark instanceof Mark$1)) {
        let node = this.doc.nodeAt(pos);
        if (!node)
          throw new RangeError("No node at position " + pos);
        mark = mark.isInSet(node.marks);
        if (!mark)
          return this;
      }
      this.step(new RemoveNodeMarkStep(pos, mark));
      return this;
    }
    /**
    Split the node at the given position, and optionally, if `depth` is
    greater than one, any number of nodes above that. By default, the
    parts split off will inherit the node type of the original node.
    This can be changed by passing an array of types and attributes to
    use after the split.
    */
    split(pos, depth = 1, typesAfter) {
      split(this, pos, depth, typesAfter);
      return this;
    }
    /**
    Add the given mark to the inline content between `from` and `to`.
    */
    addMark(from, to, mark) {
      addMark(this, from, to, mark);
      return this;
    }
    /**
    Remove marks from inline nodes between `from` and `to`. When
    `mark` is a single mark, remove precisely that mark. When it is
    a mark type, remove all marks of that type. When it is null,
    remove all marks of any type.
    */
    removeMark(from, to, mark) {
      removeMark(this, from, to, mark);
      return this;
    }
    /**
    Removes all marks and nodes from the content of the node at
    `pos` that don't match the given new parent node type. Accepts
    an optional starting [content match](https://prosemirror.net/docs/ref/#model.ContentMatch) as
    third argument.
    */
    clearIncompatible(pos, parentType, match) {
      clearIncompatible(this, pos, parentType, match);
      return this;
    }
  }
  const classesById = /* @__PURE__ */ Object.create(null);
  class Selection {
    /**
    Initialize a selection with the head and anchor and ranges. If no
    ranges are given, constructs a single range across `$anchor` and
    `$head`.
    */
    constructor($anchor, $head, ranges) {
      this.$anchor = $anchor;
      this.$head = $head;
      this.ranges = ranges || [new SelectionRange($anchor.min($head), $anchor.max($head))];
    }
    /**
    The selection's anchor, as an unresolved position.
    */
    get anchor() {
      return this.$anchor.pos;
    }
    /**
    The selection's head.
    */
    get head() {
      return this.$head.pos;
    }
    /**
    The lower bound of the selection's main range.
    */
    get from() {
      return this.$from.pos;
    }
    /**
    The upper bound of the selection's main range.
    */
    get to() {
      return this.$to.pos;
    }
    /**
    The resolved lower  bound of the selection's main range.
    */
    get $from() {
      return this.ranges[0].$from;
    }
    /**
    The resolved upper bound of the selection's main range.
    */
    get $to() {
      return this.ranges[0].$to;
    }
    /**
    Indicates whether the selection contains any content.
    */
    get empty() {
      let ranges = this.ranges;
      for (let i2 = 0; i2 < ranges.length; i2++)
        if (ranges[i2].$from.pos != ranges[i2].$to.pos)
          return false;
      return true;
    }
    /**
    Get the content of this selection as a slice.
    */
    content() {
      return this.$from.doc.slice(this.from, this.to, true);
    }
    /**
    Replace the selection with a slice or, if no slice is given,
    delete the selection. Will append to the given transaction.
    */
    replace(tr2, content = Slice.empty) {
      let lastNode = content.content.lastChild, lastParent = null;
      for (let i2 = 0; i2 < content.openEnd; i2++) {
        lastParent = lastNode;
        lastNode = lastNode.lastChild;
      }
      let mapFrom = tr2.steps.length, ranges = this.ranges;
      for (let i2 = 0; i2 < ranges.length; i2++) {
        let { $from, $to } = ranges[i2], mapping = tr2.mapping.slice(mapFrom);
        tr2.replaceRange(mapping.map($from.pos), mapping.map($to.pos), i2 ? Slice.empty : content);
        if (i2 == 0)
          selectionToInsertionEnd$1(tr2, mapFrom, (lastNode ? lastNode.isInline : lastParent && lastParent.isTextblock) ? -1 : 1);
      }
    }
    /**
    Replace the selection with the given node, appending the changes
    to the given transaction.
    */
    replaceWith(tr2, node) {
      let mapFrom = tr2.steps.length, ranges = this.ranges;
      for (let i2 = 0; i2 < ranges.length; i2++) {
        let { $from, $to } = ranges[i2], mapping = tr2.mapping.slice(mapFrom);
        let from = mapping.map($from.pos), to = mapping.map($to.pos);
        if (i2) {
          tr2.deleteRange(from, to);
        } else {
          tr2.replaceRangeWith(from, to, node);
          selectionToInsertionEnd$1(tr2, mapFrom, node.isInline ? -1 : 1);
        }
      }
    }
    /**
    Find a valid cursor or leaf node selection starting at the given
    position and searching back if `dir` is negative, and forward if
    positive. When `textOnly` is true, only consider cursor
    selections. Will return null when no valid selection position is
    found.
    */
    static findFrom($pos, dir, textOnly = false) {
      let inner = $pos.parent.inlineContent ? new TextSelection($pos) : findSelectionIn($pos.node(0), $pos.parent, $pos.pos, $pos.index(), dir, textOnly);
      if (inner)
        return inner;
      for (let depth = $pos.depth - 1; depth >= 0; depth--) {
        let found2 = dir < 0 ? findSelectionIn($pos.node(0), $pos.node(depth), $pos.before(depth + 1), $pos.index(depth), dir, textOnly) : findSelectionIn($pos.node(0), $pos.node(depth), $pos.after(depth + 1), $pos.index(depth) + 1, dir, textOnly);
        if (found2)
          return found2;
      }
      return null;
    }
    /**
    Find a valid cursor or leaf node selection near the given
    position. Searches forward first by default, but if `bias` is
    negative, it will search backwards first.
    */
    static near($pos, bias = 1) {
      return this.findFrom($pos, bias) || this.findFrom($pos, -bias) || new AllSelection($pos.node(0));
    }
    /**
    Find the cursor or leaf node selection closest to the start of
    the given document. Will return an
    [`AllSelection`](https://prosemirror.net/docs/ref/#state.AllSelection) if no valid position
    exists.
    */
    static atStart(doc2) {
      return findSelectionIn(doc2, doc2, 0, 0, 1) || new AllSelection(doc2);
    }
    /**
    Find the cursor or leaf node selection closest to the end of the
    given document.
    */
    static atEnd(doc2) {
      return findSelectionIn(doc2, doc2, doc2.content.size, doc2.childCount, -1) || new AllSelection(doc2);
    }
    /**
    Deserialize the JSON representation of a selection. Must be
    implemented for custom classes (as a static class method).
    */
    static fromJSON(doc2, json) {
      if (!json || !json.type)
        throw new RangeError("Invalid input for Selection.fromJSON");
      let cls = classesById[json.type];
      if (!cls)
        throw new RangeError(`No selection type ${json.type} defined`);
      return cls.fromJSON(doc2, json);
    }
    /**
    To be able to deserialize selections from JSON, custom selection
    classes must register themselves with an ID string, so that they
    can be disambiguated. Try to pick something that's unlikely to
    clash with classes from other modules.
    */
    static jsonID(id, selectionClass) {
      if (id in classesById)
        throw new RangeError("Duplicate use of selection JSON ID " + id);
      classesById[id] = selectionClass;
      selectionClass.prototype.jsonID = id;
      return selectionClass;
    }
    /**
    Get a [bookmark](https://prosemirror.net/docs/ref/#state.SelectionBookmark) for this selection,
    which is a value that can be mapped without having access to a
    current document, and later resolved to a real selection for a
    given document again. (This is used mostly by the history to
    track and restore old selections.) The default implementation of
    this method just converts the selection to a text selection and
    returns the bookmark for that.
    */
    getBookmark() {
      return TextSelection.between(this.$anchor, this.$head).getBookmark();
    }
  }
  Selection.prototype.visible = true;
  class SelectionRange {
    /**
    Create a range.
    */
    constructor($from, $to) {
      this.$from = $from;
      this.$to = $to;
    }
  }
  let warnedAboutTextSelection = false;
  function checkTextSelection($pos) {
    if (!warnedAboutTextSelection && !$pos.parent.inlineContent) {
      warnedAboutTextSelection = true;
      console["warn"]("TextSelection endpoint not pointing into a node with inline content (" + $pos.parent.type.name + ")");
    }
  }
  class TextSelection extends Selection {
    /**
    Construct a text selection between the given points.
    */
    constructor($anchor, $head = $anchor) {
      checkTextSelection($anchor);
      checkTextSelection($head);
      super($anchor, $head);
    }
    /**
    Returns a resolved position if this is a cursor selection (an
    empty text selection), and null otherwise.
    */
    get $cursor() {
      return this.$anchor.pos == this.$head.pos ? this.$head : null;
    }
    map(doc2, mapping) {
      let $head = doc2.resolve(mapping.map(this.head));
      if (!$head.parent.inlineContent)
        return Selection.near($head);
      let $anchor = doc2.resolve(mapping.map(this.anchor));
      return new TextSelection($anchor.parent.inlineContent ? $anchor : $head, $head);
    }
    replace(tr2, content = Slice.empty) {
      super.replace(tr2, content);
      if (content == Slice.empty) {
        let marks = this.$from.marksAcross(this.$to);
        if (marks)
          tr2.ensureMarks(marks);
      }
    }
    eq(other) {
      return other instanceof TextSelection && other.anchor == this.anchor && other.head == this.head;
    }
    getBookmark() {
      return new TextBookmark(this.anchor, this.head);
    }
    toJSON() {
      return { type: "text", anchor: this.anchor, head: this.head };
    }
    /**
    @internal
    */
    static fromJSON(doc2, json) {
      if (typeof json.anchor != "number" || typeof json.head != "number")
        throw new RangeError("Invalid input for TextSelection.fromJSON");
      return new TextSelection(doc2.resolve(json.anchor), doc2.resolve(json.head));
    }
    /**
    Create a text selection from non-resolved positions.
    */
    static create(doc2, anchor, head = anchor) {
      let $anchor = doc2.resolve(anchor);
      return new this($anchor, head == anchor ? $anchor : doc2.resolve(head));
    }
    /**
    Return a text selection that spans the given positions or, if
    they aren't text positions, find a text selection near them.
    `bias` determines whether the method searches forward (default)
    or backwards (negative number) first. Will fall back to calling
    [`Selection.near`](https://prosemirror.net/docs/ref/#state.Selection^near) when the document
    doesn't contain a valid text position.
    */
    static between($anchor, $head, bias) {
      let dPos = $anchor.pos - $head.pos;
      if (!bias || dPos)
        bias = dPos >= 0 ? 1 : -1;
      if (!$head.parent.inlineContent) {
        let found2 = Selection.findFrom($head, bias, true) || Selection.findFrom($head, -bias, true);
        if (found2)
          $head = found2.$head;
        else
          return Selection.near($head, bias);
      }
      if (!$anchor.parent.inlineContent) {
        if (dPos == 0) {
          $anchor = $head;
        } else {
          $anchor = (Selection.findFrom($anchor, -bias, true) || Selection.findFrom($anchor, bias, true)).$anchor;
          if ($anchor.pos < $head.pos != dPos < 0)
            $anchor = $head;
        }
      }
      return new TextSelection($anchor, $head);
    }
  }
  Selection.jsonID("text", TextSelection);
  class TextBookmark {
    constructor(anchor, head) {
      this.anchor = anchor;
      this.head = head;
    }
    map(mapping) {
      return new TextBookmark(mapping.map(this.anchor), mapping.map(this.head));
    }
    resolve(doc2) {
      return TextSelection.between(doc2.resolve(this.anchor), doc2.resolve(this.head));
    }
  }
  class NodeSelection extends Selection {
    /**
    Create a node selection. Does not verify the validity of its
    argument.
    */
    constructor($pos) {
      let node = $pos.nodeAfter;
      let $end = $pos.node(0).resolve($pos.pos + node.nodeSize);
      super($pos, $end);
      this.node = node;
    }
    map(doc2, mapping) {
      let { deleted, pos } = mapping.mapResult(this.anchor);
      let $pos = doc2.resolve(pos);
      if (deleted)
        return Selection.near($pos);
      return new NodeSelection($pos);
    }
    content() {
      return new Slice(Fragment.from(this.node), 0, 0);
    }
    eq(other) {
      return other instanceof NodeSelection && other.anchor == this.anchor;
    }
    toJSON() {
      return { type: "node", anchor: this.anchor };
    }
    getBookmark() {
      return new NodeBookmark(this.anchor);
    }
    /**
    @internal
    */
    static fromJSON(doc2, json) {
      if (typeof json.anchor != "number")
        throw new RangeError("Invalid input for NodeSelection.fromJSON");
      return new NodeSelection(doc2.resolve(json.anchor));
    }
    /**
    Create a node selection from non-resolved positions.
    */
    static create(doc2, from) {
      return new NodeSelection(doc2.resolve(from));
    }
    /**
    Determines whether the given node may be selected as a node
    selection.
    */
    static isSelectable(node) {
      return !node.isText && node.type.spec.selectable !== false;
    }
  }
  NodeSelection.prototype.visible = false;
  Selection.jsonID("node", NodeSelection);
  class NodeBookmark {
    constructor(anchor) {
      this.anchor = anchor;
    }
    map(mapping) {
      let { deleted, pos } = mapping.mapResult(this.anchor);
      return deleted ? new TextBookmark(pos, pos) : new NodeBookmark(pos);
    }
    resolve(doc2) {
      let $pos = doc2.resolve(this.anchor), node = $pos.nodeAfter;
      if (node && NodeSelection.isSelectable(node))
        return new NodeSelection($pos);
      return Selection.near($pos);
    }
  }
  class AllSelection extends Selection {
    /**
    Create an all-selection over the given document.
    */
    constructor(doc2) {
      super(doc2.resolve(0), doc2.resolve(doc2.content.size));
    }
    replace(tr2, content = Slice.empty) {
      if (content == Slice.empty) {
        tr2.delete(0, tr2.doc.content.size);
        let sel = Selection.atStart(tr2.doc);
        if (!sel.eq(tr2.selection))
          tr2.setSelection(sel);
      } else {
        super.replace(tr2, content);
      }
    }
    toJSON() {
      return { type: "all" };
    }
    /**
    @internal
    */
    static fromJSON(doc2) {
      return new AllSelection(doc2);
    }
    map(doc2) {
      return new AllSelection(doc2);
    }
    eq(other) {
      return other instanceof AllSelection;
    }
    getBookmark() {
      return AllBookmark;
    }
  }
  Selection.jsonID("all", AllSelection);
  const AllBookmark = {
    map() {
      return this;
    },
    resolve(doc2) {
      return new AllSelection(doc2);
    }
  };
  function findSelectionIn(doc2, node, pos, index, dir, text = false) {
    if (node.inlineContent)
      return TextSelection.create(doc2, pos);
    for (let i2 = index - (dir > 0 ? 0 : 1); dir > 0 ? i2 < node.childCount : i2 >= 0; i2 += dir) {
      let child = node.child(i2);
      if (!child.isAtom) {
        let inner = findSelectionIn(doc2, child, pos + dir, dir < 0 ? child.childCount : 0, dir, text);
        if (inner)
          return inner;
      } else if (!text && NodeSelection.isSelectable(child)) {
        return NodeSelection.create(doc2, pos - (dir < 0 ? child.nodeSize : 0));
      }
      pos += child.nodeSize * dir;
    }
    return null;
  }
  function selectionToInsertionEnd$1(tr2, startLen, bias) {
    let last = tr2.steps.length - 1;
    if (last < startLen)
      return;
    let step = tr2.steps[last];
    if (!(step instanceof ReplaceStep || step instanceof ReplaceAroundStep))
      return;
    let map = tr2.mapping.maps[last], end;
    map.forEach((_from, _to, _newFrom, newTo) => {
      if (end == null)
        end = newTo;
    });
    tr2.setSelection(Selection.near(tr2.doc.resolve(end), bias));
  }
  const UPDATED_SEL = 1, UPDATED_MARKS = 2, UPDATED_SCROLL = 4;
  class Transaction extends Transform {
    /**
    @internal
    */
    constructor(state) {
      super(state.doc);
      this.curSelectionFor = 0;
      this.updated = 0;
      this.meta = /* @__PURE__ */ Object.create(null);
      this.time = Date.now();
      this.curSelection = state.selection;
      this.storedMarks = state.storedMarks;
    }
    /**
    The transaction's current selection. This defaults to the editor
    selection [mapped](https://prosemirror.net/docs/ref/#state.Selection.map) through the steps in the
    transaction, but can be overwritten with
    [`setSelection`](https://prosemirror.net/docs/ref/#state.Transaction.setSelection).
    */
    get selection() {
      if (this.curSelectionFor < this.steps.length) {
        this.curSelection = this.curSelection.map(this.doc, this.mapping.slice(this.curSelectionFor));
        this.curSelectionFor = this.steps.length;
      }
      return this.curSelection;
    }
    /**
    Update the transaction's current selection. Will determine the
    selection that the editor gets when the transaction is applied.
    */
    setSelection(selection) {
      if (selection.$from.doc != this.doc)
        throw new RangeError("Selection passed to setSelection must point at the current document");
      this.curSelection = selection;
      this.curSelectionFor = this.steps.length;
      this.updated = (this.updated | UPDATED_SEL) & ~UPDATED_MARKS;
      this.storedMarks = null;
      return this;
    }
    /**
    Whether the selection was explicitly updated by this transaction.
    */
    get selectionSet() {
      return (this.updated & UPDATED_SEL) > 0;
    }
    /**
    Set the current stored marks.
    */
    setStoredMarks(marks) {
      this.storedMarks = marks;
      this.updated |= UPDATED_MARKS;
      return this;
    }
    /**
    Make sure the current stored marks or, if that is null, the marks
    at the selection, match the given set of marks. Does nothing if
    this is already the case.
    */
    ensureMarks(marks) {
      if (!Mark$1.sameSet(this.storedMarks || this.selection.$from.marks(), marks))
        this.setStoredMarks(marks);
      return this;
    }
    /**
    Add a mark to the set of stored marks.
    */
    addStoredMark(mark) {
      return this.ensureMarks(mark.addToSet(this.storedMarks || this.selection.$head.marks()));
    }
    /**
    Remove a mark or mark type from the set of stored marks.
    */
    removeStoredMark(mark) {
      return this.ensureMarks(mark.removeFromSet(this.storedMarks || this.selection.$head.marks()));
    }
    /**
    Whether the stored marks were explicitly set for this transaction.
    */
    get storedMarksSet() {
      return (this.updated & UPDATED_MARKS) > 0;
    }
    /**
    @internal
    */
    addStep(step, doc2) {
      super.addStep(step, doc2);
      this.updated = this.updated & ~UPDATED_MARKS;
      this.storedMarks = null;
    }
    /**
    Update the timestamp for the transaction.
    */
    setTime(time) {
      this.time = time;
      return this;
    }
    /**
    Replace the current selection with the given slice.
    */
    replaceSelection(slice) {
      this.selection.replace(this, slice);
      return this;
    }
    /**
    Replace the selection with the given node. When `inheritMarks` is
    true and the content is inline, it inherits the marks from the
    place where it is inserted.
    */
    replaceSelectionWith(node, inheritMarks = true) {
      let selection = this.selection;
      if (inheritMarks)
        node = node.mark(this.storedMarks || (selection.empty ? selection.$from.marks() : selection.$from.marksAcross(selection.$to) || Mark$1.none));
      selection.replaceWith(this, node);
      return this;
    }
    /**
    Delete the selection.
    */
    deleteSelection() {
      this.selection.replace(this);
      return this;
    }
    /**
    Replace the given range, or the selection if no range is given,
    with a text node containing the given string.
    */
    insertText(text, from, to) {
      let schema = this.doc.type.schema;
      if (from == null) {
        if (!text)
          return this.deleteSelection();
        return this.replaceSelectionWith(schema.text(text), true);
      } else {
        if (to == null)
          to = from;
        to = to == null ? from : to;
        if (!text)
          return this.deleteRange(from, to);
        let marks = this.storedMarks;
        if (!marks) {
          let $from = this.doc.resolve(from);
          marks = to == from ? $from.marks() : $from.marksAcross(this.doc.resolve(to));
        }
        this.replaceRangeWith(from, to, schema.text(text, marks));
        if (!this.selection.empty)
          this.setSelection(Selection.near(this.selection.$to));
        return this;
      }
    }
    /**
    Store a metadata property in this transaction, keyed either by
    name or by plugin.
    */
    setMeta(key, value) {
      this.meta[typeof key == "string" ? key : key.key] = value;
      return this;
    }
    /**
    Retrieve a metadata property for a given name or plugin.
    */
    getMeta(key) {
      return this.meta[typeof key == "string" ? key : key.key];
    }
    /**
    Returns true if this transaction doesn't contain any metadata,
    and can thus safely be extended.
    */
    get isGeneric() {
      for (let _ in this.meta)
        return false;
      return true;
    }
    /**
    Indicate that the editor should scroll the selection into view
    when updated to the state produced by this transaction.
    */
    scrollIntoView() {
      this.updated |= UPDATED_SCROLL;
      return this;
    }
    /**
    True when this transaction has had `scrollIntoView` called on it.
    */
    get scrolledIntoView() {
      return (this.updated & UPDATED_SCROLL) > 0;
    }
  }
  function bind(f, self2) {
    return !self2 || !f ? f : f.bind(self2);
  }
  class FieldDesc {
    constructor(name, desc, self2) {
      this.name = name;
      this.init = bind(desc.init, self2);
      this.apply = bind(desc.apply, self2);
    }
  }
  const baseFields = [
    new FieldDesc("doc", {
      init(config) {
        return config.doc || config.schema.topNodeType.createAndFill();
      },
      apply(tr2) {
        return tr2.doc;
      }
    }),
    new FieldDesc("selection", {
      init(config, instance) {
        return config.selection || Selection.atStart(instance.doc);
      },
      apply(tr2) {
        return tr2.selection;
      }
    }),
    new FieldDesc("storedMarks", {
      init(config) {
        return config.storedMarks || null;
      },
      apply(tr2, _marks, _old, state) {
        return state.selection.$cursor ? tr2.storedMarks : null;
      }
    }),
    new FieldDesc("scrollToSelection", {
      init() {
        return 0;
      },
      apply(tr2, prev) {
        return tr2.scrolledIntoView ? prev + 1 : prev;
      }
    })
  ];
  class Configuration {
    constructor(schema, plugins) {
      this.schema = schema;
      this.plugins = [];
      this.pluginsByKey = /* @__PURE__ */ Object.create(null);
      this.fields = baseFields.slice();
      if (plugins)
        plugins.forEach((plugin) => {
          if (this.pluginsByKey[plugin.key])
            throw new RangeError("Adding different instances of a keyed plugin (" + plugin.key + ")");
          this.plugins.push(plugin);
          this.pluginsByKey[plugin.key] = plugin;
          if (plugin.spec.state)
            this.fields.push(new FieldDesc(plugin.key, plugin.spec.state, plugin));
        });
    }
  }
  class EditorState {
    /**
    @internal
    */
    constructor(config) {
      this.config = config;
    }
    /**
    The schema of the state's document.
    */
    get schema() {
      return this.config.schema;
    }
    /**
    The plugins that are active in this state.
    */
    get plugins() {
      return this.config.plugins;
    }
    /**
    Apply the given transaction to produce a new state.
    */
    apply(tr2) {
      return this.applyTransaction(tr2).state;
    }
    /**
    @internal
    */
    filterTransaction(tr2, ignore = -1) {
      for (let i2 = 0; i2 < this.config.plugins.length; i2++)
        if (i2 != ignore) {
          let plugin = this.config.plugins[i2];
          if (plugin.spec.filterTransaction && !plugin.spec.filterTransaction.call(plugin, tr2, this))
            return false;
        }
      return true;
    }
    /**
    Verbose variant of [`apply`](https://prosemirror.net/docs/ref/#state.EditorState.apply) that
    returns the precise transactions that were applied (which might
    be influenced by the [transaction
    hooks](https://prosemirror.net/docs/ref/#state.PluginSpec.filterTransaction) of
    plugins) along with the new state.
    */
    applyTransaction(rootTr) {
      if (!this.filterTransaction(rootTr))
        return { state: this, transactions: [] };
      let trs = [rootTr], newState = this.applyInner(rootTr), seen = null;
      for (; ; ) {
        let haveNew = false;
        for (let i2 = 0; i2 < this.config.plugins.length; i2++) {
          let plugin = this.config.plugins[i2];
          if (plugin.spec.appendTransaction) {
            let n = seen ? seen[i2].n : 0, oldState = seen ? seen[i2].state : this;
            let tr2 = n < trs.length && plugin.spec.appendTransaction.call(plugin, n ? trs.slice(n) : trs, oldState, newState);
            if (tr2 && newState.filterTransaction(tr2, i2)) {
              tr2.setMeta("appendedTransaction", rootTr);
              if (!seen) {
                seen = [];
                for (let j = 0; j < this.config.plugins.length; j++)
                  seen.push(j < i2 ? { state: newState, n: trs.length } : { state: this, n: 0 });
              }
              trs.push(tr2);
              newState = newState.applyInner(tr2);
              haveNew = true;
            }
            if (seen)
              seen[i2] = { state: newState, n: trs.length };
          }
        }
        if (!haveNew)
          return { state: newState, transactions: trs };
      }
    }
    /**
    @internal
    */
    applyInner(tr2) {
      if (!tr2.before.eq(this.doc))
        throw new RangeError("Applying a mismatched transaction");
      let newInstance = new EditorState(this.config), fields = this.config.fields;
      for (let i2 = 0; i2 < fields.length; i2++) {
        let field = fields[i2];
        newInstance[field.name] = field.apply(tr2, this[field.name], this, newInstance);
      }
      return newInstance;
    }
    /**
    Start a [transaction](https://prosemirror.net/docs/ref/#state.Transaction) from this state.
    */
    get tr() {
      return new Transaction(this);
    }
    /**
    Create a new state.
    */
    static create(config) {
      let $config = new Configuration(config.doc ? config.doc.type.schema : config.schema, config.plugins);
      let instance = new EditorState($config);
      for (let i2 = 0; i2 < $config.fields.length; i2++)
        instance[$config.fields[i2].name] = $config.fields[i2].init(config, instance);
      return instance;
    }
    /**
    Create a new state based on this one, but with an adjusted set
    of active plugins. State fields that exist in both sets of
    plugins are kept unchanged. Those that no longer exist are
    dropped, and those that are new are initialized using their
    [`init`](https://prosemirror.net/docs/ref/#state.StateField.init) method, passing in the new
    configuration object..
    */
    reconfigure(config) {
      let $config = new Configuration(this.schema, config.plugins);
      let fields = $config.fields, instance = new EditorState($config);
      for (let i2 = 0; i2 < fields.length; i2++) {
        let name = fields[i2].name;
        instance[name] = this.hasOwnProperty(name) ? this[name] : fields[i2].init(config, instance);
      }
      return instance;
    }
    /**
    Serialize this state to JSON. If you want to serialize the state
    of plugins, pass an object mapping property names to use in the
    resulting JSON object to plugin objects. The argument may also be
    a string or number, in which case it is ignored, to support the
    way `JSON.stringify` calls `toString` methods.
    */
    toJSON(pluginFields) {
      let result = { doc: this.doc.toJSON(), selection: this.selection.toJSON() };
      if (this.storedMarks)
        result.storedMarks = this.storedMarks.map((m) => m.toJSON());
      if (pluginFields && typeof pluginFields == "object")
        for (let prop in pluginFields) {
          if (prop == "doc" || prop == "selection")
            throw new RangeError("The JSON fields `doc` and `selection` are reserved");
          let plugin = pluginFields[prop], state = plugin.spec.state;
          if (state && state.toJSON)
            result[prop] = state.toJSON.call(plugin, this[plugin.key]);
        }
      return result;
    }
    /**
    Deserialize a JSON representation of a state. `config` should
    have at least a `schema` field, and should contain array of
    plugins to initialize the state with. `pluginFields` can be used
    to deserialize the state of plugins, by associating plugin
    instances with the property names they use in the JSON object.
    */
    static fromJSON(config, json, pluginFields) {
      if (!json)
        throw new RangeError("Invalid input for EditorState.fromJSON");
      if (!config.schema)
        throw new RangeError("Required config field 'schema' missing");
      let $config = new Configuration(config.schema, config.plugins);
      let instance = new EditorState($config);
      $config.fields.forEach((field) => {
        if (field.name == "doc") {
          instance.doc = Node$1.fromJSON(config.schema, json.doc);
        } else if (field.name == "selection") {
          instance.selection = Selection.fromJSON(instance.doc, json.selection);
        } else if (field.name == "storedMarks") {
          if (json.storedMarks)
            instance.storedMarks = json.storedMarks.map(config.schema.markFromJSON);
        } else {
          if (pluginFields)
            for (let prop in pluginFields) {
              let plugin = pluginFields[prop], state = plugin.spec.state;
              if (plugin.key == field.name && state && state.fromJSON && Object.prototype.hasOwnProperty.call(json, prop)) {
                instance[field.name] = state.fromJSON.call(plugin, config, json[prop], instance);
                return;
              }
            }
          instance[field.name] = field.init(config, instance);
        }
      });
      return instance;
    }
  }
  function bindProps(obj, self2, target) {
    for (let prop in obj) {
      let val = obj[prop];
      if (val instanceof Function)
        val = val.bind(self2);
      else if (prop == "handleDOMEvents")
        val = bindProps(val, self2, {});
      target[prop] = val;
    }
    return target;
  }
  class Plugin {
    /**
    Create a plugin.
    */
    constructor(spec) {
      this.spec = spec;
      this.props = {};
      if (spec.props)
        bindProps(spec.props, this, this.props);
      this.key = spec.key ? spec.key.key : createKey("plugin");
    }
    /**
    Extract the plugin's state field from an editor state.
    */
    getState(state) {
      return state[this.key];
    }
  }
  const keys = /* @__PURE__ */ Object.create(null);
  function createKey(name) {
    if (name in keys)
      return name + "$" + ++keys[name];
    keys[name] = 0;
    return name + "$";
  }
  class PluginKey {
    /**
    Create a plugin key.
    */
    constructor(name = "key") {
      this.key = createKey(name);
    }
    /**
    Get the active plugin with this key, if any, from an editor
    state.
    */
    get(state) {
      return state.config.pluginsByKey[this.key];
    }
    /**
    Get the plugin's state from an editor state.
    */
    getState(state) {
      return state[this.key];
    }
  }
  const domIndex = function(node) {
    for (var index = 0; ; index++) {
      node = node.previousSibling;
      if (!node)
        return index;
    }
  };
  const parentNode = function(node) {
    let parent = node.assignedSlot || node.parentNode;
    return parent && parent.nodeType == 11 ? parent.host : parent;
  };
  let reusedRange = null;
  const textRange = function(node, from, to) {
    let range = reusedRange || (reusedRange = document.createRange());
    range.setEnd(node, to == null ? node.nodeValue.length : to);
    range.setStart(node, from || 0);
    return range;
  };
  const clearReusedRange = function() {
    reusedRange = null;
  };
  const isEquivalentPosition = function(node, off, targetNode, targetOff) {
    return targetNode && (scanFor(node, off, targetNode, targetOff, -1) || scanFor(node, off, targetNode, targetOff, 1));
  };
  const atomElements = /^(img|br|input|textarea|hr)$/i;
  function scanFor(node, off, targetNode, targetOff, dir) {
    for (; ; ) {
      if (node == targetNode && off == targetOff)
        return true;
      if (off == (dir < 0 ? 0 : nodeSize(node))) {
        let parent = node.parentNode;
        if (!parent || parent.nodeType != 1 || hasBlockDesc(node) || atomElements.test(node.nodeName) || node.contentEditable == "false")
          return false;
        off = domIndex(node) + (dir < 0 ? 0 : 1);
        node = parent;
      } else if (node.nodeType == 1) {
        node = node.childNodes[off + (dir < 0 ? -1 : 0)];
        if (node.contentEditable == "false")
          return false;
        off = dir < 0 ? nodeSize(node) : 0;
      } else {
        return false;
      }
    }
  }
  function nodeSize(node) {
    return node.nodeType == 3 ? node.nodeValue.length : node.childNodes.length;
  }
  function textNodeBefore$1(node, offset) {
    for (; ; ) {
      if (node.nodeType == 3 && offset)
        return node;
      if (node.nodeType == 1 && offset > 0) {
        if (node.contentEditable == "false")
          return null;
        node = node.childNodes[offset - 1];
        offset = nodeSize(node);
      } else if (node.parentNode && !hasBlockDesc(node)) {
        offset = domIndex(node);
        node = node.parentNode;
      } else {
        return null;
      }
    }
  }
  function textNodeAfter$1(node, offset) {
    for (; ; ) {
      if (node.nodeType == 3 && offset < node.nodeValue.length)
        return node;
      if (node.nodeType == 1 && offset < node.childNodes.length) {
        if (node.contentEditable == "false")
          return null;
        node = node.childNodes[offset];
        offset = 0;
      } else if (node.parentNode && !hasBlockDesc(node)) {
        offset = domIndex(node) + 1;
        node = node.parentNode;
      } else {
        return null;
      }
    }
  }
  function isOnEdge(node, offset, parent) {
    for (let atStart = offset == 0, atEnd = offset == nodeSize(node); atStart || atEnd; ) {
      if (node == parent)
        return true;
      let index = domIndex(node);
      node = node.parentNode;
      if (!node)
        return false;
      atStart = atStart && index == 0;
      atEnd = atEnd && index == nodeSize(node);
    }
  }
  function hasBlockDesc(dom) {
    let desc;
    for (let cur = dom; cur; cur = cur.parentNode)
      if (desc = cur.pmViewDesc)
        break;
    return desc && desc.node && desc.node.isBlock && (desc.dom == dom || desc.contentDOM == dom);
  }
  const selectionCollapsed = function(domSel) {
    return domSel.focusNode && isEquivalentPosition(domSel.focusNode, domSel.focusOffset, domSel.anchorNode, domSel.anchorOffset);
  };
  function keyEvent(keyCode, key) {
    let event = document.createEvent("Event");
    event.initEvent("keydown", true, true);
    event.keyCode = keyCode;
    event.key = event.code = key;
    return event;
  }
  function deepActiveElement(doc2) {
    let elt = doc2.activeElement;
    while (elt && elt.shadowRoot)
      elt = elt.shadowRoot.activeElement;
    return elt;
  }
  function caretFromPoint(doc2, x, y) {
    if (doc2.caretPositionFromPoint) {
      try {
        let pos = doc2.caretPositionFromPoint(x, y);
        if (pos)
          return { node: pos.offsetNode, offset: Math.min(nodeSize(pos.offsetNode), pos.offset) };
      } catch (_) {
      }
    }
    if (doc2.caretRangeFromPoint) {
      let range = doc2.caretRangeFromPoint(x, y);
      if (range)
        return { node: range.startContainer, offset: Math.min(nodeSize(range.startContainer), range.startOffset) };
    }
  }
  const nav = typeof navigator != "undefined" ? navigator : null;
  const doc = typeof document != "undefined" ? document : null;
  const agent = nav && nav.userAgent || "";
  const ie_edge = /Edge\/(\d+)/.exec(agent);
  const ie_upto10 = /MSIE \d/.exec(agent);
  const ie_11up = /Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(agent);
  const ie$1 = !!(ie_upto10 || ie_11up || ie_edge);
  const ie_version = ie_upto10 ? document.documentMode : ie_11up ? +ie_11up[1] : ie_edge ? +ie_edge[1] : 0;
  const gecko = !ie$1 && /gecko\/(\d+)/i.test(agent);
  gecko && +(/Firefox\/(\d+)/.exec(agent) || [0, 0])[1];
  const _chrome = !ie$1 && /Chrome\/(\d+)/.exec(agent);
  const chrome = !!_chrome;
  const chrome_version = _chrome ? +_chrome[1] : 0;
  const safari = !ie$1 && !!nav && /Apple Computer/.test(nav.vendor);
  const ios = safari && (/Mobile\/\w+/.test(agent) || !!nav && nav.maxTouchPoints > 2);
  const mac$2 = ios || (nav ? /Mac/.test(nav.platform) : false);
  const windows = nav ? /Win/.test(nav.platform) : false;
  const android = /Android \d/.test(agent);
  const webkit = !!doc && "webkitFontSmoothing" in doc.documentElement.style;
  const webkit_version = webkit ? +(/\bAppleWebKit\/(\d+)/.exec(navigator.userAgent) || [0, 0])[1] : 0;
  function windowRect(doc2) {
    let vp = doc2.defaultView && doc2.defaultView.visualViewport;
    if (vp)
      return {
        left: 0,
        right: vp.width,
        top: 0,
        bottom: vp.height
      };
    return {
      left: 0,
      right: doc2.documentElement.clientWidth,
      top: 0,
      bottom: doc2.documentElement.clientHeight
    };
  }
  function getSide(value, side) {
    return typeof value == "number" ? value : value[side];
  }
  function clientRect(node) {
    let rect = node.getBoundingClientRect();
    let scaleX = rect.width / node.offsetWidth || 1;
    let scaleY = rect.height / node.offsetHeight || 1;
    return {
      left: rect.left,
      right: rect.left + node.clientWidth * scaleX,
      top: rect.top,
      bottom: rect.top + node.clientHeight * scaleY
    };
  }
  function scrollRectIntoView(view, rect, startDOM) {
    let scrollThreshold = view.someProp("scrollThreshold") || 0, scrollMargin = view.someProp("scrollMargin") || 5;
    let doc2 = view.dom.ownerDocument;
    for (let parent = startDOM || view.dom; ; parent = parentNode(parent)) {
      if (!parent)
        break;
      if (parent.nodeType != 1)
        continue;
      let elt = parent;
      let atTop = elt == doc2.body;
      let bounding = atTop ? windowRect(doc2) : clientRect(elt);
      let moveX = 0, moveY = 0;
      if (rect.top < bounding.top + getSide(scrollThreshold, "top"))
        moveY = -(bounding.top - rect.top + getSide(scrollMargin, "top"));
      else if (rect.bottom > bounding.bottom - getSide(scrollThreshold, "bottom"))
        moveY = rect.bottom - rect.top > bounding.bottom - bounding.top ? rect.top + getSide(scrollMargin, "top") - bounding.top : rect.bottom - bounding.bottom + getSide(scrollMargin, "bottom");
      if (rect.left < bounding.left + getSide(scrollThreshold, "left"))
        moveX = -(bounding.left - rect.left + getSide(scrollMargin, "left"));
      else if (rect.right > bounding.right - getSide(scrollThreshold, "right"))
        moveX = rect.right - bounding.right + getSide(scrollMargin, "right");
      if (moveX || moveY) {
        if (atTop) {
          doc2.defaultView.scrollBy(moveX, moveY);
        } else {
          let startX = elt.scrollLeft, startY = elt.scrollTop;
          if (moveY)
            elt.scrollTop += moveY;
          if (moveX)
            elt.scrollLeft += moveX;
          let dX = elt.scrollLeft - startX, dY = elt.scrollTop - startY;
          rect = { left: rect.left - dX, top: rect.top - dY, right: rect.right - dX, bottom: rect.bottom - dY };
        }
      }
      if (atTop || /^(fixed|sticky)$/.test(getComputedStyle(parent).position))
        break;
    }
  }
  function storeScrollPos(view) {
    let rect = view.dom.getBoundingClientRect(), startY = Math.max(0, rect.top);
    let refDOM, refTop;
    for (let x = (rect.left + rect.right) / 2, y = startY + 1; y < Math.min(innerHeight, rect.bottom); y += 5) {
      let dom = view.root.elementFromPoint(x, y);
      if (!dom || dom == view.dom || !view.dom.contains(dom))
        continue;
      let localRect = dom.getBoundingClientRect();
      if (localRect.top >= startY - 20) {
        refDOM = dom;
        refTop = localRect.top;
        break;
      }
    }
    return { refDOM, refTop, stack: scrollStack(view.dom) };
  }
  function scrollStack(dom) {
    let stack = [], doc2 = dom.ownerDocument;
    for (let cur = dom; cur; cur = parentNode(cur)) {
      stack.push({ dom: cur, top: cur.scrollTop, left: cur.scrollLeft });
      if (dom == doc2)
        break;
    }
    return stack;
  }
  function resetScrollPos({ refDOM, refTop, stack }) {
    let newRefTop = refDOM ? refDOM.getBoundingClientRect().top : 0;
    restoreScrollStack(stack, newRefTop == 0 ? 0 : newRefTop - refTop);
  }
  function restoreScrollStack(stack, dTop) {
    for (let i2 = 0; i2 < stack.length; i2++) {
      let { dom, top, left } = stack[i2];
      if (dom.scrollTop != top + dTop)
        dom.scrollTop = top + dTop;
      if (dom.scrollLeft != left)
        dom.scrollLeft = left;
    }
  }
  let preventScrollSupported = null;
  function focusPreventScroll(dom) {
    if (dom.setActive)
      return dom.setActive();
    if (preventScrollSupported)
      return dom.focus(preventScrollSupported);
    let stored = scrollStack(dom);
    dom.focus(preventScrollSupported == null ? {
      get preventScroll() {
        preventScrollSupported = { preventScroll: true };
        return true;
      }
    } : void 0);
    if (!preventScrollSupported) {
      preventScrollSupported = false;
      restoreScrollStack(stored, 0);
    }
  }
  function findOffsetInNode(node, coords) {
    let closest, dxClosest = 2e8, coordsClosest, offset = 0;
    let rowBot = coords.top, rowTop = coords.top;
    let firstBelow, coordsBelow;
    for (let child = node.firstChild, childIndex = 0; child; child = child.nextSibling, childIndex++) {
      let rects;
      if (child.nodeType == 1)
        rects = child.getClientRects();
      else if (child.nodeType == 3)
        rects = textRange(child).getClientRects();
      else
        continue;
      for (let i2 = 0; i2 < rects.length; i2++) {
        let rect = rects[i2];
        if (rect.top <= rowBot && rect.bottom >= rowTop) {
          rowBot = Math.max(rect.bottom, rowBot);
          rowTop = Math.min(rect.top, rowTop);
          let dx = rect.left > coords.left ? rect.left - coords.left : rect.right < coords.left ? coords.left - rect.right : 0;
          if (dx < dxClosest) {
            closest = child;
            dxClosest = dx;
            coordsClosest = dx && closest.nodeType == 3 ? {
              left: rect.right < coords.left ? rect.right : rect.left,
              top: coords.top
            } : coords;
            if (child.nodeType == 1 && dx)
              offset = childIndex + (coords.left >= (rect.left + rect.right) / 2 ? 1 : 0);
            continue;
          }
        } else if (rect.top > coords.top && !firstBelow && rect.left <= coords.left && rect.right >= coords.left) {
          firstBelow = child;
          coordsBelow = { left: Math.max(rect.left, Math.min(rect.right, coords.left)), top: rect.top };
        }
        if (!closest && (coords.left >= rect.right && coords.top >= rect.top || coords.left >= rect.left && coords.top >= rect.bottom))
          offset = childIndex + 1;
      }
    }
    if (!closest && firstBelow) {
      closest = firstBelow;
      coordsClosest = coordsBelow;
      dxClosest = 0;
    }
    if (closest && closest.nodeType == 3)
      return findOffsetInText(closest, coordsClosest);
    if (!closest || dxClosest && closest.nodeType == 1)
      return { node, offset };
    return findOffsetInNode(closest, coordsClosest);
  }
  function findOffsetInText(node, coords) {
    let len = node.nodeValue.length;
    let range = document.createRange();
    for (let i2 = 0; i2 < len; i2++) {
      range.setEnd(node, i2 + 1);
      range.setStart(node, i2);
      let rect = singleRect(range, 1);
      if (rect.top == rect.bottom)
        continue;
      if (inRect(coords, rect))
        return { node, offset: i2 + (coords.left >= (rect.left + rect.right) / 2 ? 1 : 0) };
    }
    return { node, offset: 0 };
  }
  function inRect(coords, rect) {
    return coords.left >= rect.left - 1 && coords.left <= rect.right + 1 && coords.top >= rect.top - 1 && coords.top <= rect.bottom + 1;
  }
  function targetKludge(dom, coords) {
    let parent = dom.parentNode;
    if (parent && /^li$/i.test(parent.nodeName) && coords.left < dom.getBoundingClientRect().left)
      return parent;
    return dom;
  }
  function posFromElement(view, elt, coords) {
    let { node, offset } = findOffsetInNode(elt, coords), bias = -1;
    if (node.nodeType == 1 && !node.firstChild) {
      let rect = node.getBoundingClientRect();
      bias = rect.left != rect.right && coords.left > (rect.left + rect.right) / 2 ? 1 : -1;
    }
    return view.docView.posFromDOM(node, offset, bias);
  }
  function posFromCaret(view, node, offset, coords) {
    let outsideBlock = -1;
    for (let cur = node, sawBlock = false; ; ) {
      if (cur == view.dom)
        break;
      let desc = view.docView.nearestDesc(cur, true);
      if (!desc)
        return null;
      if (desc.dom.nodeType == 1 && (desc.node.isBlock && desc.parent || !desc.contentDOM)) {
        let rect = desc.dom.getBoundingClientRect();
        if (desc.node.isBlock && desc.parent) {
          if (!sawBlock && rect.left > coords.left || rect.top > coords.top)
            outsideBlock = desc.posBefore;
          else if (!sawBlock && rect.right < coords.left || rect.bottom < coords.top)
            outsideBlock = desc.posAfter;
          sawBlock = true;
        }
        if (!desc.contentDOM && outsideBlock < 0 && !desc.node.isText) {
          let before = desc.node.isBlock ? coords.top < (rect.top + rect.bottom) / 2 : coords.left < (rect.left + rect.right) / 2;
          return before ? desc.posBefore : desc.posAfter;
        }
      }
      cur = desc.dom.parentNode;
    }
    return outsideBlock > -1 ? outsideBlock : view.docView.posFromDOM(node, offset, -1);
  }
  function elementFromPoint(element, coords, box) {
    let len = element.childNodes.length;
    if (len && box.top < box.bottom) {
      for (let startI = Math.max(0, Math.min(len - 1, Math.floor(len * (coords.top - box.top) / (box.bottom - box.top)) - 2)), i2 = startI; ; ) {
        let child = element.childNodes[i2];
        if (child.nodeType == 1) {
          let rects = child.getClientRects();
          for (let j = 0; j < rects.length; j++) {
            let rect = rects[j];
            if (inRect(coords, rect))
              return elementFromPoint(child, coords, rect);
          }
        }
        if ((i2 = (i2 + 1) % len) == startI)
          break;
      }
    }
    return element;
  }
  function posAtCoords(view, coords) {
    let doc2 = view.dom.ownerDocument, node, offset = 0;
    let caret = caretFromPoint(doc2, coords.left, coords.top);
    if (caret)
      ({ node, offset } = caret);
    let elt = (view.root.elementFromPoint ? view.root : doc2).elementFromPoint(coords.left, coords.top);
    let pos;
    if (!elt || !view.dom.contains(elt.nodeType != 1 ? elt.parentNode : elt)) {
      let box = view.dom.getBoundingClientRect();
      if (!inRect(coords, box))
        return null;
      elt = elementFromPoint(view.dom, coords, box);
      if (!elt)
        return null;
    }
    if (safari) {
      for (let p2 = elt; node && p2; p2 = parentNode(p2))
        if (p2.draggable)
          node = void 0;
    }
    elt = targetKludge(elt, coords);
    if (node) {
      if (gecko && node.nodeType == 1) {
        offset = Math.min(offset, node.childNodes.length);
        if (offset < node.childNodes.length) {
          let next = node.childNodes[offset], box;
          if (next.nodeName == "IMG" && (box = next.getBoundingClientRect()).right <= coords.left && box.bottom > coords.top)
            offset++;
        }
      }
      let prev;
      if (webkit && offset && node.nodeType == 1 && (prev = node.childNodes[offset - 1]).nodeType == 1 && prev.contentEditable == "false" && prev.getBoundingClientRect().top >= coords.top)
        offset--;
      if (node == view.dom && offset == node.childNodes.length - 1 && node.lastChild.nodeType == 1 && coords.top > node.lastChild.getBoundingClientRect().bottom)
        pos = view.state.doc.content.size;
      else if (offset == 0 || node.nodeType != 1 || node.childNodes[offset - 1].nodeName != "BR")
        pos = posFromCaret(view, node, offset, coords);
    }
    if (pos == null)
      pos = posFromElement(view, elt, coords);
    let desc = view.docView.nearestDesc(elt, true);
    return { pos, inside: desc ? desc.posAtStart - desc.border : -1 };
  }
  function nonZero(rect) {
    return rect.top < rect.bottom || rect.left < rect.right;
  }
  function singleRect(target, bias) {
    let rects = target.getClientRects();
    if (rects.length) {
      let first2 = rects[bias < 0 ? 0 : rects.length - 1];
      if (nonZero(first2))
        return first2;
    }
    return Array.prototype.find.call(rects, nonZero) || target.getBoundingClientRect();
  }
  const BIDI = /[\u0590-\u05f4\u0600-\u06ff\u0700-\u08ac]/;
  function coordsAtPos(view, pos, side) {
    let { node, offset, atom } = view.docView.domFromPos(pos, side < 0 ? -1 : 1);
    let supportEmptyRange = webkit || gecko;
    if (node.nodeType == 3) {
      if (supportEmptyRange && (BIDI.test(node.nodeValue) || (side < 0 ? !offset : offset == node.nodeValue.length))) {
        let rect = singleRect(textRange(node, offset, offset), side);
        if (gecko && offset && /\s/.test(node.nodeValue[offset - 1]) && offset < node.nodeValue.length) {
          let rectBefore = singleRect(textRange(node, offset - 1, offset - 1), -1);
          if (rectBefore.top == rect.top) {
            let rectAfter = singleRect(textRange(node, offset, offset + 1), -1);
            if (rectAfter.top != rect.top)
              return flattenV(rectAfter, rectAfter.left < rectBefore.left);
          }
        }
        return rect;
      } else {
        let from = offset, to = offset, takeSide = side < 0 ? 1 : -1;
        if (side < 0 && !offset) {
          to++;
          takeSide = -1;
        } else if (side >= 0 && offset == node.nodeValue.length) {
          from--;
          takeSide = 1;
        } else if (side < 0) {
          from--;
        } else {
          to++;
        }
        return flattenV(singleRect(textRange(node, from, to), takeSide), takeSide < 0);
      }
    }
    let $dom = view.state.doc.resolve(pos - (atom || 0));
    if (!$dom.parent.inlineContent) {
      if (atom == null && offset && (side < 0 || offset == nodeSize(node))) {
        let before = node.childNodes[offset - 1];
        if (before.nodeType == 1)
          return flattenH(before.getBoundingClientRect(), false);
      }
      if (atom == null && offset < nodeSize(node)) {
        let after = node.childNodes[offset];
        if (after.nodeType == 1)
          return flattenH(after.getBoundingClientRect(), true);
      }
      return flattenH(node.getBoundingClientRect(), side >= 0);
    }
    if (atom == null && offset && (side < 0 || offset == nodeSize(node))) {
      let before = node.childNodes[offset - 1];
      let target = before.nodeType == 3 ? textRange(before, nodeSize(before) - (supportEmptyRange ? 0 : 1)) : before.nodeType == 1 && (before.nodeName != "BR" || !before.nextSibling) ? before : null;
      if (target)
        return flattenV(singleRect(target, 1), false);
    }
    if (atom == null && offset < nodeSize(node)) {
      let after = node.childNodes[offset];
      while (after.pmViewDesc && after.pmViewDesc.ignoreForCoords)
        after = after.nextSibling;
      let target = !after ? null : after.nodeType == 3 ? textRange(after, 0, supportEmptyRange ? 0 : 1) : after.nodeType == 1 ? after : null;
      if (target)
        return flattenV(singleRect(target, -1), true);
    }
    return flattenV(singleRect(node.nodeType == 3 ? textRange(node) : node, -side), side >= 0);
  }
  function flattenV(rect, left) {
    if (rect.width == 0)
      return rect;
    let x = left ? rect.left : rect.right;
    return { top: rect.top, bottom: rect.bottom, left: x, right: x };
  }
  function flattenH(rect, top) {
    if (rect.height == 0)
      return rect;
    let y = top ? rect.top : rect.bottom;
    return { top: y, bottom: y, left: rect.left, right: rect.right };
  }
  function withFlushedState(view, state, f) {
    let viewState = view.state, active = view.root.activeElement;
    if (viewState != state)
      view.updateState(state);
    if (active != view.dom)
      view.focus();
    try {
      return f();
    } finally {
      if (viewState != state)
        view.updateState(viewState);
      if (active != view.dom && active)
        active.focus();
    }
  }
  function endOfTextblockVertical(view, state, dir) {
    let sel = state.selection;
    let $pos = dir == "up" ? sel.$from : sel.$to;
    return withFlushedState(view, state, () => {
      let { node: dom } = view.docView.domFromPos($pos.pos, dir == "up" ? -1 : 1);
      for (; ; ) {
        let nearest = view.docView.nearestDesc(dom, true);
        if (!nearest)
          break;
        if (nearest.node.isBlock) {
          dom = nearest.contentDOM || nearest.dom;
          break;
        }
        dom = nearest.dom.parentNode;
      }
      let coords = coordsAtPos(view, $pos.pos, 1);
      for (let child = dom.firstChild; child; child = child.nextSibling) {
        let boxes;
        if (child.nodeType == 1)
          boxes = child.getClientRects();
        else if (child.nodeType == 3)
          boxes = textRange(child, 0, child.nodeValue.length).getClientRects();
        else
          continue;
        for (let i2 = 0; i2 < boxes.length; i2++) {
          let box = boxes[i2];
          if (box.bottom > box.top + 1 && (dir == "up" ? coords.top - box.top > (box.bottom - coords.top) * 2 : box.bottom - coords.bottom > (coords.bottom - box.top) * 2))
            return false;
        }
      }
      return true;
    });
  }
  const maybeRTL = /[\u0590-\u08ac]/;
  function endOfTextblockHorizontal(view, state, dir) {
    let { $head } = state.selection;
    if (!$head.parent.isTextblock)
      return false;
    let offset = $head.parentOffset, atStart = !offset, atEnd = offset == $head.parent.content.size;
    let sel = view.domSelection();
    if (!sel)
      return $head.pos == $head.start() || $head.pos == $head.end();
    if (!maybeRTL.test($head.parent.textContent) || !sel.modify)
      return dir == "left" || dir == "backward" ? atStart : atEnd;
    return withFlushedState(view, state, () => {
      let { focusNode: oldNode, focusOffset: oldOff, anchorNode, anchorOffset } = view.domSelectionRange();
      let oldBidiLevel = sel.caretBidiLevel;
      sel.modify("move", dir, "character");
      let parentDOM = $head.depth ? view.docView.domAfterPos($head.before()) : view.dom;
      let { focusNode: newNode, focusOffset: newOff } = view.domSelectionRange();
      let result = newNode && !parentDOM.contains(newNode.nodeType == 1 ? newNode : newNode.parentNode) || oldNode == newNode && oldOff == newOff;
      try {
        sel.collapse(anchorNode, anchorOffset);
        if (oldNode && (oldNode != anchorNode || oldOff != anchorOffset) && sel.extend)
          sel.extend(oldNode, oldOff);
      } catch (_) {
      }
      if (oldBidiLevel != null)
        sel.caretBidiLevel = oldBidiLevel;
      return result;
    });
  }
  let cachedState = null;
  let cachedDir = null;
  let cachedResult = false;
  function endOfTextblock(view, state, dir) {
    if (cachedState == state && cachedDir == dir)
      return cachedResult;
    cachedState = state;
    cachedDir = dir;
    return cachedResult = dir == "up" || dir == "down" ? endOfTextblockVertical(view, state, dir) : endOfTextblockHorizontal(view, state, dir);
  }
  const NOT_DIRTY = 0, CHILD_DIRTY = 1, CONTENT_DIRTY = 2, NODE_DIRTY = 3;
  class ViewDesc {
    constructor(parent, children, dom, contentDOM) {
      this.parent = parent;
      this.children = children;
      this.dom = dom;
      this.contentDOM = contentDOM;
      this.dirty = NOT_DIRTY;
      dom.pmViewDesc = this;
    }
    // Used to check whether a given description corresponds to a
    // widget/mark/node.
    matchesWidget(widget) {
      return false;
    }
    matchesMark(mark) {
      return false;
    }
    matchesNode(node, outerDeco, innerDeco) {
      return false;
    }
    matchesHack(nodeName) {
      return false;
    }
    // When parsing in-editor content (in domchange.js), we allow
    // descriptions to determine the parse rules that should be used to
    // parse them.
    parseRule() {
      return null;
    }
    // Used by the editor's event handler to ignore events that come
    // from certain descs.
    stopEvent(event) {
      return false;
    }
    // The size of the content represented by this desc.
    get size() {
      let size = 0;
      for (let i2 = 0; i2 < this.children.length; i2++)
        size += this.children[i2].size;
      return size;
    }
    // For block nodes, this represents the space taken up by their
    // start/end tokens.
    get border() {
      return 0;
    }
    destroy() {
      this.parent = void 0;
      if (this.dom.pmViewDesc == this)
        this.dom.pmViewDesc = void 0;
      for (let i2 = 0; i2 < this.children.length; i2++)
        this.children[i2].destroy();
    }
    posBeforeChild(child) {
      for (let i2 = 0, pos = this.posAtStart; ; i2++) {
        let cur = this.children[i2];
        if (cur == child)
          return pos;
        pos += cur.size;
      }
    }
    get posBefore() {
      return this.parent.posBeforeChild(this);
    }
    get posAtStart() {
      return this.parent ? this.parent.posBeforeChild(this) + this.border : 0;
    }
    get posAfter() {
      return this.posBefore + this.size;
    }
    get posAtEnd() {
      return this.posAtStart + this.size - 2 * this.border;
    }
    localPosFromDOM(dom, offset, bias) {
      if (this.contentDOM && this.contentDOM.contains(dom.nodeType == 1 ? dom : dom.parentNode)) {
        if (bias < 0) {
          let domBefore, desc;
          if (dom == this.contentDOM) {
            domBefore = dom.childNodes[offset - 1];
          } else {
            while (dom.parentNode != this.contentDOM)
              dom = dom.parentNode;
            domBefore = dom.previousSibling;
          }
          while (domBefore && !((desc = domBefore.pmViewDesc) && desc.parent == this))
            domBefore = domBefore.previousSibling;
          return domBefore ? this.posBeforeChild(desc) + desc.size : this.posAtStart;
        } else {
          let domAfter, desc;
          if (dom == this.contentDOM) {
            domAfter = dom.childNodes[offset];
          } else {
            while (dom.parentNode != this.contentDOM)
              dom = dom.parentNode;
            domAfter = dom.nextSibling;
          }
          while (domAfter && !((desc = domAfter.pmViewDesc) && desc.parent == this))
            domAfter = domAfter.nextSibling;
          return domAfter ? this.posBeforeChild(desc) : this.posAtEnd;
        }
      }
      let atEnd;
      if (dom == this.dom && this.contentDOM) {
        atEnd = offset > domIndex(this.contentDOM);
      } else if (this.contentDOM && this.contentDOM != this.dom && this.dom.contains(this.contentDOM)) {
        atEnd = dom.compareDocumentPosition(this.contentDOM) & 2;
      } else if (this.dom.firstChild) {
        if (offset == 0)
          for (let search = dom; ; search = search.parentNode) {
            if (search == this.dom) {
              atEnd = false;
              break;
            }
            if (search.previousSibling)
              break;
          }
        if (atEnd == null && offset == dom.childNodes.length)
          for (let search = dom; ; search = search.parentNode) {
            if (search == this.dom) {
              atEnd = true;
              break;
            }
            if (search.nextSibling)
              break;
          }
      }
      return (atEnd == null ? bias > 0 : atEnd) ? this.posAtEnd : this.posAtStart;
    }
    nearestDesc(dom, onlyNodes = false) {
      for (let first2 = true, cur = dom; cur; cur = cur.parentNode) {
        let desc = this.getDesc(cur), nodeDOM;
        if (desc && (!onlyNodes || desc.node)) {
          if (first2 && (nodeDOM = desc.nodeDOM) && !(nodeDOM.nodeType == 1 ? nodeDOM.contains(dom.nodeType == 1 ? dom : dom.parentNode) : nodeDOM == dom))
            first2 = false;
          else
            return desc;
        }
      }
    }
    getDesc(dom) {
      let desc = dom.pmViewDesc;
      for (let cur = desc; cur; cur = cur.parent)
        if (cur == this)
          return desc;
    }
    posFromDOM(dom, offset, bias) {
      for (let scan = dom; scan; scan = scan.parentNode) {
        let desc = this.getDesc(scan);
        if (desc)
          return desc.localPosFromDOM(dom, offset, bias);
      }
      return -1;
    }
    // Find the desc for the node after the given pos, if any. (When a
    // parent node overrode rendering, there might not be one.)
    descAt(pos) {
      for (let i2 = 0, offset = 0; i2 < this.children.length; i2++) {
        let child = this.children[i2], end = offset + child.size;
        if (offset == pos && end != offset) {
          while (!child.border && child.children.length)
            child = child.children[0];
          return child;
        }
        if (pos < end)
          return child.descAt(pos - offset - child.border);
        offset = end;
      }
    }
    domFromPos(pos, side) {
      if (!this.contentDOM)
        return { node: this.dom, offset: 0, atom: pos + 1 };
      let i2 = 0, offset = 0;
      for (let curPos = 0; i2 < this.children.length; i2++) {
        let child = this.children[i2], end = curPos + child.size;
        if (end > pos || child instanceof TrailingHackViewDesc) {
          offset = pos - curPos;
          break;
        }
        curPos = end;
      }
      if (offset)
        return this.children[i2].domFromPos(offset - this.children[i2].border, side);
      for (let prev; i2 && !(prev = this.children[i2 - 1]).size && prev instanceof WidgetViewDesc && prev.side >= 0; i2--) {
      }
      if (side <= 0) {
        let prev, enter2 = true;
        for (; ; i2--, enter2 = false) {
          prev = i2 ? this.children[i2 - 1] : null;
          if (!prev || prev.dom.parentNode == this.contentDOM)
            break;
        }
        if (prev && side && enter2 && !prev.border && !prev.domAtom)
          return prev.domFromPos(prev.size, side);
        return { node: this.contentDOM, offset: prev ? domIndex(prev.dom) + 1 : 0 };
      } else {
        let next, enter2 = true;
        for (; ; i2++, enter2 = false) {
          next = i2 < this.children.length ? this.children[i2] : null;
          if (!next || next.dom.parentNode == this.contentDOM)
            break;
        }
        if (next && enter2 && !next.border && !next.domAtom)
          return next.domFromPos(0, side);
        return { node: this.contentDOM, offset: next ? domIndex(next.dom) : this.contentDOM.childNodes.length };
      }
    }
    // Used to find a DOM range in a single parent for a given changed
    // range.
    parseRange(from, to, base2 = 0) {
      if (this.children.length == 0)
        return { node: this.contentDOM, from, to, fromOffset: 0, toOffset: this.contentDOM.childNodes.length };
      let fromOffset = -1, toOffset = -1;
      for (let offset = base2, i2 = 0; ; i2++) {
        let child = this.children[i2], end = offset + child.size;
        if (fromOffset == -1 && from <= end) {
          let childBase = offset + child.border;
          if (from >= childBase && to <= end - child.border && child.node && child.contentDOM && this.contentDOM.contains(child.contentDOM))
            return child.parseRange(from, to, childBase);
          from = offset;
          for (let j = i2; j > 0; j--) {
            let prev = this.children[j - 1];
            if (prev.size && prev.dom.parentNode == this.contentDOM && !prev.emptyChildAt(1)) {
              fromOffset = domIndex(prev.dom) + 1;
              break;
            }
            from -= prev.size;
          }
          if (fromOffset == -1)
            fromOffset = 0;
        }
        if (fromOffset > -1 && (end > to || i2 == this.children.length - 1)) {
          to = end;
          for (let j = i2 + 1; j < this.children.length; j++) {
            let next = this.children[j];
            if (next.size && next.dom.parentNode == this.contentDOM && !next.emptyChildAt(-1)) {
              toOffset = domIndex(next.dom);
              break;
            }
            to += next.size;
          }
          if (toOffset == -1)
            toOffset = this.contentDOM.childNodes.length;
          break;
        }
        offset = end;
      }
      return { node: this.contentDOM, from, to, fromOffset, toOffset };
    }
    emptyChildAt(side) {
      if (this.border || !this.contentDOM || !this.children.length)
        return false;
      let child = this.children[side < 0 ? 0 : this.children.length - 1];
      return child.size == 0 || child.emptyChildAt(side);
    }
    domAfterPos(pos) {
      let { node, offset } = this.domFromPos(pos, 0);
      if (node.nodeType != 1 || offset == node.childNodes.length)
        throw new RangeError("No node after pos " + pos);
      return node.childNodes[offset];
    }
    // View descs are responsible for setting any selection that falls
    // entirely inside of them, so that custom implementations can do
    // custom things with the selection. Note that this falls apart when
    // a selection starts in such a node and ends in another, in which
    // case we just use whatever domFromPos produces as a best effort.
    setSelection(anchor, head, view, force = false) {
      let from = Math.min(anchor, head), to = Math.max(anchor, head);
      for (let i2 = 0, offset = 0; i2 < this.children.length; i2++) {
        let child = this.children[i2], end = offset + child.size;
        if (from > offset && to < end)
          return child.setSelection(anchor - offset - child.border, head - offset - child.border, view, force);
        offset = end;
      }
      let anchorDOM = this.domFromPos(anchor, anchor ? -1 : 1);
      let headDOM = head == anchor ? anchorDOM : this.domFromPos(head, head ? -1 : 1);
      let domSel = view.root.getSelection();
      let selRange = view.domSelectionRange();
      let brKludge = false;
      if ((gecko || safari) && anchor == head) {
        let { node, offset } = anchorDOM;
        if (node.nodeType == 3) {
          brKludge = !!(offset && node.nodeValue[offset - 1] == "\n");
          if (brKludge && offset == node.nodeValue.length) {
            for (let scan = node, after; scan; scan = scan.parentNode) {
              if (after = scan.nextSibling) {
                if (after.nodeName == "BR")
                  anchorDOM = headDOM = { node: after.parentNode, offset: domIndex(after) + 1 };
                break;
              }
              let desc = scan.pmViewDesc;
              if (desc && desc.node && desc.node.isBlock)
                break;
            }
          }
        } else {
          let prev = node.childNodes[offset - 1];
          brKludge = prev && (prev.nodeName == "BR" || prev.contentEditable == "false");
        }
      }
      if (gecko && selRange.focusNode && selRange.focusNode != headDOM.node && selRange.focusNode.nodeType == 1) {
        let after = selRange.focusNode.childNodes[selRange.focusOffset];
        if (after && after.contentEditable == "false")
          force = true;
      }
      if (!(force || brKludge && safari) && isEquivalentPosition(anchorDOM.node, anchorDOM.offset, selRange.anchorNode, selRange.anchorOffset) && isEquivalentPosition(headDOM.node, headDOM.offset, selRange.focusNode, selRange.focusOffset))
        return;
      let domSelExtended = false;
      if ((domSel.extend || anchor == head) && !brKludge) {
        domSel.collapse(anchorDOM.node, anchorDOM.offset);
        try {
          if (anchor != head)
            domSel.extend(headDOM.node, headDOM.offset);
          domSelExtended = true;
        } catch (_) {
        }
      }
      if (!domSelExtended) {
        if (anchor > head) {
          let tmp = anchorDOM;
          anchorDOM = headDOM;
          headDOM = tmp;
        }
        let range = document.createRange();
        range.setEnd(headDOM.node, headDOM.offset);
        range.setStart(anchorDOM.node, anchorDOM.offset);
        domSel.removeAllRanges();
        domSel.addRange(range);
      }
    }
    ignoreMutation(mutation) {
      return !this.contentDOM && mutation.type != "selection";
    }
    get contentLost() {
      return this.contentDOM && this.contentDOM != this.dom && !this.dom.contains(this.contentDOM);
    }
    // Remove a subtree of the element tree that has been touched
    // by a DOM change, so that the next update will redraw it.
    markDirty(from, to) {
      for (let offset = 0, i2 = 0; i2 < this.children.length; i2++) {
        let child = this.children[i2], end = offset + child.size;
        if (offset == end ? from <= end && to >= offset : from < end && to > offset) {
          let startInside = offset + child.border, endInside = end - child.border;
          if (from >= startInside && to <= endInside) {
            this.dirty = from == offset || to == end ? CONTENT_DIRTY : CHILD_DIRTY;
            if (from == startInside && to == endInside && (child.contentLost || child.dom.parentNode != this.contentDOM))
              child.dirty = NODE_DIRTY;
            else
              child.markDirty(from - startInside, to - startInside);
            return;
          } else {
            child.dirty = child.dom == child.contentDOM && child.dom.parentNode == this.contentDOM && !child.children.length ? CONTENT_DIRTY : NODE_DIRTY;
          }
        }
        offset = end;
      }
      this.dirty = CONTENT_DIRTY;
    }
    markParentsDirty() {
      let level = 1;
      for (let node = this.parent; node; node = node.parent, level++) {
        let dirty = level == 1 ? CONTENT_DIRTY : CHILD_DIRTY;
        if (node.dirty < dirty)
          node.dirty = dirty;
      }
    }
    get domAtom() {
      return false;
    }
    get ignoreForCoords() {
      return false;
    }
    isText(text) {
      return false;
    }
  }
  class WidgetViewDesc extends ViewDesc {
    constructor(parent, widget, view, pos) {
      let self2, dom = widget.type.toDOM;
      if (typeof dom == "function")
        dom = dom(view, () => {
          if (!self2)
            return pos;
          if (self2.parent)
            return self2.parent.posBeforeChild(self2);
        });
      if (!widget.type.spec.raw) {
        if (dom.nodeType != 1) {
          let wrap2 = document.createElement("span");
          wrap2.appendChild(dom);
          dom = wrap2;
        }
        dom.contentEditable = "false";
        dom.classList.add("ProseMirror-widget");
      }
      super(parent, [], dom, null);
      this.widget = widget;
      this.widget = widget;
      self2 = this;
    }
    matchesWidget(widget) {
      return this.dirty == NOT_DIRTY && widget.type.eq(this.widget.type);
    }
    parseRule() {
      return { ignore: true };
    }
    stopEvent(event) {
      let stop = this.widget.spec.stopEvent;
      return stop ? stop(event) : false;
    }
    ignoreMutation(mutation) {
      return mutation.type != "selection" || this.widget.spec.ignoreSelection;
    }
    destroy() {
      this.widget.type.destroy(this.dom);
      super.destroy();
    }
    get domAtom() {
      return true;
    }
    get side() {
      return this.widget.type.side;
    }
  }
  class CompositionViewDesc extends ViewDesc {
    constructor(parent, dom, textDOM, text) {
      super(parent, [], dom, null);
      this.textDOM = textDOM;
      this.text = text;
    }
    get size() {
      return this.text.length;
    }
    localPosFromDOM(dom, offset) {
      if (dom != this.textDOM)
        return this.posAtStart + (offset ? this.size : 0);
      return this.posAtStart + offset;
    }
    domFromPos(pos) {
      return { node: this.textDOM, offset: pos };
    }
    ignoreMutation(mut) {
      return mut.type === "characterData" && mut.target.nodeValue == mut.oldValue;
    }
  }
  class MarkViewDesc extends ViewDesc {
    constructor(parent, mark, dom, contentDOM, spec) {
      super(parent, [], dom, contentDOM);
      this.mark = mark;
      this.spec = spec;
    }
    static create(parent, mark, inline, view) {
      let custom = view.nodeViews[mark.type.name];
      let spec = custom && custom(mark, view, inline);
      if (!spec || !spec.dom)
        spec = DOMSerializer.renderSpec(document, mark.type.spec.toDOM(mark, inline), null, mark.attrs);
      return new MarkViewDesc(parent, mark, spec.dom, spec.contentDOM || spec.dom, spec);
    }
    parseRule() {
      if (this.dirty & NODE_DIRTY || this.mark.type.spec.reparseInView)
        return null;
      return { mark: this.mark.type.name, attrs: this.mark.attrs, contentElement: this.contentDOM };
    }
    matchesMark(mark) {
      return this.dirty != NODE_DIRTY && this.mark.eq(mark);
    }
    markDirty(from, to) {
      super.markDirty(from, to);
      if (this.dirty != NOT_DIRTY) {
        let parent = this.parent;
        while (!parent.node)
          parent = parent.parent;
        if (parent.dirty < this.dirty)
          parent.dirty = this.dirty;
        this.dirty = NOT_DIRTY;
      }
    }
    slice(from, to, view) {
      let copy2 = MarkViewDesc.create(this.parent, this.mark, true, view);
      let nodes = this.children, size = this.size;
      if (to < size)
        nodes = replaceNodes(nodes, to, size, view);
      if (from > 0)
        nodes = replaceNodes(nodes, 0, from, view);
      for (let i2 = 0; i2 < nodes.length; i2++)
        nodes[i2].parent = copy2;
      copy2.children = nodes;
      return copy2;
    }
    ignoreMutation(mutation) {
      return this.spec.ignoreMutation ? this.spec.ignoreMutation(mutation) : super.ignoreMutation(mutation);
    }
    destroy() {
      if (this.spec.destroy)
        this.spec.destroy();
      super.destroy();
    }
  }
  class NodeViewDesc extends ViewDesc {
    constructor(parent, node, outerDeco, innerDeco, dom, contentDOM, nodeDOM, view, pos) {
      super(parent, [], dom, contentDOM);
      this.node = node;
      this.outerDeco = outerDeco;
      this.innerDeco = innerDeco;
      this.nodeDOM = nodeDOM;
    }
    // By default, a node is rendered using the `toDOM` method from the
    // node type spec. But client code can use the `nodeViews` spec to
    // supply a custom node view, which can influence various aspects of
    // the way the node works.
    //
    // (Using subclassing for this was intentionally decided against,
    // since it'd require exposing a whole slew of finicky
    // implementation details to the user code that they probably will
    // never need.)
    static create(parent, node, outerDeco, innerDeco, view, pos) {
      let custom = view.nodeViews[node.type.name], descObj;
      let spec = custom && custom(node, view, () => {
        if (!descObj)
          return pos;
        if (descObj.parent)
          return descObj.parent.posBeforeChild(descObj);
      }, outerDeco, innerDeco);
      let dom = spec && spec.dom, contentDOM = spec && spec.contentDOM;
      if (node.isText) {
        if (!dom)
          dom = document.createTextNode(node.text);
        else if (dom.nodeType != 3)
          throw new RangeError("Text must be rendered as a DOM text node");
      } else if (!dom) {
        let spec2 = DOMSerializer.renderSpec(document, node.type.spec.toDOM(node), null, node.attrs);
        ({ dom, contentDOM } = spec2);
      }
      if (!contentDOM && !node.isText && dom.nodeName != "BR") {
        if (!dom.hasAttribute("contenteditable"))
          dom.contentEditable = "false";
        if (node.type.spec.draggable)
          dom.draggable = true;
      }
      let nodeDOM = dom;
      dom = applyOuterDeco(dom, outerDeco, node);
      if (spec)
        return descObj = new CustomNodeViewDesc(parent, node, outerDeco, innerDeco, dom, contentDOM || null, nodeDOM, spec, view, pos + 1);
      else if (node.isText)
        return new TextViewDesc(parent, node, outerDeco, innerDeco, dom, nodeDOM, view);
      else
        return new NodeViewDesc(parent, node, outerDeco, innerDeco, dom, contentDOM || null, nodeDOM, view, pos + 1);
    }
    parseRule() {
      if (this.node.type.spec.reparseInView)
        return null;
      let rule = { node: this.node.type.name, attrs: this.node.attrs };
      if (this.node.type.whitespace == "pre")
        rule.preserveWhitespace = "full";
      if (!this.contentDOM) {
        rule.getContent = () => this.node.content;
      } else if (!this.contentLost) {
        rule.contentElement = this.contentDOM;
      } else {
        for (let i2 = this.children.length - 1; i2 >= 0; i2--) {
          let child = this.children[i2];
          if (this.dom.contains(child.dom.parentNode)) {
            rule.contentElement = child.dom.parentNode;
            break;
          }
        }
        if (!rule.contentElement)
          rule.getContent = () => Fragment.empty;
      }
      return rule;
    }
    matchesNode(node, outerDeco, innerDeco) {
      return this.dirty == NOT_DIRTY && node.eq(this.node) && sameOuterDeco(outerDeco, this.outerDeco) && innerDeco.eq(this.innerDeco);
    }
    get size() {
      return this.node.nodeSize;
    }
    get border() {
      return this.node.isLeaf ? 0 : 1;
    }
    // Syncs `this.children` to match `this.node.content` and the local
    // decorations, possibly introducing nesting for marks. Then, in a
    // separate step, syncs the DOM inside `this.contentDOM` to
    // `this.children`.
    updateChildren(view, pos) {
      let inline = this.node.inlineContent, off = pos;
      let composition = view.composing ? this.localCompositionInfo(view, pos) : null;
      let localComposition = composition && composition.pos > -1 ? composition : null;
      let compositionInChild = composition && composition.pos < 0;
      let updater = new ViewTreeUpdater(this, localComposition && localComposition.node, view);
      iterDeco(this.node, this.innerDeco, (widget, i2, insideNode) => {
        if (widget.spec.marks)
          updater.syncToMarks(widget.spec.marks, inline, view);
        else if (widget.type.side >= 0 && !insideNode)
          updater.syncToMarks(i2 == this.node.childCount ? Mark$1.none : this.node.child(i2).marks, inline, view);
        updater.placeWidget(widget, view, off);
      }, (child, outerDeco, innerDeco, i2) => {
        updater.syncToMarks(child.marks, inline, view);
        let compIndex;
        if (updater.findNodeMatch(child, outerDeco, innerDeco, i2)) ;
        else if (compositionInChild && view.state.selection.from > off && view.state.selection.to < off + child.nodeSize && (compIndex = updater.findIndexWithChild(composition.node)) > -1 && updater.updateNodeAt(child, outerDeco, innerDeco, compIndex, view)) ;
        else if (updater.updateNextNode(child, outerDeco, innerDeco, view, i2, off)) ;
        else {
          updater.addNode(child, outerDeco, innerDeco, view, off);
        }
        off += child.nodeSize;
      });
      updater.syncToMarks([], inline, view);
      if (this.node.isTextblock)
        updater.addTextblockHacks();
      updater.destroyRest();
      if (updater.changed || this.dirty == CONTENT_DIRTY) {
        if (localComposition)
          this.protectLocalComposition(view, localComposition);
        renderDescs(this.contentDOM, this.children, view);
        if (ios)
          iosHacks(this.dom);
      }
    }
    localCompositionInfo(view, pos) {
      let { from, to } = view.state.selection;
      if (!(view.state.selection instanceof TextSelection) || from < pos || to > pos + this.node.content.size)
        return null;
      let textNode = view.input.compositionNode;
      if (!textNode || !this.dom.contains(textNode.parentNode))
        return null;
      if (this.node.inlineContent) {
        let text = textNode.nodeValue;
        let textPos = findTextInFragment(this.node.content, text, from - pos, to - pos);
        return textPos < 0 ? null : { node: textNode, pos: textPos, text };
      } else {
        return { node: textNode, pos: -1, text: "" };
      }
    }
    protectLocalComposition(view, { node, pos, text }) {
      if (this.getDesc(node))
        return;
      let topNode = node;
      for (; ; topNode = topNode.parentNode) {
        if (topNode.parentNode == this.contentDOM)
          break;
        while (topNode.previousSibling)
          topNode.parentNode.removeChild(topNode.previousSibling);
        while (topNode.nextSibling)
          topNode.parentNode.removeChild(topNode.nextSibling);
        if (topNode.pmViewDesc)
          topNode.pmViewDesc = void 0;
      }
      let desc = new CompositionViewDesc(this, topNode, node, text);
      view.input.compositionNodes.push(desc);
      this.children = replaceNodes(this.children, pos, pos + text.length, view, desc);
    }
    // If this desc must be updated to match the given node decoration,
    // do so and return true.
    update(node, outerDeco, innerDeco, view) {
      if (this.dirty == NODE_DIRTY || !node.sameMarkup(this.node))
        return false;
      this.updateInner(node, outerDeco, innerDeco, view);
      return true;
    }
    updateInner(node, outerDeco, innerDeco, view) {
      this.updateOuterDeco(outerDeco);
      this.node = node;
      this.innerDeco = innerDeco;
      if (this.contentDOM)
        this.updateChildren(view, this.posAtStart);
      this.dirty = NOT_DIRTY;
    }
    updateOuterDeco(outerDeco) {
      if (sameOuterDeco(outerDeco, this.outerDeco))
        return;
      let needsWrap = this.nodeDOM.nodeType != 1;
      let oldDOM = this.dom;
      this.dom = patchOuterDeco(this.dom, this.nodeDOM, computeOuterDeco(this.outerDeco, this.node, needsWrap), computeOuterDeco(outerDeco, this.node, needsWrap));
      if (this.dom != oldDOM) {
        oldDOM.pmViewDesc = void 0;
        this.dom.pmViewDesc = this;
      }
      this.outerDeco = outerDeco;
    }
    // Mark this node as being the selected node.
    selectNode() {
      if (this.nodeDOM.nodeType == 1)
        this.nodeDOM.classList.add("ProseMirror-selectednode");
      if (this.contentDOM || !this.node.type.spec.draggable)
        this.dom.draggable = true;
    }
    // Remove selected node marking from this node.
    deselectNode() {
      if (this.nodeDOM.nodeType == 1) {
        this.nodeDOM.classList.remove("ProseMirror-selectednode");
        if (this.contentDOM || !this.node.type.spec.draggable)
          this.dom.removeAttribute("draggable");
      }
    }
    get domAtom() {
      return this.node.isAtom;
    }
  }
  function docViewDesc(doc2, outerDeco, innerDeco, dom, view) {
    applyOuterDeco(dom, outerDeco, doc2);
    let docView = new NodeViewDesc(void 0, doc2, outerDeco, innerDeco, dom, dom, dom, view, 0);
    if (docView.contentDOM)
      docView.updateChildren(view, 0);
    return docView;
  }
  class TextViewDesc extends NodeViewDesc {
    constructor(parent, node, outerDeco, innerDeco, dom, nodeDOM, view) {
      super(parent, node, outerDeco, innerDeco, dom, null, nodeDOM, view, 0);
    }
    parseRule() {
      let skip = this.nodeDOM.parentNode;
      while (skip && skip != this.dom && !skip.pmIsDeco)
        skip = skip.parentNode;
      return { skip: skip || true };
    }
    update(node, outerDeco, innerDeco, view) {
      if (this.dirty == NODE_DIRTY || this.dirty != NOT_DIRTY && !this.inParent() || !node.sameMarkup(this.node))
        return false;
      this.updateOuterDeco(outerDeco);
      if ((this.dirty != NOT_DIRTY || node.text != this.node.text) && node.text != this.nodeDOM.nodeValue) {
        this.nodeDOM.nodeValue = node.text;
        if (view.trackWrites == this.nodeDOM)
          view.trackWrites = null;
      }
      this.node = node;
      this.dirty = NOT_DIRTY;
      return true;
    }
    inParent() {
      let parentDOM = this.parent.contentDOM;
      for (let n = this.nodeDOM; n; n = n.parentNode)
        if (n == parentDOM)
          return true;
      return false;
    }
    domFromPos(pos) {
      return { node: this.nodeDOM, offset: pos };
    }
    localPosFromDOM(dom, offset, bias) {
      if (dom == this.nodeDOM)
        return this.posAtStart + Math.min(offset, this.node.text.length);
      return super.localPosFromDOM(dom, offset, bias);
    }
    ignoreMutation(mutation) {
      return mutation.type != "characterData" && mutation.type != "selection";
    }
    slice(from, to, view) {
      let node = this.node.cut(from, to), dom = document.createTextNode(node.text);
      return new TextViewDesc(this.parent, node, this.outerDeco, this.innerDeco, dom, dom, view);
    }
    markDirty(from, to) {
      super.markDirty(from, to);
      if (this.dom != this.nodeDOM && (from == 0 || to == this.nodeDOM.nodeValue.length))
        this.dirty = NODE_DIRTY;
    }
    get domAtom() {
      return false;
    }
    isText(text) {
      return this.node.text == text;
    }
  }
  class TrailingHackViewDesc extends ViewDesc {
    parseRule() {
      return { ignore: true };
    }
    matchesHack(nodeName) {
      return this.dirty == NOT_DIRTY && this.dom.nodeName == nodeName;
    }
    get domAtom() {
      return true;
    }
    get ignoreForCoords() {
      return this.dom.nodeName == "IMG";
    }
  }
  class CustomNodeViewDesc extends NodeViewDesc {
    constructor(parent, node, outerDeco, innerDeco, dom, contentDOM, nodeDOM, spec, view, pos) {
      super(parent, node, outerDeco, innerDeco, dom, contentDOM, nodeDOM, view, pos);
      this.spec = spec;
    }
    // A custom `update` method gets to decide whether the update goes
    // through. If it does, and there's a `contentDOM` node, our logic
    // updates the children.
    update(node, outerDeco, innerDeco, view) {
      if (this.dirty == NODE_DIRTY)
        return false;
      if (this.spec.update && (this.node.type == node.type || this.spec.multiType)) {
        let result = this.spec.update(node, outerDeco, innerDeco);
        if (result)
          this.updateInner(node, outerDeco, innerDeco, view);
        return result;
      } else if (!this.contentDOM && !node.isLeaf) {
        return false;
      } else {
        return super.update(node, outerDeco, innerDeco, view);
      }
    }
    selectNode() {
      this.spec.selectNode ? this.spec.selectNode() : super.selectNode();
    }
    deselectNode() {
      this.spec.deselectNode ? this.spec.deselectNode() : super.deselectNode();
    }
    setSelection(anchor, head, view, force) {
      this.spec.setSelection ? this.spec.setSelection(anchor, head, view.root) : super.setSelection(anchor, head, view, force);
    }
    destroy() {
      if (this.spec.destroy)
        this.spec.destroy();
      super.destroy();
    }
    stopEvent(event) {
      return this.spec.stopEvent ? this.spec.stopEvent(event) : false;
    }
    ignoreMutation(mutation) {
      return this.spec.ignoreMutation ? this.spec.ignoreMutation(mutation) : super.ignoreMutation(mutation);
    }
  }
  function renderDescs(parentDOM, descs, view) {
    let dom = parentDOM.firstChild, written = false;
    for (let i2 = 0; i2 < descs.length; i2++) {
      let desc = descs[i2], childDOM = desc.dom;
      if (childDOM.parentNode == parentDOM) {
        while (childDOM != dom) {
          dom = rm(dom);
          written = true;
        }
        dom = dom.nextSibling;
      } else {
        written = true;
        parentDOM.insertBefore(childDOM, dom);
      }
      if (desc instanceof MarkViewDesc) {
        let pos = dom ? dom.previousSibling : parentDOM.lastChild;
        renderDescs(desc.contentDOM, desc.children, view);
        dom = pos ? pos.nextSibling : parentDOM.firstChild;
      }
    }
    while (dom) {
      dom = rm(dom);
      written = true;
    }
    if (written && view.trackWrites == parentDOM)
      view.trackWrites = null;
  }
  const OuterDecoLevel = function(nodeName) {
    if (nodeName)
      this.nodeName = nodeName;
  };
  OuterDecoLevel.prototype = /* @__PURE__ */ Object.create(null);
  const noDeco = [new OuterDecoLevel()];
  function computeOuterDeco(outerDeco, node, needsWrap) {
    if (outerDeco.length == 0)
      return noDeco;
    let top = needsWrap ? noDeco[0] : new OuterDecoLevel(), result = [top];
    for (let i2 = 0; i2 < outerDeco.length; i2++) {
      let attrs = outerDeco[i2].type.attrs;
      if (!attrs)
        continue;
      if (attrs.nodeName)
        result.push(top = new OuterDecoLevel(attrs.nodeName));
      for (let name in attrs) {
        let val = attrs[name];
        if (val == null)
          continue;
        if (needsWrap && result.length == 1)
          result.push(top = new OuterDecoLevel(node.isInline ? "span" : "div"));
        if (name == "class")
          top.class = (top.class ? top.class + " " : "") + val;
        else if (name == "style")
          top.style = (top.style ? top.style + ";" : "") + val;
        else if (name != "nodeName")
          top[name] = val;
      }
    }
    return result;
  }
  function patchOuterDeco(outerDOM, nodeDOM, prevComputed, curComputed) {
    if (prevComputed == noDeco && curComputed == noDeco)
      return nodeDOM;
    let curDOM = nodeDOM;
    for (let i2 = 0; i2 < curComputed.length; i2++) {
      let deco = curComputed[i2], prev = prevComputed[i2];
      if (i2) {
        let parent;
        if (prev && prev.nodeName == deco.nodeName && curDOM != outerDOM && (parent = curDOM.parentNode) && parent.nodeName.toLowerCase() == deco.nodeName) {
          curDOM = parent;
        } else {
          parent = document.createElement(deco.nodeName);
          parent.pmIsDeco = true;
          parent.appendChild(curDOM);
          prev = noDeco[0];
          curDOM = parent;
        }
      }
      patchAttributes(curDOM, prev || noDeco[0], deco);
    }
    return curDOM;
  }
  function patchAttributes(dom, prev, cur) {
    for (let name in prev)
      if (name != "class" && name != "style" && name != "nodeName" && !(name in cur))
        dom.removeAttribute(name);
    for (let name in cur)
      if (name != "class" && name != "style" && name != "nodeName" && cur[name] != prev[name])
        dom.setAttribute(name, cur[name]);
    if (prev.class != cur.class) {
      let prevList = prev.class ? prev.class.split(" ").filter(Boolean) : [];
      let curList = cur.class ? cur.class.split(" ").filter(Boolean) : [];
      for (let i2 = 0; i2 < prevList.length; i2++)
        if (curList.indexOf(prevList[i2]) == -1)
          dom.classList.remove(prevList[i2]);
      for (let i2 = 0; i2 < curList.length; i2++)
        if (prevList.indexOf(curList[i2]) == -1)
          dom.classList.add(curList[i2]);
      if (dom.classList.length == 0)
        dom.removeAttribute("class");
    }
    if (prev.style != cur.style) {
      if (prev.style) {
        let prop = /\s*([\w\-\xa1-\uffff]+)\s*:(?:"(?:\\.|[^"])*"|'(?:\\.|[^'])*'|\(.*?\)|[^;])*/g, m;
        while (m = prop.exec(prev.style))
          dom.style.removeProperty(m[1]);
      }
      if (cur.style)
        dom.style.cssText += cur.style;
    }
  }
  function applyOuterDeco(dom, deco, node) {
    return patchOuterDeco(dom, dom, noDeco, computeOuterDeco(deco, node, dom.nodeType != 1));
  }
  function sameOuterDeco(a2, b2) {
    if (a2.length != b2.length)
      return false;
    for (let i2 = 0; i2 < a2.length; i2++)
      if (!a2[i2].type.eq(b2[i2].type))
        return false;
    return true;
  }
  function rm(dom) {
    let next = dom.nextSibling;
    dom.parentNode.removeChild(dom);
    return next;
  }
  class ViewTreeUpdater {
    constructor(top, lock, view) {
      this.lock = lock;
      this.view = view;
      this.index = 0;
      this.stack = [];
      this.changed = false;
      this.top = top;
      this.preMatch = preMatch(top.node.content, top);
    }
    // Destroy and remove the children between the given indices in
    // `this.top`.
    destroyBetween(start, end) {
      if (start == end)
        return;
      for (let i2 = start; i2 < end; i2++)
        this.top.children[i2].destroy();
      this.top.children.splice(start, end - start);
      this.changed = true;
    }
    // Destroy all remaining children in `this.top`.
    destroyRest() {
      this.destroyBetween(this.index, this.top.children.length);
    }
    // Sync the current stack of mark descs with the given array of
    // marks, reusing existing mark descs when possible.
    syncToMarks(marks, inline, view) {
      let keep = 0, depth = this.stack.length >> 1;
      let maxKeep = Math.min(depth, marks.length);
      while (keep < maxKeep && (keep == depth - 1 ? this.top : this.stack[keep + 1 << 1]).matchesMark(marks[keep]) && marks[keep].type.spec.spanning !== false)
        keep++;
      while (keep < depth) {
        this.destroyRest();
        this.top.dirty = NOT_DIRTY;
        this.index = this.stack.pop();
        this.top = this.stack.pop();
        depth--;
      }
      while (depth < marks.length) {
        this.stack.push(this.top, this.index + 1);
        let found2 = -1;
        for (let i2 = this.index; i2 < Math.min(this.index + 3, this.top.children.length); i2++) {
          let next = this.top.children[i2];
          if (next.matchesMark(marks[depth]) && !this.isLocked(next.dom)) {
            found2 = i2;
            break;
          }
        }
        if (found2 > -1) {
          if (found2 > this.index) {
            this.changed = true;
            this.destroyBetween(this.index, found2);
          }
          this.top = this.top.children[this.index];
        } else {
          let markDesc = MarkViewDesc.create(this.top, marks[depth], inline, view);
          this.top.children.splice(this.index, 0, markDesc);
          this.top = markDesc;
          this.changed = true;
        }
        this.index = 0;
        depth++;
      }
    }
    // Try to find a node desc matching the given data. Skip over it and
    // return true when successful.
    findNodeMatch(node, outerDeco, innerDeco, index) {
      let found2 = -1, targetDesc;
      if (index >= this.preMatch.index && (targetDesc = this.preMatch.matches[index - this.preMatch.index]).parent == this.top && targetDesc.matchesNode(node, outerDeco, innerDeco)) {
        found2 = this.top.children.indexOf(targetDesc, this.index);
      } else {
        for (let i2 = this.index, e = Math.min(this.top.children.length, i2 + 5); i2 < e; i2++) {
          let child = this.top.children[i2];
          if (child.matchesNode(node, outerDeco, innerDeco) && !this.preMatch.matched.has(child)) {
            found2 = i2;
            break;
          }
        }
      }
      if (found2 < 0)
        return false;
      this.destroyBetween(this.index, found2);
      this.index++;
      return true;
    }
    updateNodeAt(node, outerDeco, innerDeco, index, view) {
      let child = this.top.children[index];
      if (child.dirty == NODE_DIRTY && child.dom == child.contentDOM)
        child.dirty = CONTENT_DIRTY;
      if (!child.update(node, outerDeco, innerDeco, view))
        return false;
      this.destroyBetween(this.index, index);
      this.index++;
      return true;
    }
    findIndexWithChild(domNode) {
      for (; ; ) {
        let parent = domNode.parentNode;
        if (!parent)
          return -1;
        if (parent == this.top.contentDOM) {
          let desc = domNode.pmViewDesc;
          if (desc)
            for (let i2 = this.index; i2 < this.top.children.length; i2++) {
              if (this.top.children[i2] == desc)
                return i2;
            }
          return -1;
        }
        domNode = parent;
      }
    }
    // Try to update the next node, if any, to the given data. Checks
    // pre-matches to avoid overwriting nodes that could still be used.
    updateNextNode(node, outerDeco, innerDeco, view, index, pos) {
      for (let i2 = this.index; i2 < this.top.children.length; i2++) {
        let next = this.top.children[i2];
        if (next instanceof NodeViewDesc) {
          let preMatch2 = this.preMatch.matched.get(next);
          if (preMatch2 != null && preMatch2 != index)
            return false;
          let nextDOM = next.dom, updated;
          let locked = this.isLocked(nextDOM) && !(node.isText && next.node && next.node.isText && next.nodeDOM.nodeValue == node.text && next.dirty != NODE_DIRTY && sameOuterDeco(outerDeco, next.outerDeco));
          if (!locked && next.update(node, outerDeco, innerDeco, view)) {
            this.destroyBetween(this.index, i2);
            if (next.dom != nextDOM)
              this.changed = true;
            this.index++;
            return true;
          } else if (!locked && (updated = this.recreateWrapper(next, node, outerDeco, innerDeco, view, pos))) {
            this.destroyBetween(this.index, i2);
            this.top.children[this.index] = updated;
            if (updated.contentDOM) {
              updated.dirty = CONTENT_DIRTY;
              updated.updateChildren(view, pos + 1);
              updated.dirty = NOT_DIRTY;
            }
            this.changed = true;
            this.index++;
            return true;
          }
          break;
        }
      }
      return false;
    }
    // When a node with content is replaced by a different node with
    // identical content, move over its children.
    recreateWrapper(next, node, outerDeco, innerDeco, view, pos) {
      if (next.dirty || node.isAtom || !next.children.length || !next.node.content.eq(node.content) || !sameOuterDeco(outerDeco, next.outerDeco) || !innerDeco.eq(next.innerDeco))
        return null;
      let wrapper = NodeViewDesc.create(this.top, node, outerDeco, innerDeco, view, pos);
      if (wrapper.contentDOM) {
        wrapper.children = next.children;
        next.children = [];
        for (let ch of wrapper.children)
          ch.parent = wrapper;
      }
      next.destroy();
      return wrapper;
    }
    // Insert the node as a newly created node desc.
    addNode(node, outerDeco, innerDeco, view, pos) {
      let desc = NodeViewDesc.create(this.top, node, outerDeco, innerDeco, view, pos);
      if (desc.contentDOM)
        desc.updateChildren(view, pos + 1);
      this.top.children.splice(this.index++, 0, desc);
      this.changed = true;
    }
    placeWidget(widget, view, pos) {
      let next = this.index < this.top.children.length ? this.top.children[this.index] : null;
      if (next && next.matchesWidget(widget) && (widget == next.widget || !next.widget.type.toDOM.parentNode)) {
        this.index++;
      } else {
        let desc = new WidgetViewDesc(this.top, widget, view, pos);
        this.top.children.splice(this.index++, 0, desc);
        this.changed = true;
      }
    }
    // Make sure a textblock looks and behaves correctly in
    // contentEditable.
    addTextblockHacks() {
      let lastChild = this.top.children[this.index - 1], parent = this.top;
      while (lastChild instanceof MarkViewDesc) {
        parent = lastChild;
        lastChild = parent.children[parent.children.length - 1];
      }
      if (!lastChild || // Empty textblock
      !(lastChild instanceof TextViewDesc) || /\n$/.test(lastChild.node.text) || this.view.requiresGeckoHackNode && /\s$/.test(lastChild.node.text)) {
        if ((safari || chrome) && lastChild && lastChild.dom.contentEditable == "false")
          this.addHackNode("IMG", parent);
        this.addHackNode("BR", this.top);
      }
    }
    addHackNode(nodeName, parent) {
      if (parent == this.top && this.index < parent.children.length && parent.children[this.index].matchesHack(nodeName)) {
        this.index++;
      } else {
        let dom = document.createElement(nodeName);
        if (nodeName == "IMG") {
          dom.className = "ProseMirror-separator";
          dom.alt = "";
        }
        if (nodeName == "BR")
          dom.className = "ProseMirror-trailingBreak";
        let hack = new TrailingHackViewDesc(this.top, [], dom, null);
        if (parent != this.top)
          parent.children.push(hack);
        else
          parent.children.splice(this.index++, 0, hack);
        this.changed = true;
      }
    }
    isLocked(node) {
      return this.lock && (node == this.lock || node.nodeType == 1 && node.contains(this.lock.parentNode));
    }
  }
  function preMatch(frag, parentDesc) {
    let curDesc = parentDesc, descI = curDesc.children.length;
    let fI = frag.childCount, matched = /* @__PURE__ */ new Map(), matches2 = [];
    outer: while (fI > 0) {
      let desc;
      for (; ; ) {
        if (descI) {
          let next = curDesc.children[descI - 1];
          if (next instanceof MarkViewDesc) {
            curDesc = next;
            descI = next.children.length;
          } else {
            desc = next;
            descI--;
            break;
          }
        } else if (curDesc == parentDesc) {
          break outer;
        } else {
          descI = curDesc.parent.children.indexOf(curDesc);
          curDesc = curDesc.parent;
        }
      }
      let node = desc.node;
      if (!node)
        continue;
      if (node != frag.child(fI - 1))
        break;
      --fI;
      matched.set(desc, fI);
      matches2.push(desc);
    }
    return { index: fI, matched, matches: matches2.reverse() };
  }
  function compareSide(a2, b2) {
    return a2.type.side - b2.type.side;
  }
  function iterDeco(parent, deco, onWidget, onNode) {
    let locals = deco.locals(parent), offset = 0;
    if (locals.length == 0) {
      for (let i2 = 0; i2 < parent.childCount; i2++) {
        let child = parent.child(i2);
        onNode(child, locals, deco.forChild(offset, child), i2);
        offset += child.nodeSize;
      }
      return;
    }
    let decoIndex = 0, active = [], restNode = null;
    for (let parentIndex = 0; ; ) {
      let widget, widgets;
      while (decoIndex < locals.length && locals[decoIndex].to == offset) {
        let next = locals[decoIndex++];
        if (next.widget) {
          if (!widget)
            widget = next;
          else
            (widgets || (widgets = [widget])).push(next);
        }
      }
      if (widget) {
        if (widgets) {
          widgets.sort(compareSide);
          for (let i2 = 0; i2 < widgets.length; i2++)
            onWidget(widgets[i2], parentIndex, !!restNode);
        } else {
          onWidget(widget, parentIndex, !!restNode);
        }
      }
      let child, index;
      if (restNode) {
        index = -1;
        child = restNode;
        restNode = null;
      } else if (parentIndex < parent.childCount) {
        index = parentIndex;
        child = parent.child(parentIndex++);
      } else {
        break;
      }
      for (let i2 = 0; i2 < active.length; i2++)
        if (active[i2].to <= offset)
          active.splice(i2--, 1);
      while (decoIndex < locals.length && locals[decoIndex].from <= offset && locals[decoIndex].to > offset)
        active.push(locals[decoIndex++]);
      let end = offset + child.nodeSize;
      if (child.isText) {
        let cutAt = end;
        if (decoIndex < locals.length && locals[decoIndex].from < cutAt)
          cutAt = locals[decoIndex].from;
        for (let i2 = 0; i2 < active.length; i2++)
          if (active[i2].to < cutAt)
            cutAt = active[i2].to;
        if (cutAt < end) {
          restNode = child.cut(cutAt - offset);
          child = child.cut(0, cutAt - offset);
          end = cutAt;
          index = -1;
        }
      } else {
        while (decoIndex < locals.length && locals[decoIndex].to < end)
          decoIndex++;
      }
      let outerDeco = child.isInline && !child.isLeaf ? active.filter((d2) => !d2.inline) : active.slice();
      onNode(child, outerDeco, deco.forChild(offset, child), index);
      offset = end;
    }
  }
  function iosHacks(dom) {
    if (dom.nodeName == "UL" || dom.nodeName == "OL") {
      let oldCSS = dom.style.cssText;
      dom.style.cssText = oldCSS + "; list-style: square !important";
      window.getComputedStyle(dom).listStyle;
      dom.style.cssText = oldCSS;
    }
  }
  function findTextInFragment(frag, text, from, to) {
    for (let i2 = 0, pos = 0; i2 < frag.childCount && pos <= to; ) {
      let child = frag.child(i2++), childStart = pos;
      pos += child.nodeSize;
      if (!child.isText)
        continue;
      let str = child.text;
      while (i2 < frag.childCount) {
        let next = frag.child(i2++);
        pos += next.nodeSize;
        if (!next.isText)
          break;
        str += next.text;
      }
      if (pos >= from) {
        if (pos >= to && str.slice(to - text.length - childStart, to - childStart) == text)
          return to - text.length;
        let found2 = childStart < to ? str.lastIndexOf(text, to - childStart - 1) : -1;
        if (found2 >= 0 && found2 + text.length + childStart >= from)
          return childStart + found2;
        if (from == to && str.length >= to + text.length - childStart && str.slice(to - childStart, to - childStart + text.length) == text)
          return to;
      }
    }
    return -1;
  }
  function replaceNodes(nodes, from, to, view, replacement) {
    let result = [];
    for (let i2 = 0, off = 0; i2 < nodes.length; i2++) {
      let child = nodes[i2], start = off, end = off += child.size;
      if (start >= to || end <= from) {
        result.push(child);
      } else {
        if (start < from)
          result.push(child.slice(0, from - start, view));
        if (replacement) {
          result.push(replacement);
          replacement = void 0;
        }
        if (end > to)
          result.push(child.slice(to - start, child.size, view));
      }
    }
    return result;
  }
  function selectionFromDOM(view, origin = null) {
    let domSel = view.domSelectionRange(), doc2 = view.state.doc;
    if (!domSel.focusNode)
      return null;
    let nearestDesc = view.docView.nearestDesc(domSel.focusNode), inWidget = nearestDesc && nearestDesc.size == 0;
    let head = view.docView.posFromDOM(domSel.focusNode, domSel.focusOffset, 1);
    if (head < 0)
      return null;
    let $head = doc2.resolve(head), anchor, selection;
    if (selectionCollapsed(domSel)) {
      anchor = head;
      while (nearestDesc && !nearestDesc.node)
        nearestDesc = nearestDesc.parent;
      let nearestDescNode = nearestDesc.node;
      if (nearestDesc && nearestDescNode.isAtom && NodeSelection.isSelectable(nearestDescNode) && nearestDesc.parent && !(nearestDescNode.isInline && isOnEdge(domSel.focusNode, domSel.focusOffset, nearestDesc.dom))) {
        let pos = nearestDesc.posBefore;
        selection = new NodeSelection(head == pos ? $head : doc2.resolve(pos));
      }
    } else {
      if (domSel instanceof view.dom.ownerDocument.defaultView.Selection && domSel.rangeCount > 1) {
        let min = head, max = head;
        for (let i2 = 0; i2 < domSel.rangeCount; i2++) {
          let range = domSel.getRangeAt(i2);
          min = Math.min(min, view.docView.posFromDOM(range.startContainer, range.startOffset, 1));
          max = Math.max(max, view.docView.posFromDOM(range.endContainer, range.endOffset, -1));
        }
        if (min < 0)
          return null;
        [anchor, head] = max == view.state.selection.anchor ? [max, min] : [min, max];
        $head = doc2.resolve(head);
      } else {
        anchor = view.docView.posFromDOM(domSel.anchorNode, domSel.anchorOffset, 1);
      }
      if (anchor < 0)
        return null;
    }
    let $anchor = doc2.resolve(anchor);
    if (!selection) {
      let bias = origin == "pointer" || view.state.selection.head < $head.pos && !inWidget ? 1 : -1;
      selection = selectionBetween(view, $anchor, $head, bias);
    }
    return selection;
  }
  function editorOwnsSelection(view) {
    return view.editable ? view.hasFocus() : hasSelection(view) && document.activeElement && document.activeElement.contains(view.dom);
  }
  function selectionToDOM(view, force = false) {
    let sel = view.state.selection;
    syncNodeSelection(view, sel);
    if (!editorOwnsSelection(view))
      return;
    if (!force && view.input.mouseDown && view.input.mouseDown.allowDefault && chrome) {
      let domSel = view.domSelectionRange(), curSel = view.domObserver.currentSelection;
      if (domSel.anchorNode && curSel.anchorNode && isEquivalentPosition(domSel.anchorNode, domSel.anchorOffset, curSel.anchorNode, curSel.anchorOffset)) {
        view.input.mouseDown.delayedSelectionSync = true;
        view.domObserver.setCurSelection();
        return;
      }
    }
    view.domObserver.disconnectSelection();
    if (view.cursorWrapper) {
      selectCursorWrapper(view);
    } else {
      let { anchor, head } = sel, resetEditableFrom, resetEditableTo;
      if (brokenSelectBetweenUneditable && !(sel instanceof TextSelection)) {
        if (!sel.$from.parent.inlineContent)
          resetEditableFrom = temporarilyEditableNear(view, sel.from);
        if (!sel.empty && !sel.$from.parent.inlineContent)
          resetEditableTo = temporarilyEditableNear(view, sel.to);
      }
      view.docView.setSelection(anchor, head, view, force);
      if (brokenSelectBetweenUneditable) {
        if (resetEditableFrom)
          resetEditable(resetEditableFrom);
        if (resetEditableTo)
          resetEditable(resetEditableTo);
      }
      if (sel.visible) {
        view.dom.classList.remove("ProseMirror-hideselection");
      } else {
        view.dom.classList.add("ProseMirror-hideselection");
        if ("onselectionchange" in document)
          removeClassOnSelectionChange(view);
      }
    }
    view.domObserver.setCurSelection();
    view.domObserver.connectSelection();
  }
  const brokenSelectBetweenUneditable = safari || chrome && chrome_version < 63;
  function temporarilyEditableNear(view, pos) {
    let { node, offset } = view.docView.domFromPos(pos, 0);
    let after = offset < node.childNodes.length ? node.childNodes[offset] : null;
    let before = offset ? node.childNodes[offset - 1] : null;
    if (safari && after && after.contentEditable == "false")
      return setEditable(after);
    if ((!after || after.contentEditable == "false") && (!before || before.contentEditable == "false")) {
      if (after)
        return setEditable(after);
      else if (before)
        return setEditable(before);
    }
  }
  function setEditable(element) {
    element.contentEditable = "true";
    if (safari && element.draggable) {
      element.draggable = false;
      element.wasDraggable = true;
    }
    return element;
  }
  function resetEditable(element) {
    element.contentEditable = "false";
    if (element.wasDraggable) {
      element.draggable = true;
      element.wasDraggable = null;
    }
  }
  function removeClassOnSelectionChange(view) {
    let doc2 = view.dom.ownerDocument;
    doc2.removeEventListener("selectionchange", view.input.hideSelectionGuard);
    let domSel = view.domSelectionRange();
    let node = domSel.anchorNode, offset = domSel.anchorOffset;
    doc2.addEventListener("selectionchange", view.input.hideSelectionGuard = () => {
      if (domSel.anchorNode != node || domSel.anchorOffset != offset) {
        doc2.removeEventListener("selectionchange", view.input.hideSelectionGuard);
        setTimeout(() => {
          if (!editorOwnsSelection(view) || view.state.selection.visible)
            view.dom.classList.remove("ProseMirror-hideselection");
        }, 20);
      }
    });
  }
  function selectCursorWrapper(view) {
    let domSel = view.domSelection(), range = document.createRange();
    if (!domSel)
      return;
    let node = view.cursorWrapper.dom, img = node.nodeName == "IMG";
    if (img)
      range.setStart(node.parentNode, domIndex(node) + 1);
    else
      range.setStart(node, 0);
    range.collapse(true);
    domSel.removeAllRanges();
    domSel.addRange(range);
    if (!img && !view.state.selection.visible && ie$1 && ie_version <= 11) {
      node.disabled = true;
      node.disabled = false;
    }
  }
  function syncNodeSelection(view, sel) {
    if (sel instanceof NodeSelection) {
      let desc = view.docView.descAt(sel.from);
      if (desc != view.lastSelectedViewDesc) {
        clearNodeSelection(view);
        if (desc)
          desc.selectNode();
        view.lastSelectedViewDesc = desc;
      }
    } else {
      clearNodeSelection(view);
    }
  }
  function clearNodeSelection(view) {
    if (view.lastSelectedViewDesc) {
      if (view.lastSelectedViewDesc.parent)
        view.lastSelectedViewDesc.deselectNode();
      view.lastSelectedViewDesc = void 0;
    }
  }
  function selectionBetween(view, $anchor, $head, bias) {
    return view.someProp("createSelectionBetween", (f) => f(view, $anchor, $head)) || TextSelection.between($anchor, $head, bias);
  }
  function hasFocusAndSelection(view) {
    if (view.editable && !view.hasFocus())
      return false;
    return hasSelection(view);
  }
  function hasSelection(view) {
    let sel = view.domSelectionRange();
    if (!sel.anchorNode)
      return false;
    try {
      return view.dom.contains(sel.anchorNode.nodeType == 3 ? sel.anchorNode.parentNode : sel.anchorNode) && (view.editable || view.dom.contains(sel.focusNode.nodeType == 3 ? sel.focusNode.parentNode : sel.focusNode));
    } catch (_) {
      return false;
    }
  }
  function anchorInRightPlace(view) {
    let anchorDOM = view.docView.domFromPos(view.state.selection.anchor, 0);
    let domSel = view.domSelectionRange();
    return isEquivalentPosition(anchorDOM.node, anchorDOM.offset, domSel.anchorNode, domSel.anchorOffset);
  }
  function moveSelectionBlock(state, dir) {
    let { $anchor, $head } = state.selection;
    let $side = dir > 0 ? $anchor.max($head) : $anchor.min($head);
    let $start = !$side.parent.inlineContent ? $side : $side.depth ? state.doc.resolve(dir > 0 ? $side.after() : $side.before()) : null;
    return $start && Selection.findFrom($start, dir);
  }
  function apply(view, sel) {
    view.dispatch(view.state.tr.setSelection(sel).scrollIntoView());
    return true;
  }
  function selectHorizontally(view, dir, mods) {
    let sel = view.state.selection;
    if (sel instanceof TextSelection) {
      if (mods.indexOf("s") > -1) {
        let { $head } = sel, node = $head.textOffset ? null : dir < 0 ? $head.nodeBefore : $head.nodeAfter;
        if (!node || node.isText || !node.isLeaf)
          return false;
        let $newHead = view.state.doc.resolve($head.pos + node.nodeSize * (dir < 0 ? -1 : 1));
        return apply(view, new TextSelection(sel.$anchor, $newHead));
      } else if (!sel.empty) {
        return false;
      } else if (view.endOfTextblock(dir > 0 ? "forward" : "backward")) {
        let next = moveSelectionBlock(view.state, dir);
        if (next && next instanceof NodeSelection)
          return apply(view, next);
        return false;
      } else if (!(mac$2 && mods.indexOf("m") > -1)) {
        let $head = sel.$head, node = $head.textOffset ? null : dir < 0 ? $head.nodeBefore : $head.nodeAfter, desc;
        if (!node || node.isText)
          return false;
        let nodePos = dir < 0 ? $head.pos - node.nodeSize : $head.pos;
        if (!(node.isAtom || (desc = view.docView.descAt(nodePos)) && !desc.contentDOM))
          return false;
        if (NodeSelection.isSelectable(node)) {
          return apply(view, new NodeSelection(dir < 0 ? view.state.doc.resolve($head.pos - node.nodeSize) : $head));
        } else if (webkit) {
          return apply(view, new TextSelection(view.state.doc.resolve(dir < 0 ? nodePos : nodePos + node.nodeSize)));
        } else {
          return false;
        }
      }
    } else if (sel instanceof NodeSelection && sel.node.isInline) {
      return apply(view, new TextSelection(dir > 0 ? sel.$to : sel.$from));
    } else {
      let next = moveSelectionBlock(view.state, dir);
      if (next)
        return apply(view, next);
      return false;
    }
  }
  function nodeLen(node) {
    return node.nodeType == 3 ? node.nodeValue.length : node.childNodes.length;
  }
  function isIgnorable(dom, dir) {
    let desc = dom.pmViewDesc;
    return desc && desc.size == 0 && (dir < 0 || dom.nextSibling || dom.nodeName != "BR");
  }
  function skipIgnoredNodes(view, dir) {
    return dir < 0 ? skipIgnoredNodesBefore(view) : skipIgnoredNodesAfter(view);
  }
  function skipIgnoredNodesBefore(view) {
    let sel = view.domSelectionRange();
    let node = sel.focusNode, offset = sel.focusOffset;
    if (!node)
      return;
    let moveNode, moveOffset, force = false;
    if (gecko && node.nodeType == 1 && offset < nodeLen(node) && isIgnorable(node.childNodes[offset], -1))
      force = true;
    for (; ; ) {
      if (offset > 0) {
        if (node.nodeType != 1) {
          break;
        } else {
          let before = node.childNodes[offset - 1];
          if (isIgnorable(before, -1)) {
            moveNode = node;
            moveOffset = --offset;
          } else if (before.nodeType == 3) {
            node = before;
            offset = node.nodeValue.length;
          } else
            break;
        }
      } else if (isBlockNode(node)) {
        break;
      } else {
        let prev = node.previousSibling;
        while (prev && isIgnorable(prev, -1)) {
          moveNode = node.parentNode;
          moveOffset = domIndex(prev);
          prev = prev.previousSibling;
        }
        if (!prev) {
          node = node.parentNode;
          if (node == view.dom)
            break;
          offset = 0;
        } else {
          node = prev;
          offset = nodeLen(node);
        }
      }
    }
    if (force)
      setSelFocus(view, node, offset);
    else if (moveNode)
      setSelFocus(view, moveNode, moveOffset);
  }
  function skipIgnoredNodesAfter(view) {
    let sel = view.domSelectionRange();
    let node = sel.focusNode, offset = sel.focusOffset;
    if (!node)
      return;
    let len = nodeLen(node);
    let moveNode, moveOffset;
    for (; ; ) {
      if (offset < len) {
        if (node.nodeType != 1)
          break;
        let after = node.childNodes[offset];
        if (isIgnorable(after, 1)) {
          moveNode = node;
          moveOffset = ++offset;
        } else
          break;
      } else if (isBlockNode(node)) {
        break;
      } else {
        let next = node.nextSibling;
        while (next && isIgnorable(next, 1)) {
          moveNode = next.parentNode;
          moveOffset = domIndex(next) + 1;
          next = next.nextSibling;
        }
        if (!next) {
          node = node.parentNode;
          if (node == view.dom)
            break;
          offset = len = 0;
        } else {
          node = next;
          offset = 0;
          len = nodeLen(node);
        }
      }
    }
    if (moveNode)
      setSelFocus(view, moveNode, moveOffset);
  }
  function isBlockNode(dom) {
    let desc = dom.pmViewDesc;
    return desc && desc.node && desc.node.isBlock;
  }
  function textNodeAfter(node, offset) {
    while (node && offset == node.childNodes.length && !hasBlockDesc(node)) {
      offset = domIndex(node) + 1;
      node = node.parentNode;
    }
    while (node && offset < node.childNodes.length) {
      let next = node.childNodes[offset];
      if (next.nodeType == 3)
        return next;
      if (next.nodeType == 1 && next.contentEditable == "false")
        break;
      node = next;
      offset = 0;
    }
  }
  function textNodeBefore(node, offset) {
    while (node && !offset && !hasBlockDesc(node)) {
      offset = domIndex(node);
      node = node.parentNode;
    }
    while (node && offset) {
      let next = node.childNodes[offset - 1];
      if (next.nodeType == 3)
        return next;
      if (next.nodeType == 1 && next.contentEditable == "false")
        break;
      node = next;
      offset = node.childNodes.length;
    }
  }
  function setSelFocus(view, node, offset) {
    if (node.nodeType != 3) {
      let before, after;
      if (after = textNodeAfter(node, offset)) {
        node = after;
        offset = 0;
      } else if (before = textNodeBefore(node, offset)) {
        node = before;
        offset = before.nodeValue.length;
      }
    }
    let sel = view.domSelection();
    if (!sel)
      return;
    if (selectionCollapsed(sel)) {
      let range = document.createRange();
      range.setEnd(node, offset);
      range.setStart(node, offset);
      sel.removeAllRanges();
      sel.addRange(range);
    } else if (sel.extend) {
      sel.extend(node, offset);
    }
    view.domObserver.setCurSelection();
    let { state } = view;
    setTimeout(() => {
      if (view.state == state)
        selectionToDOM(view);
    }, 50);
  }
  function findDirection(view, pos) {
    let $pos = view.state.doc.resolve(pos);
    if (!(chrome || windows) && $pos.parent.inlineContent) {
      let coords = view.coordsAtPos(pos);
      if (pos > $pos.start()) {
        let before = view.coordsAtPos(pos - 1);
        let mid = (before.top + before.bottom) / 2;
        if (mid > coords.top && mid < coords.bottom && Math.abs(before.left - coords.left) > 1)
          return before.left < coords.left ? "ltr" : "rtl";
      }
      if (pos < $pos.end()) {
        let after = view.coordsAtPos(pos + 1);
        let mid = (after.top + after.bottom) / 2;
        if (mid > coords.top && mid < coords.bottom && Math.abs(after.left - coords.left) > 1)
          return after.left > coords.left ? "ltr" : "rtl";
      }
    }
    let computed = getComputedStyle(view.dom).direction;
    return computed == "rtl" ? "rtl" : "ltr";
  }
  function selectVertically(view, dir, mods) {
    let sel = view.state.selection;
    if (sel instanceof TextSelection && !sel.empty || mods.indexOf("s") > -1)
      return false;
    if (mac$2 && mods.indexOf("m") > -1)
      return false;
    let { $from, $to } = sel;
    if (!$from.parent.inlineContent || view.endOfTextblock(dir < 0 ? "up" : "down")) {
      let next = moveSelectionBlock(view.state, dir);
      if (next && next instanceof NodeSelection)
        return apply(view, next);
    }
    if (!$from.parent.inlineContent) {
      let side = dir < 0 ? $from : $to;
      let beyond = sel instanceof AllSelection ? Selection.near(side, dir) : Selection.findFrom(side, dir);
      return beyond ? apply(view, beyond) : false;
    }
    return false;
  }
  function stopNativeHorizontalDelete(view, dir) {
    if (!(view.state.selection instanceof TextSelection))
      return true;
    let { $head, $anchor, empty: empty2 } = view.state.selection;
    if (!$head.sameParent($anchor))
      return true;
    if (!empty2)
      return false;
    if (view.endOfTextblock(dir > 0 ? "forward" : "backward"))
      return true;
    let nextNode = !$head.textOffset && (dir < 0 ? $head.nodeBefore : $head.nodeAfter);
    if (nextNode && !nextNode.isText) {
      let tr2 = view.state.tr;
      if (dir < 0)
        tr2.delete($head.pos - nextNode.nodeSize, $head.pos);
      else
        tr2.delete($head.pos, $head.pos + nextNode.nodeSize);
      view.dispatch(tr2);
      return true;
    }
    return false;
  }
  function switchEditable(view, node, state) {
    view.domObserver.stop();
    node.contentEditable = state;
    view.domObserver.start();
  }
  function safariDownArrowBug(view) {
    if (!safari || view.state.selection.$head.parentOffset > 0)
      return false;
    let { focusNode, focusOffset } = view.domSelectionRange();
    if (focusNode && focusNode.nodeType == 1 && focusOffset == 0 && focusNode.firstChild && focusNode.firstChild.contentEditable == "false") {
      let child = focusNode.firstChild;
      switchEditable(view, child, "true");
      setTimeout(() => switchEditable(view, child, "false"), 20);
    }
    return false;
  }
  function getMods(event) {
    let result = "";
    if (event.ctrlKey)
      result += "c";
    if (event.metaKey)
      result += "m";
    if (event.altKey)
      result += "a";
    if (event.shiftKey)
      result += "s";
    return result;
  }
  function captureKeyDown(view, event) {
    let code2 = event.keyCode, mods = getMods(event);
    if (code2 == 8 || mac$2 && code2 == 72 && mods == "c") {
      return stopNativeHorizontalDelete(view, -1) || skipIgnoredNodes(view, -1);
    } else if (code2 == 46 && !event.shiftKey || mac$2 && code2 == 68 && mods == "c") {
      return stopNativeHorizontalDelete(view, 1) || skipIgnoredNodes(view, 1);
    } else if (code2 == 13 || code2 == 27) {
      return true;
    } else if (code2 == 37 || mac$2 && code2 == 66 && mods == "c") {
      let dir = code2 == 37 ? findDirection(view, view.state.selection.from) == "ltr" ? -1 : 1 : -1;
      return selectHorizontally(view, dir, mods) || skipIgnoredNodes(view, dir);
    } else if (code2 == 39 || mac$2 && code2 == 70 && mods == "c") {
      let dir = code2 == 39 ? findDirection(view, view.state.selection.from) == "ltr" ? 1 : -1 : 1;
      return selectHorizontally(view, dir, mods) || skipIgnoredNodes(view, dir);
    } else if (code2 == 38 || mac$2 && code2 == 80 && mods == "c") {
      return selectVertically(view, -1, mods) || skipIgnoredNodes(view, -1);
    } else if (code2 == 40 || mac$2 && code2 == 78 && mods == "c") {
      return safariDownArrowBug(view) || selectVertically(view, 1, mods) || skipIgnoredNodes(view, 1);
    } else if (mods == (mac$2 ? "m" : "c") && (code2 == 66 || code2 == 73 || code2 == 89 || code2 == 90)) {
      return true;
    }
    return false;
  }
  function serializeForClipboard(view, slice) {
    view.someProp("transformCopied", (f) => {
      slice = f(slice, view);
    });
    let context = [], { content, openStart, openEnd } = slice;
    while (openStart > 1 && openEnd > 1 && content.childCount == 1 && content.firstChild.childCount == 1) {
      openStart--;
      openEnd--;
      let node = content.firstChild;
      context.push(node.type.name, node.attrs != node.type.defaultAttrs ? node.attrs : null);
      content = node.content;
    }
    let serializer = view.someProp("clipboardSerializer") || DOMSerializer.fromSchema(view.state.schema);
    let doc2 = detachedDoc(), wrap2 = doc2.createElement("div");
    wrap2.appendChild(serializer.serializeFragment(content, { document: doc2 }));
    let firstChild = wrap2.firstChild, needsWrap, wrappers = 0;
    while (firstChild && firstChild.nodeType == 1 && (needsWrap = wrapMap[firstChild.nodeName.toLowerCase()])) {
      for (let i2 = needsWrap.length - 1; i2 >= 0; i2--) {
        let wrapper = doc2.createElement(needsWrap[i2]);
        while (wrap2.firstChild)
          wrapper.appendChild(wrap2.firstChild);
        wrap2.appendChild(wrapper);
        wrappers++;
      }
      firstChild = wrap2.firstChild;
    }
    if (firstChild && firstChild.nodeType == 1)
      firstChild.setAttribute("data-pm-slice", `${openStart} ${openEnd}${wrappers ? ` -${wrappers}` : ""} ${JSON.stringify(context)}`);
    let text = view.someProp("clipboardTextSerializer", (f) => f(slice, view)) || slice.content.textBetween(0, slice.content.size, "\n\n");
    return { dom: wrap2, text, slice };
  }
  function parseFromClipboard(view, text, html, plainText, $context) {
    let inCode = $context.parent.type.spec.code;
    let dom, slice;
    if (!html && !text)
      return null;
    let asText = text && (plainText || inCode || !html);
    if (asText) {
      view.someProp("transformPastedText", (f) => {
        text = f(text, inCode || plainText, view);
      });
      if (inCode)
        return text ? new Slice(Fragment.from(view.state.schema.text(text.replace(/\r\n?/g, "\n"))), 0, 0) : Slice.empty;
      let parsed = view.someProp("clipboardTextParser", (f) => f(text, $context, plainText, view));
      if (parsed) {
        slice = parsed;
      } else {
        let marks = $context.marks();
        let { schema } = view.state, serializer = DOMSerializer.fromSchema(schema);
        dom = document.createElement("div");
        text.split(/(?:\r\n?|\n)+/).forEach((block) => {
          let p2 = dom.appendChild(document.createElement("p"));
          if (block)
            p2.appendChild(serializer.serializeNode(schema.text(block, marks)));
        });
      }
    } else {
      view.someProp("transformPastedHTML", (f) => {
        html = f(html, view);
      });
      dom = readHTML(html);
      if (webkit)
        restoreReplacedSpaces(dom);
    }
    let contextNode = dom && dom.querySelector("[data-pm-slice]");
    let sliceData = contextNode && /^(\d+) (\d+)(?: -(\d+))? (.*)/.exec(contextNode.getAttribute("data-pm-slice") || "");
    if (sliceData && sliceData[3])
      for (let i2 = +sliceData[3]; i2 > 0; i2--) {
        let child = dom.firstChild;
        while (child && child.nodeType != 1)
          child = child.nextSibling;
        if (!child)
          break;
        dom = child;
      }
    if (!slice) {
      let parser = view.someProp("clipboardParser") || view.someProp("domParser") || DOMParser.fromSchema(view.state.schema);
      slice = parser.parseSlice(dom, {
        preserveWhitespace: !!(asText || sliceData),
        context: $context,
        ruleFromNode(dom2) {
          if (dom2.nodeName == "BR" && !dom2.nextSibling && dom2.parentNode && !inlineParents.test(dom2.parentNode.nodeName))
            return { ignore: true };
          return null;
        }
      });
    }
    if (sliceData) {
      slice = addContext(closeSlice(slice, +sliceData[1], +sliceData[2]), sliceData[4]);
    } else {
      slice = Slice.maxOpen(normalizeSiblings(slice.content, $context), true);
      if (slice.openStart || slice.openEnd) {
        let openStart = 0, openEnd = 0;
        for (let node = slice.content.firstChild; openStart < slice.openStart && !node.type.spec.isolating; openStart++, node = node.firstChild) {
        }
        for (let node = slice.content.lastChild; openEnd < slice.openEnd && !node.type.spec.isolating; openEnd++, node = node.lastChild) {
        }
        slice = closeSlice(slice, openStart, openEnd);
      }
    }
    view.someProp("transformPasted", (f) => {
      slice = f(slice, view);
    });
    return slice;
  }
  const inlineParents = /^(a|abbr|acronym|b|cite|code|del|em|i|ins|kbd|label|output|q|ruby|s|samp|span|strong|sub|sup|time|u|tt|var)$/i;
  function normalizeSiblings(fragment, $context) {
    if (fragment.childCount < 2)
      return fragment;
    for (let d2 = $context.depth; d2 >= 0; d2--) {
      let parent = $context.node(d2);
      let match = parent.contentMatchAt($context.index(d2));
      let lastWrap, result = [];
      fragment.forEach((node) => {
        if (!result)
          return;
        let wrap2 = match.findWrapping(node.type), inLast;
        if (!wrap2)
          return result = null;
        if (inLast = result.length && lastWrap.length && addToSibling(wrap2, lastWrap, node, result[result.length - 1], 0)) {
          result[result.length - 1] = inLast;
        } else {
          if (result.length)
            result[result.length - 1] = closeRight(result[result.length - 1], lastWrap.length);
          let wrapped = withWrappers(node, wrap2);
          result.push(wrapped);
          match = match.matchType(wrapped.type);
          lastWrap = wrap2;
        }
      });
      if (result)
        return Fragment.from(result);
    }
    return fragment;
  }
  function withWrappers(node, wrap2, from = 0) {
    for (let i2 = wrap2.length - 1; i2 >= from; i2--)
      node = wrap2[i2].create(null, Fragment.from(node));
    return node;
  }
  function addToSibling(wrap2, lastWrap, node, sibling, depth) {
    if (depth < wrap2.length && depth < lastWrap.length && wrap2[depth] == lastWrap[depth]) {
      let inner = addToSibling(wrap2, lastWrap, node, sibling.lastChild, depth + 1);
      if (inner)
        return sibling.copy(sibling.content.replaceChild(sibling.childCount - 1, inner));
      let match = sibling.contentMatchAt(sibling.childCount);
      if (match.matchType(depth == wrap2.length - 1 ? node.type : wrap2[depth + 1]))
        return sibling.copy(sibling.content.append(Fragment.from(withWrappers(node, wrap2, depth + 1))));
    }
  }
  function closeRight(node, depth) {
    if (depth == 0)
      return node;
    let fragment = node.content.replaceChild(node.childCount - 1, closeRight(node.lastChild, depth - 1));
    let fill = node.contentMatchAt(node.childCount).fillBefore(Fragment.empty, true);
    return node.copy(fragment.append(fill));
  }
  function closeRange(fragment, side, from, to, depth, openEnd) {
    let node = side < 0 ? fragment.firstChild : fragment.lastChild, inner = node.content;
    if (fragment.childCount > 1)
      openEnd = 0;
    if (depth < to - 1)
      inner = closeRange(inner, side, from, to, depth + 1, openEnd);
    if (depth >= from)
      inner = side < 0 ? node.contentMatchAt(0).fillBefore(inner, openEnd <= depth).append(inner) : inner.append(node.contentMatchAt(node.childCount).fillBefore(Fragment.empty, true));
    return fragment.replaceChild(side < 0 ? 0 : fragment.childCount - 1, node.copy(inner));
  }
  function closeSlice(slice, openStart, openEnd) {
    if (openStart < slice.openStart)
      slice = new Slice(closeRange(slice.content, -1, openStart, slice.openStart, 0, slice.openEnd), openStart, slice.openEnd);
    if (openEnd < slice.openEnd)
      slice = new Slice(closeRange(slice.content, 1, openEnd, slice.openEnd, 0, 0), slice.openStart, openEnd);
    return slice;
  }
  const wrapMap = {
    thead: ["table"],
    tbody: ["table"],
    tfoot: ["table"],
    caption: ["table"],
    colgroup: ["table"],
    col: ["table", "colgroup"],
    tr: ["table", "tbody"],
    td: ["table", "tbody", "tr"],
    th: ["table", "tbody", "tr"]
  };
  let _detachedDoc = null;
  function detachedDoc() {
    return _detachedDoc || (_detachedDoc = document.implementation.createHTMLDocument("title"));
  }
  let _policy = null;
  function maybeWrapTrusted(html) {
    let trustedTypes = window.trustedTypes;
    if (!trustedTypes)
      return html;
    if (!_policy)
      _policy = trustedTypes.createPolicy("ProseMirrorClipboard", { createHTML: (s) => s });
    return _policy.createHTML(html);
  }
  function readHTML(html) {
    let metas = /^(\s*<meta [^>]*>)*/.exec(html);
    if (metas)
      html = html.slice(metas[0].length);
    let elt = detachedDoc().createElement("div");
    let firstTag = /<([a-z][^>\s]+)/i.exec(html), wrap2;
    if (wrap2 = firstTag && wrapMap[firstTag[1].toLowerCase()])
      html = wrap2.map((n) => "<" + n + ">").join("") + html + wrap2.map((n) => "</" + n + ">").reverse().join("");
    elt.innerHTML = maybeWrapTrusted(html);
    if (wrap2)
      for (let i2 = 0; i2 < wrap2.length; i2++)
        elt = elt.querySelector(wrap2[i2]) || elt;
    return elt;
  }
  function restoreReplacedSpaces(dom) {
    let nodes = dom.querySelectorAll(chrome ? "span:not([class]):not([style])" : "span.Apple-converted-space");
    for (let i2 = 0; i2 < nodes.length; i2++) {
      let node = nodes[i2];
      if (node.childNodes.length == 1 && node.textContent == " " && node.parentNode)
        node.parentNode.replaceChild(dom.ownerDocument.createTextNode(" "), node);
    }
  }
  function addContext(slice, context) {
    if (!slice.size)
      return slice;
    let schema = slice.content.firstChild.type.schema, array2;
    try {
      array2 = JSON.parse(context);
    } catch (e) {
      return slice;
    }
    let { content, openStart, openEnd } = slice;
    for (let i2 = array2.length - 2; i2 >= 0; i2 -= 2) {
      let type = schema.nodes[array2[i2]];
      if (!type || type.hasRequiredAttrs())
        break;
      content = Fragment.from(type.create(array2[i2 + 1], content));
      openStart++;
      openEnd++;
    }
    return new Slice(content, openStart, openEnd);
  }
  const handlers = {};
  const editHandlers = {};
  const passiveHandlers = { touchstart: true, touchmove: true };
  class InputState {
    constructor() {
      this.shiftKey = false;
      this.mouseDown = null;
      this.lastKeyCode = null;
      this.lastKeyCodeTime = 0;
      this.lastClick = { time: 0, x: 0, y: 0, type: "" };
      this.lastSelectionOrigin = null;
      this.lastSelectionTime = 0;
      this.lastIOSEnter = 0;
      this.lastIOSEnterFallbackTimeout = -1;
      this.lastFocus = 0;
      this.lastTouch = 0;
      this.lastAndroidDelete = 0;
      this.composing = false;
      this.compositionNode = null;
      this.composingTimeout = -1;
      this.compositionNodes = [];
      this.compositionEndedAt = -2e8;
      this.compositionID = 1;
      this.compositionPendingChanges = 0;
      this.domChangeCount = 0;
      this.eventHandlers = /* @__PURE__ */ Object.create(null);
      this.hideSelectionGuard = null;
    }
  }
  function initInput(view) {
    for (let event in handlers) {
      let handler = handlers[event];
      view.dom.addEventListener(event, view.input.eventHandlers[event] = (event2) => {
        if (eventBelongsToView(view, event2) && !runCustomHandler(view, event2) && (view.editable || !(event2.type in editHandlers)))
          handler(view, event2);
      }, passiveHandlers[event] ? { passive: true } : void 0);
    }
    if (safari)
      view.dom.addEventListener("input", () => null);
    ensureListeners(view);
  }
  function setSelectionOrigin(view, origin) {
    view.input.lastSelectionOrigin = origin;
    view.input.lastSelectionTime = Date.now();
  }
  function destroyInput(view) {
    view.domObserver.stop();
    for (let type in view.input.eventHandlers)
      view.dom.removeEventListener(type, view.input.eventHandlers[type]);
    clearTimeout(view.input.composingTimeout);
    clearTimeout(view.input.lastIOSEnterFallbackTimeout);
  }
  function ensureListeners(view) {
    view.someProp("handleDOMEvents", (currentHandlers) => {
      for (let type in currentHandlers)
        if (!view.input.eventHandlers[type])
          view.dom.addEventListener(type, view.input.eventHandlers[type] = (event) => runCustomHandler(view, event));
    });
  }
  function runCustomHandler(view, event) {
    return view.someProp("handleDOMEvents", (handlers2) => {
      let handler = handlers2[event.type];
      return handler ? handler(view, event) || event.defaultPrevented : false;
    });
  }
  function eventBelongsToView(view, event) {
    if (!event.bubbles)
      return true;
    if (event.defaultPrevented)
      return false;
    for (let node = event.target; node != view.dom; node = node.parentNode)
      if (!node || node.nodeType == 11 || node.pmViewDesc && node.pmViewDesc.stopEvent(event))
        return false;
    return true;
  }
  function dispatchEvent(view, event) {
    if (!runCustomHandler(view, event) && handlers[event.type] && (view.editable || !(event.type in editHandlers)))
      handlers[event.type](view, event);
  }
  editHandlers.keydown = (view, _event) => {
    let event = _event;
    view.input.shiftKey = event.keyCode == 16 || event.shiftKey;
    if (inOrNearComposition(view, event))
      return;
    view.input.lastKeyCode = event.keyCode;
    view.input.lastKeyCodeTime = Date.now();
    if (android && chrome && event.keyCode == 13)
      return;
    if (event.keyCode != 229)
      view.domObserver.forceFlush();
    if (ios && event.keyCode == 13 && !event.ctrlKey && !event.altKey && !event.metaKey) {
      let now = Date.now();
      view.input.lastIOSEnter = now;
      view.input.lastIOSEnterFallbackTimeout = setTimeout(() => {
        if (view.input.lastIOSEnter == now) {
          view.someProp("handleKeyDown", (f) => f(view, keyEvent(13, "Enter")));
          view.input.lastIOSEnter = 0;
        }
      }, 200);
    } else if (view.someProp("handleKeyDown", (f) => f(view, event)) || captureKeyDown(view, event)) {
      event.preventDefault();
    } else {
      setSelectionOrigin(view, "key");
    }
  };
  editHandlers.keyup = (view, event) => {
    if (event.keyCode == 16)
      view.input.shiftKey = false;
  };
  editHandlers.keypress = (view, _event) => {
    let event = _event;
    if (inOrNearComposition(view, event) || !event.charCode || event.ctrlKey && !event.altKey || mac$2 && event.metaKey)
      return;
    if (view.someProp("handleKeyPress", (f) => f(view, event))) {
      event.preventDefault();
      return;
    }
    let sel = view.state.selection;
    if (!(sel instanceof TextSelection) || !sel.$from.sameParent(sel.$to)) {
      let text = String.fromCharCode(event.charCode);
      if (!/[\r\n]/.test(text) && !view.someProp("handleTextInput", (f) => f(view, sel.$from.pos, sel.$to.pos, text)))
        view.dispatch(view.state.tr.insertText(text).scrollIntoView());
      event.preventDefault();
    }
  };
  function eventCoords(event) {
    return { left: event.clientX, top: event.clientY };
  }
  function isNear(event, click) {
    let dx = click.x - event.clientX, dy = click.y - event.clientY;
    return dx * dx + dy * dy < 100;
  }
  function runHandlerOnContext(view, propName, pos, inside, event) {
    if (inside == -1)
      return false;
    let $pos = view.state.doc.resolve(inside);
    for (let i2 = $pos.depth + 1; i2 > 0; i2--) {
      if (view.someProp(propName, (f) => i2 > $pos.depth ? f(view, pos, $pos.nodeAfter, $pos.before(i2), event, true) : f(view, pos, $pos.node(i2), $pos.before(i2), event, false)))
        return true;
    }
    return false;
  }
  function updateSelection(view, selection, origin) {
    if (!view.focused)
      view.focus();
    if (view.state.selection.eq(selection))
      return;
    let tr2 = view.state.tr.setSelection(selection);
    tr2.setMeta("pointer", true);
    view.dispatch(tr2);
  }
  function selectClickedLeaf(view, inside) {
    if (inside == -1)
      return false;
    let $pos = view.state.doc.resolve(inside), node = $pos.nodeAfter;
    if (node && node.isAtom && NodeSelection.isSelectable(node)) {
      updateSelection(view, new NodeSelection($pos));
      return true;
    }
    return false;
  }
  function selectClickedNode(view, inside) {
    if (inside == -1)
      return false;
    let sel = view.state.selection, selectedNode, selectAt;
    if (sel instanceof NodeSelection)
      selectedNode = sel.node;
    let $pos = view.state.doc.resolve(inside);
    for (let i2 = $pos.depth + 1; i2 > 0; i2--) {
      let node = i2 > $pos.depth ? $pos.nodeAfter : $pos.node(i2);
      if (NodeSelection.isSelectable(node)) {
        if (selectedNode && sel.$from.depth > 0 && i2 >= sel.$from.depth && $pos.before(sel.$from.depth + 1) == sel.$from.pos)
          selectAt = $pos.before(sel.$from.depth);
        else
          selectAt = $pos.before(i2);
        break;
      }
    }
    if (selectAt != null) {
      updateSelection(view, NodeSelection.create(view.state.doc, selectAt));
      return true;
    } else {
      return false;
    }
  }
  function handleSingleClick(view, pos, inside, event, selectNode) {
    return runHandlerOnContext(view, "handleClickOn", pos, inside, event) || view.someProp("handleClick", (f) => f(view, pos, event)) || (selectNode ? selectClickedNode(view, inside) : selectClickedLeaf(view, inside));
  }
  function handleDoubleClick(view, pos, inside, event) {
    return runHandlerOnContext(view, "handleDoubleClickOn", pos, inside, event) || view.someProp("handleDoubleClick", (f) => f(view, pos, event));
  }
  function handleTripleClick(view, pos, inside, event) {
    return runHandlerOnContext(view, "handleTripleClickOn", pos, inside, event) || view.someProp("handleTripleClick", (f) => f(view, pos, event)) || defaultTripleClick(view, inside, event);
  }
  function defaultTripleClick(view, inside, event) {
    if (event.button != 0)
      return false;
    let doc2 = view.state.doc;
    if (inside == -1) {
      if (doc2.inlineContent) {
        updateSelection(view, TextSelection.create(doc2, 0, doc2.content.size));
        return true;
      }
      return false;
    }
    let $pos = doc2.resolve(inside);
    for (let i2 = $pos.depth + 1; i2 > 0; i2--) {
      let node = i2 > $pos.depth ? $pos.nodeAfter : $pos.node(i2);
      let nodePos = $pos.before(i2);
      if (node.inlineContent)
        updateSelection(view, TextSelection.create(doc2, nodePos + 1, nodePos + 1 + node.content.size));
      else if (NodeSelection.isSelectable(node))
        updateSelection(view, NodeSelection.create(doc2, nodePos));
      else
        continue;
      return true;
    }
  }
  function forceDOMFlush(view) {
    return endComposition(view);
  }
  const selectNodeModifier = mac$2 ? "metaKey" : "ctrlKey";
  handlers.mousedown = (view, _event) => {
    let event = _event;
    view.input.shiftKey = event.shiftKey;
    let flushed = forceDOMFlush(view);
    let now = Date.now(), type = "singleClick";
    if (now - view.input.lastClick.time < 500 && isNear(event, view.input.lastClick) && !event[selectNodeModifier]) {
      if (view.input.lastClick.type == "singleClick")
        type = "doubleClick";
      else if (view.input.lastClick.type == "doubleClick")
        type = "tripleClick";
    }
    view.input.lastClick = { time: now, x: event.clientX, y: event.clientY, type };
    let pos = view.posAtCoords(eventCoords(event));
    if (!pos)
      return;
    if (type == "singleClick") {
      if (view.input.mouseDown)
        view.input.mouseDown.done();
      view.input.mouseDown = new MouseDown(view, pos, event, !!flushed);
    } else if ((type == "doubleClick" ? handleDoubleClick : handleTripleClick)(view, pos.pos, pos.inside, event)) {
      event.preventDefault();
    } else {
      setSelectionOrigin(view, "pointer");
    }
  };
  class MouseDown {
    constructor(view, pos, event, flushed) {
      this.view = view;
      this.pos = pos;
      this.event = event;
      this.flushed = flushed;
      this.delayedSelectionSync = false;
      this.mightDrag = null;
      this.startDoc = view.state.doc;
      this.selectNode = !!event[selectNodeModifier];
      this.allowDefault = event.shiftKey;
      let targetNode, targetPos;
      if (pos.inside > -1) {
        targetNode = view.state.doc.nodeAt(pos.inside);
        targetPos = pos.inside;
      } else {
        let $pos = view.state.doc.resolve(pos.pos);
        targetNode = $pos.parent;
        targetPos = $pos.depth ? $pos.before() : 0;
      }
      const target = flushed ? null : event.target;
      const targetDesc = target ? view.docView.nearestDesc(target, true) : null;
      this.target = targetDesc && targetDesc.dom.nodeType == 1 ? targetDesc.dom : null;
      let { selection } = view.state;
      if (event.button == 0 && targetNode.type.spec.draggable && targetNode.type.spec.selectable !== false || selection instanceof NodeSelection && selection.from <= targetPos && selection.to > targetPos)
        this.mightDrag = {
          node: targetNode,
          pos: targetPos,
          addAttr: !!(this.target && !this.target.draggable),
          setUneditable: !!(this.target && gecko && !this.target.hasAttribute("contentEditable"))
        };
      if (this.target && this.mightDrag && (this.mightDrag.addAttr || this.mightDrag.setUneditable)) {
        this.view.domObserver.stop();
        if (this.mightDrag.addAttr)
          this.target.draggable = true;
        if (this.mightDrag.setUneditable)
          setTimeout(() => {
            if (this.view.input.mouseDown == this)
              this.target.setAttribute("contentEditable", "false");
          }, 20);
        this.view.domObserver.start();
      }
      view.root.addEventListener("mouseup", this.up = this.up.bind(this));
      view.root.addEventListener("mousemove", this.move = this.move.bind(this));
      setSelectionOrigin(view, "pointer");
    }
    done() {
      this.view.root.removeEventListener("mouseup", this.up);
      this.view.root.removeEventListener("mousemove", this.move);
      if (this.mightDrag && this.target) {
        this.view.domObserver.stop();
        if (this.mightDrag.addAttr)
          this.target.removeAttribute("draggable");
        if (this.mightDrag.setUneditable)
          this.target.removeAttribute("contentEditable");
        this.view.domObserver.start();
      }
      if (this.delayedSelectionSync)
        setTimeout(() => selectionToDOM(this.view));
      this.view.input.mouseDown = null;
    }
    up(event) {
      this.done();
      if (!this.view.dom.contains(event.target))
        return;
      let pos = this.pos;
      if (this.view.state.doc != this.startDoc)
        pos = this.view.posAtCoords(eventCoords(event));
      this.updateAllowDefault(event);
      if (this.allowDefault || !pos) {
        setSelectionOrigin(this.view, "pointer");
      } else if (handleSingleClick(this.view, pos.pos, pos.inside, event, this.selectNode)) {
        event.preventDefault();
      } else if (event.button == 0 && (this.flushed || // Safari ignores clicks on draggable elements
      safari && this.mightDrag && !this.mightDrag.node.isAtom || // Chrome will sometimes treat a node selection as a
      // cursor, but still report that the node is selected
      // when asked through getSelection. You'll then get a
      // situation where clicking at the point where that
      // (hidden) cursor is doesn't change the selection, and
      // thus doesn't get a reaction from ProseMirror. This
      // works around that.
      chrome && !this.view.state.selection.visible && Math.min(Math.abs(pos.pos - this.view.state.selection.from), Math.abs(pos.pos - this.view.state.selection.to)) <= 2)) {
        updateSelection(this.view, Selection.near(this.view.state.doc.resolve(pos.pos)));
        event.preventDefault();
      } else {
        setSelectionOrigin(this.view, "pointer");
      }
    }
    move(event) {
      this.updateAllowDefault(event);
      setSelectionOrigin(this.view, "pointer");
      if (event.buttons == 0)
        this.done();
    }
    updateAllowDefault(event) {
      if (!this.allowDefault && (Math.abs(this.event.x - event.clientX) > 4 || Math.abs(this.event.y - event.clientY) > 4))
        this.allowDefault = true;
    }
  }
  handlers.touchstart = (view) => {
    view.input.lastTouch = Date.now();
    forceDOMFlush(view);
    setSelectionOrigin(view, "pointer");
  };
  handlers.touchmove = (view) => {
    view.input.lastTouch = Date.now();
    setSelectionOrigin(view, "pointer");
  };
  handlers.contextmenu = (view) => forceDOMFlush(view);
  function inOrNearComposition(view, event) {
    if (view.composing)
      return true;
    if (safari && Math.abs(event.timeStamp - view.input.compositionEndedAt) < 500) {
      view.input.compositionEndedAt = -2e8;
      return true;
    }
    return false;
  }
  const timeoutComposition = android ? 5e3 : -1;
  editHandlers.compositionstart = editHandlers.compositionupdate = (view) => {
    if (!view.composing) {
      view.domObserver.flush();
      let { state } = view, $pos = state.selection.$to;
      if (state.selection instanceof TextSelection && (state.storedMarks || !$pos.textOffset && $pos.parentOffset && $pos.nodeBefore.marks.some((m) => m.type.spec.inclusive === false))) {
        view.markCursor = view.state.storedMarks || $pos.marks();
        endComposition(view, true);
        view.markCursor = null;
      } else {
        endComposition(view, !state.selection.empty);
        if (gecko && state.selection.empty && $pos.parentOffset && !$pos.textOffset && $pos.nodeBefore.marks.length) {
          let sel = view.domSelectionRange();
          for (let node = sel.focusNode, offset = sel.focusOffset; node && node.nodeType == 1 && offset != 0; ) {
            let before = offset < 0 ? node.lastChild : node.childNodes[offset - 1];
            if (!before)
              break;
            if (before.nodeType == 3) {
              let sel2 = view.domSelection();
              if (sel2)
                sel2.collapse(before, before.nodeValue.length);
              break;
            } else {
              node = before;
              offset = -1;
            }
          }
        }
      }
      view.input.composing = true;
    }
    scheduleComposeEnd(view, timeoutComposition);
  };
  editHandlers.compositionend = (view, event) => {
    if (view.composing) {
      view.input.composing = false;
      view.input.compositionEndedAt = event.timeStamp;
      view.input.compositionPendingChanges = view.domObserver.pendingRecords().length ? view.input.compositionID : 0;
      view.input.compositionNode = null;
      if (view.input.compositionPendingChanges)
        Promise.resolve().then(() => view.domObserver.flush());
      view.input.compositionID++;
      scheduleComposeEnd(view, 20);
    }
  };
  function scheduleComposeEnd(view, delay) {
    clearTimeout(view.input.composingTimeout);
    if (delay > -1)
      view.input.composingTimeout = setTimeout(() => endComposition(view), delay);
  }
  function clearComposition(view) {
    if (view.composing) {
      view.input.composing = false;
      view.input.compositionEndedAt = timestampFromCustomEvent();
    }
    while (view.input.compositionNodes.length > 0)
      view.input.compositionNodes.pop().markParentsDirty();
  }
  function findCompositionNode(view) {
    let sel = view.domSelectionRange();
    if (!sel.focusNode)
      return null;
    let textBefore = textNodeBefore$1(sel.focusNode, sel.focusOffset);
    let textAfter = textNodeAfter$1(sel.focusNode, sel.focusOffset);
    if (textBefore && textAfter && textBefore != textAfter) {
      let descAfter = textAfter.pmViewDesc, lastChanged = view.domObserver.lastChangedTextNode;
      if (textBefore == lastChanged || textAfter == lastChanged)
        return lastChanged;
      if (!descAfter || !descAfter.isText(textAfter.nodeValue)) {
        return textAfter;
      } else if (view.input.compositionNode == textAfter) {
        let descBefore = textBefore.pmViewDesc;
        if (!(!descBefore || !descBefore.isText(textBefore.nodeValue)))
          return textAfter;
      }
    }
    return textBefore || textAfter;
  }
  function timestampFromCustomEvent() {
    let event = document.createEvent("Event");
    event.initEvent("event", true, true);
    return event.timeStamp;
  }
  function endComposition(view, restarting = false) {
    if (android && view.domObserver.flushingSoon >= 0)
      return;
    view.domObserver.forceFlush();
    clearComposition(view);
    if (restarting || view.docView && view.docView.dirty) {
      let sel = selectionFromDOM(view);
      if (sel && !sel.eq(view.state.selection))
        view.dispatch(view.state.tr.setSelection(sel));
      else if ((view.markCursor || restarting) && !view.state.selection.empty)
        view.dispatch(view.state.tr.deleteSelection());
      else
        view.updateState(view.state);
      return true;
    }
    return false;
  }
  function captureCopy(view, dom) {
    if (!view.dom.parentNode)
      return;
    let wrap2 = view.dom.parentNode.appendChild(document.createElement("div"));
    wrap2.appendChild(dom);
    wrap2.style.cssText = "position: fixed; left: -10000px; top: 10px";
    let sel = getSelection(), range = document.createRange();
    range.selectNodeContents(dom);
    view.dom.blur();
    sel.removeAllRanges();
    sel.addRange(range);
    setTimeout(() => {
      if (wrap2.parentNode)
        wrap2.parentNode.removeChild(wrap2);
      view.focus();
    }, 50);
  }
  const brokenClipboardAPI = ie$1 && ie_version < 15 || ios && webkit_version < 604;
  handlers.copy = editHandlers.cut = (view, _event) => {
    let event = _event;
    let sel = view.state.selection, cut2 = event.type == "cut";
    if (sel.empty)
      return;
    let data = brokenClipboardAPI ? null : event.clipboardData;
    let slice = sel.content(), { dom, text } = serializeForClipboard(view, slice);
    if (data) {
      event.preventDefault();
      data.clearData();
      data.setData("text/html", dom.innerHTML);
      data.setData("text/plain", text);
    } else {
      captureCopy(view, dom);
    }
    if (cut2)
      view.dispatch(view.state.tr.deleteSelection().scrollIntoView().setMeta("uiEvent", "cut"));
  };
  function sliceSingleNode(slice) {
    return slice.openStart == 0 && slice.openEnd == 0 && slice.content.childCount == 1 ? slice.content.firstChild : null;
  }
  function capturePaste(view, event) {
    if (!view.dom.parentNode)
      return;
    let plainText = view.input.shiftKey || view.state.selection.$from.parent.type.spec.code;
    let target = view.dom.parentNode.appendChild(document.createElement(plainText ? "textarea" : "div"));
    if (!plainText)
      target.contentEditable = "true";
    target.style.cssText = "position: fixed; left: -10000px; top: 10px";
    target.focus();
    let plain = view.input.shiftKey && view.input.lastKeyCode != 45;
    setTimeout(() => {
      view.focus();
      if (target.parentNode)
        target.parentNode.removeChild(target);
      if (plainText)
        doPaste(view, target.value, null, plain, event);
      else
        doPaste(view, target.textContent, target.innerHTML, plain, event);
    }, 50);
  }
  function doPaste(view, text, html, preferPlain, event) {
    let slice = parseFromClipboard(view, text, html, preferPlain, view.state.selection.$from);
    if (view.someProp("handlePaste", (f) => f(view, event, slice || Slice.empty)))
      return true;
    if (!slice)
      return false;
    let singleNode = sliceSingleNode(slice);
    let tr2 = singleNode ? view.state.tr.replaceSelectionWith(singleNode, preferPlain) : view.state.tr.replaceSelection(slice);
    view.dispatch(tr2.scrollIntoView().setMeta("paste", true).setMeta("uiEvent", "paste"));
    return true;
  }
  function getText$1(clipboardData) {
    let text = clipboardData.getData("text/plain") || clipboardData.getData("Text");
    if (text)
      return text;
    let uris = clipboardData.getData("text/uri-list");
    return uris ? uris.replace(/\r?\n/g, " ") : "";
  }
  editHandlers.paste = (view, _event) => {
    let event = _event;
    if (view.composing && !android)
      return;
    let data = brokenClipboardAPI ? null : event.clipboardData;
    let plain = view.input.shiftKey && view.input.lastKeyCode != 45;
    if (data && doPaste(view, getText$1(data), data.getData("text/html"), plain, event))
      event.preventDefault();
    else
      capturePaste(view, event);
  };
  class Dragging {
    constructor(slice, move, node) {
      this.slice = slice;
      this.move = move;
      this.node = node;
    }
  }
  const dragCopyModifier = mac$2 ? "altKey" : "ctrlKey";
  handlers.dragstart = (view, _event) => {
    let event = _event;
    let mouseDown = view.input.mouseDown;
    if (mouseDown)
      mouseDown.done();
    if (!event.dataTransfer)
      return;
    let sel = view.state.selection;
    let pos = sel.empty ? null : view.posAtCoords(eventCoords(event));
    let node;
    if (pos && pos.pos >= sel.from && pos.pos <= (sel instanceof NodeSelection ? sel.to - 1 : sel.to)) ;
    else if (mouseDown && mouseDown.mightDrag) {
      node = NodeSelection.create(view.state.doc, mouseDown.mightDrag.pos);
    } else if (event.target && event.target.nodeType == 1) {
      let desc = view.docView.nearestDesc(event.target, true);
      if (desc && desc.node.type.spec.draggable && desc != view.docView)
        node = NodeSelection.create(view.state.doc, desc.posBefore);
    }
    let draggedSlice = (node || view.state.selection).content();
    let { dom, text, slice } = serializeForClipboard(view, draggedSlice);
    if (!event.dataTransfer.files.length || !chrome || chrome_version > 120)
      event.dataTransfer.clearData();
    event.dataTransfer.setData(brokenClipboardAPI ? "Text" : "text/html", dom.innerHTML);
    event.dataTransfer.effectAllowed = "copyMove";
    if (!brokenClipboardAPI)
      event.dataTransfer.setData("text/plain", text);
    view.dragging = new Dragging(slice, !event[dragCopyModifier], node);
  };
  handlers.dragend = (view) => {
    let dragging = view.dragging;
    window.setTimeout(() => {
      if (view.dragging == dragging)
        view.dragging = null;
    }, 50);
  };
  editHandlers.dragover = editHandlers.dragenter = (_, e) => e.preventDefault();
  editHandlers.drop = (view, _event) => {
    let event = _event;
    let dragging = view.dragging;
    view.dragging = null;
    if (!event.dataTransfer)
      return;
    let eventPos = view.posAtCoords(eventCoords(event));
    if (!eventPos)
      return;
    let $mouse = view.state.doc.resolve(eventPos.pos);
    let slice = dragging && dragging.slice;
    if (slice) {
      view.someProp("transformPasted", (f) => {
        slice = f(slice, view);
      });
    } else {
      slice = parseFromClipboard(view, getText$1(event.dataTransfer), brokenClipboardAPI ? null : event.dataTransfer.getData("text/html"), false, $mouse);
    }
    let move = !!(dragging && !event[dragCopyModifier]);
    if (view.someProp("handleDrop", (f) => f(view, event, slice || Slice.empty, move))) {
      event.preventDefault();
      return;
    }
    if (!slice)
      return;
    event.preventDefault();
    let insertPos = slice ? dropPoint(view.state.doc, $mouse.pos, slice) : $mouse.pos;
    if (insertPos == null)
      insertPos = $mouse.pos;
    let tr2 = view.state.tr;
    if (move) {
      let { node } = dragging;
      if (node)
        node.replace(tr2);
      else
        tr2.deleteSelection();
    }
    let pos = tr2.mapping.map(insertPos);
    let isNode = slice.openStart == 0 && slice.openEnd == 0 && slice.content.childCount == 1;
    let beforeInsert = tr2.doc;
    if (isNode)
      tr2.replaceRangeWith(pos, pos, slice.content.firstChild);
    else
      tr2.replaceRange(pos, pos, slice);
    if (tr2.doc.eq(beforeInsert))
      return;
    let $pos = tr2.doc.resolve(pos);
    if (isNode && NodeSelection.isSelectable(slice.content.firstChild) && $pos.nodeAfter && $pos.nodeAfter.sameMarkup(slice.content.firstChild)) {
      tr2.setSelection(new NodeSelection($pos));
    } else {
      let end = tr2.mapping.map(insertPos);
      tr2.mapping.maps[tr2.mapping.maps.length - 1].forEach((_from, _to, _newFrom, newTo) => end = newTo);
      tr2.setSelection(selectionBetween(view, $pos, tr2.doc.resolve(end)));
    }
    view.focus();
    view.dispatch(tr2.setMeta("uiEvent", "drop"));
  };
  handlers.focus = (view) => {
    view.input.lastFocus = Date.now();
    if (!view.focused) {
      view.domObserver.stop();
      view.dom.classList.add("ProseMirror-focused");
      view.domObserver.start();
      view.focused = true;
      setTimeout(() => {
        if (view.docView && view.hasFocus() && !view.domObserver.currentSelection.eq(view.domSelectionRange()))
          selectionToDOM(view);
      }, 20);
    }
  };
  handlers.blur = (view, _event) => {
    let event = _event;
    if (view.focused) {
      view.domObserver.stop();
      view.dom.classList.remove("ProseMirror-focused");
      view.domObserver.start();
      if (event.relatedTarget && view.dom.contains(event.relatedTarget))
        view.domObserver.currentSelection.clear();
      view.focused = false;
    }
  };
  handlers.beforeinput = (view, _event) => {
    let event = _event;
    if (chrome && android && event.inputType == "deleteContentBackward") {
      view.domObserver.flushSoon();
      let { domChangeCount } = view.input;
      setTimeout(() => {
        if (view.input.domChangeCount != domChangeCount)
          return;
        view.dom.blur();
        view.focus();
        if (view.someProp("handleKeyDown", (f) => f(view, keyEvent(8, "Backspace"))))
          return;
        let { $cursor } = view.state.selection;
        if ($cursor && $cursor.pos > 0)
          view.dispatch(view.state.tr.delete($cursor.pos - 1, $cursor.pos).scrollIntoView());
      }, 50);
    }
  };
  for (let prop in editHandlers)
    handlers[prop] = editHandlers[prop];
  function compareObjs(a2, b2) {
    if (a2 == b2)
      return true;
    for (let p2 in a2)
      if (a2[p2] !== b2[p2])
        return false;
    for (let p2 in b2)
      if (!(p2 in a2))
        return false;
    return true;
  }
  class WidgetType {
    constructor(toDOM, spec) {
      this.toDOM = toDOM;
      this.spec = spec || noSpec;
      this.side = this.spec.side || 0;
    }
    map(mapping, span, offset, oldOffset) {
      let { pos, deleted } = mapping.mapResult(span.from + oldOffset, this.side < 0 ? -1 : 1);
      return deleted ? null : new Decoration(pos - offset, pos - offset, this);
    }
    valid() {
      return true;
    }
    eq(other) {
      return this == other || other instanceof WidgetType && (this.spec.key && this.spec.key == other.spec.key || this.toDOM == other.toDOM && compareObjs(this.spec, other.spec));
    }
    destroy(node) {
      if (this.spec.destroy)
        this.spec.destroy(node);
    }
  }
  class InlineType {
    constructor(attrs, spec) {
      this.attrs = attrs;
      this.spec = spec || noSpec;
    }
    map(mapping, span, offset, oldOffset) {
      let from = mapping.map(span.from + oldOffset, this.spec.inclusiveStart ? -1 : 1) - offset;
      let to = mapping.map(span.to + oldOffset, this.spec.inclusiveEnd ? 1 : -1) - offset;
      return from >= to ? null : new Decoration(from, to, this);
    }
    valid(_, span) {
      return span.from < span.to;
    }
    eq(other) {
      return this == other || other instanceof InlineType && compareObjs(this.attrs, other.attrs) && compareObjs(this.spec, other.spec);
    }
    static is(span) {
      return span.type instanceof InlineType;
    }
    destroy() {
    }
  }
  class NodeType {
    constructor(attrs, spec) {
      this.attrs = attrs;
      this.spec = spec || noSpec;
    }
    map(mapping, span, offset, oldOffset) {
      let from = mapping.mapResult(span.from + oldOffset, 1);
      if (from.deleted)
        return null;
      let to = mapping.mapResult(span.to + oldOffset, -1);
      if (to.deleted || to.pos <= from.pos)
        return null;
      return new Decoration(from.pos - offset, to.pos - offset, this);
    }
    valid(node, span) {
      let { index, offset } = node.content.findIndex(span.from), child;
      return offset == span.from && !(child = node.child(index)).isText && offset + child.nodeSize == span.to;
    }
    eq(other) {
      return this == other || other instanceof NodeType && compareObjs(this.attrs, other.attrs) && compareObjs(this.spec, other.spec);
    }
    destroy() {
    }
  }
  class Decoration {
    /**
    @internal
    */
    constructor(from, to, type) {
      this.from = from;
      this.to = to;
      this.type = type;
    }
    /**
    @internal
    */
    copy(from, to) {
      return new Decoration(from, to, this.type);
    }
    /**
    @internal
    */
    eq(other, offset = 0) {
      return this.type.eq(other.type) && this.from + offset == other.from && this.to + offset == other.to;
    }
    /**
    @internal
    */
    map(mapping, offset, oldOffset) {
      return this.type.map(mapping, this, offset, oldOffset);
    }
    /**
    Creates a widget decoration, which is a DOM node that's shown in
    the document at the given position. It is recommended that you
    delay rendering the widget by passing a function that will be
    called when the widget is actually drawn in a view, but you can
    also directly pass a DOM node. `getPos` can be used to find the
    widget's current document position.
    */
    static widget(pos, toDOM, spec) {
      return new Decoration(pos, pos, new WidgetType(toDOM, spec));
    }
    /**
    Creates an inline decoration, which adds the given attributes to
    each inline node between `from` and `to`.
    */
    static inline(from, to, attrs, spec) {
      return new Decoration(from, to, new InlineType(attrs, spec));
    }
    /**
    Creates a node decoration. `from` and `to` should point precisely
    before and after a node in the document. That node, and only that
    node, will receive the given attributes.
    */
    static node(from, to, attrs, spec) {
      return new Decoration(from, to, new NodeType(attrs, spec));
    }
    /**
    The spec provided when creating this decoration. Can be useful
    if you've stored extra information in that object.
    */
    get spec() {
      return this.type.spec;
    }
    /**
    @internal
    */
    get inline() {
      return this.type instanceof InlineType;
    }
    /**
    @internal
    */
    get widget() {
      return this.type instanceof WidgetType;
    }
  }
  const none = [], noSpec = {};
  class DecorationSet {
    /**
    @internal
    */
    constructor(local, children) {
      this.local = local.length ? local : none;
      this.children = children.length ? children : none;
    }
    /**
    Create a set of decorations, using the structure of the given
    document. This will consume (modify) the `decorations` array, so
    you must make a copy if you want need to preserve that.
    */
    static create(doc2, decorations) {
      return decorations.length ? buildTree(decorations, doc2, 0, noSpec) : empty;
    }
    /**
    Find all decorations in this set which touch the given range
    (including decorations that start or end directly at the
    boundaries) and match the given predicate on their spec. When
    `start` and `end` are omitted, all decorations in the set are
    considered. When `predicate` isn't given, all decorations are
    assumed to match.
    */
    find(start, end, predicate) {
      let result = [];
      this.findInner(start == null ? 0 : start, end == null ? 1e9 : end, result, 0, predicate);
      return result;
    }
    findInner(start, end, result, offset, predicate) {
      for (let i2 = 0; i2 < this.local.length; i2++) {
        let span = this.local[i2];
        if (span.from <= end && span.to >= start && (!predicate || predicate(span.spec)))
          result.push(span.copy(span.from + offset, span.to + offset));
      }
      for (let i2 = 0; i2 < this.children.length; i2 += 3) {
        if (this.children[i2] < end && this.children[i2 + 1] > start) {
          let childOff = this.children[i2] + 1;
          this.children[i2 + 2].findInner(start - childOff, end - childOff, result, offset + childOff, predicate);
        }
      }
    }
    /**
    Map the set of decorations in response to a change in the
    document.
    */
    map(mapping, doc2, options) {
      if (this == empty || mapping.maps.length == 0)
        return this;
      return this.mapInner(mapping, doc2, 0, 0, options || noSpec);
    }
    /**
    @internal
    */
    mapInner(mapping, node, offset, oldOffset, options) {
      let newLocal;
      for (let i2 = 0; i2 < this.local.length; i2++) {
        let mapped = this.local[i2].map(mapping, offset, oldOffset);
        if (mapped && mapped.type.valid(node, mapped))
          (newLocal || (newLocal = [])).push(mapped);
        else if (options.onRemove)
          options.onRemove(this.local[i2].spec);
      }
      if (this.children.length)
        return mapChildren(this.children, newLocal || [], mapping, node, offset, oldOffset, options);
      else
        return newLocal ? new DecorationSet(newLocal.sort(byPos), none) : empty;
    }
    /**
    Add the given array of decorations to the ones in the set,
    producing a new set. Consumes the `decorations` array. Needs
    access to the current document to create the appropriate tree
    structure.
    */
    add(doc2, decorations) {
      if (!decorations.length)
        return this;
      if (this == empty)
        return DecorationSet.create(doc2, decorations);
      return this.addInner(doc2, decorations, 0);
    }
    addInner(doc2, decorations, offset) {
      let children, childIndex = 0;
      doc2.forEach((childNode, childOffset) => {
        let baseOffset = childOffset + offset, found2;
        if (!(found2 = takeSpansForNode(decorations, childNode, baseOffset)))
          return;
        if (!children)
          children = this.children.slice();
        while (childIndex < children.length && children[childIndex] < childOffset)
          childIndex += 3;
        if (children[childIndex] == childOffset)
          children[childIndex + 2] = children[childIndex + 2].addInner(childNode, found2, baseOffset + 1);
        else
          children.splice(childIndex, 0, childOffset, childOffset + childNode.nodeSize, buildTree(found2, childNode, baseOffset + 1, noSpec));
        childIndex += 3;
      });
      let local = moveSpans(childIndex ? withoutNulls(decorations) : decorations, -offset);
      for (let i2 = 0; i2 < local.length; i2++)
        if (!local[i2].type.valid(doc2, local[i2]))
          local.splice(i2--, 1);
      return new DecorationSet(local.length ? this.local.concat(local).sort(byPos) : this.local, children || this.children);
    }
    /**
    Create a new set that contains the decorations in this set, minus
    the ones in the given array.
    */
    remove(decorations) {
      if (decorations.length == 0 || this == empty)
        return this;
      return this.removeInner(decorations, 0);
    }
    removeInner(decorations, offset) {
      let children = this.children, local = this.local;
      for (let i2 = 0; i2 < children.length; i2 += 3) {
        let found2;
        let from = children[i2] + offset, to = children[i2 + 1] + offset;
        for (let j = 0, span; j < decorations.length; j++)
          if (span = decorations[j]) {
            if (span.from > from && span.to < to) {
              decorations[j] = null;
              (found2 || (found2 = [])).push(span);
            }
          }
        if (!found2)
          continue;
        if (children == this.children)
          children = this.children.slice();
        let removed = children[i2 + 2].removeInner(found2, from + 1);
        if (removed != empty) {
          children[i2 + 2] = removed;
        } else {
          children.splice(i2, 3);
          i2 -= 3;
        }
      }
      if (local.length) {
        for (let i2 = 0, span; i2 < decorations.length; i2++)
          if (span = decorations[i2]) {
            for (let j = 0; j < local.length; j++)
              if (local[j].eq(span, offset)) {
                if (local == this.local)
                  local = this.local.slice();
                local.splice(j--, 1);
              }
          }
      }
      if (children == this.children && local == this.local)
        return this;
      return local.length || children.length ? new DecorationSet(local, children) : empty;
    }
    forChild(offset, node) {
      if (this == empty)
        return this;
      if (node.isLeaf)
        return DecorationSet.empty;
      let child, local;
      for (let i2 = 0; i2 < this.children.length; i2 += 3)
        if (this.children[i2] >= offset) {
          if (this.children[i2] == offset)
            child = this.children[i2 + 2];
          break;
        }
      let start = offset + 1, end = start + node.content.size;
      for (let i2 = 0; i2 < this.local.length; i2++) {
        let dec = this.local[i2];
        if (dec.from < end && dec.to > start && dec.type instanceof InlineType) {
          let from = Math.max(start, dec.from) - start, to = Math.min(end, dec.to) - start;
          if (from < to)
            (local || (local = [])).push(dec.copy(from, to));
        }
      }
      if (local) {
        let localSet = new DecorationSet(local.sort(byPos), none);
        return child ? new DecorationGroup([localSet, child]) : localSet;
      }
      return child || empty;
    }
    /**
    @internal
    */
    eq(other) {
      if (this == other)
        return true;
      if (!(other instanceof DecorationSet) || this.local.length != other.local.length || this.children.length != other.children.length)
        return false;
      for (let i2 = 0; i2 < this.local.length; i2++)
        if (!this.local[i2].eq(other.local[i2]))
          return false;
      for (let i2 = 0; i2 < this.children.length; i2 += 3)
        if (this.children[i2] != other.children[i2] || this.children[i2 + 1] != other.children[i2 + 1] || !this.children[i2 + 2].eq(other.children[i2 + 2]))
          return false;
      return true;
    }
    /**
    @internal
    */
    locals(node) {
      return removeOverlap(this.localsInner(node));
    }
    /**
    @internal
    */
    localsInner(node) {
      if (this == empty)
        return none;
      if (node.inlineContent || !this.local.some(InlineType.is))
        return this.local;
      let result = [];
      for (let i2 = 0; i2 < this.local.length; i2++) {
        if (!(this.local[i2].type instanceof InlineType))
          result.push(this.local[i2]);
      }
      return result;
    }
    forEachSet(f) {
      f(this);
    }
  }
  DecorationSet.empty = new DecorationSet([], []);
  DecorationSet.removeOverlap = removeOverlap;
  const empty = DecorationSet.empty;
  class DecorationGroup {
    constructor(members) {
      this.members = members;
    }
    map(mapping, doc2) {
      const mappedDecos = this.members.map((member) => member.map(mapping, doc2, noSpec));
      return DecorationGroup.from(mappedDecos);
    }
    forChild(offset, child) {
      if (child.isLeaf)
        return DecorationSet.empty;
      let found2 = [];
      for (let i2 = 0; i2 < this.members.length; i2++) {
        let result = this.members[i2].forChild(offset, child);
        if (result == empty)
          continue;
        if (result instanceof DecorationGroup)
          found2 = found2.concat(result.members);
        else
          found2.push(result);
      }
      return DecorationGroup.from(found2);
    }
    eq(other) {
      if (!(other instanceof DecorationGroup) || other.members.length != this.members.length)
        return false;
      for (let i2 = 0; i2 < this.members.length; i2++)
        if (!this.members[i2].eq(other.members[i2]))
          return false;
      return true;
    }
    locals(node) {
      let result, sorted = true;
      for (let i2 = 0; i2 < this.members.length; i2++) {
        let locals = this.members[i2].localsInner(node);
        if (!locals.length)
          continue;
        if (!result) {
          result = locals;
        } else {
          if (sorted) {
            result = result.slice();
            sorted = false;
          }
          for (let j = 0; j < locals.length; j++)
            result.push(locals[j]);
        }
      }
      return result ? removeOverlap(sorted ? result : result.sort(byPos)) : none;
    }
    // Create a group for the given array of decoration sets, or return
    // a single set when possible.
    static from(members) {
      switch (members.length) {
        case 0:
          return empty;
        case 1:
          return members[0];
        default:
          return new DecorationGroup(members.every((m) => m instanceof DecorationSet) ? members : members.reduce((r, m) => r.concat(m instanceof DecorationSet ? m : m.members), []));
      }
    }
    forEachSet(f) {
      for (let i2 = 0; i2 < this.members.length; i2++)
        this.members[i2].forEachSet(f);
    }
  }
  function mapChildren(oldChildren, newLocal, mapping, node, offset, oldOffset, options) {
    let children = oldChildren.slice();
    for (let i2 = 0, baseOffset = oldOffset; i2 < mapping.maps.length; i2++) {
      let moved = 0;
      mapping.maps[i2].forEach((oldStart, oldEnd, newStart, newEnd) => {
        let dSize = newEnd - newStart - (oldEnd - oldStart);
        for (let i3 = 0; i3 < children.length; i3 += 3) {
          let end = children[i3 + 1];
          if (end < 0 || oldStart > end + baseOffset - moved)
            continue;
          let start = children[i3] + baseOffset - moved;
          if (oldEnd >= start) {
            children[i3 + 1] = oldStart <= start ? -2 : -1;
          } else if (oldStart >= baseOffset && dSize) {
            children[i3] += dSize;
            children[i3 + 1] += dSize;
          }
        }
        moved += dSize;
      });
      baseOffset = mapping.maps[i2].map(baseOffset, -1);
    }
    let mustRebuild = false;
    for (let i2 = 0; i2 < children.length; i2 += 3)
      if (children[i2 + 1] < 0) {
        if (children[i2 + 1] == -2) {
          mustRebuild = true;
          children[i2 + 1] = -1;
          continue;
        }
        let from = mapping.map(oldChildren[i2] + oldOffset), fromLocal = from - offset;
        if (fromLocal < 0 || fromLocal >= node.content.size) {
          mustRebuild = true;
          continue;
        }
        let to = mapping.map(oldChildren[i2 + 1] + oldOffset, -1), toLocal = to - offset;
        let { index, offset: childOffset } = node.content.findIndex(fromLocal);
        let childNode = node.maybeChild(index);
        if (childNode && childOffset == fromLocal && childOffset + childNode.nodeSize == toLocal) {
          let mapped = children[i2 + 2].mapInner(mapping, childNode, from + 1, oldChildren[i2] + oldOffset + 1, options);
          if (mapped != empty) {
            children[i2] = fromLocal;
            children[i2 + 1] = toLocal;
            children[i2 + 2] = mapped;
          } else {
            children[i2 + 1] = -2;
            mustRebuild = true;
          }
        } else {
          mustRebuild = true;
        }
      }
    if (mustRebuild) {
      let decorations = mapAndGatherRemainingDecorations(children, oldChildren, newLocal, mapping, offset, oldOffset, options);
      let built = buildTree(decorations, node, 0, options);
      newLocal = built.local;
      for (let i2 = 0; i2 < children.length; i2 += 3)
        if (children[i2 + 1] < 0) {
          children.splice(i2, 3);
          i2 -= 3;
        }
      for (let i2 = 0, j = 0; i2 < built.children.length; i2 += 3) {
        let from = built.children[i2];
        while (j < children.length && children[j] < from)
          j += 3;
        children.splice(j, 0, built.children[i2], built.children[i2 + 1], built.children[i2 + 2]);
      }
    }
    return new DecorationSet(newLocal.sort(byPos), children);
  }
  function moveSpans(spans, offset) {
    if (!offset || !spans.length)
      return spans;
    let result = [];
    for (let i2 = 0; i2 < spans.length; i2++) {
      let span = spans[i2];
      result.push(new Decoration(span.from + offset, span.to + offset, span.type));
    }
    return result;
  }
  function mapAndGatherRemainingDecorations(children, oldChildren, decorations, mapping, offset, oldOffset, options) {
    function gather(set, oldOffset2) {
      for (let i2 = 0; i2 < set.local.length; i2++) {
        let mapped = set.local[i2].map(mapping, offset, oldOffset2);
        if (mapped)
          decorations.push(mapped);
        else if (options.onRemove)
          options.onRemove(set.local[i2].spec);
      }
      for (let i2 = 0; i2 < set.children.length; i2 += 3)
        gather(set.children[i2 + 2], set.children[i2] + oldOffset2 + 1);
    }
    for (let i2 = 0; i2 < children.length; i2 += 3)
      if (children[i2 + 1] == -1)
        gather(children[i2 + 2], oldChildren[i2] + oldOffset + 1);
    return decorations;
  }
  function takeSpansForNode(spans, node, offset) {
    if (node.isLeaf)
      return null;
    let end = offset + node.nodeSize, found2 = null;
    for (let i2 = 0, span; i2 < spans.length; i2++) {
      if ((span = spans[i2]) && span.from > offset && span.to < end) {
        (found2 || (found2 = [])).push(span);
        spans[i2] = null;
      }
    }
    return found2;
  }
  function withoutNulls(array2) {
    let result = [];
    for (let i2 = 0; i2 < array2.length; i2++)
      if (array2[i2] != null)
        result.push(array2[i2]);
    return result;
  }
  function buildTree(spans, node, offset, options) {
    let children = [], hasNulls = false;
    node.forEach((childNode, localStart) => {
      let found2 = takeSpansForNode(spans, childNode, localStart + offset);
      if (found2) {
        hasNulls = true;
        let subtree = buildTree(found2, childNode, offset + localStart + 1, options);
        if (subtree != empty)
          children.push(localStart, localStart + childNode.nodeSize, subtree);
      }
    });
    let locals = moveSpans(hasNulls ? withoutNulls(spans) : spans, -offset).sort(byPos);
    for (let i2 = 0; i2 < locals.length; i2++)
      if (!locals[i2].type.valid(node, locals[i2])) {
        if (options.onRemove)
          options.onRemove(locals[i2].spec);
        locals.splice(i2--, 1);
      }
    return locals.length || children.length ? new DecorationSet(locals, children) : empty;
  }
  function byPos(a2, b2) {
    return a2.from - b2.from || a2.to - b2.to;
  }
  function removeOverlap(spans) {
    let working = spans;
    for (let i2 = 0; i2 < working.length - 1; i2++) {
      let span = working[i2];
      if (span.from != span.to)
        for (let j = i2 + 1; j < working.length; j++) {
          let next = working[j];
          if (next.from == span.from) {
            if (next.to != span.to) {
              if (working == spans)
                working = spans.slice();
              working[j] = next.copy(next.from, span.to);
              insertAhead(working, j + 1, next.copy(span.to, next.to));
            }
            continue;
          } else {
            if (next.from < span.to) {
              if (working == spans)
                working = spans.slice();
              working[i2] = span.copy(span.from, next.from);
              insertAhead(working, j, span.copy(next.from, span.to));
            }
            break;
          }
        }
    }
    return working;
  }
  function insertAhead(array2, i2, deco) {
    while (i2 < array2.length && byPos(deco, array2[i2]) > 0)
      i2++;
    array2.splice(i2, 0, deco);
  }
  function viewDecorations(view) {
    let found2 = [];
    view.someProp("decorations", (f) => {
      let result = f(view.state);
      if (result && result != empty)
        found2.push(result);
    });
    if (view.cursorWrapper)
      found2.push(DecorationSet.create(view.state.doc, [view.cursorWrapper.deco]));
    return DecorationGroup.from(found2);
  }
  const observeOptions = {
    childList: true,
    characterData: true,
    characterDataOldValue: true,
    attributes: true,
    attributeOldValue: true,
    subtree: true
  };
  const useCharData = ie$1 && ie_version <= 11;
  class SelectionState {
    constructor() {
      this.anchorNode = null;
      this.anchorOffset = 0;
      this.focusNode = null;
      this.focusOffset = 0;
    }
    set(sel) {
      this.anchorNode = sel.anchorNode;
      this.anchorOffset = sel.anchorOffset;
      this.focusNode = sel.focusNode;
      this.focusOffset = sel.focusOffset;
    }
    clear() {
      this.anchorNode = this.focusNode = null;
    }
    eq(sel) {
      return sel.anchorNode == this.anchorNode && sel.anchorOffset == this.anchorOffset && sel.focusNode == this.focusNode && sel.focusOffset == this.focusOffset;
    }
  }
  class DOMObserver {
    constructor(view, handleDOMChange) {
      this.view = view;
      this.handleDOMChange = handleDOMChange;
      this.queue = [];
      this.flushingSoon = -1;
      this.observer = null;
      this.currentSelection = new SelectionState();
      this.onCharData = null;
      this.suppressingSelectionUpdates = false;
      this.lastChangedTextNode = null;
      this.observer = window.MutationObserver && new window.MutationObserver((mutations) => {
        for (let i2 = 0; i2 < mutations.length; i2++)
          this.queue.push(mutations[i2]);
        if (ie$1 && ie_version <= 11 && mutations.some((m) => m.type == "childList" && m.removedNodes.length || m.type == "characterData" && m.oldValue.length > m.target.nodeValue.length))
          this.flushSoon();
        else
          this.flush();
      });
      if (useCharData) {
        this.onCharData = (e) => {
          this.queue.push({ target: e.target, type: "characterData", oldValue: e.prevValue });
          this.flushSoon();
        };
      }
      this.onSelectionChange = this.onSelectionChange.bind(this);
    }
    flushSoon() {
      if (this.flushingSoon < 0)
        this.flushingSoon = window.setTimeout(() => {
          this.flushingSoon = -1;
          this.flush();
        }, 20);
    }
    forceFlush() {
      if (this.flushingSoon > -1) {
        window.clearTimeout(this.flushingSoon);
        this.flushingSoon = -1;
        this.flush();
      }
    }
    start() {
      if (this.observer) {
        this.observer.takeRecords();
        this.observer.observe(this.view.dom, observeOptions);
      }
      if (this.onCharData)
        this.view.dom.addEventListener("DOMCharacterDataModified", this.onCharData);
      this.connectSelection();
    }
    stop() {
      if (this.observer) {
        let take = this.observer.takeRecords();
        if (take.length) {
          for (let i2 = 0; i2 < take.length; i2++)
            this.queue.push(take[i2]);
          window.setTimeout(() => this.flush(), 20);
        }
        this.observer.disconnect();
      }
      if (this.onCharData)
        this.view.dom.removeEventListener("DOMCharacterDataModified", this.onCharData);
      this.disconnectSelection();
    }
    connectSelection() {
      this.view.dom.ownerDocument.addEventListener("selectionchange", this.onSelectionChange);
    }
    disconnectSelection() {
      this.view.dom.ownerDocument.removeEventListener("selectionchange", this.onSelectionChange);
    }
    suppressSelectionUpdates() {
      this.suppressingSelectionUpdates = true;
      setTimeout(() => this.suppressingSelectionUpdates = false, 50);
    }
    onSelectionChange() {
      if (!hasFocusAndSelection(this.view))
        return;
      if (this.suppressingSelectionUpdates)
        return selectionToDOM(this.view);
      if (ie$1 && ie_version <= 11 && !this.view.state.selection.empty) {
        let sel = this.view.domSelectionRange();
        if (sel.focusNode && isEquivalentPosition(sel.focusNode, sel.focusOffset, sel.anchorNode, sel.anchorOffset))
          return this.flushSoon();
      }
      this.flush();
    }
    setCurSelection() {
      this.currentSelection.set(this.view.domSelectionRange());
    }
    ignoreSelectionChange(sel) {
      if (!sel.focusNode)
        return true;
      let ancestors = /* @__PURE__ */ new Set(), container;
      for (let scan = sel.focusNode; scan; scan = parentNode(scan))
        ancestors.add(scan);
      for (let scan = sel.anchorNode; scan; scan = parentNode(scan))
        if (ancestors.has(scan)) {
          container = scan;
          break;
        }
      let desc = container && this.view.docView.nearestDesc(container);
      if (desc && desc.ignoreMutation({
        type: "selection",
        target: container.nodeType == 3 ? container.parentNode : container
      })) {
        this.setCurSelection();
        return true;
      }
    }
    pendingRecords() {
      if (this.observer)
        for (let mut of this.observer.takeRecords())
          this.queue.push(mut);
      return this.queue;
    }
    flush() {
      let { view } = this;
      if (!view.docView || this.flushingSoon > -1)
        return;
      let mutations = this.pendingRecords();
      if (mutations.length)
        this.queue = [];
      let sel = view.domSelectionRange();
      let newSel = !this.suppressingSelectionUpdates && !this.currentSelection.eq(sel) && hasFocusAndSelection(view) && !this.ignoreSelectionChange(sel);
      let from = -1, to = -1, typeOver = false, added = [];
      if (view.editable) {
        for (let i2 = 0; i2 < mutations.length; i2++) {
          let result = this.registerMutation(mutations[i2], added);
          if (result) {
            from = from < 0 ? result.from : Math.min(result.from, from);
            to = to < 0 ? result.to : Math.max(result.to, to);
            if (result.typeOver)
              typeOver = true;
          }
        }
      }
      if (gecko && added.length) {
        let brs = added.filter((n) => n.nodeName == "BR");
        if (brs.length == 2) {
          let [a2, b2] = brs;
          if (a2.parentNode && a2.parentNode.parentNode == b2.parentNode)
            b2.remove();
          else
            a2.remove();
        } else {
          let { focusNode } = this.currentSelection;
          for (let br of brs) {
            let parent = br.parentNode;
            if (parent && parent.nodeName == "LI" && (!focusNode || blockParent(view, focusNode) != parent))
              br.remove();
          }
        }
      }
      let readSel = null;
      if (from < 0 && newSel && view.input.lastFocus > Date.now() - 200 && Math.max(view.input.lastTouch, view.input.lastClick.time) < Date.now() - 300 && selectionCollapsed(sel) && (readSel = selectionFromDOM(view)) && readSel.eq(Selection.near(view.state.doc.resolve(0), 1))) {
        view.input.lastFocus = 0;
        selectionToDOM(view);
        this.currentSelection.set(sel);
        view.scrollToSelection();
      } else if (from > -1 || newSel) {
        if (from > -1) {
          view.docView.markDirty(from, to);
          checkCSS(view);
        }
        this.handleDOMChange(from, to, typeOver, added);
        if (view.docView && view.docView.dirty)
          view.updateState(view.state);
        else if (!this.currentSelection.eq(sel))
          selectionToDOM(view);
        this.currentSelection.set(sel);
      }
    }
    registerMutation(mut, added) {
      if (added.indexOf(mut.target) > -1)
        return null;
      let desc = this.view.docView.nearestDesc(mut.target);
      if (mut.type == "attributes" && (desc == this.view.docView || mut.attributeName == "contenteditable" || // Firefox sometimes fires spurious events for null/empty styles
      mut.attributeName == "style" && !mut.oldValue && !mut.target.getAttribute("style")))
        return null;
      if (!desc || desc.ignoreMutation(mut))
        return null;
      if (mut.type == "childList") {
        for (let i2 = 0; i2 < mut.addedNodes.length; i2++) {
          let node = mut.addedNodes[i2];
          added.push(node);
          if (node.nodeType == 3)
            this.lastChangedTextNode = node;
        }
        if (desc.contentDOM && desc.contentDOM != desc.dom && !desc.contentDOM.contains(mut.target))
          return { from: desc.posBefore, to: desc.posAfter };
        let prev = mut.previousSibling, next = mut.nextSibling;
        if (ie$1 && ie_version <= 11 && mut.addedNodes.length) {
          for (let i2 = 0; i2 < mut.addedNodes.length; i2++) {
            let { previousSibling, nextSibling } = mut.addedNodes[i2];
            if (!previousSibling || Array.prototype.indexOf.call(mut.addedNodes, previousSibling) < 0)
              prev = previousSibling;
            if (!nextSibling || Array.prototype.indexOf.call(mut.addedNodes, nextSibling) < 0)
              next = nextSibling;
          }
        }
        let fromOffset = prev && prev.parentNode == mut.target ? domIndex(prev) + 1 : 0;
        let from = desc.localPosFromDOM(mut.target, fromOffset, -1);
        let toOffset = next && next.parentNode == mut.target ? domIndex(next) : mut.target.childNodes.length;
        let to = desc.localPosFromDOM(mut.target, toOffset, 1);
        return { from, to };
      } else if (mut.type == "attributes") {
        return { from: desc.posAtStart - desc.border, to: desc.posAtEnd + desc.border };
      } else {
        this.lastChangedTextNode = mut.target;
        return {
          from: desc.posAtStart,
          to: desc.posAtEnd,
          // An event was generated for a text change that didn't change
          // any text. Mark the dom change to fall back to assuming the
          // selection was typed over with an identical value if it can't
          // find another change.
          typeOver: mut.target.nodeValue == mut.oldValue
        };
      }
    }
  }
  let cssChecked = /* @__PURE__ */ new WeakMap();
  let cssCheckWarned = false;
  function checkCSS(view) {
    if (cssChecked.has(view))
      return;
    cssChecked.set(view, null);
    if (["normal", "nowrap", "pre-line"].indexOf(getComputedStyle(view.dom).whiteSpace) !== -1) {
      view.requiresGeckoHackNode = gecko;
      if (cssCheckWarned)
        return;
      console["warn"]("ProseMirror expects the CSS white-space property to be set, preferably to 'pre-wrap'. It is recommended to load style/prosemirror.css from the prosemirror-view package.");
      cssCheckWarned = true;
    }
  }
  function rangeToSelectionRange(view, range) {
    let anchorNode = range.startContainer, anchorOffset = range.startOffset;
    let focusNode = range.endContainer, focusOffset = range.endOffset;
    let currentAnchor = view.domAtPos(view.state.selection.anchor);
    if (isEquivalentPosition(currentAnchor.node, currentAnchor.offset, focusNode, focusOffset))
      [anchorNode, anchorOffset, focusNode, focusOffset] = [focusNode, focusOffset, anchorNode, anchorOffset];
    return { anchorNode, anchorOffset, focusNode, focusOffset };
  }
  function safariShadowSelectionRange(view, selection) {
    if (selection.getComposedRanges) {
      let range = selection.getComposedRanges(view.root)[0];
      if (range)
        return rangeToSelectionRange(view, range);
    }
    let found2;
    function read(event) {
      event.preventDefault();
      event.stopImmediatePropagation();
      found2 = event.getTargetRanges()[0];
    }
    view.dom.addEventListener("beforeinput", read, true);
    document.execCommand("indent");
    view.dom.removeEventListener("beforeinput", read, true);
    return found2 ? rangeToSelectionRange(view, found2) : null;
  }
  function blockParent(view, node) {
    for (let p2 = node.parentNode; p2 && p2 != view.dom; p2 = p2.parentNode) {
      let desc = view.docView.nearestDesc(p2, true);
      if (desc && desc.node.isBlock)
        return p2;
    }
    return null;
  }
  function parseBetween(view, from_, to_) {
    let { node: parent, fromOffset, toOffset, from, to } = view.docView.parseRange(from_, to_);
    let domSel = view.domSelectionRange();
    let find2;
    let anchor = domSel.anchorNode;
    if (anchor && view.dom.contains(anchor.nodeType == 1 ? anchor : anchor.parentNode)) {
      find2 = [{ node: anchor, offset: domSel.anchorOffset }];
      if (!selectionCollapsed(domSel))
        find2.push({ node: domSel.focusNode, offset: domSel.focusOffset });
    }
    if (chrome && view.input.lastKeyCode === 8) {
      for (let off = toOffset; off > fromOffset; off--) {
        let node = parent.childNodes[off - 1], desc = node.pmViewDesc;
        if (node.nodeName == "BR" && !desc) {
          toOffset = off;
          break;
        }
        if (!desc || desc.size)
          break;
      }
    }
    let startDoc = view.state.doc;
    let parser = view.someProp("domParser") || DOMParser.fromSchema(view.state.schema);
    let $from = startDoc.resolve(from);
    let sel = null, doc2 = parser.parse(parent, {
      topNode: $from.parent,
      topMatch: $from.parent.contentMatchAt($from.index()),
      topOpen: true,
      from: fromOffset,
      to: toOffset,
      preserveWhitespace: $from.parent.type.whitespace == "pre" ? "full" : true,
      findPositions: find2,
      ruleFromNode,
      context: $from
    });
    if (find2 && find2[0].pos != null) {
      let anchor2 = find2[0].pos, head = find2[1] && find2[1].pos;
      if (head == null)
        head = anchor2;
      sel = { anchor: anchor2 + from, head: head + from };
    }
    return { doc: doc2, sel, from, to };
  }
  function ruleFromNode(dom) {
    let desc = dom.pmViewDesc;
    if (desc) {
      return desc.parseRule();
    } else if (dom.nodeName == "BR" && dom.parentNode) {
      if (safari && /^(ul|ol)$/i.test(dom.parentNode.nodeName)) {
        let skip = document.createElement("div");
        skip.appendChild(document.createElement("li"));
        return { skip };
      } else if (dom.parentNode.lastChild == dom || safari && /^(tr|table)$/i.test(dom.parentNode.nodeName)) {
        return { ignore: true };
      }
    } else if (dom.nodeName == "IMG" && dom.getAttribute("mark-placeholder")) {
      return { ignore: true };
    }
    return null;
  }
  const isInline = /^(a|abbr|acronym|b|bd[io]|big|br|button|cite|code|data(list)?|del|dfn|em|i|ins|kbd|label|map|mark|meter|output|q|ruby|s|samp|small|span|strong|su[bp]|time|u|tt|var)$/i;
  function readDOMChange(view, from, to, typeOver, addedNodes) {
    let compositionID = view.input.compositionPendingChanges || (view.composing ? view.input.compositionID : 0);
    view.input.compositionPendingChanges = 0;
    if (from < 0) {
      let origin = view.input.lastSelectionTime > Date.now() - 50 ? view.input.lastSelectionOrigin : null;
      let newSel = selectionFromDOM(view, origin);
      if (newSel && !view.state.selection.eq(newSel)) {
        if (chrome && android && view.input.lastKeyCode === 13 && Date.now() - 100 < view.input.lastKeyCodeTime && view.someProp("handleKeyDown", (f) => f(view, keyEvent(13, "Enter"))))
          return;
        let tr3 = view.state.tr.setSelection(newSel);
        if (origin == "pointer")
          tr3.setMeta("pointer", true);
        else if (origin == "key")
          tr3.scrollIntoView();
        if (compositionID)
          tr3.setMeta("composition", compositionID);
        view.dispatch(tr3);
      }
      return;
    }
    let $before = view.state.doc.resolve(from);
    let shared = $before.sharedDepth(to);
    from = $before.before(shared + 1);
    to = view.state.doc.resolve(to).after(shared + 1);
    let sel = view.state.selection;
    let parse = parseBetween(view, from, to);
    let doc2 = view.state.doc, compare = doc2.slice(parse.from, parse.to);
    let preferredPos, preferredSide;
    if (view.input.lastKeyCode === 8 && Date.now() - 100 < view.input.lastKeyCodeTime) {
      preferredPos = view.state.selection.to;
      preferredSide = "end";
    } else {
      preferredPos = view.state.selection.from;
      preferredSide = "start";
    }
    view.input.lastKeyCode = null;
    let change = findDiff(compare.content, parse.doc.content, parse.from, preferredPos, preferredSide);
    if (change)
      view.input.domChangeCount++;
    if ((ios && view.input.lastIOSEnter > Date.now() - 225 || android) && addedNodes.some((n) => n.nodeType == 1 && !isInline.test(n.nodeName)) && (!change || change.endA >= change.endB) && view.someProp("handleKeyDown", (f) => f(view, keyEvent(13, "Enter")))) {
      view.input.lastIOSEnter = 0;
      return;
    }
    if (!change) {
      if (typeOver && sel instanceof TextSelection && !sel.empty && sel.$head.sameParent(sel.$anchor) && !view.composing && !(parse.sel && parse.sel.anchor != parse.sel.head)) {
        change = { start: sel.from, endA: sel.to, endB: sel.to };
      } else {
        if (parse.sel) {
          let sel2 = resolveSelection(view, view.state.doc, parse.sel);
          if (sel2 && !sel2.eq(view.state.selection)) {
            let tr3 = view.state.tr.setSelection(sel2);
            if (compositionID)
              tr3.setMeta("composition", compositionID);
            view.dispatch(tr3);
          }
        }
        return;
      }
    }
    if (view.state.selection.from < view.state.selection.to && change.start == change.endB && view.state.selection instanceof TextSelection) {
      if (change.start > view.state.selection.from && change.start <= view.state.selection.from + 2 && view.state.selection.from >= parse.from) {
        change.start = view.state.selection.from;
      } else if (change.endA < view.state.selection.to && change.endA >= view.state.selection.to - 2 && view.state.selection.to <= parse.to) {
        change.endB += view.state.selection.to - change.endA;
        change.endA = view.state.selection.to;
      }
    }
    if (ie$1 && ie_version <= 11 && change.endB == change.start + 1 && change.endA == change.start && change.start > parse.from && parse.doc.textBetween(change.start - parse.from - 1, change.start - parse.from + 1) == "  ") {
      change.start--;
      change.endA--;
      change.endB--;
    }
    let $from = parse.doc.resolveNoCache(change.start - parse.from);
    let $to = parse.doc.resolveNoCache(change.endB - parse.from);
    let $fromA = doc2.resolve(change.start);
    let inlineChange = $from.sameParent($to) && $from.parent.inlineContent && $fromA.end() >= change.endA;
    let nextSel;
    if ((ios && view.input.lastIOSEnter > Date.now() - 225 && (!inlineChange || addedNodes.some((n) => n.nodeName == "DIV" || n.nodeName == "P")) || !inlineChange && $from.pos < parse.doc.content.size && !$from.sameParent($to) && (nextSel = Selection.findFrom(parse.doc.resolve($from.pos + 1), 1, true)) && nextSel.head == $to.pos) && view.someProp("handleKeyDown", (f) => f(view, keyEvent(13, "Enter")))) {
      view.input.lastIOSEnter = 0;
      return;
    }
    if (view.state.selection.anchor > change.start && looksLikeBackspace(doc2, change.start, change.endA, $from, $to) && view.someProp("handleKeyDown", (f) => f(view, keyEvent(8, "Backspace")))) {
      if (android && chrome)
        view.domObserver.suppressSelectionUpdates();
      return;
    }
    if (chrome && android && change.endB == change.start)
      view.input.lastAndroidDelete = Date.now();
    if (android && !inlineChange && $from.start() != $to.start() && $to.parentOffset == 0 && $from.depth == $to.depth && parse.sel && parse.sel.anchor == parse.sel.head && parse.sel.head == change.endA) {
      change.endB -= 2;
      $to = parse.doc.resolveNoCache(change.endB - parse.from);
      setTimeout(() => {
        view.someProp("handleKeyDown", function(f) {
          return f(view, keyEvent(13, "Enter"));
        });
      }, 20);
    }
    let chFrom = change.start, chTo = change.endA;
    let tr2, storedMarks, markChange;
    if (inlineChange) {
      if ($from.pos == $to.pos) {
        if (ie$1 && ie_version <= 11 && $from.parentOffset == 0) {
          view.domObserver.suppressSelectionUpdates();
          setTimeout(() => selectionToDOM(view), 20);
        }
        tr2 = view.state.tr.delete(chFrom, chTo);
        storedMarks = doc2.resolve(change.start).marksAcross(doc2.resolve(change.endA));
      } else if (
        // Adding or removing a mark
        change.endA == change.endB && (markChange = isMarkChange($from.parent.content.cut($from.parentOffset, $to.parentOffset), $fromA.parent.content.cut($fromA.parentOffset, change.endA - $fromA.start())))
      ) {
        tr2 = view.state.tr;
        if (markChange.type == "add")
          tr2.addMark(chFrom, chTo, markChange.mark);
        else
          tr2.removeMark(chFrom, chTo, markChange.mark);
      } else if ($from.parent.child($from.index()).isText && $from.index() == $to.index() - ($to.textOffset ? 0 : 1)) {
        let text = $from.parent.textBetween($from.parentOffset, $to.parentOffset);
        if (view.someProp("handleTextInput", (f) => f(view, chFrom, chTo, text)))
          return;
        tr2 = view.state.tr.insertText(text, chFrom, chTo);
      }
    }
    if (!tr2)
      tr2 = view.state.tr.replace(chFrom, chTo, parse.doc.slice(change.start - parse.from, change.endB - parse.from));
    if (parse.sel) {
      let sel2 = resolveSelection(view, tr2.doc, parse.sel);
      if (sel2 && !(chrome && android && view.composing && sel2.empty && (change.start != change.endB || view.input.lastAndroidDelete < Date.now() - 100) && (sel2.head == chFrom || sel2.head == tr2.mapping.map(chTo) - 1) || ie$1 && sel2.empty && sel2.head == chFrom))
        tr2.setSelection(sel2);
    }
    if (storedMarks)
      tr2.ensureMarks(storedMarks);
    if (compositionID)
      tr2.setMeta("composition", compositionID);
    view.dispatch(tr2.scrollIntoView());
  }
  function resolveSelection(view, doc2, parsedSel) {
    if (Math.max(parsedSel.anchor, parsedSel.head) > doc2.content.size)
      return null;
    return selectionBetween(view, doc2.resolve(parsedSel.anchor), doc2.resolve(parsedSel.head));
  }
  function isMarkChange(cur, prev) {
    let curMarks = cur.firstChild.marks, prevMarks = prev.firstChild.marks;
    let added = curMarks, removed = prevMarks, type, mark, update;
    for (let i2 = 0; i2 < prevMarks.length; i2++)
      added = prevMarks[i2].removeFromSet(added);
    for (let i2 = 0; i2 < curMarks.length; i2++)
      removed = curMarks[i2].removeFromSet(removed);
    if (added.length == 1 && removed.length == 0) {
      mark = added[0];
      type = "add";
      update = (node) => node.mark(mark.addToSet(node.marks));
    } else if (added.length == 0 && removed.length == 1) {
      mark = removed[0];
      type = "remove";
      update = (node) => node.mark(mark.removeFromSet(node.marks));
    } else {
      return null;
    }
    let updated = [];
    for (let i2 = 0; i2 < prev.childCount; i2++)
      updated.push(update(prev.child(i2)));
    if (Fragment.from(updated).eq(cur))
      return { mark, type };
  }
  function looksLikeBackspace(old, start, end, $newStart, $newEnd) {
    if (
      // The content must have shrunk
      end - start <= $newEnd.pos - $newStart.pos || // newEnd must point directly at or after the end of the block that newStart points into
      skipClosingAndOpening($newStart, true, false) < $newEnd.pos
    )
      return false;
    let $start = old.resolve(start);
    if (!$newStart.parent.isTextblock) {
      let after = $start.nodeAfter;
      return after != null && end == start + after.nodeSize;
    }
    if ($start.parentOffset < $start.parent.content.size || !$start.parent.isTextblock)
      return false;
    let $next = old.resolve(skipClosingAndOpening($start, true, true));
    if (!$next.parent.isTextblock || $next.pos > end || skipClosingAndOpening($next, true, false) < end)
      return false;
    return $newStart.parent.content.cut($newStart.parentOffset).eq($next.parent.content);
  }
  function skipClosingAndOpening($pos, fromEnd, mayOpen) {
    let depth = $pos.depth, end = fromEnd ? $pos.end() : $pos.pos;
    while (depth > 0 && (fromEnd || $pos.indexAfter(depth) == $pos.node(depth).childCount)) {
      depth--;
      end++;
      fromEnd = false;
    }
    if (mayOpen) {
      let next = $pos.node(depth).maybeChild($pos.indexAfter(depth));
      while (next && !next.isLeaf) {
        next = next.firstChild;
        end++;
      }
    }
    return end;
  }
  function findDiff(a2, b2, pos, preferredPos, preferredSide) {
    let start = a2.findDiffStart(b2, pos);
    if (start == null)
      return null;
    let { a: endA, b: endB } = a2.findDiffEnd(b2, pos + a2.size, pos + b2.size);
    if (preferredSide == "end") {
      let adjust = Math.max(0, start - Math.min(endA, endB));
      preferredPos -= endA + adjust - start;
    }
    if (endA < start && a2.size < b2.size) {
      let move = preferredPos <= start && preferredPos >= endA ? start - preferredPos : 0;
      start -= move;
      if (start && start < b2.size && isSurrogatePair(b2.textBetween(start - 1, start + 1)))
        start += move ? 1 : -1;
      endB = start + (endB - endA);
      endA = start;
    } else if (endB < start) {
      let move = preferredPos <= start && preferredPos >= endB ? start - preferredPos : 0;
      start -= move;
      if (start && start < a2.size && isSurrogatePair(a2.textBetween(start - 1, start + 1)))
        start += move ? 1 : -1;
      endA = start + (endA - endB);
      endB = start;
    }
    return { start, endA, endB };
  }
  function isSurrogatePair(str) {
    if (str.length != 2)
      return false;
    let a2 = str.charCodeAt(0), b2 = str.charCodeAt(1);
    return a2 >= 56320 && a2 <= 57343 && b2 >= 55296 && b2 <= 56319;
  }
  class EditorView {
    /**
    Create a view. `place` may be a DOM node that the editor should
    be appended to, a function that will place it into the document,
    or an object whose `mount` property holds the node to use as the
    document container. If it is `null`, the editor will not be
    added to the document.
    */
    constructor(place, props) {
      this._root = null;
      this.focused = false;
      this.trackWrites = null;
      this.mounted = false;
      this.markCursor = null;
      this.cursorWrapper = null;
      this.lastSelectedViewDesc = void 0;
      this.input = new InputState();
      this.prevDirectPlugins = [];
      this.pluginViews = [];
      this.requiresGeckoHackNode = false;
      this.dragging = null;
      this._props = props;
      this.state = props.state;
      this.directPlugins = props.plugins || [];
      this.directPlugins.forEach(checkStateComponent);
      this.dispatch = this.dispatch.bind(this);
      this.dom = place && place.mount || document.createElement("div");
      if (place) {
        if (place.appendChild)
          place.appendChild(this.dom);
        else if (typeof place == "function")
          place(this.dom);
        else if (place.mount)
          this.mounted = true;
      }
      this.editable = getEditable(this);
      updateCursorWrapper(this);
      this.nodeViews = buildNodeViews(this);
      this.docView = docViewDesc(this.state.doc, computeDocDeco(this), viewDecorations(this), this.dom, this);
      this.domObserver = new DOMObserver(this, (from, to, typeOver, added) => readDOMChange(this, from, to, typeOver, added));
      this.domObserver.start();
      initInput(this);
      this.updatePluginViews();
    }
    /**
    Holds `true` when a
    [composition](https://w3c.github.io/uievents/#events-compositionevents)
    is active.
    */
    get composing() {
      return this.input.composing;
    }
    /**
    The view's current [props](https://prosemirror.net/docs/ref/#view.EditorProps).
    */
    get props() {
      if (this._props.state != this.state) {
        let prev = this._props;
        this._props = {};
        for (let name in prev)
          this._props[name] = prev[name];
        this._props.state = this.state;
      }
      return this._props;
    }
    /**
    Update the view's props. Will immediately cause an update to
    the DOM.
    */
    update(props) {
      if (props.handleDOMEvents != this._props.handleDOMEvents)
        ensureListeners(this);
      let prevProps = this._props;
      this._props = props;
      if (props.plugins) {
        props.plugins.forEach(checkStateComponent);
        this.directPlugins = props.plugins;
      }
      this.updateStateInner(props.state, prevProps);
    }
    /**
    Update the view by updating existing props object with the object
    given as argument. Equivalent to `view.update(Object.assign({},
    view.props, props))`.
    */
    setProps(props) {
      let updated = {};
      for (let name in this._props)
        updated[name] = this._props[name];
      updated.state = this.state;
      for (let name in props)
        updated[name] = props[name];
      this.update(updated);
    }
    /**
    Update the editor's `state` prop, without touching any of the
    other props.
    */
    updateState(state) {
      this.updateStateInner(state, this._props);
    }
    updateStateInner(state, prevProps) {
      var _a;
      let prev = this.state, redraw = false, updateSel = false;
      if (state.storedMarks && this.composing) {
        clearComposition(this);
        updateSel = true;
      }
      this.state = state;
      let pluginsChanged = prev.plugins != state.plugins || this._props.plugins != prevProps.plugins;
      if (pluginsChanged || this._props.plugins != prevProps.plugins || this._props.nodeViews != prevProps.nodeViews) {
        let nodeViews = buildNodeViews(this);
        if (changedNodeViews(nodeViews, this.nodeViews)) {
          this.nodeViews = nodeViews;
          redraw = true;
        }
      }
      if (pluginsChanged || prevProps.handleDOMEvents != this._props.handleDOMEvents) {
        ensureListeners(this);
      }
      this.editable = getEditable(this);
      updateCursorWrapper(this);
      let innerDeco = viewDecorations(this), outerDeco = computeDocDeco(this);
      let scroll = prev.plugins != state.plugins && !prev.doc.eq(state.doc) ? "reset" : state.scrollToSelection > prev.scrollToSelection ? "to selection" : "preserve";
      let updateDoc = redraw || !this.docView.matchesNode(state.doc, outerDeco, innerDeco);
      if (updateDoc || !state.selection.eq(prev.selection))
        updateSel = true;
      let oldScrollPos = scroll == "preserve" && updateSel && this.dom.style.overflowAnchor == null && storeScrollPos(this);
      if (updateSel) {
        this.domObserver.stop();
        let forceSelUpdate = updateDoc && (ie$1 || chrome) && !this.composing && !prev.selection.empty && !state.selection.empty && selectionContextChanged(prev.selection, state.selection);
        if (updateDoc) {
          let chromeKludge = chrome ? this.trackWrites = this.domSelectionRange().focusNode : null;
          if (this.composing)
            this.input.compositionNode = findCompositionNode(this);
          if (redraw || !this.docView.update(state.doc, outerDeco, innerDeco, this)) {
            this.docView.updateOuterDeco(outerDeco);
            this.docView.destroy();
            this.docView = docViewDesc(state.doc, outerDeco, innerDeco, this.dom, this);
          }
          if (chromeKludge && !this.trackWrites)
            forceSelUpdate = true;
        }
        if (forceSelUpdate || !(this.input.mouseDown && this.domObserver.currentSelection.eq(this.domSelectionRange()) && anchorInRightPlace(this))) {
          selectionToDOM(this, forceSelUpdate);
        } else {
          syncNodeSelection(this, state.selection);
          this.domObserver.setCurSelection();
        }
        this.domObserver.start();
      }
      this.updatePluginViews(prev);
      if (((_a = this.dragging) === null || _a === void 0 ? void 0 : _a.node) && !prev.doc.eq(state.doc))
        this.updateDraggedNode(this.dragging, prev);
      if (scroll == "reset") {
        this.dom.scrollTop = 0;
      } else if (scroll == "to selection") {
        this.scrollToSelection();
      } else if (oldScrollPos) {
        resetScrollPos(oldScrollPos);
      }
    }
    /**
    @internal
    */
    scrollToSelection() {
      let startDOM = this.domSelectionRange().focusNode;
      if (this.someProp("handleScrollToSelection", (f) => f(this))) ;
      else if (this.state.selection instanceof NodeSelection) {
        let target = this.docView.domAfterPos(this.state.selection.from);
        if (target.nodeType == 1)
          scrollRectIntoView(this, target.getBoundingClientRect(), startDOM);
      } else {
        scrollRectIntoView(this, this.coordsAtPos(this.state.selection.head, 1), startDOM);
      }
    }
    destroyPluginViews() {
      let view;
      while (view = this.pluginViews.pop())
        if (view.destroy)
          view.destroy();
    }
    updatePluginViews(prevState) {
      if (!prevState || prevState.plugins != this.state.plugins || this.directPlugins != this.prevDirectPlugins) {
        this.prevDirectPlugins = this.directPlugins;
        this.destroyPluginViews();
        for (let i2 = 0; i2 < this.directPlugins.length; i2++) {
          let plugin = this.directPlugins[i2];
          if (plugin.spec.view)
            this.pluginViews.push(plugin.spec.view(this));
        }
        for (let i2 = 0; i2 < this.state.plugins.length; i2++) {
          let plugin = this.state.plugins[i2];
          if (plugin.spec.view)
            this.pluginViews.push(plugin.spec.view(this));
        }
      } else {
        for (let i2 = 0; i2 < this.pluginViews.length; i2++) {
          let pluginView = this.pluginViews[i2];
          if (pluginView.update)
            pluginView.update(this, prevState);
        }
      }
    }
    updateDraggedNode(dragging, prev) {
      let sel = dragging.node, found2 = -1;
      if (this.state.doc.nodeAt(sel.from) == sel.node) {
        found2 = sel.from;
      } else {
        let movedPos = sel.from + (this.state.doc.content.size - prev.doc.content.size);
        let moved = movedPos > 0 && this.state.doc.nodeAt(movedPos);
        if (moved == sel.node)
          found2 = movedPos;
      }
      this.dragging = new Dragging(dragging.slice, dragging.move, found2 < 0 ? void 0 : NodeSelection.create(this.state.doc, found2));
    }
    someProp(propName, f) {
      let prop = this._props && this._props[propName], value;
      if (prop != null && (value = f ? f(prop) : prop))
        return value;
      for (let i2 = 0; i2 < this.directPlugins.length; i2++) {
        let prop2 = this.directPlugins[i2].props[propName];
        if (prop2 != null && (value = f ? f(prop2) : prop2))
          return value;
      }
      let plugins = this.state.plugins;
      if (plugins)
        for (let i2 = 0; i2 < plugins.length; i2++) {
          let prop2 = plugins[i2].props[propName];
          if (prop2 != null && (value = f ? f(prop2) : prop2))
            return value;
        }
    }
    /**
    Query whether the view has focus.
    */
    hasFocus() {
      if (ie$1) {
        let node = this.root.activeElement;
        if (node == this.dom)
          return true;
        if (!node || !this.dom.contains(node))
          return false;
        while (node && this.dom != node && this.dom.contains(node)) {
          if (node.contentEditable == "false")
            return false;
          node = node.parentElement;
        }
        return true;
      }
      return this.root.activeElement == this.dom;
    }
    /**
    Focus the editor.
    */
    focus() {
      this.domObserver.stop();
      if (this.editable)
        focusPreventScroll(this.dom);
      selectionToDOM(this);
      this.domObserver.start();
    }
    /**
    Get the document root in which the editor exists. This will
    usually be the top-level `document`, but might be a [shadow
    DOM](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Shadow_DOM)
    root if the editor is inside one.
    */
    get root() {
      let cached = this._root;
      if (cached == null)
        for (let search = this.dom.parentNode; search; search = search.parentNode) {
          if (search.nodeType == 9 || search.nodeType == 11 && search.host) {
            if (!search.getSelection)
              Object.getPrototypeOf(search).getSelection = () => search.ownerDocument.getSelection();
            return this._root = search;
          }
        }
      return cached || document;
    }
    /**
    When an existing editor view is moved to a new document or
    shadow tree, call this to make it recompute its root.
    */
    updateRoot() {
      this._root = null;
    }
    /**
    Given a pair of viewport coordinates, return the document
    position that corresponds to them. May return null if the given
    coordinates aren't inside of the editor. When an object is
    returned, its `pos` property is the position nearest to the
    coordinates, and its `inside` property holds the position of the
    inner node that the position falls inside of, or -1 if it is at
    the top level, not in any node.
    */
    posAtCoords(coords) {
      return posAtCoords(this, coords);
    }
    /**
    Returns the viewport rectangle at a given document position.
    `left` and `right` will be the same number, as this returns a
    flat cursor-ish rectangle. If the position is between two things
    that aren't directly adjacent, `side` determines which element
    is used. When < 0, the element before the position is used,
    otherwise the element after.
    */
    coordsAtPos(pos, side = 1) {
      return coordsAtPos(this, pos, side);
    }
    /**
    Find the DOM position that corresponds to the given document
    position. When `side` is negative, find the position as close as
    possible to the content before the position. When positive,
    prefer positions close to the content after the position. When
    zero, prefer as shallow a position as possible.
    
    Note that you should **not** mutate the editor's internal DOM,
    only inspect it (and even that is usually not necessary).
    */
    domAtPos(pos, side = 0) {
      return this.docView.domFromPos(pos, side);
    }
    /**
    Find the DOM node that represents the document node after the
    given position. May return `null` when the position doesn't point
    in front of a node or if the node is inside an opaque node view.
    
    This is intended to be able to call things like
    `getBoundingClientRect` on that DOM node. Do **not** mutate the
    editor DOM directly, or add styling this way, since that will be
    immediately overriden by the editor as it redraws the node.
    */
    nodeDOM(pos) {
      let desc = this.docView.descAt(pos);
      return desc ? desc.nodeDOM : null;
    }
    /**
    Find the document position that corresponds to a given DOM
    position. (Whenever possible, it is preferable to inspect the
    document structure directly, rather than poking around in the
    DOM, but sometimes—for example when interpreting an event
    target—you don't have a choice.)
    
    The `bias` parameter can be used to influence which side of a DOM
    node to use when the position is inside a leaf node.
    */
    posAtDOM(node, offset, bias = -1) {
      let pos = this.docView.posFromDOM(node, offset, bias);
      if (pos == null)
        throw new RangeError("DOM position not inside the editor");
      return pos;
    }
    /**
    Find out whether the selection is at the end of a textblock when
    moving in a given direction. When, for example, given `"left"`,
    it will return true if moving left from the current cursor
    position would leave that position's parent textblock. Will apply
    to the view's current state by default, but it is possible to
    pass a different state.
    */
    endOfTextblock(dir, state) {
      return endOfTextblock(this, state || this.state, dir);
    }
    /**
    Run the editor's paste logic with the given HTML string. The
    `event`, if given, will be passed to the
    [`handlePaste`](https://prosemirror.net/docs/ref/#view.EditorProps.handlePaste) hook.
    */
    pasteHTML(html, event) {
      return doPaste(this, "", html, false, event || new ClipboardEvent("paste"));
    }
    /**
    Run the editor's paste logic with the given plain-text input.
    */
    pasteText(text, event) {
      return doPaste(this, text, null, true, event || new ClipboardEvent("paste"));
    }
    /**
    Removes the editor from the DOM and destroys all [node
    views](https://prosemirror.net/docs/ref/#view.NodeView).
    */
    destroy() {
      if (!this.docView)
        return;
      destroyInput(this);
      this.destroyPluginViews();
      if (this.mounted) {
        this.docView.update(this.state.doc, [], viewDecorations(this), this);
        this.dom.textContent = "";
      } else if (this.dom.parentNode) {
        this.dom.parentNode.removeChild(this.dom);
      }
      this.docView.destroy();
      this.docView = null;
      clearReusedRange();
    }
    /**
    This is true when the view has been
    [destroyed](https://prosemirror.net/docs/ref/#view.EditorView.destroy) (and thus should not be
    used anymore).
    */
    get isDestroyed() {
      return this.docView == null;
    }
    /**
    Used for testing.
    */
    dispatchEvent(event) {
      return dispatchEvent(this, event);
    }
    /**
    Dispatch a transaction. Will call
    [`dispatchTransaction`](https://prosemirror.net/docs/ref/#view.DirectEditorProps.dispatchTransaction)
    when given, and otherwise defaults to applying the transaction to
    the current state and calling
    [`updateState`](https://prosemirror.net/docs/ref/#view.EditorView.updateState) with the result.
    This method is bound to the view instance, so that it can be
    easily passed around.
    */
    dispatch(tr2) {
      let dispatchTransaction = this._props.dispatchTransaction;
      if (dispatchTransaction)
        dispatchTransaction.call(this, tr2);
      else
        this.updateState(this.state.apply(tr2));
    }
    /**
    @internal
    */
    domSelectionRange() {
      let sel = this.domSelection();
      if (!sel)
        return { focusNode: null, focusOffset: 0, anchorNode: null, anchorOffset: 0 };
      return safari && this.root.nodeType === 11 && deepActiveElement(this.dom.ownerDocument) == this.dom && safariShadowSelectionRange(this, sel) || sel;
    }
    /**
    @internal
    */
    domSelection() {
      return this.root.getSelection();
    }
  }
  function computeDocDeco(view) {
    let attrs = /* @__PURE__ */ Object.create(null);
    attrs.class = "ProseMirror";
    attrs.contenteditable = String(view.editable);
    view.someProp("attributes", (value) => {
      if (typeof value == "function")
        value = value(view.state);
      if (value)
        for (let attr in value) {
          if (attr == "class")
            attrs.class += " " + value[attr];
          else if (attr == "style")
            attrs.style = (attrs.style ? attrs.style + ";" : "") + value[attr];
          else if (!attrs[attr] && attr != "contenteditable" && attr != "nodeName")
            attrs[attr] = String(value[attr]);
        }
    });
    if (!attrs.translate)
      attrs.translate = "no";
    return [Decoration.node(0, view.state.doc.content.size, attrs)];
  }
  function updateCursorWrapper(view) {
    if (view.markCursor) {
      let dom = document.createElement("img");
      dom.className = "ProseMirror-separator";
      dom.setAttribute("mark-placeholder", "true");
      dom.setAttribute("alt", "");
      view.cursorWrapper = { dom, deco: Decoration.widget(view.state.selection.from, dom, { raw: true, marks: view.markCursor }) };
    } else {
      view.cursorWrapper = null;
    }
  }
  function getEditable(view) {
    return !view.someProp("editable", (value) => value(view.state) === false);
  }
  function selectionContextChanged(sel1, sel2) {
    let depth = Math.min(sel1.$anchor.sharedDepth(sel1.head), sel2.$anchor.sharedDepth(sel2.head));
    return sel1.$anchor.start(depth) != sel2.$anchor.start(depth);
  }
  function buildNodeViews(view) {
    let result = /* @__PURE__ */ Object.create(null);
    function add(obj) {
      for (let prop in obj)
        if (!Object.prototype.hasOwnProperty.call(result, prop))
          result[prop] = obj[prop];
    }
    view.someProp("nodeViews", add);
    view.someProp("markViews", add);
    return result;
  }
  function changedNodeViews(a2, b2) {
    let nA = 0, nB = 0;
    for (let prop in a2) {
      if (a2[prop] != b2[prop])
        return true;
      nA++;
    }
    for (let _ in b2)
      nB++;
    return nA != nB;
  }
  function checkStateComponent(plugin) {
    if (plugin.spec.state || plugin.spec.filterTransaction || plugin.spec.appendTransaction)
      throw new RangeError("Plugins passed directly to the view must not have a state component");
  }
  var base = {
    8: "Backspace",
    9: "Tab",
    10: "Enter",
    12: "NumLock",
    13: "Enter",
    16: "Shift",
    17: "Control",
    18: "Alt",
    20: "CapsLock",
    27: "Escape",
    32: " ",
    33: "PageUp",
    34: "PageDown",
    35: "End",
    36: "Home",
    37: "ArrowLeft",
    38: "ArrowUp",
    39: "ArrowRight",
    40: "ArrowDown",
    44: "PrintScreen",
    45: "Insert",
    46: "Delete",
    59: ";",
    61: "=",
    91: "Meta",
    92: "Meta",
    106: "*",
    107: "+",
    108: ",",
    109: "-",
    110: ".",
    111: "/",
    144: "NumLock",
    145: "ScrollLock",
    160: "Shift",
    161: "Shift",
    162: "Control",
    163: "Control",
    164: "Alt",
    165: "Alt",
    173: "-",
    186: ";",
    187: "=",
    188: ",",
    189: "-",
    190: ".",
    191: "/",
    192: "`",
    219: "[",
    220: "\\",
    221: "]",
    222: "'"
  };
  var shift = {
    48: ")",
    49: "!",
    50: "@",
    51: "#",
    52: "$",
    53: "%",
    54: "^",
    55: "&",
    56: "*",
    57: "(",
    59: ":",
    61: "+",
    173: "_",
    186: ":",
    187: "+",
    188: "<",
    189: "_",
    190: ">",
    191: "?",
    192: "~",
    219: "{",
    220: "|",
    221: "}",
    222: '"'
  };
  var mac$1 = typeof navigator != "undefined" && /Mac/.test(navigator.platform);
  var ie = typeof navigator != "undefined" && /MSIE \d|Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(navigator.userAgent);
  for (var i = 0; i < 10; i++) base[48 + i] = base[96 + i] = String(i);
  for (var i = 1; i <= 24; i++) base[i + 111] = "F" + i;
  for (var i = 65; i <= 90; i++) {
    base[i] = String.fromCharCode(i + 32);
    shift[i] = String.fromCharCode(i);
  }
  for (var code in base) if (!shift.hasOwnProperty(code)) shift[code] = base[code];
  function keyName(event) {
    var ignoreKey = mac$1 && event.metaKey && event.shiftKey && !event.ctrlKey && !event.altKey || ie && event.shiftKey && event.key && event.key.length == 1 || event.key == "Unidentified";
    var name = !ignoreKey && event.key || (event.shiftKey ? shift : base)[event.keyCode] || event.key || "Unidentified";
    if (name == "Esc") name = "Escape";
    if (name == "Del") name = "Delete";
    if (name == "Left") name = "ArrowLeft";
    if (name == "Up") name = "ArrowUp";
    if (name == "Right") name = "ArrowRight";
    if (name == "Down") name = "ArrowDown";
    return name;
  }
  const mac = typeof navigator != "undefined" ? /Mac|iP(hone|[oa]d)/.test(navigator.platform) : false;
  function normalizeKeyName$1(name) {
    let parts = name.split(/-(?!$)/), result = parts[parts.length - 1];
    if (result == "Space")
      result = " ";
    let alt, ctrl, shift2, meta;
    for (let i2 = 0; i2 < parts.length - 1; i2++) {
      let mod = parts[i2];
      if (/^(cmd|meta|m)$/i.test(mod))
        meta = true;
      else if (/^a(lt)?$/i.test(mod))
        alt = true;
      else if (/^(c|ctrl|control)$/i.test(mod))
        ctrl = true;
      else if (/^s(hift)?$/i.test(mod))
        shift2 = true;
      else if (/^mod$/i.test(mod)) {
        if (mac)
          meta = true;
        else
          ctrl = true;
      } else
        throw new Error("Unrecognized modifier name: " + mod);
    }
    if (alt)
      result = "Alt-" + result;
    if (ctrl)
      result = "Ctrl-" + result;
    if (meta)
      result = "Meta-" + result;
    if (shift2)
      result = "Shift-" + result;
    return result;
  }
  function normalize(map) {
    let copy2 = /* @__PURE__ */ Object.create(null);
    for (let prop in map)
      copy2[normalizeKeyName$1(prop)] = map[prop];
    return copy2;
  }
  function modifiers(name, event, shift2 = true) {
    if (event.altKey)
      name = "Alt-" + name;
    if (event.ctrlKey)
      name = "Ctrl-" + name;
    if (event.metaKey)
      name = "Meta-" + name;
    if (shift2 && event.shiftKey)
      name = "Shift-" + name;
    return name;
  }
  function keymap(bindings) {
    return new Plugin({ props: { handleKeyDown: keydownHandler(bindings) } });
  }
  function keydownHandler(bindings) {
    let map = normalize(bindings);
    return function(view, event) {
      let name = keyName(event), baseName, direct = map[modifiers(name, event)];
      if (direct && direct(view.state, view.dispatch, view))
        return true;
      if (name.length == 1 && name != " ") {
        if (event.shiftKey) {
          let noShift = map[modifiers(name, event, false)];
          if (noShift && noShift(view.state, view.dispatch, view))
            return true;
        }
        if ((event.shiftKey || event.altKey || event.metaKey || name.charCodeAt(0) > 127) && (baseName = base[event.keyCode]) && baseName != name) {
          let fromCode = map[modifiers(baseName, event)];
          if (fromCode && fromCode(view.state, view.dispatch, view))
            return true;
        }
      }
      return false;
    };
  }
  const deleteSelection$1 = (state, dispatch) => {
    if (state.selection.empty)
      return false;
    if (dispatch)
      dispatch(state.tr.deleteSelection().scrollIntoView());
    return true;
  };
  function atBlockStart(state, view) {
    let { $cursor } = state.selection;
    if (!$cursor || (view ? !view.endOfTextblock("backward", state) : $cursor.parentOffset > 0))
      return null;
    return $cursor;
  }
  const joinBackward$1 = (state, dispatch, view) => {
    let $cursor = atBlockStart(state, view);
    if (!$cursor)
      return false;
    let $cut = findCutBefore($cursor);
    if (!$cut) {
      let range = $cursor.blockRange(), target = range && liftTarget(range);
      if (target == null)
        return false;
      if (dispatch)
        dispatch(state.tr.lift(range, target).scrollIntoView());
      return true;
    }
    let before = $cut.nodeBefore;
    if (deleteBarrier(state, $cut, dispatch, -1))
      return true;
    if ($cursor.parent.content.size == 0 && (textblockAt(before, "end") || NodeSelection.isSelectable(before))) {
      for (let depth = $cursor.depth; ; depth--) {
        let delStep = replaceStep(state.doc, $cursor.before(depth), $cursor.after(depth), Slice.empty);
        if (delStep && delStep.slice.size < delStep.to - delStep.from) {
          if (dispatch) {
            let tr2 = state.tr.step(delStep);
            tr2.setSelection(textblockAt(before, "end") ? Selection.findFrom(tr2.doc.resolve(tr2.mapping.map($cut.pos, -1)), -1) : NodeSelection.create(tr2.doc, $cut.pos - before.nodeSize));
            dispatch(tr2.scrollIntoView());
          }
          return true;
        }
        if (depth == 1 || $cursor.node(depth - 1).childCount > 1)
          break;
      }
    }
    if (before.isAtom && $cut.depth == $cursor.depth - 1) {
      if (dispatch)
        dispatch(state.tr.delete($cut.pos - before.nodeSize, $cut.pos).scrollIntoView());
      return true;
    }
    return false;
  };
  const joinTextblockBackward$1 = (state, dispatch, view) => {
    let $cursor = atBlockStart(state, view);
    if (!$cursor)
      return false;
    let $cut = findCutBefore($cursor);
    return $cut ? joinTextblocksAround(state, $cut, dispatch) : false;
  };
  const joinTextblockForward$1 = (state, dispatch, view) => {
    let $cursor = atBlockEnd(state, view);
    if (!$cursor)
      return false;
    let $cut = findCutAfter($cursor);
    return $cut ? joinTextblocksAround(state, $cut, dispatch) : false;
  };
  function joinTextblocksAround(state, $cut, dispatch) {
    let before = $cut.nodeBefore, beforeText = before, beforePos = $cut.pos - 1;
    for (; !beforeText.isTextblock; beforePos--) {
      if (beforeText.type.spec.isolating)
        return false;
      let child = beforeText.lastChild;
      if (!child)
        return false;
      beforeText = child;
    }
    let after = $cut.nodeAfter, afterText = after, afterPos = $cut.pos + 1;
    for (; !afterText.isTextblock; afterPos++) {
      if (afterText.type.spec.isolating)
        return false;
      let child = afterText.firstChild;
      if (!child)
        return false;
      afterText = child;
    }
    let step = replaceStep(state.doc, beforePos, afterPos, Slice.empty);
    if (!step || step.from != beforePos || step instanceof ReplaceStep && step.slice.size >= afterPos - beforePos)
      return false;
    if (dispatch) {
      let tr2 = state.tr.step(step);
      tr2.setSelection(TextSelection.create(tr2.doc, beforePos));
      dispatch(tr2.scrollIntoView());
    }
    return true;
  }
  function textblockAt(node, side, only = false) {
    for (let scan = node; scan; scan = side == "start" ? scan.firstChild : scan.lastChild) {
      if (scan.isTextblock)
        return true;
      if (only && scan.childCount != 1)
        return false;
    }
    return false;
  }
  const selectNodeBackward$1 = (state, dispatch, view) => {
    let { $head, empty: empty2 } = state.selection, $cut = $head;
    if (!empty2)
      return false;
    if ($head.parent.isTextblock) {
      if (view ? !view.endOfTextblock("backward", state) : $head.parentOffset > 0)
        return false;
      $cut = findCutBefore($head);
    }
    let node = $cut && $cut.nodeBefore;
    if (!node || !NodeSelection.isSelectable(node))
      return false;
    if (dispatch)
      dispatch(state.tr.setSelection(NodeSelection.create(state.doc, $cut.pos - node.nodeSize)).scrollIntoView());
    return true;
  };
  function findCutBefore($pos) {
    if (!$pos.parent.type.spec.isolating)
      for (let i2 = $pos.depth - 1; i2 >= 0; i2--) {
        if ($pos.index(i2) > 0)
          return $pos.doc.resolve($pos.before(i2 + 1));
        if ($pos.node(i2).type.spec.isolating)
          break;
      }
    return null;
  }
  function atBlockEnd(state, view) {
    let { $cursor } = state.selection;
    if (!$cursor || (view ? !view.endOfTextblock("forward", state) : $cursor.parentOffset < $cursor.parent.content.size))
      return null;
    return $cursor;
  }
  const joinForward$1 = (state, dispatch, view) => {
    let $cursor = atBlockEnd(state, view);
    if (!$cursor)
      return false;
    let $cut = findCutAfter($cursor);
    if (!$cut)
      return false;
    let after = $cut.nodeAfter;
    if (deleteBarrier(state, $cut, dispatch, 1))
      return true;
    if ($cursor.parent.content.size == 0 && (textblockAt(after, "start") || NodeSelection.isSelectable(after))) {
      let delStep = replaceStep(state.doc, $cursor.before(), $cursor.after(), Slice.empty);
      if (delStep && delStep.slice.size < delStep.to - delStep.from) {
        if (dispatch) {
          let tr2 = state.tr.step(delStep);
          tr2.setSelection(textblockAt(after, "start") ? Selection.findFrom(tr2.doc.resolve(tr2.mapping.map($cut.pos)), 1) : NodeSelection.create(tr2.doc, tr2.mapping.map($cut.pos)));
          dispatch(tr2.scrollIntoView());
        }
        return true;
      }
    }
    if (after.isAtom && $cut.depth == $cursor.depth - 1) {
      if (dispatch)
        dispatch(state.tr.delete($cut.pos, $cut.pos + after.nodeSize).scrollIntoView());
      return true;
    }
    return false;
  };
  const selectNodeForward$1 = (state, dispatch, view) => {
    let { $head, empty: empty2 } = state.selection, $cut = $head;
    if (!empty2)
      return false;
    if ($head.parent.isTextblock) {
      if (view ? !view.endOfTextblock("forward", state) : $head.parentOffset < $head.parent.content.size)
        return false;
      $cut = findCutAfter($head);
    }
    let node = $cut && $cut.nodeAfter;
    if (!node || !NodeSelection.isSelectable(node))
      return false;
    if (dispatch)
      dispatch(state.tr.setSelection(NodeSelection.create(state.doc, $cut.pos)).scrollIntoView());
    return true;
  };
  function findCutAfter($pos) {
    if (!$pos.parent.type.spec.isolating)
      for (let i2 = $pos.depth - 1; i2 >= 0; i2--) {
        let parent = $pos.node(i2);
        if ($pos.index(i2) + 1 < parent.childCount)
          return $pos.doc.resolve($pos.after(i2 + 1));
        if (parent.type.spec.isolating)
          break;
      }
    return null;
  }
  const joinUp$1 = (state, dispatch) => {
    let sel = state.selection, nodeSel = sel instanceof NodeSelection, point;
    if (nodeSel) {
      if (sel.node.isTextblock || !canJoin(state.doc, sel.from))
        return false;
      point = sel.from;
    } else {
      point = joinPoint(state.doc, sel.from, -1);
      if (point == null)
        return false;
    }
    if (dispatch) {
      let tr2 = state.tr.join(point);
      if (nodeSel)
        tr2.setSelection(NodeSelection.create(tr2.doc, point - state.doc.resolve(point).nodeBefore.nodeSize));
      dispatch(tr2.scrollIntoView());
    }
    return true;
  };
  const joinDown$1 = (state, dispatch) => {
    let sel = state.selection, point;
    if (sel instanceof NodeSelection) {
      if (sel.node.isTextblock || !canJoin(state.doc, sel.to))
        return false;
      point = sel.to;
    } else {
      point = joinPoint(state.doc, sel.to, 1);
      if (point == null)
        return false;
    }
    if (dispatch)
      dispatch(state.tr.join(point).scrollIntoView());
    return true;
  };
  const lift$1 = (state, dispatch) => {
    let { $from, $to } = state.selection;
    let range = $from.blockRange($to), target = range && liftTarget(range);
    if (target == null)
      return false;
    if (dispatch)
      dispatch(state.tr.lift(range, target).scrollIntoView());
    return true;
  };
  const newlineInCode$1 = (state, dispatch) => {
    let { $head, $anchor } = state.selection;
    if (!$head.parent.type.spec.code || !$head.sameParent($anchor))
      return false;
    if (dispatch)
      dispatch(state.tr.insertText("\n").scrollIntoView());
    return true;
  };
  function defaultBlockAt$1(match) {
    for (let i2 = 0; i2 < match.edgeCount; i2++) {
      let { type } = match.edge(i2);
      if (type.isTextblock && !type.hasRequiredAttrs())
        return type;
    }
    return null;
  }
  const exitCode$1 = (state, dispatch) => {
    let { $head, $anchor } = state.selection;
    if (!$head.parent.type.spec.code || !$head.sameParent($anchor))
      return false;
    let above = $head.node(-1), after = $head.indexAfter(-1), type = defaultBlockAt$1(above.contentMatchAt(after));
    if (!type || !above.canReplaceWith(after, after, type))
      return false;
    if (dispatch) {
      let pos = $head.after(), tr2 = state.tr.replaceWith(pos, pos, type.createAndFill());
      tr2.setSelection(Selection.near(tr2.doc.resolve(pos), 1));
      dispatch(tr2.scrollIntoView());
    }
    return true;
  };
  const createParagraphNear$1 = (state, dispatch) => {
    let sel = state.selection, { $from, $to } = sel;
    if (sel instanceof AllSelection || $from.parent.inlineContent || $to.parent.inlineContent)
      return false;
    let type = defaultBlockAt$1($to.parent.contentMatchAt($to.indexAfter()));
    if (!type || !type.isTextblock)
      return false;
    if (dispatch) {
      let side = (!$from.parentOffset && $to.index() < $to.parent.childCount ? $from : $to).pos;
      let tr2 = state.tr.insert(side, type.createAndFill());
      tr2.setSelection(TextSelection.create(tr2.doc, side + 1));
      dispatch(tr2.scrollIntoView());
    }
    return true;
  };
  const liftEmptyBlock$1 = (state, dispatch) => {
    let { $cursor } = state.selection;
    if (!$cursor || $cursor.parent.content.size)
      return false;
    if ($cursor.depth > 1 && $cursor.after() != $cursor.end(-1)) {
      let before = $cursor.before();
      if (canSplit(state.doc, before)) {
        if (dispatch)
          dispatch(state.tr.split(before).scrollIntoView());
        return true;
      }
    }
    let range = $cursor.blockRange(), target = range && liftTarget(range);
    if (target == null)
      return false;
    if (dispatch)
      dispatch(state.tr.lift(range, target).scrollIntoView());
    return true;
  };
  const selectParentNode$1 = (state, dispatch) => {
    let { $from, to } = state.selection, pos;
    let same = $from.sharedDepth(to);
    if (same == 0)
      return false;
    pos = $from.before(same);
    if (dispatch)
      dispatch(state.tr.setSelection(NodeSelection.create(state.doc, pos)));
    return true;
  };
  function joinMaybeClear(state, $pos, dispatch) {
    let before = $pos.nodeBefore, after = $pos.nodeAfter, index = $pos.index();
    if (!before || !after || !before.type.compatibleContent(after.type))
      return false;
    if (!before.content.size && $pos.parent.canReplace(index - 1, index)) {
      if (dispatch)
        dispatch(state.tr.delete($pos.pos - before.nodeSize, $pos.pos).scrollIntoView());
      return true;
    }
    if (!$pos.parent.canReplace(index, index + 1) || !(after.isTextblock || canJoin(state.doc, $pos.pos)))
      return false;
    if (dispatch)
      dispatch(state.tr.join($pos.pos).scrollIntoView());
    return true;
  }
  function deleteBarrier(state, $cut, dispatch, dir) {
    let before = $cut.nodeBefore, after = $cut.nodeAfter, conn, match;
    let isolated = before.type.spec.isolating || after.type.spec.isolating;
    if (!isolated && joinMaybeClear(state, $cut, dispatch))
      return true;
    let canDelAfter = !isolated && $cut.parent.canReplace($cut.index(), $cut.index() + 1);
    if (canDelAfter && (conn = (match = before.contentMatchAt(before.childCount)).findWrapping(after.type)) && match.matchType(conn[0] || after.type).validEnd) {
      if (dispatch) {
        let end = $cut.pos + after.nodeSize, wrap2 = Fragment.empty;
        for (let i2 = conn.length - 1; i2 >= 0; i2--)
          wrap2 = Fragment.from(conn[i2].create(null, wrap2));
        wrap2 = Fragment.from(before.copy(wrap2));
        let tr2 = state.tr.step(new ReplaceAroundStep($cut.pos - 1, end, $cut.pos, end, new Slice(wrap2, 1, 0), conn.length, true));
        let $joinAt = tr2.doc.resolve(end + 2 * conn.length);
        if ($joinAt.nodeAfter && $joinAt.nodeAfter.type == before.type && canJoin(tr2.doc, $joinAt.pos))
          tr2.join($joinAt.pos);
        dispatch(tr2.scrollIntoView());
      }
      return true;
    }
    let selAfter = after.type.spec.isolating || dir > 0 && isolated ? null : Selection.findFrom($cut, 1);
    let range = selAfter && selAfter.$from.blockRange(selAfter.$to), target = range && liftTarget(range);
    if (target != null && target >= $cut.depth) {
      if (dispatch)
        dispatch(state.tr.lift(range, target).scrollIntoView());
      return true;
    }
    if (canDelAfter && textblockAt(after, "start", true) && textblockAt(before, "end")) {
      let at = before, wrap2 = [];
      for (; ; ) {
        wrap2.push(at);
        if (at.isTextblock)
          break;
        at = at.lastChild;
      }
      let afterText = after, afterDepth = 1;
      for (; !afterText.isTextblock; afterText = afterText.firstChild)
        afterDepth++;
      if (at.canReplace(at.childCount, at.childCount, afterText.content)) {
        if (dispatch) {
          let end = Fragment.empty;
          for (let i2 = wrap2.length - 1; i2 >= 0; i2--)
            end = Fragment.from(wrap2[i2].copy(end));
          let tr2 = state.tr.step(new ReplaceAroundStep($cut.pos - wrap2.length, $cut.pos + after.nodeSize, $cut.pos + afterDepth, $cut.pos + after.nodeSize - afterDepth, new Slice(end, wrap2.length, 0), 0, true));
          dispatch(tr2.scrollIntoView());
        }
        return true;
      }
    }
    return false;
  }
  function selectTextblockSide(side) {
    return function(state, dispatch) {
      let sel = state.selection, $pos = side < 0 ? sel.$from : sel.$to;
      let depth = $pos.depth;
      while ($pos.node(depth).isInline) {
        if (!depth)
          return false;
        depth--;
      }
      if (!$pos.node(depth).isTextblock)
        return false;
      if (dispatch)
        dispatch(state.tr.setSelection(TextSelection.create(state.doc, side < 0 ? $pos.start(depth) : $pos.end(depth))));
      return true;
    };
  }
  const selectTextblockStart$1 = selectTextblockSide(-1);
  const selectTextblockEnd$1 = selectTextblockSide(1);
  function wrapIn$1(nodeType, attrs = null) {
    return function(state, dispatch) {
      let { $from, $to } = state.selection;
      let range = $from.blockRange($to), wrapping = range && findWrapping(range, nodeType, attrs);
      if (!wrapping)
        return false;
      if (dispatch)
        dispatch(state.tr.wrap(range, wrapping).scrollIntoView());
      return true;
    };
  }
  function setBlockType(nodeType, attrs = null) {
    return function(state, dispatch) {
      let applicable = false;
      for (let i2 = 0; i2 < state.selection.ranges.length && !applicable; i2++) {
        let { $from: { pos: from }, $to: { pos: to } } = state.selection.ranges[i2];
        state.doc.nodesBetween(from, to, (node, pos) => {
          if (applicable)
            return false;
          if (!node.isTextblock || node.hasMarkup(nodeType, attrs))
            return;
          if (node.type == nodeType) {
            applicable = true;
          } else {
            let $pos = state.doc.resolve(pos), index = $pos.index();
            applicable = $pos.parent.canReplaceWith(index, index + 1, nodeType);
          }
        });
      }
      if (!applicable)
        return false;
      if (dispatch) {
        let tr2 = state.tr;
        for (let i2 = 0; i2 < state.selection.ranges.length; i2++) {
          let { $from: { pos: from }, $to: { pos: to } } = state.selection.ranges[i2];
          tr2.setBlockType(from, to, nodeType, attrs);
        }
        dispatch(tr2.scrollIntoView());
      }
      return true;
    };
  }
  typeof navigator != "undefined" ? /Mac|iP(hone|[oa]d)/.test(navigator.platform) : typeof os != "undefined" && os.platform ? os.platform() == "darwin" : false;
  function wrapInList$1(listType, attrs = null) {
    return function(state, dispatch) {
      let { $from, $to } = state.selection;
      let range = $from.blockRange($to);
      if (!range)
        return false;
      let tr2 = dispatch ? state.tr : null;
      if (!wrapRangeInList(tr2, range, listType, attrs))
        return false;
      if (dispatch)
        dispatch(tr2.scrollIntoView());
      return true;
    };
  }
  function wrapRangeInList(tr2, range, listType, attrs = null) {
    let doJoin = false, outerRange = range, doc2 = range.$from.doc;
    if (range.depth >= 2 && range.$from.node(range.depth - 1).type.compatibleContent(listType) && range.startIndex == 0) {
      if (range.$from.index(range.depth - 1) == 0)
        return false;
      let $insert = doc2.resolve(range.start - 2);
      outerRange = new NodeRange($insert, $insert, range.depth);
      if (range.endIndex < range.parent.childCount)
        range = new NodeRange(range.$from, doc2.resolve(range.$to.end(range.depth)), range.depth);
      doJoin = true;
    }
    let wrap2 = findWrapping(outerRange, listType, attrs, range);
    if (!wrap2)
      return false;
    if (tr2)
      doWrapInList(tr2, range, wrap2, doJoin, listType);
    return true;
  }
  function doWrapInList(tr2, range, wrappers, joinBefore, listType) {
    let content = Fragment.empty;
    for (let i2 = wrappers.length - 1; i2 >= 0; i2--)
      content = Fragment.from(wrappers[i2].type.create(wrappers[i2].attrs, content));
    tr2.step(new ReplaceAroundStep(range.start - (joinBefore ? 2 : 0), range.end, range.start, range.end, new Slice(content, 0, 0), wrappers.length, true));
    let found2 = 0;
    for (let i2 = 0; i2 < wrappers.length; i2++)
      if (wrappers[i2].type == listType)
        found2 = i2 + 1;
    let splitDepth = wrappers.length - found2;
    let splitPos = range.start + wrappers.length - (joinBefore ? 2 : 0), parent = range.parent;
    for (let i2 = range.startIndex, e = range.endIndex, first2 = true; i2 < e; i2++, first2 = false) {
      if (!first2 && canSplit(tr2.doc, splitPos, splitDepth)) {
        tr2.split(splitPos, splitDepth);
        splitPos += 2 * splitDepth;
      }
      splitPos += parent.child(i2).nodeSize;
    }
    return tr2;
  }
  function liftListItem$1(itemType) {
    return function(state, dispatch) {
      let { $from, $to } = state.selection;
      let range = $from.blockRange($to, (node) => node.childCount > 0 && node.firstChild.type == itemType);
      if (!range)
        return false;
      if (!dispatch)
        return true;
      if ($from.node(range.depth - 1).type == itemType)
        return liftToOuterList(state, dispatch, itemType, range);
      else
        return liftOutOfList(state, dispatch, range);
    };
  }
  function liftToOuterList(state, dispatch, itemType, range) {
    let tr2 = state.tr, end = range.end, endOfList = range.$to.end(range.depth);
    if (end < endOfList) {
      tr2.step(new ReplaceAroundStep(end - 1, endOfList, end, endOfList, new Slice(Fragment.from(itemType.create(null, range.parent.copy())), 1, 0), 1, true));
      range = new NodeRange(tr2.doc.resolve(range.$from.pos), tr2.doc.resolve(endOfList), range.depth);
    }
    const target = liftTarget(range);
    if (target == null)
      return false;
    tr2.lift(range, target);
    let after = tr2.mapping.map(end, -1) - 1;
    if (canJoin(tr2.doc, after))
      tr2.join(after);
    dispatch(tr2.scrollIntoView());
    return true;
  }
  function liftOutOfList(state, dispatch, range) {
    let tr2 = state.tr, list = range.parent;
    for (let pos = range.end, i2 = range.endIndex - 1, e = range.startIndex; i2 > e; i2--) {
      pos -= list.child(i2).nodeSize;
      tr2.delete(pos - 1, pos + 1);
    }
    let $start = tr2.doc.resolve(range.start), item = $start.nodeAfter;
    if (tr2.mapping.map(range.end) != range.start + $start.nodeAfter.nodeSize)
      return false;
    let atStart = range.startIndex == 0, atEnd = range.endIndex == list.childCount;
    let parent = $start.node(-1), indexBefore = $start.index(-1);
    if (!parent.canReplace(indexBefore + (atStart ? 0 : 1), indexBefore + 1, item.content.append(atEnd ? Fragment.empty : Fragment.from(list))))
      return false;
    let start = $start.pos, end = start + item.nodeSize;
    tr2.step(new ReplaceAroundStep(start - (atStart ? 1 : 0), end + (atEnd ? 1 : 0), start + 1, end - 1, new Slice((atStart ? Fragment.empty : Fragment.from(list.copy(Fragment.empty))).append(atEnd ? Fragment.empty : Fragment.from(list.copy(Fragment.empty))), atStart ? 0 : 1, atEnd ? 0 : 1), atStart ? 0 : 1));
    dispatch(tr2.scrollIntoView());
    return true;
  }
  function sinkListItem$1(itemType) {
    return function(state, dispatch) {
      let { $from, $to } = state.selection;
      let range = $from.blockRange($to, (node) => node.childCount > 0 && node.firstChild.type == itemType);
      if (!range)
        return false;
      let startIndex = range.startIndex;
      if (startIndex == 0)
        return false;
      let parent = range.parent, nodeBefore = parent.child(startIndex - 1);
      if (nodeBefore.type != itemType)
        return false;
      if (dispatch) {
        let nestedBefore = nodeBefore.lastChild && nodeBefore.lastChild.type == parent.type;
        let inner = Fragment.from(nestedBefore ? itemType.create() : null);
        let slice = new Slice(Fragment.from(itemType.create(null, Fragment.from(parent.type.create(null, inner)))), nestedBefore ? 3 : 1, 0);
        let before = range.start, after = range.end;
        dispatch(state.tr.step(new ReplaceAroundStep(before - (nestedBefore ? 3 : 1), after, before, after, slice, 1, true)).scrollIntoView());
      }
      return true;
    };
  }
  function createChainableState(config) {
    const { state, transaction } = config;
    let { selection } = transaction;
    let { doc: doc2 } = transaction;
    let { storedMarks } = transaction;
    return {
      ...state,
      apply: state.apply.bind(state),
      applyTransaction: state.applyTransaction.bind(state),
      plugins: state.plugins,
      schema: state.schema,
      reconfigure: state.reconfigure.bind(state),
      toJSON: state.toJSON.bind(state),
      get storedMarks() {
        return storedMarks;
      },
      get selection() {
        return selection;
      },
      get doc() {
        return doc2;
      },
      get tr() {
        selection = transaction.selection;
        doc2 = transaction.doc;
        storedMarks = transaction.storedMarks;
        return transaction;
      }
    };
  }
  class CommandManager {
    constructor(props) {
      this.editor = props.editor;
      this.rawCommands = this.editor.extensionManager.commands;
      this.customState = props.state;
    }
    get hasCustomState() {
      return !!this.customState;
    }
    get state() {
      return this.customState || this.editor.state;
    }
    get commands() {
      const { rawCommands, editor, state } = this;
      const { view } = editor;
      const { tr: tr2 } = state;
      const props = this.buildProps(tr2);
      return Object.fromEntries(Object.entries(rawCommands).map(([name, command2]) => {
        const method = (...args) => {
          const callback = command2(...args)(props);
          if (!tr2.getMeta("preventDispatch") && !this.hasCustomState) {
            view.dispatch(tr2);
          }
          return callback;
        };
        return [name, method];
      }));
    }
    get chain() {
      return () => this.createChain();
    }
    get can() {
      return () => this.createCan();
    }
    createChain(startTr, shouldDispatch = true) {
      const { rawCommands, editor, state } = this;
      const { view } = editor;
      const callbacks = [];
      const hasStartTransaction = !!startTr;
      const tr2 = startTr || state.tr;
      const run2 = () => {
        if (!hasStartTransaction && shouldDispatch && !tr2.getMeta("preventDispatch") && !this.hasCustomState) {
          view.dispatch(tr2);
        }
        return callbacks.every((callback) => callback === true);
      };
      const chain = {
        ...Object.fromEntries(Object.entries(rawCommands).map(([name, command2]) => {
          const chainedCommand = (...args) => {
            const props = this.buildProps(tr2, shouldDispatch);
            const callback = command2(...args)(props);
            callbacks.push(callback);
            return chain;
          };
          return [name, chainedCommand];
        })),
        run: run2
      };
      return chain;
    }
    createCan(startTr) {
      const { rawCommands, state } = this;
      const dispatch = false;
      const tr2 = startTr || state.tr;
      const props = this.buildProps(tr2, dispatch);
      const formattedCommands = Object.fromEntries(Object.entries(rawCommands).map(([name, command2]) => {
        return [name, (...args) => command2(...args)({ ...props, dispatch: void 0 })];
      }));
      return {
        ...formattedCommands,
        chain: () => this.createChain(tr2, dispatch)
      };
    }
    buildProps(tr2, shouldDispatch = true) {
      const { rawCommands, editor, state } = this;
      const { view } = editor;
      const props = {
        tr: tr2,
        editor,
        view,
        state: createChainableState({
          state,
          transaction: tr2
        }),
        dispatch: shouldDispatch ? () => void 0 : void 0,
        chain: () => this.createChain(tr2, shouldDispatch),
        can: () => this.createCan(tr2),
        get commands() {
          return Object.fromEntries(Object.entries(rawCommands).map(([name, command2]) => {
            return [name, (...args) => command2(...args)(props)];
          }));
        }
      };
      return props;
    }
  }
  class EventEmitter {
    constructor() {
      this.callbacks = {};
    }
    on(event, fn) {
      if (!this.callbacks[event]) {
        this.callbacks[event] = [];
      }
      this.callbacks[event].push(fn);
      return this;
    }
    emit(event, ...args) {
      const callbacks = this.callbacks[event];
      if (callbacks) {
        callbacks.forEach((callback) => callback.apply(this, args));
      }
      return this;
    }
    off(event, fn) {
      const callbacks = this.callbacks[event];
      if (callbacks) {
        if (fn) {
          this.callbacks[event] = callbacks.filter((callback) => callback !== fn);
        } else {
          delete this.callbacks[event];
        }
      }
      return this;
    }
    once(event, fn) {
      const onceFn = (...args) => {
        this.off(event, onceFn);
        fn.apply(this, args);
      };
      return this.on(event, onceFn);
    }
    removeAllListeners() {
      this.callbacks = {};
    }
  }
  function getExtensionField(extension, field, context) {
    if (extension.config[field] === void 0 && extension.parent) {
      return getExtensionField(extension.parent, field, context);
    }
    if (typeof extension.config[field] === "function") {
      const value = extension.config[field].bind({
        ...context,
        parent: extension.parent ? getExtensionField(extension.parent, field, context) : null
      });
      return value;
    }
    return extension.config[field];
  }
  function splitExtensions(extensions) {
    const baseExtensions = extensions.filter((extension) => extension.type === "extension");
    const nodeExtensions = extensions.filter((extension) => extension.type === "node");
    const markExtensions = extensions.filter((extension) => extension.type === "mark");
    return {
      baseExtensions,
      nodeExtensions,
      markExtensions
    };
  }
  function getAttributesFromExtensions(extensions) {
    const extensionAttributes = [];
    const { nodeExtensions, markExtensions } = splitExtensions(extensions);
    const nodeAndMarkExtensions = [...nodeExtensions, ...markExtensions];
    const defaultAttribute = {
      default: null,
      rendered: true,
      renderHTML: null,
      parseHTML: null,
      keepOnSplit: true,
      isRequired: false
    };
    extensions.forEach((extension) => {
      const context = {
        name: extension.name,
        options: extension.options,
        storage: extension.storage,
        extensions: nodeAndMarkExtensions
      };
      const addGlobalAttributes = getExtensionField(extension, "addGlobalAttributes", context);
      if (!addGlobalAttributes) {
        return;
      }
      const globalAttributes = addGlobalAttributes();
      globalAttributes.forEach((globalAttribute) => {
        globalAttribute.types.forEach((type) => {
          Object.entries(globalAttribute.attributes).forEach(([name, attribute]) => {
            extensionAttributes.push({
              type,
              name,
              attribute: {
                ...defaultAttribute,
                ...attribute
              }
            });
          });
        });
      });
    });
    nodeAndMarkExtensions.forEach((extension) => {
      const context = {
        name: extension.name,
        options: extension.options,
        storage: extension.storage
      };
      const addAttributes = getExtensionField(extension, "addAttributes", context);
      if (!addAttributes) {
        return;
      }
      const attributes = addAttributes();
      Object.entries(attributes).forEach(([name, attribute]) => {
        const mergedAttr = {
          ...defaultAttribute,
          ...attribute
        };
        if (typeof (mergedAttr === null || mergedAttr === void 0 ? void 0 : mergedAttr.default) === "function") {
          mergedAttr.default = mergedAttr.default();
        }
        if ((mergedAttr === null || mergedAttr === void 0 ? void 0 : mergedAttr.isRequired) && (mergedAttr === null || mergedAttr === void 0 ? void 0 : mergedAttr.default) === void 0) {
          delete mergedAttr.default;
        }
        extensionAttributes.push({
          type: extension.name,
          name,
          attribute: mergedAttr
        });
      });
    });
    return extensionAttributes;
  }
  function getNodeType(nameOrType, schema) {
    if (typeof nameOrType === "string") {
      if (!schema.nodes[nameOrType]) {
        throw Error(`There is no node type named '${nameOrType}'. Maybe you forgot to add the extension?`);
      }
      return schema.nodes[nameOrType];
    }
    return nameOrType;
  }
  function mergeAttributes(...objects) {
    return objects.filter((item) => !!item).reduce((items, item) => {
      const mergedAttributes = { ...items };
      Object.entries(item).forEach(([key, value]) => {
        const exists = mergedAttributes[key];
        if (!exists) {
          mergedAttributes[key] = value;
          return;
        }
        if (key === "class") {
          const valueClasses = value ? value.split(" ") : [];
          const existingClasses = mergedAttributes[key] ? mergedAttributes[key].split(" ") : [];
          const insertClasses = valueClasses.filter((valueClass) => !existingClasses.includes(valueClass));
          mergedAttributes[key] = [...existingClasses, ...insertClasses].join(" ");
        } else if (key === "style") {
          const newStyles = value ? value.split(";").map((style2) => style2.trim()).filter(Boolean) : [];
          const existingStyles = mergedAttributes[key] ? mergedAttributes[key].split(";").map((style2) => style2.trim()).filter(Boolean) : [];
          const styleMap = /* @__PURE__ */ new Map();
          existingStyles.forEach((style2) => {
            const [property, val] = style2.split(":").map((part) => part.trim());
            styleMap.set(property, val);
          });
          newStyles.forEach((style2) => {
            const [property, val] = style2.split(":").map((part) => part.trim());
            styleMap.set(property, val);
          });
          mergedAttributes[key] = Array.from(styleMap.entries()).map(([property, val]) => `${property}: ${val}`).join("; ");
        } else {
          mergedAttributes[key] = value;
        }
      });
      return mergedAttributes;
    }, {});
  }
  function getRenderedAttributes(nodeOrMark, extensionAttributes) {
    return extensionAttributes.filter((attribute) => attribute.type === nodeOrMark.type.name).filter((item) => item.attribute.rendered).map((item) => {
      if (!item.attribute.renderHTML) {
        return {
          [item.name]: nodeOrMark.attrs[item.name]
        };
      }
      return item.attribute.renderHTML(nodeOrMark.attrs) || {};
    }).reduce((attributes, attribute) => mergeAttributes(attributes, attribute), {});
  }
  function isFunction(value) {
    return typeof value === "function";
  }
  function callOrReturn(value, context = void 0, ...props) {
    if (isFunction(value)) {
      if (context) {
        return value.bind(context)(...props);
      }
      return value(...props);
    }
    return value;
  }
  function isEmptyObject(value = {}) {
    return Object.keys(value).length === 0 && value.constructor === Object;
  }
  function fromString(value) {
    if (typeof value !== "string") {
      return value;
    }
    if (value.match(/^[+-]?(?:\d*\.)?\d+$/)) {
      return Number(value);
    }
    if (value === "true") {
      return true;
    }
    if (value === "false") {
      return false;
    }
    return value;
  }
  function injectExtensionAttributesToParseRule(parseRule, extensionAttributes) {
    if ("style" in parseRule) {
      return parseRule;
    }
    return {
      ...parseRule,
      getAttrs: (node) => {
        const oldAttributes = parseRule.getAttrs ? parseRule.getAttrs(node) : parseRule.attrs;
        if (oldAttributes === false) {
          return false;
        }
        const newAttributes = extensionAttributes.reduce((items, item) => {
          const value = item.attribute.parseHTML ? item.attribute.parseHTML(node) : fromString(node.getAttribute(item.name));
          if (value === null || value === void 0) {
            return items;
          }
          return {
            ...items,
            [item.name]: value
          };
        }, {});
        return { ...oldAttributes, ...newAttributes };
      }
    };
  }
  function cleanUpSchemaItem(data) {
    return Object.fromEntries(
      // @ts-ignore
      Object.entries(data).filter(([key, value]) => {
        if (key === "attrs" && isEmptyObject(value)) {
          return false;
        }
        return value !== null && value !== void 0;
      })
    );
  }
  function getSchemaByResolvedExtensions(extensions, editor) {
    var _a;
    const allAttributes = getAttributesFromExtensions(extensions);
    const { nodeExtensions, markExtensions } = splitExtensions(extensions);
    const topNode = (_a = nodeExtensions.find((extension) => getExtensionField(extension, "topNode"))) === null || _a === void 0 ? void 0 : _a.name;
    const nodes = Object.fromEntries(nodeExtensions.map((extension) => {
      const extensionAttributes = allAttributes.filter((attribute) => attribute.type === extension.name);
      const context = {
        name: extension.name,
        options: extension.options,
        storage: extension.storage,
        editor
      };
      const extraNodeFields = extensions.reduce((fields, e) => {
        const extendNodeSchema = getExtensionField(e, "extendNodeSchema", context);
        return {
          ...fields,
          ...extendNodeSchema ? extendNodeSchema(extension) : {}
        };
      }, {});
      const schema = cleanUpSchemaItem({
        ...extraNodeFields,
        content: callOrReturn(getExtensionField(extension, "content", context)),
        marks: callOrReturn(getExtensionField(extension, "marks", context)),
        group: callOrReturn(getExtensionField(extension, "group", context)),
        inline: callOrReturn(getExtensionField(extension, "inline", context)),
        atom: callOrReturn(getExtensionField(extension, "atom", context)),
        selectable: callOrReturn(getExtensionField(extension, "selectable", context)),
        draggable: callOrReturn(getExtensionField(extension, "draggable", context)),
        code: callOrReturn(getExtensionField(extension, "code", context)),
        whitespace: callOrReturn(getExtensionField(extension, "whitespace", context)),
        linebreakReplacement: callOrReturn(getExtensionField(extension, "linebreakReplacement", context)),
        defining: callOrReturn(getExtensionField(extension, "defining", context)),
        isolating: callOrReturn(getExtensionField(extension, "isolating", context)),
        attrs: Object.fromEntries(extensionAttributes.map((extensionAttribute) => {
          var _a2;
          return [extensionAttribute.name, { default: (_a2 = extensionAttribute === null || extensionAttribute === void 0 ? void 0 : extensionAttribute.attribute) === null || _a2 === void 0 ? void 0 : _a2.default }];
        }))
      });
      const parseHTML = callOrReturn(getExtensionField(extension, "parseHTML", context));
      if (parseHTML) {
        schema.parseDOM = parseHTML.map((parseRule) => injectExtensionAttributesToParseRule(parseRule, extensionAttributes));
      }
      const renderHTML = getExtensionField(extension, "renderHTML", context);
      if (renderHTML) {
        schema.toDOM = (node) => renderHTML({
          node,
          HTMLAttributes: getRenderedAttributes(node, extensionAttributes)
        });
      }
      const renderText = getExtensionField(extension, "renderText", context);
      if (renderText) {
        schema.toText = renderText;
      }
      return [extension.name, schema];
    }));
    const marks = Object.fromEntries(markExtensions.map((extension) => {
      const extensionAttributes = allAttributes.filter((attribute) => attribute.type === extension.name);
      const context = {
        name: extension.name,
        options: extension.options,
        storage: extension.storage,
        editor
      };
      const extraMarkFields = extensions.reduce((fields, e) => {
        const extendMarkSchema = getExtensionField(e, "extendMarkSchema", context);
        return {
          ...fields,
          ...extendMarkSchema ? extendMarkSchema(extension) : {}
        };
      }, {});
      const schema = cleanUpSchemaItem({
        ...extraMarkFields,
        inclusive: callOrReturn(getExtensionField(extension, "inclusive", context)),
        excludes: callOrReturn(getExtensionField(extension, "excludes", context)),
        group: callOrReturn(getExtensionField(extension, "group", context)),
        spanning: callOrReturn(getExtensionField(extension, "spanning", context)),
        code: callOrReturn(getExtensionField(extension, "code", context)),
        attrs: Object.fromEntries(extensionAttributes.map((extensionAttribute) => {
          var _a2;
          return [extensionAttribute.name, { default: (_a2 = extensionAttribute === null || extensionAttribute === void 0 ? void 0 : extensionAttribute.attribute) === null || _a2 === void 0 ? void 0 : _a2.default }];
        }))
      });
      const parseHTML = callOrReturn(getExtensionField(extension, "parseHTML", context));
      if (parseHTML) {
        schema.parseDOM = parseHTML.map((parseRule) => injectExtensionAttributesToParseRule(parseRule, extensionAttributes));
      }
      const renderHTML = getExtensionField(extension, "renderHTML", context);
      if (renderHTML) {
        schema.toDOM = (mark) => renderHTML({
          mark,
          HTMLAttributes: getRenderedAttributes(mark, extensionAttributes)
        });
      }
      return [extension.name, schema];
    }));
    return new Schema({
      topNode,
      nodes,
      marks
    });
  }
  function getSchemaTypeByName(name, schema) {
    return schema.nodes[name] || schema.marks[name] || null;
  }
  function isExtensionRulesEnabled(extension, enabled) {
    if (Array.isArray(enabled)) {
      return enabled.some((enabledExtension) => {
        const name = typeof enabledExtension === "string" ? enabledExtension : enabledExtension.name;
        return name === extension.name;
      });
    }
    return enabled;
  }
  function getHTMLFromFragment(fragment, schema) {
    const documentFragment = DOMSerializer.fromSchema(schema).serializeFragment(fragment);
    const temporaryDocument = document.implementation.createHTMLDocument();
    const container = temporaryDocument.createElement("div");
    container.appendChild(documentFragment);
    return container.innerHTML;
  }
  const getTextContentFromNodes = ($from, maxMatch = 500) => {
    let textBefore = "";
    const sliceEndPos = $from.parentOffset;
    $from.parent.nodesBetween(Math.max(0, sliceEndPos - maxMatch), sliceEndPos, (node, pos, parent, index) => {
      var _a, _b;
      const chunk = ((_b = (_a = node.type.spec).toText) === null || _b === void 0 ? void 0 : _b.call(_a, {
        node,
        pos,
        parent,
        index
      })) || node.textContent || "%leaf%";
      textBefore += node.isAtom && !node.isText ? chunk : chunk.slice(0, Math.max(0, sliceEndPos - pos));
    });
    return textBefore;
  };
  function isRegExp(value) {
    return Object.prototype.toString.call(value) === "[object RegExp]";
  }
  class InputRule {
    constructor(config) {
      this.find = config.find;
      this.handler = config.handler;
    }
  }
  const inputRuleMatcherHandler = (text, find2) => {
    if (isRegExp(find2)) {
      return find2.exec(text);
    }
    const inputRuleMatch = find2(text);
    if (!inputRuleMatch) {
      return null;
    }
    const result = [inputRuleMatch.text];
    result.index = inputRuleMatch.index;
    result.input = text;
    result.data = inputRuleMatch.data;
    if (inputRuleMatch.replaceWith) {
      if (!inputRuleMatch.text.includes(inputRuleMatch.replaceWith)) {
        console.warn('[tiptap warn]: "inputRuleMatch.replaceWith" must be part of "inputRuleMatch.text".');
      }
      result.push(inputRuleMatch.replaceWith);
    }
    return result;
  };
  function run$1$1(config) {
    var _a;
    const { editor, from, to, text, rules, plugin } = config;
    const { view } = editor;
    if (view.composing) {
      return false;
    }
    const $from = view.state.doc.resolve(from);
    if (
      // check for code node
      $from.parent.type.spec.code || !!((_a = $from.nodeBefore || $from.nodeAfter) === null || _a === void 0 ? void 0 : _a.marks.find((mark) => mark.type.spec.code))
    ) {
      return false;
    }
    let matched = false;
    const textBefore = getTextContentFromNodes($from) + text;
    rules.forEach((rule) => {
      if (matched) {
        return;
      }
      const match = inputRuleMatcherHandler(textBefore, rule.find);
      if (!match) {
        return;
      }
      const tr2 = view.state.tr;
      const state = createChainableState({
        state: view.state,
        transaction: tr2
      });
      const range = {
        from: from - (match[0].length - text.length),
        to
      };
      const { commands: commands2, chain, can } = new CommandManager({
        editor,
        state
      });
      const handler = rule.handler({
        state,
        range,
        match,
        commands: commands2,
        chain,
        can
      });
      if (handler === null || !tr2.steps.length) {
        return;
      }
      tr2.setMeta(plugin, {
        transform: tr2,
        from,
        to,
        text
      });
      view.dispatch(tr2);
      matched = true;
    });
    return matched;
  }
  function inputRulesPlugin(props) {
    const { editor, rules } = props;
    const plugin = new Plugin({
      state: {
        init() {
          return null;
        },
        apply(tr2, prev, state) {
          const stored = tr2.getMeta(plugin);
          if (stored) {
            return stored;
          }
          const simulatedInputMeta = tr2.getMeta("applyInputRules");
          const isSimulatedInput = !!simulatedInputMeta;
          if (isSimulatedInput) {
            setTimeout(() => {
              let { text } = simulatedInputMeta;
              if (typeof text === "string") {
                text = text;
              } else {
                text = getHTMLFromFragment(Fragment.from(text), state.schema);
              }
              const { from } = simulatedInputMeta;
              const to = from + text.length;
              run$1$1({
                editor,
                from,
                to,
                text,
                rules,
                plugin
              });
            });
          }
          return tr2.selectionSet || tr2.docChanged ? null : prev;
        }
      },
      props: {
        handleTextInput(view, from, to, text) {
          return run$1$1({
            editor,
            from,
            to,
            text,
            rules,
            plugin
          });
        },
        handleDOMEvents: {
          compositionend: (view) => {
            setTimeout(() => {
              const { $cursor } = view.state.selection;
              if ($cursor) {
                run$1$1({
                  editor,
                  from: $cursor.pos,
                  to: $cursor.pos,
                  text: "",
                  rules,
                  plugin
                });
              }
            });
            return false;
          }
        },
        // add support for input rules to trigger on enter
        // this is useful for example for code blocks
        handleKeyDown(view, event) {
          if (event.key !== "Enter") {
            return false;
          }
          const { $cursor } = view.state.selection;
          if ($cursor) {
            return run$1$1({
              editor,
              from: $cursor.pos,
              to: $cursor.pos,
              text: "\n",
              rules,
              plugin
            });
          }
          return false;
        }
      },
      // @ts-ignore
      isInputRules: true
    });
    return plugin;
  }
  function getType(value) {
    return Object.prototype.toString.call(value).slice(8, -1);
  }
  function isPlainObject(value) {
    if (getType(value) !== "Object") {
      return false;
    }
    return value.constructor === Object && Object.getPrototypeOf(value) === Object.prototype;
  }
  function mergeDeep(target, source) {
    const output = { ...target };
    if (isPlainObject(target) && isPlainObject(source)) {
      Object.keys(source).forEach((key) => {
        if (isPlainObject(source[key]) && isPlainObject(target[key])) {
          output[key] = mergeDeep(target[key], source[key]);
        } else {
          output[key] = source[key];
        }
      });
    }
    return output;
  }
  class Mark {
    constructor(config = {}) {
      this.type = "mark";
      this.name = "mark";
      this.parent = null;
      this.child = null;
      this.config = {
        name: this.name,
        defaultOptions: {}
      };
      this.config = {
        ...this.config,
        ...config
      };
      this.name = this.config.name;
      if (config.defaultOptions && Object.keys(config.defaultOptions).length > 0) {
        console.warn(`[tiptap warn]: BREAKING CHANGE: "defaultOptions" is deprecated. Please use "addOptions" instead. Found in extension: "${this.name}".`);
      }
      this.options = this.config.defaultOptions;
      if (this.config.addOptions) {
        this.options = callOrReturn(getExtensionField(this, "addOptions", {
          name: this.name
        }));
      }
      this.storage = callOrReturn(getExtensionField(this, "addStorage", {
        name: this.name,
        options: this.options
      })) || {};
    }
    static create(config = {}) {
      return new Mark(config);
    }
    configure(options = {}) {
      const extension = this.extend({
        ...this.config,
        addOptions: () => {
          return mergeDeep(this.options, options);
        }
      });
      extension.name = this.name;
      extension.parent = this.parent;
      return extension;
    }
    extend(extendedConfig = {}) {
      const extension = new Mark(extendedConfig);
      extension.parent = this;
      this.child = extension;
      extension.name = extendedConfig.name ? extendedConfig.name : extension.parent.name;
      if (extendedConfig.defaultOptions && Object.keys(extendedConfig.defaultOptions).length > 0) {
        console.warn(`[tiptap warn]: BREAKING CHANGE: "defaultOptions" is deprecated. Please use "addOptions" instead. Found in extension: "${extension.name}".`);
      }
      extension.options = callOrReturn(getExtensionField(extension, "addOptions", {
        name: extension.name
      }));
      extension.storage = callOrReturn(getExtensionField(extension, "addStorage", {
        name: extension.name,
        options: extension.options
      }));
      return extension;
    }
    static handleExit({ editor, mark }) {
      const { tr: tr2 } = editor.state;
      const currentPos = editor.state.selection.$from;
      const isAtEnd = currentPos.pos === currentPos.end();
      if (isAtEnd) {
        const currentMarks = currentPos.marks();
        const isInMark = !!currentMarks.find((m) => (m === null || m === void 0 ? void 0 : m.type.name) === mark.name);
        if (!isInMark) {
          return false;
        }
        const removeMark2 = currentMarks.find((m) => (m === null || m === void 0 ? void 0 : m.type.name) === mark.name);
        if (removeMark2) {
          tr2.removeStoredMark(removeMark2);
        }
        tr2.insertText(" ", currentPos.pos);
        editor.view.dispatch(tr2);
        return true;
      }
      return false;
    }
  }
  function isNumber(value) {
    return typeof value === "number";
  }
  class PasteRule {
    constructor(config) {
      this.find = config.find;
      this.handler = config.handler;
    }
  }
  const pasteRuleMatcherHandler = (text, find2, event) => {
    if (isRegExp(find2)) {
      return [...text.matchAll(find2)];
    }
    const matches2 = find2(text, event);
    if (!matches2) {
      return [];
    }
    return matches2.map((pasteRuleMatch) => {
      const result = [pasteRuleMatch.text];
      result.index = pasteRuleMatch.index;
      result.input = text;
      result.data = pasteRuleMatch.data;
      if (pasteRuleMatch.replaceWith) {
        if (!pasteRuleMatch.text.includes(pasteRuleMatch.replaceWith)) {
          console.warn('[tiptap warn]: "pasteRuleMatch.replaceWith" must be part of "pasteRuleMatch.text".');
        }
        result.push(pasteRuleMatch.replaceWith);
      }
      return result;
    });
  };
  function run$2(config) {
    const { editor, state, from, to, rule, pasteEvent, dropEvent } = config;
    const { commands: commands2, chain, can } = new CommandManager({
      editor,
      state
    });
    const handlers2 = [];
    state.doc.nodesBetween(from, to, (node, pos) => {
      if (!node.isTextblock || node.type.spec.code) {
        return;
      }
      const resolvedFrom = Math.max(from, pos);
      const resolvedTo = Math.min(to, pos + node.content.size);
      const textToMatch = node.textBetween(resolvedFrom - pos, resolvedTo - pos, void 0, "￼");
      const matches2 = pasteRuleMatcherHandler(textToMatch, rule.find, pasteEvent);
      matches2.forEach((match) => {
        if (match.index === void 0) {
          return;
        }
        const start = resolvedFrom + match.index + 1;
        const end = start + match[0].length;
        const range = {
          from: state.tr.mapping.map(start),
          to: state.tr.mapping.map(end)
        };
        const handler = rule.handler({
          state,
          range,
          match,
          commands: commands2,
          chain,
          can,
          pasteEvent,
          dropEvent
        });
        handlers2.push(handler);
      });
    });
    const success = handlers2.every((handler) => handler !== null);
    return success;
  }
  const createClipboardPasteEvent = (text) => {
    var _a;
    const event = new ClipboardEvent("paste", {
      clipboardData: new DataTransfer()
    });
    (_a = event.clipboardData) === null || _a === void 0 ? void 0 : _a.setData("text/html", text);
    return event;
  };
  function pasteRulesPlugin(props) {
    const { editor, rules } = props;
    let dragSourceElement = null;
    let isPastedFromProseMirror = false;
    let isDroppedFromProseMirror = false;
    let pasteEvent = typeof ClipboardEvent !== "undefined" ? new ClipboardEvent("paste") : null;
    let dropEvent;
    try {
      dropEvent = typeof DragEvent !== "undefined" ? new DragEvent("drop") : null;
    } catch (e) {
      dropEvent = null;
    }
    const processEvent = ({ state, from, to, rule, pasteEvt }) => {
      const tr2 = state.tr;
      const chainableState = createChainableState({
        state,
        transaction: tr2
      });
      const handler = run$2({
        editor,
        state: chainableState,
        from: Math.max(from - 1, 0),
        to: to.b - 1,
        rule,
        pasteEvent: pasteEvt,
        dropEvent
      });
      if (!handler || !tr2.steps.length) {
        return;
      }
      try {
        dropEvent = typeof DragEvent !== "undefined" ? new DragEvent("drop") : null;
      } catch (e) {
        dropEvent = null;
      }
      pasteEvent = typeof ClipboardEvent !== "undefined" ? new ClipboardEvent("paste") : null;
      return tr2;
    };
    const plugins = rules.map((rule) => {
      return new Plugin({
        // we register a global drag handler to track the current drag source element
        view(view) {
          const handleDragstart = (event) => {
            var _a;
            dragSourceElement = ((_a = view.dom.parentElement) === null || _a === void 0 ? void 0 : _a.contains(event.target)) ? view.dom.parentElement : null;
          };
          window.addEventListener("dragstart", handleDragstart);
          return {
            destroy() {
              window.removeEventListener("dragstart", handleDragstart);
            }
          };
        },
        props: {
          handleDOMEvents: {
            drop: (view, event) => {
              isDroppedFromProseMirror = dragSourceElement === view.dom.parentElement;
              dropEvent = event;
              return false;
            },
            paste: (_view, event) => {
              var _a;
              const html = (_a = event.clipboardData) === null || _a === void 0 ? void 0 : _a.getData("text/html");
              pasteEvent = event;
              isPastedFromProseMirror = !!(html === null || html === void 0 ? void 0 : html.includes("data-pm-slice"));
              return false;
            }
          }
        },
        appendTransaction: (transactions, oldState, state) => {
          const transaction = transactions[0];
          const isPaste = transaction.getMeta("uiEvent") === "paste" && !isPastedFromProseMirror;
          const isDrop = transaction.getMeta("uiEvent") === "drop" && !isDroppedFromProseMirror;
          const simulatedPasteMeta = transaction.getMeta("applyPasteRules");
          const isSimulatedPaste = !!simulatedPasteMeta;
          if (!isPaste && !isDrop && !isSimulatedPaste) {
            return;
          }
          if (isSimulatedPaste) {
            let { text } = simulatedPasteMeta;
            if (typeof text === "string") {
              text = text;
            } else {
              text = getHTMLFromFragment(Fragment.from(text), state.schema);
            }
            const { from: from2 } = simulatedPasteMeta;
            const to2 = from2 + text.length;
            const pasteEvt = createClipboardPasteEvent(text);
            return processEvent({
              rule,
              state,
              from: from2,
              to: { b: to2 },
              pasteEvt
            });
          }
          const from = oldState.doc.content.findDiffStart(state.doc.content);
          const to = oldState.doc.content.findDiffEnd(state.doc.content);
          if (!isNumber(from) || !to || from === to.b) {
            return;
          }
          return processEvent({
            rule,
            state,
            from,
            to,
            pasteEvt: pasteEvent
          });
        }
      });
    });
    return plugins;
  }
  function findDuplicates(items) {
    const filtered = items.filter((el, index) => items.indexOf(el) !== index);
    return Array.from(new Set(filtered));
  }
  class ExtensionManager {
    constructor(extensions, editor) {
      this.splittableMarks = [];
      this.editor = editor;
      this.extensions = ExtensionManager.resolve(extensions);
      this.schema = getSchemaByResolvedExtensions(this.extensions, editor);
      this.setupExtensions();
    }
    /**
     * Returns a flattened and sorted extension list while
     * also checking for duplicated extensions and warns the user.
     * @param extensions An array of Tiptap extensions
     * @returns An flattened and sorted array of Tiptap extensions
     */
    static resolve(extensions) {
      const resolvedExtensions = ExtensionManager.sort(ExtensionManager.flatten(extensions));
      const duplicatedNames = findDuplicates(resolvedExtensions.map((extension) => extension.name));
      if (duplicatedNames.length) {
        console.warn(`[tiptap warn]: Duplicate extension names found: [${duplicatedNames.map((item) => `'${item}'`).join(", ")}]. This can lead to issues.`);
      }
      return resolvedExtensions;
    }
    /**
     * Create a flattened array of extensions by traversing the `addExtensions` field.
     * @param extensions An array of Tiptap extensions
     * @returns A flattened array of Tiptap extensions
     */
    static flatten(extensions) {
      return extensions.map((extension) => {
        const context = {
          name: extension.name,
          options: extension.options,
          storage: extension.storage
        };
        const addExtensions = getExtensionField(extension, "addExtensions", context);
        if (addExtensions) {
          return [extension, ...this.flatten(addExtensions())];
        }
        return extension;
      }).flat(10);
    }
    /**
     * Sort extensions by priority.
     * @param extensions An array of Tiptap extensions
     * @returns A sorted array of Tiptap extensions by priority
     */
    static sort(extensions) {
      const defaultPriority = 100;
      return extensions.sort((a2, b2) => {
        const priorityA = getExtensionField(a2, "priority") || defaultPriority;
        const priorityB = getExtensionField(b2, "priority") || defaultPriority;
        if (priorityA > priorityB) {
          return -1;
        }
        if (priorityA < priorityB) {
          return 1;
        }
        return 0;
      });
    }
    /**
     * Get all commands from the extensions.
     * @returns An object with all commands where the key is the command name and the value is the command function
     */
    get commands() {
      return this.extensions.reduce((commands2, extension) => {
        const context = {
          name: extension.name,
          options: extension.options,
          storage: extension.storage,
          editor: this.editor,
          type: getSchemaTypeByName(extension.name, this.schema)
        };
        const addCommands = getExtensionField(extension, "addCommands", context);
        if (!addCommands) {
          return commands2;
        }
        return {
          ...commands2,
          ...addCommands()
        };
      }, {});
    }
    /**
     * Get all registered Prosemirror plugins from the extensions.
     * @returns An array of Prosemirror plugins
     */
    get plugins() {
      const { editor } = this;
      const extensions = ExtensionManager.sort([...this.extensions].reverse());
      const inputRules = [];
      const pasteRules = [];
      const allPlugins = extensions.map((extension) => {
        const context = {
          name: extension.name,
          options: extension.options,
          storage: extension.storage,
          editor,
          type: getSchemaTypeByName(extension.name, this.schema)
        };
        const plugins = [];
        const addKeyboardShortcuts = getExtensionField(extension, "addKeyboardShortcuts", context);
        let defaultBindings = {};
        if (extension.type === "mark" && getExtensionField(extension, "exitable", context)) {
          defaultBindings.ArrowRight = () => Mark.handleExit({ editor, mark: extension });
        }
        if (addKeyboardShortcuts) {
          const bindings = Object.fromEntries(Object.entries(addKeyboardShortcuts()).map(([shortcut, method]) => {
            return [shortcut, () => method({ editor })];
          }));
          defaultBindings = { ...defaultBindings, ...bindings };
        }
        const keyMapPlugin = keymap(defaultBindings);
        plugins.push(keyMapPlugin);
        const addInputRules = getExtensionField(extension, "addInputRules", context);
        if (isExtensionRulesEnabled(extension, editor.options.enableInputRules) && addInputRules) {
          inputRules.push(...addInputRules());
        }
        const addPasteRules = getExtensionField(extension, "addPasteRules", context);
        if (isExtensionRulesEnabled(extension, editor.options.enablePasteRules) && addPasteRules) {
          pasteRules.push(...addPasteRules());
        }
        const addProseMirrorPlugins = getExtensionField(extension, "addProseMirrorPlugins", context);
        if (addProseMirrorPlugins) {
          const proseMirrorPlugins = addProseMirrorPlugins();
          plugins.push(...proseMirrorPlugins);
        }
        return plugins;
      }).flat();
      return [
        inputRulesPlugin({
          editor,
          rules: inputRules
        }),
        ...pasteRulesPlugin({
          editor,
          rules: pasteRules
        }),
        ...allPlugins
      ];
    }
    /**
     * Get all attributes from the extensions.
     * @returns An array of attributes
     */
    get attributes() {
      return getAttributesFromExtensions(this.extensions);
    }
    /**
     * Get all node views from the extensions.
     * @returns An object with all node views where the key is the node name and the value is the node view function
     */
    get nodeViews() {
      const { editor } = this;
      const { nodeExtensions } = splitExtensions(this.extensions);
      return Object.fromEntries(nodeExtensions.filter((extension) => !!getExtensionField(extension, "addNodeView")).map((extension) => {
        const extensionAttributes = this.attributes.filter((attribute) => attribute.type === extension.name);
        const context = {
          name: extension.name,
          options: extension.options,
          storage: extension.storage,
          editor,
          type: getNodeType(extension.name, this.schema)
        };
        const addNodeView = getExtensionField(extension, "addNodeView", context);
        if (!addNodeView) {
          return [];
        }
        const nodeview = (node, view, getPos, decorations, innerDecorations) => {
          const HTMLAttributes = getRenderedAttributes(node, extensionAttributes);
          return addNodeView()({
            // pass-through
            node,
            view,
            getPos,
            decorations,
            innerDecorations,
            // tiptap-specific
            editor,
            extension,
            HTMLAttributes
          });
        };
        return [extension.name, nodeview];
      }));
    }
    /**
     * Go through all extensions, create extension storages & setup marks
     * & bind editor event listener.
     */
    setupExtensions() {
      this.extensions.forEach((extension) => {
        var _a;
        this.editor.extensionStorage[extension.name] = extension.storage;
        const context = {
          name: extension.name,
          options: extension.options,
          storage: extension.storage,
          editor: this.editor,
          type: getSchemaTypeByName(extension.name, this.schema)
        };
        if (extension.type === "mark") {
          const keepOnSplit = (_a = callOrReturn(getExtensionField(extension, "keepOnSplit", context))) !== null && _a !== void 0 ? _a : true;
          if (keepOnSplit) {
            this.splittableMarks.push(extension.name);
          }
        }
        const onBeforeCreate = getExtensionField(extension, "onBeforeCreate", context);
        const onCreate = getExtensionField(extension, "onCreate", context);
        const onUpdate = getExtensionField(extension, "onUpdate", context);
        const onSelectionUpdate = getExtensionField(extension, "onSelectionUpdate", context);
        const onTransaction = getExtensionField(extension, "onTransaction", context);
        const onFocus = getExtensionField(extension, "onFocus", context);
        const onBlur = getExtensionField(extension, "onBlur", context);
        const onDestroy = getExtensionField(extension, "onDestroy", context);
        if (onBeforeCreate) {
          this.editor.on("beforeCreate", onBeforeCreate);
        }
        if (onCreate) {
          this.editor.on("create", onCreate);
        }
        if (onUpdate) {
          this.editor.on("update", onUpdate);
        }
        if (onSelectionUpdate) {
          this.editor.on("selectionUpdate", onSelectionUpdate);
        }
        if (onTransaction) {
          this.editor.on("transaction", onTransaction);
        }
        if (onFocus) {
          this.editor.on("focus", onFocus);
        }
        if (onBlur) {
          this.editor.on("blur", onBlur);
        }
        if (onDestroy) {
          this.editor.on("destroy", onDestroy);
        }
      });
    }
  }
  class Extension {
    constructor(config = {}) {
      this.type = "extension";
      this.name = "extension";
      this.parent = null;
      this.child = null;
      this.config = {
        name: this.name,
        defaultOptions: {}
      };
      this.config = {
        ...this.config,
        ...config
      };
      this.name = this.config.name;
      if (config.defaultOptions && Object.keys(config.defaultOptions).length > 0) {
        console.warn(`[tiptap warn]: BREAKING CHANGE: "defaultOptions" is deprecated. Please use "addOptions" instead. Found in extension: "${this.name}".`);
      }
      this.options = this.config.defaultOptions;
      if (this.config.addOptions) {
        this.options = callOrReturn(getExtensionField(this, "addOptions", {
          name: this.name
        }));
      }
      this.storage = callOrReturn(getExtensionField(this, "addStorage", {
        name: this.name,
        options: this.options
      })) || {};
    }
    static create(config = {}) {
      return new Extension(config);
    }
    configure(options = {}) {
      const extension = this.extend({
        ...this.config,
        addOptions: () => {
          return mergeDeep(this.options, options);
        }
      });
      extension.name = this.name;
      extension.parent = this.parent;
      return extension;
    }
    extend(extendedConfig = {}) {
      const extension = new Extension({ ...this.config, ...extendedConfig });
      extension.parent = this;
      this.child = extension;
      extension.name = extendedConfig.name ? extendedConfig.name : extension.parent.name;
      if (extendedConfig.defaultOptions && Object.keys(extendedConfig.defaultOptions).length > 0) {
        console.warn(`[tiptap warn]: BREAKING CHANGE: "defaultOptions" is deprecated. Please use "addOptions" instead. Found in extension: "${extension.name}".`);
      }
      extension.options = callOrReturn(getExtensionField(extension, "addOptions", {
        name: extension.name
      }));
      extension.storage = callOrReturn(getExtensionField(extension, "addStorage", {
        name: extension.name,
        options: extension.options
      }));
      return extension;
    }
  }
  function getTextBetween(startNode, range, options) {
    const { from, to } = range;
    const { blockSeparator = "\n\n", textSerializers = {} } = options || {};
    let text = "";
    startNode.nodesBetween(from, to, (node, pos, parent, index) => {
      var _a;
      if (node.isBlock && pos > from) {
        text += blockSeparator;
      }
      const textSerializer = textSerializers === null || textSerializers === void 0 ? void 0 : textSerializers[node.type.name];
      if (textSerializer) {
        if (parent) {
          text += textSerializer({
            node,
            pos,
            parent,
            index,
            range
          });
        }
        return false;
      }
      if (node.isText) {
        text += (_a = node === null || node === void 0 ? void 0 : node.text) === null || _a === void 0 ? void 0 : _a.slice(Math.max(from, pos) - pos, to - pos);
      }
    });
    return text;
  }
  function getTextSerializersFromSchema(schema) {
    return Object.fromEntries(Object.entries(schema.nodes).filter(([, node]) => node.spec.toText).map(([name, node]) => [name, node.spec.toText]));
  }
  const ClipboardTextSerializer = Extension.create({
    name: "clipboardTextSerializer",
    addOptions() {
      return {
        blockSeparator: void 0
      };
    },
    addProseMirrorPlugins() {
      return [
        new Plugin({
          key: new PluginKey("clipboardTextSerializer"),
          props: {
            clipboardTextSerializer: () => {
              const { editor } = this;
              const { state, schema } = editor;
              const { doc: doc2, selection } = state;
              const { ranges } = selection;
              const from = Math.min(...ranges.map((range2) => range2.$from.pos));
              const to = Math.max(...ranges.map((range2) => range2.$to.pos));
              const textSerializers = getTextSerializersFromSchema(schema);
              const range = { from, to };
              return getTextBetween(doc2, range, {
                ...this.options.blockSeparator !== void 0 ? { blockSeparator: this.options.blockSeparator } : {},
                textSerializers
              });
            }
          }
        })
      ];
    }
  });
  const blur = () => ({ editor, view }) => {
    requestAnimationFrame(() => {
      var _a;
      if (!editor.isDestroyed) {
        view.dom.blur();
        (_a = window === null || window === void 0 ? void 0 : window.getSelection()) === null || _a === void 0 ? void 0 : _a.removeAllRanges();
      }
    });
    return true;
  };
  const clearContent = (emitUpdate = false) => ({ commands: commands2 }) => {
    return commands2.setContent("", emitUpdate);
  };
  const clearNodes = () => ({ state, tr: tr2, dispatch }) => {
    const { selection } = tr2;
    const { ranges } = selection;
    if (!dispatch) {
      return true;
    }
    ranges.forEach(({ $from, $to }) => {
      state.doc.nodesBetween($from.pos, $to.pos, (node, pos) => {
        if (node.type.isText) {
          return;
        }
        const { doc: doc2, mapping } = tr2;
        const $mappedFrom = doc2.resolve(mapping.map(pos));
        const $mappedTo = doc2.resolve(mapping.map(pos + node.nodeSize));
        const nodeRange = $mappedFrom.blockRange($mappedTo);
        if (!nodeRange) {
          return;
        }
        const targetLiftDepth = liftTarget(nodeRange);
        if (node.type.isTextblock) {
          const { defaultType } = $mappedFrom.parent.contentMatchAt($mappedFrom.index());
          tr2.setNodeMarkup(nodeRange.start, defaultType);
        }
        if (targetLiftDepth || targetLiftDepth === 0) {
          tr2.lift(nodeRange, targetLiftDepth);
        }
      });
    });
    return true;
  };
  const command = (fn) => (props) => {
    return fn(props);
  };
  const createParagraphNear = () => ({ state, dispatch }) => {
    return createParagraphNear$1(state, dispatch);
  };
  const cut = (originRange, targetPos) => ({ editor, tr: tr2 }) => {
    const { state } = editor;
    const contentSlice = state.doc.slice(originRange.from, originRange.to);
    tr2.deleteRange(originRange.from, originRange.to);
    const newPos = tr2.mapping.map(targetPos);
    tr2.insert(newPos, contentSlice.content);
    tr2.setSelection(new TextSelection(tr2.doc.resolve(newPos - 1)));
    return true;
  };
  const deleteCurrentNode = () => ({ tr: tr2, dispatch }) => {
    const { selection } = tr2;
    const currentNode = selection.$anchor.node();
    if (currentNode.content.size > 0) {
      return false;
    }
    const $pos = tr2.selection.$anchor;
    for (let depth = $pos.depth; depth > 0; depth -= 1) {
      const node = $pos.node(depth);
      if (node.type === currentNode.type) {
        if (dispatch) {
          const from = $pos.before(depth);
          const to = $pos.after(depth);
          tr2.delete(from, to).scrollIntoView();
        }
        return true;
      }
    }
    return false;
  };
  const deleteNode = (typeOrName) => ({ tr: tr2, state, dispatch }) => {
    const type = getNodeType(typeOrName, state.schema);
    const $pos = tr2.selection.$anchor;
    for (let depth = $pos.depth; depth > 0; depth -= 1) {
      const node = $pos.node(depth);
      if (node.type === type) {
        if (dispatch) {
          const from = $pos.before(depth);
          const to = $pos.after(depth);
          tr2.delete(from, to).scrollIntoView();
        }
        return true;
      }
    }
    return false;
  };
  const deleteRange = (range) => ({ tr: tr2, dispatch }) => {
    const { from, to } = range;
    if (dispatch) {
      tr2.delete(from, to);
    }
    return true;
  };
  const deleteSelection = () => ({ state, dispatch }) => {
    return deleteSelection$1(state, dispatch);
  };
  const enter = () => ({ commands: commands2 }) => {
    return commands2.keyboardShortcut("Enter");
  };
  const exitCode = () => ({ state, dispatch }) => {
    return exitCode$1(state, dispatch);
  };
  function objectIncludes(object1, object2, options = { strict: true }) {
    const keys2 = Object.keys(object2);
    if (!keys2.length) {
      return true;
    }
    return keys2.every((key) => {
      if (options.strict) {
        return object2[key] === object1[key];
      }
      if (isRegExp(object2[key])) {
        return object2[key].test(object1[key]);
      }
      return object2[key] === object1[key];
    });
  }
  function findMarkInSet(marks, type, attributes = {}) {
    return marks.find((item) => {
      return item.type === type && objectIncludes(
        // Only check equality for the attributes that are provided
        Object.fromEntries(Object.keys(attributes).map((k) => [k, item.attrs[k]])),
        attributes
      );
    });
  }
  function isMarkInSet(marks, type, attributes = {}) {
    return !!findMarkInSet(marks, type, attributes);
  }
  function getMarkRange($pos, type, attributes) {
    var _a;
    if (!$pos || !type) {
      return;
    }
    let start = $pos.parent.childAfter($pos.parentOffset);
    if (!start.node || !start.node.marks.some((mark2) => mark2.type === type)) {
      start = $pos.parent.childBefore($pos.parentOffset);
    }
    if (!start.node || !start.node.marks.some((mark2) => mark2.type === type)) {
      return;
    }
    attributes = attributes || ((_a = start.node.marks[0]) === null || _a === void 0 ? void 0 : _a.attrs);
    const mark = findMarkInSet([...start.node.marks], type, attributes);
    if (!mark) {
      return;
    }
    let startIndex = start.index;
    let startPos = $pos.start() + start.offset;
    let endIndex = startIndex + 1;
    let endPos = startPos + start.node.nodeSize;
    while (startIndex > 0 && isMarkInSet([...$pos.parent.child(startIndex - 1).marks], type, attributes)) {
      startIndex -= 1;
      startPos -= $pos.parent.child(startIndex).nodeSize;
    }
    while (endIndex < $pos.parent.childCount && isMarkInSet([...$pos.parent.child(endIndex).marks], type, attributes)) {
      endPos += $pos.parent.child(endIndex).nodeSize;
      endIndex += 1;
    }
    return {
      from: startPos,
      to: endPos
    };
  }
  function getMarkType(nameOrType, schema) {
    if (typeof nameOrType === "string") {
      if (!schema.marks[nameOrType]) {
        throw Error(`There is no mark type named '${nameOrType}'. Maybe you forgot to add the extension?`);
      }
      return schema.marks[nameOrType];
    }
    return nameOrType;
  }
  const extendMarkRange = (typeOrName, attributes = {}) => ({ tr: tr2, state, dispatch }) => {
    const type = getMarkType(typeOrName, state.schema);
    const { doc: doc2, selection } = tr2;
    const { $from, from, to } = selection;
    if (dispatch) {
      const range = getMarkRange($from, type, attributes);
      if (range && range.from <= from && range.to >= to) {
        const newSelection = TextSelection.create(doc2, range.from, range.to);
        tr2.setSelection(newSelection);
      }
    }
    return true;
  };
  const first = (commands2) => (props) => {
    const items = typeof commands2 === "function" ? commands2(props) : commands2;
    for (let i2 = 0; i2 < items.length; i2 += 1) {
      if (items[i2](props)) {
        return true;
      }
    }
    return false;
  };
  function isTextSelection(value) {
    return value instanceof TextSelection;
  }
  function minMax(value = 0, min = 0, max = 0) {
    return Math.min(Math.max(value, min), max);
  }
  function resolveFocusPosition(doc2, position = null) {
    if (!position) {
      return null;
    }
    const selectionAtStart = Selection.atStart(doc2);
    const selectionAtEnd = Selection.atEnd(doc2);
    if (position === "start" || position === true) {
      return selectionAtStart;
    }
    if (position === "end") {
      return selectionAtEnd;
    }
    const minPos = selectionAtStart.from;
    const maxPos = selectionAtEnd.to;
    if (position === "all") {
      return TextSelection.create(doc2, minMax(0, minPos, maxPos), minMax(doc2.content.size, minPos, maxPos));
    }
    return TextSelection.create(doc2, minMax(position, minPos, maxPos), minMax(position, minPos, maxPos));
  }
  function isiOS() {
    return [
      "iPad Simulator",
      "iPhone Simulator",
      "iPod Simulator",
      "iPad",
      "iPhone",
      "iPod"
    ].includes(navigator.platform) || navigator.userAgent.includes("Mac") && "ontouchend" in document;
  }
  const focus = (position = null, options = {}) => ({ editor, view, tr: tr2, dispatch }) => {
    options = {
      scrollIntoView: true,
      ...options
    };
    const delayedFocus = () => {
      if (isiOS()) {
        view.dom.focus();
      }
      requestAnimationFrame(() => {
        if (!editor.isDestroyed) {
          view.focus();
          if (options === null || options === void 0 ? void 0 : options.scrollIntoView) {
            editor.commands.scrollIntoView();
          }
        }
      });
    };
    if (view.hasFocus() && position === null || position === false) {
      return true;
    }
    if (dispatch && position === null && !isTextSelection(editor.state.selection)) {
      delayedFocus();
      return true;
    }
    const selection = resolveFocusPosition(tr2.doc, position) || editor.state.selection;
    const isSameSelection = editor.state.selection.eq(selection);
    if (dispatch) {
      if (!isSameSelection) {
        tr2.setSelection(selection);
      }
      if (isSameSelection && tr2.storedMarks) {
        tr2.setStoredMarks(tr2.storedMarks);
      }
      delayedFocus();
    }
    return true;
  };
  const forEach = (items, fn) => (props) => {
    return items.every((item, index) => fn(item, { ...props, index }));
  };
  const insertContent = (value, options) => ({ tr: tr2, commands: commands2 }) => {
    return commands2.insertContentAt({ from: tr2.selection.from, to: tr2.selection.to }, value, options);
  };
  const removeWhitespaces = (node) => {
    const children = node.childNodes;
    for (let i2 = children.length - 1; i2 >= 0; i2 -= 1) {
      const child = children[i2];
      if (child.nodeType === 3 && child.nodeValue && /^(\n\s\s|\n)$/.test(child.nodeValue)) {
        node.removeChild(child);
      } else if (child.nodeType === 1) {
        removeWhitespaces(child);
      }
    }
    return node;
  };
  function elementFromString(value) {
    const wrappedValue = `<body>${value}</body>`;
    const html = new window.DOMParser().parseFromString(wrappedValue, "text/html").body;
    return removeWhitespaces(html);
  }
  function createNodeFromContent(content, schema, options) {
    if (content instanceof Node$1 || content instanceof Fragment) {
      return content;
    }
    options = {
      slice: true,
      parseOptions: {},
      ...options
    };
    const isJSONContent = typeof content === "object" && content !== null;
    const isTextContent = typeof content === "string";
    if (isJSONContent) {
      try {
        const isArrayContent = Array.isArray(content) && content.length > 0;
        if (isArrayContent) {
          return Fragment.fromArray(content.map((item) => schema.nodeFromJSON(item)));
        }
        const node = schema.nodeFromJSON(content);
        if (options.errorOnInvalidContent) {
          node.check();
        }
        return node;
      } catch (error) {
        if (options.errorOnInvalidContent) {
          throw new Error("[tiptap error]: Invalid JSON content", { cause: error });
        }
        console.warn("[tiptap warn]: Invalid content.", "Passed value:", content, "Error:", error);
        return createNodeFromContent("", schema, options);
      }
    }
    if (isTextContent) {
      if (options.errorOnInvalidContent) {
        let hasInvalidContent = false;
        let invalidContent = "";
        const contentCheckSchema = new Schema({
          topNode: schema.spec.topNode,
          marks: schema.spec.marks,
          // Prosemirror's schemas are executed such that: the last to execute, matches last
          // This means that we can add a catch-all node at the end of the schema to catch any content that we don't know how to handle
          nodes: schema.spec.nodes.append({
            __tiptap__private__unknown__catch__all__node: {
              content: "inline*",
              group: "block",
              parseDOM: [
                {
                  tag: "*",
                  getAttrs: (e) => {
                    hasInvalidContent = true;
                    invalidContent = typeof e === "string" ? e : e.outerHTML;
                    return null;
                  }
                }
              ]
            }
          })
        });
        if (options.slice) {
          DOMParser.fromSchema(contentCheckSchema).parseSlice(elementFromString(content), options.parseOptions);
        } else {
          DOMParser.fromSchema(contentCheckSchema).parse(elementFromString(content), options.parseOptions);
        }
        if (options.errorOnInvalidContent && hasInvalidContent) {
          throw new Error("[tiptap error]: Invalid HTML content", { cause: new Error(`Invalid element found: ${invalidContent}`) });
        }
      }
      const parser = DOMParser.fromSchema(schema);
      if (options.slice) {
        return parser.parseSlice(elementFromString(content), options.parseOptions).content;
      }
      return parser.parse(elementFromString(content), options.parseOptions);
    }
    return createNodeFromContent("", schema, options);
  }
  function selectionToInsertionEnd(tr2, startLen, bias) {
    const last = tr2.steps.length - 1;
    if (last < startLen) {
      return;
    }
    const step = tr2.steps[last];
    if (!(step instanceof ReplaceStep || step instanceof ReplaceAroundStep)) {
      return;
    }
    const map = tr2.mapping.maps[last];
    let end = 0;
    map.forEach((_from, _to, _newFrom, newTo) => {
      if (end === 0) {
        end = newTo;
      }
    });
    tr2.setSelection(Selection.near(tr2.doc.resolve(end), bias));
  }
  const isFragment = (nodeOrFragment) => {
    return !("type" in nodeOrFragment);
  };
  const insertContentAt = (position, value, options) => ({ tr: tr2, dispatch, editor }) => {
    var _a;
    if (dispatch) {
      options = {
        parseOptions: editor.options.parseOptions,
        updateSelection: true,
        applyInputRules: false,
        applyPasteRules: false,
        ...options
      };
      let content;
      try {
        content = createNodeFromContent(value, editor.schema, {
          parseOptions: {
            preserveWhitespace: "full",
            ...options.parseOptions
          },
          errorOnInvalidContent: (_a = options.errorOnInvalidContent) !== null && _a !== void 0 ? _a : editor.options.enableContentCheck
        });
      } catch (e) {
        editor.emit("contentError", {
          editor,
          error: e,
          disableCollaboration: () => {
            if (editor.storage.collaboration) {
              editor.storage.collaboration.isDisabled = true;
            }
          }
        });
        return false;
      }
      let { from, to } = typeof position === "number" ? { from: position, to: position } : { from: position.from, to: position.to };
      let isOnlyTextContent = true;
      let isOnlyBlockContent = true;
      const nodes = isFragment(content) ? content : [content];
      nodes.forEach((node) => {
        node.check();
        isOnlyTextContent = isOnlyTextContent ? node.isText && node.marks.length === 0 : false;
        isOnlyBlockContent = isOnlyBlockContent ? node.isBlock : false;
      });
      if (from === to && isOnlyBlockContent) {
        const { parent } = tr2.doc.resolve(from);
        const isEmptyTextBlock = parent.isTextblock && !parent.type.spec.code && !parent.childCount;
        if (isEmptyTextBlock) {
          from -= 1;
          to += 1;
        }
      }
      let newContent;
      if (isOnlyTextContent) {
        if (Array.isArray(value)) {
          newContent = value.map((v2) => v2.text || "").join("");
        } else if (value instanceof Fragment) {
          let text = "";
          value.forEach((node) => {
            if (node.text) {
              text += node.text;
            }
          });
          newContent = text;
        } else if (typeof value === "object" && !!value && !!value.text) {
          newContent = value.text;
        } else {
          newContent = value;
        }
        tr2.insertText(newContent, from, to);
      } else {
        newContent = content;
        tr2.replaceWith(from, to, newContent);
      }
      if (options.updateSelection) {
        selectionToInsertionEnd(tr2, tr2.steps.length - 1, -1);
      }
      if (options.applyInputRules) {
        tr2.setMeta("applyInputRules", { from, text: newContent });
      }
      if (options.applyPasteRules) {
        tr2.setMeta("applyPasteRules", { from, text: newContent });
      }
    }
    return true;
  };
  const joinUp = () => ({ state, dispatch }) => {
    return joinUp$1(state, dispatch);
  };
  const joinDown = () => ({ state, dispatch }) => {
    return joinDown$1(state, dispatch);
  };
  const joinBackward = () => ({ state, dispatch }) => {
    return joinBackward$1(state, dispatch);
  };
  const joinForward = () => ({ state, dispatch }) => {
    return joinForward$1(state, dispatch);
  };
  const joinItemBackward = () => ({ state, dispatch, tr: tr2 }) => {
    try {
      const point = joinPoint(state.doc, state.selection.$from.pos, -1);
      if (point === null || point === void 0) {
        return false;
      }
      tr2.join(point, 2);
      if (dispatch) {
        dispatch(tr2);
      }
      return true;
    } catch (e) {
      return false;
    }
  };
  const joinItemForward = () => ({ state, dispatch, tr: tr2 }) => {
    try {
      const point = joinPoint(state.doc, state.selection.$from.pos, 1);
      if (point === null || point === void 0) {
        return false;
      }
      tr2.join(point, 2);
      if (dispatch) {
        dispatch(tr2);
      }
      return true;
    } catch (e) {
      return false;
    }
  };
  const joinTextblockBackward = () => ({ state, dispatch }) => {
    return joinTextblockBackward$1(state, dispatch);
  };
  const joinTextblockForward = () => ({ state, dispatch }) => {
    return joinTextblockForward$1(state, dispatch);
  };
  function isMacOS() {
    return typeof navigator !== "undefined" ? /Mac/.test(navigator.platform) : false;
  }
  function normalizeKeyName(name) {
    const parts = name.split(/-(?!$)/);
    let result = parts[parts.length - 1];
    if (result === "Space") {
      result = " ";
    }
    let alt;
    let ctrl;
    let shift2;
    let meta;
    for (let i2 = 0; i2 < parts.length - 1; i2 += 1) {
      const mod = parts[i2];
      if (/^(cmd|meta|m)$/i.test(mod)) {
        meta = true;
      } else if (/^a(lt)?$/i.test(mod)) {
        alt = true;
      } else if (/^(c|ctrl|control)$/i.test(mod)) {
        ctrl = true;
      } else if (/^s(hift)?$/i.test(mod)) {
        shift2 = true;
      } else if (/^mod$/i.test(mod)) {
        if (isiOS() || isMacOS()) {
          meta = true;
        } else {
          ctrl = true;
        }
      } else {
        throw new Error(`Unrecognized modifier name: ${mod}`);
      }
    }
    if (alt) {
      result = `Alt-${result}`;
    }
    if (ctrl) {
      result = `Ctrl-${result}`;
    }
    if (meta) {
      result = `Meta-${result}`;
    }
    if (shift2) {
      result = `Shift-${result}`;
    }
    return result;
  }
  const keyboardShortcut = (name) => ({ editor, view, tr: tr2, dispatch }) => {
    const keys2 = normalizeKeyName(name).split(/-(?!$)/);
    const key = keys2.find((item) => !["Alt", "Ctrl", "Meta", "Shift"].includes(item));
    const event = new KeyboardEvent("keydown", {
      key: key === "Space" ? " " : key,
      altKey: keys2.includes("Alt"),
      ctrlKey: keys2.includes("Ctrl"),
      metaKey: keys2.includes("Meta"),
      shiftKey: keys2.includes("Shift"),
      bubbles: true,
      cancelable: true
    });
    const capturedTransaction = editor.captureTransaction(() => {
      view.someProp("handleKeyDown", (f) => f(view, event));
    });
    capturedTransaction === null || capturedTransaction === void 0 ? void 0 : capturedTransaction.steps.forEach((step) => {
      const newStep = step.map(tr2.mapping);
      if (newStep && dispatch) {
        tr2.maybeStep(newStep);
      }
    });
    return true;
  };
  function isNodeActive(state, typeOrName, attributes = {}) {
    const { from, to, empty: empty2 } = state.selection;
    const type = typeOrName ? getNodeType(typeOrName, state.schema) : null;
    const nodeRanges = [];
    state.doc.nodesBetween(from, to, (node, pos) => {
      if (node.isText) {
        return;
      }
      const relativeFrom = Math.max(from, pos);
      const relativeTo = Math.min(to, pos + node.nodeSize);
      nodeRanges.push({
        node,
        from: relativeFrom,
        to: relativeTo
      });
    });
    const selectionRange = to - from;
    const matchedNodeRanges = nodeRanges.filter((nodeRange) => {
      if (!type) {
        return true;
      }
      return type.name === nodeRange.node.type.name;
    }).filter((nodeRange) => objectIncludes(nodeRange.node.attrs, attributes, { strict: false }));
    if (empty2) {
      return !!matchedNodeRanges.length;
    }
    const range = matchedNodeRanges.reduce((sum, nodeRange) => sum + nodeRange.to - nodeRange.from, 0);
    return range >= selectionRange;
  }
  const lift = (typeOrName, attributes = {}) => ({ state, dispatch }) => {
    const type = getNodeType(typeOrName, state.schema);
    const isActive2 = isNodeActive(state, type, attributes);
    if (!isActive2) {
      return false;
    }
    return lift$1(state, dispatch);
  };
  const liftEmptyBlock = () => ({ state, dispatch }) => {
    return liftEmptyBlock$1(state, dispatch);
  };
  const liftListItem = (typeOrName) => ({ state, dispatch }) => {
    const type = getNodeType(typeOrName, state.schema);
    return liftListItem$1(type)(state, dispatch);
  };
  const newlineInCode = () => ({ state, dispatch }) => {
    return newlineInCode$1(state, dispatch);
  };
  function getSchemaTypeNameByName(name, schema) {
    if (schema.nodes[name]) {
      return "node";
    }
    if (schema.marks[name]) {
      return "mark";
    }
    return null;
  }
  function deleteProps(obj, propOrProps) {
    const props = typeof propOrProps === "string" ? [propOrProps] : propOrProps;
    return Object.keys(obj).reduce((newObj, prop) => {
      if (!props.includes(prop)) {
        newObj[prop] = obj[prop];
      }
      return newObj;
    }, {});
  }
  const resetAttributes = (typeOrName, attributes) => ({ tr: tr2, state, dispatch }) => {
    let nodeType = null;
    let markType = null;
    const schemaType = getSchemaTypeNameByName(typeof typeOrName === "string" ? typeOrName : typeOrName.name, state.schema);
    if (!schemaType) {
      return false;
    }
    if (schemaType === "node") {
      nodeType = getNodeType(typeOrName, state.schema);
    }
    if (schemaType === "mark") {
      markType = getMarkType(typeOrName, state.schema);
    }
    if (dispatch) {
      tr2.selection.ranges.forEach((range) => {
        state.doc.nodesBetween(range.$from.pos, range.$to.pos, (node, pos) => {
          if (nodeType && nodeType === node.type) {
            tr2.setNodeMarkup(pos, void 0, deleteProps(node.attrs, attributes));
          }
          if (markType && node.marks.length) {
            node.marks.forEach((mark) => {
              if (markType === mark.type) {
                tr2.addMark(pos, pos + node.nodeSize, markType.create(deleteProps(mark.attrs, attributes)));
              }
            });
          }
        });
      });
    }
    return true;
  };
  const scrollIntoView = () => ({ tr: tr2, dispatch }) => {
    if (dispatch) {
      tr2.scrollIntoView();
    }
    return true;
  };
  const selectAll = () => ({ tr: tr2, commands: commands2 }) => {
    return commands2.setTextSelection({
      from: 0,
      to: tr2.doc.content.size
    });
  };
  const selectNodeBackward = () => ({ state, dispatch }) => {
    return selectNodeBackward$1(state, dispatch);
  };
  const selectNodeForward = () => ({ state, dispatch }) => {
    return selectNodeForward$1(state, dispatch);
  };
  const selectParentNode = () => ({ state, dispatch }) => {
    return selectParentNode$1(state, dispatch);
  };
  const selectTextblockEnd = () => ({ state, dispatch }) => {
    return selectTextblockEnd$1(state, dispatch);
  };
  const selectTextblockStart = () => ({ state, dispatch }) => {
    return selectTextblockStart$1(state, dispatch);
  };
  function createDocument(content, schema, parseOptions = {}, options = {}) {
    return createNodeFromContent(content, schema, {
      slice: false,
      parseOptions,
      errorOnInvalidContent: options.errorOnInvalidContent
    });
  }
  const setContent = (content, emitUpdate = false, parseOptions = {}, options = {}) => ({ editor, tr: tr2, dispatch, commands: commands2 }) => {
    var _a, _b;
    const { doc: doc2 } = tr2;
    if (parseOptions.preserveWhitespace !== "full") {
      const document2 = createDocument(content, editor.schema, parseOptions, {
        errorOnInvalidContent: (_a = options.errorOnInvalidContent) !== null && _a !== void 0 ? _a : editor.options.enableContentCheck
      });
      if (dispatch) {
        tr2.replaceWith(0, doc2.content.size, document2).setMeta("preventUpdate", !emitUpdate);
      }
      return true;
    }
    if (dispatch) {
      tr2.setMeta("preventUpdate", !emitUpdate);
    }
    return commands2.insertContentAt({ from: 0, to: doc2.content.size }, content, {
      parseOptions,
      errorOnInvalidContent: (_b = options.errorOnInvalidContent) !== null && _b !== void 0 ? _b : editor.options.enableContentCheck
    });
  };
  function getMarkAttributes(state, typeOrName) {
    const type = getMarkType(typeOrName, state.schema);
    const { from, to, empty: empty2 } = state.selection;
    const marks = [];
    if (empty2) {
      if (state.storedMarks) {
        marks.push(...state.storedMarks);
      }
      marks.push(...state.selection.$head.marks());
    } else {
      state.doc.nodesBetween(from, to, (node) => {
        marks.push(...node.marks);
      });
    }
    const mark = marks.find((markItem) => markItem.type.name === type.name);
    if (!mark) {
      return {};
    }
    return { ...mark.attrs };
  }
  function combineTransactionSteps(oldDoc, transactions) {
    const transform = new Transform(oldDoc);
    transactions.forEach((transaction) => {
      transaction.steps.forEach((step) => {
        transform.step(step);
      });
    });
    return transform;
  }
  function defaultBlockAt(match) {
    for (let i2 = 0; i2 < match.edgeCount; i2 += 1) {
      const { type } = match.edge(i2);
      if (type.isTextblock && !type.hasRequiredAttrs()) {
        return type;
      }
    }
    return null;
  }
  function findChildrenInRange(node, range, predicate) {
    const nodesWithPos = [];
    node.nodesBetween(range.from, range.to, (child, pos) => {
      if (predicate(child)) {
        nodesWithPos.push({
          node: child,
          pos
        });
      }
    });
    return nodesWithPos;
  }
  function findParentNodeClosestToPos($pos, predicate) {
    for (let i2 = $pos.depth; i2 > 0; i2 -= 1) {
      const node = $pos.node(i2);
      if (predicate(node)) {
        return {
          pos: i2 > 0 ? $pos.before(i2) : 0,
          start: $pos.start(i2),
          depth: i2,
          node
        };
      }
    }
  }
  function findParentNode(predicate) {
    return (selection) => findParentNodeClosestToPos(selection.$from, predicate);
  }
  function getText(node, options) {
    const range = {
      from: 0,
      to: node.content.size
    };
    return getTextBetween(node, range, options);
  }
  function getNodeAttributes(state, typeOrName) {
    const type = getNodeType(typeOrName, state.schema);
    const { from, to } = state.selection;
    const nodes = [];
    state.doc.nodesBetween(from, to, (node2) => {
      nodes.push(node2);
    });
    const node = nodes.reverse().find((nodeItem) => nodeItem.type.name === type.name);
    if (!node) {
      return {};
    }
    return { ...node.attrs };
  }
  function getAttributes(state, typeOrName) {
    const schemaType = getSchemaTypeNameByName(typeof typeOrName === "string" ? typeOrName : typeOrName.name, state.schema);
    if (schemaType === "node") {
      return getNodeAttributes(state, typeOrName);
    }
    if (schemaType === "mark") {
      return getMarkAttributes(state, typeOrName);
    }
    return {};
  }
  function removeDuplicates(array2, by = JSON.stringify) {
    const seen = {};
    return array2.filter((item) => {
      const key = by(item);
      return Object.prototype.hasOwnProperty.call(seen, key) ? false : seen[key] = true;
    });
  }
  function simplifyChangedRanges(changes) {
    const uniqueChanges = removeDuplicates(changes);
    return uniqueChanges.length === 1 ? uniqueChanges : uniqueChanges.filter((change, index) => {
      const rest = uniqueChanges.filter((_, i2) => i2 !== index);
      return !rest.some((otherChange) => {
        return change.oldRange.from >= otherChange.oldRange.from && change.oldRange.to <= otherChange.oldRange.to && change.newRange.from >= otherChange.newRange.from && change.newRange.to <= otherChange.newRange.to;
      });
    });
  }
  function getChangedRanges(transform) {
    const { mapping, steps } = transform;
    const changes = [];
    mapping.maps.forEach((stepMap, index) => {
      const ranges = [];
      if (!stepMap.ranges.length) {
        const { from, to } = steps[index];
        if (from === void 0 || to === void 0) {
          return;
        }
        ranges.push({ from, to });
      } else {
        stepMap.forEach((from, to) => {
          ranges.push({ from, to });
        });
      }
      ranges.forEach(({ from, to }) => {
        const newStart = mapping.slice(index).map(from, -1);
        const newEnd = mapping.slice(index).map(to);
        const oldStart = mapping.invert().map(newStart, -1);
        const oldEnd = mapping.invert().map(newEnd);
        changes.push({
          oldRange: {
            from: oldStart,
            to: oldEnd
          },
          newRange: {
            from: newStart,
            to: newEnd
          }
        });
      });
    });
    return simplifyChangedRanges(changes);
  }
  function getMarksBetween(from, to, doc2) {
    const marks = [];
    if (from === to) {
      doc2.resolve(from).marks().forEach((mark) => {
        const $pos = doc2.resolve(from);
        const range = getMarkRange($pos, mark.type);
        if (!range) {
          return;
        }
        marks.push({
          mark,
          ...range
        });
      });
    } else {
      doc2.nodesBetween(from, to, (node, pos) => {
        if (!node || (node === null || node === void 0 ? void 0 : node.nodeSize) === void 0) {
          return;
        }
        marks.push(...node.marks.map((mark) => ({
          from: pos,
          to: pos + node.nodeSize,
          mark
        })));
      });
    }
    return marks;
  }
  function getSplittedAttributes(extensionAttributes, typeName, attributes) {
    return Object.fromEntries(Object.entries(attributes).filter(([name]) => {
      const extensionAttribute = extensionAttributes.find((item) => {
        return item.type === typeName && item.name === name;
      });
      if (!extensionAttribute) {
        return false;
      }
      return extensionAttribute.attribute.keepOnSplit;
    }));
  }
  function isMarkActive(state, typeOrName, attributes = {}) {
    const { empty: empty2, ranges } = state.selection;
    const type = typeOrName ? getMarkType(typeOrName, state.schema) : null;
    if (empty2) {
      return !!(state.storedMarks || state.selection.$from.marks()).filter((mark) => {
        if (!type) {
          return true;
        }
        return type.name === mark.type.name;
      }).find((mark) => objectIncludes(mark.attrs, attributes, { strict: false }));
    }
    let selectionRange = 0;
    const markRanges = [];
    ranges.forEach(({ $from, $to }) => {
      const from = $from.pos;
      const to = $to.pos;
      state.doc.nodesBetween(from, to, (node, pos) => {
        if (!node.isText && !node.marks.length) {
          return;
        }
        const relativeFrom = Math.max(from, pos);
        const relativeTo = Math.min(to, pos + node.nodeSize);
        const range2 = relativeTo - relativeFrom;
        selectionRange += range2;
        markRanges.push(...node.marks.map((mark) => ({
          mark,
          from: relativeFrom,
          to: relativeTo
        })));
      });
    });
    if (selectionRange === 0) {
      return false;
    }
    const matchedRange = markRanges.filter((markRange) => {
      if (!type) {
        return true;
      }
      return type.name === markRange.mark.type.name;
    }).filter((markRange) => objectIncludes(markRange.mark.attrs, attributes, { strict: false })).reduce((sum, markRange) => sum + markRange.to - markRange.from, 0);
    const excludedRange = markRanges.filter((markRange) => {
      if (!type) {
        return true;
      }
      return markRange.mark.type !== type && markRange.mark.type.excludes(type);
    }).reduce((sum, markRange) => sum + markRange.to - markRange.from, 0);
    const range = matchedRange > 0 ? matchedRange + excludedRange : matchedRange;
    return range >= selectionRange;
  }
  function isActive(state, name, attributes = {}) {
    if (!name) {
      return isNodeActive(state, null, attributes) || isMarkActive(state, null, attributes);
    }
    const schemaType = getSchemaTypeNameByName(name, state.schema);
    if (schemaType === "node") {
      return isNodeActive(state, name, attributes);
    }
    if (schemaType === "mark") {
      return isMarkActive(state, name, attributes);
    }
    return false;
  }
  function isList(name, extensions) {
    const { nodeExtensions } = splitExtensions(extensions);
    const extension = nodeExtensions.find((item) => item.name === name);
    if (!extension) {
      return false;
    }
    const context = {
      name: extension.name,
      options: extension.options,
      storage: extension.storage
    };
    const group = callOrReturn(getExtensionField(extension, "group", context));
    if (typeof group !== "string") {
      return false;
    }
    return group.split(" ").includes("list");
  }
  function isNodeEmpty(node, { checkChildren = true, ignoreWhitespace = false } = {}) {
    var _a;
    if (ignoreWhitespace) {
      if (node.type.name === "hardBreak") {
        return true;
      }
      if (node.isText) {
        return /^\s*$/m.test((_a = node.text) !== null && _a !== void 0 ? _a : "");
      }
    }
    if (node.isText) {
      return !node.text;
    }
    if (node.isAtom || node.isLeaf) {
      return false;
    }
    if (node.content.childCount === 0) {
      return true;
    }
    if (checkChildren) {
      let isContentEmpty = true;
      node.content.forEach((childNode) => {
        if (isContentEmpty === false) {
          return;
        }
        if (!isNodeEmpty(childNode, { ignoreWhitespace, checkChildren })) {
          isContentEmpty = false;
        }
      });
      return isContentEmpty;
    }
    return false;
  }
  function isNodeSelection(value) {
    return value instanceof NodeSelection;
  }
  function canSetMark(state, tr2, newMarkType) {
    var _a;
    const { selection } = tr2;
    let cursor = null;
    if (isTextSelection(selection)) {
      cursor = selection.$cursor;
    }
    if (cursor) {
      const currentMarks = (_a = state.storedMarks) !== null && _a !== void 0 ? _a : cursor.marks();
      return !!newMarkType.isInSet(currentMarks) || !currentMarks.some((mark) => mark.type.excludes(newMarkType));
    }
    const { ranges } = selection;
    return ranges.some(({ $from, $to }) => {
      let someNodeSupportsMark = $from.depth === 0 ? state.doc.inlineContent && state.doc.type.allowsMarkType(newMarkType) : false;
      state.doc.nodesBetween($from.pos, $to.pos, (node, _pos, parent) => {
        if (someNodeSupportsMark) {
          return false;
        }
        if (node.isInline) {
          const parentAllowsMarkType = !parent || parent.type.allowsMarkType(newMarkType);
          const currentMarksAllowMarkType = !!newMarkType.isInSet(node.marks) || !node.marks.some((otherMark) => otherMark.type.excludes(newMarkType));
          someNodeSupportsMark = parentAllowsMarkType && currentMarksAllowMarkType;
        }
        return !someNodeSupportsMark;
      });
      return someNodeSupportsMark;
    });
  }
  const setMark = (typeOrName, attributes = {}) => ({ tr: tr2, state, dispatch }) => {
    const { selection } = tr2;
    const { empty: empty2, ranges } = selection;
    const type = getMarkType(typeOrName, state.schema);
    if (dispatch) {
      if (empty2) {
        const oldAttributes = getMarkAttributes(state, type);
        tr2.addStoredMark(type.create({
          ...oldAttributes,
          ...attributes
        }));
      } else {
        ranges.forEach((range) => {
          const from = range.$from.pos;
          const to = range.$to.pos;
          state.doc.nodesBetween(from, to, (node, pos) => {
            const trimmedFrom = Math.max(pos, from);
            const trimmedTo = Math.min(pos + node.nodeSize, to);
            const someHasMark = node.marks.find((mark) => mark.type === type);
            if (someHasMark) {
              node.marks.forEach((mark) => {
                if (type === mark.type) {
                  tr2.addMark(trimmedFrom, trimmedTo, type.create({
                    ...mark.attrs,
                    ...attributes
                  }));
                }
              });
            } else {
              tr2.addMark(trimmedFrom, trimmedTo, type.create(attributes));
            }
          });
        });
      }
    }
    return canSetMark(state, tr2, type);
  };
  const setMeta = (key, value) => ({ tr: tr2 }) => {
    tr2.setMeta(key, value);
    return true;
  };
  const setNode = (typeOrName, attributes = {}) => ({ state, dispatch, chain }) => {
    const type = getNodeType(typeOrName, state.schema);
    let attributesToCopy;
    if (state.selection.$anchor.sameParent(state.selection.$head)) {
      attributesToCopy = state.selection.$anchor.parent.attrs;
    }
    if (!type.isTextblock) {
      console.warn('[tiptap warn]: Currently "setNode()" only supports text block nodes.');
      return false;
    }
    return chain().command(({ commands: commands2 }) => {
      const canSetBlock = setBlockType(type, { ...attributesToCopy, ...attributes })(state);
      if (canSetBlock) {
        return true;
      }
      return commands2.clearNodes();
    }).command(({ state: updatedState }) => {
      return setBlockType(type, { ...attributesToCopy, ...attributes })(updatedState, dispatch);
    }).run();
  };
  const setNodeSelection = (position) => ({ tr: tr2, dispatch }) => {
    if (dispatch) {
      const { doc: doc2 } = tr2;
      const from = minMax(position, 0, doc2.content.size);
      const selection = NodeSelection.create(doc2, from);
      tr2.setSelection(selection);
    }
    return true;
  };
  const setTextSelection = (position) => ({ tr: tr2, dispatch }) => {
    if (dispatch) {
      const { doc: doc2 } = tr2;
      const { from, to } = typeof position === "number" ? { from: position, to: position } : position;
      const minPos = TextSelection.atStart(doc2).from;
      const maxPos = TextSelection.atEnd(doc2).to;
      const resolvedFrom = minMax(from, minPos, maxPos);
      const resolvedEnd = minMax(to, minPos, maxPos);
      const selection = TextSelection.create(doc2, resolvedFrom, resolvedEnd);
      tr2.setSelection(selection);
    }
    return true;
  };
  const sinkListItem = (typeOrName) => ({ state, dispatch }) => {
    const type = getNodeType(typeOrName, state.schema);
    return sinkListItem$1(type)(state, dispatch);
  };
  function ensureMarks(state, splittableMarks) {
    const marks = state.storedMarks || state.selection.$to.parentOffset && state.selection.$from.marks();
    if (marks) {
      const filteredMarks = marks.filter((mark) => splittableMarks === null || splittableMarks === void 0 ? void 0 : splittableMarks.includes(mark.type.name));
      state.tr.ensureMarks(filteredMarks);
    }
  }
  const splitBlock = ({ keepMarks = true } = {}) => ({ tr: tr2, state, dispatch, editor }) => {
    const { selection, doc: doc2 } = tr2;
    const { $from, $to } = selection;
    const extensionAttributes = editor.extensionManager.attributes;
    const newAttributes = getSplittedAttributes(extensionAttributes, $from.node().type.name, $from.node().attrs);
    if (selection instanceof NodeSelection && selection.node.isBlock) {
      if (!$from.parentOffset || !canSplit(doc2, $from.pos)) {
        return false;
      }
      if (dispatch) {
        if (keepMarks) {
          ensureMarks(state, editor.extensionManager.splittableMarks);
        }
        tr2.split($from.pos).scrollIntoView();
      }
      return true;
    }
    if (!$from.parent.isBlock) {
      return false;
    }
    const atEnd = $to.parentOffset === $to.parent.content.size;
    const deflt = $from.depth === 0 ? void 0 : defaultBlockAt($from.node(-1).contentMatchAt($from.indexAfter(-1)));
    let types = atEnd && deflt ? [
      {
        type: deflt,
        attrs: newAttributes
      }
    ] : void 0;
    let can = canSplit(tr2.doc, tr2.mapping.map($from.pos), 1, types);
    if (!types && !can && canSplit(tr2.doc, tr2.mapping.map($from.pos), 1, deflt ? [{ type: deflt }] : void 0)) {
      can = true;
      types = deflt ? [
        {
          type: deflt,
          attrs: newAttributes
        }
      ] : void 0;
    }
    if (dispatch) {
      if (can) {
        if (selection instanceof TextSelection) {
          tr2.deleteSelection();
        }
        tr2.split(tr2.mapping.map($from.pos), 1, types);
        if (deflt && !atEnd && !$from.parentOffset && $from.parent.type !== deflt) {
          const first2 = tr2.mapping.map($from.before());
          const $first = tr2.doc.resolve(first2);
          if ($from.node(-1).canReplaceWith($first.index(), $first.index() + 1, deflt)) {
            tr2.setNodeMarkup(tr2.mapping.map($from.before()), deflt);
          }
        }
      }
      if (keepMarks) {
        ensureMarks(state, editor.extensionManager.splittableMarks);
      }
      tr2.scrollIntoView();
    }
    return can;
  };
  const splitListItem = (typeOrName, overrideAttrs = {}) => ({ tr: tr2, state, dispatch, editor }) => {
    var _a;
    const type = getNodeType(typeOrName, state.schema);
    const { $from, $to } = state.selection;
    const node = state.selection.node;
    if (node && node.isBlock || $from.depth < 2 || !$from.sameParent($to)) {
      return false;
    }
    const grandParent = $from.node(-1);
    if (grandParent.type !== type) {
      return false;
    }
    const extensionAttributes = editor.extensionManager.attributes;
    if ($from.parent.content.size === 0 && $from.node(-1).childCount === $from.indexAfter(-1)) {
      if ($from.depth === 2 || $from.node(-3).type !== type || $from.index(-2) !== $from.node(-2).childCount - 1) {
        return false;
      }
      if (dispatch) {
        let wrap2 = Fragment.empty;
        const depthBefore = $from.index(-1) ? 1 : $from.index(-2) ? 2 : 3;
        for (let d2 = $from.depth - depthBefore; d2 >= $from.depth - 3; d2 -= 1) {
          wrap2 = Fragment.from($from.node(d2).copy(wrap2));
        }
        const depthAfter = $from.indexAfter(-1) < $from.node(-2).childCount ? 1 : $from.indexAfter(-2) < $from.node(-3).childCount ? 2 : 3;
        const newNextTypeAttributes2 = {
          ...getSplittedAttributes(extensionAttributes, $from.node().type.name, $from.node().attrs),
          ...overrideAttrs
        };
        const nextType2 = ((_a = type.contentMatch.defaultType) === null || _a === void 0 ? void 0 : _a.createAndFill(newNextTypeAttributes2)) || void 0;
        wrap2 = wrap2.append(Fragment.from(type.createAndFill(null, nextType2) || void 0));
        const start = $from.before($from.depth - (depthBefore - 1));
        tr2.replace(start, $from.after(-depthAfter), new Slice(wrap2, 4 - depthBefore, 0));
        let sel = -1;
        tr2.doc.nodesBetween(start, tr2.doc.content.size, (n, pos) => {
          if (sel > -1) {
            return false;
          }
          if (n.isTextblock && n.content.size === 0) {
            sel = pos + 1;
          }
        });
        if (sel > -1) {
          tr2.setSelection(TextSelection.near(tr2.doc.resolve(sel)));
        }
        tr2.scrollIntoView();
      }
      return true;
    }
    const nextType = $to.pos === $from.end() ? grandParent.contentMatchAt(0).defaultType : null;
    const newTypeAttributes = {
      ...getSplittedAttributes(extensionAttributes, grandParent.type.name, grandParent.attrs),
      ...overrideAttrs
    };
    const newNextTypeAttributes = {
      ...getSplittedAttributes(extensionAttributes, $from.node().type.name, $from.node().attrs),
      ...overrideAttrs
    };
    tr2.delete($from.pos, $to.pos);
    const types = nextType ? [
      { type, attrs: newTypeAttributes },
      { type: nextType, attrs: newNextTypeAttributes }
    ] : [{ type, attrs: newTypeAttributes }];
    if (!canSplit(tr2.doc, $from.pos, 2)) {
      return false;
    }
    if (dispatch) {
      const { selection, storedMarks } = state;
      const { splittableMarks } = editor.extensionManager;
      const marks = storedMarks || selection.$to.parentOffset && selection.$from.marks();
      tr2.split($from.pos, 2, types).scrollIntoView();
      if (!marks || !dispatch) {
        return true;
      }
      const filteredMarks = marks.filter((mark) => splittableMarks.includes(mark.type.name));
      tr2.ensureMarks(filteredMarks);
    }
    return true;
  };
  const joinListBackwards = (tr2, listType) => {
    const list = findParentNode((node) => node.type === listType)(tr2.selection);
    if (!list) {
      return true;
    }
    const before = tr2.doc.resolve(Math.max(0, list.pos - 1)).before(list.depth);
    if (before === void 0) {
      return true;
    }
    const nodeBefore = tr2.doc.nodeAt(before);
    const canJoinBackwards = list.node.type === (nodeBefore === null || nodeBefore === void 0 ? void 0 : nodeBefore.type) && canJoin(tr2.doc, list.pos);
    if (!canJoinBackwards) {
      return true;
    }
    tr2.join(list.pos);
    return true;
  };
  const joinListForwards = (tr2, listType) => {
    const list = findParentNode((node) => node.type === listType)(tr2.selection);
    if (!list) {
      return true;
    }
    const after = tr2.doc.resolve(list.start).after(list.depth);
    if (after === void 0) {
      return true;
    }
    const nodeAfter = tr2.doc.nodeAt(after);
    const canJoinForwards = list.node.type === (nodeAfter === null || nodeAfter === void 0 ? void 0 : nodeAfter.type) && canJoin(tr2.doc, after);
    if (!canJoinForwards) {
      return true;
    }
    tr2.join(after);
    return true;
  };
  const toggleList = (listTypeOrName, itemTypeOrName, keepMarks, attributes = {}) => ({ editor, tr: tr2, state, dispatch, chain, commands: commands2, can }) => {
    const { extensions, splittableMarks } = editor.extensionManager;
    const listType = getNodeType(listTypeOrName, state.schema);
    const itemType = getNodeType(itemTypeOrName, state.schema);
    const { selection, storedMarks } = state;
    const { $from, $to } = selection;
    const range = $from.blockRange($to);
    const marks = storedMarks || selection.$to.parentOffset && selection.$from.marks();
    if (!range) {
      return false;
    }
    const parentList = findParentNode((node) => isList(node.type.name, extensions))(selection);
    if (range.depth >= 1 && parentList && range.depth - parentList.depth <= 1) {
      if (parentList.node.type === listType) {
        return commands2.liftListItem(itemType);
      }
      if (isList(parentList.node.type.name, extensions) && listType.validContent(parentList.node.content) && dispatch) {
        return chain().command(() => {
          tr2.setNodeMarkup(parentList.pos, listType);
          return true;
        }).command(() => joinListBackwards(tr2, listType)).command(() => joinListForwards(tr2, listType)).run();
      }
    }
    if (!keepMarks || !marks || !dispatch) {
      return chain().command(() => {
        const canWrapInList = can().wrapInList(listType, attributes);
        if (canWrapInList) {
          return true;
        }
        return commands2.clearNodes();
      }).wrapInList(listType, attributes).command(() => joinListBackwards(tr2, listType)).command(() => joinListForwards(tr2, listType)).run();
    }
    return chain().command(() => {
      const canWrapInList = can().wrapInList(listType, attributes);
      const filteredMarks = marks.filter((mark) => splittableMarks.includes(mark.type.name));
      tr2.ensureMarks(filteredMarks);
      if (canWrapInList) {
        return true;
      }
      return commands2.clearNodes();
    }).wrapInList(listType, attributes).command(() => joinListBackwards(tr2, listType)).command(() => joinListForwards(tr2, listType)).run();
  };
  const toggleMark = (typeOrName, attributes = {}, options = {}) => ({ state, commands: commands2 }) => {
    const { extendEmptyMarkRange = false } = options;
    const type = getMarkType(typeOrName, state.schema);
    const isActive2 = isMarkActive(state, type, attributes);
    if (isActive2) {
      return commands2.unsetMark(type, { extendEmptyMarkRange });
    }
    return commands2.setMark(type, attributes);
  };
  const toggleNode = (typeOrName, toggleTypeOrName, attributes = {}) => ({ state, commands: commands2 }) => {
    const type = getNodeType(typeOrName, state.schema);
    const toggleType = getNodeType(toggleTypeOrName, state.schema);
    const isActive2 = isNodeActive(state, type, attributes);
    let attributesToCopy;
    if (state.selection.$anchor.sameParent(state.selection.$head)) {
      attributesToCopy = state.selection.$anchor.parent.attrs;
    }
    if (isActive2) {
      return commands2.setNode(toggleType, attributesToCopy);
    }
    return commands2.setNode(type, { ...attributesToCopy, ...attributes });
  };
  const toggleWrap = (typeOrName, attributes = {}) => ({ state, commands: commands2 }) => {
    const type = getNodeType(typeOrName, state.schema);
    const isActive2 = isNodeActive(state, type, attributes);
    if (isActive2) {
      return commands2.lift(type);
    }
    return commands2.wrapIn(type, attributes);
  };
  const undoInputRule = () => ({ state, dispatch }) => {
    const plugins = state.plugins;
    for (let i2 = 0; i2 < plugins.length; i2 += 1) {
      const plugin = plugins[i2];
      let undoable;
      if (plugin.spec.isInputRules && (undoable = plugin.getState(state))) {
        if (dispatch) {
          const tr2 = state.tr;
          const toUndo = undoable.transform;
          for (let j = toUndo.steps.length - 1; j >= 0; j -= 1) {
            tr2.step(toUndo.steps[j].invert(toUndo.docs[j]));
          }
          if (undoable.text) {
            const marks = tr2.doc.resolve(undoable.from).marks();
            tr2.replaceWith(undoable.from, undoable.to, state.schema.text(undoable.text, marks));
          } else {
            tr2.delete(undoable.from, undoable.to);
          }
        }
        return true;
      }
    }
    return false;
  };
  const unsetAllMarks = () => ({ tr: tr2, dispatch }) => {
    const { selection } = tr2;
    const { empty: empty2, ranges } = selection;
    if (empty2) {
      return true;
    }
    if (dispatch) {
      ranges.forEach((range) => {
        tr2.removeMark(range.$from.pos, range.$to.pos);
      });
    }
    return true;
  };
  const unsetMark = (typeOrName, options = {}) => ({ tr: tr2, state, dispatch }) => {
    var _a;
    const { extendEmptyMarkRange = false } = options;
    const { selection } = tr2;
    const type = getMarkType(typeOrName, state.schema);
    const { $from, empty: empty2, ranges } = selection;
    if (!dispatch) {
      return true;
    }
    if (empty2 && extendEmptyMarkRange) {
      let { from, to } = selection;
      const attrs = (_a = $from.marks().find((mark) => mark.type === type)) === null || _a === void 0 ? void 0 : _a.attrs;
      const range = getMarkRange($from, type, attrs);
      if (range) {
        from = range.from;
        to = range.to;
      }
      tr2.removeMark(from, to, type);
    } else {
      ranges.forEach((range) => {
        tr2.removeMark(range.$from.pos, range.$to.pos, type);
      });
    }
    tr2.removeStoredMark(type);
    return true;
  };
  const updateAttributes = (typeOrName, attributes = {}) => ({ tr: tr2, state, dispatch }) => {
    let nodeType = null;
    let markType = null;
    const schemaType = getSchemaTypeNameByName(typeof typeOrName === "string" ? typeOrName : typeOrName.name, state.schema);
    if (!schemaType) {
      return false;
    }
    if (schemaType === "node") {
      nodeType = getNodeType(typeOrName, state.schema);
    }
    if (schemaType === "mark") {
      markType = getMarkType(typeOrName, state.schema);
    }
    if (dispatch) {
      tr2.selection.ranges.forEach((range) => {
        const from = range.$from.pos;
        const to = range.$to.pos;
        let lastPos;
        let lastNode;
        let trimmedFrom;
        let trimmedTo;
        if (tr2.selection.empty) {
          state.doc.nodesBetween(from, to, (node, pos) => {
            if (nodeType && nodeType === node.type) {
              trimmedFrom = Math.max(pos, from);
              trimmedTo = Math.min(pos + node.nodeSize, to);
              lastPos = pos;
              lastNode = node;
            }
          });
        } else {
          state.doc.nodesBetween(from, to, (node, pos) => {
            if (pos < from && nodeType && nodeType === node.type) {
              trimmedFrom = Math.max(pos, from);
              trimmedTo = Math.min(pos + node.nodeSize, to);
              lastPos = pos;
              lastNode = node;
            }
            if (pos >= from && pos <= to) {
              if (nodeType && nodeType === node.type) {
                tr2.setNodeMarkup(pos, void 0, {
                  ...node.attrs,
                  ...attributes
                });
              }
              if (markType && node.marks.length) {
                node.marks.forEach((mark) => {
                  if (markType === mark.type) {
                    const trimmedFrom2 = Math.max(pos, from);
                    const trimmedTo2 = Math.min(pos + node.nodeSize, to);
                    tr2.addMark(trimmedFrom2, trimmedTo2, markType.create({
                      ...mark.attrs,
                      ...attributes
                    }));
                  }
                });
              }
            }
          });
        }
        if (lastNode) {
          if (lastPos !== void 0) {
            tr2.setNodeMarkup(lastPos, void 0, {
              ...lastNode.attrs,
              ...attributes
            });
          }
          if (markType && lastNode.marks.length) {
            lastNode.marks.forEach((mark) => {
              if (markType === mark.type) {
                tr2.addMark(trimmedFrom, trimmedTo, markType.create({
                  ...mark.attrs,
                  ...attributes
                }));
              }
            });
          }
        }
      });
    }
    return true;
  };
  const wrapIn = (typeOrName, attributes = {}) => ({ state, dispatch }) => {
    const type = getNodeType(typeOrName, state.schema);
    return wrapIn$1(type, attributes)(state, dispatch);
  };
  const wrapInList = (typeOrName, attributes = {}) => ({ state, dispatch }) => {
    const type = getNodeType(typeOrName, state.schema);
    return wrapInList$1(type, attributes)(state, dispatch);
  };
  var commands = /* @__PURE__ */ Object.freeze({
    __proto__: null,
    blur,
    clearContent,
    clearNodes,
    command,
    createParagraphNear,
    cut,
    deleteCurrentNode,
    deleteNode,
    deleteRange,
    deleteSelection,
    enter,
    exitCode,
    extendMarkRange,
    first,
    focus,
    forEach,
    insertContent,
    insertContentAt,
    joinBackward,
    joinDown,
    joinForward,
    joinItemBackward,
    joinItemForward,
    joinTextblockBackward,
    joinTextblockForward,
    joinUp,
    keyboardShortcut,
    lift,
    liftEmptyBlock,
    liftListItem,
    newlineInCode,
    resetAttributes,
    scrollIntoView,
    selectAll,
    selectNodeBackward,
    selectNodeForward,
    selectParentNode,
    selectTextblockEnd,
    selectTextblockStart,
    setContent,
    setMark,
    setMeta,
    setNode,
    setNodeSelection,
    setTextSelection,
    sinkListItem,
    splitBlock,
    splitListItem,
    toggleList,
    toggleMark,
    toggleNode,
    toggleWrap,
    undoInputRule,
    unsetAllMarks,
    unsetMark,
    updateAttributes,
    wrapIn,
    wrapInList
  });
  const Commands = Extension.create({
    name: "commands",
    addCommands() {
      return {
        ...commands
      };
    }
  });
  const Drop = Extension.create({
    name: "drop",
    addProseMirrorPlugins() {
      return [
        new Plugin({
          key: new PluginKey("tiptapDrop"),
          props: {
            handleDrop: (_, e, slice, moved) => {
              this.editor.emit("drop", {
                editor: this.editor,
                event: e,
                slice,
                moved
              });
            }
          }
        })
      ];
    }
  });
  const Editable = Extension.create({
    name: "editable",
    addProseMirrorPlugins() {
      return [
        new Plugin({
          key: new PluginKey("editable"),
          props: {
            editable: () => this.editor.options.editable
          }
        })
      ];
    }
  });
  const FocusEvents = Extension.create({
    name: "focusEvents",
    addProseMirrorPlugins() {
      const { editor } = this;
      return [
        new Plugin({
          key: new PluginKey("focusEvents"),
          props: {
            handleDOMEvents: {
              focus: (view, event) => {
                editor.isFocused = true;
                const transaction = editor.state.tr.setMeta("focus", { event }).setMeta("addToHistory", false);
                view.dispatch(transaction);
                return false;
              },
              blur: (view, event) => {
                editor.isFocused = false;
                const transaction = editor.state.tr.setMeta("blur", { event }).setMeta("addToHistory", false);
                view.dispatch(transaction);
                return false;
              }
            }
          }
        })
      ];
    }
  });
  const Keymap = Extension.create({
    name: "keymap",
    addKeyboardShortcuts() {
      const handleBackspace = () => this.editor.commands.first(({ commands: commands2 }) => [
        () => commands2.undoInputRule(),
        // maybe convert first text block node to default node
        () => commands2.command(({ tr: tr2 }) => {
          const { selection, doc: doc2 } = tr2;
          const { empty: empty2, $anchor } = selection;
          const { pos, parent } = $anchor;
          const $parentPos = $anchor.parent.isTextblock && pos > 0 ? tr2.doc.resolve(pos - 1) : $anchor;
          const parentIsIsolating = $parentPos.parent.type.spec.isolating;
          const parentPos = $anchor.pos - $anchor.parentOffset;
          const isAtStart = parentIsIsolating && $parentPos.parent.childCount === 1 ? parentPos === $anchor.pos : Selection.atStart(doc2).from === pos;
          if (!empty2 || !parent.type.isTextblock || parent.textContent.length || !isAtStart || isAtStart && $anchor.parent.type.name === "paragraph") {
            return false;
          }
          return commands2.clearNodes();
        }),
        () => commands2.deleteSelection(),
        () => commands2.joinBackward(),
        () => commands2.selectNodeBackward()
      ]);
      const handleDelete = () => this.editor.commands.first(({ commands: commands2 }) => [
        () => commands2.deleteSelection(),
        () => commands2.deleteCurrentNode(),
        () => commands2.joinForward(),
        () => commands2.selectNodeForward()
      ]);
      const handleEnter = () => this.editor.commands.first(({ commands: commands2 }) => [
        () => commands2.newlineInCode(),
        () => commands2.createParagraphNear(),
        () => commands2.liftEmptyBlock(),
        () => commands2.splitBlock()
      ]);
      const baseKeymap = {
        Enter: handleEnter,
        "Mod-Enter": () => this.editor.commands.exitCode(),
        Backspace: handleBackspace,
        "Mod-Backspace": handleBackspace,
        "Shift-Backspace": handleBackspace,
        Delete: handleDelete,
        "Mod-Delete": handleDelete,
        "Mod-a": () => this.editor.commands.selectAll()
      };
      const pcKeymap = {
        ...baseKeymap
      };
      const macKeymap = {
        ...baseKeymap,
        "Ctrl-h": handleBackspace,
        "Alt-Backspace": handleBackspace,
        "Ctrl-d": handleDelete,
        "Ctrl-Alt-Backspace": handleDelete,
        "Alt-Delete": handleDelete,
        "Alt-d": handleDelete,
        "Ctrl-a": () => this.editor.commands.selectTextblockStart(),
        "Ctrl-e": () => this.editor.commands.selectTextblockEnd()
      };
      if (isiOS() || isMacOS()) {
        return macKeymap;
      }
      return pcKeymap;
    },
    addProseMirrorPlugins() {
      return [
        // With this plugin we check if the whole document was selected and deleted.
        // In this case we will additionally call `clearNodes()` to convert e.g. a heading
        // to a paragraph if necessary.
        // This is an alternative to ProseMirror's `AllSelection`, which doesn’t work well
        // with many other commands.
        new Plugin({
          key: new PluginKey("clearDocument"),
          appendTransaction: (transactions, oldState, newState) => {
            const docChanges = transactions.some((transaction) => transaction.docChanged) && !oldState.doc.eq(newState.doc);
            const ignoreTr = transactions.some((transaction) => transaction.getMeta("preventClearDocument"));
            if (!docChanges || ignoreTr) {
              return;
            }
            const { empty: empty2, from, to } = oldState.selection;
            const allFrom = Selection.atStart(oldState.doc).from;
            const allEnd = Selection.atEnd(oldState.doc).to;
            const allWasSelected = from === allFrom && to === allEnd;
            if (empty2 || !allWasSelected) {
              return;
            }
            const isEmpty = isNodeEmpty(newState.doc);
            if (!isEmpty) {
              return;
            }
            const tr2 = newState.tr;
            const state = createChainableState({
              state: newState,
              transaction: tr2
            });
            const { commands: commands2 } = new CommandManager({
              editor: this.editor,
              state
            });
            commands2.clearNodes();
            if (!tr2.steps.length) {
              return;
            }
            return tr2;
          }
        })
      ];
    }
  });
  const Paste = Extension.create({
    name: "paste",
    addProseMirrorPlugins() {
      return [
        new Plugin({
          key: new PluginKey("tiptapPaste"),
          props: {
            handlePaste: (_view, e, slice) => {
              this.editor.emit("paste", {
                editor: this.editor,
                event: e,
                slice
              });
            }
          }
        })
      ];
    }
  });
  const Tabindex = Extension.create({
    name: "tabindex",
    addProseMirrorPlugins() {
      return [
        new Plugin({
          key: new PluginKey("tabindex"),
          props: {
            attributes: () => this.editor.isEditable ? { tabindex: "0" } : {}
          }
        })
      ];
    }
  });
  class NodePos {
    get name() {
      return this.node.type.name;
    }
    constructor(pos, editor, isBlock = false, node = null) {
      this.currentNode = null;
      this.actualDepth = null;
      this.isBlock = isBlock;
      this.resolvedPos = pos;
      this.editor = editor;
      this.currentNode = node;
    }
    get node() {
      return this.currentNode || this.resolvedPos.node();
    }
    get element() {
      return this.editor.view.domAtPos(this.pos).node;
    }
    get depth() {
      var _a;
      return (_a = this.actualDepth) !== null && _a !== void 0 ? _a : this.resolvedPos.depth;
    }
    get pos() {
      return this.resolvedPos.pos;
    }
    get content() {
      return this.node.content;
    }
    set content(content) {
      let from = this.from;
      let to = this.to;
      if (this.isBlock) {
        if (this.content.size === 0) {
          console.error(`You can’t set content on a block node. Tried to set content on ${this.name} at ${this.pos}`);
          return;
        }
        from = this.from + 1;
        to = this.to - 1;
      }
      this.editor.commands.insertContentAt({ from, to }, content);
    }
    get attributes() {
      return this.node.attrs;
    }
    get textContent() {
      return this.node.textContent;
    }
    get size() {
      return this.node.nodeSize;
    }
    get from() {
      if (this.isBlock) {
        return this.pos;
      }
      return this.resolvedPos.start(this.resolvedPos.depth);
    }
    get range() {
      return {
        from: this.from,
        to: this.to
      };
    }
    get to() {
      if (this.isBlock) {
        return this.pos + this.size;
      }
      return this.resolvedPos.end(this.resolvedPos.depth) + (this.node.isText ? 0 : 1);
    }
    get parent() {
      if (this.depth === 0) {
        return null;
      }
      const parentPos = this.resolvedPos.start(this.resolvedPos.depth - 1);
      const $pos = this.resolvedPos.doc.resolve(parentPos);
      return new NodePos($pos, this.editor);
    }
    get before() {
      let $pos = this.resolvedPos.doc.resolve(this.from - (this.isBlock ? 1 : 2));
      if ($pos.depth !== this.depth) {
        $pos = this.resolvedPos.doc.resolve(this.from - 3);
      }
      return new NodePos($pos, this.editor);
    }
    get after() {
      let $pos = this.resolvedPos.doc.resolve(this.to + (this.isBlock ? 2 : 1));
      if ($pos.depth !== this.depth) {
        $pos = this.resolvedPos.doc.resolve(this.to + 3);
      }
      return new NodePos($pos, this.editor);
    }
    get children() {
      const children = [];
      this.node.content.forEach((node, offset) => {
        const isBlock = node.isBlock && !node.isTextblock;
        const isNonTextAtom = node.isAtom && !node.isText;
        const targetPos = this.pos + offset + (isNonTextAtom ? 0 : 1);
        const $pos = this.resolvedPos.doc.resolve(targetPos);
        if (!isBlock && $pos.depth <= this.depth) {
          return;
        }
        const childNodePos = new NodePos($pos, this.editor, isBlock, isBlock ? node : null);
        if (isBlock) {
          childNodePos.actualDepth = this.depth + 1;
        }
        children.push(new NodePos($pos, this.editor, isBlock, isBlock ? node : null));
      });
      return children;
    }
    get firstChild() {
      return this.children[0] || null;
    }
    get lastChild() {
      const children = this.children;
      return children[children.length - 1] || null;
    }
    closest(selector, attributes = {}) {
      let node = null;
      let currentNode = this.parent;
      while (currentNode && !node) {
        if (currentNode.node.type.name === selector) {
          if (Object.keys(attributes).length > 0) {
            const nodeAttributes = currentNode.node.attrs;
            const attrKeys = Object.keys(attributes);
            for (let index = 0; index < attrKeys.length; index += 1) {
              const key = attrKeys[index];
              if (nodeAttributes[key] !== attributes[key]) {
                break;
              }
            }
          } else {
            node = currentNode;
          }
        }
        currentNode = currentNode.parent;
      }
      return node;
    }
    querySelector(selector, attributes = {}) {
      return this.querySelectorAll(selector, attributes, true)[0] || null;
    }
    querySelectorAll(selector, attributes = {}, firstItemOnly = false) {
      let nodes = [];
      if (!this.children || this.children.length === 0) {
        return nodes;
      }
      const attrKeys = Object.keys(attributes);
      this.children.forEach((childPos) => {
        if (firstItemOnly && nodes.length > 0) {
          return;
        }
        if (childPos.node.type.name === selector) {
          const doesAllAttributesMatch = attrKeys.every((key) => attributes[key] === childPos.node.attrs[key]);
          if (doesAllAttributesMatch) {
            nodes.push(childPos);
          }
        }
        if (firstItemOnly && nodes.length > 0) {
          return;
        }
        nodes = nodes.concat(childPos.querySelectorAll(selector, attributes, firstItemOnly));
      });
      return nodes;
    }
    setAttribute(attributes) {
      const { tr: tr2 } = this.editor.state;
      tr2.setNodeMarkup(this.from, void 0, {
        ...this.node.attrs,
        ...attributes
      });
      this.editor.view.dispatch(tr2);
    }
  }
  const style = `.ProseMirror {
  position: relative;
}

.ProseMirror {
  word-wrap: break-word;
  white-space: pre-wrap;
  white-space: break-spaces;
  -webkit-font-variant-ligatures: none;
  font-variant-ligatures: none;
  font-feature-settings: "liga" 0; /* the above doesn't seem to work in Edge */
}

.ProseMirror [contenteditable="false"] {
  white-space: normal;
}

.ProseMirror [contenteditable="false"] [contenteditable="true"] {
  white-space: pre-wrap;
}

.ProseMirror pre {
  white-space: pre-wrap;
}

img.ProseMirror-separator {
  display: inline !important;
  border: none !important;
  margin: 0 !important;
  width: 0 !important;
  height: 0 !important;
}

.ProseMirror-gapcursor {
  display: none;
  pointer-events: none;
  position: absolute;
  margin: 0;
}

.ProseMirror-gapcursor:after {
  content: "";
  display: block;
  position: absolute;
  top: -2px;
  width: 20px;
  border-top: 1px solid black;
  animation: ProseMirror-cursor-blink 1.1s steps(2, start) infinite;
}

@keyframes ProseMirror-cursor-blink {
  to {
    visibility: hidden;
  }
}

.ProseMirror-hideselection *::selection {
  background: transparent;
}

.ProseMirror-hideselection *::-moz-selection {
  background: transparent;
}

.ProseMirror-hideselection * {
  caret-color: transparent;
}

.ProseMirror-focused .ProseMirror-gapcursor {
  display: block;
}

.tippy-box[data-animation=fade][data-state=hidden] {
  opacity: 0
}`;
  function createStyleTag(style2, nonce, suffix) {
    const tiptapStyleTag = document.querySelector(`style[data-tiptap-style${""}]`);
    if (tiptapStyleTag !== null) {
      return tiptapStyleTag;
    }
    const styleNode = document.createElement("style");
    if (nonce) {
      styleNode.setAttribute("nonce", nonce);
    }
    styleNode.setAttribute(`data-tiptap-style${""}`, "");
    styleNode.innerHTML = style2;
    document.getElementsByTagName("head")[0].appendChild(styleNode);
    return styleNode;
  }
  let Editor$1 = class Editor extends EventEmitter {
    constructor(options = {}) {
      super();
      this.isFocused = false;
      this.isInitialized = false;
      this.extensionStorage = {};
      this.options = {
        element: document.createElement("div"),
        content: "",
        injectCSS: true,
        injectNonce: void 0,
        extensions: [],
        autofocus: false,
        editable: true,
        editorProps: {},
        parseOptions: {},
        coreExtensionOptions: {},
        enableInputRules: true,
        enablePasteRules: true,
        enableCoreExtensions: true,
        enableContentCheck: false,
        onBeforeCreate: () => null,
        onCreate: () => null,
        onUpdate: () => null,
        onSelectionUpdate: () => null,
        onTransaction: () => null,
        onFocus: () => null,
        onBlur: () => null,
        onDestroy: () => null,
        onContentError: ({ error }) => {
          throw error;
        },
        onPaste: () => null,
        onDrop: () => null
      };
      this.isCapturingTransaction = false;
      this.capturedTransaction = null;
      this.setOptions(options);
      this.createExtensionManager();
      this.createCommandManager();
      this.createSchema();
      this.on("beforeCreate", this.options.onBeforeCreate);
      this.emit("beforeCreate", { editor: this });
      this.on("contentError", this.options.onContentError);
      this.createView();
      this.injectCSS();
      this.on("create", this.options.onCreate);
      this.on("update", this.options.onUpdate);
      this.on("selectionUpdate", this.options.onSelectionUpdate);
      this.on("transaction", this.options.onTransaction);
      this.on("focus", this.options.onFocus);
      this.on("blur", this.options.onBlur);
      this.on("destroy", this.options.onDestroy);
      this.on("drop", ({ event, slice, moved }) => this.options.onDrop(event, slice, moved));
      this.on("paste", ({ event, slice }) => this.options.onPaste(event, slice));
      window.setTimeout(() => {
        if (this.isDestroyed) {
          return;
        }
        this.commands.focus(this.options.autofocus);
        this.emit("create", { editor: this });
        this.isInitialized = true;
      }, 0);
    }
    /**
     * Returns the editor storage.
     */
    get storage() {
      return this.extensionStorage;
    }
    /**
     * An object of all registered commands.
     */
    get commands() {
      return this.commandManager.commands;
    }
    /**
     * Create a command chain to call multiple commands at once.
     */
    chain() {
      return this.commandManager.chain();
    }
    /**
     * Check if a command or a command chain can be executed. Without executing it.
     */
    can() {
      return this.commandManager.can();
    }
    /**
     * Inject CSS styles.
     */
    injectCSS() {
      if (this.options.injectCSS && document) {
        this.css = createStyleTag(style, this.options.injectNonce);
      }
    }
    /**
     * Update editor options.
     *
     * @param options A list of options
     */
    setOptions(options = {}) {
      this.options = {
        ...this.options,
        ...options
      };
      if (!this.view || !this.state || this.isDestroyed) {
        return;
      }
      if (this.options.editorProps) {
        this.view.setProps(this.options.editorProps);
      }
      this.view.updateState(this.state);
    }
    /**
     * Update editable state of the editor.
     */
    setEditable(editable, emitUpdate = true) {
      this.setOptions({ editable });
      if (emitUpdate) {
        this.emit("update", { editor: this, transaction: this.state.tr });
      }
    }
    /**
     * Returns whether the editor is editable.
     */
    get isEditable() {
      return this.options.editable && this.view && this.view.editable;
    }
    /**
     * Returns the editor state.
     */
    get state() {
      return this.view.state;
    }
    /**
     * Register a ProseMirror plugin.
     *
     * @param plugin A ProseMirror plugin
     * @param handlePlugins Control how to merge the plugin into the existing plugins.
     * @returns The new editor state
     */
    registerPlugin(plugin, handlePlugins) {
      const plugins = isFunction(handlePlugins) ? handlePlugins(plugin, [...this.state.plugins]) : [...this.state.plugins, plugin];
      const state = this.state.reconfigure({ plugins });
      this.view.updateState(state);
      return state;
    }
    /**
     * Unregister a ProseMirror plugin.
     *
     * @param nameOrPluginKeyToRemove The plugins name
     * @returns The new editor state or undefined if the editor is destroyed
     */
    unregisterPlugin(nameOrPluginKeyToRemove) {
      if (this.isDestroyed) {
        return void 0;
      }
      const prevPlugins = this.state.plugins;
      let plugins = prevPlugins;
      [].concat(nameOrPluginKeyToRemove).forEach((nameOrPluginKey) => {
        const name = typeof nameOrPluginKey === "string" ? `${nameOrPluginKey}$` : nameOrPluginKey.key;
        plugins = prevPlugins.filter((plugin) => !plugin.key.startsWith(name));
      });
      if (prevPlugins.length === plugins.length) {
        return void 0;
      }
      const state = this.state.reconfigure({
        plugins
      });
      this.view.updateState(state);
      return state;
    }
    /**
     * Creates an extension manager.
     */
    createExtensionManager() {
      var _a, _b;
      const coreExtensions = this.options.enableCoreExtensions ? [
        Editable,
        ClipboardTextSerializer.configure({
          blockSeparator: (_b = (_a = this.options.coreExtensionOptions) === null || _a === void 0 ? void 0 : _a.clipboardTextSerializer) === null || _b === void 0 ? void 0 : _b.blockSeparator
        }),
        Commands,
        FocusEvents,
        Keymap,
        Tabindex,
        Drop,
        Paste
      ].filter((ext) => {
        if (typeof this.options.enableCoreExtensions === "object") {
          return this.options.enableCoreExtensions[ext.name] !== false;
        }
        return true;
      }) : [];
      const allExtensions = [...coreExtensions, ...this.options.extensions].filter((extension) => {
        return ["extension", "node", "mark"].includes(extension === null || extension === void 0 ? void 0 : extension.type);
      });
      this.extensionManager = new ExtensionManager(allExtensions, this);
    }
    /**
     * Creates an command manager.
     */
    createCommandManager() {
      this.commandManager = new CommandManager({
        editor: this
      });
    }
    /**
     * Creates a ProseMirror schema.
     */
    createSchema() {
      this.schema = this.extensionManager.schema;
    }
    /**
     * Creates a ProseMirror view.
     */
    createView() {
      var _a;
      let doc2;
      try {
        doc2 = createDocument(this.options.content, this.schema, this.options.parseOptions, { errorOnInvalidContent: this.options.enableContentCheck });
      } catch (e) {
        if (!(e instanceof Error) || !["[tiptap error]: Invalid JSON content", "[tiptap error]: Invalid HTML content"].includes(e.message)) {
          throw e;
        }
        this.emit("contentError", {
          editor: this,
          error: e,
          disableCollaboration: () => {
            if (this.storage.collaboration) {
              this.storage.collaboration.isDisabled = true;
            }
            this.options.extensions = this.options.extensions.filter((extension) => extension.name !== "collaboration");
            this.createExtensionManager();
          }
        });
        doc2 = createDocument(this.options.content, this.schema, this.options.parseOptions, { errorOnInvalidContent: false });
      }
      const selection = resolveFocusPosition(doc2, this.options.autofocus);
      this.view = new EditorView(this.options.element, {
        ...this.options.editorProps,
        attributes: {
          // add `role="textbox"` to the editor element
          role: "textbox",
          ...(_a = this.options.editorProps) === null || _a === void 0 ? void 0 : _a.attributes
        },
        dispatchTransaction: this.dispatchTransaction.bind(this),
        state: EditorState.create({
          doc: doc2,
          selection: selection || void 0
        })
      });
      const newState = this.state.reconfigure({
        plugins: this.extensionManager.plugins
      });
      this.view.updateState(newState);
      this.createNodeViews();
      this.prependClass();
      const dom = this.view.dom;
      dom.editor = this;
    }
    /**
     * Creates all node views.
     */
    createNodeViews() {
      if (this.view.isDestroyed) {
        return;
      }
      this.view.setProps({
        nodeViews: this.extensionManager.nodeViews
      });
    }
    /**
     * Prepend class name to element.
     */
    prependClass() {
      this.view.dom.className = `tiptap ${this.view.dom.className}`;
    }
    captureTransaction(fn) {
      this.isCapturingTransaction = true;
      fn();
      this.isCapturingTransaction = false;
      const tr2 = this.capturedTransaction;
      this.capturedTransaction = null;
      return tr2;
    }
    /**
     * The callback over which to send transactions (state updates) produced by the view.
     *
     * @param transaction An editor state transaction
     */
    dispatchTransaction(transaction) {
      if (this.view.isDestroyed) {
        return;
      }
      if (this.isCapturingTransaction) {
        if (!this.capturedTransaction) {
          this.capturedTransaction = transaction;
          return;
        }
        transaction.steps.forEach((step) => {
          var _a;
          return (_a = this.capturedTransaction) === null || _a === void 0 ? void 0 : _a.step(step);
        });
        return;
      }
      const state = this.state.apply(transaction);
      const selectionHasChanged = !this.state.selection.eq(state.selection);
      this.emit("beforeTransaction", {
        editor: this,
        transaction,
        nextState: state
      });
      this.view.updateState(state);
      this.emit("transaction", {
        editor: this,
        transaction
      });
      if (selectionHasChanged) {
        this.emit("selectionUpdate", {
          editor: this,
          transaction
        });
      }
      const focus2 = transaction.getMeta("focus");
      const blur2 = transaction.getMeta("blur");
      if (focus2) {
        this.emit("focus", {
          editor: this,
          event: focus2.event,
          transaction
        });
      }
      if (blur2) {
        this.emit("blur", {
          editor: this,
          event: blur2.event,
          transaction
        });
      }
      if (!transaction.docChanged || transaction.getMeta("preventUpdate")) {
        return;
      }
      this.emit("update", {
        editor: this,
        transaction
      });
    }
    /**
     * Get attributes of the currently selected node or mark.
     */
    getAttributes(nameOrType) {
      return getAttributes(this.state, nameOrType);
    }
    isActive(nameOrAttributes, attributesOrUndefined) {
      const name = typeof nameOrAttributes === "string" ? nameOrAttributes : null;
      const attributes = typeof nameOrAttributes === "string" ? attributesOrUndefined : nameOrAttributes;
      return isActive(this.state, name, attributes);
    }
    /**
     * Get the document as JSON.
     */
    getJSON() {
      return this.state.doc.toJSON();
    }
    /**
     * Get the document as HTML.
     */
    getHTML() {
      return getHTMLFromFragment(this.state.doc.content, this.schema);
    }
    /**
     * Get the document as text.
     */
    getText(options) {
      const { blockSeparator = "\n\n", textSerializers = {} } = options || {};
      return getText(this.state.doc, {
        blockSeparator,
        textSerializers: {
          ...getTextSerializersFromSchema(this.schema),
          ...textSerializers
        }
      });
    }
    /**
     * Check if there is no content.
     */
    get isEmpty() {
      return isNodeEmpty(this.state.doc);
    }
    /**
     * Get the number of characters for the current document.
     *
     * @deprecated
     */
    getCharacterCount() {
      console.warn('[tiptap warn]: "editor.getCharacterCount()" is deprecated. Please use "editor.storage.characterCount.characters()" instead.');
      return this.state.doc.content.size - 2;
    }
    /**
     * Destroy the editor.
     */
    destroy() {
      this.emit("destroy");
      if (this.view) {
        const dom = this.view.dom;
        if (dom && dom.editor) {
          delete dom.editor;
        }
        this.view.destroy();
      }
      this.removeAllListeners();
    }
    /**
     * Check if the editor is already destroyed.
     */
    get isDestroyed() {
      var _a;
      return !((_a = this.view) === null || _a === void 0 ? void 0 : _a.docView);
    }
    $node(selector, attributes) {
      var _a;
      return ((_a = this.$doc) === null || _a === void 0 ? void 0 : _a.querySelector(selector, attributes)) || null;
    }
    $nodes(selector, attributes) {
      var _a;
      return ((_a = this.$doc) === null || _a === void 0 ? void 0 : _a.querySelectorAll(selector, attributes)) || null;
    }
    $pos(pos) {
      const $pos = this.state.doc.resolve(pos);
      return new NodePos($pos, this);
    }
    get $doc() {
      return this.$pos(0);
    }
  };
  function markInputRule(config) {
    return new InputRule({
      find: config.find,
      handler: ({ state, range, match }) => {
        const attributes = callOrReturn(config.getAttributes, void 0, match);
        if (attributes === false || attributes === null) {
          return null;
        }
        const { tr: tr2 } = state;
        const captureGroup = match[match.length - 1];
        const fullMatch = match[0];
        if (captureGroup) {
          const startSpaces = fullMatch.search(/\S/);
          const textStart = range.from + fullMatch.indexOf(captureGroup);
          const textEnd = textStart + captureGroup.length;
          const excludedMarks = getMarksBetween(range.from, range.to, state.doc).filter((item) => {
            const excluded = item.mark.type.excluded;
            return excluded.find((type) => type === config.type && type !== item.mark.type);
          }).filter((item) => item.to > textStart);
          if (excludedMarks.length) {
            return null;
          }
          if (textEnd < range.to) {
            tr2.delete(textEnd, range.to);
          }
          if (textStart > range.from) {
            tr2.delete(range.from + startSpaces, textStart);
          }
          const markEnd = range.from + startSpaces + captureGroup.length;
          tr2.addMark(range.from + startSpaces, markEnd, config.type.create(attributes || {}));
          tr2.removeStoredMark(config.type);
        }
      }
    });
  }
  function nodeInputRule(config) {
    return new InputRule({
      find: config.find,
      handler: ({ state, range, match }) => {
        const attributes = callOrReturn(config.getAttributes, void 0, match) || {};
        const { tr: tr2 } = state;
        const start = range.from;
        let end = range.to;
        const newNode = config.type.create(attributes);
        if (match[1]) {
          const offset = match[0].lastIndexOf(match[1]);
          let matchStart = start + offset;
          if (matchStart > end) {
            matchStart = end;
          } else {
            end = matchStart + match[1].length;
          }
          const lastChar = match[0][match[0].length - 1];
          tr2.insertText(lastChar, start + match[0].length - 1);
          tr2.replaceWith(matchStart, end, newNode);
        } else if (match[0]) {
          const insertionStart = config.type.isInline ? start : start - 1;
          tr2.insert(insertionStart, config.type.create(attributes)).delete(tr2.mapping.map(start), tr2.mapping.map(end));
        }
        tr2.scrollIntoView();
      }
    });
  }
  function textblockTypeInputRule(config) {
    return new InputRule({
      find: config.find,
      handler: ({ state, range, match }) => {
        const $start = state.doc.resolve(range.from);
        const attributes = callOrReturn(config.getAttributes, void 0, match) || {};
        if (!$start.node(-1).canReplaceWith($start.index(-1), $start.indexAfter(-1), config.type)) {
          return null;
        }
        state.tr.delete(range.from, range.to).setBlockType(range.from, range.from, config.type, attributes);
      }
    });
  }
  function wrappingInputRule(config) {
    return new InputRule({
      find: config.find,
      handler: ({ state, range, match, chain }) => {
        const attributes = callOrReturn(config.getAttributes, void 0, match) || {};
        const tr2 = state.tr.delete(range.from, range.to);
        const $start = tr2.doc.resolve(range.from);
        const blockRange = $start.blockRange();
        const wrapping = blockRange && findWrapping(blockRange, config.type, attributes);
        if (!wrapping) {
          return null;
        }
        tr2.wrap(blockRange, wrapping);
        if (config.keepMarks && config.editor) {
          const { selection, storedMarks } = state;
          const { splittableMarks } = config.editor.extensionManager;
          const marks = storedMarks || selection.$to.parentOffset && selection.$from.marks();
          if (marks) {
            const filteredMarks = marks.filter((mark) => splittableMarks.includes(mark.type.name));
            tr2.ensureMarks(filteredMarks);
          }
        }
        if (config.keepAttributes) {
          const nodeType = config.type.name === "bulletList" || config.type.name === "orderedList" ? "listItem" : "taskList";
          chain().updateAttributes(nodeType, attributes).run();
        }
        const before = tr2.doc.resolve(range.from - 1).nodeBefore;
        if (before && before.type === config.type && canJoin(tr2.doc, range.from - 1) && (!config.joinPredicate || config.joinPredicate(match, before))) {
          tr2.join(range.from - 1);
        }
      }
    });
  }
  class Node {
    constructor(config = {}) {
      this.type = "node";
      this.name = "node";
      this.parent = null;
      this.child = null;
      this.config = {
        name: this.name,
        defaultOptions: {}
      };
      this.config = {
        ...this.config,
        ...config
      };
      this.name = this.config.name;
      if (config.defaultOptions && Object.keys(config.defaultOptions).length > 0) {
        console.warn(`[tiptap warn]: BREAKING CHANGE: "defaultOptions" is deprecated. Please use "addOptions" instead. Found in extension: "${this.name}".`);
      }
      this.options = this.config.defaultOptions;
      if (this.config.addOptions) {
        this.options = callOrReturn(getExtensionField(this, "addOptions", {
          name: this.name
        }));
      }
      this.storage = callOrReturn(getExtensionField(this, "addStorage", {
        name: this.name,
        options: this.options
      })) || {};
    }
    static create(config = {}) {
      return new Node(config);
    }
    configure(options = {}) {
      const extension = this.extend({
        ...this.config,
        addOptions: () => {
          return mergeDeep(this.options, options);
        }
      });
      extension.name = this.name;
      extension.parent = this.parent;
      return extension;
    }
    extend(extendedConfig = {}) {
      const extension = new Node(extendedConfig);
      extension.parent = this;
      this.child = extension;
      extension.name = extendedConfig.name ? extendedConfig.name : extension.parent.name;
      if (extendedConfig.defaultOptions && Object.keys(extendedConfig.defaultOptions).length > 0) {
        console.warn(`[tiptap warn]: BREAKING CHANGE: "defaultOptions" is deprecated. Please use "addOptions" instead. Found in extension: "${extension.name}".`);
      }
      extension.options = callOrReturn(getExtensionField(extension, "addOptions", {
        name: extension.name
      }));
      extension.storage = callOrReturn(getExtensionField(extension, "addStorage", {
        name: extension.name,
        options: extension.options
      }));
      return extension;
    }
  }
  function markPasteRule(config) {
    return new PasteRule({
      find: config.find,
      handler: ({ state, range, match, pasteEvent }) => {
        const attributes = callOrReturn(config.getAttributes, void 0, match, pasteEvent);
        if (attributes === false || attributes === null) {
          return null;
        }
        const { tr: tr2 } = state;
        const captureGroup = match[match.length - 1];
        const fullMatch = match[0];
        let markEnd = range.to;
        if (captureGroup) {
          const startSpaces = fullMatch.search(/\S/);
          const textStart = range.from + fullMatch.indexOf(captureGroup);
          const textEnd = textStart + captureGroup.length;
          const excludedMarks = getMarksBetween(range.from, range.to, state.doc).filter((item) => {
            const excluded = item.mark.type.excluded;
            return excluded.find((type) => type === config.type && type !== item.mark.type);
          }).filter((item) => item.to > textStart);
          if (excludedMarks.length) {
            return null;
          }
          if (textEnd < range.to) {
            tr2.delete(textEnd, range.to);
          }
          if (textStart > range.from) {
            tr2.delete(range.from + startSpaces, textStart);
          }
          markEnd = range.from + startSpaces + captureGroup.length;
          tr2.addMark(range.from + startSpaces, markEnd, config.type.create(attributes || {}));
          tr2.removeStoredMark(config.type);
        }
      }
    });
  }
  var commonjsGlobal = typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : {};
  var dist = {};
  var string = {};
  var util = {};
  var validators = {};
  var _global_Vue = Vue;
  var isInstanceOf$1 = {};
  Object.defineProperty(isInstanceOf$1, "__esModule", { value: true });
  isInstanceOf$1.isInstanceOf = void 0;
  const isInstanceOf = (parent) => (value) => {
    if (!(value instanceof parent)) {
      return `value should be an instance of ${parent.name}`;
    }
    return void 0;
  };
  isInstanceOf$1.isInstanceOf = isInstanceOf;
  var isInteger$1 = {};
  Object.defineProperty(isInteger$1, "__esModule", { value: true });
  isInteger$1.isInteger = void 0;
  const isInteger = (value) => {
    if (typeof value !== "number" || !Number.isInteger(value)) {
      return "value should be an integer";
    }
    return void 0;
  };
  isInteger$1.isInteger = isInteger;
  var isOneOf$1 = {};
  Object.defineProperty(isOneOf$1, "__esModule", { value: true });
  isOneOf$1.isOneOf = void 0;
  const isOneOf = (allowedValues) => (value) => {
    if (!allowedValues.includes(value)) {
      return `value should be one of "${allowedValues.join('", "')}"`;
    }
    return void 0;
  };
  isOneOf$1.isOneOf = isOneOf;
  var isSymbol$1 = {};
  Object.defineProperty(isSymbol$1, "__esModule", { value: true });
  isSymbol$1.isSymbol = void 0;
  const isSymbol = (value) => {
    if (typeof value !== "symbol") {
      return "value should be a symbol";
    }
    return void 0;
  };
  isSymbol$1.isSymbol = isSymbol;
  (function(exports) {
    var __importDefault = commonjsGlobal && commonjsGlobal.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.isSymbol = exports.isOneOf = exports.isInteger = exports.isInstanceOf = exports.vuePropValidator = void 0;
    const vue_1 = __importDefault(_global_Vue);
    function vuePropValidator(userValidator, ...typeValidators) {
      const validators2 = userValidator ? [...typeValidators, userValidator] : typeValidators;
      if (validators2.length === 0) {
        return void 0;
      }
      return (value) => {
        for (const validator of validators2) {
          const errorMessage = validator(value);
          if (errorMessage) {
            if (typeof vue_1.default === "object" && "util" in vue_1.default) {
              vue_1.default.util.warn(`${errorMessage} (received: '${String(value)}')`);
            } else {
              console.warn(`${errorMessage} (received: '${String(value)}')`);
            }
            return false;
          }
        }
        return true;
      };
    }
    exports.vuePropValidator = vuePropValidator;
    var isInstanceOf_1 = isInstanceOf$1;
    Object.defineProperty(exports, "isInstanceOf", { enumerable: true, get: function() {
      return isInstanceOf_1.isInstanceOf;
    } });
    var isInteger_1 = isInteger$1;
    Object.defineProperty(exports, "isInteger", { enumerable: true, get: function() {
      return isInteger_1.isInteger;
    } });
    var isOneOf_1 = isOneOf$1;
    Object.defineProperty(exports, "isOneOf", { enumerable: true, get: function() {
      return isOneOf_1.isOneOf;
    } });
    var isSymbol_1 = isSymbol$1;
    Object.defineProperty(exports, "isSymbol", { enumerable: true, get: function() {
      return isSymbol_1.isSymbol;
    } });
  })(validators);
  Object.defineProperty(util, "__esModule", { value: true });
  util.propOptionsGenerator = void 0;
  const validators_1$5 = validators;
  const propOptionsGenerator = (type, userValidator, ...typeValidators) => ({
    optional: {
      type,
      required: false,
      default: void 0,
      validator: (0, validators_1$5.vuePropValidator)(userValidator, ...typeValidators)
    },
    nullable: {
      type,
      required: false,
      default: null,
      validator: (0, validators_1$5.vuePropValidator)(userValidator, ...typeValidators)
    },
    withDefault: (defaultValue) => ({
      type,
      required: false,
      default: defaultValue,
      validator: (0, validators_1$5.vuePropValidator)(userValidator, ...typeValidators)
    }),
    required: {
      type,
      required: true,
      validator: (0, validators_1$5.vuePropValidator)(userValidator, ...typeValidators)
    }
  });
  util.propOptionsGenerator = propOptionsGenerator;
  Object.defineProperty(string, "__esModule", { value: true });
  string.stringProp = void 0;
  const util_1$b = util;
  const stringProp = (validator) => (0, util_1$b.propOptionsGenerator)(String, validator);
  string.stringProp = stringProp;
  var boolean = {};
  Object.defineProperty(boolean, "__esModule", { value: true });
  boolean.booleanProp = void 0;
  const util_1$a = util;
  const booleanProp = (validator) => (0, util_1$a.propOptionsGenerator)(Boolean, validator);
  boolean.booleanProp = booleanProp;
  var number = {};
  Object.defineProperty(number, "__esModule", { value: true });
  number.numberProp = void 0;
  const util_1$9 = util;
  const numberProp = (validator) => (0, util_1$9.propOptionsGenerator)(Number, validator);
  number.numberProp = numberProp;
  var integer = {};
  Object.defineProperty(integer, "__esModule", { value: true });
  integer.integerProp = void 0;
  const util_1$8 = util;
  const validators_1$4 = validators;
  const integerProp = (validator) => (0, util_1$8.propOptionsGenerator)(Number, validator, validators_1$4.isInteger);
  integer.integerProp = integerProp;
  var symbol = {};
  Object.defineProperty(symbol, "__esModule", { value: true });
  symbol.symbolProp = void 0;
  const util_1$7 = util;
  const validators_1$3 = validators;
  const symbolProp = (validator) => (0, util_1$7.propOptionsGenerator)(void 0, validator, validators_1$3.isSymbol);
  symbol.symbolProp = symbolProp;
  var vueComponent = {};
  Object.defineProperty(vueComponent, "__esModule", { value: true });
  vueComponent.vueComponentProp = void 0;
  const util_1$6 = util;
  const vueComponentProp = (validator) => (0, util_1$6.propOptionsGenerator)([Object, String], validator);
  vueComponent.vueComponentProp = vueComponentProp;
  var any = {};
  Object.defineProperty(any, "__esModule", { value: true });
  any.anyProp = void 0;
  const util_1$5 = util;
  const anyProp = (validator) => (0, util_1$5.propOptionsGenerator)(void 0, validator);
  any.anyProp = anyProp;
  var array = {};
  Object.defineProperty(array, "__esModule", { value: true });
  array.arrayProp = void 0;
  const util_1$4 = util;
  const arrayProp = (validator) => (0, util_1$4.propOptionsGenerator)(Array, validator);
  array.arrayProp = arrayProp;
  var object = {};
  Object.defineProperty(object, "__esModule", { value: true });
  object.objectProp = void 0;
  const util_1$3 = util;
  const objectProp = (validator) => (0, util_1$3.propOptionsGenerator)(Object, validator);
  object.objectProp = objectProp;
  var _function = {};
  Object.defineProperty(_function, "__esModule", { value: true });
  _function.functionProp = void 0;
  const validators_1$2 = validators;
  const functionProp = (validator) => ({
    optional: {
      type: Function,
      required: false,
      default: void 0,
      validator: (0, validators_1$2.vuePropValidator)(validator)
    },
    nullable: {
      type: Function,
      required: false,
      default: null,
      validator: (0, validators_1$2.vuePropValidator)(validator)
    },
    required: {
      type: Function,
      required: true,
      validator: (0, validators_1$2.vuePropValidator)(validator)
    }
  });
  _function.functionProp = functionProp;
  var oneOf = {};
  Object.defineProperty(oneOf, "__esModule", { value: true });
  oneOf.oneOfProp = void 0;
  const util_1$2 = util;
  const validators_1$1 = validators;
  const getOneOfType = (values) => {
    const allowedTypes = [
      ...new Set(values.flatMap((value) => {
        var _a;
        if (value === null || value === void 0) {
          return [];
        }
        return (
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          (_a = value.constructor) !== null && _a !== void 0 ? _a : []
        );
      }))
    ];
    if (allowedTypes.length === 0) {
      return void 0;
    }
    if (allowedTypes.length === 1) {
      return allowedTypes[0];
    }
    return allowedTypes;
  };
  const oneOfProp = (allowedValues, validator) => (0, util_1$2.propOptionsGenerator)(getOneOfType(allowedValues), validator, (0, validators_1$1.isOneOf)(allowedValues));
  oneOf.oneOfProp = oneOfProp;
  var oneOfObjectKeys = {};
  Object.defineProperty(oneOfObjectKeys, "__esModule", { value: true });
  oneOfObjectKeys.oneOfObjectKeysProp = void 0;
  const oneOf_1 = oneOf;
  const oneOfObjectKeysProp = (object2, validator) => (0, oneOf_1.oneOfProp)(Object.keys(object2), validator);
  oneOfObjectKeys.oneOfObjectKeysProp = oneOfObjectKeysProp;
  var oneOfTypes = {};
  Object.defineProperty(oneOfTypes, "__esModule", { value: true });
  oneOfTypes.oneOfTypesProp = void 0;
  const util_1$1 = util;
  const oneOfTypesProp = (type, validator) => (0, util_1$1.propOptionsGenerator)(type, validator);
  oneOfTypes.oneOfTypesProp = oneOfTypesProp;
  var instanceOf = {};
  Object.defineProperty(instanceOf, "__esModule", { value: true });
  instanceOf.instanceOfProp = void 0;
  const util_1 = util;
  const validators_1 = validators;
  const instanceOfProp = (parent, validator) => (0, util_1.propOptionsGenerator)(parent, validator, (0, validators_1.isInstanceOf)(parent));
  instanceOf.instanceOfProp = instanceOfProp;
  var isNegative$1 = {};
  Object.defineProperty(isNegative$1, "__esModule", { value: true });
  isNegative$1.isNegative = void 0;
  const isNegative = (value) => {
    if (typeof value !== "number" || value >= 0 || Number.isNaN(value)) {
      return "value should be a negative number";
    }
    return void 0;
  };
  isNegative$1.isNegative = isNegative;
  var isPositive$1 = {};
  Object.defineProperty(isPositive$1, "__esModule", { value: true });
  isPositive$1.isPositive = void 0;
  const isPositive = (value) => {
    if (typeof value !== "number" || value <= 0 || Number.isNaN(value)) {
      return "value should be a positive number";
    }
    return void 0;
  };
  isPositive$1.isPositive = isPositive;
  var isNonNegative$1 = {};
  Object.defineProperty(isNonNegative$1, "__esModule", { value: true });
  isNonNegative$1.isNonNegative = void 0;
  const isNonNegative = (value) => {
    if (typeof value !== "number" || value < 0 || Number.isNaN(value)) {
      return "value should be a non-negative number";
    }
    return void 0;
  };
  isNonNegative$1.isNonNegative = isNonNegative;
  var isNonPositive$1 = {};
  Object.defineProperty(isNonPositive$1, "__esModule", { value: true });
  isNonPositive$1.isNonPositive = void 0;
  const isNonPositive = (value) => {
    if (typeof value !== "number" || value > 0 || Number.isNaN(value)) {
      return "value should be a non-positive number";
    }
    return void 0;
  };
  isNonPositive$1.isNonPositive = isNonPositive;
  (function(exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.isNonPositive = exports.isNonNegative = exports.isPositive = exports.isNegative = exports.instanceOfProp = exports.oneOfTypesProp = exports.oneOfObjectKeysProp = exports.oneOfProp = exports.functionProp = exports.objectProp = exports.arrayProp = exports.anyProp = exports.vueComponentProp = exports.symbolProp = exports.integerProp = exports.numberProp = exports.booleanProp = exports.stringProp = void 0;
    var string_1 = string;
    Object.defineProperty(exports, "stringProp", { enumerable: true, get: function() {
      return string_1.stringProp;
    } });
    var boolean_1 = boolean;
    Object.defineProperty(exports, "booleanProp", { enumerable: true, get: function() {
      return boolean_1.booleanProp;
    } });
    var number_1 = number;
    Object.defineProperty(exports, "numberProp", { enumerable: true, get: function() {
      return number_1.numberProp;
    } });
    var integer_1 = integer;
    Object.defineProperty(exports, "integerProp", { enumerable: true, get: function() {
      return integer_1.integerProp;
    } });
    var symbol_1 = symbol;
    Object.defineProperty(exports, "symbolProp", { enumerable: true, get: function() {
      return symbol_1.symbolProp;
    } });
    var vueComponent_1 = vueComponent;
    Object.defineProperty(exports, "vueComponentProp", { enumerable: true, get: function() {
      return vueComponent_1.vueComponentProp;
    } });
    var any_1 = any;
    Object.defineProperty(exports, "anyProp", { enumerable: true, get: function() {
      return any_1.anyProp;
    } });
    var array_1 = array;
    Object.defineProperty(exports, "arrayProp", { enumerable: true, get: function() {
      return array_1.arrayProp;
    } });
    var object_1 = object;
    Object.defineProperty(exports, "objectProp", { enumerable: true, get: function() {
      return object_1.objectProp;
    } });
    var function_1 = _function;
    Object.defineProperty(exports, "functionProp", { enumerable: true, get: function() {
      return function_1.functionProp;
    } });
    var oneOf_12 = oneOf;
    Object.defineProperty(exports, "oneOfProp", { enumerable: true, get: function() {
      return oneOf_12.oneOfProp;
    } });
    var oneOfObjectKeys_1 = oneOfObjectKeys;
    Object.defineProperty(exports, "oneOfObjectKeysProp", { enumerable: true, get: function() {
      return oneOfObjectKeys_1.oneOfObjectKeysProp;
    } });
    var oneOfTypes_1 = oneOfTypes;
    Object.defineProperty(exports, "oneOfTypesProp", { enumerable: true, get: function() {
      return oneOfTypes_1.oneOfTypesProp;
    } });
    var instanceOf_1 = instanceOf;
    Object.defineProperty(exports, "instanceOfProp", { enumerable: true, get: function() {
      return instanceOf_1.instanceOfProp;
    } });
    var isNegative_1 = isNegative$1;
    Object.defineProperty(exports, "isNegative", { enumerable: true, get: function() {
      return isNegative_1.isNegative;
    } });
    var isPositive_1 = isPositive$1;
    Object.defineProperty(exports, "isPositive", { enumerable: true, get: function() {
      return isPositive_1.isPositive;
    } });
    var isNonNegative_1 = isNonNegative$1;
    Object.defineProperty(exports, "isNonNegative", { enumerable: true, get: function() {
      return isNonNegative_1.isNonNegative;
    } });
    var isNonPositive_1 = isNonPositive$1;
    Object.defineProperty(exports, "isNonPositive", { enumerable: true, get: function() {
      return isNonPositive_1.isNonPositive;
    } });
  })(dist);
  class Editor extends Editor$1 {
    constructor() {
      super(...arguments);
      this.contentComponent = null;
    }
  }
  const EditorContent = {
    name: "EditorContent",
    props: {
      editor: {
        default: null,
        type: Object
      }
    },
    watch: {
      editor: {
        immediate: true,
        handler(editor) {
          if (editor && editor.options.element) {
            this.$nextTick(() => {
              const element = this.$el;
              if (!element || !editor.options.element.firstChild) {
                return;
              }
              element.append(...editor.options.element.childNodes);
              editor.contentComponent = this;
              editor.setOptions({
                element
              });
              editor.createNodeViews();
            });
          }
        }
      }
    },
    render(createElement) {
      return createElement("div");
    },
    beforeDestroy() {
      const { editor } = this;
      if (!editor) {
        return;
      }
      if (!editor.isDestroyed) {
        editor.view.setProps({
          nodeViews: {}
        });
      }
      editor.contentComponent = null;
      if (!editor.options.element.firstChild) {
        return;
      }
      const newElement = document.createElement("div");
      newElement.append(...editor.options.element.childNodes);
      editor.setOptions({
        element: newElement
      });
    }
  };
  ({
    editor: dist.objectProp().required,
    node: dist.objectProp().required,
    decorations: dist.objectProp().required,
    selected: dist.booleanProp().required,
    extension: dist.objectProp().required,
    getPos: dist.functionProp().required,
    updateAttributes: dist.functionProp().required,
    deleteNode: dist.functionProp().required
  });
  const inputRegex$4 = /^\s*>\s$/;
  const Blockquote = Node.create({
    name: "blockquote",
    addOptions() {
      return {
        HTMLAttributes: {}
      };
    },
    content: "block+",
    group: "block",
    defining: true,
    parseHTML() {
      return [
        { tag: "blockquote" }
      ];
    },
    renderHTML({ HTMLAttributes }) {
      return ["blockquote", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
    },
    addCommands() {
      return {
        setBlockquote: () => ({ commands: commands2 }) => {
          return commands2.wrapIn(this.name);
        },
        toggleBlockquote: () => ({ commands: commands2 }) => {
          return commands2.toggleWrap(this.name);
        },
        unsetBlockquote: () => ({ commands: commands2 }) => {
          return commands2.lift(this.name);
        }
      };
    },
    addKeyboardShortcuts() {
      return {
        "Mod-Shift-b": () => this.editor.commands.toggleBlockquote()
      };
    },
    addInputRules() {
      return [
        wrappingInputRule({
          find: inputRegex$4,
          type: this.type
        })
      ];
    }
  });
  const starInputRegex$1 = /(?:^|\s)(\*\*(?!\s+\*\*)((?:[^*]+))\*\*(?!\s+\*\*))$/;
  const starPasteRegex$1 = /(?:^|\s)(\*\*(?!\s+\*\*)((?:[^*]+))\*\*(?!\s+\*\*))/g;
  const underscoreInputRegex$1 = /(?:^|\s)(__(?!\s+__)((?:[^_]+))__(?!\s+__))$/;
  const underscorePasteRegex$1 = /(?:^|\s)(__(?!\s+__)((?:[^_]+))__(?!\s+__))/g;
  const Bold = Mark.create({
    name: "bold",
    addOptions() {
      return {
        HTMLAttributes: {}
      };
    },
    parseHTML() {
      return [
        {
          tag: "strong"
        },
        {
          tag: "b",
          getAttrs: (node) => node.style.fontWeight !== "normal" && null
        },
        {
          style: "font-weight=400",
          clearMark: (mark) => mark.type.name === this.name
        },
        {
          style: "font-weight",
          getAttrs: (value) => /^(bold(er)?|[5-9]\d{2,})$/.test(value) && null
        }
      ];
    },
    renderHTML({ HTMLAttributes }) {
      return ["strong", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
    },
    addCommands() {
      return {
        setBold: () => ({ commands: commands2 }) => {
          return commands2.setMark(this.name);
        },
        toggleBold: () => ({ commands: commands2 }) => {
          return commands2.toggleMark(this.name);
        },
        unsetBold: () => ({ commands: commands2 }) => {
          return commands2.unsetMark(this.name);
        }
      };
    },
    addKeyboardShortcuts() {
      return {
        "Mod-b": () => this.editor.commands.toggleBold(),
        "Mod-B": () => this.editor.commands.toggleBold()
      };
    },
    addInputRules() {
      return [
        markInputRule({
          find: starInputRegex$1,
          type: this.type
        }),
        markInputRule({
          find: underscoreInputRegex$1,
          type: this.type
        })
      ];
    },
    addPasteRules() {
      return [
        markPasteRule({
          find: starPasteRegex$1,
          type: this.type
        }),
        markPasteRule({
          find: underscorePasteRegex$1,
          type: this.type
        })
      ];
    }
  });
  const ListItemName$1 = "listItem";
  const TextStyleName$1 = "textStyle";
  const inputRegex$3 = /^\s*([-+*])\s$/;
  const BulletList = Node.create({
    name: "bulletList",
    addOptions() {
      return {
        itemTypeName: "listItem",
        HTMLAttributes: {},
        keepMarks: false,
        keepAttributes: false
      };
    },
    group: "block list",
    content() {
      return `${this.options.itemTypeName}+`;
    },
    parseHTML() {
      return [
        { tag: "ul" }
      ];
    },
    renderHTML({ HTMLAttributes }) {
      return ["ul", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
    },
    addCommands() {
      return {
        toggleBulletList: () => ({ commands: commands2, chain }) => {
          if (this.options.keepAttributes) {
            return chain().toggleList(this.name, this.options.itemTypeName, this.options.keepMarks).updateAttributes(ListItemName$1, this.editor.getAttributes(TextStyleName$1)).run();
          }
          return commands2.toggleList(this.name, this.options.itemTypeName, this.options.keepMarks);
        }
      };
    },
    addKeyboardShortcuts() {
      return {
        "Mod-Shift-8": () => this.editor.commands.toggleBulletList()
      };
    },
    addInputRules() {
      let inputRule = wrappingInputRule({
        find: inputRegex$3,
        type: this.type
      });
      if (this.options.keepMarks || this.options.keepAttributes) {
        inputRule = wrappingInputRule({
          find: inputRegex$3,
          type: this.type,
          keepMarks: this.options.keepMarks,
          keepAttributes: this.options.keepAttributes,
          getAttributes: () => {
            return this.editor.getAttributes(TextStyleName$1);
          },
          editor: this.editor
        });
      }
      return [
        inputRule
      ];
    }
  });
  const inputRegex$2 = new RegExp("(?<!`)`([^`]+)`(?!`)");
  const pasteRegex$1 = new RegExp("(?<!`)`([^`]+)`(?!`)", "g");
  const Code = Mark.create({
    name: "code",
    addOptions() {
      return {
        HTMLAttributes: {}
      };
    },
    excludes: "_",
    code: true,
    exitable: true,
    parseHTML() {
      return [
        { tag: "code" }
      ];
    },
    renderHTML({ HTMLAttributes }) {
      return ["code", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
    },
    addCommands() {
      return {
        setCode: () => ({ commands: commands2 }) => {
          return commands2.setMark(this.name);
        },
        toggleCode: () => ({ commands: commands2 }) => {
          return commands2.toggleMark(this.name);
        },
        unsetCode: () => ({ commands: commands2 }) => {
          return commands2.unsetMark(this.name);
        }
      };
    },
    addKeyboardShortcuts() {
      return {
        "Mod-e": () => this.editor.commands.toggleCode()
      };
    },
    addInputRules() {
      return [
        markInputRule({
          find: inputRegex$2,
          type: this.type
        })
      ];
    },
    addPasteRules() {
      return [
        markPasteRule({
          find: pasteRegex$1,
          type: this.type
        })
      ];
    }
  });
  const backtickInputRegex = /^```([a-z]+)?[\s\n]$/;
  const tildeInputRegex = /^~~~([a-z]+)?[\s\n]$/;
  const CodeBlock = Node.create({
    name: "codeBlock",
    addOptions() {
      return {
        languageClassPrefix: "language-",
        exitOnTripleEnter: true,
        exitOnArrowDown: true,
        defaultLanguage: null,
        HTMLAttributes: {}
      };
    },
    content: "text*",
    marks: "",
    group: "block",
    code: true,
    defining: true,
    addAttributes() {
      return {
        language: {
          default: this.options.defaultLanguage,
          parseHTML: (element) => {
            var _a;
            const { languageClassPrefix } = this.options;
            const classNames = [...((_a = element.firstElementChild) === null || _a === void 0 ? void 0 : _a.classList) || []];
            const languages = classNames.filter((className) => className.startsWith(languageClassPrefix)).map((className) => className.replace(languageClassPrefix, ""));
            const language = languages[0];
            if (!language) {
              return null;
            }
            return language;
          },
          rendered: false
        }
      };
    },
    parseHTML() {
      return [
        {
          tag: "pre",
          preserveWhitespace: "full"
        }
      ];
    },
    renderHTML({ node, HTMLAttributes }) {
      return [
        "pre",
        mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
        [
          "code",
          {
            class: node.attrs.language ? this.options.languageClassPrefix + node.attrs.language : null
          },
          0
        ]
      ];
    },
    addCommands() {
      return {
        setCodeBlock: (attributes) => ({ commands: commands2 }) => {
          return commands2.setNode(this.name, attributes);
        },
        toggleCodeBlock: (attributes) => ({ commands: commands2 }) => {
          return commands2.toggleNode(this.name, "paragraph", attributes);
        }
      };
    },
    addKeyboardShortcuts() {
      return {
        "Mod-Alt-c": () => this.editor.commands.toggleCodeBlock(),
        // remove code block when at start of document or code block is empty
        Backspace: () => {
          const { empty: empty2, $anchor } = this.editor.state.selection;
          const isAtStart = $anchor.pos === 1;
          if (!empty2 || $anchor.parent.type.name !== this.name) {
            return false;
          }
          if (isAtStart || !$anchor.parent.textContent.length) {
            return this.editor.commands.clearNodes();
          }
          return false;
        },
        // exit node on triple enter
        Enter: ({ editor }) => {
          if (!this.options.exitOnTripleEnter) {
            return false;
          }
          const { state } = editor;
          const { selection } = state;
          const { $from, empty: empty2 } = selection;
          if (!empty2 || $from.parent.type !== this.type) {
            return false;
          }
          const isAtEnd = $from.parentOffset === $from.parent.nodeSize - 2;
          const endsWithDoubleNewline = $from.parent.textContent.endsWith("\n\n");
          if (!isAtEnd || !endsWithDoubleNewline) {
            return false;
          }
          return editor.chain().command(({ tr: tr2 }) => {
            tr2.delete($from.pos - 2, $from.pos);
            return true;
          }).exitCode().run();
        },
        // exit node on arrow down
        ArrowDown: ({ editor }) => {
          if (!this.options.exitOnArrowDown) {
            return false;
          }
          const { state } = editor;
          const { selection, doc: doc2 } = state;
          const { $from, empty: empty2 } = selection;
          if (!empty2 || $from.parent.type !== this.type) {
            return false;
          }
          const isAtEnd = $from.parentOffset === $from.parent.nodeSize - 2;
          if (!isAtEnd) {
            return false;
          }
          const after = $from.after();
          if (after === void 0) {
            return false;
          }
          const nodeAfter = doc2.nodeAt(after);
          if (nodeAfter) {
            return editor.commands.command(({ tr: tr2 }) => {
              tr2.setSelection(Selection.near(doc2.resolve(after)));
              return true;
            });
          }
          return editor.commands.exitCode();
        }
      };
    },
    addInputRules() {
      return [
        textblockTypeInputRule({
          find: backtickInputRegex,
          type: this.type,
          getAttributes: (match) => ({
            language: match[1]
          })
        }),
        textblockTypeInputRule({
          find: tildeInputRegex,
          type: this.type,
          getAttributes: (match) => ({
            language: match[1]
          })
        })
      ];
    },
    addProseMirrorPlugins() {
      return [
        // this plugin creates a code block for pasted content from VS Code
        // we can also detect the copied code language
        new Plugin({
          key: new PluginKey("codeBlockVSCodeHandler"),
          props: {
            handlePaste: (view, event) => {
              if (!event.clipboardData) {
                return false;
              }
              if (this.editor.isActive(this.type.name)) {
                return false;
              }
              const text = event.clipboardData.getData("text/plain");
              const vscode = event.clipboardData.getData("vscode-editor-data");
              const vscodeData = vscode ? JSON.parse(vscode) : void 0;
              const language = vscodeData === null || vscodeData === void 0 ? void 0 : vscodeData.mode;
              if (!text || !language) {
                return false;
              }
              const { tr: tr2, schema } = view.state;
              const textNode = schema.text(text.replace(/\r\n?/g, "\n"));
              tr2.replaceSelectionWith(this.type.create({ language }, textNode));
              if (tr2.selection.$from.parent.type !== this.type) {
                tr2.setSelection(TextSelection.near(tr2.doc.resolve(Math.max(0, tr2.selection.from - 2))));
              }
              tr2.setMeta("paste", true);
              view.dispatch(tr2);
              return true;
            }
          }
        })
      ];
    }
  });
  const Document = Node.create({
    name: "doc",
    topNode: true,
    content: "block+"
  });
  function dropCursor(options = {}) {
    return new Plugin({
      view(editorView) {
        return new DropCursorView(editorView, options);
      }
    });
  }
  class DropCursorView {
    constructor(editorView, options) {
      var _a;
      this.editorView = editorView;
      this.cursorPos = null;
      this.element = null;
      this.timeout = -1;
      this.width = (_a = options.width) !== null && _a !== void 0 ? _a : 1;
      this.color = options.color === false ? void 0 : options.color || "black";
      this.class = options.class;
      this.handlers = ["dragover", "dragend", "drop", "dragleave"].map((name) => {
        let handler = (e) => {
          this[name](e);
        };
        editorView.dom.addEventListener(name, handler);
        return { name, handler };
      });
    }
    destroy() {
      this.handlers.forEach(({ name, handler }) => this.editorView.dom.removeEventListener(name, handler));
    }
    update(editorView, prevState) {
      if (this.cursorPos != null && prevState.doc != editorView.state.doc) {
        if (this.cursorPos > editorView.state.doc.content.size)
          this.setCursor(null);
        else
          this.updateOverlay();
      }
    }
    setCursor(pos) {
      if (pos == this.cursorPos)
        return;
      this.cursorPos = pos;
      if (pos == null) {
        this.element.parentNode.removeChild(this.element);
        this.element = null;
      } else {
        this.updateOverlay();
      }
    }
    updateOverlay() {
      let $pos = this.editorView.state.doc.resolve(this.cursorPos);
      let isBlock = !$pos.parent.inlineContent, rect;
      if (isBlock) {
        let before = $pos.nodeBefore, after = $pos.nodeAfter;
        if (before || after) {
          let node = this.editorView.nodeDOM(this.cursorPos - (before ? before.nodeSize : 0));
          if (node) {
            let nodeRect = node.getBoundingClientRect();
            let top = before ? nodeRect.bottom : nodeRect.top;
            if (before && after)
              top = (top + this.editorView.nodeDOM(this.cursorPos).getBoundingClientRect().top) / 2;
            rect = { left: nodeRect.left, right: nodeRect.right, top: top - this.width / 2, bottom: top + this.width / 2 };
          }
        }
      }
      if (!rect) {
        let coords = this.editorView.coordsAtPos(this.cursorPos);
        rect = { left: coords.left - this.width / 2, right: coords.left + this.width / 2, top: coords.top, bottom: coords.bottom };
      }
      let parent = this.editorView.dom.offsetParent;
      if (!this.element) {
        this.element = parent.appendChild(document.createElement("div"));
        if (this.class)
          this.element.className = this.class;
        this.element.style.cssText = "position: absolute; z-index: 50; pointer-events: none;";
        if (this.color) {
          this.element.style.backgroundColor = this.color;
        }
      }
      this.element.classList.toggle("prosemirror-dropcursor-block", isBlock);
      this.element.classList.toggle("prosemirror-dropcursor-inline", !isBlock);
      let parentLeft, parentTop;
      if (!parent || parent == document.body && getComputedStyle(parent).position == "static") {
        parentLeft = -pageXOffset;
        parentTop = -pageYOffset;
      } else {
        let rect2 = parent.getBoundingClientRect();
        parentLeft = rect2.left - parent.scrollLeft;
        parentTop = rect2.top - parent.scrollTop;
      }
      this.element.style.left = rect.left - parentLeft + "px";
      this.element.style.top = rect.top - parentTop + "px";
      this.element.style.width = rect.right - rect.left + "px";
      this.element.style.height = rect.bottom - rect.top + "px";
    }
    scheduleRemoval(timeout) {
      clearTimeout(this.timeout);
      this.timeout = setTimeout(() => this.setCursor(null), timeout);
    }
    dragover(event) {
      if (!this.editorView.editable)
        return;
      let pos = this.editorView.posAtCoords({ left: event.clientX, top: event.clientY });
      let node = pos && pos.inside >= 0 && this.editorView.state.doc.nodeAt(pos.inside);
      let disableDropCursor = node && node.type.spec.disableDropCursor;
      let disabled = typeof disableDropCursor == "function" ? disableDropCursor(this.editorView, pos, event) : disableDropCursor;
      if (pos && !disabled) {
        let target = pos.pos;
        if (this.editorView.dragging && this.editorView.dragging.slice) {
          let point = dropPoint(this.editorView.state.doc, target, this.editorView.dragging.slice);
          if (point != null)
            target = point;
        }
        this.setCursor(target);
        this.scheduleRemoval(5e3);
      }
    }
    dragend() {
      this.scheduleRemoval(20);
    }
    drop() {
      this.scheduleRemoval(20);
    }
    dragleave(event) {
      if (event.target == this.editorView.dom || !this.editorView.dom.contains(event.relatedTarget))
        this.setCursor(null);
    }
  }
  const Dropcursor = Extension.create({
    name: "dropCursor",
    addOptions() {
      return {
        color: "currentColor",
        width: 1,
        class: void 0
      };
    },
    addProseMirrorPlugins() {
      return [
        dropCursor(this.options)
      ];
    }
  });
  class GapCursor extends Selection {
    /**
    Create a gap cursor.
    */
    constructor($pos) {
      super($pos, $pos);
    }
    map(doc2, mapping) {
      let $pos = doc2.resolve(mapping.map(this.head));
      return GapCursor.valid($pos) ? new GapCursor($pos) : Selection.near($pos);
    }
    content() {
      return Slice.empty;
    }
    eq(other) {
      return other instanceof GapCursor && other.head == this.head;
    }
    toJSON() {
      return { type: "gapcursor", pos: this.head };
    }
    /**
    @internal
    */
    static fromJSON(doc2, json) {
      if (typeof json.pos != "number")
        throw new RangeError("Invalid input for GapCursor.fromJSON");
      return new GapCursor(doc2.resolve(json.pos));
    }
    /**
    @internal
    */
    getBookmark() {
      return new GapBookmark(this.anchor);
    }
    /**
    @internal
    */
    static valid($pos) {
      let parent = $pos.parent;
      if (parent.isTextblock || !closedBefore($pos) || !closedAfter($pos))
        return false;
      let override = parent.type.spec.allowGapCursor;
      if (override != null)
        return override;
      let deflt = parent.contentMatchAt($pos.index()).defaultType;
      return deflt && deflt.isTextblock;
    }
    /**
    @internal
    */
    static findGapCursorFrom($pos, dir, mustMove = false) {
      search: for (; ; ) {
        if (!mustMove && GapCursor.valid($pos))
          return $pos;
        let pos = $pos.pos, next = null;
        for (let d2 = $pos.depth; ; d2--) {
          let parent = $pos.node(d2);
          if (dir > 0 ? $pos.indexAfter(d2) < parent.childCount : $pos.index(d2) > 0) {
            next = parent.child(dir > 0 ? $pos.indexAfter(d2) : $pos.index(d2) - 1);
            break;
          } else if (d2 == 0) {
            return null;
          }
          pos += dir;
          let $cur = $pos.doc.resolve(pos);
          if (GapCursor.valid($cur))
            return $cur;
        }
        for (; ; ) {
          let inside = dir > 0 ? next.firstChild : next.lastChild;
          if (!inside) {
            if (next.isAtom && !next.isText && !NodeSelection.isSelectable(next)) {
              $pos = $pos.doc.resolve(pos + next.nodeSize * dir);
              mustMove = false;
              continue search;
            }
            break;
          }
          next = inside;
          pos += dir;
          let $cur = $pos.doc.resolve(pos);
          if (GapCursor.valid($cur))
            return $cur;
        }
        return null;
      }
    }
  }
  GapCursor.prototype.visible = false;
  GapCursor.findFrom = GapCursor.findGapCursorFrom;
  Selection.jsonID("gapcursor", GapCursor);
  class GapBookmark {
    constructor(pos) {
      this.pos = pos;
    }
    map(mapping) {
      return new GapBookmark(mapping.map(this.pos));
    }
    resolve(doc2) {
      let $pos = doc2.resolve(this.pos);
      return GapCursor.valid($pos) ? new GapCursor($pos) : Selection.near($pos);
    }
  }
  function closedBefore($pos) {
    for (let d2 = $pos.depth; d2 >= 0; d2--) {
      let index = $pos.index(d2), parent = $pos.node(d2);
      if (index == 0) {
        if (parent.type.spec.isolating)
          return true;
        continue;
      }
      for (let before = parent.child(index - 1); ; before = before.lastChild) {
        if (before.childCount == 0 && !before.inlineContent || before.isAtom || before.type.spec.isolating)
          return true;
        if (before.inlineContent)
          return false;
      }
    }
    return true;
  }
  function closedAfter($pos) {
    for (let d2 = $pos.depth; d2 >= 0; d2--) {
      let index = $pos.indexAfter(d2), parent = $pos.node(d2);
      if (index == parent.childCount) {
        if (parent.type.spec.isolating)
          return true;
        continue;
      }
      for (let after = parent.child(index); ; after = after.firstChild) {
        if (after.childCount == 0 && !after.inlineContent || after.isAtom || after.type.spec.isolating)
          return true;
        if (after.inlineContent)
          return false;
      }
    }
    return true;
  }
  function gapCursor() {
    return new Plugin({
      props: {
        decorations: drawGapCursor,
        createSelectionBetween(_view, $anchor, $head) {
          return $anchor.pos == $head.pos && GapCursor.valid($head) ? new GapCursor($head) : null;
        },
        handleClick,
        handleKeyDown,
        handleDOMEvents: { beforeinput }
      }
    });
  }
  const handleKeyDown = keydownHandler({
    "ArrowLeft": arrow("horiz", -1),
    "ArrowRight": arrow("horiz", 1),
    "ArrowUp": arrow("vert", -1),
    "ArrowDown": arrow("vert", 1)
  });
  function arrow(axis, dir) {
    const dirStr = axis == "vert" ? dir > 0 ? "down" : "up" : dir > 0 ? "right" : "left";
    return function(state, dispatch, view) {
      let sel = state.selection;
      let $start = dir > 0 ? sel.$to : sel.$from, mustMove = sel.empty;
      if (sel instanceof TextSelection) {
        if (!view.endOfTextblock(dirStr) || $start.depth == 0)
          return false;
        mustMove = false;
        $start = state.doc.resolve(dir > 0 ? $start.after() : $start.before());
      }
      let $found = GapCursor.findGapCursorFrom($start, dir, mustMove);
      if (!$found)
        return false;
      if (dispatch)
        dispatch(state.tr.setSelection(new GapCursor($found)));
      return true;
    };
  }
  function handleClick(view, pos, event) {
    if (!view || !view.editable)
      return false;
    let $pos = view.state.doc.resolve(pos);
    if (!GapCursor.valid($pos))
      return false;
    let clickPos = view.posAtCoords({ left: event.clientX, top: event.clientY });
    if (clickPos && clickPos.inside > -1 && NodeSelection.isSelectable(view.state.doc.nodeAt(clickPos.inside)))
      return false;
    view.dispatch(view.state.tr.setSelection(new GapCursor($pos)));
    return true;
  }
  function beforeinput(view, event) {
    if (event.inputType != "insertCompositionText" || !(view.state.selection instanceof GapCursor))
      return false;
    let { $from } = view.state.selection;
    let insert = $from.parent.contentMatchAt($from.index()).findWrapping(view.state.schema.nodes.text);
    if (!insert)
      return false;
    let frag = Fragment.empty;
    for (let i2 = insert.length - 1; i2 >= 0; i2--)
      frag = Fragment.from(insert[i2].createAndFill(null, frag));
    let tr2 = view.state.tr.replace($from.pos, $from.pos, new Slice(frag, 0, 0));
    tr2.setSelection(TextSelection.near(tr2.doc.resolve($from.pos + 1)));
    view.dispatch(tr2);
    return false;
  }
  function drawGapCursor(state) {
    if (!(state.selection instanceof GapCursor))
      return null;
    let node = document.createElement("div");
    node.className = "ProseMirror-gapcursor";
    return DecorationSet.create(state.doc, [Decoration.widget(state.selection.head, node, { key: "gapcursor" })]);
  }
  const Gapcursor = Extension.create({
    name: "gapCursor",
    addProseMirrorPlugins() {
      return [
        gapCursor()
      ];
    },
    extendNodeSchema(extension) {
      var _a;
      const context = {
        name: extension.name,
        options: extension.options,
        storage: extension.storage
      };
      return {
        allowGapCursor: (_a = callOrReturn(getExtensionField(extension, "allowGapCursor", context))) !== null && _a !== void 0 ? _a : null
      };
    }
  });
  const HardBreak = Node.create({
    name: "hardBreak",
    addOptions() {
      return {
        keepMarks: true,
        HTMLAttributes: {}
      };
    },
    inline: true,
    group: "inline",
    selectable: false,
    linebreakReplacement: true,
    parseHTML() {
      return [
        { tag: "br" }
      ];
    },
    renderHTML({ HTMLAttributes }) {
      return ["br", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)];
    },
    renderText() {
      return "\n";
    },
    addCommands() {
      return {
        setHardBreak: () => ({ commands: commands2, chain, state, editor }) => {
          return commands2.first([
            () => commands2.exitCode(),
            () => commands2.command(() => {
              const { selection, storedMarks } = state;
              if (selection.$from.parent.type.spec.isolating) {
                return false;
              }
              const { keepMarks } = this.options;
              const { splittableMarks } = editor.extensionManager;
              const marks = storedMarks || selection.$to.parentOffset && selection.$from.marks();
              return chain().insertContent({ type: this.name }).command(({ tr: tr2, dispatch }) => {
                if (dispatch && marks && keepMarks) {
                  const filteredMarks = marks.filter((mark) => splittableMarks.includes(mark.type.name));
                  tr2.ensureMarks(filteredMarks);
                }
                return true;
              }).run();
            })
          ]);
        }
      };
    },
    addKeyboardShortcuts() {
      return {
        "Mod-Enter": () => this.editor.commands.setHardBreak(),
        "Shift-Enter": () => this.editor.commands.setHardBreak()
      };
    }
  });
  const Heading = Node.create({
    name: "heading",
    addOptions() {
      return {
        levels: [1, 2, 3, 4, 5, 6],
        HTMLAttributes: {}
      };
    },
    content: "inline*",
    group: "block",
    defining: true,
    addAttributes() {
      return {
        level: {
          default: 1,
          rendered: false
        }
      };
    },
    parseHTML() {
      return this.options.levels.map((level) => ({
        tag: `h${level}`,
        attrs: { level }
      }));
    },
    renderHTML({ node, HTMLAttributes }) {
      const hasLevel = this.options.levels.includes(node.attrs.level);
      const level = hasLevel ? node.attrs.level : this.options.levels[0];
      return [`h${level}`, mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
    },
    addCommands() {
      return {
        setHeading: (attributes) => ({ commands: commands2 }) => {
          if (!this.options.levels.includes(attributes.level)) {
            return false;
          }
          return commands2.setNode(this.name, attributes);
        },
        toggleHeading: (attributes) => ({ commands: commands2 }) => {
          if (!this.options.levels.includes(attributes.level)) {
            return false;
          }
          return commands2.toggleNode(this.name, "paragraph", attributes);
        }
      };
    },
    addKeyboardShortcuts() {
      return this.options.levels.reduce((items, level) => ({
        ...items,
        ...{
          [`Mod-Alt-${level}`]: () => this.editor.commands.toggleHeading({ level })
        }
      }), {});
    },
    addInputRules() {
      return this.options.levels.map((level) => {
        return textblockTypeInputRule({
          find: new RegExp(`^(#{1,${level}})\\s$`),
          type: this.type,
          getAttributes: {
            level
          }
        });
      });
    }
  });
  var GOOD_LEAF_SIZE = 200;
  var RopeSequence = function RopeSequence2() {
  };
  RopeSequence.prototype.append = function append(other) {
    if (!other.length) {
      return this;
    }
    other = RopeSequence.from(other);
    return !this.length && other || other.length < GOOD_LEAF_SIZE && this.leafAppend(other) || this.length < GOOD_LEAF_SIZE && other.leafPrepend(this) || this.appendInner(other);
  };
  RopeSequence.prototype.prepend = function prepend(other) {
    if (!other.length) {
      return this;
    }
    return RopeSequence.from(other).append(this);
  };
  RopeSequence.prototype.appendInner = function appendInner(other) {
    return new Append(this, other);
  };
  RopeSequence.prototype.slice = function slice(from, to) {
    if (from === void 0) from = 0;
    if (to === void 0) to = this.length;
    if (from >= to) {
      return RopeSequence.empty;
    }
    return this.sliceInner(Math.max(0, from), Math.min(this.length, to));
  };
  RopeSequence.prototype.get = function get(i2) {
    if (i2 < 0 || i2 >= this.length) {
      return void 0;
    }
    return this.getInner(i2);
  };
  RopeSequence.prototype.forEach = function forEach2(f, from, to) {
    if (from === void 0) from = 0;
    if (to === void 0) to = this.length;
    if (from <= to) {
      this.forEachInner(f, from, to, 0);
    } else {
      this.forEachInvertedInner(f, from, to, 0);
    }
  };
  RopeSequence.prototype.map = function map(f, from, to) {
    if (from === void 0) from = 0;
    if (to === void 0) to = this.length;
    var result = [];
    this.forEach(function(elt, i2) {
      return result.push(f(elt, i2));
    }, from, to);
    return result;
  };
  RopeSequence.from = function from(values) {
    if (values instanceof RopeSequence) {
      return values;
    }
    return values && values.length ? new Leaf(values) : RopeSequence.empty;
  };
  var Leaf = /* @__PURE__ */ function(RopeSequence2) {
    function Leaf2(values) {
      RopeSequence2.call(this);
      this.values = values;
    }
    if (RopeSequence2) Leaf2.__proto__ = RopeSequence2;
    Leaf2.prototype = Object.create(RopeSequence2 && RopeSequence2.prototype);
    Leaf2.prototype.constructor = Leaf2;
    var prototypeAccessors = { length: { configurable: true }, depth: { configurable: true } };
    Leaf2.prototype.flatten = function flatten() {
      return this.values;
    };
    Leaf2.prototype.sliceInner = function sliceInner(from, to) {
      if (from == 0 && to == this.length) {
        return this;
      }
      return new Leaf2(this.values.slice(from, to));
    };
    Leaf2.prototype.getInner = function getInner(i2) {
      return this.values[i2];
    };
    Leaf2.prototype.forEachInner = function forEachInner(f, from, to, start) {
      for (var i2 = from; i2 < to; i2++) {
        if (f(this.values[i2], start + i2) === false) {
          return false;
        }
      }
    };
    Leaf2.prototype.forEachInvertedInner = function forEachInvertedInner(f, from, to, start) {
      for (var i2 = from - 1; i2 >= to; i2--) {
        if (f(this.values[i2], start + i2) === false) {
          return false;
        }
      }
    };
    Leaf2.prototype.leafAppend = function leafAppend(other) {
      if (this.length + other.length <= GOOD_LEAF_SIZE) {
        return new Leaf2(this.values.concat(other.flatten()));
      }
    };
    Leaf2.prototype.leafPrepend = function leafPrepend(other) {
      if (this.length + other.length <= GOOD_LEAF_SIZE) {
        return new Leaf2(other.flatten().concat(this.values));
      }
    };
    prototypeAccessors.length.get = function() {
      return this.values.length;
    };
    prototypeAccessors.depth.get = function() {
      return 0;
    };
    Object.defineProperties(Leaf2.prototype, prototypeAccessors);
    return Leaf2;
  }(RopeSequence);
  RopeSequence.empty = new Leaf([]);
  var Append = /* @__PURE__ */ function(RopeSequence2) {
    function Append2(left, right) {
      RopeSequence2.call(this);
      this.left = left;
      this.right = right;
      this.length = left.length + right.length;
      this.depth = Math.max(left.depth, right.depth) + 1;
    }
    if (RopeSequence2) Append2.__proto__ = RopeSequence2;
    Append2.prototype = Object.create(RopeSequence2 && RopeSequence2.prototype);
    Append2.prototype.constructor = Append2;
    Append2.prototype.flatten = function flatten() {
      return this.left.flatten().concat(this.right.flatten());
    };
    Append2.prototype.getInner = function getInner(i2) {
      return i2 < this.left.length ? this.left.get(i2) : this.right.get(i2 - this.left.length);
    };
    Append2.prototype.forEachInner = function forEachInner(f, from, to, start) {
      var leftLen = this.left.length;
      if (from < leftLen && this.left.forEachInner(f, from, Math.min(to, leftLen), start) === false) {
        return false;
      }
      if (to > leftLen && this.right.forEachInner(f, Math.max(from - leftLen, 0), Math.min(this.length, to) - leftLen, start + leftLen) === false) {
        return false;
      }
    };
    Append2.prototype.forEachInvertedInner = function forEachInvertedInner(f, from, to, start) {
      var leftLen = this.left.length;
      if (from > leftLen && this.right.forEachInvertedInner(f, from - leftLen, Math.max(to, leftLen) - leftLen, start + leftLen) === false) {
        return false;
      }
      if (to < leftLen && this.left.forEachInvertedInner(f, Math.min(from, leftLen), to, start) === false) {
        return false;
      }
    };
    Append2.prototype.sliceInner = function sliceInner(from, to) {
      if (from == 0 && to == this.length) {
        return this;
      }
      var leftLen = this.left.length;
      if (to <= leftLen) {
        return this.left.slice(from, to);
      }
      if (from >= leftLen) {
        return this.right.slice(from - leftLen, to - leftLen);
      }
      return this.left.slice(from, leftLen).append(this.right.slice(0, to - leftLen));
    };
    Append2.prototype.leafAppend = function leafAppend(other) {
      var inner = this.right.leafAppend(other);
      if (inner) {
        return new Append2(this.left, inner);
      }
    };
    Append2.prototype.leafPrepend = function leafPrepend(other) {
      var inner = this.left.leafPrepend(other);
      if (inner) {
        return new Append2(inner, this.right);
      }
    };
    Append2.prototype.appendInner = function appendInner(other) {
      if (this.left.depth >= Math.max(this.right.depth, other.depth) + 1) {
        return new Append2(this.left, new Append2(this.right, other));
      }
      return new Append2(this, other);
    };
    return Append2;
  }(RopeSequence);
  const max_empty_items = 500;
  class Branch {
    constructor(items, eventCount) {
      this.items = items;
      this.eventCount = eventCount;
    }
    // Pop the latest event off the branch's history and apply it
    // to a document transform.
    popEvent(state, preserveItems) {
      if (this.eventCount == 0)
        return null;
      let end = this.items.length;
      for (; ; end--) {
        let next = this.items.get(end - 1);
        if (next.selection) {
          --end;
          break;
        }
      }
      let remap, mapFrom;
      if (preserveItems) {
        remap = this.remapping(end, this.items.length);
        mapFrom = remap.maps.length;
      }
      let transform = state.tr;
      let selection, remaining;
      let addAfter = [], addBefore = [];
      this.items.forEach((item, i2) => {
        if (!item.step) {
          if (!remap) {
            remap = this.remapping(end, i2 + 1);
            mapFrom = remap.maps.length;
          }
          mapFrom--;
          addBefore.push(item);
          return;
        }
        if (remap) {
          addBefore.push(new Item(item.map));
          let step = item.step.map(remap.slice(mapFrom)), map;
          if (step && transform.maybeStep(step).doc) {
            map = transform.mapping.maps[transform.mapping.maps.length - 1];
            addAfter.push(new Item(map, void 0, void 0, addAfter.length + addBefore.length));
          }
          mapFrom--;
          if (map)
            remap.appendMap(map, mapFrom);
        } else {
          transform.maybeStep(item.step);
        }
        if (item.selection) {
          selection = remap ? item.selection.map(remap.slice(mapFrom)) : item.selection;
          remaining = new Branch(this.items.slice(0, end).append(addBefore.reverse().concat(addAfter)), this.eventCount - 1);
          return false;
        }
      }, this.items.length, 0);
      return { remaining, transform, selection };
    }
    // Create a new branch with the given transform added.
    addTransform(transform, selection, histOptions, preserveItems) {
      let newItems = [], eventCount = this.eventCount;
      let oldItems = this.items, lastItem = !preserveItems && oldItems.length ? oldItems.get(oldItems.length - 1) : null;
      for (let i2 = 0; i2 < transform.steps.length; i2++) {
        let step = transform.steps[i2].invert(transform.docs[i2]);
        let item = new Item(transform.mapping.maps[i2], step, selection), merged;
        if (merged = lastItem && lastItem.merge(item)) {
          item = merged;
          if (i2)
            newItems.pop();
          else
            oldItems = oldItems.slice(0, oldItems.length - 1);
        }
        newItems.push(item);
        if (selection) {
          eventCount++;
          selection = void 0;
        }
        if (!preserveItems)
          lastItem = item;
      }
      let overflow = eventCount - histOptions.depth;
      if (overflow > DEPTH_OVERFLOW) {
        oldItems = cutOffEvents(oldItems, overflow);
        eventCount -= overflow;
      }
      return new Branch(oldItems.append(newItems), eventCount);
    }
    remapping(from, to) {
      let maps = new Mapping();
      this.items.forEach((item, i2) => {
        let mirrorPos = item.mirrorOffset != null && i2 - item.mirrorOffset >= from ? maps.maps.length - item.mirrorOffset : void 0;
        maps.appendMap(item.map, mirrorPos);
      }, from, to);
      return maps;
    }
    addMaps(array2) {
      if (this.eventCount == 0)
        return this;
      return new Branch(this.items.append(array2.map((map) => new Item(map))), this.eventCount);
    }
    // When the collab module receives remote changes, the history has
    // to know about those, so that it can adjust the steps that were
    // rebased on top of the remote changes, and include the position
    // maps for the remote changes in its array of items.
    rebased(rebasedTransform, rebasedCount) {
      if (!this.eventCount)
        return this;
      let rebasedItems = [], start = Math.max(0, this.items.length - rebasedCount);
      let mapping = rebasedTransform.mapping;
      let newUntil = rebasedTransform.steps.length;
      let eventCount = this.eventCount;
      this.items.forEach((item) => {
        if (item.selection)
          eventCount--;
      }, start);
      let iRebased = rebasedCount;
      this.items.forEach((item) => {
        let pos = mapping.getMirror(--iRebased);
        if (pos == null)
          return;
        newUntil = Math.min(newUntil, pos);
        let map = mapping.maps[pos];
        if (item.step) {
          let step = rebasedTransform.steps[pos].invert(rebasedTransform.docs[pos]);
          let selection = item.selection && item.selection.map(mapping.slice(iRebased + 1, pos));
          if (selection)
            eventCount++;
          rebasedItems.push(new Item(map, step, selection));
        } else {
          rebasedItems.push(new Item(map));
        }
      }, start);
      let newMaps = [];
      for (let i2 = rebasedCount; i2 < newUntil; i2++)
        newMaps.push(new Item(mapping.maps[i2]));
      let items = this.items.slice(0, start).append(newMaps).append(rebasedItems);
      let branch = new Branch(items, eventCount);
      if (branch.emptyItemCount() > max_empty_items)
        branch = branch.compress(this.items.length - rebasedItems.length);
      return branch;
    }
    emptyItemCount() {
      let count = 0;
      this.items.forEach((item) => {
        if (!item.step)
          count++;
      });
      return count;
    }
    // Compressing a branch means rewriting it to push the air (map-only
    // items) out. During collaboration, these naturally accumulate
    // because each remote change adds one. The `upto` argument is used
    // to ensure that only the items below a given level are compressed,
    // because `rebased` relies on a clean, untouched set of items in
    // order to associate old items with rebased steps.
    compress(upto = this.items.length) {
      let remap = this.remapping(0, upto), mapFrom = remap.maps.length;
      let items = [], events = 0;
      this.items.forEach((item, i2) => {
        if (i2 >= upto) {
          items.push(item);
          if (item.selection)
            events++;
        } else if (item.step) {
          let step = item.step.map(remap.slice(mapFrom)), map = step && step.getMap();
          mapFrom--;
          if (map)
            remap.appendMap(map, mapFrom);
          if (step) {
            let selection = item.selection && item.selection.map(remap.slice(mapFrom));
            if (selection)
              events++;
            let newItem = new Item(map.invert(), step, selection), merged, last = items.length - 1;
            if (merged = items.length && items[last].merge(newItem))
              items[last] = merged;
            else
              items.push(newItem);
          }
        } else if (item.map) {
          mapFrom--;
        }
      }, this.items.length, 0);
      return new Branch(RopeSequence.from(items.reverse()), events);
    }
  }
  Branch.empty = new Branch(RopeSequence.empty, 0);
  function cutOffEvents(items, n) {
    let cutPoint;
    items.forEach((item, i2) => {
      if (item.selection && n-- == 0) {
        cutPoint = i2;
        return false;
      }
    });
    return items.slice(cutPoint);
  }
  class Item {
    constructor(map, step, selection, mirrorOffset) {
      this.map = map;
      this.step = step;
      this.selection = selection;
      this.mirrorOffset = mirrorOffset;
    }
    merge(other) {
      if (this.step && other.step && !other.selection) {
        let step = other.step.merge(this.step);
        if (step)
          return new Item(step.getMap().invert(), step, this.selection);
      }
    }
  }
  class HistoryState {
    constructor(done, undone, prevRanges, prevTime, prevComposition) {
      this.done = done;
      this.undone = undone;
      this.prevRanges = prevRanges;
      this.prevTime = prevTime;
      this.prevComposition = prevComposition;
    }
  }
  const DEPTH_OVERFLOW = 20;
  function applyTransaction(history2, state, tr2, options) {
    let historyTr = tr2.getMeta(historyKey), rebased;
    if (historyTr)
      return historyTr.historyState;
    if (tr2.getMeta(closeHistoryKey))
      history2 = new HistoryState(history2.done, history2.undone, null, 0, -1);
    let appended = tr2.getMeta("appendedTransaction");
    if (tr2.steps.length == 0) {
      return history2;
    } else if (appended && appended.getMeta(historyKey)) {
      if (appended.getMeta(historyKey).redo)
        return new HistoryState(history2.done.addTransform(tr2, void 0, options, mustPreserveItems(state)), history2.undone, rangesFor(tr2.mapping.maps), history2.prevTime, history2.prevComposition);
      else
        return new HistoryState(history2.done, history2.undone.addTransform(tr2, void 0, options, mustPreserveItems(state)), null, history2.prevTime, history2.prevComposition);
    } else if (tr2.getMeta("addToHistory") !== false && !(appended && appended.getMeta("addToHistory") === false)) {
      let composition = tr2.getMeta("composition");
      let newGroup = history2.prevTime == 0 || !appended && history2.prevComposition != composition && (history2.prevTime < (tr2.time || 0) - options.newGroupDelay || !isAdjacentTo(tr2, history2.prevRanges));
      let prevRanges = appended ? mapRanges(history2.prevRanges, tr2.mapping) : rangesFor(tr2.mapping.maps);
      return new HistoryState(history2.done.addTransform(tr2, newGroup ? state.selection.getBookmark() : void 0, options, mustPreserveItems(state)), Branch.empty, prevRanges, tr2.time, composition == null ? history2.prevComposition : composition);
    } else if (rebased = tr2.getMeta("rebased")) {
      return new HistoryState(history2.done.rebased(tr2, rebased), history2.undone.rebased(tr2, rebased), mapRanges(history2.prevRanges, tr2.mapping), history2.prevTime, history2.prevComposition);
    } else {
      return new HistoryState(history2.done.addMaps(tr2.mapping.maps), history2.undone.addMaps(tr2.mapping.maps), mapRanges(history2.prevRanges, tr2.mapping), history2.prevTime, history2.prevComposition);
    }
  }
  function isAdjacentTo(transform, prevRanges) {
    if (!prevRanges)
      return false;
    if (!transform.docChanged)
      return true;
    let adjacent = false;
    transform.mapping.maps[0].forEach((start, end) => {
      for (let i2 = 0; i2 < prevRanges.length; i2 += 2)
        if (start <= prevRanges[i2 + 1] && end >= prevRanges[i2])
          adjacent = true;
    });
    return adjacent;
  }
  function rangesFor(maps) {
    let result = [];
    for (let i2 = maps.length - 1; i2 >= 0 && result.length == 0; i2--)
      maps[i2].forEach((_from, _to, from, to) => result.push(from, to));
    return result;
  }
  function mapRanges(ranges, mapping) {
    if (!ranges)
      return null;
    let result = [];
    for (let i2 = 0; i2 < ranges.length; i2 += 2) {
      let from = mapping.map(ranges[i2], 1), to = mapping.map(ranges[i2 + 1], -1);
      if (from <= to)
        result.push(from, to);
    }
    return result;
  }
  function histTransaction(history2, state, redo2) {
    let preserveItems = mustPreserveItems(state);
    let histOptions = historyKey.get(state).spec.config;
    let pop = (redo2 ? history2.undone : history2.done).popEvent(state, preserveItems);
    if (!pop)
      return null;
    let selection = pop.selection.resolve(pop.transform.doc);
    let added = (redo2 ? history2.done : history2.undone).addTransform(pop.transform, state.selection.getBookmark(), histOptions, preserveItems);
    let newHist = new HistoryState(redo2 ? added : pop.remaining, redo2 ? pop.remaining : added, null, 0, -1);
    return pop.transform.setSelection(selection).setMeta(historyKey, { redo: redo2, historyState: newHist });
  }
  let cachedPreserveItems = false, cachedPreserveItemsPlugins = null;
  function mustPreserveItems(state) {
    let plugins = state.plugins;
    if (cachedPreserveItemsPlugins != plugins) {
      cachedPreserveItems = false;
      cachedPreserveItemsPlugins = plugins;
      for (let i2 = 0; i2 < plugins.length; i2++)
        if (plugins[i2].spec.historyPreserveItems) {
          cachedPreserveItems = true;
          break;
        }
    }
    return cachedPreserveItems;
  }
  const historyKey = new PluginKey("history");
  const closeHistoryKey = new PluginKey("closeHistory");
  function history(config = {}) {
    config = {
      depth: config.depth || 100,
      newGroupDelay: config.newGroupDelay || 500
    };
    return new Plugin({
      key: historyKey,
      state: {
        init() {
          return new HistoryState(Branch.empty, Branch.empty, null, 0, -1);
        },
        apply(tr2, hist, state) {
          return applyTransaction(hist, state, tr2, config);
        }
      },
      config,
      props: {
        handleDOMEvents: {
          beforeinput(view, e) {
            let inputType = e.inputType;
            let command2 = inputType == "historyUndo" ? undo : inputType == "historyRedo" ? redo : null;
            if (!command2)
              return false;
            e.preventDefault();
            return command2(view.state, view.dispatch);
          }
        }
      }
    });
  }
  function buildCommand(redo2, scroll) {
    return (state, dispatch) => {
      let hist = historyKey.getState(state);
      if (!hist || (redo2 ? hist.undone : hist.done).eventCount == 0)
        return false;
      if (dispatch) {
        let tr2 = histTransaction(hist, state, redo2);
        if (tr2)
          dispatch(scroll ? tr2.scrollIntoView() : tr2);
      }
      return true;
    };
  }
  const undo = buildCommand(false, true);
  const redo = buildCommand(true, true);
  const History = Extension.create({
    name: "history",
    addOptions() {
      return {
        depth: 100,
        newGroupDelay: 500
      };
    },
    addCommands() {
      return {
        undo: () => ({ state, dispatch }) => {
          return undo(state, dispatch);
        },
        redo: () => ({ state, dispatch }) => {
          return redo(state, dispatch);
        }
      };
    },
    addProseMirrorPlugins() {
      return [
        history(this.options)
      ];
    },
    addKeyboardShortcuts() {
      return {
        "Mod-z": () => this.editor.commands.undo(),
        "Shift-Mod-z": () => this.editor.commands.redo(),
        "Mod-y": () => this.editor.commands.redo(),
        // Russian keyboard layouts
        "Mod-я": () => this.editor.commands.undo(),
        "Shift-Mod-я": () => this.editor.commands.redo()
      };
    }
  });
  const HorizontalRule = Node.create({
    name: "horizontalRule",
    addOptions() {
      return {
        HTMLAttributes: {}
      };
    },
    group: "block",
    parseHTML() {
      return [{ tag: "hr" }];
    },
    renderHTML({ HTMLAttributes }) {
      return ["hr", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)];
    },
    addCommands() {
      return {
        setHorizontalRule: () => ({ chain, state }) => {
          const { selection } = state;
          const { $from: $originFrom, $to: $originTo } = selection;
          const currentChain = chain();
          if ($originFrom.parentOffset === 0) {
            currentChain.insertContentAt({
              from: Math.max($originFrom.pos - 1, 0),
              to: $originTo.pos
            }, {
              type: this.name
            });
          } else if (isNodeSelection(selection)) {
            currentChain.insertContentAt($originTo.pos, {
              type: this.name
            });
          } else {
            currentChain.insertContent({ type: this.name });
          }
          return currentChain.command(({ tr: tr2, dispatch }) => {
            var _a;
            if (dispatch) {
              const { $to } = tr2.selection;
              const posAfter = $to.end();
              if ($to.nodeAfter) {
                if ($to.nodeAfter.isTextblock) {
                  tr2.setSelection(TextSelection.create(tr2.doc, $to.pos + 1));
                } else if ($to.nodeAfter.isBlock) {
                  tr2.setSelection(NodeSelection.create(tr2.doc, $to.pos));
                } else {
                  tr2.setSelection(TextSelection.create(tr2.doc, $to.pos));
                }
              } else {
                const node = (_a = $to.parent.type.contentMatch.defaultType) === null || _a === void 0 ? void 0 : _a.create();
                if (node) {
                  tr2.insert(posAfter, node);
                  tr2.setSelection(TextSelection.create(tr2.doc, posAfter + 1));
                }
              }
              tr2.scrollIntoView();
            }
            return true;
          }).run();
        }
      };
    },
    addInputRules() {
      return [
        nodeInputRule({
          find: /^(?:---|—-|___\s|\*\*\*\s)$/,
          type: this.type
        })
      ];
    }
  });
  const starInputRegex = /(?:^|\s)(\*(?!\s+\*)((?:[^*]+))\*(?!\s+\*))$/;
  const starPasteRegex = /(?:^|\s)(\*(?!\s+\*)((?:[^*]+))\*(?!\s+\*))/g;
  const underscoreInputRegex = /(?:^|\s)(_(?!\s+_)((?:[^_]+))_(?!\s+_))$/;
  const underscorePasteRegex = /(?:^|\s)(_(?!\s+_)((?:[^_]+))_(?!\s+_))/g;
  const Italic = Mark.create({
    name: "italic",
    addOptions() {
      return {
        HTMLAttributes: {}
      };
    },
    parseHTML() {
      return [
        {
          tag: "em"
        },
        {
          tag: "i",
          getAttrs: (node) => node.style.fontStyle !== "normal" && null
        },
        {
          style: "font-style=normal",
          clearMark: (mark) => mark.type.name === this.name
        },
        {
          style: "font-style=italic"
        }
      ];
    },
    renderHTML({ HTMLAttributes }) {
      return ["em", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
    },
    addCommands() {
      return {
        setItalic: () => ({ commands: commands2 }) => {
          return commands2.setMark(this.name);
        },
        toggleItalic: () => ({ commands: commands2 }) => {
          return commands2.toggleMark(this.name);
        },
        unsetItalic: () => ({ commands: commands2 }) => {
          return commands2.unsetMark(this.name);
        }
      };
    },
    addKeyboardShortcuts() {
      return {
        "Mod-i": () => this.editor.commands.toggleItalic(),
        "Mod-I": () => this.editor.commands.toggleItalic()
      };
    },
    addInputRules() {
      return [
        markInputRule({
          find: starInputRegex,
          type: this.type
        }),
        markInputRule({
          find: underscoreInputRegex,
          type: this.type
        })
      ];
    },
    addPasteRules() {
      return [
        markPasteRule({
          find: starPasteRegex,
          type: this.type
        }),
        markPasteRule({
          find: underscorePasteRegex,
          type: this.type
        })
      ];
    }
  });
  const ListItem = Node.create({
    name: "listItem",
    addOptions() {
      return {
        HTMLAttributes: {},
        bulletListTypeName: "bulletList",
        orderedListTypeName: "orderedList"
      };
    },
    content: "paragraph block*",
    defining: true,
    parseHTML() {
      return [
        {
          tag: "li"
        }
      ];
    },
    renderHTML({ HTMLAttributes }) {
      return ["li", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
    },
    addKeyboardShortcuts() {
      return {
        Enter: () => this.editor.commands.splitListItem(this.name),
        Tab: () => this.editor.commands.sinkListItem(this.name),
        "Shift-Tab": () => this.editor.commands.liftListItem(this.name)
      };
    }
  });
  const ListItemName = "listItem";
  const TextStyleName = "textStyle";
  const inputRegex$1 = /^(\d+)\.\s$/;
  const OrderedList = Node.create({
    name: "orderedList",
    addOptions() {
      return {
        itemTypeName: "listItem",
        HTMLAttributes: {},
        keepMarks: false,
        keepAttributes: false
      };
    },
    group: "block list",
    content() {
      return `${this.options.itemTypeName}+`;
    },
    addAttributes() {
      return {
        start: {
          default: 1,
          parseHTML: (element) => {
            return element.hasAttribute("start") ? parseInt(element.getAttribute("start") || "", 10) : 1;
          }
        },
        type: {
          default: void 0,
          parseHTML: (element) => element.getAttribute("type")
        }
      };
    },
    parseHTML() {
      return [
        {
          tag: "ol"
        }
      ];
    },
    renderHTML({ HTMLAttributes }) {
      const { start, ...attributesWithoutStart } = HTMLAttributes;
      return start === 1 ? ["ol", mergeAttributes(this.options.HTMLAttributes, attributesWithoutStart), 0] : ["ol", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
    },
    addCommands() {
      return {
        toggleOrderedList: () => ({ commands: commands2, chain }) => {
          if (this.options.keepAttributes) {
            return chain().toggleList(this.name, this.options.itemTypeName, this.options.keepMarks).updateAttributes(ListItemName, this.editor.getAttributes(TextStyleName)).run();
          }
          return commands2.toggleList(this.name, this.options.itemTypeName, this.options.keepMarks);
        }
      };
    },
    addKeyboardShortcuts() {
      return {
        "Mod-Shift-7": () => this.editor.commands.toggleOrderedList()
      };
    },
    addInputRules() {
      let inputRule = wrappingInputRule({
        find: inputRegex$1,
        type: this.type,
        getAttributes: (match) => ({ start: +match[1] }),
        joinPredicate: (match, node) => node.childCount + node.attrs.start === +match[1]
      });
      if (this.options.keepMarks || this.options.keepAttributes) {
        inputRule = wrappingInputRule({
          find: inputRegex$1,
          type: this.type,
          keepMarks: this.options.keepMarks,
          keepAttributes: this.options.keepAttributes,
          getAttributes: (match) => ({ start: +match[1], ...this.editor.getAttributes(TextStyleName) }),
          joinPredicate: (match, node) => node.childCount + node.attrs.start === +match[1],
          editor: this.editor
        });
      }
      return [
        inputRule
      ];
    }
  });
  const Paragraph = Node.create({
    name: "paragraph",
    priority: 1e3,
    addOptions() {
      return {
        HTMLAttributes: {}
      };
    },
    group: "block",
    content: "inline*",
    parseHTML() {
      return [
        { tag: "p" }
      ];
    },
    renderHTML({ HTMLAttributes }) {
      return ["p", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
    },
    addCommands() {
      return {
        setParagraph: () => ({ commands: commands2 }) => {
          return commands2.setNode(this.name);
        }
      };
    },
    addKeyboardShortcuts() {
      return {
        "Mod-Alt-0": () => this.editor.commands.setParagraph()
      };
    }
  });
  const inputRegex = /(?:^|\s)(~~(?!\s+~~)((?:[^~]+))~~(?!\s+~~))$/;
  const pasteRegex = /(?:^|\s)(~~(?!\s+~~)((?:[^~]+))~~(?!\s+~~))/g;
  const Strike = Mark.create({
    name: "strike",
    addOptions() {
      return {
        HTMLAttributes: {}
      };
    },
    parseHTML() {
      return [
        {
          tag: "s"
        },
        {
          tag: "del"
        },
        {
          tag: "strike"
        },
        {
          style: "text-decoration",
          consuming: false,
          getAttrs: (style2) => style2.includes("line-through") ? {} : false
        }
      ];
    },
    renderHTML({ HTMLAttributes }) {
      return ["s", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
    },
    addCommands() {
      return {
        setStrike: () => ({ commands: commands2 }) => {
          return commands2.setMark(this.name);
        },
        toggleStrike: () => ({ commands: commands2 }) => {
          return commands2.toggleMark(this.name);
        },
        unsetStrike: () => ({ commands: commands2 }) => {
          return commands2.unsetMark(this.name);
        }
      };
    },
    addKeyboardShortcuts() {
      return {
        "Mod-Shift-s": () => this.editor.commands.toggleStrike()
      };
    },
    addInputRules() {
      return [
        markInputRule({
          find: inputRegex,
          type: this.type
        })
      ];
    },
    addPasteRules() {
      return [
        markPasteRule({
          find: pasteRegex,
          type: this.type
        })
      ];
    }
  });
  const Text$1 = Node.create({
    name: "text",
    group: "inline"
  });
  const StarterKit = Extension.create({
    name: "starterKit",
    addExtensions() {
      var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t;
      const extensions = [];
      if (this.options.bold !== false) {
        extensions.push(Bold.configure((_a = this.options) === null || _a === void 0 ? void 0 : _a.bold));
      }
      if (this.options.blockquote !== false) {
        extensions.push(Blockquote.configure((_b = this.options) === null || _b === void 0 ? void 0 : _b.blockquote));
      }
      if (this.options.bulletList !== false) {
        extensions.push(BulletList.configure((_c = this.options) === null || _c === void 0 ? void 0 : _c.bulletList));
      }
      if (this.options.code !== false) {
        extensions.push(Code.configure((_d = this.options) === null || _d === void 0 ? void 0 : _d.code));
      }
      if (this.options.codeBlock !== false) {
        extensions.push(CodeBlock.configure((_e = this.options) === null || _e === void 0 ? void 0 : _e.codeBlock));
      }
      if (this.options.document !== false) {
        extensions.push(Document.configure((_f = this.options) === null || _f === void 0 ? void 0 : _f.document));
      }
      if (this.options.dropcursor !== false) {
        extensions.push(Dropcursor.configure((_g = this.options) === null || _g === void 0 ? void 0 : _g.dropcursor));
      }
      if (this.options.gapcursor !== false) {
        extensions.push(Gapcursor.configure((_h = this.options) === null || _h === void 0 ? void 0 : _h.gapcursor));
      }
      if (this.options.hardBreak !== false) {
        extensions.push(HardBreak.configure((_j = this.options) === null || _j === void 0 ? void 0 : _j.hardBreak));
      }
      if (this.options.heading !== false) {
        extensions.push(Heading.configure((_k = this.options) === null || _k === void 0 ? void 0 : _k.heading));
      }
      if (this.options.history !== false) {
        extensions.push(History.configure((_l = this.options) === null || _l === void 0 ? void 0 : _l.history));
      }
      if (this.options.horizontalRule !== false) {
        extensions.push(HorizontalRule.configure((_m = this.options) === null || _m === void 0 ? void 0 : _m.horizontalRule));
      }
      if (this.options.italic !== false) {
        extensions.push(Italic.configure((_o = this.options) === null || _o === void 0 ? void 0 : _o.italic));
      }
      if (this.options.listItem !== false) {
        extensions.push(ListItem.configure((_p = this.options) === null || _p === void 0 ? void 0 : _p.listItem));
      }
      if (this.options.orderedList !== false) {
        extensions.push(OrderedList.configure((_q = this.options) === null || _q === void 0 ? void 0 : _q.orderedList));
      }
      if (this.options.paragraph !== false) {
        extensions.push(Paragraph.configure((_r = this.options) === null || _r === void 0 ? void 0 : _r.paragraph));
      }
      if (this.options.strike !== false) {
        extensions.push(Strike.configure((_s = this.options) === null || _s === void 0 ? void 0 : _s.strike));
      }
      if (this.options.text !== false) {
        extensions.push(Text$1.configure((_t = this.options) === null || _t === void 0 ? void 0 : _t.text));
      }
      return extensions;
    }
  });
  const encodedTlds = "aaa1rp3bb0ott3vie4c1le2ogado5udhabi7c0ademy5centure6ountant0s9o1tor4d0s1ult4e0g1ro2tna4f0l1rica5g0akhan5ency5i0g1rbus3force5tel5kdn3l0ibaba4pay4lfinanz6state5y2sace3tom5m0azon4ericanexpress7family11x2fam3ica3sterdam8nalytics7droid5quan4z2o0l2partments8p0le4q0uarelle8r0ab1mco4chi3my2pa2t0e3s0da2ia2sociates9t0hleta5torney7u0ction5di0ble3o3spost5thor3o0s4w0s2x0a2z0ure5ba0by2idu3namex4d1k2r0celona5laycard4s5efoot5gains6seball5ketball8uhaus5yern5b0c1t1va3cg1n2d1e0ats2uty4er2ntley5rlin4st0buy5t2f1g1h0arti5i0ble3d1ke2ng0o3o1z2j1lack0friday9ockbuster8g1omberg7ue3m0s1w2n0pparibas9o0ats3ehringer8fa2m1nd2o0k0ing5sch2tik2on4t1utique6x2r0adesco6idgestone9oadway5ker3ther5ussels7s1t1uild0ers6siness6y1zz3v1w1y1z0h3ca0b1fe2l0l1vinklein9m0era3p2non3petown5ital0one8r0avan4ds2e0er0s4s2sa1e1h1ino4t0ering5holic7ba1n1re3c1d1enter4o1rn3f0a1d2g1h0anel2nel4rity4se2t2eap3intai5ristmas6ome4urch5i0priani6rcle4sco3tadel4i0c2y3k1l0aims4eaning6ick2nic1que6othing5ud3ub0med6m1n1o0ach3des3ffee4llege4ogne5m0mbank4unity6pany2re3uter5sec4ndos3struction8ulting7tact3ractors9oking4l1p2rsica5untry4pon0s4rses6pa2r0edit0card4union9icket5own3s1uise0s6u0isinella9v1w1x1y0mru3ou3z2dad1nce3ta1e1ing3sun4y2clk3ds2e0al0er2s3gree4livery5l1oitte5ta3mocrat6ntal2ist5si0gn4v2hl2iamonds6et2gital5rect0ory7scount3ver5h2y2j1k1m1np2o0cs1tor4g1mains5t1wnload7rive4tv2ubai3nlop4pont4rban5vag2r2z2earth3t2c0o2deka3u0cation8e1g1mail3erck5nergy4gineer0ing9terprises10pson4quipment8r0icsson6ni3s0q1tate5t1u0rovision8s2vents5xchange6pert3osed4ress5traspace10fage2il1rwinds6th3mily4n0s2rm0ers5shion4t3edex3edback6rrari3ero6i0delity5o2lm2nal1nce1ial7re0stone6mdale6sh0ing5t0ness6j1k1lickr3ghts4r2orist4wers5y2m1o0o0d1tball6rd1ex2sale4um3undation8x2r0ee1senius7l1ogans4ntier7tr2ujitsu5n0d2rniture7tbol5yi3ga0l0lery3o1up4me0s3p1rden4y2b0iz3d0n2e0a1nt0ing5orge5f1g0ee3h1i0ft0s3ves2ing5l0ass3e1obal2o4m0ail3bh2o1x2n1odaddy5ld0point6f2o0dyear5g0le4p1t1v2p1q1r0ainger5phics5tis4een3ipe3ocery4up4s1t1u0cci3ge2ide2tars5ru3w1y2hair2mburg5ngout5us3bo2dfc0bank7ealth0care8lp1sinki6re1mes5iphop4samitsu7tachi5v2k0t2m1n1ockey4ldings5iday5medepot5goods5s0ense7nda3rse3spital5t0ing5t0els3mail5use3w2r1sbc3t1u0ghes5yatt3undai7ibm2cbc2e1u2d1e0ee3fm2kano4l1m0amat4db2mo0bilien9n0c1dustries8finiti5o2g1k1stitute6urance4e4t0ernational10uit4vestments10o1piranga7q1r0ish4s0maili5t0anbul7t0au2v3jaguar4va3cb2e0ep2tzt3welry6io2ll2m0p2nj2o0bs1urg4t1y2p0morgan6rs3uegos4niper7kaufen5ddi3e0rryhotels6logistics9properties14fh2g1h1i0a1ds2m1ndle4tchen5wi3m1n1oeln3matsu5sher5p0mg2n2r0d1ed3uokgroup8w1y0oto4z2la0caixa5mborghini8er3ncaster6d0rover6xess5salle5t0ino3robe5w0yer5b1c1ds2ease3clerc5frak4gal2o2xus4gbt3i0dl2fe0insurance9style7ghting6ke2lly3mited4o2ncoln4k2psy3ve1ing5k1lc1p2oan0s3cker3us3l1ndon4tte1o3ve3pl0financial11r1s1t0d0a3u0ndbeck6xe1ury5v1y2ma0drid4if1son4keup4n0agement7go3p1rket0ing3s4riott5shalls7ttel5ba2c0kinsey7d1e0d0ia3et2lbourne7me1orial6n0u2rckmsd7g1h1iami3crosoft7l1ni1t2t0subishi9k1l0b1s2m0a2n1o0bi0le4da2e1i1m1nash3ey2ster5rmon3tgage6scow4to0rcycles9v0ie4p1q1r1s0d2t0n1r2u0seum3ic4v1w1x1y1z2na0b1goya4me2vy3ba2c1e0c1t0bank4flix4work5ustar5w0s2xt0direct7us4f0l2g0o2hk2i0co2ke1on3nja3ssan1y5l1o0kia3rton4w0ruz3tv4p1r0a1w2tt2u1yc2z2obi1server7ffice5kinawa6layan0group9lo3m0ega4ne1g1l0ine5oo2pen3racle3nge4g0anic5igins6saka4tsuka4t2vh3pa0ge2nasonic7ris2s1tners4s1y3y2ccw3e0t2f0izer5g1h0armacy6d1ilips5one2to0graphy6s4ysio5ics1tet2ures6d1n0g1k2oneer5zza4k1l0ace2y0station9umbing5s3m1n0c2ohl2ker3litie5rn2st3r0america6xi3ess3ime3o0d0uctions8f1gressive8mo2perties3y5tection8u0dential9s1t1ub2w0c2y2qa1pon3uebec3st5racing4dio4e0ad1lestate6tor2y4cipes5d0stone5umbrella9hab3ise0n3t2liance6n0t0als5pair3ort3ublican8st0aurant8view0s5xroth6ich0ardli6oh3l1o1p2o0cks3deo3gers4om3s0vp3u0gby3hr2n2w0e2yukyu6sa0arland6fe0ty4kura4le1on3msclub4ung5ndvik0coromant12ofi4p1rl2s1ve2xo3b0i1s2c0b1haeffler7midt4olarships8ol3ule3warz5ience5ot3d1e0arch3t2cure1ity6ek2lect4ner3rvices6ven3w1x0y3fr2g1h0angrila6rp3ell3ia1ksha5oes2p0ping5uji3w3i0lk2na1gles5te3j1k0i0n2y0pe4l0ing4m0art3ile4n0cf3o0ccer3ial4ftbank4ware6hu2lar2utions7ng1y2y2pa0ce3ort2t3r0l2s1t0ada2ples4r1tebank4farm7c0group6ockholm6rage3e3ream4udio2y3yle4u0cks3pplies3y2ort5rf1gery5zuki5v1watch4iss4x1y0dney4stems6z2tab1ipei4lk2obao4rget4tamotors6r2too4x0i3c0i2d0k2eam2ch0nology8l1masek5nnis4va3f1g1h0d1eater2re6iaa2ckets5enda4ps2res2ol4j0maxx4x2k0maxx5l1m0all4n1o0day3kyo3ols3p1ray3shiba5tal3urs3wn2yota3s3r0ade1ing4ining5vel0ers0insurance16ust3v2t1ube2i1nes3shu4v0s2w1z2ua1bank3s2g1k1nicom3versity8o2ol2ps2s1y1z2va0cations7na1guard7c1e0gas3ntures6risign5mögensberater2ung14sicherung10t2g1i0ajes4deo3g1king4llas4n1p1rgin4sa1ion4va1o3laanderen9n1odka3lvo3te1ing3o2yage5u2wales2mart4ter4ng0gou5tch0es6eather0channel12bcam3er2site5d0ding5ibo2r3f1hoswho6ien2ki2lliamhill9n0dows4e1ners6me2olterskluwer11odside6rk0s2ld3w2s1tc1f3xbox3erox4ihuan4n2xx2yz3yachts4hoo3maxun5ndex5e1odobashi7ga2kohama6u0tube6t1un3za0ppos4ra3ero3ip2m1one3uerich6w2";
  const encodedUtlds = "ελ1υ2бг1ел3дети4ею2католик6ом3мкд2он1сква6онлайн5рг3рус2ф2сайт3рб3укр3қаз3հայ3ישראל5קום3ابوظبي5رامكو5لاردن4بحرين5جزائر5سعودية6عليان5مغرب5مارات5یران5بارت2زار4يتك3ھارت5تونس4سودان3رية5شبكة4عراق2ب2مان4فلسطين6قطر3كاثوليك6وم3مصر2ليسيا5وريتانيا7قع4همراه5پاکستان7ڀارت4कॉम3नेट3भारत0म्3ोत5संगठन5বাংলা5ভারত2ৰত4ਭਾਰਤ4ભારત4ଭାରତ4இந்தியா6லங்கை6சிங்கப்பூர்11భారత్5ಭಾರತ4ഭാരതം5ලංකා4คอม3ไทย3ລາວ3გე2みんな3アマゾン4クラウド4グーグル4コム2ストア3セール3ファッション6ポイント4世界2中信1国1國1文网3亚马逊3企业2佛山2信息2健康2八卦2公司1益2台湾1灣2商城1店1标2嘉里0大酒店5在线2大拿2天主教3娱乐2家電2广东2微博2慈善2我爱你3手机2招聘2政务1府2新加坡2闻2时尚2書籍2机构2淡马锡3游戏2澳門2点看2移动2组织机构4网址1店1站1络2联通2谷歌2购物2通販2集团2電訊盈科4飞利浦3食品2餐厅2香格里拉3港2닷넷1컴2삼성2한국2";
  const assign = (target, properties) => {
    for (const key in properties) {
      target[key] = properties[key];
    }
    return target;
  };
  const numeric = "numeric";
  const ascii = "ascii";
  const alpha = "alpha";
  const asciinumeric = "asciinumeric";
  const alphanumeric = "alphanumeric";
  const domain = "domain";
  const emoji = "emoji";
  const scheme = "scheme";
  const slashscheme = "slashscheme";
  const whitespace = "whitespace";
  function registerGroup(name, groups) {
    if (!(name in groups)) {
      groups[name] = [];
    }
    return groups[name];
  }
  function addToGroups(t, flags, groups) {
    if (flags[numeric]) {
      flags[asciinumeric] = true;
      flags[alphanumeric] = true;
    }
    if (flags[ascii]) {
      flags[asciinumeric] = true;
      flags[alpha] = true;
    }
    if (flags[asciinumeric]) {
      flags[alphanumeric] = true;
    }
    if (flags[alpha]) {
      flags[alphanumeric] = true;
    }
    if (flags[alphanumeric]) {
      flags[domain] = true;
    }
    if (flags[emoji]) {
      flags[domain] = true;
    }
    for (const k in flags) {
      const group = registerGroup(k, groups);
      if (group.indexOf(t) < 0) {
        group.push(t);
      }
    }
  }
  function flagsForToken(t, groups) {
    const result = {};
    for (const c2 in groups) {
      if (groups[c2].indexOf(t) >= 0) {
        result[c2] = true;
      }
    }
    return result;
  }
  function State(token = null) {
    this.j = {};
    this.jr = [];
    this.jd = null;
    this.t = token;
  }
  State.groups = {};
  State.prototype = {
    accepts() {
      return !!this.t;
    },
    /**
     * Follow an existing transition from the given input to the next state.
     * Does not mutate.
     * @param {string} input character or token type to transition on
     * @returns {?State<T>} the next state, if any
     */
    go(input) {
      const state = this;
      const nextState = state.j[input];
      if (nextState) {
        return nextState;
      }
      for (let i2 = 0; i2 < state.jr.length; i2++) {
        const regex = state.jr[i2][0];
        const nextState2 = state.jr[i2][1];
        if (nextState2 && regex.test(input)) {
          return nextState2;
        }
      }
      return state.jd;
    },
    /**
     * Whether the state has a transition for the given input. Set the second
     * argument to true to only look for an exact match (and not a default or
     * regular-expression-based transition)
     * @param {string} input
     * @param {boolean} exactOnly
     */
    has(input, exactOnly = false) {
      return exactOnly ? input in this.j : !!this.go(input);
    },
    /**
     * Short for "transition all"; create a transition from the array of items
     * in the given list to the same final resulting state.
     * @param {string | string[]} inputs Group of inputs to transition on
     * @param {Transition<T> | State<T>} [next] Transition options
     * @param {Flags} [flags] Collections flags to add token to
     * @param {Collections<T>} [groups] Master list of token groups
     */
    ta(inputs, next, flags, groups) {
      for (let i2 = 0; i2 < inputs.length; i2++) {
        this.tt(inputs[i2], next, flags, groups);
      }
    },
    /**
     * Short for "take regexp transition"; defines a transition for this state
     * when it encounters a token which matches the given regular expression
     * @param {RegExp} regexp Regular expression transition (populate first)
     * @param {T | State<T>} [next] Transition options
     * @param {Flags} [flags] Collections flags to add token to
     * @param {Collections<T>} [groups] Master list of token groups
     * @returns {State<T>} taken after the given input
     */
    tr(regexp, next, flags, groups) {
      groups = groups || State.groups;
      let nextState;
      if (next && next.j) {
        nextState = next;
      } else {
        nextState = new State(next);
        if (flags && groups) {
          addToGroups(next, flags, groups);
        }
      }
      this.jr.push([regexp, nextState]);
      return nextState;
    },
    /**
     * Short for "take transitions", will take as many sequential transitions as
     * the length of the given input and returns the
     * resulting final state.
     * @param {string | string[]} input
     * @param {T | State<T>} [next] Transition options
     * @param {Flags} [flags] Collections flags to add token to
     * @param {Collections<T>} [groups] Master list of token groups
     * @returns {State<T>} taken after the given input
     */
    ts(input, next, flags, groups) {
      let state = this;
      const len = input.length;
      if (!len) {
        return state;
      }
      for (let i2 = 0; i2 < len - 1; i2++) {
        state = state.tt(input[i2]);
      }
      return state.tt(input[len - 1], next, flags, groups);
    },
    /**
     * Short for "take transition", this is a method for building/working with
     * state machines.
     *
     * If a state already exists for the given input, returns it.
     *
     * If a token is specified, that state will emit that token when reached by
     * the linkify engine.
     *
     * If no state exists, it will be initialized with some default transitions
     * that resemble existing default transitions.
     *
     * If a state is given for the second argument, that state will be
     * transitioned to on the given input regardless of what that input
     * previously did.
     *
     * Specify a token group flags to define groups that this token belongs to.
     * The token will be added to corresponding entires in the given groups
     * object.
     *
     * @param {string} input character, token type to transition on
     * @param {T | State<T>} [next] Transition options
     * @param {Flags} [flags] Collections flags to add token to
     * @param {Collections<T>} [groups] Master list of groups
     * @returns {State<T>} taken after the given input
     */
    tt(input, next, flags, groups) {
      groups = groups || State.groups;
      const state = this;
      if (next && next.j) {
        state.j[input] = next;
        return next;
      }
      const t = next;
      let nextState, templateState = state.go(input);
      if (templateState) {
        nextState = new State();
        assign(nextState.j, templateState.j);
        nextState.jr.push.apply(nextState.jr, templateState.jr);
        nextState.jd = templateState.jd;
        nextState.t = templateState.t;
      } else {
        nextState = new State();
      }
      if (t) {
        if (groups) {
          if (nextState.t && typeof nextState.t === "string") {
            const allFlags = assign(flagsForToken(nextState.t, groups), flags);
            addToGroups(t, allFlags, groups);
          } else if (flags) {
            addToGroups(t, flags, groups);
          }
        }
        nextState.t = t;
      }
      state.j[input] = nextState;
      return nextState;
    }
  };
  const ta = (state, input, next, flags, groups) => state.ta(input, next, flags, groups);
  const tr = (state, regexp, next, flags, groups) => state.tr(regexp, next, flags, groups);
  const ts = (state, input, next, flags, groups) => state.ts(input, next, flags, groups);
  const tt = (state, input, next, flags, groups) => state.tt(input, next, flags, groups);
  const WORD = "WORD";
  const UWORD = "UWORD";
  const ASCIINUMERICAL = "ASCIINUMERICAL";
  const ALPHANUMERICAL = "ALPHANUMERICAL";
  const LOCALHOST = "LOCALHOST";
  const TLD = "TLD";
  const UTLD = "UTLD";
  const SCHEME = "SCHEME";
  const SLASH_SCHEME = "SLASH_SCHEME";
  const NUM = "NUM";
  const WS = "WS";
  const NL = "NL";
  const OPENBRACE = "OPENBRACE";
  const CLOSEBRACE = "CLOSEBRACE";
  const OPENBRACKET = "OPENBRACKET";
  const CLOSEBRACKET = "CLOSEBRACKET";
  const OPENPAREN = "OPENPAREN";
  const CLOSEPAREN = "CLOSEPAREN";
  const OPENANGLEBRACKET = "OPENANGLEBRACKET";
  const CLOSEANGLEBRACKET = "CLOSEANGLEBRACKET";
  const FULLWIDTHLEFTPAREN = "FULLWIDTHLEFTPAREN";
  const FULLWIDTHRIGHTPAREN = "FULLWIDTHRIGHTPAREN";
  const LEFTCORNERBRACKET = "LEFTCORNERBRACKET";
  const RIGHTCORNERBRACKET = "RIGHTCORNERBRACKET";
  const LEFTWHITECORNERBRACKET = "LEFTWHITECORNERBRACKET";
  const RIGHTWHITECORNERBRACKET = "RIGHTWHITECORNERBRACKET";
  const FULLWIDTHLESSTHAN = "FULLWIDTHLESSTHAN";
  const FULLWIDTHGREATERTHAN = "FULLWIDTHGREATERTHAN";
  const AMPERSAND = "AMPERSAND";
  const APOSTROPHE = "APOSTROPHE";
  const ASTERISK = "ASTERISK";
  const AT = "AT";
  const BACKSLASH = "BACKSLASH";
  const BACKTICK = "BACKTICK";
  const CARET = "CARET";
  const COLON = "COLON";
  const COMMA = "COMMA";
  const DOLLAR = "DOLLAR";
  const DOT = "DOT";
  const EQUALS = "EQUALS";
  const EXCLAMATION = "EXCLAMATION";
  const HYPHEN = "HYPHEN";
  const PERCENT = "PERCENT";
  const PIPE = "PIPE";
  const PLUS = "PLUS";
  const POUND = "POUND";
  const QUERY = "QUERY";
  const QUOTE = "QUOTE";
  const FULLWIDTHMIDDLEDOT = "FULLWIDTHMIDDLEDOT";
  const SEMI = "SEMI";
  const SLASH = "SLASH";
  const TILDE = "TILDE";
  const UNDERSCORE = "UNDERSCORE";
  const EMOJI$1 = "EMOJI";
  const SYM = "SYM";
  var tk = /* @__PURE__ */ Object.freeze({
    __proto__: null,
    WORD,
    UWORD,
    ASCIINUMERICAL,
    ALPHANUMERICAL,
    LOCALHOST,
    TLD,
    UTLD,
    SCHEME,
    SLASH_SCHEME,
    NUM,
    WS,
    NL,
    OPENBRACE,
    CLOSEBRACE,
    OPENBRACKET,
    CLOSEBRACKET,
    OPENPAREN,
    CLOSEPAREN,
    OPENANGLEBRACKET,
    CLOSEANGLEBRACKET,
    FULLWIDTHLEFTPAREN,
    FULLWIDTHRIGHTPAREN,
    LEFTCORNERBRACKET,
    RIGHTCORNERBRACKET,
    LEFTWHITECORNERBRACKET,
    RIGHTWHITECORNERBRACKET,
    FULLWIDTHLESSTHAN,
    FULLWIDTHGREATERTHAN,
    AMPERSAND,
    APOSTROPHE,
    ASTERISK,
    AT,
    BACKSLASH,
    BACKTICK,
    CARET,
    COLON,
    COMMA,
    DOLLAR,
    DOT,
    EQUALS,
    EXCLAMATION,
    HYPHEN,
    PERCENT,
    PIPE,
    PLUS,
    POUND,
    QUERY,
    QUOTE,
    FULLWIDTHMIDDLEDOT,
    SEMI,
    SLASH,
    TILDE,
    UNDERSCORE,
    EMOJI: EMOJI$1,
    SYM
  });
  const ASCII_LETTER = /[a-z]/;
  const LETTER = new RegExp("\\p{L}", "u");
  const EMOJI = new RegExp("\\p{Emoji}", "u");
  const DIGIT = /\d/;
  const SPACE = /\s/;
  const CR = "\r";
  const LF = "\n";
  const EMOJI_VARIATION = "️";
  const EMOJI_JOINER = "‍";
  const OBJECT_REPLACEMENT = "￼";
  let tlds = null, utlds = null;
  function init$2(customSchemes = []) {
    const groups = {};
    State.groups = groups;
    const Start = new State();
    if (tlds == null) {
      tlds = decodeTlds(encodedTlds);
    }
    if (utlds == null) {
      utlds = decodeTlds(encodedUtlds);
    }
    tt(Start, "'", APOSTROPHE);
    tt(Start, "{", OPENBRACE);
    tt(Start, "}", CLOSEBRACE);
    tt(Start, "[", OPENBRACKET);
    tt(Start, "]", CLOSEBRACKET);
    tt(Start, "(", OPENPAREN);
    tt(Start, ")", CLOSEPAREN);
    tt(Start, "<", OPENANGLEBRACKET);
    tt(Start, ">", CLOSEANGLEBRACKET);
    tt(Start, "（", FULLWIDTHLEFTPAREN);
    tt(Start, "）", FULLWIDTHRIGHTPAREN);
    tt(Start, "「", LEFTCORNERBRACKET);
    tt(Start, "」", RIGHTCORNERBRACKET);
    tt(Start, "『", LEFTWHITECORNERBRACKET);
    tt(Start, "』", RIGHTWHITECORNERBRACKET);
    tt(Start, "＜", FULLWIDTHLESSTHAN);
    tt(Start, "＞", FULLWIDTHGREATERTHAN);
    tt(Start, "&", AMPERSAND);
    tt(Start, "*", ASTERISK);
    tt(Start, "@", AT);
    tt(Start, "`", BACKTICK);
    tt(Start, "^", CARET);
    tt(Start, ":", COLON);
    tt(Start, ",", COMMA);
    tt(Start, "$", DOLLAR);
    tt(Start, ".", DOT);
    tt(Start, "=", EQUALS);
    tt(Start, "!", EXCLAMATION);
    tt(Start, "-", HYPHEN);
    tt(Start, "%", PERCENT);
    tt(Start, "|", PIPE);
    tt(Start, "+", PLUS);
    tt(Start, "#", POUND);
    tt(Start, "?", QUERY);
    tt(Start, '"', QUOTE);
    tt(Start, "/", SLASH);
    tt(Start, ";", SEMI);
    tt(Start, "~", TILDE);
    tt(Start, "_", UNDERSCORE);
    tt(Start, "\\", BACKSLASH);
    tt(Start, "・", FULLWIDTHMIDDLEDOT);
    const Num = tr(Start, DIGIT, NUM, {
      [numeric]: true
    });
    tr(Num, DIGIT, Num);
    const Asciinumeric = tr(Num, ASCII_LETTER, ASCIINUMERICAL, {
      [asciinumeric]: true
    });
    const Alphanumeric = tr(Num, LETTER, ALPHANUMERICAL, {
      [alphanumeric]: true
    });
    const Word = tr(Start, ASCII_LETTER, WORD, {
      [ascii]: true
    });
    tr(Word, DIGIT, Asciinumeric);
    tr(Word, ASCII_LETTER, Word);
    tr(Asciinumeric, DIGIT, Asciinumeric);
    tr(Asciinumeric, ASCII_LETTER, Asciinumeric);
    const UWord = tr(Start, LETTER, UWORD, {
      [alpha]: true
    });
    tr(UWord, ASCII_LETTER);
    tr(UWord, DIGIT, Alphanumeric);
    tr(UWord, LETTER, UWord);
    tr(Alphanumeric, DIGIT, Alphanumeric);
    tr(Alphanumeric, ASCII_LETTER);
    tr(Alphanumeric, LETTER, Alphanumeric);
    const Nl2 = tt(Start, LF, NL, {
      [whitespace]: true
    });
    const Cr = tt(Start, CR, WS, {
      [whitespace]: true
    });
    const Ws = tr(Start, SPACE, WS, {
      [whitespace]: true
    });
    tt(Start, OBJECT_REPLACEMENT, Ws);
    tt(Cr, LF, Nl2);
    tt(Cr, OBJECT_REPLACEMENT, Ws);
    tr(Cr, SPACE, Ws);
    tt(Ws, CR);
    tt(Ws, LF);
    tr(Ws, SPACE, Ws);
    tt(Ws, OBJECT_REPLACEMENT, Ws);
    const Emoji = tr(Start, EMOJI, EMOJI$1, {
      [emoji]: true
    });
    tt(Emoji, "#");
    tr(Emoji, EMOJI, Emoji);
    tt(Emoji, EMOJI_VARIATION, Emoji);
    const EmojiJoiner = tt(Emoji, EMOJI_JOINER);
    tt(EmojiJoiner, "#");
    tr(EmojiJoiner, EMOJI, Emoji);
    const wordjr = [[ASCII_LETTER, Word], [DIGIT, Asciinumeric]];
    const uwordjr = [[ASCII_LETTER, null], [LETTER, UWord], [DIGIT, Alphanumeric]];
    for (let i2 = 0; i2 < tlds.length; i2++) {
      fastts(Start, tlds[i2], TLD, WORD, wordjr);
    }
    for (let i2 = 0; i2 < utlds.length; i2++) {
      fastts(Start, utlds[i2], UTLD, UWORD, uwordjr);
    }
    addToGroups(TLD, {
      tld: true,
      ascii: true
    }, groups);
    addToGroups(UTLD, {
      utld: true,
      alpha: true
    }, groups);
    fastts(Start, "file", SCHEME, WORD, wordjr);
    fastts(Start, "mailto", SCHEME, WORD, wordjr);
    fastts(Start, "http", SLASH_SCHEME, WORD, wordjr);
    fastts(Start, "https", SLASH_SCHEME, WORD, wordjr);
    fastts(Start, "ftp", SLASH_SCHEME, WORD, wordjr);
    fastts(Start, "ftps", SLASH_SCHEME, WORD, wordjr);
    addToGroups(SCHEME, {
      scheme: true,
      ascii: true
    }, groups);
    addToGroups(SLASH_SCHEME, {
      slashscheme: true,
      ascii: true
    }, groups);
    customSchemes = customSchemes.sort((a2, b2) => a2[0] > b2[0] ? 1 : -1);
    for (let i2 = 0; i2 < customSchemes.length; i2++) {
      const sch = customSchemes[i2][0];
      const optionalSlashSlash = customSchemes[i2][1];
      const flags = optionalSlashSlash ? {
        [scheme]: true
      } : {
        [slashscheme]: true
      };
      if (sch.indexOf("-") >= 0) {
        flags[domain] = true;
      } else if (!ASCII_LETTER.test(sch)) {
        flags[numeric] = true;
      } else if (DIGIT.test(sch)) {
        flags[asciinumeric] = true;
      } else {
        flags[ascii] = true;
      }
      ts(Start, sch, sch, flags);
    }
    ts(Start, "localhost", LOCALHOST, {
      ascii: true
    });
    Start.jd = new State(SYM);
    return {
      start: Start,
      tokens: assign({
        groups
      }, tk)
    };
  }
  function run$1(start, str) {
    const iterable = stringToArray(str.replace(/[A-Z]/g, (c2) => c2.toLowerCase()));
    const charCount = iterable.length;
    const tokens = [];
    let cursor = 0;
    let charCursor = 0;
    while (charCursor < charCount) {
      let state = start;
      let nextState = null;
      let tokenLength = 0;
      let latestAccepting = null;
      let sinceAccepts = -1;
      let charsSinceAccepts = -1;
      while (charCursor < charCount && (nextState = state.go(iterable[charCursor]))) {
        state = nextState;
        if (state.accepts()) {
          sinceAccepts = 0;
          charsSinceAccepts = 0;
          latestAccepting = state;
        } else if (sinceAccepts >= 0) {
          sinceAccepts += iterable[charCursor].length;
          charsSinceAccepts++;
        }
        tokenLength += iterable[charCursor].length;
        cursor += iterable[charCursor].length;
        charCursor++;
      }
      cursor -= sinceAccepts;
      charCursor -= charsSinceAccepts;
      tokenLength -= sinceAccepts;
      tokens.push({
        t: latestAccepting.t,
        // token type/name
        v: str.slice(cursor - tokenLength, cursor),
        // string value
        s: cursor - tokenLength,
        // start index
        e: cursor
        // end index (excluding)
      });
    }
    return tokens;
  }
  function stringToArray(str) {
    const result = [];
    const len = str.length;
    let index = 0;
    while (index < len) {
      let first2 = str.charCodeAt(index);
      let second;
      let char = first2 < 55296 || first2 > 56319 || index + 1 === len || (second = str.charCodeAt(index + 1)) < 56320 || second > 57343 ? str[index] : str.slice(index, index + 2);
      result.push(char);
      index += char.length;
    }
    return result;
  }
  function fastts(state, input, t, defaultt, jr) {
    let next;
    const len = input.length;
    for (let i2 = 0; i2 < len - 1; i2++) {
      const char = input[i2];
      if (state.j[char]) {
        next = state.j[char];
      } else {
        next = new State(defaultt);
        next.jr = jr.slice();
        state.j[char] = next;
      }
      state = next;
    }
    next = new State(t);
    next.jr = jr.slice();
    state.j[input[len - 1]] = next;
    return next;
  }
  function decodeTlds(encoded) {
    const words = [];
    const stack = [];
    let i2 = 0;
    let digits = "0123456789";
    while (i2 < encoded.length) {
      let popDigitCount = 0;
      while (digits.indexOf(encoded[i2 + popDigitCount]) >= 0) {
        popDigitCount++;
      }
      if (popDigitCount > 0) {
        words.push(stack.join(""));
        for (let popCount = parseInt(encoded.substring(i2, i2 + popDigitCount), 10); popCount > 0; popCount--) {
          stack.pop();
        }
        i2 += popDigitCount;
      } else {
        stack.push(encoded[i2]);
        i2++;
      }
    }
    return words;
  }
  const defaults = {
    defaultProtocol: "http",
    events: null,
    format: noop,
    formatHref: noop,
    nl2br: false,
    tagName: "a",
    target: null,
    rel: null,
    validate: true,
    truncate: Infinity,
    className: null,
    attributes: null,
    ignoreTags: [],
    render: null
  };
  function Options(opts, defaultRender = null) {
    let o2 = assign({}, defaults);
    if (opts) {
      o2 = assign(o2, opts instanceof Options ? opts.o : opts);
    }
    const ignoredTags = o2.ignoreTags;
    const uppercaseIgnoredTags = [];
    for (let i2 = 0; i2 < ignoredTags.length; i2++) {
      uppercaseIgnoredTags.push(ignoredTags[i2].toUpperCase());
    }
    this.o = o2;
    if (defaultRender) {
      this.defaultRender = defaultRender;
    }
    this.ignoreTags = uppercaseIgnoredTags;
  }
  Options.prototype = {
    o: defaults,
    /**
     * @type string[]
     */
    ignoreTags: [],
    /**
     * @param {IntermediateRepresentation} ir
     * @returns {any}
     */
    defaultRender(ir) {
      return ir;
    },
    /**
     * Returns true or false based on whether a token should be displayed as a
     * link based on the user options.
     * @param {MultiToken} token
     * @returns {boolean}
     */
    check(token) {
      return this.get("validate", token.toString(), token);
    },
    // Private methods
    /**
     * Resolve an option's value based on the value of the option and the given
     * params. If operator and token are specified and the target option is
     * callable, automatically calls the function with the given argument.
     * @template {keyof Opts} K
     * @param {K} key Name of option to use
     * @param {string} [operator] will be passed to the target option if it's a
     * function. If not specified, RAW function value gets returned
     * @param {MultiToken} [token] The token from linkify.tokenize
     * @returns {Opts[K] | any}
     */
    get(key, operator, token) {
      const isCallable = operator != null;
      let option = this.o[key];
      if (!option) {
        return option;
      }
      if (typeof option === "object") {
        option = token.t in option ? option[token.t] : defaults[key];
        if (typeof option === "function" && isCallable) {
          option = option(operator, token);
        }
      } else if (typeof option === "function" && isCallable) {
        option = option(operator, token.t, token);
      }
      return option;
    },
    /**
     * @template {keyof Opts} L
     * @param {L} key Name of options object to use
     * @param {string} [operator]
     * @param {MultiToken} [token]
     * @returns {Opts[L] | any}
     */
    getObj(key, operator, token) {
      let obj = this.o[key];
      if (typeof obj === "function" && operator != null) {
        obj = obj(operator, token.t, token);
      }
      return obj;
    },
    /**
     * Convert the given token to a rendered element that may be added to the
     * calling-interface's DOM
     * @param {MultiToken} token Token to render to an HTML element
     * @returns {any} Render result; e.g., HTML string, DOM element, React
     *   Component, etc.
     */
    render(token) {
      const ir = token.render(this);
      const renderFn = this.get("render", null, token) || this.defaultRender;
      return renderFn(ir, token.t, token);
    }
  };
  function noop(val) {
    return val;
  }
  function MultiToken(value, tokens) {
    this.t = "token";
    this.v = value;
    this.tk = tokens;
  }
  MultiToken.prototype = {
    isLink: false,
    /**
     * Return the string this token represents.
     * @return {string}
     */
    toString() {
      return this.v;
    },
    /**
     * What should the value for this token be in the `href` HTML attribute?
     * Returns the `.toString` value by default.
     * @param {string} [scheme]
     * @return {string}
     */
    toHref(scheme2) {
      return this.toString();
    },
    /**
     * @param {Options} options Formatting options
     * @returns {string}
     */
    toFormattedString(options) {
      const val = this.toString();
      const truncate = options.get("truncate", val, this);
      const formatted = options.get("format", val, this);
      return truncate && formatted.length > truncate ? formatted.substring(0, truncate) + "…" : formatted;
    },
    /**
     *
     * @param {Options} options
     * @returns {string}
     */
    toFormattedHref(options) {
      return options.get("formatHref", this.toHref(options.get("defaultProtocol")), this);
    },
    /**
     * The start index of this token in the original input string
     * @returns {number}
     */
    startIndex() {
      return this.tk[0].s;
    },
    /**
     * The end index of this token in the original input string (up to this
     * index but not including it)
     * @returns {number}
     */
    endIndex() {
      return this.tk[this.tk.length - 1].e;
    },
    /**
    	Returns an object  of relevant values for this token, which includes keys
    	* type - Kind of token ('url', 'email', etc.)
    	* value - Original text
    	* href - The value that should be added to the anchor tag's href
    		attribute
    		@method toObject
    	@param {string} [protocol] `'http'` by default
    */
    toObject(protocol = defaults.defaultProtocol) {
      return {
        type: this.t,
        value: this.toString(),
        isLink: this.isLink,
        href: this.toHref(protocol),
        start: this.startIndex(),
        end: this.endIndex()
      };
    },
    /**
     *
     * @param {Options} options Formatting option
     */
    toFormattedObject(options) {
      return {
        type: this.t,
        value: this.toFormattedString(options),
        isLink: this.isLink,
        href: this.toFormattedHref(options),
        start: this.startIndex(),
        end: this.endIndex()
      };
    },
    /**
     * Whether this token should be rendered as a link according to the given options
     * @param {Options} options
     * @returns {boolean}
     */
    validate(options) {
      return options.get("validate", this.toString(), this);
    },
    /**
     * Return an object that represents how this link should be rendered.
     * @param {Options} options Formattinng options
     */
    render(options) {
      const token = this;
      const href = this.toHref(options.get("defaultProtocol"));
      const formattedHref = options.get("formatHref", href, this);
      const tagName = options.get("tagName", href, token);
      const content = this.toFormattedString(options);
      const attributes = {};
      const className = options.get("className", href, token);
      const target = options.get("target", href, token);
      const rel = options.get("rel", href, token);
      const attrs = options.getObj("attributes", href, token);
      const eventListeners = options.getObj("events", href, token);
      attributes.href = formattedHref;
      if (className) {
        attributes.class = className;
      }
      if (target) {
        attributes.target = target;
      }
      if (rel) {
        attributes.rel = rel;
      }
      if (attrs) {
        assign(attributes, attrs);
      }
      return {
        tagName,
        attributes,
        content,
        eventListeners
      };
    }
  };
  function createTokenClass(type, props) {
    class Token extends MultiToken {
      constructor(value, tokens) {
        super(value, tokens);
        this.t = type;
      }
    }
    for (const p2 in props) {
      Token.prototype[p2] = props[p2];
    }
    Token.t = type;
    return Token;
  }
  const Email = createTokenClass("email", {
    isLink: true,
    toHref() {
      return "mailto:" + this.toString();
    }
  });
  const Text = createTokenClass("text");
  const Nl = createTokenClass("nl");
  const Url = createTokenClass("url", {
    isLink: true,
    /**
    	Lowercases relevant parts of the domain and adds the protocol if
    	required. Note that this will not escape unsafe HTML characters in the
    	URL.
    		@param {string} [scheme] default scheme (e.g., 'https')
    	@return {string} the full href
    */
    toHref(scheme2 = defaults.defaultProtocol) {
      return this.hasProtocol() ? this.v : `${scheme2}://${this.v}`;
    },
    /**
     * Check whether this URL token has a protocol
     * @return {boolean}
     */
    hasProtocol() {
      const tokens = this.tk;
      return tokens.length >= 2 && tokens[0].t !== LOCALHOST && tokens[1].t === COLON;
    }
  });
  const makeState = (arg) => new State(arg);
  function init$1({
    groups
  }) {
    const qsAccepting = groups.domain.concat([AMPERSAND, ASTERISK, AT, BACKSLASH, BACKTICK, CARET, DOLLAR, EQUALS, HYPHEN, NUM, PERCENT, PIPE, PLUS, POUND, SLASH, SYM, TILDE, UNDERSCORE]);
    const qsNonAccepting = [COLON, COMMA, DOT, EXCLAMATION, PERCENT, QUERY, QUOTE, SEMI, OPENANGLEBRACKET, CLOSEANGLEBRACKET, OPENBRACE, CLOSEBRACE, CLOSEBRACKET, OPENBRACKET, OPENPAREN, CLOSEPAREN, FULLWIDTHLEFTPAREN, FULLWIDTHRIGHTPAREN, LEFTCORNERBRACKET, RIGHTCORNERBRACKET, LEFTWHITECORNERBRACKET, RIGHTWHITECORNERBRACKET, FULLWIDTHLESSTHAN, FULLWIDTHGREATERTHAN];
    const localpartAccepting = [AMPERSAND, APOSTROPHE, ASTERISK, BACKSLASH, BACKTICK, CARET, DOLLAR, EQUALS, HYPHEN, OPENBRACE, CLOSEBRACE, PERCENT, PIPE, PLUS, POUND, QUERY, SLASH, SYM, TILDE, UNDERSCORE];
    const Start = makeState();
    const Localpart = tt(Start, TILDE);
    ta(Localpart, localpartAccepting, Localpart);
    ta(Localpart, groups.domain, Localpart);
    const Domain = makeState(), Scheme = makeState(), SlashScheme = makeState();
    ta(Start, groups.domain, Domain);
    ta(Start, groups.scheme, Scheme);
    ta(Start, groups.slashscheme, SlashScheme);
    ta(Domain, localpartAccepting, Localpart);
    ta(Domain, groups.domain, Domain);
    const LocalpartAt = tt(Domain, AT);
    tt(Localpart, AT, LocalpartAt);
    tt(Scheme, AT, LocalpartAt);
    tt(SlashScheme, AT, LocalpartAt);
    const LocalpartDot = tt(Localpart, DOT);
    ta(LocalpartDot, localpartAccepting, Localpart);
    ta(LocalpartDot, groups.domain, Localpart);
    const EmailDomain = makeState();
    ta(LocalpartAt, groups.domain, EmailDomain);
    ta(EmailDomain, groups.domain, EmailDomain);
    const EmailDomainDot = tt(EmailDomain, DOT);
    ta(EmailDomainDot, groups.domain, EmailDomain);
    const Email$1 = makeState(Email);
    ta(EmailDomainDot, groups.tld, Email$1);
    ta(EmailDomainDot, groups.utld, Email$1);
    tt(LocalpartAt, LOCALHOST, Email$1);
    const EmailDomainHyphen = tt(EmailDomain, HYPHEN);
    tt(EmailDomainHyphen, HYPHEN, EmailDomainHyphen);
    ta(EmailDomainHyphen, groups.domain, EmailDomain);
    ta(Email$1, groups.domain, EmailDomain);
    tt(Email$1, DOT, EmailDomainDot);
    tt(Email$1, HYPHEN, EmailDomainHyphen);
    const EmailColon = tt(Email$1, COLON);
    ta(EmailColon, groups.numeric, Email);
    const DomainHyphen = tt(Domain, HYPHEN);
    const DomainDot = tt(Domain, DOT);
    tt(DomainHyphen, HYPHEN, DomainHyphen);
    ta(DomainHyphen, groups.domain, Domain);
    ta(DomainDot, localpartAccepting, Localpart);
    ta(DomainDot, groups.domain, Domain);
    const DomainDotTld = makeState(Url);
    ta(DomainDot, groups.tld, DomainDotTld);
    ta(DomainDot, groups.utld, DomainDotTld);
    ta(DomainDotTld, groups.domain, Domain);
    ta(DomainDotTld, localpartAccepting, Localpart);
    tt(DomainDotTld, DOT, DomainDot);
    tt(DomainDotTld, HYPHEN, DomainHyphen);
    tt(DomainDotTld, AT, LocalpartAt);
    const DomainDotTldColon = tt(DomainDotTld, COLON);
    const DomainDotTldColonPort = makeState(Url);
    ta(DomainDotTldColon, groups.numeric, DomainDotTldColonPort);
    const Url$1 = makeState(Url);
    const UrlNonaccept = makeState();
    ta(Url$1, qsAccepting, Url$1);
    ta(Url$1, qsNonAccepting, UrlNonaccept);
    ta(UrlNonaccept, qsAccepting, Url$1);
    ta(UrlNonaccept, qsNonAccepting, UrlNonaccept);
    tt(DomainDotTld, SLASH, Url$1);
    tt(DomainDotTldColonPort, SLASH, Url$1);
    const SchemeColon = tt(Scheme, COLON);
    const SlashSchemeColon = tt(SlashScheme, COLON);
    const SlashSchemeColonSlash = tt(SlashSchemeColon, SLASH);
    const UriPrefix = tt(SlashSchemeColonSlash, SLASH);
    ta(Scheme, groups.domain, Domain);
    tt(Scheme, DOT, DomainDot);
    tt(Scheme, HYPHEN, DomainHyphen);
    ta(SlashScheme, groups.domain, Domain);
    tt(SlashScheme, DOT, DomainDot);
    tt(SlashScheme, HYPHEN, DomainHyphen);
    ta(SchemeColon, groups.domain, Url$1);
    tt(SchemeColon, SLASH, Url$1);
    tt(SchemeColon, QUERY, Url$1);
    ta(UriPrefix, groups.domain, Url$1);
    ta(UriPrefix, qsAccepting, Url$1);
    tt(UriPrefix, SLASH, Url$1);
    const bracketPairs = [
      [OPENBRACE, CLOSEBRACE],
      // {}
      [OPENBRACKET, CLOSEBRACKET],
      // []
      [OPENPAREN, CLOSEPAREN],
      // ()
      [OPENANGLEBRACKET, CLOSEANGLEBRACKET],
      // <>
      [FULLWIDTHLEFTPAREN, FULLWIDTHRIGHTPAREN],
      // （）
      [LEFTCORNERBRACKET, RIGHTCORNERBRACKET],
      // 「」
      [LEFTWHITECORNERBRACKET, RIGHTWHITECORNERBRACKET],
      // 『』
      [FULLWIDTHLESSTHAN, FULLWIDTHGREATERTHAN]
      // ＜＞
    ];
    for (let i2 = 0; i2 < bracketPairs.length; i2++) {
      const [OPEN, CLOSE] = bracketPairs[i2];
      const UrlOpen = tt(Url$1, OPEN);
      tt(UrlNonaccept, OPEN, UrlOpen);
      tt(UrlOpen, CLOSE, Url$1);
      const UrlOpenQ = makeState(Url);
      ta(UrlOpen, qsAccepting, UrlOpenQ);
      const UrlOpenSyms = makeState();
      ta(UrlOpen, qsNonAccepting);
      ta(UrlOpenQ, qsAccepting, UrlOpenQ);
      ta(UrlOpenQ, qsNonAccepting, UrlOpenSyms);
      ta(UrlOpenSyms, qsAccepting, UrlOpenQ);
      ta(UrlOpenSyms, qsNonAccepting, UrlOpenSyms);
      tt(UrlOpenQ, CLOSE, Url$1);
      tt(UrlOpenSyms, CLOSE, Url$1);
    }
    tt(Start, LOCALHOST, DomainDotTld);
    tt(Start, NL, Nl);
    return {
      start: Start,
      tokens: tk
    };
  }
  function run(start, input, tokens) {
    let len = tokens.length;
    let cursor = 0;
    let multis = [];
    let textTokens = [];
    while (cursor < len) {
      let state = start;
      let secondState = null;
      let nextState = null;
      let multiLength = 0;
      let latestAccepting = null;
      let sinceAccepts = -1;
      while (cursor < len && !(secondState = state.go(tokens[cursor].t))) {
        textTokens.push(tokens[cursor++]);
      }
      while (cursor < len && (nextState = secondState || state.go(tokens[cursor].t))) {
        secondState = null;
        state = nextState;
        if (state.accepts()) {
          sinceAccepts = 0;
          latestAccepting = state;
        } else if (sinceAccepts >= 0) {
          sinceAccepts++;
        }
        cursor++;
        multiLength++;
      }
      if (sinceAccepts < 0) {
        cursor -= multiLength;
        if (cursor < len) {
          textTokens.push(tokens[cursor]);
          cursor++;
        }
      } else {
        if (textTokens.length > 0) {
          multis.push(initMultiToken(Text, input, textTokens));
          textTokens = [];
        }
        cursor -= sinceAccepts;
        multiLength -= sinceAccepts;
        const Multi = latestAccepting.t;
        const subtokens = tokens.slice(cursor - multiLength, cursor);
        multis.push(initMultiToken(Multi, input, subtokens));
      }
    }
    if (textTokens.length > 0) {
      multis.push(initMultiToken(Text, input, textTokens));
    }
    return multis;
  }
  function initMultiToken(Multi, input, tokens) {
    const startIdx = tokens[0].s;
    const endIdx = tokens[tokens.length - 1].e;
    const value = input.slice(startIdx, endIdx);
    return new Multi(value, tokens);
  }
  const warn = typeof console !== "undefined" && console && console.warn || (() => {
  });
  const warnAdvice = "until manual call of linkify.init(). Register all schemes and plugins before invoking linkify the first time.";
  const INIT = {
    scanner: null,
    parser: null,
    tokenQueue: [],
    pluginQueue: [],
    customSchemes: [],
    initialized: false
  };
  function reset() {
    State.groups = {};
    INIT.scanner = null;
    INIT.parser = null;
    INIT.tokenQueue = [];
    INIT.pluginQueue = [];
    INIT.customSchemes = [];
    INIT.initialized = false;
    return INIT;
  }
  function registerCustomProtocol(scheme2, optionalSlashSlash = false) {
    if (INIT.initialized) {
      warn(`linkifyjs: already initialized - will not register custom scheme "${scheme2}" ${warnAdvice}`);
    }
    if (!/^[0-9a-z]+(-[0-9a-z]+)*$/.test(scheme2)) {
      throw new Error(`linkifyjs: incorrect scheme format.
1. Must only contain digits, lowercase ASCII letters or "-"
2. Cannot start or end with "-"
3. "-" cannot repeat`);
    }
    INIT.customSchemes.push([scheme2, optionalSlashSlash]);
  }
  function init() {
    INIT.scanner = init$2(INIT.customSchemes);
    for (let i2 = 0; i2 < INIT.tokenQueue.length; i2++) {
      INIT.tokenQueue[i2][1]({
        scanner: INIT.scanner
      });
    }
    INIT.parser = init$1(INIT.scanner.tokens);
    for (let i2 = 0; i2 < INIT.pluginQueue.length; i2++) {
      INIT.pluginQueue[i2][1]({
        scanner: INIT.scanner,
        parser: INIT.parser
      });
    }
    INIT.initialized = true;
    return INIT;
  }
  function tokenize(str) {
    if (!INIT.initialized) {
      init();
    }
    return run(INIT.parser.start, str, run$1(INIT.scanner.start, str));
  }
  tokenize.scan = run$1;
  function find(str, type = null, opts = null) {
    if (type && typeof type === "object") {
      if (opts) {
        throw Error(`linkifyjs: Invalid link type ${type}; must be a string`);
      }
      opts = type;
      type = null;
    }
    const options = new Options(opts);
    const tokens = tokenize(str);
    const filtered = [];
    for (let i2 = 0; i2 < tokens.length; i2++) {
      const token = tokens[i2];
      if (token.isLink && (!type || token.t === type) && options.check(token)) {
        filtered.push(token.toFormattedObject(options));
      }
    }
    return filtered;
  }
  function isValidLinkStructure(tokens) {
    if (tokens.length === 1) {
      return tokens[0].isLink;
    }
    if (tokens.length === 3 && tokens[1].isLink) {
      return ["()", "[]"].includes(tokens[0].value + tokens[2].value);
    }
    return false;
  }
  function autolink(options) {
    return new Plugin({
      key: new PluginKey("autolink"),
      appendTransaction: (transactions, oldState, newState) => {
        const docChanges = transactions.some((transaction) => transaction.docChanged) && !oldState.doc.eq(newState.doc);
        const preventAutolink = transactions.some((transaction) => transaction.getMeta("preventAutolink"));
        if (!docChanges || preventAutolink) {
          return;
        }
        const { tr: tr2 } = newState;
        const transform = combineTransactionSteps(oldState.doc, [...transactions]);
        const changes = getChangedRanges(transform);
        changes.forEach(({ newRange }) => {
          const nodesInChangedRanges = findChildrenInRange(newState.doc, newRange, (node) => node.isTextblock);
          let textBlock;
          let textBeforeWhitespace;
          if (nodesInChangedRanges.length > 1) {
            textBlock = nodesInChangedRanges[0];
            textBeforeWhitespace = newState.doc.textBetween(textBlock.pos, textBlock.pos + textBlock.node.nodeSize, void 0, " ");
          } else if (nodesInChangedRanges.length && newState.doc.textBetween(newRange.from, newRange.to, " ", " ").endsWith(" ")) {
            textBlock = nodesInChangedRanges[0];
            textBeforeWhitespace = newState.doc.textBetween(textBlock.pos, newRange.to, void 0, " ");
          }
          if (textBlock && textBeforeWhitespace) {
            const wordsBeforeWhitespace = textBeforeWhitespace.split(" ").filter((s) => s !== "");
            if (wordsBeforeWhitespace.length <= 0) {
              return false;
            }
            const lastWordBeforeSpace = wordsBeforeWhitespace[wordsBeforeWhitespace.length - 1];
            const lastWordAndBlockOffset = textBlock.pos + textBeforeWhitespace.lastIndexOf(lastWordBeforeSpace);
            if (!lastWordBeforeSpace) {
              return false;
            }
            const linksBeforeSpace = tokenize(lastWordBeforeSpace).map((t) => t.toObject(options.defaultProtocol));
            if (!isValidLinkStructure(linksBeforeSpace)) {
              return false;
            }
            linksBeforeSpace.filter((link) => link.isLink).map((link) => ({
              ...link,
              from: lastWordAndBlockOffset + link.start + 1,
              to: lastWordAndBlockOffset + link.end + 1
            })).filter((link) => {
              if (!newState.schema.marks.code) {
                return true;
              }
              return !newState.doc.rangeHasMark(link.from, link.to, newState.schema.marks.code);
            }).filter((link) => options.validate(link.value)).filter((link) => options.shouldAutoLink(link.value)).forEach((link) => {
              if (getMarksBetween(link.from, link.to, newState.doc).some((item) => item.mark.type === options.type)) {
                return;
              }
              tr2.addMark(link.from, link.to, options.type.create({
                href: link.href
              }));
            });
          }
        });
        if (!tr2.steps.length) {
          return;
        }
        return tr2;
      }
    });
  }
  function clickHandler(options) {
    return new Plugin({
      key: new PluginKey("handleClickLink"),
      props: {
        handleClick: (view, pos, event) => {
          var _a, _b;
          if (event.button !== 0) {
            return false;
          }
          if (!view.editable) {
            return false;
          }
          let a2 = event.target;
          const els = [];
          while (a2.nodeName !== "DIV") {
            els.push(a2);
            a2 = a2.parentNode;
          }
          if (!els.find((value) => value.nodeName === "A")) {
            return false;
          }
          const attrs = getAttributes(view.state, options.type.name);
          const link = event.target;
          const href = (_a = link === null || link === void 0 ? void 0 : link.href) !== null && _a !== void 0 ? _a : attrs.href;
          const target = (_b = link === null || link === void 0 ? void 0 : link.target) !== null && _b !== void 0 ? _b : attrs.target;
          if (link && href) {
            window.open(href, target);
            return true;
          }
          return false;
        }
      }
    });
  }
  function pasteHandler(options) {
    return new Plugin({
      key: new PluginKey("handlePasteLink"),
      props: {
        handlePaste: (view, event, slice) => {
          const { state } = view;
          const { selection } = state;
          const { empty: empty2 } = selection;
          if (empty2) {
            return false;
          }
          let textContent = "";
          slice.content.forEach((node) => {
            textContent += node.textContent;
          });
          const link = find(textContent, { defaultProtocol: options.defaultProtocol }).find((item) => item.isLink && item.value === textContent);
          if (!textContent || !link) {
            return false;
          }
          options.editor.commands.setMark(options.type, {
            href: link.href
          });
          return true;
        }
      }
    });
  }
  const ATTR_WHITESPACE = /[\u0000-\u0020\u00A0\u1680\u180E\u2000-\u2029\u205F\u3000]/g;
  function isAllowedUri(uri, protocols) {
    const allowedProtocols = [
      "http",
      "https",
      "ftp",
      "ftps",
      "mailto",
      "tel",
      "callto",
      "sms",
      "cid",
      "xmpp"
    ];
    if (protocols) {
      protocols.forEach((protocol) => {
        const nextProtocol = typeof protocol === "string" ? protocol : protocol.scheme;
        if (nextProtocol) {
          allowedProtocols.push(nextProtocol);
        }
      });
    }
    return !uri || uri.replace(ATTR_WHITESPACE, "").match(new RegExp(
      // eslint-disable-next-line no-useless-escape
      `^(?:(?:${allowedProtocols.join("|")}):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))`,
      "i"
    ));
  }
  const Link = Mark.create({
    name: "link",
    priority: 1e3,
    keepOnSplit: false,
    exitable: true,
    onCreate() {
      if (this.options.validate && !this.options.shouldAutoLink) {
        this.options.shouldAutoLink = this.options.validate;
        console.warn("The `validate` option is deprecated. Rename to the `shouldAutoLink` option instead.");
      }
      this.options.protocols.forEach((protocol) => {
        if (typeof protocol === "string") {
          registerCustomProtocol(protocol);
          return;
        }
        registerCustomProtocol(protocol.scheme, protocol.optionalSlashes);
      });
    },
    onDestroy() {
      reset();
    },
    inclusive() {
      return this.options.autolink;
    },
    addOptions() {
      return {
        openOnClick: true,
        linkOnPaste: true,
        autolink: true,
        protocols: [],
        defaultProtocol: "http",
        HTMLAttributes: {
          target: "_blank",
          rel: "noopener noreferrer nofollow",
          class: null
        },
        isAllowedUri: (url, ctx) => !!isAllowedUri(url, ctx.protocols),
        validate: (url) => !!url,
        shouldAutoLink: (url) => !!url
      };
    },
    addAttributes() {
      return {
        href: {
          default: null,
          parseHTML(element) {
            return element.getAttribute("href");
          }
        },
        target: {
          default: this.options.HTMLAttributes.target
        },
        rel: {
          default: this.options.HTMLAttributes.rel
        },
        class: {
          default: this.options.HTMLAttributes.class
        }
      };
    },
    parseHTML() {
      return [
        {
          tag: "a[href]",
          getAttrs: (dom) => {
            const href = dom.getAttribute("href");
            if (!href || !this.options.isAllowedUri(href, {
              defaultValidate: (url) => !!isAllowedUri(url, this.options.protocols),
              protocols: this.options.protocols,
              defaultProtocol: this.options.defaultProtocol
            })) {
              return false;
            }
            return null;
          }
        }
      ];
    },
    renderHTML({ HTMLAttributes }) {
      if (!this.options.isAllowedUri(HTMLAttributes.href, {
        defaultValidate: (href) => !!isAllowedUri(href, this.options.protocols),
        protocols: this.options.protocols,
        defaultProtocol: this.options.defaultProtocol
      })) {
        return [
          "a",
          mergeAttributes(this.options.HTMLAttributes, { ...HTMLAttributes, href: "" }),
          0
        ];
      }
      return ["a", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
    },
    addCommands() {
      return {
        setLink: (attributes) => ({ chain }) => {
          return chain().setMark(this.name, attributes).setMeta("preventAutolink", true).run();
        },
        toggleLink: (attributes) => ({ chain }) => {
          return chain().toggleMark(this.name, attributes, { extendEmptyMarkRange: true }).setMeta("preventAutolink", true).run();
        },
        unsetLink: () => ({ chain }) => {
          return chain().unsetMark(this.name, { extendEmptyMarkRange: true }).setMeta("preventAutolink", true).run();
        }
      };
    },
    addPasteRules() {
      return [
        markPasteRule({
          find: (text) => {
            const foundLinks = [];
            if (text) {
              const { protocols, defaultProtocol } = this.options;
              const links = find(text).filter((item) => item.isLink && this.options.isAllowedUri(item.value, {
                defaultValidate: (href) => !!isAllowedUri(href, protocols),
                protocols,
                defaultProtocol
              }));
              if (links.length) {
                links.forEach((link) => foundLinks.push({
                  text: link.value,
                  data: {
                    href: link.href
                  },
                  index: link.start
                }));
              }
            }
            return foundLinks;
          },
          type: this.type,
          getAttributes: (match) => {
            var _a;
            return {
              href: (_a = match.data) === null || _a === void 0 ? void 0 : _a.href
            };
          }
        })
      ];
    },
    addProseMirrorPlugins() {
      const plugins = [];
      const { protocols, defaultProtocol } = this.options;
      if (this.options.autolink) {
        plugins.push(autolink({
          type: this.type,
          defaultProtocol: this.options.defaultProtocol,
          validate: (url) => this.options.isAllowedUri(url, {
            defaultValidate: (href) => !!isAllowedUri(href, protocols),
            protocols,
            defaultProtocol
          }),
          shouldAutoLink: this.options.shouldAutoLink
        }));
      }
      if (this.options.openOnClick === true) {
        plugins.push(clickHandler({
          type: this.type
        }));
      }
      if (this.options.linkOnPaste) {
        plugins.push(pasteHandler({
          editor: this.editor,
          defaultProtocol: this.options.defaultProtocol,
          type: this.type
        }));
      }
      return plugins;
    }
  });
  const a = new PluginKey("invisibleCharacters"), o = (e, t) => {
    const r = a, o2 = DecorationSet.create(e.doc, []), c2 = (e2, i2, n, s) => t.builders.sort((e3, t2) => e3.priority > t2.priority ? 1 : -1).reduce((t2, s2) => s2.createDecoration(e2, i2, n.doc, t2), s);
    return new Plugin({ key: r, state: { init: () => {
      const { $from: i2, $to: r2 } = new AllSelection(e.doc);
      return t.injectCSS && document && ((e2, t2) => {
        const i3 = document.querySelector("style[data-tiptap-extension-invisible-characters-style]");
        if (null !== i3) return i3;
        const n = document.createElement("style");
        t2 && n.setAttribute("nonce", t2), n.setAttribute("data-tiptap-extension-invisible-characters-style", ""), n.innerHTML = e2, document.getElementsByTagName("head")[0].appendChild(n);
      })(".Tiptap-invisible-character {\n  height: 0;\n  padding: 0;\n  pointer-events: none;\n  user-select: none;\n  width: 0;\n}\n\n.Tiptap-invisible-character::before {\n  caret-color: inherit;\n  color: #aaa;\n  display: inline-block;\n  font-style: normal;\n  font-weight: 400;\n  line-height: 1em;\n  width: 0;\n}\n\n.Tiptap-invisible-character--space::before {\n  content: '·'\n}\n\n.Tiptap-invisible-character--break::before {\n  content: '¬'\n}\n\n.Tiptap-invisible-character--paragraph::before {\n  content: '¶'\n}\n\n.Tiptap-invisible-character + img.ProseMirror-separator {\n  height: 0 !important;\n  pointer-events: none;\n  user-select: none;\n  width: 0 !important;\n}\n\n.is-empty[data-placeholder].has-focus > .Tiptap-invisible-character {\n  display: none;\n}\n", t.injectNonce), { visible: t.visible, decorations: c2(i2.pos, r2.pos, e, DecorationSet.empty) };
    }, apply: (e2, t2, i2, n) => {
      const s = ((e3, t3) => void 0 === t3 ? e3 : { ...e3, visible: t3 })(t2, e2.getMeta("setInvisibleCharactersVisible")), r2 = (({ mapping: e3 }) => {
        const t3 = [];
        return e3.maps.forEach((i3, n2) => {
          i3.forEach((i4, s2, r3, a2) => {
            t3.push([e3.slice(n2 + 1).map(r3), e3.slice(n2 + 1).map(a2)]);
          });
        }), t3;
      })(e2).reduce((e3, [t3, i3]) => c2(t3, i3, n, e3), s.decorations.map(e2.mapping, e2.doc));
      return { ...s, decorations: r2 };
    } }, props: { decorations(e2) {
      const t2 = this.getState(e2), i2 = null == t2 ? void 0 : t2.visible, n = null == t2 ? void 0 : t2.decorations;
      return i2 ? n : o2;
    } } });
  }, c = (e, t, i2) => Decoration.widget(e, () => {
    const e2 = document.createElement("span");
    return e2.classList.add("Tiptap-invisible-character"), e2.classList.add(`Tiptap-invisible-character--${t}`), i2 && (e2.textContent = i2), e2;
  }, { key: t, marks: [], side: 1e3 }), p = (e, t) => t + e.nodeSize - 1;
  class d {
    constructor(e) {
      this.predicate = e.predicate, this.type = e.type, this.position = e.position || p, this.content = e.content, this.priority = e.priority || 100;
    }
    createDecoration(e, t, i2, n) {
      let s = n;
      return i2.nodesBetween(e, t, (e2, t2) => {
        if (this.test(e2)) {
          const n2 = this.position(e2, t2), r = s.find(n2, n2, (e3) => e3.key === this.type);
          s = s.remove(r).add(i2, [c(n2, this.type, this.content)]);
        }
      }), s;
    }
    test(e) {
      return this.predicate(e);
    }
  }
  class l extends d {
    constructor() {
      super({ type: "break", predicate: (e) => e.type === e.type.schema.nodes.hardBreak });
    }
  }
  class h extends d {
    constructor() {
      super({ type: "paragraph", predicate: (e) => e.type === e.type.schema.nodes.paragraph });
    }
  }
  class u {
    constructor(e) {
      this.predicate = e.predicate, this.type = e.type, this.content = e.content, this.priority = e.priority || 100;
    }
    createDecoration(e, t, i2, n) {
      const s = ((e2, t2, i3) => {
        const n2 = [];
        return i3.nodesBetween(e2, t2, (i4, s2) => {
          var r;
          if (i4.isText) {
            const a2 = Math.max(e2, s2) - s2;
            n2.push({ pos: s2 + a2, text: (null === (r = i4.text) || void 0 === r ? void 0 : r.slice(a2, t2 - s2)) || "" });
          }
        }), n2;
      })(e, t, i2);
      return s.reduce((e2, t2) => t2.text.split("").reduce((e3, n2, s2) => this.test(n2) ? e3.add(i2, [c(t2.pos + s2, this.type, this.content)]) : e3, e2), n);
    }
    test(e) {
      return this.predicate(e);
    }
  }
  class v extends u {
    constructor() {
      super({ type: "space", predicate: (e) => " " === e });
    }
  }
  const b = Extension.create({ name: "invisibleCharacters", addOptions: () => ({ visible: true, builders: [new v(), new h(), new l()], injectCSS: true, injectNonce: void 0 }), addProseMirrorPlugins() {
    return [o(this.editor.state, this.options)];
  }, addStorage() {
    return { visibility: () => this.options.visible };
  }, onBeforeCreate() {
    this.storage.visibility = () => {
      var e;
      return null === (e = a.getState(this.editor.state)) || void 0 === e ? void 0 : e.visible;
    };
  }, addCommands: () => ({ showInvisibleCharacters: (e = true) => ({ dispatch: t, tr: i2 }) => (t && i2.setMeta("setInvisibleCharactersVisible", e), true), hideInvisibleCharacters: () => ({ dispatch: e, tr: t }) => (e && t.setMeta("setInvisibleCharactersVisible", false), true), toggleInvisibleCharacters: () => ({ dispatch: e, tr: t, state: i2 }) => {
    var n;
    const s = !(null === (n = a.getState(i2)) || void 0 === n ? void 0 : n.visible);
    return e && t.setMeta("setInvisibleCharactersVisible", s), true;
  } }) });
  const Highlights = Extension.create({
    name: "highlights",
    addOptions: () => ({
      highlights: []
    }),
    addProseMirrorPlugins() {
      const createRegex = (pattern) => typeof pattern === "string" ? new RegExp(pattern, "g") : pattern;
      return [
        new Plugin({
          key: new PluginKey("highlights"),
          props: {
            decorations: (state) => {
              const decorations = [];
              state.doc.descendants((node, pos) => {
                if (!node.isText) return;
                this.options.highlights.forEach(
                  ({ pattern, class: className }) => {
                    const regex = createRegex(pattern);
                    let match;
                    while (match = regex.exec(node.text)) {
                      const from = pos + match.index;
                      const to = from + match[0].length;
                      decorations.push(
                        Decoration.inline(from, to, { class: className })
                      );
                    }
                  }
                );
              });
              return DecorationSet.create(state.doc, decorations);
            }
          }
        })
      ];
    }
  });
  function normalizeComponent(scriptExports, render, staticRenderFns, functionalTemplate, injectStyles, scopeId, moduleIdentifier, shadowMode) {
    var options = typeof scriptExports === "function" ? scriptExports.options : scriptExports;
    if (render) {
      options.render = render;
      options.staticRenderFns = staticRenderFns;
      options._compiled = true;
    }
    return {
      exports: scriptExports,
      options
    };
  }
  const buttonComponents = {
    headings: () => Promise.resolve().then(() => HeadingsButton$1),
    bold: () => Promise.resolve().then(() => BoldButton$1),
    italic: () => Promise.resolve().then(() => ItalicButton$1),
    strike: () => Promise.resolve().then(() => StrikeButton$1),
    code: () => Promise.resolve().then(() => CodeButton$1),
    link: () => Promise.resolve().then(() => LinkButton$1),
    bulletList: () => Promise.resolve().then(() => BulletListButton$1),
    orderedList: () => Promise.resolve().then(() => OrderedListButton$1)
  };
  const _sfc_main$a = {
    components: buttonComponents,
    props: {
      editor: {
        type: Object,
        required: true
      },
      label: {
        type: String,
        required: true
      },
      buttons: {
        type: Array,
        required: true
      }
    },
    computed: {
      buttonComponents() {
        return buttonComponents;
      },
      normalizedButtons() {
        return this.buttons.map((button) => {
          if (typeof button === "object" && button.headings) {
            return {
              type: "headings",
              levels: button.headings
            };
          }
          return {
            type: button,
            levels: null
          };
        });
      }
    },
    methods: {
      isSeperator(button) {
        return button.type === "|";
      },
      getComponentName(button) {
        return button.type;
      },
      getKey(button) {
        return button.type + (button.levels ? `-${button.levels.join("-")}` : "");
      },
      getLevels(button) {
        return button.levels;
      }
    }
  };
  var _sfc_render$a = function render() {
    var _vm = this, _c = _vm._self._c;
    return _vm.editor ? _c("nav", { staticClass: "k-toolbar" }, [_vm._l(_vm.normalizedButtons, function(button) {
      return [!_vm.isSeperator(button) ? _c(_vm.buttonComponents[_vm.getComponentName(button)], { key: _vm.getKey(button), tag: "component", attrs: { "editor": _vm.editor, "levels": _vm.getLevels(button) } }) : _c("hr")];
    })], 2) : _vm._e();
  };
  var _sfc_staticRenderFns$a = [];
  _sfc_render$a._withStripped = true;
  var __component__$a = /* @__PURE__ */ normalizeComponent(
    _sfc_main$a,
    _sfc_render$a,
    _sfc_staticRenderFns$a
  );
  __component__$a.options.__file = "/Users/thguenther/Work/Repositories/kirby-tiptap/src/components/Toolbar.vue";
  const Toolbar = __component__$a.exports;
  class SoftHyphenCharacter extends u {
    constructor() {
      super({
        type: "soft-hyphen",
        predicate: (value) => value === "­"
      });
    }
  }
  class NonBreakingSpaceCharacter extends u {
    constructor() {
      super({
        type: "non-breaking-space",
        predicate: (value) => value === " "
        // Non-breaking space Unicode character
      });
    }
  }
  const _sfc_main$9 = {
    components: { EditorContent, Toolbar },
    props: {
      label: String,
      value: String,
      buttons: { type: Array, required: true },
      highlights: Array
    },
    data: () => ({
      editor: null
    }),
    mounted() {
      this.editor = new Editor({
        content: this.value,
        onUpdate: ({ editor }) => this.$emit("input", editor.getHTML()),
        extensions: [
          StarterKit,
          Link.configure({
            openOnClick: false,
            HTMLAttributes: { rel: null, target: null }
          }),
          Highlights.configure({ highlights: this.highlights }),
          b.configure({
            builders: [
              new SoftHyphenCharacter(),
              new NonBreakingSpaceCharacter()
            ]
          })
        ]
      });
    },
    beforeDestroy() {
      var _a;
      (_a = this.editor) == null ? void 0 : _a.destroy();
    }
  };
  var _sfc_render$9 = function render() {
    var _vm = this, _c = _vm._self._c;
    return _c("k-field", { staticClass: "k-tiptap-field", attrs: { "data-theme": "field", "label": _vm.label } }, [_c("span", { staticClass: "k-input-element" }, [_c("div", { staticClass: "k-input k-textarea-input", attrs: { "data-theme": "field" } }, [_c("div", { staticClass: "k-textarea-input-wrapper" }, [_vm.editor ? _c("toolbar", { attrs: { "editor": _vm.editor, "label": _vm.label, "buttons": _vm.buttons } }) : _vm._e(), _c("editor-content", { attrs: { "editor": _vm.editor }, model: { value: _vm.value, callback: function($$v) {
      _vm.value = $$v;
    }, expression: "value" } })], 1)])])]);
  };
  var _sfc_staticRenderFns$9 = [];
  _sfc_render$9._withStripped = true;
  var __component__$9 = /* @__PURE__ */ normalizeComponent(
    _sfc_main$9,
    _sfc_render$9,
    _sfc_staticRenderFns$9
  );
  __component__$9.options.__file = "/Users/thguenther/Work/Repositories/kirby-tiptap/src/components/Tiptap.vue";
  const Tiptap = __component__$9.exports;
  panel.plugin("medienbaecker/tiptap", {
    fields: {
      tiptap: Tiptap
    }
  });
  const _sfc_main$8 = {
    props: {
      icon: {
        type: String,
        required: true
      },
      title: {
        type: String,
        required: true
      },
      editor: {
        type: Object,
        required: true
      },
      command: {
        type: String,
        required: true
      },
      activeCheck: {
        type: [String, Function],
        required: true
      }
    },
    computed: {
      isActive() {
        if (!this.editor || !this.editor.isFocused) return false;
        return typeof this.activeCheck === "function" ? this.activeCheck(this.editor) : this.editor.isActive(this.activeCheck);
      }
    },
    methods: {
      runCommand() {
        if (typeof this.command === "function") {
          this.command(this.editor);
        } else {
          this.editor.chain().focus()[this.command]().run();
        }
      }
    }
  };
  var _sfc_render$8 = function render() {
    var _vm = this, _c = _vm._self._c;
    return _c("k-button", { class: ["k-toolbar-button", "k-markdown-button"], attrs: { "icon": _vm.icon, "title": _vm.title, "tabindex": "-1", "current": _vm.isActive }, on: { "mousedown": function($event) {
      $event.preventDefault();
    }, "click": _vm.runCommand } });
  };
  var _sfc_staticRenderFns$8 = [];
  _sfc_render$8._withStripped = true;
  var __component__$8 = /* @__PURE__ */ normalizeComponent(
    _sfc_main$8,
    _sfc_render$8,
    _sfc_staticRenderFns$8
  );
  __component__$8.options.__file = "/Users/thguenther/Work/Repositories/kirby-tiptap/src/components/toolbarButtons/ToolbarButton.vue";
  const ToolbarButton = __component__$8.exports;
  const _sfc_main$7 = {
    components: {
      ToolbarButton
    },
    props: {
      editor: {
        type: Object,
        required: true
      },
      levels: {
        type: Array,
        required: true
      }
    },
    methods: {
      toggleHeading(level) {
        this.editor.chain().focus().toggleHeading({ level }).run();
      }
    }
  };
  var _sfc_render$7 = function render() {
    var _vm = this, _c = _vm._self._c;
    return _c("div", { staticClass: "k-headings-buttons" }, _vm._l(_vm.levels, function(level) {
      return _c("ToolbarButton", { key: level, attrs: { "icon": `h${level}`, "title": `Heading ${level}`, "editor": _vm.editor, "command": () => _vm.toggleHeading(level), "active-check": () => _vm.editor.isActive("heading", { level }) } });
    }), 1);
  };
  var _sfc_staticRenderFns$7 = [];
  _sfc_render$7._withStripped = true;
  var __component__$7 = /* @__PURE__ */ normalizeComponent(
    _sfc_main$7,
    _sfc_render$7,
    _sfc_staticRenderFns$7
  );
  __component__$7.options.__file = "/Users/thguenther/Work/Repositories/kirby-tiptap/src/components/toolbarButtons/HeadingsButton.vue";
  const HeadingsButton = __component__$7.exports;
  const HeadingsButton$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    default: HeadingsButton
  }, Symbol.toStringTag, { value: "Module" }));
  const _sfc_main$6 = {
    components: {
      ToolbarButton
    },
    props: {
      editor: {
        type: Object,
        required: true
      }
    }
  };
  var _sfc_render$6 = function render() {
    var _vm = this, _c = _vm._self._c;
    return _c("ToolbarButton", { attrs: { "icon": "bold", "title": "Bold", "editor": _vm.editor, "command": "toggleBold", "active-check": "bold" } });
  };
  var _sfc_staticRenderFns$6 = [];
  _sfc_render$6._withStripped = true;
  var __component__$6 = /* @__PURE__ */ normalizeComponent(
    _sfc_main$6,
    _sfc_render$6,
    _sfc_staticRenderFns$6
  );
  __component__$6.options.__file = "/Users/thguenther/Work/Repositories/kirby-tiptap/src/components/toolbarButtons/BoldButton.vue";
  const BoldButton = __component__$6.exports;
  const BoldButton$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    default: BoldButton
  }, Symbol.toStringTag, { value: "Module" }));
  const _sfc_main$5 = {
    components: {
      ToolbarButton
    },
    props: {
      editor: {
        type: Object,
        required: true
      }
    }
  };
  var _sfc_render$5 = function render() {
    var _vm = this, _c = _vm._self._c;
    return _c("ToolbarButton", { attrs: { "icon": "italic", "title": "Italic", "editor": _vm.editor, "command": "toggleItalic", "active-check": "italic" } });
  };
  var _sfc_staticRenderFns$5 = [];
  _sfc_render$5._withStripped = true;
  var __component__$5 = /* @__PURE__ */ normalizeComponent(
    _sfc_main$5,
    _sfc_render$5,
    _sfc_staticRenderFns$5
  );
  __component__$5.options.__file = "/Users/thguenther/Work/Repositories/kirby-tiptap/src/components/toolbarButtons/ItalicButton.vue";
  const ItalicButton = __component__$5.exports;
  const ItalicButton$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    default: ItalicButton
  }, Symbol.toStringTag, { value: "Module" }));
  const _sfc_main$4 = {
    components: {
      ToolbarButton
    },
    props: {
      editor: {
        type: Object,
        required: true
      }
    }
  };
  var _sfc_render$4 = function render() {
    var _vm = this, _c = _vm._self._c;
    return _c("ToolbarButton", { attrs: { "icon": "strikethrough", "title": "Strike-through", "editor": _vm.editor, "command": "toggleStrike", "active-check": "strike" } });
  };
  var _sfc_staticRenderFns$4 = [];
  _sfc_render$4._withStripped = true;
  var __component__$4 = /* @__PURE__ */ normalizeComponent(
    _sfc_main$4,
    _sfc_render$4,
    _sfc_staticRenderFns$4
  );
  __component__$4.options.__file = "/Users/thguenther/Work/Repositories/kirby-tiptap/src/components/toolbarButtons/StrikeButton.vue";
  const StrikeButton = __component__$4.exports;
  const StrikeButton$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    default: StrikeButton
  }, Symbol.toStringTag, { value: "Module" }));
  const _sfc_main$3 = {
    components: {
      ToolbarButton
    },
    props: {
      editor: {
        type: Object,
        required: true
      }
    }
  };
  var _sfc_render$3 = function render() {
    var _vm = this, _c = _vm._self._c;
    return _c("ToolbarButton", { attrs: { "icon": "code", "title": "Code", "editor": _vm.editor, "command": "toggleCode", "active-check": "code" } });
  };
  var _sfc_staticRenderFns$3 = [];
  _sfc_render$3._withStripped = true;
  var __component__$3 = /* @__PURE__ */ normalizeComponent(
    _sfc_main$3,
    _sfc_render$3,
    _sfc_staticRenderFns$3
  );
  __component__$3.options.__file = "/Users/thguenther/Work/Repositories/kirby-tiptap/src/components/toolbarButtons/CodeButton.vue";
  const CodeButton = __component__$3.exports;
  const CodeButton$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    default: CodeButton
  }, Symbol.toStringTag, { value: "Module" }));
  const _sfc_main$2 = {
    name: "LinkButton",
    components: {
      ToolbarButton
    },
    props: {
      editor: {
        type: Object,
        required: true
      }
    },
    methods: {
      handleLink(editor) {
        const attrs = editor.getAttributes("link");
        const isEditing = Boolean(attrs.href);
        this.$panel.dialog.open({
          component: "k-link-dialog",
          props: {
            fields: {
              href: {
                label: window.panel.$t("link"),
                type: "link",
                placeholder: window.panel.$t("url.placeholder"),
                icon: "url"
              },
              target: {
                label: window.panel.$t("open.newWindow"),
                type: "toggle",
                text: [window.panel.$t("no"), window.panel.$t("yes")]
              }
            },
            value: attrs,
            submitButton: isEditing ? window.panel.$t("update") : window.panel.$t("insert")
          },
          on: {
            cancel: () => {
              this.$panel.dialog.close();
              editor.chain().focus().run();
            },
            submit: (values) => {
              var _a;
              this.$panel.dialog.close();
              if (!((_a = values.href) == null ? void 0 : _a.length)) {
                editor.chain().focus().unsetLink().run();
                return;
              }
              if (editor.state.selection.empty) {
                editor.commands.insertContent({
                  type: "text",
                  text: values.text || values.href,
                  marks: [{
                    type: "link",
                    attrs: values
                  }]
                });
              } else {
                editor.chain().focus().setLink(values).run();
              }
            }
          }
        });
      }
    }
  };
  var _sfc_render$2 = function render() {
    var _vm = this, _c = _vm._self._c;
    return _c("ToolbarButton", { attrs: { "icon": "url", "title": "Link", "editor": _vm.editor, "command": _vm.handleLink, "active-check": "link" } });
  };
  var _sfc_staticRenderFns$2 = [];
  _sfc_render$2._withStripped = true;
  var __component__$2 = /* @__PURE__ */ normalizeComponent(
    _sfc_main$2,
    _sfc_render$2,
    _sfc_staticRenderFns$2
  );
  __component__$2.options.__file = "/Users/thguenther/Work/Repositories/kirby-tiptap/src/components/toolbarButtons/LinkButton.vue";
  const LinkButton = __component__$2.exports;
  const LinkButton$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    default: LinkButton
  }, Symbol.toStringTag, { value: "Module" }));
  const _sfc_main$1 = {
    components: {
      ToolbarButton
    },
    props: {
      editor: {
        type: Object,
        required: true
      }
    }
  };
  var _sfc_render$1 = function render() {
    var _vm = this, _c = _vm._self._c;
    return _c("ToolbarButton", { attrs: { "icon": "list-bullet", "title": "Bullet List", "editor": _vm.editor, "command": "toggleBulletList", "active-check": "bulletList" } });
  };
  var _sfc_staticRenderFns$1 = [];
  _sfc_render$1._withStripped = true;
  var __component__$1 = /* @__PURE__ */ normalizeComponent(
    _sfc_main$1,
    _sfc_render$1,
    _sfc_staticRenderFns$1
  );
  __component__$1.options.__file = "/Users/thguenther/Work/Repositories/kirby-tiptap/src/components/toolbarButtons/BulletListButton.vue";
  const BulletListButton = __component__$1.exports;
  const BulletListButton$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    default: BulletListButton
  }, Symbol.toStringTag, { value: "Module" }));
  const _sfc_main = {
    components: {
      ToolbarButton
    },
    props: {
      editor: {
        type: Object,
        required: true
      }
    }
  };
  var _sfc_render = function render() {
    var _vm = this, _c = _vm._self._c;
    return _c("ToolbarButton", { attrs: { "icon": "list-numbers", "title": "Ordered List", "editor": _vm.editor, "command": "toggleOrderedList", "active-check": "orderedList" } });
  };
  var _sfc_staticRenderFns = [];
  _sfc_render._withStripped = true;
  var __component__ = /* @__PURE__ */ normalizeComponent(
    _sfc_main,
    _sfc_render,
    _sfc_staticRenderFns
  );
  __component__.options.__file = "/Users/thguenther/Work/Repositories/kirby-tiptap/src/components/toolbarButtons/OrderedListButton.vue";
  const OrderedListButton = __component__.exports;
  const OrderedListButton$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    default: OrderedListButton
  }, Symbol.toStringTag, { value: "Module" }));
})();
