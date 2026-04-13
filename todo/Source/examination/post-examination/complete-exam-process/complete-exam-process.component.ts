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
  selector: 'app-complete-exam-process',
  templateUrl: './complete-exam-process.component.html',
  styleUrls: ['./complete-exam-process.component.scss']
})
export class CompleteExamProcessComponent implements OnInit {

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
  private getExamFiltersBycodeUrl=CONSTANTS.getExamFiltersBycodeUrl;
  private examResultProcessingUrl=CONSTANTS.examResultProcessingUrl;
  private examResultProcessingPublishUrl=CONSTANTS.examResultProcessingPublishUrl;
  private examCommittesUrl = CONSTANTS.examCommittesUrl;

  feeFormGroup: FormGroup;
  evaluatorsubjectform: FormGroup;
  evaluationForm: FormGroup;
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
  academicYearData = [];
  academicYears=[];
  examYear = [];
  courses=[];
  courseListData=[];
  examsListData=[];
  exams = [];
  examfilterData = [];
  CollegesListFilterDetails: any;
 
  constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,
              private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router, 
              private dialog: MatDialog, private genericFunctions: GenericFunctions, private route: ActivatedRoute,) {        
  }

  ngOnInit(): void {
    this.evaluatorForm = this.formBuilder.group({
      academicYearId:['',Validators.required],
      courseId:['',Validators.required],
      examId: ['',Validators.required],
      // CourseYear:['',Validators.required],
      // subjectCode:['',Validators.required],
    })
    this.feeFormGroup = this.formBuilder.group({
      academicYearId:['',Validators.required],
      courseId:['',Validators.required],
      examId: ['',Validators.required],
    });
    this.evaluationForm = this.formBuilder.group({
      academicYearId:['',Validators.required],
      courseId:['',Validators.required],
      examId: ['',Validators.required],
    })
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
// this.getList();
this.getFiltersList();
  }
  getFiltersList(): void {
     this.filtersDetailsList = []
       this.CollegesListDetails = []
       this.colleges = []
       this.spinner.show()
       let request = [
         { paramName: 'in_flag', paramValue: 'univ_exam_filters' },
         { paramName: 'in_flag_type', paramValue: 'REGSUP' },
         { paramName: 'in_university_id', paramValue: 0 },
         { paramName: 'in_college_id', paramValue: 0 },
         { paramName: 'in_course_id', paramValue: 0 },
         { paramName: 'in_course_group_id', paramValue: 0 },
         { paramName: 'in_course_year_id', paramValue: 0 },
         { paramName: 'in_exam_id', paramValue: 0 },
         { paramName: 'in_academic_year_id', paramValue: 0 },
         { paramName: 'in_regulation_id', paramValue: 0 },
         { paramName: 'in_subject_id', paramValue: 0 },
         { paramName: 'in_loginuser_empid', paramValue: +localStorage.getItem('employeeId') },
         { paramName: 'in_loginuser_roleid', paramValue: 0 },
         { paramName: 'in_sub_flag_type', paramValue: '' },
         { paramName: 'in_param1', paramValue: 0 },
         { paramName: 'in_param2', paramValue: 0 },
       ];
       this.crudService.getDetailsByRequest(this.getExamFiltersBycodeUrl, '', request, '&')
         .subscribe(result => {
           this.spinner.hide(); 
           if (result.statusCode === 200) {
             if (result.data && result.data !== '' && result.data.result.length > 0) {
               this.filtersDetailsList = result.data.result;
               for (let i = 0; i < this.filtersDetailsList.length; i++) {
                 if (this.filtersDetailsList[i].length > 0 && this.filtersDetailsList[i][0].flag === 'univ_exam_filters') {
                   this.CollegesListFilterDetails = this.filtersDetailsList[i];
                 }
               }
   
               const Course_Id = this.CollegesListFilterDetails.map(({ fk_course_id }) => fk_course_id);
               this.courses = this.CollegesListFilterDetails.filter(({ fk_course_id }, index) =>
                 !Course_Id.includes(fk_course_id, index + 1));
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
   
     selectedCourse(courseId): void {
      this.evaluationForm.get('academicYearId').setValue('')
      this.evaluationForm.get('examId').setValue('');
      this.academicYears = []
      this.academicYearsList = []
      this.examsLists = [];
      this.examsList = [];
      this.examData = [];
      this.examData = []
       if (courseId != null) {
         this.academicYearsList = this.CollegesListFilterDetails.filter(x => (x.fk_course_id == this.evaluationForm.value.courseId))
         if (this.academicYearsList.length > 0) {
           const academicYears = this.academicYearsList.map(({ fk_academic_year_id }) => fk_academic_year_id);
           this.academicYears = this.academicYearsList.filter(({ fk_academic_year_id }, index) => !academicYears.includes(fk_academic_year_id, index + 1));
         }   
       }
     }
     selectedAcademicYear(academicYearId): void {
       this.evaluationForm.get('examId').setValue('');
       this.examsLists = [];
       this.examsList = [];
       this.examData = [];
       if (academicYearId) {
         this.examsLists = this.CollegesListFilterDetails.filter(x => (x.fk_course_id === this.evaluationForm.value.courseId && x.fk_academic_year_id == this.evaluationForm.value.academicYearId))
         if (this.examsLists.length > 0) {
           const examsLists = this.examsLists.map(({ fk_exam_id }) => fk_exam_id);
           this.examsList = this.examsLists.filter(({ fk_exam_id }, index) => !examsLists.includes(fk_exam_id, index + 1));
           this.examData = this.examsList;
         }
       }
   
     }
     selectedExam(examId){

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
getList(): void {
  let empId = +localStorage.getItem('employeeId');
  this.flag = false;
this.spinner.show();  
let request = [
  {paramName: 'in_flag', paramValue: 'list_exam_subjects'},
  {paramName: 'in_orgid', paramValue:+localStorage.getItem('organizationId')},
  {paramName: 'in_fdate', paramValue: '1990-01-01'},
  {paramName: 'in_tdate', paramValue: '1990-01-01'},
  {paramName: 'in_evalutor_profileid', paramValue: 0},
  {paramName: 'in_exam_date', paramValue: '1990-01-01'},
  {paramName: 'in_emp_id', paramValue: 0},
  {paramName: 'in_questionpaper_id', paramValue: 0},
  {paramName: 'in_evaluator_role_id', paramValue: 0},
  {paramName: 'in_academic_year', paramValue: ''},
  {paramName: 'in_exam_short_name', paramValue: ''},
  {paramName: 'in_affiliatedto_catdet_id', paramValue: 0},
  {paramName: 'in_exam_id', paramValue: 0},
  {paramName: 'in_course_year_id', paramValue: 0},
  {paramName: 'in_subject_id', paramValue:0},
  {paramName: 'in_regulation_id', paramValue:0},
  {paramName: 'in_course_id', paramValue:0},
  {paramName: 'in_academic_year_id', paramValue:0},
  {paramName: 'in_loginuser_empid', paramValue:empId} 
     
];
this.crudService.getDetailsByRequest(this.getExamEvaluationSubjectCodes, '', request, '&')
.subscribe(result => {
  this.spinner.hide();
  if (result.statusCode === 200){
       if (result.data && result.data !== '' && result.data.result.length > 0) {
                this.examSubjects =  result.data.result[0];
                // this.monthYear=this.examSubjects
                this.snotifyService.success(result.message, 'Success!');  
                const courseCodeData = this.examSubjects.map(({ fk_course_ids }) => fk_course_ids);
                this.courseCode = this.examSubjects.filter(({ fk_course_ids }, index) =>
                !courseCodeData.includes(fk_course_ids, index + 1));
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
//   getList(): void{
//     if ( this.evaluatorsubjectform.valid){
//       this.flag = false;
//       let empId = +localStorage.getItem('employeeId');
//         /* -------- EXAM SESSIONS -------*/
//       this.crudService.listByEighteenIds(this.getExamEvaluationSubjectCodes, 
//            'list_exam_subjects' ,
//            this.evaluatorsubjectform.value.in_orgid, 
//          this.evaluatorsubjectform.value.in_fdate, 
//          this.evaluatorsubjectform.value.in_tdate, 
//          this.evaluatorsubjectform.value.in_exam_month_yr, 
//          this.evaluatorsubjectform.value.in_course_code,
//          this.evaluatorsubjectform.value.in_course_year_code, 
//          this.evaluatorsubjectform.value.in_subject_code,
//          this.evaluatorsubjectform.value.in_evalutor_profileid,
//          this.evaluatorsubjectform.value.in_exam_date,
//          this.evaluatorsubjectform.value.in_regulation_code,
//          0,0,0,'','',1,empId,
//          'in_flag', 'in_orgid' ,'in_fdate', 'in_tdate', 'in_exam_month_yr', 'in_course_code', 'in_course_year_code','in_subject_code', 'in_evalutor_profileid','in_exam_date','in_regulation_code','in_emp_id','in_questionpaper_id','in_evaluator_role_id','in_academic_year','in_exam_short_name','in_affiliatedto_catdet_id',
//          'in_loginuser_empid'
//           )
//        .subscribe(result => {
//            this.spinner.hide();
//            if (result.statusCode === 200){
//                 if (result.data && result.data !== '' && result.data.result.length > 0) {
//                     this.examSubjects =  result.data.result[0];
//                     // this.monthYear=this.examSubjects
//                     this.snotifyService.success(result.message, 'Success!');  
//                        const courseCodeData = this.examSubjects.map(({ course_code }) => course_code);
//                        this.courseCode = this.examSubjects.filter(({ course_code }, index) =>
//                           !courseCodeData.includes(course_code, index + 1));

//                 } else {
//                      this.snotifyService.success(result.message, 'Success!');  
//                 }
//            }else {
//             this.snotifyService.error(result.message, 'Error!');
//         }
//         }, error => {            
//             this.spinner.hide();
//             if (error.error.statusCode === 401){
//                 this.snotifyService.error(error.error.message, 'Error!');
//                 this.genericFunctions.logOut(this.router.url);
//            }else{
//                this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
//            }
//         });
//     }
// }
// selectedCourse(courseId){
//   this.academicYearData = [];
//   this.examYear = [];
//   this.monthYear=[];
//   this.monthYear1=[]
//   this.evaluationForm.get('academicYearId').setValue('');
//   this.evaluationForm.get('examId').setValue('');
//   // this.evaluatorForm.get('CourseYear').setValue('')
//   // this.evaluatorForm.get('subjectCode').setValue('')
//   this.academicYearData = this.examSubjects.filter(x=>(x.fk_course_ids === courseId));
//   if(this.academicYearData && this.academicYearData.length > 0){
//       const exam_year = this.academicYearData.map(({ pk_academic_year_id }) => pk_academic_year_id);
//       this.examYear = this.academicYearData.filter(({ pk_academic_year_id }, index) =>
//       !exam_year.includes(pk_academic_year_id, index + 1));
//   }
//   // for(let i=0;i<this.examSubjects.length;i++){
//   //           if(this.examSubjects[i].fk_course_ids==courseCodeId){
//   //                 this.monthYear1.push(this.examSubjects[i])
//   //                 const exam_month_yrData = this.monthYear1.map(({ exam_month_yr }) => exam_month_yr);
//   //                 this.monthYear = this.monthYear1.filter(({ exam_month_yr }, index) =>
//   //                 !exam_month_yrData.includes(exam_month_yr, index + 1));
//   //                 this.monthYear = this.monthYear.sort((a, b) => a.exam_month_yr - b.exam_month_yr);
//   //           }
//   // }
  
// }
// selectedExamYear(academicYearId){
//   this.evaluationForm.get('examId').setValue('');
//   this.examsListData=[]
//   this.exams = [];
//   this.examfilterData = []
//   if (academicYearId !== null && academicYearId !== undefined){
//   this.examsListData = this.examSubjects.filter(x=>( x.fk_course_ids === this.evaluationForm.value.courseId && x.pk_academic_year_id === academicYearId));
//   console.log(this.examsListData,'this.examsListData');
//   if(this.examsListData && this.examsListData.length>0){
//   const examsLists = this.examsListData.map(({ pk_exam_id }) => pk_exam_id);
//   this.exams = this.examsListData.filter(({ pk_exam_id }, index) => 
//     !examsLists.includes(pk_exam_id, index + 1));
//   this.exams = this.exams.filter(x => !x.is_internal_exam);
//   }
//   if(this.exams && this.exams.length>0){
//     this.examfilterData = this.exams;
//   }
//  }
// }

filterExamSearch(value) {
  this.examfilterData = [];
  this.examSearch(value);
}
 getFilterExam(value: string) {
  let filter = value.toLowerCase()
  for (let i = 0; i < this.exams.length; i++) {
      let option = this.exams[i];
      if (option.exam_name.toLowerCase().indexOf(filter) >= 0) {
          this.examfilterData.push(option);
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
  if ( this.evaluationForm.valid){
  this.crudService.listByEightIds(this.getevaluatorassignmentUrl, 
    'popstudentassignment',
    '',
    '',
    '',
    '', 
   this.evaluationForm.value.examId,
   0,  
    0 ,
    
    'in_flag', 'in_profileids' ,'in_exam_evaluationassignment_ids', 'in_omr_serial_nos', 'in_timetable_det_ids','in_exam_id','in_subject_id','in_course_year_id'
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
  if ( this.evaluationForm.valid){
  // this.crudService.listByNineIds(this.getevaluatorassignmentUrl, 
  //   're_evaluation_assignment_pop',
  //   '',
  //   '',
  //   this.evaluatorForm.value.ExamMonthYear,
  //   '', 
  //  '' ,
  //  this.evaluatorForm.value.CourseCode,  
  //   '' ,
  //   '' ,
  //   'in_flag', 'in_profileids' ,'in_subject_code', 'in_exam_month_yr', 'in_coursegroup','in_courseyear','in_coursecode','in_exam_evaluationassignment_ids','in_timetable_det_ids'
  //  )
   this.crudService.listByEightIds(this.getevaluatorassignmentUrl, 
    're_evaluation_assignment_pop',
    '',
    '',
    '',
    '', 
   this.evaluationForm.value.examId,
   0,  
  0,
    
    'in_flag', 'in_profileids' ,'in_exam_evaluationassignment_ids', 'in_omr_serial_nos', 'in_timetable_det_ids','in_exam_id','in_subject_id','in_course_year_id'
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
// FinalisedEvaluationMarks(){
//     if ( this.evaluatorForm.valid){
//       this.flag = false;
//         /* -------- EXAM SESSIONS -------*/
//       this.crudService.listBySixIds(this.evaluationmarksfinalisUrl, 
//            'exam_finalise_evaluation_marks' ,
//            this.evaluatorsubjectform.value.in_orgid, 
//         //  this.evaluatorsettingform.value.in_fdate, 
//         //  this.evaluatorsettingform.value.in_tdate, 
//         this.evaluatorForm.value.ExamMonthYear,
//         this.evaluatorForm.value.CourseCode, 
//          '',
//          '',
//          'in_flag', 'in_org_id' , 'in_exam_month_yr', 'in_coursecode','in_academicYear', 'in_target_exam_timetable_id'
//           )
//        .subscribe(result => {
//            this.spinner.hide();
//            if (result.statusCode === 200){
//                 if (result.data && result.data !== '' && result.data.result.length > 0) {
//                     this.snotifyService.success(result.message, 'Success!');  
  
//                 } else {
//                     this.snotifyService.success(result.message, 'Success!');  
//                 }
//            }else {
//             this.snotifyService.error(result.message, 'Error!');
//         }
//         }, error => {            
//             this.spinner.hide();
//             if (error.error.statusCode === 401){
//                 this.snotifyService.error(error.error.message, 'Error!');
//                 this.genericFunctions.logOut(this.router.url);
//            }else{
//                this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
//            }
//         });
    
//     }
//     else{
//        this.snotifyService.info('Please Select The Filters', 'Info!');
//     }
//   }
FinaliseEvaluationStatus(){
  if ( this.evaluationForm.valid){
    this.flag = false;
    this.spinner.show();
    let request = [
      {paramName: 'in_flag', paramValue:'exam_finalise_evaluation_status'},
      {paramName: 'in_examid', paramValue: this.evaluationForm.value.examId}
    ];
    this.crudService.getDetailsByRequest(this.evaluationmarksfinalisUrl,'', request,'&')
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
FinalisedEvaluationMarks(){
  if ( this.evaluationForm.valid){
    this.flag = false;
    this.spinner.show();
    let request = [
      {paramName: 'in_flag', paramValue:'exam_finalise_evaluation_marks'},
      {paramName: 'in_examid', paramValue: this.evaluationForm.value.examId}
    ];
    this.crudService.getDetailsByRequest(this.evaluationmarksfinalisUrl,'', request,'&')
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
  if ( this.evaluationForm.valid){
    this.flag = false;
    this.spinner.show();
      /* -------- EXAM SESSIONS -------*/
      let request = [
        {paramName: 'in_flag', paramValue:'exam_finalise_reevaluation_marks'},
        {paramName: 'in_examid', paramValue: this.evaluationForm.value.examId}
      ];
      this.crudService.getDetailsByRequest(this.evaluationmarksfinalisUrl,'', request,'&')
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
finalizeReevaluationStatus(){
  if ( this.evaluationForm.valid){
    this.flag = false;
    this.spinner.show();
    let request = [
      {paramName: 'in_flag', paramValue:'exam_finalise_reevaluation_status'},
      {paramName: 'in_examid', paramValue: this.evaluationForm.value.examId}
    ];
    this.crudService.getDetailsByRequest(this.evaluationmarksfinalisUrl,'', request,'&')
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

  // FinaliseEvaluationStatus(){
  //   if ( this.evaluatorForm.valid){
  //     this.flag = false;
  //       /* -------- EXAM SESSIONS -------*/
  //     this.crudService.listBySixIds(this.evaluationmarksfinalisUrl, 
  //          'exam_finalise_evaluation_status' ,
  //          this.evaluatorsubjectform.value.in_orgid, 
  //       //  this.evaluatorsettingform.value.in_fdate, 
  //       //  this.evaluatorsettingform.value.in_tdate, 
  //       this.evaluatorForm.value.ExamMonthYear,
  //       this.evaluatorForm.value.CourseCode, 
  //        '',
  //        '',
  //        'in_flag', 'in_org_id' , 'in_exam_month_yr', 'in_coursecode','in_academicYear', 'in_target_exam_timetable_id'
  //         )
  //      .subscribe(result => {
  //          this.spinner.hide();
  //          if (result.statusCode === 200){
  //               if (result.data && result.data !== '' && result.data.result.length > 0) {
  //                   this.snotifyService.success(result.message, 'Success!');  
  
  //               } else {
  //                   this.snotifyService.success(result.message, 'Success!');  
  //               }
  //          }else {
  //           this.snotifyService.error(result.message, 'Error!');
  //       }
  //       }, error => {            
  //           this.spinner.hide();
  //           if (error.error.statusCode === 401){
  //               this.snotifyService.error(error.error.message, 'Error!');
  //               this.genericFunctions.logOut(this.router.url);
  //          }else{
  //              this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
  //          }
  //       });
    
  //   }
  //   else{
  //      this.snotifyService.info('Please Select The Filters', 'Info!');
  //   }
  // }
  // FinalisedReEvaluationMarks(){
  //   if ( this.evaluatorForm.valid){
  //     this.flag = false;
  //       /* -------- EXAM SESSIONS -------*/
  //     this.crudService.listBySixIds(this.evaluationmarksfinalisUrl, 
  //          'exam_finalise_revised_evaluation_marks' ,
  //          this.evaluatorsubjectform.value.in_orgid, 
  //       //  this.evaluatorsettingform.value.in_fdate, 
  //       //  this.evaluatorsettingform.value.in_tdate, 
  //       this.evaluatorForm.value.ExamMonthYear,
  //       this.evaluatorForm.value.CourseCode, 
  //        '',
  //        '',
  //        'in_flag', 'in_org_id' , 'in_exam_month_yr', 'in_coursecode','in_academicYear', 'in_target_exam_timetable_id'
  //         )
  //      .subscribe(result => {
  //          this.spinner.hide();
  //          if (result.statusCode === 200){
  //               if (result.data && result.data !== '' && result.data.result.length > 0) {
  //                   this.snotifyService.success(result.message, 'Success!');  
  
  //               } else {
  //                   this.snotifyService.success(result.message, 'Success!');  
  //               }
  //          }else {
  //           this.snotifyService.error(result.message, 'Error!');
  //       }
  //       }, error => {            
  //           this.spinner.hide();
  //           if (error.error.statusCode === 401){
  //               this.snotifyService.error(error.error.message, 'Error!');
  //               this.genericFunctions.logOut(this.router.url);
  //          }else{
  //              this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
  //          }
  //       });
    
  //   }
  //   else{
  //      this.snotifyService.info('Please Select The Filters', 'Info!');
  //   }
  // }
  Run(){
    if ( this.evaluationForm.valid){
      this.flag = false;

        /* -------- EXAM SESSIONS -------*/
      this.crudService.listByNineIds(this.evaluatorassignmentUrl, 
        'popstudentanswerpapers' ,
        '',
        '',
        this.evaluationForm.value.ExamMonthYear, 
        '', 
       '' ,
        this.evaluationForm.value.CourseCode,
        0,
        0,
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
  if ( this.evaluationForm.valid){
    this.spinner.show();
    let request = [
      {paramName: 'in_exam_id', paramValue: this.evaluationForm.value.examId}
     
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
  if ( this.evaluationForm.valid){
    this.spinner.show();
    let request = [
      {paramName: 'in_exam_id', paramValue: this.evaluationForm.value.examId}
     
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
VerifyExamStatus(){
  this.router.navigate(['admin-examination-management/admin-post-examination/verify-exam-status'])

}
VerifyExamMarks(){
  this.router.navigate(['admin-examination-management/admin-post-examination/verify-exam-marks'])
}
setupCommittes(){
  this.spinner.show();
  let request = [
    {paramName: 'in_flag', paramValue: 'exam_committees'},
  ];
  this.crudService.getDetailsByRequest(this.examCommittesUrl,'', request,'&')
  // this.crudService.addMasterDetails(this.examCommittesUrl , '')
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