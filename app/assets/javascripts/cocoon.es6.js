/* eslint no-console: 0 */
class Cocoon {
  constructor(container, options={}) {
    this.container = this.getNodeFromOption(container, false)

    if (!this.container) {
      throw new TypeError('Container must be supplied')
    }

    this.addFieldsLink = this.getNodeFromOption(options.addFieldsLink, this.container.querySelector('.add_fields'))

    if (!this.addFieldsLink)
      console.warn('Cannot find the link to add fields. Make sure your `link_to_add_association` is correct.')

    this.insertionNode = this.getNodeFromOption(options.insertionNode || this.addFieldsLink.getAttribute('data-association-insertion-node'), this.addFieldsLink.parentNode)

    if (!this.insertionNode)
      console.warn('Cannot find the element to insert the template. Make sure your `insertionNode` option is correct.')

    this.insertionFunc = options.insertionFunc || function(refNode, content) {
      refNode.insertAdjacentHTML('beforebegin', content)
      return refNode.previousElementSibling
    }

    this.beforeInsert = options.beforeInsert // function(html_string) { ...; returns html_string }, return false to cancel
    this.afterInsert  = options.afterInsert  // function(element) { ... }
    this.beforeRemove = options.beforeRemove // function(element) { ... }, return false to cancel
    this.afterRemove  = options.afterRemove  // function(element) { ... }
    this.elementCount = 0

    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('add_fields'))
        this.addFields(e)

      else if (e.target.classList.contains('remove_fields'))
        this.removeFields(e)
    })

    var removeFunc = function() {
      [...document.querySelectorAll('.remove_fields.existing.destroyed')].forEach(function(el) {
        var wrapperClass = el.getAttribute('data-wrapper-class') || 'nested-fields'
        var removed = el.parentNode

        while (!removed.classList.contains(wrapperClass)) {
          removed = removed.parentNode
        }

        removed.style.display = 'none'
      })
    }

    document.addEventListener('DOMContentLoaded', removeFunc)
    document.addEventListener('turbolinks:load', removeFunc)
  }

  getNodeFromOption(option, defaultOpt) {
    if (!option) return defaultOpt

    if (typeof option == 'string')
      return document.querySelector(option)
    else
      return option
  }

  createNewId() {
    return new Date().getTime() + this.elementCount++
  }

  newContentId(id) {
    return `_${id}_$1`
  }

  newContentParam(id) {
    return `[${id}]$1`
  }

  regexId(association) {
    return new RegExp(`_new_${association}_(\\w*)`, 'g')
  }

  regexParam(association) {
    return new RegExp(`\\[new_${association}\\](.*?\\s)`, 'g')
  }

  addFields(e) {
    e.preventDefault()

    var link  = e.target,
      content = link.getAttribute('data-association-insertion-template')

    var association = link.getAttribute('data-association')
    var regexId = this.regexId(association), regexParam

    if (regexId.test(content))
      regexParam = this.regexParam(association)
    else {
      association = link.getAttribute('data-associations')
      regexId = this.regexId(association)
      regexParam = this.regexParam(association)
    }

    var count = parseInt(link.getAttribute('data-count'), 10)
    count = isNaN(count) ? 1 : Math.max(count, 1)

    var newId, newContent, newContents = []

    while (count) {
      newId      = this.createNewId()
      newContent = content.replace(regexId, this.newContentId(newId))
      newContent = newContent.replace(regexParam, this.newContentParam(newId))
      newContents.push(newContent)

      count -= 1
    }

    newContents.forEach((html) => {
      if (typeof this.beforeInsert == 'function')
        html = this.beforeInsert(html)

      if (!html)
        return

      var newNode = this.insertionFunc(this.insertionNode, html)

      if (typeof this.afterInsert == 'function')
        this.afterInsert(newNode)
    })
  }

  removeFields(e) {
    var removeLink = e.target
    var toRemove = removeLink.parentNode
    var wrapperClass = removeLink.getAttribute('data-wrapper-class') || 'nested-fields'

    while (!toRemove.classList.contains(wrapperClass)) {
      toRemove = toRemove.parentNode

      if (!toRemove) {
        throw new Error('Cannot find element to remove, please check `data-wrapper-class` on `link_to_remove_association`')
      }
    }

    e.preventDefault()
    e.stopPropagation()

    var container = toRemove.parentNode

    if (typeof this.beforeRemove == 'function') {
      var result = this.beforeRemove(toRemove)

      if (!result && typeof result == 'boolean')
        return
    }

    var timeout = parseInt(container.getAttribute('data-remove-timeout'))
    if (isNaN(timeout)) timeout = 0

    setTimeout(() => {
      if (removeLink.classList.contains('dynamic'))
        container.removeChild(toRemove)
      else {
        var input = toRemove.previousSibling
        if (input.matches('input[type="hidden"]'))
          input.value = '1'

        toRemove.style.display = 'none'
      }

      if (typeof this.afterRemove == 'function')
        this.afterRemove(toRemove)
    }, timeout)
  }
}

export default Cocoon
