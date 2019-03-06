class Cocoon {
  constructor(container, options={}) {
    this.container = this.getNodeFromOption(container, false)

    if (!this.container) {
      throw new TypeError('Container must be supplied')
    }

    this.addFieldsLink = this.getNodeFromOption(options.addFieldsLink, this.container.querySelector('.add_fields'))
    this.removeWrapperClass = options.removeWrapperClass || 'nested-fields'

    if (!this.addFieldsLink)
      console.warn('Cannot find the link to add fields. Make sure your `link_to_add_association` is correct.')

    this.insertionNode = this.getNodeFromOption(options.insertionNode, this.addFieldsLink.parentNode)

    if (!this.insertionNode)
      console.warn('Cannot find the element to insert the template. Make sure your `insertionNode` option is correct.')

    this.insertionFunction = options.insertionFunction || function(refNode, content) {
      refNode.insertAdjacentHTML('beforebegin', content)
      return refNode.previousElementSibling
    }

    this.beforeInsert  = options.beforeInsert // function(html_string) { ...; returns html_string }, return false to cancel
    this.afterInsert   = options.afterInsert  // function(element) { ... }
    this.beforeRemove  = options.beforeRemove // function(element) { ... }, return false to cancel
    this.afterRemove   = options.afterRemove  // function(element) { ... }
    this.removeTimeout = parseInt(options.removeTimeout) || 0
    this.elementCount  = 0

    var associations = `(${this.addFieldsLink.getAttribute('data-association')}|${this.addFieldsLink.getAttribute('data-associations')})`
    this.regexId = new RegExp(`_new_${associations}_(\\w*)`, 'g')
    this.regexParam = new RegExp(`\\[new_${associations}\\](.*?\\s)`, 'g')

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

    var link  = e.target,
      content = link.getAttribute('data-association-insertion-template')

    var count = parseInt(link.getAttribute('data-count'), 10)
    count = isNaN(count) ? 1 : Math.max(count, 1)

    var newContents = []

    while (count) {
      newContents.push(this.replaceContent(content))
      count -= 1
    }

    newContents.forEach((html) => {
      if (typeof this.beforeInsert == 'function')
        html = this.beforeInsert(html)

      if (!html)
        return

      var newNode = this.insertionFunction(this.insertionNode, html)

      if (typeof this.afterInsert == 'function') {
        if (newNode instanceof HTMLElement)
          this.afterInsert(newNode)
        else
          console.warn('Skipping `afterInsert`; please check that `insertionFunction` returns a DOM element')
      }
    })
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
        var input = toRemove.previousSibling
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
