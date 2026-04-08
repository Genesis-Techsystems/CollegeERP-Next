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
import { SecurityCodeComponent } from './security-code/security-code.component';

@Component({
  selector: 'app-published-exam-question-paper',
  templateUrl: './published-exam-question-paper.component.html',
  styleUrls: ['./published-exam-question-paper.component.scss']
})
export class PublishedExamQuestionPaperComponent implements OnInit {
  displayedColumns: string[] = ['id','coursegroupcodes','courseyearcode','SubjectName','QuestionPaper','Actions'];
  dataSource: MatTableDataSource<any>;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatRipple) ripple: MatRipple;
  button=true;
  greybutton=false;
  private EvaluatorRole=CONSTANTS.EvaluatorRole;
  private getExamFiltersBycodeUrl = CONSTANTS.getExamFiltersBycodeUrl;
  private generateSecretCodeUrl = CONSTANTS.generateSecretCodeUrl;
  private examQuestionPaperDetailsUrl=CONSTANTS.examQuestionPaperDetailsUrl;
  private validateSecretCodeUrl=CONSTANTS.validateSecretCodeUrl;

  miniopath = CONSTANTS.MINIO
  examQuestionpapers: any[] = [];
  questionPaperFilterForm: FormGroup;
  flag:boolean;
  listExamSubject: any;
  monthYear=[];
  courseCode: any;
  courseyearcode: any;
  questionPaperForm: FormGroup;
  subjectcode: any;
  RegulationCode : any [];
  ExamDate : any [];
  CourseGroupCode : any [];
  monthYear1=[];
  step : any
  QuestionPapers: any;
  courseyearcode1: any [];
  subjectcode1: any[];
  Groupcode1: any[];
  Regulationcode1: any[];
  examdate1: any;
  groupCode1: any[];
  CourseCode: any;
  pageParams: any = {};
  randomValue: number | null = null;
  numbers=[];
  queid: any;
  data: { organizationId: any; examMonthYear: any; courseCode: any; courseYearCode: any; courseGroupCodes: any; regulationCode: any; subjectCode: any; examDate: any; questionPaperTitle: any; setNumber: any; passMarks: any; totalMarks: any; totalQuestions: any; preparedByEmpId: any; preparedDate: any; questionPaperStatusCatDetId: number; statusComments: any; isApproved: any; approvedByEmpId: any; questionpaperpath: any; modelanswerpaperpath: any; approvedDate: any; isActive: any; };
  monthYearDuplicateList: any[];
  ExamDateDuplicateList: any[];
  ProfileId: number;
  empId: number;
  code: string;
  questionpath: boolean;
  QuestionPath='';
  id: any;
  examDataList = [];
  examList = [];
  examDuplicateList = [];
  filtersDetailsList: any;
  academicYearDetailList: any[];
  academicyearsList: any[];
  examDetailList: any[];

  constructor(private route: ActivatedRoute, private formBuilder: FormBuilder, private router: Router, private dialog: MatDialog, private snotifyService: SnotifyService,
              private crudService: CrudService, private spinner: NgxSpinnerService, private genericFunctions: GenericFunctions,) {
  }
   ngOnInit() {
    this.ProfileId=+localStorage.getItem('examEvaluatorProfileId')
    this.empId=+localStorage.getItem('employeeId')
    this.QuestionPapers = [];
    this.questionPaperFilterForm = this.formBuilder.group({
        in_orgid:[+localStorage.getItem('organizationId')],
        in_fdate:['1990-01-01'],
        in_tdate:['1990-01-01'],
        in_exam_month_yr:[''],
        in_course_code:[''],
        in_course_year_code:[''],
        in_subject_code:[''],
        in_evalutor_profileid:[0],
        in_exam_date:['1990-01-01'],
        in_regulation_code:[''],
        in_emp_id:[0],
        in_questionpaper_id:[0],
      });
      this.questionPaperForm = this.formBuilder.group({
        questionPaperId :[''],
        courseId:['', Validators.required],
        examId:['', Validators.required],
        academicYearId:['', Validators.required],
        ExamMonthYear:[''],
        CourseYear:['', ],
        subjectcode:['', ],
        RegulationCode :  ['',],
        ExamDate : [''],
        CourseGroupCode : ['', ],
  })
  this.route.queryParams
  .subscribe(params => {
    this.pageParams = params;
  });
    this.dataSource = new MatTableDataSource(this.examQuestionpapers);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  this.getQuestionpaperFilters();
   
   }

   isEmptyObject(obj) {
    return (obj && (Object.keys(obj).length === 0));
  }

