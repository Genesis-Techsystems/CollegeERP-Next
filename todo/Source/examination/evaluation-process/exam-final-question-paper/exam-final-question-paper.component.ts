import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatRipple } from '@angular/material/core';
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
  selector: 'app-exam-final-question-paper',
  templateUrl: './exam-final-question-paper.component.html',
  styleUrls: ['./exam-final-question-paper.component.scss']
})
export class ExamFinalQuestionPaperComponent implements OnInit {
  displayedColumns: string[] = ['id', 'courseYearCode', 'PrepareByEmp', 'questionPaperTitle','QuestionPaperStatus'];
  dataSource: MatTableDataSource<any>;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatRipple) ripple: MatRipple;
  button=true;
  greybutton=false;
  private EvaluatorRole=CONSTANTS.EvaluatorRole;
  private getExamEvaluationCodesUrl = CONSTANTS.getExamEvaluationCodesUrl;
  private ExamQuestionPaperCrudUrl = CONSTANTS.ExamQuestionPaperCrudUrl;
  private getExamFiltersBycodeUrl = CONSTANTS.getExamFiltersBycodeUrl;

  examQuestionpapers: any[] = [];
  questionPaperFilterForm: FormGroup;
  flag : true;
  // listExamSubject: any;
  // monthYear=[];
  // courseCode: any;
  // courseyearcode: any;
  // questionPaperForm: FormGroup;
  // subjectcode: any;
  // RegulationCode : any [];
  // ExamDate : any [];
  // CourseGroupCode : any [];
  // monthYear1=[];
  step : any
  // QuestionPapers: any;
  // courseyearcode1: any [];
  // subjectcode1: any[];
  // Groupcode1: any[];
  // Regulationcode1: any[];
  // examdate1: any;
  // groupCode1: any[];
  // CourseCode: any;
  pageParams: any = {};
  randomValue: number | null = null;
  numbers=[];
  queid: any;
  questionPaperForm: FormGroup;

  data: { organizationId: any; examMonthYear: any; courseCode: any; courseYearId: any; courseYearCode: any; courseGroupCodes: any; regulationCode: any; subjectCode: any; examDate: any; questionPaperTitle: any; setNumber: any; passMarks: any; totalMarks: any; totalQuestions: any; preparedByEmpId: any; preparedDate: any; questionPaperStatusCatDetId: number; statusComments: any; isApproved: any; approvedByEmpId: any; questionPaperPath: any; modelAnswerSheetPath: any; approvedDate: any; isActive: any; };
  listExamSubject: any;
  CourseCode: any;
  academicYearDetailList: any;
  subjectDetails: any;
  regulationsData: any;
  examDetailList: any;
  academicyearsList: any[];
  examList: any;
  examDuplicateList: any;
  subjectListDetails: any[];
  subjectDuplicateList: any[];
  regulations: any;
  QuestionPapers=[];
  filtersDetailsList: any[];
  subjectDetialsList: any[];
  regulationListDetails: any;
  courseYearSubjectDetails = [];
  courseYears = [];
  
  constructor(private route: ActivatedRoute, private formBuilder: FormBuilder, private router: Router, private dialog: MatDialog, private snotifyService: SnotifyService,
              private crudService: CrudService, private spinner: NgxSpinnerService, private genericFunctions: GenericFunctions,) {
  }
   ngOnInit() {

      this.questionPaperForm = this.formBuilder.group({
        questionPaperId :[''],
        examId :[''],
        subjectId:[''],
        courseId:[''],
        academicYearId:[''],
        courseYearId:[''],
        regulationId:[''],
  })
  this.route.queryParams
  .subscribe(params => {
    this.pageParams = params;
  });
    this.dataSource = new MatTableDataSource(this.examQuestionpapers);
    setTimeout(() => this.dataSource.paginator = this.paginator);
    this.dataSource.sort = this.sort;
  this.getQuestionpaperFilterss();
   
   }

   isEmptyObject(obj) {
    return (obj && (Object.keys(obj).length === 0));
  }

