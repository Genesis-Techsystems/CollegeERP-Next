import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatRipple } from '@angular/material/core';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { ActivatedRoute, Router } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { CrudService } from 'app/main/services/crud.service';
import { ParametersService } from 'app/main/services/parameters.service';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';
import { UploadPapersComponent } from '../exam-question-paper-marks/upload-papers/upload-papers.component';
import { ViewQuestionsModalComponent } from '../exam-question-paper-marks/view-questions-modal/view-questions-modal.component';
import { ViewQuestionsComponent } from '../exam-question-paper-marks/view-questions/view-questions.component';
import { ViewTemplateQuestionsComponent } from '../exam-question-paper-marks/view-template-questions/view-template-questions.component';
import { AddQuestionpaperModalNewComponent } from './add-questionpaper-modal-new/add-questionpaper-modal-new.component';
import { ViewTemplateModalNewComponent } from './view-template-modal-new/view-template-modal-new.component';

@Component({
  selector: 'app-exam-question-paper-marks-new',
  templateUrl: './exam-question-paper-marks-new.component.html',
  styleUrls: ['./exam-question-paper-marks-new.component.scss']
})
export class ExamQuestionPaperMarksNewComponent implements OnInit {

   displayedColumns: string[] = ['id', 'questionPaperTitle','questionPaperCode', 'setNumber', 'totalQuestions' , 'totalMarks','passMarks','PrepareByEmp','questionPaperPath','modelAnswerSheetPath','paperTemplate','Status','Actions'];
    dataSource: MatTableDataSource<any>;
    @ViewChild(MatPaginator) paginator: MatPaginator;
    @ViewChild(MatSort) sort: MatSort;
    @ViewChild(MatRipple) ripple: MatRipple;
    @ViewChild('empPhoto') studentAvatar: ElementRef;
  
    private examQpCrudUrl=CONSTANTS.examQpCrudUrl;
    private ExamQuestionPaperMarksCrudUrl = CONSTANTS.ExamQuestionPaperMarksCrudUrl;
    private ExamQuestionPaperCrudUrl = CONSTANTS.ExamQuestionPaperCrudUrl;
    private getExamEvaluationCodesUrl = CONSTANTS.getExamEvaluationCodesUrl;
    private getExamFiltersBycodeUrl = CONSTANTS.getExamFiltersBycodeUrl;
    private PaperPathUploadUrl = CONSTANTS.PaperPathUploadUrl;
    private updateQuestionPaperUrl =CONSTANTS.UpdateExamQuestionpaper;
  
  
    dateFormate = CONSTANTS.dateFormate;
    miniopath = CONSTANTS.MINIO
    
    questionPaperForm: FormGroup;
    examQuestionpapers: any[] = [];
    listExamSubject: any;
    monthYear=[];
    courseCode: any;
    courseyearcode: any;
    subjectcode: any;
    RegulationCode : any [];
    ExamDate : any [];
    CourseGroupCode : any [];
    monthYear1=[];
  selectedStates: any;
      step : any
    flag = false;
      QuestionPapers=[];
      courseyearcode1: any [];
      subjectcode1: any[];
      Groupcode1: any[];
      Regulationcode1: any[];
      examdate1: any;
      groupCode1: any[];
      CourseCode: any[];
    formData: FormData;
    pageParams :any={};
    role: any;
    examEvaluatorProfileId: any = 0;
    employeeId: any = 0;
    subjectName: any;
    evaluatorRoleId: any = 0;
    ExamDate1: any[];
    examQuestionpapersmarks1=[];
    examQuestionpapersmarks :any[] = [];
    questionPapersId: any;
    monthYearDuplicateList: any[];
    ExamDateDuplicateList: any[];
    subjectList = [];
    loginUser: any;
    userroles: any;
    examName: any;
    examList=[];
    examDuplicateList=[];
    subjectListDetails=[];
    subjectDetails=[];
    subjectDuplicateList=[];
    regulations=[];
    regulationsData: any[];
    examDetailList: any[];
    subjectCode: any;
    academicyearsList: any;
    academicYearDetailList: any;
    filtersDetailsList: any[];
    subjectDetialsList: any[];
    RoleId:number
  
    constructor(private route: ActivatedRoute, private formBuilder: FormBuilder, private router: Router, private dialog: MatDialog, private snotifyService: SnotifyService,
                private crudService: CrudService, private spinner: NgxSpinnerService, private genericFunctions: GenericFunctions, private parameters: ParametersService)
                 {
                  if (this.genericFunctions.getSecuredValue('userDetails') !== null && this.genericFunctions.getSecuredValue('userDetails') !== ''){
                    this.loginUser = JSON.parse(this.genericFunctions.getSecuredValue('userDetails'));
                    this.userroles=this.loginUser.userRoles
                  }
                  if (this.parameters.questionPaper) {
                    this.pageParams = this.parameters.questionPaper[0];
                  }
                  else{
                    this.router.navigate(['admin-examination-management/evaluation-process/exam-question-paper-marks-new']);
                  }
    }
  
