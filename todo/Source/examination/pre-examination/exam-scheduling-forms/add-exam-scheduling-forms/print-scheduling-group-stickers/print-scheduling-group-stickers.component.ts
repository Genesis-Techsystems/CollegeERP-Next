import { Component, OnInit,VERSION } from '@angular/core';
import { ActivatedRoute,Router } from '@angular/router';

@Component({
  selector: 'app-print-scheduling-group-stickers',
  templateUrl: './print-scheduling-group-stickers.component.html',
  styleUrls: ['./print-scheduling-group-stickers.component.scss']
})
export class PrintSchedulingGroupStickersComponent implements OnInit {
  name = 'Angular ' + VERSION.major;
  params: any;
  studentname: any;
  hallticket_number: any;
  omr_serial_no: any;
  omr_barcode: any;
  examName: any;
  collegaName: any;
  collegeName: any;
  bulk: boolean;
  bulkdata: any;
  father_name: any;
  caste: any;
  date_of_birth: any;
  gender: any;
  aadhar_card_no: any;
  collegeCode: any;
  academicyear: any;
  courseCode: any;
  courseGroupCode: any;
  courseYear: any;
  printHn:boolean = false
  barcodeNo:boolean = false
  groupedByRoomData = [];


  constructor( private route:ActivatedRoute,private router:Router) { }

  ngOnInit(): void {
    this.route.queryParams
    .subscribe(params => {
      this.params=params
      console.log(params,'params');
      console.log(this.params,'this.params');
      if(params.data){
        this.bulk=true
        this.bulkdata=JSON.parse(params.data),
        console.log( this.params,' this.params');
        this.examName=params.ExamName,
        this.collegeName=params.CollegeName
        this.collegeCode= params.collegeCode,
        this.academicyear= params.academicyear,
        this.courseCode= params.courseCode,
        this.courseGroupCode= params.courseGroupCode,
        this.courseYear= params.courseYear,
        console.log(this.bulkdata,'bulkdata')
        console.log(this.params.isBulkPrint,'this.params.isBulkPrint')
      }
      const grouped = this.groupByRoomAndCourseGroup(this.bulkdata);
      this.groupedByRoomData = Object.entries(grouped);
if(  this.params.printHn == 'false'){
  console.log( this.params.printHn,' this.params.printHn');
this.printHn = false
}else {
this.printHn = true

}
if( this.params.barcodeNo == 'false'){
  this.barcodeNo = false
}else{
  this.barcodeNo = true
}
       
});

  }
groupByRoomAndCourseGroup(data: any[]): { [roomId: string]: { [groupId: string]: any[] } } {
  const grouped = data.reduce((acc, item) => {
    const roomId = item.room_id;
    const groupId = item.fk_course_group_id;

    if (!acc[roomId]) acc[roomId] = {};
    if (!acc[roomId][groupId]) acc[roomId][groupId] = [];

    acc[roomId][groupId].push(item);
    return acc;
  }, {} as { [roomId: string]: { [groupId: string]: any[] } });

  // Sort each group by hallticket_number
  Object.values(grouped).forEach(groupByGroupId => {
    Object.values(groupByGroupId).forEach(itemList => {
      itemList.sort((a, b) => a.hallticket_number.localeCompare(b.hallticket_number));
    });
  });

  return grouped;
}
  objectEntries(obj: any): [string, any][] {
    return Object.entries(obj);
  }
  printPage(_printsection:any) {
    window.print();
  }
  printBack(){
    if(this.params.isBulkPrint === 'true'){
   this.router.navigate(['admin-examination-management/admin-pre-examinations/exam-scheduling-forms'],
        {queryParams : {
          collegeId : this.params.collegeId,
          examId : this.params.examId,
          academicYearId : this.params.academicYearId,
          courseId : this.params.courseId,
          examTimetableId : this.params.examTimetableId,
        }})
    }else{
       this.router.navigate(['admin-examination-management/admin-pre-examinations/exam-scheduling-forms/add-exam-scheduling-forms'],
        {queryParams : {
          collegeId : this.params.collegeId,
          collegeCode: this.params.college_code,
          academicyear: this.params.academicYear,
          examId : this.params.examId,
          academicYearId : this.params.academicYearId,
          courseId : this.params.courseId,
          academicYear : this.params.academicYear,
          courseCode : this.params.courseCode,
          examRoomAllotmentId : this.params.examRoomAllotmentId,
          examDate : this.params.examDate
        }})
    }
    }
}