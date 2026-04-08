import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { ApplicationForm } from 'app/main/models/applicationForm';
import { CONSTANTS } from 'app/main/common/constants';
import { Router } from '@angular/router';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { GenericFunctions } from 'app/main/common/generic-functions';
import 'rxjs/add/observable/of';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { MatRadioChange } from '@angular/material/radio';
import { Location } from '@angular/common';
import { Course } from 'app/main/models/course';
import { Regulations } from 'app/main/models/Rregulations';
import { CourseYear } from 'app/main/models/courseYearRegulation';

@Component({
  selector: 'app-verify-exam-marks',
  templateUrl: './verify-exam-marks.component.html',
  styleUrls: ['./verify-exam-marks.component.scss']
})
export class VerifyExamMarksComponent implements OnInit {

  displayedValues: string[] = [];
  columns = [];
  IntdisplayedColumns: string[] = [];

  displayedColumns: string[] = ['id', 'course_name', 'course_group', 'academic_year', 'course_year', 'subject_name', 'Student_registered', 'ext_is_present', 'ext_marks_entered'];
  EvalautiondisplayedColumns: string[] = ['id', 'course_name', 'course_group', 'academic_year', 'course_year', 'subject_name', 'Student_registered', 'ext_is_present', '1_evaluation_assigned', '1_evaluation_evaluated', '2_evaluation_assigned', '2_evaluation_evaluated', '3_evaluation_assigned', '3_evaluation_evaluated'];
  
  dataSource: MatTableDataSource<ApplicationForm>;
  AlldisplayedColumns: string[] = [];

  private examFiltersByCodeUrl = CONSTANTS.examFiltersByCodeUrl;
  private collegeCrudUrl = CONSTANTS.collegeCrudUrl;
  private ExamPreModerationUrl = CONSTANTS.ExamPreModerationUrl;
  MINIO = CONSTANTS.MINIO;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild('excelTable', { static: false }) excelTable: ElementRef;

  feeFormGroup: FormGroup;
  dashboard: any
  filtersDetailsList = [];
  marksListDetails = [];
  gradesDetailsList = [];
  CollegesListDetails = [];
  colleges = [];
  examsList = [];
  searchExams = [];
  examData = [];
  examsLists = [];
  fromDate: string;
  toDate: string;
  panelOpenState = true;
  step = 0;
  collegeCode: any;
  exam: any;
  collegeName: any;
  groupList: any[];
  courseGroups: any[];
  examTimetableSubjectsList: any[];
  examTimetableSubjects: any[];
  collegeLogo = [];
  orgCode = '';
  Logo: any;
  check = 1;
  studentsList = []
  groupCode = '';
  subjectcode = '';
  examListDetails = [];
  collegeFilterDetails = [];
  courses: Course[] = [];
  academicYearsList = [];
  academicYears = [];
  regulationsList = [];
  regulations: Regulations[] = [];
  courseYearsList = [];
  courseYears: CourseYear[] = [];
  subjectListDetails = [];

  trafoexternalItem = "External Marks Status Report";
  trafointernalItem = "Internal Marks Status Report";
  trafoItem = 'External Evaluation Status Report';
  alltrafoItem = 'Exam Marks Status Report';

  constructor(private router: Router, private formBuilder: FormBuilder, private snotifyService: SnotifyService,
    private crudService: CrudService, private spinner: NgxSpinnerService, private genericFunctions: GenericFunctions, private location: Location) {
    this.orgCode = localStorage.getItem('orgCode');
  }

