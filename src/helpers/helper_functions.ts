const getRandomNumber = (min: number, max: number) => Math.random() * (max - min) + min

const wait = (ms: number) => {
  return new Promise<void>((resolve) => {
    setTimeout(() => resolve(), ms)
  })
}

export { getRandomNumber, wait }
