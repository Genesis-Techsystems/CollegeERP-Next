import { Component, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormControl, FormBuilder, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { GridComponent, PdfExportProperties } from '@syncfusion/ej2-angular-grids';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { College } from 'app/main/models/college';
import { Course } from 'app/main/models/course';
import { CourseGroup } from 'app/main/models/courseGroup';
import { CourseYear } from 'app/main/models/courseYearRegulation';
import { Regulations } from 'app/main/models/Rregulations';
import { CrudService } from 'app/main/services/crud.service';
import *  as moment from 'moment';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';
import { Subject, ReplaySubject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-consolidated-marks-report',
  templateUrl: './consolidated-marks-report.component.html',
  styleUrls: ['./consolidated-marks-report.component.scss']
})
export class ConsolidatedMarksReportComponent implements OnInit {

  panelOpenState = true;

  private collegeCrudUrl = CONSTANTS.collegeCrudUrl;
  private courseCrudUrl = CONSTANTS.courseCrudUrl;
  private courseGroupCrudUrl = CONSTANTS.courseGroupCrudUrl;
  private getDetailsByCollegeIdUrl = CONSTANTS.getDetailsByCollegeIdUrl;
  private getDetailsByCourseIdUrl = CONSTANTS.getDetailsByCourseIdUrl;
  private courseYearCrudUrl = CONSTANTS.courseYearCrudUrl;
  private regulationCrudUrl = CONSTANTS.regulationCrudUrl;
  private examMasterUrl = CONSTANTS.examMasterUrl;
  private examStudentResultsUrl = CONSTANTS.examStudentResultsUrl;
  private isActive = CONSTANTS.isActive;
  private studentSearchUrl = CONSTANTS.studentSearchUrl;
  private academicYearCrudUrl = CONSTANTS.academicYearCrudUrl;
  private getDetailsByAcademicYearIdUrl = CONSTANTS.getDetailsByAcademicYearIdUrl;
  private sortOrder = CONSTANTS.sortOrder;

  staffForm: FormGroup;
  colleges: College[] = [];
  courses: Course[] = [];
  courseGroups: CourseGroup[] = [];
  regulations: Regulations[] = [];
  courseYears: CourseYear[] = [];
  step = 0;  
  examRegisteredStudents: any[] = [];
  defaultAcademicYearId;
  fromDate ;
  toDate;
  startDate;
  studentAttendance = [];
  public searchText: string;
  groupId;
  isGroupId;
  isGroup;
  isCourse;
  check = 1;
  isHOD;
  collegeId;
  dashboard;
  pageParams: any = {};
  searchStudents = [];
  searchExams = [];
  examsList = [];
  academicYears = [];
  collegeCode;
  courseCode;
  exam;
  courseGroupCode;
  courseYearCode;
  regulationCode;
  examYear;


  public gridData: any[];
  public toolbar: string[];
  // tslint:disable-next-line: ban-types
  public pageSettings: Object;
  @ViewChild('grid')
  public grid: GridComponent;
  // tslint:disable-next-line: ban-types
  public initialPage: Object;
  dataDetails = ' ';

