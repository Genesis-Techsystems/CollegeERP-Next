import type { ProfileField } from "./profile-utils";
import { STUDENT_PROFILE_VIEW } from "./profile-view-styles";

export function ProfileFieldGrid({
  fields,
}: {
  readonly fields: ProfileField[];
}) {
  return (
    <div
      className="rounded border-2 p-4 sm:p-5"
      style={{
        borderColor: STUDENT_PROFILE_VIEW.photoBoxBorder,
        backgroundColor: `${STUDENT_PROFILE_VIEW.photoBoxBg}66`,
      }}
    >
      <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map((field) => (
          <div key={field.label} className="min-w-0">
            <p
              className="text-[13px] font-bold leading-snug"
              style={{ color: STUDENT_PROFILE_VIEW.label }}
            >
              {field.label}
            </p>
            <p
              className="mt-0.5 break-words text-[13px] font-normal leading-snug"
              style={{ color: STUDENT_PROFILE_VIEW.linkBlue }}
            >
              {field.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