  ngOnInit() {
    this.feeFormGroup = this.formBuilder.group({
      courseId: ['', Validators.required],
      academicYearId: ['', Validators.required],
      examId: ['', Validators.required],
      collegeId: ['', ],
      courseGroupId: ['', ],
      courseYearId: ['',],
      regulationId: [''],
      subjectId: [''],
      employeeId: [0],
      fdate: [new Date()]
    });
    this.getFiltersList();
  }
  isEmptyObject(obj) {
    return (obj && (Object.keys(obj).length === 0));
  }
  reset(): void {
    this.feeFormGroup.get('examId').setValue('');
    this.feeFormGroup.get('courseGroupId').setValue('');
    this.feeFormGroup.get('subjectId').setValue('');
    this.gradesDetailsList = [];
  }
  getFiltersList(): void {
    this.filtersDetailsList = []
    this.CollegesListDetails = []
    this.colleges = []
    this.spinner.show();
    let request = [
      { paramName: 'in_flag', paramValue: 'univ_exam_filters' },
      { paramName: 'in_flag_type', paramValue: 'ALL' },
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
              this.feeFormGroup.get('courseId').setValue(this.courses[0].fk_course_id);
              this.selectedCourse(this.feeFormGroup.value.courseId);
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
    this.feeFormGroup.get('regulationId').setValue('');
    this.feeFormGroup.get('courseGroupId').setValue('');
    this.feeFormGroup.get('courseYearId').setValue('');
    this.feeFormGroup.get('academicYearId').setValue('');
    this.feeFormGroup.get('subjectId').setValue('');
    this.gradesDetailsList = [];
    this.searchExams = [];
    this.academicYearsList = [];
    this.academicYears = [];
    this.examsLists = [];
    this.examData = [];
    this.examsList = [];
    this.collegeFilterDetails = [];
    this.CollegesListDetails = [];
    this.colleges = [];
    this.groupList = [];
    this.courseGroups = [];
    this.courseYearsList = [];
    this.courseYears = [];
    this.subjectListDetails = [];
    this.examTimetableSubjectsList = [];
    this.examTimetableSubjects = [];
    /*----------- ACADEMIC YEAR -----------*/
    this.academicYearsList = this.examListDetails.filter(x => (x.fk_course_id === this.feeFormGroup.value.courseId))
    if (this.academicYearsList.length > 0) {
      const academicYears = this.academicYearsList.map(({ fk_academic_year_id }) => fk_academic_year_id);
      this.academicYears = this.academicYearsList.filter(({ fk_academic_year_id }, index) => !academicYears.includes(fk_academic_year_id, index + 1));
    }
    if (this.academicYears.length > 0) {
      const currentAY = this.academicYears?.sort((a, b) => (b.is_curr_ay ?? 0) - (a.is_curr_ay ?? 0))[0];
        if (currentAY?.fk_academic_year_id) {
        this.feeFormGroup.get('academicYearId')?.setValue(currentAY.fk_academic_year_id);
        }
        this.academicYears = this.academicYears.sort((a,b)=>parseInt(b?.academic_year) - parseInt(a?.academic_year));
      // this.academicYears = this.academicYears.sort((a, b) => parseInt(b.academic_year) - parseInt(a.academic_year));
      // this.feeFormGroup.get('academicYearId').setValue(this.academicYears[0].fk_academic_year_id);
      this.selectedAcademicYear(this.feeFormGroup.value.academicYearId)
    }
  }
  // tslint:disable-next-line:typedef
  selectedAcademicYear(academicYearId) {
    this.feeFormGroup.get('examId').setValue('');
    this.feeFormGroup.get('courseGroupId').setValue('');
    this.feeFormGroup.get('courseYearId').setValue('');
    this.feeFormGroup.get('regulationId').setValue('');
    this.feeFormGroup.get('subjectId').setValue('');
    this.searchExams = [];
    this.gradesDetailsList = [];
    this.examsLists = [];
    this.examData = [];
    this.examsList = [];
    this.collegeFilterDetails = [];
    this.CollegesListDetails = [];
    this.colleges = [];
    this.groupList = [];
    this.courseGroups = [];
    this.courseYearsList = [];
    this.courseYears = [];
    this.subjectListDetails = [];
    this.examTimetableSubjectsList = [];
    this.examTimetableSubjects = [];
    /*----------- EXAM LIST -----------*/
    this.examsLists = this.examListDetails.filter(x => (x.fk_course_id === this.feeFormGroup.value.courseId && x.fk_academic_year_id === academicYearId))
    if (this.examsLists.length > 0) {
      const examsLists = this.examsLists.map(({ fk_exam_id }) => fk_exam_id);
      this.examsList = this.examsLists.filter(({ fk_exam_id }, index) => !examsLists.includes(fk_exam_id, index + 1));
      this.examsList = this.examsList.filter(x => !x.is_internal_exam)
      this.examData = this.examsList;
    }
    if (this.examsList.length > 0) {
      this.feeFormGroup.get('examId').setValue(this.examsList[0].fk_exam_id);
      this.selectedExam(this.feeFormGroup.value.examId)
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
    this.feeFormGroup.get('regulationId').setValue('');
    this.feeFormGroup.get('courseGroupId').setValue('');
    this.feeFormGroup.get('courseYearId').setValue('');
    this.feeFormGroup.get('subjectId').setValue('');
    this.gradesDetailsList = [];
    this.groupList = [];
    this.courseGroups = [];
    this.regulations = [];
    this.collegeFilterDetails = [];
    this.CollegesListDetails = [];
    this.colleges = [];
    this.courseYearsList = [];
    this.courseYears = [];
    this.subjectListDetails = [];
    this.examTimetableSubjectsList = [];
    this.examTimetableSubjects = [];
    if (examId != null && examId !== undefined) {
      let flagType = 'REGSUP';
      if (this.check === 1) {
        flagType = 'INT';
      }
      let request = [
        { paramName: 'in_flag', paramValue: 'univ_exam_rest_in_regexamstd' },
        { paramName: 'in_flag_type', paramValue: flagType },
        { paramName: 'in_university_id', paramValue: 0 },
        { paramName: 'in_univ_examcenter_id', paramValue: 0 },
        { paramName: 'in_college_id', paramValue: 0 },
        { paramName: 'in_course_id', paramValue: this.feeFormGroup.value.courseId },
        { paramName: 'in_course_group_id', paramValue: 0 },
        { paramName: 'in_course_year_id', paramValue: 0 },
        { paramName: 'in_exam_id', paramValue: this.feeFormGroup.value.examId },
        { paramName: 'in_academic_year_id', paramValue: this.feeFormGroup.value.academicYearId },
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
              this.groupList = this.CollegesListDetails
              if (this.groupList.length > 0) {
                const groupList = this.groupList.map(({ fk_course_group_id }) => fk_course_group_id);
                this.courseGroups = this.groupList.filter(({ fk_course_group_id }, index) => !groupList.includes(fk_course_group_id, index + 1));
              }
              if (this.courseGroups.length > 0) {
                this.feeFormGroup.get('courseGroupId').setValue(this.courseGroups[0].fk_course_group_id);
                this.selectedGroup(this.feeFormGroup.value.courseGroupId);
              } else {
                this.feeFormGroup.get('courseGroupId').setValue('');
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

  selectedGroup(courseGroupId): void {
    this.feeFormGroup.get('regulationId').setValue('');
    this.feeFormGroup.get('courseYearId').setValue('');
    this.feeFormGroup.get('subjectId').setValue('');
    this.gradesDetailsList = [];
    this.courseYears = [];
    this.courseYearsList = [];
    this.regulationsList = [];
    this.regulations = [];
    this.subjectListDetails = [];
    this.examTimetableSubjectsList = [];
    this.examTimetableSubjects = [];
    /*----------- COURSES YEARS -----------*/
    this.courseYearsList = this.CollegesListDetails.filter(x => ( x.fk_course_group_id === this.feeFormGroup.value.courseGroupId))
    if (this.courseYearsList.length > 0) {
      const courseYearsList = this.courseYearsList.map(({ fk_course_year_id }) => fk_course_year_id);
      this.courseYears = this.courseYearsList.filter(({ fk_course_year_id }, index) => !courseYearsList.includes(fk_course_year_id, index + 1));
    }
    if (this.courseYears.length > 0) {
      this.feeFormGroup.get('courseYearId').setValue(this.courseYears[0].fk_course_year_id);
      this.selectedYear(this.feeFormGroup.value.courseYearId)
    }
    else {
      this.feeFormGroup.get('courseYearId').setValue('');
    }
  }
  selectedYear(courseYearId): void {
    this.feeFormGroup.get('regulationId').setValue('');
    this.feeFormGroup.get('subjectId').setValue('');
    this.regulationsList = [];
    this.regulations = [];
    this.subjectListDetails = [];
    this.examTimetableSubjectsList = [];
    this.examTimetableSubjects = [];
    this.gradesDetailsList = [];
    /*----------- REGULATION -----------*/
    this.regulationsList = this.CollegesListDetails.filter(x => ( x.fk_course_group_id === this.feeFormGroup.value.courseGroupId
      && x.fk_course_year_id === this.feeFormGroup.value.courseYearId
    ))
    if (this.regulationsList.length > 0) {
      const regulationsList = this.regulationsList.map(({ fk_regulation_id }) => fk_regulation_id);
      this.regulations = this.regulationsList.filter(({ fk_regulation_id }, index) => !regulationsList.includes(fk_regulation_id, index + 1));
    }
    if (this.regulations.length > 0) {
      this.feeFormGroup.get('regulationId').setValue(this.regulations[0].fk_regulation_id);
      this.selectedRegulation(this.feeFormGroup.value.regulationId);
    }
  }
  selectedRegulation(regulationId): void {
    this.feeFormGroup.get('subjectId').setValue('');
    this.subjectListDetails = [];
    this.examTimetableSubjectsList = [];
    this.examTimetableSubjects = [];
    this.gradesDetailsList = [];
    if (this.feeFormGroup.value.regulationId != null && regulationId != null) {
      /*----------- SUBJECTS -----------*/
      let flagType = 'REGSUP';
      if (this.check === 1) {
        flagType = 'INT';
      }
      let request = [
        { paramName: 'in_flag', paramValue: 'univ_exam_subject_regexamstd' },
        { paramName: 'in_flag_type', paramValue: flagType },
        { paramName: 'in_university_id', paramValue: 0 },
        { paramName: 'in_univ_examcenter_id', paramValue: 0 },
        { paramName: 'in_college_id', paramValue: 0 },
        { paramName: 'in_course_id', paramValue: this.feeFormGroup.value.courseId },
        { paramName: 'in_course_group_id', paramValue: this.feeFormGroup.value.courseGroupId },
        { paramName: 'in_course_year_id', paramValue: this.feeFormGroup.value.courseYearId },
        { paramName: 'in_exam_id', paramValue: this.feeFormGroup.value.examId },
        { paramName: 'in_academic_year_id', paramValue: this.feeFormGroup.value.academicYearId },
        { paramName: 'in_regulation_id', paramValue: this.feeFormGroup.value.regulationId },
        { paramName: 'in_sub_flag_type', paramValue: 'ALL' },
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
                  this.examTimetableSubjects = list;
                  break;
                }
              }
              if (this.examTimetableSubjects && this.examTimetableSubjects.length > 0) {
                const subjectList = this.examTimetableSubjects.map(({ fk_subject_id }) => fk_subject_id);
                this.examTimetableSubjectsList = this.examTimetableSubjects.filter(({ fk_subject_id }, index) =>
                  !subjectList.includes(fk_subject_id, index + 1));
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

  getColleges(): void {
    this.collegeLogo = [];
    /*----------- COLLEGES -----------*/
    this.crudService.listDetailsById(this.collegeCrudUrl, 'true', 'isActive')
      .subscribe(result => {
        if (result.statusCode === 200) {
          if (result.data.resultList && result.data.resultList !== '') {
            this.collegeLogo = result.data.resultList;
            this.Logo = this.collegeLogo.filter(x => (x.collegeId == this.feeFormGroup.value.collegeId))[0].logo
            this.collegeName = this.collegeLogo.filter(x => (x.collegeId == this.feeFormGroup.value.collegeId))[0].collegeName
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
  getGradeList(): void {
    let request = []
    this.gradesDetailsList = [];
    if (this.feeFormGroup.valid) {
      this.spinner.show();
      this.getColleges();
      if (this.feeFormGroup.value.courseGroupId != 0) {
        this.groupCode = this.courseGroups.filter(x => (x.fk_course_group_id == this.feeFormGroup.value.courseGroupId))[0].group_code
      }
      else {
        this.groupCode = ''
      }
      if (this.feeFormGroup.value.subjectId != 0) {
        this.subjectcode = this.examTimetableSubjectsList.filter(x => (x.fk_subject_id == this.feeFormGroup.value.subjectId))[0].subject_code
      }
      else {
        this.subjectcode = ''
      }
      request = [
        { paramName: 'in_flag', paramValue: 'ext_int_exam_marks_entered_count' },
        { paramName: 'in_exam_id', paramValue: this.feeFormGroup.value.examId },
        { paramName: 'in_college_id', paramValue: 0 },
        { paramName: 'in_course_id', paramValue: this.feeFormGroup.value.courseId },
        { paramName: 'in_course_group_id', paramValue: this.feeFormGroup.value.courseGroupId },
        { paramName: 'in_course_year_id', paramValue: this.feeFormGroup.value.courseYearId },
        { paramName: 'in_academic_year_id', paramValue: this.feeFormGroup.value.academicYearId }, 
        { paramName: 'in_regulation_id', paramValue: this.feeFormGroup.value.regulationId }, 
        { paramName: 'in_subject_id', paramValue: this.feeFormGroup.value.subjectId }, 
      ];
      this.crudService.getDetailsByRequest(this.ExamPreModerationUrl, '', request, '&')
        .subscribe(result => {
          this.spinner.hide();
          if (result.statusCode === 200) {
            if (result.data && result.data !== '' && result.data.result.length > 0) {
              this.gradesDetailsList = result.data.result[0];
              if (this.check == 4) {
                this.AlldisplayedColumns = Object.keys(this.gradesDetailsList[0]);
                this.AlldisplayedColumns.splice(0, 1);
              }
              if (this.check == 1) {
                this.AlldisplayedColumns = Object.keys(this.gradesDetailsList[0]);
                this.AlldisplayedColumns.splice(0, 1);
              }
              console.log(this.gradesDetailsList,'this.gradesDetailsList');
              this.dataSource = new MatTableDataSource<any>(this.gradesDetailsList);
              setTimeout(() => this.dataSource.paginator = this.paginator);
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
    }
  }
  getGradeInternalList(): void {
    let request = []
    this.gradesDetailsList = [];
    if (this.feeFormGroup.valid) {
      this.spinner.show();
      this.getColleges();
      if (this.feeFormGroup.value.courseGroupId != 0) {
        this.groupCode = this.courseGroups.filter(x => (x.fk_course_group_id === this.feeFormGroup.value.courseGroupId))[0].group_code
      }
      else {
        this.groupCode = ''
      }
      if (this.feeFormGroup.value.subjectId != 0) {
        this.subjectcode = this.examTimetableSubjectsList.filter(x => (x.fk_subject_id === this.feeFormGroup.value.subjectId))[0].subject_code
      }
      else {
        this.subjectcode = ''
      }
      request = [
        { paramName: 'in_flag', paramValue: 'int_exam_marks_entered_count' },
        { paramName: 'in_exam_id', paramValue: this.feeFormGroup.value.examId },
        { paramName: 'in_college_id', paramValue: 0 },
        { paramName: 'in_course_id', paramValue: this.feeFormGroup.value.courseId },
        { paramName: 'in_course_group_id', paramValue: this.feeFormGroup.value.courseGroupId },
        { paramName: 'in_course_year_id', paramValue: this.feeFormGroup.value.courseYearId },
        { paramName: 'in_academic_year_id', paramValue: this.feeFormGroup.value.academicYearId }, 
        { paramName: 'in_regulation_id', paramValue: this.feeFormGroup.value.regulationId }, 
        { paramName: 'in_subject_id', paramValue: this.feeFormGroup.value.subjectId }, 
      ];
      this.crudService.getDetailsByRequest(this.ExamPreModerationUrl, '', request, '&')
        .subscribe(result => {
          this.spinner.hide();
          if (result.statusCode === 200) {
            if (result.data && result.data !== '' && result.data.result.length > 0) {
              this.gradesDetailsList = result.data.result[0];
              this.dataSource = new MatTableDataSource<any>(this.gradesDetailsList);
              this.IntdisplayedColumns = Object.keys(this.gradesDetailsList[0]);
              this.IntdisplayedColumns.splice(0, 1);
              setTimeout(() => this.dataSource.paginator = this.paginator);
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
    }
  }
  getLabList(): void {
    this.gradesDetailsList = [];
    if (this.feeFormGroup.valid) {
      this.spinner.show();
      this.getColleges();
      if (this.feeFormGroup.value.courseGroupId != 0) {
        this.groupCode = this.courseGroups.filter(x => (x.fk_course_group_id == this.feeFormGroup.value.courseGroupId))[0].group_code
      }
      else {
        this.groupCode = ''
      }
      if (this.feeFormGroup.value.subjectId != 0) {
        this.subjectcode = this.examTimetableSubjectsList.filter(x => (x.fk_subject_id == this.feeFormGroup.value.subjectId))[0].subject_code
      }
      else {
        this.subjectcode = ''
      }
      let request = [
        { paramName: 'in_flag', paramValue: 'external_lab_marks_entered' },
        { paramName: 'in_exam_id', paramValue: this.feeFormGroup.value.examId },
        { paramName: 'in_college_id', paramValue: 0 },
        { paramName: 'in_course_id', paramValue: this.feeFormGroup.value.courseId },
        { paramName: 'in_course_group_id', paramValue: this.feeFormGroup.value.courseGroupId },
        { paramName: 'in_course_year_id', paramValue: this.feeFormGroup.value.courseYearId },
        { paramName: 'in_academic_year_id', paramValue: this.feeFormGroup.value.academicYearId }, 
        { paramName: 'in_regulation_id', paramValue: this.feeFormGroup.value.regulationId }, 
        { paramName: 'in_subject_id', paramValue: this.feeFormGroup.value.subjectId }, 
      ];
      this.crudService.getDetailsByRequest(this.ExamPreModerationUrl, '', request, '&')
        .subscribe(result => {
          this.spinner.hide();
          if (result.statusCode === 200) {
            if (result.data && result.data !== '' && result.data.result.length > 0) {
              this.gradesDetailsList = result.data.result[0];
              this.dataSource = new MatTableDataSource<any>(this.gradesDetailsList);
              setTimeout(() => this.dataSource.paginator = this.paginator);
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
    }
  }
  // tslint:disable-next-line:typedef
  applyFilter(filterValue: string) {
    this.dataSource.filter = filterValue.trim().toLowerCase();
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }
  clear($event: MatRadioChange) {
    this.gradesDetailsList = [];
    this.dataSource = new MatTableDataSource<any>(this.gradesDetailsList);
    setTimeout(() => this.dataSource.paginator = this.paginator);
    this.dataSource.sort = this.sort;
    if ($event.value === 2) {
      this.check = 2
    }
    else if ($event.value === 1) {
      this.check = 1

    } else if ($event.value === 3) {
      this.check = 3
    }
    else {
      this.check = 4
    }
  }
  printPage() {
    window.print()
  }
  exportAsExcel(item) {
    const uri = 'data:application/vnd.ms-excel;base64,';
    const template = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>{worksheet}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table>{table}</table></body></html>`;
    const base64 = function (s) { return window.btoa(unescape(encodeURIComponent(s))) };
    const format = function (s, c) { return s.replace(/{(\w+)}/g, function (m, p) { return c[p]; }) };
    const table = this.excelTable.nativeElement;
    const ctx = { worksheet: 'Worksheet', table: table.innerHTML };
    const link = document.createElement('a');
    if (item == 'external') {
      link.download = `${this.trafoexternalItem}.xls`;
      link.href = uri + base64(format(template, ctx));
      link.click();
    }
    else if (item == 'internal') {
      link.download = `${this.trafointernalItem}.xls`;
      link.href = uri + base64(format(template, ctx));
      link.click();
    }
    else if (item == 'evaluation') {
      link.download = `${this.trafoItem}.xls`;
      link.href = uri + base64(format(template, ctx));
      link.click();
    }
    else {
      link.download = `${this.alltrafoItem}.xls`;
      link.href = uri + base64(format(template, ctx));
      link.click();
    }
  }
  goBack() {
    this.location.back();
  }
}