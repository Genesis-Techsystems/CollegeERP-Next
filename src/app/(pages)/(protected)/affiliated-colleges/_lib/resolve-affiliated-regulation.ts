type AnyRow = Record<string, unknown>;

function pickPositiveId(row: AnyRow | undefined, keys: string[]): number {
  if (!row) return 0;
  for (const key of keys) {
    const n = Number(row[key]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function pickText(row: AnyRow | undefined, keys: string[]): string {
  if (!row) return "";
  for (const key of keys) {
    const v = row[key];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

function isRegulationMarkerRow(row: AnyRow): boolean {
  return String(row.clg_filters_regulation ?? "") === "clg_filters_regulation";
}

function rowMatchesFilterContext(
  row: AnyRow,
  collegeId: number,
  courseId: number,
  courseGroupId: number,
  courseYearId: number,
): boolean {
  if (pickPositiveId(row, ["fk_college_id", "collegeId"]) !== collegeId) {
    return false;
  }
  const rowCourse = pickPositiveId(row, ["fk_course_id", "courseId"]);
  if (courseId > 0 && rowCourse > 0 && rowCourse !== courseId) return false;
  const rowGroup = pickPositiveId(row, ["fk_course_group_id", "courseGroupId"]);
  if (courseGroupId > 0 && rowGroup > 0 && rowGroup !== courseGroupId) {
    return false;
  }
  const rowYear = pickPositiveId(row, ["fk_course_year_id", "courseYearId"]);
  if (courseYearId > 0 && rowYear > 0 && rowYear !== courseYearId) {
    return false;
  }
  return true;
}

/** Angular `regulations = regulationData.filter(university + course)` with filter-row fallback. */
export function listAffiliatedRegulationsForCourse(
  regulationData: AnyRow[],
  universityId: number,
  courseId: number,
  filtersData: AnyRow[] = [],
  collegeId = 0,
): AnyRow[] {
  const uniq = new Map<number, AnyRow>();

  const addRow = (row: AnyRow) => {
    const id = pickPositiveId(row, ["fk_regulation_id", "regulationId"]);
    if (id > 0 && !uniq.has(id)) uniq.set(id, row);
  };

  // Angular: regulations = regulationData.filter(x => x.fk_university_id === uniId && x.fk_course_id === courseId)
  // All rows in regulationData carry the clg_filters_regulation marker field — do NOT skip them.
  for (const row of regulationData) {
    const rowUni = pickPositiveId(row, ["fk_university_id", "universityId"]);
    const rowCourse = pickPositiveId(row, ["fk_course_id", "courseId"]);
    if (universityId > 0 && rowUni > 0 && rowUni !== universityId) continue;
    if (rowCourse > 0 && courseId > 0 && rowCourse !== courseId) continue;
    addRow(row);
  }

  if (universityId > 0 && courseId > 0 && uniq.size === 0) {
    // Fallback: same university, any course
    for (const row of regulationData) {
      const rowUni = pickPositiveId(row, ["fk_university_id", "universityId"]);
      if (rowUni === universityId) addRow(row);
    }
  }

  if (uniq.size === 0 && collegeId > 0 && courseId > 0) {
    // Last-resort: filtersData rows that embed fk_regulation_id for the college + course
    for (const row of filtersData) {
      if (!rowMatchesFilterContext(row, collegeId, courseId, 0, 0)) continue;
      addRow(row);
    }
  }

  return Array.from(uniq.values());
}

export function resolveRegulationFromFilterContext(input: {
  filtersData: AnyRow[];
  regulationData: AnyRow[];
  collegeId: number;
  courseId: number;
  courseGroupId?: number;
  courseYearId?: number;
  universityId?: number;
  queryRegulationId?: number;
  contextRegulationId?: number;
  regulationCode?: string;
}): number {
  const {
    filtersData,
    regulationData,
    collegeId,
    courseId,
    courseGroupId = 0,
    courseYearId = 0,
    queryRegulationId = 0,
    contextRegulationId = 0,
    regulationCode = "",
  } = input;

  const universityId =
    input.universityId ??
    pickPositiveId(
      filtersData.find(
        (row) =>
          pickPositiveId(row, ["fk_college_id", "collegeId"]) === collegeId,
      ),
      ["fk_university_id", "universityId"],
    );

  const prefer = (id: number) => (id > 0 ? id : 0);

  const fromQuery = prefer(queryRegulationId);
  if (fromQuery > 0) return fromQuery;

  const fromContext = prefer(contextRegulationId);
  if (fromContext > 0) return fromContext;

  const exactMatch = filtersData.find(
    (row) =>
      !isRegulationMarkerRow(row) &&
      rowMatchesFilterContext(
        row,
        collegeId,
        courseId,
        courseGroupId,
        courseYearId,
      ) &&
      pickPositiveId(row, ["fk_regulation_id", "regulationId"]) > 0,
  );
  const fromExact = pickPositiveId(exactMatch, [
    "fk_regulation_id",
    "regulationId",
  ]);
  if (fromExact > 0) return fromExact;

  const looseMatch = filtersData.find(
    (row) =>
      !isRegulationMarkerRow(row) &&
      rowMatchesFilterContext(row, collegeId, courseId, 0, 0) &&
      pickPositiveId(row, ["fk_regulation_id", "regulationId"]) > 0,
  );
  const fromLoose = pickPositiveId(looseMatch, [
    "fk_regulation_id",
    "regulationId",
  ]);
  if (fromLoose > 0) return fromLoose;

  return resolveAffiliatedRegulationId({
    queryRegulationId,
    contextRegulationId,
    regulationCode,
    regulationData,
    universityId,
    courseId,
    filtersData,
    collegeId,
  });
}

export function resolveAffiliatedRegulationId(input: {
  queryRegulationId?: number;
  contextRegulationId?: number;
  selectedRegulationId?: number;
  regulationCode?: string;
  regulationData: AnyRow[];
  universityId: number;
  courseId: number;
  filtersData?: AnyRow[];
  collegeId?: number;
}): number {
  const {
    queryRegulationId = 0,
    contextRegulationId = 0,
    selectedRegulationId = 0,
    regulationCode = "",
    regulationData,
    universityId,
    courseId,
    filtersData = [],
    collegeId = 0,
  } = input;

  const regulations = listAffiliatedRegulationsForCourse(
    regulationData,
    universityId,
    courseId,
    filtersData,
    collegeId,
  );

  const prefer = (id: number) => {
    if (id <= 0) return 0;
    if (regulations.length === 0) return id;
    const match = regulations.some(
      (row) => pickPositiveId(row, ["fk_regulation_id", "regulationId"]) === id,
    );
    return match ? id : 0;
  };

  const fromSelected = prefer(selectedRegulationId);
  if (fromSelected > 0) return fromSelected;

  const fromQuery = prefer(queryRegulationId);
  if (fromQuery > 0) return fromQuery;

  const fromContext = prefer(contextRegulationId);
  if (fromContext > 0) return fromContext;

  if (regulationCode && regulations.length > 0) {
    const match = regulations.find(
      (row) =>
        pickText(row, [
          "regulation_code",
          "regulationCode",
          "regulationcode",
        ]) === regulationCode,
    );
    const id = pickPositiveId(match, ["fk_regulation_id", "regulationId"]);
    if (id > 0) return id;
  }

  return pickPositiveId(regulations[0], ["fk_regulation_id", "regulationId"]);
}
