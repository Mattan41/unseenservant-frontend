import { describe, it, expect } from 'vitest'
import { isNestedControlClick, isOwnKeyEvent } from '@/utils/interactiveEvent.js'

/**
 * The helpers read `target`/`currentTarget`, so they are exercised through a
 * real listener: the container carries the handler and the event is dispatched
 * on the element under the pointer (or the focused one), exactly as a browser
 * bubbles it.
 */
function listenOn(container, eventName, helper) {
  const results = []
  container.addEventListener(eventName, (event) => results.push(helper(event)))
  return results
}

function click(target) {
  target.dispatchEvent(new MouseEvent('click', { bubbles: true }))
}

function keydown(target) {
  target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
}

describe('interactiveEvent', () => {
  describe('isNestedControlClick', () => {
    it('is false when the click lands on the container itself', () => {
      const container = document.createElement('div')
      const results = listenOn(container, 'click', isNestedControlClick)

      click(container)

      expect(results).toEqual([false])
    })

    it('is false when the click lands on plain content inside the container', () => {
      const container = document.createElement('div')
      const heading = document.createElement('h5')
      container.append(heading)
      const results = listenOn(container, 'click', isNestedControlClick)

      click(heading)

      expect(results).toEqual([false])
    })

    it('is true when the click lands on a nested button', () => {
      const container = document.createElement('div')
      const button = document.createElement('button')
      container.append(button)
      const results = listenOn(container, 'click', isNestedControlClick)

      click(button)

      expect(results).toEqual([true])
    })

    it('is true when the click lands on content inside a nested link', () => {
      const container = document.createElement('div')
      const link = document.createElement('a')
      const label = document.createElement('span')
      link.append(label)
      container.append(link)
      const results = listenOn(container, 'click', isNestedControlClick)

      click(label)

      expect(results).toEqual([true])
    })

    it('tolerates an event whose target exposes no `closest`', () => {
      expect(isNestedControlClick({ target: {} })).toBe(false)
    })
  })

  describe('isOwnKeyEvent', () => {
    it('is true when the container itself is focused', () => {
      const container = document.createElement('div')
      const results = listenOn(container, 'keydown', isOwnKeyEvent)

      keydown(container)

      expect(results).toEqual([true])
    })

    it('is false when a nested control is focused', () => {
      const container = document.createElement('div')
      const button = document.createElement('button')
      container.append(button)
      const results = listenOn(container, 'keydown', isOwnKeyEvent)

      keydown(button)

      expect(results).toEqual([false])
    })
  })
})
