import { Component, OnInit,VERSION } from '@angular/core';
import { ActivatedRoute,Router } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';
import { ParametersService } from 'app/main/services/parameters.service';

@Component({
  selector: 'app-print-exam-hallticket',
  templateUrl: './print-exam-hallticket.component.html',
  styleUrls: ['./print-exam-hallticket.component.scss']
})
export class PrintExamHallticketComponent implements OnInit {

  SemisterList =[
    {id:'ISEM'    , value:'FIRST'},
    {id:'IISEM'   , value:'SECOND'},
    {id:'IIISEM'  , value:'THIRD'},
    {id:'IVSEM'   , value:'FOURTH'},
    {id:'VSEM'    , value:'FIFTH'},
    {id:'VISEM'   , value:'SIXTH'},
    {id:'VIISEM'  , value:'SEVENTH'},
    {id:'VIIISEM' , value:'EIGHTH'},
  ]

  name = 'Angular ' + VERSION.major;
  studentName: any;
  rollnumer: any;
  data: any;
  MINIO = CONSTANTS.MINIO;
  params: any;
  examId : any;
  studentId: any;
  bulkData: any;
  param: any;
  flag: any;
  singleData: any;
  pageparams: any;
  orgCode: string;
  universityCode: string;
  myDate: Date;

  constructor( private route:ActivatedRoute,private router:Router,private parameters : ParametersService) { 
  
  }

  ngOnInit(): void {
    this.orgCode=localStorage.getItem('orgCode');
    this.myDate = new Date();
   if (this.parameters.bulkPrintHalltikets && this.parameters.bulkPrintHalltikets.length>0) {
      this.flag = 2
      this.param = this.parameters.bulkPrintHalltikets[0];
      this.bulkData = this.param?.htBulkdata;
      this.universityCode = this.param?.universityCode;
      console.log(this.bulkData,"this.bulkData");
      console.log(this.universityCode,"this.universityCode");
    }else{
        this.router.navigate(['admin-examination-management/admin-pre-examinations/exam-hallticket']);
    }
    // else if( this.parameters.printSingleHallticket && this.parameters.printSingleHallticket.length>0){
    //   this.flag = 3
    //   this.pageparams =  this.parameters.printSingleHallticket[0];
    //   this.singleData = this.pageparams.htdata;
    // }
  }
  tConvert(time): void{
    time = time.toString ().match (/^([01]\d|2[0-3])(:)([0-5]\d)(:[0-5]\d)?$/) || [time];

    if (time.length > 1) { // If time format correct
      time = time.slice (1);  // Remove full string match value
      time[5] = +time[0] < 12 ? 'AM' : 'PM'; // Set AM/PM
      time[0] = +time[0] % 12 || 12; // Adjust hours
    }
    time = time[0] + time[1] + time[2] + ' ' + time[5];
    return time; 
  }
  printPage(_printsection:any) {
    window.print();
  }
  backBulkPrint(){
    this.router.navigate(['admin-examination-management/admin-pre-examinations/exam-hallticket'],)
    this.parameters.printSingleHallticket = []
    let queryparams = [
      {
        bulkData :this.param.htBulkdata,
        pageParams:this.param.formValues       
      }
    ]
    this.parameters.bulkPrintHalltikets = queryparams;
  }
  backSinglePrint(){
    this.router.navigate(['admin-examination-management/admin-pre-examinations/exam-hallticket'])
    this.parameters.bulkPrintHalltikets = []
     let queryparams = [
      {
        singleData:this.pageparams.htdata,
        pageParams:this.pageparams.formValues
      }
    ]
    this.parameters.printSingleHallticket = queryparams;
  }
}