// STORE PROCEDURE FOR FILTERS
   getQuestionpaperFilters(): void{
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
this.questionPaperForm.get('examId').setValue('')
this.questionPaperForm.get('academicYearId').setValue('')
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
  searchExam(value) {
    this.examDuplicateList = []
    this.searchExamData(value);
  }
  searchExamData(value: string) {
    let filter = value.toLowerCase();
    for (let i = 0; i < this.examList.length; i++) {
      let option = this.examList[i];
      if (option.exam_name.toLowerCase().indexOf(filter) >= 0) {
        this.examDuplicateList.push(option);
      }
    }
  }
// selectedCourse(courseCodeId){
//   this.flag=false;
//     this.monthYear=[];
//     this.monthYear1=[];
//     this.monthYearDuplicateList=[];
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
//                     this.monthYear = this.monthYear.sort((a, b) => new Date(b.exam_month_yr).getTime() - new Date(a.exam_month_yr).getTime());
//                     this.monthYearDuplicateList = this.monthYear.sort((a, b) => new Date(b.exam_month_yr).getTime() - new Date(a.exam_month_yr).getTime());
//               }
//     }
//     this.questionPaperForm.get('ExamMonthYear').setValue(this.monthYear[0].exam_month_yr)
//     this.selectedMonthyr(this.questionPaperForm.value.ExamMonthYear)
//   }

  // selectedMonthyr(exam_month_yr){ 
  //   this.flag=false 
  //     this.examdate1=[]
  //     this.ExamDate=[]
  //     this.ExamDateDuplicateList=[]
  //     if (this.isEmptyObject(this.pageParams)){
  //     this.questionPaperForm.get('ExamDate').setValue('')
  //     }
  //     for(let i=0;i<this.listExamSubject.length;i++){
  //       if(this.listExamSubject[i].exam_month_yr==exam_month_yr 
  //         && this.listExamSubject[i].course_code==this.questionPaperForm.value.CourseCode 
  //        ){
  //         this.examdate1.push(this.listExamSubject[i])
  //         const ExamDate = this.examdate1.map(({ exam_date }) => exam_date);
  //         this.ExamDate = this.examdate1.filter(({ exam_date }, index) =>
  //            !ExamDate.includes(exam_date, index + 1));
  //            this.ExamDate = this.ExamDate.sort((a, b) => new Date(b.exam_date).getTime() - new Date(a.exam_date).getTime());
  //            this.ExamDateDuplicateList = this.ExamDate.sort((a, b) => new Date(b.exam_date).getTime() - new Date(a.exam_date).getTime());

  // }
  //   }
  // this.questionPaperForm.get('ExamDate').setValue(this.ExamDate[0].exam_date)
  // }

  // searchMonthYear(value) {
  //   this.monthYearDuplicateList = []
  //   this.searchMonthYears(value);
  // }
  // searchMonthYears(value: string) {
  //   let filter = value.toLowerCase();
  //   for (let i = 0; i < this.monthYear.length; i++) {
  //     let option = this.monthYear[i];
  //     if (option.exam_month_yr.toLowerCase().indexOf(filter) >= 0) {
  //       this.monthYearDuplicateList.push(option);
  //     }
  //   }
  // }
  // searchExamDate(value) {
  //   this.ExamDateDuplicateList = []
  //   this.searchExamDates(value);
  // }
  // searchExamDates(value: string) {
  //   let filter = value.toLowerCase();
  //   for (let i = 0; i < this.ExamDate.length; i++) {
  //     let option = this.ExamDate[i];
  //     if (option.exam_date.toLowerCase().indexOf(filter) >= 0) {
  //       this.ExamDateDuplicateList.push(option);
  //     }
  //   }
  // }
  // selectedCourseYr(courseYr){
  //   this.flag=false
  // this.groupCode1=[]
  //   this.CourseGroupCode=[]
  //   this.questionPaperForm.get('CourseGroupCode').setValue('')
  //   for(let i=0;i<this.listExamSubject.length;i++){
  //     if(this.listExamSubject[i].course_year_code==courseYr 
  //       && this.listExamSubject[i].course_code==this.questionPaperForm.value.CourseCode 
  //        && this.listExamSubject[i].exam_month_yr==this.questionPaperForm.value.ExamMonthYear){
  //           this.groupCode1.push(this.listExamSubject[i])
  //           const CourseGroupCode = this.groupCode1.map(({ group_code }) => group_code);
  //           this.CourseGroupCode = this.groupCode1.filter(({ group_code }, index) =>
  //              !CourseGroupCode.includes(group_code, index + 1))
  //           }
  //       }
  //   }

//   selectedgroupCode(groupCode){
//     this.flag=false
//     this.Regulationcode1=[]
//     this.RegulationCode=[]
//     this.questionPaperForm.get('RegulationCode').setValue('')
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
//   }
//   selectedregulationCode(Regulationcode){ 
//    this.flag=false
//     this.examdate1=[]
//     this.ExamDate=[]
//     this.questionPaperForm.get('ExamDate').setValue('')
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
//   }
//   selectedDate(examDate){  
//   this.flag=false
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
// }
selectedExam(examId){
  this.QuestionPapers = [];
  this.dataSource = new MatTableDataSource([]);
}
getQuestionpapers(questionpath){
  this.spinner.show()
  this.flag=true
  this.QuestionPapers=[]
  this.dataSource = new MatTableDataSource([]);
let request = [
  {paramName: 'in_flag', paramValue: 'list_questionpaper_incharge'},
  {paramName: 'in_orgid', paramValue:  this.questionPaperFilterForm.value.in_orgid},
  {paramName: 'in_fdate', paramValue: '1990-01-01'},
  {paramName: 'in_tdate', paramValue: '1990-01-01'},
  {paramName: 'in_exam_questionpaper_template_id', paramValue: 1},
  {paramName: 'in_exam_questionpaper_id', paramValue: 0},
  // this.questionPaperForm.value.ExamMonthYear
  // {paramName: 'in_exam_month_yr', paramValue:''},
  {paramName: 'in_exam_id', paramValue: this.questionPaperForm.value.examId},
  {paramName: 'in_course_year_id', paramValue: 0},
  {paramName: 'in_subject_id', paramValue: 0},
  {paramName: 'in_evalutor_profileid', paramValue: 0},
  // this.questionPaperForm.value.ExamDate
 {paramName: 'in_exam_date', paramValue:'1990-01-01'},
  {paramName: 'in_regulation_id', paramValue: 0},
 {paramName: 'in_emp_id', paramValue: this.empId},
 {paramName: 'in_questionpaper_id', paramValue: 0},
 {paramName: 'in_evaluator_role_id', paramValue: 0},
 {paramName: 'in_exam_evaluationassignment_id', paramValue: 0},
 
]
this.crudService.getDetailsByRequest(this.examQuestionPaperDetailsUrl, '', request, '&')
.subscribe(result =>  {
    this.spinner.hide();
    if (result.statusCode === 200) {
      if(result.success==true){
        if (result.data.result && result.data.result !== '') {
          this.QuestionPapers = result.data.result[0];
          this.dataSource = new MatTableDataSource(this.QuestionPapers);
          setTimeout(()=>this.dataSource.paginator = this.paginator);
           this.dataSource.sort = this.sort;
           if(questionpath==true){
            for(let i=0;i<this.QuestionPapers.length;i++){
                if(this.QuestionPapers[i].pk_examquestionpaper_college_id==this.id){
                  this.QuestionPapers[i].questionpaper_path=this.QuestionPath
                  this.dataSource = new MatTableDataSource(this.QuestionPapers);
                  setTimeout(()=>this.dataSource.paginator = this.paginator);
                   this.dataSource.sort = this.sort;
                }
            }
           
           }
          
        }
      }
       else {
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

  // STOREPROCEDURE FOR GET EXAM QUESTION PAPERS
//     getQuestionpapers(): void{
//   this.QuestionPapers= []
//     if ( this.questionPaperForm.valid){
//       this.flag = true;
//       this.crudService.listBySeventeenIds(this.getExamEvaluationCodesUrl, 
//            'list_questionpaper_list' ,
//            this.questionPaperFilterForm.value.in_orgid, 
//          this.questionPaperFilterForm.value.in_fdate, 
//          this.questionPaperFilterForm.value.in_tdate, 
//          this.questionPaperForm.value.ExamMonthYear, 
//          this.questionPaperForm.value.CourseCode,
//          this.questionPaperForm.value.CourseYear, 
//          '',
//          this.questionPaperFilterForm.value.in_evalutor_profileid,
//          this.questionPaperForm.value.ExamDate,
//          '',
//          this.questionPaperFilterForm.value.in_emp_id, 
//          this.questionPaperFilterForm.value.in_questionpaper_id , 
//          this.EvaluatorRole,'','',1,


//          'in_flag', 'in_orgid' ,'in_fdate', 'in_tdate', 'in_exam_month_yr', 'in_course_code', 'in_course_year_code','in_subject_code', 'in_evalutor_profileid','in_exam_date','in_regulation_code','in_emp_id','in_questionpaper_id','in_evaluator_role_id','in_academic_year','in_exam_short_name','in_affiliatedto_catdet_id'
//           )
//        .subscribe(result => {
//            this.spinner.hide();
//            if (result.statusCode === 200){
//                 if (result.data && result.data !== '' && result.data.result.length > 0) {
//                     let QuestionPapers1 =  result.data.result[0];
//                     this.QuestionPapers = QuestionPapers1.filter(x=>x.question_status=='Approved');
//                     this.dataSource = new MatTableDataSource(this.QuestionPapers);
//                     setTimeout(()=>this.dataSource.paginator = this.paginator);
//                     this.dataSource.sort = this.sort;                   
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

applyFilter(filterValue: string) {
  this.dataSource.filter = filterValue.trim().toLowerCase();

  if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
  }
}


  openFile(path): void{
    window.open(this.miniopath+path,'_blank','width=700,height=600');
  }
  openDialog(row){
    const dialogRef = this.dialog.open(SecurityCodeComponent, {
      width: '30%',
      data: {}
  });
  dialogRef.afterClosed().subscribe(details => {
    if (details != null && details !== ''){ 
   const obj={
    code:btoa(details),
    examQuestionPaperCollegeId:row.pk_examquestionpaper_college_id,
    empId:row.fk_publishedby_emp_id
   }
   this.validateCOde(obj)
    }  
  });
}
validateCOde(obj){

   let request = [
      {paramName: 'code', paramValue: obj.code},
      {paramName: 'examQuestionPaperCollegeId', paramValue: obj.examQuestionPaperCollegeId},
      {paramName: 'empId', paramValue: obj.empId},
      // {paramName: 'in_exam_month_yr', paramValue: this.remunerationForm.value.ExamMonthYear},
     
    ];
    this.crudService.getDetailsByRequest(this.validateSecretCodeUrl, '', request, '&')
  .subscribe(result => {
      this.spinner.hide();
      if (result.statusCode === 200){
          if (result.data && result.data !== '') {
              this.snotifyService.success(result.message, 'Success!');
              if(result.data!='Secret Code is Expired'){
                this.questionpath=true
                this.QuestionPath=result.data
                this.id=obj.examQuestionPaperCollegeId
                this.getQuestionpapers(this.questionpath);
              }
              else{
                this.questionpath=false
                this.getQuestionpapers(this.questionpath);
                this.snotifyService.success(result.message, 'Success!');
              }
              
           }
           else{
            this.questionpath=false
            this.getQuestionpapers(this.questionpath);
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


generatePassCode(row){
  const obj={
    examQuestionPaperCollegeId:row.pk_examquestionpaper_college_id,
    empId:row.fk_publishedby_emp_id,
    examName:row.exam_name,
    subjectName:row.subject_name,
    subjectCode:row.subjectcode,
    examDate:row.exam_date,
  }
  this.crudService.add(this.generateSecretCodeUrl, obj)
  .subscribe(result => {
    this.spinner.hide();
    if (result.statusCode === 200) {
      if (result.data && result.data !== '') {
        this.snotifyService.success(result.message, 'Success!');
        
        this.getQuestionpapers(false);
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
}

  

