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
import { ViewTemplateModalNewComponent } from '../exam-question-paper-marks-new/view-template-modal-new/view-template-modal-new.component';

@Component({
  selector: 'app-assign-qp-template',
  templateUrl: './assign-qp-template.component.html',
  styleUrls: ['./assign-qp-template.component.scss']
})
export class AssignQpTemplateComponent implements OnInit {

  displayedColumns: string[] = ['id', 'groupcode','courseyearcode', 'regulationcode', 'subject' ,'Actions'];
    dataSource: MatTableDataSource<any>;
    @ViewChild(MatPaginator) paginator: MatPaginator;
    @ViewChild(MatSort) sort: MatSort;
    @ViewChild(MatRipple) ripple: MatRipple;
    @ViewChild('empPhoto') studentAvatar: ElementRef;
  
    private EvaluatorRole=CONSTANTS.EvaluatorRole;
    private ExamQuestionPaperMarksCrudUrl = CONSTANTS.ExamQuestionPaperMarksCrudUrl;
    private ExamQuestionPaperCrudUrl = CONSTANTS.ExamQuestionPaperCrudUrl;
    private examQPtempAssignUrl = CONSTANTS.examQPtempAssignUrl;
    private getExamFiltersBycodeUrl = CONSTANTS.getExamFiltersBycodeUrl;
    private getQPAssignments = CONSTANTS.getQPAssignments;
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
      temlateListDetails=[];
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
    RoleId: number;
    CollegesListFilterDetails: any;
    courses: any;
    academicYears: any[];
    examsList: any[];
    CollegesListDetails: any;
    regulationFilterList: any;
    courseYearsList: any;
    courseYears: any;
    regulationList: any[];
    academicYearsList: any;
    examsLists: any[];
    examData: any[];
  
    constructor(private route: ActivatedRoute, private formBuilder: FormBuilder, private router: Router, private dialog: MatDialog, private snotifyService: SnotifyService,
                private crudService: CrudService, private spinner: NgxSpinnerService, private genericFunctions: GenericFunctions, private parameters: ParametersService)
                 {
                  if (this.genericFunctions.getSecuredValue('userDetails') !== null && this.genericFunctions.getSecuredValue('userDetails') !== ''){
                    this.loginUser = JSON.parse(this.genericFunctions.getSecuredValue('userDetails'));
                    this.userroles=this.loginUser.userRoles
                  }
                  if (this.parameters.questionPaperTemplateDetails) {
                    this.pageParams = this.parameters.questionPaperTemplateDetails[0];
                    
                  }
                 
    }
  
     ngOnInit() {
      this.temlateListDetails = [];
      this.role = localStorage.getItem('userRole');
      for(let i=0;i<this.loginUser.userRoles.length;i++){
        if (this.loginUser.userRoles[i].roleName === 'QuestionPaperSetter'){``
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
          courseYearId:[''],
          regulationId:['', Validators.required],
          CourseGroupCode : ['', Validators.required],
    })
  
  
    // this.route.queryParams
    // .subscribe(params => {
    //   this.pageParams = params;
      
    // });
    this.getFiltersList();
      this.dataSource = new MatTableDataSource(this.examQuestionpapers);
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;
     }
  
     isEmptyObject(obj) {
      return (obj && (Object.keys(obj).length === 0));
    }
  
    // STOREPROCEDURE FOR FILTERS
  
