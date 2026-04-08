// Server Component — scoped Examination theme wrapper

export default function ExaminationLayout({
	children,
}: {
	readonly children: React.ReactNode
}) {
	return (
		<div className="theme-examination">
			{/* Consistent vertical rhythm between header/cards across the module */}
			<div className="space-y-2">{children}</div>
		</div>
	)
}

