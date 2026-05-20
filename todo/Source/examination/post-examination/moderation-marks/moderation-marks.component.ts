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
import * as _ from 'lodash';
import { ViewModerationModalComponent } from './view-moderation-modal/view-moderation-modal.component';

@Component({
  selector: 'app-moderation-marks',
  templateUrl: './moderation-marks.component.html',
  styleUrls: ['./moderation-marks.component.scss']
})
export class ModerationMarksComponent implements OnInit {

  displayedColumns: string[] = ['id', 'subject_name', 'PassPercentage', 'ModerationPassPercentage','Actions'];
  dataSource: MatTableDataSource<any>;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild('uploadXl') uploadXl: ElementRef;
  examTimetableList: any[] = []
  private evaluatorModerationMarksUrl=CONSTANTS.evaluatorModerationMarksUrl;
  private getevaluatorassignmentUrl=CONSTANTS.getevaluatorassignmentUrl
  private isActive = CONSTANTS.isActive;
  examModerationList1=[]
  selectedSubjects=[]
  evaluatorsubjectform:FormGroup;
  step = 0; 
  flag:boolean
 private getExamEvaluationSubjectCodes = CONSTANTS.getExamEvaluationCodesUrl;
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
  searchExams=[];
  examModerationList: any[];
  Barcode: any;
  data: any;
  duplicateCourseGroups: any=[];
  examDetails: ExamMaster;
  examAnswerPapaerList: any=[];
  PaperCount: any;
  check = false;
  evaluationListData=[];
  profileIds:any;
  StudentEvaluationAssignment=[];
  UnAssinged=0;
  totalStudents=0;
  divisionCount=0;
  profileIds1= [];
  checksubject= false;
  profile:'';
  EvaluationStudents=0;
  runButton: boolean=false;
  examModerationListLength=0;
  academicYear=[];
  subjectModerationList =[];
  subjectName: any;
  selectedData: any;
  subjectname='';
  academicYear1: any[];
 
  constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,
              private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router, 
              private dialog: MatDialog, private genericFunctions: GenericFunctions, private route: ActivatedRoute,) {        
  }
  

       ngOnInit(): void {
    this.evaluatorForm = this.formBuilder.group({
        CourseCode:['',Validators.required],
        academicYear:['',Validators.required],
        ExamMonthYear:['',Validators.required],
        CourseYear:['',Validators.required],
        subjectCode:['',],
        moderationMarks:['',Validators.required]
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
  this.dataSource = new MatTableDataSource<any>(this.examModerationList);
  this.dataSource.paginator = this.paginator;
  this.dataSource.sort = this.sort;
  }
applyFilter(filterValue){
  this.dataSource.filter = filterValue.trim().toLowerCase();

  if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
  }
}
getModerationList(){
  this.spinner.show();
  this.selectedData=
           this.evaluatorForm.value.CourseCode +' / '+
           this.evaluatorForm.value.academicYear+' / '+
           this.evaluatorForm.value.CourseYear+' / '+
           this.subjectname

    if ( this.evaluatorForm.valid){
      this.crudService.listByThirteenIds(this.evaluatorModerationMarksUrl, 
           'list_custom_moderation_marks_summary',
           this.evaluatorsubjectform.value.in_orgid,
           this.evaluatorForm.value.academicYear,
         this.evaluatorForm.value.ExamMonthYear, 
         this.evaluatorForm.value.CourseCode,
         this.evaluatorForm.value.CourseYear, 
         this.evaluatorForm.value.subjectCode?this.evaluatorForm.value.subjectCode:'',
         this.evaluatorsubjectform.value.in_evalutor_profileid,
         this.evaluatorsubjectform.value.in_exam_date,
         this.evaluatorsubjectform.value.in_regulation_code,
      0,this.evaluatorForm.value.moderationMarks,0,
         'in_flag', 'in_orgid','in_academic_year', 'in_exam_month_yr', 'in_course_code', 'in_course_year_code','in_subject_code', 'in_evalutor_profileid','in_exam_date','in_regulation_code','in_emp_id','in_moderation_marks','in_questionpaper_id'
          )
       .subscribe(result => {
        this.flag = true;
           this.spinner.hide();
           if (result.statusCode === 200){
                if (result.data && result.data !== '' && result.data.result.length > 0) {
                    this.examModerationList =  result.data.result[0];
                   this.dataSource = new MatTableDataSource(this.examModerationList);
                   this.dataSource.paginator = this.paginator;
                   this.dataSource.sort = this.sort;
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
  getList(): void{
    this.spinner.show();
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
         'in_flag', 'in_orgid' ,'in_fdate', 'in_tdate', 'in_exam_month_yr', 'in_course_code', 'in_course_year_code','in_subject_code', 'in_evalutor_profileid','in_exam_date','in_regulation_code','in_emp_id','in_questionpaper_id',
         'in_evaluator_role_id','in_academic_year','in_exam_short_name','in_affiliatedto_catdet_id','in_loginuser_empid'
          )
       .subscribe(result => {
           this.spinner.hide();
           if (result.statusCode === 200){
                if (result.data && result.data !== '' && result.data.result.length > 0) {
                    this.examSubjects =  result.data.result[0];
                    // this.monthYear=this.examSubjects
                    this.snotifyService.success(result.message, 'Success!');  
                      
                          const courseCodeData = this.examSubjects.map(({ course_code }) => course_code);
                          this.courseCode = this.examSubjects.filter(({ course_code }, index) =>
                             !courseCodeData.includes(course_code, index + 1));

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
  this.academicYear1=[]
  this.academicYear=[]
  this.evaluatorForm.get('academicYear').setValue('')
  this.evaluatorForm.get('ExamMonthYear').setValue('')
  this.evaluatorForm.get('CourseYear').setValue('')
    this.evaluatorForm.get('moderationMarks').setValue('')
    this.evaluatorForm.get('subjectCode').setValue('')
     for(let i=0;i<this.examSubjects.length;i++){
      if(this.examSubjects[i].course_code==courseCodeId){
            this.academicYear1.push(this.examSubjects[i])
            const academicYearData = this.academicYear1.map(({ academic_year }) => academic_year);
            this.academicYear = this.academicYear1.filter(({ academic_year }, index) =>
            !academicYearData.includes(academic_year, index + 1));
      }
}
   
  }
  selectedacademicYear(academicYear){
       this.monthYear=[];
       this.monthYear1=[]
       this.evaluatorForm.get('ExamMonthYear').setValue('')
       this.evaluatorForm.get('CourseYear').setValue('')
    this.evaluatorForm.get('moderationMarks').setValue('')
    this.evaluatorForm.get('subjectCode').setValue('')
       for(let i=0;i<this.examSubjects.length;i++){
                 if(this.examSubjects[i].course_code==this.evaluatorForm.value.CourseCode){
                       this.monthYear1.push(this.examSubjects[i])
                       const exam_month_yrData = this.monthYear1.map(({ exam_month_yr }) => exam_month_yr);
                       this.monthYear = this.monthYear1.filter(({ exam_month_yr }, index) =>
                       !exam_month_yrData.includes(exam_month_yr, index + 1));
                       this.monthYear = this.monthYear.sort((a, b) => a.exam_month_yr - b.exam_month_yr);
                 }
       }
  }
  selectedMonthyr(exam_month_yr){
    this.courseyearcode1=[]
    this.courseyearcode=[]
    this.evaluatorForm.get('CourseYear').setValue('')
    this.evaluatorForm.get('moderationMarks').setValue('')
    this.evaluatorForm.get('subjectCode').setValue('')

    for(let i=0;i<this.examSubjects.length;i++){
      if(this.examSubjects[i].exam_month_yr==exam_month_yr && this.examSubjects[i].course_code==this.evaluatorForm.value.CourseCode){
            this.courseyearcode1.push(this.examSubjects[i])
            const courseyearcode = this.courseyearcode1.map(({ course_year_code }) => course_year_code);
            this.courseyearcode = this.courseyearcode1.filter(({ course_year_code }, index) =>
               !courseyearcode.includes(course_year_code, index + 1));
            
      }
  }
  
  
  }
  selectedCourseYr(courseYr){
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
  }
  selectedsubject(event){
    this.subjectname=event.source
    .triggerValue;
    this.flag=false
    this.runButton=false
  }
  
  Getdetails(row){
    this.subjectName=row?.subject_name.split(':');
    this.crudService.listByThirteenIds(this.evaluatorModerationMarksUrl, 
         'list_custom_moderation_marks_detail',
         this.evaluatorsubjectform.value.in_orgid,
         this.evaluatorForm.value.academicYear,
       this.evaluatorForm.value.ExamMonthYear, 
       this.evaluatorForm.value.CourseCode,
       this.evaluatorForm.value.CourseYear, 
       this.subjectName[0],
       this.evaluatorsubjectform.value.in_evalutor_profileid,
       this.evaluatorsubjectform.value.in_exam_date,
       this.evaluatorsubjectform.value.in_regulation_code,
    0,this.evaluatorForm.value.moderationMarks,0,
       'in_flag', 'in_orgid','in_academic_year', 'in_exam_month_yr', 'in_course_code', 'in_course_year_code','in_subject_code', 'in_evalutor_profileid','in_exam_date','in_regulation_code','in_emp_id','in_moderation_marks','in_questionpaper_id'
        )
     .subscribe(result => {
      this.flag = true;
         this.spinner.hide();
         if (result.statusCode === 200){
              if (result.data && result.data !== '' && result.data.result.length > 0) {
                  this.subjectModerationList =  result?.data?.result[0];
                  const dialogRef = this.dialog.open(ViewModerationModalComponent, {
                    width: '1200px',
                    data: [this.subjectModerationList,this.evaluatorForm.value.academicYear]
                    });
                  
                    dialogRef.afterClosed().subscribe(details => {
                    });
               

              } else {
                  this.snotifyService.success(result.message, 'Success!');  
                  const dialogRef = this.dialog.open(ViewModerationModalComponent, {
                    width: '1000px',
                    data: this.subjectModerationList
                    });
                  
                    dialogRef.afterClosed().subscribe(details => {
                    });
               
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



         
          

