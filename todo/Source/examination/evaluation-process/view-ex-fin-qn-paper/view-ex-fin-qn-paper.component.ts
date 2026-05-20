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
import { ConfirmModalComponent } from './confirm-modal/confirm-modal.component';
import { ViewPublishedListComponent } from './view-published-list/view-published-list.component';
import * as moment from 'moment';

@Component({
  selector: 'app-view-ex-fin-qn-paper',
  templateUrl: './view-ex-fin-qn-paper.component.html',
  styleUrls: ['./view-ex-fin-qn-paper.component.scss']
})
export class ViewExFinQnPaperComponent implements OnInit {
 displayedColumns: string[] = ['id','SubjectName','QuestionPaper','published_date','published_time','questionpaper_path','Actions',];
  dataSource: MatTableDataSource<any>;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatRipple) ripple: MatRipple;
  button=true;
  greybutton=false;
  private EvaluatorRole=CONSTANTS.EvaluatorRole;
  private getExamEvaluationCodesUrl = CONSTANTS.getExamEvaluationCodesUrl;
  private ExamQuestionPaperCrudUrl = CONSTANTS.ExamQuestionPaperCrudUrl;
  private AddExamQuestionPaperCollegesList=CONSTANTS.AddExamQuestionPaperCollegesList;
  private examQuestionPaperDetailsUrl=CONSTANTS.examQuestionPaperDetailsUrl
  miniopath = CONSTANTS.MINIO
