/** Academic term of a date, used as the default report period: "Spring 2026", "Summer 2026" or "Fall 2026". */
export function currentTerm(date = new Date()): string {
  const month = date.getMonth()
  const season = month <= 4 ? 'Spring' : month <= 6 ? 'Summer' : 'Fall'
  return `${season} ${date.getFullYear()}`
}
