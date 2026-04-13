import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { CrudService } from 'app/main/services/crud.service';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-exam-registration-student-report',
  templateUrl: './exam-registration-student-report.component.html',
  styleUrls: ['./exam-registration-student-report.component.scss']
})
export class ExamRegistrationStudentReportComponent implements OnInit {

  displayedColumns: string[] = ['id', 'exam', 'examType', 'examsession', 'college', 'course', 'group', 'year', 'subject', 'hallticket'];
  dataSource: MatTableDataSource<any>;
  open: boolean;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild('TABLE') excelTable: ElementRef;


  private examFiltersByCodeUrl = CONSTANTS.examFiltersByCodeUrl;
  private examStudentRegistrationDetailsUrl = CONSTANTS.examStudentRegistrationDetailsUrl;
  private generalDetailsUrl = CONSTANTS.generalDetailsUrl;
  private generalDetailsByCodeUrl = CONSTANTS.generalDetailsByCodeUrl;
  private examFeeType = CONSTANTS.examFeeType;
  private examTimetableUrl = CONSTANTS.examTimetableUrl;
  private getExamMasterDetailsUrl = CONSTANTS.getExamMasterDetailsUrl;
  private isActive = CONSTANTS.isActive;

  MINIO = CONSTANTS.MINIO;
  
  panelOpenState = true;
  flag=false
  universites = [];
  subject: any = {};
  examRegStdForm: FormGroup;

  step = 0;

  filtersDetailsList = [];
  examListDetails = [];
  courses = [];
  academicYears = [];
  academicYearsList = [];
  collegesListDetails = [];
  groupList = [];
  courseGroups = [];
  courseYearsList = [];
  courseYears = [];
  regulationDetails = [];
  regulationList = [];
  regulations = [];
  subjectListDetails = [];
  filtersData = [];
  colleges = [];
  examFilter = [];
  examsList = [];
  examData = [];
  exams = [];
  subjects = [];
  subjectsList = [];
  subjectsData = [];
  orgCode;
  Logo:any;
  studentsList = [];
  dataDetails = ' ';  
  collegeCode;
  courseCode;
  examYear;
  exam;
  courseGroupCode;
  courseYearCode;
  regulationCode;
  subjectCode;

  examTypes = [];
  examFeeTypes = [];
  examTimetables = [];
  regulationFilterList = [];
  trafoItem="Exam Student Registration Report";
  searchText = '';

  constructor(private dialog: MatDialog,
      private formBuilder: FormBuilder,
      private snotifyService: SnotifyService,
      private router: Router,
      private crudService: CrudService, private spinner: NgxSpinnerService, private genericFunctions: GenericFunctions) {
      this.orgCode = localStorage.getItem('orgCode');
  }
  ngOnInit() {
      this.examRegStdForm = this.formBuilder.group({
            courseId: ['', Validators.required],
            academicYearId: ['', Validators.required],
            examId: ['', Validators.required],
            examtypeCatdetId: ['', Validators.required],
            examTimetableId:['', Validators.required],
            courseGroupId: ['',Validators.required],
            courseYearId:['', Validators.required],
            regulationId: ['', Validators.required],
            subjectId: ['', Validators.required],
            isReevaluation: [false],
            reason: ['']
      });
      this.dataSource = new MatTableDataSource(this.studentsList);
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;
      this.getExamFiltersList();
  }

