import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormControl, FormBuilder, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Router, ActivatedRoute } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { ExamMaster } from 'app/main/models/examMaster';
import { CrudService } from 'app/main/services/crud.service';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';
import { ReplaySubject, Subject } from 'rxjs';
import * as _ from 'lodash';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-re-evaluation-assign',
  templateUrl: './re-evaluation-assign.component.html',
  styleUrls: ['./re-evaluation-assign.component.scss']
})
export class ReEvaluationAssignComponent implements OnInit {
 
  displayedColumns: string[] = ['id', 'evaluatorName', 'email', 'examEvaluatorsId','NumberOfAssignEvaluators','NumberOfDueEvaluators'];
  dataSource: MatTableDataSource<any>;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  @ViewChild('uploadXl') uploadXl: ElementRef;
  examTimetableList: any[] = []
  private isActive = CONSTANTS.isActive;
  examEvaluationList1=[]
  selectedSubjects=[]
 evaluatorsubjectform:FormGroup;
 step = 0; 
 flag:boolean
 private getExamEvaluationSubjectCodes = CONSTANTS.getExamEvaluationCodesUrl;
 private evaluatorassignmentUrl=CONSTANTS.evaluatorassignmentUrl;
 private getevaluatorassignmentUrl=CONSTANTS.getevaluatorassignmentUrl
 private EvaluatorRole=CONSTANTS.EvaluatorRole
 examSubjects: any;
 monthYear=[];
 courseCode: any;
 courseyearcode: any;
 evaluatorForm: FormGroup;
 subjectcode: any;
 getevaluatorList: any;
 ListExamSubjects: any;
 monthYear1=[];
 collegeCode=[];
 evaluatorName=[];
 configuredData=[];
 NotconfiguredData=[];
 timetable_det_ids: any;
 assignEvaluator=[];
 courseyearcode1=[];
 subjectcode1=[];
examDate = this.genericFunctions.momentWithDateFormatYMD(this.genericFunctions.moment()) ;

  public employeeFilterCtrl: FormControl = new FormControl();
  public examFilterCtrl: FormControl = new FormControl();
  public filteredExam: ReplaySubject<any[]> = new ReplaySubject<any[]>(1); 
  public filteredEmployees: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);
  private _onDestroy = new Subject<void>();
  searchExams=[];
 examEvaluationList: any[];
  Barcode: any;
  data: any;
  duplicateCourseGroups: any=[];
  examDetails: ExamMaster;
  examAnswerPapaerList: any=[];
  PaperCount: any;
  check = false;
  examStudentList: any=[];
  examStudentList1: any=[];
  Formdata: FormGroup;
  examStudentListdata: any[];
  selectedCount: number;
  StudentEvaluationAssignment=[];
  UnAssinged: any;
  totalStudents: any;
  omrSerail: any=[];
  assignzero: number;
  UnAssingedList: any=[];
  assigndata: any=[];
  checksubject: boolean;
  searchNameData: any=[];
  examStudentList2= [];
  NoOfAnswerpapersUploaded: any;
  monthYearDuplicateList=[];
 
  constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,
              private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router, 
              private dialog: MatDialog, private genericFunctions: GenericFunctions, private route: ActivatedRoute,) {        
  }
        ngOnInit(): void {
          this.Formdata= this.formBuilder.group({
            examEvaluatorProfileId:[''],
            
          })

    this.evaluatorForm = this.formBuilder.group({
        CourseCode:['',Validators.required],
        ExamMonthYear:['',Validators.required],
        CourseYear:['',Validators.required],
        subjectCode:['',Validators.required],
      })
  this.evaluatorsubjectform = this.formBuilder.group({
    in_orgid:1,
    in_fdate:['1990-01-01'],
    in_tdate:['1990-01-01'],
    in_exam_month_yr:[''],
    in_course_code:[''],
    in_course_year_code:[''],
    in_subject_code:[''],
    in_evalutor_profileid:0,
    in_exam_date:'1990-01-01',
    in_regulation_code:''
  })
  this.getList();
  this.dataSource = new MatTableDataSource<any>(this.examEvaluationList);
  this.dataSource.paginator = this.paginator;
  this.dataSource.sort = this.sort;
  }

