import * as React from "react"

const TOAST_LIMIT = 5
const TOAST_REMOVE_DELAY = 1000

type ToastVariant = "default" | "success" | "destructive"

type ToasterToast = {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  duration?: number
  variant?: ToastVariant
}

type ToastAction =
  | {
      type: "ADD_TOAST"
      toast: ToasterToast
    }
  | {
      type: "UPDATE_TOAST"
      toast: Partial<ToasterToast>
    }
  | {
      type: "DISMISS_TOAST"
      toastId?: ToasterToast["id"]
    }
  | {
      type: "REMOVE_TOAST"
      toastId?: ToasterToast["id"]
    }

type ToastState = {
  toasts: ToasterToast[]
}

let toastCount = 0

const genId = () => {
  toastCount = (toastCount + 1) % Number.MAX_SAFE_INTEGER
  return toastCount.toString()
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) return

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({ type: "REMOVE_TOAST", toastId })
  }, TOAST_REMOVE_DELAY)

  toastTimeouts.set(toastId, timeout)
}

const toastReducer = (state: ToastState, action: ToastAction): ToastState => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }
    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((toast) =>
          toast.id === action.toast.id ? { ...toast, ...action.toast } : toast,
        ),
      }
    case "DISMISS_TOAST": {
      const { toastId } = action
      if (toastId) {
        addToRemoveQueue(toastId)
      } else {
        state.toasts.forEach((toast) => addToRemoveQueue(toast.id))
      }
      return {
        ...state,
        toasts: state.toasts.map((toast) =>
          toast.id === toastId ? { ...toast } : toast,
        ),
      }
    }
    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return { ...state, toasts: [] }
      }
      return {
        ...state,
        toasts: state.toasts.filter((toast) => toast.id !== action.toastId),
      }
  }
}

let memoryState: ToastState = { toasts: [] }
const listeners = new Set<(state: ToastState) => void>()

const dispatch = (action: ToastAction) => {
  memoryState = toastReducer(memoryState, action)
  listeners.forEach((listener) => listener(memoryState))
}

function toast(props: Omit<ToasterToast, "id">) {
  const id = genId()
  const duration = props.duration ?? 5000

  dispatch({
    type: "ADD_TOAST",
    toast: { ...props, id, duration },
  })

  if (duration !== Infinity) {
    setTimeout(() => dispatch({ type: "DISMISS_TOAST", toastId: id }), duration)
  }

  return {
    id,
    dismiss: () => dispatch({ type: "DISMISS_TOAST", toastId: id }),
    update: (props: Partial<ToasterToast>) =>
      dispatch({
        type: "UPDATE_TOAST",
        toast: { ...props, id },
      }),
  }
}

function useToast() {
  const [state, setState] = React.useState<ToastState>(memoryState)

  React.useEffect(() => {
    listeners.add(setState)
    return () => {
      listeners.delete(setState)
    }
  }, [])

  const dismiss = React.useCallback((toastId?: string) => {
    dispatch({ type: "DISMISS_TOAST", toastId })
  }, [])

  return {
    ...state,
    toast,
    dismiss,
  }
}

export { useToast, toast }
export type { ToasterToast }
