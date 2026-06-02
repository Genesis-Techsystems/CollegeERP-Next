import { AdmissionScreenPlaceholder } from '../../_components/AdmissionScreenPlaceholder'

export default function AdmissionReceiptPage() {
  return (
    <AdmissionScreenPlaceholder
      title="Admission Receipt"
      description="Receipt printing for applications will mirror Angular admission-reciept after the application form wizard is migrated."
      backHref="/admission/application-form/application-list"
      backLabel="Back to Application List"
    />
  )
}