  private _onDestroy = new Subject<void>();
  public studentFilterCtrl: FormControl = new FormControl();
  public filteredStudents: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);
  studentDetails=[];
  org_name: any;
  org_Address: any;
  params: any;

  constructor(private route: ActivatedRoute, private formBuilder: FormBuilder, private snotifyService: SnotifyService,
              private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router, 
              private dialog: MatDialog, private genericFunctions: GenericFunctions) {
     
      this.dashboard = CONSTANTS.dashboard;
      this.startDate = new Date();
  }

  // tslint:disable-next-line:typedef
  ngOnInit() {
    this.staffForm = this.formBuilder.group({
        studentId: ['',Validators.required]
      }); 

    this.toolbar = ['ExcelExport', 'PdfExport', 'Search'];
    this.pageSettings = { pageSize: 10 };
    this.initialPage = { pageSizes: true, pageCount: 10 };

      // this.pageParams.path = 'report-catalyst';
      // this.route.queryParams.subscribe(params => {
      //   if (!this.isEmptyObject(params)){
      //     this.pageParams.path = params.path;
      //   }
      // });
    this.studentFilterCtrl.valueChanges
      .pipe(takeUntil(this._onDestroy))
      .subscribe(() => {
        this.filterStd();
      });

    this.searchStudents.push({firstName: 'Search by student name or rollNo.'});  

    this.filteredStudents.next(this.searchStudents.slice());

    this.route.queryParams
    .subscribe(params => {
        if (!this.isEmptyObject(params)){
       this.params = params;
  }
});
}

  filterStd(): void {
    if (!this.searchStudents) {
      return;
    }
    // get the search keyword
    let search = this.studentFilterCtrl.value;
    if (!search) {
      this.filteredStudents.next(this.searchStudents.slice());
      return;
    } else {
      search = search.toLowerCase();
    }
    // filter the banks
    this.filteredStudents.next(
     this.searchStudents.filter(x => x.firstName.toLowerCase().indexOf(search) > -1)
    );
  }

  // tslint:disable-next-line:typedef
  isEmptyObject(obj) {
    return (obj && (Object.keys(obj).length === 0));
  }

  goBack(): void{
    this.router.navigate([this.pageParams.path]);
  }

  enteredStudent(event): void{
    if (event.target.value.length > 4){
        /*----------- STUDENTS -----------*/
        this.crudService.listByIds(this.studentSearchUrl, event.target.value, 'q')
            .subscribe(result => {
                if (result.statusCode === 200){
                        if (result.success) {  
                            this.searchStudents = result.data;
                            this.filteredStudents.next(this.searchStudents.slice()); 
                            console.log(this.searchStudents);    
                        }else{
                            this.snotifyService.info(result.message, 'Info!');
                        }
                    }else{
                        this.snotifyService.error(result.message, 'Error!');
                    } 
                }, error => {
                if (error.error.statusCode === 401){
                    this.snotifyService.error(error.error.message, 'Error!');
                    this.genericFunctions.logOut(this.router.url);
                }else{
                    this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
                }
            });
    }
 }

 selectedStd(studentId): void{
  this.examRegisteredStudents = [];
  if (this.searchStudents.filter(x => (x.studentId === studentId)).length > 0){
    this.collegeCode = this.searchStudents.filter(x => (x.studentId === studentId))[0].collegeCode;
    this.courseCode = this.searchStudents.filter(x => (x.studentId === studentId))[0].courseCode;
    this.courseGroupCode = this.searchStudents.filter(x => (x.studentId === studentId))[0].groupCode;
    this.collegeId = this.searchStudents.filter(x => (x.studentId === studentId))[0].collegeId;
  }
  console.log();
  
 }