// STORE PROCEDURE FOR FILTERS
//    getQuestionpaperFilterss(): void{
//     if ( this.questionPaperFilterForm.valid){
//       let empId = +localStorage.getItem('employeeId');
//       this.spinner.show()
//       this.flag = true;
//       this.crudService.listByEighteenIds(this.getExamEvaluationCodesUrl, 
//            'list_exam_subjects' ,
//            this.questionPaperFilterForm.value.in_orgid, 
//          this.questionPaperFilterForm.value.in_fdate, 
//          this.questionPaperFilterForm.value.in_tdate, 
//          this.questionPaperFilterForm.value.in_exam_month_yr, 
//          this.questionPaperFilterForm.value.in_course_code,
//          this.questionPaperFilterForm.value.in_course_year_code, 
//          this.questionPaperFilterForm.value.in_subject_code,
//          this.questionPaperFilterForm.value.in_evalutor_profileid,
//          this.questionPaperFilterForm.value.in_exam_date,
//          this.questionPaperFilterForm.value.in_regulation_code,
//          this.questionPaperFilterForm.value.in_emp_id, 
//          this.questionPaperFilterForm.value.in_questionpaper_id ,
//          this.EvaluatorRole,'','',1,empId,
//          'in_flag', 'in_orgid' ,'in_fdate', 'in_tdate', 'in_exam_month_yr', 'in_course_code', 'in_course_year_code','in_subject_code', 'in_evalutor_profileid','in_exam_date','in_regulation_code','in_emp_id','in_questionpaper_id','in_evaluator_role_id',
//          'in_academic_year','in_exam_short_name','in_affiliatedto_catdet_id','in_loginuser_empid'
//           )
//        .subscribe(result => {
//            this.spinner.hide();
//            if (result.statusCode === 200){
//                 if (result.data && result.data !== '' && result.data.result.length > 0) {
//                     this.listExamSubject =  result.data.result[0];
                    
//                     const CourseCode = this.listExamSubject.map(({ course_code }) => course_code);
//                     this.CourseCode = this.listExamSubject.filter(({ course_code }, index) =>
//                        !CourseCode.includes(course_code, index + 1));
//       this.questionPaperForm.get('CourseCode').setValue(this.CourseCode[0].course_code)
//       this.selectedCourse(this.questionPaperForm.value.CourseCode)
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
// }

// selectedCourse(courseCodeId){
//   this.QuestionPapers= []
//     this.monthYear=[];
//     this.monthYear1=[];
//     this.questionPaperForm.get('ExamMonthYear').setValue('')
//     this.questionPaperForm.get('CourseYear').setValue('')
//     this.questionPaperForm.get('RegulationCode').setValue('')
//     this.questionPaperForm.get('CourseGroupCode').setValue('')
//     this.questionPaperForm.get('ExamDate').setValue('')
//     this.questionPaperForm.get('subjectcode').setValue('')
//     for(let i=0;i<this.listExamSubject.length;i++){
//               if(this.listExamSubject[i].course_code==courseCodeId){
//                     this.monthYear1.push(this.listExamSubject[i])
//                     const exam_month_yrData = this.monthYear1.map(({ exam_month_yr }) => exam_month_yr);
//                     this.monthYear = this.monthYear1.filter(({ exam_month_yr }, index) =>
//                     !exam_month_yrData.includes(exam_month_yr, index + 1));
//                     this.monthYear = this.monthYear.sort((a, b) => a.exam_month_yr - b.exam_month_yr);
//               }
//     }
//     this.questionPaperForm.get('ExamMonthYear').setValue(this.monthYear[0].exam_month_yr) 
//      this.selectedMonthyr(this.questionPaperForm.value.ExamMonthYear)
//   }

//   selectedMonthyr(exam_month_yr){
//     this.QuestionPapers= []
//     this.courseyearcode1=[]
//     this.courseyearcode=[]
//     this.questionPaperForm.get('CourseYear').setValue('')
//     this.questionPaperForm.get('RegulationCode').setValue('')
//     this.questionPaperForm.get('CourseGroupCode').setValue('')
//     this.questionPaperForm.get('ExamDate').setValue('')
//     this.questionPaperForm.get('subjectcode').setValue('')
//     for(let i=0;i<this.listExamSubject.length;i++){
//       if(this.listExamSubject[i].exam_month_yr==exam_month_yr 
//          && this.listExamSubject[i].course_code==this.questionPaperForm.value.CourseCode){
//             this.courseyearcode1.push(this.listExamSubject[i])
//             const courseyearcode = this.courseyearcode1.map(({ course_year_code }) => course_year_code);
//             this.courseyearcode = this.courseyearcode1.filter(({ course_year_code }, index) =>
//                !courseyearcode.includes(course_year_code, index + 1));
               
