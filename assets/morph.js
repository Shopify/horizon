import { Component } from '@theme/component';

/**
 * @typedef {Object} Options
 * @property {boolean} [childrenOnly] - Only update children
 * @property {(node: Node | undefined) => string|number|undefined} [getNodeKey] - Get node key for matching
 * @property {(oldNode: Node, newNode: Node) => void} [onBeforeUpdate] - Pre-update hook
 * @property {(node: Node) => void} [onAfterUpdate] - Post-update hook
 * @property {(oldNode: Node, newNode: Node) => boolean} [reject] - Reject a node from being morphed
 * @property {boolean} [hydrationMode] - If true, only morph subtrees whose elements have `data-hydration-key="<non-empty>"`, matched by that value
 */

const HYDRATION_KEY_ATTRIBUTE = 'data-hydration-key';

// onBeforeUpdate runs for every node pair, so keep these off its hot path.
const PRESERVED_ATTRIBUTES = [
  'product-grid-view',
  'data-current-checked',
  'data-previous-checked',
  'cart-summary-sticky',
];
const PRESERVED_ATTRIBUTES_SET = new Set(PRESERVED_ATTRIBUTES);

/**
 * The options for the morph
 * @type {Options}
 */
export const MORPH_OPTIONS = {
  childrenOnly: true,
  hydrationMode: false,
  reject(oldNode, newNode) {
    if (newNode.nodeType === Node.TEXT_NODE && newNode.nodeValue?.trim() === '') {
      return true;
    }

    if (
      newNode instanceof HTMLTemplateElement &&
      newNode.shadowRootMode === 'open' &&
      oldNode.parentElement &&
      newNode.parentElement &&
      oldNode.parentElement.tagName === newNode.parentElement.tagName &&
      oldNode.parentElement?.shadowRoot != null
    ) {
      // Ignore template elements of components that are already initialized
      return true;
    }

    if (newNode.nodeType === Node.COMMENT_NODE && newNode.nodeValue === 'shopify:rendered_by_section_api') {
      // Remove a comment node injected by the Section Rendering API in the Theme Editor
      return true;
    }

    return false;
  },
  onBeforeUpdate(oldNode, newNode) {
    if (!(oldNode instanceof Element) || !(newNode instanceof Element)) return;

    // Elements usually carry fewer attributes than the preserved list, so scan the
    // element's own attributes rather than probing each preserved name.
    const oldAttrs = oldNode.attributes;
    for (let i = 0; i < oldAttrs.length; i++) {
      const attr = /** @type {Attr} */ (oldAttrs[i]);
      if (PRESERVED_ATTRIBUTES_SET.has(attr.name)) {
        const oldValue = attr.value;
        if (oldValue && oldValue !== newNode.getAttribute(attr.name)) {
          newNode.setAttribute(attr.name, oldValue);
        }
      }
    }

    // These elements carry runtime-applied inline styles that the re-render doesn't
    // include, so copy the old style across before it's overwritten.
    const tagName = oldNode.tagName;
    if (tagName === 'FLOATING-PANEL-COMPONENT' || tagName === 'FIELDSET') {
      const isFloating = tagName === 'FLOATING-PANEL-COMPONENT';
      const matchesOld = isFloating || oldNode.classList.contains('variant-option');
      if (matchesOld && newNode.tagName === tagName) {
        const matchesNew = isFloating || newNode.classList.contains('variant-option');
        if (matchesNew) {
          const oldStyle = oldNode.getAttribute('style');
          if (oldStyle) newNode.setAttribute('style', oldStyle);
        }
      }
    }

    // Preserve temporary view transition name
    if (oldNode instanceof HTMLElement && newNode instanceof HTMLElement && oldNode.style.viewTransitionName) {
      newNode.style.viewTransitionName = oldNode.style.viewTransitionName;
    }
  },
  onAfterUpdate(node) {
    if (node instanceof Component) {
      queueMicrotask(() => node.updatedCallback());
    }
  },
};

/**
 * Morphs one DOM tree into another by comparing nodes and applying minimal changes
 * @param {Node} oldTree - The existing DOM tree
 * @param {Node | string} newTree - The new DOM tree to morph to
 * @param {Options} [options] - Configuration options
 * @returns {Node} The morphed DOM tree
 */
