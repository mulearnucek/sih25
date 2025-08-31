declare module 'canvas-confetti' {
  interface Options {
    particleCount?: number
    spread?: number
    angle?: number
    origin?: { x?: number; y?: number }
  }
  function confetti(opts?: Options): void
  export = confetti
}