     ngOnInit() {
      this.QuestionPapers = [];
      this.role = localStorage.getItem('userRole');
      for(let i=0;i<this.loginUser.userRoles.length;i++){
        if (this.loginUser.userRoles[i].roleName === 'QuestionPaperSetter'){
          this.examEvaluatorProfileId = localStorage.getItem('examEvaluatorProfileId');
          this.evaluatorRoleId = localStorage.getItem('examEvaluatorRole');
          this.employeeId = +localStorage.getItem('employeeId');
       }
      }
    
  
      this.employeeId = +localStorage.getItem('employeeId');
  
        this.questionPaperForm = this.formBuilder.group({
          questionPaperId :[''],
          examId :[''],
          subjectId:[''],
          courseId:[''],
          academicYearId:[''],
          CourseCode:['', Validators.required],
          ExamMonthYear:['', Validators.required],
          CourseYear:['', Validators.required],
          subjectcode:['', Validators.required],
          RegulationCode :  ['', Validators.required],
          ExamDate : ['', Validators.required],
          regulationId:['', Validators.required],
          CourseGroupCode : ['', Validators.required],
    })
  
  
    // this.route.queryParams
    // .subscribe(params => {
    //   this.pageParams = params;
      
    // });
    this.getQuestionpaperFilterss();
      this.dataSource = new MatTableDataSource(this.examQuestionpapers);
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;
     }
  
     isEmptyObject(obj) {
      return (obj && (Object.keys(obj).length === 0));
    }
  
    // STOREPROCEDURE FOR FILTERS
  
