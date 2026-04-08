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
  selector: 'app-exam-gracemarks-reports',
  templateUrl: './exam-gracemarks-reports.component.html',
  styleUrls: ['./exam-gracemarks-reports.component.scss']
})
export class ExamGracemarksReportsComponent implements OnInit {

  panelOpenState = true;

  private examFiltersByCodeUrl = CONSTANTS.examFiltersByCodeUrl;
  private generalDetailsUrl = CONSTANTS.generalDetailsUrl;
  private examFeeType = CONSTANTS.examFeeType;
  private generalDetailsByCodeUrl = CONSTANTS.generalDetailsByCodeUrl;
  private isActive = CONSTANTS.isActive;
  private collegeCrudUrl = CONSTANTS.collegeCrudUrl;
  private resultprocessingUrl = CONSTANTS.ResultProcessingUrl;

  public gridData: any[];
  public toolbar: string[];
  public pageSettings: Object;
  @ViewChild('grid')
  public grid: GridComponent;
  public initialPage: Object;

  filtersDetailsList = [];
  CollegesListDetails = [];
  CollegeIdData = [];
  staffForm: FormGroup;
  colleges: College[] = [];
  courses: Course[] = [];
  courseGroups: CourseGroup[] = [];
  courseYears: CourseYear[] = [];
  step = 0;
  groupId;
  check = 1;
  isGroupId;
  isGroup;
  isCourse;
  isHOD;
  collegeId;
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
  collegeName;
  courseListData = [];
  academicYearsList = [];
  examsLists = [];
  examData = [];
  groupList = [];
  courseYearsList = [];
  examRegisteredStudents = [];
  isAdmin = false;
  dataDetails = ' ';
  collegeLogo = [];
  Logo: any;
  searchText = '';
  orgCode = '';
  examName: any;
  collegeLists: any;
  examListDetails = [];
  collegeFilterDetails = [];
  examFeeTypesList = [];
  examFeeTypes = [];

