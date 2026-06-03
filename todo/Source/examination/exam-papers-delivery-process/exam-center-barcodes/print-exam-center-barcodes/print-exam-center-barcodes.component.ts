import { Component, OnInit,VERSION } from '@angular/core';
import { ActivatedRoute,Router } from '@angular/router';

@Component({
  selector: 'app-print-exam-center-barcodes',
  templateUrl: './print-exam-center-barcodes.component.html',
  styleUrls: ['./print-exam-center-barcodes.component.scss']
})
export class PrintExamCenterBarcodesComponent implements OnInit {

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
      const grouped = this.groupByRoomId(this.bulkdata);
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
  groupByRoomId(data: any[]): { [roomId: string]: any[] } {
  return data.reduce((acc, item) => {
    const roomId = item.subjectId;
    if (!acc[roomId]) {
      acc[roomId] = [];
    }
    acc[roomId].push(item);
    return acc;
  }, {});
}
  printPage(_printsection:any) {
    window.print();
  }
  printBack(){
   this.router.navigate(['admin-examination-management/exam-papers-delivery-process/exam-center-barcodes'],
        {queryParams : {
          academicYearId: this.params.academicYearId,
          examGroupId: this.params.examGroupId,
          univExamcenterId: this.params.univExamcenterId,
          courseGroupId: this.params.courseGroupId,
          courseYearId: this.params.courseYearId,
          subjectId: this.params.subjectId
        }})
    }
}
