// Usage:
// import Cocoon from 'cocoon.es6'
// new Cocoon(container, options)
//
// Parameters:
// container (selector string|element)
//   The container where new fields will be inserted
//
// options (object)
//   May have the following members (all are optional if using the default markup):
//
//   addFieldsLink (selector string|element): link_to_add_association (default: '.add_fields' inside container)
//
//   addCount (integer): number of nested items to insert at once (default: 1)
//
//   removeWrapperClass (string): identifies the wrapper around inserted fields (default: 'nested-fields')
//
//   removeTimeout (integer): delay in milliseconds before removing items (default: 0)
//
//   insertionNode (selector string|element): nested fields are inserted relative to this element (default: parent node of addFieldsLink)
//
//   insertionFunction (function): function which inserts new fields (default: new fields are inserted immediately before addFieldsLink)
//     parameters: <insertionNode (above)>, <html string to be inserted>
//     return value: <inserted element> (only needed if you use afterInsert)
//
//   beforeInsert (function): runs before nested fields are inserted
//     parameters: <html string>
//     return value: <html string> or false
//     Note: returning false cancels the insertion
//
//   afterInsert (function): runs after nested fields are inserted
//     parameters: <inserted element>
//     return value: none
//
//   beforeRemove (function): runs before nested fields are removed
//     parameters: <element to be removed>
//     return value: none or false
//     Note: returning false cancels the removal
//
//   afterRemove (function): runs after nested fields are removed
//     parameters: <removed element>
//     return value: none

class Cocoon {
  constructor(container, options={}) {
    this.container = this.getNodeFromOption(container, false)
    if (!this.container)
      throw new Error('Container selector string or element must be supplied')

    // Start options
    this.addFieldsLink = this.getNodeFromOption(options.addFieldsLink, this.container.querySelector('.add_fields'))
    if (!this.addFieldsLink)
      throw new Error('Cannot find link to add fields. Make sure your `addFieldsLink` option or `link_to_add_association` is correct.')

    this.insertionNode = this.getNodeFromOption(options.insertionNode, this.addFieldsLink.parentNode)
    if (!this.insertionNode)
      throw new Error('Cannot find the element to insert the template. Make sure your `insertionNode` option is correct.')

    this.insertionFunction = options.insertionFunction || function(refNode, content) {
      refNode.insertAdjacentHTML('beforebegin', content)
      return refNode.previousElementSibling
    }

    this.removeWrapperClass = options.removeWrapperClass || 'nested-fields'
    this.addCount           = Math.max(parseInt(options.addCount), 1) || 1
    this.removeTimeout      = Math.max(parseInt(options.removeTimeout), 0) || 0

    this.beforeInsert = options.beforeInsert
    this.afterInsert  = options.afterInsert
    this.beforeRemove = options.beforeRemove
    this.afterRemove  = options.afterRemove
    // End options

    // Build regexs to edit content of template later
    var associationRegex = `(?:${this.addFieldsLink.getAttribute('data-associations')}|${this.addFieldsLink.getAttribute('data-association')})`
    this.regexId = new RegExp(`_new_${associationRegex}_(\\w*)`, 'g')
    this.regexParam = new RegExp(`\\[new_${associationRegex}\\](.*?\\s)`, 'g')

    this.insertionTemplate = this.addFieldsLink.getAttribute('data-association-insertion-template')
    this.elementCount = 0

    this.attachEventListeners()
  }

  getNodeFromOption(option, defaultOpt) {
    if (!option) return defaultOpt

    if (typeof option == 'string')
      return document.querySelector(option)
    else
      return option
  }

  replaceContent(content) {
    var id = new Date().getTime() + this.elementCount++
    var newContent = content.replace(this.regexId, `_${id}_$1`)
    newContent     = newContent.replace(this.regexParam, `[${id}]$1`)

    return newContent
  }

  addFields(e) {
    e.preventDefault()

    var html, newNode

    for (var i = 0; i < this.addCount; i++) {
      html = this.replaceContent(this.insertionTemplate)

      if (typeof this.beforeInsert == 'function')
        html = this.beforeInsert(html)

      if (!html)
        return

      newNode = this.insertionFunction(this.insertionNode, html)

      if (typeof this.afterInsert == 'function') {
        if (newNode instanceof HTMLElement)
          this.afterInsert(newNode)
        else
          throw new Error('Cannot run `afterInsert`, please check that your `insertionFunction` returns a DOM element')
      }
    }
  }

  findNodeToRemove(el) {
    var toRemove = el.parentNode

    while (!toRemove.classList.contains(this.removeWrapperClass)) {
      toRemove = toRemove.parentNode

      if (!toRemove) {
        throw new Error('Cannot find element to remove, please check `removeWrapperClass` configuration')
      }
    }

    return toRemove
  }

  removeFields(e) {
    var removeLink = e.target
    var toRemove = this.findNodeToRemove(removeLink)

    e.preventDefault()
    e.stopPropagation()

    var container = toRemove.parentNode

    if (typeof this.beforeRemove == 'function') {
      var result = this.beforeRemove(toRemove)

      if (!result && typeof result == 'boolean')
        return
    }

    setTimeout(() => {
      if (removeLink.classList.contains('dynamic'))
        container.removeChild(toRemove)
      else {
        var input = removeLink.previousSibling
        if (input.matches('input[type="hidden"]'))
          input.value = '1'

        toRemove.style.display = 'none'
      }

      if (typeof this.afterRemove == 'function')
        this.afterRemove(toRemove)
    }, this.removeTimeout)
  }

  attachEventListeners() {
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('add_fields'))
        this.addFields(e)

      else if (e.target.classList.contains('remove_fields'))
        this.removeFields(e)
    })

    var removeFunc = function() {
      [...document.querySelectorAll('.remove_fields.existing.destroyed')].forEach(function(el) {
        var removed = this.findNodeToRemove(el)
        removed.style.display = 'none'
      })
    }

    document.addEventListener('DOMContentLoaded', removeFunc)
    document.addEventListener('turbolinks:load', removeFunc)
  }
}

export default Cocoon
