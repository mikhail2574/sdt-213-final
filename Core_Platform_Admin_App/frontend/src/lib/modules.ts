/** Connected modules of the platform, by backend module code. */
const MODULES: Record<string, { name: string; description: string }> = {
  lms: { name: 'LMS Core', description: 'Courses, materials and grades' },
  sis: { name: 'SIS', description: 'Registration and student records' },
  scheduling: { name: 'Academic Scheduling', description: 'Timetables and rooms' },
  admissions: { name: 'Admissions', description: 'Applications and enrollment' },
}

export function moduleName(code: string): string {
  return MODULES[code]?.name ?? code
}

export function moduleDescription(code: string): string | undefined {
  return MODULES[code]?.description
}
