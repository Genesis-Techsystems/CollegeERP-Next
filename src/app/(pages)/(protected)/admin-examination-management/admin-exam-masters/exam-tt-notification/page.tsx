'use client'

import { Construction } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/layout'
import { EmptyState } from '@/common/components/feedback'

export default function ExamTtNotificationPage() {
	return (
		<PageContainer className="space-y-4">
			<PageHeader title="Exam Timetable Notification" subtitle="Notify stakeholders about the timetable" />
			<EmptyState
				icon={Construction}
				title="Coming soon"
				description="Timetable notifications aren't available yet — this screen will be enabled in an upcoming release."
			/>
		</PageContainer>
	)
}