     getFiltersList(): void {
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
         { paramName: 'in_sub_flag_type', paramValue: 'ALL' },
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
               if (!this.isEmptyObject(this.pageParams) && this.courses.length > 0){
                this.questionPaperForm.get('courseId').setValue(+this.pageParams.courseId);
                this.selectedCourse( this.questionPaperForm.value.courseId);
               } 
             else 
               if (this.courses.length > 0) {
                 this.questionPaperForm.get('courseId').setValue(this.courses[0].fk_course_id);
                 this.selectedCourse(this.questionPaperForm.value.courseId)
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
   
     selectedCourse(courseId): void {
       if (courseId != null) {
         this.questionPaperForm.get('academicYearId').setValue('')
         this.questionPaperForm.get('examId').setValue('');
         this.questionPaperForm.get('courseYearId').setValue('');
       this.questionPaperForm.get('regulationId').setValue('');
         this.academicYears = []
         this.examsList = [];
         this.courseYears = []
         this.regulationList = []
         this.academicYearsList = []
         this.academicYearsList = this.CollegesListFilterDetails.filter(x => (x.fk_course_id == this.questionPaperForm.value.courseId))
         if (this.academicYearsList.length > 0) {
           const academicYears = this.academicYearsList.map(({ fk_academic_year_id }) => fk_academic_year_id);
           this.academicYears = this.academicYearsList.filter(({ fk_academic_year_id }, index) => !academicYears.includes(fk_academic_year_id, index + 1));
         }
         if (!this.isEmptyObject(this.pageParams) && this.academicYears.length > 0){
          this.questionPaperForm.get('academicYearId').setValue(+this.pageParams.academicYearId);
          this.selectedAcademicYear( this.questionPaperForm.value.academicYearId);
         } 
       else 
         if (this.academicYears.length > 0) {
           this.questionPaperForm.get('academicYearId').setValue(this.academicYears[0].fk_academic_year_id);
           this.selectedAcademicYear(this.questionPaperForm.value.academicYearId)
         }
   
       }
     }
   
   
   
   
     selectedAcademicYear(academicYearId): void {
       this.questionPaperForm.get('examId').setValue('');
       this.questionPaperForm.get('courseYearId').setValue('');
       this.questionPaperForm.get('regulationId').setValue('');
       this.examsLists = []
       this.examData = []
       this.filtersDetailsList = []
       this.regulationList = []
       this.courseYears =[]
       if (academicYearId) {
         this.examsLists = this.CollegesListFilterDetails.filter(x => (x.fk_course_id === this.questionPaperForm.value.courseId && x.fk_academic_year_id == this.questionPaperForm.value.academicYearId))
         if (this.examsLists.length > 0) {
           const examsLists = this.examsLists.map(({ fk_exam_id }) => fk_exam_id);
           this.examsList = this.examsLists.filter(({ fk_exam_id }, index) => !examsLists.includes(fk_exam_id, index + 1));
           this.examData = this.examsList;
         }
         if (!this.isEmptyObject(this.pageParams) && this.examsList.length > 0){
          this.questionPaperForm.get('examId').setValue(+this.pageParams.examId);
          this.selectedExam( this.questionPaperForm.value.examId);
         } 
       else 
         if (this.examsList.length > 0) {
           this.questionPaperForm.get('examId').setValue(this.examsList[0].fk_exam_id);
           this.selectedExam(this.questionPaperForm.value.examId);
         }
       }
   
     }
     searchexam(value) {
      this.examData = [];
      this.search(value)
    }
  
    search(value: string) {
      let filter = value.toLowerCase();
      for (let i = 0; i < this.examsList.length; i++) {
        let option = this.examsList[i];
        if (option.exam_name.toLowerCase().indexOf(filter) >= 0) {
          this.examData.push(option);
        }
      }
    }
     selectedExam(examId): void {
       this.filtersDetailsList = []
       this.regulationList = []
       this.courseYears =[]
       this.questionPaperForm.get('courseYearId').setValue('');
      this.questionPaperForm.get('regulationId').setValue('');
   
       let request = [
         { paramName: 'in_flag', paramValue: 'univ_exam_rest_no_tt' },
         { paramName: 'in_flag_type', paramValue: 'ALL' },
         { paramName: 'in_university_id', paramValue: 0 },
         { paramName: 'in_college_id', paramValue: 0 },
         { paramName: 'in_course_id', paramValue: this.questionPaperForm.value.courseId },
         { paramName: 'in_course_group_id', paramValue: 0 },
         { paramName: 'in_course_year_id', paramValue: 0 },
         { paramName: 'in_exam_id', paramValue: this.questionPaperForm.value.examId },
         { paramName: 'in_academic_year_id', paramValue: this.questionPaperForm.value.academicYearId },
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
           if (result.statusCode === 200) {
             if (result.data && result.data !== '' && result.data.result.length > 0) {
               this.filtersDetailsList = result.data.result;
               for (let i = 0; i < this.filtersDetailsList.length; i++) {
                 if (this.filtersDetailsList[i].length > 0 && this.filtersDetailsList[i][0].flag === 'univ_exam_rest_filters') {
                   this.CollegesListDetails = this.filtersDetailsList[i];
                 }
                 else if (this.filtersDetailsList[i].length > 0 && this.filtersDetailsList[i][0].flag === 'regulations') {
                   this.regulationFilterList = this.filtersDetailsList[i];
                 }
   
               }
  
               this.courseYearsList = this.CollegesListDetails
             
               if (this.courseYearsList.length > 0) {
                 const courseYearsList = this.courseYearsList.map(({ fk_course_year_id }) => fk_course_year_id);
                 this.courseYears = this.courseYearsList.filter(({ fk_course_year_id }, index) => !courseYearsList.includes(fk_course_year_id, index + 1));
               }
               if (!this.isEmptyObject(this.pageParams) && this.courseYearsList.length > 0){
                this.questionPaperForm.get('courseYearId').setValue(+this.pageParams.courseYearId);
                this.selectedYear( this.questionPaperForm.value.courseYearId);
               } 
             else 
               if (this.courseYears.length > 0) {
                 this.questionPaperForm.get('courseYearId').setValue(this.courseYears[0].fk_course_year_id);
                 this.selectedYear(this.questionPaperForm.value.courseYearId);
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
  
     selectedYear(courseYearId) {
      this.questionPaperForm.get('regulationId').setValue('');
       this.regulationList = []
       if (courseYearId) {
         if (this.regulationFilterList.length > 0) {
           const regulationDetailList = this.regulationFilterList.map(({ fk_regulation_id }) => fk_regulation_id);
           this.regulationList = this.regulationFilterList.filter(({ fk_regulation_id }, index) => !regulationDetailList.includes(fk_regulation_id, index + 1));
         }
         if (!this.isEmptyObject(this.pageParams) && this.regulationList.length > 0){
          this.questionPaperForm.get('regulationId').setValue(+this.pageParams.regulationId);
          this.selectedRegulation( this.questionPaperForm.value.regulationId);
         } 
       else 
        if(this.regulationList.length>0){
          this.questionPaperForm.get('regulationId').setValue(this.regulationList[0].fk_regulation_id);
          // this.selectedRegulation(this.questionPaperForm.value.regulationId);
        }
     
   
       }
     }
   
     selectedRegulation(regulationId){
      this.getTemplateDetails()
     }
  
  
    getTemplateDetails(): void{
      this.temlateListDetails=[]
      this.dataSource = new MatTableDataSource([])
         this.spinner.show();
        this.flag = true;
          let request = [
            {paramName: 'in_exam_id', paramValue: this.questionPaperForm.value.examId},
            {paramName: 'in_course_year_id', paramValue: 0},
            {paramName: 'in_regulation_id', paramValue:this.questionPaperForm.value.regulationId}, 
            {paramName: 'in_subject_id', paramValue:0},
          ];
          this.crudService.getDetailsByRequest(this.getQPAssignments, '', request, '&')
          .subscribe(result => {
             this.spinner.hide();
             if (result.statusCode === 200){
                  if (result.data && result.data !== '' && result.data.result.length > 0) {
                      this.temlateListDetails =  result.data.result[0];
                      
                      this.dataSource = new MatTableDataSource(this.temlateListDetails);
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
   
  
    updateTemplate(details): void {
      this.spinner.show();
      this.crudService.update(this.updateQuestionPaperUrl, details)
          .subscribe(result => {
              this.spinner.hide();
              if (result.statusCode === 200) {
                      this.snotifyService.success(result.message, 'Success!');
                      this.getTemplateDetails()  
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
  
  
  applyFilter(filterValue: string) {
      this.dataSource.filter = filterValue.trim().toLowerCase();
  
      if (this.dataSource.paginator) {
          this.dataSource.paginator.firstPage();
      }
  }
  viewTemplate(row): void{
    if (row.fk_exam_qp_template_id != 0){
      row.from = 'QP';
      const dialogRef = this.dialog.open(ViewTemplateModalNewComponent, {
          width: '900px',
          data: row
      });
   
    }
  }
  
  
  
  
  
  
  
  
  
  
  
  assignTemplate(item): void{
    let universityId;
    console.log(this.examsLists);
    if (this.examsLists.filter(x => (x.fk_exam_id === this.questionPaperForm.value.examId)).length > 0){
        universityId = this.examsLists.filter(x => (x.fk_exam_id === this.questionPaperForm.value.examId))[0].fk_university_id;
    }
    this.router.navigate(['admin-examination-management/evaluation-process/exam-question-paper-marks/assign-question-template-new']);
    let queryParams = [{
         rowData :item,
         examName:item.exam_name,
         academicYearId: this.questionPaperForm.value.academicYearId,
         courseId: this.questionPaperForm.value.courseId,
         courseYearId: this.questionPaperForm.value.courseYearId,
         examId: this.questionPaperForm.value.examId,
         subjectId: item.fk_subject_id,
         regulationId: this.questionPaperForm.value.regulationId,
         subjectCode : this.subjectCode,
         universityId: universityId
        
    }]
    this.parameters.questionPaperTemplateDetails = queryParams;
  }
  
  editDialog(item): void{
    this.router.navigate(['admin-examination-management/evaluation-process/exam-question-paper-marks/assign-question-template-new']);
    let queryParams = [{
         rowData :item,
         examName:item.exam_name,
         academicYearId: this.questionPaperForm.value.academicYearId,
         courseId: this.questionPaperForm.value.courseId,
         courseYearId: this.questionPaperForm.value.courseYearId,
         examId: this.questionPaperForm.value.examId,
         subjectId: item.fk_subject_id,
         regulationId: this.questionPaperForm.value.regulationId,
         subjectCode : this.subjectCode
        
    }]
    this.parameters.questionPaperTemplateDetails = queryParams;
  }
  

}
