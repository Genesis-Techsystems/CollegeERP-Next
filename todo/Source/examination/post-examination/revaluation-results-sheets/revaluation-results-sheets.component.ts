import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CONSTANTS } from 'app/main/common/constants';
import { FormGroup, FormControl, FormBuilder, Validators } from '@angular/forms';
import { Subject, ReplaySubject } from 'rxjs';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { Router, ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { takeUntil } from 'rxjs/operators';
import { MatRadioChange } from '@angular/material/radio';
@Component({
  selector: 'app-revaluation-results-sheets',
  templateUrl: './revaluation-results-sheets.component.html',
  styleUrls: ['./revaluation-results-sheets.component.scss']
})
export class RevaluationResultsSheetsComponent implements OnInit {
  universityName = 'Sharnbasva University';
  logoPath = 'assets/logo.png'; // Replace with your logo path
  provisionalTitle = 'Provisional SEE RV Results';
  examDate = '24-11-2024';
  examTime = '13:34:03';
  examMonthYear = 'SEPT-2024';

  faculty = 'Faculty of Engineering and Technology (Co-Education)';
  department = 'B.Tech. in Electronics and Communication Engineering';
  rollNumber = 'SG22ECE010';
  studentName = 'AKASH';
  semester = 4;
  isPrintMode: boolean = false;

  results = [
    { courseCode: '22EC42', rvMarks: 12, oldMarks: 8, result: 'FAIL' },
    { courseCode: '22EC44', rvMarks: 14, oldMarks: 14, result: 'FAIL' },
    { courseCode: '22EC45', rvMarks: 18, oldMarks: 16, result: 'PASS' },
    { courseCode: '22UHV410', rvMarks: 13, oldMarks: 13, result: 'FAIL' }
  ];

  private studentSearchUrl = CONSTANTS.studentSearchUrl;
  private getExamResultMemosUrl = CONSTANTS.getExamResultMemosUrl;
  public MinIo = CONSTANTS.MINIO
  private getExamResultMemos = CONSTANTS.getExamResultMemos
  private collegewisedetailsUrl = CONSTANTS.collegewisedetailsUrl
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
  examData = [];
  check = 2;

  public studentFilterCtrl: FormControl = new FormControl();
  private _onDestroy = new Subject<void>();
  public filteredStudents: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);
  pageparams: any;
  form: FormGroup;
  memodate: any;
  orgCode: string;
  resultListDetails = [];
  dataSecStaff: boolean;
  dataSECPrincipal: boolean;
  filtersDetailsList: any;
  CollegesListDetails: any;
  groupDetails: any;
  colleges: any;
  data: any;
  collegeCode: any;
  courseGroups: any[];
  coursegroup: any[];
  courses: any[];
  courseListData: any[];
  examCourseCode: any;
  academicYearsList: any[];
  courseCode: string;
  dataFlag: boolean;
  academicYears: any;
  examsLists: any;
  academicYear: any;
  courseYearList: any[];
  studentsList: any[];
  newList: any[];
  mainList: any[];
  groupCode: any;
  stdId: number;
  filterDetailList: any;
  gradesData: any;
  exam_month_year: any;
  examName: any;
  constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,
    private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router,
    private dialog: MatDialog, private genericFunctions: GenericFunctions, private route: ActivatedRoute) {
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


    this.getFiltersList();
    this.searchStudents.push({ firstName: 'Search by student name or rollno.' });
    this.filteredStudents.next(this.searchStudents.slice());
    this.orgCode = localStorage.getItem('orgCode')


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






  getFiltersList(): void {
    this.filtersDetailsList = []
    this.CollegesListDetails = []
    this.groupDetails = []
    this.colleges = []
    this.spinner.show()
    let request = [
      { paramName: 'in_flag', paramValue: 'clg_exam_filters' },
      { paramName: 'in_org_id', paramValue: +localStorage.getItem('organizationId') },
      { paramName: 'in_college_id', paramValue: 0 },
      { paramName: 'in_course_id', paramValue: 0 },
      { paramName: 'in_course_group_id', paramValue: 0 },
      { paramName: 'in_course_year_id', paramValue: 0 },
      { paramName: 'in_group_section_id', paramValue: 0 },
      { paramName: 'in_academic_year_id', paramValue: 0 },
      { paramName: 'in_dept_id', paramValue: 0 },
      { paramName: 'in_isadmin', paramValue: 0 },
      { paramName: 'in_loginuser_empid', paramValue: +localStorage.getItem('employeeId') },
      { paramName: 'in_loginuser_roleid', paramValue: 0 },
      { paramName: 'in_employee', paramValue: '' },
      { paramName: 'in_subject', paramValue: '' },
      { paramName: 'in_gm_codes', paramValue: 'QUOTA,GENDER' },


    ];
    this.crudService.getDetailsByRequest(this.collegewisedetailsUrl, '', request, '&')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data && result.data !== '' && result.data.result.length > 0) {
            this.filtersDetailsList = result.data.result;
            for (let i = 0; i < this.filtersDetailsList.length; i++) {
              if (this.filtersDetailsList[i].length > 0 && this.filtersDetailsList[i][0].flag === 'clg_exam_filters') {
                this.CollegesListDetails = this.filtersDetailsList[i];
              }
              else if (this.filtersDetailsList[i].length > 0 && this.filtersDetailsList[i][0].flag === 'group_details') {
                this.groupDetails = this.filtersDetailsList[i]
              }

            }
            const CollegeIdData = this.CollegesListDetails.map(({ fk_college_id }) => fk_college_id);
            this.colleges = this.CollegesListDetails.filter(({ fk_college_id }, index) => !CollegeIdData.includes(fk_college_id, index + 1));
            if (this.colleges.length > 0) {
              this.examFeeCollectionForm.get('collegeId').setValue(this.colleges[0].fk_college_id);
              this.data = this.colleges.filter(x => (x.fk_college_id === this.examFeeCollectionForm.value.collegeId))[0].college_code;
              this.selectedCollege(this.examFeeCollectionForm.value.collegeId);
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
    this.collegeCode = this.colleges.filter(x => (x.fk_college_id === collegeId))[0].college_code;
    this.resultListDetails = [];
    this.examFeeCollectionForm.get('courseId').setValue('');
    this.examFeeCollectionForm.get('courseYearId').setValue('');
    this.examFeeCollectionForm.get('academicYearId').setValue('')
    this.examFeeCollectionForm.get('examId').setValue('');
    this.examFeeCollectionForm.get('courseGroupId').setValue('');

    this.courses = [];
    this.coursegroup = [];
    this.courseGroups = [];

    if (collegeId !== null && collegeId !== '') {

      this.courseListData = []
      this.courseListData = this.CollegesListDetails.filter(x => (x.fk_college_id == collegeId))
      if (this.courseListData.length > 0) {
        const courseList = this.courseListData.map(({ fk_course_id }) => fk_course_id);
        this.courses = this.courseListData.filter(({ fk_course_id }, index) =>
          !courseList.includes(fk_course_id, index + 1));
      }
      if (this.courses.length > 0) {
        this.examFeeCollectionForm.get('courseId').setValue(this.courses[0].fk_course_id);
        this.data = this.data + ' / ' + this.courses.filter(x => (x.fk_course_id === this.examFeeCollectionForm.value.courseId))[0].course_code;
        this.examCourseCode = this.courses.filter(x => (x.fk_course_id === this.examFeeCollectionForm.value.courseId))[0].course_code;
        this.selectedCourse(this.examFeeCollectionForm.value.courseId);
      }

    }
  }

  selectedCourse(courseId: number): void {
    // Reset all dependent fields
    this.coursegroup = [];
    this.courseGroups = [];
    this.courseYears = [];
    this.academicYearsList = [];
    this.resultListDetails = [];
    this.examFeeCollectionForm.get('courseYearId').setValue('');
    this.examFeeCollectionForm.get('academicYearId').setValue('');
    this.examFeeCollectionForm.get('examId').setValue('');
    this.examFeeCollectionForm.get('courseGroupId').setValue('');

    // Get the course code for the selected course
    const selectedCourse = this.courses.find(x => x.fk_course_id === courseId);
    if (selectedCourse) {
      this.courseCode = selectedCourse.course_code;
      this.examCourseCode = selectedCourse.course_code;
    }

    if (this.courseCode == 'DPHARM') {
      this.dataFlag = false
      this.SemisterList = [
        { id: 'IYEAR', value: 'Part 1' },
        { id: 'IIYEAR', value: 'Part 2' },
        { id: 'IIIYEAR', value: 'Part 3' },
        { id: 'IVYEAR', value: 'Part 4' },
      ]
    } else {
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
    // Filter and populate course groups based on the selected course and college
    this.coursegroup = this.CollegesListDetails.filter(
      x =>
        x.fk_college_id === this.examFeeCollectionForm.value.collegeId &&
        x.fk_course_id === courseId
    );
    this.coursegroup = this.coursegroup.filter(x => (x.fk_course_group_id != null && x.group_code != null))
    if (this.coursegroup.length > 0) {
      // Remove duplicate course group IDs
      const GroupCode = this.coursegroup.map(({ fk_course_group_id }) => fk_course_group_id);
      this.courseGroups = this.coursegroup.filter(({ fk_course_group_id }, index) =>
        !GroupCode.includes(fk_course_group_id, index + 1)
      );


      // Patch the first course group (0th position) if available
      if (this.courseGroups.length > 0) {
        this.examFeeCollectionForm.get('courseGroupId').setValue(this.courseGroups[0]?.fk_course_group_id);

        // Call the selectedCourseGroup method with the first course group ID
        this.selectedCourseGroup(this.examFeeCollectionForm.value.courseGroupId);
      }
    }
    // this.examFeeCollectionForm.get('courseGroupId').setValue(this.courseGroups[0]?.fk_course_group_id);

  }
  selectedCourseGroup(courseGroupId): void {
    if (courseGroupId != null) {
      this.resultListDetails = [];
      this.examFeeCollectionForm.get('courseYearId').setValue('');
      this.examFeeCollectionForm.get('academicYearId').setValue('')
      this.examFeeCollectionForm.get('examId').setValue('');
      this.courseYears = [];
      this.academicYearsList = []
      this.academicYearsList = this.CollegesListDetails.filter(x => (x.fk_college_id == this.examFeeCollectionForm.value.collegeId && x.fk_course_id == this.examFeeCollectionForm.value.courseId
        && x.fk_course_group_id == this.examFeeCollectionForm.value.courseGroupId
      ))
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
    this.academicYear = this.academicYears.filter(x => (x.fk_academic_year_id === this.examFeeCollectionForm.value.academicYearId))[0].academic_year;
    this.examsList = [];
    this.resultListDetails = [];
    this.examFeeCollectionForm.get('examId').setValue('');
    this.examFeeCollectionForm.get('courseYearId').setValue('');
    if (academicYearId) {
      this.examsLists = []
      this.examData = []
      this.examsLists = this.CollegesListDetails.filter(x => (x.fk_college_id == this.examFeeCollectionForm.value.collegeId && x.fk_course_id == this.examFeeCollectionForm.value.courseId && x.fk_academic_year_id == academicYearId))
      if (this.examsLists.length > 0) {
        const examsLists = this.examsLists.map(({ fk_exam_id }) => fk_exam_id);
        this.examsList = this.examsLists.filter(({ fk_exam_id }, index) =>
          !examsLists.includes(fk_exam_id, index + 1));
        this.examsList = this.examsList.filter(x => !x.is_internal_exam)
      }
      if (this.examsList.length > 0) {
        this.examFeeCollectionForm.get('examId').setValue(this.examsList[0].fk_exam_id);
        this.selectedExam(this.examFeeCollectionForm.value.examId)
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
  selectedExam(examId) {
    this.courseYearList = []
    this.courseYears = []
    this.resultListDetails = [];
    this.examFeeCollectionForm.get('courseYearId').setValue('');
    this.examMonthYear = this.examsList.filter(x => (x.fk_exam_id == examId))[0].exam_month_yr
    this.courseYearList = this.CollegesListDetails.filter(x => (x.fk_college_id == this.examFeeCollectionForm.value.collegeId && x.fk_course_id == this.examFeeCollectionForm.value.courseId
      && x.fk_course_group_id == this.examFeeCollectionForm.value.courseGroupId && x.fk_exam_id == this.examFeeCollectionForm.value.examId
    ))
    if (this.courseYearList.length > 0) {
      const courseYears = this.courseYearList.map(({ fk_course_year_id }) => fk_course_year_id);
      this.courseYears = this.courseYearList.filter(({ fk_course_year_id }, index) => !courseYears.includes(fk_course_year_id, index + 1));

    }
    if (this.courseYears.length > 0) {
      this.examFeeCollectionForm.get('courseYearId').setValue(this.courseYears[0].fk_course_year_id);
      this.data = this.data + ' / ' + this.courseYears.filter(x => (x.fk_course_year_id === this.examFeeCollectionForm.value.courseYearId))[0]?.course_year_code;
    }

  }

  selectedStudent(studentId): void {
    this.resultListDetails = []
    this.memo = [];
    this.feeCertificateIssue = [];
    this.isPrint = false;
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
        { paramName: 'in_flag', paramValue: 'list_exam_student_re_eval_gradecard' },
        { paramName: 'in_orgid', paramValue: +localStorage.getItem('organizationId') },
        { paramName: 'in_clg_id', paramValue: this.examFeeCollectionForm.value.collegeId },
        { paramName: 'in_fdate', paramValue: '1990-01-01' },
        { paramName: 'in_tdate', paramValue: '1990-01-01' },
        { paramName: 'in_exam_month_yr', paramValue: this.examMonthYear },
        { paramName: 'in_course_code', paramValue: this.examCourseCode },
        { paramName: 'in_course_year_code', paramValue: this.examFeeCollectionForm.value.courseYearId },
        { paramName: 'in_subject_code', paramValue: '' },
        { paramName: 'in_evalutor_profileid', paramValue: 0 },
        { paramName: 'in_exam_date', paramValue: '1990-01-01' },
        { paramName: 'in_regulation_code', paramValue: '' },
        { paramName: 'in_emp_id', paramValue: 0 },
        { paramName: 'in_questionpaper_id', paramValue: 0 },
        { paramName: 'in_student_id', paramValue: this.stdId },
      ];
      this.crudService.getDetailsByRequest(this.getExamResultMemosUrl, '', request, '&')
        .subscribe(result => {
          this.spinner.hide();
          if (result.statusCode === 200) {
            if (result.data && result.data !== '' && result.data.result.length > 0) {
              // this.filterDetailList=  result.data.result[0].filter(x=>(x.group_code === this.groupCode));
              this.filterDetailList = result.data.result


              for (let i = 0; i < this.filterDetailList.length; i++) {
                if (this.filterDetailList[i].length > 0 && this.filterDetailList[i][0].flag === 'list_exam_student_re_eval_gradecard') {
                  this.resultListDetails = this.filterDetailList[i];
                } else if (this.filterDetailList[i].length > 0 && this.filterDetailList[i][0].flag === 'grades_course') {
                  this.gradesData = this.filterDetailList[i];
                }
              }
              this.resultListDetails = this.resultListDetails.filter(x => (x.group_code === this.groupCode));
              this.gradesData = this.gradesData.sort((a, b) => (a.sort_order) - (b.sort_order));
              // this.resultListDetails = result.data.result[0].filter(x=>(x.group_code === this.groupCode));
              // this.resultListDetails.sort((a, b) => (a.order_no) - (b.order_no));
              this.flag = true;
              this.examName = this.resultListDetails[0]?.exam_name
              this.exam_month_year = this.resultListDetails[0]?.exam_month_year
              if (this.resultListDetails) {
                this.mainList = [];
                this.newList = [];
                const students = this.resultListDetails.map(({ hallticket_number }) => hallticket_number);
                this.studentsList = this.resultListDetails.filter(({ hallticket_number }, index) =>
                  !students.includes(hallticket_number, index + 1));
                this.studentsList = this.studentsList.sort((a, b) => parseInt(a.hallticket_number) - parseInt(b.hallticket_number));

                for (let i = 0; i < this.studentsList.length; i++) {
                  this.newList = [];
                  for (let j = 0; j < this.resultListDetails.length; j++) {
                    if (this.studentsList[i].hallticket_number == this.resultListDetails[j].hallticket_number) {
                      this.newList.push(this.resultListDetails[j])
                    }
                  }
                  // this.newList = this.newList.sort((a, b) => (a.order_no) - (b.order_no));
                  this.mainList.push(this.newList);
                }
                console.log(this.mainList, ' this.mainList');


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

 
  printPage(_printsection: any) {
    this.isPrintMode = true;
    setTimeout(() => {
      window.print();
      this.isPrintMode = false;
    }, 100);
  }






}



