import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { AcademicYear } from 'app/main/models/academicYear';
import { College } from 'app/main/models/college';
import { Course } from 'app/main/models/course';
import { CourseGroup } from 'app/main/models/courseGroup';
import { ExamMaster } from 'app/main/models/examMaster';
import { GeneralDetail } from 'app/main/models/generalDetail';
import { Section } from 'app/main/models/section';
import { CrudService } from 'app/main/services/crud.service';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';
import * as _ from 'lodash';
import { AddEvaluationSettingsComponent } from './add-evaluation-settings/add-evaluation-settings.component';

@Component({
  selector: 'app-exam-evaluation-settings',
  templateUrl: './exam-evaluation-settings.component.html',
  styleUrls: ['./exam-evaluation-settings.component.scss']
})
export class ExamEvaluationSettingsComponent implements OnInit {

  displayedColumns: string[] = ['id', 'minevaluationtimemin', 'maxNoOfEvaluationsAssign', 'maxNoOfReevaluationsAssign', 'noOfChiefEvaluations', 'noOfChiefReevaluations', 'noOfEvaluations', 'noOfReEvaluations', 'marksDiffForModEvaluatoin', 'evaluationstartdate', 'evaluationenddate', 'Status', 'Actions'];
  dataSource: MatTableDataSource<any>;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild('uploadXl') uploadXl: ElementRef;

  private ExamEvaluationSettingsUrl = CONSTANTS.ExamEvaluationSettingsUrl;
  private isActive = CONSTANTS.isActive;
  private getExamFiltersBycodeUrl = CONSTANTS.getExamFiltersBycodeUrl

  public formData;

  step = 0;
  public searchText: string;

  evaluatorSettingForm: FormGroup;

  colleges: College[] = [];
  academicYears: AcademicYear[] = [];
  courses: Course[] = [];
  examsList: ExamMaster[] = [];
  courseGroups: CourseGroup[] = [];
  sections: Section[] = [];
  student: any = {};
  subject: any = {};
  studentSubjects: any[] = [];
  courseYears: any[] = [];
  examCourseYearSubjetsList: any[] = [];
  examSubjestList: any[] = [];
  courseYearFee: any = [];
  examsFeeStructures: any = [];
  courseYearsubjectsList: any[] = [];
  subjectTypes: GeneralDetail[] = [];
  examTimetableSubjectsList: any[] = [];
  examStudentsList: any[] = [];
  searchEmployees: any[] = [];
  preStaggings: any[] = [];
  minDate;
  maxDate;
  collegeCode;
  flag: boolean
  academicYear;
  course;
  courseGroup;
  courseyear;
  section;
  date;
  subjectTypCode;
  examTypeCatCode;
  subjectDetails;
  exam;
  postMarksList: any[] = [];
  isInternalExam = false;
  examTypeId;
  regulationId;
  subjectTypeId;
  checkUploadType = 1;
  duplicateexamStudentList = [];
  examMarkSetups: any[] = [];
  syllabusDetails = [];
  postMarksList1 = [];
  searchExams = [];
  examsettings: any;
  examEvaluationSetting: any[];
  courseCode = [];
  examSubjects = [];
  monthYear: any[];
  monthYear1: any[];
  monthYearDuplicateList: any[];
  examDataList = [];
  examDuplicateList = [];
  examList = [];
  filtersDetailsList: any[];
  listExamSubject: any[];
  pageParams: any = {};
  CourseCode: any[];
  academicYearDetailList: any[];
  academicyearsList: any[];
  examDetailList: any[];

  constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,
    private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router,
    private dialog: MatDialog, private genericFunctions: GenericFunctions) {
  }

  ngOnInit(): void {
    this.evaluatorSettingForm = this.formBuilder.group({
      courseId: ['', Validators.required],
      examId: ['', Validators.required],
      academicYearId: ['', Validators.required],
    });
    this.getList();
    this.dataSource = new MatTableDataSource<any>(this.examEvaluationSetting);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }
  getList(): void {
    this.flag = false;
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
                this.listExamSubject = this.filtersDetailsList[i];
              }
            }
            const CourseCode = this.listExamSubject.map(({ fk_course_id }) => fk_course_id);
            this.CourseCode = this.listExamSubject.filter(({ fk_course_id }, index) =>
              !CourseCode.includes(fk_course_id, index + 1));
            if (!this.isEmptyObject(this.pageParams) && this.CourseCode.length > 0) {
              this.evaluatorSettingForm.get('courseId').setValue(+this.pageParams.courseId);
              this.selectedCourse(this.evaluatorSettingForm.value.courseId);
            } else if (this.CourseCode.length > 0) {
              this.evaluatorSettingForm.get('courseId').setValue(this.CourseCode[0].fk_course_id);
              this.selectedCourse(this.evaluatorSettingForm.value.courseId);
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
    this.academicYearDetailList = []
    this.academicyearsList = []
    this.examEvaluationSetting = [];
    this.dataSource = new MatTableDataSource<any>(this.examEvaluationSetting);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.evaluatorSettingForm.get('examId').setValue('')
    this.evaluatorSettingForm.get('academicYearId').setValue('')
    this.academicyearsList = this.listExamSubject.filter(x => (x.fk_course_id == this.evaluatorSettingForm.value.courseId))
    const academicyearsList = this.academicyearsList.map(({ fk_academic_year_id }) => fk_academic_year_id);
    this.academicYearDetailList = this.academicyearsList.filter(({ fk_academic_year_id }, index) =>
      !academicyearsList.includes(fk_academic_year_id, index + 1));
    this.academicYears = this.academicYears.sort((a, b) => parseInt(b.academic_year) - parseInt(a.academic_year));
    if (!this.isEmptyObject(this.pageParams) && this.academicYearDetailList.length > 0) {
      this.evaluatorSettingForm.get('academicYearId').setValue(+this.pageParams.academicYearId);
      this.selectedAcademicYear(this.evaluatorSettingForm.value.academicYearId);
    } else
      if (this.academicYearDetailList.length > 0) {
        this.evaluatorSettingForm.get('academicYearId').setValue(this.academicYearDetailList[0].fk_academic_year_id);
        this.selectedAcademicYear(this.evaluatorSettingForm.value.academicYearId);
      }
  }
  selectedAcademicYear(academicYearId) {
    this.examDetailList = []
    this.examList = []
    this.examEvaluationSetting = [];
    this.dataSource = new MatTableDataSource<any>(this.examEvaluationSetting);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.evaluatorSettingForm.get('examId').setValue('')
    this.examList = this.listExamSubject.filter(x => (x.fk_course_id == this.evaluatorSettingForm.value.courseId && x.fk_academic_year_id == this.evaluatorSettingForm.value.academicYearId))
    const examList = this.examList.map(({ fk_exam_id }) => fk_exam_id);
    this.examDetailList = this.examList.filter(({ fk_exam_id }, index) =>
      !examList.includes(fk_exam_id, index + 1));
    this.examDuplicateList = this.examDetailList
    if (!this.isEmptyObject(this.pageParams) && this.examDetailList.length > 0) {
      this.evaluatorSettingForm.get('examId').setValue(+this.pageParams.examId);
      this.selectedExam(this.evaluatorSettingForm.value.examId);
    } else
      if (this.examDetailList.length > 0) {
        this.evaluatorSettingForm.get('examId').setValue(this.examDetailList[0].fk_exam_id);
        this.selectedExam(this.evaluatorSettingForm.value.examId);
      }
  }
  searchExam(value) {
    this.examDuplicateList = []
    this.searchExamData(value);
  }
  searchExamData(value: string) {
    let filter = value.toLowerCase();
    for (let i = 0; i < this.examList.length; i++) {
      let option = this.examList[i];
      if (option.exam_name.toLowerCase().indexOf(filter) >= 0) {
        this.examDuplicateList.push(option);
      }
    }
  }
  selectedExam(value) {
    this.examEvaluationSetting = [];
    this.dataSource = new MatTableDataSource<any>(this.examEvaluationSetting);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }
  getEvaluationSettingList() {
    this.examEvaluationSetting = [];
    this.dataSource = new MatTableDataSource<any>(this.examEvaluationSetting);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.spinner.show();
    this.flag = true;
    if (this.evaluatorSettingForm.valid) {
      this.crudService.listDetailsByTwoIds(this.ExamEvaluationSettingsUrl, this.evaluatorSettingForm.value.examId, 'true', 'ExamMaster.examId', this.isActive)
        .subscribe(result => {
          this.spinner.hide();
          if (result.statusCode === 200) {
            if (result.data && result.data !== '') {
              this.snotifyService.success(result.message, 'Success!');
              this.examEvaluationSetting = result.data.resultList;
              // Assign the data to the data source for the API
              this.dataSource = new MatTableDataSource(this.examEvaluationSetting);
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
    }
  }
  numberToTime(time2: number) {
    const hours = Math.floor(time2 / 3600);
    const minutes = Math.floor((time2 % 3600) / 60);
    const seconds = time2 % 60;
    const formattedHours = hours.toString().padStart(2, '0');
    const formattedMinutes = minutes.toString().padStart(2, '0');
    const formattedSeconds = seconds.toString().padStart(2, '0');
    const timeString = `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
    return timeString;
  }
  openDialog(): void {
    const data = {
      examName: this.examList.filter(x => (x.fk_exam_id == this.evaluatorSettingForm.value.examId))[0].exam_name,
      type: 'new'
    }
    const dialogRef = this.dialog.open(AddEvaluationSettingsComponent, {
      width: '700px',
      data: data
    });
    dialogRef.afterClosed().subscribe(details => {
      if (details != null && details !== '') {
        details.examId = this.evaluatorSettingForm.value.examId
        this.spinner.show();
        /*---------- ADD EXAM EVALUATION SETTINGS ----------*/
        this.crudService.addDetails(this.ExamEvaluationSettingsUrl, details)
          .subscribe(result => {
            this.spinner.hide();
            if (result.statusCode === 200) {
              if (result.data && result.data !== '') {
                this.snotifyService.success(result.message, 'Success!');
                this.getEvaluationSettingList();
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
    });
  }
  /*---------- EDIT EXAM EVALUATION SETTINGS -----------*/
  editDialog(data): void {
    this.examsettings = data;
    const dialogRef = this.dialog.open(AddEvaluationSettingsComponent, {
      width: '750px',
      data: this.examsettings
    });
    dialogRef.afterClosed().subscribe(details => {
      if (details != null && details !== '') {
        details.evaluationSettingId = this.examsettings.evaluationSettingId;
        details.examId = this.examsettings.examId
        this.UpdateExamsetting(details);
      }
    });
  }
  /*------------ UPDATE EXAM EVALUATION SETTINGS -----------*/
  UpdateExamsetting(details): void {
    this.spinner.show();
    this.crudService.updateDetails(this.ExamEvaluationSettingsUrl, details, details.evaluationSettingId, 'evaluationSettingId')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data && result.data !== '') {
            this.snotifyService.success(result.message, 'Success!');
            this.getEvaluationSettingList();
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
  isEmptyObject(obj) {
    return (obj && (Object.keys(obj).length === 0));
  }
}