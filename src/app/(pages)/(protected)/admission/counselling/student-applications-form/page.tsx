import { AdmissionScreenPlaceholder } from '../../_components/AdmissionScreenPlaceholder'

export default function StudentApplicationsFormPage() {
  return (
    <AdmissionScreenPlaceholder
      title="Student Applications Form"
      description="University-facing student application form (public/portal flow) will be migrated from Angular student-applications-form."
      backHref="/admission/counselling/student-applications"
      backLabel="Back to Student Applications"
    />
  )
}
