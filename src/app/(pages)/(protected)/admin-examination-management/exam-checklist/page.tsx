'use client'

import { Construction } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/layout'
import { EmptyState } from '@/common/components/feedback'

export default function ExamChecklistPage() {
	return (
		<PageContainer className="space-y-4">
			<PageHeader title="Exam Checklist" subtitle="Operational checklist for exams" />
			<EmptyState
				icon={Construction}
				title="Coming soon"
				description="The exam operational checklist isn't available yet — it will be enabled in an upcoming release."
			/>
		</PageContainer>
	)
}
