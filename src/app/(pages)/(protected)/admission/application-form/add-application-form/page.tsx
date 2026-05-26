import { AdmissionScreenPlaceholder } from '../../_components/AdmissionScreenPlaceholder'

export default function AddApplicationFormPage() {
  return (
    <AdmissionScreenPlaceholder
      title="Add Application Form"
      description="The multi-step college application wizard from Angular (personal details, education, documents, workflow) is scheduled for a follow-up port. Use Application List to view existing applications."
      backHref="/admission/application-form/application-list"
      backLabel="Back to Application List"
    />
  )
}
