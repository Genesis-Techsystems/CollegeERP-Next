import { Component, OnInit, ViewChild } from '@angular/core';
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
import { EditUnivExamcenterStudentsComponent } from './edit-univ-examcenter-students/edit-univ-examcenter-students.component';

@Component({
  selector: 'app-univ-examcenter-students',
  templateUrl: './univ-examcenter-students.component.html',
  styleUrls: ['./univ-examcenter-students.component.scss']
})
export class UnivExamcenterStudentsComponent implements OnInit {

  private getExamEvaluationCodesUrl = CONSTANTS.getExamEvaluationCodesUrl;
  private UnivExamCentersUrl = CONSTANTS.UnivExamCentersUrl;
  private isActive = CONSTANTS.isActive;
  private getExamAllotmentDetailsUrl = CONSTANTS.getExamAllotmentDetailsUrl;
  private addListUnivEcStudentsUrl = CONSTANTS.addListUnivEcStudentsUrl;
  private UnivEcStudentsUrl = CONSTANTS.UnivEcStudentsUrl;
  private UnivEcCollegesUrl = CONSTANTS.UnivEcCollegesUrl;
  private getExamMasterDetailsUrl = CONSTANTS.getExamMasterDetailsUrl;

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
  examsubjectStudents = [];
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
  checksubject: boolean;
  selectedCount: number;
  selectedStudents: any[];
  courseYearsList = [];
  courseYears = [];
  regulationFilterList = [];
  regulationList = [];

  displayedColumns: string[] = ['id', 'examcenter', 'exam', 'subject', 'student', 'Actions'];
  dataSource: MatTableDataSource<any>;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;


  constructor(private snotifyService: SnotifyService, private genericFunctions: GenericFunctions, private dialog: MatDialog,
    private crudService: CrudService, private spinner: NgxSpinnerService, public router: Router, private formBuilder: FormBuilder,) {

    this.getFiltersList();
  }