private getExamFiltersBycodeUrl=CONSTANTS.getExamFiltersBycodeUrl

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
  monthYearDuplicateList=[]
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
  details: any;
  timetable_det_ids: any;
  publishdata=[];
  publishedList=[];
  empId: any;
  ExamDateDuplicateList=[];
  RolesList=[];
  EmployeeList=[];
  ProfileId: any;
  examDataList = [];
  examList = [];
  examDuplicateList = [];
  filtersDetailsList: any;
  academicyearsList: any[];
  academicYearDetailList: any[];
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
        academicYearId:['', Validators.required],
        examId:['', Validators.required],
        CourseYear:['', ],
        subjectcode:['', ],
        RegulationCode :  ['',],
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


  selectedExam(examId){
    this.QuestionPapers = [];
    this.dataSource = new MatTableDataSource([]);
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
  searchExamDate(value) {
    this.ExamDateDuplicateList = []
    this.searchExamDates(value);
  }
  searchExamDates(value: string) {
    let filter = value.toLowerCase();
    for (let i = 0; i < this.ExamDate.length; i++) {
      let option = this.ExamDate[i];
      if (option.exam_date.toLowerCase().indexOf(filter) >= 0) {
        this.ExamDateDuplicateList.push(option);
      }
    }
  }
//   selectedCourseYr(courseYr){
// this.groupCode1=[]
//     this.CourseGroupCode=[]
//     this.questionPaperForm.get('CourseGroupCode').setValue('')
//     for(let i=0;i<this.listExamSubject.length;i++){
//       if(this.listExamSubject[i].course_year_code==courseYr 
//         && this.listExamSubject[i].fk_course_id==this.questionPaperForm.value.courseId 
//          && this.listExamSubject[i].exam_month_yr==this.questionPaperForm.value.ExamMonthYear){
//             this.groupCode1.push(this.listExamSubject[i])
//             const CourseGroupCode = this.groupCode1.map(({ group_code }) => group_code);
//             this.CourseGroupCode = this.groupCode1.filter(({ group_code }, index) =>
//                !CourseGroupCode.includes(group_code, index + 1))
//             }
//         }
//     }

//   selectedgroupCode(groupCode){
//     this.flag=false;
//     this.Regulationcode1=[]
//     this.RegulationCode=[]
//     this.questionPaperForm.get('RegulationCode').setValue('')
//     for(let i=0;i<this.listExamSubject.length;i++){
//       if(this.listExamSubject[i].group_code==groupCode 
//         && this.listExamSubject[i].fk_course_id==this.questionPaperForm.value.courseId 
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
//     this.examdate1=[]
//     this.ExamDate=[]
//     this.questionPaperForm.get('ExamDate').setValue('')
//     for(let i=0;i<this.listExamSubject.length;i++){
//       if(this.listExamSubject[i].regulation_code==Regulationcode 
//         && this.listExamSubject[i].fk_course_id==this.questionPaperForm.value.courseId 
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
//     this.subjectcode1=[]
//     this.subjectcode=[]
//     this.questionPaperForm.get('subjectcode').setValue('')
//     for(let i=0;i<this.listExamSubject.length;i++){
//       if(this.listExamSubject[i].exam_dates==examDate 
//         && this.listExamSubject[i].fk_course_id==this.questionPaperForm.value.courseId 
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
  // STOREPROCEDURE FOR GET EXAM QUESTION PAPERS
    getQuestionpapers(): void{
  this.QuestionPapers= []
  this.spinner.show();
    if ( this.questionPaperForm.valid){
      let empId = +localStorage.getItem('employeeId');
      this.flag = true;
      let request = [
        {paramName: 'in_flag', paramValue: 'list_questionpaper_list'},
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
        {paramName: 'in_exam_id', paramValue: this.questionPaperForm.value.examId},
        {paramName: 'in_course_year_id', paramValue: 0},
        {paramName: 'in_subject_id', paramValue:0},
        {paramName: 'in_regulation_id', paramValue:0},
        {paramName: 'in_course_id', paramValue:this.questionPaperForm.value.courseId},
        {paramName: 'in_academic_year_id', paramValue:0},
        {paramName: 'in_loginuser_empid', paramValue:empId} 
      ];
      this.crudService.getDetailsByRequest(this.getExamEvaluationCodesUrl, '', request, '&')
      // this.crudService.listByEighteenIds(this.getExamEvaluationCodesUrl, 
      //      'list_questionpaper_list' ,
      //      this.questionPaperFilterForm.value.in_orgid, 
      //    this.questionPaperFilterForm.value.in_fdate, 
      //    this.questionPaperFilterForm.value.in_tdate, 
      //    this.questionPaperForm.value.ExamMonthYear, 
      //    this.questionPaperForm.value.courseId,
      //    this.questionPaperForm.value.CourseYear, 
      //    '',
      //    this.questionPaperFilterForm.value.in_evalutor_profileid,
      //    this.questionPaperForm.value.ExamDate,
      //    '',
      //    this.questionPaperFilterForm.value.in_emp_id, 
      //    this.questionPaperFilterForm.value.in_questionpaper_id , 
      //    this.EvaluatorRole,'','',1,empId,
      //    'in_flag', 'in_orgid' ,'in_fdate', 'in_tdate', 'in_exam_month_yr', 'in_course_code', 'in_course_year_code','in_subject_code', 'in_evalutor_profileid','in_exam_date','in_regulation_code','in_emp_id','in_questionpaper_id','in_evaluator_role_id','in_academic_year',
      //    'in_exam_short_name','in_affiliatedto_catdet_id','in_loginuser_empid'
      //     )
       .subscribe(result => {
           this.spinner.hide();
           if (result.statusCode === 200){
                if (result.data && result.data !== '' && result.data.result.length > 0) {
                    let QuestionPapers1 =  result.data.result[0];
                    // if(this.QuestionPapers.filter(x=>x.question_status=='Approved').length>0){
                    //   this.button=false
                    //   this.greybutton=true
                    // }
                    // for(let i=0;i<this.QuestionPapers.length;i++){
                    //  this.numbers.push(this.QuestionPapers[i].pk_exam_questionpaper_id)

                    // }
                    this.QuestionPapers = QuestionPapers1.filter(x=>x.question_status=='Approved');
                    this.dataSource = new MatTableDataSource(this.QuestionPapers);
                    setTimeout(()=>this.dataSource.paginator = this.paginator);
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

applyFilter(filterValue: string) {
  this.dataSource.filter = filterValue.trim().toLowerCase();

  if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
  }
}

  openFile(path): void{
    window.open(this.miniopath+path,'_blank','width=700,height=600');
  }
  openDialog(row: any){
    
    this.details=row
    const dialogRef = this.dialog.open(ConfirmModalComponent, {
      width: '30%',
      data: row
  });
  dialogRef.afterClosed().subscribe(details => {
    // this.timetable_det_ids=[]
    this.publishdata=[]
    if (details != null && details !== ''){ 
      const publishedDate = new Date(moment(this.details.published_datetime).format())
      this.timetable_det_ids=this.details.fk_exam_timetable_ids.split(',')
      for(let k=0;k<this.timetable_det_ids.length;k++){
        this.publishdata.push({
            examQuestionPaperId:this.details.pk_exam_questionpaper_id,
            subjectId:this.details.fk_subject_id,
            isPublished:true,
            publishedDate:publishedDate,
            questionPaperPath:this.details.questionpaper_path,
            isActive:this.details.is_active,
            examTimeTableId:this.timetable_det_ids[k],
            publishedByEmpId:this.empId,
            downloadedByEmpId:this.empId,
          // publishedByEvaluatorProfileId:this.details.subjectcode,
          // questionpaperCollectorProfile1Id:this.details.subjectcode,
          //   collectorProfile1SecretCode:this.details.subjectcode,
          //  collectorProfile1Accepted:this.details.subjectcode,
          //   collectorProfile1Comments:this.details.subjectcode,
          // questionPaperCollectorProfile2Id:this.details.subjectcode,
          //   collectorProfileSecretCode:this.details.subjectcode,
          //  collectorProfile2Accepted:this.details.subjectcode,
          //   collectorProfileComments:this.details.subjectcode,
          // questionPaperCollectorProfile3Id:this.details.subjectcode,
          //   collectorProfile3SecretCode:this.details.subjectcode,
          //  collectorProfile3Accepted:this.details.subjectcode,
          //   collectorProfile3Comments:this.details.subjectcode,
          //  questionPaperDownloaded:this.details.subjectcode,
          // questionPaperDownloadedOn:this.details.subjectcode,
          // downloadedByEvaluatorProfileId:this.details.subjectcode,
        })
        }
        this.crudService.add(this.AddExamQuestionPaperCollegesList , this.publishdata)
        .subscribe(result => {
            this.spinner.hide();
            if (result.statusCode === 200){
                // if (result.data && result.data !== '') {
                    this.snotifyService.success(result.message, 'Success!');
                    this.getQuestionpapers()
                    
                // }
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
});
}
ViewDialog(row: any){
  let request = [
    {paramName: 'in_flag', paramValue: 'list_questionpaper_publish'},
    {paramName: 'in_orgid', paramValue:  this.questionPaperFilterForm.value.in_orgid},
    {paramName: 'in_fdate', paramValue: '1990-01-01'},
    {paramName: 'in_tdate', paramValue: '1990-01-01'},
    {paramName: 'in_exam_questionpaper_template_id', paramValue: 1},
    {paramName: 'in_exam_questionpaper_id', paramValue: 0},
    // this.questionPaperForm.value.ExamMonthYear
    // {paramName: 'in_exam_month_yr', paramValue:''},
    {paramName: 'in_exam_id', paramValue: 0},
    {paramName: 'in_course_year_id', paramValue: 0},
    {paramName: 'in_subject_id', paramValue: 0},
    {paramName: 'in_evalutor_profileid', paramValue: 0},
    // this.questionPaperForm.value.ExamDate
   {paramName: 'in_exam_date', paramValue: '1990-01-01'},
    {paramName: 'in_regulation_id', paramValue:0},
   {paramName: 'in_emp_id', paramValue: 0},
   {paramName: 'in_questionpaper_id', paramValue: row.pk_exam_questionpaper_id},
   {paramName: 'in_evaluator_role_id', paramValue: 0},
   {paramName: 'in_exam_evaluationassignment_id', paramValue: 0},
   
  ]
  this.crudService.getDetailsByRequest(this.examQuestionPaperDetailsUrl, '', request, '&')
  .subscribe(result =>  {
      this.spinner.hide();
      if (result.statusCode === 200) {
        if (result.data.result && result.data.result !== '') {
           this.publishedList = result.data.result[0];
           this.RolesList = result.data.result[1];
           this.EmployeeList = result.data.result[2];
           const dialogRef = this.dialog.open(ViewPublishedListComponent, {
            width: '80%',
            data: [this.publishedList,this.RolesList,this.EmployeeList]
        });
        dialogRef.afterClosed().subscribe(details => {
          if (details != null && details !== ''){ 
           
          }  
        });
           
         
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
  
}
