  import { Component, OnInit, ViewChild } from '@angular/core';
  import { FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
  import { ActivatedRoute, Router } from '@angular/router';
  import { CONSTANTS } from 'app/main/common/constants';
  import { GenericFunctions } from 'app/main/common/generic-functions';
  import { AcademicYear } from 'app/main/models/academicYear';
  import { College } from 'app/main/models/college';
  import { Course } from 'app/main/models/course';
  import { CourseGroup } from 'app/main/models/courseGroup';
  import { CourseYear } from 'app/main/models/courseYear';
  import { ExamMaster } from 'app/main/models/examMaster';
  import { GeneralDetail } from 'app/main/models/generalDetail';
  import { CrudService } from 'app/main/services/crud.service';
  import { SnotifyService } from 'ng-snotify';
  import { NgxSpinnerService } from 'ngx-spinner';
  import { Location } from '@angular/common';
  import { MatDialog } from '@angular/material/dialog';
  import { MatPaginator } from '@angular/material/paginator';
  import { MatSort } from '@angular/material/sort';
  import { MatTableDataSource } from '@angular/material/table';

  @Component({
  selector: 'app-internal-exam-registration-multiple',
  templateUrl: './internal-exam-registration-multiple.component.html',
  styleUrls: ['./internal-exam-registration-multiple.component.scss']
  })

  export class InternalExamRegistrationMultipleComponent implements OnInit {

  dataSource: MatTableDataSource<any>;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  panelOpenState = true;

  private getExamFiltersBycodeUrl = CONSTANTS.getExamFiltersBycodeUrl;
  private generalDetailsUrl = CONSTANTS.generalDetailsUrl;
  private generalDetailsByCodeUrl = CONSTANTS.generalDetailsByCodeUrl;
  private examFeeType = CONSTANTS.examFeeType;
  private examStudentPostUrl = CONSTANTS.examStudentPostUrl;
  private isActive = CONSTANTS.isActive;
  private examSubjectStudentsUrl = CONSTANTS.examSubjectStudentsUrl;
  private registeredStudentForExamUrl = CONSTANTS.registeredStudentForExamUrl;
  public ExamFilterCtrl: FormControl = new FormControl();

  public searchText: string;
  public searchText1: string;
  public searchText2: string;
  public ExamMasterFilterCtrl: FormControl = new FormControl();

  examFeeCollectionForm: FormGroup;
  colleges = [];
  academicYears = [];
  courses = [];
  examsList = [];
  courseGroups = [];
  courseYears = [];
  subjectTypes = [];
  courseYearSubjects: any[] = [];
  courseYearSubjectsByType: any[] = [];
  students: any[] = [];
  allStudentSubects: any[] = [];
  selectedStudents: any[] = [];
  examType: any[] = [];
  checksubject = true;
  registeredStudents: any[] = [];
  examDate: any[];
  filtersDetailsList = [];
  CollegesListDetails = [];
  academicYearsList = [];
  courseListData = [];
  groupList = [];
  courseYearsList = [];
  examsLists = [];
  examData = [];
  regulationId: any;
  regulationFilterList: any[];
  regulationList: any[];
  courseGroupList: any[];
  CollegesListFilterDetails: any[];
  subjectsDetailList: any[];
  subjectData: any[];
  subjectsList: any[];
  subjectDetailsList: any[];
  collegefiltersDetailsList = []
  regulationDetailsList = [];

  constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,
    private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router,
    private genericFunctions: GenericFunctions, private _location: Location) {
    this.getFiltersList();
    this.getData();
    this.dataSource = new MatTableDataSource<any>(this.students);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  ngOnInit(): void {
    this.examFeeCollectionForm = this.formBuilder.group({
      courseId: ['', Validators.required],
      collegeId: ['', Validators.required],
      academicYearId: ['', Validators.required],
      courseGroupId: ['', Validators.required],
      examId: ['', Validators.required],
      studentId: ['', Validators.required],
      courseYearId: ['', Validators.required],
      subjectTypeId: ['', Validators.required],
      subjectId: [''],
      regulationId: ['', Validators.required],
      examtypeCatId: ['', Validators.required],
      fDate: [this.genericFunctions.moment()]
    });
  }


  getData(): void {
    /*----------- EXAM TYPE -----------*/
    this.crudService.listDetailsByTwoIds(this.generalDetailsUrl, this.examFeeType, 'true', this.generalDetailsByCodeUrl, this.isActive)
      .subscribe(result => {
        if (result.statusCode === 200) {
          if (result.data.resultList && result.data.resultList !== '') {
            this.examType = result.data.resultList;
            if (this.examType.length > 0) {
              this.examFeeCollectionForm.get('examtypeCatId').setValue(
                this.examType.filter(x => (x.generalDetailCode === 'Internal'))[0].generalDetailId
              );

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
  getFiltersList(): void {
    this.spinner.show()
    let request = [
      { paramName: 'in_flag', paramValue: 'univ_exam_filters' },
      { paramName: 'in_flag_type', paramValue: 'INT' },
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
            if (this.courses.length > 0) {
              this.examFeeCollectionForm.get('courseId').setValue(this.courses[0].fk_course_id);
              this.selectedCourse(this.examFeeCollectionForm.value.courseId)
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
    this.examFeeCollectionForm.get('academicYearId').setValue('')
      this.examFeeCollectionForm.get('examId').setValue('');
      this.examFeeCollectionForm.get('collegeId').setValue('');
      this.examFeeCollectionForm.get('courseGroupId').setValue('');
      this.examFeeCollectionForm.get('courseYearId').setValue('');
      this.examFeeCollectionForm.get('regulationId').setValue('');
      this.examFeeCollectionForm.get('subjectId').setValue('');
      this.examsList = [];
      this.CollegesListDetails = [];
      this.subjectsDetailList = [];
      this.subjectTypes = [];
      this.subjectData = [];
      this.courseYearSubjectsByType = [];
      this.subjectsList = [];
      this.subjectDetailsList = [];
      this.collegefiltersDetailsList = []
      this.regulationDetailsList = [];
      this.regulationFilterList = [];
      this.examsLists = []
      this.examsList = []
      this.examData = []
      this.colleges = []
      this.courseGroups = []
      this.courseYears = []
      this.regulationList = []
      this.subjectData = []
      this.academicYears = []
      this.academicYearsList = []
      this.selectedStudents = [];
      this.registeredStudents = [];
      this.students = [];
    if (courseId != null) {
      this.academicYearsList = this.CollegesListFilterDetails.filter(x => (x.fk_course_id == this.examFeeCollectionForm.value.courseId))
      if (this.academicYearsList.length > 0) {
        const academicYears = this.academicYearsList.map(({ fk_academic_year_id }) => fk_academic_year_id);
        this.academicYears = this.academicYearsList.filter(({ fk_academic_year_id }, index) => !academicYears.includes(fk_academic_year_id, index + 1));
      }
      if (this.academicYears && this.academicYears.length > 0) {
        const currentAY = this.academicYears?.sort((a, b) => (b.is_curr_ay ?? 0) - (a.is_curr_ay ?? 0))[0];
        if (currentAY?.fk_academic_year_id) {
        this.examFeeCollectionForm.get('academicYearId')?.setValue(currentAY.fk_academic_year_id);
        }
        this.academicYears = this.academicYears.sort((a,b)=>parseInt(b?.academic_year) - parseInt(a?.academic_year));
        // this.examFeeCollectionForm.get('academicYearId').setValue(this.academicYears[0].fk_academic_year_id);
        this.selectedAcademicYear(this.examFeeCollectionForm.value.academicYearId)
      }
    }
  }
  selectedAcademicYear(academicYearId): void {
    this.examFeeCollectionForm.get('examId').setValue('');
    this.examFeeCollectionForm.get('collegeId').setValue('');
    this.examFeeCollectionForm.get('courseGroupId').setValue('');
    this.examFeeCollectionForm.get('courseYearId').setValue('');
    this.examFeeCollectionForm.get('regulationId').setValue('');
    this.examFeeCollectionForm.get('subjectId').setValue('');
    this.examsList = [];
    this.CollegesListDetails = [];
    this.subjectsDetailList = [];
    this.subjectTypes = [];
    this.subjectData = [];
    this.courseYearSubjectsByType = [];
    this.subjectsList = [];
    this.subjectDetailsList = [];
    this.collegefiltersDetailsList = []
    this.regulationDetailsList = [];
    this.regulationFilterList = [];
    this.regulationList = [];
    this.examsLists = []
    this.examsList = []
    this.examData = []
    this.colleges = []
    this.courseGroups = []
    this.courseYears = []
    this.regulationList = []
    this.subjectData = [];
    this.selectedStudents = [];
    this.registeredStudents = [];
    this.students = [];
    if (academicYearId) {
      this.examsLists = this.CollegesListFilterDetails.filter(x => (x.fk_course_id === this.examFeeCollectionForm.value.courseId && x.fk_academic_year_id == this.examFeeCollectionForm.value.academicYearId))
      if (this.examsLists.length > 0) {
        const examsLists = this.examsLists.map(({ fk_exam_id }) => fk_exam_id);
        this.examsList = this.examsLists.filter(({ fk_exam_id }, index) => !examsLists.includes(fk_exam_id, index + 1));
        this.examData = this.examsList;
      }
      if (this.examsList.length > 0) {
        this.examFeeCollectionForm.get('examId').setValue(this.examsList[0].fk_exam_id);
        this.selectedExam(this.examFeeCollectionForm.value.examId);
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
    this.examFeeCollectionForm.get('collegeId').setValue('');
    this.examFeeCollectionForm.get('courseGroupId').setValue('');
    this.examFeeCollectionForm.get('courseYearId').setValue('');
    this.examFeeCollectionForm.get('regulationId').setValue('');
    this.examFeeCollectionForm.get('subjectId').setValue('');
    this.CollegesListDetails = [];
    this.subjectsDetailList = [];
    this.subjectTypes = [];
    this.subjectData = [];
    this.courseYearSubjectsByType = [];
    this.subjectsList = [];
    this.subjectDetailsList = [];
    this.collegefiltersDetailsList = []
    this.regulationDetailsList = [];
    this.regulationFilterList = [];
    this.regulationList = [];
    this.colleges = []
    this.courseGroups = []
    this.courseYears = []
    this.regulationList = [];
    this.selectedStudents = [];
    this.registeredStudents = [];
    this.students = [];
    let request = [
      { paramName: 'in_flag', paramValue: 'univ_exam_rest_no_tt' },
      { paramName: 'in_flag_type', paramValue: 'ALL' },
      { paramName: 'in_university_id', paramValue: 0 },
      { paramName: 'in_college_id', paramValue: 0 },
      { paramName: 'in_course_id', paramValue: this.examFeeCollectionForm.value.courseId },
      { paramName: 'in_course_group_id', paramValue: 0 },
      { paramName: 'in_course_year_id', paramValue: 0 },
      { paramName: 'in_exam_id', paramValue: this.examFeeCollectionForm.value.examId },
      { paramName: 'in_academic_year_id', paramValue: this.examFeeCollectionForm.value.academicYearId },
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
            this.collegefiltersDetailsList = result.data.result;
            for (let i = 0; i < this.collegefiltersDetailsList.length; i++) {
              if (this.collegefiltersDetailsList[i].length > 0 && this.collegefiltersDetailsList[i][0].flag === 'univ_exam_rest_filters') {
                this.CollegesListDetails = this.collegefiltersDetailsList[i];
              }
            }
            if (this.CollegesListDetails) {
              /*----------- Colleges -----------*/
              this.colleges = this.CollegesListDetails
              const CollegeIdData = this.colleges.map(({ fk_college_id }) => fk_college_id);
              this.colleges = this.colleges.filter(({ fk_college_id }, index) => !CollegeIdData.includes(fk_college_id, index + 1));
              if (this.colleges.length > 0) {
                this.examFeeCollectionForm.get('collegeId').setValue(this.colleges[0].fk_college_id);
                this.selectedCollege(this.examFeeCollectionForm.value.collegeId);
              }
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
  selectedCollege(collegeId): void {
    this.courseGroups = []
    this.examFeeCollectionForm.get('courseGroupId').setValue('');
    this.examFeeCollectionForm.get('courseYearId').setValue('');
    this.examFeeCollectionForm.get('regulationId').setValue('');
    this.examFeeCollectionForm.get('subjectId').setValue('');
    this.courseGroupList = []
    this.courseGroups = []
    this.courseYears = []
    this.regulationList = []
    this.subjectData = []
    this.subjectsDetailList = [];
    this.subjectTypes = [];
    this.courseYearSubjectsByType = [];
    this.subjectsList = [];
    this.subjectDetailsList = [];
    this.regulationDetailsList = [];
    this.regulationFilterList = [];
    this.regulationList = [];
    this.selectedStudents = [];
    this.registeredStudents = [];
    this.students = [];
    if (collegeId != null) {
      this.courseGroupList = this.CollegesListDetails.filter(x => (x.fk_college_id == this.examFeeCollectionForm.value.collegeId))
      if (this.courseGroupList.length > 0) {
        const courseGroups = this.courseGroupList.map(({ fk_course_group_id }) => fk_course_group_id);
        this.courseGroups = this.courseGroupList.filter(({ fk_course_group_id }, index) => !courseGroups.includes(fk_course_group_id, index + 1));
      }
      if (this.courseGroups.length > 0) {
        this.examFeeCollectionForm.get('courseGroupId').setValue(this.courseGroups[0].fk_course_group_id);
        this.selectedGroup(this.examFeeCollectionForm.value.courseGroupId)
      }
    }
  }
  selectedGroup(courseGroupId): void {
    this.examFeeCollectionForm.get('courseYearId').setValue('');
    this.examFeeCollectionForm.get('regulationId').setValue('');
    this.examFeeCollectionForm.get('subjectId').setValue('');
    this.courseYearsList = []
    this.courseYears = []
    this.regulationList = []
    this.subjectData = []
    this.subjectsDetailList = [];
    this.subjectTypes = [];
    this.courseYearSubjectsByType = [];
    this.subjectsList = [];
    this.subjectDetailsList = [];
    this.regulationDetailsList = [];
    this.regulationFilterList = [];
    this.regulationList = [];
    this.selectedStudents = [];
    this.registeredStudents = [];
    this.students = [];
    /*----------- COURSES Years -----------*/
    this.courseYearsList = this.CollegesListDetails.filter(x => (x.fk_college_id == this.examFeeCollectionForm.value.collegeId && x.fk_course_group_id == courseGroupId))
    if (this.courseYearsList.length > 0) {
      const courseYearsList = this.courseYearsList.map(({ fk_course_year_id }) => fk_course_year_id);
      this.courseYears = this.courseYearsList.filter(({ fk_course_year_id }, index) => !courseYearsList.includes(fk_course_year_id, index + 1));
    }
    if (this.courseYears.length > 0) {
      this.examFeeCollectionForm.get('courseYearId').setValue(this.courseYears[0].fk_course_year_id);
      this.selectedYear(this.examFeeCollectionForm.value.courseYearId);
    }
  }
  selectedYear(courseYearId) {
    this.examFeeCollectionForm.get('subjectId').setValue('');
    this.examFeeCollectionForm.get('regulationId').setValue('');
    this.subjectsDetailList = [];
    this.subjectTypes = [];
    this.subjectData = [];
    this.courseYearSubjectsByType = [];
    this.subjectsList = [];
    this.subjectDetailsList = [];
    this.regulationDetailsList = [];
    this.regulationFilterList = [];
    this.regulationList = [];
    this.selectedStudents = [];
    this.registeredStudents = [];
    this.students = [];
    if (courseYearId) {
      let request = [
        { paramName: 'in_flag', paramValue: 'univ_exam_subject_inss' },
        { paramName: 'in_flag_type', paramValue: 'ALL' },
        { paramName: 'in_university_id', paramValue: 0 },
        { paramName: 'in_college_id', paramValue: this.examFeeCollectionForm.value.collegeId },
        { paramName: 'in_course_id', paramValue: this.examFeeCollectionForm.value.courseId },
        { paramName: 'in_course_group_id', paramValue: this.examFeeCollectionForm.value.courseGroupId },
        { paramName: 'in_course_year_id', paramValue: this.examFeeCollectionForm.value.courseYearId },
        { paramName: 'in_exam_id', paramValue: this.examFeeCollectionForm.value.examId },
        { paramName: 'in_academic_year_id', paramValue: this.examFeeCollectionForm.value.academicYearId },
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
              this.regulationDetailsList = result.data.result;
              for (let i = 0; i < this.regulationDetailsList.length; i++) {
                if (this.regulationDetailsList[i].length > 0 && this.regulationDetailsList[i][0].flag === 'univ_exam_sub_inss') {
                  this.regulationFilterList = this.regulationDetailsList[i];
                }
              }
              if (this.regulationFilterList && this.regulationFilterList.length > 0) {
                const regulationDetailList = this.regulationFilterList.map(({ fk_regulation_id }) => fk_regulation_id);
                this.regulationList = this.regulationFilterList.filter(({ fk_regulation_id }, index) =>
                  !regulationDetailList.includes(fk_regulation_id, index + 1));
              }
              if (this.regulationList && this.regulationList.length > 0) {
                this.examFeeCollectionForm.get('regulationId').setValue(this.regulationList[0].fk_regulation_id);
                this.selectedRegulation(this.examFeeCollectionForm.value.regulationId)
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
  selectedRegulation(regulationId): void {
    this.examFeeCollectionForm.get('subjectId').setValue('');
    this.subjectsDetailList = [];
    this.subjectTypes = [];
    this.subjectData = [];
    this.courseYearSubjectsByType = [];
    this.subjectsList = [];
    this.subjectDetailsList = [];
    this.selectedStudents = [];
    this.registeredStudents = [];
    this.students = [];
    this.subjectsDetailList = this.regulationFilterList.filter(x => (x.fk_regulation_id === regulationId))
    if (this.subjectsDetailList && this.subjectsDetailList.length > 0) {
      const subjectsDetailList = this.subjectsDetailList.map(({ fk_subjecttype_catdet_id }) => fk_subjecttype_catdet_id);
      this.subjectTypes = this.subjectsDetailList.filter(({ fk_subjecttype_catdet_id }, index) => !subjectsDetailList.includes(fk_subjecttype_catdet_id, index + 1));
    }
    if (this.subjectTypes.length > 0) {
      this.examFeeCollectionForm.get('subjectTypeId').setValue(this.subjectTypes[0].fk_subjecttype_catdet_id);
      this.selectedSubjectType(this.examFeeCollectionForm.value.subjectTypeId)
    }
  }
  selectedSubjectType(subjectTypeId): void {
    this.courseYearSubjectsByType = [];
    this.subjectsList = [];
    this.subjectDetailsList = [];
    this.searchText = '';
    this.searchText1 = '';
    this.searchText2 = '';
    this.selectedStudents = [];
    this.registeredStudents = [];
    this.students = [];
    this.subjectsList = this.regulationFilterList.filter(x => (x.fk_regulation_id === this.examFeeCollectionForm.value.regulationId && x.fk_subjecttype_catdet_id == this.examFeeCollectionForm.value.subjectTypeId))
    if (this.subjectsList.length > 0) {
      const subjectsDetailList = this.subjectsList.map(({ fk_subject_id }) => fk_subject_id);
      this.subjectDetailsList = this.subjectsList.filter(({ fk_subject_id }, index) => !subjectsDetailList.includes(fk_subject_id, index + 1));
    }
    this.subjectData = this.subjectDetailsList;
    if (this.subjectDetailsList.length > 0) {
      this.examFeeCollectionForm.get('subjectId').setValue(this.subjectDetailsList[0].fk_subject_id);
      this.selectedSubject(this.examFeeCollectionForm.value.subjectId)
    }
  }
  selectedSubject(subjectId): void {
    this.selectedStudents = [];
    this.registeredStudents = [];
    this.students = [];
    if (subjectId !== null && subjectId !== undefined) {
      this.getRegisteredStudents();
      /*----------------- STUDENTS ----------------*/
      this.crudService.listByEightIds(this.examSubjectStudentsUrl,
        this.examFeeCollectionForm.value.collegeId, this.examFeeCollectionForm.value.academicYearId,
        this.examFeeCollectionForm.value.courseId, this.examFeeCollectionForm.value.courseGroupId, this.examFeeCollectionForm.value.courseYearId,
        this.examFeeCollectionForm.value.regulationId, this.examFeeCollectionForm.value.subjectId, this.examFeeCollectionForm.value.subjectTypeId,
        'collegeId', 'academicYearId', 'courseId', 'courseGroupId', 'courseYearId', 'regulationId', 'subjectId', 'subjectTypeId')
        .subscribe(result => {
          this.spinner.hide();
          if (result.statusCode === 200) {
            if (result.data && result.data !== '') {
              this.students = result.data;
              this.markAll();
            } else {

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
  searchSubject(value) {
    this.subjectData = [];
    this.searchsubject(value)
  }
  searchsubject(value: string) {
    let filter = value.toLowerCase();
    for (let i = 0; i < this.subjectsDetailList.length; i++) {
      let option = this.subjectsDetailList[i];
      if (option.subject_name.toLowerCase().indexOf(filter) >= 0) {
        this.subjectData.push(option);
      } else
        if (option.subject_code.toLowerCase().indexOf(filter) >= 0) {
          this.subjectData.push(option);
        }
    }
  }
  markAll(): void {
    this.selectedStudents = [];
    if (this.checksubject === true) {
      // tslint:disable-next-line: prefer-for-of
      for (let i = 0; i < this.students.length; i++) {
        this.students[i].checked = true;
        this.students[i].c = true;
        this.students[i].courseYearId = this.examFeeCollectionForm.value.courseYearId;
        this.students[i].collegeId = this.examFeeCollectionForm.value.collegeId;
        this.students[i].examId = this.examFeeCollectionForm.value.examId;
        this.students[i].examtypeCatId = this.examFeeCollectionForm.value.examtypeCatId;
        this.students[i].subjectId = this.examFeeCollectionForm.value.subjectId;
        this.students[i].isActive = true;
        this.students[i].registrationDate = this.genericFunctions.moment();
        if (this.registeredStudents.filter(x => (x.studentId === this.students[i].studentId)).length === 0) {
          this.selectedStudents.push(this.students[i]);
        } else {
          this.students[i].checked = false;
          this.students[i].c = false;
        }
      }
      // this.selectedStudents = this.students;     
    } else {
      // tslint:disable-next-line: prefer-for-of
      for (let i = 0; i < this.students.length; i++) {
        this.students[i].checked = false;
        this.students[i].c = false;
        this.students[i].courseYearId = this.examFeeCollectionForm.value.courseYearId;
        this.students[i].collegeId = this.examFeeCollectionForm.value.collegeId;
        this.students[i].examId = this.examFeeCollectionForm.value.examId;
        this.students[i].examtypeCatId = this.examFeeCollectionForm.value.examtypeCatId;
        this.students[i].subjectId = this.examFeeCollectionForm.value.subjectId;
        this.students[i].isActive = true;
        this.students[i].registrationDate = this.genericFunctions.moment();
      }
    }
  }
  checkedStudent(check, item): void {
    item.c = check;
    if (this.registeredStudents.filter(x => (x.studentId === item.studentId)).length > 0) {
      item.checked = check;
      item.c = !check;
      this.snotifyService.info('Student is already registered with this subject.', 'Info!');
    } else {
      this.selectedStudents = [];
      // tslint:disable-next-line: prefer-for-of
      for (let i = 0; i < this.students.length; i++) {
        if (this.students[i].c) {
          this.selectedStudents.push(this.students[i]);
        }
      }
    }
  }
  // tslint:disable-next-line:typedef
  applyFilter(filterValue: string) {
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }
  registerStudents(): void {
    // tslint:disable-next-line: prefer-for-of
    for (let index = 0; index < this.selectedStudents.length; index++) {
      this.selectedStudents[index].examStudentDetailDTOs = [];
      this.selectedStudents[index].isInternalExam = true,
        this.selectedStudents[index].regulationId = this.examFeeCollectionForm.value.regulationId,
        this.selectedStudents[index].courseGroupId = this.examFeeCollectionForm.value.courseGroupId,
      this.selectedStudents[index].examStudentDetailDTOs.push({
        collegeId: this.selectedStudents[index].collegeId,
        subjectId: this.selectedStudents[index].subjectId,
        isActive: this.selectedStudents[index].isActive,
      });
    }
    this.spinner.show();
    /*---------- EXAM REGISTRATION ----------*/
    this.crudService.add(this.examStudentPostUrl, this.selectedStudents)
      .subscribe(result => {
        this.spinner.hide();
        if (result.success) {
          this.snotifyService.success(result.message, 'Success!');
          this.selectedStudents = [];
          this.students = [];
          // this.examFeeCollectionForm.get('subjectId').setValue('');
          this.selectedSubject(this.examFeeCollectionForm.value.subjectId);
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
  getRegisteredStudents(): void {
    this.registeredStudents = [];
    this.crudService.listByEightIds(this.registeredStudentForExamUrl,
      this.examFeeCollectionForm.value.collegeId, this.examFeeCollectionForm.value.academicYearId,
      this.examFeeCollectionForm.value.courseId, this.examFeeCollectionForm.value.courseGroupId, this.examFeeCollectionForm.value.courseYearId,
      this.examFeeCollectionForm.value.regulationId, this.examFeeCollectionForm.value.subjectId, this.examFeeCollectionForm.value.examId,
      'collegeId', 'academicYearId', 'courseId', 'courseGroupId', 'courseYearId', 'regulationId', 'subjectId', 'examId')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.success) {
            this.registeredStudents = result.data;
          }
          //  else {
          //      this.snotifyService.success(result.message, 'Success!');
          //  }
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
  goBack(): void {
    this._location.back();
  }
  }