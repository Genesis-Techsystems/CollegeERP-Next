import { Component, OnInit } from '@angular/core';
import { CONSTANTS } from 'app/main/common/constants';
import { FormGroup, FormControl, FormBuilder, Validators } from '@angular/forms';
import { Subject, ReplaySubject } from 'rxjs';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { Router, ActivatedRoute } from '@angular/router';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { takeUntil } from 'rxjs/operators';
import { MatRadioChange } from '@angular/material/radio';

@Component({
  selector: 'app-grade-memo-issue',
  templateUrl: './grade-memo-issue.component.html',
  styleUrls: ['./grade-memo-issue.component.scss']
})
export class GradeMemoIssueComponent implements OnInit {

  private examMarksMemoUrl = CONSTANTS.examMarksMemoUrl;
  private examMemoMasterCrudUrl = CONSTANTS.examMemoMasterCrudUrl;
  private studentSearchUrl = CONSTANTS.studentSearchUrl;
  private collegeCertificateUrl = CONSTANTS.CollegeCertificateUrl;
  private isActive = CONSTANTS.isActive;
  private examStudentCrudUrl = CONSTANTS.examStudentCrudUrl;
  private generalDetailsUrl = CONSTANTS.generalDetailsUrl;
  private generalDetailsByCodeUrl = CONSTANTS.generalDetailsByCodeUrl;
  private examResult = CONSTANTS.examResult;
  private feeCertificateIssueCrudUrl = CONSTANTS.feeCertificateIssueCrudUrl;
  private certificateIssueStatus = CONSTANTS.certificateIssueStatus;
  private feeCertificateIssueUrl = CONSTANTS.feeCertificateIssueUrl;
  private endURL = CONSTANTS.MAINAPI;
  private examMarksMemoDownloadUrl = CONSTANTS.examMarksMemoDownloadUrl;
  public MinIo = CONSTANTS.MINIO
  private InternalExternalMarks = CONSTANTS.internalExternalMarksUrl
  private collgeIdUrl = CONSTANTS.collegeByIdUrl
  private getExamResultMemos = CONSTANTS.getExamResultMemos
  private getExamFiltersBycodeUrl = CONSTANTS.getExamFiltersBycodeUrl
  MINIO = CONSTANTS.MINIO
  marks: any;
  public ExamMasterFilterCtrl: FormControl = new FormControl();

  SemisterList = [
    { id: 'ISEM', value: 'I Semester' },
    { id: 'IISEM', value: 'II Semester' },
    { id: 'IIISEM', value: 'III Semester' },
    { id: 'IVSEM', value: 'IV Semester' },
    { id: 'VSEM', value: 'V Semester' },
    { id: 'VISEM', value: 'VI Semester' },
    { id: 'VIISEM', value: 'VII Semester' },
    { id: 'VIIISEM', value: 'VIII Semester' },

  ]
  examFeeCollectionForm: FormGroup;
  examsList = [];
  searchStudents = [];
  selectedStd = [];
  student: any = {};
  examFeeReceipt: any[] = [];
  examReceipts: any[] = [];
  studentFirstName;
  flag = false;
  exam: any = {};
  courseYears: any[] = [];
  studentMarksMemo: any = {};
  memo: any[] = [];
  examResultTypes = [];
  collegeCertificate = [];
  isPrint = false;
  certificateIssueStatuses: any[] = [];
  issueMemo: any = {};
  feeCertificateIssue: any[] = [];
  pending: boolean;
  examData = [];
  check = 2;
  dataSecStaff;
  dataSECPrincipal;

