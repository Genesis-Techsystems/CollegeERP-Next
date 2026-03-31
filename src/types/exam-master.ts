export interface CollegeWiseFilterRow {
  fk_university_id: number
  university_name?: string
  university_code?: string
  fk_course_id: number
  course_name?: string
  course_code?: string
}

export interface Regulation {
  regulationId: number
  regulationCode: string
}