//             }
//   }
//   this.questionPaperForm.get('CourseYear').setValue(this.courseyearcode[0].course_year_code) 
//   this.selectedCourseYr(this.questionPaperForm.value.CourseYear)
//   }

//   selectedCourseYr(courseYr){
//     this.QuestionPapers= []
// this.groupCode1=[]
//     this.CourseGroupCode=[]
//     this.questionPaperForm.get('CourseGroupCode').setValue('')
//     this.questionPaperForm.get('RegulationCode').setValue('')
//     this.questionPaperForm.get('ExamDate').setValue('')
//     this.questionPaperForm.get('subjectcode').setValue('')
//     for(let i=0;i<this.listExamSubject.length;i++){
//       if(this.listExamSubject[i].course_year_code==courseYr 
//         && this.listExamSubject[i].course_code==this.questionPaperForm.value.CourseCode 
//          && this.listExamSubject[i].exam_month_yr==this.questionPaperForm.value.ExamMonthYear){
//             this.groupCode1.push(this.listExamSubject[i])
//             const CourseGroupCode = this.groupCode1.map(({ group_code }) => group_code);
//             this.CourseGroupCode = this.groupCode1.filter(({ group_code }, index) =>
//                !CourseGroupCode.includes(group_code, index + 1))
//             }
//         }
//         this.questionPaperForm.get('CourseGroupCode').setValue(this.CourseGroupCode[0].group_code) 
//   this.selectedgroupCode(this.questionPaperForm.value.CourseGroupCode)
//     }

//   selectedgroupCode(groupCode){
//     this.QuestionPapers= []
//     this.Regulationcode1=[]
//     this.RegulationCode=[]
//     this.questionPaperForm.get('RegulationCode').setValue('')
//     this.questionPaperForm.get('ExamDate').setValue('')
//     this.questionPaperForm.get('subjectcode').setValue('')
//     for(let i=0;i<this.listExamSubject.length;i++){
//       if(this.listExamSubject[i].group_code==groupCode 
//         && this.listExamSubject[i].course_code==this.questionPaperForm.value.CourseCode 
//         && this.listExamSubject[i].exam_month_yr==this.questionPaperForm.value.ExamMonthYear
//         && this.listExamSubject[i].course_year_code==this.questionPaperForm.value.CourseYear ){
//             this.Regulationcode1.push(this.listExamSubject[i])
//             const RegulationCode = this.Regulationcode1.map(({ regulation_code }) => regulation_code);
//             this.RegulationCode = this.Regulationcode1.filter(({ regulation_code }, index) =>
//                !RegulationCode.includes(regulation_code, index + 1));
// }
//   }
//   this.questionPaperForm.get('RegulationCode').setValue(this.RegulationCode[0].regulation_code) 
//   this.selectedregulationCode(this.questionPaperForm.value.RegulationCode)
//   }
//   selectedregulationCode(Regulationcode){   
//     this.QuestionPapers= []
//     this.examdate1=[]
//     this.ExamDate=[]
//     this.questionPaperForm.get('ExamDate').setValue('')
//     this.questionPaperForm.get('subjectcode').setValue('')
//     for(let i=0;i<this.listExamSubject.length;i++){
//       if(this.listExamSubject[i].regulation_code==Regulationcode 
//         && this.listExamSubject[i].course_code==this.questionPaperForm.value.CourseCode 
//         && this.listExamSubject[i].exam_month_yr==this.questionPaperForm.value.ExamMonthYear
//         && this.listExamSubject[i].course_year_code==this.questionPaperForm.value.CourseYear
//         && this.listExamSubject[i].group_code==this.questionPaperForm.value.CourseGroupCode ){
//         this.examdate1.push(this.listExamSubject[i])
//         const ExamDate = this.examdate1.map(({ exam_dates }) => exam_dates);
//         this.ExamDate = this.examdate1.filter(({ exam_dates }, index) =>
//            !ExamDate.includes(exam_dates, index + 1));
//            this.ExamDate=this.ExamDate.sort((c, d) => new Date(c.exam_dates).getTime() - new Date(d.exam_dates).getTime());

