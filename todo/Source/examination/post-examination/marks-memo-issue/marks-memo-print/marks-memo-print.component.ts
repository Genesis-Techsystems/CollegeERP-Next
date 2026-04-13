import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { GenericFunctions } from 'app/main/common/generic-functions';

@Component({
  selector: 'app-marks-memo-print',
  templateUrl: './marks-memo-print.component.html',
  styleUrls: ['./marks-memo-print.component.scss']
})
export class MarksMemoPrintComponent implements OnInit {
  params: any;
  data: any;
  memodata:any;
  rollnumber: any;
  logo:any;

public MinIo = CONSTANTS.MINIO
private InternalExternalMarks = CONSTANTS.internalExternalMarksUrl
private collgeIdUrl = CONSTANTS.collegeByIdUrl
  marks: any;
  value: any;
  totalcredits:any;

  constructor(private router:Router,private route:ActivatedRoute,private snotifyService: SnotifyService,
    private crudService: CrudService, private spinner: NgxSpinnerService,private genericFunctions: GenericFunctions) { }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params=>{
      this.params = params
      this.data = JSON.parse(params.data);
      console.log(this.data);
      this.memodata = this.data[0].examStudentMemoSubjectDTO;
     this.rollnumber = this.data[0].examStudentMemoSubjectDTO[0].stdRollNumber;
     this.logo = this.data[0].examStudentMemoSubjectDTO[0].logoFilename;
      console.log(this.memodata,"Dto");
      this.findsum();
      this.getCaUaMarks();
    });
  
  }
  
 printPage() {
    window.print();
  }
  backPage(data){
    
    
    this.router.navigate(['admin-examination-management/admin-post-examination/marks-memo-issue'],
   
    {queryParams:{
    studentId:data[0].studentId,
    examId:data[0].examId,
    courseYearId:data[0].courseYearId
   }}
    );
    console.log(data[0].studentId,"studentId");
    
  }

 getCaUaMarks(){
  let collegeId = this.data[0].collegeId;
  let studentId = this.data[0].studentId;
console.log(collegeId,studentId,"ids");
  
  /*----------- Marks -----------*/
    this.crudService.ListDetailsByTwo(this.InternalExternalMarks,this.collgeIdUrl,'studentId',
    collegeId,studentId)
    .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200){
           this.marks = result.data[0]
        }else {
            this.snotifyService.error(result.message, 'Error!');
        }
    }, error => {
        this.spinner.hide();
        if (error.error.statusCode === 401){
         this.snotifyService.error(error.error.message, 'Error!');
         this.genericFunctions.logOut(this.router.url);
     }else{
         this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
     }
    });
 
 } 

 findsum(){    
  
  this.value= this.memodata;
  console.log(this.value);  
  for(let j=0;j<this.value.length;j++){   
       this.totalcredits+= this.value[j].credits;

  }  
}
getTotalCredits() {
  return  this.memodata.map(t => t.credits).reduce((acc, value) => acc + value, 0);
}
getTotalGpv() {
    return this.memodata.map(t => t.credits * t.gradePoints ).reduce((acc, value) => acc + value, 0);
}

}
