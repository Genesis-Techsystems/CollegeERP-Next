type IconProps = {
	className?: string
	size?: number
}

/** Angular `assets/images/avatars/chair_outline.png` */
export const EXAM_SEAT_CHAIR_OUTLINE_SRC = '/assets/images/avatars/chair_outline.png'

/** Angular `assets/images/avatars/chair.png` */
export const EXAM_SEAT_CHAIR_FILLED_SRC = '/assets/images/avatars/chair.png'

/** Angular `assets/images/avatars/person.png` */
export const EXAM_SEAT_PERSON_SRC = '/assets/images/avatars/person.png'

function seatImg(src: string, { className, size = 50 }: IconProps) {
	return (
		// eslint-disable-next-line @next/next/no-img-element -- Angular parity; fixed raster assets from legacy CMS
		<img
			src={src}
			alt=""
			aria-hidden
			className={className}
			style={{ height: size, width: 'auto', maxWidth: '100%' }}
			draggable={false}
		/>
	)
}

export function ExamSeatChairOutlineIcon(props: IconProps) {
	return seatImg(EXAM_SEAT_CHAIR_OUTLINE_SRC, props)
}

export function ExamSeatChairFilledIcon(props: IconProps) {
	return seatImg(EXAM_SEAT_CHAIR_FILLED_SRC, props)
}

export function ExamSeatPersonIcon(props: IconProps) {
	return seatImg(EXAM_SEAT_PERSON_SRC, props)
}
