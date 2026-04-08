import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { CONSTANTS } from 'app/main/common/constants';
import { College } from 'app/main/models/college';
import { Course } from 'app/main/models/course';
import { CourseGroup } from 'app/main/models/courseGroup';
import { CourseYear } from 'app/main/models/courseYearRegulation';
import { Router } from '@angular/router';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { GridComponent } from '@syncfusion/ej2-angular-grids';

@Component({
  selector: 'app-subject-wise-result-pass-percent-report',
  templateUrl: './subject-wise-result-pass-percent-report.component.html',
  styleUrls: ['./subject-wise-result-pass-percent-report.component.scss']
})
export class SubjectWiseResultPassPercentReportComponent implements OnInit {

  panelOpenState = true;

  private examFiltersByCodeUrl = CONSTANTS.examFiltersByCodeUrl;
  private collegeCrudUrl = CONSTANTS.collegeCrudUrl;
  private getExamModerationReportsUrl = CONSTANTS.getExamModerationReportsUrl;
  private generalDetailsUrl = CONSTANTS.generalDetailsUrl;
  private examFeeType = CONSTANTS.examFeeType;
  private generalDetailsByCodeUrl = CONSTANTS.generalDetailsByCodeUrl;
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
  dataDetails = ' ';
  universityName: string;
  examName: any;
  collegeLogo = [];
  Logo: any;
  orgCode = '';
  collegeLists: any[];
  examListDetails = [];
  collegeFilterDetails = [];
  examFeeTypesList = [];
  examFeeTypes: any[] = [];

  @ViewChild('excelTable', { static: false }) excelTable: ElementRef;
  trafoItem = "Subject Wise Result Percentage Report";

  constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,
    private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router,
    private genericFunctions: GenericFunctions) {
    this.dashboard = CONSTANTS.dashboard;
    this.isAdmin = JSON.parse(localStorage.getItem('isAdmin'));
    this.orgCode = localStorage.getItem('orgCode');
    this.getFiltersList();
  }

  ngOnInit(): void {
    this.staffForm = this.formBuilder.group({
      academicYearId: ['', Validators.required],
      courseId: ['', Validators.required],
      courseYearId: ['', Validators.required],
      examId: ['', Validators.required],
      examTypeCatdetId: [''],
      isReevaluation:[false]
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
    this.staffForm.get('examTypeCatdetId').setValue('');
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
    /*----------- ACADEMIC YEAR -----------*/
    this.universityName = this.courses.filter(x => x.fk_course_id == this.staffForm.value.courseId)[0].university_name;
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
    this.staffForm.get('examTypeCatdetId').setValue('');
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
    if (this.staffForm.value.examId != null && this.staffForm.value.examId !== undefined) {
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
  selectedCourseYear() {
    this.examRegisteredStudents = [];
  }
  // tslint:disable-next-line:typedef
  reset(): void {
    this.staffForm.get('courseId').setValue('');
    this.staffForm.get('examId').setValue('');
    this.staffForm.get('examTypeCatdetId').setValue('');
    this.staffForm.get('courseYearId').setValue('');
    this.examRegisteredStudents = [];
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
  selectedFlag(){
    this.examRegisteredStudents = [];
  }
  getDetails() {
    this.examRegisteredStudents = [];
    if (this.staffForm.valid) {
      this.spinner.show();
      this.courseCode = this.courses.filter(x => x.fk_course_id == this.staffForm.value.courseId)[0]?.course_code;
      this.courseYearCode = this.courseYears.filter(x => x.fk_course_year_id == this.staffForm.value.courseYearId)[0]?.course_year_code;
      this.exam = this.examsList.filter(x => x.fk_exam_id == this.staffForm.value.examId)[0]?.exam_name;
      this.selectedData();
      let flag;
      if(this.staffForm.value.isReevaluation === true){
          flag = 're_val_exam_analysis_by_subject';
      }else{
          flag = 'exam_analysis_by_subject';
      }
      let request = [
        { paramName: 'in_flag', paramValue: flag },
        { paramName: 'in_exam_id', paramValue: this.staffForm.value.examId },
        { paramName: 'in_college_id', paramValue: 0 },
        { paramName: 'in_course_id', paramValue: this.staffForm.value.courseId },
        { paramName: 'in_course_group_id', paramValue: 0 },
        { paramName: 'in_course_year_id', paramValue: this.staffForm.value.courseYearId },
        { paramName: 'in_examtype', paramValue: 0 },
      ];
      this.crudService.getDetailsByRequest(this.getExamModerationReportsUrl, '', request, '&')
        .subscribe(result => {
          this.spinner.hide();
          if (result.statusCode === 200) {
            if (result.data && result.data !== '' && result.data.result.length > 0) {
              this.getColleges()
              this.examRegisteredStudents = result.data.result[0];
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