'use client'

import { Construction } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/layout'
import { EmptyState } from '@/common/components/feedback'

export default function ExamDashboardPage() {
	return (
		<PageContainer className="space-y-4">
			<PageHeader title="Examination Dashboard" subtitle="Overview and key metrics" />
			<EmptyState
				icon={Construction}
				title="Coming soon"
				description="The examination dashboard isn't available yet — it will be enabled in an upcoming release."
			/>
		</PageContainer>
	)
}