export function morph(oldTree, newTree, options = MORPH_OPTIONS) {
  if (!oldTree || !newTree) {
    throw new Error('Both oldTree and newTree must be provided');
  }

  if (typeof newTree === 'string') {
    const parsedNewTree = new DOMParser().parseFromString(newTree, 'text/html').body.firstChild;
    if (!parsedNewTree) {
      throw new Error('newTree string is not valid HTML');
    }
    newTree = parsedNewTree;
  }

  if (options.hydrationMode && oldTree instanceof Element && newTree instanceof Element) {
    morphHydrationByKey(oldTree, newTree, options);
    return oldTree;
  }

  let result;
  if (options.childrenOnly) {
    updateChildren(newTree, oldTree, options);
    result = oldTree;
  } else if (newTree.nodeType === 11) {
    throw new Error('newTree should have one root node (not a DocumentFragment)');
  } else {
    result = walk(newTree, oldTree, options);
  }

  // Recreate once for the whole tree, not per updateChildren recursion, so scripts aren't re-created repeatedly.
  if (result instanceof Element) {
    recreateAppBlockScripts(result);
  }
  return result;
}

/**
 * Collect targets under a root element that have a non-empty key for the attribute.
 * Includes the root itself if it matches.
 *
 * @param {Element} root
 * @returns {Element[]}
 */
function collectHydrationTargets(root) {
  const targets = [];
  if (root.hasAttribute(HYDRATION_KEY_ATTRIBUTE)) targets.push(root);
  targets.push(...root.querySelectorAll(`[${HYDRATION_KEY_ATTRIBUTE}]`));
  return targets;
}

/**
 * Morph only keyed targets from `newRoot` into `oldRoot` (a.k.a. "keyed lazy hydration").
 *
 * Philosophy:
 * - This updates the *contents* of pre-existing targets. We intentionally do NOT insert new targets (or remove missing ones).
 * - By requiring targets to already exist in `oldRoot`, we preserve runtime state that may already
 *   be attached to the existing DOM (custom elements, listeners, focus, transient UI state) and preserve the layout and UI behavior.
 * - Intended use-case: avoid expensive server-side rendering operations in the initial render, and hydrate targeted sections after page load. e.g. Querying all product and collection drops in off-screen menus.
 *
 * Contract:
 * - An element is eligible only if it has `data-hydration-key="<non-empty>"`.
 * - Matching uses ONLY that key value (no fallbacks) to avoid accidental cross-updates.
 * - Once a target is matched, we run a normal morph *within that target* (attributes + children).
 *
 * @param {Element} oldRoot
 * @param {Element} newRoot
 * @param {Options} options
 */
function morphHydrationByKey(oldRoot, newRoot, options) {
  const oldTargets = collectHydrationTargets(oldRoot);
  const newTargets = collectHydrationTargets(newRoot);

  /** @type {Map<string, Element[]>} */
  const oldTargetsByKey = new Map();

  for (const oldTarget of oldTargets) {
    const key = oldTarget.getAttribute(HYDRATION_KEY_ATTRIBUTE);
    if (key == null || key === '') continue;

    const existing = oldTargetsByKey.get(key) ?? [];
    existing.push(oldTarget);
    oldTargetsByKey.set(key, existing);
  }

  for (const newTarget of newTargets) {
    const key = newTarget.getAttribute(HYDRATION_KEY_ATTRIBUTE);
    if (key == null || key === '') continue;

    const matches = oldTargetsByKey.get(key);
    const oldTarget = matches?.shift();
    if (!oldTarget) continue;

    // For keyed targets we want attribute updates as well, regardless of the caller's childrenOnly default.
    morph(oldTarget, newTarget, {
      ...options,
      hydrationMode: false,
      childrenOnly: false,
    });
  }
}

/**
 * Walk and morph a dom tree
 * @param {Node} newNode - The new node to morph to
 * @param {Node} oldNode - The old node to morph from
 * @param {Options} options - The options object
 * @returns {Node} The new node or the morphed old node
 */