  ngOnInit(): void {
    this.staffForm = this.formBuilder.group({
      academicYearId: ['', Validators.required],
      courseId: ['', Validators.required],
      examId: ['', Validators.required],
      courseYearId: ['', Validators.required],
      regulationId: ['', Validators.required],
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
    this.staffForm.get('courseYearId').setValue('');
    this.staffForm.get('regulationId').setValue('');
    this.staffForm.get('subjectId').setValue('');
    this.staffForm.get('collegeId').setValue(0);
    this.academicYears = []
    this.searchExams = [];
    this.examsList = [];
    this.searchExams = [];
    this.academicYearsList = [];
    this.examData = [];
    this.courseYearsList = [];
    this.courseYears = [];
    this.regulationFilterList = [];
    this.regulationList = [];
    this.subjectsList = [];
    this.subjects = [];
    this.subjectsData = [];
    this.examsubjectStudents = [];
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
    this.staffForm.get('courseYearId').setValue('');
    this.staffForm.get('regulationId').setValue('');
    this.staffForm.get('subjectId').setValue('');
    this.staffForm.get('collegeId').setValue(0);
    this.searchExams = [];
    this.examsList = [];
    this.searchExams = [];
    this.examsLists = [];
    this.examData = [];
    this.courseYearsList = [];
    this.courseYears = [];
    this.regulationFilterList = [];
    this.regulationList = [];
    this.subjectsList = [];
    this.subjects = [];
    this.subjectsData = [];
    this.examsubjectStudents = [];
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
    this.staffForm.get('courseYearId').setValue('');
    this.staffForm.get('regulationId').setValue('');
    this.staffForm.get('subjectId').setValue('');
    this.staffForm.get('collegeId').setValue(0);
    this.courseYearsList = [];
    this.courseYears = [];
    this.regulationFilterList = [];
    this.regulationList = [];
    this.subjectsList = [];
    this.subjects = [];
    this.subjectsData = [];
    this.univExamCenters = [];
    this.examsubjectStudents = [];
    this.examSubjectstd = [];
    this.examCenterColleges = [];
    this.flag = false;
    if (examId !== '' || examId !== null) {
      this.courseYearsList = this.CollegesListDetails.filter(x => (x.fk_course_ids == this.staffForm.value.courseId && x.pk_academic_year_id == this.staffForm.value.academicYearId && x.pk_exam_id === examId));
      if (this.courseYearsList.length > 0) {
      const courseYearsList = this.courseYearsList.map(({ fk_course_year_ids }) => fk_course_year_ids);
      this.courseYears = this.courseYearsList.filter(({ fk_course_year_ids }, index) => !courseYearsList.includes(fk_course_year_ids, index + 1));
    }
    if (this.courseYears.length > 0) {
      this.staffForm.get('courseYearId').setValue(this.courseYears[0].fk_course_year_ids);
      this.selectedYear(this.staffForm.value.courseYearId);
    }
    }
  }
    selectedYear(courseYearId) {
    this.staffForm.get('subjectId').setValue('');
    this.staffForm.get('regulationId').setValue('');
    this.regulationFilterList = [];
    this.regulationList = [];
    this.subjectsList = [];
    this.subjects = [];
    this.subjectsData = [];
    this.univExamCenters = [];
    this.examsubjectStudents = [];
    this.examSubjectstd = [];
    this.examCenterColleges = [];
    this.flag = false;
    this.regulationFilterList = this.CollegesListDetails.filter(x => (x.fk_course_ids == this.staffForm.value.courseId && x.pk_academic_year_id == this.staffForm.value.academicYearId
    && x.pk_exam_id === this.staffForm.value.examId && x.fk_course_year_ids === this.staffForm.value.courseYearId));
    if (this.regulationFilterList.length > 0) {
      const regulationDetailList = this.regulationFilterList.map(({ pk_regulation_id }) => pk_regulation_id);
      this.regulationList = this.regulationFilterList.filter(({ pk_regulation_id }, index) => !regulationDetailList.includes(pk_regulation_id, index + 1));
    }
    if (this.regulationList.length > 0) {
      this.staffForm.get('regulationId').setValue(this.regulationList[0].pk_regulation_id);
      this.selectedRegulation(this.staffForm.value.regulationId)
    }
  }
  selectedRegulation(regulationId){
    this.staffForm.get('subjectId').setValue('');
    this.staffForm.get('collegeId').setValue(0);
    this.subjectsList = [];
    this.subjects = [];
    this.subjectsData = [];
    this.univExamCenters = [];
    this.examsubjectStudents = [];
    this.examSubjectstd = [];
    this.examCenterColleges = [];
    this.flag = false;
    if (regulationId !== '' || regulationId !== null) {
      this.subjectsList = this.CollegesListDetails.filter(x => (x.fk_course_ids == this.staffForm.value.courseId && x.pk_academic_year_id == this.staffForm.value.academicYearId
    && x.pk_exam_id === this.staffForm.value.examId && x.fk_course_year_ids === this.staffForm.value.courseYearId && x.pk_regulation_id === this.staffForm.value.regulationId));
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
    this.examsubjectStudents = [];
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
    this.examsubjectStudents = [];
    this.examSubjectstd = [];
    this.flag = false;
    this.examsName = this.examsList.filter(x => (x.pk_exam_id == this.staffForm.value.examId))[0]?.exam_name
    this.academicYearName = this.academicYears.filter(x => (x.pk_academic_year_id == this.staffForm.value.academicYearId))[0]?.academic_year
    this.courseName = this.courses.filter(x => (x.fk_course_ids == this.staffForm.value.courseId))[0]?.course_code
    this.subjectCode = this.subjects.filter(x => (x.fk_subject_id == this.staffForm.value.subjectId))[0]?.subject_code
    this.examCenterName = this.univExamCenters.filter(x => (x.univExamcenterId == this.staffForm.value.univExamcenterId))[0]?.examcenterName
  }
  GetExamStudents() {
    if (this.staffForm.valid) {
      this.spinner.show();
      this.examsubjectStudents = [];
      this.examSubjectstd = [];
      this.flag = false;
      this.headerData();
      this.getCenterStudents();
      /*----------- STUDENTS -----------*/
      // tslint:disable-next-line:max-line-length
      this.crudService.listByFourteenIds(this.getExamAllotmentDetailsUrl, 'exam_OMR_students',
        this.staffForm.value.examId,
        this.staffForm.value.collegeId,
        this.staffForm.value.courseId,
        0,
        this.staffForm.value.courseYearId,
        0,
        0,
        0,
        this.staffForm.value.regulationId,
        '1999-01-01',
        '1999-01-01',
        this.staffForm.value.subjectId, 0,
        'in_flag', 'in_exam_id', 'in_college_id', 'in_course_id', 'in_course_group_id', 'in_course_year_id', 'in_room_id', 'in_std_id', 'in_invgilator_emp_id',
        'in_regulation_id', 'from_exam_date', 'to_exam_date', 'in_subject_id', 'in_session_id')
        .subscribe(result => {
          this.spinner.hide();
          if (result.statusCode === 200) {
            if (result.success) {
              if (result.data.result[0].length > 0) {
                this.examsubjectStudents = result.data.result[0];
                if (this.examsubjectStudents && this.examsubjectStudents.length > 0) {
                  this.examsubjectStudents = this.examsubjectStudents.filter(
                    x => !this.examCenterStudents.some(y => y.studentDetailId === x.fk_student_id)
                  );
                }
                this.examSubjectstd = this.examsubjectStudents;
                this.flag = true;
              } else {
                this.snotifyService.success('No Records Found.', 'Success!');
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
  getCenterStudents() {
    if(this.staffForm.valid){
    this.spinner.show();
    this.examCenterStudents = [];
    this.crudService.listDetailsByFourIds(this.UnivEcStudentsUrl, this.staffForm.value.univExamcenterId, this.staffForm.value.examId,
      this.staffForm.value.subjectId, 'true', 'univExamCenters.univExamcenterId', this.getExamMasterDetailsUrl, 'subject.subjectId', this.isActive)
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data && result.data !== '') {
            this.examCenterStudents = result.data.resultList;
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
  checkedserialNo(check, item) {
    item.isSelected = check;
    this.selectedCount = 0;
    this.selectedStudents = [];
    for (let i = 0; i < this.examsubjectStudents.length; i++) {
      if (this.examsubjectStudents[i].isSelected) {
        this.selectedStudents.push(this.examsubjectStudents[i]);
        this.selectedCount++;
      }
    }
  }
  markItems(): void {
    this.selectedCount = 0;
    this.selectedStudents = [];
    for (let i = 0; i < this.examsubjectStudents.length; i++) {
      if (this.checksubject) {
        this.examsubjectStudents[i].checked = true;
        this.examsubjectStudents[i].isSelected = true;
        this.selectedStudents.push(this.examsubjectStudents[i]);
        this.selectedCount++;
      } else {
        this.examsubjectStudents[i].checked = false;
        this.examsubjectStudents[i].isSelected = false;
        this.checksubject = false
        this.selectedStudents = []
        // this.examsubjectStudents=[]
      }
    }
  }
  searchOmrNo(value) {
    this.examsubjectStudents = []
    this.searchOmrNos(value);
  }
  searchOmrNos(value: string) {
    let filter = value.toLowerCase();
    for (let i = 0; i < this.examSubjectstd.length; i++) {
      let option = this.examSubjectstd[i];
      if (option.omr_serial_no.toLowerCase().indexOf(filter) >= 0) {
        this.examsubjectStudents.push(option);
      }

    }
  }
  Assign() {
    if (this.selectedStudents && this.selectedStudents.length > 0) {
      let details = [];
      this.spinner.show();
      for (let i = 0; i < this.selectedStudents.length; i++) {
        details.push({
          univExamCentersId: this.staffForm.value.univExamcenterId,
          examMasterId: this.staffForm.value.examId,
          studentDetailId: this.selectedStudents[i].fk_student_id,
          subjectId: this.staffForm.value.subjectId,
          isActive: true,
          createdUser: +localStorage.getItem('employeeId')
        })
      }
      /*---------- ADD EXAM CENTER STUDENTS ----------*/
      this.crudService.add(this.addListUnivEcStudentsUrl, details)
        .subscribe(result => {
          this.spinner.hide();
          if (result.statusCode === 200) {
            this.GetExamStudents();
            this.snotifyService.success(result.message, 'Success!');
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
    } else {
      this.snotifyService.info('Please Select Students...!', 'Info!');
    }
  }
  // tslint:disable-next-line:typedef
  applyFilter(filterValue: string) {
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }
  editDialog(row) {
    const dialogRef = this.dialog.open(EditUnivExamcenterStudentsComponent, {
      width: '800px',
      data: row
    });
    dialogRef.afterClosed().subscribe(details => {
      if (details != null && details !== '') {
        this.updateDetails(details)
      }
    });
  }
  updateDetails(details) {
    this.spinner.show();
    this.crudService.updateDetails(this.UnivEcStudentsUrl, details, details.univEcStudentId, 'univEcStudentId')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.success) {
            this.GetExamStudents();
            this.snotifyService.success(result.message, 'Success!');
          } else {
            this.snotifyService.info(result.message, 'Info!');
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