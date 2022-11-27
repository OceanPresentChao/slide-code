export function getRandomNumberByRange(start: number, end: number) {
  const choices = end - start + 1
  return Math.floor(Math.random() * choices + start)
}