// }
// }
// this.questionPaperForm.get('ExamDate').setValue(this.ExamDate[0].exam_dates) 
// this.selectedDate(this.questionPaperForm.value.ExamDate)
//   }
//   selectedDate(examDate){   
//     this.QuestionPapers= []
//     this.subjectcode1=[]
//     this.subjectcode=[]
//     this.questionPaperForm.get('subjectcode').setValue('')
//     for(let i=0;i<this.listExamSubject.length;i++){
//       if(this.listExamSubject[i].exam_dates==examDate 
//         && this.listExamSubject[i].course_code==this.questionPaperForm.value.CourseCode 
//         && this.listExamSubject[i].exam_month_yr==this.questionPaperForm.value.ExamMonthYear
//         && this.listExamSubject[i].course_year_code==this.questionPaperForm.value.CourseYear
//         && this.listExamSubject[i].group_code==this.questionPaperForm.value.CourseGroupCode
//         && this.listExamSubject[i].regulation_code==this.questionPaperForm.value.RegulationCode
//          ){
//         this.subjectcode1.push(this.listExamSubject[i])
//         const subjectcode = this.subjectcode1.map(({ subject_code }) => subject_code);
//         this.subjectcode = this.subjectcode1.filter(({ subject_code }, index) =>
//            !subjectcode.includes(subject_code, index + 1));
// }
// }
// this.questionPaperForm.get('subjectcode').setValue(this.subjectcode[0].subject_code) 
// }
//   // STOREPROCEDURE FOR GET EXAM QUESTION PAPERS
    getQuestionpapers(): void{
      this.spinner.show()
      this.button=true;
      this.greybutton=false;
  this.dataSource = new MatTableDataSource([]);
  this.QuestionPapers= []
      let empId = +localStorage.getItem('employeeId');
      this.flag = true;
      let request = [
        {paramName: 'in_flag', paramValue: 'list_questionpaper_list'},
        {paramName: 'in_orgid', paramValue:+localStorage.getItem('organizationId')},
        {paramName: 'in_fdate', paramValue: '1990-01-01'},
        {paramName: 'in_tdate', paramValue: '1990-01-01'},
        {paramName: 'in_evalutor_profileid', paramValue:  0},
        {paramName: 'in_exam_date', paramValue: '1990-01-01'},
        {paramName: 'in_emp_id', paramValue:0},
        {paramName: 'in_questionpaper_id', paramValue: 0},
        {paramName: 'in_evaluator_role_id', paramValue: this.EvaluatorRole},
        {paramName: 'in_academic_year', paramValue: ''},
        {paramName: 'in_exam_short_name', paramValue: ''},
        {paramName: 'in_affiliatedto_catdet_id', paramValue: 0},
        {paramName: 'in_exam_id', paramValue: this.questionPaperForm.value.examId},
        {paramName: 'in_course_year_id', paramValue: this.questionPaperForm.value.courseYearId},
        {paramName: 'in_subject_id', paramValue: this.questionPaperForm.value.subjectId},
        {paramName: 'in_regulation_id', paramValue:this.questionPaperForm.value.regulationId},
        {paramName: 'in_course_id', paramValue:0},
        {paramName: 'in_academic_year_id', paramValue:0},
        {paramName: 'in_loginuser_empid', paramValue:empId}
      ];
      this.crudService.getDetailsByRequest(this.getExamEvaluationCodesUrl, '', request, '&')
      .subscribe(result => {
           this.spinner.hide();
           if (result.statusCode === 200){
                if (result.data && result.data !== '' && result.data.result.length > 0) {
                    this.QuestionPapers =  result.data.result[0];
                    if(this.QuestionPapers.filter(x=>x.question_status=='Approved').length>0){
                      this.button=false
                      this.greybutton=true
                    }
                   
                    this.dataSource = new MatTableDataSource(this.QuestionPapers);
                    setTimeout(() => this.dataSource.paginator = this.paginator);
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


getQuestionpaperFilterss(): void{
  let empId = +localStorage.getItem('employeeId');

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
      { paramName: 'in_sub_flag_type', paramValue: 'ALL' },
      { paramName: 'in_param1', paramValue: 0 },
      { paramName: 'in_param2', paramValue: 0 },
    ];
    this.crudService.getDetailsByRequest(this.getExamFiltersBycodeUrl, '', request, '&')
    .subscribe(result => {
       this.spinner.hide();
       if (result.statusCode === 200){
            if (result.data && result.data !== '' && result.data.result.length > 0) {
                // this.listExamSubject =  result.data.result[0];
                this.filtersDetailsList = result.data.result;
                for (let i = 0; i < this.filtersDetailsList.length; i++) {
                  if (this.filtersDetailsList[i].length > 0 && this.filtersDetailsList[i][0].flag === 'univ_exam_filters') {
                    this.listExamSubject = this.filtersDetailsList[i];
                  }
                }
                const CourseCode = this.listExamSubject.map(({ fk_course_id }) => fk_course_id);
                this.CourseCode = this.listExamSubject.filter(({ fk_course_id }, index) =>
                   !CourseCode.includes(fk_course_id, index + 1));
                console.log(this.pageParams,'(this.pageParams');
                
                if (!this.isEmptyObject(this.pageParams) && this.CourseCode.length > 0) {
                  this.questionPaperForm.get('courseId').setValue(+this.pageParams.courseId);
                  this.selectedCourse(this.questionPaperForm.value.courseId);
            
                }else if (this.CourseCode.length > 0){
                  this.questionPaperForm.get('courseId').setValue(this.CourseCode[0].fk_course_id);
                  this.selectedCourse(this.questionPaperForm.value.courseId);
               } 
              //  if (!this.isEmptyObject(this.pageParams)) {
    
                    
              //   this.questionPaperForm.get('courseId').setValue(this.pageParams.courseId);
              //   this.questionPaperForm.get('academicYearId').setValue(this.pageParams.academicYearId);
              //   this.questionPaperForm.get('examId').setValue(this.pageParams.examId);
              //   this.questionPaperForm.get('subjectId').setValue(this.pageParams.subjectId);
              //   this.questionPaperForm.get('regulationId').setValue(this.pageParams.regulationId);

              //   this.selectedCourse(this.pageParams.courseId);
              // this.selectedAcademicYear(this.pageParams.academicYearId);
              // this.selectedExam(this.pageParams.examId);
              // this.selectedSubject(this.pageParams.subjectId);
              // this.selectedregulationCode(this.pageParams.regulationId)
    
              // } else if (this.CourseCode.length > 0) {
              //   this.questionPaperForm.get('courseId').setValue(this.CourseCode[0].fk_course_id);
              //       this.selectedCourse(this.questionPaperForm.value.courseId);
              //       this.questionPaperForm.get('academicYearId').setValue(this.academicYearDetailList[0].fk_academic_year_id);
              //       this.selectedAcademicYear(this.questionPaperForm.value.academicYearId);
              //       this.questionPaperForm.get('examId').setValue(this.examDetailList[0].fk_exam_id);
              //       this.selectedExam(this.questionPaperForm.value.examId);
              //       this.questionPaperForm.get('subjectId').setValue(this.subjectDetails[0].fk_regulation_id);
              //       this.selectedSubject(this.questionPaperForm.value.subjectId);
              //       this.questionPaperForm.get('regulationId').setValue(this.regulationsData[0].fk_regulation_id);
              // }
            
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
selectedCourse(courseId){
this.academicYearDetailList = []
this.academicyearsList = []
this.questionPaperForm.get('academicYearId').setValue('')
this.questionPaperForm.get('examId').setValue('')
this.questionPaperForm.get('courseYearId').setValue(0)
this.questionPaperForm.get('subjectId').setValue('')
this.questionPaperForm.get('regulationId').setValue('')
this.courseYearSubjectDetails = [];
this.courseYears = [];
this.subjectListDetails = [];
this.subjectDuplicateList = [];
this.subjectDetails = [];
this.academicyearsList=this.listExamSubject.filter(x=>(x.fk_course_id== this.questionPaperForm.value.courseId))
const academicyearsList = this.academicyearsList.map(({ fk_academic_year_id }) => fk_academic_year_id);
this.academicYearDetailList = this.academicyearsList.filter(({ fk_academic_year_id }, index) =>
 !academicyearsList.includes(fk_academic_year_id, index + 1));
if (!this.isEmptyObject(this.pageParams) && this.academicYearDetailList.length > 0) {
this.questionPaperForm.get('academicYearId').setValue(+this.pageParams.academicYearId);
this.selectedAcademicYear(this.questionPaperForm.value.academicYearId);

}else
if (this.academicYearDetailList.length > 0){
this.questionPaperForm.get('academicYearId').setValue(this.academicYearDetailList[0].fk_academic_year_id);
this.selectedAcademicYear(this.questionPaperForm.value.academicYearId);
} 
}
selectedAcademicYear(academicYearId){
this.examDetailList = []
this.examList = []
this.questionPaperForm.get('examId').setValue('')
this.questionPaperForm.get('regulationId').setValue('')
this.questionPaperForm.get('courseYearId').setValue(0);
this.questionPaperForm.get('subjectId').setValue('');
this.courseYearSubjectDetails = [];
this.courseYears = [];
this.subjectListDetails = [];
this.subjectDuplicateList = [];
this.subjectDetails = [];
this.examList=this.listExamSubject.filter(x=>(x.fk_course_id== this.questionPaperForm.value.courseId && x.fk_academic_year_id == this.questionPaperForm.value.academicYearId))
const examList = this.examList.map(({ fk_exam_id }) => fk_exam_id);
this.examDetailList = this.examList.filter(({ fk_exam_id }, index) =>
 !examList.includes(fk_exam_id, index + 1));
this.examDuplicateList = this.examDetailList 
if (!this.isEmptyObject(this.pageParams) && this.examDetailList.length > 0) {
this.questionPaperForm.get('examId').setValue(+this.pageParams.examId);
this.selectedExam(this.questionPaperForm.value.examId);

}else
if (this.examDetailList.length > 0){
this.questionPaperForm.get('examId').setValue(this.examDetailList[0].fk_exam_id);
this.selectedExam(this.questionPaperForm.value.examId);
} 
}

searchExam(value) {
this.examDuplicateList = []
this.searchExamData(value);
}
searchExamData(value: string) {
let filter = value.toLowerCase();
for (let i = 0; i < this.examDetailList.length; i++) {
let option = this.examDetailList[i];
if (option.exam_name.toLowerCase().indexOf(filter) >= 0) {
  this.examDuplicateList.push(option);
}
}
}
selectedExam(examId){
this.questionPaperForm.get('regulationId').setValue('')
this.questionPaperForm.get('courseYearId').setValue(0);
this.questionPaperForm.get('subjectId').setValue('');
this.filtersDetailsList = []
this.courseYearSubjectDetails = [];
this.courseYears = [];
this.subjectListDetails = [];
this.subjectDuplicateList = [];
this.subjectDetails = [];
let request = [
{ paramName: 'in_flag', paramValue: 'univ_exam_rest_regulations' },
{ paramName: 'in_flag_type', paramValue: 'ALL' }, 
{ paramName: 'in_university_id', paramValue: 0 },
{ paramName: 'in_college_id', paramValue: 0 },
{ paramName: 'in_course_id', paramValue: this.questionPaperForm.value.courseId },
{ paramName: 'in_course_group_id', paramValue: 0 },
{ paramName: 'in_course_year_id', paramValue: 0 },
{ paramName: 'in_exam_id', paramValue: 0 },
{ paramName: 'in_academic_year_id', paramValue: 0 },
{ paramName: 'in_regulation_id', paramValue: 0 },
{ paramName: 'in_subject_id', paramValue: 0 },
{ paramName: 'in_loginuser_empid', paramValue: +localStorage.getItem('employeeId') },
{ paramName: 'in_loginuser_roleid', paramValue: 0 },
{ paramName: 'in_sub_flag_type', paramValue: 'NoLAB' },
{ paramName: 'in_param1', paramValue: 0 },
{ paramName: 'in_param2', paramValue: 0 },
];
this.crudService.getDetailsByRequest(this.getExamFiltersBycodeUrl, '', request, '&')
.subscribe(result => {
 this.spinner.hide();
 if (result.statusCode === 200){
      if (result.data && result.data !== '' && result.data.result.length > 0) {
          // this.listExamSubject =  result.data.result[0];
          this.filtersDetailsList = result.data.result;
          for (let i = 0; i < this.filtersDetailsList.length; i++) {
            if (this.filtersDetailsList[i].length > 0 && this.filtersDetailsList[i][0].flag === 'regulations') {
              this.regulationListDetails = this.filtersDetailsList[i];
            }
          }
          this.regulations=this.regulationListDetails
          const regulations = this.regulations.map(({ fk_regulation_id }) => fk_regulation_id);
          this.regulationsData = this.regulations.filter(({ fk_regulation_id }, index) =>
             !regulations.includes(fk_regulation_id, index + 1));
          if (!this.isEmptyObject(this.pageParams) && this.regulationsData.length > 0) {
            this.questionPaperForm.get('regulationId').setValue(+this.pageParams.regulationId);
            this.selectedregulationCode(this.questionPaperForm.value.regulationId);
        
          }else
          if (this.regulationsData.length > 0){
            this.questionPaperForm.get('regulationId').setValue(this.regulationsData[0].fk_regulation_id);
            this.selectedregulationCode(this.questionPaperForm.value.regulationId);
         } 
      } else {
          // this.snotifyService.success(result.message, 'Success!');  
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
selectedregulationCode(value){
this.questionPaperForm.get('courseYearId').setValue(0);
this.questionPaperForm.get('subjectId').setValue('');
this.courseYearSubjectDetails = [];
this.courseYears = [];
this.subjectListDetails = [];
this.subjectDuplicateList = [];
this.subjectDetails = [];
let request = [
  { paramName: 'in_flag', paramValue: 'univ_exam_subject_uc' },
  { paramName: 'in_flag_type', paramValue: 'ALL' }, 
  { paramName: 'in_university_id', paramValue: 0 },
  { paramName: 'in_college_id', paramValue: 0 },
  { paramName: 'in_course_id', paramValue: this.questionPaperForm.value.courseId },
  { paramName: 'in_course_group_id', paramValue: 0 },
  { paramName: 'in_course_year_id', paramValue: 0 },
  { paramName: 'in_exam_id', paramValue: this.questionPaperForm.value.examId },
  { paramName: 'in_academic_year_id', paramValue: this.questionPaperForm.value.academicYearId },
  { paramName: 'in_regulation_id', paramValue: this.questionPaperForm.value.regulationId },
  { paramName: 'in_subject_id', paramValue: 0 },
  { paramName: 'in_loginuser_empid', paramValue: +localStorage.getItem('employeeId') },
  { paramName: 'in_loginuser_roleid', paramValue: 0 },
  { paramName: 'in_sub_flag_type', paramValue: 'NoLAB' },
  { paramName: 'in_param1', paramValue: 0 },
  { paramName: 'in_param2', paramValue: 0 },
  ];
  this.crudService.getDetailsByRequest(this.getExamFiltersBycodeUrl, '', request, '&')
  .subscribe(result => {
   this.spinner.hide();
   if (result.statusCode === 200){
        if (result.data && result.data !== '' && result.data.result.length > 0) {
            // this.listExamSubject =  result.data.result[0];
            this.filtersDetailsList = result.data.result;
            for (let i = 0; i < this.filtersDetailsList.length; i++) {
              if (this.filtersDetailsList[i].length > 0 && this.filtersDetailsList[i][0].flag === 'univ_exam_sub_uc') {
                this.courseYearSubjectDetails = this.filtersDetailsList[i];
              }
            }
            if(this.courseYearSubjectDetails.length>0){
              const courseYearSubjectDetails = this.courseYearSubjectDetails.map(({ fk_course_year_id }) => fk_course_year_id);
              this.courseYears = this.courseYearSubjectDetails.filter(({ fk_course_year_id }, index) => !courseYearSubjectDetails.includes(fk_course_year_id, index + 1));
              
              }
              if (!this.isEmptyObject(this.pageParams) && this.courseYears.length > 0) {
                this.questionPaperForm.get('courseYearId').setValue(+this.pageParams.courseYearId);
                this.selectedYear(this.questionPaperForm.value.courseYearId);
              }else
              if (this.courseYears.length > 0){
               this.questionPaperForm.get('courseYearId').setValue(0);
               this.selectedYear(this.questionPaperForm.value.courseYearId)
            }            
        } else {
            // this.snotifyService.success(result.message, 'Success!');  
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
selectedYear(courseYearId){
  this.questionPaperForm.get('subjectId').setValue('');
  this.subjectListDetails = [];
  this.subjectDuplicateList = [];
  this.subjectDetails = [];
  if(courseYearId === 0){
      this.subjectListDetails = this.courseYearSubjectDetails
  }else{
      this.subjectListDetails = this.courseYearSubjectDetails.filter(x => (x.fk_course_year_id === this.questionPaperForm.value.courseYearId))
  }
      if(this.subjectListDetails.length>0){
              const subjectListDetails = this.subjectListDetails.map(({ fk_subject_id }) => fk_subject_id);
              this.subjectDetails = this.subjectListDetails.filter(({ fk_subject_id }, index) => !subjectListDetails.includes(fk_subject_id, index + 1));
              
              this.subjectDuplicateList = this.subjectDetails
              }
              if (!this.isEmptyObject(this.pageParams) && this.subjectDetails.length > 0) {
                this.questionPaperForm.get('subjectId').setValue(+this.pageParams.subjectId);
                this.selectedSubject(this.questionPaperForm.value.subjectId);
            
              }else
              if (this.subjectDetails.length > 0){
               this.questionPaperForm.get('subjectId').setValue(this.subjectDetails[0].fk_subject_id);
               this.selectedSubject(this.questionPaperForm.value.subjectId)
            }      
}
searchSubject(value) {
this.subjectDuplicateList = []
this.search(value);
}
search(value: string) {
let filter = value.toLowerCase();
for (let i = 0; i < this.subjectDetails.length; i++) {
  let option = this.subjectDetails[i];
  if (option.subject_name.toLowerCase().indexOf(filter) >= 0) {
    this.subjectDuplicateList.push(option);
  } else if (option.subject_code.toLowerCase().indexOf(filter) >= 0){
    this.subjectDuplicateList.push(option);
  }
}
}

selectedSubject(subjectId){
this.getQuestionpapers();
}

applyFilter(filterValue: string) {
  this.dataSource.filter = filterValue.trim().toLowerCase();

  if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
  }
}

Finalize(): void {
  this.randomValue = null;
  this.numbers=[]
  for(let i=0;i<this.QuestionPapers.length;i++){
    this.numbers.push(this.QuestionPapers[i].pk_exam_questionpaper_id)

   }
  const randomIndex = Math.floor(Math.random() * this.numbers.length);
    this.randomValue = this.numbers[randomIndex];

    for(let i=0;i<this.QuestionPapers.length;i++){
      if(this.randomValue == this.QuestionPapers[i].pk_exam_questionpaper_id){
        this.queid=this.QuestionPapers[i].pk_exam_questionpaper_id
          this.data= {
              organizationId :this.QuestionPapers[i].organizationId,
              examMonthYear : this.QuestionPapers[i].exam_month_yr,
              courseCode :this.QuestionPapers[i].coursecode,
              courseYearCode :this.QuestionPapers[i].courseyearcode,
              courseYearId : this.QuestionPapers[i].fk_course_year_id,
              courseGroupCodes : this.QuestionPapers[i].coursegroupcodes,
              regulationCode :this.QuestionPapers[i].regulationcode,
              subjectCode :this.QuestionPapers[i].subjectcode,
              examDate :this.QuestionPapers[i].exam_date,
              questionPaperTitle :this.QuestionPapers[i].questionpaper_title,
              setNumber : this.QuestionPapers[i].setnumber,
              passMarks :this.QuestionPapers[i].passmarks,
              totalMarks :this.QuestionPapers[i].totalmarks,
              totalQuestions :this.QuestionPapers[i].totalquestions,
              preparedByEmpId :this.QuestionPapers[i].fk_preparedby_emp_id,
              preparedDate :this.QuestionPapers[i].prepared_date,
              questionPaperStatusCatDetId :623,
              statusComments : this.QuestionPapers[i].status_comments,
              isApproved :this.QuestionPapers[i].is_approved,
              approvedByEmpId :this.QuestionPapers[i].approvedByEmpId,
              questionPaperPath:this.QuestionPapers[i].questionpaper_path,
              modelAnswerSheetPath:this.QuestionPapers[i].modelanswersheet_path,
              approvedDate :this.QuestionPapers[i].approvedDate,
              isActive :this.QuestionPapers[i].is_active,
          }
      }
     }
    this.crudService.updateDetails(this.ExamQuestionPaperCrudUrl,this.data,this.queid,'questionPaperId')
.subscribe(result => {
    this.spinner.hide();
    if (result.statusCode === 200){
        if (result.data && result.data !== '') {
            this.snotifyService.success(result.message, 'Success!'); 
            this.getQuestionpapers()     
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