     getQuestionpaperFilterss(): void{
        let empId = +localStorage.getItem('employeeId');
      
          let request = [
            { paramName: 'in_flag', paramValue: 'univ_exam_inep_filters' },
            { paramName: 'in_flag_type', paramValue: 'QUESTION_SETTER' }, 
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
            { paramName: 'in_param2', paramValue: 'REGSUP' },
          ];
          this.crudService.getDetailsByRequest(this.getExamFiltersBycodeUrl, '', request, '&')
          .subscribe(result => {
             this.spinner.hide();
             if (result.statusCode === 200){
                  if (result.data && result.data !== '' && result.data.result.length > 0) {
                      // this.listExamSubject =  result.data.result[0];
                      this.filtersDetailsList = result.data.result;
                      for (let i = 0; i < this.filtersDetailsList.length; i++) {
                        if (this.filtersDetailsList[i].length > 0 && this.filtersDetailsList[i][0].flag === 'univ_exam_inep_filters') {
                          this.listExamSubject = this.filtersDetailsList[i];
                        }
                      }
                      const CourseCode = this.listExamSubject.map(({ fk_course_id }) => fk_course_id);
                      this.CourseCode = this.listExamSubject.filter(({ fk_course_id }, index) =>
                         !CourseCode.includes(fk_course_id, index + 1));
                      
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
    this.questionPaperForm.get('subjectId').setValue('')
    this.questionPaperForm.get('regulationId').setValue('')
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
    this.questionPaperForm.get('subjectId').setValue('')
    this.questionPaperForm.get('regulationId').setValue('')
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
    this.filtersDetailsList = []
    this.subjectListDetails=[]
    this.subjectDetails=[]
    this.regulations=[]
    this.questionPaperForm.get('subjectId').setValue('')
    this.questionPaperForm.get('regulationId').setValue('')
  
    let request = [
      { paramName: 'in_flag', paramValue: 'univ_exam_subject_inep' },
      { paramName: 'in_flag_type', paramValue: 'QUESTION_SETTER' }, 
      { paramName: 'in_university_id', paramValue: 0 },
      { paramName: 'in_college_id', paramValue: 0 },
      { paramName: 'in_course_id', paramValue: 0 },
      { paramName: 'in_course_group_id', paramValue: 0 },
      { paramName: 'in_course_year_id', paramValue: 0 },
      { paramName: 'in_exam_id', paramValue: this.questionPaperForm.value.examId },
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
                  if (this.filtersDetailsList[i].length > 0 && this.filtersDetailsList[i][0].flag === 'univ_exam_sub_inep') {
                    this.subjectListDetails = this.filtersDetailsList[i];
                  }
                }
  
                this.questionPaperForm.get('regulationId').setValue('')
                this.questionPaperForm.get('subjectId').setValue('')
  
                this.regulationsData=[]
                this.regulations=[]
                this.regulations=this.subjectListDetails
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
      this.subjectDetails=[]
      this.subjectDetialsList=[]
      this.questionPaperForm.get('subjectId').setValue('')
       this.subjectDetialsList=this.subjectListDetails.filter(x=>(x.fk_regulation_id== this.questionPaperForm.value.regulationId))
      if(this.subjectDetialsList.length>0){
        const subjectListDetails = this.subjectDetialsList.map(({ fk_subject_id }) => fk_subject_id);
        this.subjectDetails = this.subjectDetialsList.filter(({ fk_subject_id }, index) => !subjectListDetails.includes(fk_subject_id, index + 1));
        
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
  
  
  
    getQuestionpapers(): void{
      this.subjectCode = this.subjectDetails.filter(x => (x.fk_subject_id === this.questionPaperForm.value.subjectId))[0].subject_code;
      this.QuestionPapers=[]
      this.dataSource = new MatTableDataSource([])
         this.spinner.show();
         let empId = +localStorage.getItem('employeeId');
        this.flag = true;
        if( this.evaluatorRoleId == null){
          this.RoleId = 0
        }
          let request = [
            {paramName: 'in_flag', paramValue: 'list_questionpaper_list_new'},
            {paramName: 'in_orgid', paramValue:+localStorage.getItem('organizationId')},
            {paramName: 'in_fdate', paramValue: '1990-01-01'},
            {paramName: 'in_tdate', paramValue: '1990-01-01'},
            {paramName: 'in_evalutor_profileid', paramValue:  0},
            {paramName: 'in_exam_date', paramValue: '1990-01-01'},
            {paramName: 'in_emp_id', paramValue:0},
            {paramName: 'in_questionpaper_id', paramValue: 0},
            {paramName: 'in_evaluator_role_id', paramValue: this.RoleId??0},
            {paramName: 'in_academic_year', paramValue: ''},
            {paramName: 'in_exam_short_name', paramValue: ''},
            {paramName: 'in_affiliatedto_catdet_id', paramValue: 0},
            {paramName: 'in_exam_id', paramValue: this.questionPaperForm.value.examId},
            {paramName: 'in_course_year_id', paramValue: 0},
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
                      
                      this.dataSource = new MatTableDataSource(this.QuestionPapers);
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
  
   // GET QUESTION PAPER MARKS
  
      getExamQuestionpaperMarks(): void{
              this.crudService.listAllDetails(this.ExamQuestionPaperMarksCrudUrl)
              .subscribe(result => {
                 this.spinner.hide();
                 if (result.statusCode === 200){
                      if (result.data.resultList && result.data.resultList !== '') {
                          
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
         
         
  // ADD EXAM QUESTION PAPER
  
          openDialog(){
              const dialogRef = this.dialog.open(AddQuestionpaperModalNewComponent, {
                width: '100%',
                data: [this.questionPaperForm.value]
            });
            dialogRef.afterClosed().subscribe(details => {
                if (details != null && details !== ''){
  
                  if(details.examQuestionPaperTemplateId !== null){
                    this.spinner.show();
                    /*---------- ADD EXAM QUESTION PAPER----------*/
                    this.crudService.addDetails(this.examQpCrudUrl, details)
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
                  }else {
                    this.snotifyService.error('Please assign the template for the selected subject', 'Error!');
                  }
                }
            });
            }
    editDialog(e){
      this.questionPapersId=e.pk_exam_questionpaper_id;
      const dialogRef = this.dialog.open(AddQuestionpaperModalNewComponent, {
        width: '100%',
        data: [this.questionPaperForm.value,e],
        
    });
    dialogRef.afterClosed().subscribe(details => {
      if (details != null && details !== '') {
          details.questionPaperId = this.questionPapersId;
          this.UpdateQuestionPaper(details)
      }
  });
    }
    UpdateQuestionPaper(details): void {
      this.spinner.show();
      this.crudService.update(this.updateQuestionPaperUrl, details)
          .subscribe(result => {
              this.spinner.hide();
              if (result.statusCode === 200) {
                      this.snotifyService.success(result.message, 'Success!');
                      this.getQuestionpapers()  
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
  
            getExamQuestionpapermarks(): void{
            
              }
  
  applyFilter(filterValue: string) {
      this.dataSource.filter = filterValue.trim().toLowerCase();
  
      if (this.dataSource.paginator) {
          this.dataSource.paginator.firstPage();
      }
  }
  
  manageQuestions(item): void{
    // this.router.navigate(['admin-examination-management/evaluation-process/exam-question-paper-marks/manage-questions'] , 
      this.router.navigate(['admin-examination-management/evaluation-process/exam-question-paper-marks-new/manage-questions-new']);
    let queryParams = [{
      examName:item.exam_name,
      questionpaper_title: item.questionpaper_title,
      questionPaperId: item.pk_exam_qp_id,
      templateId: item.fk_exam_qp_template_id,
      courseId: this.questionPaperForm.value.courseId,
      academicYearId: this.questionPaperForm.value.academicYearId,
      examId: this.questionPaperForm.value.examId,
      subjectId: this.questionPaperForm.value.subjectId,
      regulationId: this.questionPaperForm.value.regulationId,
      subjectName: this.subjectName,
      subjectCode : this.subjectCode
    }]
    this.parameters.manageQuestions = queryParams;
  }
  
  UploadPapers(row){
    const dialogRef = this.dialog.open(UploadPapersComponent, {
        width: '750px',
        data : row
    });
    dialogRef.afterClosed().subscribe(details => {
      if (details != null && details !== ''){ 
        this.crudService.upload(this.PaperPathUploadUrl,details)
        .subscribe(result1 => {
          if (result1){
             
                   this.snotifyService.success(result1.message, 'Success!');
                   this.getQuestionpapers();
  
          }else {
              this.snotifyService.error(result1.message, 'Error!');
          }
        }, error => {
          if (error.error.statusCode === 401){
              this.snotifyService.error(error.error.message, 'Error!');
             
          }else{
              this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
          }
        });
      } 
      
    
    })
  }
  
  openFile(path): void{
    window.open(this.miniopath+path,'_blank','width=700,height=600');
  }
  
  viewTemplate(row): void{
    row.from = 'QP';
    if (row.fk_exam_qp_template_id != 0){
      const dialogRef = this.dialog.open(ViewTemplateModalNewComponent, {
          width: '900px',
          data: row
      });
  
      dialogRef.afterClosed().subscribe(details => {
          if (details === 'refresh'){
      this.getQuestionpapers();
          }
      });
    }
  }
  
  viewTemplate1(row): void{
    if (row.fk_exam_qp_template_id != 0){
      row.from='new';
      const dialogRef = this.dialog.open(ViewTemplateQuestionsComponent, {
          width: '900px',
          data: row
      });
  
      dialogRef.afterClosed().subscribe(details => {
          if (details === 'refresh'){
      this.getQuestionpapers();
          }
      });
    }
  }
  
  questionList(row): void{
      if (row.noofquestions > 0){
        const dialogRef = this.dialog.open(ViewQuestionsModalComponent, {
            width: '900px',
            data: row
        });
  
        dialogRef.afterClosed().subscribe(details => {
            if (details === 'refresh'){
        this.getQuestionpapers();
            }
        });
      }
  }
  
  assignTemplate(item): void{
    this.router.navigate(['admin-examination-management/evaluation-process/exam-question-paper-marks/assign-question-template']);
    let queryParams = [{
      examName:item.exam_name,
      questionpaper_title: item.questionpaper_title,
         questionPaperId: item.pk_exam_qp_id,
         academicYearId: this.questionPaperForm.value.academicYearId,
         courseId: this.questionPaperForm.value.courseId,
         examId: this.questionPaperForm.value.examId,
         subjectId: this.questionPaperForm.value.subjectId,
         regulationId: this.questionPaperForm.value.regulationId,
         subjectCode : this.subjectCode
        
    }]
    this.parameters.assignTemplate = queryParams;
  }
  printQA(item){
    this.router.navigate(['admin-examination-management/evaluation-process/exam-question-paper-marks/print-qa'])
    let queryParams = [{
      examName:item.exam_name,
      questionpaper_title: item.questionpaper_title,
      questionPaperId: item.pk_exam_qp_id,
      courseId: this.questionPaperForm.value.courseId,
      academicYearId: this.questionPaperForm.value.academicYearId,
      examId: this.questionPaperForm.value.examId,
      subjectId: this.questionPaperForm.value.subjectId,
      regulationId: this.questionPaperForm.value.regulationId,
      subjectName: this.subjectName,
      pkEQPTid: item.fk_exam_qp_template_id,
      totalmarks: item.totalmarks,
      subjectCode : this.subjectCode
    }]
    this.parameters.printqa = queryParams;
  }
  printQP(item){
    this.router.navigate(['admin-examination-management/evaluation-process/exam-question-paper-marks/view-template']);
    let queryParams = [{
      examName:item.exam_name,
      questionpaper_title: item.questionpaper_title,
          questionPaperId: item.pk_exam_qp_id,
          courseId: this.questionPaperForm.value.courseId,
          academicYearId: this.questionPaperForm.value.academicYearId,
      examId: this.questionPaperForm.value.examId,
      subjectId: this.questionPaperForm.value.subjectId,
      regulationId: this.questionPaperForm.value.regulationId,
          subjectName: this.subjectName,
          pkEQPTid: item.fk_exam_qp_template_id,
          totalmarks: item.totalmarks,
          subjectCode : this.subjectCode,
          from: 'QP'
    }]
    this.parameters.viewTemplate = queryParams;
  }

}