  public studentFilterCtrl: FormControl = new FormControl();
  private _onDestroy = new Subject<void>();
  public filteredStudents: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);
  studentid: any;
  examid: any;
  courseyearid: any;
  pageparams: any;
  data: any;
  memodata: any;
  rollnumber: any;
  logo: any;
  value: any;
  totalcredits: any;
  orgCode: any;
  filtersDetailsList = [];
  CollegesListDetails = [];
  colleges = [];
  groupDetails: any;
  exammonthyearList = [];
  exammonthyears = [];
  studentCollegeId: any;
  monthYear = [];
  courses = [];
  courseListData = [];
  collegeCode: any[];
  resultListDetails = [];
  courseCode: any;
  academicYearsList = [];
  academicYears = [];
  academicYear = [];
  examsLists = [];
  examMonthYear: any;
  examCourseCode: any;
  TotalCreditsRegistered: any;
  TotalCreditsAssigned: any;
  sgpa: any;
  cgpa: any;
  examName: any;
  exam_month_year: any;
  groupCode;
  gradeCard = false;
  markSheet = false;
  mainList = [];
  newList = [];
  studentsList = [];
  stdId: any;
  BulkmarkSheet: boolean = false;
  BulkgradeCard: boolean = false;
  coursegroup = [];
  courseGroups = [];
  courseYearList: any[];
  form: FormGroup;
  memodate: any;
  filterDetailList = [];
  gradesData = [];
  dataFlag: boolean;
  CollegesListFilterDetails: any;
  regulationFilterList: any;
  courseGroupList: any[];
  courseYearsList: any[];
  isRegular;
  isSupply;

  constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,
    private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router,
    private genericFunctions: GenericFunctions, private route: ActivatedRoute) {

    this.dataSecStaff = this.genericFunctions.dataSecurityLevel();
    this.dataSECPrincipal = this.genericFunctions.dataSecurityLevelPrincipal();
  }

  ngOnInit(): void {
    this.examFeeCollectionForm = this.formBuilder.group({
      examId: ['', Validators.required],
      studentId: [''],
      courseYearId: [''],
      memoNo: [''],
      memoSerialNo: [''],
      memoDate: [this.genericFunctions.moment()],
      dateOfIssue: [this.genericFunctions.moment()],
      courseId: ['', Validators.required],
      academicYearId: [''],
      collegeId: ['', Validators.required],
      courseGroupId: ['', Validators.required],
    });
    this.route.queryParams.subscribe(params => {
      // this.studentid = params['studentId'];
      this.pageparams = params
      // this.examid = params['examId'];
      // this.courseyearid = params['courseYearId'];

      // this.examFeeCollectionForm.get('studentId').setValue(this.pageparams.studentId)
      // this.getGeneralDetails();
    });

    this.form = this.formBuilder.group({
      selectedDate: [new Date()]
    });
    this.memodate = this.form.value.selectedDate
    this.studentFilterCtrl.valueChanges
      .pipe(takeUntil(this._onDestroy))
      .subscribe(() => {
        this.filterStd();
      });

    this.getGeneralDetails();

    this.getFiltersList();
    this.searchStudents.push({ firstName: 'Search by student name or rollno.' });
    this.filteredStudents.next(this.searchStudents.slice());


  }

  // tslint:disable-next-line: use-lifecycle-interface
  ngOnDestroy(): void {
    this._onDestroy.next();
    this._onDestroy.complete();
  }
  clear($event: MatRadioChange) {
    if ($event.value === 2) {
      this.resultListDetails = []
      this.examFeeCollectionForm.get('studentId').setValue(0);

    } else
      if ($event.value === 1) {
        this.resultListDetails = []

      }

  }

  getGeneralDetails(): void {
    /*----------- EXAM RESULT TYPES -----------*/
    this.crudService.listDetailsByTwoIds(this.generalDetailsUrl, this.examResult, 'true', this.generalDetailsByCodeUrl, this.isActive)
      .subscribe(result => {
        if (result.statusCode === 200) {
          if (result.data.resultList && result.data.resultList !== '') {
            this.examResultTypes = result.data.resultList;
            //                 if(!this.isEmptyObject(this.pageparams)){

            // this.examFeeCollectionForm.get('studentId').setValue(this.pageparams.studentId)
            //                 }

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

    /*----------- CERTIFICATE ISSUE -----------*/
    // tslint:disable-next-line:max-line-length
    this.crudService.listDetailsByTwoIds(this.generalDetailsUrl, this.certificateIssueStatus, 'true', this.generalDetailsByCodeUrl, this.isActive)
      .subscribe(result => {
        if (result.statusCode === 200) {
          if (result.data.resultList && result.data.resultList !== '') {
            this.certificateIssueStatuses = result.data.resultList;

          } else {
            // this.snotifyService.success(result.message, 'Success!');
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

  filterStd(): void {
    if (!this.searchStudents) {
      return;
    }
    // get the search keyword
    let search = this.studentFilterCtrl.value;
    if (!search) {
      this.filteredStudents.next(this.searchStudents.slice());
      return;
    } else {
      search = search.toLowerCase();
    }
    // filter the banks
    this.filteredStudents.next(
      this.searchStudents.filter(x => x.firstName.toLowerCase().indexOf(search) > -1)
    );
  }

  enteredStudent(event): void {
    if (this.dataSECPrincipal) {
      if (event.target.value.length > 4) {
        /*----------- STUDENTS -----------*/
        this.crudService.listByTwoIds(this.studentSearchUrl, +localStorage.getItem('collegeId'),
          event.target.value, 'collegeId', 'q')
          .subscribe(result => {
            if (result.statusCode === 200) {
              if (result.data && result.data !== '') {
                this.searchStudents = result.data;
                this.filteredStudents.next(this.searchStudents.slice());


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
    } else
      if (this.dataSecStaff && localStorage.getItem('isAdmin') === 'false') {
        if (event.target.value.length > 4) {
          /*----------- STUDENTS -----------*/
          this.crudService.listByThreeIds(this.studentSearchUrl, +localStorage.getItem('collegeId'), +localStorage.getItem('courseGroupId'),
            event.target.value, 'collegeId', 'courseGroupId', 'q')
            .subscribe(result => {
              if (result.statusCode === 200) {
                if (result.data && result.data !== '') {
                  this.searchStudents = result.data;
                  this.filteredStudents.next(this.searchStudents.slice());
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
      else {
        if (event.target.value.length > 4) {
          /*----------- STUDENTS -----------*/
          this.crudService.listByIds(this.studentSearchUrl,
            event.target.value, 'q')
            .subscribe(result => {
              if (result.statusCode === 200) {
                if (result.data && result.data !== '') {
                  this.searchStudents = result.data;
                  this.filteredStudents.next(this.searchStudents.slice());
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
  }



  getStudentExams(): void {
    if (this.isEmptyObject(this.pageparams)) {
      this.examFeeCollectionForm.get('examId').setValue('');
    }
    this.examFeeCollectionForm.get('courseYearId').setValue('');
    this.examsList = [];
    this.memo = [];
    this.feeCertificateIssue = [];
    /*----------- Exams List -----------*/
    this.crudService.listDetailsByTwoIdsWithSort(this.examStudentCrudUrl, this.student.studentId, 'true', 'DESC',
      'studentDetail.studentId', this.isActive, 'createdDt')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.success) {
            this.examsList = [];
            // tslint:disable-next-line: prefer-for-of
            for (let i = 0; i < result.data.resultList.length; i++) {
              if (!result.data.resultList[i].isInternalExam) {
                this.examsList.push(result.data.resultList[i]);
                this.examData.push(result.data.resultList[i]);
                if (!this.isEmptyObject(this.pageparams)) {

                  this.examFeeCollectionForm.get('examId').setValue(this.pageparams.examId)
                }
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
  searchExam(value) {
    this.examData = [];
    this.examSearch(value);
  }
  examSearch(value: string) {
    let filter = value.toLowerCase()
    for (let i = 0; i < this.examsList.length; i++) {
      let option = this.examsList[i];
      if (option.examName.toLowerCase().indexOf(filter) >= 0) {
        this.examData.push(option);
      }
    }
  }
  getCollegeCertificates(collegeId): void {
    /*---------- COLLEGE CERTIFICATE ----------*/
    this.crudService.listDetailsByThreeIds(this.collegeCertificateUrl, 'MARKSMEMO', 'true', collegeId, 'certifcateCode', 'isActive', 'College.collegeId')
      .subscribe(result => {
        this.getGeneralDetails();
        if (result.statusCode === 200) {
          if (result.success) {
            this.collegeCertificate = result.data.resultList;
          }
        } else {
          // this.snotifyService.error(result.message, 'Error!');
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

  selectedExternalExam(examId): void {
    this.courseYears = [];
    this.isPrint = false;
    this.memo = [];
    this.feeCertificateIssue = [];
    this.examFeeCollectionForm.get('courseYearId').setValue('');
    if (this.examsList.filter(x => (x.examId === examId)).length > 0) {
      this.courseYears.push(this.examsList.filter(x => (x.examId === examId))[0]);
    }
  }

 


  getFiltersList(): void {
      this.filtersDetailsList = []
    this.CollegesListDetails = []
    this.groupDetails = []
    this.colleges = []
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
    this.resultListDetails = [];
    this.studentsList = [];
    this.mainList = [];
    this.newList = [];
    if (courseId != null) {
      this.examFeeCollectionForm.get('academicYearId').setValue('')
      this.examFeeCollectionForm.get('examId').setValue('');
      this.examFeeCollectionForm.get('collegeId').setValue('');
      this.examFeeCollectionForm.get('courseGroupId').setValue('');
      this.examFeeCollectionForm.get('courseYearId').setValue('');
        // Get the course code for the selected course
    const selectedCourse = this.courses.find(x => x.fk_course_id === courseId);
    if (selectedCourse) {
      this.courseCode = selectedCourse.course_code;
      this.examCourseCode = selectedCourse.course_code;
      this.orgCode = selectedCourse.university_code;
    }

    if(this.courseCode == 'DPHARM'){
      this.dataFlag = false
      this.SemisterList = [
        { id: 'IYEAR', value: 'Part 1' },
        { id: 'IIYEAR', value: 'Part 2' },
        { id: 'IIIYEAR', value: 'Part 3' },
        { id: 'IVYEAR', value: 'Part 4' },
      ]
      }else {
       this.dataFlag = true
       this.SemisterList = [
        { id: 'ISEM', value: 'I Semester' },
        { id: 'IISEM', value: 'II Semester' },
        { id: 'IIISEM', value: 'III Semester' },
        { id: 'IVSEM', value: 'IV Semester' },
        { id: 'VSEM', value: 'V Semester' },
        { id: 'VISEM', value: 'VI Semester' },
        { id: 'VIISEM', value: 'VII Semester' },
        { id: 'VIIISEM', value: 'VIII Semester' },
    
      ]
      }
      this.academicYears=[]
      this.academicYearsList=[]
      this.examsLists = []
      this.examData = []
      this.colleges = []
      this.courseGroups = []
      this.courseYears = []
      this.academicYearsList = this.CollegesListFilterDetails.filter(x => (x.fk_course_id == this.examFeeCollectionForm.value.courseId))
      if (this.academicYearsList.length > 0) {
        const academicYears = this.academicYearsList.map(({ fk_academic_year_id }) => fk_academic_year_id);
        this.academicYears = this.academicYearsList.filter(({ fk_academic_year_id }, index) => !academicYears.includes(fk_academic_year_id, index + 1));
      }
      if (this.academicYears.length > 0) {
        this.examFeeCollectionForm.get('academicYearId').setValue(this.academicYears[0].fk_academic_year_id);
        this.data = this.data + ' / ' + this.academicYears.filter(x => (x.fk_academic_year_id === this.examFeeCollectionForm.value.academicYearId))[0].academic_year;
        this.selectedAcademicYear(this.examFeeCollectionForm.value.academicYearId)
      }

    }
  }




  selectedAcademicYear(academicYearId): void {
    this.resultListDetails = [];
    this.studentsList = [];
    this.mainList = [];
    this.newList = [];
    this.academicYear = this.academicYears.filter(x => (x.fk_academic_year_id === this.examFeeCollectionForm.value.academicYearId))[0].academic_year;
    this.examFeeCollectionForm.get('examId').setValue('');
    this.examFeeCollectionForm.get('collegeId').setValue('');
    this.examFeeCollectionForm.get('courseGroupId').setValue('');
    this.examFeeCollectionForm.get('courseYearId').setValue('');
    this.examsList = [];
    if (academicYearId) {
      this.examsLists = []
      this.examData = []
      this.colleges = []
      this.courseGroups = []
      this.courseYears = []
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
  selectedExam(examId): void {
    this.filtersDetailsList = [];
    this.resultListDetails = [];
    this.studentsList = [];
    this.mainList = [];
    this.newList = [];
    this.examFeeCollectionForm.get('collegeId').setValue('');
    this.examFeeCollectionForm.get('courseGroupId').setValue('');
    this.examFeeCollectionForm.get('courseYearId').setValue('');
    this.examMonthYear = this.examsList.filter(x => (x.fk_exam_id ==  this.examFeeCollectionForm.value.examId))[0]?.exam_month_yr;
    this.isRegular = this.examsList.filter(x => (x.fk_exam_id ==  this.examFeeCollectionForm.value.examId))[0]?.is_regular_exam;
    this.isSupply = this.examsList.filter(x => (x.fk_exam_id ==  this.examFeeCollectionForm.value.examId))[0]?.is_supply_exam;
    let request = [
      { paramName: 'in_flag', paramValue: 'univ_exam_rest_in_regexamstd' },
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
            this.filtersDetailsList = result.data.result;
            for (let i = 0; i < this.filtersDetailsList.length; i++) {
              if (this.filtersDetailsList[i].length > 0 && this.filtersDetailsList[i][0].flag === 'univ_exam_rest_filters') {
                this.CollegesListDetails = this.filtersDetailsList[i];
              }
              else if (this.filtersDetailsList[i].length > 0 && this.filtersDetailsList[i][0].flag === 'regulations') {
                this.regulationFilterList = this.filtersDetailsList[i];
              }

            }
            this.colleges = []
            this.courseGroups = []
            this.courseYears = []
            if (this.CollegesListDetails) {
              /*----------- Colleges -----------*/
           
              this.colleges = this.CollegesListDetails
              const CollegeIdData = this.colleges.map(({ fk_college_id }) => fk_college_id);
              this.colleges = this.colleges.filter(({ fk_college_id }, index) => !CollegeIdData.includes(fk_college_id, index + 1));
              if (this.colleges.length > 0) {
                this.examFeeCollectionForm.get('collegeId').setValue(this.colleges[0].fk_college_id);
                this.data = this.colleges.filter(x => (x.fk_college_id === this.examFeeCollectionForm.value.collegeId))[0].college_code;
                this.selectedCollege(this.examFeeCollectionForm.value.collegeId);
              }
              //     /*----------- COURSES Years -----------*/      
        
        
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
    this.collegeCode = this.colleges.filter(x => (x.fk_college_id === collegeId))[0]?.college_code;
    this.courseGroups = []
    this.resultListDetails = [];
    this.studentsList = [];
    this.mainList = [];
    this.newList = [];
    this.examFeeCollectionForm.get('courseGroupId').setValue('');
    this.examFeeCollectionForm.get('courseYearId').setValue('');
    if (collegeId != null) {
      this.courseGroupList = []
      this.courseGroups = []
      this.courseYears = []
      this.courseGroupList = this.CollegesListDetails.filter(x => (x.fk_college_id == this.examFeeCollectionForm.value.collegeId ))
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
    this.courseYearsList = []
    this.courseYears = []
    this.resultListDetails = [];
    this.studentsList = [];
    this.mainList = [];
    this.newList = [];
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
  selectedYear(examId): void {
    this.memo = [];
    this.feeCertificateIssue = [];
    this.isPrint = false;
    this.resultListDetails = [];
    this.studentsList = [];
    this.mainList = [];
    this.newList = [];
    if (this.selectedStd.length > 0) {
      // this.getExamFeeReceipts(this.student.studentId);
      // this.getMemo(this.student.studentId, examId);
      this.getResultList();
    }
    if (this.examsList.filter(x => (x.examId === examId)).length > 0) {
      this.exam = this.examsList.filter(x => (x.examId === examId))[0];
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


  // getFiltersList(): void {
  //   this.filtersDetailsList = []
  //   this.CollegesListDetails = []
  //   this.groupDetails = []
  //   this.colleges = []
  //   this.spinner.show()
  //   let request = [
  //     { paramName: 'in_flag', paramValue: 'clg_exam_filters' },
  //     { paramName: 'in_org_id', paramValue: +localStorage.getItem('organizationId') },
  //     { paramName: 'in_college_id', paramValue: 0 },
  //     { paramName: 'in_course_id', paramValue: 0 },
  //     { paramName: 'in_course_group_id', paramValue: 0 },
  //     { paramName: 'in_course_year_id', paramValue: 0 },
  //     { paramName: 'in_group_section_id', paramValue: 0 },
  //     { paramName: 'in_academic_year_id', paramValue: 0 },
  //     { paramName: 'in_dept_id', paramValue: 0 },
  //     { paramName: 'in_isadmin', paramValue: 0 },
  //     { paramName: 'in_loginuser_empid', paramValue: +localStorage.getItem('employeeId') },
  //     { paramName: 'in_loginuser_roleid', paramValue: 0 },
  //     { paramName: 'in_employee', paramValue: '' },
  //     { paramName: 'in_subject', paramValue: '' },
  //     { paramName: 'in_gm_codes', paramValue: 'QUOTA,GENDER' },


  //   ];
  //   this.crudService.getDetailsByRequest(this.collegewisedetailsUrl, '', request, '&')
  //     .subscribe(result => {
  //       this.spinner.hide();
  //       if (result.statusCode === 200) {
  //         if (result.data && result.data !== '' && result.data.result.length > 0) {
  //           this.filtersDetailsList = result.data.result;
  //           for (let i = 0; i < this.filtersDetailsList.length; i++) {
  //             if (this.filtersDetailsList[i].length > 0 && this.filtersDetailsList[i][0].flag === 'clg_exam_filters') {
  //               this.CollegesListDetails = this.filtersDetailsList[i];
  //             }
  //             else if (this.filtersDetailsList[i].length > 0 && this.filtersDetailsList[i][0].flag === 'group_details') {
  //               this.groupDetails = this.filtersDetailsList[i]
  //             }

  //           }
  //           const CollegeIdData = this.CollegesListDetails.map(({ fk_college_id }) => fk_college_id);
  //           this.colleges = this.CollegesListDetails.filter(({ fk_college_id }, index) => !CollegeIdData.includes(fk_college_id, index + 1));
  //           if (this.colleges.length > 0) {
  //             this.examFeeCollectionForm.get('collegeId').setValue(this.colleges[0].fk_college_id);
  //             this.data = this.colleges.filter(x => (x.fk_college_id === this.examFeeCollectionForm.value.collegeId))[0].college_code;
  //             this.selectedCollege(this.examFeeCollectionForm.value.collegeId);
  //           }

  //         } else {
  //           this.snotifyService.success(result.message, 'Success!');
  //         }
  //       } else {
  //         this.snotifyService.error(result.message, 'Error!');
  //       }
  //     }, error => {
  //       this.spinner.hide();
  //       if (error.error.statusCode === 401) {
  //         this.snotifyService.error(error.error.message, 'Error!');
  //         this.genericFunctions.logOut(this.router.url);
  //       } else {
  //         this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
  //       }
  //     });
  // }
  // selectedCollege(collegeId): void {
  //   this.collegeCode = this.colleges.filter(x => (x.fk_college_id === collegeId))[0].college_code;
  //   this.resultListDetails = [];
  //   this.examFeeCollectionForm.get('courseId').setValue('');
  //   this.examFeeCollectionForm.get('courseYearId').setValue('');
  //   this.examFeeCollectionForm.get('academicYearId').setValue('')
  //   this.examFeeCollectionForm.get('examId').setValue('');
  //   this.examFeeCollectionForm.get('courseGroupId').setValue('');

  //   this.courses = [];
  //   this.coursegroup = [];
  //   this.courseGroups = [];

  //   if (collegeId !== null && collegeId !== '') {

  //     this.courseListData = []
  //     this.courseListData = this.CollegesListDetails.filter(x => (x.fk_college_id == collegeId))
  //     if (this.courseListData.length > 0) {
  //       const courseList = this.courseListData.map(({ fk_course_id }) => fk_course_id);
  //       this.courses = this.courseListData.filter(({ fk_course_id }, index) =>
  //         !courseList.includes(fk_course_id, index + 1));
  //     }
  //     if (this.courses.length > 0) {
  //       this.examFeeCollectionForm.get('courseId').setValue(this.courses[0].fk_course_id);
  //       this.data = this.data + ' / ' + this.courses.filter(x => (x.fk_course_id === this.examFeeCollectionForm.value.courseId))[0].course_code;
  //       this.examCourseCode = this.courses.filter(x => (x.fk_course_id === this.examFeeCollectionForm.value.courseId))[0].course_code;
  //       this.selectedCourse(this.examFeeCollectionForm.value.courseId);
  //     }

  //   }
  // }

  // selectedCourse(courseId: number): void {
  //   // Reset all dependent fields
  //   this.coursegroup = [];
  //   this.courseGroups = [];
  //   this.courseYears = [];
  //   this.academicYearsList = [];
  //   this.resultListDetails = [];
  //   this.examFeeCollectionForm.get('courseYearId').setValue('');
  //   this.examFeeCollectionForm.get('academicYearId').setValue('');
  //   this.examFeeCollectionForm.get('examId').setValue('');
  //   this.examFeeCollectionForm.get('courseGroupId').setValue('');

  //   // Get the course code for the selected course
  //   const selectedCourse = this.courses.find(x => x.fk_course_id === courseId);
  //   if (selectedCourse) {
  //     this.courseCode = selectedCourse.course_code;
  //     this.examCourseCode = selectedCourse.course_code;
  //   }

  //   if(this.courseCode == 'DPHARM'){
  //     this.dataFlag = false
  //     this.SemisterList = [
  //       { id: 'IYEAR', value: 'Part 1' },
  //       { id: 'IIYEAR', value: 'Part 2' },
  //       { id: 'IIIYEAR', value: 'Part 3' },
  //       { id: 'IVYEAR', value: 'Part 4' },
  //     ]
  //     }else {
  //      this.dataFlag = true
  //      this.SemisterList = [
  //       { id: 'ISEM', value: 'I Semester' },
  //       { id: 'IISEM', value: 'II Semester' },
  //       { id: 'IIISEM', value: 'III Semester' },
  //       { id: 'IVSEM', value: 'IV Semester' },
  //       { id: 'VSEM', value: 'V Semester' },
  //       { id: 'VISEM', value: 'VI Semester' },
  //       { id: 'VIISEM', value: 'VII Semester' },
  //       { id: 'VIIISEM', value: 'VIII Semester' },
    
  //     ]
  //     }
  //   // Filter and populate course groups based on the selected course and college
  //   this.coursegroup = this.CollegesListDetails.filter(
  //     x =>
  //       x.fk_college_id === this.examFeeCollectionForm.value.collegeId &&
  //       x.fk_course_id === courseId
  //   );
  //   this.coursegroup = this.coursegroup.filter(x => (x.fk_course_group_id != null && x.group_code != null))
  //   if (this.coursegroup.length > 0) {
  //     // Remove duplicate course group IDs
  //     const GroupCode = this.coursegroup.map(({ fk_course_group_id }) => fk_course_group_id);
  //     this.courseGroups = this.coursegroup.filter(({ fk_course_group_id }, index) =>
  //       !GroupCode.includes(fk_course_group_id, index + 1)
  //     );


  //     // Patch the first course group (0th position) if available
  //     if (this.courseGroups.length > 0) {
  //       this.examFeeCollectionForm.get('courseGroupId').setValue(this.courseGroups[0]?.fk_course_group_id);

  //       // Call the selectedCourseGroup method with the first course group ID
  //       this.selectedCourseGroup(this.examFeeCollectionForm.value.courseGroupId);
  //     }
  //   }
  //   // this.examFeeCollectionForm.get('courseGroupId').setValue(this.courseGroups[0]?.fk_course_group_id);

  // }
  // selectedCourseGroup(courseGroupId): void {
  //   if (courseGroupId != null) {
  //     this.resultListDetails = [];
  //     this.examFeeCollectionForm.get('courseYearId').setValue('');
  //     this.examFeeCollectionForm.get('academicYearId').setValue('')
  //     this.examFeeCollectionForm.get('examId').setValue('');
  //     this.courseYears = [];
  //     this.academicYearsList = []
  //     this.academicYearsList = this.CollegesListDetails.filter(x => (x.fk_college_id == this.examFeeCollectionForm.value.collegeId && x.fk_course_id == this.examFeeCollectionForm.value.courseId
  //       && x.fk_course_group_id == this.examFeeCollectionForm.value.courseGroupId
  //     ))
  //     if (this.academicYearsList.length > 0) {
  //       const academicYears = this.academicYearsList.map(({ fk_academic_year_id }) => fk_academic_year_id);
  //       this.academicYears = this.academicYearsList.filter(({ fk_academic_year_id }, index) => !academicYears.includes(fk_academic_year_id, index + 1));
  //     }
  //     if (this.academicYears.length > 0) {
  //       this.examFeeCollectionForm.get('academicYearId').setValue(this.academicYears[0].fk_academic_year_id);
  //       this.data = this.data + ' / ' + this.academicYears.filter(x => (x.fk_academic_year_id === this.examFeeCollectionForm.value.academicYearId))[0].academic_year;
  //       this.selectedAcademicYear(this.examFeeCollectionForm.value.academicYearId)
  //     }

  //   }
  // }

  // selectedAcademicYear(academicYearId): void {
  //   this.academicYear = this.academicYears.filter(x => (x.fk_academic_year_id === this.examFeeCollectionForm.value.academicYearId))[0].academic_year;
  //   this.examsList = [];
  //   this.resultListDetails = [];
  //   this.examFeeCollectionForm.get('examId').setValue('');
  //   this.examFeeCollectionForm.get('courseYearId').setValue('');
  //   if (academicYearId) {
  //     this.examsLists = []
  //     this.examData = []
  //     this.examsLists = this.CollegesListDetails.filter(x => (x.fk_college_id == this.examFeeCollectionForm.value.collegeId && x.fk_course_id == this.examFeeCollectionForm.value.courseId && x.fk_academic_year_id == academicYearId))
  //     if (this.examsLists.length > 0) {
  //       const examsLists = this.examsLists.map(({ fk_exam_id }) => fk_exam_id);
  //       this.examsList = this.examsLists.filter(({ fk_exam_id }, index) =>
  //         !examsLists.includes(fk_exam_id, index + 1));
  //       this.examsList = this.examsList.filter(x => !x.is_internal_exam)
  //     }
  //     if (this.examsList.length > 0) {
  //       this.examFeeCollectionForm.get('examId').setValue(this.examsList[0].fk_exam_id);
  //       this.selectedExam(this.examFeeCollectionForm.value.examId)
  //     }

  //   }
  // }

  // searchexam(value) {
  //   this.examData = [];
  //   this.search(value)
  // }

  // search(value: string) {
  //   let filter = value.toLowerCase();
  //   for (let i = 0; i < this.examsList.length; i++) {
  //     let option = this.examsList[i];
  //     if (option.exam_name.toLowerCase().indexOf(filter) >= 0) {
  //       this.examData.push(option);
  //     }
  //   }
  // }
  // selectedExam(examId) {
  //   this.courseYearList = []
  //   this.courseYears = []
  //   this.resultListDetails = [];
  //   this.examFeeCollectionForm.get('courseYearId').setValue('');
  //   this.examMonthYear = this.examsList.filter(x => (x.fk_exam_id ==  this.examFeeCollectionForm.value.examId))[0].exam_month_yr
  //   this.courseYearList = this.CollegesListDetails.filter(x => (x.fk_college_id == this.examFeeCollectionForm.value.collegeId && x.fk_course_id == this.examFeeCollectionForm.value.courseId
  //     && x.fk_course_group_id == this.examFeeCollectionForm.value.courseGroupId && x.fk_exam_id == this.examFeeCollectionForm.value.examId
  //   ))
  //   if (this.courseYearList.length > 0) {
  //     const courseYears = this.courseYearList.map(({ fk_course_year_id }) => fk_course_year_id);
  //     this.courseYears = this.courseYearList.filter(({ fk_course_year_id }, index) => !courseYears.includes(fk_course_year_id, index + 1));

  //   }
  //   if (this.courseYears.length > 0) {
  //     this.examFeeCollectionForm.get('courseYearId').setValue(this.courseYears[0].fk_course_year_id);
  //     this.data = this.data + ' / ' + this.courseYears.filter(x => (x.fk_course_year_id === this.examFeeCollectionForm.value.courseYearId))[0]?.course_year_code;
  //   }

  // }

  selectedStudent(studentId): void {
    this.resultListDetails = []
    this.memo = [];
    this.feeCertificateIssue = [];
    this.isPrint = false;
    this.studentsList = [];
    this.mainList = [];
    this.newList = [];
    if (studentId != null && studentId !== '' && studentId !== 'undefined') {
      this.selectedStd = [];
      if (this.searchStudents.filter(x => (x.studentId === studentId)).length > 0) {
        this.selectedStd.push(this.searchStudents.filter(x => (x.studentId === studentId))[0]);
        this.student = this.selectedStd[0];
        if (this.student.studentPhotoPath === null) {
          this.student.studentPhotoPath = 'assets/images/avatars/default_Student.png';
        }
        this.student.studentPhotoPath = this.student.studentPhotoPath + '?' + new Date().getTime();
        this.studentFirstName = this.student.firstName + ' ( ' + this.student.rollNumber + ' )';

      }
    }
  }

  numToWords(num: any): any {
    var a = ['', 'one ', 'two ', 'three ', 'four ', 'five ', 'six ', 'seven ', 'eight ', 'nine ', 'ten ', 'eleven ', 'twelve ', 'thirteen ', 'fourteen ', 'fifteen ', 'sixteen ', 'seventeen ', 'eighteen ', 'nineteen '];
    var b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

    if ((num = num.toString()).length > 9) return 'overflow';
    let n: any = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return; var str = '';
    str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'crore ' : '';
    str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'lakh ' : '';
    str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'thousand ' : '';
    str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'hundred ' : '';
    str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
    return str;
  }

  getRemark(grandTotal: number, maxMarks: number): string {
    const percentage = (grandTotal / maxMarks) * 100;

    if (percentage >= 70) {
      return 'First Class with Distinction';
    } else if (percentage >= 60) {
      return 'First Class';
    } else if (percentage >= 50) {
      return 'Second Class';
    } else if (percentage >= 40) {
      return 'Pass Class';
    } else {
      return 'Fail';
    }
  }

  getResultList(): void {
    this.resultListDetails = [];
    this.studentsList = [];
    this.mainList = [];
    this.newList = [];
    this.groupCode = this.courseGroups.filter(x => (x.fk_course_group_id === this.examFeeCollectionForm.value.courseGroupId))[0]?.group_code;
    if (this.examFeeCollectionForm.value.studentId == 0) {
      this.stdId = 0
    } else {
      this.stdId = this.examFeeCollectionForm.value.studentId
    }
    if (this.examFeeCollectionForm.valid) {
      this.spinner.show();
      let request = [
        { paramName: 'in_flag', paramValue: 'list_exam_student_gradecard' },
        { paramName: 'in_orgid', paramValue: +localStorage.getItem('organizationId') },
        { paramName: 'in_fdate', paramValue: '1990-01-01' },
        { paramName: 'in_tdate', paramValue: '1990-01-01' },
        { paramName: 'in_exam_id', paramValue: this.examFeeCollectionForm.value.examId },
        { paramName: 'in_clg_id', paramValue: this.examFeeCollectionForm.value.collegeId },
        { paramName: 'in_course_id', paramValue: this.examFeeCollectionForm.value.courseId },
        { paramName: 'in_course_group_id', paramValue: this.examFeeCollectionForm.value.courseGroupId },
        { paramName: 'in_course_year_id', paramValue: this.examFeeCollectionForm.value.courseYearId },
        { paramName: 'in_subject_id', paramValue: 0 },
        { paramName: 'in_evalutor_profileid', paramValue: 0 },
        { paramName: 'in_exam_date', paramValue: '1990-01-01' },
        { paramName: 'in_regulation_id', paramValue:0 },
        { paramName: 'in_emp_id', paramValue: 0 },
        { paramName: 'in_questionpaper_id', paramValue: 0 },
        { paramName: 'in_student_id', paramValue: this.stdId },


      ];
      this.crudService.getDetailsByRequest(this.getExamResultMemos, '', request, '&')
        .subscribe(result => {
          this.spinner.hide();
          if (result.statusCode === 200) {
            if (result.data && result.data !== '' && result.data.result.length > 0) {
              // this.filterDetailList=  result.data.result[0].filter(x=>(x.group_code === this.groupCode));
              this.filterDetailList = result.data.result


              for (let i = 0; i < this.filterDetailList.length; i++) {
                if (this.filterDetailList[i].length > 0 && this.filterDetailList[i][0].flag === 'list_exam_student_gradecard') {
                  this.resultListDetails = this.filterDetailList[i];
                } else if (this.filterDetailList[i].length > 0 && this.filterDetailList[i][0].flag === 'grades_course') {
                  this.gradesData = this.filterDetailList[i];
                }
              }
              this.resultListDetails = this.resultListDetails.filter(x => (x.group_code === this.groupCode));
              this.gradesData = this.gradesData.sort((a, b) => (a.sort_order) - (b.sort_order));
              // this.resultListDetails = result.data.result[0].filter(x=>(x.group_code === this.groupCode));
              this.resultListDetails.sort((a, b) => (a.order_no) - (b.order_no));
              this.flag = true;
              this.sgpa = this.resultListDetails[0]?.sgpa
              this.cgpa = this.resultListDetails[0]?.cgpa
              this.examName = this.resultListDetails[0]?.exam_name
              this.exam_month_year = this.resultListDetails[0]?.exam_month_year
              if (this.resultListDetails) {
                this.mainList = [];
                this.newList = [];
                const students = this.resultListDetails.map(({ hallticket_number }) => hallticket_number);
                this.studentsList = this.resultListDetails.filter(({ hallticket_number }, index) =>
                  !students.includes(hallticket_number, index + 1));
                this.studentsList = this.studentsList.sort((a, b) =>
                  a.hallticket_number.localeCompare(b.hallticket_number, undefined, { numeric: true })
                );
                // this.studentsList = this.studentsList.sort((a, b) => parseInt(a.hallticket_number) - parseInt(b.hallticket_number));
                // this.studentsList = this.studentsList.sort((a, b) =>
                //   a.hallticket_number.localeCompare(b.hallticket_number)
                // );
                this.mainList = [];
                for (let student of this.studentsList) {
                  const filtered = this.resultListDetails
                    .filter(r => r.hallticket_number === student.hallticket_number)
                    .sort((a, b) => a.order_no - b.order_no);
                  this.mainList.push(filtered);
                }
                // for (let i = 0; i < this.studentsList.length; i++) {
                //   this.newList = [];
                //   for (let j = 0; j < this.resultListDetails.length; j++) {
                //     if (this.studentsList[i].hallticket_number == this.resultListDetails[j].hallticket_number) {
                //       this.newList.push(this.resultListDetails[j])
                //     }
                //   }
                //   this.newList = this.newList.sort((a, b) => (a.order_no) - (b.order_no));
                //   this.mainList.push(this.newList);
                // }
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
  getTotalCreditsRegistered(): number {
    let totalCreditsRegistered = 0;
    for (const result of this.resultListDetails) {
      totalCreditsRegistered += result.credits_registered;
    }
    return totalCreditsRegistered;
  }
  getTotalCreditsAssigned(): number {
    let totalCreditsAssigned = 0;
    for (const result of this.resultListDetails) {
      totalCreditsAssigned += result.credits;
    }
    return totalCreditsAssigned;
  }
  getMultiplesOfGiCi(): number {
    let multiplesOfGiCi = 0;
    for (const result of this.resultListDetails) {
      multiplesOfGiCi += result.ci_gi_points;
    }
    return multiplesOfGiCi;
  }
  getTotalMarks(): number {
    let TotalMarks = 0;
    for (const result of this.resultListDetails) {
      TotalMarks += result.totalMarks;
    }
    return TotalMarks;
  }
  getTotalMaxMarks(): number {
    let totalMaxMarks = 0;
    for (const result of this.resultListDetails) {
      totalMaxMarks += result.totalMaxMarks;
    }
    return totalMaxMarks;
  }
  getMemo(studentId, examId): void {
    this.feeCertificateIssue = [];
    this.isPrint = false;
    this.crudService.listDetailsByThreeIds(this.examMemoMasterCrudUrl, studentId, examId, this.examFeeCollectionForm.value.courseYearId,
      'studentDetail.studentId', 'examMaster.examId', 'courseYear.courseYearId')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data.resultList && result.data.resultList !== '') {
            this.memo = result.data.resultList;
            this.memodata = this.memo[0].examStudentMemoSubjectDTO;
            this.rollnumber = this.memo[0].examStudentMemoSubjectDTO[0].stdRollNumber;
            this.logo = this.memo[0].examStudentMemoSubjectDTO[0].logoFilename;
            this.getCaUaMarks();
            if (this.memo.length > 0) {
              this.examFeeCollectionForm.get('memoNo').setValue(this.memo[0].memoNo);
              this.examFeeCollectionForm.get('memoSerialNo').setValue(this.memo[0].memoSerialNo);
              this.examFeeCollectionForm.get('memoDate').setValue(this.genericFunctions.momentWithDate(this.memo[0].memoDate));
              this.examFeeCollectionForm.get('dateOfIssue').setValue(this.memo[0].dateOfIssue);

              // tslint:disable-next-line: prefer-for-of
              for (let i = 0; i < this.memo[0].examStudentMemoSubjectDTO.length; i++) {
                if (this.memo[0].examStudentMemoSubjectDTO[i].internalMarks === null || this.memo[0].examStudentMemoSubjectDTO[i].externalMarks === null) {
                  this.memo[0].examStudentMemoSubjectDTO[i].totalMarks = '-';
                } else {
                  // tslint:disable-next-line:max-line-length
                  this.memo[0].examStudentMemoSubjectDTO[i].totalMarks = this.memo[0].examStudentMemoSubjectDTO[i].internalMarks + this.memo[0].examStudentMemoSubjectDTO[i].externalMarks;
                }
              }

              if (this.memo[0].memoSerialNo != null) {
                this.getCerticateIssues(this.memo[0].memoSerialNo, studentId);
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
  getCaUaMarks() {
    let collegeId = this.memo[0].collegeId;
    let studentId = this.memo[0].studentId;

    /*----------- Marks -----------*/
    this.crudService.ListDetailsByTwo(this.InternalExternalMarks, this.collgeIdUrl, 'studentId',
      collegeId, studentId)
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          this.marks = result.data[0]
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

  findsum() {

    this.value = this.memodata;
    for (let j = 0; j < this.value.length; j++) {
      this.totalcredits += this.value[j].credits;

    }
  }
  getTotalCredits() {
    return this.memodata.map(t => t.credits).reduce((acc, value) => acc + value, 0);
  }
  getTotalGpv() {
    return this.memodata.map(t => t.credits * t.gradePoints).reduce((acc, value) => acc + value, 0);
  }

  getCerticateIssues(memoSerialNo, studentId): void {
    if (this.collegeCertificate.length > 0) {
      /*----------- FEE CERTIFICATE ISSUE -----------*/
      this.crudService.listDetailsByThreeIds(this.feeCertificateIssueUrl, studentId, this.collegeCertificate[0].collegeCertificateId, memoSerialNo, 'studentDetail.studentId',
        'CollegeCertificate.collegeCertificateId', 'certificateNumber')
        .subscribe(result => {
          this.spinner.hide();
          if (result.statusCode === 200) {
            if (result.success) {
              this.feeCertificateIssue = result.data.resultList;
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

  updateMemo(): void {
    if (this.examFeeCollectionForm.valid) {
      this.spinner.show();
      this.studentMarksMemo = {};
      if (this.memo.length > 0) {
        this.memo[0].memoNo = this.examFeeCollectionForm.value.memoNo;
        this.memo[0].memoSerialNo = this.examFeeCollectionForm.value.memoSerialNo;
        this.memo[0].memoDate = this.examFeeCollectionForm.value.memoDate;
        this.memo[0].dateOfIssue = this.examFeeCollectionForm.value.dateOfIssue;

        this.crudService.add(this.examMarksMemoUrl, this.memo[0])
          .subscribe(result => {
            this.spinner.hide();
            if (result.success) {
              this.snotifyService.success(result.message, 'Success!');
              this.getMemo(this.student.studentId, this.examFeeCollectionForm.value.examId);
            } else {
              this.snotifyService.info(result.message, 'Info!');
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
  }

  issue(): void {
    this.isPrint = true;
    this.issueMemo = {};
    if (this.collegeCertificate.length > 0) {
      this.spinner.show();
      if (this.certificateIssueStatuses.filter(x => (x.generalDetailCode === 'TCISSUED')).length > 0) {
        this.issueMemo.applicationStatusId = this.certificateIssueStatuses.filter(x => (x.generalDetailCode === 'TCISSUED'))[0].generalDetailId;
      } else {
        this.issueMemo.applicationStatusId = null;
      }
      this.issueMemo.academicYearId = this.student.academicYearId;
      this.issueMemo.applicationComments = null;
      this.issueMemo.appliedOn = this.genericFunctions.moment();
      this.issueMemo.certificateFor = 'Marks Memo';
      this.issueMemo.certificateForValue = null;
      this.issueMemo.certificateNumber = this.memo[0].memoSerialNo;
      this.issueMemo.collegeCertificateId = this.collegeCertificate[0].collegeCertificateId;
      this.issueMemo.collegeId = this.student.collegeId;
      this.issueMemo.conduct = null;
      this.issueMemo.isActive = true;
      this.issueMemo.isApproved = true;
      this.issueMemo.issuedOn = this.genericFunctions.moment();
      this.issueMemo.studentId = this.student.studentId;

      /*---------- ADD  ----------*/
      this.crudService.addDetails(this.feeCertificateIssueCrudUrl, this.issueMemo)
        .subscribe(result => {
          this.spinner.hide();
          if (result.statusCode === 200) {
            if (result.data && result.data !== '') {
              this.snotifyService.success(result.message, 'Success!');
              this.getCerticateIssues(this.memo[0].memoSerialNo, this.student.studentId);
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

  print(): void {
    /*---------- Print call  ----------*/
    // Xhr creates new context so we need to create reference to this
    const self = this;

    this.pending = true;

    // Create the Xhr request object
    const xhr = new XMLHttpRequest();
    xhr.open('GET', this.endURL + this.examMarksMemoDownloadUrl + '?examId=' + this.examFeeCollectionForm.value.examId +
      '&studentId=' + this.examFeeCollectionForm.value.studentId + '&courseYearId=' + this.examFeeCollectionForm.value.courseYearId, true);
    xhr.setRequestHeader('Authorization', 'Bearer ' + localStorage.getItem('token'));
    xhr.responseType = 'blob';
    // Xhr callback when we get a result back
    // We are not using arrow function because we need the 'this' context
    // tslint:disable-next-line:typedef
    xhr.onreadystatechange = function () {

      // We use setTimeout to trigger change detection in Zones
      setTimeout(() => { self.pending = false; }, 0);

      if (xhr.readyState === 4 && xhr.status === 200) {
        const blob = new Blob([this.response], { type: 'application/pdf' });
        // FileSaver.saveAs(blob, 'Report.pdf');

        const blobUrl = URL.createObjectURL(blob);
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = blobUrl;
        document.body.appendChild(iframe);
        iframe.contentWindow.print();
      }
    };

    // Start the Ajax request
    xhr.send();
  }

  // tslint:disable-next-line:typedef
  isEmptyObject(obj) {
    return (obj && (Object.keys(obj).length === 0));

  }
  trackByFn(index: number, item: any): number {
    return item.id; // Use a unique identifier for tracking
  }
  printGradeCard() {

    this.markSheet = false
    this.BulkgradeCard = false
    this.BulkmarkSheet = false
    this.gradeCard = true
    setTimeout(() => {
      window.print();

    }, 1200);

  }
  printMarkSheet() {
    this.gradeCard = false
    this.BulkgradeCard = false
    this.BulkmarkSheet = false
    this.markSheet = true

    setTimeout(() => {
      window.print();

    }, 1200);

  }
  printBulkGradeCard() {
    this.spinner.show();
    this.BulkmarkSheet = false
    this.gradeCard = false
    this.markSheet = false
    this.BulkgradeCard = true
    this.spinner.hide();
    setTimeout(() => {
      window.print();

    }, 1200);

  }
  printBulkMarkSheet() {
    this.BulkgradeCard = false
    this.gradeCard = false
    this.markSheet = false
    this.BulkmarkSheet = true

    setTimeout(() => {
      window.print();

    }, 1200);
  }
  getFilteredGrades(regulationId: number) {
    return this.gradesData.filter(item => item.fk_regulation_id === regulationId);
  }
  SampleFormat() {
    this.router.navigate(['admin-examination-management/admin-post-examination/grade-memo-issue/grade-memo-modal'],

      {
        queryParams: {
          data: JSON.stringify(this.mainList),
          bulk: true,
          examId: this.examFeeCollectionForm.value.examId,
          studentId: this.examFeeCollectionForm.value.studentId,
          courseYearId: this.examFeeCollectionForm.value.courseYearId,
          courseId: this.examFeeCollectionForm.value.courseId,
          academicYearId: this.examFeeCollectionForm.value.academicYearId,
          collegeId: this.examFeeCollectionForm.value.collegeId,
          courseGroupId: this.examFeeCollectionForm.value.courseGroupId,
          memoDate: this.form.get('selectedDate')?.value,
          universityCode : this.orgCode,
        }
      })
  }
  printBulkSampleGradeCard() {
    this.router.navigate(['admin-examination-management/admin-post-examination/grade-memo-issue/grade-memo-modal'],

      {
        queryParams: {
          data: JSON.stringify(this.mainList),
          memoDate: this.form.get('selectedDate')?.value,
          bulk: true,
          examId: this.examFeeCollectionForm.value.examId,
          studentId: this.examFeeCollectionForm.value.studentId,
          courseYearId: this.examFeeCollectionForm.value.courseYearId,
          courseId: this.examFeeCollectionForm.value.courseId,
          academicYearId: this.examFeeCollectionForm.value.academicYearId,
          collegeId: this.examFeeCollectionForm.value.collegeId,
          courseGroupId: this.examFeeCollectionForm.value.courseGroupId,
          universityCode : this.orgCode,
        }
      })
  }
}