applyFilter(filterValue){
  this.dataSource.filter = filterValue.trim().toLowerCase();

  if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
  }
}
selectedName(selectedName){
// console.log(selectedName);

}
selectedsubject(){
  this.flag = false;
  this.Formdata.get('examEvaluatorProfileId').setValue('')

}
getEvaluationList(){
  this.spinner.show();
  this.examStudentListdata=[]
  this.getstudentList();
  this.examEvaluationList=[]
  this.UnAssingedList=[]
  this.searchNameData=[]
  this.StudentEvaluationAssignment=[]
  this.flag = true;
  this.selectedCount=0
  this.Formdata.get('examEvaluatorProfileId').setValue('')

    if ( this.evaluatorsubjectform.valid){
      // this.flag = false;
      let empId = +localStorage.getItem('employeeId');
        /* -------- EXAM SESSIONS -------*/
      this.crudService.listByEighteenIds(this.getExamEvaluationSubjectCodes, 
           'list_evaluatorassignment_list_reevaluation',
           this.evaluatorsubjectform.value.in_orgid, 
         this.evaluatorsubjectform.value.in_fdate, 
         this.evaluatorsubjectform.value.in_tdate, 
         this.evaluatorForm.value.ExamMonthYear, 
         this.evaluatorForm.value.CourseCode,
         this.evaluatorForm.value.CourseYear, 
         this.evaluatorForm.value.subjectCode,
         this.evaluatorsubjectform.value.in_evalutor_profileid,
         this.evaluatorsubjectform.value.in_exam_date,
         this.evaluatorsubjectform.value.in_regulation_code,
      0,0,this.EvaluatorRole,'','',1,empId,
      
         'in_flag', 'in_orgid' ,'in_fdate', 'in_tdate', 'in_exam_month_yr', 'in_course_code', 'in_course_year_code','in_subject_code', 'in_evalutor_profileid','in_exam_date','in_regulation_code','in_emp_id','in_questionpaper_id',
         'in_evaluator_role_id','in_academic_year','in_exam_short_name','in_affiliatedto_catdet_id','in_loginuser_empid'
          )
       .subscribe(result => {
           this.spinner.hide();
           if (result.statusCode === 200){
                this.flag = true;

                if (result.data && result.data !== '' && result.data.result.length > 0) {
                    this.examEvaluationList =  result.data.result[0];
                    for(let i=0;i<this.examEvaluationList.length;i++){
                      // this.assignzero=this.examEvaluationList[i].no_of_students_assigned-this.examEvaluationList[i].no_of_evaluations_completed
                      //     if(this.assignzero==0){
                            this.UnAssingedList.push(this.examEvaluationList[i])
                            this.searchNameData.push(this.examEvaluationList[i])

                       //   }
                    }
                    this.StudentEvaluationAssignment =  result.data.result[1];
                    this.UnAssinged =  this.StudentEvaluationAssignment[0]?.UnAssinged;
                   this.totalStudents =  this.StudentEvaluationAssignment[0]?.totalStudents;
                   this.NoOfAnswerpapersUploaded =  this.StudentEvaluationAssignment[0]?.NoOfAnswerpapersUploaded;
                   this.dataSource = new MatTableDataSource(this.examEvaluationList);
                   this.dataSource.paginator = this.paginator;
                   this.dataSource.sort = this.sort;
                    
  
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
  Assign(){
    this.spinner.show();
    this.assigndata=[]
    this.assignEvaluator=[]
    for(let j=0;j<this.UnAssingedList.length;j++){
          if(this.UnAssingedList[j].pk_exam_evaluator_profile_id==this.Formdata.value.examEvaluatorProfileId){
          this.assigndata.push(this.UnAssingedList[j])
          }
    }
    for(let i=0;i<this.examStudentListdata.length;i++){
    this.assignEvaluator.push(this.examStudentListdata[i].fk_exam_evaluationassignment_id)
    }

    this.crudService.listByNineIds(this.evaluatorassignmentUrl, 
      'UpdateEvaluationAssignment',
      this.Formdata.value.examEvaluatorProfileId,
    this.evaluatorForm.value.subjectCode,
    this.evaluatorForm.value.ExamMonthYear, 
    this.evaluatorForm.value.CourseCode,
    '',
    this.evaluatorForm.value.CourseYear, 
    this.assignEvaluator.join(','),
    this.assigndata[0].pk_exam_timetable_det_ids,
    'in_flag', 'in_profileids' ,'in_subject_code', 'in_exam_month_yr','in_coursecode', 'in_coursegroup', 'in_courseyear', 'in_exam_evaluationassignment_ids','in_timetable_det_ids'
     )
  .subscribe(result => {
      this.spinner.hide();
      if (result.statusCode === 200){
        this.flag = false;
           if (result.data && result.data !== '' && result.data.result.length > 0) {
            this.snotifyService.success(result.message, 'Success!'); 
            this.getEvaluationList();
              
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
  
  getstudentList(){
   this.examStudentList1=[]
   this.examStudentList2=[]
    this.flag = true;
    this.examStudentList=[]
    if ( this.evaluatorsubjectform.valid){
      let empId = +localStorage.getItem('employeeId');
      // this.flag = false;
        /* -------- EXAM SESSIONS -------*/
      this.crudService.listByEighteenIds(this.getExamEvaluationSubjectCodes, 
           'list_evaluationstudent_list_revision',
           this.evaluatorsubjectform.value.in_orgid, 
         this.evaluatorsubjectform.value.in_fdate, 
         this.evaluatorsubjectform.value.in_tdate, 
         this.evaluatorForm.value.ExamMonthYear, 
         this.evaluatorForm.value.CourseCode,
         this.evaluatorForm.value.CourseYear, 
         this.evaluatorForm.value.subjectCode,
         this.evaluatorsubjectform.value.in_evalutor_profileid,
         this.evaluatorsubjectform.value.in_exam_date,
         this.evaluatorsubjectform.value.in_regulation_code,
      0,0,0,'','',1,empId,
        //  this.evaluatorsubjectform.value.in_exam_date,
        //  this.evaluatorsubjectform.value.in_regulation_code,
         'in_flag', 'in_orgid' ,'in_fdate', 'in_tdate', 'in_exam_month_yr', 'in_course_code', 'in_course_year_code','in_subject_code', 'in_evalutor_profileid','in_exam_date','in_regulation_code','in_emp_id','in_questionpaper_id',
         'in_evaluator_role_id','in_academic_year','in_exam_short_name','in_affiliatedto_catdet_id','in_loginuser_empid'
          )
       .subscribe(result => {
           this.spinner.hide();
           if (result.statusCode === 200){
                if (result.data && result.data !== '' && result.data.result.length > 0) {
                  this.examStudentList = result.data.result[0];
                  // this.examStudentList1=this.examStudentList
                  // this.examStudentList2=this.examStudentList1
                  
                  // for(let i=0; i<this.examStudentList.length; i++){
                  //   if(this.examStudentList[i].length>0 && this.examStudentList[i][0].flag === 'list_evaluationstudent_list_revision'){
                  //     this.examStudentList1.push(this.examStudentList[i]);

                  //     }
                  //   }
                  //   this.examStudentList2=this.examStudentList1
                    
                  for(let i=0;i<this.examStudentList.length;i++){
                        if(this.examStudentList[i].is_mapped==0 && this.examStudentList[i].is_answerpaper_uploaded==1){
                          this.examStudentList1.push(this.examStudentList[i])
                          this.examStudentList2= this.examStudentList1
                        } 
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

  searchdata(value) { 
    this.selectedSubjects=[]
   this.search(value);
    }
  search(value: string) { 
    let filter = value.toLowerCase();
    for ( let i = 0 ; i < this.subjectcode.length; i++ ) {
        let option = this.subjectcode[i];
        if (option.subject_name.toLowerCase().indexOf(filter) >= 0) {
            this.selectedSubjects.push( option );
        }
        else if (option.subject_code.toLowerCase().indexOf(filter) >= 0) {
          this.selectedSubjects.push( option );
      }
    }
  }

  searchName(value) { 
    this.searchNameData=[]
   this.searchNames(value);
    }
    searchNames(value: string){
    let filter = value.toLowerCase();
    for ( let i = 0 ; i < this.UnAssingedList.length; i++ ) {
        let option = this.UnAssingedList[i];
        if (option.evaluator_name.toLowerCase().indexOf(filter) >= 0) {
            this.searchNameData.push( option );
        }
    }
  }
  searchOmrNo(value) { 
    this.examStudentList2=[]
    this.searchOmrNos(value);
     }
   searchOmrNos(value: string) { 
     let filter = value.toLowerCase();
     for ( let i = 0 ; i < this.examStudentList1.length; i++ ) {
         let option = this.examStudentList1[i];
         if (option.omr_serial_no.toLowerCase().indexOf(filter) >= 0) {
             this. examStudentList2.push( option );
         }
      
     }
  }
  searchMonthYear(value) {
    this.monthYearDuplicateList = []
    this.searchMonthYears(value);
  }
  searchMonthYears(value: string) {
    let filter = value.toLowerCase();
    for (let i = 0; i < this.monthYear.length; i++) {
      let option = this.monthYear[i];
      if (option.exam_month_yr.toLowerCase().indexOf(filter) >= 0) {
        this.monthYearDuplicateList.push(option);
      }
    }
  }
  getList(): void{
    if ( this.evaluatorsubjectform.valid){
      this.flag = false;
      let empId = +localStorage.getItem('employeeId');
        /* -------- EXAM SESSIONS -------*/
      this.crudService.listByEighteenIds(this.getExamEvaluationSubjectCodes, 
           'list_exam_subjects' ,
           this.evaluatorsubjectform.value.in_orgid, 
         this.evaluatorsubjectform.value.in_fdate, 
         this.evaluatorsubjectform.value.in_tdate, 
         this.evaluatorsubjectform.value.in_exam_month_yr, 
         this.evaluatorsubjectform.value.in_course_code,
         this.evaluatorsubjectform.value.in_course_year_code, 
         this.evaluatorsubjectform.value.in_subject_code,
         this.evaluatorsubjectform.value.in_evalutor_profileid,
         this.evaluatorsubjectform.value.in_exam_date,
         this.evaluatorsubjectform.value.in_regulation_code,
         0,0,0,'','',1,empId,
         'in_flag', 'in_orgid' ,'in_fdate', 'in_tdate', 'in_exam_month_yr', 'in_course_code', 'in_course_year_code','in_subject_code', 'in_evalutor_profileid','in_exam_date','in_regulation_code','in_emp_id','in_questionpaper_id','in_evaluator_role_id','in_academic_year',
         'in_exam_short_name','in_affiliatedto_catdet_id','in_loginuser_empid'
          )
       .subscribe(result => {
           this.spinner.hide();
           if (result.statusCode === 200){
                if (result.data && result.data !== '' && result.data.result.length > 0) {
                    this.examSubjects =  result.data.result[0];
                    // this.monthYear=this.examSubjects
                       const courseCodeData = this.examSubjects.map(({ course_code }) => course_code);
                       this.courseCode = this.examSubjects.filter(({ course_code }, index) =>
                          !courseCodeData.includes(course_code, index + 1)); 
                          this.evaluatorForm.get('CourseCode').setValue(this.courseCode[0].course_code)
                          this.selectedCourse(this.evaluatorForm.value.CourseCode);

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
selectedCourse(courseCodeId){
  this.flag = false;
    this.monthYear=[];
    this.monthYear1=[]
    this.monthYearDuplicateList=[]
    this.evaluatorForm.get('ExamMonthYear').setValue('')
    this.evaluatorForm.get('CourseYear').setValue('')
    this.evaluatorForm.get('subjectCode').setValue('')
    for(let i=0;i<this.examSubjects.length;i++){
              if(this.examSubjects[i].course_code==courseCodeId){
                    this.monthYear1.push(this.examSubjects[i])
                    const exam_month_yrData = this.monthYear1.map(({ exam_month_yr }) => exam_month_yr);
                    this.monthYear = this.monthYear1.filter(({ exam_month_yr }, index) =>
                    !exam_month_yrData.includes(exam_month_yr, index + 1));
                    this.monthYear = this.monthYear.sort((a, b) => new Date(b.exam_month_yr).getTime() - new Date(a.exam_month_yr).getTime());
                    this.monthYearDuplicateList=this.monthYear.sort((a, b) => new Date(b.exam_month_yr).getTime() - new Date(a.exam_month_yr).getTime());
              }
    }
    this.evaluatorForm.get('ExamMonthYear').setValue(this.monthYear[0].exam_month_yr)
    this.selectedMonthyr(this.evaluatorForm.value.ExamMonthYear)
  }
  selectedMonthyr(exam_month_yr){
    this.flag = false;
    this.courseyearcode1=[]
    this.courseyearcode=[]
    this.evaluatorForm.get('CourseYear').setValue('')
    this.evaluatorForm.get('subjectCode').setValue('')
    for(let i=0;i<this.examSubjects.length;i++){
      if(this.examSubjects[i].exam_month_yr==exam_month_yr && this.examSubjects[i].course_code==this.evaluatorForm.value.CourseCode){
            this.courseyearcode1.push(this.examSubjects[i])
            const courseyearcode = this.courseyearcode1.map(({ course_year_code }) => course_year_code);
            this.courseyearcode = this.courseyearcode1.filter(({ course_year_code }, index) =>
               !courseyearcode.includes(course_year_code, index + 1));
      }
  }
  this.evaluatorForm.get('CourseYear').setValue(this.courseyearcode[0].course_year_code)
  this.selectedCourseYr(this.evaluatorForm.value.CourseYear);
  }
  selectedCourseYr(courseYr){
    this.flag = false;
    this.subjectcode1=[]
    this.subjectcode=[]
    this.evaluatorForm.get('subjectCode').setValue('')
    for(let i=0;i<this.examSubjects.length;i++){
      if(this.examSubjects[i].course_year_code==courseYr && this.examSubjects[i].course_code==this.evaluatorForm.value.CourseCode && this.examSubjects[i].exam_month_yr==this.evaluatorForm.value.ExamMonthYear){
            this.subjectcode1.push(this.examSubjects[i])
            const subjectcode = this.subjectcode1.map(({ subject_code }) => subject_code);
            this.subjectcode = this.subjectcode1.filter(({ subject_code }, index) =>
               !subjectcode.includes(subject_code, index + 1));
                this.selectedSubjects = this.subjectcode; 
      }
    }
    this.evaluatorForm.get('subjectCode').setValue(this.subjectcode[0].subject_code)
  }
  checkedserialNo(check,item){
    item.isSelected = check;
  this.selectedCount = 0;
  this.examStudentListdata = [];
  for (let i = 0; i < this.examStudentList1.length; i++){
      if (this.examStudentList1[i].isSelected){
         this.examStudentListdata.push(this.examStudentList1[i]);
         this.selectedCount++;
      }
      else{

      }
  }
  }
  markItems(): void{
  this.selectedCount = 0;
  this.examStudentListdata = [];
    for(let i=0;i<this.examStudentList1.length;i++){
      if (this.checksubject){
        this.examStudentList1[i].checked = true;
        this.examStudentList1[i].isSelected = true;
        this.examStudentListdata.push(this.examStudentList1[i]);
        this.selectedCount++;
      
      }else{
        this.examStudentList1[i].checked = false;
        this.examStudentList1[i].isSelected = false;
        this.checksubject=false
        this.examStudentListdata=[]
        // this.examStudentList1=[]
      }
   }
  
  }
  clickEvent(row){
    // this.Barcode = row;
    // const dialogRef = this.dialog.open(ViewBarcodeModalComponent, {
    // width: '750px',
    // data: this.Barcode
    // });
  
    // dialogRef.afterClosed().subscribe(details => {
    // });
  }
  // runDialog() {
  //   const dialogRef = this.dialog.open(RunConfirmModalComponent, {
  //     width: '750px',
  //     data: {}
  //   });
  
  //   dialogRef.afterClosed().subscribe(details => {
  //     if (details != null && details !== '') {
  //       this.rundata();
  //     }
  //   });
  // }
  rundata(){
    this.spinner.show();
  
     this.crudService.listByEightIds(this.getevaluatorassignmentUrl, 
      're_evaluation_assignment_pop',
      '',
      '',
      '',
      '', 
     0,
     this.evaluatorForm.value.subjectCode,  
     this.evaluatorForm.value.CourseYear,
      
      'in_flag', 'in_profileids' ,'in_exam_evaluationassignment_ids', 'in_omr_serial_nos', 'in_timetable_det_ids','in_exam_id','in_subject_id','in_course_year_id'
     )
  .subscribe(result => {
    this.spinner.hide();
      if (result.statusCode === 200){
        if(result.success==true){
          //  if (result.data && result.data !== '' && result.data.result.length > 0) {
            this.snotifyService.success(result.message, 'Success!');  
  
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
             
          