  @ViewChild('excelTable', { static: false }) excelTable: ElementRef;
  trafoItem = "Grace Marks Report";

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
      collegeId: ['', Validators.required],
      academicYearId: ['', Validators.required],
      courseId: ['', Validators.required],
      courseGroupId: ['', Validators.required],
      courseYearId: ['', Validators.required],
      examId: ['', Validators.required],
      examTypeCatdetId: ['', Validators.required],
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
  selectedCourse(courseId) {
    this.staffForm.get('courseGroupId').setValue(0);
    this.staffForm.get('courseYearId').setValue(0);
    this.staffForm.get('examId').setValue(0);
    this.staffForm.get('collegeId').setValue(0);
    this.staffForm.get('academicYearId').setValue(0);
    this.staffForm.get('examTypeCatdetId').setValue('');
    this.examFeeTypesList = [];
    this.examFeeTypes = [];
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
    this.groupList = [];
    this.courseYearsList = [];
    this.examRegisteredStudents = [];
    /*----------- ACADEMIC YEAR -----------*/
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
    this.staffForm.get('courseGroupId').setValue(0);
    this.staffForm.get('courseYearId').setValue(0);
    this.staffForm.get('examId').setValue(0);
    this.staffForm.get('collegeId').setValue(0);
    this.staffForm.get('examTypeCatdetId').setValue('');
    this.examFeeTypesList = [];
    this.examFeeTypes = [];
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
    this.groupList = [];
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
  selectedExam(examId): void {
    this.staffForm.get('courseGroupId').setValue(0);
    this.staffForm.get('courseYearId').setValue(0);
    this.staffForm.get('collegeId').setValue(0);
    this.staffForm.get('examTypeCatdetId').setValue('');
    this.examFeeTypesList = [];
    this.examFeeTypes = [];
    this.collegeFilterDetails = [];
    this.CollegesListDetails = [];
    this.colleges = [];
    this.groupList = [];
    this.courseGroups = [];
    this.courseYears = [];
    this.courseYearsList = [];
    this.examRegisteredStudents = [];
    if (examId != null && examId !== undefined) {
      this.getExamTypes(this.staffForm.value.examId);
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
              /*----------- COLLEGES -----------*/
              const CollegeIdData = this.CollegesListDetails.map(({ fk_college_id }) => fk_college_id);
              this.colleges = this.CollegesListDetails.filter(({ fk_college_id }, index) =>
                !CollegeIdData.includes(fk_college_id, index + 1));
              if (this.colleges && this.colleges.length > 0) {
                this.colleges = this.colleges.sort((a, b) => a.clg_sort_order - b.clg_sort_order);
                this.staffForm.get('collegeId').setValue(this.colleges[0].fk_college_id);
                this.selectedCollege(this.staffForm.value.collegeId);
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
  getExamTypes(examId){
    this.staffForm.get('examTypeCatdetId').setValue('');
    this.examFeeTypesList = [];
    this.examFeeTypes = [];
    this.examRegisteredStudents = [];
    if (examId != null && examId !== undefined) {
      this.crudService.listDetailsByTwoIds(this.generalDetailsUrl, this.examFeeType, 'true', this.generalDetailsByCodeUrl, this.isActive)
      .subscribe(result => {
          if (result.statusCode === 200){
                      if (result.data.resultList && result.data.resultList !== '') {
                        this.examFeeTypesList = result.data.resultList;
                        if(this.examFeeTypesList && this.examFeeTypesList.length > 0){
                          for (let i = 0; i < this.examFeeTypesList.length; i++){
                              if(this.examsList.filter(x => (x.fk_exam_id === this.staffForm.value.examId))[0]?.is_regular_exam){
                                if (this.examFeeTypesList[i].generalDetailCode === 'Regular'){
                                  this.examFeeTypes.push(this.examFeeTypesList[i]);
                              }
                              }
                              if(this.examsList.filter(x => (x.fk_exam_id === this.staffForm.value.examId))[0]?.is_supply_exam){
                                if (this.examFeeTypesList[i].generalDetailCode === 'Supple'){
                                  this.examFeeTypes.push(this.examFeeTypesList[i]);
                              }
                              }
                              if(this.examsList.filter(x => (x.fk_exam_id === this.staffForm.value.examId))[0]?.is_internal_exam){
                                if (this.examFeeTypesList[i].generalDetailCode === 'Internal'){
                                  this.examFeeTypes.push(this.examFeeTypesList[i]);
                              }
                              }
                            }
                        }
                        if(this.examFeeTypes && this.examFeeTypes.length > 0){
                            this.staffForm.get('examTypeCatdetId').setValue(this.examFeeTypes[0]?.generalDetailId);
                            this.selectedExamType(this.staffForm.value.examTypeCatdetId);
                        }
                      } else {
                          this.snotifyService.success(result.message, 'Success!');
                      }
                  }else {
                      this.snotifyService.error(result.message, 'Error!');
                  }
          }, error => {
              if (error.error.statusCode === 401){
                  this.snotifyService.error(error.error.message, 'Error!');
                  this.genericFunctions.logOut(this.router.url);
              }else{
                  this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
          }
      });
    }
  }
  selectedExamType(examTypeCatdetId){
    this.examRegisteredStudents = [];
  }
  selectedCollege(collegeId): void {
    this.staffForm.get('courseGroupId').setValue(0);
    this.staffForm.get('courseYearId').setValue(0);
    this.groupList = [];
    this.courseGroups = [];
    this.courseYears = [];
    this.courseYearsList = [];
    this.examRegisteredStudents = [];
    /*----------- COURSE GROUP -----------*/
    this.collegeName = this.colleges.filter(x => x.fk_college_id == this.staffForm.value.collegeId)[0].college_name
    this.examName = this.examsList.filter(x => (x.fk_exam_id == this.staffForm.value.examId))[0].exam_name;
    this.groupList = this.CollegesListDetails.filter(x => (x.fk_college_id === this.staffForm.value.collegeId))
    if (this.groupList.length > 0) {
      const groupList = this.groupList.map(({ fk_course_group_id }) => fk_course_group_id);
      this.courseGroups = this.groupList.filter(({ fk_course_group_id }, index) => !groupList.includes(fk_course_group_id, index + 1));
    }
    if (this.courseGroups.length > 0) {
      this.staffForm.get('courseGroupId').setValue(this.courseGroups[0].fk_course_group_id);
      this.selectedGroup(this.staffForm.value.courseGroupId);
    }
  }
  selectedGroup(courseGroupId): void {
    this.staffForm.get('courseYearId').setValue(0);
    this.courseYears = [];
    this.courseYearsList = [];
    this.examRegisteredStudents = [];
    /*----------- COURSES YEARS -----------*/
    if(courseGroupId === 0){
      this.courseYearsList = this.CollegesListDetails.filter(x => (x.fk_college_id === this.staffForm.value.collegeId));
    }else{
      this.courseYearsList = this.CollegesListDetails.filter(x => (x.fk_college_id === this.staffForm.value.collegeId && x.fk_course_group_id == this.staffForm.value.courseGroupId));
    }
    if (this.courseYearsList.length > 0) {
      const courseYearsList = this.courseYearsList.map(({ fk_course_year_id }) => fk_course_year_id);
      this.courseYears = this.courseYearsList.filter(({ fk_course_year_id }, index) => !courseYearsList.includes(fk_course_year_id, index + 1));
      this.courseYears = this.courseYears.sort((a, b) => a.year_order - b.year_order)
    }
    if (this.courseYears.length > 0) {
      this.staffForm.get('courseYearId').setValue(this.courseYears[0].fk_course_year_id);
    }
  }
  selectedCourseYear() {
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
            this.Logo = this.collegeLogo.filter(x => (x.collegeId == this.staffForm.value.collegeId))[0].logo
            this.collegeName = this.collegeLogo.filter(x => (x.collegeId == this.staffForm.value.collegeId))[0].collegeName
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
  // tslint:disable-next-line:typedef
  reset(): void {
    this.staffForm.get('courseId').setValue('');
    this.staffForm.get('examId').setValue('');
    this.staffForm.get('courseGroupId').setValue('');
    this.staffForm.get('courseYearId').setValue('');
    this.examRegisteredStudents = [];
  }
  getDetails() {
    if (this.staffForm.valid) {
      this.spinner.show();
      this.collegeName = this.collegeCode = this.colleges.filter(x => (x.fk_college_id == this.staffForm.value.collegeId))[0]?.college_name
      this.collegeCode = this.colleges.filter(x => (x.fk_college_id == this.staffForm.value.collegeId))[0]?.college_code
      this.courseCode = this.courses.filter(x => x.fk_course_id == this.staffForm.value.courseId)[0]?.course_code
      this.courseGroupCode = this.courseGroups.filter(x => x.fk_course_group_id == this.staffForm.value.courseGroupId)[0]?.group_code;
      this.courseYearCode = this.courseYears.filter(x => x.fk_course_year_id == this.staffForm.value.courseYearId)[0]?.course_year_code;
      // this.exam = this.examsList.filter(x => x.fk_exam_id == this.staffForm.value.examId)[0]?.exam_name;
      let request = [
        { paramName: 'in_flag', paramValue: 'exam_gracemark_added_list' },
        { paramName: 'in_exam_id', paramValue: this.staffForm.value.examId },
        { paramName: 'in_examtype', paramValue: this.staffForm.value.examTypeCatdetId },
        { paramName: 'in_college_id', paramValue: this.staffForm.value.collegeId },
        { paramName: 'in_course_id', paramValue: this.staffForm.value.courseId },
        { paramName: 'in_course_group_id', paramValue: this.staffForm.value.courseGroupId },
        { paramName: 'in_course_year_id', paramValue: this.staffForm.value.courseYearId },
      ];
      this.crudService.getDetailsByRequest(this.resultprocessingUrl, '', request, '&')
        .subscribe(result => {
          this.spinner.hide();
          if (result.statusCode === 200) {
            if (result.data && result.data !== '' && result.data.result.length > 0) {
              this.getColleges();
              this.examRegisteredStudents = result.data.result[0];
              this.exam = this.examRegisteredStudents[0]?.exam_label_name;
              this.selectedData();
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
    if (this.collegeCode) {
      this.dataDetails = this.collegeCode;
    }
    if (this.courseCode) {
      this.dataDetails = this.dataDetails + ' / ' + this.courseCode;
    }
    if (this.courseGroupCode) {
      this.dataDetails = this.dataDetails + ' / ' + this.courseGroupCode;
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