import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { CONSTANTS } from 'app/main/common/constants';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { Router } from '@angular/router';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-examcenter-students-report',
  templateUrl: './examcenter-students-report.component.html',
  styleUrls: ['./examcenter-students-report.component.scss']
})
export class ExamcenterStudentsReportComponent implements OnInit {

  private getExamEvaluationCodesUrl = CONSTANTS.getExamEvaluationCodesUrl;
  private UnivExamCentersUrl = CONSTANTS.UnivExamCentersUrl;
  private isActive = CONSTANTS.isActive;
  private UnivEcStudentsUrl = CONSTANTS.UnivEcStudentsUrl;
  private UnivEcCollegesUrl = CONSTANTS.UnivEcCollegesUrl;
  private getExamMasterDetailsUrl = CONSTANTS.getExamMasterDetailsUrl;
  MINIO = CONSTANTS.MINIO;

  filtersDetailsList = [];
  CollegesListDetails = [];
  courses = [];
  academicYears = [];
  searchExams = [];
  examsList = [];
  academicYearsList = [];
  examData = [];
  examsLists = [];
  univExamCenters = [];
  examCenterColleges = [];
  subjectsList = [];
  subjects = [];
  subjectsData = [];
  examSubjectstd = [];
  examCenterStudents = [];

  examsName: any;
  academicYearName: any;
  courseName: any;
  subjectCode: any;
  examCenterName: any;

  panelOpenState = true;
  step = 0;
  staffForm: FormGroup;
  flag = false;
  orgCode;
  Logo: any;

  displayedColumns: string[] = ['id', 'examcenter','collegeCode', 'exam', 'subject', 'student'];
  dataSource: MatTableDataSource<any>;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild('TABLE') excelTable: ElementRef;


  constructor(private snotifyService: SnotifyService, private genericFunctions: GenericFunctions, private dialog: MatDialog,
    private crudService: CrudService, private spinner: NgxSpinnerService, public router: Router, private formBuilder: FormBuilder,) {

    this.getFiltersList();
    this.orgCode = localStorage.getItem('orgCode');
  }

