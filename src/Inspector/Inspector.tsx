import React, { useEffect, useRef } from 'react'
import type { Fiber } from 'react-reconciler'
import { setupHighlighter } from './utils/highlight'
import {
  getElementCodeInfo,
  getElementInspect,
  CodeInfo,
} from './utils/inspect'
import Overlay from './Overlay'


export interface InspectParams {
  /** hover / click event target dom element */
  element: HTMLElement,
  /** nearest named react component fiber for dom element */
  fiber?: Fiber,
  /** source file line / column / path info for react component */
  codeInfo?: CodeInfo,
  /** react component name for dom element */
  name?: string,
}

export type ElementHandler = (params: InspectParams) => void

export interface InspectorProps {
  onHoverElement?: ElementHandler,
  onClickElement?: ElementHandler,
  /**
   * whether disable click react component to open IDE for view component code
   */
  disableLaunchEditor?: boolean,
}

export const Inspector: React.FC<InspectorProps> = (props) => {
  const {
    onHoverElement,
    onClickElement,
  } = props

  /** inspector tooltip overlay */
  const overlayRef = useRef<Overlay>()
  const mousePointRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })

  const recordMousePoint = ({ clientX, clientY }: MouseEvent) => {
    mousePointRef.current.x = clientX
    mousePointRef.current.y = clientY
  }

  const startInspect = () => {
    const overlay = new Overlay()
    overlayRef.current = overlay

    const stopCallback = setupHighlighter({
      onPointerOver: handleHoverElement,
      onClick: handleClickElement,
    })

    overlay.setRemoveCallback(stopCallback)

    // inspect element immediately at mouse point
    const initPoint = mousePointRef.current
    const initElement = document.elementFromPoint(initPoint.x, initPoint.y)
    if (initElement) handleHoverElement(initElement as HTMLElement)
  }

  const stopInspect = () => {
    overlayRef.current?.remove()
    overlayRef.current = undefined
  }

  const handleHoverElement = (element: HTMLElement) => {
    const overlay = overlayRef.current

    const codeInfo = getElementCodeInfo(element)
    const relativePath = codeInfo?.relativePath
    const absolutePath = codeInfo?.absolutePath

    const { fiber, name, title } = getElementInspect(element)

    overlay?.inspect?.([element], title, relativePath ?? absolutePath)

    onHoverElement?.({
      element,
      fiber,
      codeInfo,
      name,
    })
  }

  const handleClickElement = (element: HTMLElement) => {
    stopInspect()
    const codeInfo = getElementCodeInfo(element)
    const { fiber, name } = getElementInspect(element)

    onClickElement?.({
      element,
      fiber,
      codeInfo,
      name,
    })

    startInspect()
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.onmessage = function (e) {
        if (e.data === 'enableInspector') startInspect()
        if (e.data === 'disableInspector') stopInspect()
      }
    }

    document.addEventListener('mousemove', recordMousePoint, true)
    return () => {
      document.removeEventListener('mousemove', recordMousePoint, true)
    }
  }, [])


  return null
}