//  setEmployee(event){
//   for(let i=0;i<this.employees.length;i++){
//      if(event.value == this.employees[i].employeeId){
//                this.addevaluatorform.get('collegeId').setValue(this.employees[i].collegeId);
//                this.addevaluatorform.get('email').setValue(this.employees[i].email);
//               this.addevaluatorform.get('evaluatorName').setValue(this.employees[i].firstName);
//              this.addevaluatorform.get('phoneNumber').setValue(this.employees[i].mobile);
//      }
//   }
//  }

  getDetails(): void{ 
    if (this.staffForm.valid){
        this.spinner.show();
        this.examRegisteredStudents = [];
        
        if (this.staffForm.value.studentId === ''){
          this.staffForm.get('studentId').setValue(0);
        }
        this.selectedData();
        /*----------- STUDENTS -----------*/
       // tslint:disable-next-line:max-line-length
        this.crudService.listByTwelveIds(this.examStudentResultsUrl, 'exam_std_result_detail', 0, 0, 
        this.collegeId,0, 0, this.staffForm.value.studentId, 
        0, '-1', 0, '-1', '-1',
       'in_flag', 'in_exam_id', 'in_course_id','in_college_id', 'in_course_group_id', 'in_course_year_id', 'in_std_id', 
       'in_regulation_id', 'in_ispass', 'in_subject_id', 'in_above_fail_subjects', 'in_below_credits')
         .subscribe(result => {
              this.spinner.hide();
              if (result.statusCode === 200){
                   if (result.success) {
                     
                    
                       if (result.data.result[0].length > 0){
                        this.studentDetails=result.data.result[0]
                            this.examRegisteredStudents = [];
                            for (let i = 0; i < result.data.result[0].length; i++){
                                 if (this.examRegisteredStudents.filter(x => (x.exam_name === result.data.result[0][i].exam_name && x.course_year_code === result.data.result[0][i].course_year_code)).length > 0){
                                    this.examRegisteredStudents.filter(x => (x.exam_name === result.data.result[0][i].exam_name && x.course_year_code === result.data.result[0][i].course_year_code))[0].subjects.push({
                                        subject_name: result.data.result[0][i].subject_name,
                                        subject_code: result.data.result[0][i].subject_code,
                                        internal_marks: result.data.result[0][i].internal_marks,
                                        external_marks: result.data.result[0][i].external_marks,
                                        grade: result.data.result[0][i].grade,
                                        grade_points: result.data.result[0][i].grade_points,
                                        result: result.data.result[0][i].result,
                                        credits: result.data.result[0][i].credits,

                                    })
                                 }else{
                                    this.examRegisteredStudents.push({
                                      exam_name: result.data.result[0][i].exam_name,
                                      examtype: result.data.result[0][i].examtype,
                                      course_year_code: result.data.result[0][i].course_year_code,
                                      regulation_code: result.data.result[0][i].regulation_code,
                                      subjects: [{
                                        subject_name: result.data.result[0][i].subject_name,
                                        subject_code: result.data.result[0][i].subject_code,
                                        internal_marks: result.data.result[0][i].internal_marks,
                                        external_marks: result.data.result[0][i].external_marks,
                                        grade: result.data.result[0][i].grade,
                                        grade_points: result.data.result[0][i].grade_points,
                                        result: result.data.result[0][i].result,
                                        credits: result.data.result[0][i].credits,
                                      }]
                                    })
                                 }
                            }

                            console.log(this.examRegisteredStudents,'hlo');

                          //   this.gridData = this.examRegisteredStudents;
                          //   for ( let idx = 0; idx < this.gridData.length; idx++) {
                          //     this.gridData[idx].id = idx + 1;
                          //     if (this.gridData[idx].internal_marks === null){
                          //       this.gridData[idx].internal_marks = ' - ';
                          //     }
                          //     if (this.gridData[idx].external_marks === null){
                          //       this.gridData[idx].external_marks = ' - ';
                          //     }
                          //     if (this.gridData[idx].grade === null){
                          //       this.gridData[idx].grade = ' - ';
                          //     }
                          //     if (this.gridData[idx].grade_points === null){
                          //       this.gridData[idx].grade_points = ' - ';
                          //     }
                          //     // tslint:disable-next-line: max-line-length
                          //     this.gridData[idx].college_code = this.gridData[idx].college_code + ' / ' + this.gridData[idx].course_code + ' / ' + this.gridData[idx].regulation_code + ' / ' + this.gridData[idx].group_code + ' / ' + this.gridData[idx].course_year_code ;
                          // }
                       }else{
                         this.snotifyService.success('No Records Found.', 'Success!');
                       }
                       
                   } else {
                       this.snotifyService.success(result.message, 'Success!');
                   }
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
  }

  selectedData(){
    if (this.collegeCode){
      this.dataDetails = this.collegeCode;
    }
    if (this.courseCode){
      this.dataDetails =  this.dataDetails + ' / ' + this.courseCode;
    }
    if (this.courseGroupCode){
      this.dataDetails = this.dataDetails + ' / ' + this.courseGroupCode;
    }
   
  }
  print(): void {
    console.log(this.studentDetails);
    
    // tslint:disable-next-line: one-variable-per-declaration
    let printContents, popupWin;
    printContents = '<div class="mat-elevation-z8">\n' +
    '<div class="left">'+
'<img src="assets/images/logos/logo-c.jpeg" style="height:100px;width:100px;">'+
'</div>'+

'<div class="main">'+
'<p class="clg-header">'+this.studentDetails[0].org_name+'</p>'+
' <p class="align-cntr" style=" font-family: Times New Roman !important;font-size: 30px">'+this.studentDetails[0].org_Address+'</p>'+
'<p class="align-cntr">CONSOLIDATED MARKS MEMO / CREDIT SHEET</p>'+
'<p class="align-cntr" style="text-transform:uppercase;">'+this.studentDetails[0].course_name+' -&nbsp; '+this.studentDetails[0].group_name+'</p>'+
'</div>'+

'<div class="right">'+
'<img src="assets/images/avatars/profile.jpg" style="height:100px;width:100px;">'+
'</div>\n'+
'<div class="table2">'+
'<table style="display:flex;">'+
'<colgroup>'+
  '<col width="25%">'+
  '<col width="40%">'+
  '<col width="25%">'+
  '<col width="10%">'+
'</colgroup>'+
'<thead >'+
  '<tr style="height: 34px;">'+
  '</tr>'+
'</thead>'+
'<tbody >'+
  '<tr style="height: 5px;">'+
    '<td class="u-border-1 ">Name :</td>'+
    '<td class="u-border-1 ">'+this.studentDetails[0].student_name+'</td>'+
   ' <td class="u-border-1 ">Month &amp; Year of Examination :</td>'+
    '<td class="u-border-1 ">'+this.studentDetails[0].exam_month_yr+'</td>'+
 ' </tr>'+
  '<tr style="height: 5px;">'+
    '<td class="u-border-1 ">Hall Ticket Number :</td>'+ 
    '<td class="u-border-1 ">'+this.studentDetails[0].roll_number+'</td>'+
    '<td class="u-border-1  " style="margin-left:2px !important">Class Awarded :</td>'+
    '<td class="u-border-1 ">'+this.studentDetails[0].classawarded+'</td>'+
  '</tr>'+
  '<tr style="height: 5px;">'+
    '<td class="u-border-1 ">Year Of Admission :&nbsp;</td>'+
    '<td class="u-border-1 ">'+this.studentDetails[0].yearOfAdmission+'</td>'+
    '<td class="u-border-1 "></td>'+
    '<td class="u-border-1 "></td>'+
  '</tr>'+
'</tbody>'+
'</table>'+
'</div>'+
      '<div style= "margin-top: 25px !important;" >\n';
 
//     popupWin.document.write(`
//          ${this.examRegisteredStudents[index].exam_name} ' / ' ${this.examRegisteredStudents[index].examtype} '/' ${this.examRegisteredStudents[index].course_year_code} ' /' ${this.examRegisteredStudents[index].regulation_code}
//     `);
    
            popupWin = window.open('?', '_blank', '');
            popupWin.document.open();
            popupWin.document.write(`
              <html>
                <head>
                <link href="assets/css/print.scss" rel="stylesheet">
                <link href="assets/css/consolidateReportPrint.scss" rel="stylesheet">
                 <!-- <title>Print tab</title>-->
                </head>
            <body onload="window.print();window.close()">${printContents}`);

            for (let index = 0; index < this.examRegisteredStudents.length; index++) {
                popupWin.document.write(`
                <strong>${this.examRegisteredStudents[index].exam_name} / ${this.examRegisteredStudents[index].examtype} / ${this.examRegisteredStudents[index].course_year_code} / ${this.examRegisteredStudents[index].regulation_code}</strong>
                <table class="mar">
                <thead>
                    <tr>
                        <th class="table-th" >S.No</th>
                        <th class="table-th" >Subject </th>
                        <th class="table-th" >Internal Marks</th>
                        <th class="table-th" >External Marks</th>
                      
                        <th class="table-th" >Result</th>
                        <th class="table-th" >Credits</th>
            
                    </tr>
                    </thead>
                    <tbody>
              `);
    for (let i = 0; i < this.examRegisteredStudents[index].subjects.length; i++) {
      if(this.examRegisteredStudents[index].subjects[i].grade == null && this.examRegisteredStudents[index].subjects[i].grade == undefined){
        this.examRegisteredStudents[index].subjects[i].grade = ' '
      }
      if(this.examRegisteredStudents[index].subjects[i].grade_points == null && this.examRegisteredStudents[index].subjects[i].grade_points == undefined){
        this.examRegisteredStudents[index].subjects[i].grade_points = ' '
      }
      if(this.examRegisteredStudents[index].subjects[i].credits == null && this.examRegisteredStudents[index].subjects[i].credits == undefined){
        this.examRegisteredStudents[index].subjects[i].credits = ' '
      }
        popupWin.document.write(`<tr >
              <td class="table-td" style="text-align: center !important;">
               ${this.examRegisteredStudents[index].subjects.indexOf(this.examRegisteredStudents[index].subjects[i]) + 1}</td>
              <td class="table-td">${this.examRegisteredStudents[index].subjects[i].subject_name} ( ${this.examRegisteredStudents[index].subjects[i].subject_code} )</td>
              <td class="table-td" style="text-align: center;">${this.examRegisteredStudents[index].subjects[i].internal_marks}</td>
               <td class="table-td" style="text-align: center;">${this.examRegisteredStudents[index].subjects[i].external_marks}</td>
                                          
                                            <td class="table-td" style="text-align: center;">${this.examRegisteredStudents[index].subjects[i].result}</td>
                                            <td class="table-td" style="text-align: center;">${this.examRegisteredStudents[index].subjects[i].credits}</td>
                                        </tr>
              `);
  
              // <th class="table-th" >Grade</th>
              // <th class="table-th" >	Grade Points</th>
              // <th class="table-th" >Credits</th>
              // <td class="table-td" style="text-align: center;">${this.examRegisteredStudents[index].subjects[i].grade}</td>
              // <td class="table-td" style="text-align: center;">${this.examRegisteredStudents[index].subjects[i].grade_points}</td>
             // <td class="table-td" style="text-align: center;">${this.examRegisteredStudents[index].subjects[i].credits}</td>


      }
      popupWin.document.write(`
      </tbody>
      </table>`)
    };
    popupWin.document.write(`
      </div>
      </div>
      </body>
       </html>`);
  
    popupWin.document.close();
  }

  printmemo(){   
    this.router.navigate(['admin-examination-management/admin-exam-reports/consolidated-marks-report/print-consolidated-memo'],
    {queryParams:{
    data: JSON.stringify(this.studentDetails),
    examdata : JSON.stringify(this.examRegisteredStudents)
    }})
}
}