export const debounce = <F extends (...a: any[]) => void>(fn: F, ms = 250) => {
  let t: number | undefined
  return (...args: Parameters<F>) => {
    clearTimeout(t)
    // @ts-ignore setTimeout types
    t = setTimeout(() => fn(...args), ms)
  }
}