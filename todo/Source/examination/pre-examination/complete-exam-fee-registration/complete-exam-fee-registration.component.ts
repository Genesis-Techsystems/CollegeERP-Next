import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { ActivatedRoute, Router } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { CrudService } from 'app/main/services/crud.service';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';

@Component({
  selector: 'app-complete-exam-fee-registration',
  templateUrl: './complete-exam-fee-registration.component.html',
  styleUrls: ['./complete-exam-fee-registration.component.scss']
})
export class CompleteExamFeeRegistrationComponent implements OnInit {

  displayedColumns: string[] = ['mark','id', 'evaluatorName', 'email', 'examEvaluatorsId','NumberOfAssignEvaluators','NumberOfDueEvaluators'];
  dataSource: MatTableDataSource<any>;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild('uploadXl') uploadXl: ElementRef;
  examTimetableList: any[] = []
  private evaluatorassignmentUrl=CONSTANTS.evaluatorassignmentUrl
  private isActive = CONSTANTS.isActive;
  
  step = 0; 
  flag:boolean
 private getExamEvaluationSubjectCodes = CONSTANTS.getExamEvaluationCodesUrl;
 examSubjects: any;
 monthYear=[];
 courseCode: any;
 courseyearcode: any;
 evaluatorForm: FormGroup;

 examDate = this.genericFunctions.momentWithDateFormatYMD(this.genericFunctions.moment()) ;

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
  examEvaluationListLength=0;
  NoOfAssigned=0;
  private evaluationmarksfinalisUrl=CONSTANTS.evaluationmarksfinalisUrl
  private getevaluatorassignmentUrl=CONSTANTS.getevaluatorassignmentUrl
  private collegewisedetailsUrl=CONSTANTS.collegewisedetailsUrl;
  private examResultProcessingUrl=CONSTANTS.examResultProcessingUrl;
  private examResultProcessingPublishUrl=CONSTANTS.examResultProcessingPublishUrl;

  feeFormGroup: FormGroup;
  evaluatorsubjectform: FormGroup;
  courseyearcode1: any[];
  monthYear1: any[];
  filtersDataList: any[];
  examList=[];
  filterExam=[];
  filtersData=[];
  summaryDetailsList=[];
  filtersDetailsList=[];
  colleges=[];
  CollegesListDetails: any[];
  examsLists: any[];
  examsList: any[];
  examData: any[];
  academicYearsList=[];
  academicYears=[];
  courses=[];
  courseListData=[];
 
  constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,
              private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router, 
              private dialog: MatDialog, private genericFunctions: GenericFunctions, private route: ActivatedRoute,) {        
  }

  ngOnInit(): void {
    this.evaluatorForm = this.formBuilder.group({
      CourseCode:['',Validators.required],
      ExamMonthYear:['',Validators.required],
      // CourseYear:['',Validators.required],
      // subjectCode:['',Validators.required],
    })
    this.feeFormGroup = this.formBuilder.group({
      collegeId: ['',Validators.required],
      academicYearId:['',Validators.required],
      courseId:['',Validators.required],
      examId: ['',Validators.required],
     
    });
this.evaluatorsubjectform = this.formBuilder.group({
  in_orgid:[+localStorage.getItem('organizationId')],
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
this.getFiltersList();
  }
  getFiltersList(): void {
    this.filtersDetailsList=[]
    this.CollegesListDetails=[]
    this.colleges=[]
    this.spinner.show();
    let request = [
      {paramName: 'in_flag', paramValue: 'clg_exam_timetable_filters'},
      {paramName: 'in_org_id', paramValue:+localStorage.getItem('organizationId')},
      {paramName: 'in_college_id', paramValue: 0},
      {paramName: 'in_course_id', paramValue: 0},
      {paramName: 'in_course_group_id', paramValue: 0},
      {paramName: 'in_course_year_id', paramValue: 0},
      {paramName: 'in_group_section_id', paramValue: 0},
      {paramName: 'in_academic_year_id', paramValue: 0},
      {paramName: 'in_dept_id', paramValue: 0},
       {paramName: 'in_isadmin', paramValue: 0},
        {paramName: 'in_loginuser_empid', paramValue: +localStorage.getItem('employeeId')},
         {paramName: 'in_loginuser_roleid', paramValue: 0},
         {paramName: 'in_employee', paramValue: ''},
         {paramName: 'in_subject', paramValue: ''},
         {paramName: 'in_gm_codes', paramValue:'SUBTYPE'},
        
         
    ];
    this.crudService.getDetailsByRequest(this.collegewisedetailsUrl, '', request, '&')
  .subscribe(result =>  {
          this.spinner.hide();
          if (result.statusCode === 200) {
            if (result.data && result.data !== '' && result.data.result.length > 0) {
              this.filtersDetailsList = result.data.result;
              for(let i=0; i<this.filtersDetailsList.length; i++){
                if(this.filtersDetailsList[i].length>0 && this.filtersDetailsList[i][0].flag === 'clg_exam_timetable_filters'){
                  this.CollegesListDetails  = this.filtersDetailsList[i];
                  }
          }
          const CollegeIdData = this.CollegesListDetails.map(({ fk_college_id }) => fk_college_id);
          this.colleges = this.CollegesListDetails.filter(({ fk_college_id }, index) => 
          !CollegeIdData.includes(fk_college_id, index + 1));
          if(this.colleges.length>0){
            this.colleges = this.colleges.sort((a,b)=>a.clg_sort_order-b.clg_sort_order);
            // this.feeFormGroup.get('collegeId').setValue(this.colleges[0]?.fk_college_id);
            // this.selectedCollege(this.feeFormGroup.value.collegeId)
          }
            } else {
              this.snotifyService.success(result.message, 'Success!');
            }
          } else {
            this.snotifyService.error(result.message, 'Error!');
          }
        }, error => {
          this.spinner.hide();
          if (error.error.statusCode === 401) {
            this.snotifyService.error(error.error.message, 'Error!');
            this.genericFunctions.logOut(this.router.url);
          } else {
            this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
          }
        });
  }
  selectedCollege(collegeId): void{
    this.feeFormGroup.get('academicYearId').setValue('');
    this.feeFormGroup.get('courseId').setValue('');
    this.feeFormGroup.get('examId').setValue('');
    this.courses = [];
    this.examsList = [];
    this.academicYears = []; 
    /*----------- ACADEMIC YEARS -----------*/
    if (collegeId != null && collegeId !== undefined ){
      this.academicYearsList=[]
      this.academicYearsList=this.CollegesListDetails.filter(x=>(x.fk_college_id==collegeId))
          if(this.academicYearsList.length>0){
          const academicYears = this.academicYearsList.map(({ fk_academic_year_id }) => fk_academic_year_id);
          this.academicYears = this.academicYearsList.filter(({ fk_academic_year_id }, index) => !academicYears.includes(fk_academic_year_id, index + 1));
          }
          if(this.academicYears.length>0){
            this.feeFormGroup.get('academicYearId').setValue(this.academicYears[0].fk_academic_year_id);
            this.selectedAcademicYear(this.feeFormGroup.value.academicYearId)
          }

   }
  }

// tslint:disable-next-line:typedef
selectedAcademicYear(academicYearId){
  this.feeFormGroup.get('courseId').setValue('');
  this.feeFormGroup.get('examId').setValue('');
  this.courses = [];
  this.examsList = [];
  this.courseListData=[]
/*----------- COURSES -----------*/
  if (academicYearId != null && academicYearId !== undefined ){
    this.courseListData=this.CollegesListDetails.filter(x=>(x.fk_college_id==this.feeFormGroup.value.collegeId && x.fk_academic_year_id == academicYearId))
    if(this.courseListData.length>0){
  const courseList = this.courseListData.map(({ fk_course_id }) => fk_course_id);
  this.courses = this.courseListData.filter(({ fk_course_id }, index) =>
    !courseList.includes(fk_course_id, index + 1));
}
if(this.courses.length>0){
  this.feeFormGroup.get('courseId').setValue(this.courses[0].fk_course_id);
  this.selectedCours(this.feeFormGroup.value.courseId)
}

}
}

selectedCours(courseId): void{
  this.feeFormGroup.get('examId').setValue('');
  this.examsList = [];
  this.examsLists=[]
  if (courseId !== null && courseId !== undefined){
  this.examsLists=this.CollegesListDetails.filter(x=>(x.fk_college_id== this.feeFormGroup.value.collegeId && x.fk_course_id==this.feeFormGroup.value.courseId && x.fk_academic_year_id==this.feeFormGroup.value.academicYearId))
  if(this.examsLists.length>0){
  const examsLists = this.examsLists.map(({ fk_exam_id }) => fk_exam_id);
  this.examsList = this.examsLists.filter(({ fk_exam_id }, index) => !examsLists.includes(fk_exam_id, index + 1));
  this.examsList  = this.examsList.filter(x=>x.is_regular_exam==true)
  this.examData = this.examsList;
  }
  if(this.examsList.length>0){
    this.feeFormGroup.get('examId').setValue(this.examsList[0].fk_exam_id);
    // this.selectedExam(this.feeFormGroup.value.examId)
  }

  }
}

searchExam(value) {
  this.examData = [];
  this.examSearch(value);
}
examSearch(value: string) {
  let filter = value.toLowerCase()
  for (let i = 0; i < this.examsList.length; i++) {
      let option = this.examsList[i];
      if (option.exam_name.toLowerCase().indexOf(filter) >= 0) {
          this.examData.push(option);
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
         'in_flag', 'in_orgid' ,'in_fdate', 'in_tdate', 'in_exam_month_yr', 'in_course_code', 'in_course_year_code','in_subject_code', 'in_evalutor_profileid','in_exam_date','in_regulation_code','in_emp_id','in_questionpaper_id','in_evaluator_role_id','in_academic_year','in_exam_short_name','in_affiliatedto_catdet_id',
         'in_loginuser_empid'
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
  this.monthYear=[];
  this.monthYear1=[]
  this.evaluatorForm.get('ExamMonthYear').setValue('')
  // this.evaluatorForm.get('CourseYear').setValue('')
  // this.evaluatorForm.get('subjectCode').setValue('')

  for(let i=0;i<this.examSubjects.length;i++){
            if(this.examSubjects[i].course_code==courseCodeId){
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
  // this.evaluatorForm.get('CourseYear').setValue('')
  // this.evaluatorForm.get('subjectCode').setValue('')

  for(let i=0;i<this.examSubjects.length;i++){
    if(this.examSubjects[i].exam_month_yr==exam_month_yr && this.examSubjects[i].course_code==this.evaluatorForm.value.CourseCode){
          this.courseyearcode1.push(this.examSubjects[i])
          const courseyearcode = this.courseyearcode1.map(({ course_year_code }) => course_year_code);
          this.courseyearcode = this.courseyearcode1.filter(({ course_year_code }, index) =>
             !courseyearcode.includes(course_year_code, index + 1));
          
    }
}

}
AssignmentRun(){
  if ( this.evaluatorForm.valid){
  this.crudService.listByNineIds(this.getevaluatorassignmentUrl, 
    'popstudentassignment',
    '',
    '',
    this.evaluatorForm.value.ExamMonthYear,
    '', 
   '' ,
   this.evaluatorForm.value.CourseCode,  
    '' ,
    '' ,
    'in_flag', 'in_profileids' ,'in_subject_code', 'in_exam_month_yr', 'in_coursegroup','in_courseyear','in_coursecode','in_exam_evaluationassignment_ids','in_timetable_det_ids'
   )
.subscribe(result => {
    if (result.statusCode === 200){
         if (result.data && result.data !== '' && result.data.result.length > 0) {
          this.snotifyService.success(result.message, 'Success!');  

         } else {
             this.snotifyService.success(result.message, 'Error!');  
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
else{
   this.snotifyService.info('Please Select The Filters', 'Info!');
}
}
ReEvaluationAssignmentRun(){
  if ( this.evaluatorForm.valid){
  this.crudService.listByNineIds(this.getevaluatorassignmentUrl, 
    're_evaluation_assignment_pop',
    '',
    '',
    this.evaluatorForm.value.ExamMonthYear,
    '', 
   '' ,
   this.evaluatorForm.value.CourseCode,  
    '' ,
    '' ,
    'in_flag', 'in_profileids' ,'in_subject_code', 'in_exam_month_yr', 'in_coursegroup','in_courseyear','in_coursecode','in_exam_evaluationassignment_ids','in_timetable_det_ids'
   )
.subscribe(result => {
    if (result.statusCode === 200){
         if (result.success==true) {
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
else{
   this.snotifyService.info('Please Select The Filters', 'Info!');
}
}
FinalisedEvaluationMarks(){
    if ( this.evaluatorForm.valid){
      this.flag = false;
        /* -------- EXAM SESSIONS -------*/
      this.crudService.listBySixIds(this.evaluationmarksfinalisUrl, 
           'exam_finalise_evaluation_marks' ,
           this.evaluatorsubjectform.value.in_orgid, 
        //  this.evaluatorsettingform.value.in_fdate, 
        //  this.evaluatorsettingform.value.in_tdate, 
        this.evaluatorForm.value.ExamMonthYear,
        this.evaluatorForm.value.CourseCode, 
         '',
         '',
         'in_flag', 'in_org_id' , 'in_exam_month_yr', 'in_coursecode','in_academicYear', 'in_target_exam_timetable_id'
          )
       .subscribe(result => {
           this.spinner.hide();
           if (result.statusCode === 200){
                if (result.data && result.data !== '' && result.data.result.length > 0) {
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
    else{
       this.snotifyService.info('Please Select The Filters', 'Info!');
    }
  }
  FinaliseEvaluationStatus(){
    if ( this.evaluatorForm.valid){
      this.flag = false;
        /* -------- EXAM SESSIONS -------*/
      this.crudService.listBySixIds(this.evaluationmarksfinalisUrl, 
           'exam_finalise_evaluation_status' ,
           this.evaluatorsubjectform.value.in_orgid, 
        //  this.evaluatorsettingform.value.in_fdate, 
        //  this.evaluatorsettingform.value.in_tdate, 
        this.evaluatorForm.value.ExamMonthYear,
        this.evaluatorForm.value.CourseCode, 
         '',
         '',
         'in_flag', 'in_org_id' , 'in_exam_month_yr', 'in_coursecode','in_academicYear', 'in_target_exam_timetable_id'
          )
       .subscribe(result => {
           this.spinner.hide();
           if (result.statusCode === 200){
                if (result.data && result.data !== '' && result.data.result.length > 0) {
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
    else{
       this.snotifyService.info('Please Select The Filters', 'Info!');
    }
  }
  FinalisedReEvaluationMarks(){
    if ( this.evaluatorForm.valid){
      this.flag = false;
        /* -------- EXAM SESSIONS -------*/
      this.crudService.listBySixIds(this.evaluationmarksfinalisUrl, 
           'exam_finalise_revised_evaluation_marks' ,
           this.evaluatorsubjectform.value.in_orgid, 
        //  this.evaluatorsettingform.value.in_fdate, 
        //  this.evaluatorsettingform.value.in_tdate, 
        this.evaluatorForm.value.ExamMonthYear,
        this.evaluatorForm.value.CourseCode, 
         '',
         '',
         'in_flag', 'in_org_id' , 'in_exam_month_yr', 'in_coursecode','in_academicYear', 'in_target_exam_timetable_id'
          )
       .subscribe(result => {
           this.spinner.hide();
           if (result.statusCode === 200){
                if (result.data && result.data !== '' && result.data.result.length > 0) {
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
    else{
       this.snotifyService.info('Please Select The Filters', 'Info!');
    }
  }
  Run(){
    if ( this.evaluatorForm.valid){
      this.flag = false;

        /* -------- EXAM SESSIONS -------*/
      this.crudService.listByNineIds(this.evaluatorassignmentUrl, 
        'popstudentanswerpapers' ,
        '',
        '',
        this.evaluatorForm.value.ExamMonthYear, 
        '', 
       '' ,
        this.evaluatorForm.value.CourseCode,
        '' ,
        '' ,
        'in_flag', 'in_profileids' ,'in_subject_code', 'in_exam_month_yr', 'in_coursegroup','in_courseyear','in_coursecode','in_exam_evaluationassignment_ids','in_timetable_det_ids'
          )
       .subscribe(result => {
           this.spinner.hide();
           if (result.statusCode === 200){
                if (result.data && result.data !== '' && result.data.result.length > 0) {
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
  resultPro(){
  if ( this.feeFormGroup.valid){
    let request = [
      {paramName: 'in_exam_id', paramValue: this.feeFormGroup.value.examId}
     
    ];
    this.crudService.getDetailsByRequest(this.examResultProcessingUrl,'', request,'&')
    .subscribe(result => {
    this.spinner.hide();
    if (result.statusCode === 200){
         if (result.success) {
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
  else{
     this.snotifyService.info('Please Select The Filters', 'Info!');
  }
}
resultProPublish(){
  if ( this.feeFormGroup.valid){
    let request = [
      {paramName: 'in_exam_id', paramValue: this.feeFormGroup.value.examId}
     
    ];
    this.crudService.getDetailsByRequest(this.examResultProcessingPublishUrl,'', request,'&')
    .subscribe(result => {
    this.spinner.hide();
    if (result.statusCode === 200){
         if (result.success) {
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
}