function walk(newNode, oldNode, options) {
  // Skip morphing if there is no old or new node
  if (!oldNode) return newNode;
  if (!newNode) return oldNode;

  if (newNode === oldNode) return oldNode;

  const newType = newNode.nodeType;
  if (newType !== oldNode.nodeType) return newNode;

  if (newType === 1 /* ELEMENT_NODE */) {
    // newType === 1 guarantees both are Elements; cast rather than re-checking with instanceof.
    const oldEl = /** @type {Element} */ (oldNode);
    const newEl = /** @type {Element} */ (newNode);
    // Skip morphing if the node is shopify-accelerated-checkout-cart https://shopify.dev/docs/storefronts/themes/pricing-payments/accelerated-checkout#implement-accelerated-checkout-buttons-on-cart
    if (oldEl.tagName === 'SHOPIFY-ACCELERATED-CHECKOUT-CART') return oldNode;
    if (newEl.tagName !== oldEl.tagName) return newNode;

    // isEqualNode compares serialized markup, so it's blind to live form state (input
    // value/checked, option selected, textarea value). Replay that sync across the subtree, then
    // return the untouched DOM. Skipping also avoids updatedCallback on the subtree, which is
    // safe: it only rebuilds a component's refs from its own subtree, unchanged here.
    // syncFormControlsInSubtree honors data-skip-node-update, so the guard below stays correct
    // even though this fast path runs ahead of it.
    if (oldNode.isEqualNode(newNode)) {
      syncFormControlsInSubtree(newEl, oldEl);
      return oldNode;
    }

    // Only check keys for elements, and only if both nodes have keys
    const newKey = getNodeKey(newNode, options);
    const oldKey = getNodeKey(oldNode, options);
    if (newKey && oldKey && newKey !== oldKey) return newNode;

    // For elements we already know both are Elements; collapse the second instanceof
    // pair from the original code into a single nodeType-gated branch.
    if (oldEl.hasAttribute('data-skip-node-update') && newEl.hasAttribute('data-skip-node-update')) {
      // Special case: don't morph this node, but recurse into its children.
      updateChildren(newNode, oldNode, options);
    } else {
      updateNode(newNode, oldNode, options);
      updateChildren(newNode, oldNode, options);
    }
  } else {
    // Text and comment nodes are leaves, so there are no children to reconcile.
    updateNode(newNode, oldNode, options);
  }

  options.onAfterUpdate?.(newNode);

  return oldNode;
}

/**
 * Core morphing function that updates attributes and special elements
 * @param {Node} newNode - Source node with desired state
 * @param {Node} oldNode - Target node to update
 * @param {Options} options - The options object
 */
function updateNode(newNode, oldNode, options) {
  options.onBeforeUpdate?.(oldNode, newNode);

  const newType = newNode.nodeType;

  if (newType === 1 /* ELEMENT_NODE */) {
    const oldEl = /** @type {Element} */ (oldNode);
    const newEl = /** @type {Element} */ (newNode);
    // Only reconcile attributes when they differ. A shallow compare is enough here;
    // updateChildren recurses into the subtree separately.
    if (!attributesEqual(oldEl, newEl)) {
      // The open/slot/sizes preservations below act on attributes, so they're only
      // meaningful when attributes differ.
      if (
        (newNode instanceof HTMLDetailsElement && oldNode instanceof HTMLDetailsElement) ||
        (newNode instanceof HTMLDialogElement && oldNode instanceof HTMLDialogElement)
      ) {
        if (!newNode.hasAttribute('declarative-open')) {
          newNode.open = oldNode.open;
        }
      }

      if (oldNode instanceof HTMLElement && newNode instanceof HTMLElement) {
        // Preserve slot/sizes on the new node before copyAttributes overwrites them.
        for (const attr of ['slot', 'sizes']) {
          const oldValue = oldNode.getAttribute(attr);
          const newValue = newNode.getAttribute(attr);
          if (oldValue !== newValue) {
            oldValue == null ? newNode.removeAttribute(attr) : newNode.setAttribute(attr, oldValue);
          }
        }
      }

      copyAttributes(newEl, oldEl);
    }

    // value/checked/selected/textarea aren't always reflected as content attributes, so this
    // runs regardless of attributesEqual. walk's subtree-skip replays the same sync.
    syncFormControlState(newNode, oldNode);
  } else if (newType === 3 /* TEXT_NODE */ || newType === 8 /* COMMENT_NODE */) {
    if (oldNode.nodeValue !== newNode.nodeValue) {
      oldNode.nodeValue = newNode.nodeValue;
    }
  }
}

