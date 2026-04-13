import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { GridComponent } from '@syncfusion/ej2-angular-grids';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { College } from 'app/main/models/college';
import { CourseGroup } from 'app/main/models/courseGroup';
import { CourseYear } from 'app/main/models/courseYearRegulation';
import { CrudService } from 'app/main/services/crud.service';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';

@Component({
  selector: 'app-re-evaluation-branch-wise-result-analysis-report',
  templateUrl: './re-evaluation-branch-wise-result-analysis-report.component.html',
  styleUrls: ['./re-evaluation-branch-wise-result-analysis-report.component.scss']
})
export class ReEvaluationBranchWiseResultAnalysisReportComponent implements OnInit {

 panelOpenState = true;
 
   private examFiltersByCodeUrl = CONSTANTS.examFiltersByCodeUrl;
   private collegeCrudUrl = CONSTANTS.collegeCrudUrl;
   private getExamModerationReportsUrl = CONSTANTS.getExamModerationReportsUrl;
   private generalDetailsUrl = CONSTANTS.generalDetailsUrl;
   private examFeeType = CONSTANTS.examFeeType;
   private generalDetailsByCodeUrl = CONSTANTS.generalDetailsByCodeUrl;
   private revaluationBranchwiseresultanalysisreporturl = CONSTANTS.revaluationBranchwiseresultanalysisreporturl;
   private isActive = CONSTANTS.isActive;
   
   public gridData: any[];
   public toolbar: string[];
   public pageSettings: Object;
   public grid: GridComponent;
   public initialPage: Object;
 
   @ViewChild('grid')
 
   filtersDetailsList = [];
   CollegesListDetails = [];
   staffForm: FormGroup;
   colleges: College[] = [];
   courses = [];
   courseGroups: CourseGroup[] = [];
   courseYears: CourseYear[] = [];
   step = 0;
   groupId;
   check = 1;
   isGroupId;
   isGroup;
   isCourse;
   isHOD;
   dashboard;
   pageParams: any = {};
   searchStudents = [];
   searchExams = [];
   courseGroupList: any[];
   examsList = [];
   academicYears = [];
   collegeCode;
   courseCode;
   exam;
   courseGroupCode;
   courseYearCode;
   regulationCode;
   examYear;
   isAdmin = false;
 
   courseListData = [];
   academicYearsList = [];
   examsLists = [];
   examData = [];
   groupList = [];
   courseYearsList = [];
   examRegisteredStudents = [];
   searchText = ''
   subjectWiseresult=[];
   dataDetails = ' ';
   universityName: string;
   examName: any;
   collegeName;
   collegeLogo = [];
   Logo: any;
   universityCode;
   collegeLists: any[];
   examListDetails = [];
   collegeFilterDetails = [];
   examFeeTypesList = [];
   examFeeTypes: any[] = [];
   branchResults: any[] = [];
   overall = {
  before: { appeared: 0, passed: 0, percentage: 0 },
  after: { appeared: 0, passed: 0, percentage: 0 }
};


todayDate: string = new Date().toLocaleDateString();

 
   @ViewChild('excelTable', { static: false }) excelTable: ElementRef;
   trafoItem = "Subject Wise Result Percentage Report";
 
   constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,
     private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router,
     private genericFunctions: GenericFunctions) {
     this.dashboard = CONSTANTS.dashboard;
     this.isAdmin = JSON.parse(localStorage.getItem('isAdmin'));
     this.getFiltersList();
   }
 
   ngOnInit(): void {
     this.staffForm = this.formBuilder.group({
       academicYearId: ['', Validators.required],
       courseId: ['', Validators.required],
       courseYearId: ['', Validators.required],
       examId: ['', Validators.required],
       collegeId: ['', Validators.required],
       examTypeCatdetId: [''],
     });
   }
   getFiltersList(): void {
     this.spinner.show();
     let request = [
       { paramName: 'in_flag', paramValue: 'univ_exam_filters' },
       { paramName: 'in_flag_type', paramValue: 'REGSUP' },
       { paramName: 'in_university_id', paramValue: 0 },
       { paramName: 'in_univ_examcenter_id', paramValue: 0 },
       { paramName: 'in_college_id', paramValue: 0 },
       { paramName: 'in_course_id', paramValue: 0 },
       { paramName: 'in_course_group_id', paramValue: 0 },
       { paramName: 'in_course_year_id', paramValue: 0 },
       { paramName: 'in_exam_id', paramValue: 0 },
       { paramName: 'in_academic_year_id', paramValue: 0 },
       { paramName: 'in_regulation_id', paramValue: 0 },
       { paramName: 'in_subject_id', paramValue: 0 },
       { paramName: 'in_sub_flag_type', paramValue: '' },
       { paramName: 'in_param1', paramValue: 0 },
       { paramName: 'in_param2', paramValue: 0 },
       { paramName: 'in_loginuser_roleid', paramValue: 0 },
       { paramName: 'in_loginuser_empid', paramValue: +localStorage.getItem('employeeId') },
     ];
     this.crudService.getDetailsByRequest(this.examFiltersByCodeUrl, '', request, '&')
       .subscribe(result => {
         this.spinner.hide();
         if (result.statusCode === 200) {
           if (result.data && result.data !== '' && result.data.result.length > 0) {
             this.filtersDetailsList = result.data.result;
             for (const list of this.filtersDetailsList) {
               if (list?.length > 0 && list[0].flag === 'univ_exam_filters') {
                 this.examListDetails = list;
                 break;
               }
             }
             /*----------- COURSE -----------*/
             const courseList = this.examListDetails.map(({ fk_course_id }) => fk_course_id);
             this.courses = this.examListDetails.filter(({ fk_course_id }, index) =>
               !courseList.includes(fk_course_id, index + 1));
             if (this.courses.length > 0) {
               this.staffForm.get('courseId').setValue(this.courses[0].fk_course_id);
               this.selectedCourse(this.staffForm.value.courseId);
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
   // tslint:disable-next-line:typedef
   selectedCourse(courseId) {
     this.staffForm.get('courseYearId').setValue(0);
     this.staffForm.get('examId').setValue(0);
     this.staffForm.get('academicYearId').setValue(0);
     this.staffForm.get('examTypeCatdetId').setValue(0);
     this.academicYears = [];
     this.collegeFilterDetails = [];
     this.CollegesListDetails = [];
     this.colleges = []
     this.courseGroups = [];
     this.courseYears = [];
     this.searchExams = [];
     this.examsList = [];
     this.searchExams = [];
     this.academicYearsList = [];
     this.examData = [];
     this.examFeeTypesList = [];
     this.examFeeTypes = [];
     this.courseYearsList = [];
     this.examRegisteredStudents = [];
     this.branchResults = [];
     /*----------- ACADEMIC YEAR -----------*/
     this.universityName = this.courses.filter(x => x.fk_course_id == this.staffForm.value.courseId)[0].university_name;
     this.universityCode = this.courses.filter(x => x.fk_course_id == this.staffForm.value.courseId)[0].university_code;
     this.academicYearsList = this.examListDetails.filter(x => (x.fk_course_id === this.staffForm.value.courseId))
     if (this.academicYearsList.length > 0) {
       const academicYearsList = this.academicYearsList.map(({ fk_academic_year_id }) => fk_academic_year_id);
       this.academicYears = this.academicYearsList.filter(({ fk_academic_year_id }, index) => !academicYearsList.includes(fk_academic_year_id, index + 1));
 
     }
     if (this.academicYears.length > 0) {
       this.academicYears = this.academicYears.sort((a, b) => parseInt(b.academic_year) - parseInt(a.academic_year));
       this.staffForm.get('academicYearId').setValue(this.academicYears[0].fk_academic_year_id);
       this.selectedAcademicYear(this.staffForm.value.academicYearId)
     }
   }
   selectedAcademicYear(academicYearId) {
     this.staffForm.get('courseYearId').setValue(0);
     this.staffForm.get('examId').setValue(0);
     this.staffForm.get('examTypeCatdetId').setValue(0);
     this.collegeFilterDetails = [];
     this.CollegesListDetails = [];
     this.colleges = []
     this.courseGroups = [];
     this.courseYears = [];
     this.searchExams = [];
     this.examsList = [];
     this.searchExams = [];
     this.examsLists = [];
     this.examData = [];
     this.examFeeTypesList = [];
     this.examFeeTypes = [];
     this.courseYearsList = [];
     this.examRegisteredStudents = [];
     this.branchResults = [];
     /*----------- EXAM LIST -----------*/
     this.examsLists = this.examListDetails.filter(x => (x.fk_course_id === this.staffForm.value.courseId && x.fk_academic_year_id === this.staffForm.value.academicYearId))
     if (this.examsLists.length > 0) {
       const examsLists = this.examsLists.map(({ fk_exam_id }) => fk_exam_id);
       this.examsList = this.examsLists.filter(({ fk_exam_id }, index) => !examsLists.includes(fk_exam_id, index + 1));
       this.examData = this.examsList;
     }
     if (this.examsList.length > 0) {
       this.staffForm.get('examId').setValue(this.examsList[0].fk_exam_id);
       this.selectedExam(this.staffForm.value.examId)
     }
   }

     selectedCollege(collegeId): void {
             this.staffForm.get('courseYearId').setValue(0);
             this.collegeCode = this.colleges.filter(x => (x.fk_college_id === collegeId))[0].college_code;
             this.courseGroups = []
             this.courseGroupList = []
             this.courseGroups = []
             this.subjectWiseresult = [];
             if (collegeId != null) {
               this.courseGroupList = this.CollegesListDetails.filter(x => (x.fk_college_id == this.staffForm.value.collegeId))
               if (this.courseGroupList.length > 0) {
                 const courseGroups = this.courseGroupList.map(({ fk_course_group_id }) => fk_course_group_id);
                 this.courseGroups = this.courseGroupList.filter(({ fk_course_group_id }, index) => !courseGroups.includes(fk_course_group_id, index + 1));
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
   // selectedExam(examId): void {
   //   this.staffForm.get('courseYearId').setValue(0);
   //   this.staffForm.get('examTypeCatdetId').setValue('');
   //   this.collegeFilterDetails = [];
   //   this.CollegesListDetails = [];
   //   this.examFeeTypesList = [];
   //   this.examFeeTypes = [];
   //   this.courseYears = [];
   //   this.courseYearsList = [];
   //   this.examRegisteredStudents = [];
   //   if (examId != null && examId !== undefined) {
   //     this.crudService.listDetailsByTwoIds(this.generalDetailsUrl, this.examFeeType, 'true', this.generalDetailsByCodeUrl, this.isActive)
   //     .subscribe(result => {
   //         if (result.statusCode === 200){
   //                     if (result.data.resultList && result.data.resultList !== '') {
   //                       this.examFeeTypesList = result.data.resultList;
   //                       if(this.examFeeTypesList && this.examFeeTypesList.length > 0){
   //                         for (let i = 0; i < this.examFeeTypesList.length; i++){
   //                             if(this.examsList.filter(x => (x.fk_exam_id === this.staffForm.value.examId))[0]?.is_regular_exam){
   //                               if (this.examFeeTypesList[i].generalDetailCode === 'Regular'){
   //                                 this.examFeeTypes.push(this.examFeeTypesList[i]);
   //                             }
   //                             }
   //                             if(this.examsList.filter(x => (x.fk_exam_id === this.staffForm.value.examId))[0]?.is_supply_exam){
   //                               if (this.examFeeTypesList[i].generalDetailCode === 'Supple'){
   //                                 this.examFeeTypes.push(this.examFeeTypesList[i]);
   //                             }
   //                             }
   //                             if(this.examsList.filter(x => (x.fk_exam_id === this.staffForm.value.examId))[0]?.is_internal_exam){
   //                               if (this.examFeeTypesList[i].generalDetailCode === 'Internal'){
   //                                 this.examFeeTypes.push(this.examFeeTypesList[i]);
   //                             }
   //                             }
   //                           }
   //                       }
   //                       if(this.examFeeTypes && this.examFeeTypes.length > 0){
   //                           this.staffForm.get('examTypeCatdetId').setValue(this.examFeeTypes[0]?.generalDetailId);
   //                           this.selectedExamType(this.staffForm.value.examTypeCatdetId);
   //                       }
   //                     } else {
   //                         this.snotifyService.success(result.message, 'Success!');
   //                     }
   //                 }else {
   //                     this.snotifyService.error(result.message, 'Error!');
   //                 }
   //         }, error => {
   //             if (error.error.statusCode === 401){
   //                 this.snotifyService.error(error.error.message, 'Error!');
   //                 this.genericFunctions.logOut(this.router.url);
   //             }else{
   //                 this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
   //         }
   //     });
   //   }
   // }
     selectedExam(examId){
     this.staffForm.get('courseYearId').setValue(0);
     this.collegeFilterDetails = [];
     this.CollegesListDetails = [];
     this.courseYears = [];
     this.courseYearsList = [];
     this.examRegisteredStudents = [];
     this.branchResults = [];
     if (this.staffForm.value.examId != null && this.staffForm.value.examId !== undefined) {
       this.getExamTypes(examId);
       let request = [
         { paramName: 'in_flag', paramValue: 'univ_exam_rest_in_regexamstd' },
         { paramName: 'in_flag_type', paramValue: 'REGSUP' },
         { paramName: 'in_university_id', paramValue: 0 },
         { paramName: 'in_univ_examcenter_id', paramValue: 0 },
         { paramName: 'in_college_id', paramValue: 0 },
         { paramName: 'in_course_id', paramValue: this.staffForm.value.courseId },
         { paramName: 'in_course_group_id', paramValue: 0 },
         { paramName: 'in_course_year_id', paramValue: 0 },
         { paramName: 'in_exam_id', paramValue: this.staffForm.value.examId },
         { paramName: 'in_academic_year_id', paramValue: this.staffForm.value.academicYearId },
         { paramName: 'in_regulation_id', paramValue: 0 },
         { paramName: 'in_subject_id', paramValue: 0 },
         { paramName: 'in_sub_flag_type', paramValue: '' },
         { paramName: 'in_param1', paramValue: 0 },
         { paramName: 'in_param2', paramValue: 0 },
         { paramName: 'in_loginuser_roleid', paramValue: 0 },
         { paramName: 'in_loginuser_empid', paramValue: +localStorage.getItem('employeeId') },
       ];
       this.crudService.getDetailsByRequest(this.examFiltersByCodeUrl, '', request, '&')
         .subscribe(result => {
           this.spinner.hide();
           if (result.statusCode === 200) {
             if (result.data && result.data !== '' && result.data.result.length > 0) {
               this.collegeFilterDetails = result.data.result;
               for (const list of this.collegeFilterDetails) {
                 if (list?.length > 0 && list[0].flag === 'univ_exam_rest_filters') {
                   this.CollegesListDetails = list;
                   break;  // Stop looping once we find the first match
                 }
               }
               this.colleges = this.CollegesListDetails;
const collegeIds = this.colleges.map(x => x.fk_college_id);

this.colleges = this.colleges.filter(({ fk_college_id }, index) =>
  !collegeIds.includes(fk_college_id, index + 1)
);

// Auto-select first college
if (this.colleges.length > 0) {
  this.staffForm.get('collegeId').setValue(this.colleges[0].fk_college_id);
  this.selectedCollege(this.staffForm.value.collegeId);
}
                 /*----------- COURSES YEARS -----------*/
                 this.courseYearsList = this.CollegesListDetails;
                 if (this.courseYearsList.length > 0) {
                   const courseYearsList = this.courseYearsList.map(({ fk_course_year_id }) => fk_course_year_id);
                   this.courseYears = this.courseYearsList.filter(({ fk_course_year_id }, index) => !courseYearsList.includes(fk_course_year_id, index + 1));
                   this.courseYears = this.courseYears.sort((a, b) => a.year_order - b.year_order);
                 }
                 if (this.courseYears.length > 0) {
                   this.staffForm.get('courseYearId').setValue(this.courseYears[0].fk_course_year_id);
                   this.selectedCourseYear();
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
     }
     getExamTypes(examId) {
         this.staffForm.get('examTypeCatdetId').setValue(0);
         this.examFeeTypesList = [];
         this.examFeeTypes = [];
         this.examRegisteredStudents = [];
         this.branchResults = [];
         if (examId != null && examId !== undefined) {
           this.crudService.listDetailsByTwoIds(this.generalDetailsUrl, this.examFeeType, 'true', this.generalDetailsByCodeUrl, this.isActive)
             .subscribe(result => {
               if (result.statusCode === 200) {
                 if (result.data.resultList && result.data.resultList !== '') {
                   this.examFeeTypesList = result.data.resultList;
                   if (this.examFeeTypesList && this.examFeeTypesList.length > 0) {
                     for (let i = 0; i < this.examFeeTypesList.length; i++) {
                       if (this.examsList.filter(x => (x.fk_exam_id === this.staffForm.value.examId))[0]?.is_regular_exam) {
                         if (this.examFeeTypesList[i].generalDetailCode === 'Regular') {
                           this.examFeeTypes.push(this.examFeeTypesList[i]);
                         }
                       }
                       if (this.examsList.filter(x => (x.fk_exam_id === this.staffForm.value.examId))[0]?.is_supply_exam) {
                         if (this.examFeeTypesList[i].generalDetailCode === 'Supple') {
                           this.examFeeTypes.push(this.examFeeTypesList[i]);
                         }
                       }
                       if (this.examsList.filter(x => (x.fk_exam_id === this.staffForm.value.examId))[0]?.is_internal_exam) {
                         if (this.examFeeTypesList[i].generalDetailCode === 'Internal') {
                           this.examFeeTypes.push(this.examFeeTypesList[i]);
                         }
                       }
                     }
                   }
                   if (this.examFeeTypes && this.examFeeTypes.length > 0) {
                     this.staffForm.get('examTypeCatdetId').setValue(this.examFeeTypes[0]?.generalDetailId);
                     this.selectedExamType();
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
       }
     selectedExamType() {
    this.examRegisteredStudents = [];
    this.branchResults = [];
  }
   selectedCourseYear() {
     this.examRegisteredStudents = [];
     this.branchResults = [];
   }
   // tslint:disable-next-line:typedef
   reset(): void {
     this.staffForm.get('courseId').setValue('');
     this.staffForm.get('examId').setValue('');
     this.staffForm.get('examTypeCatdetId').setValue('');
     this.staffForm.get('courseYearId').setValue('');
     this.examRegisteredStudents = [];
     this.branchResults = [];
   }
   getColleges(): void {
     this.collegeLogo = [];
     this.Logo = [];
     /*----------- COLLEGES -----------*/
     this.crudService.listDetailsById(this.collegeCrudUrl, 'true', 'isActive')
       .subscribe(result => {
         if (result.statusCode === 200) {
           if (result.data.resultList && result.data.resultList !== '') {
             this.collegeLogo = result.data.resultList;
             let universityId = this.courses.filter(x => (x.fk_course_id === this.staffForm.value.courseId))[0]?.fk_university_id;
             this.Logo = this.collegeLogo.filter(x => (x.universityId == universityId))[0].logo;
            this.collegeName = this.collegeLogo.filter(x => (x.collegeId == this.staffForm.value.collegeId))[0].collegeName;
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
   getDetails() {
  this.examRegisteredStudents = [];
  this.branchResults = [];
  this.overall = {
    before: { appeared: 0, passed: 0, percentage: 0 },
    after: { appeared: 0, passed: 0, percentage: 0 }
  };

  if (this.staffForm.valid) {

    this.spinner.show();

    this.courseCode = this.courses
      .find(x => x.fk_course_id == this.staffForm.value.courseId)?.course_code;

    this.courseYearCode = this.courseYears
      .find(x => x.fk_course_year_id == this.staffForm.value.courseYearId)?.course_year_code;

    this.exam = this.examsList
      .find(x => x.fk_exam_id == this.staffForm.value.examId)?.exam_name;

    this.collegeName = this.colleges.filter(x => x.fk_college_id == this.staffForm.value.collegeId)[0].college_name;

    this.selectedData();

    const request = [
      { paramName: 'in_flag', paramValue: 'reevaluation_result_analysis' },
      { paramName: 'in_exam_id', paramValue: this.staffForm.value.examId },
      { paramName: 'in_college_id', paramValue: 0 },
      { paramName: 'in_course_id', paramValue: this.staffForm.value.courseId },
      { paramName: 'in_course_group_id', paramValue: 0 },
      { paramName: 'in_course_year_id', paramValue: this.staffForm.value.courseYearId },
      { paramName: 'in_examtype', paramValue: this.staffForm.value.examTypeCatdetId }
    ];

    this.crudService
      .getDetailsByRequest(this.revaluationBranchwiseresultanalysisreporturl, '', request, '&')
      .subscribe(result => {

        this.spinner.hide();

        if (result.statusCode === 200 && result.data?.result?.length > 0) {

          this.getColleges();

          const spRows = result.data.result[0]; // 👈 UNWRAP NESTED ARRAY
// 🔥 array of branch records

          this.branchResults = spRows.map(row => {

            const appeared = row.total_student || 0;
            const beforePassed = row.before_rv_pass || 0;
            const afterPassed = row.after_rv_pass || 0;

            return {
              branchName: row.group_name + ' BRANCH',

              before: {
                appeared: appeared,
                passed: beforePassed,
                percentage: this.calcPercent(beforePassed, appeared)
              },

              after: {
                appeared: appeared,
                passed: afterPassed,
                percentage: this.calcPercent(afterPassed, appeared)
              }
            };
          });
          console.log('BranchResults =>', this.branchResults);
          this.calculateOverall();

        } else {
          this.snotifyService.success(result.message, 'Success!');
        }

      }, error => {
        this.spinner.hide();
        if (error.error?.statusCode === 401) {
          this.snotifyService.error(error.error.message, 'Error!');
          this.genericFunctions.logOut(this.router.url);
        } else {
          this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
        }
      });
  }
}

calcPercent(passed: number, appeared: number): number {
  return appeared > 0 ? +(passed / appeared * 100).toFixed(2) : 0;
}

calculateOverall(): void {

  let bA = 0, bP = 0, aA = 0, aP = 0;

  this.branchResults.forEach(b => {
    bA += b.before.appeared;
    bP += b.before.passed;
    aA += b.after.appeared;
    aP += b.after.passed;
  });

  this.overall = {
    before: {
      appeared: bA,
      passed: bP,
      percentage: this.calcPercent(bP, bA)
    },
    after: {
      appeared: aA,
      passed: aP,
      percentage: this.calcPercent(aP, aA)
    }
  };
}


   selectedData() {
     if (this.courseCode) {
       this.dataDetails = this.courseCode;
     }
     if (this.courseYearCode) {
       this.dataDetails = this.dataDetails + ' / ' + this.courseYearCode;
     }
     if (this.exam) {
       this.dataDetails = this.dataDetails + ' / ' + this.exam;
     }
   }
   Print() {
     window.print();
   }
   exportAsExcel() {
     const uri = 'data:application/vnd.ms-excel;base64,';
     const template = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>{worksheet}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table>{table}</table></body></html>`;
     const base64 = function (s) { return window.btoa(unescape(encodeURIComponent(s))) };
     const format = function (s, c) { return s.replace(/{(\w+)}/g, function (m, p) { return c[p]; }) };
     const table = this.excelTable.nativeElement;
     const ctx = { worksheet: 'Worksheet', table: table.innerHTML };
     const link = document.createElement('a');
     link.download = `${this.trafoItem}.xls`;
     link.href = uri + base64(format(template, ctx));
     link.click();
   }

}
