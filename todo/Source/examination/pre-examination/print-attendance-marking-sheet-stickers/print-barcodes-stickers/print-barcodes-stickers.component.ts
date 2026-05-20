
import { Component, OnInit,VERSION } from '@angular/core';
import { ActivatedRoute,Router } from '@angular/router';
import { ParametersService } from 'app/main/services/parameters.service';


@Component({
  selector: 'app-print-barcodes-stickers',
  templateUrl: './print-barcodes-stickers.component.html',
  styleUrls: ['./print-barcodes-stickers.component.scss']
})
export class PrintBarcodesStickersComponent implements OnInit {
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
  data: any;

  constructor(
    private router: Router,private paramaters:ParametersService,
    private route: ActivatedRoute, private parameters: ParametersService) {
}


  ngOnInit(): void {
    if (this.parameters.examAttendanceMarking) {
      this.params = this.parameters.examAttendanceMarking[0];
      this.data = JSON.parse(this.params.data)
    }

  }
  tConvert(time): any{
    if (time !== null && time !== undefined){
       time = time.toString ().match (/^([01]\d|2[0-3])(:)([0-5]\d)(:[0-5]\d)?$/) || [time];
       if (time.length > 1) { // If time format correct
         time = time.slice (1);  // Remove full string match value
         time[5] = +time[0] < 12 ? 'AM' : 'PM'; // Set AM/PM
         time[0] = +time[0] % 12 || 12; // Adjust hours
       }
       time = time[0] + time[1] + time[2] + ' ' + time[5];
       return time; 
    }
  }
  printPage(_printsection:any) {
    window.print();
  }
  printBack(){
    
    this.router.navigate(['admin-examination-management/admin-pre-examinations/print-attendance-marking-sheet-stickers'])
    let queryparams = [
      {
        courseId: this.params.value.courseId,
        collegeCode: this.params.value.collegeCode,
        collegeId: this.params.value.collegeId,
        academicYearId: this.params.value.academicYearId,
        roomId: this.params.value.roomId,
        employeeId: this.params.value.employeeId,
        courseGroupId: this.params.value.courseGroupId,
        courseYearId: this.params.value.courseYearId,
        examId: this.params.value.examId,
        examSessionId: this.params.value.examSessionId,
        examDate: this.params.value.examDate,
      }
    ]
    this.paramaters.examAttendanceMarking = queryparams;
    
  }
  

}