/**
 * Syncs live form-control state that serialized markup doesn't carry: input
 * value/checked/indeterminate, option selected, and textarea value. updateNode runs this
 * regardless of attribute equality, and walk's isEqualNode subtree-skip replays it across the
 * subtree (syncFormControlsInSubtree), so both paths share one definition of which elements
 * need it. instanceof is the gate.
 * @param {Node} newNode
 * @param {Node} oldNode
 */
function syncFormControlState(newNode, oldNode) {
  if (newNode instanceof HTMLInputElement && oldNode instanceof HTMLInputElement) {
    updateInput(newNode, oldNode);
  } else if (newNode instanceof HTMLOptionElement && oldNode instanceof HTMLOptionElement) {
    updateAttribute(newNode, oldNode, 'selected');
  } else if (newNode instanceof HTMLTextAreaElement && oldNode instanceof HTMLTextAreaElement) {
    updateTextarea(newNode, oldNode);
  }
}

/**
 * True when both nodes opt out of morphing via data-skip-node-update, matching walk's guard.
 * Such controls must keep their live state (e.g. a cart note or discount code the shopper
 * typed), so the subtree-skip must not reconcile them back to the server-parsed value.
 * @param {Element} newNode
 * @param {Element} oldNode
 * @returns {boolean}
 */
function skipsNodeUpdate(newNode, oldNode) {
  return newNode.hasAttribute('data-skip-node-update') && oldNode.hasAttribute('data-skip-node-update');
}

/**
 * Replays syncFormControlState across an element and its descendants. walk uses this when
 * isEqualNode reports a subtree unchanged: that comparison is blind to live form state, so a
 * dirty control (e.g. a quantity a shopper typed) would otherwise keep stale state after a
 * re-render. isEqualNode guarantees identical structure, so the old/new control lists line up
 * by index. Controls flagged data-skip-node-update are left untouched, mirroring walk's guard.
 * @param {Element} newNode
 * @param {Element} oldNode
 */
function syncFormControlsInSubtree(newNode, oldNode) {
  if (!skipsNodeUpdate(newNode, oldNode)) {
    syncFormControlState(newNode, oldNode);
  }
  const newControls = newNode.querySelectorAll('input, option, textarea');
  if (newControls.length === 0) return;
  const oldControls = oldNode.querySelectorAll('input, option, textarea');
  for (let i = 0; i < newControls.length; i++) {
    const newControl = /** @type {Element} */ (newControls[i]);
    const oldControl = /** @type {Element} */ (oldControls[i]);
    if (skipsNodeUpdate(newControl, oldControl)) continue;
    syncFormControlState(newControl, oldControl);
  }
}

/**
 * True when both elements have identical attribute sets (names, values, namespaces). Gates
 * copyAttributes. Deliberately shallow: isEqualNode would re-walk the subtree that
 * updateChildren already recurses into.
 *
 * @param {Element} a
 * @param {Element} b
 * @returns {boolean}
 */
function attributesEqual(a, b) {
  const aAttrs = a.attributes;
  const bAttrs = b.attributes;
  const len = aAttrs.length;
  if (len !== bAttrs.length) return false;
  // Same-template re-renders emit attributes in the same order, so compare positionally.
  // A different order only yields a false-unequal (falls through to copyAttributes), never a false-equal.
  for (let i = 0; i < len; i++) {
    const aAttr = /** @type {Attr} */ (aAttrs[i]);
    const bAttr = /** @type {Attr} */ (bAttrs[i]);
    if (!aAttr.isEqualNode(bAttr)) return false;
  }
  return true;
}

/**
 * Gets a node's key using the getNodeKey option if provided
 * @param {Node | undefined} node - The node to get the key from
 * @param {Options} [options] - The options object that may contain getNodeKey
 * @returns {string|number|undefined} The node's key if one exists
 */
function getNodeKey(node, options) {
  return options?.getNodeKey?.(node) ?? (node instanceof Element ? node.id : undefined);
}

/**
 * Updates a boolean attribute and its corresponding property on an element
 * @param {any} newNode - The new element
 * @param {any} oldNode - The existing element to update
 * @param {string} name - The name of the attribute/property to update
 */
function updateAttribute(newNode, oldNode, name) {
  if (newNode[name] !== oldNode[name]) {
    oldNode[name] = newNode[name];
    if (newNode[name] != null) {
      oldNode.setAttribute(name, '');
    } else {
      oldNode.removeAttribute(name);
    }
  }
}

