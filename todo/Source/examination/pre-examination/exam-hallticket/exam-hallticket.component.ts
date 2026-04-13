import { Component, OnInit, ViewChild } from '@angular/core';
import { CONSTANTS } from 'app/main/common/constants';
import { FormGroup, FormControl, FormBuilder, Validators } from '@angular/forms';
import { ExamMaster } from 'app/main/models/examMaster';
import { Subject, ReplaySubject } from 'rxjs';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { Router, ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { takeUntil } from 'rxjs/operators';
import { fuseAnimations } from '@fuse/animations';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Organization } from 'app/main/models/organization';
import { ParametersService } from 'app/main/services/parameters.service';
import { MatRadioChange } from '@angular/material/radio';


@Component({
  selector: 'app-exam-hallticket',
  templateUrl: './exam-hallticket.component.html',
  styleUrls: ['./exam-hallticket.component.scss'],
  animations: fuseAnimations
})
export class ExamHallticketComponent implements OnInit {
  SemisterList = [
    { id: 'ISEM', value: 'FIRST' },
    { id: 'IISEM', value: 'SECOND' },
    { id: 'IIISEM', value: 'THIRD' },
    { id: 'IVSEM', value: 'FOURTH' },
    { id: 'VSEM', value: 'FIFTH' },
    { id: 'VISEM', value: 'SIXTH' },
    { id: 'VIISEM', value: 'SEVENTH' },
    { id: 'VIIISEM', value: 'EIGHTH' },

  ]
  SemisterDuplicateList = [
    { id: 'IYEARISEM', value: 'I SEM' },
    { id: 'IYEARIISEM', value: 'II SEM' },
    { id: 'IIYEARISEM', value: 'III SEM' },
    { id: 'IIYEARIISEM', value: 'IV SEM' },
    { id: 'IIIYEARISEM', value: 'V SEM' },
    { id: 'IIIYEARIISEM', value: 'VI SEM' },
    { id: 'IVYEARISEM', value: 'VII SEM' },
    { id: 'IVYEARIISEM', value: 'VIII SEM' },

  ]
  displayedColumns: string[] = ['id', 'examDate', 'sessionStartTime', 'subjectCode', 'subjectName', 'subjectType'];
  displayedColumnsDuplicate: string[] = ['id', 'studentId', 'studentName'];
  dataSource: MatTableDataSource<any>;
  dataSourceDuplicateList: MatTableDataSource<any>;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  private getDetailsByCollegeIdUrl = CONSTANTS.getDetailsByCollegeIdUrl;
  private examMasterUrl = CONSTANTS.examMasterUrl;
  private getDetailsByCourseIdUrl = CONSTANTS.getDetailsByCourseIdUrl;
  private studentSearchUrl = CONSTANTS.studentSearchUrl;
  private studentHallTicketUrl = CONSTANTS.studentHallTicketUrl;
  private isActive = CONSTANTS.isActive;
  private examHallTicketUrl = CONSTANTS.examHallTicketUrl;
  private endURL = CONSTANTS.MAINAPI;
  private getBulkExamHallticketsUrl = CONSTANTS.getBulkExamHallticketsUrl;
  private getExamFiltersBycodeUrl = CONSTANTS.getExamFiltersBycodeUrl;
  private getExamHalltickets = CONSTANTS.getExamHalltickets
  MINIO = CONSTANTS.MINIO;

