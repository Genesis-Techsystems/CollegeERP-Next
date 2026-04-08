import { Component, OnInit,VERSION } from '@angular/core';
import { ActivatedRoute,Router } from '@angular/router';

@Component({
  selector: 'app-print-barcode-stickers',
  templateUrl: './print-barcode-stickers.component.html',
  styleUrls: ['./print-barcode-stickers.component.scss']
})
export class PrintBarcodeStickersComponent implements OnInit {
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


  constructor( private route:ActivatedRoute,private router:Router) { }

  ngOnInit(): void {
    this.route.queryParams
    .subscribe(params => {
      this.params=params
      if(params.data){
        this.bulk=true
        this.bulkdata=JSON.parse(params.data),
        console.log( this.params,' this.bulkdata');
        this.examName=params.ExamName,
        this.collegeName=params.CollegeName
        this.collegeCode= params.collegeCode,
        this.academicyear= params.academicyear,
        this.courseCode= params.courseCode,
        this.courseGroupCode= params.courseGroupCode,
        this.courseYear= params.courseYear
      }
else{
  this.bulk=false
      this.studentname=params.StudentName,
      this.hallticket_number=params.hallticketno,
      this.omr_serial_no=params.omrserialno,
      this.omr_barcode=params.omrbarcode,
      this.examName=params.ExamName,
      this.collegeName=params.CollegeName,
      this.father_name=params.fathername,
      this.caste=params.caste,
      this.date_of_birth=params.DOB,
      this.gender=params.gender,
      this.aadhar_card_no=params.aadharNumber


}
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
  printPage(_printsection:any) {
    window.print();
  }
  // printBack(){
  //   this.router.navigate(['admin-examination-management/admin-pre-examinations/subject-barcode'],
  //   {queryParams : {
  //     collegeCode: this.params.collegeCode,
  //     academicyear:  this.params.academicyear,
  //     courseCode:  this.params.courseCode,
  //     courseGroupCode:  this.params.courseGroupCode,
  //     courseYear:  this.params.courseYear,
  //     collegeId:this.params.collegeId,
  //     academicYearId:this.params.academicYearId,
  //     courseId:this.params.courseId,
  //     courseGroupId:this.params.courseGroupId,
  //     courseYearId:this.params.courseYearId,
  //     examId:this.params.examId,
  //     studentId:this.params.studentId,
  //     subjectId:this.params.subjectId,
  //   }})
  // }
  printBack(){
    if(this.params.type){
      this.router.navigate(['admin-examination-management/admin-pre-examinations/exam-attendancewise-subject-barcode'],
        {queryParams : {
          collegeCode: this.params.collegeCode,
          academicyear:  this.params.academicyear,
          courseCode:  this.params.courseCode,
          courseGroupCode:  this.params.courseGroupCode,
          courseYear:  this.params.courseYear,
          collegeId:this.params.collegeId,
          academicYearId:this.params.academicYearId,
          courseId:this.params.courseId,
          courseGroupId:this.params.courseGroupId,
          courseYearId:this.params.courseYearId,
          examId:this.params.examId,
          studentId:this.params.studentId,
          subjectId:this.params.subjectId,
          regulationId:this.params.regulationId,
        }})
      }
    
    else{
      this.router.navigate(['admin-examination-management/admin-pre-examinations/subject-barcode'],
        {queryParams : {
          collegeCode: this.params.collegeCode,
          academicyear:  this.params.academicyear,
          courseCode:  this.params.courseCode,
          courseGroupCode:  this.params.courseGroupCode,
          courseYear:  this.params.courseYear,
          collegeId:this.params.collegeId,
          academicYearId:this.params.academicYearId,
          courseId:this.params.courseId,
          courseGroupId:this.params.courseGroupId,
          courseYearId:this.params.courseYearId,
          examId:this.params.examId,
          studentId:this.params.studentId,
          subjectId:this.params.subjectId,
          regulationId:this.params.regulationId,
        }})
      }
    }
  


}