/**
 * Copies attributes from a new node to an old node, handling namespaced attributes
 * @param {Element} newNode - The new node to copy attributes from
 * @param {Element} oldNode - The existing node to update attributes on
 */
function copyAttributes(newNode, oldNode) {
  const oldAttrs = oldNode.attributes;
  const newAttrs = newNode.attributes;

  // Update or add new attributes
  for (const attr of Array.from(newAttrs)) {
    const { name: attrName, namespaceURI: attrNamespaceURI, value: attrValue } = attr;
    const localName = attr.localName || attrName;

    if (attrName === 'src' || attrName === 'href' || attrName === 'srcset' || attrName === 'poster') {
      // Skip updating resource attributes when the value hasn't changed
      // to prevent unnecessary network requests
      if (oldNode.getAttribute(attrName) === attrValue) continue;
    }

    if (attrNamespaceURI) {
      const fromValue = oldNode.getAttributeNS(attrNamespaceURI, localName);
      if (fromValue !== attrValue) {
        oldNode.setAttributeNS(attrNamespaceURI, localName, attrValue);
      }
    } else {
      if (!oldNode.hasAttribute(attrName)) {
        oldNode.setAttribute(attrName, attrValue);
      } else {
        const fromValue = oldNode.getAttribute(attrName);
        if (fromValue !== attrValue) {
          if (attrValue === 'null' || attrValue === 'undefined') {
            oldNode.removeAttribute(attrName);
          } else {
            oldNode.setAttribute(attrName, attrValue);
          }
        }
      }
    }
  }

  // Remove old attributes not present in new node
  for (const attr of Array.from(oldAttrs)) {
    if (attr.specified === false) continue;

    const { name: attrName, namespaceURI: attrNamespaceURI } = attr;
    const localName = attr.localName || attrName;

    if (attrNamespaceURI) {
      if (!newNode.hasAttributeNS(attrNamespaceURI, localName)) {
        oldNode.removeAttributeNS(attrNamespaceURI, localName);
      }
    } else if (!newNode.hasAttribute(attrName)) {
      oldNode.removeAttribute(attrName);
    }
  }
}

/**
 * Updates special properties and attributes on input elements
 * Handles checked, disabled, indeterminate states and value
 * @param {HTMLInputElement} newNode - The new input element
 * @param {HTMLInputElement} oldNode - The existing input element to update
 */
function updateInput(newNode, oldNode) {
  const newValue = newNode.value;

  updateAttribute(newNode, oldNode, 'checked');
  updateAttribute(newNode, oldNode, 'disabled');

  // Handle indeterminate state (cannot be set via HTML attribute)
  if (newNode.indeterminate !== oldNode.indeterminate) {
    oldNode.indeterminate = newNode.indeterminate;
  }

  // Skip file inputs since they can't be changed programmatically
  if (oldNode.type === 'file') return;

  if (newValue !== oldNode.value) {
    oldNode.setAttribute('value', newValue);
    oldNode.value = newValue;
  }

  if (newValue === 'null') {
    oldNode.value = '';
    oldNode.removeAttribute('value');
  }

  if (!newNode.hasAttributeNS(null, 'value')) {
    oldNode.removeAttribute('value');
  } else if (oldNode.type === 'range') {
    // Update range input UI
    oldNode.value = newValue;
  }
}

/**
 * Updates the value of a textarea element
 * @param {HTMLTextAreaElement} newNode - The new textarea element
 * @param {HTMLTextAreaElement} oldNode - The existing textarea element to update
 */
function updateTextarea(newNode, oldNode) {
  const newValue = newNode.value;
  if (newValue !== oldNode.value) {
    oldNode.value = newValue;
  }

  const firstChild = oldNode.firstChild;
  if (firstChild?.nodeType === Node.TEXT_NODE) {
    if (newValue === '' && firstChild.nodeValue === oldNode.placeholder) {
      return;
    }
    firstChild.nodeValue = newValue;
  }
}

/**
 * If app scripts store references to the DOM on initialization, they will be invalidated by the morph because browsers don't re-execute them.
 * This function removes and recreates them to force re-execution.
 * @param {Element} container - The container element to search for app block scripts
 */