  // tslint:disable-next-line:typedef
  applyFilter(filterValue: string) {
      this.dataSource.filter = filterValue.trim().toLowerCase();
      if (this.dataSource.paginator) {
          this.dataSource.paginator.firstPage();
      }
  }
getExamFiltersList(): void {
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
            if (this.examListDetails && this.examListDetails.length > 0) {
              const courseList = this.examListDetails.map(({ fk_course_id }) => fk_course_id);
              this.courses = this.examListDetails.filter(({ fk_course_id }, index) =>
                !courseList.includes(fk_course_id, index + 1));
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
  selectedCourse(courseId) {
    this.examRegStdForm.get('academicYearId').setValue('');
    this.examRegStdForm.get('examId').setValue('');
    this.examRegStdForm.get('examtypeCatdetId').setValue(0);
    this.examRegStdForm.get('regulationId').setValue(0);
    this.examRegStdForm.get('subjectId').setValue(0);
    this.examRegStdForm.get('examTimetableId').setValue(0);
    this.examRegStdForm.get('courseGroupId').setValue(0);
    this.examRegStdForm.get('courseYearId').setValue(0);
    this.courseYearsList = []
    this.courseYears = []
    this.examTimetables = [];
    this.examTypes = [];
    this.examFeeTypes = [];
    this.examTimetables = [];
    this.collegesListDetails = [];
    this.colleges = [];
    this.groupList = [];
    this.courseGroups = [];
    this.courseYearsList = [];
    this.courseYears = [];
    this.collegesListDetails = [];
    this.examFilter = [];
    this.exams = [];
    this.academicYears = [];
    this.academicYearsList = [];
    this.regulationDetails = [];
    this.regulationList = [];
    this.regulations = [];
    this.subjectListDetails = [];
    this.subjectsList = [];
    this.subjects = [];
    this.subjectsData = [];
    this.studentsList = [];
    this.flag = false;
    this.dataSource = new MatTableDataSource(this.studentsList);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    /*----------- ACADEMIC YEARS -----------*/
    if (courseId != null && courseId !== undefined) {
      this.academicYearsList = this.examListDetails.filter(x => (x.fk_course_id === this.examRegStdForm.value.courseId))
      if (this.academicYearsList.length > 0) {
        const academicYears = this.academicYearsList.map(({ fk_academic_year_id }) => fk_academic_year_id);
        this.academicYears = this.academicYearsList.filter(({ fk_academic_year_id }, index) => !academicYears.includes(fk_academic_year_id, index + 1));
      }
      if (this.academicYears.length > 0) {
        this.academicYears = this.academicYears.sort((a, b) => parseInt(b.academic_year) - parseInt(a.academic_year))
      }
    }
  }
  selectedAcademicYear(academicYearId): void {
    this.examRegStdForm.get('examtypeCatdetId').setValue(0);
    this.examRegStdForm.get('regulationId').setValue(0);
    this.examRegStdForm.get('examId').setValue('');
    this.examRegStdForm.get('subjectId').setValue(0);
    this.examRegStdForm.get('examTimetableId').setValue(0);
    this.examRegStdForm.get('courseGroupId').setValue(0);    
    this.examRegStdForm.get('courseYearId').setValue(0);
    this.courseYearsList = []
    this.courseYears = []
    this.examTimetables = [];
    this.examTypes = [];
    this.examFeeTypes = [];
    this.examTimetables = [];
    this.collegesListDetails = [];
    this.colleges = [];
    this.groupList = [];
    this.courseGroups = [];
    this.courseYearsList = [];
    this.courseYears = [];
    this.subjectListDetails = [];
    this.subjectsList = [];
    this.subjects = [];
    this.subjectsData = [];
    this.examFilter = [];
    this.exams = [];
    this.regulationDetails = [];
    this.regulationList = [];
    this.regulations = [];
    this.studentsList = [];
    this.flag = false;
    this.dataSource = new MatTableDataSource(this.studentsList);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    if (academicYearId !== null && academicYearId !== undefined) {
      /*----------- Exams List -----------*/
      this.examFilter = this.examListDetails.filter(x => (x.fk_course_id === this.examRegStdForm.value.courseId && x.fk_academic_year_id === this.examRegStdForm.value.academicYearId))
      if (this.examFilter && this.examFilter.length > 0) {
        const examsLists = this.examFilter.map(({ fk_exam_id }) => fk_exam_id);
        this.exams = this.examFilter.filter(({ fk_exam_id }, index) =>
          !examsLists.includes(fk_exam_id, index + 1));
        this.examData = this.exams;
      }
    }
  }
  searchexam(value) {
    this.examData = [];
    this.filterExams(value)
  }
  filterExams(value: string) {
    let filter = value.toLowerCase();
    for (let i = 0; i < this.examsList.length; i++) {
      let option = this.examsList[i];
      if (option.exam_name.toLowerCase().indexOf(filter) >= 0) {
        this.examData.push(option);
      }
    }
  }
  selectedExam(examId){
    this.examRegStdForm.get('examtypeCatdetId').setValue(0);
    this.examRegStdForm.get('examTimetableId').setValue(0);
    this.examRegStdForm.get('regulationId').setValue(0);
    this.examRegStdForm.get('subjectId').setValue(0);
    this.examRegStdForm.get('courseGroupId').setValue(0);    
    this.examRegStdForm.get('courseYearId').setValue(0);
    this.courseYearsList = []
    this.courseYears = []
    this.examTimetables = [];
    this.examTypes = [];
    this.examFeeTypes = [];
    this.collegesListDetails = [];
    this.colleges = [];
    this.groupList = [];
    this.courseGroups = [];
    this.courseYearsList = [];
    this.courseYears = [];
    this.subjectListDetails = [];
    this.subjectsList = [];
    this.subjects = [];
    this.subjectsData = [];
    this.regulationDetails = [];
    this.regulationList = [];
    this.regulations = [];
    this.studentsList = [];
    this.flag = false;
    this.dataSource = new MatTableDataSource(this.studentsList);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
      this.crudService.listDetailsByTwoIds(this.generalDetailsUrl, this.examFeeType, 'true', this.generalDetailsByCodeUrl, this.isActive)
      .subscribe(result => {
          if (result.statusCode === 200){
                      if (result.data.resultList && result.data.resultList !== '') {
                        this.examTypes = result.data.resultList;
                        if(this.examTypes && this.examTypes.length > 0){
                          for (let i = 0; i < this.examTypes.length; i++){
                              if(this.exams.filter(x => (x.fk_exam_id === this.examRegStdForm.value.examId))[0]?.is_regular_exam){
                                if (this.examTypes[i].generalDetailCode === 'Regular'){
                                  this.examFeeTypes.push(this.examTypes[i]);
                              }
                              }
                              if(this.exams.filter(x => (x.fk_exam_id === this.examRegStdForm.value.examId))[0]?.is_supply_exam){
                                if (this.examTypes[i].generalDetailCode === 'Supple'){
                                  this.examFeeTypes.push(this.examTypes[i]);
                              }
                              }
                              if(this.exams.filter(x => (x.fk_exam_id === this.examRegStdForm.value.examId))[0]?.is_internal_exam){
                                if (this.examTypes[i].generalDetailCode === 'Internal'){
                                  this.examFeeTypes.push(this.examTypes[i]);
                              }
                              }
                            }
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
    selectedExamType(){
    this.examRegStdForm.get('examTimetableId').setValue(0);
    this.examRegStdForm.get('courseGroupId').setValue(0);    
    this.examRegStdForm.get('courseYearId').setValue(0);
    this.examRegStdForm.get('subjectId').setValue(0);
    this.examRegStdForm.get('regulationId').setValue(0);
    this.courseYearsList = []
    this.courseYears = []
    this.regulationFilterList = [];
    this.regulations = [];
    this.examTimetables = [];
    this.examTimetables = [];
    this.collegesListDetails = [];
    this.colleges = [];
    this.groupList = [];
    this.courseGroups = [];
    this.courseYearsList = [];
    this.courseYears = [];
    this.subjectListDetails = [];
    this.subjectsList = [];
    this.subjects = [];
    this.subjectsData = [];
    this.regulationDetails = [];
    this.regulationList = [];
    this.regulations = [];
    this.studentsList = [];
    this.flag = false;
    this.dataSource = new MatTableDataSource(this.studentsList);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
       /*----------- Timetables -----------*/
                  this.crudService.listDetailsByTwoIds(this.examTimetableUrl, this.examRegStdForm.value.examId, 'true',
                                                         this.getExamMasterDetailsUrl, this.isActive)
                      .subscribe(result => {
                          if (result.statusCode === 200) {
                              if (result.data.resultList && result.data.resultList !== '') {
                                  this.examTimetables = result.data.resultList;
                                  this.examTimetables=this.examTimetables.sort
                                  ((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime());
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
  selectedExamTimetable(): void {
    this.examRegStdForm.get('regulationId').setValue(0);
    this.examRegStdForm.get('subjectId').setValue(0);
    this.examRegStdForm.get('courseGroupId').setValue(0);    
    this.examRegStdForm.get('courseYearId').setValue(0);
    this.regulationFilterList = [];
    this.collegesListDetails = [];
    this.colleges = [];
    this.groupList = [];
    this.courseGroups = [];
    this.courseYearsList = [];
    this.courseYears = [];
    this.subjectListDetails = [];
    this.subjectsList = [];
    this.subjects = [];
    this.subjectsData = [];
    this.regulationDetails = [];
    this.regulationList = [];
    this.regulations = [];
    this.studentsList = [];
    this.flag = false;
    this.dataSource = new MatTableDataSource(this.studentsList);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    let request = [
      { paramName: 'in_flag', paramValue: 'univ_exam_rest_in_regexamstd' },
      { paramName: 'in_flag_type', paramValue: 'REGSUP' },
      { paramName: 'in_university_id', paramValue: 0 },
      { paramName: 'in_univ_examcenter_id', paramValue: 0 },
      { paramName: 'in_college_id', paramValue: 0 },
      { paramName: 'in_course_id', paramValue: this.examRegStdForm.value.courseId },
      { paramName: 'in_course_group_id', paramValue: 0 },
      { paramName: 'in_course_year_id', paramValue: 0 },
      { paramName: 'in_exam_id', paramValue: this.examRegStdForm.value.examId },
      { paramName: 'in_academic_year_id', paramValue: this.examRegStdForm.value.academicYearId },
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
            this.regulationDetails = result.data.result;
            for (const list of this.regulationDetails) {
              if (list?.length > 0 && list[0].flag === 'univ_exam_rest_filters') {
                this.regulationList = list;
                break;
              }
            }
            const courseGroupsData = this.regulationList.map(({ fk_course_group_id }) => fk_course_group_id);
            this.courseGroups = this.regulationList.filter(({ fk_course_group_id }, index) =>
              !courseGroupsData.includes(fk_course_group_id, index + 1));
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
  selectedCourseGroup(courseGroupId){
        this.examRegStdForm.get('courseYearId').setValue(0);
        this.examRegStdForm.get('regulationId').setValue(0);
        this.examRegStdForm.get('subjectId').setValue(0);
        this.courseYearsList = []
        this.courseYears = [] 
        this.regulationFilterList = [];
        this.regulations = [];
        this.subjectListDetails = [];
        this.subjectsList = [];
        this.subjects = [];
        this.subjectsData = [];
        this.studentsList = [];
        this.flag = false;
        /*----------- COURSES Years -----------*/
        if(courseGroupId !== 0){
        this.courseYearsList = this.regulationList.filter(x => (x.fk_course_group_id == this.examRegStdForm.value.courseGroupId));
        }else{
        this.courseYearsList = this.regulationList;
        }
        if (this.courseYearsList.length > 0) {
          const courseYearsList = this.courseYearsList.map(({ fk_course_year_id }) => fk_course_year_id);
          this.courseYears = this.courseYearsList.filter(({ fk_course_year_id }, index) => !courseYearsList.includes(fk_course_year_id, index + 1));
          this.courseYears = this.courseYears.sort((a, b) => a.cy_sort_order - b.cy_sort_order)
        }
  }
  selectedYear(courseYearId){
    this.examRegStdForm.get('regulationId').setValue(0);
    this.examRegStdForm.get('subjectId').setValue(0);
    this.regulationFilterList = [];
    this.regulations = [];
    this.subjectListDetails = [];
    this.subjectsList = [];
    this.subjects = [];
    this.subjectsData = [];
    this.studentsList = [];
    this.flag = false;
    this.regulationFilterList = this.regulationList.filter(x=>(x.fk_course_group_id ===this.examRegStdForm.value.courseGroupId 
      && x.fk_course_year_id === this.examRegStdForm.value.courseYearId))
      const regulationIdData = this.regulationList.map(({ fk_regulation_id }) => fk_regulation_id);
            this.regulations = this.regulationList.filter(({ fk_regulation_id }, index) =>
              !regulationIdData.includes(fk_regulation_id, index + 1));
  }
  
  selectedRegulation(regulationId) {
    this.examRegStdForm.get('subjectId').setValue(0);
    this.collegesListDetails = [];
    this.subjectListDetails = [];
    this.subjectsList = [];
    this.subjects = [];
    this.subjectsData = [];
    this.studentsList = [];
    this.flag = false;
    this.dataSource = new MatTableDataSource(this.studentsList);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    if (this.examRegStdForm.value.regulationId != null && regulationId != null) {
      /*----------- SUBJECTS -----------*/
      let request = [
        { paramName: 'in_flag', paramValue: 'univ_exam_subject_regexamstd' },
        { paramName: 'in_flag_type', paramValue: 'REGSUP' },
        { paramName: 'in_university_id', paramValue: 0 },
        { paramName: 'in_univ_examcenter_id', paramValue: 0 },
        { paramName: 'in_college_id', paramValue: 0 },
        { paramName: 'in_course_id', paramValue: this.examRegStdForm.value.courseId },
        { paramName: 'in_course_group_id', paramValue: this.examRegStdForm.value.courseGroupId },
        { paramName: 'in_course_year_id', paramValue: this.examRegStdForm.value.courseYearId },
        { paramName: 'in_exam_id', paramValue: this.examRegStdForm.value.examId },
        { paramName: 'in_academic_year_id', paramValue: this.examRegStdForm.value.academicYearId },
        { paramName: 'in_regulation_id', paramValue: this.examRegStdForm.value.regulationId },
        { paramName: 'in_sub_flag_type', paramValue: 'NoLAB' },
        { paramName: 'in_subject_id', paramValue: 0 },
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
              this.subjectListDetails = result.data.result;
              for (const list of this.subjectListDetails) {
                if (list?.length > 0 && list[0].flag === 'univ_exam_sub_regexamstd') {
                  this.subjectsList = list;
                  break;
                }
              }
              if (this.subjectsList && this.subjectsList.length > 0) {
                const courseCodeData = this.subjectsList.map(({ fk_subject_id }) => fk_subject_id);
                this.subjects = this.subjectsList.filter(({ fk_subject_id }, index) =>
                  !courseCodeData.includes(fk_subject_id, index + 1));
                this.subjectsData = this.subjects;
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
  searchdata(value) {
    this.subjectsData = [];
    this.search(value);
  }
  search(value: string) {
    let filter = value.toLowerCase();
    for (let i = 0; i < this.subjects.length; i++) {
      let option = this.subjects[i];
      if (option.subject_name.toLowerCase().indexOf(filter) >= 0) {
        this.subjectsData.push(option);
      }
      else if (option.subject_code.toLowerCase().indexOf(filter) >= 0) {
        this.subjectsData.push(option);
      }
    }
  }
  selectedData(){
    this.dataDetails = '';
    if (this.courseCode){
      this.dataDetails =  this.dataDetails + ' / ' + this.courseCode;
    }
    if (this.examYear){
      this.dataDetails =  this.dataDetails + ' / ' + this.examYear;
    }
    if (this.exam){
      this.dataDetails = this.dataDetails + ' / ' + this.exam;
    }
    if (this.regulationCode){
      this.dataDetails = this.dataDetails + ' / ' + this.regulationCode;
    }
    if (this.subjectCode){
      this.dataDetails = this.dataDetails + ' / ' + this.subjectCode;
    }
  }
  selectedSubject(){
    this.flag = false;
    this.studentsList = [];
  }
  dateChange(){
    this.flag = false;
    this.studentsList = [];
    this.dataSource = new MatTableDataSource(this.studentsList);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }
  getStudentsList(){
      this.flag = false;
      this.studentsList = [];
      this.dataSource = new MatTableDataSource(this.studentsList);
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;
      if (this.examRegStdForm.valid) {
        this.courseCode = this.courses.filter(x=>x.fk_course_id === this.examRegStdForm.value.courseId)[0]?.course_code
        this.examYear =this.academicYears.filter(x=>x.fk_academic_year_id === this.examRegStdForm.value.academicYearId)[0]?.academic_year;
        this.exam = this.exams.filter(x=>x.fk_exam_id === this.examRegStdForm.value.examId)[0]?.exam_name;
        this.regulationCode =this.regulations.filter(x=>x.fk_regulation_id === this.examRegStdForm.value.regulationId)[0]?.regulation_code;
        this.subjectCode = this.subjects.filter(x => (x.fk_subject_id === this.examRegStdForm.value.subjectId))[0]?.subject_code;
        this.selectedData();
        this.spinner.show();
        let flag;
        if (this.examRegStdForm.value.isReevaluation === true) {
          flag = 're_exam_std_reg_details';
        } else {
          flag = 'exam_std_reg_details';
        }
        /*----------- SUBJECTS -----------*/
        let request = [
          { paramName: 'in_flag', paramValue: flag },
          { paramName: 'in_exam_id', paramValue: this.examRegStdForm.value.examId },
          { paramName: 'in_clg_id', paramValue: 0 },
          { paramName: 'in_course_id', paramValue: this.examRegStdForm.value.courseId },
          { paramName: 'in_course_group_id', paramValue: this.examRegStdForm.value.courseGroupId },
          { paramName: 'in_course_year_id', paramValue: this.examRegStdForm.value.courseYearId },
          { paramName: 'in_regulation_id', paramValue: this.examRegStdForm.value.regulationId },
          { paramName: 'in_subject_id', paramValue: this.examRegStdForm.value.subjectId },
          { paramName: 'in_examtype_catdet_id', paramValue: this.examRegStdForm.value.examtypeCatdetId },
          { paramName: 'in_std_id', paramValue: 0 },
          { paramName: 'in_exam_timetable_id', paramValue: this.examRegStdForm.value.examTimetableId },
          { paramName: 'in_room_id', paramValue: 0 },
          { paramName: 'in_exam_labbatch_id', paramValue: 0 },
        ];
        this.crudService.getDetailsByRequest(this.examStudentRegistrationDetailsUrl, '', request, '&')
          .subscribe(result => {
            this.spinner.hide();
            if (result.statusCode === 200) {
              if (result.data && result.data !== '' && result.data.result.length > 0) {
                this.studentsList = result.data.result[0];
                this.flag = true;
                this.dataSource = new MatTableDataSource(this.studentsList);
                this.dataSource.paginator = this.paginator;
                this.dataSource.sort = this.sort;
                
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
      }else{
        this.snotifyService.info('Please Select Required Filters','Info!')
      }
      }

exportAsExcel()
  {
    const uri = 'data:application/vnd.ms-excel;base64,';
    const template = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>{worksheet}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table>{table}</table></body></html>`;
    const base64 = function(s) { return window.btoa(unescape(encodeURIComponent(s))) };
    const format = function(s, c) { return s.replace(/{(\w+)}/g, function(m, p) { return c[p]; }) };
  
    const table = this.excelTable.nativeElement;
    const ctx = { worksheet: 'Worksheet', table: table.innerHTML };
  
    const link = document.createElement('a');
    link.download = `${this.trafoItem}.xls`;
    link.href = uri + base64(format(template, ctx));
    link.click();
  }
printPage() {
  window.print()
}
}