  examFeeCollectionForm: FormGroup;
  examsList = [];
  searchStudents = [];
  selectedStd = [];
  student: any = {};
  feeReceipts: any[] = [];
  studentFirstName;
  flag = false;
  exam: any = {};
  pending: boolean;
  blob;
  bulkTable = false
  students: any[] = [];
  studentsListForm: FormGroup;
  organizationDetails: Organization[] = [];
  colleges = [];
  courses = [];
  courseYears = [];
  academicYears = [];
  sections = [];
  courseGroups = [];
  examDuplicateList = [];
  defaultAcademicYearId: string;
  check = 1;
  step = 0;
  pageParams: any = {};
  empSecurity = [];
  dataSecStaff;
  dataSECPrincipal;
  data;
  isDeprtAdmin;
  params: any;
  pageparams: any;
  DuplicatefeeReceipts: any;
  studentId = [];
  bulkHallticketDetails = [];
  public studentFilterCtrl: FormControl = new FormControl();
  private _onDestroy = new Subject<void>();
  public filteredStudents: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);
  singlePageParams: any;
  orgCode: string;
  universityCode: string;
  singleParams: any;
  filtersDetailsList: any[];
  CollegesListDetails: any[];
  groupDetails: any[];
  courseCode: string;
  examTimetableList: any[];
  academicYearsList: any[];
  examsLists: any[];
  examData: any[];
  academicYear: string;
  courseListData: any[];
  collegeCode: string;
  examDetails: ExamMaster;
  courseYearsList: any[];
  courseGroupList: any[];
  myDate: Date;
  examId: any;
  newList: any[];
  mainList: any[];
  studentsList: any[];
  singleStudent: any;
  CollegesListFilterDetails: any;
  regulationFilterList = [];
  regulationList: any[];
  groupedHallTickets: { [key: string]: any[] } = {};
  bulkGroupedHallTickets = [];

  constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,
    private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router, private parameters: ParametersService,
    private dialog: MatDialog, private genericFunctions: GenericFunctions, private route: ActivatedRoute) {
  }

  ngOnInit(): void {
    this.examFeeCollectionForm = this.formBuilder.group({
      examId: ['', Validators.required],
      studentId: ['', Validators.required],
    });
    this.studentsListForm = this.formBuilder.group({
      collegeId: ['', Validators.required],
      organizationId: ['', Validators.required],
      academicYearId: ['', Validators.required],
      courseId: ['', Validators.required],
      examId: ['', Validators.required],
      courseGroupId: ['', Validators.required],
      courseYearId: ['', Validators.required],
      groupSectionId: ['', Validators.required]
    });
    this.orgCode = localStorage.getItem('orgCode');
    this.myDate = new Date();
    if (this.parameters.printSingleHallticket && this.parameters.printSingleHallticket.length > 0) {
      this.check = 2
      this.singlePageParams = this.parameters.printSingleHallticket[0]
      this.pageParams = this.singlePageParams.pageParams
    } else if (this.parameters.bulkPrintHalltikets && this.parameters.bulkPrintHalltikets.length > 0) {
      this.check = 2
      let bulkparameters = this.parameters.bulkPrintHalltikets[0]
      this.pageParams = bulkparameters.pageParams
      this.getFiltersList();

    }



    this.studentFilterCtrl.valueChanges
      .pipe(takeUntil(this._onDestroy))
      .subscribe(() => {
        this.filterStd();
      });
    this.dataSource = new MatTableDataSource<any>(this.bulkHallticketDetails);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.dataSourceDuplicateList = new MatTableDataSource<any>(this.bulkHallticketDetails);
    this.dataSourceDuplicateList.paginator = this.paginator;
    this.dataSourceDuplicateList.sort = this.sort;
    this.searchStudents.push({ firstName: 'Search by student name or rollno.' });
    this.filteredStudents.next(this.searchStudents.slice());
    this.route.queryParams
      .subscribe(params => {
        this.pageparams = params;
        this.examFeeCollectionForm.get('studentId').setValue(+this.pageparams.studentId);
        this.examFeeCollectionForm.get('examId').setValue(+this.pageparams.examId);
      });
    if (!this.isEmptyObject(this.pageparams)) {
      this.examFeeCollectionForm.get('studentId').setValue(+this.pageparams.studentId);
      this.examFeeCollectionForm.get('examId').setValue(+this.pageparams.examId);
    }
    // this.getData();
  }

  // tslint:disable-next-line: use-lifecycle-interface
  ngOnDestroy(): void {
    this._onDestroy.next();
    this._onDestroy.complete();
  }
  clear($event: MatRadioChange) {
    if ($event.value === 2) {
      this.examFeeCollectionForm.get('examId').setValue(0);
      this.examFeeCollectionForm.get('studentId').setValue(0);
      this.getFiltersList();

    } else
      if ($event.value === 1) {
        this.pageParams = {}

        this.parameters.bulkPrintHalltikets = []

        this.studentsListForm.get('collegeId').setValue(0);
        this.studentsListForm.get('academicYearId').setValue(0);
        this.examFeeCollectionForm.get('studentId').setValue('');
        this.studentsListForm.get('courseYearId').setValue(0);
        this.studentsListForm.get('courseGroupId').setValue(0);

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

  selectedExternalExam(examId): void {
    this.feeReceipts = [];
    this.flag = true;
    this.mainList = [];
    this.newList = [];
    this.singleStudent = [];
    this.studentsList = [];
    this.bulkHallticketDetails = [];
    this.bulkGroupedHallTickets = [];
    this.dataSourceDuplicateList = new MatTableDataSource([]);
    setTimeout(() => this.dataSourceDuplicateList.paginator = this.paginator);
    this.dataSourceDuplicateList.sort = this.sort;
    this.dataSource = new MatTableDataSource<any>([]);
    if (this.selectedStd.length > 0) {
      // this.getExamFeeReceipts(this.student.studentId);
      this.getHallTickets();
    }
    if (this.examsList.filter(x => (x.examId === examId)).length > 0) {
      this.exam = this.examsList.filter(x => (x.examId === examId))[0];
    }
  }

  enteredStudent(event): void {
    this.bulkHallticketDetails = []
    if (event.target.value.length > 4) {
      /*----------- STUDENTS -----------*/
      this.crudService.listByTwoIds(this.studentSearchUrl, 'true', event.target.value,
        'isActive', 'q')
        .subscribe(result => {
          if (result.statusCode === 200) {
            if (!this.isEmptyObject(this.pageparams)) {
              this.examFeeCollectionForm.get('studentId').setValue(+this.pageparams.studentId);
              this.selectedStudent(+this.pageparams.studentId);

            }
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

  selectedStudent(studentId): void {

    if (!this.isEmptyObject(this.pageparams)) {
      this.examFeeCollectionForm.get('studentId').setValue(+this.pageparams.studentId);
    }
    this.bulkHallticketDetails = []
    this.feeReceipts = [];
    this.flag = false;

    if (studentId != null && studentId !== '' && studentId !== 'undefined') {
      this.selectedStd = [];
      if (this.searchStudents.filter(x => (x.studentId === studentId)).length > 0) {
        this.selectedStd.push(this.searchStudents.filter(x => (x.studentId === studentId))[0]);
        this.student = this.selectedStd[0];
        if (this.student.studentPhotoPath === null) {
          this.student.studentPhotoPath = 'assets/images/avatars/default_Student.png';
        }
        if(this.student.universityCode !== null){
            this.universityCode = this.student.universityCode;
        }
        this.student.studentPhotoPath = this.student.studentPhotoPath + '?' + new Date().getTime();
        this.studentFirstName = this.student.firstName + ' ( ' + this.student.hallticketNumber + ' )';

        this.getExamsList();
      }
    }
  }

  getExamsList(): void {
    this.examFeeCollectionForm.get('examId').setValue('');
    this.examsList = [];
    this.feeReceipts = [];
    this.examDuplicateList = [];
    /*----------- Exams List -----------*/
    // this.crudService.listDetailsByThreeIdsWithSort(this.examMasterUrl, this.student.collegeId, this.student.courseId, 'true', 'DESC',
    //   this.getDetailsByCollegeIdUrl , this.getDetailsByCourseIdUrl, this.isActive, 'createdDt')   
    this.crudService.listDetailsByTwoIdsWithSort(this.examMasterUrl, this.student.courseId, 'true', 'DESC',
      this.getDetailsByCourseIdUrl, this.isActive, 'createdDt')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.success) {
            this.examsList = [];
            // tslint:disable-next-line: prefer-for-of
            for (let i = 0; i < result.data.resultList.length; i++) {
              if (!result.data.resultList[i].isInternalExam) {
                this.examsList.push(result.data.resultList[i]);
                this.examDuplicateList.push(result.data.resultList[i]);
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
    this.examDuplicateList = []
    this.searchExamList(value);
  }
  searchExamList(value: string) {
    let filter = value.toLowerCase();
    for (let i = 0; i < this.examsList.length; i++) {
      let option = this.examsList[i];
      if (option.examName.toLowerCase().indexOf(filter) >= 0) {
        this.examDuplicateList.push(option);
      }
    }
  }
  getExamFeeReceipts(studentId): void {
    this.flag = true;
    /*------------- FEE RECEIPTS ------------*/
    this.crudService.listByTwoIds(this.examHallTicketUrl, this.examFeeCollectionForm.value.examId,
      studentId, 'examId', 'studentId')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.success) {
            this.feeReceipts = this.sortDataAss(result.data[0].subjectDTOList)
            this.DuplicatefeeReceipts = result.data[0]
            this.data = this.DuplicatefeeReceipts

            this.dataSource = new MatTableDataSource<any>(this.feeReceipts);
            this.dataSource.paginator = this.paginator
            this.dataSource.sort = this.sort;
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

  getMonth(month): any {
    if (CONSTANTS.monthColors.filter(x => (x.id === month)).length > 0) {
      return CONSTANTS.monthColors.filter(x => (x.id === month))[0].fullName;
    } else {
      return 0;
    }
  }

  tConvert(time): void {
    time = time.toString().match(/^([01]\d|2[0-3])(:)([0-5]\d)(:[0-5]\d)?$/) || [time];

    if (time.length > 1) { // If time format correct
      time = time.slice(1);  // Remove full string match value
      time[5] = +time[0] < 12 ? 'AM' : 'PM'; // Set AM/PM
      time[0] = +time[0] % 12 || 12; // Adjust hours
    }
    time = time[0] + time[1] + time[2] + ' ' + time[5];
    return time;
  }

  print(details): void {
    if (this.examFeeCollectionForm.valid) {

      // this.crudService.getPdf(this.studentHallTicketUrl, details.examId, details.studentId).subscribe((data) => {


      //   this.blob = new Blob([data], {type: 'application/pdf'});

      //   const downloadURL = window.URL.createObjectURL(data);
      //   const link = document.createElement('a');
      //   link.href = downloadURL;
      //   link.download = 'help.pdf';
      //   link.click();

      // });
      /*---------- Print call  ----------*/
      // Xhr creates new context so we need to create reference to this
      const self = this;

      // Status flag used in the template.
      this.pending = true;

      // Create the Xhr request object
      const xhr = new XMLHttpRequest();
      xhr.open('GET', this.endURL + this.studentHallTicketUrl + '?examId=' + details.examId + '&studentId=' + details.studentId, true);
      xhr.setRequestHeader('Authorization', 'Bearer ' + localStorage.getItem('token'));
      xhr.responseType = 'blob';
      // tslint:disable-next-line:typedef
      //    xhr.onload = function ( ) {
      //     if (xhr.readyState === xhr.DONE) {
      //         if (xhr.status === 200) {
      //         }
      //     }
      // };

      // Xhr callback when we get a result back
      // We are not using arrow function because we need the 'this' context
      // tslint:disable-next-line:typedef
      xhr.onreadystatechange = function () {

        // We use setTimeout to trigger change detection in Zones
        setTimeout(() => { self.pending = false; }, 0);
        if (xhr.readyState === 4 && xhr.status === 200) {

          if (this.response.type === 'application/pdf') {
            const blob = new Blob([this.response], { type: 'application/pdf' });
            // FileSaver.saveAs(blob, 'Report.pdf');

            const blobUrl = URL.createObjectURL(blob);
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = blobUrl;
            document.body.appendChild(iframe);
            iframe.contentWindow.print();
          } else {
            alert('Student is not registered for selected exam');
          }
        }
      };
      // Start the Ajax request
      xhr.send();

    }
  }
  notification(): void {
    this.snotifyService.info('Student is not registered for selected exam', 'Info!');
  }

  // tslint:disable-next-line:typedef
  isEmptyObject(obj) {
    return (obj && (Object.keys(obj).length === 0));
  }

  sortDataAss(data): any {
    return data.sort((a, b) => {
      return (new Date(a.examDate) as any) - (new Date(b.examDate) as any);
    });
  }


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
            if (this.courses.length > 0) {
              this.studentsListForm.get('courseId').setValue(this.courses[0].fk_course_id);
              this.selectedCourse(this.studentsListForm.value.courseId)
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
      this.studentsListForm.get('academicYearId').setValue('')
      this.studentsListForm.get('examId').setValue('');
      this.studentsListForm.get('collegeId').setValue('');
      this.studentsListForm.get('courseGroupId').setValue('');
      this.studentsListForm.get('courseYearId').setValue('');
      this.academicYears = []
      this.examsList = [];
      this.colleges = []
      this.courseGroups = []
      this.courseYears = []
      this.regulationList = []
      this.academicYearsList = []
      this.academicYearsList = this.CollegesListFilterDetails.filter(x => (x.fk_course_id == this.studentsListForm.value.courseId))
      if (this.academicYearsList.length > 0) {
        const academicYears = this.academicYearsList.map(({ fk_academic_year_id }) => fk_academic_year_id);
        this.academicYears = this.academicYearsList.filter(({ fk_academic_year_id }, index) => !academicYears.includes(fk_academic_year_id, index + 1));
      }
      if (this.academicYears && this.academicYears.length > 0) {
        const currentAY = this.academicYears?.sort((a, b) => (b.is_curr_ay ?? 0) - (a.is_curr_ay ?? 0))[0];
        if (currentAY?.fk_academic_year_id) {
        this.studentsListForm.get('academicYearId')?.setValue(currentAY.fk_academic_year_id);
        }
        this.academicYears = this.academicYears.sort((a,b)=>parseInt(b?.academic_year) - parseInt(a?.academic_year));
        // this.studentsListForm.get('academicYearId').setValue(this.academicYears[0].fk_academic_year_id);
        this.selectedAcademicYear(this.studentsListForm.value.academicYearId);
      }

    }
  }




  selectedAcademicYear(academicYearId): void {
    this.studentsListForm.get('examId').setValue('');
    this.studentsListForm.get('collegeId').setValue('');
    this.studentsListForm.get('courseGroupId').setValue('');
    this.studentsListForm.get('courseYearId').setValue('');

    this.examsList = [];
    this.colleges = []
    this.courseGroups = []
    this.courseYears = []
    this.regulationList = []
    if (academicYearId) {
      this.examsLists = []
      this.examData = []
      this.examsLists = this.CollegesListFilterDetails.filter(x => (x.fk_course_id === this.studentsListForm.value.courseId && x.fk_academic_year_id == this.studentsListForm.value.academicYearId))
      if (this.examsLists.length > 0) {
        const examsLists = this.examsLists.map(({ fk_exam_id }) => fk_exam_id);
        this.examsList = this.examsLists.filter(({ fk_exam_id }, index) => !examsLists.includes(fk_exam_id, index + 1));
        this.examData = this.examsList;
      }
      if (this.examsList.length > 0) {
        this.studentsListForm.get('examId').setValue(this.examsList[0].fk_exam_id);
        this.selectedExam(this.studentsListForm.value.examId);
      }
    }

  }
  selectedExam(examId): void {
    this.filtersDetailsList = []
    this.studentsListForm.get('collegeId').setValue('');
    this.studentsListForm.get('courseGroupId').setValue('');
    this.studentsListForm.get('courseYearId').setValue('');


    let request = [
      { paramName: 'in_flag', paramValue: 'univ_exam_rest_no_tt' },
      { paramName: 'in_flag_type', paramValue: 'ALL' },
      { paramName: 'in_university_id', paramValue: 0 },
      { paramName: 'in_college_id', paramValue: 0 },
      { paramName: 'in_course_id', paramValue: this.studentsListForm.value.courseId },
      { paramName: 'in_course_group_id', paramValue: 0 },
      { paramName: 'in_course_year_id', paramValue: 0 },
      { paramName: 'in_exam_id', paramValue: this.studentsListForm.value.examId },
      { paramName: 'in_academic_year_id', paramValue: this.studentsListForm.value.academicYearId },
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
            this.regulationList = []
            if (this.CollegesListDetails) {
              /*----------- Colleges -----------*/
            
              this.colleges = this.CollegesListDetails
              const CollegeIdData = this.colleges.map(({ fk_college_id }) => fk_college_id);
              this.colleges = this.colleges.filter(({ fk_college_id }, index) => !CollegeIdData.includes(fk_college_id, index + 1));
              if (this.colleges.length > 0) {
                this.studentsListForm.get('collegeId').setValue(this.colleges[0].fk_college_id);
                this.selectedCollege(this.studentsListForm.value.collegeId);
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
    this.courseGroupList = [];
    this.courseGroups = [];
    this.courseYears = [];
    this.regulationList = [];
    this.studentsListForm.get('courseGroupId').setValue('');
    this.studentsListForm.get('courseYearId').setValue('');
    if (collegeId != null) {
      this.universityCode = this.colleges.filter(x => (x.fk_college_id == this.studentsListForm.value.collegeId))[0]?.university_code;
      this.courseGroupList = this.CollegesListDetails.filter(x => (x.fk_college_id == this.studentsListForm.value.collegeId));
      if (this.courseGroupList.length > 0) {
        const courseGroups = this.courseGroupList.map(({ fk_course_group_id }) => fk_course_group_id);
        this.courseGroups = this.courseGroupList.filter(({ fk_course_group_id }, index) => !courseGroups.includes(fk_course_group_id, index + 1));
      }
      if (this.courseGroups.length > 0) {
        this.studentsListForm.get('courseGroupId').setValue(this.courseGroups[0].fk_course_group_id);
        this.selectedGroup(this.studentsListForm.value.courseGroupId)
      }
    }
  }



  selectedGroup(courseGroupId): void {
    this.studentsListForm.get('courseYearId').setValue('');
    this.courseYearsList = []
    this.courseYears = []
    this.regulationList = []


    /*----------- COURSES Years -----------*/
    this.courseYearsList = this.CollegesListDetails.filter(x => (x.fk_college_id == this.studentsListForm.value.collegeId && x.fk_course_group_id == courseGroupId))
    if (this.courseYearsList.length > 0) {
      const courseYearsList = this.courseYearsList.map(({ fk_course_year_id }) => fk_course_year_id);
      this.courseYears = this.courseYearsList.filter(({ fk_course_year_id }, index) => !courseYearsList.includes(fk_course_year_id, index + 1));
    }
    //      if (!this.isEmptyObject(this.pageParams) && this.courseYears.length > 0){
    //       this.studentsListForm.get('courseYearId').setValue(+this.pageParams.courseYearId);
    //       this.selectedYear( this.studentsListForm.value.courseYearId);
    // } 
    //    else 
    if (this.courseYears.length > 0) {
      this.studentsListForm.get('courseYearId').setValue(this.courseYears[0].fk_course_year_id);
      this.selectedYear(this.studentsListForm.value.courseYearId);
    }
  }
  selectedYear(courseYearId) {
    this.regulationList = []
    if (courseYearId) {
      if (this.regulationFilterList.length > 0) {
        const regulationDetailList = this.regulationFilterList.map(({ fk_regulation_id }) => fk_regulation_id);
        this.regulationList = this.regulationFilterList.filter(({ fk_regulation_id }, index) => !regulationDetailList.includes(fk_regulation_id, index + 1));
      }

      // if (this.regulationList.length > 0) {
      //   // this.bulkHallticketDetails =[]
      //   // this.bulkTable=false
      //   this.studentsListForm.get('regulationId').setValue(this.regulationList[0].fk_regulation_id);
      //   // this.selectedRegulation(this.studentsListForm.value.regulationId)
      // }

    }
  }

  //   selectedRegulation(regulationId): void {
  //     this.studentsListForm.get('subjectId').setValue('');
  //       this.subjectsDetailList = []
  //       this.subjectData = []
  //       this.subjectsList =[]
  //       let request = [
  //         { paramName: 'in_flag', paramValue: 'univ_exam_subject_uc' },
  //         { paramName: 'in_flag_type', paramValue: 'ALL' },
  //         { paramName: 'in_university_id', paramValue: 0 },
  //         { paramName: 'in_college_id', paramValue: this.studentsListForm.value.collegeId },
  //         { paramName: 'in_course_id', paramValue: this.studentsListForm.value.courseId },
  //         { paramName: 'in_course_group_id', paramValue: this.studentsListForm.value.courseGroupId },
  //         { paramName: 'in_course_year_id', paramValue: this.studentsListForm.value.courseYearId },
  //         { paramName: 'in_exam_id', paramValue: this.studentsListForm.value.examId },
  //         { paramName: 'in_academic_year_id', paramValue: this.studentsListForm.value.academicYearId },
  //         { paramName: 'in_regulation_id', paramValue:  this.studentsListForm.value.regulationId },
  //         { paramName: 'in_subject_id', paramValue: 0 },
  //         { paramName: 'in_loginuser_empid', paramValue: +localStorage.getItem('employeeId') },
  //         { paramName: 'in_loginuser_roleid', paramValue: 0 },
  //       ];
  //       this.crudService.getDetailsByRequest(this.getExamFiltersBycodeUrl, '', request, '&')
  //         .subscribe(result => {
  //           this.spinner.hide(); 
  //           if (result.statusCode === 200) {
  //             if (result.data && result.data !== '' && result.data.result.length > 0) {
  //               this.filtersDetailsList = result.data.result;
  //               for (let i = 0; i < this.filtersDetailsList.length; i++) {
  //                 if (this.filtersDetailsList[i].length > 0 && this.filtersDetailsList[i][0].flag === 'univ_exam_sub_uc') {
  //                   this.subjectsDetailList = this.filtersDetailsList[i];
  //                 }
  //               }
  //               if (this.subjectsDetailList ) {
  //                 if (this.subjectsDetailList.length > 0) {
  //                   const subjectsDetailList = this.subjectsDetailList.map(({ fk_subject_id }) => fk_subject_id);
  //                   this.subjectsList = this.subjectsDetailList.filter(({ fk_subject_id }, index) => !subjectsDetailList.includes(fk_subject_id, index + 1));
  //                   this.subjectData = this.subjectsList;
  //                 }
  //                 //     if (!this.isEmptyObject(this.pageParams) && this.examsList.length > 0){
  //                 //       this.studentsListForm.get('examId').setValue(+this.pageParams.examId);
  //                 //       this.getHallTickets();
  //                 // } 
  //                 //    else 

  //                 if (this.subjectsList.length > 0) {
  //                   // this.bulkHallticketDetails =[]
  //                   // this.bulkTable=false
  //                   this.studentsListForm.get('subjectId').setValue(this.subjectsList[0].fk_subject_id);
  //                 }

  //               }


  //             } else {
  //               this.snotifyService.success(result.message, 'Success!');
  //             }
  //           } else {
  //             this.snotifyService.error(result.message, 'Error!');
  //           }
  //         }, error => {
  //           this.spinner.hide();
  //           if (error.error.statusCode === 401) {
  //             this.snotifyService.error(error.error.message, 'Error!');
  //             this.genericFunctions.logOut(this.router.url);
  //           } else {
  //             this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
  //           }
  //         });













  //   }


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





  /*..............GET UNIV-COMMITTE-PROFILE-REQCUITMENTS DETAILS LIST........... */
  //  getHallTickets() {
  //   let request = [
  //     { paramName: 'examId', paramValue: this.studentsListForm.value.examId },
  //     { paramName: 'courseYearId', paramValue: this.studentsListForm.value.courseYearId },
  //     { paramName: 'collegeId', paramValue: this.studentsListForm.value.collegeId },
  //     { paramName: 'academicYearId', paramValue:  this.studentsListForm.value.academicYearId },
  //     { paramName: 'courseId', paramValue:  this.studentsListForm.value.courseId },
  //     { paramName: 'courseGroupId', paramValue:  this.studentsListForm.value.courseGroupId },

  //   ]
  //   this.crudService.getDetailsByRequest(this.getBulkExamHallticketsUrl,'', request, '&')
  //     .subscribe(result => {
  //       this.spinner.hide();
  //       if (result.statusCode === 200) {
  //         if (result.data && result.data !== '') {
  //           this.snotifyService.success(result.message, 'Success!');
  //           this.bulkTable = true;
  //           this.bulkHallticketDetails = result.data;
  //           this.dataSourceDuplicateList = new MatTableDataSource(this.bulkHallticketDetails);
  //           setTimeout(() => this.dataSourceDuplicateList.paginator = this.paginator);
  //           this.dataSourceDuplicateList.sort = this.sort;
  //         }else{
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

  getHallTickets() {
    this.spinner.show();
    this.mainList = [];
    this.newList = [];
    this.singleStudent = [];
    this.studentsList = [];
    this.bulkHallticketDetails = [];
    this.bulkGroupedHallTickets = [];
    this.dataSourceDuplicateList = new MatTableDataSource([]);
    setTimeout(() => this.dataSourceDuplicateList.paginator = this.paginator);
    this.dataSourceDuplicateList.sort = this.sort;
    this.dataSource = new MatTableDataSource<any>([]);
    if (this.check == 1) {
      this.examId = this.examFeeCollectionForm.value.examId
      this.studentsListForm.get('collegeId').setValue(0);
      this.studentsListForm.get('academicYearId').setValue(0);
      this.studentsListForm.get('courseYearId').setValue(0);
      this.studentsListForm.get('courseGroupId').setValue(0);
      this.studentsListForm.get('courseId').setValue(0);


    }
    else {
      this.examId = this.studentsListForm.value.examId
    }
    let request = [
      { paramName: 'is_exam_id', paramValue: this.examId },
      { paramName: 'course_year_id', paramValue: this.studentsListForm.value.courseYearId },
      { paramName: 'in_college_Id', paramValue: this.studentsListForm.value.collegeId },
      { paramName: 'in_academic_year_id', paramValue: this.studentsListForm.value.academicYearId },
      { paramName: 'in_course_id', paramValue: this.studentsListForm.value.courseId },
      { paramName: 'in_course_group_id', paramValue: this.studentsListForm.value.courseGroupId },
      { paramName: 'in_student_id', paramValue: this.examFeeCollectionForm.value.studentId ? this.examFeeCollectionForm.value.studentId : 0 },


    ]
    this.crudService.getDetailsByRequest(this.getExamHalltickets, '', request, '&')
      .subscribe(result => {
        this.spinner.hide();
         if (result.statusCode === 200) {
          if (result.data && result.data !== '') {
            this.snotifyService.success(result.message, 'Success!');
            this.bulkTable = true;
            this.bulkHallticketDetails = result.data.result[0];
            
            if(this.bulkHallticketDetails && this.bulkHallticketDetails.length>0 && this.orgCode == 'AMS'){
              this.bulkHallticketDetails=  this.bulkHallticketDetails.filter(x=>x.subjecttype!='LAB')
            }
            if(this.check == 1){
              this.dataSource = new MatTableDataSource<any>(this.bulkHallticketDetails);
            }else{
            
              this.mainList=[];
              this.newList=[];
              this.bulkGroupedHallTickets = []
              const students = this.bulkHallticketDetails.map(({ hallticket_number }) => hallticket_number);
              this.studentsList = this.bulkHallticketDetails.filter(({ hallticket_number }, index) =>
                 !students.includes(hallticket_number, index + 1));
              this.studentsList = this.studentsList.sort((a, b) => {
                if (a.hallticket_number < b.hallticket_number) {
                    return -1;
                }
                if (a.hallticket_number > b.hallticket_number) {
                    return 1;
                }
                return 0;
            });
                 for(let i=0;i<this.studentsList.length;i++){
                 this.newList=[];
                  for(let j=0;j<this.bulkHallticketDetails.length;j++){
                        if(this.studentsList[i].hallticket_number==this.bulkHallticketDetails[j].hallticket_number){
                                   this.newList.push(this.bulkHallticketDetails[j])
                        }
                  }
                 this.newList = this.newList.sort((a, b) => (a.order_no) - (b.order_no));
                   // Separate the data for each student by course_year_code
  const courseYearGroups = this.newList.reduce((acc, item) => {
    const groupKey = item.course_year_code;
    if (!acc[groupKey]) {
      acc[groupKey] = [];
    }
    acc[groupKey].push(item);
    return acc;
  }, {});

  const courseYearList = Object.values(courseYearGroups);
  this.bulkGroupedHallTickets.push(courseYearList);
  
                 this.mainList.push(this.newList);
                 this.singleStudent = this.mainList[0]
                 this.dataSourceDuplicateList = new MatTableDataSource(this.mainList);
                 setTimeout(() => this.dataSourceDuplicateList.paginator = this.paginator);
                 this.dataSourceDuplicateList.sort = this.sort;
                 }
                 
            }
          
          }else{
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



 Print(student){    
    if (this.bulkHallticketDetails) {
      this.groupedHallTickets = this.bulkHallticketDetails.reduce((acc, curr) => {
        const key = curr.course_year_code;
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(curr);
        return acc;
      }, {});
    }
    
    setTimeout(() => {
window.print();
    }, 500);
    }

  printSingle(row) {
    this.router.navigate(['admin-examination-management/admin-pre-examinations/exam-hallticket/print-exam-hallticket'])
    this.parameters.bulkPrintHalltikets = []
    let queryparams = [
      {
        htdata: row,
        formValues: this.studentsListForm.value
      }
    ]
    this.parameters.printSingleHallticket = queryparams;
  }
  printBulk(student) {
    this.router.navigate(['admin-examination-management/admin-pre-examinations/exam-hallticket/print-exam-hallticket'])
    this.parameters.printSingleHallticket = []
    let queryparams = [
      {
        htBulkdata:this.bulkGroupedHallTickets,
        // htBulkdata: this.mainList,
        formValues: this.studentsListForm.value,
        universityCode: this.universityCode,
      }
    ]
    this.parameters.bulkPrintHalltikets = queryparams;
  }
}