function recreateAppBlockScripts(container) {
  const scripts = container.querySelectorAll('.shopify-app-block script[src]');

  for (const script of scripts) {
    if (!(script instanceof HTMLScriptElement)) continue;

    const parent = script.parentElement;
    if (!parent) continue;

    const newScript = document.createElement('script');
    for (const attr of Array.from(script.attributes)) {
      newScript.setAttribute(attr.name, attr.value);
    }
    if (script.textContent) {
      newScript.textContent = script.textContent;
    }

    script.remove();
    parent.appendChild(newScript);
  }
}

/**
 * Update the children of elements
 * @param {Node} newNode - The new node to update children on
 * @param {Node} oldNode - The existing node to update children on
 * @param {Options} options - The options object
 */
function updateChildren(newNode, oldNode, options) {
  if (
    oldNode instanceof Element &&
    oldNode.hasAttribute('data-skip-subtree-update') &&
    newNode instanceof Element &&
    newNode.hasAttribute('data-skip-subtree-update')
  ) {
    return;
  }

  const oldChildren = oldNode.childNodes;
  const newChildren = newNode.childNodes;
  const reject = options.reject;

  let oldChild, newChild, morphed, oldMatch;
  let offset = 0;

  for (let i = 0; ; i++) {
    oldChild = oldChildren[i];
    newChild = newChildren[i - offset];

    // Both nodes are empty, do nothing
    if (!oldChild && !newChild) {
      break;
    }

    // There is no new child, remove old
    if (!newChild) {
      oldChild && oldNode.removeChild(oldChild);
      i--;
      continue;
    }

    // There is no old child, add new
    if (!oldChild) {
      oldNode.appendChild(newChild);
      offset++;
      continue;
    }

    // Both nodes are the same, morph
    if (same(newChild, oldChild, options)) {
      morphed = walk(newChild, oldChild, options);
      if (morphed !== oldChild) {
        oldNode.replaceChild(morphed, oldChild);
        offset++;
      }
      continue;
    }

    if (reject !== undefined && reject(oldChild, newChild)) {
      newNode.removeChild(newChild);
      i--;
      continue;
    }

    // Scan the remaining old children for one matching newChild, to reorder rather than replace.
    oldMatch = null;
    const oldChildrenLen = oldChildren.length;
    for (let j = i; j < oldChildrenLen; j++) {
      const potentialOldNode = oldChildren[j];
      if (potentialOldNode && same(potentialOldNode, newChild, options)) {
        oldMatch = potentialOldNode;
        break;
      }
    }

    if (oldMatch) {
      morphed = walk(newChild, oldMatch, options);
      if (morphed !== oldMatch) offset++;
      oldNode.insertBefore(morphed, oldChild);
    } else if (!getNodeKey(newChild, options) && !getNodeKey(oldChild, options)) {
      morphed = walk(newChild, oldChild, options);
      if (morphed !== oldChild) {
        oldNode.replaceChild(morphed, oldChild);
        offset++;
      }
    } else {
      oldNode.insertBefore(newChild, oldChild);
      offset++;
    }
  }
}

/**
 * Check if two nodes are the same
 * @param {Node} a - The first node
 * @param {Node} b - The second node
 * @param {Options} options - The options object
 * @returns {boolean} True if the nodes are the same, false otherwise
 */
function same(a, b, options) {
  const aType = a.nodeType;
  const bType = b.nodeType;
  // If node types don't match, they're not the same
  if (aType !== bType) return false;

  // For elements, check tag name first
  if (aType === Node.ELEMENT_NODE) {
    if (a instanceof Element && b instanceof Element && a.tagName !== b.tagName) return false;

    // Only compare keys if both nodes have them
    const aKey = getNodeKey(a, options);
    const bKey = getNodeKey(b, options);
    if (aKey && bKey && aKey !== bKey) return false;
  }

  // For text nodes, match exactly first and only fall back to a trimmed compare when
  // the raw values differ, so the common path doesn't allocate.
  if (aType === Node.TEXT_NODE && bType === Node.TEXT_NODE) {
    const av = a.nodeValue;
    const bv = b.nodeValue;
    return av === bv || av?.trim() === bv?.trim();
  }
  if (aType === Node.COMMENT_NODE && bType === Node.COMMENT_NODE) return a.nodeValue === b.nodeValue;

  // If we get here and nodes are elements with same tag (and compatible keys), they're the same
  return true;
}
