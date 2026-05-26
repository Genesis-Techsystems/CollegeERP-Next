import { AdmissionScreenPlaceholder } from '../../_components/AdmissionScreenPlaceholder'

export default function EditApplicationFormPage() {
  return (
    <AdmissionScreenPlaceholder
      title="Edit Application Form"
      description="Editing an existing student application form requires the full Angular wizard port. Return to Application List and use other screens until this form is completed."
      backHref="/admission/application-form/application-list"
      backLabel="Back to Application List"
    />
  )
}
