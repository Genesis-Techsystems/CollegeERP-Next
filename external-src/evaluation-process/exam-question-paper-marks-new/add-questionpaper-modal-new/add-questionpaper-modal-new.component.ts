import { Component, ElementRef, Inject, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { Router, ActivatedRoute } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { CrudService } from 'app/main/services/crud.service';
import * as moment from 'moment';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';
import { ViewTemplateModalNewComponent } from '../view-template-modal-new/view-template-modal-new.component';

@Component({
  selector: 'app-add-questionpaper-modal-new',
  templateUrl: './add-questionpaper-modal-new.component.html',
  styleUrls: ['./add-questionpaper-modal-new.component.scss']
})
export class AddQuestionpaperModalNewComponent implements OnInit {

 @ViewChild(MatPaginator) paginator: MatPaginator;
   @ViewChild(MatSort) sort: MatSort;
 
   @ViewChild('uploadXl') uploadXl: ElementRef;
 
   private getExamQpTemplateAndDetailsUrl = CONSTANTS.getExamQpTemplateAndDetailsUrl;
   private ExamEvaluationProfileUrl = CONSTANTS.ExamEvaluatorsProfileUrl;
   private generalDetailsUrl = CONSTANTS.generalDetailsUrl;
   private generalDetailsByCodeUrl = CONSTANTS.generalDetailsByCodeUrl;
   private questionPaperStatus = CONSTANTS.questionPaperStatus;
   private isActive = CONSTANTS.isActive;
   private getExamFiltersBycodeUrl = CONSTANTS.getExamFiltersBycodeUrl;
   private getQPAssignments = CONSTANTS.getQPAssignments;
   private examQPtempAssignCrudUrl = CONSTANTS.examQPtempAssignCrudUrl;
 
   listExamSubject: any;
   CourseDetails: any;
   addquestionpaperForm: FormGroup;
   dateFormate = CONSTANTS.dateFormate;
   flag: boolean;
   step: any;
   Employees: any[];
   ApprovedEmployees = [];
   dialogTitle: string;
   QuestionPaperStatus: any;
   userid: string;
   firstName: string;
   uName: string;
   questionPaperStatusData = [];
   employeeId: string;
   questionPaperStatusDuplicate = [];
   role: string;
   examList: any;
   examDetailList: any;
   examDuplicateList: any;
   subjectListDetails: any;
   subjectDetails: any;
   subjectDuplicateList: any;
   regulationsData: any[];
   regulations: any[];
   isRegular: boolean = true;
   isSupply: boolean = false;
   academicYearDetailList: any[];
   academicyearsList: any[];
   filtersDetailsList: any[];
   subjectDetialsList: any[];
   temlateListDetails: any;
   constructor(private formBuilder: FormBuilder, @Inject(MAT_DIALOG_DATA) private data, private snotifyService: SnotifyService, private dialogRef: MatDialogRef<AddQuestionpaperModalNewComponent>,
     private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router,
     private dialog: MatDialog, private genericFunctions: GenericFunctions, private route: ActivatedRoute,) {
   }
   ngOnInit(): void {
     this.userid = localStorage.getItem('userId');
     this.uName = localStorage.getItem('uName');
     this.employeeId = localStorage.getItem('employeeId')
     this.dialogTitle = 'Create Question Paper';
     this.addquestionpaperForm = this.formBuilder.group({
       organizationId: ['1', Validators.required],
       questionPaperCode: ['', Validators.required],
       courseId: ['', Validators.required],
       academicYearId: ['', Validators.required],
       examId: ['', Validators.required],
       subjectId: ['', Validators.required],
       regulationId: ['', Validators.required],
       questionPaperStatusCatDetId: ['', Validators.required],
       statusComments: ['', Validators.required],
       preparedByEmpId: [this.employeeId, Validators.required],
       preparedDate: [new Date(), Validators.required],
       approvedByEmpId: [''],
       approvedDate: [''],
       isApproved: [true, Validators.required],
       questionPaperTitle: ['', Validators.required],
       setNumber: ['', Validators.required],
       passMarks: ['', Validators.required],
       totalMarks: ['', Validators.required],
       totalQuestions: ['', Validators.required],
       isnewemp: [],
       isActive: ['', Validators.required],
       examQuestionPaperTemplateId:[],
       reason: []
     });
 
 
 
     this.addquestionpaperForm.get('isActive').setValue(true);
     this.addquestionpaperForm.get('reason').setValue('active');
     this.getQuestionpaperFilterss();
     this.getApproveEmpList();
     this.getQuestionpaperStatus();
     this.role = localStorage.getItem('userRole')
 
     if (this.data[1]) {
       if (this.data[1]?.questionpaper_title != null) {
         this.dialogTitle = 'Edit Question paper';
       }
       this.addquestionpaperForm.get('questionPaperTitle').setValue(this.data[1]?.questionpaper_title);
       this.addquestionpaperForm.get('questionPaperCode').setValue(this.data[1]?.questionpaper_code);
       this.addquestionpaperForm.get('setNumber').setValue(this.data[1]?.setnumber);
       this.addquestionpaperForm.get('totalQuestions').setValue(this.data[1]?.totalquestions);
       this.addquestionpaperForm.get('totalMarks').setValue(this.data[1]?.totalmarks);
       this.addquestionpaperForm.get('passMarks').setValue(this.data[1]?.passmarks);
       this.addquestionpaperForm.get('preparedDate').setValue(new Date(moment(this.data[1]?.prepared_date).format()));
       this.addquestionpaperForm.get('questionPaperStatusCatDetId').setValue(this.data[1]?.fk_questionpaperstatus_catdet_id);
       this.addquestionpaperForm.get('statusComments').setValue(this.data[1]?.status_comments);
       this.addquestionpaperForm.get('isActive').setValue(this.data[1]?.is_active);
       this.addquestionpaperForm.get('reason').setValue(this.data[1]?.reason);
     }
 
               // this.addquestionpaperForm.get('courseId').disable();
               // this.addquestionpaperForm.get('academicYearId').disable();
               // this.addquestionpaperForm.get('examId').disable();
               // this.addquestionpaperForm.get('subjectId').disable();
               // this.addquestionpaperForm.get('regulationId').disable();
   }
 
   getQuestionpaperFilterss(): void {
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
         if (result.statusCode === 200) {
           if (result.data && result.data !== '' && result.data.result.length > 0) {
             // this.listExamSubject =  result.data.result[0];
             this.filtersDetailsList = result.data.result;
             for (let i = 0; i < this.filtersDetailsList.length; i++) {
               if (this.filtersDetailsList[i].length > 0 && this.filtersDetailsList[i][0].flag === 'univ_exam_filters') {
                 this.listExamSubject = this.filtersDetailsList[i];
               }
             }
             const CourseDetails = this.listExamSubject.map(({ fk_course_id }) => fk_course_id);
             this.CourseDetails = this.listExamSubject.filter(({ fk_course_id }, index) =>
               !CourseDetails.includes(fk_course_id, index + 1));
             if (!this.isEmptyObject(this.data) && this.CourseDetails.length > 0) {
               this.addquestionpaperForm.get('courseId').setValue(+this.data[0].courseId);
               this.selectedCourse(this.addquestionpaperForm.value.courseId);
         
             }else
             if (this.CourseDetails.length > 0) {
               this.addquestionpaperForm.get('courseId').setValue(this.CourseDetails[0].fk_course_id);
               this.selectedCourse(this.addquestionpaperForm.value.courseId);
             }
             if (!this.isEmptyObject(this.data[0])) {
 
               // this.addquestionpaperForm.get('courseId').setValue(this.data[0]?.courseId);
             
               // this.selectedCourse(this.data[0]?.courseId);
               // this.addquestionpaperForm.get('academicYearId').setValue(this.data[0]?.academicYearId);
               // this.selectedAcademicYear(this.data[0]?.academicYearId);
               // this.addquestionpaperForm.get('examId').setValue(this.data[0]?.examId);
               // this.selectedExam(this.data[0]?.examId);
               // this.addquestionpaperForm.get('subjectId').setValue(this.data[0]?.subjectId);
               // this.selectedSubject(this.data[0]?.subjectId);
               // this.addquestionpaperForm.get('regulationId').setValue(this.data[0]?.regulationId);
 
          
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
   isEmptyObject(obj) {
     return (obj && (Object.keys(obj).length === 0));
   }
   selectedCourse(courseId) {
     this.academicYearDetailList = []
     this.academicyearsList = []
     this.addquestionpaperForm.get('examId').setValue('')
     this.addquestionpaperForm.get('subjectId').setValue('')
     this.addquestionpaperForm.get('regulationId').setValue('')
     this.addquestionpaperForm.get('academicYearId').setValue('')
     this.academicyearsList = this.listExamSubject.filter(x => (x.fk_course_id == this.addquestionpaperForm.value.courseId))
     const academicyearsList = this.academicyearsList.map(({ fk_academic_year_id }) => fk_academic_year_id);
     this.academicYearDetailList = this.academicyearsList.filter(({ fk_academic_year_id }, index) =>
       !academicyearsList.includes(fk_academic_year_id, index + 1));
     if (!this.isEmptyObject(this.data) && this.academicYearDetailList.length > 0) {
       this.addquestionpaperForm.get('academicYearId').setValue(+this.data[0].academicYearId);
       this.selectedAcademicYear(this.addquestionpaperForm.value.academicYearId);
 
     }else
     if (this.academicYearDetailList.length > 0) {
       this.addquestionpaperForm.get('academicYearId').setValue(this.academicYearDetailList[0].fk_academic_year_id);
       this.selectedAcademicYear(this.addquestionpaperForm.value.academicYearId);
     }
   }
   selectedAcademicYear(academicYearId) {
     this.examDetailList = []
     this.examList = []
     this.addquestionpaperForm.get('examId').setValue('')
     this.addquestionpaperForm.get('subjectId').setValue('')
     this.addquestionpaperForm.get('regulationId').setValue('')
     this.examList = this.listExamSubject.filter(x => (x.fk_course_id == this.addquestionpaperForm.value.courseId && x.fk_academic_year_id == this.addquestionpaperForm.value.academicYearId))
     const examList = this.examList.map(({ fk_exam_id }) => fk_exam_id);
     this.examDetailList = this.examList.filter(({ fk_exam_id }, index) =>
       !examList.includes(fk_exam_id, index + 1));
     this.examDuplicateList = this.examDetailList
     if (!this.isEmptyObject(this.data) && this.examDetailList.length > 0) {
       this.addquestionpaperForm.get('examId').setValue(+this.data[0].examId);
       this.selectedExam(this.addquestionpaperForm.value.examId);
 
     }
     else
     if (this.examDetailList.length > 0) {
       this.addquestionpaperForm.get('examId').setValue(this.examDetailList[0].fk_exam_id);
       this.selectedExam(this.addquestionpaperForm.value.examId);
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
   selectedExam(examId) {
     this.subjectListDetails = []
     this.subjectDetails = []
     this.addquestionpaperForm.get('subjectId').setValue('')
     this.addquestionpaperForm.get('regulationId').setValue('')
 
     let request = [
       { paramName: 'in_flag', paramValue: 'univ_exam_subject_inep' },
       { paramName: 'in_flag_type', paramValue: 'QUESTION_SETTER' },
       { paramName: 'in_university_id', paramValue: 0 },
       { paramName: 'in_college_id', paramValue: 0 },
       { paramName: 'in_course_id', paramValue: 0 },
       { paramName: 'in_course_group_id', paramValue: 0 },
       { paramName: 'in_course_year_id', paramValue: 0 },
       { paramName: 'in_exam_id', paramValue: this.addquestionpaperForm.value.examId },
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
         if (result.statusCode === 200) {
           if (result.data && result.data !== '' && result.data.result.length > 0) {
             // this.listExamSubject =  result.data.result[0];
             this.filtersDetailsList = result.data.result;
             for (let i = 0; i < this.filtersDetailsList.length; i++) {
               if (this.filtersDetailsList[i].length > 0 && this.filtersDetailsList[i][0].flag === 'univ_exam_sub_inep') {
                 this.subjectListDetails = this.filtersDetailsList[i];
               }
             }
 
 
             this.addquestionpaperForm.get('regulationId').setValue('')
             this.addquestionpaperForm.get('subjectId').setValue('')
 
             this.regulationsData = []
             this.regulations = []
             this.regulations = this.subjectListDetails
             const regulations = this.regulations.map(({ fk_regulation_id }) => fk_regulation_id);
             this.regulationsData = this.regulations.filter(({ fk_regulation_id }, index) =>
               !regulations.includes(fk_regulation_id, index + 1));
             if (!this.isEmptyObject(this.data) && this.regulationsData.length > 0) {
               this.addquestionpaperForm.get('regulationId').setValue(+this.data[0].regulationId);
               this.selectedregulationCode(this.addquestionpaperForm.value.regulationId);
         
             }
             else
             if (this.regulationsData.length > 0) {
               this.addquestionpaperForm.get('regulationId').setValue(this.regulationsData[0].fk_regulation_id);
               this.selectedregulationCode(this.addquestionpaperForm.value.regulationId);
             }
 
 
 
 
 
 
 
           } else {
             // this.snotifyService.success(result.message, 'Success!');  
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
   selectedregulationCode(value) {
     this.subjectDetails = []
     this.subjectDetialsList = []
     this.addquestionpaperForm.get('subjectId').setValue('')
     this.subjectDetialsList = this.subjectListDetails.filter(x => (x.fk_regulation_id == this.addquestionpaperForm.value.regulationId))
     if (this.subjectDetialsList.length > 0) {
       const subjectListDetails = this.subjectDetialsList.map(({ fk_subject_id }) => fk_subject_id);
       this.subjectDetails = this.subjectDetialsList.filter(({ fk_subject_id }, index) => !subjectListDetails.includes(fk_subject_id, index + 1));
 
       this.subjectDuplicateList = this.subjectDetails
     }
     if (!this.isEmptyObject(this.data) && this.subjectDetails.length > 0) {
       this.addquestionpaperForm.get('subjectId').setValue(+this.data[0].subjectId);
       this.selectedSubject(this.addquestionpaperForm.value.subjectId);
 
     }
     else
     if (this.subjectDetails.length > 0) {
       this.addquestionpaperForm.get('subjectId').setValue(this.subjectDetails[0].fk_subject_id);
       this.selectedSubject(this.addquestionpaperForm.value.subjectId)
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
       } else if (option.subject_code.toLowerCase().indexOf(filter) >= 0) {
         this.subjectDuplicateList.push(option);
       }
     }
   }
   selectedSubject(subjectId) {
     this.getTemplateDetails();
   }
 
     getTemplateDetails(): void{
          this.spinner.show();
           this.crudService.listDetailsByThreeIds(this.examQPtempAssignCrudUrl, this.data[0].examId, this.data[0].regulationId, this.data[0].subjectId, 'ExamMaster.examId', 'Regulation.regulationId', 'Subject.subjectId')
       .subscribe(result => {
       this.spinner.hide();
       if (result.statusCode === 200){
            if (result.success) {
                       if (result.data.resultList && result.data.resultList !== '') {
                       this.temlateListDetails =  result.data.resultList;
                       if ( this.temlateListDetails.length > 0){
                          if(this.temlateListDetails[0].examQpTemplateId !== null ){
                            this.addquestionpaperForm.get('examQuestionPaperTemplateId').setValue(this.temlateListDetails[0].examQpTemplateId);
                          }else {
                              this.snotifyService.error('Template not assigned for the selected subject','Error!');
                          }
                       }
                    }
                //}
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
          //  let request = [
          //    {paramName: 'in_exam_id', paramValue: this.data[0].examId},
          //    {paramName: 'in_course_year_id', paramValue: 0},
          //    {paramName: 'in_regulation_id', paramValue:this.data[0].regulationId}, 
          //    {paramName: 'in_subject_id', paramValue:this.data[0].subjectId},
          //  ];
          //  this.crudService.getDetailsByRequest(this.getQPAssignments, '', request, '&')
          //  .subscribe(result => {
          //     this.spinner.hide();
          //     if (result.statusCode === 200){
          //          if (result.data && result.data !== '' && result.data.result.length > 0) {
          //              this.temlateListDetails =  result.data.result[0];
          //              if(this.temlateListDetails[0].fk_exam_questionpaper_template_id !== null ){
          //                this.addquestionpaperForm.get('examQuestionPaperTemplateId').setValue(this.temlateListDetails[0].fk_exam_questionpaper_template_id);
          //             }else {
          //                 this.snotifyService.error('Template not assigned for the selected subject','Error!');
          //             }
                                     
          //          } else {
          //              this.snotifyService.success(result.message, 'Success!');  
          //          }
          //     }else {
          //      this.snotifyService.error(result.message, 'Error!');
          //  }
          //  }, error => {            
          //      this.spinner.hide();
          //      if (error.error.statusCode === 401){
          //          this.snotifyService.error(error.error.message, 'Error!');
          //          this.genericFunctions.logOut(this.router.url);
          //     }else{
          //         this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
          //     }
          //  });
   }
    
 
   getApproveEmpList() {
     this.crudService.ListDetails(this.ExamEvaluationProfileUrl)
       .subscribe(result => {
         this.spinner.hide();
         if (result.statusCode === 200) {
           if (result.data && result.data !== '') {
             // this.snotifyService.success(result.message, 'Success!');
             this.ApprovedEmployees = result.data.resultList;
 
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
   onSupplyExamChange(isChecked: boolean): void {
     if (isChecked) {
       this.isRegular = false;
       this.isSupply = true;
     } else {
       this.isRegular = true;
       this.isSupply = false;
     }
   }
   getQuestionpaperStatus() {
     this.questionPaperStatusData = []
     this.crudService.listDetailsByTwoIds(this.generalDetailsUrl, this.questionPaperStatus, 'true', this.generalDetailsByCodeUrl, this.isActive)
       .subscribe(result => {
         if (result.statusCode === 200) {
           if (result.data.resultList && result.data.resultList !== '') {
             // this.questionPaperStatusData = result.data.resultList;
             // this.questionPaperStatusDuplicate = this.questionPaperStatusData.filter(x => x.generalDetailId == 621)
             if (this.role == 'QuestionPaperSetter') {
               this.questionPaperStatusDuplicate = result.data.resultList.filter(x => x.generalDetailId == 621)
               this.questionPaperStatusData = this.questionPaperStatusDuplicate
               this.addquestionpaperForm.get('questionPaperStatusCatDetId').setValue(this.questionPaperStatusDuplicate[0].generalDetailId)
             }
             else {
               this.questionPaperStatusData = result.data.resultList;
               this.questionPaperStatusDuplicate = this.questionPaperStatusData
             }
           } else {
             this.snotifyService.success(result.message, 'Success!');
           }
         } else {
           this.snotifyService.error(result.message, 'Error!');
         }
       }, error => {
         if (error.error.statusCode === 401) {
           this.snotifyService.error(error.error.message, 'Error!');
           this.genericFunctions.logOut(this.router.url);
         } else {
           this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
         }
       });
   }
 
 
 
   submit(): void {
 
     const Obj = {
       organizationId: this.addquestionpaperForm.value.organizationId,
 
       regulationId: this.data[0]?.regulationId,
       subjectId: this.data[0]?.subjectId,
       examId: this.data[0]?.examId,
       isRegularExam: this.isRegular,
       isSupplyExam: this.isSupply,
       questionPaperCode: this.addquestionpaperForm.value.questionPaperCode,
       questionPaperTitle: this.addquestionpaperForm.value.questionPaperTitle,
       setNumber: this.addquestionpaperForm.value.setNumber,
       passMarks: this.addquestionpaperForm.value.passMarks,
       totalMarks: this.addquestionpaperForm.value.totalMarks,
       totalQuestions: this.addquestionpaperForm.value.totalQuestions,
       preparedByEmpId: this.addquestionpaperForm.value.preparedByEmpId,
       preparedDate: this.addquestionpaperForm.value.preparedDate,
       questionPaperStatusCatdetId: this.addquestionpaperForm.value.questionPaperStatusCatDetId,
       statusComments: this.addquestionpaperForm.value.statusComments,
       isApproved: this.addquestionpaperForm.value.isApproved,
       approvedByEmpId: this.addquestionpaperForm.value.approvedByEmpId,
       approvedDate: this.addquestionpaperForm.value.approvedDate,
       isActive: this.addquestionpaperForm.value.isActive,
       examQpTemplateId: this.addquestionpaperForm.value.examQuestionPaperTemplateId
     }
     if (this.addquestionpaperForm.invalid) {
       return;
     } else {
       this.dialogRef.close(Obj);
     }
   }
   viewTemplate(): void{
     let row: any = {
       fk_exam_qp_template_id : this.addquestionpaperForm.value.examQuestionPaperTemplateId
     } 
     if (row.fk_exam_qp_template_id != 0){
       row.from = 'QP';
       const dialogRef = this.dialog.open(ViewTemplateModalNewComponent, {
           width: '900px',
           data: row
       });
    
     }
   }

}