  ngOnInit(): void {
    this.staffForm = this.formBuilder.group({
      academicYearId: ['', Validators.required],
      courseId: ['', Validators.required],
      examId: ['', Validators.required],
      subjectId: ['', Validators.required],
      univExamcenterId: ['', Validators.required],
      collegeId: [''],
    });
    this.dataSource = new MatTableDataSource(this.examCenterStudents);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  getFiltersList(): void {
    this.spinner.show();
    let request = [
      { paramName: 'in_flag', paramValue: 'list_exam_subjects' },
      { paramName: 'in_orgid', paramValue: +localStorage.getItem('organizationId') },
      { paramName: 'in_fdate', paramValue: '1990-01-01' },
      { paramName: 'in_tdate', paramValue: '1990-01-01' },
      { paramName: 'in_evalutor_profileid', paramValue: 0 },
      { paramName: 'in_exam_date', paramValue: '1990-01-01' },
      { paramName: 'in_emp_id', paramValue: 0 },
      { paramName: 'in_questionpaper_id', paramValue: 0 },
      { paramName: 'in_evaluator_role_id', paramValue: 0 },
      { paramName: 'in_academic_year', paramValue: '' },
      { paramName: 'in_exam_short_name', paramValue: '' },
      { paramName: 'in_affiliatedto_catdet_id', paramValue: 0 },
      { paramName: 'in_exam_id', paramValue: 0 },
      { paramName: 'in_course_year_id', paramValue: 0 },
      { paramName: 'in_subject_id', paramValue: 0 },
      { paramName: 'in_regulation_id', paramValue: 0 },
      { paramName: 'in_course_id', paramValue: 0 },
      { paramName: 'in_academic_year_id', paramValue: 0 },
      { paramName: 'in_loginuser_empid', paramValue: +localStorage.getItem('employeeId') }
    ];
    this.crudService.getDetailsByRequest(this.getExamEvaluationCodesUrl, '', request, '&')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data && result.data !== '' && result.data.result.length > 0) {
            this.filtersDetailsList = result.data.result;
            for (let i = 0; i < this.filtersDetailsList.length; i++) {
              if (this.filtersDetailsList[i].length > 0 && this.filtersDetailsList[i][0].flag === 'list_exam_subjects') {
                this.CollegesListDetails = this.filtersDetailsList[i];
              }
            }
            const courseList = this.CollegesListDetails.map(({ fk_course_ids }) => fk_course_ids);
            this.courses = this.CollegesListDetails.filter(({ fk_course_ids }, index) =>
              !courseList.includes(fk_course_ids, index + 1));
          }
          if (this.courses.length > 0) {
            this.staffForm.get('courseId').setValue(this.courses[0].fk_course_ids);
            this.selectedCourse(this.staffForm.value.courseId);
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
  // tslint:disable-next-line:typedef
  selectedCourse(courseId) {
    this.staffForm.get('examId').setValue(0);
    this.staffForm.get('academicYearId').setValue(0);
    this.staffForm.get('subjectId').setValue('');
    this.staffForm.get('collegeId').setValue(0);
    this.academicYears = []
    this.searchExams = [];
    this.examsList = [];
    this.searchExams = [];
    this.academicYearsList = [];
    this.examData = [];
    this.subjectsList = [];
    this.subjects = [];
    this.subjectsData = [];
    this.examSubjectstd = [];
    this.examCenterColleges = [];
    this.flag = false;
    this.academicYearsList = this.CollegesListDetails.filter(x => (x.fk_course_ids == this.staffForm.value.courseId))
    if (this.academicYearsList.length > 0) {
      const academicYearsList = this.academicYearsList.map(({ pk_academic_year_id }) => pk_academic_year_id);
      this.academicYears = this.academicYearsList.filter(({ pk_academic_year_id }, index) => !academicYearsList.includes(pk_academic_year_id, index + 1));

    }
    if (this.academicYears.length > 0) {
      this.staffForm.get('academicYearId').setValue(this.academicYears[0].pk_academic_year_id);
      this.selectedAcademicYear(this.staffForm.value.academicYearId)
    }
  }
  selectedAcademicYear(academicYearId) {
    this.staffForm.get('examId').setValue(0);
    this.staffForm.get('subjectId').setValue('');
    this.staffForm.get('collegeId').setValue(0);
    this.searchExams = [];
    this.examsList = [];
    this.searchExams = [];
    this.examsLists = [];
    this.examData = [];
    this.subjectsList = [];
    this.subjects = [];
    this.subjectsData = [];
    this.examSubjectstd = [];
    this.examCenterColleges = [];
    this.flag = false;
    this.examsLists = this.CollegesListDetails.filter(x => (x.fk_course_ids == this.staffForm.value.courseId && x.pk_academic_year_id == this.staffForm.value.academicYearId))
    if (this.examsLists.length > 0) {
      const examsLists = this.examsLists.map(({ pk_exam_id }) => pk_exam_id);
      this.examsList = this.examsLists.filter(({ pk_exam_id }, index) => !examsLists.includes(pk_exam_id, index + 1));
      this.examsList = this.examsList.filter(x => !x.is_internal_exam)
      this.examData = this.examsList;
    }
    if (this.examsList.length > 0) {
      this.staffForm.get('examId').setValue(this.examsList[0].pk_exam_id);
      this.selectedExam(this.examsList[0].pk_exam_id);
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
  selectedExam(examId) {
    this.staffForm.get('subjectId').setValue('');
    this.staffForm.get('collegeId').setValue(0);
    this.subjectsList = [];
    this.subjects = [];
    this.subjectsData = [];
    this.univExamCenters = [];
    this.examSubjectstd = [];
    this.examCenterColleges = [];
    this.flag = false;
    if (examId !== '' || examId !== null) {
      this.subjectsList = this.CollegesListDetails.filter(x => (x.fk_course_ids == this.staffForm.value.courseId && x.pk_academic_year_id == this.staffForm.value.academicYearId && x.pk_exam_id === examId));
      if (this.subjectsList && this.subjectsList.length > 0) {
        const courseCodeData = this.subjectsList.map(({ fk_subject_id }) => fk_subject_id);
        this.subjects = this.subjectsList.filter(({ fk_subject_id }, index) =>
          !courseCodeData.includes(fk_subject_id, index + 1));
        this.subjectsData = this.subjects;
      }
      if (this.subjects && this.subjects.length > 0) {
        this.staffForm.get('subjectId').setValue(this.subjects[0]?.fk_subject_id);
        this.selectedSubject();
      }
    }
  }
  searchdata(value) {
    this.subjectsData = []
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
  selectedSubject(): void {
    this.staffForm.get('univExamcenterId').setValue('');
    this.staffForm.get('collegeId').setValue(0);
    this.univExamCenters = [];
    this.examSubjectstd = [];
    this.examCenterColleges = [];
    this.flag = false;
    /*---------- GET univExamCenters --------------*/
    this.crudService.listDetailsById(this.UnivExamCentersUrl, 'true', this.isActive)
      .subscribe(result => {
        if (result.statusCode === 200) {
          if (result.data.resultList && result.data.resultList !== '') {
            this.univExamCenters = result.data.resultList;
            if (this.univExamCenters.length > 0) {
              // this.staffForm.get('univExamcenterId').setValue(this.univExamCenters[0].univExamcenterId);
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
  getCenterColleges(univExamcenterId) {
    this.examCenterColleges = [];
    this.flag = false;
    this.crudService.listDetailsByThreeIds(this.UnivEcCollegesUrl, this.staffForm.value.univExamcenterId, this.staffForm.value.examId,
      'true', 'univExamCenters.univExamcenterId', this.getExamMasterDetailsUrl, this.isActive)
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data && result.data !== '') {
            this.examCenterColleges = result.data.resultList;
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
  headerData() {
    this.examSubjectstd = [];
    this.flag = false;
    this.examsName = this.examsList.filter(x => (x.pk_exam_id == this.staffForm.value.examId))[0]?.exam_name
    this.academicYearName = this.academicYears.filter(x => (x.pk_academic_year_id == this.staffForm.value.academicYearId))[0]?.academic_year
    this.courseName = this.courses.filter(x => (x.fk_course_ids == this.staffForm.value.courseId))[0]?.course_code
    this.subjectCode = this.subjects.filter(x => (x.fk_subject_id == this.staffForm.value.subjectId))[0]?.subject_code
    this.examCenterName = this.univExamCenters.filter(x => (x.univExamcenterId == this.staffForm.value.univExamcenterId))[0]?.examcenterName;
    this.Logo = this.univExamCenters.filter(x => (x.univExamcenterId == this.staffForm.value.univExamcenterId))[0]?.universityLogoFileName

  }
  getCenterStudents() {
    if(this.staffForm.valid){
    this.spinner.show();
    this.examCenterStudents = [];
    this.flag = false;
    this.headerData();
    this.crudService.listDetailsByFourIds(this.UnivEcStudentsUrl, this.staffForm.value.univExamcenterId, this.staffForm.value.examId,
      this.staffForm.value.subjectId, 'true', 'univExamCenters.univExamcenterId', this.getExamMasterDetailsUrl, 'subject.subjectId', this.isActive)
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data && result.data !== '') {
            this.examCenterStudents = result.data.resultList;
            if(this.examCenterStudents && this.examCenterStudents.length > 0){
                this.flag = true;
            }
            this.dataSource = new MatTableDataSource(this.examCenterStudents);
            this.dataSource.paginator = this.paginator;
            this.dataSource.sort = this.sort;
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
      this.snotifyService.info('Please Select Valid Filters', 'info!');
    }
  }
  // tslint:disable-next-line:typedef
  applyFilter(filterValue: string) {
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }
  exportAsExcel() {
    const ws: XLSX.WorkSheet = XLSX.utils.table_to_sheet(this.excelTable.nativeElement);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

    /* save to file */
    XLSX.writeFile(wb, 'Exam Center Students Report.xlsx');

  }
  printPage() {
    window.print()
  }
}
