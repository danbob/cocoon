import Cocoon from 'cocoon.es6';
import { toBeInTheDocument, toHaveStyle, stringMatching } from 'jest-dom/extend-expect'

jest.useFakeTimers();

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

describe('Cocoon', () => {
  afterEach(() => {
    document.getElementsByTagName('html')[0].innerHTML = '';
  });

  it('should throw error on missing container selector', () => {
    expect(() => {
      new Cocoon()
    }).toThrow(new Error('Container selector string or element must be supplied'));
  });

  it('should throw error on missing container selector element', () => {
    expect(() => {
      new Cocoon('.missing')
    }).toThrow(new Error('Container selector string or element must be supplied'));
  });

  it('should throw error on missing addFieldsLink selector', () => {
    document.body.innerHTML = '<div class="container" />';

    expect(() => {
      new Cocoon('.container')
    }).toThrow(new Error('Cannot find link to add fields. Make sure your `addFieldsLink` option or `link_to_add_association` is correct.'));
  });

  it('should throw error on missing addFieldsLink element', () => {
    document.body.innerHTML = '<div class="container" />';

    expect(() => {
      new Cocoon('.container', { addFieldsLink: '.missing' })
    }).toThrow(new Error('Cannot find link to add fields. Make sure your `addFieldsLink` option or `link_to_add_association` is correct.'));
  });

  it('should throw error on missing insertionNode element', () => {
    document.body.innerHTML = `<div class="container">
      <div class="add_fields">
    </div>`;

    expect(() => {
      new Cocoon('.container', { insertionNode: '.missing' })
    }).toThrow(new Error('Cannot find the element to insert the template. Make sure your `insertionNode` option is correct.'));
  });

  it('should insert insertion template into document', () => {
    const template = `<div class="nested-fields"></div>`

    document.body.innerHTML = `<div class="container">
      <a class="add_fields" data-association-insertion-template="${escapeHtml(template)}">
    </div>`;

    new Cocoon('.container');

    const mouseClick = new MouseEvent('click', { bubbles: true });
    document.querySelector('.add_fields').dispatchEvent(mouseClick);

    expect(document.querySelector('.nested-fields')).toBeInTheDocument();
  });

  it('should use custom insertionFunction to insert template', () => {
    const template = `<div class="nested-fields"></div>`

    document.body.innerHTML = `<div class="container">
      <a class="add_fields" data-association-insertion-template="${escapeHtml(template)}">
    </div>`;

    const insertionFunction = function(refNode, content) {
      refNode.insertAdjacentHTML('afterbegin', content)
      return refNode
    }

    new Cocoon('.container', { insertionFunction: insertionFunction });

    const mouseClick = new MouseEvent('click', { bubbles: true });
    document.querySelector('.add_fields').dispatchEvent(mouseClick);

    expect(document.querySelector('.container > .nested-fields')).toBeInTheDocument();
  });

  it('should replace associations name with given one', () => {
    const template = `<div class="nested-fields">
      <input type="hidden" name="user[items_attributes][new_items][id]" id="user_items_attributes_new_items_id" />
    </div>`;

    document.body.innerHTML = `<div class="container">
      <a class="add_fields" data-associations="items" data-association-insertion-template="${escapeHtml(template)}">
    </div>`;

    new Cocoon('.container');

    const mouseClick = new MouseEvent('click', { bubbles: true });
    document.querySelector('.add_fields').dispatchEvent(mouseClick);

    expect(document.querySelector('input').name).toEqual(expect.stringMatching(/user\[items_attributes\]\[\d+\]\[id\]/));
    expect(document.querySelector('input').id).toEqual(expect.stringMatching(/user_items_attributes_\d+_id/));
  });

  it('should call beforeInsert before inserting template', () => {
    const template = `<div class="nested-fields"></div>`

    document.body.innerHTML = `<div class="container">
      <a class="add_fields" data-association-insertion-template="${escapeHtml(template)}">
    </div>`;

    const beforeInsert = function(html) {
      return html.replace('nested-fields', 'before-insert');
    };

    new Cocoon('.container', { beforeInsert: beforeInsert });

    const mouseClick = new MouseEvent('click', { bubbles: true });
    document.querySelector('.add_fields').dispatchEvent(mouseClick);

    expect(document.querySelector('.before-insert')).toBeInTheDocument();
  });

  it('should call afterInsert after inserting template', () => {
    const template = `<div class="nested-fields"></div>`

    document.body.innerHTML = `<div class="container">
      <a class="add_fields" data-association-insertion-template="${escapeHtml(template)}">
    </div>`;

    const afterInsert = jest.fn();

    new Cocoon('.container', { afterInsert: afterInsert });

    const mouseClick = new MouseEvent('click', { bubbles: true });
    document.querySelector('.add_fields').dispatchEvent(mouseClick);

    expect(afterInsert).toBeCalled();
  });

  it('should remove nested fields after clicking remove for existing association', () => {
    document.body.innerHTML = `<div class="nested-fields">
      <input type="hidden" value="false"><a class="remove_fields existing" href="#">Remove</a>
    </div>
    <div class="container">
      <a class="add_fields" />
    </div>`;

    new Cocoon('.container');

    const mouseClick = new MouseEvent('click', { bubbles: true });
    document.querySelector('.remove_fields').dispatchEvent(mouseClick);

    jest.runAllTimers();

    expect(document.querySelector('input').value).toEqual('1');
    expect(document.querySelector('.nested-fields')).toHaveStyle('display: none')
  });

  it('should call beforeRemove before removing nested fields', () => {
    document.body.innerHTML = `<div class="nested-fields">
      <input type="hidden" value="false"><a class="remove_fields existing" href="#">Remove</a>
    </div>
    <div class="container">
      <a class="add_fields" />
    </div>`;

    const beforeRemove = jest.fn();

    new Cocoon('.container', { beforeRemove: beforeRemove });

    const mouseClick = new MouseEvent('click', { bubbles: true });
    document.querySelector('.remove_fields').dispatchEvent(mouseClick);

    jest.runAllTimers();

    expect(beforeRemove).toBeCalled();
  });

  it('should call afterRemove after removing nested fields', () => {
    document.body.innerHTML = `<div class="nested-fields">
      <input type="hidden" value="false"><a class="remove_fields existing" href="#">Remove</a>
    </div>
    <div class="container">
      <a class="add_fields" />
    </div>`;

    const afterRemove = jest.fn();

    new Cocoon('.container', { afterRemove: afterRemove });

    const mouseClick = new MouseEvent('click', { bubbles: true });
    document.querySelector('.remove_fields').dispatchEvent(mouseClick);

    jest.runAllTimers();

    expect(afterRemove).toBeCalled();
  });

  it('should remove existing destroyed elements on document load', () => {
    document.body.innerHTML = `<div class="nested-fields">
      <input type="hidden" value="false"><a class="remove_fields existing destroyed" href="#">Remove</a>
    </div>
    <div class="container">
      <a class="add_fields" />
    </div>`;

    new Cocoon('.container');

    const event = document.createEvent('Event')
    event.initEvent('DOMContentLoaded', true, true)
    window.document.dispatchEvent(event)

    expect(document.querySelector('.nested-fields')).toHaveStyle('display: none')
  });
});
