import { Component, OnInit,VERSION } from '@angular/core';
import { ActivatedRoute,Router } from '@angular/router';
@Component({
  selector: 'app-omr-single-page-design',
  templateUrl: './omr-single-page-design.component.html',
  styleUrls: ['./omr-single-page-design.component.scss']
})
export class OmrSinglePageDesignComponent implements OnInit {
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


  constructor( private route:ActivatedRoute,private router:Router) { }

  ngOnInit(): void {
    this.route.queryParams
    .subscribe(params => {
      this.params=params
      if(params.data){
        this.bulk=true
        this.bulkdata=JSON.parse(params.data),
        this.examName=params.ExamName,
        this.collegeName=params.CollegeName
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
       
});

  }
  printPage(_printsection:any) {
    window.print();
  }
  // printBack(){
  //   this.router.navigate(['admin-examination-management/admin-pre-examinations/subject-barcode'],
  //   {queryParams : {
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
          collegeId:this.params.collegeId,
          academicYearId:this.params.academicYearId,
          courseId:this.params.courseId,
          courseGroupId:this.params.courseGroupId,
          courseYearId:this.params.courseYearId,
          examId:this.params.examId,
          studentId:this.params.studentId,
          subjectId:this.params.subjectId,
        }})
    }
    else{
      this.router.navigate(['admin-examination-management/admin-pre-examinations/subject-barcode'],
        {queryParams : {
          collegeId:this.params.collegeId,
          academicYearId:this.params.academicYearId,
          courseId:this.params.courseId,
          courseGroupId:this.params.courseGroupId,
          courseYearId:this.params.courseYearId,
          examId:this.params.examId,
          studentId:this.params.studentId,
          subjectId:this.params.subjectId,
        }})
    }
 
  }
}



